import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseAdr, buildAdrIndex, readAdrFiles, checkAdrIndex, type AdrFile } from "./adr-index.ts";

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

  it("ignora não-ADR (README, .gitkeep, sem prefixo NNNN)", () => {
    expect(parseAdr(adr("README.md", "# Índice\n- **Status:** x"))).toBeNull();
    expect(parseAdr(adr(".gitkeep", ""))).toBeNull();
    expect(parseAdr(adr("notas.md", "# ADR-0001 — x\n- **Status:** aceito"))).toBeNull();
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
});
