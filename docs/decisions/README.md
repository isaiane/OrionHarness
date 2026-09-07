# Índice de ADRs — GERADO (não edite à mão)

> **Arquivo gerado** por [`tools/adr/adr-index.ts`](../../tools/adr/adr-index.ts) a partir dos ADRs desta pasta
> (número/título/status por ADR, `0000-template` excluído, ordenado). **Não edite à mão** — ao criar um ADR
> ou mudar seu **número/título/status/nome** (inclusive flip no G2), rode
> `node --experimental-strip-types tools/adr/adr-index.ts --write` e commite. O guard `--check` roda no
> `scripts/smoke-test.sh` e **reprova o CI** se este índice divergir dos ADRs (anti-drift contínuo, padrão do
> ADR-0019). **Para achar o ADR de um tema, faça `grep` neste arquivo** — não leia a pasta inteira.

| ADR | Título | Status |
| --- | ------ | ------ |
| [ADR-0001](0001-fundacoes-do-orion-harness.md) | Fundações do Orion Harness | aceito |
| [ADR-0002](0002-sincronizacao-automatica-de-labels.md) | Sincronização automática de labels via workflow | aceito |
| [ADR-0003](0003-enforcement-g3-por-perfil.md) | Enforcement do gate G3 (aprovação humana de merge) por perfil | aceito |
| [ADR-0004](0004-reconciliacao-s7-lean-flat.md) | Reconciliação do §7 à postura lean/flat (Effective Harnesses + autonomous-coding) | aceito |
| [ADR-0005](0005-stack-padrao-node-typescript.md) | Stack padrão do template: Node.js + TypeScript | aceito |
| [ADR-0006](0006-ledger-executavel-de-tarefas.md) | Ledger executável de tarefas (projeção das Issues SDD, em TypeScript) | aceito |
| [ADR-0007](0007-papel-initializer.md) | Papel Initializer no pipeline (bootstrap de ambiente executável) | aceito |
| [ADR-0008](0008-separacao-revisao-harness-vs-produto.md) | Separação dos processos de revisão: Harness Review vs Product Review | aceito |
| [ADR-0009](0009-verificacao-e2e-ferramenta-real.md) | Verificação end-to-end com ferramenta real (convenção opt-in) | aceito |
| [ADR-0010](0010-re-review-automatizado-apos-fix.md) | Re-review do revisor automatizado (Codex) após aplicar fix | aceito |
| [ADR-0011](0011-hook-sandbox-allowlist-referencia.md) | Hook de sandbox/allowlist de referência (action system, T0–T4) | aceito |
| [ADR-0012](0012-consolidacao-stack-node-ts.md) | Consolidação da stack em Node/TypeScript (cumprir o ADR-0005) | aceito |
| [ADR-0013](0013-validacao-alvo-leitura-tool-guard.md) | Validação de alvo de leitura no tool-guard (estende o ADR-0011) | aceito |
| [ADR-0014](0014-semantica-ledger-as-accepted.md) | Semântica do Feature Ledger: *as-accepted* (projeção histórica por Issue) | aceito |
| [ADR-0015](0015-allowlist-docs-examples.md) | Allowlist de execução de exemplos versionados (`docs/examples/`) no tool-guard | aceito |
| [ADR-0016](0016-politica-projecao-ledger.md) | Política de projeção do Feature Ledger (escopo, exclusões e backfill) | aceito |
| [ADR-0017](0017-fast-lane-baixo-risco.md) | Fast-lane para ações T1 de baixo risco | aceito |
| [ADR-0018](0018-revisao-cross-model.md) | Protocolo de revisão cross-model | aceito |
| [ADR-0019](0019-nucleo-l0-condensado.md) | Núcleo L0 condensado (core sempre-carregado + detalhe sob demanda) | aceito |
| [ADR-0020](0020-parser-yaml-smoke-test.md) | Parser YAML real na camada estática do smoke-test | aceito |
| [ADR-0021](0021-bootstrap-ledger-origem-local.md) | Bootstrap do ledger para repos derivados: marcador de origem local (sem apagar) | aceito |
| [ADR-0022](0022-lifecycle-passes-ledger.md) | Lifecycle de conclusão do Feature Ledger (validação aplicável + owner/gatilho da flip `passes:true`) | aceito |
| [ADR-0023](0023-indice-gerado-de-adrs.md) | Índice gerado de ADRs (`docs/decisions/README.md`) + guard anti-drift | aceito |
| [ADR-0024](0024-estado-enxuto-roteamento-historia-status.md) | Estado enxuto: STATE é ponteiro; história e status roteados por construção | aceito |
| [ADR-0025](0025-modelo-alvo-plano-historia-compactacao-ponteiros.md) | Modelo-alvo de plano, história, compactação e ponteiros | aceito |
| [ADR-0026](0026-plano-milestone-com-descricao-sem-project-drafts.md) | Plano simplificado: Milestone (com descrição) como fonte, sem Project drafts | aceito |
| [ADR-0027](0027-exclusao-superseded-pos-regime-ledger.md) | Exclusão pós-regime de entradas superseded/mal-redigidas do Feature Ledger | aceito |
| [ADR-0028](0028-skill-orquestradora-versionada-no-harness.md) | Skill orquestradora versionada no harness (fonte no repo; install = build) | aceito |
| [ADR-0029](0029-install-da-skill-e-reimport-app-managed.md) | Install da skill é reimport app-managed (supersede as cláusulas de install do ADR-0028) | aceito |
| [ADR-0030](0030-pipeline-spec-tests-implementation.md) | Pipeline Specification → Tests → Implementation (contrato executável) | aceito |
| [ADR-0031](0031-modelo-plano-v2-milestone-completo-hierarquia-nativa.md) | Modelo de gestão de plano/tarefas v2 (Milestone completo + hierarquia nativa) | aceito |
| [ADR-0032](0032-contrato-casamento-proveniencia-leitor-v2.md) | Modelo de proveniência `Promovida de:` (formato + casamento do leitor v2) | aceito |
