#!/usr/bin/env node
// state-budget-check.ts — REDE HEURÍSTICA do STATE como PONTEIRO (T8.1b / épico O8; Issue #127; ADR-0024,
// modelo-alvo ADR-0025). A fatia b do ADR-0024: DEPOIS que a convenção de autoria (§4 reescrita + os dois
// reviewer-checklists) passou a ROTEAR por construção (fatia a / T8.1a), esta rede pega os sinais ÓBVIOS de
// história/status VAZANDO de volta ao `STATE.md`. Reusa o padrão visão-derivada + guard do repo
// (ADR-0019 `l0-core-manifest.ts` / ADR-0023 `adr-index.ts` / T9.6 `coherence-guard.ts`): funções PURAS
// exportadas p/ vitest, self-check que PROVA a mordida, exit ≠ 0 adequado a gate de CI.
//
// O guard lê o `STATE.md` real + o ORÇAMENTO de `.orion/state-budget.json` e reprova CINCO sinais óbvios:
//   S1. TAMANHO acima do orçamento — o número é CONFIG operacional (ADR-0024 item 4: recalibrar NÃO exige
//       ADR/G2), calibrado a um STATE-ponteiro real + folga; vive no config, nunca no texto constitucional
//       (embutir a contagem no §4 viraria o proxy em objetivo — o Goodhart que o Orion combate).
//   S2. CADEIA 'Antes…/Antes disso…' — marcador de retro-narrativa que o §4 proíbe no STATE.
//   S3. BULLET DATADO — um bullet do corpo com data ISO (`YYYY-MM-DD`) é narrativa histórica datada ("fez X
//       em 2026-08-04"), o exemplo que o ADR-0024 manda MORDER mesmo sob `Agora`/`Riscos`.
//   S4. REPETIÇÃO de 'última conclusão' — ≥2 bullets rotulados 'última conclusão' são uma CADEIA; o formato
//       aprovado tem UMA (ponteiro). O encadeamento é história.
//   S5. STATUS POR-ITEM — checkbox de critério SDD (`- [ ]`/`- [x]`) no STATE; status por-item é
//       autoritativo na Issue (L2), projetado no ledger, e NUNCA volta ao STATE (§4).
//
// ISENÇÃO DE REFERÊNCIA SANCIONADA (ADR-0024, "Isenção de referências sancionadas" + design desta fatia):
// um `#N` de Issue/PR é PONTEIRO para a fonte canônica — passa livremente (qualquer contagem; ele APONTA,
// não narra). Por isso o guard NÃO conta `#N` (a linha real `Última conclusão: #174 (PR #178 + flip #179)`
// passa). O que morde é DATA, cadeia, repetição, checkbox e tamanho — sinais de HISTÓRIA/STATUS, não de
// ponteiro. Uma DATA de calendário NÃO é isenta (decisão de design desta T8.1b): é a marca de narrativa
// datada e o próprio exemplo de mordida do ADR-0024; um risco/pendência vivo referencia seu item por `#N`
// (ponteiro), não embutindo uma data histórica. (Prazos forward-looking, se um dia necessários, ficam com a
// revisão humana — ver LIMITAÇÃO.)
//
// LIMITAÇÃO (impressa na saída — §8.1; ADR-0024 "Limitação conhecida"): é HEURÍSTICA e REDE, não garantia.
// Regex casa FORMA, não sentido — um autor pode escrever narrativa histórica SEM esses marcadores (ex.:
// "resolvemos o problema e ficou tudo funcionando") e PASSAR no guard. Logo GUARD VERDE NÃO PROVA que o
// STATE está limpo — prova só que os padrões conhecidos não apareceram. A GARANTIA do invariante (STATE =
// ponteiro; história → PRs mergeados; status → Issue) é a REVISÃO HUMANA (item dos dois reviewer-checklists),
// não este guard. Não enfraqueça checklist algum "porque o guard cobre" — ele não cobre.
//
// Roda em Node ≥ 22.6 via type stripping, SEM rede/token/API, sem toolchain:
//   node --experimental-strip-types tools/smoke/state-budget-check.ts   → self-check (born-green + prova mordida)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

/** Orçamento operacional do STATE (config, não governança — ADR-0024 item 4). `note` é documentação livre. */
export interface BudgetConfig {
  maxLines: number;
  note?: string;
}

/** Um bullet LÓGICO do corpo do STATE: linha 1-indexada do marcador + texto (continuações indentadas unidas). */
export interface Bullet {
  line: number;
  text: string;
}

export interface StateBudgetReport {
  ok: boolean;
  violations: string[];
  metrics: { lines: number; maxLines: number; bullets: number };
}

/** A limitação, impressa na saída do guard — a mesma que vive no ADR-0024/§4. */
export const LIMITATION =
  "LIMITAÇÃO: heurística/rede, não garantia (§8.1; ADR-0024). Regex casa forma, não sentido — narrativa " +
  "histórica SEM marcadores (data/'Antes'/checkbox) passa; um `#N` é ponteiro sancionado e não é contado. " +
  "Guard verde NÃO prova STATE limpo; a garantia do invariante (STATE=ponteiro; história→PRs mergeados; " +
  "status→Issue) é a REVISÃO HUMANA (dois reviewer-checklists). Não enfraqueça checklist 'porque o guard cobre'.";

// ────────────────────────────────────────────────────────────────────────────────────────────────────
// Predicados PUROS — cada um recebe insumos já materializados (testável sem I/O), retorna violações.
// ────────────────────────────────────────────────────────────────────────────────────────────────────

const BULLET_RE = /^(\s*)[-*]\s+/; //          marcador de lista no início da linha
const BLOCKQUOTE_RE = /^\s*>/; //              linha de blockquote (cabeçalho do STATE) — NÃO é corpo
const HEADING_RE = /^\s*#/; //                 heading (`## Última conclusão`) — NÃO é bullet
const CONTINUATION_RE = /^\s+\S/; //           linha indentada não-vazia: continuação do bullet corrente
const ISO_DATE_RE = /\b\d{4}-\d{2}-\d{2}\b/; // data de calendário (narrativa datada)
const ANTES_RE = /^\*{0,2}\s*antes(\s+disso)?\s*(:|…|\.\.\.)/i; // "Antes:" / "**Antes disso:**" / "Antes…"
const LAST_CONCLUSION_RE = /última\s+conclus/i; // rótulo 'última conclusão' usado como bullet
const CHECKBOX_RE = /^\[[ xX]\]/; //           checkbox de critério SDD, com o marcador `-`/`*` já removido

/** Conta as linhas do STATE ignorando UM `\n` final (arquivo terminado em newline não conta linha vazia). */
export function countLines(content: string): number {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\n$/, "");
  return normalized === "" ? 0 : normalized.split("\n").length;
}

/**
 * Extrai os bullets LÓGICOS do CORPO: linhas de lista (`-`/`*`) que NÃO estão em blockquote nem heading,
 * com as continuações INDENTADAS unidas ao bullet (senão uma data/`Antes` numa linha de continuação
 * escaparia). O cabeçalho do STATE (blockquote `>`, que cita "Antes…/Antes disso…" e "Última conclusão"
 * como orientação) e os headings de seção ficam de fora por construção — é o que mantém o guard born-green.
 */
export function extractBodyBullets(content: string): Bullet[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const bullets: Bullet[] = [];
  let cur: Bullet | null = null;
  const flush = (): void => {
    if (cur) bullets.push(cur);
    cur = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    if (BLOCKQUOTE_RE.test(raw) || HEADING_RE.test(raw) || raw.trim() === "") {
      flush(); // blockquote, heading ou linha vazia encerram o bullet corrente
      continue;
    }
    if (BULLET_RE.test(raw)) {
      flush();
      cur = { line: i + 1, text: raw.replace(BULLET_RE, "").trim() };
    } else if (cur && CONTINUATION_RE.test(raw)) {
      cur.text += " " + raw.trim(); // continuação indentada do bullet corrente
    } else {
      flush(); // prosa não-indentada (ex.: seção Ponteiros) — não é bullet
    }
  }
  flush();
  return bullets;
}

/** S1 — TAMANHO acima do orçamento. O número é config (recalibrar não exige ADR — ADR-0024 item 4). */
export function checkSize(lines: number, maxLines: number): string[] {
  return lines > maxLines
    ? [
        `orçamento estourado: STATE.md tem ${lines} linhas > ${maxLines} (config .orion/state-budget.json). ` +
          `Um ponteiro não cresce sem limite — roteie história→PRs mergeados e status→Issue (§4); ` +
          `recalibre o config só se o crescimento do ponteiro for legítimo (não afrouxe para caber narrativa).`,
      ]
    : [];
}

/** S2 — CADEIA 'Antes…/Antes disso…': marcador de retro-narrativa no início de um bullet do corpo. */
export function checkAntesChain(bullets: Bullet[]): string[] {
  return bullets
    .filter((b) => ANTES_RE.test(b.text))
    .map(
      (b) =>
        `cadeia narrativa 'Antes…' na linha ${b.line}: retro-narrativa — o STATE não guarda cadeia ` +
        `histórica (§4). Roteie o "antes" para os PRs mergeados; mantenha só o ponteiro forward-looking.`,
    );
}

/** S3 — BULLET DATADO: data ISO num bullet do corpo = narrativa datada (morde mesmo sob `Agora`/`Riscos`). */
export function checkDatedBullets(bullets: Bullet[]): string[] {
  return bullets
    .filter((b) => ISO_DATE_RE.test(b.text))
    .map(
      (b) =>
        `bullet datado (narrativa histórica) na linha ${b.line}: contém data ISO — o STATE é ponteiro, ` +
        `não log; datas por-PR vão para o histórico (PRs mergeados). Um #N pontual é ponteiro sancionado; ` +
        `uma data não é.`,
    );
}

/** S4 — REPETIÇÃO de 'última conclusão': ≥2 bullets rotulados = cadeia (o formato aprovado tem UMA). */
export function checkRepeatedLastConclusion(bullets: Bullet[]): string[] {
  const hits = bullets.filter((b) => LAST_CONCLUSION_RE.test(b.text));
  return hits.length >= 2
    ? [
        `repetição de 'última conclusão' (cadeia narrativa): ${hits.length} bullets rotulados 'última ` +
          `conclusão' (linhas ${hits.map((h) => h.line).join(", ")}) — o formato aprovado tem UMA última ` +
          `conclusão (ponteiro). Um encadeamento é história → roteie para os PRs mergeados.`,
      ]
    : [];
}

/** S5 — STATUS POR-ITEM: checkbox de critério SDD no STATE (status é autoritativo na Issue L2, não no STATE). */
export function checkStatusCheckboxes(bullets: Bullet[]): string[] {
  return bullets
    .filter((b) => CHECKBOX_RE.test(b.text))
    .map(
      (b) =>
        `status por-item na linha ${b.line}: checkbox de critério (SDD) no STATE — status por-item é ` +
        `autoritativo na Issue SDD (L2), projetado no ledger; nunca volta ao STATE (§4).`,
    );
}

/** Agrega os CINCO sinais. PURA: recebe o conteúdo e o config já materializados (o I/O fica no CLI). */
export function runStateBudgetCheck(input: {
  content: string;
  config: BudgetConfig;
}): StateBudgetReport {
  const lines = countLines(input.content);
  const bullets = extractBodyBullets(input.content);
  const violations: string[] = [];
  violations.push(...checkSize(lines, input.config.maxLines));
  violations.push(...checkAntesChain(bullets));
  violations.push(...checkDatedBullets(bullets));
  violations.push(...checkRepeatedLastConclusion(bullets));
  violations.push(...checkStatusCheckboxes(bullets));
  return {
    ok: violations.length === 0,
    violations,
    metrics: { lines, maxLines: input.config.maxLines, bullets: bullets.length },
  };
}

// ────────────────────────────────────────────────────────────────────────────────────────────────────
// Config — carregamento FAIL-CLOSED: sem orçamento válido o guard NÃO roda (um config quebrado não pode
// silenciar a rede). Forma mínima; recalibrar `maxLines` é config, não governança (ADR-0024 item 4).
// ────────────────────────────────────────────────────────────────────────────────────────────────────

export function isValidBudgetConfig(x: unknown): x is BudgetConfig {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  if (typeof o.maxLines !== "number" || !Number.isInteger(o.maxLines) || o.maxLines <= 0)
    return false;
  if ("note" in o && o.note !== undefined && typeof o.note !== "string") return false;
  return true;
}

export function loadBudgetConfig(path: string): BudgetConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf-8"));
  } catch (e) {
    throw new Error(
      `config de orçamento ilegível ('${path}'): ${(e as Error).message} — falha fechada (o guard não roda sem orçamento válido).`,
    );
  }
  if (!isValidBudgetConfig(parsed))
    throw new Error(
      `config de orçamento inválida ('${path}'): exige { "maxLines": inteiro positivo, "note"?: string } — falha fechada.`,
    );
  return parsed;
}

// ────────────────────────────────────────────────────────────────────────────────────────────────────
// Self-check: (1) roda contra o STATE.md + config REAIS (deve passar — nasce verde); (2) PROVA que cada
// um dos 5 sinais MORDE, pela PORTA AGREGADA (`runStateBudgetCheck`), não pelos helpers diretos — remover
// o wiring de um sinal deixaria o self-check verde sem cobrir aquele sinal. Exit ≠ 0 se o real falhar OU
// alguma mordida não for pega. LÊ a saída (verde do runner ≠ output correto).
if (process.argv[1]?.endsWith("state-budget-check.ts")) {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const config = loadBudgetConfig(join(root, ".orion/state-budget.json"));
  const content = readFileSync(join(root, "STATE.md"), "utf-8");

  const real = runStateBudgetCheck({ content, config });
  console.log(
    JSON.stringify({
      caso: "STATE.md REAL",
      ok: real.ok,
      ...real.metrics,
      violations: real.violations,
    }),
  );

  // Mordidas sintéticas pela porta agregada. Para isolar UM sinal por vez, os casos 2–5 usam um orçamento
  // FOLGADO (só o sinal-alvo dispara); o caso 1 usa um orçamento apertado contra um conteúdo maior.
  const run = (c: string): string[] =>
    runStateBudgetCheck({ content: c, config: { maxLines: 999 } }).violations;
  const biteSize = runStateBudgetCheck({
    content: "l1\nl2\nl3\nl4\nl5",
    config: { maxLines: 3 },
  }).violations.some((v) => v.includes("orçamento estourado"));
  const biteAntes = run("- **Antes disso:** ajustamos o parser e o núcleo.").some((v) =>
    v.includes("cadeia narrativa 'Antes"),
  );
  const biteDated = run("- corrigiu o parser do fence no PR #128 em 2026-08-04.").some((v) =>
    v.includes("bullet datado"),
  );
  const biteRepeated = run(
    "- Última conclusão: #10 (PR #11)\n- Última conclusão: #12 (PR #13)",
  ).some((v) => v.includes("repetição de 'última conclusão'"));
  const biteCheckbox = run("- [x] Critério 1 passa\n- [ ] Critério 2 pendente").some((v) =>
    v.includes("status por-item"),
  );
  // ISENÇÃO: um bullet-ponteiro com `#N` (inclusive múltiplos que descrevem UMA conclusão) NÃO morde.
  const isencaoRefPontual =
    run("- **Última conclusão:** #174 (T9.7b, PR #178 + flip #179): fecha o épico O9.").length ===
    0;

  const morde =
    biteSize && biteAntes && biteDated && biteRepeated && biteCheckbox && isencaoRefPontual;
  console.log(
    JSON.stringify({
      caso: "mutação (deve morder) + isenção (deve passar)",
      morde,
      biteSize,
      biteAntes,
      biteDated,
      biteRepeated,
      biteCheckbox,
      isencaoRefPontual,
    }),
  );

  console.log(LIMITATION);

  if (!real.ok || !morde) {
    console.error(
      "FALHA: guard vermelho no STATE.md real, ou uma mordida sintética não foi detectada, ou a isenção de #N regrediu.",
    );
    process.exit(1);
  }
}
