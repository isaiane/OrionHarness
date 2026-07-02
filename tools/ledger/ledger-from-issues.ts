#!/usr/bin/env node
// ledger-from-issues.ts — Gera/atualiza o Feature Ledger a partir das Issues SDD (Orion, ADR-0006).
// Projeção das Issues (L2 = governança). Append-only e idempotente.
// CLI (Node >= 22.6, type stripping):
//   node --experimental-strip-types tools/ledger/ledger-from-issues.ts [--from-gh|--issues-json f] [--write]
// As funções puras (project/merge/...) são exportadas para cobertura por vitest.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import process from "node:process";
import type { LedgerItem } from "./ledger-guard.ts";

export interface Issue {
  number: number;
  title?: string;
  body?: string;
  labels?: (string | { name?: string })[];
}

const norm = (t: string) => t.trim().toLowerCase().replace(/\s+/g, " ");

export const makeId = (issue: number, acc: string) =>
  `F-${String(issue).padStart(4, "0")}-${createHash("sha1")
    .update(`${issue}:${norm(acc)}`)
    .digest("hex")
    .slice(0, 6)}`;

export function inferCategory(text: string): string {
  const t = text.toLowerCase();
  const has = (ws: string[]) => ws.some((w) => new RegExp(`\\b${w}\\b`).test(t));
  if (has(["ui", "visual", "tela", "layout", "contraste", "tema", "css"])) return "style";
  if (has(["contrato", "api", "endpoint", "schema", "openapi", "evento"])) return "contract";
  return "functional";
}

export function extractAcceptance(body: string): string[] {
  const items: string[] = [];
  let capture = false;
  for (const line of (body ?? "").split(/\r?\n/)) {
    const h = line.match(/^\s{0,3}#{1,6}\s+(.*)$/);
    if (h) {
      const title = (h[1] ?? "").trim().toLowerCase();
      capture = title.includes("crit") && title.includes("aceit");
      continue;
    }
    if (!capture) continue;
    const m = line.match(/^\s*(?:[-*]|\d+\.)\s+(?:\[[ xX]\]\s+)?(.*\S)\s*$/);
    const cap = m?.[1];
    if (cap !== undefined) {
      items.push(cap.trim());
    } else if (items.length > 0 && line.trim() !== "") {
      // Continuação de bullet quebrado em múltiplas linhas (markdown com wrap):
      // anexa ao último critério em vez de truncá-lo na primeira linha.
      items[items.length - 1] += " " + line.trim();
    }
  }
  return items;
}

export const isSdd = (i: Issue) =>
  (i.labels ?? []).some((l) => (typeof l === "string" ? l : l.name) === "type:task");

export function project(issues: Issue[]): LedgerItem[] {
  const out: LedgerItem[] = [];
  for (const i of issues) {
    if (!isSdd(i)) continue;
    for (const acc of extractAcceptance(i.body ?? "")) {
      out.push({
        id: makeId(i.number, acc),
        issue: i.number,
        category: inferCategory(acc),
        description: acc,
        steps: [`Validar end-to-end conforme o Plano de validação da Issue #${i.number}`],
        acceptance: acc,
        passes: false,
      });
    }
  }
  return out;
}

export function merge(
  existing: LedgerItem[],
  generated: LedgerItem[],
): { result: LedgerItem[]; added: LedgerItem[] } {
  const ids = new Set(existing.map((e) => e.id));
  const result = [...existing];
  const added: LedgerItem[] = [];
  for (const g of generated)
    if (!ids.has(g.id)) {
      result.push(g);
      added.push(g);
    }
  return { result, added };
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(name);

function fetchFromGh(): Issue[] {
  const out = execFileSync(
    "gh",
    [
      "issue",
      "list",
      "--label",
      "type:task",
      "--state",
      "open",
      "--limit",
      "500",
      "--json",
      "number,title,body,labels",
    ],
    { encoding: "utf-8" },
  );
  return JSON.parse(out) as Issue[];
}

function main(): number {
  const issuesJson = arg("--issues-json");
  const ledgerPath = arg("--ledger") ?? "feature-ledger.json";
  const outPath = arg("--out") ?? ledgerPath;
  let issues: Issue[];
  try {
    issues = has("--from-gh")
      ? fetchFromGh()
      : (JSON.parse(readFileSync(issuesJson!, "utf-8")) as Issue[]);
  } catch (e) {
    console.error(`erro ao obter Issues: ${(e as Error).message}`);
    return 2;
  }

  let existing: LedgerItem[] = [];
  try {
    existing = JSON.parse(readFileSync(ledgerPath, "utf-8")) as LedgerItem[];
  } catch {
    existing = [];
  }

  const generated = project(issues);
  const { result, added } = merge(existing, generated);

  console.log("LEDGER FROM ISSUES");
  console.log(`  Issues SDD lidas:       ${issues.filter(isSdd).length}`);
  console.log(`  critérios projetados:   ${generated.length}`);
  console.log(`  entradas preservadas:   ${existing.length}`);
  console.log(`  entradas novas (false): ${added.length}`);
  for (const a of added)
    console.log(`    + ${a.id}  (issue #${a.issue}, ${a.category})  ${a.description.slice(0, 60)}`);

  if (has("--write")) {
    writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n");
    console.log(`  -> gravado em ${outPath} (${result.length} entradas)`);
  } else {
    console.log("  (dry-run — use --write para gravar)");
  }
  return 0;
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
