# MEMORY — Índice da Memória do Projeto

> **Índice navegável** de toda a memória versionada (`AGENTS.md` §4). Comece por aqui para
> localizar qualquer artefato de contexto, decisão ou estado. A memória vive em **camadas**:

## Camadas

| Camada | Artefato(s) | Papel |
|--------|-------------|-------|
| **L0** Guardrails | [`AGENTS.md`](AGENTS.md), [`CLAUDE.md`](CLAUDE.md), [`docs/architecture/foundations.md`](docs/architecture/foundations.md), [`docs/architecture/ui-agent-harness.md`](docs/architecture/ui-agent-harness.md) | Constituição e fundações arquiteturais |
| **L0.5** Contexto de produto | [`docs/product/product-context.md`](docs/product/product-context.md), [`docs/product/spec.md`](docs/product/spec.md), [`docs/product/discovery-guide.md`](docs/product/discovery-guide.md) | Visão, domínio, regras de negócio, spec (insumo da Fase 0) |
| **L1** Plano | [`PLAN.md`](PLAN.md), [`docs/plans/`](docs/plans/) | Mapa de épicos e detalhamento |
| **L1** Índice de estado | [`STATE.md`](STATE.md) | Ponteiro leve: onde estamos / próximo passo |
| **L2** Execução | GitHub Issues (SDD) | Fonte da verdade de status e contexto da tarefa |
| **L3** Decisões | [`docs/decisions/`](docs/decisions/) | ADRs (append-only) |
| **L4** Estado vivo | [`docs/runbooks/`](docs/runbooks/) | Como operar; riscos; próximos passos |
| — Qualidade | [`docs/testing-strategy.md`](docs/testing-strategy.md), [`docs/agent-reviewer-checklist.md`](docs/agent-reviewer-checklist.md) | Estratégia de testes e checklist de review |
| — Convenções | [`CONTRIBUTING.md`](CONTRIBUTING.md), [`presets/`](presets/), [`commitlint.config.js`](commitlint.config.js), `.pre-commit-config.yaml` | Fluxo, presets por stack e hooks |
| — Observabilidade | [`docs/observability.md`](docs/observability.md) | Logging, eventos, Data-First, tracing opt-in |
| — Segurança | [`SECURITY.md`](SECURITY.md), [`docs/runbooks/secrets.md`](docs/runbooks/secrets.md), `.env.example` | Política, gestão de segredos |
| — Reuso | [`docs/getting-started.md`](docs/getting-started.md), [`docs/README.md`](docs/README.md) | Guia de uso do template e índice de docs |
| **L5** Histórico | [`CHANGELOG.md`](CHANGELOG.md) | O que mudou, por ciclo |

## Como o agente usa este índice

1. Ao iniciar: leia `STATE.md` (onde estamos) → este índice (onde está cada coisa).
2. Antes de planejar: confirme `docs/product/` (gate G0).
3. Durante a execução: a Issue SDD é o contexto da tarefa; ADRs registram decisões.
4. Ao concluir: atualize `STATE.md` e `CHANGELOG.md` (regra de compactação, `AGENTS.md` §4).
