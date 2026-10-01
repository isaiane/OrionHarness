// board-projection.ts — Projeção derivada do board (T10.3 / O10, ADR-0033).
//
// Decide, para uma tarefa (Issue SDD) e o estado dos seus artefatos no GitHub, EM QUAL COLUNA do
// Project ela cai. O board é uma PROJEÇÃO DERIVADA de eventos, NUNCA fonte (ADR-0006/0026/0033): a
// fonte de status é a Issue; este mapa só reflete. Propriedades exigidas pelo ADR-0033 (restrições da tabela de transição):
//   (i)   toda coluna tem origem de evento determinística — inclusive `Ready` (G1 dado);
//   (ii)  o PAPEL do artefato distingue etapas com o mesmo tipo de evento — um PR de **contrato**
//         (spec/tests do pipeline, ADR-0030) e um de **implementação** caem em colunas distintas,
//         não colapsam em "In review";
//   (iii) **unblock tem estado de volta** — remover `blocked`/`needs-human-approval` recomputa e
//         retorna à coluna derivável do evento, não a um limbo (por construção: `Blocked` é só um
//         ramo; sem o rótulo, a função cai nos demais);
//   (iv)  **idempotente** — reprocessar o mesmo evento não muda a coluna (função pura).
//
// ESCRITOR ÚNICO (ADR-0033 escrita restrita ao projetor): o único caminho de escrita de Status é esta projeção (via a
// Action projetora + reconciliação). As automações NATIVAS de Status do Projects ficam DESLIGADAS —
// um segundo escritor sobrescreveria a projeção.
//
// A coluna `Blocked` por LABEL de gate segue a convenção do runbook (T10.4, #274).
//
// EVIDÊNCIA SOB O TOOL-GUARD (ADR-0011/0015) = o modo **sem args** (demo + self-check):
//   node --experimental-strip-types tools/projects/board-projection.ts   # demo + self-check
// SAI COM CÓDIGO ≠ 0 se qualquer caso divergir do esperado (regressão própria).
// `--raw` (stdin: RawTask) monta o estado e projeta; `--issue-from-branch <ref>` e `--closing-refs [owner/repo]` (stdin)
// servem à associação sem `Closes #N` (#278). Com um JSON (ou `-` p/ stdin) classifica aquele estado — para o operador humano/CI fora do shell
// guardado do agente (args posicionais não passam pela allowlist do guard, por design — ADR-0015).

import { readFileSync } from "node:fs";

/** As seis colunas do board, na grafia LITERAL e normativa do ADR-0033 ponto 6 (sentence case). */
export type Column = "Backlog" | "Ready" | "In progress" | "In review" | "Blocked" | "Done";
export const COLUMNS: readonly Column[] = [
  "Backlog",
  "Ready",
  "In progress",
  "In review",
  "Blocked",
  "Done",
];

/** Papel do PR no pipeline (ADR-0030): contrato (spec/tests, escrito pelo revisor) vs implementação. */
export type PrRole = "contract" | "implementation";

/** Estado de um PR vinculado à tarefa (normalizado do payload do GitHub). */
export interface LinkedPr {
  state: "open" | "closed";
  merged: boolean;
  role: PrRole;
}

/** Estado derivável de uma tarefa: a Issue SDD + os artefatos que o GitHub emite por evento. */
export interface TaskState {
  /** o board rastreia Issues; o PR entra como artefato vinculado, não como item próprio. */
  issueState: "open" | "closed";
  /** razão do fechamento (nativo): só `completed` conta como conclusão (espelha plan-report). */
  issueStateReason: "completed" | "not_planned" | null;
  labels: string[];
  linkedPr: LinkedPr | null;
  /** existe branch da tarefa (`<tipo>/<n>-<slug>`, #278). Ausente ⇒ `false`. */
  branch?: boolean;
}

/** Rótulos de gate que alimentam `Blocked` (ADR-0033 ponto 6 (Blocked por rótulo)). */
const BLOCK_LABELS: readonly string[] = ["blocked", "needs-human-approval"];
/** Rótulo que sinaliza G1 dado — alimentador de `Ready` (ADR-0033 restrição (i) da tabela de transição). */
const READY_LABEL = "ready";

export interface Projection {
  column: Column;
  reason: string;
}

/**
 * Projeta a coluna a partir do estado da tarefa. Precedência (ordem importa; fail-closed → `Backlog`):
 *  1. **Done**     — Issue fechada como `completed` OU PR vinculado mergeado (conclusão vence rótulo velho).
 *  2. **Blocked**  — rótulo de gate presente (o gatilho ao vivo é T10.4; a entrada existe aqui).
 *  3. **In review**   — PR de **implementação** aberto (revisão do código).
 *  4. **In progress** — PR de **contrato** aberto (spec/tests do pipeline — não colapsa em "In review").
 *  5. **In progress** — branch da tarefa existe, sem PR aberto (#278; decisão de Isa no G1).
 *  6. **Ready**    — G1 dado (rótulo `ready`), sem PR nem branch.
 *  7. **Backlog**  — default: Issue aberta em intake, sem sinal de avanço.
 *
 * Fail-closed: entrada malformada NUNCA projeta uma coluna mais avançada (não registra progresso
 * falso) — cai em `Backlog` (o estado menos avançado, neutro) com a razão explícita.
 */
export function projectColumn(t: TaskState): Projection {
  if (t === null || typeof t !== "object" || Array.isArray(t))
    return { column: "Backlog", reason: `estado inválido (${JSON.stringify(t)}) — fail-closed ⇒ Backlog` };

  const rec = t as unknown as Record<string, unknown>;
  const labels = Array.isArray(rec.labels) ? (rec.labels as unknown[]).filter((x): x is string => typeof x === "string") : [];

  // Validação fail-closed dos campos que movem a coluna para frente.
  if (rec.issueState !== "open" && rec.issueState !== "closed")
    return { column: "Backlog", reason: `issueState inválido (${JSON.stringify(rec.issueState)}) — fail-closed ⇒ Backlog` };

  const pr = normalizePr(rec.linkedPr);
  if (pr === "invalid")
    return { column: "Backlog", reason: `linkedPr inválido (${JSON.stringify(rec.linkedPr)}) — fail-closed ⇒ Backlog` };

  if (rec.branch !== undefined && typeof rec.branch !== "boolean")
    return { column: "Backlog", reason: `branch inválido (${JSON.stringify(rec.branch)}) — fail-closed ⇒ Backlog` };

  // 1. Done — Issue FECHADA sai do fluxo ativo. `completed` e `not_planned`/`duplicate` caem os dois
  //    aqui: uma cancelada NÃO é `Backlog` (intake) — não há coluna "Cancelada" nas seis normativas, e
  //    apresentá-la como pendente seria status falso a cada reconciliação (Codex …7109). O ESTADO VIVO
  //    da Issue tem PRECEDÊNCIA sobre o registro histórico de merge: uma Issue **reaberta** (`open`) com
  //    um PR mergeado no histórico NÃO fica presa em `Done` — cai adiante e recomputa (Codex …7090).
  if (rec.issueState === "closed") {
    const why = rec.issueStateReason === "completed"
      ? "completed"
      : `fechada (${rec.issueStateReason ?? "sem razão"}) — fora do fluxo`;
    return { column: "Done", reason: `Issue ${why}` };
  }

  // 2. Blocked — gate pendente (gatilho ao vivo em T10.4; unblock recomputa e cai adiante).
  const gate = labels.find((l) => BLOCK_LABELS.includes(l));
  if (gate) return { column: "Blocked", reason: `rótulo de gate '${gate}' (unblock recomputa — T10.4)` };

  // 3/4. PR aberto — o PAPEL distingue a coluna (ADR-0033 restrição (ii) da tabela de transição).
  if (pr && pr.state === "open") {
    return pr.role === "implementation"
      ? { column: "In review", reason: "PR de implementação aberto" }
      : { column: "In progress", reason: "PR de contrato aberto (spec/tests — não colapsa em In review)" };
  }

  // 5. In progress — a branch da tarefa existe e ainda não há PR aberto (#278: o trabalho começou
  //    antes do PR; a branch é o sinal mais cedo de avanço, sem depender de `Closes #N`).
  if (rec.branch === true) return { column: "In progress", reason: "branch da tarefa existe, sem PR aberto" };

  // 6. Ready — G1 dado, sem PR aberto nem branch.
  if (labels.includes(READY_LABEL)) return { column: "Ready", reason: "G1 dado (rótulo 'ready'), sem PR" };

  // 7. Backlog — intake.
  return { column: "Backlog", reason: "Issue aberta em intake, sem sinal de avanço" };
}

/** Normaliza `linkedPr`: `null` (sem PR), objeto válido, ou `"invalid"` (fail-closed). */
function normalizePr(v: unknown): LinkedPr | null | "invalid" {
  if (v === null || v === undefined) return null;
  if (typeof v !== "object" || Array.isArray(v)) return "invalid";
  const r = v as Record<string, unknown>;
  if (r.state !== "open" && r.state !== "closed") return "invalid";
  if (typeof r.merged !== "boolean") return "invalid";
  if (r.role !== "contract" && r.role !== "implementation") return "invalid";
  return { state: r.state, merged: r.merged, role: r.role };
}

// ---------------------------------------------------------------------------------------------------
// Associação Issue ↔ artefato SEM depender de `Closes #N` (#278, lacunas D/G do #272).
// ---------------------------------------------------------------------------------------------------

/**
 * Prefixos de branch de TAREFA (§6: `feat/<nº>-slug` / `fix/…` / `chore/…`) — os tipos do Conventional
 * Commits. ALLOWLIST (Codex #296): rotas de manutenção (`flip/2026-10-01`, `release/…`), fast-lane (`fast/`)
 * e bots ficam de fora — um slug numérico nelas NÃO é Issue.
 */
const TASK_BRANCH_PREFIXES: readonly string[] = [
  "feat", "fix", "chore", "docs", "refactor", "test", "ci", "perf", "build", "style", "revert",
];

/**
 * Deriva a Issue do nome da branch pela convenção do repo (`<tipo>/<n>-<slug>`, AGENTS.md §6).
 * FAIL-CLOSED: prefixo fora da allowlist ou nome fora do padrão ⇒ `null` (não projeta — nunca adivinha).
 */
export function issueFromBranch(ref: unknown): number | null {
  if (typeof ref !== "string") return null;
  const name = ref.replace(/^refs\/heads\//, "");
  const m = /^([a-z]+)\/(\d+)-[A-Za-z0-9]/.exec(name);
  if (!m || !TASK_BRANCH_PREFIXES.includes(m[1] ?? "")) return null;
  const n = Number(m[2]);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/**
 * Issues fechadas por palavra-chave num corpo de PR (`Closes #N`, `fixes owner/repo#N`, `resolved: <URL da
 * Issue>`…) — só do PRÓPRIO repo: `#N` nu, ou `owner/repo#N`/URL quando `repo` (`owner/name`) casa (sem
 * diferenciar maiúsculas). Usada no evento `edited` para recomputar as Issues do corpo ANTERIOR (Codex #296).
 */
export function closingRefs(body: unknown, repo?: string): number[] {
  if (typeof body !== "string") return [];
  const self = typeof repo === "string" ? repo.toLowerCase() : null;
  const out = new Set<number>();
  const re =
    /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*:?\s+(?:https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/issues\/|([\w.-]+\/[\w.-]+)?#)(\d+)\b/gi;
  for (const m of body.matchAll(re)) {
    const qualified = (m[1] ?? m[2])?.toLowerCase();
    if (qualified !== undefined && qualified !== self) continue; // outro repo (ou repo não informado)
    const n = Number(m[3]);
    if (Number.isSafeInteger(n) && n > 0) out.add(n);
  }
  return [...out].sort((a, b) => a - b);
}

/** PR como o workflow o lê do GitHub (GraphQL/`gh`), antes de normalizar. */
export interface RawPr {
  state: string; // OPEN | CLOSED | MERGED
  merged: boolean;
  headRefName: string;
  labels: string[];
}

/** Dados crus de uma Issue, coletados AO VIVO pelo job serializado (#278 I). */
export interface RawTask {
  issue: number;
  issueState: string; // OPEN | CLOSED
  issueStateReason: string | null;
  labels: string[];
  /** PRs que fecham a Issue (`closedByPullRequestsReferences`). */
  closingPrs: RawPr[];
  /** PRs ABERTOS do repo — os ligados pela branch (`<tipo>/<n>-…`) contam como da tarefa. */
  openPrs: RawPr[];
  /** nomes das branches do repo. */
  branches: string[];
}

/**
 * Monta o `TaskState` a partir dos dados crus. PR da tarefa = os que a fecham ∪ os abertos ligados pela
 * branch; um PR ABERTO tem precedência (Codex …4055588588), só então o mergeado. FAIL-CLOSED: entrada
 * malformada ⇒ `"invalid"` (o workflow não escreve).
 */
export function assembleState(raw: unknown): TaskState | "invalid" {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return "invalid";
  const r = raw as Record<string, unknown>;
  const n = r.issue;
  if (typeof n !== "number" || !Number.isSafeInteger(n) || n <= 0) return "invalid";
  if (typeof r.issueState !== "string") return "invalid";
  if (!Array.isArray(r.labels) || !Array.isArray(r.closingPrs) || !Array.isArray(r.openPrs) || !Array.isArray(r.branches))
    return "invalid";
  const prs = [...(r.closingPrs as unknown[]), ...(r.openPrs as unknown[]).filter((p) =>
    p !== null && typeof p === "object" && issueFromBranch((p as RawPr).headRefName) === n)];
  for (const p of prs) {
    if (p === null || typeof p !== "object") return "invalid";
    const q = p as Record<string, unknown>;
    if (typeof q.state !== "string" || typeof q.merged !== "boolean" || !Array.isArray(q.labels)) return "invalid";
  }
  const typed = prs as RawPr[];
  const pick = typed.find((p) => p.state.toUpperCase() === "OPEN") ?? typed.find((p) => p.merged);
  const reason = r.issueStateReason;
  return {
    issueState: r.issueState.toLowerCase() as TaskState["issueState"],
    issueStateReason: typeof reason === "string" ? (reason.toLowerCase() as TaskState["issueStateReason"]) : null,
    labels: (r.labels as unknown[]).filter((x): x is string => typeof x === "string"),
    linkedPr: pick
      ? {
          state: pick.state.toUpperCase() === "OPEN" ? "open" : "closed",
          merged: pick.merged,
          role: pick.labels.includes("pipeline:contract") ? "contract" : "implementation",
        }
      : null,
    branch: (r.branches as unknown[]).some((b) => issueFromBranch(b) === n),
  };
}

/** Casos-canônicos com o resultado esperado — servem de demo E de auto-verificação. */
const CASOS: ReadonlyArray<{ nome: string; t: TaskState; esperado: Column }> = [
  {
    nome: "Issue aberta, sem PR, sem rótulo → Backlog",
    esperado: "Backlog",
    t: { issueState: "open", issueStateReason: null, labels: ["type:task"], linkedPr: null },
  },
  {
    nome: "Issue aberta com G1 dado (ready), sem PR → Ready",
    esperado: "Ready",
    t: { issueState: "open", issueStateReason: null, labels: ["type:task", "ready"], linkedPr: null },
  },
  {
    nome: "PR de contrato aberto → In progress (não colapsa em In review)",
    esperado: "In progress",
    t: { issueState: "open", issueStateReason: null, labels: [], linkedPr: { state: "open", merged: false, role: "contract" } },
  },
  {
    nome: "PR de implementação aberto → In review",
    esperado: "In review",
    t: { issueState: "open", issueStateReason: null, labels: [], linkedPr: { state: "open", merged: false, role: "implementation" } },
  },
  {
    nome: "rótulo de gate → Blocked",
    esperado: "Blocked",
    t: { issueState: "open", issueStateReason: null, labels: ["needs-human-approval"], linkedPr: { state: "open", merged: false, role: "implementation" } },
  },
  {
    nome: "unblock (rótulo removido) retorna ao estado derivável (In review)",
    esperado: "In review",
    t: { issueState: "open", issueStateReason: null, labels: [], linkedPr: { state: "open", merged: false, role: "implementation" } },
  },
  {
    nome: "Issue fechada como completed (merge fechou) → Done (vence rótulo velho)",
    esperado: "Done",
    t: { issueState: "closed", issueStateReason: "completed", labels: ["needs-human-approval"], linkedPr: { state: "closed", merged: true, role: "implementation" } },
  },
  {
    nome: "Issue cancelada (not_planned) → Done, não Backlog",
    esperado: "Done",
    t: { issueState: "closed", issueStateReason: "not_planned", labels: ["type:task"], linkedPr: null },
  },
  {
    nome: "branch da tarefa sem PR aberto → In progress (#278)",
    esperado: "In progress",
    t: { issueState: "open", issueStateReason: null, labels: ["ready"], linkedPr: null, branch: true },
  },
  {
    nome: "Issue reaberta (open) com PR mergeado no histórico → recomputa, não fica Done",
    esperado: "Backlog",
    t: { issueState: "open", issueStateReason: null, labels: [], linkedPr: { state: "closed", merged: true, role: "implementation" } },
  },
];

/** Roda os casos canônicos e assert a coluna esperada; retorna o nº de divergências. */
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
  if (arg === "--issue-from-branch") {
    const n = issueFromBranch(process.argv[3]);
    if (n !== null) console.log(n);
  } else if (arg === "--closing-refs") {
    for (const n of closingRefs(readFileSync(0, "utf8"), process.argv[3])) console.log(n);
  } else if (arg === "--raw") {
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(0, "utf8"));
    } catch (e) {
      console.error(`dados crus JSON inválidos: ${(e as Error).message}`);
      process.exit(2);
    }
    const state = assembleState(raw);
    if (state === "invalid") {
      console.error("dados crus malformados — fail-closed (nada projetado)");
      process.exit(2);
    }
    console.log(JSON.stringify(projectColumn(state)));
  } else if (arg && arg !== "--demo") {
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
