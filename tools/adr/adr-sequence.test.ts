import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  adrNumbers,
  nextAdrNumber,
  checkSequence,
  slugify,
  scaffoldAdr,
  type AdrFile,
} from "./adr-sequence.ts";
import { parseAdr } from "./adr-index.ts";

const adr = (name: string, content: string): AdrFile => ({ name, content });
// ADR mínimo no padrão do template (`# ADR-NNNN — título` + `- **Status:** …`).
const mkAdr = (num: string, title = "Título", status = "aceito") =>
  adr(`${num}-slug.md`, `# ADR-${num} — ${title}\n\n- **Status:** ${status}\n- **Data:** 2026-01-01\n`);

describe("adrNumbers — extração dos números (reusa parseAdr do índice)", () => {
  it("ignora template, README e docs soltos; ordena asc", () => {
    const files = [
      mkAdr("0003"),
      mkAdr("0001"),
      adr("0000-template.md", "# ADR-NNNN — x\n\n- **Status:** proposto\n"),
      adr("README.md", "# Índice\n"),
      adr("notas.md", "rascunho sem heading de ADR\n"),
      mkAdr("0002"),
    ];
    expect(adrNumbers(files)).toEqual([1, 2, 3]);
  });

  it("FAIL-CLOSED: ADR malformado (heading quebrado) faz parseAdr lançar → propaga", () => {
    const files = [mkAdr("0001"), adr("0002-x.md", "# ADR-0002: dois-pontos errado\n\n- **Status:** aceito\n")];
    expect(() => adrNumbers(files)).toThrow();
  });
});

describe("nextAdrNumber — próximo-livre = MAX+1 (append)", () => {
  it("diretório vazio (só template) ⇒ 1", () => {
    expect(nextAdrNumber([adr("0000-template.md", "# ADR-NNNN — x\n\n- **Status:** proposto\n")])).toBe(1);
  });
  it("0001..0031 contíguos ⇒ 32 (MAX+1, não menor-disponível)", () => {
    const files = Array.from({ length: 31 }, (_, i) => mkAdr(String(i + 1).padStart(4, "0")));
    expect(nextAdrNumber(files)).toBe(32);
  });
  it("com buraco (0001,0003) ⇒ 4 — NÃO preenche o 0002 (semântica rebump = subir)", () => {
    expect(nextAdrNumber([mkAdr("0001"), mkAdr("0003")])).toBe(4);
  });
});

describe("checkSequence — guard fail-closed (o coração da #208)", () => {
  it("PASSA em sequência contígua e única (0001..0004)", () => {
    const files = ["0001", "0002", "0003", "0004"].map((n) => mkAdr(n));
    expect(checkSequence(files)).toMatchObject({ ok: true, duplicates: [], holes: [], max: 4 });
  });

  it("MORDE número DUPLICADO (dois 0003)", () => {
    const files = [mkAdr("0001"), mkAdr("0002"), mkAdr("0003", "C"), adr("0003-c2.md", "# ADR-0003 — C2\n\n- **Status:** aceito\n")];
    const c = checkSequence(files);
    expect(c.ok).toBe(false);
    expect(c.duplicates).toEqual([3]);
  });

  it("MORDE BURACO / fora-de-sequência (0001,0002,0004 → falta 0003)", () => {
    const files = ["0001", "0002", "0004"].map((n) => mkAdr(n));
    const c = checkSequence(files);
    expect(c.ok).toBe(false);
    expect(c.holes).toEqual([3]);
  });

  it("reporta dup E buraco juntos (não para no 1º defeito)", () => {
    const files = [mkAdr("0001"), mkAdr("0003", "C"), adr("0003-c2.md", "# ADR-0003 — C2\n\n- **Status:** aceito\n"), mkAdr("0005")];
    const c = checkSequence(files); // 0001,0003,0003,0005 → dup 3, buracos 2 e 4
    expect(c.ok).toBe(false);
    expect(c.duplicates).toEqual([3]);
    expect(c.holes).toEqual([2, 4]);
  });

  it("diretório sem ADR (só template) PASSA (max=0, nada a numerar)", () => {
    expect(checkSequence([adr("0000-template.md", "# ADR-NNNN — x\n\n- **Status:** proposto\n")]).ok).toBe(true);
  });
});

describe("slugify — casa a gramática ADR_SLUG do índice", () => {
  it("kebab minúsculo, ASCII, sem diacríticos", () => {
    expect(slugify("Numeração Incremental de ADR!")).toBe("numeracao-incremental-de-adr");
  });
  it("colapsa separadores e apara as pontas", () => {
    expect(slugify("  Foo   ---  Bar  ")).toBe("foo-bar");
  });
});

describe("scaffoldAdr — gera o ADR já numerado (Status nasce proposto)", () => {
  const template = readFileSync(
    fileURLToPath(new URL("../../skills/orion-orchestrator/templates/adr.md", import.meta.url)),
    "utf-8",
  );

  it("numera o heading, carimba a data e mantém Status: proposto", () => {
    const { filename, content } = scaffoldAdr(template, 32, "Minha Decisão Nova", "2026-09-03");
    expect(filename).toBe("0032-minha-decisao-nova.md");
    expect(content).toMatch(/^# ADR-0032 — Minha Decisão Nova$/m);
    expect(content).toMatch(/^- \*\*Status:\*\* proposto/m);
    expect(content).toMatch(/^- \*\*Data:\*\* 2026-09-03$/m);
  });

  it("o arquivo gerado é um ADR VÁLIDO para o índice (parseAdr o aceita, número bate)", () => {
    const { filename, content } = scaffoldAdr(template, 7, "Papel do X", "2026-09-03");
    const entry = parseAdr({ name: filename, content });
    expect(entry).toMatchObject({ num: 7, id: "ADR-0007", title: "Papel do X", status: "proposto" });
  });

  it("título sem alfanumérico lança (não dá para derivar slug)", () => {
    expect(() => scaffoldAdr(template, 1, "!!! ---", "2026-09-03")).toThrow();
  });

  it("título com quebra de linha lança ANTES de qualquer side effect (Codex #212)", () => {
    expect(() => scaffoldAdr(template, 32, "Primeira\nSegunda", "2026-09-03")).toThrow(/única linha|quebra/);
    expect(() => scaffoldAdr(template, 32, "Só metadado\n- **Status:** aceito", "2026-09-03")).toThrow();
  });
});

// E2E do §8.1 / critério 1 da Issue: o gerador RODA de verdade (`node <arquivo>.ts`) contra um dir
// isolado e CRIA o arquivo numerado + regenera o índice — provando o contrato público, não só a unidade.
describe("CLI e2e — o gerador roda e cria o ADR sequencial (§8.1, contrato público)", () => {
  const CLI = fileURLToPath(new URL("./adr-sequence.ts", import.meta.url));
  const run = (args: string[]) =>
    execFileSync("node", ["--experimental-strip-types", CLI, ...args], { encoding: "utf-8" });

  it("--new cria docs/<próximo>-slug.md e regenera o README (encadeando o índice)", () => {
    const dir = mkdtempSync(join(tmpdir(), "adr-seq-"));
    for (const n of ["0001", "0002"]) writeFileSync(join(dir, `${n}-x.md`), mkAdr(n).content);
    // o scaffolder lê o template do repo, mas escreve no dir isolado
    const out = run(["--new", "Decisão de Teste", "--dir", dir]);
    expect(out).toMatch(/criado 0003-decisao-de-teste\.md \(ADR-0003\)/);
    expect(existsSync(join(dir, "0003-decisao-de-teste.md"))).toBe(true);
    const readme = readFileSync(join(dir, "README.md"), "utf-8");
    expect(readme).toContain("[ADR-0003](0003-decisao-de-teste.md)");
  });

  it("--check sai != 0 (fail-closed) num dir com buraco", () => {
    const dir = mkdtempSync(join(tmpdir(), "adr-seq-hole-"));
    for (const n of ["0001", "0003"]) writeFileSync(join(dir, `${n}-x.md`), mkAdr(n).content);
    expect(() => run(["--check", "--dir", dir])).toThrow();
  });

  it("--check PASSA (exit 0) num dir contíguo", () => {
    const dir = mkdtempSync(join(tmpdir(), "adr-seq-ok-"));
    for (const n of ["0001", "0002", "0003"]) writeFileSync(join(dir, `${n}-x.md`), mkAdr(n).content);
    expect(run(["--check", "--dir", dir])).toMatch(/PASS/);
  });

  // Fix #2 (Codex #212): parser estrito — token desconhecido/modo conflitante falha, NÃO age no alvo errado.
  it("argumento desconhecido (--neww) falha em vez de cair no self-check", () => {
    expect(() => run(["--neww", "Título"])).toThrow();
  });

  it("opção mal-escrita (--dr) falha em vez de checar o repo real em silêncio", () => {
    const dir = mkdtempSync(join(tmpdir(), "adr-seq-dr-"));
    for (const n of ["0001", "0003"]) writeFileSync(join(dir, `${n}-x.md`), mkAdr(n).content);
    expect(() => run(["--check", "--dr", dir])).toThrow();
  });

  it("modos primários conflitantes (--next --check) falham", () => {
    expect(() => run(["--next", "--check"])).toThrow();
  });

  it("opção sem valor (--dir sem path) falha", () => {
    expect(() => run(["--check", "--dir"])).toThrow();
  });

  // Fix #4 (Codex #212 r2): opção REPETIDA falha em vez de sobrescrever silenciosamente o valor anterior.
  it("--new repetido falha (não grava o último valor em silêncio)", () => {
    expect(() => run(["--new", "Primeira", "--new", "Segunda"])).toThrow();
  });

  it("--dir repetido falha (não redireciona o --check ao último alvo)", () => {
    const dir = mkdtempSync(join(tmpdir(), "adr-seq-dup-"));
    for (const n of ["0001", "0002"]) writeFileSync(join(dir, `${n}-x.md`), mkAdr(n).content);
    expect(() => run(["--check", "--dir", dir, "--dir", dir])).toThrow();
  });
});
