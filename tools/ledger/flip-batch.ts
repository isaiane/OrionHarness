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

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function main(): number {
  const issuesJson = arg("--issues-json");
  if (!issuesJson) {
    console.error(
      "uso: node --experimental-strip-types tools/ledger/flip-batch.ts --issues-json <arq> [--apply] [--base <b>]",
    );
    return 2;
  }
  const ledgerPath = "feature-ledger.json";
  let scoped, legacyIds, supersededIds, fullLedger: LedgerItem[];
  try {
    ({ scoped, legacyIds, supersededIds } = loadScopedLedger(
      ".orion/ledger-origin.json",
      ledgerPath,
      ".orion/ledger-lifecycle.json",
    ));
    fullLedger = JSON.parse(readFileSync(ledgerPath, "utf-8")) as LedgerItem[];
  } catch (e) {
    console.error(`falha ao ler ledger/marcadores: ${(e as Error).message}`);
    return 2;
  }
  const delivered = resolveDeliveredIds(arg("--base"), ledgerPath);
  if ("error" in delivered) {
    console.error(delivered.error);
    return 2;
  }
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
    delivered.ids,
    supersededIds,
    issuesByNumber,
  );
  if (eligible.length === 0) {
    console.log("FLIP-BATCH: nenhuma entrada elegível-e-com-evidência — nada a flipar.");
    return 0;
  }
  if (process.argv.includes("--apply")) {
    writeFileSync(ledgerPath, JSON.stringify(flipped, null, 2) + "\n");
    console.log(`FLIP-BATCH: ${eligible.length} entrada(s) flipada(s) em ${ledgerPath}.`);
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
