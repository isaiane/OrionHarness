#!/usr/bin/env node
// flip-revalidate.ts — Checagem-que-bloqueia-o-merge do PR de flip (Orion, ADR-0033 / T10.2, #257).
//
// O ADR-0033 exige que a evidência valha NO MOMENTO DO MERGE (não só quando o lote foi aberto): entre abrir
// o PR e mergeá-lo, uma Issue pode ser REABERTA ou ter o `stateReason` mudado. Este check roda no
// `pull_request` das branches `flip/**`: para CADA entrada que ESTE PR flipou `false→true` (vs `origin/main`),
// REVALIDA a evidência da Issue (CLOSED + `completed`) e FALHA (exit 1) se qualquer uma deixou de valer —
// bloqueando o merge de conclusão falsa. Falha de LOOKUP (API/permite) também é exit 1 (sinal, não silêncio).
//
// CLI: node --experimental-strip-types tools/ledger/flip-revalidate.ts <base.json> <head.json>
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import process from "node:process";
import type { LedgerItem } from "./ledger-guard.ts";
import { isEvidenced, type IssueState } from "./flip-batch.ts";

/** Entradas que foram `false` na base e `true` no head — o LOTE que este PR está flipando. */
export function flippedEntries(base: LedgerItem[], head: LedgerItem[]): LedgerItem[] {
  const baseById = new Map(base.map((b) => [b.id, b]));
  return head.filter((h) => h.passes === true && baseById.get(h.id)?.passes === false);
}

/** ids do lote cuja evidência NÃO vale mais (Issue reaberta / não-completed / ausente). Vazio = ok. */
export function staleIds(flipped: LedgerItem[], issuesByNumber: Map<number, IssueState>): string[] {
  return flipped.filter((e) => !isEvidenced(e, issuesByNumber)).map((e) => e.id);
}

/** Busca o estado de uma Issue via `gh`; LANÇA em falha de lookup (não engole — vira sinal, ADR-0033). */
function fetchIssue(n: number): IssueState {
  const out = execFileSync("gh", ["issue", "view", String(n), "--json", "number,state,stateReason"], {
    encoding: "utf-8",
  });
  return JSON.parse(out) as IssueState;
}

function main(): number {
  const [, , basePath, headPath] = process.argv;
  if (!basePath || !headPath) {
    console.error("uso: node --experimental-strip-types tools/ledger/flip-revalidate.ts <base.json> <head.json>");
    return 2;
  }
  let flipped: LedgerItem[];
  try {
    const base = JSON.parse(readFileSync(basePath, "utf-8")) as LedgerItem[];
    const head = JSON.parse(readFileSync(headPath, "utf-8")) as LedgerItem[];
    flipped = flippedEntries(base, head);
  } catch (e) {
    console.error(`falha ao ler ledger base/head: ${(e as Error).message}`);
    return 2;
  }
  if (flipped.length === 0) {
    console.log("FLIP-REVALIDATE: PR não flipa nenhuma entrada false->true — nada a revalidar.");
    return 0;
  }
  const issuesByNumber = new Map<number, IssueState>();
  for (const num of new Set(flipped.map((e) => e.issue))) {
    try {
      issuesByNumber.set(num, fetchIssue(num));
    } catch (e) {
      // Falha de lookup NÃO é silenciada: bloqueia o merge e sinaliza (fallback do owner manual, ADR-0033).
      console.error(`FLIP-REVALIDATE: FAIL — não consegui reler a Issue #${num}: ${(e as Error).message}`);
      return 1;
    }
  }
  const stale = staleIds(flipped, issuesByNumber);
  if (stale.length) {
    console.error("FLIP-REVALIDATE: FAIL — evidência mudou desde a abertura do lote (Issue reaberta/não-completed):");
    for (const id of stale) console.error(`  - ${id}`);
    return 1;
  }
  console.log(`FLIP-REVALIDATE: PASS — ${flipped.length} entrada(s) do lote seguem com evidência (Issue CLOSED+completed).`);
  return 0;
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
