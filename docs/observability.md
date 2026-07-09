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

## Eventos de domínio (quando event-driven for adotado)

Quando o projeto adota **event-driven** (opt-in — `AGENTS.md` §7, fundações §2.2), mudanças de
estado relevantes são **eventos** explícitos, versionados e auditáveis, carregando `correlation_id`.

## Data-First — instrumentação de uso e resultado

Para cada funcionalidade, a Spec (§9.1) define **como saber que está sendo usada**, **se gerou o
resultado esperado** e **quais eventos/métricas capturar**. Implemente esses sinais como parte da
entrega e cubra-os com testes (`testing-strategy.md`).

| Sinal | Pergunta que responde | Exemplo |
|-------|----------------------|---------|
| Evento de uso | Está sendo usada? | `feature.x.invoked` |
| Métrica de resultado | Gerou o resultado esperado? | taxa de sucesso, tempo até resultado |
| Métrica de saúde | Está saudável? | erro %, latência p95 |
| Custo por execução | Quanto custou / qual a eficiência? | `agent.execution.cost` |

## Métricas e tracing (preset opt-in)

- Padrão recomendado: **OpenTelemetry** (traces + métricas + logs correlacionados).
- Ative por stack quando o projeto exigir (serviços/web tipicamente sim; libs/CLIs muitas vezes
  não). Spans cobrem ações (§2.3) e fases do pipeline (§2.4).
- A escolha de backend (Prometheus, Grafana, vendor) é decisão do projeto.

## Custo/tokens por execução (preset opt-in)

Num projeto conduzido por agentes, **custo e tokens por execução** são sinal de primeira ordem (unit
economics, eficiência de contexto). Esta convenção fixa **o formato do sinal e o gatilho de emissão**;
a instrumentação concreta é **por projeto**. É um **preset opt-in por stack** — o mesmo balde do §9 que
métricas/tracing: **libs/CLIs podem dispensar**; **serviços/pipelines de agente tipicamente ativam**.
Não é convenção base/universal (não embuta num runtime de agente específico).

**Sinal — objeto `cost` no log estruturado.** Estende o [Logging estruturado](#logging-estruturado-base-universal)
base (não substitui): a mesma linha JSON, com um objeto `cost` e um `event` dedicado.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `cost.model` | string | Id do modelo usado (é identificador, **não** credencial — §10). |
| `cost.tokens_input` | number | Tokens de entrada (prompt). **Fato** medido. |
| `cost.tokens_output` | number | Tokens de saída (completion). **Fato** medido. |
| `cost.tokens_total` | number | `tokens_input + tokens_output`. **Fato** medido. |
| `cost.usd` | number | Custo **ESTIMADO** em USD (ver abaixo). |

- **Evento:** `agent.execution.cost`, emitido **uma vez por execução** de agente.
- **Correlação:** a linha carrega o `correlation_id` da base (liga `Issue → branch → commit → PR`),
  para agregar custo por tarefa/execução e auditar sem a sessão original.
- **`cost.usd` é ESTIMADO, não faturado.** Os contadores de token (`tokens_input`/`tokens_output`/
  `tokens_total`) são **fato** medido; o `usd` é **derivado** de preço de tabela (tokens × preço por
  1k) — uma **estimativa**. Nunca o trate como valor faturado (o preço real varia por contrato, tier,
  câmbio e arredondamento do fornecedor).
- **Sem PII/segredos (§10).** O sinal carrega só id de modelo, contadores e a estimativa — nada de
  conteúdo de prompt/resposta, credenciais ou dado de usuário.
- **Idioma (política única).** `event` e **nomes de campo** são sempre em **EN** (`agent.execution.cost`,
  `cost.tokens_input`, …), estáveis para agregação entre projetos. O texto livre (`message`) segue uma
  **política única por projeto** — aqui, o **idioma de documentação do repositório** (pt-BR) — para não
  misturar idiomas na mesma frota de logs.

Exemplo mínimo rodável: [`examples/observability-cost-log.ts`](examples/observability-cost-log.ts)
(tipos do sinal + `estimateUsd` + montagem do evento). Roda sem toolchain:

```sh
node --experimental-strip-types docs/examples/observability-cost-log.ts
# → uma linha JSON com event "agent.execution.cost" e o objeto cost
```

## Checklist mínimo por funcionalidade

- [ ] Logs estruturados com `correlation_id` nos caminhos principais e de erro.
- [ ] Sinais Data-First de uso e resultado emitidos conforme a Spec.
- [ ] Sem PII/segredos nos sinais.
- [ ] Tracing/métricas quando o preset estiver ativo.
- [ ] Sinal de custo/tokens (`agent.execution.cost`) emitido quando o preset estiver ativo.
