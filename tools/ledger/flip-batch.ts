#!/usr/bin/env node
// flip-batch.ts — Projeta o LOTE de flip `passes:false→true` (Orion, ADR-0033 / T10.2, #257).
//
// Aplica a decisão do ADR-0033: a flip continua sendo PR, mas é ESCRITA POR AUTOMAÇÃO, em lote, por
// AGENDA (dispatch), com o merge da entrega como FRONTEIRA DE ELEGIBILIDADE (não gatilho por-merge). Este
// módulo é o NÚCLEO projetável (puro + testável): dado o ledger escopado + o estado das Issues, computa
// as entradas ELEGÍVEIS-E-COM-EVIDÊNCIA e produz (a) o ledger flipado e (b) o corpo do PR correlacionando
// cada entrada à sua Issue de origem. Ele **abre** o material do PR; **nunca integra** (o workflow abre o
// PR sob o GitHub App SEM merge; a exclusão do merge é por branch ruleset — ADR-0033).
//
// Elegibilidade (ADR-0033):
//   base   = `awaitingFlip` de `classifyLifecycle` (sob-regime, !passes, JÁ em `origin/main` = entregue).
//   sinal  = EVIDÊNCIA verificável ancorada na Issue (ADR-0006): a Issue da entrada está CLOSED com
//            `stateReason === "completed"`. Isso separa "entregue-E-concluído" de uma projeção-só-de-ledger
//            que entrou antes da implementação (Issue ainda aberta / not-planned) — Codex #246/#193.
//   Sem o sinal, a entrada NÃO entra no lote (fica para julgamento humano) — nunca flipa cego o `--scoped`.
//
// CLI (Node >= 22.6, type stripping):
//   node --experimental-strip-types tools/ledger/flip-batch.ts --issues-json <arq> [--apply] [--base <b>]
//   dry-run (padrão): imprime as entradas elegíveis + o corpo do PR; `--apply`: grava o ledger flipado.
//   node --experimental-strip-types tools/ledger/flip-batch.ts --list-issues [--base <b>]
//   node --experimental-strip-types tools/ledger/flip-batch.ts --coalesce [--window-hours <h>] [--now <iso>]
//   (stdin: instantes ISO de PRs flip/ abertos/integrados) → `open` | `skip` (janela de coalescência, ADR-0037)
//   node --experimental-strip-types tools/ledger/flip-batch.ts --batch-mode --app-login app/<slug>
//   node --experimental-strip-types tools/ledger/flip-batch.ts --uncheck-human-step < corpo.md
//   node --experimental-strip-types tools/ledger/flip-batch.ts --issues-json <arq> --count  → nº de elegíveis
//   node --experimental-strip-types tools/ledger/flip-batch.ts --liveness --eligible <n> [--deadline-hours <h>]
//   (stdin: instante ISO da última rodada bem-sucedida do flip-batch; vazio = nenhuma) → `ok` | `alert`
//   (stdin: PRs abertos do `gh pr list`) → `new` | `skip` | `update <nº> <branch>` (lote do App × manual)
//   emite (1 por linha) os `#N` de Issue referenciados por `awaitingFlip` — o conjunto que o workflow
//   consulta no `gh` para o sinal de evidência (helper `flip-issues-json.sh`, ADR-0033 / T10.2, #257).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import process from "node:process";
import type { LedgerItem } from "./ledger-guard.ts";
import { classifyLifecycle, loadScopedLedger, resolveDeliveredIds } from "./ledger-origin.ts";

/** Estado mínimo de uma Issue para o sinal de evidência (o workflow busca via `gh --json`). */
export interface IssueState {
  number: number;
  state: string; // "OPEN" | "CLOSED"
  stateReason?: string | null; // "COMPLETED" | "NOT_PLANNED" | "DUPLICATE" | null (case-insensitive)
}

/** EVIDÊNCIA (ADR-0033): a Issue da entrada está CLOSED e concluída (`stateReason=completed`). Uma Issue
 *  aberta, ou fechada como not-planned/duplicate, NÃO é evidência de conclusão — a entrada não entra no
 *  lote. `issue` inexistente entre as lidas → sem evidência (fail-closed: não flipar às cegas). */
export function isEvidenced(entry: LedgerItem, issuesByNumber: Map<number, IssueState>): boolean {
  const iss = issuesByNumber.get(entry.issue);
  if (!iss) return false;
  return iss.state.toUpperCase() === "CLOSED" && (iss.stateReason ?? "").toUpperCase() === "COMPLETED";
}

/** As entradas do lote: `awaitingFlip` (entregue) ∩ evidência (Issue concluída). Ordenadas por id (estável). */
export function eligibleForBatch(
  awaitingFlip: LedgerItem[],
  issuesByNumber: Map<number, IssueState>,
): LedgerItem[] {
  return awaitingFlip
    .filter((e) => isEvidenced(e, issuesByNumber))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Ledger flipado: `passes:true` SÓ para os ids elegíveis (cópia; não muta a entrada in-place além de `passes`). */
export function applyFlip(ledger: LedgerItem[], eligibleIds: Set<string>): LedgerItem[] {
  return ledger.map((it) => (eligibleIds.has(it.id) ? { ...it, passes: true } : it));
}

/** Texto CANÔNICO do passo humano do resíduo procedural (ADR-0037 §4(b)(ii)). O `flip-revalidate` exige, em
 *  TODO PR que flipa entradas (do App ou manual), uma linha de checklist MARCADA com este texto. */
export const HUMAN_STEP_TEXT =
  "Conferi que cada Issue do lote segue fechada com motivo `completed` e com o sinal de conclusão";

/** A linha do checklist (desmarcada), pronta para colar no corpo de um PR de flip. */
export const HUMAN_STEP_LINE = `- [ ] ${HUMAN_STEP_TEXT}`;

/**
 * O corpo do PR tem a caixa do passo humano MARCADA (`- [x]` / `* [X]`) com o texto canônico, FORA de regiões que
 * o GitHub não renderiza como tarefa: blocos cercados (```` ``` ```` / `~~~`) e comentários HTML (Codex #306 — o
 * exemplo do runbook vive num bloco ```` ```markdown ````). CAVEAT: bloco de código INDENTADO não é tratado
 * (seria reimplementar o CommonMark); a conferência humana cobre o resto.
 */
export function humanStepChecked(body: unknown): boolean {
  if (typeof body !== "string") return false;
  const visible = body
    .replace(/<!--[\s\S]*?(?:-->|$)/g, "")
    .replace(/^[ \t]*(```|~~~)[^\n]*\n[\s\S]*?(?:^[ \t]*\1[^\n]*$|(?![\s\S]))/gm, "");
  return visible.split(/\r?\n/).some((l) => {
    const m = /^\s*[-*]\s*\[([xX])\]\s*(.*)$/.exec(l);
    return m !== null && (m[2] ?? "").trim().startsWith(HUMAN_STEP_TEXT);
  });
}

/**
 * Desmarca a caixa do passo humano no corpo do PR (ADR-0037 §4(b)(ii), #257 fatia b3; Codex #306): quando uma
 * Issue do lote muda, a confirmação humana anterior fica velha e precisa ser refeita. Desmarca TODA linha marcada
 * com o texto canônico — inclusive dentro de bloco cercado/comentário, onde já não conta (inofensivo). Puro.
 */
export function uncheckHumanStep(body: string): { body: string; changed: boolean } {
  let changed = false;
  const out = body.replace(/^(\s*[-*]\s*)\[[xX]\](\s*)(.*)$/gm, (line, pre: string, sp: string, rest: string) => {
    if (!rest.trim().startsWith(HUMAN_STEP_TEXT)) return line;
    changed = true;
    return `${pre}[ ]${sp}${rest}`;
  });
  return { body: out, changed };
}

/** Corpo do PR de flip: correlaciona o LOTE às Issues de origem (ADR-0033) — cada entrada `F-<issue>-*`
 *  linkada ao seu `#<issue>`, agrupado por Issue. Deixa explícito que a automação ABRE, humano MERGEIA. */
export function buildPrBody(eligible: LedgerItem[]): string {
  const byIssue = new Map<number, LedgerItem[]>();
  for (const e of eligible) {
    const arr = byIssue.get(e.issue) ?? [];
    arr.push(e);
    byIssue.set(e.issue, arr);
  }
  const lines: string[] = [
    "## Flip em lote (automação, ADR-0033)",
    "",
    `Flip \`passes:false→true\` de **${eligible.length}** entrada(s) entregue(s)-e-com-evidência ` +
      "(Issue CLOSED + `completed`). Lote **aberto por automação**; **merge é humano** (a automação nunca integra).",
    "",
    "### Correlação lote → Issues de origem",
  ];
  for (const num of [...byIssue.keys()].sort((a, b) => a - b)) {
    const ids = byIssue.get(num)!.map((e) => `\`${e.id}\``).join(", ");
    lines.push(`- #${num}: ${ids}`);
  }
  // Passo humano do RESÍDUO PROCEDURAL (ADR-0037 §4(b)(ii)): quem integra marca imediatamente antes do merge;
  // o `flip-revalidate` só passa com a caixa marcada.
  lines.push("", "### Antes de mergear (passo humano obrigatório — ADR-0037 §4(b))", "", HUMAN_STEP_LINE);
  return lines.join("\n") + "\n";
}

interface BatchResult {
  eligible: LedgerItem[];
  flipped: LedgerItem[];
  prBody: string;
}

/** Projeta o lote a partir do ledger escopado + Issues. Puro (recebe tudo pronto) — o CLI resolve IO/git. */
export function projectBatch(
  scoped: LedgerItem[],
  fullLedger: LedgerItem[],
  legacyIds: Set<string>,
  deliveredIds: Set<string>,
  supersededIds: Set<string>,
  issuesByNumber: Map<number, IssueState>,
): BatchResult {
  const { awaitingFlip } = classifyLifecycle(scoped, legacyIds, deliveredIds, supersededIds);
  const eligible = eligibleForBatch(awaitingFlip, issuesByNumber);
  const eligibleIds = new Set(eligible.map((e) => e.id));
  return { eligible, flipped: applyFlip(fullLedger, eligibleIds), prBody: buildPrBody(eligible) };
}

/** Os números de Issue (únicos, ordenados) referenciados por `awaitingFlip` — o conjunto que o workflow
 *  precisa consultar no `gh` para o sinal de evidência (ADR-0033). Puro: recebe scoped/marcadores prontos. */
export function awaitingFlipIssues(
  scoped: LedgerItem[],
  legacyIds: Set<string>,
  deliveredIds: Set<string>,
  supersededIds: Set<string>,
): number[] {
  const { awaitingFlip } = classifyLifecycle(scoped, legacyIds, deliveredIds, supersededIds);
  return [...new Set(awaitingFlip.map((e) => e.issue))].sort((a, b) => a - b);
}

/**
 * JANELA DE COALESCÊNCIA (ADR-0037 §2, #257 fatia a): sem lote aberto, uma rodada automática (evento ou
 * agenda) só abre um lote novo se NENHUM PR `flip/` foi aberto ou integrado nas últimas `windowHours` horas —
 * senão entregas espaçadas abririam um PR cada ("mataria o lote", ADR-0033). Dentro da janela ⇒ `skip`; as
 * entregas entram na primeira rodada após a janela. Um `workflow_dispatch` (humano) NÃO passa por aqui.
 * FAIL-CLOSED: entrada inválida (janela não-positiva, `now` ou instante ilegível) ⇒ `skip` com `invalid` — a
 * CLI sai ≠ 0 (run VERMELHO), para um W mal configurado não pular para sempre com o check verde (Codex #304).
 */
export function coalesceDecision(
  nowIso: string,
  windowHours: number,
  flipActivityIso: readonly string[],
): { decision: "open" | "skip"; reason: string; invalid?: true } {
  const now = Date.parse(nowIso);
  if (!Number.isFinite(now)) return { decision: "skip", reason: `now inválido (${nowIso}) — fail-closed`, invalid: true };
  if (!Number.isFinite(windowHours) || windowHours <= 0)
    return { decision: "skip", reason: `janela inválida (${windowHours}) — fail-closed`, invalid: true };
  let latest = -Infinity;
  for (const t of flipActivityIso) {
    const v = Date.parse(t);
    if (!Number.isFinite(v)) return { decision: "skip", reason: `instante inválido (${t}) — fail-closed`, invalid: true };
    if (v > latest) latest = v;
  }
  if (latest === -Infinity) return { decision: "open", reason: "nenhuma atividade de flip registrada" };
  const ageH = (now - latest) / 3_600_000;
  return ageH >= windowHours
    ? { decision: "open", reason: `última atividade de flip há ${ageH.toFixed(2)} h (≥ ${windowHours} h)` }
    : { decision: "skip", reason: `última atividade de flip há ${ageH.toFixed(2)} h (< ${windowHours} h) — dentro da janela` };
}

/** Instante ISO UTC ESTRITO (`AAAA-MM-DDTHH:MM:SS(.fff)Z`, data de calendário real) em ms, ou `NaN`. O
 *  `Date.parse` normaliza datas impossíveis (`2026-02-31` vira 3/mar) — aqui elas são inválidas (Codex #316). */
export function strictIsoUtc(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.exec(iso);
  if (m === null) return Number.NaN;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return Number.NaN;
  const d = new Date(t);
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() + 1 === Number(m[2]) && d.getUTCDate() === Number(m[3])
    ? t
    : Number.NaN;
}

/** Tolerância de relógio entre o runner e a API do GitHub para a última rodada (5 min, Isa). */
export const CLOCK_SKEW_MS = 5 * 60_000;

/**
 * Liveness do `flip-batch` (ADR-0037 §4(c), #257 fatia c1): decide se o monitor INDEPENDENTE alerta o owner.
 * Alerta quando há entradas elegíveis e a última rodada BEM-SUCEDIDA do `flip-batch` (qualquer gatilho) é mais
 * antiga que o prazo (padrão 48 h = 2× a agenda diária) — ou nunca houve uma. Sem elegíveis ⇒ `ok` (nada fica
 * órfão). FAIL-CLOSED: entrada inválida ⇒ `alert` marcado `invalid` (a CLI sai ≠ 0): um monitor mal configurado
 * não pode ficar verde em silêncio. Puro.
 */
export function livenessDecision(
  nowIso: string,
  deadlineHours: number,
  eligibleCount: number,
  lastSuccessIso: string | null,
): { decision: "ok" | "alert"; reason: string; invalid?: true } {
  const now = Date.parse(nowIso);
  if (!Number.isFinite(now)) return { decision: "alert", reason: `now inválido (${nowIso}) — fail-closed`, invalid: true };
  if (!Number.isFinite(deadlineHours) || deadlineHours <= 0)
    return { decision: "alert", reason: `prazo inválido (${deadlineHours}) — fail-closed`, invalid: true };
  if (!Number.isInteger(eligibleCount) || eligibleCount < 0)
    return { decision: "alert", reason: `contagem de elegíveis inválida (${eligibleCount}) — fail-closed`, invalid: true };
  if (eligibleCount === 0) return { decision: "ok", reason: "nenhuma entrada elegível — nada fica órfão" };
  if (lastSuccessIso === null)
    return { decision: "alert", reason: `${eligibleCount} elegível(is) e nenhuma rodada bem-sucedida do flip-batch` };
  const last = strictIsoUtc(lastSuccessIso);
  if (!Number.isFinite(last))
    return { decision: "alert", reason: `instante inválido (${lastSuccessIso}) — fail-closed`, invalid: true };
  // Instante no FUTURO (dado corrompido/relógio) daria idade negativa ⇒ `ok` falso; tolera só 5 min de skew
  // entre o runner e a API (Codex #316).
  if (last - now > CLOCK_SKEW_MS)
    return { decision: "alert", reason: `instante no futuro (${lastSuccessIso} > ${nowIso}) — fail-closed`, invalid: true };
  const ageH = (now - last) / 3_600_000;
  return ageH >= deadlineHours
    ? { decision: "alert", reason: `${eligibleCount} elegível(is); última rodada bem-sucedida há ${ageH.toFixed(2)} h (≥ ${deadlineHours} h)` }
    : { decision: "ok", reason: `última rodada bem-sucedida há ${ageH.toFixed(2)} h (< ${deadlineHours} h)` };
}

/** `--eligible` da CLI: ausente ou em branco ⇒ `NaN` (inválido). `Number("")` daria 0 ⇒ `ok` falso quando a
 *  contagem rio acima falha vazia (Codex #316). */
export function parseEligibleArg(raw: string | undefined): number {
  return raw === undefined || raw.trim() === "" ? Number.NaN : Number(raw);
}

/** PR `flip/` aberto, como o workflow o lê (`gh pr list --json number,headRefName,isCrossRepository,author`). */
export interface OpenFlipPr {
  number: number;
  headRefName: string;
  isCrossRepository: boolean;
  author: { login: string; is_bot?: boolean };
}

/**
 * Modo da rodada pelo lote aberto (ADR-0037 §2, Codex #304): o lote do App é o PR `flip/` cujo autor é
 * EXATAMENTE o login do App configurado (`app/<slug>`) — não "qualquer bot" (Codex #304 r2: outro bot teria a
 * branch force-pushada). `skip` se há PR `flip/` de QUALQUER outro autor (humano ou bot — a automação nunca
 * reescreve lote alheio); `update` se há exatamente um lote do App aberto — recalcula e atualiza, ou pula se
 * nada mudou; `new` se não há lote aberto (vale a janela de coalescência). Forks não contam. FAIL-CLOSED: login
 * do App ausente, ou 2+ lotes do App abertos (viola o lote único) ⇒ `error`.
 */
export function batchMode(
  prs: readonly OpenFlipPr[],
  appLogin: string | undefined,
): { mode: "new" | "update" | "skip" | "error"; pr?: OpenFlipPr; reason: string } {
  if (!appLogin) return { mode: "error", reason: "login do App ausente — não dá para distinguir o lote do App" };
  const flips = prs.filter((p) => !p.isCrossRepository && p.headRefName.startsWith("flip/"));
  const isApp = (p: OpenFlipPr) => p.author.login.toLowerCase() === appLogin.toLowerCase();
  const manual = flips.filter((p) => !isApp(p));
  const app = flips.filter(isApp);
  if (manual.length > 0)
    return { mode: "skip", reason: `lote de outro autor aberto (#${manual[0]!.number}, ${manual[0]!.author.login}) — não reescrever` };
  if (app.length > 1)
    return { mode: "error", reason: `${app.length} lotes do App abertos (${app.map((p) => `#${p.number}`).join(", ")}) — viola o lote único` };
  if (app.length === 1) return { mode: "update", pr: app[0], reason: `lote do App aberto (#${app[0]!.number}) — atualizar se mudou` };
  return { mode: "new", reason: "sem lote aberto" };
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

interface Context {
  scoped: LedgerItem[];
  legacyIds: Set<string>;
  supersededIds: Set<string>;
  fullLedger: LedgerItem[];
  deliveredIds: Set<string>;
}

const LEDGER_PATH = "feature-ledger.json";

/** Resolve o ledger escopado + marcadores + baseline de entrega (`--base`). Usado pelos dois modos do CLI. */
function loadContext(): Context | { error: string } {
  const ledgerPath = LEDGER_PATH;
  let scoped, legacyIds, supersededIds, fullLedger: LedgerItem[];
  try {
    ({ scoped, legacyIds, supersededIds } = loadScopedLedger(
      ".orion/ledger-origin.json",
      ledgerPath,
      ".orion/ledger-lifecycle.json",
    ));
    fullLedger = JSON.parse(readFileSync(ledgerPath, "utf-8")) as LedgerItem[];
  } catch (e) {
    return { error: `falha ao ler ledger/marcadores: ${(e as Error).message}` };
  }
  const delivered = resolveDeliveredIds(arg("--base"), ledgerPath);
  if ("error" in delivered) return { error: delivered.error };
  return { scoped, legacyIds, supersededIds, fullLedger, deliveredIds: delivered.ids };
}

function main(): number {
  if (process.argv.includes("--uncheck-human-step")) {
    // stdin: corpo do PR. stdout: corpo com a caixa do passo humano desmarcada (igual se não estava marcada).
    process.stdout.write(uncheckHumanStep(readFileSync(0, "utf-8")).body);
    return 0;
  }
  if (process.argv.includes("--liveness")) {
    // stdin: instante ISO da última rodada bem-sucedida do flip-batch (vazio = nenhuma). Imprime ok|alert.
    const hours = Number(arg("--deadline-hours") ?? "48");
    const now = arg("--now") ?? new Date().toISOString();
    const eligible = parseEligibleArg(arg("--eligible"));
    const last = readFileSync(0, "utf-8").trim();
    const r = livenessDecision(now, hours, eligible, last.length > 0 ? last : null);
    console.error(`liveness: ${r.reason}`);
    if (r.invalid) return 2; // config/entrada inválida ⇒ run vermelho (fail-closed)
    console.log(r.decision);
    return 0;
  }
  if (process.argv.includes("--coalesce")) {
    // stdin: lista de instantes ISO (um por linha) de abertura/integração de PRs flip/. Imprime open|skip.
    const hours = Number(arg("--window-hours") ?? "1");
    const now = arg("--now") ?? new Date().toISOString();
    const stamps = readFileSync(0, "utf-8").split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    const r = coalesceDecision(now, hours, stamps);
    console.error(`coalescência: ${r.reason}`);
    if (r.invalid) return 2; // config/entrada inválida ⇒ run vermelho, não skip verde eterno (Codex #304)
    console.log(r.decision);
    return 0;
  }
  if (process.argv.includes("--batch-mode")) {
    // stdin: JSON de `gh pr list --json number,headRefName,isCrossRepository,author`. Imprime `modo[ número branch]`.
    let prs: OpenFlipPr[];
    try {
      prs = JSON.parse(readFileSync(0, "utf-8")) as OpenFlipPr[];
      if (!Array.isArray(prs)) throw new Error("não é array");
    } catch (e) {
      console.error(`--batch-mode: JSON inválido: ${(e as Error).message}`);
      return 2;
    }
    const r = batchMode(prs, arg("--app-login"));
    console.error(`lote: ${r.reason}`);
    if (r.mode === "error") return 2;
    console.log(r.pr ? `${r.mode} ${r.pr.number} ${r.pr.headRefName}` : r.mode);
    return 0;
  }
  if (process.argv.includes("--list-issues")) {
    const ctx = loadContext();
    if ("error" in ctx) {
      console.error(ctx.error);
      return 2;
    }
    for (const n of awaitingFlipIssues(ctx.scoped, ctx.legacyIds, ctx.deliveredIds, ctx.supersededIds)) {
      console.log(n);
    }
    return 0;
  }
  const issuesJson = arg("--issues-json");
  if (!issuesJson) {
    console.error(
      "uso: node --experimental-strip-types tools/ledger/flip-batch.ts (--issues-json <arq> [--apply] [--pr-body-out <arq>] [--count] | --list-issues) [--base <b>]",
    );
    return 2;
  }
  const ctx = loadContext();
  if ("error" in ctx) {
    console.error(ctx.error);
    return 2;
  }
  const { scoped, legacyIds, supersededIds, fullLedger, deliveredIds } = ctx;
  let issuesRaw: unknown;
  try {
    issuesRaw = JSON.parse(readFileSync(issuesJson, "utf-8"));
  } catch (e) {
    console.error(`--issues-json inválido: ${(e as Error).message}`);
    return 2;
  }
  if (!Array.isArray(issuesRaw)) {
    console.error("--issues-json deve ser um array de Issues (gh --json number,state,stateReason).");
    return 2;
  }
  const issuesByNumber = new Map<number, IssueState>();
  for (const i of issuesRaw as IssueState[]) {
    if (typeof i?.number === "number") issuesByNumber.set(i.number, i);
  }
  const { eligible, flipped, prBody } = projectBatch(
    scoped,
    fullLedger,
    legacyIds,
    deliveredIds,
    supersededIds,
    issuesByNumber,
  );
  if (process.argv.includes("--count")) {
    // Só a contagem de elegíveis-e-com-evidência (insumo do monitor de liveness, ADR-0037 §4(c)); não escreve nada.
    console.log(String(eligible.length));
    return 0;
  }
  if (eligible.length === 0) {
    console.log("FLIP-BATCH: nenhuma entrada elegível-e-com-evidência — nada a flipar.");
    return 0;
  }
  // Corpo do PR (correlação lote→Issues) para o workflow abrir o PR via `gh pr create --body-file`
  // (compõe flip-batch com a Action, ADR-0033/#257 B2) — vale em dry-run e em --apply.
  const prBodyOut = arg("--pr-body-out");
  if (prBodyOut) writeFileSync(prBodyOut, prBody);
  if (process.argv.includes("--apply")) {
    writeFileSync(LEDGER_PATH, JSON.stringify(flipped, null, 2) + "\n");
    console.log(`FLIP-BATCH: ${eligible.length} entrada(s) flipada(s) em ${LEDGER_PATH}.`);
  } else {
    console.log(`FLIP-BATCH (dry-run): ${eligible.length} elegível(is):`);
    for (const e of eligible) console.log(`  + ${e.id}  (#${e.issue})`);
    console.log("\n--- corpo do PR ---\n" + prBody);
  }
  return 0;
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
