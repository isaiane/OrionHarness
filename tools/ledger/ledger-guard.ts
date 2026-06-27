#!/usr/bin/env node
// ledger-guard.ts — Gate de integridade do Feature Ledger (Orion, ADR-0006).
// Append-only: itens não são removidos nem editados; passes só vai de false -> true.
// CLI (Node >= 22.6, type stripping):
//   node --experimental-strip-types tools/ledger/ledger-guard.ts <base.json> <head.json>
// As funções puras (diff/load) são exportadas para cobertura por vitest.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import process from "node:process";

export interface LedgerItem {
  id: string;
  issue: number;
  category: string;
  description: string;
  steps: string[];
  acceptance: string;
  passes: boolean;
}

export const IMMUTABLE = ["issue", "category", "description", "steps", "acceptance"] as const;

const eq = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

export function load(path: string): LedgerItem[] {
  return JSON.parse(readFileSync(path, "utf-8")) as LedgerItem[];
}

// diff puro: recebe os dois estados do ledger e retorna a lista de violações (vazia = OK).
export function diff(base: LedgerItem[], head: LedgerItem[]): string[] {
  const baseMap = new Map(base.map((it) => [it.id, it]));
  const headMap = new Map(head.map((it) => [it.id, it]));
  const errors: string[] = [];
  for (const [id, b] of baseMap) {
    const h = headMap.get(id);
    if (!h) {
      errors.push(`item removido: ${id} (proibido — ledger é append-only)`);
      continue;
    }
    for (const f of IMMUTABLE) {
      if (!eq(b[f], h[f])) {
        errors.push(`campo imutável editado em ${id}: '${f}'`);
      }
    }
    if (b.passes === true && h.passes === false) {
      errors.push(`regressão de passes (true->false) em ${id} sem novo item`);
    }
  }
  for (const [id, h] of headMap) {
    if (!baseMap.has(id) && h.passes === true) {
      errors.push(`novo item ${id} já criado como passes=true (deve começar false)`);
    }
  }
  return errors;
}

export function check(basePath: string, headPath: string): string[] {
  return diff(load(basePath), load(headPath));
}

function main(): number {
  const [, , basePath, headPath] = process.argv;
  if (!basePath || !headPath) {
    console.error(
      "uso: node --experimental-strip-types tools/ledger/ledger-guard.ts <base.json> <head.json>",
    );
    return 2;
  }
  let errors: string[];
  try {
    errors = check(basePath, headPath);
  } catch (e) {
    console.error(`falha ao validar ledger: ${(e as Error).message}`);
    return 2;
  }
  if (errors.length) {
    console.log("LEDGER GUARD: FAIL");
    for (const e of errors) console.error("  - " + e);
    return 1;
  }
  console.log("LEDGER GUARD: PASS");
  return 0;
}

// Só executa o CLI quando rodado diretamente (não quando importado por vitest).
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
