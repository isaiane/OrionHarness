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
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
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
  "LIMITAÇÃO: heurística/rede, não garantia (§8.1). Regex casa forma, não sentido; os checks 1/3 varrem " +
  "só a prosa-viva dos scanDirs — uma ref-fonte NOVA num arquivo de DOMÍNIO (AGENTS/README/…) é coberta " +
  "por classificação no manifesto + revisão humana, não por este check. Guard verde ≠ ausência de drift; " +
  "a cobrança semântica é a revisão humana. Não enfraqueça checklist 'porque o guard cobre': ele não cobre.";

/** Chave estável de um par (file, rule) para os Sets de classificação. O delimitador é `\0` (NUL) —
 *  nunca ocorre em caminho nem em nome de regra —, escrito como ESCAPE textual no fonte (não byte NUL
 *  literal, que faria o git tratar o `.ts` como binário e perder o diff por linha; achado Codex). */
const pairKey = (file: string, rule: Rule): string => `${file}\0${rule}`;

/** Tipo real de um caminho na árvore. `symlink` é distinto (via `lstat`, sem seguir o alvo); `missing` = não existe. */
export type PathKind = "file" | "dir" | "symlink" | "missing";

/**
 * CHECK 2 — CLASSIFICAÇÃO PARA FONTE REMOVIDA. Todo `file` do manifesto com `destiny ≠ remove` e
 * `role ≠ removed` deve existir na árvore COM O TIPO CERTO: entrada terminando em `/` é diretório, o
 * resto é arquivo REGULAR. Checar só existência era falso-verde: o git permite trocar `foo.md` por um
 * diretório `foo.md/` OU por um SYMLINK para outro arquivo (o arquivo nomeado sumiu, mas `existsSync`/
 * `statSync` seguiam true — achados Codex). Por isso o CLI usa `lstatSync` (NÃO segue o link): um symlink
 * onde se espera arquivo regular é `symlink` ≠ `file` → divergência. `removed`/`remove` são o registro
 * DELIBERADO de algo que saiu — não se cobra. PURA: recebe `pathKind` (fake no teste; o CLI usa `lstatSync`).
 */
export function checkClassifiedFilesExist(
  manifest: ManifestEntry[],
  pathKind: (file: string) => PathKind,
): string[] {
  const violations: string[] = [];
  const seen = new Set<string>();
  for (const e of manifest) {
    if (e.role === "removed" || e.destiny === "remove") continue;
    if (seen.has(e.file)) continue; // um arquivo com N pares reporta uma vez só
    seen.add(e.file);
    const wantsDir = e.file.endsWith("/");
    const kind = pathKind(e.file);
    if (kind === "missing")
      violations.push(
        `fonte removida ainda classificada: '${e.file}' está no manifesto (destiny≠remove) mas não existe na árvore`,
      );
    else if (wantsDir && kind !== "dir")
      violations.push(
        `tipo divergente: '${e.file}' é classificado como diretório mas na árvore é ${kind}`,
      );
    else if (!wantsDir && kind !== "file")
      violations.push(
        `tipo divergente: '${e.file}' é classificado como arquivo mas na árvore é ${kind} (o arquivo nomeado sumiu)`,
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
 * padrão AFIRMATIVO de fonte → viola. NÃO recebe o manifesto e NÃO consulta `normativeSourceRef`: nos
 * `scanDirs` NÃO há residual legítimo — `PLAN.md`/`CHANGELOG.md` são stubs, então qualquer prosa-viva que
 * os trate como fonte é drift. (Uma exceção por `normativeSourceRef` seria ampla demais: eximiria o par
 * INTEIRO, não a ocorrência sancionada — trocar a instrução de um par marcado por "PLAN.md é a fonte"
 * passaria batido, o falso-verde que este check existe para pegar; achado Codex F1. O flag é marcador
 * INTERNO do manifesto, sem efeito neste gate — ver a doc de NORMATIVE_SOURCE_PATTERNS.) PURA.
 *
 * ESCOPO (limitação deliberada, G6/Codex): varre só os `scanDirs` (prosa-viva). Uma ref-fonte afirmativa
 * NOVA num arquivo de DOMÍNIO já classificado (AGENTS.md/README/CONTRIBUTING/checklists) NÃO é pega aqui —
 * esses arquivos discutem PLAN/CHANGELOG por natureza (stub, supersedência), e varrê-los com regex teria
 * alto falso-positivo. A cobertura do domínio é por CLASSIFICAÇÃO (cada arquivo tem entrada) + revisão
 * humana; expandir o check 3 para eles é fatia própria (exigiria exceções curadas). Registrado na LIMITAÇÃO.
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
 *
 * GRANULARIDADE (limite deliberado, G9/Codex): há uma fixture por CAMPO obrigatório (o suficiente para
 * pegar "o gerador parou de exigir o campo X"). NÃO se cobre cada SUB-constraint de campos compostos
 * (cada faixa/ramo de `isValidIsoInstant`; hex vs. limite 7–64 do OID): isso re-implementaria a suite
 * vitest do PRÓPRIO gerador (`history-report.test.ts` já cobre ISO fora de faixa, OID não-hex/curto), que
 * roda no mesmo CI e é a dona canônica dessa correção. Este check é o smoke de CONTRATO a nível de campo.
 */
export interface SchemaContract {
  name: string; //                     "plano (PlanIssue)" / "história (MergedPr)"
  isValid: (x: unknown) => boolean; //  o predicado de schema EXPORTADO pelo gerador
  valid: unknown; //                    amostra que DEVE passar
  // Uma amostra malformada POR constraint obrigatória — cada uma quebra EXATAMENTE UM campo (os demais
  // válidos). Um único inválido (que quebra vários campos de uma vez) MASCARA a regressão de um campo
  // específico: se o predicado parar de exigir `number`, um inválido que também erra `state` continua
  // sendo rejeitado e o guard fica verde (achado Codex). Uma fixture por campo detecta cada regressão.
  invalids: { constraint: string; sample: unknown }[];
}

export function checkOfflineSchemaContract(contracts: SchemaContract[]): string[] {
  const violations: string[] = [];
  for (const c of contracts) {
    if (!c.isValid(c.valid))
      violations.push(
        `quebra de schema (${c.name}): amostra VÁLIDA rejeitada — o contrato do gerador offline ficou ` +
          `estrito demais (representação offline/história não mais aceita a forma canônica)`,
      );
    for (const { constraint, sample } of c.invalids)
      if (c.isValid(sample))
        violations.push(
          `quebra de schema (${c.name}/${constraint}): amostra que viola só '${constraint}' foi ACEITA — ` +
            `o predicado deixou de exigir esse campo (geraria plano/história falsos)`,
        );
  }
  return violations;
}

/**
 * Os contratos de schema reais — predicados dos geradores + a amostra canônica + uma malformada POR
 * campo obrigatório (cada uma quebra só aquele campo; os outros permanecem válidos).
 */
export const SCHEMA_CONTRACTS: SchemaContract[] = [
  {
    name: "plano (PlanIssue)",
    isValid: isValidIssue,
    valid: { number: 1, title: "Tarefa", state: "open" },
    invalids: [
      { constraint: "number", sample: { number: "1", title: "Tarefa", state: "open" } }, // tipo errado
      { constraint: "title", sample: { number: 1, title: 123, state: "open" } }, // tipo errado
      { constraint: "state", sample: { number: 1, title: "Tarefa", state: "banana" } }, // fora de OPEN/CLOSED
    ],
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
    invalids: [
      {
        constraint: "number",
        sample: {
          number: "1",
          title: "PR",
          mergedAt: "2026-08-17T02:11:00Z",
          mergeCommit: { oid: "abc1234" },
        },
      },
      {
        constraint: "title",
        sample: {
          number: 1,
          title: 123,
          mergedAt: "2026-08-17T02:11:00Z",
          mergeCommit: { oid: "abc1234" },
        },
      },
      {
        constraint: "mergedAt",
        sample: { number: 1, title: "PR", mergedAt: "2026-13-99", mergeCommit: { oid: "abc1234" } },
      }, // ISO inválido
      {
        constraint: "mergeCommit.oid",
        sample: {
          number: 1,
          title: "PR",
          mergedAt: "2026-08-17T02:11:00Z",
          mergeCommit: { oid: "nothex!" },
        },
      }, // não-hex
      {
        // `state` é OPCIONAL, mas se presente tem de ser MERGED (PR aberto/fechado-sem-merge não é
        // história); sem esta fixture, remover essa checagem passaria batido (achado Codex).
        constraint: "state",
        sample: {
          number: 1,
          title: "PR",
          mergedAt: "2026-08-17T02:11:00Z",
          mergeCommit: { oid: "abc1234" },
          state: "OPEN",
        },
      },
    ],
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
  pathKind: (file: string) => PathKind;
}): CoherenceReport {
  const violations: string[] = [];
  // Camada 0 — consistência interna do próprio manifesto (reuso do T9.2, D2).
  violations.push(...validateManifest(input.manifest, input.domainFiles).violations);
  // Camadas 1–4 — a árvore/contratos contra o manifesto.
  violations.push(...checkClassifiedFilesExist(input.manifest, input.pathKind));
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
  // `lstatSync` (NÃO segue symlink) em TODA a travessia: um symlink-dir sob o scanDir seria seguido por
  // `statSync` para FORA do repo (resultados dependendo de arquivos externos) e um ciclo mataria o smoke
  // com ELOOP (achado Codex). Symlinks (arquivo ou dir) são PULADOS — a varredura fica dentro da árvore.
  const walk = (absDir: string, relDir: string): void => {
    for (const name of readdirSync(absDir).sort()) {
      const absEntry = join(absDir, name);
      const relEntry = `${relDir}/${name}`;
      const st = lstatSync(absEntry);
      if (st.isSymbolicLink()) continue; // não segue link (escape/ciclo)
      if (st.isDirectory()) walk(absEntry, relEntry);
      else if (st.isFile() && name.endsWith(".md"))
        out.push({ path: relEntry, content: readFileSync(absEntry, "utf-8") });
    }
  };
  for (const dir of scanDirs) {
    const abs = join(root, dir);
    if (!existsSync(abs) || !lstatSync(abs).isDirectory()) continue; // scanDir raiz: symlink não conta
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
  const pathKind = (file: string): PathKind => {
    try {
      const st = lstatSync(join(root, file)); // lstat: NÃO segue symlink (G15)
      return st.isSymbolicLink()
        ? "symlink"
        : st.isDirectory()
          ? "dir"
          : st.isFile()
            ? "file"
            : "missing";
    } catch {
      return "missing";
    }
  };

  const real = runCoherenceGuard({
    manifest: MANIFEST,
    domainFiles: COVERAGE_DOMAIN.files,
    scanFiles,
    mirrorPatterns: MIRROR_PATTERNS,
    normativePatterns: NORMATIVE_SOURCE_PATTERNS,
    schemaContracts: SCHEMA_CONTRACTS,
    pathKind,
  });
  console.log(
    JSON.stringify({
      caso: "árvore REAL",
      ok: real.ok,
      ...real.counts,
      violations: real.violations,
    }),
  );

  // Mordida por REGRA (D5 + achado Codex): uma fixture não classificada POR regra. A lista de regras vem
  // do conjunto FIXO `MIRROR_BITE` (não de `Object.keys(MIRROR_PATTERNS)`): senão apagar uma propriedade
  // de MIRROR_PATTERNS a tiraria de `mirrorRules` e o `every` passaria vazio (achado Codex). `rulesMatch`
  // ainda cruza os dois conjuntos, então apagar OU adicionar um padrão sem fixture reprova.
  const MIRROR_BITE: Record<Rule, string> = {
    "plano-L1": "Os Milestones são a fonte do épico.",
    "historia-L5": "A história são os PRs mergeados.",
    "roteamento-historia": "A história vai ao CHANGELOG antigo.",
    "roteamento-estado": "O STATE.md aponta o épico ativo.",
    "fast-lane": "Use a fast-lane issue-less.",
  } as Record<Rule, string>;
  const mirrorRules = Object.keys(MIRROR_BITE) as Rule[];
  const patternKeys = new Set(Object.keys(MIRROR_PATTERNS));
  const rulesMatch =
    patternKeys.size === mirrorRules.length && mirrorRules.every((r) => patternKeys.has(r));
  const biteMirrorByRule = mirrorRules.map((rule) => ({
    rule,
    bit: checkUnclassifiedMirrors(
      [{ path: "docs/runbooks/_bite.md", content: MIRROR_BITE[rule] }],
      MIRROR_PATTERNS,
      MANIFEST,
    ).some((v) => v.includes(`'${rule}'`)),
  }));
  const allMirrorBite = biteMirrorByRule.every((r) => r.bit);

  // Check 2: um path AUSENTE e um path de TIPO divergente (arquivo classificado que virou diretório —
  // `docs/` existe como dir, classificado sem `/` → deve morder; achado Codex) precisam MORDER.
  const biteRemoved = checkClassifiedFilesExist(
    [
      {
        file: "docs/fonte-que-sumiu.md",
        rule: "plano-L1",
        role: "mirror",
        destiny: "keep",
        slice: "T9.3b",
        group: "plan-history",
        note: "ausente",
      },
      {
        file: "docs",
        rule: "plano-L1",
        role: "mirror",
        destiny: "keep",
        slice: "T9.3b",
        group: "plan-history",
        note: "tipo divergente (dir onde se espera arquivo)",
      },
    ],
    pathKind,
  );
  const biteMissing = biteRemoved.some((v) => v.includes("não existe na árvore"));
  const biteType = biteRemoved.some((v) => v.includes("tipo divergente"));

  // Ref normativa (check 3): uma fixture POR regra normativa (plano-L1/historia-L5). Só a de CHANGELOG
  // não bastava — apagar os padrões de PLAN deixava a de CHANGELOG mordendo e o self-check verde, sem
  // proteção para o roteamento de PLAN (achado Codex). `normRulesMatch` cruza os dois conjuntos.
  const NORMATIVE_BITE: Partial<Record<Rule, string>> = {
    "plano-L1": "O PLAN.md é a fonte do plano.",
    "historia-L5": "Ao concluir, registre no `CHANGELOG.md` o que mudou.",
  };
  const normativeRules = Object.keys(NORMATIVE_BITE) as Rule[];
  const patternNormRules = new Set(NORMATIVE_SOURCE_PATTERNS.map((p) => p.rule));
  const normRulesMatch =
    patternNormRules.size === normativeRules.length &&
    normativeRules.every((r) => patternNormRules.has(r));
  const biteNormativeByRule = normativeRules.map((rule) => ({
    rule,
    bit: checkNormativeSourceRefs(
      [{ path: "docs/runbooks/_bite2.md", content: NORMATIVE_BITE[rule]! }],
      NORMATIVE_SOURCE_PATTERNS,
    ).some((v) => v.includes(`'${rule}'`)),
  }));
  const allNormativeBite = biteNormativeByRule.every((r) => r.bit);
  // Schema (check 4): o predicado invertido tem de MORDER nas DUAS direções — valid rejeitado E CADA
  // amostra por-constraint aceita. Checar só `length>0` mascararia a perda do laço de inválidos (o
  // valid-rejeitado sozinho já daria length>0; achado Codex).
  const biteSchema = checkOfflineSchemaContract([
    {
      name: "sintético",
      isValid: (x) => !isValidIssue(x),
      valid: SCHEMA_CONTRACTS[0]!.valid,
      invalids: SCHEMA_CONTRACTS[0]!.invalids,
    },
  ]);
  const biteSchemaValidRej = biteSchema.some((m) => m.includes("VÁLIDA rejeitada"));
  const biteSchemaInvalidAcc = SCHEMA_CONTRACTS[0]!.invalids.every((inv) =>
    biteSchema.some((m) => m.includes(`/${inv.constraint})`) && m.includes("ACEITA")),
  );
  const schemaBites = biteSchemaValidRej && biteSchemaInvalidAcc;

  const morde =
    allMirrorBite &&
    rulesMatch &&
    biteMissing &&
    biteType &&
    allNormativeBite &&
    normRulesMatch &&
    schemaBites;
  console.log(
    JSON.stringify({
      caso: "mutação (deve morder)",
      morde,
      rulesMatch,
      biteMirrorByRule,
      biteMissing,
      biteType,
      normRulesMatch,
      biteNormativeByRule,
      schemaBites: { validRej: biteSchemaValidRej, invalidAcc: biteSchemaInvalidAcc },
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
