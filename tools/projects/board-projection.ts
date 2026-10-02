// board-projection.ts — Projeção do board por SINAL EXPLÍCITO na Issue (ADR-0038, O14 / #310).
//
// Decide, para uma Issue, em QUAL COLUNA do Project ela cai. O board é PROJEÇÃO DERIVADA, NUNCA fonte
// (ADR-0006/0026/0033): a fonte é a Issue. Desde o ADR-0038 a etapa é um SINAL EXPLÍCITO que o agente aplica
// na Issue no momento em que ela acontece — o projetor só ESPELHA estado + rótulos. Nada de deduzir etapa por
// nome de branch, `Closes #N` ou papel de PR (a dedução de #278/#298 foi removida).
//
// Precedência (ADR-0038 §2):
//   1. Issue fechada (qualquer motivo)  → Done
//   2. rótulo `blocked`                 → Blocked
//   3. rótulo `status:in-review`        → In review
//   4. rótulo `status:in-progress`      → In progress
//   5. nenhum dos anteriores            → Backlog
// `needs-human-approval` (gate G1/G2) e `ready` (G1 dado) NÃO movem coluna (ADR-0038 §3): toda Issue nasce em
// Backlog. Função PURA e IDEMPOTENTE: o mesmo estado dá sempre a mesma coluna; remover `blocked` devolve a
// Issue à coluna do seu rótulo de status (unblock com estado de volta, por construção).
//
// ESCRITOR ÚNICO (ADR-0033): o único caminho de escrita de Status é esta projeção, via `project-board.yml`.
//
// CLI:
//   node --experimental-strip-types tools/projects/board-projection.ts        # demo + self-check (exit ≠ 0 se divergir)
//   node --experimental-strip-types tools/projects/board-projection.ts -      # stdin: TaskState JSON → {column, reason}
//   node --experimental-strip-types tools/projects/board-projection.ts '<json>'

import { readFileSync } from "node:fs";

/** As cinco colunas do board, na grafia LITERAL e normativa do ADR-0038 §1 (sentence case). */
export type Column = "Backlog" | "In progress" | "In review" | "Blocked" | "Done";
export const COLUMNS: readonly Column[] = ["Backlog", "In progress", "In review", "Blocked", "Done"];

/** Estado de uma Issue, como o workflow o lê (`gh issue view --json state,labels`, normalizado). */
export interface TaskState {
  issueState: "open" | "closed";
  labels: string[];
}

/** Rótulos de sinal (ADR-0038 §2). */
export const BLOCKED_LABEL = "blocked";
export const IN_REVIEW_LABEL = "status:in-review";
export const IN_PROGRESS_LABEL = "status:in-progress";

export interface Projection {
  column: Column;
  reason: string;
}

/**
 * Projeta a coluna a partir do estado da Issue (ADR-0038 §2). Fail-closed: entrada malformada NUNCA projeta
 * uma coluna mais avançada — cai em `Backlog` com a razão explícita.
 */
export function projectColumn(t: TaskState): Projection {
  if (t === null || typeof t !== "object" || Array.isArray(t))
    return { column: "Backlog", reason: `estado inválido (${JSON.stringify(t)}) — fail-closed ⇒ Backlog` };
  const rec = t as unknown as Record<string, unknown>;
  if (rec.issueState !== "open" && rec.issueState !== "closed")
    return { column: "Backlog", reason: `issueState inválido (${JSON.stringify(rec.issueState)}) — fail-closed ⇒ Backlog` };
  const labels = Array.isArray(rec.labels) ? (rec.labels as unknown[]).filter((x): x is string => typeof x === "string") : [];

  if (rec.issueState === "closed") return { column: "Done", reason: "Issue fechada" };
  if (labels.includes(BLOCKED_LABEL)) return { column: "Blocked", reason: `rótulo '${BLOCKED_LABEL}'` };
  if (labels.includes(IN_REVIEW_LABEL)) return { column: "In review", reason: `rótulo '${IN_REVIEW_LABEL}'` };
  if (labels.includes(IN_PROGRESS_LABEL)) return { column: "In progress", reason: `rótulo '${IN_PROGRESS_LABEL}'` };
  return { column: "Backlog", reason: "sem sinal de etapa" };
}

/** Casos canônicos com o resultado esperado — servem de demo E de auto-verificação. */
const CASOS: ReadonlyArray<{ nome: string; t: TaskState; esperado: Column }> = [
  { nome: "Issue nova, sem sinal → Backlog", esperado: "Backlog", t: { issueState: "open", labels: ["type:task"] } },
  { nome: "aguardando G1 (needs-human-approval) → Backlog", esperado: "Backlog", t: { issueState: "open", labels: ["needs-human-approval"] } },
  { nome: "G1 dado (ready), sem início → Backlog", esperado: "Backlog", t: { issueState: "open", labels: ["ready"] } },
  { nome: "implementação iniciada → In progress", esperado: "In progress", t: { issueState: "open", labels: ["ready", IN_PROGRESS_LABEL] } },
  { nome: "revisão solicitada → In review", esperado: "In review", t: { issueState: "open", labels: [IN_REVIEW_LABEL] } },
  { nome: "impedimento → Blocked (vence o status)", esperado: "Blocked", t: { issueState: "open", labels: [IN_REVIEW_LABEL, BLOCKED_LABEL] } },
  { nome: "fechada → Done (vence qualquer rótulo)", esperado: "Done", t: { issueState: "closed", labels: [BLOCKED_LABEL, IN_REVIEW_LABEL] } },
];

/** Roda os casos canônicos e confere a coluna esperada; retorna o nº de divergências. */
export function selfCheck(): number {
  let falhas = 0;
  for (const c of CASOS) {
    const p = projectColumn(c.t);
    const ok = p.column === c.esperado;
    if (!ok) falhas++;
    console.log(JSON.stringify({ caso: c.nome, ...p, esperado: c.esperado, ok }));
  }
  return falhas;
}

if (import.meta.main ?? (process.argv[1]?.endsWith("board-projection.ts") ?? false)) {
  const arg = process.argv[2];
  if (arg && arg !== "--demo") {
    const raw = arg === "-" ? readFileSync(0, "utf8") : arg;
    let state: TaskState;
    try {
      state = JSON.parse(raw) as TaskState;
    } catch (e) {
      console.error(`estado JSON inválido: ${(e as Error).message}`);
      process.exit(2);
    }
    console.log(JSON.stringify(projectColumn(state)));
  } else {
    const falhas = selfCheck();
    if (falhas > 0) {
      console.error(`SELF-CHECK FALHOU: ${falhas} caso(s) divergente(s) do esperado`);
      process.exit(1);
    }
  }
}
