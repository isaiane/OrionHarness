# Investigação (T8.2 / #128) — A raiz do drift por duplicação nas convenções de governança

> **Spike** do épico **O8** (higiene sustentável do estado). Motivação: o PR **#126** (T8.1a) passou
> por **9 rodadas** de Harness Review em que a **mesma classe de achado reincidiu** — "a regra não está
> aplicada **também** neste outro artefato". Este documento faz a **varredura**, caracteriza a **raiz** e
> **propõe** a correção na origem, reusando os padrões que o Orion já usa ([ADR-0019](../decisions/0019-nucleo-l0-condensado.md),
> [ADR-0023](../decisions/0023-indice-gerado-de-adrs.md)). **É descoberta, não implementação** — a
> correção vira follow-up próprio (ver §4).

## 1. Inventário — onde cada regra transversal é (re)afirmada

Varredura repo-wide (`grep` por marcadores da regra; exclui `.orion/`, `node_modules`, `CHANGELOG`).

### 1a. Convenção de roteamento (história→CHANGELOG · status→Issue · ponteiro→STATE) — ADR-0024

Fonte canônica atual: `AGENTS.md` §4 e
[`docs/decisions/0024-estado-enxuto-roteamento-historia-status.md`](../decisions/0024-estado-enxuto-roteamento-historia-status.md).

| Papel | Artefato | Linhas | O que reafirma |
|---|---|---:|---|
| Canônico | `AGENTS.md` | 208-226 | Regra de compactação: história→`CHANGELOG`, status→Issue/ledger/`PLAN`, orientação→`STATE`. |
| Canônico | `docs/decisions/0024-estado-enxuto-roteamento-historia-status.md` | 41-57 | Invariante e tabela canônica história-vs-status. |
| Canônico | `docs/decisions/0024-estado-enxuto-roteamento-historia-status.md` | 99-130 | Checklists como cobrança primária e T8.1b como rede futura. |
| Espelho | `AGENTS.md` | 52 | Fase Ship resume o estado roteado: `STATE` ponteiro, `CHANGELOG` história, Issue/ledger status. |
| Espelho | `AGENTS.md` | 538-540 | DoD global repete o roteamento, incluindo exceção fast-lane para status→PR. |
| Espelho | `docs/harness-reviewer-checklist.md` | 80-85 | Harness Review cobra que `STATE.md` toque só ponteiro e que narrativa/status sejam roteados. |
| Espelho | `docs/agent-reviewer-checklist.md` | 99-103 | Product Review cobra o mesmo invariante para PRs de produto. |
| Espelho | `.github/PULL_REQUEST_TEMPLATE.md` | 40-41 | Checklist do autor cobra estado roteado e projeção no ledger. |
| Espelho | `.github/ISSUE_TEMPLATE/sdd-task.yml` | 110 | DoD da Issue repete a regra em label de checkbox. |
| Espelho | `CONTRIBUTING.md` | 39-44 | Fluxo Ship instrui o autor a rotear estado no fechamento. |
| Espelho | `CONTRIBUTING.md` | 136-137 | Exceção do gerador com bug reforça que detalhe fica na Issue e `STATE` só recebe ponteiro curto. |
| Espelho | `docs/getting-started.md` | 140-145 | Ritual get-bearings define o `STATE` como ponteiro e o `CHANGELOG` fora do read-path. |
| Espelho | `docs/getting-started.md` | 211-212 | Ciclo de evolução resume o roteamento na etapa Ship. |
| Espelho | `MEMORY.md` | 29-30 | Índice de memória instrui o fechamento por camada. |
| Espelho | `STATE.md` | 3-8 | O próprio ponteiro documenta seu limite: não guardar história/status por item. |
| Espelho | `README.md` | 61 | Diagrama do ciclo inclui roteamento de estado após merge. |
| Espelho | `PLAN.md` | 119-140 | Mapa do épico O8 descreve T8.1a/T8.1b e repete a regra de atualização do ponteiro. |
| Histórico/projeção | `CHANGELOG.md`, `feature-ledger.json`, `docs/decisions/README.md` | — | Evidência histórica/gerada; não deve ser editada para "corrigir" prosa normativa passada. |

Há pelo menos 15 reafirmações normativas ou operacionais da mesma regra. Elas têm papéis diferentes,
mas hoje não há um artefato que declare esse conjunto como "espelhos esperados", nem um check que falhe
quando um novo template/checklist menciona `STATE` sem citar o ADR-0024 ou sem preservar o invariante.

### 1b. Exceção da fast-lane (status→PR · Issue/ledger N/A) — ADR-0017/§11.2

Fonte canônica atual: `AGENTS.md` §11.2 e
[`docs/decisions/0017-fast-lane-baixo-risco.md`](../decisions/0017-fast-lane-baixo-risco.md). O
predicado executável fica em [`docs/examples/fast-lane-eligibility.ts`](../examples/fast-lane-eligibility.ts).

| Papel | Artefato | Linhas | O que reafirma |
|---|---|---:|---|
| Canônico | `AGENTS.md` | 452-530 | Seção §11.2: elegibilidade, PR leve, correlação issue-less, saída mid-build e predicado. |
| Canônico | `docs/decisions/0017-fast-lane-baixo-risco.md` | 21-53 | Decisão fundadora: o que remove, o que mantém, rastreabilidade issue-less. |
| Canônico | `docs/decisions/0017-fast-lane-baixo-risco.md` | 98-102 | Conformidade/review: revisor confere elegibilidade e roda predicado. |
| Executável | `docs/examples/fast-lane-eligibility.ts` | 1-9, 59-106 | Predicado `fast|full|blocked`. |
| Executável | `docs/examples/fast-lane-eligibility.test.ts` | 4-94 | Casos canônicos para o predicado. |
| Espelho | `AGENTS.core.md` | 17-18, 34, 60 | Núcleo sempre carregado resume a exceção: dispensa Issue/ADR, nunca merge humano. |
| Espelho | `AGENTS.md` | 17-20 | Princípio Spec-Driven com exceção fast-lane. |
| Espelho | `AGENTS.md` | 50, 180-189 | Pipeline e gates explicam escopo declarado no PR leve e ausência de pré-build G1. |
| Espelho | `AGENTS.md` | 272-279 | Fluxo Git e WIP definem `fast/<slug>`, commits sem `#<nº>` e exceção de replanejamento. |
| Espelho | `AGENTS.md` | 538-548 | DoD repete como fast-lane altera estado/status e ledger. |
| Espelho | `README.md` | 55, 71-77 | Diagrama e explicação pública da rota tracejada. |
| Espelho | `CONTRIBUTING.md` | 46-53 | Fluxo do contribuidor para fast-lane. |
| Espelho | `CONTRIBUTING.md` | 63, 72, 89-91 | Branch, commits e PR issue-less. |
| Espelho | `.github/PULL_REQUEST_TEMPLATE.md` | 2-15 | Instruções e seção de critério de aceite para PR leve. |
| Espelho | `.github/PULL_REQUEST_TEMPLATE.md` | 35, 40-47 | Checklist/DoD, estado, ledger e `Lane: fast`. |
| Espelho | `docs/harness-reviewer-checklist.md` | 18-24, 40-41, 74, 84 | Review de governança interpreta itens de Issue contra a descrição do PR leve. |
| Espelho | `docs/agent-reviewer-checklist.md` | 14-21, 29-32, 51, 96-102 | Review de produto aplica a variante issue-less. |
| Espelho | `docs/observability.md` | 46-58 | Sinal Data-First `lane` por PR. |
| Espelho | `docs/architecture/foundations.md` | 65-67, 172-173 | Fundações de auditoria e modelo de confiança citam a exceção. |
| Espelho | `docs/getting-started.md` | 177, 214-218 | Ritual e ciclo de evolução citam exceção WIP/G1 e linkam ADR/predicado. |
| Espelho | `docs/runbooks/github-projects.md` | 37-38 | Runbook do Project troca correlação Issue→PR por branch→PR na fast-lane. |
| Espelho | `docs/decisions/0018-revisao-cross-model.md` | 41-43, 80 | Cross-model review usa a descrição do PR leve como fonte issue-less. |
| Espelho | `docs/decisions/0024-estado-enxuto-roteamento-historia-status.md` | 49 | ADR-0024 incorpora a exceção status→PR para roteamento. |
| Histórico/projeção | `feature-ledger.json` | — | Projeção histórica append-only; evidencia a propagação passada, mas não é alvo de correção normativa. |

**Observação-chave:** cada rodada do #126 flagrou **mais um** desses espelhos sem a exceção fast-lane
(§4 → DoD → ADR → 2 checklists → PR template → Issue template → CONTRIBUTING → getting-started…). Não
por descuido pontual — **por não haver mecanismo que garanta que todos concordam**.

## 2. Raiz — por que a classe existe (a brecha)

**A brecha: regra transversal duplicada em prosa, sem fonte única nem guard de coerência.**

1. **Duplicação sem derivação.** Não há uma **fonte canônica única** da qual os espelhos **derivem**
   (ou contra a qual sejam **checados**). `AGENTS.md §4` e o ADR-0024 são ambos "canônicos", e os ~10
   espelhos são **cópias manuais** — cada uma é um ponto independente de drift.
2. **Revisão manual é estruturalmente incompleta.** A garantia atual é a Harness Review (humana/LLM).
   Um revisor encontra **um** espelho divergente por vez; a completude ("todos concordam") **não é
   verificável por construção** — daí o whack-a-mole (9 rodadas, mesma classe).
3. **Afirmações de completude sem check verificável são dívida.** No #126, "zero perda" e "propaguei a
   todos" foram ditas **na mão** e estavam **incompletas** (a migração Issue→PR reincidiu 2 rodadas até
   uma checagem robusta — "todo PR do STATE antigo × CHANGELOG → vazio" — encerrar). Afirmar completude
   sem um **predicado que a comprove** é a própria fonte da reincidência.

**A ironia diagnóstica:** esta é **a mesma falha que a T8.1 corrige no `STATE.md`** — duplicação de
conteúdo entre camadas gera drift. O Orion **já resolve** isso onde a duplicação foi enfrentada de
frente: **[ADR-0019](../decisions/0019-nucleo-l0-condensado.md)** (o núcleo L0 é **visão derivada** +
guard `coreMapDrift` que cruza o mapa humano com o manifesto) e **[ADR-0023](../decisions/0023-indice-gerado-de-adrs.md)**
(o índice de ADRs é **gerado** + `--check` anti-drift). A brecha é que esse padrão **não foi aplicado
às regras de governança propagadas** — só a artefatos-índice.

## 3. Proposta — fechar a classe na origem (não spot-a-spot)

Reusar o padrão **visão-derivada/checada + guard** (ADR-0019/0023), escolhendo por espelho o mecanismo
**mais barato** que fecha o drift (postura lean/§7 — nada de framework):

- **Opção A — Fonte canônica + guard de coerência (recomendada p/ prosa).** Marcar **uma** afirmação
  como canônica (candidato: um bloco nomeado no ADR-0024 e/ou `AGENTS.md §4`) e um guard no
  `scripts/smoke-test.sh` que verifica que cada **espelho registrado** (lista explícita de arquivos)
  **cita/aponta** a fonte e **não a contradiz** — espelhando o `coreMapDrift`. Barato; não exige gerar
  prosa.
- **Opção B — Geração dos trechos-espelho.** Onde o espelho é estruturado (itens de checklist, linhas
  de template), **gerar** o trecho a partir da fonte (como o índice de ADRs). Elimina o drift por
  construção, mas custa tooling por formato (YAML do Issue template, Markdown dos checklists).
- **Opção C — Checks de completude verificáveis** para afirmações de exaustividade. Sempre que um PR
  afirmar "propagado a todos" / "zero perda", anexar um **predicado rodável** que o comprove (ex.: "todo
  `PR #NN` do STATE antigo aparece no CHANGELOG"). Transforma a afirmação num teste, não numa promessa.

**Recomendação de desenho:** **A + C** primeiro (barato, fecha o grosso), **B** só onde o espelho é
estruturado o suficiente para valer o tooling. O guard deve mirar o **invariante** (espelhos concordam
com a fonte), não a forma — coerente com a lição do próprio ADR-0024 (heurística ≠ garantia; a revisão
humana continua sendo a rede semântica).

### Fatiamento sugerido da correção (cada fatia = Issue/PR própria)
- **F1:** registrar a **lista de espelhos** por regra transversal (roteamento; fast-lane) + o **guard
  de coerência** (Opção A) para a regra de **roteamento** (a que doeu no #126).
- **F2:** estender o guard à exceção **fast-lane** (a 2ª classe reincidente).
- **F3 (condicional):** geração (Opção B) dos espelhos estruturados que valerem o tooling.
- **F4:** convenção de **check de completude** (Opção C) no PR template para afirmações de exaustividade.

Rascunhos de follow-up (aguardam G1 próprio antes de qualquer implementação):

| Rascunho | Título sugerido | Gate esperado | Entrega |
|---|---|---|---|
| T8.3 | ADR: governança de regras transversais e espelhos registrados | G2 | Decidir fonte canônica, espelho, classificação de ocorrência e limite do guard. |
| T8.4 | Guard mínimo de espelhos para roteamento de estado | G1 dentro do ADR aprovado | Manifesto + `rule-mirror-check` cobrindo ADR-0024/§4, fiado no smoke-test. |
| T8.5 | Estender guard à fast-lane T1 | G1 dentro do ADR aprovado | Manifesto/guard cobrindo ADR-0017/§11.2 e espelhos issue-less. |
| T8.6 | Política de evidência para afirmações de completude | G1 ou G2 se alterar template/processo | PR template/checklists exigem predicado ou evidência quando o PR afirmar "zero perda"/"propagado a todos". |
| T8.7 | Avaliar geração de blocos repetidos | G1; G2 se virar contrato de autoria | Decidir se YAML/Markdown de templates/checklists deve ser gerado em vez de apenas checado. |

## 4. Recomendação de gates e escopo

- **Esta investigação (T8.2/#128):** **G1** (spike/descoberta) — entrega este relatório.
- **A correção:** provavelmente **G2/ADR** — ela **muda como as regras de governança vivem** (introduz a
  noção de "fonte canônica + espelhos registrados + guard"), o que é decisão arquitetural. Propor um ADR
  novo na F1, reusando ADR-0019/0023 como precedente. As fatias F1–F4 viram Issues próprias (aguardando
  G1 cada).
- **Fora de escopo desta investigação:** implementar o guard/geração (é F1+); reabrir o **conteúdo** das
  convenções (roteamento/fast-lane estão fixados); o guard de tamanho do STATE (T8.1b/#127, problema
  distinto).

## 5. Nota de método (o defeito recursivo)

Esta própria investigação corre o risco de ser **incompleta** (o defeito que ela descreve). Por isso a
Opção C é parte da proposta: a correção deve **provar** sua completude com um predicado, não afirmá-la.
O inventário do §1 deve ser tratado como **ponto de partida verificável** (a lista de espelhos vira
input do guard da F1), não como uma varredura manual definitiva.
