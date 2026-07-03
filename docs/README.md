# Índice da documentação

Mapa da documentação do Orion Harness. A constituição é [`../AGENTS.md`](../AGENTS.md); o índice
de memória do projeto é [`../MEMORY.md`](../MEMORY.md).

## Fundações arquiteturais (L0)

- [`architecture/foundations.md`](architecture/foundations.md) — Security by Design, modelo de
  confiança (T0–T4), padrões AI-First.
- [`architecture/ui-agent-harness.md`](architecture/ui-agent-harness.md) — UI governada por Design
  System (projetos com interface).

## Contexto de produto (Fase 0 · Prime)

- [`product/product-context.md`](product/product-context.md) — visão, domínio, regras de negócio.
- [`product/spec.md`](product/spec.md) — especificação (com bloco Data-First).
- [`product/discovery-guide.md`](product/discovery-guide.md) — roteiro de discovery (gate G0).

## Processo e qualidade

- [`testing-strategy.md`](testing-strategy.md) — testes, TDD, regressão, cobertura.
- [`agent-reviewer-checklist.md`](agent-reviewer-checklist.md) — checklist do **Product Review**
  (código/testes/config).
- [`harness-reviewer-checklist.md`](harness-reviewer-checklist.md) — checklist do **Harness Review**
  (mudanças de governança/instruções: constituição/ADRs/pipeline/gates — ADR-0008).
- [`observability.md`](observability.md) — logging, eventos, Data-First, tracing opt-in.
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — fluxo de contribuição.

## Decisões

- [`decisions/`](decisions/) — ADRs (template `0000` + `0001` fundador).

## Runbooks (operação)

- [`runbooks/branch-protection.md`](runbooks/branch-protection.md) — proteção de `main`.
- [`runbooks/github-projects.md`](runbooks/github-projects.md) — Projects, Issues, Milestones.
- [`runbooks/secrets.md`](runbooks/secrets.md) — gestão de segredos.

## Planos

- [`../PLAN.md`](../PLAN.md) — mapa de épicos.
- [`plans/`](plans/) — detalhamento por épico.

## Reuso

- [`getting-started.md`](getting-started.md) — bootstrap de um novo projeto a partir do template.
