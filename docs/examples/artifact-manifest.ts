// artifact-manifest.ts — MANIFESTO DE CLASSIFICAÇÃO DOS ARTEFATOS (T9.2 / O9; ADR-0025, fatia T9.2).
//
// PROPÓSITO. Antes de o épico O9 remover/estubar qualquer espelho autoral, este manifesto CATALOGA —
// de forma verificável — o papel, o destino e a fatia executora de cada par (artefato, regra). É o
// INSUMO do guard de coerência (T9.6): "espelho não classificado" reprova. Esta fatia NÃO remove, não
// estuba, não edita nada — só cataloga (classe T1 / G1). O guard (T9.6) e as remoções (T9.3–T9.5) são
// fatias próprias; aqui não se liga guard nem se muta artefato.
//
// UNIDADE = PAR (artefato, regra) — não por arquivo (D3, já fixado na tabela de fatias do ADR-0025).
// Um mesmo arquivo pode ser `source` de UMA regra e `mirror` de OUTRA: p.ex. o `PLAN.md` é `source` do
// plano (plano-L1) E `mirror` do roteamento (roteamento-historia/estado, no seu rodapé). Cada par
// recebe EXATAMENTE UM papel.
//
// PAPÉIS ⊥ CAMADAS L0–L5 (§4). Os papéis abaixo (`source`/`mirror`/…) são ORTOGONAIS às camadas da §4:
// um arquivo L0 pode ser `source` de uma regra e `mirror` de outra; um `mirror` pode ter destino
// `keep` (runbook operacional). NÃO leia "source" como uma segunda taxonomia de camadas concorrendo
// com a §4.
//
// PAPÉIS ⊥ DESTINO. `mirror` NÃO implica remoção. Distinção que rege o `group`/`slice` de todo espelho:
//   • ESPELHO OPERACIONAL — conteúdo executável/contrato ÚNICO que o §11.2/§4 NÃO carregam: checks de
//     review (os dois reviewer-checklists), itens que o autor executa (templates PR/Issue), o contrato
//     Data-First do sinal `lane` (`observability.md`), operação (runbooks). É PRESERVADO → `group: na`,
//     `slice: null` (ADR-0025 item 5; ponteiro não reconstrói a instrução). (ADRs não são espelho:
//     entram só como `source` de decisão — ver COVERAGE_DOMAIN.)
//   • ESPELHO EXPLICATIVO — prosa redundante que só reafirma a regra (README, getting-started,
//     foundations, MEMORY, STATE self-doc). É REDUZÍVEL → `group: governance-authoritative`/`plan-history`
//     com a fatia T9.5/T9.3b/T9.4b que o converte em ponteiro (preservando qualquer trecho operacional).
// O `destiny` é a decisão sobre o ARTEFATO naquela regra; a fatia (`slice`) diz QUANDO/ONDE.
//
// GATILHO DE MANUTENÇÃO (D2 — o que mantém o manifesto vivo). Owner: o autor da fatia que muda um
// papel/destino. Momento: NO MESMO PR da fatia. Regra: **cada fatia seguinte (T9.3b/T9.4b/T9.5a/T9.5b)
// atualiza a SUA PRÓPRIA entrada aqui, no mesmo PR** que estuba/reduz o artefato — o PR que estuba o
// `PLAN.md` muda o papel dele NESTE manifesto no mesmo PR. Sem isso, o manifesto nasce correto e
// congela na T9.4 (foi o que aconteceu com o `feature-ledger.json`, #29→#31). É critério de aceite,
// não intenção.
//
// COBERTURA (D4 — o que fazer com o que não está na lista). `COVERAGE_DOMAIN.files` é a allowlist de
// artefatos que DEVEM ter ≥1 entrada (checado em `validateManifest`). `COVERAGE_DOMAIN.scanDirs` são
// diretórios de prosa VIVA (hoje `docs/runbooks/`) onde o guard (T9.6) varre por espelhos NÃO
// classificados das regras rastreadas — sem exigir uma entrada por arquivo. ADRs ficam FORA dos
// scanDirs (ver COVERAGE_DOMAIN). Código/testes e a
// evidência executável fora desta lista ficam FORA do domínio. Os artefatos que a #127 (T8.1b) vai
// criar NÃO entram aqui como fantasmas: coerente com o gatilho D2, **a #127 classifica os seus no
// próprio PR** (o guard só cobra classificação de arquivos que existem e estão no domínio).
//
// RE-DERIVAÇÃO. As entradas foram re-derivadas por varredura da árvore real (grep por arquivo × regra),
// NÃO copiadas de tabelas/números de linha de artefatos em `.orion/tmp/` (que somem e cujos números de
// linha quebram na T9.4). Por isso as notas citam SEÇÕES estáveis (§4, §11.2), nunca linhas.
//
// Roda em Node ≥ 22.6 via type stripping, sem toolchain (LEIA a saída — verde do gerador ≠ output
// correto). O `--experimental-strip-types` entrou no Node 22.6.0; 22.0–22.5 satisfazem ">=22" mas NÃO
// rodam o self-check direto (o `scripts/smoke-test.sh` documenta o mesmo limite):
//   node --experimental-strip-types docs/examples/artifact-manifest.ts

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Baldes do ADR-0025 (item da tabela T9.2) — EXAUSTIVOS: todo par recebe exatamente um. */
export type Role =
  | "source" //      fonte canônica/autoral de uma regra (constituição, ADR fundador, predicado rodável)
  | "pointer" //     aponta para a fonte canônica em vez de reafirmá-la
  | "mirror" //      reafirma a regra por extenso (cópia manual sujeita a drift)
  | "history" //     registro histórico point-in-time (append-only)
  | "projection" //  projeção derivada de verificação (ledger)
  | "generated" //   artefato gerado por ferramenta (índice)
  | "temporary" //   scratch/efêmero
  | "deprecated" //  marcado para aposentadoria, ainda presente
  | "removed"; //    já removido (registro de que existiu)

/** Destino do ARTEFATO naquela regra. */
export type Destiny = "keep" | "stub" | "remove";

/**
 * Grupo de PRONTIDÃO (quando o par pode mudar) — o critério de aceite que separa os dois conjuntos:
 *  - `governance-authoritative`: espelho de regra cuja fonte JÁ é autoritativa (roteamento §4/estado;
 *    fast-lane §11.2) — pode virar ponteiro JÁ, nas fatias T9.5;
 *  - `plan-history`: espelho/fonte de plano ou história — só muda DEPOIS que a fonte assenta (T9.3/T9.4);
 *  - `na`: permanece (invariante canônico que fica, ADR/append-only, projeção/gerado) — não é reduzido.
 */
export type Group = "governance-authoritative" | "plan-history" | "na";

/** Fatia do O9 (ADR-0025 §9) que executa o destino/redução do par; `null` = permanece sem fatia. */
export type Slice = "T9.3a" | "T9.3b" | "T9.4a" | "T9.4b" | "T9.5a" | "T9.5b" | "T9.6" | "T9.7" | null;

export interface ManifestEntry {
  file: string; //               caminho repo-relativo (SEM números de linha)
  rule: Rule; //                 a regra/conceito do par
  role: Role; //                 exatamente um balde
  destiny: Destiny;
  slice: Slice; //               quem executa o destino/redução
  group: Group;
  normativeSourceRef?: boolean; // true = referência normativa a PLAN.md/CHANGELOG.md COMO FONTE
  note: string; //               justificativa/achado curto (seções estáveis, não linhas)
}

/**
 * Regras/conceitos transversais rastreados pelo O9. `roteamento-historia` (a cláusula "história→
 * CHANGELOG") é distinta de `roteamento-estado` (STATE=ponteiro / status→Issue) porque MIGRAM EM FATIAS
 * DIFERENTES (T9.4b vs. T9.5a) — é o poder do papel-por-par: uma mesma linha-espelho pode ser dos dois.
 */
export type Rule =
  | "plano-L1" //           PLAN.md / docs/plans como mapa de épicos / fonte de plano (ADR-0025 item 1)
  | "historia-L5" //        CHANGELOG.md como fonte autoral de história (ADR-0025 item 3)
  | "roteamento-historia" // cláusula de roteamento "história → CHANGELOG" (ADR-0024 → superseded 0025)
  | "roteamento-estado" //  invariante STATE=ponteiro; status→Issue/ledger (ADR-0024, permanece)
  | "fast-lane" //          exceção fast-lane T1 (§11.2 / ADR-0017)
  | "ledger-projecao" //    ledger como projeção de verificação (ADR-0006/0014/0016/0022)
  | "adr-index" //          índice de ADRs gerado (ADR-0023)
  | "constituicao" //       ponteiro para a constituição (L0)
  | "manifesto"; //         este próprio manifesto

export const RULES: Rule[] = [
  "plano-L1", "historia-L5", "roteamento-historia", "roteamento-estado",
  "fast-lane", "ledger-projecao", "adr-index", "constituicao", "manifesto",
];

/**
 * Domínio de cobertura (D4). `files`: allowlist que DEVE ter ≥1 entrada (checado). `scanDirs`: onde o
 * guard T9.6 varre por espelho não-classificado, sem exigir entrada por arquivo. Fora daqui (código,
 * testes, tooling exceto o guard que consome este manifesto) está FORA do domínio.
 *
 * ADRs NÃO são varridos como espelhos. `docs/decisions/` NÃO é `scanDir`: ADRs são decisões
 * **append-only**, não prosa viva que reintroduz drift (o alvo do guard T9.6). Entram no manifesto
 * apenas quando são a **FONTE-DECISÃO canônica** de uma regra rastreada (0001/0006/0017/0023/0024/0025);
 * menções de uma regra dentro de um ADR (ex.: a fast-lane citada em 0018/0022/0024) NÃO geram par — a
 * decisão referencia a regra, não a espelha. O que o guard varre é a prosa VIVA: docs de processo,
 * templates, checklists e runbooks (`docs/runbooks/`), onde o espelho pode divergir da fonte.
 */
export const COVERAGE_DOMAIN = {
  files: [
    "PLAN.md", "docs/plans/", "CHANGELOG.md", "MEMORY.md", "STATE.md",
    "AGENTS.md", "AGENTS.core.md", "CLAUDE.md", "CONTRIBUTING.md",
    "README.md", "docs/README.md", "docs/getting-started.md", "docs/observability.md",
    "docs/architecture/foundations.md",
    "docs/agent-reviewer-checklist.md", "docs/harness-reviewer-checklist.md",
    "docs/product/spec.md", "docs/product/discovery-guide.md",
    ".github/PULL_REQUEST_TEMPLATE.md", ".github/ISSUE_TEMPLATE/sdd-task.yml",
    "feature-ledger.json", "docs/decisions/README.md",
    "docs/examples/fast-lane-eligibility.ts", "docs/examples/artifact-manifest.ts",
  ],
  scanDirs: ["docs/runbooks/"],
} as const;

/**
 * MANIFESTO — a classificação curada. Re-derivada por varredura da árvore real (grep arquivo × regra).
 * Ordenada por regra. Cada linha é UM par (file, rule) com exatamente um papel.
 */
export const MANIFEST: ManifestEntry[] = [
  // ─── plano-L1 — PLAN.md/docs/plans como mapa de épicos / fonte de plano (ADR-0025 item 1) ───────────
  { file: "PLAN.md", rule: "plano-L1", role: "source", destiny: "stub", slice: "T9.3b", group: "plan-history", normativeSourceRef: true,
    note: "Mapa autoral de épicos (L1). Vira stub-ponteiro na T9.3b; enquanto o §4 o nomear como stub, permanece (remoção = fatia futura própria)." },
  { file: "docs/plans/", rule: "plano-L1", role: "source", destiny: "stub", slice: "T9.3b", group: "plan-history", normativeSourceRef: true,
    note: "Diretório de detalhamento por épico (L1; hoje vazio). Resolvido/estubado junto do PLAN.md na T9.3b." },
  { file: "AGENTS.md", rule: "plano-L1", role: "source", destiny: "keep", slice: "T9.3b", group: "plan-history", normativeSourceRef: true,
    note: "§4 tabela L1 + fase Plan (§2) nomeiam PLAN.md como fonte; a linha L1 do §4 é reescrita p/ Milestones+Issues+Project na T9.3b (redação do ADR-0025)." },
  { file: "MEMORY.md", rule: "plano-L1", role: "mirror", destiny: "keep", slice: "T9.3b", group: "plan-history", normativeSourceRef: true,
    note: "Índice L1 aponta PLAN.md/docs/plans como mapa; repontar p/ Milestones/Project na T9.3b." },
  { file: "README.md", rule: "plano-L1", role: "mirror", destiny: "keep", slice: "T9.3b", group: "plan-history", normativeSourceRef: true,
    note: "Diagrama do ciclo e árvore de arquivos citam PLAN.md como mapa de épicos." },
  { file: "docs/README.md", rule: "plano-L1", role: "pointer", destiny: "keep", slice: "T9.3b", group: "plan-history", normativeSourceRef: true,
    note: "Link de navegação 'mapa de épicos' → PLAN.md." },
  { file: "docs/getting-started.md", rule: "plano-L1", role: "mirror", destiny: "keep", slice: "T9.3b", group: "plan-history", normativeSourceRef: true,
    note: "Setup checklist + get-bearings (passo 3) leem PLAN.md como fonte de plano; ciclo Plan escreve no PLAN.md. T9.3b tira do read-path." },
  { file: "CONTRIBUTING.md", rule: "plano-L1", role: "mirror", destiny: "keep", slice: "T9.3b", group: "plan-history", normativeSourceRef: true,
    note: "Fluxo Plan: 'o trabalho entra em PLAN.md como épico/tarefas'." },
  { file: "docs/harness-reviewer-checklist.md", rule: "plano-L1", role: "mirror", destiny: "keep", slice: "T9.3b", group: "plan-history", normativeSourceRef: true,
    note: "Harness Review trata PLAN.md/docs/plans como estado substantivo (compara fase/épico/detalhe entre artefatos). Quando o PLAN vira stub (T9.3b), o read-path precisa repontar — senão o check compara contra um stub." },
  { file: "docs/runbooks/github-projects.md", rule: "plano-L1", role: "mirror", destiny: "keep", slice: "T9.3b", group: "plan-history", normativeSourceRef: true,
    note: "Runbook: 'Milestones representam os épicos do PLAN.md; o PLAN.md lista as Issues por épico' — repontar na T9.3b (Milestone = mapa)." },
  { file: "docs/product/spec.md", rule: "plano-L1", role: "pointer", destiny: "keep", slice: "T9.3b", group: "plan-history",
    note: "Footer link p/ PLAN.md como mapa de épicos." },
  { file: "docs/product/discovery-guide.md", rule: "plano-L1", role: "pointer", destiny: "keep", slice: "T9.3b", group: "plan-history", normativeSourceRef: true,
    note: "Instrução ativa pós-G0: 'prossiga para a fase Plan e registre os épicos em PLAN.md' — não é citação histórica; repontar p/ Milestones/Project na T9.3b." },
  { file: "STATE.md", rule: "plano-L1", role: "pointer", destiny: "keep", slice: "T9.3b", group: "plan-history", normativeSourceRef: true,
    note: "Cabeçalho + Ponteiros dirigem o agente a PLAN.md como mapa de épicos / escopo (instrução ativa); repontar na T9.3b." },
  { file: "docs/decisions/0001-fundacoes-do-orion-harness.md", rule: "plano-L1", role: "source", destiny: "keep", slice: null, group: "na",
    note: "Declarou 'PLAN.md = mapa de épicos' (item 6); JÁ recebeu nota de supersedência parcial (ADR-0025 → Milestone). ADR append-only — não se edita a decisão histórica." },
  // (R7-2) Removido o par (0006, plano-L1): 0006 apenas MENCIONA PLAN.md como contexto histórico —
  // menção em ADR não gera par (coerência com a postura "ADR só como fonte-decisão"). 0006 decide o
  // ledger e já está corretamente sob `ledger-projecao`.
  { file: "docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md", rule: "plano-L1", role: "source", destiny: "keep", slice: null, group: "na",
    note: "DECISÃO que define o modelo-alvo do plano (item 1: Milestones/Issues/Project; PLAN.md→stub). É a fonte-decisão desta fatia; append-only (recebe supersedência por novo ADR, nunca ponteiro). SEM normativeSourceRef (não é instrução viva de usar PLAN como fonte)." },

  // ─── historia-L5 — CHANGELOG.md como fonte autoral de história (ADR-0025 item 3) ────────────────────
  { file: "CHANGELOG.md", rule: "historia-L5", role: "source", destiny: "stub", slice: "T9.4b", group: "plan-history", normativeSourceRef: true,
    note: "Histórico autoral (L5). Vira stub apontando p/ PRs mergeados na T9.4b; texto existente CONGELADO (append-only, point-in-time) — sem backfill nem reescrita de prosa passada." },
  { file: "AGENTS.md", rule: "historia-L5", role: "source", destiny: "keep", slice: "T9.4b", group: "plan-history", normativeSourceRef: true,
    note: "§4 tabela L5 nomeia CHANGELOG como fonte; reescrita p/ 'PRs mergeados' na T9.4b (redação do ADR-0025)." },
  { file: "MEMORY.md", rule: "historia-L5", role: "mirror", destiny: "keep", slice: "T9.4b", group: "plan-history", normativeSourceRef: true,
    note: "Índice L5 aponta CHANGELOG como histórico." },
  { file: "README.md", rule: "historia-L5", role: "mirror", destiny: "keep", slice: "T9.4b", group: "plan-history", normativeSourceRef: true,
    note: "Árvore de arquivos rotula CHANGELOG como 'Histórico de mudanças'." },
  { file: "docs/getting-started.md", rule: "historia-L5", role: "mirror", destiny: "keep", slice: "T9.4b", group: "plan-history", normativeSourceRef: true,
    note: "Setup ('limpe o CHANGELOG') + get-bearings ('a história vive no CHANGELOG, fora do read-path')." },
  { file: "docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md", rule: "historia-L5", role: "source", destiny: "keep", slice: null, group: "na",
    note: "DECISÃO que define o modelo-alvo da história (item 3: PRs mergeados; CHANGELOG→stub). Fonte-decisão; append-only. SEM normativeSourceRef (é decisão, não instrução viva de usar CHANGELOG como fonte)." },
  // NOTA (verificado no review Codex): `.github/workflows/release.yml` usa softprops/action-gh-release
  // com `generate_release_notes: true` e SEM `body`/`body_path` — gera notas do GitHub, NÃO lê o
  // CHANGELOG. Não é consumidor de história-como-fonte; fora do domínio. (O comentário-cabeçalho do
  // workflow que diz "a partir do CHANGELOG" está DESATUALIZADO — follow-up trivial, fora do O9.)

  // ─── roteamento-historia — cláusula "história → CHANGELOG" (migra na T9.4b, atômico com o stub) ──────
  { file: "AGENTS.md", rule: "roteamento-historia", role: "source", destiny: "keep", slice: "T9.4b", group: "plan-history", normativeSourceRef: true,
    note: "§4 bala História + fase Ship (§2) + DoD (§12) roteiam história→CHANGELOG; migram p/ histórico estruturado na T9.4b (linha L5 + roteamento, redação do ADR-0025)." },
  { file: "docs/decisions/0024-estado-enxuto-roteamento-historia-status.md", rule: "roteamento-historia", role: "source", destiny: "keep", slice: null, group: "na",
    note: "Decisão HISTÓRICA da rota história→CHANGELOG, já superseded PARCIALMENTE pelo ADR-0025 (nota de cabeçalho). SEM normativeSourceRef: append-only, nenhuma fatia a edita para 'limpar o marcador' — o guard não deve cobrá-la; a correção viva mora nos espelhos e no §4." },
  { file: "docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md", rule: "roteamento-historia", role: "source", destiny: "keep", slice: null, group: "na",
    note: "DECISÃO que supersede parcialmente o 0024 (história→estruturado). Fonte-decisão; append-only. SEM normativeSourceRef (decisão canônica, não instrução viva a corrigir; a correção vive no §4/espelhos)." },
  { file: "CONTRIBUTING.md", rule: "roteamento-historia", role: "mirror", destiny: "keep", slice: "T9.4b", group: "plan-history", normativeSourceRef: true,
    note: "Fluxo Ship: 'roteie — história→CHANGELOG'." },
  { file: "docs/harness-reviewer-checklist.md", rule: "roteamento-historia", role: "mirror", destiny: "keep", slice: "T9.4b", group: "plan-history", normativeSourceRef: true,
    note: "Harness Review cobra narrativa datada → CHANGELOG." },
  { file: "docs/agent-reviewer-checklist.md", rule: "roteamento-historia", role: "mirror", destiny: "keep", slice: "T9.4b", group: "plan-history", normativeSourceRef: true,
    note: "Product Review cobra narrativa por-PR → CHANGELOG." },
  { file: "docs/getting-started.md", rule: "roteamento-historia", role: "mirror", destiny: "keep", slice: "T9.4b", group: "plan-history", normativeSourceRef: true,
    note: "Ciclo de evolução (Ship) resume: história→CHANGELOG." },
  { file: "STATE.md", rule: "roteamento-historia", role: "mirror", destiny: "keep", slice: "T9.4b", group: "plan-history", normativeSourceRef: true,
    note: "Cabeçalho documenta o limite citando CHANGELOG como destino de história. C5 do ADR-0025: DONO do cabeçalho do STATE = T9.4b (viaja com o roteamento no mesmo PR)." },
  { file: "MEMORY.md", rule: "roteamento-historia", role: "mirror", destiny: "keep", slice: "T9.4b", group: "plan-history", normativeSourceRef: true,
    note: "Índice instrui fechamento por camada: história→CHANGELOG." },
  { file: "README.md", rule: "roteamento-historia", role: "mirror", destiny: "keep", slice: "T9.4b", group: "plan-history", normativeSourceRef: true,
    note: "Diagrama do ciclo pós-merge: 'CHANGELOG história'." },
  { file: ".github/PULL_REQUEST_TEMPLATE.md", rule: "roteamento-historia", role: "mirror", destiny: "keep", slice: "T9.4b", group: "plan-history", normativeSourceRef: true,
    note: "Checklist do autor: estado roteado — história→CHANGELOG." },
  { file: ".github/ISSUE_TEMPLATE/sdd-task.yml", rule: "roteamento-historia", role: "mirror", destiny: "keep", slice: "T9.4b", group: "plan-history", normativeSourceRef: true,
    note: "Label do DoD da Issue: história→CHANGELOG." },
  { file: "PLAN.md", rule: "roteamento-historia", role: "mirror", destiny: "stub", slice: "T9.3b", group: "plan-history", normativeSourceRef: true,
    note: "Rodapé do PLAN reafirma 'a história vai ao CHANGELOG.md' (Regra de compactação §4). Some quando o PLAN vira stub (T9.3b) — não sobra ponteiro para CHANGELOG num arquivo já estubado." },

  // ─── roteamento-estado — invariante STATE=ponteiro / status→Issue (permanece; espelhos que citam PLAN → T9.4b, resto → T9.5a) ─────
  { file: "AGENTS.md", rule: "roteamento-estado", role: "source", destiny: "keep", slice: "T9.4b", group: "plan-history", normativeSourceRef: true,
    note: "§4 Regra de compactação — fonte canônica. O INVARIANTE STATE=ponteiro / status→Issue/ledger PERMANECE; a única edição é remover a menção residual a 'PLAN' da expressão 'status→Issue/ledger/PLAN', que sai na T9.4b junto da outra expressão de roteamento (ADR-0025: as DUAS expressões do parágrafo migram na T9.4b). Ownership da edição = T9.4b; o arquivo permanece como fonte." },
  { file: "docs/decisions/0024-estado-enxuto-roteamento-historia-status.md", rule: "roteamento-estado", role: "source", destiny: "keep", slice: null, group: "na",
    note: "Invariante + tabela de decisão história-vs-status; append-only, permanece." },
  { file: "STATE.md", rule: "roteamento-estado", role: "mirror", destiny: "keep", slice: "T9.4b", group: "plan-history", normativeSourceRef: true,
    note: "Cabeçalho reafirma STATE=ponteiro E roteia 'status → projetado no ledger / refletido no PLAN.md'. A menção a PLAN sai na T9.4b (C5 do ADR-0025: dono do cabeçalho do STATE = T9.4b, viaja com o roteamento); o invariante STATE=ponteiro permanece." },
  { file: "CONTRIBUTING.md", rule: "roteamento-estado", role: "mirror", destiny: "keep", slice: "T9.4b", group: "plan-history", normativeSourceRef: true,
    note: "Ship: 'atualize apenas o ponteiro no STATE.md' + roteia 'status/critérios→Issue SDD, projetado no ledger e refletido no PLAN.md (L1)'. A menção a PLAN sai na T9.4b (PLAN sai da rota, viaja com o roteamento); o item permanece operacional, não vira ponteiro." },
  { file: "docs/harness-reviewer-checklist.md", rule: "roteamento-estado", role: "mirror", destiny: "keep", slice: "T9.4b", group: "plan-history", normativeSourceRef: true,
    note: "CHECK DE REVIEW EXECUTÁVEL — o check em si é PRESERVADO (ADR-0025 item 5, não vira ponteiro). MAS a menção 'refletido no PLAN.md' fica obsoleta quando o PLAN vira stub: a T9.4b atualiza esse ALVO (tira PLAN da rota) junto da migração de roteamento; o check permanece operacional." },
  { file: "docs/agent-reviewer-checklist.md", rule: "roteamento-estado", role: "mirror", destiny: "keep", slice: "T9.4b", group: "plan-history", normativeSourceRef: true,
    note: "Idem Product Review: check PRESERVADO, mas a menção 'refletido no PLAN.md' é atualizada na T9.4b (PLAN sai da rota). Não vira ponteiro." },
  { file: "docs/getting-started.md", rule: "roteamento-estado", role: "mirror", destiny: "keep", slice: "T9.4b", group: "plan-history", normativeSourceRef: true,
    note: "Get-bearings define STATE como ponteiro (não log) e roteia 'status→Issue/ledger/PLAN.md'. A menção a PLAN sai na T9.4b (PLAN sai da rota, viaja com o roteamento); a definição do ponteiro permanece." },
  { file: "MEMORY.md", rule: "roteamento-estado", role: "mirror", destiny: "keep", slice: "T9.4b", group: "plan-history", normativeSourceRef: true,
    note: "Índice: STATE só o ponteiro (sem narrativa) e roteia 'status→Issue/ledger/PLAN.md'. A menção a PLAN sai na T9.4b (PLAN sai da rota, viaja com o roteamento); o ponteiro permanece." },
  { file: "README.md", rule: "roteamento-estado", role: "mirror", destiny: "keep", slice: "T9.5a", group: "governance-authoritative",
    note: "Diagrama pós-merge: 'STATE ponteiro · Issue/ledger status'." },
  { file: ".github/PULL_REQUEST_TEMPLATE.md", rule: "roteamento-estado", role: "mirror", destiny: "keep", slice: "T9.4b", group: "plan-history", normativeSourceRef: true,
    note: "Item que o autor EXECUTA (STATE só ponteiro; status→Issue) — PRESERVADO. A menção 'projeção→ledger/PLAN.md' é atualizada na T9.4b (PLAN sai da rota); o item permanece operacional, não vira ponteiro." },
  { file: ".github/ISSUE_TEMPLATE/sdd-task.yml", rule: "roteamento-estado", role: "mirror", destiny: "keep", slice: "T9.4b", group: "plan-history", normativeSourceRef: true,
    note: "Label do DoD executável — PRESERVADO. A menção 'status→Issue/ledger/PLAN' perde o PLAN na T9.4b; o label permanece operacional." },
  { file: "docs/runbooks/github-projects.md", rule: "roteamento-estado", role: "mirror", destiny: "keep", slice: null, group: "na",
    note: "Runbook L4 vivo: 'STATE.md aponta para o épico e as Issues ativas' — instrução operacional PRESERVADA (ADR-0025 item 5); ponteiro não substitui a operação." },
  { file: "PLAN.md", rule: "roteamento-estado", role: "mirror", destiny: "stub", slice: "T9.3b", group: "plan-history", normativeSourceRef: true,
    note: "Rodapé do PLAN reafirma 'status por-item projetado no ledger e refletido no PLAN.md; STATE só o ponteiro'. Some quando o PLAN vira stub (T9.3b) — a reafirmação do roteamento no PLAN é resolvida junto do stub, não na T9.5a." },

  // ─── fast-lane — exceção T1 (§11.2 / ADR-0017); fonte JÁ autoritativa; espelhos → T9.5b ─────────────
  { file: "AGENTS.md", rule: "fast-lane", role: "source", destiny: "keep", slice: null, group: "na",
    note: "§11.2 é a fonte canônica (com ADR-0017); §1/§6/§12 ecoam internamente. O9 não toca a fonte; T9.5b reduz espelhos EXTERNOS. Ecoes constitucionais internos ficam a critério da T9.5b." },
  { file: "docs/decisions/0017-fast-lane-baixo-risco.md", rule: "fast-lane", role: "source", destiny: "keep", slice: null, group: "na",
    note: "Decisão fundadora da fast-lane; append-only." },
  { file: "docs/examples/fast-lane-eligibility.ts", rule: "fast-lane", role: "source", destiny: "keep", slice: null, group: "na",
    note: "Predicado rodável fast|full|blocked; evidência executável da regra (o §11.2 aponta p/ ele). Não é prosa-espelho." },
  { file: "AGENTS.core.md", rule: "fast-lane", role: "mirror", destiny: "keep", slice: null, group: "na",
    note: "Núcleo L0 = VISÃO derivada sancionada (ADR-0019), guardada por l0-core-manifest; espelho legítimo — NÃO alvo de redução." },
  { file: "README.md", rule: "fast-lane", role: "mirror", destiny: "keep", slice: "T9.5b", group: "governance-authoritative",
    note: "Diagrama (rota tracejada) + explicação pública da via rápida." },
  { file: "CONTRIBUTING.md", rule: "fast-lane", role: "mirror", destiny: "keep", slice: "T9.5b", group: "governance-authoritative",
    note: "Fluxo do contribuidor para fast-lane: branch fast/<slug>, commits sem #, PR issue-less." },
  { file: ".github/PULL_REQUEST_TEMPLATE.md", rule: "fast-lane", role: "mirror", destiny: "keep", slice: null, group: "na",
    note: "Instruções do PR leve + 'Lane: fast' + critério issue-less = texto operacional inevitável em template (ADR-0025 item 5). PRESERVADO; NÃO reduzido na T9.5b." },
  { file: ".github/ISSUE_TEMPLATE/sdd-task.yml", rule: "fast-lane", role: "mirror", destiny: "keep", slice: null, group: "na",
    note: "Label do DoD sobre status/ledger na fast-lane = texto operacional em template (ADR-0025 item 5). PRESERVADO; NÃO reduzido na T9.5b." },
  { file: "docs/harness-reviewer-checklist.md", rule: "fast-lane", role: "mirror", destiny: "keep", slice: null, group: "na",
    note: "Substituição issue-less + checagem de elegibilidade = INSTRUÇÃO DE REVIEW EXECUTÁVEL; conteúdo operacional PRESERVADO em checklist (ADR-0025 item 5), como o runbook — ponteiro não reconstrói o procedimento. NÃO reduzido na T9.5b." },
  { file: "docs/agent-reviewer-checklist.md", rule: "fast-lane", role: "mirror", destiny: "keep", slice: null, group: "na",
    note: "Variante issue-less do Product Review = instrução operacional de review; PRESERVADA em checklist (ADR-0025 item 5). NÃO reduzida na T9.5b." },
  { file: "docs/observability.md", rule: "fast-lane", role: "mirror", destiny: "keep", slice: null, group: "na",
    note: "CONTRATO Data-First ÚNICO do sinal (classe, lane): adoção, cycle time, rollback/rework, auditoria de escapes T2+ — NÃO existe no §11.2 (que só define elegibilidade/rota). Conteúdo operacional PRESERVADO (ADR-0025 item 5); reduzir a ponteiro tornaria as métricas não-reconstruíveis. NÃO reduzido na T9.5b." },
  { file: "docs/architecture/foundations.md", rule: "fast-lane", role: "mirror", destiny: "keep", slice: "T9.5b", group: "governance-authoritative",
    note: "Fundações de auditoria (branch→commit→PR→merge) e modelo de confiança citam a exceção issue-less." },
  { file: "docs/getting-started.md", rule: "fast-lane", role: "mirror", destiny: "keep", slice: "T9.5b", group: "governance-authoritative",
    note: "Ritual e ciclo citam exceção WIP/G1 e linkam ADR-0017/predicado." },
  { file: "docs/runbooks/github-projects.md", rule: "fast-lane", role: "mirror", destiny: "keep", slice: null, group: "na",
    note: "Runbook L4: correlação branch→PR na fast-lane é CONTEÚDO OPERACIONAL — preservado (ADR-0025 item 5), ponteiro não substitui operação." },
  // NOTA: ADRs NÃO são catalogados como "espelho" de fast-lane/roteamento (0018/0022/0024 mencionam a
  // exceção). Decisões são append-only, não prosa viva que reintroduz drift — o alvo do guard T9.6.
  // Entram apenas como FONTE-DECISÃO canônica de uma regra (0001/0006/0017/0023/0024/0025); menções em
  // ADR não geram par. Por isso `docs/decisions/` saiu dos scanDirs (ver COVERAGE_DOMAIN).

  // ─── projeções / gerados / ponteiros que permanecem (na) ────────────────────────────────────────────
  { file: "feature-ledger.json", rule: "ledger-projecao", role: "projection", destiny: "keep", slice: null, group: "na",
    note: "Projeção de VERIFICAÇÃO (passes/critérios; ADR-0006/0014/0016/0022). NÃO vira histórico (ADR-0025 item 4); sobrecarregá-lo com 'o que mudou' exige novo ADR (G2)." },
  { file: "docs/decisions/0006-ledger-executavel-de-tarefas.md", rule: "ledger-projecao", role: "source", destiny: "keep", slice: null, group: "na",
    note: "Decisão que define o ledger como projeção de verificação. Fonte-decisão; append-only — âncora do invariante 'ledger ≠ status/história autoral'." },
  { file: "AGENTS.md", rule: "ledger-projecao", role: "mirror", destiny: "keep", slice: null, group: "na",
    note: "§4 reafirma 'ledger = projeção de verificação (imutável, não autoral)'; invariante decidido em 0006. Permanece (O9 não toca o ledger)." },
  { file: "CONTRIBUTING.md", rule: "ledger-projecao", role: "mirror", destiny: "keep", slice: null, group: "na",
    note: "Ship: 'status/critérios→Issue, projeção→ledger'. Reafirma o invariante; permanece." },
  { file: "docs/getting-started.md", rule: "ledger-projecao", role: "mirror", destiny: "keep", slice: null, group: "na",
    note: "Get-bearings: 'ledger é a projeção de verificação (imutável, pode atrasar vs. a Issue)'. Permanece." },
  { file: "docs/harness-reviewer-checklist.md", rule: "ledger-projecao", role: "mirror", destiny: "keep", slice: null, group: "na",
    note: "Check executável: ledger é projeção (append-only), não status autoral — operacional, PRESERVADO (ADR-0025 item 5)." },
  { file: "docs/agent-reviewer-checklist.md", rule: "ledger-projecao", role: "mirror", destiny: "keep", slice: null, group: "na",
    note: "Idem Product Review: check do invariante do ledger — operacional, PRESERVADO." },
  { file: "STATE.md", rule: "ledger-projecao", role: "mirror", destiny: "keep", slice: null, group: "na",
    note: "Cabeçalho reafirma 'status por-item → Issue SDD (fonte), projetado no ledger'. Invariante vivo; permanece (O9 não toca o ledger)." },
  { file: ".github/PULL_REQUEST_TEMPLATE.md", rule: "ledger-projecao", role: "mirror", destiny: "keep", slice: null, group: "na",
    note: "Item que o autor EXECUTA: 'Issue type:task projetada no feature-ledger.json (delta aditivo, ledger-guard verde)' + as exceções (fora do ADR-0016 / fast-lane issue-less / follow-up rastreado). Check operacional de projeção — PRESERVADO (ADR-0025 item 5); o ledger é projeção de verificação, não tocado no O9." },
  { file: "docs/decisions/README.md", rule: "adr-index", role: "generated", destiny: "keep", slice: null, group: "na",
    note: "Índice de ADRs GERADO (ADR-0023); regenerado por `tools/adr/adr-index.ts --write`, com guard próprio no smoke-test (`--check`). Não autoral — fora do drift do O9." },
  { file: "docs/decisions/0023-indice-gerado-de-adrs.md", rule: "adr-index", role: "source", destiny: "keep", slice: null, group: "na",
    note: "Decisão que define o índice gerado (visão-derivada+guard). Fonte-decisão; append-only." },
  { file: "docs/README.md", rule: "adr-index", role: "pointer", destiny: "keep", slice: null, group: "na",
    note: "Navegação da pasta docs/ — aponta para o índice gerado (docs/decisions/README.md)." },
  { file: "CONTRIBUTING.md", rule: "adr-index", role: "pointer", destiny: "keep", slice: null, group: "na",
    note: "Instrui consultar o índice gerado (`grep` no docs/decisions/README.md, não varrer a pasta)." },
  { file: "docs/getting-started.md", rule: "adr-index", role: "pointer", destiny: "keep", slice: null, group: "na",
    note: "Ritual: 'para achar o ADR de um tema, `grep` no docs/decisions/README.md'." },
  { file: "MEMORY.md", rule: "adr-index", role: "pointer", destiny: "keep", slice: null, group: "na",
    note: "Índice L3 aponta para o índice de ADRs gerado (docs/decisions/README.md)." },
  { file: "STATE.md", rule: "adr-index", role: "pointer", destiny: "keep", slice: null, group: "na",
    note: "Ponteiros do STATE mandam `grep` no índice gerado (docs/decisions/README.md) por tema." },
  { file: "AGENTS.md", rule: "constituicao", role: "source", destiny: "keep", slice: null, group: "na",
    note: "A constituição canônica (L0). Fonte; vence em qualquer divergência." },
  { file: "AGENTS.core.md", rule: "constituicao", role: "mirror", destiny: "keep", slice: null, group: "na",
    note: "Núcleo L0 sempre-carregado = VISÃO derivada sancionada do AGENTS.md (ADR-0019), guardada por l0-core-manifest; espelho legítimo, não reduzível." },
  { file: "README.md", rule: "constituicao", role: "pointer", destiny: "keep", slice: null, group: "na",
    note: "Manda o agente iniciante ler o AGENTS.core.md e abrir o §X do AGENTS.md; navegação para a fonte." },
  { file: "CLAUDE.md", rule: "constituicao", role: "pointer", destiny: "keep", slice: null, group: "na",
    note: "Ponteiro L0 para AGENTS.md/AGENTS.core.md. Não reafirma regras transversais por extenso." },
  { file: "MEMORY.md", rule: "constituicao", role: "pointer", destiny: "keep", slice: null, group: "na",
    note: "Índice L0 lista a constituição (AGENTS.md/core) como guardrails; navegação, não reafirmação." },
  { file: "docs/getting-started.md", rule: "constituicao", role: "pointer", destiny: "keep", slice: null, group: "na",
    note: "Ritual manda ler o AGENTS.core.md e abrir o §X do AGENTS.md sob demanda; navegação para a fonte." },
  { file: "CONTRIBUTING.md", rule: "constituicao", role: "pointer", destiny: "keep", slice: null, group: "na",
    note: "Abre declarando que 'operacionaliza a constituição AGENTS.md; em conflito, AGENTS.md prevalece'. Ponteiro para a fonte L0, não reafirma regras por extenso; permanece." },
  { file: "docs/README.md", rule: "constituicao", role: "pointer", destiny: "keep", slice: null, group: "na",
    note: "Índice da doc identifica a constituição ('A constituição é ../AGENTS.md'); navegação para a fonte L0, não reafirmação; permanece." },
  { file: "STATE.md", rule: "constituicao", role: "pointer", destiny: "keep", slice: null, group: "na",
    note: "Rodapé de navegação aponta 'AGENTS.md §4 · AGENTS.core.md (núcleo L0)'; ponteiro para a constituição, não reafirmação; permanece." },
  { file: "docs/examples/artifact-manifest.ts", rule: "manifesto", role: "source", destiny: "keep", slice: null, group: "na",
    note: "Este manifesto — insumo do guard de coerência (T9.6). Auto-descreve; cada fatia atualiza a sua entrada no mesmo PR (gatilho D2)." },
];

// ────────────────────────────────────────────────────────────────────────────────────────────────────
// Validação (parse/consistência DO MANIFESTO — NÃO é o guard de coerência da T9.6, que varre a árvore).
// ────────────────────────────────────────────────────────────────────────────────────────────────────

const ROLES = new Set<Role>([
  "source", "pointer", "mirror", "history", "projection", "generated", "temporary", "deprecated", "removed",
]);
const DESTINIES = new Set<Destiny>(["keep", "stub", "remove"]);
const GROUPS = new Set<Group>(["governance-authoritative", "plan-history", "na"]);
const SLICES = new Set<Slice>(["T9.3a", "T9.3b", "T9.4a", "T9.4b", "T9.5a", "T9.5b", "T9.6", "T9.7", null]);
const PLAN_HISTORY_SLICES = new Set<Slice>(["T9.3a", "T9.3b", "T9.4a", "T9.4b"]);
const GOV_SLICES = new Set<Slice>(["T9.5a", "T9.5b"]);
// Fatias de ADIÇÃO PURA (ADR-0025 §9): só constroem substituto, nunca estubam/removem.
const ADDITION_ONLY_SLICES = new Set<Slice>(["T9.3a", "T9.4a"]);
const NORMSRC_RULES = new Set<Rule>(["plano-L1", "historia-L5", "roteamento-historia", "roteamento-estado"]);

export interface ManifestReport {
  ok: boolean;
  entries: number;
  byRole: Record<string, number>;
  byGroup: Record<string, number>;
  bySlice: Record<string, number>;
  normativeSourceRefs: number;
  violations: string[];
}

/**
 * Valida a consistência interna do manifesto:
 *  - papel/destino/grupo/fatia dentro dos enums (baldes EXAUSTIVOS);
 *  - EXATAMENTE UM papel por par (unicidade de (file, rule));
 *  - coerência grupo↔fatia (plan-history⇒T9.3b/T9.4*, governance-authoritative⇒T9.5*, na⇒sem fatia);
 *  - destino stub/remove exige fatia executora;
 *  - normativeSourceRef só em regras de PLAN/CHANGELOG-como-fonte;
 *  - nenhum campo cita `.orion/tmp/` (re-derivação — o manifesto não depende de scratch);
 *  - COBERTURA: todo arquivo de `COVERAGE_DOMAIN.files` tem ≥1 entrada.
 */
export function validateManifest(manifest: ManifestEntry[], domainFiles: readonly string[]): ManifestReport {
  const violations: string[] = [];
  const seenPair = new Map<string, number>();
  const byRole: Record<string, number> = {};
  const byGroup: Record<string, number> = {};
  const bySlice: Record<string, number> = {};
  let normativeSourceRefs = 0;

  for (const e of manifest) {
    const pair = `${e.file} × ${e.rule}`;
    seenPair.set(pair, (seenPair.get(pair) ?? 0) + 1);
    byRole[e.role] = (byRole[e.role] ?? 0) + 1;
    byGroup[e.group] = (byGroup[e.group] ?? 0) + 1;
    bySlice[String(e.slice)] = (bySlice[String(e.slice)] ?? 0) + 1;
    if (e.normativeSourceRef) normativeSourceRefs++;

    if (!ROLES.has(e.role)) violations.push(`${pair}: papel '${e.role}' fora dos baldes do ADR-0025`);
    if (!DESTINIES.has(e.destiny)) violations.push(`${pair}: destino '${e.destiny}' inválido`);
    if (!GROUPS.has(e.group)) violations.push(`${pair}: grupo '${e.group}' inválido`);
    if (!SLICES.has(e.slice)) violations.push(`${pair}: fatia '${e.slice}' inválida`);

    // Coerência grupo ↔ fatia.
    if (e.group === "plan-history" && !PLAN_HISTORY_SLICES.has(e.slice))
      violations.push(`${pair}: grupo plan-history exige fatia T9.3a/T9.3b/T9.4a/T9.4b (tem '${e.slice}')`);
    if (e.group === "governance-authoritative" && !GOV_SLICES.has(e.slice))
      violations.push(`${pair}: grupo governance-authoritative exige fatia T9.5a/T9.5b (tem '${e.slice}')`);
    if (e.group === "na" && e.slice !== null)
      violations.push(`${pair}: grupo 'na' (permanece) não deve ter fatia (tem '${e.slice}')`);

    // Destino que muta exige fatia executora.
    if ((e.destiny === "stub" || e.destiny === "remove") && e.slice === null)
      violations.push(`${pair}: destino '${e.destiny}' exige uma fatia executora`);

    // T9.3a/T9.4a são ADIÇÃO PURA (ADR-0025 §9): não podem agendar mutação destrutiva.
    if (ADDITION_ONLY_SLICES.has(e.slice) && e.destiny !== "keep")
      violations.push(`${pair}: ${e.slice} é adição pura — exige destiny 'keep' (tem '${e.destiny}')`);

    // normativeSourceRef só faz sentido em regras que roteiam para PLAN/CHANGELOG como fonte/alvo.
    if (e.normativeSourceRef && !NORMSRC_RULES.has(e.rule))
      violations.push(`${pair}: normativeSourceRef=true só em plano-L1/historia-L5/roteamento-historia/roteamento-estado`);

    // Re-derivação: o manifesto não cita scratch como FONTE (nota/regra). Um artefato GERADO em
    // `.orion/tmp/` (saída de T9.3a/T9.7) PODE ser catalogado, mas só com role `temporary` — é um
    // output, não uma dependência do manifesto.
    if (e.note.includes(".orion/tmp") || e.rule.includes(".orion/tmp"))
      violations.push(`${pair}: cita '.orion/tmp' na nota/regra — viola a re-derivação (scratch não é fonte)`);
    if (e.file.includes(".orion/tmp") && e.role !== "temporary")
      violations.push(`${pair}: arquivo em '.orion/tmp' só é catalogável com role 'temporary' (output gerado)`);
  }

  // Exatamente um papel por par (unicidade).
  for (const [pair, n] of seenPair)
    if (n > 1) violations.push(`par duplicado (${n}×): ${pair} — cada par recebe exatamente um papel`);

  // Cobertura (D4): todo arquivo do domínio tem ≥1 entrada.
  const filesWithEntry = new Set(manifest.map((e) => e.file));
  for (const f of domainFiles)
    if (!filesWithEntry.has(f)) violations.push(`cobertura: '${f}' no domínio mas sem nenhuma entrada`);

  return {
    ok: violations.length === 0,
    entries: manifest.length,
    byRole, byGroup, bySlice, normativeSourceRefs,
    violations,
  };
}

// Self-check: (1) valida o manifesto REAL; (2) reporta contagens; (3) prova que o validador MORDE
// (par duplicado + fatia incoerente + arquivo de domínio sem entrada). Exit ≠ 0 se o caso válido falhar
// OU a mutação não for pega — adequado a gate de CI (o wiring no smoke-test é fatia da T9.6).
if (process.argv[1]?.endsWith("artifact-manifest.ts")) {
  const valido = validateManifest(MANIFEST, COVERAGE_DOMAIN.files);
  console.log(JSON.stringify({ caso: "manifesto REAL", ...valido }, null, 2));

  // Existência dos arquivos de domínio (informativo — o guard de árvore é da T9.6).
  const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
  const faltando = COVERAGE_DOMAIN.files.filter((f) => !existsSync(here(`../../${f}`)));
  console.log(JSON.stringify({ caso: "existência dos arquivos de domínio", faltando }));

  // Mordida: injeta 3 defeitos e confirma que TODOS são pegos.
  const mordida = validateManifest(
    [
      ...MANIFEST,
      MANIFEST[0]!, // par duplicado
      { file: "X.md", rule: "fast-lane", role: "mirror", destiny: "keep", slice: "T9.3b", group: "governance-authoritative", note: "fatia incoerente" },
    ],
    [...COVERAGE_DOMAIN.files, "docs/inexistente-no-manifesto.md"], // arquivo de domínio sem entrada
  );
  const morde = !mordida.ok && mordida.violations.length >= 3;
  console.log(JSON.stringify({ caso: "mutação (deve morder)", morde, violations: mordida.violations.slice(-4) }));

  if (!valido.ok || faltando.length > 0 || !morde) {
    console.error("FALHA: manifesto inválido, arquivo de domínio ausente, ou validador não mordeu.");
    process.exit(1);
  }
}
