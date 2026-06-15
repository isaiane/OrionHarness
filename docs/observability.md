# Observabilidade

> Operacionaliza `AGENTS.md` §9 e §9.1 (Data-First) e as fundações de observabilidade
> ([`architecture/foundations.md`](architecture/foundations.md) §2.5). Convenções **universais**
> como base; instrumentação (métricas/tracing) como **preset opt-in** por stack.

## Princípios

- **Tudo observável por padrão.** Toda ação com efeito colateral e todo fluxo relevante emitem
  sinais suficientes para diagnosticar uso, resultado e falha.
- **Sem falha silenciosa.** Erros são tratados, registrados e correlacionados.
- **Privacidade primeiro.** Nada de PII ou segredos em logs/métricas/traces (§10) — use redaction.

## Logging estruturado (base, universal)

- Formato **JSON** com campos mínimos: `timestamp`, `level`, `message`, `correlation_id`, `actor`
  (humano/agente/serviço), `context` (bounded context/ação) e atributos relevantes redigidos.
- Níveis: `debug`, `info`, `warn`, `error`. `error` sempre com causa e contexto acionável.
- **`correlation_id`** liga logs, ações e artefatos ao longo do fluxo
  (`Issue → branch → commit → PR`, fundações §1.5).

## Decision logs (agentes)

Decisões automatizadas registram: premissas, alternativas consideradas, decisão tomada, **classe
de confiança** (§11) e justificativa. Permite auditoria do raciocínio sem a sessão original.

## Eventos de domínio

Mudanças de estado relevantes são **eventos** explícitos, versionados e auditáveis (event-driven,
fundações §2.2), carregando `correlation_id`.

## Data-First — instrumentação de uso e resultado

Para cada funcionalidade, a Spec (§9.1) define **como saber que está sendo usada**, **se gerou o
resultado esperado** e **quais eventos/métricas capturar**. Implemente esses sinais como parte da
entrega e cubra-os com testes (`testing-strategy.md`).

| Sinal | Pergunta que responde | Exemplo |
|-------|----------------------|---------|
| Evento de uso | Está sendo usada? | `feature.x.invoked` |
| Métrica de resultado | Gerou o resultado esperado? | taxa de sucesso, tempo até resultado |
| Métrica de saúde | Está saudável? | erro %, latência p95 |

## Métricas e tracing (preset opt-in)

- Padrão recomendado: **OpenTelemetry** (traces + métricas + logs correlacionados).
- Ative por stack quando o projeto exigir (serviços/web tipicamente sim; libs/CLIs muitas vezes
  não). Spans cobrem ações (§2.3) e fases do pipeline (§2.4).
- A escolha de backend (Prometheus, Grafana, vendor) é decisão do projeto.

## Checklist mínimo por funcionalidade

- [ ] Logs estruturados com `correlation_id` nos caminhos principais e de erro.
- [ ] Sinais Data-First de uso e resultado emitidos conforme a Spec.
- [ ] Sem PII/segredos nos sinais.
- [ ] Tracing/métricas quando o preset estiver ativo.
