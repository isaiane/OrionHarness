// artifact-manifest.ts — MANIFESTO DE CLASSIFICAÇÃO DOS ARTEFATOS (T9.2 / O9; ADR-0025, fatia T9.2).
//
// PROPÓSITO. Antes de o épico O9 remover/estubar qualquer espelho autoral, este manifesto CATALOGA —
// de forma verificável — o papel, o destino e a fatia executora de cada par (artefato, regra). É o
// INSUMO do guard de coerência (T9.6): "espelho não classificado" reprova. Esta fatia NÃO remove, não
// estuba, não edita nada — só cataloga (classe T1 / G1). O guard (T9.6) e as remoções (T9.3–T9.5) são
// fatias próprias; aqui não se liga guard nem se muta artefato.
//
// UNIDADE = PAR (artefato, regra) — não por arquivo (D3, já fixado na tabela de fatias do ADR-0025).
// Um mesmo arquivo pode ter papéis distintos por regra: p.ex. o `PLAN.md` é `pointer` do plano
// (plano-L1, após o stub da T9.3b) E `mirror` do roteamento (roteamento-historia/estado, no seu
// rodapé). Cada par recebe EXATAMENTE UM papel.
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
export type Slice =
  | "T9.3a"
  | "T9.3b-mig" // popular Milestones + gerador ler descrição (adição pura, ADR-0026)
  | "T9.3b"
  | "T9.3b-nav" // repontar menções de nav a PLAN.md p/ Milestones (follow-up #143)
  | "T9.4a"
  | "T9.4b"
  | "T9.5a"
  | "T9.5b"
  | "T9.6"
  | "T9.7"
  | null;

export interface ManifestEntry {
  file: string; //               caminho repo-relativo (SEM números de linha)
  rule: Rule; //                 a regra/conceito do par
  role: Role; //                 exatamente um balde
  destiny: Destiny;
  slice: Slice; //               quem executa o destino/redução
  group: Group;
  normativeSourceRef?: boolean; // true = referência normativa a PLAN.md/CHANGELOG.md COMO FONTE
  // NOTA TRANSITÓRIA (T9.3b/#150, achado Codex): pares plano-L1 já REPONTADOS (role pointer/mirror →
  // Milestones) mantêm `normativeSourceRef:true` por ora, o que é a leitura antiga ("citava PLAN como
  // fonte"). A reinterpretação do campo pós-migração (flag vivo de "ainda cita PLAN" vs. marcador de
  // domínio do mirror p/ o guard vigiar) é DECISÃO DE DESIGN do **T9.6** — a fatia que constrói o guard
  // que consome este campo. Deferido p/ lá, não flipado às cegas aqui (não há guard hoje que use o flag).
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
  "plano-L1",
  "historia-L5",
  "roteamento-historia",
  "roteamento-estado",
  "fast-lane",
  "ledger-projecao",
  "adr-index",
  "constituicao",
  "manifesto",
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
    "PLAN.md",
    "docs/plans/",
    "CHANGELOG.md",
    "MEMORY.md",
    "STATE.md",
    "AGENTS.md",
    "AGENTS.core.md",
    "CLAUDE.md",
    "CONTRIBUTING.md",
    "README.md",
    "docs/README.md",
    "docs/getting-started.md",
    "docs/observability.md",
    "docs/architecture/foundations.md",
    "docs/agent-reviewer-checklist.md",
    "docs/harness-reviewer-checklist.md",
    "docs/product/spec.md",
    "docs/product/discovery-guide.md",
    ".github/PULL_REQUEST_TEMPLATE.md",
    ".github/ISSUE_TEMPLATE/sdd-task.yml",
    "feature-ledger.json",
    "docs/decisions/README.md",
    "docs/examples/fast-lane-eligibility.ts",
    "docs/examples/artifact-manifest.ts",
  ],
  scanDirs: ["docs/runbooks/"],
} as const;

/**
 * MANIFESTO — a classificação curada. Re-derivada por varredura da árvore real (grep arquivo × regra).
 * Ordenada por regra. Cada linha é UM par (file, rule) com exatamente um papel.
 */
export const MANIFEST: ManifestEntry[] = [
  // ─── plano-L1 — mapa de épicos: Milestones (fonte, ADR-0026); PLAN.md/docs/plans = stub-ponteiro ───
  {
    file: "PLAN.md",
    rule: "plano-L1",
    role: "pointer",
    destiny: "stub",
    slice: "T9.3b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Estubado na T9.3b (#140): deixou de ser fonte (source→pointer) — o mapa de épicos vive nos Milestones. Permanece como stub enquanto o §4 o nomear (remoção = fatia futura própria).",
  },
  {
    file: "docs/plans/",
    rule: "plano-L1",
    role: "pointer",
    destiny: "stub",
    slice: "T9.3b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Diretório de detalhamento por épico (L1). Estubado na T9.3b (#140): `.gitkeep` → `README.md` stub-ponteiro (source→pointer); o detalhamento vive na descrição do Milestone.",
  },
  {
    file: "AGENTS.md",
    rule: "plano-L1",
    role: "source",
    destiny: "keep",
    slice: "T9.3b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "§4 tabela L1 + fase Plan/Spec (§2) + bala Status + §6 Gestão reescritos p/ Milestone+descrição na T9.3b (#140), redação verbatim do ADR-0026. Roteamento status/história (§4 par 'STATE é ponteiro') fica p/ T9.4b.",
  },
  {
    file: "MEMORY.md",
    rule: "plano-L1",
    role: "mirror",
    destiny: "keep",
    slice: "T9.3b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Índice L1 repontado p/ Milestones+Issues na T9.3b (#140); PLAN.md/docs/plans = stub-ponteiro. Não indexa o relatório gerado (scratch/gitignored).",
  },
  {
    file: "README.md",
    rule: "plano-L1",
    role: "mirror",
    destiny: "keep",
    slice: "T9.3b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Diagrama do ciclo, árvore de arquivos, passo 4 do onboarding e menção de progresso repontados p/ Milestones na T9.3b (#140) — o passo 4 era instrução viva 'criar plano no PLAN.md' (Codex #144 #2). Mantido 'mirror' (visão de fluxo sancionada).",
  },
  {
    file: "docs/README.md",
    rule: "plano-L1",
    role: "pointer",
    destiny: "keep",
    slice: "T9.3b-nav",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Link de navegação 'mapa de épicos' repontado p/ Milestones+runbook na T9.3b-nav (#143); PLAN.md fica como link de stub-ponteiro. normativeSourceRef pendente da reinterpretação do T9.6 (como os demais plano-L1).",
  },
  {
    file: "docs/getting-started.md",
    rule: "plano-L1",
    role: "mirror",
    destiny: "keep",
    slice: "T9.3b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Setup checklist + get-bearings (passo 3) + ciclo Plan repontados p/ Milestones+gerador na T9.3b (#140); get-bearings pode ler Milestones direto via `gh` (fallback do gerador, Node ≥22.6).",
  },
  {
    file: "CONTRIBUTING.md",
    rule: "plano-L1",
    role: "mirror",
    destiny: "keep",
    slice: "T9.3b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Fluxo Plan repontado na T9.3b (#140): 'o trabalho entra num Milestone (descrição=objetivo+tarefas)'. Mantido 'mirror' (reafirma o procedimento operacional).",
  },
  {
    file: "docs/harness-reviewer-checklist.md",
    rule: "plano-L1",
    role: "mirror",
    destiny: "keep",
    slice: "T9.3b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Harness Review §8 comparava PLAN.md/docs/plans como estado substantivo — mas este mesmo PR (memória/estado) dispara esse review. Repontado p/ Milestones na T9.3b (#140), não deferido (Codex #150): senão o check compara contra um stub. Mantido 'mirror'.",
  },
  {
    file: "docs/runbooks/github-projects.md",
    rule: "plano-L1",
    role: "mirror",
    destiny: "keep",
    slice: "T9.3b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Runbook invertido na T9.3b (#140): 'Milestone (título+descrição) = fonte do épico' (não o PLAN.md); a descrição lista as tarefas/Issues via `- [x] … → #N`. Mantido 'mirror' (procedimento operacional).",
  },
  {
    file: "docs/product/spec.md",
    rule: "plano-L1",
    role: "pointer",
    destiny: "keep",
    slice: "T9.3b-nav",
    group: "plan-history",
    note: "Footer 'Relacionados' repontado na T9.3b-nav (#143): o link p/ PLAN.md → runbook github-projects (plano = Milestones). normativeSourceRef pendente da reinterpretação do T9.6 (como os demais plano-L1).",
  },
  {
    file: "docs/product/discovery-guide.md",
    rule: "plano-L1",
    role: "mirror",
    destiny: "keep",
    slice: "T9.3b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Instrução ativa pós-G0 repontada na T9.3b (#140): 'prossiga para a fase Plan e registre os épicos como Milestones (título+descrição)'. REAFIRMA o contrato do Plan (schema título/descrição + G1) → role 'mirror' (visível ao guard T9.6), não 'pointer' (Codex #150).",
  },
  {
    file: "STATE.md",
    rule: "plano-L1",
    role: "pointer",
    destiny: "keep",
    slice: "T9.3b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Ponteiros/Agora dirigiam o agente a PLAN.md como mapa de épicos. Repontado p/ Milestones na T9.3b (#140, Codex #150) — get-bearings lê STATE primeiro, não podia apontar p/ stub. O roteamento status/história do §4 (par 'STATE é ponteiro') é rule 'roteamento-estado' → T9.4b.",
  },
  {
    file: "docs/decisions/0001-fundacoes-do-orion-harness.md",
    rule: "plano-L1",
    role: "source",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Declarou 'PLAN.md = mapa de épicos' (item 6); JÁ recebeu nota de supersedência parcial (ADR-0025 → Milestone). ADR append-only — não se edita a decisão histórica.",
  },
  // (R7-2) Removido o par (0006, plano-L1): 0006 apenas MENCIONA PLAN.md como contexto histórico —
  // menção em ADR não gera par (coerência com a postura "ADR só como fonte-decisão"). 0006 decide o
  // ledger e já está corretamente sob `ledger-projecao`.
  {
    file: "docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md",
    rule: "plano-L1",
    role: "source",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "DECISÃO que definiu o modelo-alvo do plano; item 1 (Project drafts) parc. superseded pelo ADR-0026. Append-only (nunca ponteiro). SEM normativeSourceRef.",
  },
  {
    file: "docs/decisions/0026-plano-milestone-com-descricao-sem-project-drafts.md",
    rule: "plano-L1",
    role: "source",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "DECISÃO vigente da fonte pré-Spec do plano: épico = Milestone; descrição = objetivo + tarefas (T9.3b-mig popula; gerador lê). Supersede o item 1 do ADR-0025. Append-only. SEM normativeSourceRef.",
  },

  // ─── historia-L5 — CHANGELOG.md como fonte autoral de história (ADR-0025 item 3) ────────────────────
  {
    file: "CHANGELOG.md",
    rule: "historia-L5",
    role: "source",
    destiny: "stub",
    slice: "T9.4b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Histórico autoral (L5). Vira stub apontando p/ PRs mergeados na T9.4b; texto existente CONGELADO (append-only, point-in-time) — sem backfill nem reescrita de prosa passada.",
  },
  {
    file: "AGENTS.md",
    rule: "historia-L5",
    role: "source",
    destiny: "keep",
    slice: "T9.4b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "§4 tabela L5 nomeia CHANGELOG como fonte; reescrita p/ 'PRs mergeados' na T9.4b (redação do ADR-0025).",
  },
  {
    file: "MEMORY.md",
    rule: "historia-L5",
    role: "mirror",
    destiny: "keep",
    slice: "T9.4b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Índice L5 aponta CHANGELOG como histórico.",
  },
  {
    file: "README.md",
    rule: "historia-L5",
    role: "mirror",
    destiny: "keep",
    slice: "T9.4b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Árvore de arquivos rotula CHANGELOG como 'Histórico de mudanças'.",
  },
  {
    file: "docs/getting-started.md",
    rule: "historia-L5",
    role: "mirror",
    destiny: "keep",
    slice: "T9.4b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Setup ('limpe o CHANGELOG') + get-bearings ('a história vive no CHANGELOG, fora do read-path').",
  },
  {
    file: "docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md",
    rule: "historia-L5",
    role: "source",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "DECISÃO que define o modelo-alvo da história (item 3: PRs mergeados; CHANGELOG→stub). Fonte-decisão; append-only. SEM normativeSourceRef (é decisão, não instrução viva de usar CHANGELOG como fonte).",
  },
  // NOTA (verificado no review Codex): `.github/workflows/release.yml` usa softprops/action-gh-release
  // com `generate_release_notes: true` e SEM `body`/`body_path` — gera notas do GitHub, NÃO lê o
  // CHANGELOG. Não é consumidor de história-como-fonte; fora do domínio. (O comentário-cabeçalho do
  // workflow que diz "a partir do CHANGELOG" está DESATUALIZADO — follow-up trivial, fora do O9.)

  // ─── roteamento-historia — cláusula "história → CHANGELOG" (migra na T9.4b, atômico com o stub) ──────
  {
    file: "AGENTS.md",
    rule: "roteamento-historia",
    role: "source",
    destiny: "keep",
    slice: "T9.4b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "§4 bala História + fase Ship (§2) + DoD (§12) roteiam história→CHANGELOG; migram p/ histórico estruturado na T9.4b (linha L5 + roteamento, redação do ADR-0025).",
  },
  {
    file: "docs/decisions/0024-estado-enxuto-roteamento-historia-status.md",
    rule: "roteamento-historia",
    role: "source",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Decisão HISTÓRICA da rota história→CHANGELOG, já superseded PARCIALMENTE pelo ADR-0025 (nota de cabeçalho). SEM normativeSourceRef: append-only, nenhuma fatia a edita para 'limpar o marcador' — o guard não deve cobrá-la; a correção viva mora nos espelhos e no §4.",
  },
  {
    file: "docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md",
    rule: "roteamento-historia",
    role: "source",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "DECISÃO que supersede parcialmente o 0024 (história→estruturado). Fonte-decisão; append-only. SEM normativeSourceRef (decisão canônica, não instrução viva a corrigir; a correção vive no §4/espelhos).",
  },
  {
    file: "CONTRIBUTING.md",
    rule: "roteamento-historia",
    role: "mirror",
    destiny: "keep",
    slice: "T9.4b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Fluxo Ship: 'roteie — história→CHANGELOG'.",
  },
  {
    file: "docs/harness-reviewer-checklist.md",
    rule: "roteamento-historia",
    role: "mirror",
    destiny: "keep",
    slice: "T9.4b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Harness Review cobra narrativa datada → CHANGELOG.",
  },
  {
    file: "docs/agent-reviewer-checklist.md",
    rule: "roteamento-historia",
    role: "mirror",
    destiny: "keep",
    slice: "T9.4b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Product Review cobra narrativa por-PR → CHANGELOG.",
  },
  {
    file: "docs/getting-started.md",
    rule: "roteamento-historia",
    role: "mirror",
    destiny: "keep",
    slice: "T9.4b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Ciclo de evolução (Ship) resume: história→CHANGELOG.",
  },
  {
    file: "STATE.md",
    rule: "roteamento-historia",
    role: "mirror",
    destiny: "keep",
    slice: "T9.4b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Cabeçalho documenta o limite citando CHANGELOG como destino de história. C5 do ADR-0025: DONO do cabeçalho do STATE = T9.4b (viaja com o roteamento no mesmo PR).",
  },
  {
    file: "MEMORY.md",
    rule: "roteamento-historia",
    role: "mirror",
    destiny: "keep",
    slice: "T9.4b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Índice instrui fechamento por camada: história→CHANGELOG.",
  },
  {
    file: "README.md",
    rule: "roteamento-historia",
    role: "mirror",
    destiny: "keep",
    slice: "T9.4b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Diagrama do ciclo pós-merge: 'CHANGELOG história'.",
  },
  {
    file: ".github/PULL_REQUEST_TEMPLATE.md",
    rule: "roteamento-historia",
    role: "mirror",
    destiny: "keep",
    slice: "T9.4b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Checklist do autor: estado roteado — história→CHANGELOG.",
  },
  {
    file: ".github/ISSUE_TEMPLATE/sdd-task.yml",
    rule: "roteamento-historia",
    role: "mirror",
    destiny: "keep",
    slice: "T9.4b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Label do DoD da Issue: história→CHANGELOG.",
  },
  {
    file: "PLAN.md",
    rule: "roteamento-historia",
    role: "mirror",
    destiny: "stub",
    slice: "T9.3b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Rodapé do PLAN reafirma 'a história vai ao CHANGELOG.md' (Regra de compactação §4). Some quando o PLAN vira stub (T9.3b) — não sobra ponteiro para CHANGELOG num arquivo já estubado.",
  },

  // ─── roteamento-estado — invariante STATE=ponteiro / status→Issue (permanece; espelhos que citam PLAN → T9.4b, resto → T9.5a) ─────
  {
    file: "AGENTS.md",
    rule: "roteamento-estado",
    role: "source",
    destiny: "keep",
    slice: "T9.4b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "§4 Regra de compactação — fonte canônica. O INVARIANTE STATE=ponteiro / status→Issue/ledger PERMANECE; a única edição é remover a menção residual a 'PLAN' da expressão 'status→Issue/ledger/PLAN', que sai na T9.4b junto da outra expressão de roteamento (ADR-0025: as DUAS expressões do parágrafo migram na T9.4b). Ownership da edição = T9.4b; o arquivo permanece como fonte.",
  },
  {
    file: "docs/decisions/0024-estado-enxuto-roteamento-historia-status.md",
    rule: "roteamento-estado",
    role: "source",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Invariante + tabela de decisão história-vs-status; append-only, permanece.",
  },
  {
    file: "STATE.md",
    rule: "roteamento-estado",
    role: "mirror",
    destiny: "keep",
    slice: "T9.4b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Cabeçalho reafirma STATE=ponteiro E roteia 'status → projetado no ledger / refletido no PLAN.md'. A menção a PLAN sai na T9.4b (C5 do ADR-0025: dono do cabeçalho do STATE = T9.4b, viaja com o roteamento); o invariante STATE=ponteiro permanece.",
  },
  {
    file: "CONTRIBUTING.md",
    rule: "roteamento-estado",
    role: "mirror",
    destiny: "keep",
    slice: "T9.4b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Ship: 'atualize apenas o ponteiro no STATE.md' + roteia 'status/critérios→Issue SDD, projetado no ledger e refletido no PLAN.md (L1)'. A menção a PLAN sai na T9.4b (PLAN sai da rota, viaja com o roteamento); o item permanece operacional, não vira ponteiro.",
  },
  {
    file: "docs/harness-reviewer-checklist.md",
    rule: "roteamento-estado",
    role: "mirror",
    destiny: "keep",
    slice: "T9.4b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "CHECK DE REVIEW EXECUTÁVEL — o check em si é PRESERVADO (ADR-0025 item 5, não vira ponteiro). MAS a menção 'refletido no PLAN.md' fica obsoleta quando o PLAN vira stub: a T9.4b atualiza esse ALVO (tira PLAN da rota) junto da migração de roteamento; o check permanece operacional.",
  },
  {
    file: "docs/agent-reviewer-checklist.md",
    rule: "roteamento-estado",
    role: "mirror",
    destiny: "keep",
    slice: "T9.4b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Idem Product Review: check PRESERVADO, mas a menção 'refletido no PLAN.md' é atualizada na T9.4b (PLAN sai da rota). Não vira ponteiro.",
  },
  {
    file: "docs/getting-started.md",
    rule: "roteamento-estado",
    role: "mirror",
    destiny: "keep",
    slice: "T9.4b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Get-bearings define STATE como ponteiro (não log) e roteia 'status→Issue/ledger/PLAN.md'. A menção a PLAN sai na T9.4b (PLAN sai da rota, viaja com o roteamento); a definição do ponteiro permanece.",
  },
  {
    file: "MEMORY.md",
    rule: "roteamento-estado",
    role: "mirror",
    destiny: "keep",
    slice: "T9.4b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Índice: STATE só o ponteiro (sem narrativa) e roteia 'status→Issue/ledger/PLAN.md'. A menção a PLAN sai na T9.4b (PLAN sai da rota, viaja com o roteamento); o ponteiro permanece.",
  },
  {
    file: "README.md",
    rule: "roteamento-estado",
    role: "mirror",
    destiny: "keep",
    slice: "T9.5a",
    group: "governance-authoritative",
    note: "Diagrama pós-merge: 'STATE ponteiro · Issue/ledger status'.",
  },
  {
    file: ".github/PULL_REQUEST_TEMPLATE.md",
    rule: "roteamento-estado",
    role: "mirror",
    destiny: "keep",
    slice: "T9.4b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Item que o autor EXECUTA (STATE só ponteiro; status→Issue) — PRESERVADO. A menção 'projeção→ledger/PLAN.md' é atualizada na T9.4b (PLAN sai da rota); o item permanece operacional, não vira ponteiro.",
  },
  {
    file: ".github/ISSUE_TEMPLATE/sdd-task.yml",
    rule: "roteamento-estado",
    role: "mirror",
    destiny: "keep",
    slice: "T9.4b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Label do DoD executável — PRESERVADO. A menção 'status→Issue/ledger/PLAN' perde o PLAN na T9.4b; o label permanece operacional.",
  },
  {
    file: "docs/runbooks/github-projects.md",
    rule: "roteamento-estado",
    role: "mirror",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Runbook L4 vivo: 'STATE.md aponta para o épico e as Issues ativas' — instrução operacional PRESERVADA (ADR-0025 item 5); ponteiro não substitui a operação.",
  },
  {
    file: "PLAN.md",
    rule: "roteamento-estado",
    role: "mirror",
    destiny: "stub",
    slice: "T9.3b",
    group: "plan-history",
    normativeSourceRef: true,
    note: "Rodapé do PLAN reafirma 'status por-item projetado no ledger e refletido no PLAN.md; STATE só o ponteiro'. Some quando o PLAN vira stub (T9.3b) — a reafirmação do roteamento no PLAN é resolvida junto do stub, não na T9.5a.",
  },

  // ─── fast-lane — exceção T1 (§11.2 / ADR-0017); fonte JÁ autoritativa; espelhos → T9.5b ─────────────
  {
    file: "AGENTS.md",
    rule: "fast-lane",
    role: "source",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "§11.2 é a fonte canônica (com ADR-0017); §1/§6/§12 ecoam internamente. O9 não toca a fonte. T9.5b (#137) reduziu os espelhos EXTERNOS a ponteiros; os ecos constitucionais internos (§1/§6/§12) foram DELIBERADAMENTE mantidos (fora do escopo T9.5b — a fonte não se auto-reduz).",
  },
  {
    file: "docs/decisions/0017-fast-lane-baixo-risco.md",
    rule: "fast-lane",
    role: "source",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Decisão fundadora da fast-lane; append-only.",
  },
  {
    file: "docs/examples/fast-lane-eligibility.ts",
    rule: "fast-lane",
    role: "source",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Predicado rodável fast|full|blocked; evidência executável da regra (o §11.2 aponta p/ ele). Não é prosa-espelho.",
  },
  {
    file: "AGENTS.core.md",
    rule: "fast-lane",
    role: "mirror",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Núcleo L0 = VISÃO derivada sancionada (ADR-0019), guardada por l0-core-manifest; espelho legítimo — NÃO alvo de redução.",
  },
  {
    file: "README.md",
    rule: "fast-lane",
    role: "pointer",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "T9.5b (#137): a prosa da via rápida foi reduzida a NAVEGAÇÃO pura (nomeia a rota + link p/ §11.2/ADR-0017; NÃO reafirma as garantias — o que dispensa/mantém/elegibilidade vive na fonte). O bloco Mermaid (aresta tracejada) PERMANECE como VISÃO DE FLUXO sancionada — não é prosa-espelho, verificado coerente com a §11.2; o grep de texto não alcança rótulos de diagrama (por isso não é alvo do guard T9.6).",
  },
  {
    file: "CONTRIBUTING.md",
    rule: "fast-lane",
    role: "mirror",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "T9.5b (#137) REDUZIU o espelho: o callout de elegibilidade por-extenso virou gist+link (§11.2/ADR-0017/predicado). O par PERMANECE 'mirror' (não 'pointer') porque retém PROCEDIMENTO OPERACIONAL que o contribuidor EXECUTA — branch fast/<slug>, commits sem #<nº>, PR issue-less (omitir Closes, marcar N/A) —, mesma categoria de PR_TEMPLATE/checklists (ADR-0025 item 5). Fica VISÍVEL ao guard T9.6 (unidade = par; 'pointer' esconderia o espelho retido).",
  },
  {
    file: ".github/PULL_REQUEST_TEMPLATE.md",
    rule: "fast-lane",
    role: "mirror",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Instruções do PR leve + 'Lane: fast' + critério issue-less = texto operacional inevitável em template (ADR-0025 item 5). PRESERVADO; NÃO reduzido na T9.5b.",
  },
  {
    file: ".github/ISSUE_TEMPLATE/sdd-task.yml",
    rule: "fast-lane",
    role: "mirror",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Label do DoD sobre status/ledger na fast-lane = texto operacional em template (ADR-0025 item 5). PRESERVADO; NÃO reduzido na T9.5b.",
  },
  {
    file: "docs/harness-reviewer-checklist.md",
    rule: "fast-lane",
    role: "mirror",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Substituição issue-less + checagem de elegibilidade = INSTRUÇÃO DE REVIEW EXECUTÁVEL; conteúdo operacional PRESERVADO em checklist (ADR-0025 item 5), como o runbook — ponteiro não reconstrói o procedimento. NÃO reduzido na T9.5b.",
  },
  {
    file: "docs/agent-reviewer-checklist.md",
    rule: "fast-lane",
    role: "mirror",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Variante issue-less do Product Review = instrução operacional de review; PRESERVADA em checklist (ADR-0025 item 5). NÃO reduzida na T9.5b.",
  },
  {
    file: "docs/observability.md",
    rule: "fast-lane",
    role: "mirror",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "CONTRATO Data-First ÚNICO do sinal (classe, lane): adoção, cycle time, rollback/rework, auditoria de escapes T2+ — NÃO existe no §11.2 (que só define elegibilidade/rota). Conteúdo operacional PRESERVADO (ADR-0025 item 5); reduzir a ponteiro tornaria as métricas não-reconstruíveis. NÃO reduzido na T9.5b.",
  },
  {
    file: "docs/architecture/foundations.md",
    rule: "fast-lane",
    role: "mirror",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "T9.5b (#137) REDUZIU o espelho: a menção do modelo de confiança (cerimônia proporcional) virou gist+link (§11.2/ADR-0017). O par PERMANECE 'mirror' porque retém o CONTRATO de auditoria do §1.5 (issue-less: branch→commit→PR→merge, PR=unidade) que reafirma a §11.2 — operacional como observability (ADR-0025 item 5). Fica VISÍVEL ao guard T9.6 (unidade = par).",
  },
  {
    file: "docs/getting-started.md",
    rule: "fast-lane",
    role: "pointer",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "T9.5b (#137): o callout do ciclo (elegibilidade por-extenso) virou PONTEIRO (§11.2/ADR-0017/predicado). A exceção WIP no ritual (§11.2) já era ponteiro nu — mantida.",
  },
  {
    file: "docs/runbooks/github-projects.md",
    rule: "fast-lane",
    role: "mirror",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Runbook L4: correlação branch→PR na fast-lane é CONTEÚDO OPERACIONAL — preservado (ADR-0025 item 5), ponteiro não substitui operação.",
  },
  // NOTA: ADRs NÃO são catalogados como "espelho" de fast-lane/roteamento (0018/0022/0024 mencionam a
  // exceção). Decisões são append-only, não prosa viva que reintroduz drift — o alvo do guard T9.6.
  // Entram apenas como FONTE-DECISÃO canônica de uma regra (0001/0006/0017/0023/0024/0025); menções em
  // ADR não geram par. Por isso `docs/decisions/` saiu dos scanDirs (ver COVERAGE_DOMAIN).
  //
  // NOTA (baseline p/ o guard T9.6 — menção-orientação e história NÃO geram par): `STATE.md` cita a
  // fast-lane como ORIENTAÇÃO (ponteiro `Próximo passo`/`Última conclusão` p/ a fatia T9.5b) e o
  // `CHANGELOG.md` a registra como HISTÓRIA point-in-time (o que a T9.5b mudou). Nenhuma é prosa-espelho
  // VIVA que reafirma a regra — pela MESMA postura dos ADRs acima (menção não gera par), não recebem par
  // (STATE, fast-lane)/(CHANGELOG, fast-lane). A cobertura do domínio é por ARQUIVO (≥1 entrada), não por
  // (arquivo, regra): ambos já têm entradas de OUTRAS regras. Registrado para o T9.6 não cobrar como
  // "espelho não classificado" o que é ponteiro-orientação/história.

  // ─── projeções / gerados / ponteiros que permanecem (na) ────────────────────────────────────────────
  {
    file: "feature-ledger.json",
    rule: "ledger-projecao",
    role: "projection",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Projeção de VERIFICAÇÃO (passes/critérios; ADR-0006/0014/0016/0022). NÃO vira histórico (ADR-0025 item 4); sobrecarregá-lo com 'o que mudou' exige novo ADR (G2).",
  },
  {
    file: "docs/decisions/0006-ledger-executavel-de-tarefas.md",
    rule: "ledger-projecao",
    role: "source",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Decisão que define o ledger como projeção de verificação. Fonte-decisão; append-only — âncora do invariante 'ledger ≠ status/história autoral'.",
  },
  {
    file: "AGENTS.md",
    rule: "ledger-projecao",
    role: "mirror",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "§4 reafirma 'ledger = projeção de verificação (imutável, não autoral)'; invariante decidido em 0006. Permanece (O9 não toca o ledger).",
  },
  {
    file: "CONTRIBUTING.md",
    rule: "ledger-projecao",
    role: "mirror",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Ship: 'status/critérios→Issue, projeção→ledger'. Reafirma o invariante; permanece.",
  },
  {
    file: "docs/getting-started.md",
    rule: "ledger-projecao",
    role: "mirror",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Get-bearings: 'ledger é a projeção de verificação (imutável, pode atrasar vs. a Issue)'. Permanece.",
  },
  {
    file: "docs/harness-reviewer-checklist.md",
    rule: "ledger-projecao",
    role: "mirror",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Check executável: ledger é projeção (append-only), não status autoral — operacional, PRESERVADO (ADR-0025 item 5).",
  },
  {
    file: "docs/agent-reviewer-checklist.md",
    rule: "ledger-projecao",
    role: "mirror",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Idem Product Review: check do invariante do ledger — operacional, PRESERVADO.",
  },
  {
    file: "STATE.md",
    rule: "ledger-projecao",
    role: "mirror",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Cabeçalho reafirma 'status por-item → Issue SDD (fonte), projetado no ledger'. Invariante vivo; permanece (O9 não toca o ledger).",
  },
  {
    file: ".github/PULL_REQUEST_TEMPLATE.md",
    rule: "ledger-projecao",
    role: "mirror",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Item que o autor EXECUTA: 'Issue type:task projetada no feature-ledger.json (delta aditivo, ledger-guard verde)' + as exceções (fora do ADR-0016 / fast-lane issue-less / follow-up rastreado). Check operacional de projeção — PRESERVADO (ADR-0025 item 5); o ledger é projeção de verificação, não tocado no O9.",
  },
  {
    file: "docs/decisions/README.md",
    rule: "adr-index",
    role: "generated",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Índice de ADRs GERADO (ADR-0023); regenerado por `tools/adr/adr-index.ts --write`, com guard próprio no smoke-test (`--check`). Não autoral — fora do drift do O9.",
  },
  {
    file: "docs/decisions/0023-indice-gerado-de-adrs.md",
    rule: "adr-index",
    role: "source",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Decisão que define o índice gerado (visão-derivada+guard). Fonte-decisão; append-only.",
  },
  {
    file: "docs/README.md",
    rule: "adr-index",
    role: "pointer",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Navegação da pasta docs/ — aponta para o índice gerado (docs/decisions/README.md).",
  },
  {
    file: "CONTRIBUTING.md",
    rule: "adr-index",
    role: "pointer",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Instrui consultar o índice gerado (`grep` no docs/decisions/README.md, não varrer a pasta).",
  },
  {
    file: "docs/getting-started.md",
    rule: "adr-index",
    role: "pointer",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Ritual: 'para achar o ADR de um tema, `grep` no docs/decisions/README.md'.",
  },
  {
    file: "MEMORY.md",
    rule: "adr-index",
    role: "pointer",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Índice L3 aponta para o índice de ADRs gerado (docs/decisions/README.md).",
  },
  {
    file: "STATE.md",
    rule: "adr-index",
    role: "pointer",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Ponteiros do STATE mandam `grep` no índice gerado (docs/decisions/README.md) por tema.",
  },
  {
    file: "AGENTS.md",
    rule: "constituicao",
    role: "source",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "A constituição canônica (L0). Fonte; vence em qualquer divergência.",
  },
  {
    file: "AGENTS.core.md",
    rule: "constituicao",
    role: "mirror",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Núcleo L0 sempre-carregado = VISÃO derivada sancionada do AGENTS.md (ADR-0019), guardada por l0-core-manifest; espelho legítimo, não reduzível.",
  },
  {
    file: "README.md",
    rule: "constituicao",
    role: "pointer",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Manda o agente iniciante ler o AGENTS.core.md e abrir o §X do AGENTS.md; navegação para a fonte.",
  },
  {
    file: "CLAUDE.md",
    rule: "constituicao",
    role: "pointer",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Ponteiro L0 para AGENTS.md/AGENTS.core.md. Não reafirma regras transversais por extenso.",
  },
  {
    file: "MEMORY.md",
    rule: "constituicao",
    role: "pointer",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Índice L0 lista a constituição (AGENTS.md/core) como guardrails; navegação, não reafirmação.",
  },
  {
    file: "docs/getting-started.md",
    rule: "constituicao",
    role: "pointer",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Ritual manda ler o AGENTS.core.md e abrir o §X do AGENTS.md sob demanda; navegação para a fonte.",
  },
  {
    file: "CONTRIBUTING.md",
    rule: "constituicao",
    role: "pointer",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Abre declarando que 'operacionaliza a constituição AGENTS.md; em conflito, AGENTS.md prevalece'. Ponteiro para a fonte L0, não reafirma regras por extenso; permanece.",
  },
  {
    file: "docs/README.md",
    rule: "constituicao",
    role: "pointer",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Índice da doc identifica a constituição ('A constituição é ../AGENTS.md'); navegação para a fonte L0, não reafirmação; permanece.",
  },
  {
    file: "STATE.md",
    rule: "constituicao",
    role: "pointer",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Rodapé de navegação aponta 'AGENTS.md §4 · AGENTS.core.md (núcleo L0)'; ponteiro para a constituição, não reafirmação; permanece.",
  },
  {
    file: "docs/examples/artifact-manifest.ts",
    rule: "manifesto",
    role: "source",
    destiny: "keep",
    slice: null,
    group: "na",
    note: "Este manifesto — insumo do guard de coerência (T9.6). Auto-descreve; cada fatia atualiza a sua entrada no mesmo PR (gatilho D2).",
  },
];

// ────────────────────────────────────────────────────────────────────────────────────────────────────
// Validação (parse/consistência DO MANIFESTO — NÃO é o guard de coerência da T9.6, que varre a árvore).
// ────────────────────────────────────────────────────────────────────────────────────────────────────

const ROLES = new Set<Role>([
  "source",
  "pointer",
  "mirror",
  "history",
  "projection",
  "generated",
  "temporary",
  "deprecated",
  "removed",
]);
const DESTINIES = new Set<Destiny>(["keep", "stub", "remove"]);
const GROUPS = new Set<Group>(["governance-authoritative", "plan-history", "na"]);
const SLICES = new Set<Slice>([
  "T9.3a",
  "T9.3b-mig",
  "T9.3b",
  "T9.3b-nav",
  "T9.4a",
  "T9.4b",
  "T9.5a",
  "T9.5b",
  "T9.6",
  "T9.7",
  null,
]);
const PLAN_HISTORY_SLICES = new Set<Slice>([
  "T9.3a",
  "T9.3b-mig",
  "T9.3b",
  "T9.3b-nav",
  "T9.4a",
  "T9.4b",
]);
const GOV_SLICES = new Set<Slice>(["T9.5a", "T9.5b"]);
// Fatias de ADIÇÃO PURA (ADR-0025 §9 / ADR-0026): só constroem substituto, nunca estubam/removem.
const ADDITION_ONLY_SLICES = new Set<Slice>(["T9.3a", "T9.3b-mig", "T9.4a"]);
const NORMSRC_RULES = new Set<Rule>([
  "plano-L1",
  "historia-L5",
  "roteamento-historia",
  "roteamento-estado",
]);

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
export function validateManifest(
  manifest: ManifestEntry[],
  domainFiles: readonly string[],
): ManifestReport {
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

    if (!ROLES.has(e.role))
      violations.push(`${pair}: papel '${e.role}' fora dos baldes do ADR-0025`);
    if (!DESTINIES.has(e.destiny)) violations.push(`${pair}: destino '${e.destiny}' inválido`);
    if (!GROUPS.has(e.group)) violations.push(`${pair}: grupo '${e.group}' inválido`);
    if (!SLICES.has(e.slice)) violations.push(`${pair}: fatia '${e.slice}' inválida`);

    // Coerência grupo ↔ fatia.
    if (e.group === "plan-history" && !PLAN_HISTORY_SLICES.has(e.slice))
      violations.push(
        `${pair}: grupo plan-history exige fatia T9.3a/T9.3b/T9.4a/T9.4b (tem '${e.slice}')`,
      );
    if (e.group === "governance-authoritative" && !GOV_SLICES.has(e.slice))
      violations.push(
        `${pair}: grupo governance-authoritative exige fatia T9.5a/T9.5b (tem '${e.slice}')`,
      );
    if (e.group === "na" && e.slice !== null)
      violations.push(`${pair}: grupo 'na' (permanece) não deve ter fatia (tem '${e.slice}')`);

    // Destino que muta exige fatia executora.
    if ((e.destiny === "stub" || e.destiny === "remove") && e.slice === null)
      violations.push(`${pair}: destino '${e.destiny}' exige uma fatia executora`);

    // T9.3a/T9.4a são ADIÇÃO PURA (ADR-0025 §9): não podem agendar mutação destrutiva.
    if (ADDITION_ONLY_SLICES.has(e.slice) && e.destiny !== "keep")
      violations.push(
        `${pair}: ${e.slice} é adição pura — exige destiny 'keep' (tem '${e.destiny}')`,
      );

    // normativeSourceRef só faz sentido em regras que roteiam para PLAN/CHANGELOG como fonte/alvo.
    if (e.normativeSourceRef && !NORMSRC_RULES.has(e.rule))
      violations.push(
        `${pair}: normativeSourceRef=true só em plano-L1/historia-L5/roteamento-historia/roteamento-estado`,
      );

    // Re-derivação: o manifesto não cita scratch como FONTE (nota/regra). Um artefato GERADO em
    // `.orion/tmp/` (saída de T9.3a/T9.7) PODE ser catalogado, mas só com role `temporary` — é um
    // output, não uma dependência do manifesto.
    if (e.note.includes(".orion/tmp") || e.rule.includes(".orion/tmp"))
      violations.push(
        `${pair}: cita '.orion/tmp' na nota/regra — viola a re-derivação (scratch não é fonte)`,
      );
    if (e.file.includes(".orion/tmp") && e.role !== "temporary")
      violations.push(
        `${pair}: arquivo em '.orion/tmp' só é catalogável com role 'temporary' (output gerado)`,
      );
  }

  // Exatamente um papel por par (unicidade).
  for (const [pair, n] of seenPair)
    if (n > 1)
      violations.push(`par duplicado (${n}×): ${pair} — cada par recebe exatamente um papel`);

  // Cobertura (D4): todo arquivo do domínio tem ≥1 entrada.
  const filesWithEntry = new Set(manifest.map((e) => e.file));
  for (const f of domainFiles)
    if (!filesWithEntry.has(f))
      violations.push(`cobertura: '${f}' no domínio mas sem nenhuma entrada`);

  return {
    ok: violations.length === 0,
    entries: manifest.length,
    byRole,
    byGroup,
    bySlice,
    normativeSourceRefs,
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
      {
        file: "X.md",
        rule: "fast-lane",
        role: "mirror",
        destiny: "keep",
        slice: "T9.3b",
        group: "governance-authoritative",
        note: "fatia incoerente",
      },
    ],
    [...COVERAGE_DOMAIN.files, "docs/inexistente-no-manifesto.md"], // arquivo de domínio sem entrada
  );
  const morde = !mordida.ok && mordida.violations.length >= 3;
  console.log(
    JSON.stringify({
      caso: "mutação (deve morder)",
      morde,
      violations: mordida.violations.slice(-4),
    }),
  );

  if (!valido.ok || faltando.length > 0 || !morde) {
    console.error(
      "FALHA: manifesto inválido, arquivo de domínio ausente, ou validador não mordeu.",
    );
    process.exit(1);
  }
}
