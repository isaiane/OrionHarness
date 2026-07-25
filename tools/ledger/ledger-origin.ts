#!/usr/bin/env node
// ledger-origin.ts — Marcador de ORIGEM do Feature Ledger (Orion, ADR-0021).
//
// Um repo criado via "Use this template" HERDA o `feature-ledger.json` do Orion (entradas de exemplo,
// IDs do Orion) sob o append-only (ADR-0006). Em vez de APAGAR o herdado (o que o `ledger-guard` veria
// como remoção — e um carve-out no guard não seria fail-secure, #407), o bootstrap grava um **marcador
// de origem local** (`.orion/ledger-origin.json`): as entradas herdadas ficam ("pré-origem-local"), fora
// do escopo de projeção do ADR-0016 (exclusão explícita e enumerada, #417), e o ledger cresce a partir
// desse marco. O guard permanece INTOCADO e fail-secure por construção (nenhuma remoção é permitida).
//
// O marcador é o sinal **verificável** (#407): registra o fingerprint (sha256) da semente herdada e a
// lista exata de ids herdados; a procedência é conferível a qualquer momento (tamper-evident) e visível
// no `scripts/smoke-test.sh`/CI (#415).
//
// CLI (Node >= 22.6, type stripping):
//   node --experimental-strip-types tools/ledger/ledger-origin.ts --check [marker] [ledger]
//   node --experimental-strip-types tools/ledger/ledger-origin.ts --init  [ledger] [marker] [--write]
// As funções puras são exportadas para cobertura por vitest.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import process from "node:process";
import type { LedgerItem } from "./ledger-guard.ts";

/** Repo Orion (origem/template) × repo derivado com origem local estabelecida. */
export type LedgerOrigin =
  | { origin: "orion"; note?: string }
  | {
      origin: "local";
      bootstrappedOn: string; //   data ISO (YYYY-MM-DD) do bootstrap humano (getting-started §2)
      seedSha256: string; //       fingerprint da semente herdada (sha256:<hex64>)
      inheritedEntryIds: string[]; // ids herdados do template — "pré-origem-local", fora de escopo
      note?: string;
    };

// Ordem de chave fixa: serialização canônica estável (independe da ordem no arquivo — reorder-safe).
const KEY_ORDER = ["id", "issue", "category", "description", "steps", "acceptance", "passes"] as const;
const canonical = (it: LedgerItem): string => JSON.stringify(KEY_ORDER.map((k) => [k, it[k]]));

/** Fingerprint sha256 de um subconjunto do ledger (ordenado por id → insensível à ordem). */
export function fingerprint(items: LedgerItem[]): string {
  const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));
  return "sha256:" + createHash("sha256").update(sorted.map(canonical).join("\n")).digest("hex");
}

export function loadOrigin(path: string): LedgerOrigin {
  return JSON.parse(readFileSync(path, "utf-8")) as LedgerOrigin;
}

/**
 * Valida a FORMA do marcador (retorna erros; vazio = ok). Mantido **equivalente ao schema**
 * (`ledger-origin.schema.json`): rejeita campos desconhecidos (`additionalProperties:false`), `note`
 * não-string, e exige os campos/patterns da origem local — para o `--check` runtime e o Ajv dos testes
 * concordarem (Codex #105). O teste de equivalência (`ledger-origin.test.ts`) trava esse contrato.
 */
export function validateShape(m: unknown): string[] {
  if (!m || typeof m !== "object" || Array.isArray(m)) return ["marcador não é um objeto JSON"];
  const o = m as Record<string, unknown>;
  if (o.origin !== "orion" && o.origin !== "local") {
    return [`campo 'origin' inválido: esperado "orion" | "local"`];
  }
  const e: string[] = [];
  const allowed =
    o.origin === "orion"
      ? new Set(["origin", "note"])
      : new Set(["origin", "bootstrappedOn", "seedSha256", "inheritedEntryIds", "note"]);
  for (const k of Object.keys(o)) if (!allowed.has(k)) e.push(`campo desconhecido: '${k}'`);
  if ("note" in o && typeof o.note !== "string") e.push("'note' deve ser string");
  if (o.origin === "local") {
    if (typeof o.bootstrappedOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(o.bootstrappedOn)) {
      e.push("origem local sem 'bootstrappedOn' válido (data YYYY-MM-DD)");
    }
    if (typeof o.seedSha256 !== "string" || !/^sha256:[0-9a-f]{64}$/.test(o.seedSha256)) {
      e.push("origem local sem 'seedSha256' válido (sha256:<hex64>)");
    }
    if (!Array.isArray(o.inheritedEntryIds) || o.inheritedEntryIds.some((x) => typeof x !== "string")) {
      e.push("origem local sem 'inheritedEntryIds' (array de ids herdados)");
    }
  }
  return e;
}

/**
 * Confere a PROCEDÊNCIA (tamper-evident, só p/ origem local): cada id herdado existe no ledger e o
 * fingerprint do subconjunto herdado bate com o `seedSha256` registrado. Divergência = a semente foi
 * editada (ou o append-only foi violado) → erro.
 */
export function verifyProvenance(m: LedgerOrigin, ledger: LedgerItem[]): string[] {
  if (m.origin !== "local") return [];
  const byId = new Map(ledger.map((it) => [it.id, it]));
  const subset: LedgerItem[] = [];
  const missing: string[] = [];
  for (const id of m.inheritedEntryIds) {
    const it = byId.get(id);
    if (!it) missing.push(id);
    else subset.push(it);
  }
  if (missing.length) {
    // Sem todas as entradas herdadas não dá para conferir o fingerprint com segurança.
    return missing.map((id) => `entrada herdada ausente do ledger (append-only violado?): ${id}`);
  }
  const fp = fingerprint(subset);
  return fp === m.seedSha256
    ? []
    : [`fingerprint da semente diverge: registrado ${m.seedSha256}, calculado ${fp} (entradas herdadas editadas?)`];
}

/** Entradas NO ESCOPO de projeção (ADR-0016): as que NÃO são pré-origem-local (herdadas). */
export function inScope(m: LedgerOrigin, ledger: LedgerItem[]): LedgerItem[] {
  if (m.origin !== "local") return ledger; // Orion: todo o ledger é origem local (marco ADR-0006/#29)
  const inherited = new Set(m.inheritedEntryIds);
  return ledger.filter((it) => !inherited.has(it.id));
}

/** Gera um marcador de origem local a partir do ledger atual (todas as entradas viram herdadas). */
export function initLocalOrigin(ledger: LedgerItem[], date: string): LedgerOrigin {
  return {
    origin: "local",
    bootstrappedOn: date,
    seedSha256: fingerprint(ledger),
    inheritedEntryIds: ledger.map((it) => it.id).sort(),
    note:
      "Ledger de origem local (ADR-0021). As entradas em inheritedEntryIds são herdadas do template " +
      "Orion — 'pré-origem-local', fora do escopo de projeção (ADR-0016), preservadas pelo append-only " +
      "e nunca projetadas/flipadas. As entradas locais nascem a partir deste marco.",
  };
}

function cmdCheck(markerPath: string, ledgerPath: string): number {
  let marker: LedgerOrigin;
  let ledger: LedgerItem[];
  try {
    marker = loadOrigin(markerPath);
    ledger = JSON.parse(readFileSync(ledgerPath, "utf-8")) as LedgerItem[];
  } catch (e) {
    console.error(`falha ao ler marcador/ledger: ${(e as Error).message}`);
    return 2;
  }
  const errs = [...validateShape(marker), ...verifyProvenance(marker, ledger)];
  if (errs.length) {
    console.error("LEDGER ORIGIN: FAIL");
    for (const e of errs) console.error("  - " + e);
    return 1;
  }
  if (marker.origin === "orion") {
    console.log(`LEDGER ORIGIN: PASS (origem=orion — marco local do ledger = ADR-0006/#29; ${ledger.length} entrada(s))`);
  } else {
    const scoped = inScope(marker, ledger).length;
    console.log(
      `LEDGER ORIGIN: PASS (origem=local desde ${marker.bootstrappedOn} — ` +
        `${marker.inheritedEntryIds.length} herdada(s) pré-origem-local fora de escopo, ${scoped} local(is) no escopo)`,
    );
  }
  return 0;
}

function cmdInit(ledgerPath: string, markerPath: string, write: boolean): number {
  // Fronteira one-time (Codex #105): re-rodar `--init` num repo que já tem origem local
  // re-fingerprintaria o ledger inteiro e reclassificaria silenciosamente as entradas LOCAIS como
  // herdadas (movendo o marco). Recusar quando o marcador-alvo já é `origin: "local"` — recuperar exige
  // remover o marcador manualmente (ato deliberado; e o smoke acusa a ausência, #407).
  if (existsSync(markerPath)) {
    try {
      if (loadOrigin(markerPath).origin === "local") {
        console.error(
          `recusado: ${markerPath} já é origem local (bootstrap é one-time). Mover a fronteira exige ` +
            `remover o marcador manualmente e re-inicializar — não é o caminho normal.`,
        );
        return 1;
      }
    } catch {
      // marcador ilegível/inexistente na prática — segue e grava um marcador válido
    }
  }
  let ledger: LedgerItem[];
  try {
    ledger = JSON.parse(readFileSync(ledgerPath, "utf-8")) as LedgerItem[];
  } catch (e) {
    console.error(`falha ao ler ${ledgerPath}: ${(e as Error).message}`);
    return 2;
  }
  const marker = initLocalOrigin(ledger, new Date().toISOString().slice(0, 10));
  const json = JSON.stringify(marker, null, 2) + "\n";
  if (write) {
    writeFileSync(markerPath, json);
    console.error(`marcador de origem local escrito: ${markerPath}`);
  } else {
    process.stdout.write(json);
  }
  return 0;
}

function main(): number {
  const [, , cmd, ...rest] = process.argv;
  if (cmd === "--check") {
    return cmdCheck(rest[0] ?? ".orion/ledger-origin.json", rest[1] ?? "feature-ledger.json");
  }
  if (cmd === "--init") {
    const write = rest.includes("--write");
    const pos = rest.filter((a) => a !== "--write");
    return cmdInit(pos[0] ?? "feature-ledger.json", pos[1] ?? ".orion/ledger-origin.json", write);
  }
  console.error("uso: ledger-origin.ts --check [marker] [ledger] | --init [ledger] [marker] [--write]");
  return 2;
}

// Só executa o CLI quando rodado diretamente (não quando importado por vitest).
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
