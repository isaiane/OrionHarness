import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseAdr,
  buildAdrIndex,
  readAdrFiles,
  checkAdrIndex,
  stripFences,
  type AdrFile,
} from "./adr-index.ts";

const adr = (name: string, content: string): AdrFile => ({ name, content });

// Um ADR mínimo no padrão do template (`# ADR-NNNN — título` + `- **Status:** …`).
const mkAdr = (num: string, title: string, status = "aceito") =>
  adr(
    `${num}-slug.md`,
    `# ADR-${num} — ${title}\n\n- **Status:** ${status}\n- **Data:** 2026-01-01\n\n## Contexto\n…\n`,
  );

describe("parseAdr — extração", () => {
  it("extrai número, título e status", () => {
    const e = parseAdr(mkAdr("0006", "Ledger executável de tarefas"));
    expect(e).toEqual({
      num: 6,
      id: "ADR-0006",
      title: "Ledger executável de tarefas",
      status: "aceito",
      file: "0006-slug.md",
    });
  });

  it("limpa o comentário HTML de auditoria do status", () => {
    const e = parseAdr(
      mkAdr("0019", "Núcleo L0", "aceito  <!-- G2: aprovado pelo humano em 2026-07-23 -->"),
    );
    expect(e?.status).toBe("aceito");
  });

  it("aceita travessão, en-dash e hífen como separador", () => {
    expect(parseAdr(adr("0001-x.md", "# ADR-0001 — T\n- **Status:** aceito"))?.title).toBe("T");
    expect(parseAdr(adr("0001-x.md", "# ADR-0001 – T\n- **Status:** aceito"))?.title).toBe("T");
    expect(parseAdr(adr("0001-x.md", "# ADR-0001 - T\n- **Status:** aceito"))?.title).toBe("T");
  });

  it("EXCLUI o 0000-template (num 0 → null)", () => {
    expect(
      parseAdr(adr("0000-template.md", "# ADR-NNNN — <título>\n- **Status:** proposto")),
    ).toBeNull();
  });

  it("ignora não-ADR genuíno (README, .gitkeep, doc solto SEM heading de ADR)", () => {
    expect(parseAdr(adr("README.md", "# Índice\n- **Status:** x"))).toBeNull();
    expect(parseAdr(adr(".gitkeep", ""))).toBeNull();
    expect(parseAdr(adr("notas.md", "# Notas gerais\n\ntexto qualquer"))).toBeNull();
  });

  it("FAIL-SOFT: nome não-numérico mas com CONTEÚDO de ADR (`ADR-0024-x.md`) ⇒ erro, não some", () => {
    expect(() =>
      parseAdr(adr("ADR-0024-title.md", "# ADR-0024 — Real\n- **Status:** aceito")),
    ).toThrow(/convenção/);
  });

  it("FAIL-SOFT: status FORA do preâmbulo (bullet de prosa após `## Contexto`) não é aceito", () => {
    const soNoCorpo = "# ADR-0007 — Real\n\n## Contexto\n\n- **Status:** aceito é citado aqui\n";
    expect(() => parseAdr(adr("0007-x.md", soNoCorpo))).toThrow(/Status/);
  });

  it("FAIL-SOFT: nome ADR-like E heading TAMBÉM malformado (caso de dois erros) ⇒ erro, não some", () => {
    // `ADR-0024-x.md` (nome fora do padrão) + `# ADR-0024: Title` (heading fora do padrão).
    expect(() =>
      parseAdr(adr("ADR-0024-title.md", "# ADR-0024: Title\n- **Status:** aceito")),
    ).toThrow(/convenção/);
  });

  it("FAIL-SOFT: dois `- **Status:**` no preâmbulo ⇒ estado ambíguo", () => {
    const dois = "# ADR-0007 — Real\n- **Status:** proposto\n- **Status:** aceito\n";
    expect(() => parseAdr(adr("0007-x.md", dois))).toThrow(/ambíguo/);
  });

  it("FAIL-SOFT: dois headings `# ADR-NNNN` no preâmbulo ⇒ metadado ambíguo", () => {
    const dois = "# ADR-0007 — Um\n# ADR-0007 — Dois\n- **Status:** aceito\n";
    expect(() => parseAdr(adr("0007-x.md", dois))).toThrow(/ambíguo/);
  });

  it("FAIL-SOFT: 1º H1 malformado + heading canônico depois ⇒ não usa o de baixo", () => {
    // O H1 REAL (`# ADR-0007: Broken`) está quebrado; um `# ADR-0007 — Example` mais abaixo NÃO deve valer.
    const c = "# ADR-0007: Broken\n# ADR-0007 — Example\n- **Status:** aceito\n";
    expect(() => parseAdr(adr("0007-x.md", c))).toThrow(/padrão/);
  });

  it("FAIL-SOFT: ADR real sem linha de status ⇒ erro claro", () => {
    expect(() => parseAdr(adr("0007-x.md", "# ADR-0007 — Sem status\n\n## Contexto\n…"))).toThrow(
      /Status/,
    );
  });

  it("FAIL-SOFT: ADR real sem heading no padrão ⇒ erro claro", () => {
    expect(() => parseAdr(adr("0007-x.md", "# Título solto\n- **Status:** aceito"))).toThrow(
      /padrão/,
    );
  });

  it("FAIL-SOFT: número do título ≠ do arquivo ⇒ erro de renumeração", () => {
    expect(() => parseAdr(adr("0007-x.md", "# ADR-0008 — Copiado\n- **Status:** aceito"))).toThrow(
      /diverge/,
    );
  });

  it("ignora heading/status DENTRO de bloco cercado (não mascara o fail-soft)", () => {
    // ADR real sem status próprio, mas com um exemplo cercado `- **Status:** aceito` no corpo.
    const semStatus =
      "# ADR-0007 — Real\n\n## Exemplo\n\n```md\n# ADR-0024 — Fake\n- **Status:** aceito\n```\n";
    expect(() => parseAdr(adr("0007-x.md", semStatus))).toThrow(/Status/);
  });

  it("usa o heading REAL, não um exemplo cercado com outro número", () => {
    const comFence =
      "# ADR-0007 — Verdadeiro\n\n```\n# ADR-9999 — Exemplo\n```\n\n- **Status:** aceito\n";
    const e = parseAdr(adr("0007-x.md", comFence));
    expect(e?.title).toBe("Verdadeiro");
    expect(e?.num).toBe(7);
  });

  it("FAIL-SOFT: status que é só comentário HTML ⇒ erro claro", () => {
    expect(() =>
      parseAdr(adr("0007-x.md", "# ADR-0007 — Real\n- **Status:** <!-- audit only -->")),
    ).toThrow(/status vazio|Status/);
  });

  it("não extrai metadado preso em comentário HTML (não mascara o fail-soft)", () => {
    // Heading real presente, mas o STATUS real só existe COMENTADO — não pode ser aceito.
    const comentado = "# ADR-0007 — Real\n\n<!--\n- **Status:** aceito\n-->\n\n## Contexto\n…\n";
    expect(() => parseAdr(adr("0007-x.md", comentado))).toThrow(/Status/);
  });

  it("FAIL-SOFT: filename fora da convenção slug (metacaractere) ⇒ erro claro", () => {
    expect(() => parseAdr(adr("0024-a|b.md", "# ADR-0024 — X\n- **Status:** aceito"))).toThrow(
      /convenção/,
    );
    expect(() => parseAdr(adr("0024-title).md", "# ADR-0024 — X\n- **Status:** aceito"))).toThrow(
      /convenção/,
    );
  });

  it("FAIL-SOFT: título vazio (separador seguido de newline) não captura a linha de status", () => {
    // `# ADR-0024 —` seguido do status: o separador não pode cruzar o \n e virar título.
    expect(() => parseAdr(adr("0024-x.md", "# ADR-0024 —\n- **Status:** aceito\n"))).toThrow(
      /padrão/,
    );
  });

  it("FAIL-SOFT: comentário HTML NÃO fechado com status dentro ⇒ não vira metadado real", () => {
    const semFechar = "# ADR-0007 — Real\n\n<!-- rascunho\n- **Status:** aceito\n";
    expect(() => parseAdr(adr("0007-x.md", semFechar))).toThrow(/Status/);
  });

  it("comentário HTML não SINTETIZA heading colado (vira espaços, não vazio)", () => {
    // `<!-- x -->#  ADR…` sem o fix viraria `# ADR…` (H1). Com espaços, a linha fica indentada → não é H1.
    expect(() =>
      parseAdr(adr("0007-x.md", "<!-- audit --># ADR-0007 — Real\n- **Status:** aceito")),
    ).toThrow(/padrão/);
  });

  it("comentário HTML não SINTETIZA status colado no meio do token", () => {
    // `**Sta<!--x-->tus:**` sem o fix viraria `**Status:**`. Com espaços, `**Sta   tus:**` não casa.
    expect(() =>
      parseAdr(adr("0007-x.md", "# ADR-0007 — Real\n- **Sta<!--x-->tus:** aceito")),
    ).toThrow(/Status/);
  });

  it("FAIL-SOFT: status VAZIO não consome a linha `- **Data:**` seguinte", () => {
    // `- **Status:**` sem valor seguido de `- **Data:**`: o marcador não cruza o \n para virar status.
    const vazio = "# ADR-0007 — Real\n- **Status:**\n- **Data:** 2026-01-01\n";
    expect(() => parseAdr(adr("0007-x.md", vazio))).toThrow(/Status/);
  });

  it("FAIL-SOFT: extensão `.MD` maiúscula ⇒ erro, não some do índice (não é `.md` canônico)", () => {
    expect(() => parseAdr(adr("0024-title.MD", "# ADR-0024 — X\n- **Status:** aceito"))).toThrow(
      /convenção/,
    );
  });

  it("FAIL-SOFT: nome ADR-like malformado (3 dígitos, underscore) ⇒ erro, não some do índice", () => {
    expect(() => parseAdr(adr("024-title.md", "# ADR-0024 — X\n- **Status:** aceito"))).toThrow(
      /convenção/,
    );
    expect(() => parseAdr(adr("0024_title.md", "# ADR-0024 — X\n- **Status:** aceito"))).toThrow(
      /convenção/,
    );
  });

  it("FAIL-SOFT: 0000-<outro>.md (template copiado sem renumerar) ⇒ erro, não skip silencioso", () => {
    expect(() =>
      parseAdr(adr("0000-minha-decisao.md", "# ADR-0000 — X\n- **Status:** aceito")),
    ).toThrow(/reservado/);
    // Só o template EXATO continua isento (null).
    expect(
      parseAdr(adr("0000-template.md", "# ADR-NNNN — <título>\n- **Status:** proposto")),
    ).toBeNull();
  });
});

describe("stripFences", () => {
  it("remove blocos ``` e ~~~ e preserva o resto", () => {
    const s = stripFences("a\n```\nb\n```\nc\n~~~\nd\n~~~\ne");
    expect(s).toContain("a");
    expect(s).toContain("c");
    expect(s).toContain("e");
    expect(s).not.toContain("b");
    expect(s).not.toContain("d");
  });
});

describe("buildAdrIndex — projeção", () => {
  it("ordena por número e exclui o template", () => {
    const md = buildAdrIndex([
      mkAdr("0003", "Terceiro"),
      adr("0000-template.md", "# ADR-NNNN — <título>\n- **Status:** proposto"),
      mkAdr("0001", "Primeiro"),
      mkAdr("0002", "Segundo"),
    ]);
    const ordem = [...md.matchAll(/\[ADR-(\d{4})\]/g)].map((m) => m[1]);
    expect(ordem).toEqual(["0001", "0002", "0003"]); // template ausente, ordenado
  });

  it("emite link relativo ao arquivo do ADR", () => {
    const md = buildAdrIndex([mkAdr("0006", "Ledger")]);
    expect(md).toContain("[ADR-0006](0006-slug.md)");
  });

  it("é idempotente/determinística (mesma entrada = mesma saída)", () => {
    const files = [mkAdr("0002", "B"), mkAdr("0001", "A")];
    expect(buildAdrIndex(files)).toBe(buildAdrIndex(files));
  });

  it("termina com newline único (idempotência de escrita)", () => {
    const md = buildAdrIndex([mkAdr("0001", "A")]);
    expect(md.endsWith("\n")).toBe(true);
    expect(md.endsWith("\n\n")).toBe(false);
  });

  it("escapa `|` no título/status para não quebrar a tabela", () => {
    const md = buildAdrIndex([mkAdr("0001", "Escolher A | B", "aceito | revisar")]);
    const row = md.split("\n").find((l) => l.includes("ADR-0001"))!;
    expect(row).toContain("Escolher A \\| B");
    expect(row).toContain("aceito \\| revisar");
    // Só os delimitadores REAIS (não os `\|` escapados) formam colunas: 4 delimitadores = 5 células.
    expect(row.replace(/\\\|/g, "").split("|").length).toBe(5);
  });

  it("escapa a barra ANTES do pipe (barra pré-existente não reativa o delimitador)", () => {
    // Título já contém `\|`: escapar só o pipe daria `\\|` (par de barras ⇒ pipe ativo em GFM).
    const md = buildAdrIndex([mkAdr("0001", "A \\| B")]);
    const row = md.split("\n").find((l) => l.includes("ADR-0001"))!;
    expect(row).toContain("A \\\\\\| B"); // barra escapada (\\) + pipe escapado (\|)
    expect(row.replace(/\\./g, "").split("|").length).toBe(5); // removidos os escapes, 4 delimitadores reais
  });

  it("REJEITA números de ADR duplicados (colisão de prefixo NNNN)", () => {
    expect(() =>
      buildAdrIndex([
        adr("0007-a.md", "# ADR-0007 — A\n- **Status:** aceito"),
        adr("0007-b.md", "# ADR-0007 — B\n- **Status:** aceito"),
      ]),
    ).toThrow(/duplicado/);
  });
});

describe("checkAdrIndex — detecção de drift (I/O em tmp)", () => {
  const setup = () => {
    const dir = mkdtempSync(join(tmpdir(), "adr-index-"));
    writeFileSync(join(dir, "0001-a.md"), "# ADR-0001 — Alpha\n- **Status:** aceito\n");
    writeFileSync(join(dir, "0002-b.md"), "# ADR-0002 — Beta\n- **Status:** proposto\n");
    writeFileSync(join(dir, "0000-template.md"), "# ADR-NNNN — <título>\n- **Status:** proposto\n");
    writeFileSync(join(dir, ".gitkeep"), "");
    return dir;
  };

  it("README em dia ⇒ ok:true", () => {
    const dir = setup();
    const readme = join(dir, "README.md");
    writeFileSync(readme, buildAdrIndex(readAdrFiles(dir)));
    expect(checkAdrIndex(dir, readme).ok).toBe(true);
  });

  it("README dessincronizado (ADR alterado sem regenerar) ⇒ ok:false", () => {
    const dir = setup();
    const readme = join(dir, "README.md");
    writeFileSync(readme, buildAdrIndex(readAdrFiles(dir)));
    // Um novo ADR entra na pasta, mas o README não foi regenerado → o guard morde.
    writeFileSync(join(dir, "0003-c.md"), "# ADR-0003 — Gamma\n- **Status:** aceito\n");
    expect(checkAdrIndex(dir, readme).ok).toBe(false);
  });

  it("README ausente ⇒ ok:false (precisa ser gerado)", () => {
    const dir = setup();
    expect(checkAdrIndex(dir, join(dir, "README.md")).ok).toBe(false);
  });

  it("readAdrFiles ignora README.md e .gitkeep", () => {
    const dir = setup();
    writeFileSync(join(dir, "README.md"), "qualquer coisa");
    const nomes = readAdrFiles(dir)
      .map((f) => f.name)
      .sort();
    expect(nomes).toEqual(["0000-template.md", "0001-a.md", "0002-b.md"]);
  });

  it("um ADR de nome malformado na pasta faz o build FALHAR (completude, não skip)", () => {
    const dir = setup();
    writeFileSync(join(dir, "024-typo.md"), "# ADR-0024 — Typo\n- **Status:** aceito\n");
    expect(() => buildAdrIndex(readAdrFiles(dir))).toThrow(/convenção/);
  });
});
