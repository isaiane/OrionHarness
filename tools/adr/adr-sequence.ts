// adr-sequence.ts — Gerador de PRÓXIMO-LIVRE + scaffolder de ADR + guard de sequência fail-closed.
// Issue #208 (T11.2) / aplica o ADR-0031 (modelo v2, ponto 4). NÃO decide governança — APLICA a política
// já aceita no G2: "o ADR é numerado pela sequência incremental (próximo-livre) no momento da criação;
// quem mergeia primeiro fixa o número, o outro REBUMPA antes do merge". Número escolhido à mão COLIDE sob
// merges paralelos (invalidado 3× em O7/O10) — esta peça o computa por construção e um guard MORDE duplicado
// ou buraco antes do merge (fail-closed).
//
// ENCADEIA o índice existente (`tools/adr/adr-index.ts`) — NÃO reimplementa o parsing de ADR: reusa
// `parseAdr`/`readAdrFiles` (a identidade/validação de um ADR) e `buildAdrIndex` (a projeção do README).
// Uma fonte de lógica de parsing (ADR-0023), sem duplicação.
//
// Política de numeração (derivada do ADR-0031 ponto 4, confirmada no G1 da #208):
//   • PRÓXIMO-LIVRE = MAX+1 (append monotônico; `0000-template` = 0, reservado). Semântica de REBUMP é
//     SUBIR, não preencher buraco — casa com "quem mergeia primeiro fixa; o outro rebumpa".
//   • Guard fail-closed reprova quando os ADRs numerados (excluído o `0000`) NÃO formam a corrida CONTÍGUA
//     `0001..MAX` e ÚNICA: (a) DUPLICADO (dois `NNNN` iguais) ou (b) BURACO (número faltando em [1, MAX]).
//     Passa só com sequência única e contígua. ADR malformado ⇒ `parseAdr` lança ⇒ guard reprova (fail-closed).
//
// Roda em Node ≥ 22.6 via type stripping (sem toolchain):
//   node --experimental-strip-types tools/adr/adr-sequence.ts --next            → imprime o próximo-livre
//   node --experimental-strip-types tools/adr/adr-sequence.ts --check           → guard (exit ≠ 0 em dup/buraco)
//   node --experimental-strip-types tools/adr/adr-sequence.ts --new "<título>"  → scaffolda o ADR já numerado
//   node --experimental-strip-types tools/adr/adr-sequence.ts                   → self-check (prova a mordida)

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { type AdrFile, type AdrEntry, parseAdr, readAdrFiles, buildAdrIndex } from "./adr-index.ts";
export type { AdrFile } from "./adr-index.ts";

/** Números dos ADRs VÁLIDOS (exclui `0000-template`, README e docs soltos). ORDENADO asc; pode conter
 *  duplicata (dois arquivos com o mesmo prefixo `NNNN`) — é o guard, não este helper, que a rejeita.
 *  FAIL-CLOSED: `parseAdr` LANÇA num ADR malformado (nome/heading/status fora do padrão) — a exceção
 *  sobe e reprova o guard, em vez de o número sumir do cálculo. */
export function adrNumbers(files: AdrFile[]): number[] {
  return files
    .map(parseAdr)
    .filter((e): e is AdrEntry => e !== null)
    .map((e) => e.num)
    .sort((a, b) => a - b);
}

/** PRÓXIMO-LIVRE determinístico = MAX+1 (append; `0000` = 0). Diretório sem ADR ⇒ 1 (o `0000` é template,
 *  não conta). É o número que o scaffolder crava; sob corrida, quem mergeia primeiro o fixa e o outro
 *  recomputa (rebumpa) contra a `main` já mergeada. */
export function nextAdrNumber(files: AdrFile[]): number {
  const nums = adrNumbers(files);
  return nums.length === 0 ? 1 : Math.max(...nums) + 1;
}

export interface SequenceCheck {
  ok: boolean;
  duplicates: number[]; //  números repetidos (colisão de prefixo `NNNN`)
  holes: number[]; //       números faltando na corrida contígua 1..MAX
  max: number; //           maior número presente (0 se vazio)
}

/** Guard de sequência: a corrida `0001..MAX` tem de ser CONTÍGUA e ÚNICA. Reporta duplicados E buracos
 *  (não para no 1º) para que a mensagem do CLI nomeie TODOS os defeitos de uma vez. `ok` só quando ambos
 *  vazios. */
export function checkSequence(files: AdrFile[]): SequenceCheck {
  const nums = adrNumbers(files); // asc; pode repetir
  const seen = new Set<number>();
  const dups = new Set<number>();
  for (const n of nums) (seen.has(n) ? dups : seen).add(n);
  const max = nums.length === 0 ? 0 : Math.max(...nums);
  const holes: number[] = [];
  for (let i = 1; i <= max; i++) if (!seen.has(i)) holes.push(i);
  const duplicates = [...dups].sort((a, b) => a - b);
  return { ok: duplicates.length === 0 && holes.length === 0, duplicates, holes, max };
}

/** Slug canônico a partir do título: minúsculas, ASCII, kebab — casa a gramática `ADR_SLUG` do índice
 *  (`^\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$`), senão o próprio arquivo criado seria fail-soft no índice. */
export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacríticos (á→a, ç→c…)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface Scaffold {
  filename: string; //  ex.: "0032-minha-decisao.md" (relativo a docs/decisions/)
  content: string; //   o template já numerado/titulado/datado, Status = proposto
}

/** PURA (sem I/O): monta o arquivo do novo ADR a partir do template, JÁ numerado. NÃO mexe no Status
 *  (nasce `proposto` — ADR-0031 ponto 4: o Build PARA no G2; o humano flipa p/ `aceito` antes do merge).
 *  Carimba a `- **Data:**` de hoje. Título sem alfanumérico ⇒ lança (não dá p/ derivar o slug). */
export function scaffoldAdr(template: string, num: number, title: string, date: string): Scaffold {
  const trimmed = title.trim();
  const slug = slugify(trimmed);
  if (!slug)
    throw new Error(`título '${title}' não gera slug (precisa de ao menos um caractere alfanumérico)`);
  const numStr = String(num).padStart(4, "0");
  const heading = new RegExp(String.raw`^# ADR-NNNN [—–-] .*$`, "m");
  const dataLine = /^- \*\*Data:\*\* .*$/m;
  if (!heading.test(template))
    throw new Error("template sem heading '# ADR-NNNN — …' — o scaffolder não sabe onde numerar");
  const content = template
    .replace(heading, `# ADR-${numStr} — ${trimmed}`)
    .replace(dataLine, `- **Data:** ${date}`);
  return { filename: `${numStr}-${slug}.md`, content };
}

// ── CLI ──────────────────────────────────────────────────────────────────────────────────────────
// `--next` imprime o próximo-livre; `--check` roda o guard (fail-closed); `--new "<t>"` scaffolda;
// default = self-check que PROVA a mordida (dir real contígua + guard morde dup E buraco).
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
  const argv = process.argv.slice(2);
  const flag = (name: string) => argv.includes(name);
  // `--dir <path>` sobrepõe o diretório de ADRs (usado nos self-checks/demonstração; default = repo).
  const dirIdx = argv.indexOf("--dir");
  const DIR = dirIdx >= 0 ? argv[dirIdx + 1]! : here("../../docs/decisions");
  const README = `${DIR}/README.md`;
  const TEMPLATE = here("../../skills/orion-orchestrator/templates/adr.md");

  const fail = (msg: string) => {
    console.error(msg);
    process.exit(1);
  };

  if (flag("--next")) {
    console.log(nextAdrNumber(readAdrFiles(DIR)));
  } else if (flag("--check")) {
    // Guard fail-closed: reprova duplicado/buraco (e propaga a exceção de ADR malformado do parseAdr).
    const c = checkSequence(readAdrFiles(DIR));
    if (c.ok) {
      console.log(`ADR-SEQUENCE CHECK: PASS (sequência 0001..${String(c.max).padStart(4, "0")} contígua e única)`);
    } else {
      const parts: string[] = [];
      if (c.duplicates.length) parts.push(`duplicado(s): ${c.duplicates.map((n) => String(n).padStart(4, "0")).join(", ")}`);
      if (c.holes.length) parts.push(`buraco(s): ${c.holes.map((n) => String(n).padStart(4, "0")).join(", ")}`);
      fail(`ADR-SEQUENCE CHECK: FAIL — ${parts.join(" · ")}. Renumere (quem mergeia primeiro fixa; o outro rebumpa).`);
    }
  } else if (flag("--new")) {
    const nIdx = argv.indexOf("--new");
    const title = argv[nIdx + 1];
    if (!title || title.startsWith("--")) fail('uso: --new "<título da decisão>" [--dir <path>] [--dry-run]');
    const files = readAdrFiles(DIR);
    const num = nextAdrNumber(files);
    const date = new Date().toISOString().slice(0, 10);
    const { filename, content } = scaffoldAdr(readFileSync(TEMPLATE, "utf-8"), num, title!, date);
    if (flag("--dry-run")) {
      console.log(`ADR-SEQUENCE NEW (dry-run): criaria ${filename} (ADR-${String(num).padStart(4, "0")}, Status: proposto)`);
    } else {
      writeFileSync(`${DIR}/${filename}`, content);
      // Encadeia a regeneração do índice (uma fonte de lógica — não duplica o parsing).
      writeFileSync(README, buildAdrIndex(readAdrFiles(DIR)));
      console.log(`ADR-SEQUENCE NEW: criado ${filename} (ADR-${String(num).padStart(4, "0")}) + índice regenerado. Nasce 'proposto' — PARE no G2.`);
    }
  } else {
    // Self-check (default): (1) a sequência REAL do repo é contígua/única; (2) o guard MORDE um dir
    // sintético com DUPLICADO e outro com BURACO. Exit 0 só se real.ok E ambas as mordidas pegam.
    const real = checkSequence(readAdrFiles(DIR));
    const base: AdrFile[] = [
      { name: "0001-a.md", content: "# ADR-0001 — A\n\n- **Status:** aceito\n" },
      { name: "0002-b.md", content: "# ADR-0002 — B\n\n- **Status:** aceito\n" },
      { name: "0003-c.md", content: "# ADR-0003 — C\n\n- **Status:** aceito\n" },
    ];
    const dupBites = !checkSequence([...base, { name: "0003-c2.md", content: "# ADR-0003 — C2\n\n- **Status:** aceito\n" }]).ok;
    const holeBites = !checkSequence([base[0]!, base[2]!]).ok; // 0001, 0003 → buraco em 0002
    console.log(JSON.stringify({ caso: "sequência REAL do repo", ok: real.ok, max: real.max }));
    console.log(JSON.stringify({ caso: "guard morde duplicado", detectado: dupBites }));
    console.log(JSON.stringify({ caso: "guard morde buraco", detectado: holeBites }));
    if (!real.ok || !dupBites || !holeBites)
      fail("SELF-CHECK FALHOU: sequência real inválida ou o guard não morde dup/buraco.");
  }
}
