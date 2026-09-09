#!/usr/bin/env node
// adr-history-guard.ts — Guard append-only do HISTÓRICO de ADRs (Orion, #213). COMPLEMENTA o guard de
// SEQUÊNCIA (`adr-sequence.ts --check`, #208/T11.2): aquele olha só a árvore ATUAL (duplicado/buraco); este
// protege a regra de governança "um ADR já na `main` NUNCA é renumerado — supersede-se por nota"
// (ADR-0031 ponto 4; §4 L3 append-only), que o de sequência não pega (apagar o ADR de maior número, ou
// renumerar mantendo o mesmo conjunto, mantém `0001..MAX'` contíguo → passa).
//
// Espelha o padrão base×head do `tools/ledger/ledger-guard.ts`: compara `docs/decisions/` contra uma base
// confiável (`origin/main`) e REPROVA (fail-closed) a (a) REMOÇÃO ou a (b) MUTAÇÃO DE IDENTIDADE
// (mesmo número → arquivo/slug diferente) de um ADR JÁ MERGEADO — preservando a renumeração de um ADR
// AINDA NÃO na `main` (só os ADRs presentes na BASE são vigiados). Base inacessível (offline/shallow) →
// SKIP conservador (exit 0), como os demais guards do smoke-test.
//
// A identidade vigiada é o par (número, nome do arquivo) — SEM ler conteúdo: editar o CONTEÚDO de um ADR
// mergeado é PERMITIDO (só remover/renumerar é proibido). Reusa a gramática do nome via `adrNumberFromName`
// (ADR-0023 — uma fonte de parsing, sem duplicar a regex).
//
// CLI (Node >= 22.6, type stripping):
//   node --experimental-strip-types tools/adr/adr-history-guard.ts [--check] [<baseRef>]
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { adrNumberFromName } from "./adr-index.ts";

const DECISIONS_DIR = "docs/decisions";

/** Map número→nome dos ADRs válidos (gramática canônica) de uma lista de nomes. Puro/testável. Número
 *  duplicado é alvo do guard de SEQUÊNCIA (#208), não deste — aqui "último vence" (não é a preocupação). */
export function adrsByNumber(names: string[]): Map<number, string> {
  const m = new Map<number, string>();
  for (const name of names) {
    const num = adrNumberFromName(name);
    if (num !== null) m.set(num, name);
  }
  return m;
}

/** Violações de append-only: um ADR presente na BASE não pode SUMIR nem TROCAR de arquivo/slug no HEAD.
 *  Puro (recebe as duas listas de nomes) — o CLI resolve git/fs. Vazio = OK. Um ADR só no head (novo,
 *  ausente na base) é livre — inclusive pode ser renumerado, pois ainda não é registro mergeado. */
export function diffAdrHistory(baseNames: string[], headNames: string[]): string[] {
  const errors: string[] = [];
  const base = adrsByNumber(baseNames);
  const head = adrsByNumber(headNames);
  for (const [num, baseFile] of base) {
    const id = `ADR-${String(num).padStart(4, "0")}`;
    const headFile = head.get(num);
    if (headFile === undefined) {
      errors.push(
        `${id} removido: '${baseFile}' está na base (origin/main) e ausente no head — ADR mergeado é append-only`,
      );
    } else if (headFile !== baseFile) {
      errors.push(
        `${id} com identidade mutada: base '${baseFile}' -> head '${headFile}' (renumeração/substituição de registro já mergeado)`,
      );
    }
  }
  return errors;
}

/** `true` se o ref existe e é acessível (git read-only). Base ausente (offline/shallow) → skip conservador. */
function refAccessible(ref: string): boolean {
  try {
    execFileSync("git", ["rev-parse", "--verify", "--quiet", ref], {
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

/** Nomes dos arquivos de ADR na base `<ref>` via `git ls-tree` (read-only). `null` = não deu p/ listar. */
function baseAdrNames(ref: string): string[] | null {
  try {
    const out = execFileSync("git", ["ls-tree", "-r", "--name-only", ref, "--", DECISIONS_DIR], {
      encoding: "utf-8",
    });
    return out
      .split("\n")
      .filter(Boolean)
      .map((p) => p.slice(p.lastIndexOf("/") + 1));
  } catch {
    return null;
  }
}

export interface GuardResult {
  code: number; //     0 = PASS ou SKIP; 1 = violação; 2 = erro de leitura/argumento
  message: string;
  errors?: string[];
}

/** Resolvedores de base/head — injetáveis para testar o caminho de VIOLAÇÃO (exit≠0) sem um repo git
 *  temporário (Codex #262 L28). O default lê git (base) + fs (head). */
export interface GuardDeps {
  accessible: (ref: string) => boolean;
  baseNames: (ref: string) => string[] | null;
  headNames: () => string[];
}
const defaultDeps: GuardDeps = {
  accessible: refAccessible,
  baseNames: baseAdrNames,
  headNames: () => readdirSync(DECISIONS_DIR),
};

/** Resolve base (git) + head (fs) e aplica `diffAdrHistory`. Sem `process.exit` — testável direto (deps
 *  injetáveis). Base inacessível → SKIP (code 0), como os demais guards. */
export function runGuard(ref = "origin/main", deps: GuardDeps = defaultDeps): GuardResult {
  if (!deps.accessible(ref)) {
    return {
      code: 0,
      message: `ADR-HISTORY-GUARD: SKIP — base '${ref}' inacessível (offline/shallow); sem base confiável, guard conservador.`,
    };
  }
  const baseNames = deps.baseNames(ref);
  if (baseNames === null) {
    return { code: 0, message: `ADR-HISTORY-GUARD: SKIP — não foi possível listar '${DECISIONS_DIR}' em '${ref}'.` };
  }
  let errors: string[];
  try {
    errors = diffAdrHistory(baseNames, deps.headNames());
  } catch (e) {
    return { code: 2, message: `falha ao validar histórico de ADRs: ${(e as Error).message}` };
  }
  if (errors.length) return { code: 1, message: "ADR-HISTORY-GUARD: FAIL", errors };
  return { code: 0, message: `ADR-HISTORY-GUARD: PASS — nenhum ADR mergeado removido/renumerado (base ${ref}).` };
}

/** Parse fail-closed dos argumentos do CLI: aceita SÓ `[--check]` e `[--base <ref>]`; qualquer token
 *  desconhecido/repetido/em excesso é ERRO (não vira base ref silenciosa que faria SKIP num typo — um
 *  guard de governança não pode se auto-desligar por engano de invocação, Codex #262 L119). */
export function parseArgs(argv: string[]): { ref: string } | { error: string } {
  let ref: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--check") continue;
    if (a === "--base") {
      const v = argv[++i];
      if (!v) return { error: "--base exige um <ref>" };
      if (ref !== undefined) return { error: "--base repetido" };
      ref = v;
      continue;
    }
    return { error: `argumento desconhecido: '${a}' (uso: [--check] [--base <ref>])` };
  }
  return { ref: ref ?? "origin/main" };
}

function main(): number {
  const parsed = parseArgs(process.argv.slice(2));
  if ("error" in parsed) {
    console.error(`ADR-HISTORY-GUARD: ${parsed.error}`);
    return 2;
  }
  const r = runGuard(parsed.ref);
  if (r.code === 1) {
    console.log(r.message);
    for (const e of r.errors ?? []) console.error("  - " + e);
  } else if (r.code === 2) {
    console.error(r.message);
  } else {
    console.log(r.message);
  }
  return r.code;
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
