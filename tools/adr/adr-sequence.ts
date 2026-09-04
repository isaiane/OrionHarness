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

import { readFileSync, writeFileSync, rmSync, renameSync } from "node:fs";
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
  // Título tem de ser UMA LINHA: uma quebra de linha silenciaria o índice (o H1 casa só a 1ª linha ⇒
  // título truncado) e, se a 2ª linha parecer metadado, `buildAdrIndex` lançaria DEPOIS de o arquivo já
  // ter sido escrito (órfão + índice inconsistente). Validar ANTES do side effect (achado Codex #212, §8.1).
  if (/[\r\n]/.test(title))
    throw new Error(`título não pode conter quebra de linha (deve ser uma única linha): ${JSON.stringify(title)}`);
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

/**
 * Portão VALIDA-ANTES-DE-ESCREVER do `--new` (achados Codex #212 r2/r3). Em vez de blocklistar um
 * delimitador por vez (quebra de linha, comentário HTML, `|`, crase…), garante UMA invariante reusando o
 * parser existente: **"o ADR gravado indexa EXATAMENTE o título pedido, ou nada é gravado"**. Lança (sem
 * nenhum side effect) se:
 *   1. a árvore existente já está fora de sequência (herdar colisão faria `--new` gravar + o índice lançar
 *      depois → órfão);
 *   2. o ADR montado NÃO faz round-trip — `parseAdr` não o reconhece, o número diverge, ou o título
 *      indexado ≠ do pedido (markup que o parser normaliza: comentário HTML etc.);
 *   3. `buildAdrIndex(existentes + novo)` lança (índice inconsistente / colisão com o novo número).
 */
export function assertNewAdrSafe(
  existing: AdrFile[],
  scaffold: Scaffold,
  requestedTitle: string,
  num: number,
): void {
  const pad4 = (n: number) => String(n).padStart(4, "0");
  const seq = checkSequence(existing);
  if (!seq.ok) {
    const parts: string[] = [];
    if (seq.duplicates.length) parts.push(`duplicado(s): ${seq.duplicates.map(pad4).join(", ")}`);
    if (seq.holes.length) parts.push(`buraco(s): ${seq.holes.map(pad4).join(", ")}`);
    throw new Error(
      `docs/decisions/ já está fora de sequência (${parts.join(" · ")}) — corrija antes de criar novo ADR (rode --check).`,
    );
  }
  const entry = parseAdr({ name: scaffold.filename, content: scaffold.content });
  const want = requestedTitle.trim();
  if (!entry)
    throw new Error(`ADR gerado não é reconhecido pelo parser — título ${JSON.stringify(requestedTitle)} inseguro.`);
  if (entry.num !== num)
    throw new Error(`número do ADR gerado (${entry.num}) diverge do próximo-livre (${num}).`);
  if (entry.title !== want)
    throw new Error(
      `título pedido (${JSON.stringify(want)}) difere do que o índice registraria (${JSON.stringify(entry.title)}) — remova markup que o parser normaliza (ex.: comentário HTML).`,
    );
  buildAdrIndex([...existing, { name: scaffold.filename, content: scaffold.content }]); // lança se inconsistente
}

// ── CLI ──────────────────────────────────────────────────────────────────────────────────────────
// `--next` imprime o próximo-livre; `--check` roda o guard (fail-closed); `--new "<t>"` scaffolda;
// default = self-check que PROVA a mordida (dir real contígua + guard morde dup E buraco).
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
  const argv = process.argv.slice(2);

  const USAGE = 'uso: [--next | --check | --new "<título>"] [--dir <path>] [--dry-run]';
  const fail = (msg: string) => {
    console.error(msg);
    process.exit(1);
  };

  // Parser ESTRITO (allowlist): rejeita token desconhecido, opção REPETIDA e mais de um modo primário. É
  // meta-tooling que CI/agente confia pelo exit-code — um `--neww` cairia no self-check (exit 0, sem criar
  // ADR), um `--dr` ignorado faria o `--check` mirar o repo REAL em silêncio, e `--new A --new B` gravaria B
  // sobrescrevendo A sem avisar. Falhar cedo, nunca agir num pedido diferente do pretendido (Codex #212).
  const opts: { next?: boolean; check?: boolean; new?: string; dir?: string; dryRun?: boolean } = {};
  const seen = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (!["--new", "--dir", "--next", "--check", "--dry-run"].includes(a))
      fail(`argumento desconhecido: ${a}\n${USAGE}`);
    if (seen.has(a)) fail(`opção repetida: ${a} — informe cada opção uma única vez.\n${USAGE}`);
    seen.add(a);
    if (a === "--new" || a === "--dir") {
      const v = argv[++i];
      if (v === undefined || v.startsWith("--")) fail(`opção ${a} exige um valor.\n${USAGE}`);
      if (a === "--new") opts.new = v!;
      else opts.dir = v!;
    } else if (a === "--next") opts.next = true;
    else if (a === "--check") opts.check = true;
    else if (a === "--dry-run") opts.dryRun = true;
  }
  const modes = [opts.next && "--next", opts.check && "--check", opts.new !== undefined && "--new"].filter(
    Boolean,
  ) as string[];
  if (modes.length > 1) fail(`modos conflitantes: ${modes.join(", ")} — escolha apenas um.\n${USAGE}`);

  const DIR = opts.dir ?? here("../../docs/decisions");
  const README = `${DIR}/README.md`;
  const TEMPLATE = here("../../skills/orion-orchestrator/templates/adr.md");

  if (opts.next) {
    console.log(nextAdrNumber(readAdrFiles(DIR)));
  } else if (opts.check) {
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
  } else if (opts.new !== undefined) {
    const files = readAdrFiles(DIR);
    const num = nextAdrNumber(files);
    const date = new Date().toISOString().slice(0, 10);
    const scaffold = scaffoldAdr(readFileSync(TEMPLATE, "utf-8"), num, opts.new, date);
    // Portão valida-antes-de-escrever: lança (sem escrever nada) se a árvore já está quebrada ou se o ADR
    // não faz round-trip (título indexado ≠ do pedido / índice inconsistente). Nunca deixa órfão (Codex r2/r3).
    try {
      assertNewAdrSafe(files, scaffold, opts.new, num);
    } catch (e) {
      fail(`ADR-SEQUENCE NEW: recusado — ${(e as Error).message}`);
    }
    if (opts.dryRun) {
      console.log(`ADR-SEQUENCE NEW (dry-run): criaria ${scaffold.filename} (ADR-${String(num).padStart(4, "0")}, Status: proposto)`);
    } else {
      const adrPath = `${DIR}/${scaffold.filename}`;
      writeFileSync(adrPath, scaffold.content);
      // Encadeia a regeneração do índice (uma fonte de lógica — não duplica o parsing). Duas escritas não
      // são atômicas no FS, então o índice é gravado ATOMICAMENTE: escreve num arquivo temporário e faz
      // `rename` (atômico no mesmo FS) — o README nunca é aberto/truncado in-place, logo uma falha no meio
      // (ENOSPC/quota) NÃO deixa o índice antigo parcial/vazio (Codex #212 r5). Em qualquer falha, limpa o
      // temp e REVERTE o ADR recém-criado — sem órfão nem índice corrompido (rollback best-effort; se ele
      // também falhar, reporta para limpeza manual).
      const tmp = `${README}.tmp-${process.pid}-${Date.now()}`;
      try {
        writeFileSync(tmp, buildAdrIndex(readAdrFiles(DIR)));
        renameSync(tmp, README);
      } catch (e) {
        try {
          rmSync(tmp, { force: true });
        } catch {
          /* temp pode não existir / mesma causa — best-effort */
        }
        let rolledBack = true;
        try {
          rmSync(adrPath, { force: true });
        } catch {
          rolledBack = false;
        }
        fail(
          `ADR-SEQUENCE NEW: falha ao gravar o índice (${(e as Error).message}) — ${rolledBack ? "ADR revertido, índice antigo intacto (nada foi criado)" : `NÃO consegui reverter ${adrPath}, remova-o à mão`}. Verifique a permissão de ${README}.`,
        );
      }
      console.log(`ADR-SEQUENCE NEW: criado ${scaffold.filename} (ADR-${String(num).padStart(4, "0")}) + índice regenerado. Nasce 'proposto' — PARE no G2.`);
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
