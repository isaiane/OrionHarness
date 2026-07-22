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
  (`Issue → branch → commit → PR`, fundações §1.5; na **fast-lane issue-less** —
  `AGENTS.md` §11.2 — `branch → commit → PR → merge`, sem Issue).

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

### Sinal de processo (lane) — Data-First do fast-lane (ADR-0017)

A **fast-lane** (`AGENTS.md` §11.2/[ADR-0017](decisions/0017-fast-lane-baixo-risco.md)) responde às
perguntas Data-First (§9.1) com um sinal `lane` de baixo custo, **capturado por PR** (sem PII):

- **Captura:** o par **`(classe, lane)`** na seção "Classe de confiança (§11) e via" do
  [PR template](../.github/PULL_REQUEST_TEMPLATE.md) — `lane ∈ {full, fast}` —, contável no histórico
  de PRs (via label `lane:fast` opcional ou parse do corpo). Não exige pipeline de eventos novo.
- **Em uso?** proporção de PRs `lane:fast` sobre o total — adoção da via.
- **Gerou o resultado?** entre os `fast`: **taxa de retrabalho/rollback** (revert, reabertura, fix
  imediato) e **tempo de ciclo até o merge**, medido a partir do **evento de início de cada rota** —
  para o `full`, a **criação da Issue SDD** (marco único e comparável, que já inclui a cerimônia
  Issue/ADR); para o `fast`, a **criação da branch `fast/<slug>`** (sem cerimônia). Medir ambos da *abertura do PR*
  seria injusto: o PR só abre **após** o Build nas duas rotas, escondendo justamente a cerimônia que a
  via remove. Meta: `fast` sem aumento de retrabalho e com **ciclo total menor** que o `full` de mesma classe.
- **Guarda de risco (auditável no review):** **zero** PRs `lane:fast` com classe **T2+**, tocando
  governança ou dado sensível — qualquer ocorrência é um escape a corrigir (via → `full`).

### Sinal de processo (cross_model) — Data-First da revisão cross-model (ADR-0018)

O **protocolo cross-model** (`AGENTS.md` §2/[ADR-0018](decisions/0018-revisao-cross-model.md)) responde
às perguntas Data-First (§9.1) com um sinal `cross_model` de baixo custo, **por PR**, sem PII. É o
mesmo padrão do sinal `lane`: campo declarado no corpo do PR, contável no histórico — **sem** pipeline
de eventos novo.

- **Campos:** `implementer` (modelo que implementou), `reviewer` (modelo que revisou/derivou os testes),
  `route ∈ {human_merge, escalate_human, blocked}` — o desfecho do predicado
  [`cross-model-review.ts`](examples/cross-model-review.ts) — e, **só quando a escalação foi por
  divergência** (`route = escalate_human` **causado por `testsPass === false`**, i.e. o teste do
  revisor falhou — **não** as escalações por T3, autorrevisão, testes não-do-revisor ou descritor
  malformado, que não têm desfecho de arbitragem de bug), `arbitration_outcome ∈ {bug, noise,
  issue_ambiguity, pending}` — a **classificação do humano** que arbitrou (registrada na resolução da
  escalação; `pending` até arbitrar). Sem esse campo a métrica de resultado abaixo é incalculável. Sem
  PII (identificadores de modelo, não de pessoa).
- **Owner/gatilho/quando:** **owner = o revisor** da fase _Review_; **gatilho = a rodada de review** de
  cada PR de tarefa gerado por agente; **quando = no relatório de review anexado ao PR** (ou o
  par no corpo do PR). O gatilho/owner explícito satisfaz a regra de **artefatos vivos** (checklist do
  Harness §5) — o sinal não fica como princípio órfão.
- **Em uso?** proporção de PRs com `implementer ≠ reviewer` registrado sobre o total revisado.
- **Gerou o resultado?** entre os **divergentes** (só as escalações por `testsPass === false`, **não**
  toda `escalate_human`): **taxa de `arbitration_outcome = bug`** (a divergência pegou um bug real)
  **vs. `noise`/`issue_ambiguity`** — computável **só** com o campo de arbitragem acima e com o
  denominador restrito à divergência. Guarda dura: **zero** PRs mergeados com `implementer == reviewer`
  (autorrevisão).
- **Captura — opcional e diferida (por escopo):** hoje o sinal é **registrável** (relatório/corpo do
  PR) mas **não obrigatório por PR**. A **captura mandatória e a orquestração real** de "modelo B
  escreve os testes" ficam **fora do escopo da T5.2** (evolução — ver ADR-0018 §Consequências e a Issue
  T5.2 §Fora de escopo); quando essa orquestração existir, promover o campo a obrigatório no
  [PR template](../.github/PULL_REQUEST_TEMPLATE.md), como o `lane`.

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
- **Correlação:** a linha carrega o `correlation_id` da base (liga `Issue → branch → commit → PR`; ou
  `branch → commit → PR → merge` na fast-lane issue-less — ver acima), para agregar custo por
  tarefa/execução e auditar sem a sessão original.
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
