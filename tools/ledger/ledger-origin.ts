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
import { readFileSync, writeFileSync, renameSync, existsSync, lstatSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { dirname, join, basename, relative, resolve } from "node:path";
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
const KEY_ORDER = [
  "id",
  "issue",
  "category",
  "description",
  "steps",
  "acceptance",
  "passes",
] as const;
// Só os campos IMUTÁVEIS (= id + ledger-guard.IMMUTABLE, sem `passes`). O fingerprint do LIFECYCLE usa esta
// ordem porque `passes` é legitimamente mutável (`false→true` de item existente é permitido — §e/ledger-guard;
// o §d isenta o legado da OBRIGAÇÃO de flip, não o proíbe). Incluir `passes` faria um flip legal de uma
// entrada legada quebrar o `--scoped`/CI (Codex r2 #117). O `fingerprint` de ORIGEM segue com `passes`
// (semente herdada é inerte, nunca flipa — ADR-0021).
const IMMUTABLE_KEY_ORDER = [
  "id",
  "issue",
  "category",
  "description",
  "steps",
  "acceptance",
] as const;

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
    parsed.some(
      (it) => !it || typeof it !== "object" || typeof (it as { id?: unknown }).id !== "string",
    )
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
    if (
      !Array.isArray(o.inheritedEntryIds) ||
      o.inheritedEntryIds.some((x) => typeof x !== "string")
    ) {
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
  if (dups.length)
    return dups.map((id) => `id duplicado no ledger (procedência não-confiável): ${id}`);
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
    : [
        `fingerprint da semente diverge: registrado ${m.seedSha256}, calculado ${fp} (entradas herdadas editadas?)`,
      ];
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
      return [
        "bootstrap orion→local requer o ledger da base (origin/main) para vincular a fronteira",
      ];
    }
    const errors: string[] = [];
    if (head.seedSha256 !== fingerprint(baseLedger)) {
      errors.push(
        "'seedSha256' do bootstrap deve ser o fingerprint do ledger da base (origin/main), não do head",
      );
    }
    if (
      !sameIds(
        head.inheritedEntryIds,
        baseLedger.map((it) => it.id),
      )
    ) {
      errors.push(
        "'inheritedEntryIds' do bootstrap deve ser exatamente os ids do ledger da base (origin/main) — não inclua entradas locais",
      );
    }
    return errors;
  }
  // base.origin === "local": fronteira já estabelecida — imutável.
  if (head.origin !== "local") {
    return [
      `origem 'local' não pode reverter para '${head.origin}' (a fronteira de bootstrap é one-time)`,
    ];
  }
  const errors: string[] = [];
  if (head.bootstrappedOn !== base.bootstrappedOn) {
    errors.push(
      `'bootstrappedOn' imutável após o bootstrap (base ${base.bootstrappedOn} → head ${head.bootstrappedOn})`,
    );
  }
  if (head.seedSha256 !== base.seedSha256) {
    errors.push("'seedSha256' imutável após o bootstrap (re-fingerprintar a semente é proibido)");
  }
  if (!sameIds(base.inheritedEntryIds, head.inheritedEntryIds)) {
    errors.push(
      "'inheritedEntryIds' imutável após o bootstrap (reclassificar entradas locais como herdadas é proibido)",
    );
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

/** ADR que rege o lifecycle e sua **data de adoção** (fato fixo do ADR-0022). O `regimeAdr`/`adoptedOn` da
 *  INTRODUÇÃO têm de casar estas constantes — senão congela metadado de auditoria contraditório (ex.:
 *  "ADR-9999", "2099-01-01", "2000-00-00", Codex #119). São a data do REGIME (do ADR), não a data em que
 *  cada repo mexeu no marcador — logo valem igual em repos derivados. */
export const LIFECYCLE_REGIME_ADR = "ADR-0022";
export const LIFECYCLE_ADOPTED_ON = "2026-07-28";

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
  return [
    "marcador de lifecycle ausente com origem 'orion' — o marcador versionado do legado foi removido (fail-closed)",
  ];
}

/** Valida a FORMA do marcador de lifecycle (retorna erros; vazio = ok). Espelha o `*.schema.json`. */
export function validateLifecycleShape(m: unknown): string[] {
  if (!m || typeof m !== "object" || Array.isArray(m))
    return ["marcador lifecycle não é um objeto JSON"];
  const o = m as Record<string, unknown>;
  const e: string[] = [];
  const allowed = new Set(["regimeAdr", "adoptedOn", "legacySha256", "legacyEntryIds", "note"]);
  for (const k of Object.keys(o)) if (!allowed.has(k)) e.push(`campo desconhecido: '${k}'`);
  if (typeof o.regimeAdr !== "string" || o.regimeAdr === "")
    e.push("'regimeAdr' deve ser string não-vazia");
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
  if (dups.length)
    return dups.map((id) => `id duplicado no ledger (lifecycle não-confiável): ${id}`);
  const byId = new Map(ledger.map((it) => [it.id, it]));
  const subset: LedgerItem[] = [];
  const missing: string[] = [];
  for (const id of m.legacyEntryIds) {
    const it = byId.get(id);
    if (!it) missing.push(id);
    else subset.push(it);
  }
  if (missing.length)
    return missing.map((id) => `id legado ausente do ledger (append-only violado?): ${id}`);
  const fp = lifecycleFingerprint(subset);
  return fp === m.legacySha256
    ? []
    : [
        `fingerprint do legado diverge: registrado ${m.legacySha256}, calculado ${fp} (campo imutável de entrada legada editado?)`,
      ];
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

/** Falha de VALIDAÇÃO do escopo (forma/procedência/lifecycle) — distinta de erro de LEITURA (IO/parse),
 *  para o chamador escolher exit 1 (validação) vs 2 (leitura), como o `--scoped` sempre fez. */
export class ScopedLedgerError extends Error {
  // Campo declarado + atribuído no corpo (NÃO parameter-property: o `--experimental-strip-types` nativo
  // do Node — usado no smoke-test/CLI/geradores — recusa `constructor(public …)`, só o esbuild do vitest aceita).
  readonly errors: string[];
  constructor(errors: string[]) {
    super(`ledger/marcador inválido: ${errors.join("; ")}`);
    this.name = "ScopedLedgerError";
    this.errors = errors;
  }
}

export interface ScopedLedger {
  scoped: LedgerItem[]; //     ledger já filtrado por `inScope` (herdados fora, em repo derivado)
  legacyIds: Set<string>; //   ids legados pré-ADR-0022 (do marcador de lifecycle)
  total: number; //            entradas do ledger cru (antes do `inScope`) — p/ contar herdadas fora
  marker: LedgerOrigin;
  lifecycle: LedgerLifecycle | null;
}

/**
 * Operação escopada CANÔNICA (a mesma que o `--scoped` faz — este é o único lugar que a implementa; o
 * `cmdScoped` e os geradores de relatório (status/pending) a REUSAM, sem segunda via — Codex #175/#3/#4).
 * Carrega ledger + marcadores, **valida** (forma da origem + procedência tamper-evident + forma/ausência
 * do lifecycle) e retorna o ledger **`inScope`** + ids legados. Erro de LEITURA (IO/JSON) propaga cru;
 * erro de VALIDAÇÃO lança `ScopedLedgerError` (fail-closed — nunca cai para "escopo inteiro" em silêncio,
 * que faria um repo derivado listar entradas herdadas do Orion como trabalho local).
 */
export function loadScopedLedger(
  markerPath: string,
  ledgerPath: string,
  lifecyclePath: string,
): ScopedLedger {
  const marker = loadOrigin(markerPath); //   throws (IO/parse) → leitura
  const ledger = loadLedger(ledgerPath); //   throws (IO/malformado) → leitura
  const lifecycle = loadLifecycle(lifecyclePath);
  const errs = [
    ...validateShape(marker),
    ...verifyProvenance(marker, ledger),
    ...lifecycleAbsenceError(marker, lifecycle !== null),
  ];
  if (lifecycle !== null) {
    // Só a verificação SEMÂNTICA (que itera `legacyEntryIds`) depois da forma validar (Codex r1 #117).
    const shapeErrs = validateLifecycleShape(lifecycle);
    errs.push(...shapeErrs);
    if (!shapeErrs.length) errs.push(...verifyLifecycle(lifecycle, ledger));
  }
  if (errs.length) throw new ScopedLedgerError(errs);
  return {
    scoped: inScope(marker, ledger),
    legacyIds: new Set(lifecycle?.legacyEntryIds ?? []),
    total: ledger.length,
    marker,
    lifecycle,
  };
}

/**
 * Valida a **FORMA** dos marcadores de origem/lifecycle SE presentes (sem procedência — não há ledger a
 * cruzar). Para o caminho de **ledger AUSENTE** dos geradores (Codex #175 r3): um marcador presente mas
 * malformado (ex.: `{"origin":"banana"}`) deve **falhar fechado**, não virar "template vazio" com exit 0.
 * Marcadores ausentes ou bem-formados → sem erro (template limpo legítimo). Lança `ScopedLedgerError` em
 * forma inválida; erro de parse (JSON quebrado) propaga cru (leitura). Complementa `loadScopedLedger`, que
 * cobre o caminho de ledger PRESENTE.
 */
export function assertMarkersWellFormed(originPath: string, lifecyclePath: string): void {
  const errs: string[] = [];
  if (existsSync(originPath)) errs.push(...validateShape(loadOrigin(originPath)));
  if (existsSync(lifecyclePath)) errs.push(...validateLifecycleShape(loadLifecycle(lifecyclePath)));
  if (errs.length) throw new ScopedLedgerError(errs);
}

/**
 * Lê o marcador de lifecycle da **base** (`origin/main`), distinguindo **AUSENTE** (arquivo não existe →
 * sentinela `"null"`/vazio que o smoke grava; o corte ainda não foi introduzido) de **PRESENTE-MAS-INVÁLIDO**
 * (não-parseável / forma inválida). Espelha `readBaseMarker` (#105): um base inválido **não** vira
 * `absent` (que abriria a introdução do corte), mas anomalia → o chamador falha fechado.
 */
export type BaseLifecycle =
  | { kind: "absent" }
  | { kind: "value"; value: LedgerLifecycle }
  | { kind: "invalid"; reason: string };
export function readBaseLifecycle(path: string): BaseLifecycle {
  // `absent` fica reservado ao arquivo **genuinamente ausente** (o smoke NÃO cria o temp da base quando o
  // `git show` falha). Um arquivo **presente mas vazio/`null`** é base rastreada corrompida → `invalid`
  // (fail-closed): senão a próxima PR pegaria o caminho livre de "introdução" e estabeleceria um corte
  // arbitrário, apesar do fail-closed documentado (Codex #119).
  if (!existsSync(path)) return { kind: "absent" };
  const raw = readFileSync(path, "utf-8").trim();
  if (raw === "" || raw === "null") {
    return { kind: "invalid", reason: "arquivo de base presente mas vazio/`null` (corrompido)" };
  }
  let parsed: LedgerLifecycle;
  try {
    parsed = JSON.parse(raw) as LedgerLifecycle;
  } catch (e) {
    return { kind: "invalid", reason: `não-parseável: ${(e as Error).message}` };
  }
  const shapeErrs = validateLifecycleShape(parsed);
  return shapeErrs.length
    ? { kind: "invalid", reason: shapeErrs.join("; ") }
    : { kind: "value", value: parsed };
}

/**
 * Lê o marcador de lifecycle do **head** (working tree do PR), distinguindo **REMOVED** (arquivo
 * genuinamente ausente = marcador deletado) de **INVALID** (anomalia → fail-closed). Rejeita:
 *  - **symlink** (o blob rastreado seria só o **caminho**; o guard seguiria o link e passaria, mas o
 *    `git show` da próxima base leria o blob-symlink → base "inválida" → CI travada — Codex #119);
 *  - arquivo **presente mas vazio/`null`** (corrompido, não "removido") — mesma distinção do base;
 *  - JSON não-parseável.
 * Usa `lstatSync` (não segue link; ENOENT = ausente).
 */
export type HeadLifecycle =
  | { kind: "removed" }
  | { kind: "value"; value: LedgerLifecycle }
  | { kind: "invalid"; reason: string };
export function readHeadLifecycle(path: string): HeadLifecycle {
  let st;
  try {
    st = lstatSync(path);
  } catch {
    return { kind: "removed" }; // arquivo genuinamente ausente = marcador deletado
  }
  if (st.isSymbolicLink()) {
    return {
      kind: "invalid",
      reason: "head é symlink (esperado arquivo regular; o blob rastreado seria só o caminho)",
    };
  }
  const raw = readFileSync(path, "utf-8").trim();
  if (raw === "" || raw === "null") {
    return {
      kind: "invalid",
      reason: "head presente mas vazio/`null` (corrompido, não 'removido')",
    };
  }
  try {
    return { kind: "value", value: JSON.parse(raw) as LedgerLifecycle };
  } catch (e) {
    return { kind: "invalid", reason: `head não-parseável: ${(e as Error).message}` };
  }
}

/**
 * Guard de IMUTABILIDADE do marcador de lifecycle (append-only do próprio corte do legado, #116 / ADR-0022
 * §d), análogo ao `diffOrigin`. Compara o marcador da base (`origin/main`) com o do head (PR) e permite:
 *  - **introdução** (base ausente → head presente e bem-formado) **vinculada ao ledger da base** (como o
 *    `diffOrigin` no bootstrap): o corte nasce cobrindo **todo** o ledger da base — `legacyEntryIds ==
 *    ids(baseLedger)` e `legacySha256 == fingerprint(baseLedger)` ("o regime começa agora, tudo existente é
 *    legado"). Sem isso, um PR poderia declarar um subconjunto arbitrário e **esconder** entradas sob-regime
 *    (Codex #119). `baseLedger` é **obrigatório** na introdução (fail-closed se ausente);
 *  - `note` livre; **e nada mais**: `regimeAdr`/`adoptedOn`/`legacySha256`/`legacyEntryIds` são **congelados**.
 * Proíbe: **remover** o marcador estabelecido (apaga o corte) e qualquer **mover/reclassificar/re-fingerprint**
 * do legado (encolher `legacyEntryIds` reclassificaria um legado como sob-regime → "aguardando flip"; crescer
 * ocultaria uma entrada sob-regime do get-bearings). Fecha o bypass do re-fingerprint auto-consistente que o
 * `--scoped` de head-state não pega. `head === null` = marcador removido no head.
 */
export function diffLifecycle(
  base: LedgerLifecycle | null,
  head: LedgerLifecycle | null,
  baseLedger?: LedgerItem[] | null,
): string[] {
  if (head === null) {
    return base === null
      ? []
      : ["marcador de lifecycle removido (base→head) — o corte do legado é imutável"];
  }
  const shapeErrs = validateLifecycleShape(head);
  if (shapeErrs.length) return shapeErrs;
  if (base === null) {
    // Introdução: vincula ao LEDGER DA BASE (não só à forma) — o corte tem de cobrir todo o ledger da base.
    if (!baseLedger) {
      return [
        "introdução do corte de lifecycle requer o ledger da base (origin/main) para vincular a fronteira",
      ];
    }
    const errs: string[] = [];
    // Metadado de auditoria é CONGELADO após a introdução → validar contra o ADR vigente ANTES de aceitar
    // (senão trava um `regimeAdr`/`adoptedOn` que contradiz o ADR-0022 — Codex #119).
    if (head.regimeAdr !== LIFECYCLE_REGIME_ADR) {
      errs.push(
        `'regimeAdr' da introdução deve ser ${LIFECYCLE_REGIME_ADR} (o ADR que rege o lifecycle), não '${head.regimeAdr}'`,
      );
    }
    if (head.adoptedOn !== LIFECYCLE_ADOPTED_ON) {
      errs.push(
        `'adoptedOn' da introdução deve ser ${LIFECYCLE_ADOPTED_ON} (data de adoção do ${LIFECYCLE_REGIME_ADR}), não '${head.adoptedOn}'`,
      );
    }
    if (
      !sameIds(
        head.legacyEntryIds,
        baseLedger.map((it) => it.id),
      )
    ) {
      errs.push(
        "'legacyEntryIds' da introdução deve casar a fronteira da base (orion: ids do ledger de origin/main; derivado local: vazio — todo local é sob-regime), sem subconjunto arbitrário",
      );
    }
    if (head.legacySha256 !== lifecycleFingerprint(baseLedger)) {
      errs.push("'legacySha256' da introdução deve ser o fingerprint da fronteira da base");
    }
    return errs;
  }
  const errs: string[] = [];
  if (head.regimeAdr !== base.regimeAdr) {
    errs.push(
      `'regimeAdr' imutável após estabelecido (base ${base.regimeAdr} → head ${head.regimeAdr})`,
    );
  }
  if (head.adoptedOn !== base.adoptedOn) {
    errs.push(
      `'adoptedOn' imutável após estabelecido (base ${base.adoptedOn} → head ${head.adoptedOn})`,
    );
  }
  if (head.legacySha256 !== base.legacySha256) {
    errs.push("'legacySha256' imutável (re-fingerprintar o legado é proibido)");
  }
  if (!sameIds(base.legacyEntryIds, head.legacyEntryIds)) {
    errs.push("'legacyEntryIds' imutável (mover/reclassificar o corte do legado é proibido)");
  }
  return errs;
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
  // Operação escopada canônica (reusada por status/pending): valida forma/procedência/lifecycle e aplica
  // `inScope`. Erro de VALIDAÇÃO (ScopedLedgerError) → exit 1 com o bullet-list de sempre; erro de LEITURA
  // (IO/parse) → exit 2. Mesma distinção de antes; a lógica agora vive num só lugar (`loadScopedLedger`).
  let scoped: LedgerItem[];
  let legacyIds: Set<string>;
  let ledgerTotal: number;
  try {
    ({
      scoped,
      legacyIds,
      total: ledgerTotal,
    } = loadScopedLedger(markerPath, ledgerPath, lifecyclePath));
  } catch (e) {
    if (e instanceof ScopedLedgerError) {
      console.error("LEDGER ORIGIN SCOPED: FAIL");
      for (const m of e.errors) console.error("  - " + m);
      return 1;
    }
    console.error(`falha ao ler marcador/ledger: ${(e as Error).message}`);
    return 2;
  }
  // Baseline de ENTREGA: ids já em `origin/main` distinguem entregue-aguardando-flip de pendente
  // (recém-projetada nesta branch). Resolve `origin/main` internamente (ou `--base` override); `--base`
  // inválido = erro; `origin/main` implícito indisponível → vazio conservador. Ver `resolveDeliveredIds`.
  const delivered = resolveDeliveredIds(basePath, ledgerPath);
  if ("error" in delivered) {
    console.error(delivered.error);
    return 2;
  }
  const deliveredIds = delivered.ids;
  const { legacy, awaitingFlip, pending, done } = classifyLifecycle(
    scoped,
    legacyIds,
    deliveredIds,
  );
  const inheritedOut = ledgerTotal - scoped.length;
  console.log(
    `LEDGER ORIGIN SCOPED: ${scoped.length} no escopo ` +
      `(${awaitingFlip.length} aguardando flip, ${pending.length} pendente(s), ${done.length} concluída(s), ` +
      `${legacy.length} legado${legacy.length && !showAll ? " oculto(s)" : ""})` +
      `${inheritedOut ? ` [+${inheritedOut} herdada(s) fora de escopo]` : ""}`,
  );
  const list = (its: LedgerItem[], mark: string) => {
    for (const it of its)
      console.log(`  [${mark}] ${it.id}  #${it.issue}  ${it.description.slice(0, 70)}`);
  };
  if (awaitingFlip.length) {
    console.log("  aguardando flip (entregue em main → flipar passes:true, ADR-0022 §c):");
    list(awaitingFlip, " ");
  }
  if (pending.length) {
    console.log(
      "  pendente (projetada nesta branch, ainda não em main → NÃO flipe: entregue primeiro):",
    );
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

/** Raiz do repo git (`git rev-parse --show-toplevel`); `null` fora de um repo git. */
function gitRoot(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Caminho de ÁRVORE do git para `ledgerPath` (relativo OU absoluto), medido contra a **RAIZ do repo** —
 * `git show <rev>:<path>` resolve `<path>` a partir da raiz. Medir contra a **cwd** (r6) quebrava quando
 * `--scoped` roda de um **subdiretório** com path absoluto (o alvo virava `../…` → `null`, baseline vazia,
 * entregues como pendentes — Codex r11 #117). `null` se o alvo estiver **fora** da raiz (`..`).
 */
export function gitTreePath(ledgerPath: string, root: string): string | null {
  const rel = relative(root, resolve(ledgerPath));
  if (rel === "" || rel.startsWith("..")) return null;
  return rel.split("\\").join("/"); // normaliza separador (Windows) p/ o formato de árvore do git
}

/** Ledger de `origin/main` via git (read-only, **sem shell** — execFileSync com args). `null` em qualquer
 * falha (offline / ref ausente / checkout raso / fora de repo git / path fora da raiz / conteúdo não-array). */
function gitBaseLedger(ledgerPath: string): LedgerItem[] | null {
  const root = gitRoot();
  if (root === null) return null;
  const tree = gitTreePath(ledgerPath, root);
  if (tree === null) return null;
  try {
    const raw = execFileSync("git", ["show", `origin/main:${tree}`], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      // O ledger é append-only e cresce; o default (~1 MiB) do execFileSync lançaria ENOBUFS ao passar
      // disso → baseline "indisponível" em silêncio → entregues como pendente (Codex r12 #117). 256 MiB
      // cobre um ledger JSON com folga (um ENOMEM real ainda cai no catch → conservador).
      maxBuffer: 256 * 1024 * 1024,
    });
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as LedgerItem[]) : null;
  } catch {
    return null;
  }
}

const idsOf = (items: LedgerItem[]): Set<string> =>
  new Set(items.filter((it) => it && typeof it.id === "string").map((it) => it.id));

/**
 * Ids da baseline de ENTREGA (`origin/main`), ou um `error`.
 * - `--base <path>` explícito → o operador **afirmou** que este arquivo é a baseline; ausente/ilegível/
 *   JSON inválido/não-array = **ERRO** (não o fallback conservador — senão entregues viram "pendente" em
 *   silêncio e a flip se perde, Codex r7 #117).
 * - Sem `--base` → resolve `origin/main` **internamente** via git (read-only, guard-compatível — Codex r4).
 *   Ref **indisponível** (offline/checkout raso/não-repo) → **vazio, conservador** (tudo `false` = pendente,
 *   nunca induz flip prematuro). Aqui a ausência é esperada, então **não** é erro.
 */
export function resolveDeliveredIds(
  basePath: string | undefined,
  ledgerPath: string,
): { ids: Set<string> } | { error: string } {
  if (basePath !== undefined) {
    if (!existsSync(basePath)) return { error: `--base: arquivo não encontrado: ${basePath}` };
    // Reusa `loadLedger`: valida array **e cada entry** (objeto com `id` string) e lança em JSON inválido —
    // senão um entry malformado (ex.: `[{"issue":1}]`) seria descartado em silêncio por `idsOf` e um
    // entregue viraria "pendente" (Codex r8 #117).
    try {
      return { ids: idsOf(loadLedger(basePath)) };
    } catch (e) {
      return { error: `--base: ${(e as Error).message}` };
    }
  }
  const base = gitBaseLedger(ledgerPath);
  return { ids: Array.isArray(base) ? idsOf(base) : new Set<string>() };
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
    console.log(
      `LEDGER ORIGIN: PASS (origem=orion — marco local do ledger = ADR-0006/#29; ${ledger.length} entrada(s))`,
    );
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
      console.error(
        `recusado: ${markerPath} existe mas não pôde ser parseado (${(e as Error).message}) — falha fechada.`,
      );
      return 1;
    }
    const shapeErrs = validateShape(existing);
    if (shapeErrs.length) {
      console.error(
        `recusado: ${markerPath} existe mas é inválido (${shapeErrs.join("; ")}) — falha fechada.`,
      );
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
  return shapeErrs.length
    ? { kind: "invalid", reason: shapeErrs.join("; ") }
    : { kind: "value", value: parsed };
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
    console.error(
      `  - marcador da base (origin/main) presente mas inválido: ${baseM.reason} (fail-closed)`,
    );
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

/**
 * Guard base×head do marcador de LIFECYCLE (#116). Lê o head (`readHeadLifecycle`: rejeita symlink/`null`
 * presente; ausente = removido) e a base (`readBaseLifecycle`, fail-closed em base inválida) e roda
 * `diffLifecycle`. Espelha `cmdGuard`.
 */
function cmdGuardLifecycle(
  baseLifecyclePath: string,
  headPath: string,
  baseLedgerPath?: string,
  originPath = ".orion/ledger-origin.json",
): number {
  const h = readHeadLifecycle(headPath);
  if (h.kind === "invalid") {
    console.error("LEDGER LIFECYCLE GUARD: FAIL");
    console.error(
      `  - marcador de lifecycle do head inválido (${headPath}): ${h.reason} (fail-closed)`,
    );
    return 1;
  }
  const head: LedgerLifecycle | null = h.kind === "removed" ? null : h.value;
  const baseL = readBaseLifecycle(baseLifecyclePath);
  if (baseL.kind === "invalid") {
    console.error("LEDGER LIFECYCLE GUARD: FAIL");
    console.error(
      `  - marcador de lifecycle da base (origin/main) presente mas inválido: ${baseL.reason} (fail-closed)`,
    );
    return 1;
  }
  const base = baseL.kind === "value" ? baseL.value : null;
  // `baseLedger` EFETIVO para vincular a INTRODUÇÃO (Codex #119), **origin-aware**:
  // - `orion` → todo o ledger da base (`origin/main`): "o regime começa agora, tudo existente é legado";
  // - `local` (derivado) → **VAZIO**: não há legado LOCAL (todo entry local é sob-regime; os herdados são
  //   excluídos pelo marcador de origem) — forçar `== base` reclassificaria locais como legado, escondendo
  //   os flips. Origem ilegível/ausente → trata como `orion` (bind ao base, conservador).
  let originIsLocal = false;
  try {
    const om = loadOrigin(originPath);
    // Validar a FORMA antes de confiar no `origin` p/ escolher a fronteira: um marcador presente mas
    // schema-inválido (ex.: `{"origin":"local"}` sem metadados de bootstrap) torna a fronteira de origem
    // não-confiável → fail-closed, não escolher o corte vazio às cegas (Codex #119).
    const shapeErrs = validateShape(om);
    if (shapeErrs.length) {
      console.error("LEDGER LIFECYCLE GUARD: FAIL");
      console.error(
        `  - marcador de origem inválido (${originPath}): ${shapeErrs.join("; ")} — não confiável p/ escolher a fronteira (fail-closed)`,
      );
      return 1;
    }
    originIsLocal = om.origin === "local";
  } catch {
    originIsLocal = false; // ausente/ilegível → trata como orion (vincula ao base ledger, conservador)
  }
  const baseLedger = originIsLocal ? [] : readMaybe<LedgerItem[]>(baseLedgerPath);
  const errors = diffLifecycle(base, head, baseLedger);
  if (errors.length) {
    console.error("LEDGER LIFECYCLE GUARD: FAIL");
    for (const e of errors) console.error("  - " + e);
    return 1;
  }
  console.log("LEDGER LIFECYCLE GUARD: PASS (corte do legado imutável: base → head)");
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
      console.error(
        "--base requer um caminho (o ledger de origin/main); ex.: --base /tmp/main-ledger.json",
      );
      return 2;
    }
    const basePath = bi >= 0 ? rest[bi + 1] : undefined;
    const pos = rest.filter(
      (a, i) => a !== "--all" && a !== "--base" && !(bi >= 0 && i === bi + 1),
    );
    const markerPath = pos[0] ?? ".orion/ledger-origin.json";
    // Default do lifecycle DERIVADO do diretório do marker (ambos vivem em `.orion/`) — senão o form de 2
    // args `--scoped <marker-custom> <ledger-custom>` carregaria o `.orion/ledger-lifecycle.json` DESTE
    // checkout, cujos 105 ids legado do Orion faltam no ledger custom → falha (Codex r10 #117).
    const lifecyclePath = pos[2] ?? join(dirname(markerPath), "ledger-lifecycle.json");
    return cmdScoped(markerPath, pos[1] ?? "feature-ledger.json", lifecyclePath, basePath, showAll);
  }
  if (cmd === "--guard") {
    if (!rest[0] || !rest[1]) {
      console.error("uso: ledger-origin.ts --guard <base-marker> <head-marker> [base-ledger]");
      return 2;
    }
    return cmdGuard(rest[0], rest[1], rest[2]);
  }
  if (cmd === "--guard-lifecycle") {
    if (!rest[0] || !rest[1]) {
      console.error(
        "uso: ledger-origin.ts --guard-lifecycle <base-lifecycle> <head-lifecycle> [base-ledger] [origin-marker]",
      );
      return 2;
    }
    return cmdGuardLifecycle(rest[0], rest[1], rest[2], rest[3] ?? ".orion/ledger-origin.json");
  }
  if (cmd === "--init") {
    const write = rest.includes("--write");
    const pos = rest.filter((a) => a !== "--write");
    return cmdInit(pos[0] ?? "feature-ledger.json", pos[1] ?? ".orion/ledger-origin.json", write);
  }
  console.error(
    "uso: ledger-origin.ts --check [marker] [ledger] | " +
      "--scoped [marker] [ledger] [lifecycle] [--base <ledger-de-main>] [--all] | " +
      "--guard <base> <head> | --guard-lifecycle <base-lifecycle> <head-lifecycle> [base-ledger] [origin-marker] | " +
      "--init [ledger] [marker] [--write]",
  );
  return 2;
}

// Só executa o CLI quando rodado diretamente (não quando importado por vitest).
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
