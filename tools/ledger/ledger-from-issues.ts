#!/usr/bin/env node
// ledger-from-issues.ts — Gera/atualiza o Feature Ledger a partir das Issues SDD (Orion, ADR-0006).
// Projeção das Issues (L2 = governança). Append-only e idempotente.
// CLI (Node >= 22.6, type stripping):
//   node --experimental-strip-types tools/ledger/ledger-from-issues.ts [--from-gh|--issues-json f] [--write]
// As funções puras (project/merge/...) são exportadas para cobertura por vitest.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import process from "node:process";
import type { LedgerItem } from "./ledger-guard.ts";
import { readBaseMarker, inheritedIdSet } from "./ledger-origin.ts";

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
  let current: string | null = null;
  // Fecha o bullet em construção, normalizando espaços (inclui as continuações juntadas).
  const flush = () => {
    if (current !== null) items.push(current.replace(/\s+/g, " ").trim());
    current = null;
  };
  for (const line of (body ?? "").split(/\r?\n/)) {
    const h = line.match(/^\s{0,3}#{1,6}\s+(.*)$/);
    if (h) {
      flush();
      const title = (h[1] ?? "").trim().toLowerCase();
      capture = title.includes("crit") && title.includes("aceit");
      continue;
    }
    if (!capture) continue;
    // Linha em branco encerra o bullet corrente (fim da continuação).
    if (line.trim() === "") {
      flush();
      continue;
    }
    const m = line.match(/^\s*(?:[-*]|\d+\.)\s+(?:\[[ xX]\]\s+)?(.*\S)\s*$/);
    if (m) {
      // Novo bullet: fecha o anterior e inicia este.
      flush();
      current = m[1]!;
    } else if (current !== null) {
      // Linha de continuação do mesmo bullet (quebra física, sem marcador).
      current += " " + line.trim();
    }
  }
  flush();
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

/**
 * Funde as entradas geradas no ledger existente, append-only e idempotente (id já presente = pula).
 *
 * **Colisão local×herdado (#106, ADR-0021):** num repo derivado a numeração de Issues reinicia, então
 * uma Issue local pode gerar um id igual a um **herdado** (mesmo número + mesmo aceite normalizado). Como
 * o id herdado já está em `existing`, o skip idempotente **descartaria a entrada local em silêncio**. O
 * `inheritedIds` (do marcador de origem) distingue os dois casos: id já-presente **não-herdado** = mesma
 * tarefa local re-projetada (idempotência OK); id já-presente **herdado** = colisão → reportada em
 * `collisions` (o chamador falha fechado, em vez de somer a entrada). No Orion, `inheritedIds` é vazio →
 * comportamento idêntico ao anterior.
 */
export function merge(
  existing: LedgerItem[],
  generated: LedgerItem[],
  inheritedIds: Set<string> = new Set(),
): { result: LedgerItem[]; added: LedgerItem[]; collisions: LedgerItem[] } {
  const ids = new Set(existing.map((e) => e.id));
  const result = [...existing];
  const added: LedgerItem[] = [];
  const collisions: LedgerItem[] = [];
  for (const g of generated) {
    // Colisão é checada PRIMEIRO e **independentemente** do ledger atual (Codex #109): um id herdado
    // temporariamente ausente do `feature-ledger.json` faria `ids.has` falso → a entrada local seria
    // anexada, reconstruindo a herdada e mascarando o critério local. Um id gerado ∈ herdados é
    // **sempre** colisão (ids herdados nascem das Issues do Orion, nunca de uma projeção local).
    if (inheritedIds.has(g.id)) {
      collisions.push(g);
      continue;
    }
    if (ids.has(g.id)) continue; // idempotência: id já presente (não-herdado) → pula
    result.push(g);
    added.push(g);
  }
  return { result, added, collisions };
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

  // Ids herdados (pré-origem-local) do marcador de origem, para detectar colisão local×herdado (#106).
  // **Arquivo ausente** (Orion / repo legado sem marcador) → conjunto vazio → comportamento inalterado.
  // **Arquivo PRESENTE mas não-`value`** (vazio/`null`/malformado) → FALHA FECHADO (Codex #109): engolir
  // zeraria o conjunto herdado e uma colisão viraria "replay idempotente" gravado — recriando o
  // silent-loss que o #106 fecha. Aqui gateamos `existsSync` nós mesmos: o `readBaseMarker` mapeia
  // vazio/`null` p/ `absent` (sentinela CORRETO no contexto do guard-vs-`origin/main`), mas no gerador,
  // lendo o marcador do PRÓPRIO repo, um arquivo presente vazio/`null` é anomalia.
  const markerPath = arg("--origin-marker") ?? ".orion/ledger-origin.json";
  let inheritedIds = new Set<string>();
  if (existsSync(markerPath)) {
    const bm = readBaseMarker(markerPath);
    if (bm.kind !== "value") {
      const detail = bm.kind === "invalid" ? bm.reason : "vazio/null";
      console.error(`erro: marcador de origem presente mas inválido (${markerPath}): ${detail} — fail-closed, nada projetado`);
      return 2;
    }
    inheritedIds = inheritedIdSet(bm.value);
  }

  const generated = project(issues);
  const { result, added, collisions } = merge(existing, generated, inheritedIds);

  console.log("LEDGER FROM ISSUES");
  console.log(`  Issues SDD lidas:       ${issues.filter(isSdd).length}`);
  console.log(`  critérios projetados:   ${generated.length}`);
  console.log(`  entradas preservadas:   ${existing.length}`);
  console.log(`  entradas novas (false): ${added.length}`);
  for (const a of added)
    console.log(`    + ${a.id}  (issue #${a.issue}, ${a.category})  ${a.description.slice(0, 60)}`);

  // Fail-closed: uma entrada local que colide com um id HERDADO seria descartada em silêncio (#106).
  if (collisions.length) {
    console.error(
      `  COLISÃO local×herdado (#106): ${collisions.length} entrada(s) local(is) com id igual a uma herdada (pré-origem-local).`,
    );
    for (const c of collisions)
      console.error(`    ! ${c.id}  (issue #${c.issue})  ${c.description.slice(0, 60)}`);
    console.error(
      "  Reescreva o critério de aceite da Issue local (muda o hash do id) e reprojete — nada foi gravado.",
    );
    return 2;
  }

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
