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
import { readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { duplicateIds, type LedgerItem } from "./ledger-guard.ts";

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
// Só os campos IMUTÁVEIS (= id + ledger-guard.IMMUTABLE, sem `passes`). O fingerprint do LIFECYCLE usa esta
// ordem porque `passes` é legitimamente mutável (`false→true` de item existente é permitido — §e/ledger-guard;
// o §d isenta o legado da OBRIGAÇÃO de flip, não o proíbe). Incluir `passes` faria um flip legal de uma
// entrada legada quebrar o `--scoped`/CI (Codex r2 #117). O `fingerprint` de ORIGEM segue com `passes`
// (semente herdada é inerte, nunca flipa — ADR-0021).
const IMMUTABLE_KEY_ORDER = ["id", "issue", "category", "description", "steps", "acceptance"] as const;

const fpWith = (items: LedgerItem[], keys: readonly (keyof LedgerItem)[]): string => {
  const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));
  const canon = (it: LedgerItem) => JSON.stringify(keys.map((k) => [k, it[k]]));
  return "sha256:" + createHash("sha256").update(sorted.map(canon).join("\n")).digest("hex");
};

/** Fingerprint sha256 de um subconjunto do ledger (ordenado por id → insensível à ordem). Inclui `passes`. */
export function fingerprint(items: LedgerItem[]): string {
  return fpWith(items, KEY_ORDER);
}

/** Fingerprint do LIFECYCLE: só campos imutáveis (tolera o flip monotônico `passes:false→true`, Codex r2). */
export function lifecycleFingerprint(items: LedgerItem[]): string {
  return fpWith(items, IMMUTABLE_KEY_ORDER);
}

export function loadOrigin(path: string): LedgerOrigin {
  return JSON.parse(readFileSync(path, "utf-8")) as LedgerOrigin;
}

/**
 * Carrega o ledger validando que é um **array de entradas** (cada uma um objeto com `id` string).
 * Rejeita JSON válido mas não-array (ex.: `{}`), que faria o `--check` imprimir "undefined entrada(s)"
 * com exit 0 — reportando sucesso para um ledger corrompido (Codex #105 r9). Lança em caso inválido.
 */
export function loadLedger(path: string): LedgerItem[] {
  const parsed = JSON.parse(readFileSync(path, "utf-8")) as unknown;
  if (
    !Array.isArray(parsed) ||
    parsed.some((it) => !it || typeof it !== "object" || typeof (it as { id?: unknown }).id !== "string")
  ) {
    throw new Error(`${path} não é um array de entradas de ledger válido`);
  }
  return parsed as LedgerItem[];
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
  // Fail-closed em id duplicado: um duplicado intacto colapsaria no Map e mascararia uma entrada
  // herdada editada, furando a tamper-evidence (Codex #105 r7).
  const dups = duplicateIds(ledger);
  if (dups.length) return dups.map((id) => `id duplicado no ledger (procedência não-confiável): ${id}`);
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

const sameIds = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  const sb = [...b].sort();
  return [...a].sort().every((x, i) => x === sb[i]);
};

/**
 * Guard de IMUTABILIDADE do marcador (append-only do próprio marcador, Codex #105). Compara o marcador
 * da base (`origin/main`) com o do head (PR) e permite **apenas**:
 *  - **transição one-time `orion`/ausente → `local`** (bootstrap): a fronteira herdada tem de bater com o
 *    **ledger da base** (`origin/main`), não com o head mutável — `seedSha256 == fingerprint(baseLedger)`
 *    e `inheritedEntryIds == ids(baseLedger)`. Sem isso, a PR de bootstrap poderia adicionar uma entrada
 *    LOCAL ao ledger e marcá-la como herdada (sumindo do `inScope`) com tudo auto-consistente (#105 3ª
 *    rodada). `baseLedger` é obrigatório nessa transição (fail-closed se ausente);
 *  - `orion`/ausente → `orion` (repo Orion / derivado ainda não bootstrapado) → livre;
 *  - `local` → `local` **com `seedSha256`/`inheritedEntryIds`/`bootstrappedOn` inalterados** (só `note`
 *    pode mudar).
 * Proíbe: `local→orion` (reverter a fronteira) e qualquer re-fingerprint/reclassificação (mover a
 * fronteira). Fecha o bypass em que um `--check` só de head-state passaria num marcador auto-consistente.
 */
export function diffOrigin(
  base: LedgerOrigin | null,
  head: LedgerOrigin,
  baseLedger?: LedgerItem[] | null,
): string[] {
  if (base === null || base.origin === "orion") {
    if (head.origin !== "local") return []; // introdução / orion→orion → livre
    // Transição para 'local' (bootstrap): vincular a fronteira ao LEDGER DA BASE, não ao head.
    if (!baseLedger) {
      return ["bootstrap orion→local requer o ledger da base (origin/main) para vincular a fronteira"];
    }
    const errors: string[] = [];
    if (head.seedSha256 !== fingerprint(baseLedger)) {
      errors.push("'seedSha256' do bootstrap deve ser o fingerprint do ledger da base (origin/main), não do head");
    }
    if (!sameIds(head.inheritedEntryIds, baseLedger.map((it) => it.id))) {
      errors.push("'inheritedEntryIds' do bootstrap deve ser exatamente os ids do ledger da base (origin/main) — não inclua entradas locais");
    }
    return errors;
  }
  // base.origin === "local": fronteira já estabelecida — imutável.
  if (head.origin !== "local") {
    return [`origem 'local' não pode reverter para '${head.origin}' (a fronteira de bootstrap é one-time)`];
  }
  const errors: string[] = [];
  if (head.bootstrappedOn !== base.bootstrappedOn) {
    errors.push(`'bootstrappedOn' imutável após o bootstrap (base ${base.bootstrappedOn} → head ${head.bootstrappedOn})`);
  }
  if (head.seedSha256 !== base.seedSha256) {
    errors.push("'seedSha256' imutável após o bootstrap (re-fingerprintar a semente é proibido)");
  }
  if (!sameIds(base.inheritedEntryIds, head.inheritedEntryIds)) {
    errors.push("'inheritedEntryIds' imutável após o bootstrap (reclassificar entradas locais como herdadas é proibido)");
  }
  return errors;
}

/**
 * Conjunto dos ids **herdados** (pré-origem-local) segundo o marcador. Vazio p/ origem `orion` (nada
 * herdado; o repo é a origem). Usado pelo gerador (`ledger-from-issues`) para **detectar colisão**: uma
 * projeção local nunca deve mirar um id herdado (#106).
 */
export function inheritedIdSet(m: LedgerOrigin): Set<string> {
  return new Set(m.origin === "local" ? m.inheritedEntryIds : []);
}

/** Entradas NO ESCOPO de projeção (ADR-0016): as que NÃO são pré-origem-local (herdadas). */
export function inScope(m: LedgerOrigin, ledger: LedgerItem[]): LedgerItem[] {
  if (m.origin !== "local") return ledger; // Orion: todo o ledger é origem local (marco ADR-0006/#29)
  const inherited = new Set(m.inheritedEntryIds);
  return ledger.filter((it) => !inherited.has(it.id));
}

// ─── Lifecycle (ADR-0022 / #114) ──────────────────────────────────────────────────────────────────
//
// Sob a projeção per-PR (ADR-0016) toda entrada nasce `false` e só flipa `true` num PR posterior. Isso
// tornou `passes:false` AMBÍGUO no `--scoped`: (a) legado pré-ADR-0022 (fora da obrigação de flip, §d),
// ou (b) sob-regime "entregue-aguardando-flip" (a projeção só entra no MERGE da entrega → já entregue,
// falta só a flip). Um `false` "pendente-não-entregue" praticamente não existe em `main` (a entrada não
// chega ao ledger sem o PR da entrega mergear). O marcador de lifecycle **enumera o legado** — o corte é
// por ENUMERAÇÃO, **não** por número de issue (os dados provam que #87–#108 têm número > #85 mas são
// legado, pois mergearam ANTES do ADR-0022) — análogo ao `inheritedEntryIds` (ADR-0021).

/** Marcador do lifecycle: enumera o legado pré-ADR-0022 (fora da obrigação de flip, ADR-0022 §d). */
export interface LedgerLifecycle {
  regimeAdr: string; //     ADR que instituiu o regime de flip (ex.: "ADR-0022")
  adoptedOn: string; //     data ISO (YYYY-MM-DD) do regime
  legacySha256: string; //  fingerprint do subconjunto legado (sha256:<hex64>) — tamper-evidence
  legacyEntryIds: string[]; // ids pré-ADR-0022, enumeração explícita e permanente
  note?: string;
}

/** Carrega o marcador de lifecycle. **Ausente → `null`** = sem legado (repo derivado: todo local é sob-regime). */
export function loadLifecycle(path: string): LedgerLifecycle | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8")) as LedgerLifecycle;
}

/**
 * Ausência do marcador de lifecycle: **OK p/ origem `local`** (repo derivado — todo entry local é sob-regime,
 * sem legado a enumerar); **FAIL p/ `orion`** (o marcador é **versionado** — sua ausência = fronteira do
 * legado removida, e o `--scoped` reportaria as ~105 entradas pré-ADR-0022 como "aguardando flip", risco de
 * flip em massa). Espelha o fail-closed do marcador de origem (Codex r3 #117 / #407).
 */
export function lifecycleAbsenceError(origin: LedgerOrigin, hasLifecycle: boolean): string[] {
  if (hasLifecycle || origin.origin !== "orion") return [];
  return ["marcador de lifecycle ausente com origem 'orion' — o marcador versionado do legado foi removido (fail-closed)"];
}

/** Valida a FORMA do marcador de lifecycle (retorna erros; vazio = ok). Espelha o `*.schema.json`. */
export function validateLifecycleShape(m: unknown): string[] {
  if (!m || typeof m !== "object" || Array.isArray(m)) return ["marcador lifecycle não é um objeto JSON"];
  const o = m as Record<string, unknown>;
  const e: string[] = [];
  const allowed = new Set(["regimeAdr", "adoptedOn", "legacySha256", "legacyEntryIds", "note"]);
  for (const k of Object.keys(o)) if (!allowed.has(k)) e.push(`campo desconhecido: '${k}'`);
  if (typeof o.regimeAdr !== "string" || o.regimeAdr === "") e.push("'regimeAdr' deve ser string não-vazia");
  if (typeof o.adoptedOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(o.adoptedOn)) {
    e.push("'adoptedOn' deve ser data YYYY-MM-DD");
  }
  if (typeof o.legacySha256 !== "string" || !/^sha256:[0-9a-f]{64}$/.test(o.legacySha256)) {
    e.push("'legacySha256' deve ser sha256:<hex64>");
  }
  if (!Array.isArray(o.legacyEntryIds) || o.legacyEntryIds.some((x) => typeof x !== "string")) {
    e.push("'legacyEntryIds' deve ser array de ids (string)");
  }
  if ("note" in o && typeof o.note !== "string") e.push("'note' deve ser string");
  return e;
}

/**
 * Tamper-evidence (só verifica quando há marcador): cada id legado existe no ledger e o fingerprint dos
 * campos IMUTÁVEIS do subconjunto legado bate com `legacySha256`. Divergência = um campo imutável de uma
 * entrada legada foi editado, ou o corte foi movido → erro. Usa `lifecycleFingerprint` (exclui `passes`), que
 * **tolera** o flip legítimo `passes:false→true` de uma entrada legada (§d isenta da obrigação, não proíbe).
 */
export function verifyLifecycle(m: LedgerLifecycle, ledger: LedgerItem[]): string[] {
  const dups = duplicateIds(ledger);
  if (dups.length) return dups.map((id) => `id duplicado no ledger (lifecycle não-confiável): ${id}`);
  const byId = new Map(ledger.map((it) => [it.id, it]));
  const subset: LedgerItem[] = [];
  const missing: string[] = [];
  for (const id of m.legacyEntryIds) {
    const it = byId.get(id);
    if (!it) missing.push(id);
    else subset.push(it);
  }
  if (missing.length) return missing.map((id) => `id legado ausente do ledger (append-only violado?): ${id}`);
  const fp = lifecycleFingerprint(subset);
  return fp === m.legacySha256
    ? []
    : [`fingerprint do legado diverge: registrado ${m.legacySha256}, calculado ${fp} (campo imutável de entrada legada editado?)`];
}

export interface LifecycleView {
  legacy: LedgerItem[]; //        pré-ADR-0022 — fora da obrigação de flip (§d)
  awaitingFlip: LedgerItem[]; //  sob-regime & !passes & JÁ em main (entregue) — candidata a flip
  pending: LedgerItem[]; //       sob-regime & !passes & ainda NÃO em main (projetada nesta branch)
  done: LedgerItem[]; //          sob-regime & passes
}

/**
 * Classifica entradas (já `inScope`) em legado / aguardando-flip / pendente / concluída.
 *
 * `deliveredIds` = ids **já presentes na baseline** (`origin/main`): distingue **entregue-aguardando-flip**
 * (id ∈ deliveredIds — a projeção per-PR do ADR-0016 só entra no MERGE da entrega, então estar em `main`
 * = entregue) de **pendente** (id ∉ deliveredIds — recém-projetada nesta branch, ainda **não** entregue →
 * **não** propor flip). Sem essa distinção, rodar numa feature-branch marcaria toda entrada nova como
 * "entregue" e induziria flip prematuro (Codex r1 #117). `legacyIds` vazio → nada é legado (repo derivado).
 */
export function classifyLifecycle(
  entries: LedgerItem[],
  legacyIds: Set<string>,
  deliveredIds: Set<string>,
): LifecycleView {
  const view: LifecycleView = { legacy: [], awaitingFlip: [], pending: [], done: [] };
  for (const it of entries) {
    if (legacyIds.has(it.id)) view.legacy.push(it);
    else if (it.passes) view.done.push(it);
    else if (deliveredIds.has(it.id)) view.awaitingFlip.push(it);
    else view.pending.push(it);
  }
  return view;
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

/**
 * Imprime a **view no escopo** do ledger (ADR-0021/0016) para o ritual de get-bearings (#107):
 * lista as entradas **no escopo de origem local** (`inScope`) com o status `passes`, para o agente
 * escolher a próxima tarefa **sem** confundir entradas herdadas (pré-origem-local) com trabalho local
 * pendente. No Orion (`origin:orion`) `inScope` = ledger inteiro → equivalente a ler o ledger cru.
 */
function cmdScoped(
  markerPath: string,
  ledgerPath: string,
  lifecyclePath: string,
  basePath: string | undefined,
  showAll: boolean,
): number {
  let marker: LedgerOrigin;
  let ledger: LedgerItem[];
  let lifecycle: LedgerLifecycle | null;
  try {
    marker = loadOrigin(markerPath);
    ledger = loadLedger(ledgerPath);
    lifecycle = loadLifecycle(lifecyclePath);
  } catch (e) {
    console.error(`falha ao ler marcador/ledger: ${(e as Error).message}`);
    return 2;
  }
  const errs = [...validateShape(marker), ...verifyProvenance(marker, ledger)];
  // Fail-closed: marcador de lifecycle ausente é OK só p/ origem local (derivado sem legado); p/ Orion o
  // marcador é versionado e sua ausência reportaria o legado inteiro como "aguardando flip" (Codex r3 #117).
  errs.push(...lifecycleAbsenceError(marker, lifecycle !== null));
  if (lifecycle) {
    // Só rodar a verificação SEMÂNTICA (que itera `legacyEntryIds`) depois da forma validar — senão um
    // marcador malformado (ex.: `legacyEntryIds` ausente) lança TypeError não-tratado (Codex r1 #117).
    const shapeErrs = validateLifecycleShape(lifecycle);
    errs.push(...shapeErrs);
    if (!shapeErrs.length) errs.push(...verifyLifecycle(lifecycle, ledger));
  }
  if (errs.length) {
    console.error("LEDGER ORIGIN SCOPED: FAIL");
    for (const e of errs) console.error("  - " + e);
    return 1;
  }
  const scoped = inScope(marker, ledger);
  const legacyIds = new Set(lifecycle?.legacyEntryIds ?? []);
  // Baseline de ENTREGA: ids já em `origin/main` distinguem entregue-aguardando-flip de pendente
  // (recém-projetada nesta branch). `--base` explícito; ausente → assume "em main" (todo entry presente já
  // foi entregue — correto no uso comum do get-bearings em `main`). Baseline ausente/`null`/inválida (ex.:
  // 1º PR, sem ledger em main) → conjunto vazio (nada entregue) → tudo `false` vira pendente (conservador,
  // nunca induz flip prematuro).
  const deliveredIds = resolveDeliveredIds(basePath, ledger);
  const { legacy, awaitingFlip, pending, done } = classifyLifecycle(scoped, legacyIds, deliveredIds);
  const inheritedOut = ledger.length - scoped.length;
  console.log(
    `LEDGER ORIGIN SCOPED: ${scoped.length} no escopo ` +
      `(${awaitingFlip.length} aguardando flip, ${pending.length} pendente(s), ${done.length} concluída(s), ` +
      `${legacy.length} legado${legacy.length && !showAll ? " oculto(s)" : ""})` +
      `${inheritedOut ? ` [+${inheritedOut} herdada(s) fora de escopo]` : ""}`,
  );
  const list = (its: LedgerItem[], mark: string) => {
    for (const it of its) console.log(`  [${mark}] ${it.id}  #${it.issue}  ${it.description.slice(0, 70)}`);
  };
  if (awaitingFlip.length) {
    console.log("  aguardando flip (entregue em main → flipar passes:true, ADR-0022 §c):");
    list(awaitingFlip, " ");
  }
  if (pending.length) {
    console.log("  pendente (projetada nesta branch, ainda não em main → NÃO flipe: entregue primeiro):");
    list(pending, "·");
  }
  if (done.length) {
    console.log("  concluída(s):");
    list(done, "x");
  }
  if (legacy.length) {
    if (showAll) {
      console.log("  legado pré-ADR-0022 (fora da obrigação de flip, §d):");
      list(legacy, "-");
    } else {
      console.log(`  (${legacy.length} legado pré-ADR-0022 oculto(s) — use --all para listar)`);
    }
  }
  return 0;
}

/**
 * Ids da baseline de ENTREGA (`origin/main`). `--base` dado → os ids desse ledger (leniente: ausente/
 * `null`/não-array → vazio, "nada entregue", conservador). Sem `--base` → assume "em main": todo id do
 * ledger atual conta como entregue (uso comum do get-bearings em `main`; numa branch, passe `--base`).
 */
function resolveDeliveredIds(basePath: string | undefined, ledger: LedgerItem[]): Set<string> {
  if (basePath === undefined) return new Set(ledger.map((it) => it.id));
  const base = readMaybe<unknown[]>(basePath);
  if (!Array.isArray(base)) return new Set();
  return new Set(base.filter((it): it is LedgerItem => !!it && typeof (it as LedgerItem).id === "string").map((it) => it.id));
}

function cmdCheck(markerPath: string, ledgerPath: string): number {
  let marker: LedgerOrigin;
  let ledger: LedgerItem[];
  try {
    marker = loadOrigin(markerPath);
    ledger = loadLedger(ledgerPath);
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
  // herdadas (movendo o marco). **Falha fechada** quando já existe um marcador que não seja um `orion`
  // válido: ilegível, mal-formado ou já `local` → recusa. Só o caso legítimo (marcador `orion` válido,
  // ex.: template recém-derivado) segue para o bootstrap; recuperar exige removê-lo manualmente.
  if (existsSync(markerPath)) {
    let existing: LedgerOrigin;
    try {
      existing = loadOrigin(markerPath);
    } catch (e) {
      console.error(`recusado: ${markerPath} existe mas não pôde ser parseado (${(e as Error).message}) — falha fechada.`);
      return 1;
    }
    const shapeErrs = validateShape(existing);
    if (shapeErrs.length) {
      console.error(`recusado: ${markerPath} existe mas é inválido (${shapeErrs.join("; ")}) — falha fechada.`);
      return 1;
    }
    if (existing.origin === "local") {
      console.error(
        `recusado: ${markerPath} já é origem local (bootstrap é one-time). A fronteira é IMUTÁVEL ` +
          `(guard base×head congela seedSha256/inheritedEntryIds/bootstrappedOn) — remover+reinit NÃO ` +
          `passa. Recuperação: reconstruir o boundary original, ou um caminho de recuperação ` +
          `explicitamente governado (novo ADR).`,
      );
      return 1;
    }
  }
  let ledger: LedgerItem[];
  try {
    ledger = loadLedger(ledgerPath);
  } catch (e) {
    console.error(`falha ao ler ${ledgerPath}: ${(e as Error).message}`);
    return 2;
  }
  const marker = initLocalOrigin(ledger, new Date().toISOString().slice(0, 10));
  const json = JSON.stringify(marker, null, 2) + "\n";
  if (write) {
    // Escrita ATÔMICA (Codex #105 r5): grava num temp no MESMO diretório e renomeia por cima — o rename
    // é atômico no mesmo filesystem, então o bootstrap ou completa ou **preserva o marcador original
    // válido** (nunca deixa um marcador truncado, que travaria o próximo --init e o smoke, fail-closed).
    const tmp = join(dirname(markerPath), `.${basename(markerPath)}.tmp-${process.pid}`);
    writeFileSync(tmp, json);
    renameSync(tmp, markerPath);
    console.error(`marcador de origem local escrito: ${markerPath}`);
  } else {
    process.stdout.write(json);
  }
  return 0;
}

// Lê um JSON opcional que pode ser ausente/`null`/ilegível (base de origin/main). Vem do histórico
// confiável (um atacante não edita origin/main na PR), então tratar ausente como null é seguro.
function readMaybe<T>(path: string | undefined): T | null {
  try {
    const raw = path && existsSync(path) ? readFileSync(path, "utf-8").trim() : "";
    return raw === "" || raw === "null" ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

/**
 * Lê o marcador da base (origin/main), distinguindo **AUSENTE** (arquivo não existe → sentinela
 * `"null"`/vazio que o smoke grava; este PR introduz o marcador) de **PRESENTE-MAS-INVÁLIDO**
 * (conteúdo não-parseável/mal-formado). Um marcador base inválido **NÃO** pode virar `null` (tratado
 * como "nunca bootstrapado"), senão um PR de "recuperação" reclassificaria entradas locais como
 * herdadas passando os guards (Codex #105 r8). Ausente é seguro (base confiável); presente-e-inválido é
 * anomalia → o chamador falha fechado.
 */
export type BaseMarker =
  | { kind: "absent" }
  | { kind: "value"; value: LedgerOrigin }
  | { kind: "invalid"; reason: string };
export function readBaseMarker(path: string): BaseMarker {
  const raw = existsSync(path) ? readFileSync(path, "utf-8").trim() : "";
  if (raw === "" || raw === "null") return { kind: "absent" };
  let parsed: LedgerOrigin;
  try {
    parsed = JSON.parse(raw) as LedgerOrigin;
  } catch (e) {
    return { kind: "invalid", reason: `não-parseável: ${(e as Error).message}` };
  }
  const shapeErrs = validateShape(parsed);
  return shapeErrs.length ? { kind: "invalid", reason: shapeErrs.join("; ") } : { kind: "value", value: parsed };
}

function cmdGuard(baseMarkerPath: string, headPath: string, baseLedgerPath?: string): number {
  let head: LedgerOrigin;
  try {
    head = loadOrigin(headPath);
  } catch (e) {
    console.error(`falha ao ler head ${headPath}: ${(e as Error).message}`);
    return 2;
  }
  const baseM = readBaseMarker(baseMarkerPath);
  if (baseM.kind === "invalid") {
    console.error("LEDGER ORIGIN GUARD: FAIL");
    console.error(`  - marcador da base (origin/main) presente mas inválido: ${baseM.reason} (fail-closed)`);
    return 1;
  }
  const base = baseM.kind === "value" ? baseM.value : null;
  const baseLedger = readMaybe<LedgerItem[]>(baseLedgerPath);
  const errors = [...validateShape(head), ...diffOrigin(base, head, baseLedger)];
  if (errors.length) {
    console.error("LEDGER ORIGIN GUARD: FAIL");
    for (const e of errors) console.error("  - " + e);
    return 1;
  }
  console.log("LEDGER ORIGIN GUARD: PASS (fronteira de origem imutável: base → head)");
  return 0;
}

function main(): number {
  const [, , cmd, ...rest] = process.argv;
  if (cmd === "--check") {
    return cmdCheck(rest[0] ?? ".orion/ledger-origin.json", rest[1] ?? "feature-ledger.json");
  }
  if (cmd === "--scoped") {
    const showAll = rest.includes("--all");
    const bi = rest.indexOf("--base");
    // `--base` DADO exige um caminho: um `--base` solto (mistype) ou seguido de outra flag cairia no
    // fallback "em main" em silêncio — rotulando entradas de branch como "aguardando flip" (Codex r2 #117).
    if (bi >= 0 && (rest[bi + 1] === undefined || rest[bi + 1]!.startsWith("--"))) {
      console.error("--base requer um caminho (o ledger de origin/main); ex.: --base /tmp/main-ledger.json");
      return 2;
    }
    const basePath = bi >= 0 ? rest[bi + 1] : undefined;
    const pos = rest.filter((a, i) => a !== "--all" && a !== "--base" && !(bi >= 0 && i === bi + 1));
    return cmdScoped(
      pos[0] ?? ".orion/ledger-origin.json",
      pos[1] ?? "feature-ledger.json",
      pos[2] ?? ".orion/ledger-lifecycle.json",
      basePath,
      showAll,
    );
  }
  if (cmd === "--guard") {
    if (!rest[0] || !rest[1]) {
      console.error("uso: ledger-origin.ts --guard <base-marker> <head-marker> [base-ledger]");
      return 2;
    }
    return cmdGuard(rest[0], rest[1], rest[2]);
  }
  if (cmd === "--init") {
    const write = rest.includes("--write");
    const pos = rest.filter((a) => a !== "--write");
    return cmdInit(pos[0] ?? "feature-ledger.json", pos[1] ?? ".orion/ledger-origin.json", write);
  }
  console.error(
    "uso: ledger-origin.ts --check [marker] [ledger] | " +
      "--scoped [marker] [ledger] [lifecycle] [--base <ledger-de-main>] [--all] | " +
      "--guard <base> <head> | --init [ledger] [marker] [--write]",
  );
  return 2;
}

// Só executa o CLI quando rodado diretamente (não quando importado por vitest).
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
