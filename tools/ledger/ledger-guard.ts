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

/**
 * Reset de bootstrap (ADR-0021): um repo derivado do template zera o ledger herdado do Orion para
 * `[]` (origem local, `getting-started` §2). A transição **base não-vazia → head vazio** é esse reset
 * one-time e é **permitida** — o `[]` é o marcador inequívoco de "começar do zero"; estabelece o marco
 * que o append-only passa a proteger (não é remoção *sob* o invariante). Seguro porque: um PR de agente
 * nunca esvazia o ledger inteiro (agentes **adicionam** entradas), o zeramento é **glaring e auditável**
 * no diff do PR, e o **merge humano (T3)** é o backstop. Fora deste caso, o append-only vale integral.
 */
export function isBootstrapReset(base: LedgerItem[], head: LedgerItem[]): boolean {
  return base.length > 0 && head.length === 0;
}

// diff puro: recebe os dois estados do ledger e retorna a lista de violações (vazia = OK).
export function diff(base: LedgerItem[], head: LedgerItem[]): string[] {
  if (isBootstrapReset(base, head)) return []; // reset de origem local (ADR-0021) — permitido
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
  let bootstrap = false;
  try {
    bootstrap = isBootstrapReset(load(basePath), load(headPath));
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
  if (bootstrap) {
    // Torna o carve-out visível/auditável no log (não é uma passagem silenciosa).
    console.log("LEDGER GUARD: PASS (reset de bootstrap — ledger zerado para origem local, ADR-0021)");
    return 0;
  }
  console.log("LEDGER GUARD: PASS");
  return 0;
}

// Só executa o CLI quando rodado diretamente (não quando importado por vitest).
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
