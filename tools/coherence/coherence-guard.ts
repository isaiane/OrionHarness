#!/usr/bin/env node
// coherence-guard.ts — Guard de COERÊNCIA MÍNIMO (T9.6 / O9; Issue #170; ADR-0025). A REDE anti-drift na
// ORIGEM, montada DEPOIS que a superfície autoral foi reduzida (T9.3–T9.5), não no lugar dela. Reusa o
// padrão visão-derivada + guard (ADR-0019 `l0-core-manifest.ts` / ADR-0023 `adr-index.ts`): funções
// PURAS exportadas p/ vitest, self-check que PROVA a mordida, exit ≠ 0 adequado a gate de CI.
//
// O guard consome o MANIFESTO (T9.2, `docs/examples/artifact-manifest.ts`) + a ÁRVORE real e reprova os
// QUATRO invariantes mínimos do ADR-0025 (tabela de fatias + critérios de conformidade, `0025:225,385`):
//   1. ESPELHO NÃO CLASSIFICADO (D1-B): um arquivo de prosa-viva (`COVERAGE_DOMAIN.scanDirs`) casa o
//      padrão de frase de uma regra transversal reduzível (`MIRROR_PATTERNS`) e NÃO tem par (file, rule)
//      no manifesto → reprova. É o único desenho que morde um espelho NOVO.
//   2. CLASSIFICAÇÃO PARA FONTE REMOVIDA: todo `file` do manifesto com `destiny ≠ remove` e
//      `role ≠ removed` DEVE existir na árvore — classificação órfã (o arquivo sumiu) → reprova. Cobre
//      "ponteiro para fonte removida" de forma ESTRUTURAL (sem heurística).
//   3. REFERÊNCIA NORMATIVA a PLAN/CHANGELOG COMO FONTE: prosa-viva que trata `PLAN.md`/`CHANGELOG.md`
//      (hoje stubs) como fonte (`NORMATIVE_SOURCE_PATTERNS`) → reprova. Sem exceção nos `scanDirs` (não
//      há residual legítimo ali; os pares `normativeSourceRef` vivem nos arquivos de domínio).
//   4. QUEBRA DE SCHEMA DA REPRESENTAÇÃO OFFLINE/HISTÓRIA: o CONTRATO dos geradores offline (plano →
//      `isValidIssue`; história → `isValidMergedPr`) deve permanecer ÍNTEGRO — aceitar a amostra válida
//      e REJEITAR (falha fechada) a malformada. Como os relatórios são scratch/gitignored (T9.4 opção b
//      do ADR-0025: sem `history.json` versionado), o "schema da representação offline" É o contrato do
//      gerador; o guard o exercita com fixtures, SEM rede. Reusa os predicados exportados (não reimplementa).
// Além disso roda o `validateManifest` (consistência interna do próprio manifesto — reuso, D2).
//
// LIMITAÇÃO (impressa na saída — D5): é HEURÍSTICA e REDE, não garantia (§8.1; coerente com o ADR-0024
// sobre o `state-budget-check`). Regex casa FORMA, não sentido — um espelho reescrito escapa; a
// varredura cobre só os `scanDirs`. Guard verde NÃO prova ausência de drift; a cobrança semântica
// continua sendo a REVISÃO HUMANA. NÃO enfraqueça checklist algum "porque o guard cobre" — ele não cobre.
//
// Roda em Node ≥ 22.6 via type stripping, SEM rede/token/API, sem toolchain:
//   node --experimental-strip-types tools/coherence/coherence-guard.ts          → self-check (prova mordida)
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import {
  COVERAGE_DOMAIN,
  MANIFEST,
  MIRROR_PATTERNS,
  NORMATIVE_SOURCE_PATTERNS,
  validateManifest,
  type ManifestEntry,
  type Rule,
} from "../../docs/examples/artifact-manifest.ts";
// CHECK 4 (schema): reusa os PREDICADOS DE SCHEMA já exportados pelos geradores offline — não se
// reimplementa contrato. Só os predicados puros são importados; o caminho de rede (`gh`) fica atrás do
// guard de `argv` de cada gerador e não é exercido aqui.
import { isValidIssue } from "../plan/plan-report.ts";
import { isValidMergedPr } from "../history/history-report.ts";

/** Um arquivo de prosa-viva varrido: caminho REPO-RELATIVO (casa o `file` do manifesto) + conteúdo. */
export interface ScanFile {
  path: string;
  content: string;
}

export interface CoherenceReport {
  ok: boolean;
  violations: string[];
  counts: { manifest: number; scanned: number };
}

/** A limitação, impressa na saída do guard (D5) — a mesma que vive no doc. */
export const LIMITATION =
  "LIMITAÇÃO: heurística/rede, não garantia (§8.1). Regex casa forma, não sentido; varre só os " +
  "scanDirs. Guard verde ≠ ausência de drift — a cobrança semântica é a revisão humana. Não " +
  "enfraqueça checklist 'porque o guard cobre': ele não cobre.";

/** Chave estável de um par (file, rule) para os Sets de classificação. O delimitador é `\0` (NUL) —
 *  nunca ocorre em caminho nem em nome de regra —, escrito como ESCAPE textual no fonte (não byte NUL
 *  literal, que faria o git tratar o `.ts` como binário e perder o diff por linha; achado Codex). */
const pairKey = (file: string, rule: Rule): string => `${file}\0${rule}`;

/**
 * CHECK 2 — CLASSIFICAÇÃO PARA FONTE REMOVIDA. Todo `file` do manifesto com `destiny ≠ remove` e
 * `role ≠ removed` deve existir na árvore. `removed`/`remove` são o registro DELIBERADO de algo que
 * saiu — não se cobra existência deles (senão o guard proibiria registrar uma remoção). Diretórios
 * (`file` terminando em `/`) contam como existentes se o dir existir. PURA: recebe o predicado de
 * existência (injeta-se um fake no teste; o CLI passa `existsSync` ancorado à raiz).
 */
export function checkClassifiedFilesExist(
  manifest: ManifestEntry[],
  exists: (file: string) => boolean,
): string[] {
  const violations: string[] = [];
  const seen = new Set<string>();
  for (const e of manifest) {
    if (e.role === "removed" || e.destiny === "remove") continue;
    if (seen.has(e.file)) continue; // um arquivo com N pares reporta uma vez só
    seen.add(e.file);
    if (!exists(e.file))
      violations.push(
        `fonte removida ainda classificada: '${e.file}' está no manifesto (destiny≠remove) mas não existe na árvore`,
      );
  }
  return violations;
}

/**
 * CHECK 1 — ESPELHO NÃO CLASSIFICADO (D1-B). Para cada arquivo varrido, para cada regra com padrão, se o
 * conteúdo casa um padrão da regra e o par (path, rule) NÃO está classificado como ATIVO no manifesto →
 * viola. Entradas `removed`/`remove` NÃO contam como classificação ativa (mesma semântica do check 2):
 * senão um registro de remoção antigo faria um path recriado com a frase-espelho passar batido (achado
 * Codex). PURA: recebe os arquivos já lidos, os padrões e o manifesto (sem I/O).
 */
export function checkUnclassifiedMirrors(
  scanFiles: ScanFile[],
  patterns: Partial<Record<Rule, RegExp[]>>,
  manifest: ManifestEntry[],
): string[] {
  const violations: string[] = [];
  const classified = new Set(
    manifest
      .filter((e) => e.role !== "removed" && e.destiny !== "remove")
      .map((e) => pairKey(e.file, e.rule)),
  );
  for (const f of scanFiles) {
    for (const rule of Object.keys(patterns) as Rule[]) {
      const rxs = patterns[rule] ?? [];
      const hit = rxs.find((rx) => rx.test(f.content));
      if (hit && !classified.has(pairKey(f.path, rule)))
        violations.push(
          `espelho não classificado: '${f.path}' reafirma a regra '${rule}' (casou ${hit}) mas não tem ` +
            `par (arquivo, regra) no manifesto — classifique-o (ou remova o espelho)`,
        );
    }
  }
  return violations;
}

/**
 * CHECK 3 — REFERÊNCIA NORMATIVA a PLAN/CHANGELOG COMO FONTE. Para cada arquivo varrido, se casa um
 * padrão AFIRMATIVO de fonte → viola. SEM whitelist: nos `scanDirs` NÃO há residual legítimo — `PLAN.md`/
 * `CHANGELOG.md` são stubs, então qualquer prosa-viva que os trate como fonte é drift. (Uma exceção por
 * `normativeSourceRef` seria ampla demais: exime o par INTEIRO, não a ocorrência sancionada — trocar a
 * instrução de um par marcado por "PLAN.md é a fonte" passaria batido, o falso-verde que este check
 * existe para pegar; achado Codex. Os pares `normativeSourceRef` vivem nos arquivos de DOMÍNIO, fora dos
 * scanDirs.) PURA.
 */
export function checkNormativeSourceRefs(
  scanFiles: ScanFile[],
  patterns: { rule: Rule; pattern: RegExp }[],
): string[] {
  const violations: string[] = [];
  for (const f of scanFiles) {
    for (const { rule, pattern } of patterns) {
      if (pattern.test(f.content))
        violations.push(
          `referência normativa a fonte estubada: '${f.path}' trata PLAN/CHANGELOG como fonte da regra ` +
            `'${rule}' (casou ${pattern}) — hoje são stubs; roteie para a fonte estruturada`,
        );
    }
  }
  return violations;
}

/**
 * CHECK 4 — QUEBRA DE SCHEMA DA REPRESENTAÇÃO OFFLINE/HISTÓRIA (ADR-0025 critério (d)). Exercita o
 * CONTRATO de schema de cada gerador offline com fixtures: o predicado tem de ACEITAR a amostra válida
 * (schema não regrediu para MAIS estrito) E REJEITAR a malformada (não deixou de falhar fechado — o que
 * geraria plano/história falsos). Qualquer um dos dois quebrado → viola. Como os relatórios são scratch/
 * gitignored (não há `history.json` versionado — T9.4 opção b), o schema da representação offline É este
 * contrato; o guard não inspeciona um arquivo, exercita o predicado. PURA/sem rede.
 */
export interface SchemaContract {
  name: string; //                     "plano (PlanIssue)" / "história (MergedPr)"
  isValid: (x: unknown) => boolean; //  o predicado de schema EXPORTADO pelo gerador
  valid: unknown; //                    amostra que DEVE passar
  invalid: unknown; //                  amostra que DEVE reprovar (fail-closed)
}

export function checkOfflineSchemaContract(contracts: SchemaContract[]): string[] {
  const violations: string[] = [];
  for (const c of contracts) {
    if (!c.isValid(c.valid))
      violations.push(
        `quebra de schema (${c.name}): amostra VÁLIDA rejeitada — o contrato do gerador offline ficou ` +
          `estrito demais (representação offline/história não mais aceita a forma canônica)`,
      );
    if (c.isValid(c.invalid))
      violations.push(
        `quebra de schema (${c.name}): amostra MALFORMADA aceita — o gerador deixou de falhar fechado ` +
          `(geraria plano/história falsos a partir de resposta não confiável)`,
      );
  }
  return violations;
}

/** Os contratos de schema reais — predicados dos geradores + fixtures canônica/malformada. */
export const SCHEMA_CONTRACTS: SchemaContract[] = [
  {
    name: "plano (PlanIssue)",
    isValid: isValidIssue,
    valid: { number: 1, title: "Tarefa", state: "open" },
    invalid: { number: 1, title: "Tarefa", state: "banana" }, // state fora de OPEN/CLOSED
  },
  {
    name: "história (MergedPr)",
    isValid: isValidMergedPr,
    valid: {
      number: 1,
      title: "PR",
      mergedAt: "2026-08-17T02:11:00Z",
      mergeCommit: { oid: "abc1234" },
    },
    invalid: { number: 1, title: "PR", mergedAt: "2026-13-99", mergeCommit: { oid: "abc1234" } }, // ISO inválido
  },
];

/** Agrega os quatro checks (validateManifest + 1/2/3/4). PURA: recebe a árvore já materializada. */
export function runCoherenceGuard(input: {
  manifest: ManifestEntry[];
  domainFiles: readonly string[];
  scanFiles: ScanFile[];
  mirrorPatterns: Partial<Record<Rule, RegExp[]>>;
  normativePatterns: { rule: Rule; pattern: RegExp }[];
  schemaContracts: SchemaContract[];
  exists: (file: string) => boolean;
}): CoherenceReport {
  const violations: string[] = [];
  // Camada 0 — consistência interna do próprio manifesto (reuso do T9.2, D2).
  violations.push(...validateManifest(input.manifest, input.domainFiles).violations);
  // Camadas 1–4 — a árvore/contratos contra o manifesto.
  violations.push(...checkClassifiedFilesExist(input.manifest, input.exists));
  violations.push(
    ...checkUnclassifiedMirrors(input.scanFiles, input.mirrorPatterns, input.manifest),
  );
  violations.push(...checkNormativeSourceRefs(input.scanFiles, input.normativePatterns));
  violations.push(...checkOfflineSchemaContract(input.schemaContracts));
  return {
    ok: violations.length === 0,
    violations,
    counts: { manifest: input.manifest.length, scanned: input.scanFiles.length },
  };
}

// ────────────────────────────────────────────────────────────────────────────────────────────────────
// I/O — coleta a prosa-viva dos `scanDirs` a partir do disco (o único ponto com efeito; as regras são puras).
// ────────────────────────────────────────────────────────────────────────────────────────────────────

const repoRootFromHere = (): string => fileURLToPath(new URL("../../", import.meta.url));

/**
 * Lê os `.md` dos `scanDirs` (relativos à raiz), retornando `ScanFile[]` com caminho REPO-RELATIVO.
 * RECURSA por subdiretório: um runbook em `docs/runbooks/team/new.md` está DENTRO do scanDir configurado
 * e não pode escapar da varredura em silêncio (achado Codex). Ignora `.gitkeep` e não-`.md`. Um `scanDir`
 * ausente é ignorado (não falha — o guard não exige que o dir exista, só varre o que houver).
 */
export function collectScanFiles(scanDirs: readonly string[], root: string): ScanFile[] {
  const out: ScanFile[] = [];
  const walk = (absDir: string, relDir: string): void => {
    for (const name of readdirSync(absDir).sort()) {
      const absEntry = join(absDir, name);
      const relEntry = `${relDir}/${name}`;
      const st = statSync(absEntry);
      if (st.isDirectory()) walk(absEntry, relEntry);
      else if (st.isFile() && name.endsWith(".md"))
        out.push({ path: relEntry, content: readFileSync(absEntry, "utf-8") });
    }
  };
  for (const dir of scanDirs) {
    const abs = join(root, dir);
    if (!existsSync(abs) || !statSync(abs).isDirectory()) continue;
    walk(abs, dir.replace(/\/$/, ""));
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────────────────────────────────────
// Self-check: (1) roda o guard contra a ÁRVORE REAL (deve passar — nasce verde); (2) PROVA que MORDE
// cada check (espelho não classificado, fonte removida, ref normativa). Exit ≠ 0 se o caso válido falhar
// OU alguma mordida não for pega — adequado a gate de CI. LÊ a saída (verde do runner ≠ output correto).
if (process.argv[1]?.endsWith("coherence-guard.ts")) {
  const root = repoRootFromHere();
  const scanFiles = collectScanFiles(COVERAGE_DOMAIN.scanDirs, root);
  const exists = (file: string) => existsSync(join(root, file));

  const real = runCoherenceGuard({
    manifest: MANIFEST,
    domainFiles: COVERAGE_DOMAIN.files,
    scanFiles,
    mirrorPatterns: MIRROR_PATTERNS,
    normativePatterns: NORMATIVE_SOURCE_PATTERNS,
    schemaContracts: SCHEMA_CONTRACTS,
    exists,
  });
  console.log(
    JSON.stringify({
      caso: "árvore REAL",
      ok: real.ok,
      ...real.counts,
      violations: real.violations,
    }),
  );

  // Mordida por REGRA (D5 + achado Codex): uma fixture não classificada POR regra de MIRROR_PATTERNS —
  // apagar/corromper qualquer array de regex deixa a sua regra sem morder e o self-check FALHA.
  const MIRROR_BITE: Record<Rule, string> = {
    "plano-L1": "Os Milestones são a fonte do épico.",
    "historia-L5": "A história são os PRs mergeados.",
    "roteamento-historia": "A história vai ao CHANGELOG antigo.",
    "roteamento-estado": "O STATE.md aponta o épico ativo.",
    "fast-lane": "Use a fast-lane issue-less.",
  } as Record<Rule, string>;
  const mirrorRules = Object.keys(MIRROR_PATTERNS) as Rule[];
  const biteMirrorByRule = mirrorRules.map((rule) => ({
    rule,
    bit: checkUnclassifiedMirrors(
      [{ path: "docs/runbooks/_bite.md", content: MIRROR_BITE[rule] }],
      MIRROR_PATTERNS,
      MANIFEST,
    ).some((v) => v.includes(`'${rule}'`)),
  }));
  const allMirrorBite = biteMirrorByRule.every((r) => r.bit);

  const biteRemoved = checkClassifiedFilesExist(
    [
      ...MANIFEST,
      {
        file: "docs/fonte-que-sumiu.md",
        rule: "plano-L1",
        role: "mirror",
        destiny: "keep",
        slice: "T9.3b",
        group: "plan-history",
        note: "sintético",
      },
    ],
    exists,
  );
  const biteNormative = checkNormativeSourceRefs(
    [
      {
        path: "docs/runbooks/_bite2.md",
        content: "Ao concluir, registre no `CHANGELOG.md` o que mudou.",
      },
    ],
    NORMATIVE_SOURCE_PATTERNS,
  );
  // Schema (check 4): um contrato com o predicado invertido tem de MORDER (valid rejeitado E invalid aceito).
  const biteSchema = checkOfflineSchemaContract([
    {
      name: "sintético",
      isValid: (x) => !isValidIssue(x),
      valid: SCHEMA_CONTRACTS[0]!.valid,
      invalid: SCHEMA_CONTRACTS[0]!.invalid,
    },
  ]);
  const morde =
    allMirrorBite && biteRemoved.length > 0 && biteNormative.length > 0 && biteSchema.length > 0;
  console.log(
    JSON.stringify({
      caso: "mutação (deve morder)",
      morde,
      biteMirrorByRule,
      biteRemoved,
      biteNormative,
      biteSchema,
    }),
  );

  console.log(LIMITATION);

  if (!real.ok || !morde) {
    console.error(
      "FALHA: guard vermelho na árvore real, ou uma mordida sintética não foi detectada (inclui mordida por regra).",
    );
    process.exit(1);
  }
}
