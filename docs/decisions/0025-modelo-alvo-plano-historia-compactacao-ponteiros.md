# ADR-0025 — Modelo-alvo de plano, história, compactação e ponteiros

> Architecture Decision Record (`AGENTS.md` §3, gate G2). ADRs são **append-only**: uma decisão
> revista não é apagada — cria-se um novo ADR que a substitui.
>
> **Ao criar um ADR — ou mudar seu número/título/status/nome —, regenere o índice** e commite o
> `README.md`: `node --experimental-strip-types tools/adr/adr-index.ts --write`
> ([ADR-0023](0023-indice-gerado-de-adrs.md)).

- **Status:** proposto  <!-- humano aprova (G2) → muda para: aceito -->
- **Data:** 2026-08-07 (proposto)
- **Decisores:** Isa (owner) — aprovação humana (gate **G2**)
- **Relacionado a:** épico **O9** (fim do Markdown autoral como fonte); `AGENTS.md` §4 (camadas +
  Regra de compactação); **supersede parcialmente** [ADR-0024](0024-estado-enxuto-roteamento-historia-status.md)
  (só a parte "história→CHANGELOG"); [ADR-0006](0006-ledger-executavel-de-tarefas.md) (ledger como
  fonte de status), [ADR-0014](0014-semantica-ledger-as-accepted.md) (semântica do ledger),
  [ADR-0016](0016-politica-projecao-ledger.md) (política de projeção do ledger),
  [ADR-0022](0022-lifecycle-passes-ledger.md) (lifecycle de `passes`); padrão visão-derivada+guard de
  [ADR-0019](0019-nucleo-l0-condensado.md)/[ADR-0023](0023-indice-gerado-de-adrs.md); precedido pela
  investigação T8.2 (#128, raiz do drift por duplicação).

## Contexto

O épico **O8** diagnosticou que regras e conteúdo transversais **duplicados em prosa Markdown** geram
drift por construção: o `STATE.md` inflou porque a Regra de compactação (§4) mandava "atualize o STATE"
sem rotear ([ADR-0024](0024-estado-enxuto-roteamento-historia-status.md)); e a investigação T8.2 (#128)
mostrou a **mesma classe** em ~15 espelhos da regra de roteamento e em outros tantos da fast-lane — sem
fonte única nem guard de coerência. A cura que o Orion **já aplica** a artefatos-índice é
**visão-derivada + guard** ([ADR-0019](0019-nucleo-l0-condensado.md) para o núcleo L0;
[ADR-0023](0023-indice-gerado-de-adrs.md) para o índice de ADRs).

Duas fontes **autorais em Markdown** continuam sendo a maior superfície de drift:

- **`PLAN.md` (+ `docs/plans/<épico>.md`), camada L1.** Mapa de épicos editado à mão. É lido como
  **fonte** no read-path do get-bearings (`docs/getting-started.md` §7, passo 3) e referenciado
  normativamente em `MEMORY.md`, `STATE.md` e `CONTRIBUTING.md`. Ao mesmo tempo, a **Issue SDD (L2) já
  é a fonte da verdade** de status e contexto da tarefa ([ADR-0006](0006-ledger-executavel-de-tarefas.md)):
  o `PLAN.md` **reflete**, não substitui. Manter um mapa autoral paralelo às Issues é duplicação.
- **`CHANGELOG.md`, camada L5.** Histórico autoral em prosa. O [ADR-0024](0024-estado-enxuto-roteamento-historia-status.md)
  (aceito em 2026-08-04) acabou de fixar "história → `CHANGELOG.md`" como destino do roteamento — mas
  o GitHub **já registra "o que mudou por PR"** em PRs/Issues, de forma estruturada e consultável. O
  CHANGELOG duplica isso à mão.

Restrições de governança relevantes:

- **Contexto em artefatos versionados** (§1, Princípio 3): o plano e a história precisam ser legíveis
  **offline** e num **clone limpo** — o Orion **é um template repository**; um adotante clona sem
  Issues/Project populados.
- **Append-only não é imutável para sempre.** Ledger, CHANGELOG e ADRs podem ser **supersedidos ou
  migrados**, mas só com **autorização humana explícita no gate correto** (G2). O agente **propõe**; não
  decide "atualizar o modelo" sozinho ([ADR-0016](0016-politica-projecao-ledger.md); §1 Princípio 1).
- **Não empilhar mais um guard sobre o caos.** O alvo do O9 é **reduzir artefatos autorais e eliminar
  duplicação**, deixando papéis claros (plano, história, ponteiro, espelho, projeção, relatório) — o
  guard vem **depois** de reduzir a superfície, não no lugar disso.
- **Ledger é projeção de _verificação_, não histórico narrativo.** O `feature-ledger.json` guarda
  `passes:true/false` por critério ([ADR-0006](0006-ledger-executavel-de-tarefas.md)/[0014](0014-semantica-ledger-as-accepted.md)/[0022](0022-lifecycle-passes-ledger.md));
  sobrecarregá-lo com "o que mudou por PR" seria overload semântico.

## Decisão

Adotamos um **modelo-alvo** de plano, história, compactação e ponteiros. Este ADR **decide o modelo e
autoriza um conjunto de fatias**; ele **não** implementa nada — cada remoção/edição é uma fatia própria
(O9). Nenhuma edição constitucional ou remoção de artefato ocorre antes deste ADR aceito.

**1. Fonte autoritativa do plano — GitHub Issues/Sub-issues/Projects (épico = Milestone).**
O **plano operacional vive em Issues/Sub-issues/Projects**: a Issue SDD L2 já é a fonte da verdade da
tarefa; o **épico** é marcado pelo **Milestone** (constituição §6 — **mantido** como o **único mapa
autoritativo de épicos**, sem hierarquia paralela), com o **Project** como board/visão derivada e as
**Sub-issues** agrupando as tarefas sob o épico. O que este ADR **aposenta é a tabela autoral de épicos
do `PLAN.md`**, **não** o Milestone. O **`PLAN.md` e `docs/plans/` deixam de ser fonte autoral** — viram
**stub-ponteiro transitório** (curto, apontando para Milestones/Project/Issues) ou são removidos quando
todos os consumidores tiverem migrado. Qualquer ajuste de redação do §6/§2 sobre essa hierarquia viaja
**dentro** da fatia de migração de referências (T9.3b/T9.5a), não fora dela.

**2. Representação offline do plano — derivável por gerador (existe _antes_ da remoção).**
A leitura humana/offline do plano é um **relatório gerado sob demanda** em `.orion/tmp/reports/plan.md`
(scratch, gitignored — **não** vira fonte versionada). O **gerador é implementado _antes_** de o
`PLAN.md` deixar de ser fonte (fatia T9.3), de modo que **não há janela** em que o get-bearings fique
sem fonte de plano. Num clone limpo (template-repo) sem Issues, o **stub-ponteiro** explica onde o
plano passa a viver e como gerar o relatório — a representação é **derivável**, satisfazendo o §1
Princípio 3 sem reintroduzir um mapa autoral versionado.

**3. Fonte autoritativa da história — PRs _mergeados_ do GitHub; `CHANGELOG.md` deixa de ser autoral.**
O **histórico primário** de "o que mudou, datado, por-PR" passa a ser **PRs mergeados do GitHub**
(estruturado, consultável por agente e humano). **Contrato de história (imutável):** a história é
definida por **PRs _mergeados_** — PRs **abertos** ou **fechados-sem-merge** **não** contam como entrega
— e pelos **dados imutáveis do merge** (merge commit + diff + timestamp de merge); metadados
**editáveis** (título/corpo do PR/Issue) **não** são a fonte de verdade do que foi entregue. Se a T9.4a
precisar de estabilidade além do que a API expõe no momento da leitura, ela **persiste uma projeção
append-only** desses campos (não reescrevível). Para offline/template-repo, um **índice/projeção fina
gerado** sob demanda basta; nenhuma prosa autoral é mantida à mão. O **`CHANGELOG.md` deixa de ser
fonte autoral** — vira **stub** apontando para a fonte estruturada. O **texto histórico já existente no
`CHANGELOG.md` é preservado congelado** (append-only, point-in-time — **não** se faz backfill narrativo
massivo nem se reescreve prosa passada).

**4. O ledger permanece projeção de verificação — não vira histórico.**
O `feature-ledger.json` continua como **projeção de verificação** (`passes`/critérios;
[ADR-0006](0006-ledger-executavel-de-tarefas.md)/[0014](0014-semantica-ledger-as-accepted.md)/[0016](0016-politica-projecao-ledger.md)/[0022](0022-lifecycle-passes-ledger.md)).
**Critério ledger vs. `history.json`:** a história **reusa** as fontes que já existem (PRs/Issues) e o
ledger **não** é sobrecarregado. Um artefato novo `history.json` **só é criado se a fatia T9.4
demonstrar lacuna real** (algo que PRs/Issues + índice gerado não cobrem para o read-path **offline**
do agente); nesse caso ele nasce com **schema versionado + guard** e **não** se mistura ao ledger.
**Gatilho operacional de G2 na T9.4:** esse julgamento **não** é feito dentro do G1 — se a T9.4
concluir que PRs/Issues + índice gerado **não cobrem** o read-path offline do agente, ela **para e abre
G2** *antes* de criar qualquer artefato novo (`history.json`). Alterar a semântica do ledger para
carregar história **exige novo ADR (G2)**.

**5. Markdown manual vira ponteiro, stub ou relatório gerado — não fonte.**
Os demais artefatos em Markdown (`README`, `getting-started`, `MEMORY`, `runbooks`, ADRs correlatos)
passam a **apontar** para a fonte canônica em vez de reafirmar a regra por extenso. Texto operacional
inevitável fica **apenas** em templates/checklists. Fontes canônicas ficam **explícitas**.

**6. Invariante `STATE = ponteiro` preservado; supersedência _parcial_ do ADR-0024.**
Este ADR **supersede o [ADR-0024](0024-estado-enxuto-roteamento-historia-status.md) apenas na parte
"história → `CHANGELOG.md`"** (agora: história → histórico estruturado / PRs-Issues). **Todo o resto do
ADR-0024 permanece**: STATE é ponteiro (`Agora`/`Próximo passo`/`última conclusão` + estado
forward-looking); STATE nunca guarda cadeia narrativa nem status por-item; a tabela de decisão
história-vs-status segue válida, com "história" agora roteada para a fonte estruturada. O ADR-0024
recebe **nota de cabeçalho** "parcialmente superseded por ADR-0025".

**7. Redação integral do novo `AGENTS.md §4`.**
Esta decisão carrega o **texto exato** do §4 pós-supersedência (bloco abaixo, "Redação integral do §4").
As fatias posteriores **apenas aplicam** esse texto (é **aplicação G1**, não nova edição
constitucional), dividido por transição de fonte (linha L1 na T9.3b, linha L5 + roteamento na T9.4b). A frase de roteamento que hoje se repete em `AGENTS.md` §4, `docs/getting-started.md` e
`MEMORY.md` passa a ter **uma fonte** (o §4) e ponteiros nos demais.

**8. Regra de endurecimento (append-only + autorização humana) — e sua fronteira com este ADR.**
Uma fatia que toque **artefato append-only, semântica de histórico/ledger, plano, Regra de compactação
ou ADR aceito** exige **autorização humana no gate correto** e **declara no corpo da Issue/PR** a
supersedência que aplica:
> _"Esta mudança supersede/altera a decisão anterior **X**; declara exatamente o que muda; autorizada
> por **[gate]**."_

**Fronteira operacional (resolve o conflito regra × gates por fatia):** as fatias **T9.2–T9.7 já estão
autorizadas por este ADR (G2)** — logo correm em **G1 (aplicação)**, desde que **não excedam** o que
aqui foi decidido; cada uma cita este ADR como a autorização (ex.: _"aplica a redação do §4 do ADR-0025;
supersede o papel L1 do `PLAN.md`"_). Um **novo G2** só é exigido quando surge uma **decisão de
governança nova, não coberta por este ADR** — um *fork* de design (ex.: sobrecarregar o ledger, ou criar
`history.json` por lacuna real, §4 acima). Sem autorização no gate devido, o agente **só pode propor** —
não implementar. É um _restatement_ do §1 Princípio 1 + escalonamento de classe (§11: mexer em fonte
canônica é T2→G2; remover artefato versionado tende a T3/G3 no merge).

**9. Fatias autorizadas (sem big-bang) e seus gates.**

Cada fatia que **remove ou estuba** um artefato é precedida por uma fatia irmã de **adição pura** que
constrói o substituto. Isso torna "nenhuma janela sem fonte" **provável por ordem de merge**, não por
ordenação interna de um PR grande. O guardrail dos 3–4 arquivos (§7) é a **meta** de cada fatia; onde a
migração de referências for indivisível e o exceder (ver **T9.3b**), aplica-se a resposta do §7 —
sub-fatiar ou **registrar a exceção _vertical slice_ e escalá-la no G1** (como na T8.1a), nunca sprawl silencioso.

**Aplicação atômica regra+espelho (nenhuma janela com regra canônica contraditória).** Cada fatia que
transiciona uma fonte aplica, **no mesmo PR**, a mudança da **regra canônica** (§4) e de seus **espelhos
normativos** (§2/§12 e outros) correspondentes **àquela** fonte: a **linha L1** do §4 (plano) viaja com
a **T9.3b** (junto do stub do `PLAN.md`); a **linha L5** + o roteamento de história + os espelhos de
`CHANGELOG` em §2/§12 viajam com a **T9.4b** (junto do stub do `CHANGELOG.md`). Assim **nenhum merge
intermediário** deixa o §4 (ou um espelho normativo) **nomeando um artefato já estubado** — a regra
canônica e o estado real transicionam juntos.

| Fatia | Escopo | Gate |
|---|---|---|
| **T9.2** | Classificação completa dos artefatos (manifesto: `source`/`pointer`/`mirror`/`history`/`projection`/`generated`/`temporary`/`deprecated`/`removed`), sem mutação destrutiva. Papel por par **(artefato, regra)** — um mesmo arquivo pode ser fonte de uma regra e espelho de outra. | **G1** (aplicação) |
| **T9.5b** | Reduzir espelhos da **fast-lane** (§11.2 / [ADR-0017](0017-fast-lane-baixo-risco.md)). | **G1** |
| **T9.3a** | Gerador de plano offline (saída `.orion/tmp/reports/plan.md`). **Adição pura.** | **G1** |
| **T9.3b** | Get-bearings + stub/remoção de `PLAN.md` e `docs/plans/`; refs **de plano** **+ aplica a linha L1 do §4** (fonte do plano) no mesmo PR. **Se a migração de refs exceder 3–4 arquivos, sub-fatiar ou registrar exceção _vertical slice_ (§7) no G1** — não sprawl. | **G1** |
| **T9.4a** | Índice/projeção de história a partir de PRs **mergeados** (campos imutáveis do merge). **Adição pura.** (`history.json` **só** se lacuna real → **G2**.) | **G1** |
| **T9.4b** | Stub de `CHANGELOG.md` **+** aplica a **linha L5 do §4** + o roteamento de história + os **espelhos de `CHANGELOG` em §2/§12** **+** cabeçalho do `STATE.md` (linhas 3–8, espelho de roteamento que cita `CHANGELOG`/`PLAN`) — tudo no mesmo PR (aplicação atômica). | **G1** (a redação do §4 já vem aqui aprovada; **novo G2** se surgir fork de design — ex.: sobrecarregar o ledger). |
| **T9.5a** | Reduzir espelhos do **roteamento** (§4), depois de a fonte assentar. | **G1** |
| **T9.6** | Guard de coerência mínimo (manifesto; ponteiro-para-fonte-removida; ref normativa a `PLAN`/`CHANGELOG`; schema da representação offline/história). | **G1** |
| **T9.7** | Relatórios sob demanda restantes em `.orion/tmp/reports/` (pendências, ADRs, status por issue). | **G1** |

Sequência obrigatória:
**T9.1 → T9.2 → T9.5b → T9.3a → T9.3b → T9.4a → T9.4b → T9.5a → T9.6 → T9.7.**

Justificativa da ordem, onde ela não é óbvia:

- **A fast-lane (T9.5b) vem antes das remoções.** A §11.2/[ADR-0017](0017-fast-lane-baixo-risco.md)
  **não é tocada** por este ADR: a fonte já era autoritativa antes do épico. Reduzir esses espelhos
  primeiro **valida o critério** "ponteiro onde o artefato explica / texto onde ele executa" e exercita
  o manifesto num terreno **estável**. Quando a T9.5a chegar, o critério já foi provado — em vez de
  estrear justamente na regra que acabou de mudar.
- **Adição antes de remoção, nas duas frentes.** T9.3a antes de T9.3b (plano) e T9.4a antes de T9.4b
  (história). A assimetria entre as duas — exigir o gerador para o plano e não exigir o índice para a
  história — seria arbitrária: as duas fatias estubam uma fonte do read-path.
- **Guard por último**, sobre uma superfície já reduzida (§7: não empilhar guard sobre o caos).

---

### Redação integral do §4 (substitui as linhas 192–241 atuais — aplicada em duas fatias)

Este bloco é o **§4 completo pós-edição** — não um recorte. Ele é o **alvo** das linhas **192–241**
atuais do `AGENTS.md`; o critério de aceite é **§4 final == este bloco** (após prefixar os links de ADR,
ver nota abaixo). Pela **aplicação atômica regra+espelho** (Decisão §9), ele é aplicado em **duas
fatias**, não de uma vez: a **linha L1** (plano) entra na **T9.3b**, junto do stub do `PLAN.md`; a
**linha L5** + a bala **História** + as duas expressões de roteamento (`→ CHANGELOG`/`→ Issue/ledger/PLAN`)
entram na **T9.4b**, junto do stub do `CHANGELOG.md`. **Cumulativamente**, ao fim da T9.4b, o §4 é
**idêntico a este bloco**. Só mudam: as linhas **L1** e **L5** da tabela de camadas, a introdução da
Regra de compactação, a bala **História** (→ histórico estruturado) e a bala **Status** (papel do
`PLAN.md`), e as duas expressões de roteamento no parágrafo "STATE é um ponteiro".
**Tudo o mais é preservado na íntegra** — em especial a referência à rede do guard `state-budget-check`
(**#127 / T8.1b**), a frase "As Issues SDD e os ADRs preservam o essencial fora da janela…" e o
parágrafo **Núcleo L0**.

**Nota de caminho de link.** Os alvos de link de ADR neste bloco estão em forma **doc-relativa**
(`0024-…`) porque este ADR mora em `docs/decisions/`; ao aplicar no `AGENTS.md` (raiz), a T9.4 os
prefixa com `docs/decisions/` — a forma **root-relativa** que o §4 já usa hoje. O critério da T9.4 é,
então, `§4 == este bloco` **após** esse prefixamento dos links de ADR (o restante é literal).

```markdown
## 4. Memória e contexto (camadas)

A memória do projeto é versionada em camadas. O agente deve mantê-las atualizadas:

| Camada | Artefato | Papel |
|--------|----------|-------|
| **L0** Guardrails | `AGENTS.md` (canônico), **`AGENTS.core.md`** (núcleo sempre-carregado), `CLAUDE.md`, `docs/architecture/foundations.md` | Regras, constituição e fundações arquiteturais |
| **L0.5** Contexto de produto | `docs/product/product-context.md`, `docs/product/spec.md` | Visão, domínio, regras de negócio e spec; insumo do _Plan_ e da §8.1; gate G0 |
| **L1** Plano | **GitHub Issues/Sub-issues/Projects** (fonte); relatório gerado em `.orion/tmp/reports/plan.md` (leitura offline, gitignored); `PLAN.md`/`docs/plans/` = **stub-ponteiro transitório** | Mapa de épicos e detalhamento; gate G1 |
| **L2** Execução | GitHub Issues (SDD) | **Fonte da verdade** de status e contexto da tarefa |
| — Índice | `STATE.md` | Ponteiro leve: épico/Issues ativas e fase atual (não duplica conteúdo) |
| **L3** Decisões | `docs/decisions/` (ADRs) | Decisões append-only |
| **L4** Estado vivo | `docs/runbooks/`, seção de estado | Como operar; riscos; próximos passos |
| **L5** Histórico | **PRs/Issues do GitHub** (fonte, por-PR); índice/relatório gerado sob demanda; `CHANGELOG.md` = **stub** apontando para a fonte estruturada (texto histórico congelado) | O que mudou, por ciclo |
| Índice geral | `MEMORY.md` | Navegação para tudo acima |

**Regra de compactação (roteie, não anexe — [ADR-0024](0024-estado-enxuto-roteamento-historia-status.md),
história parcialmente superseded por [ADR-0025](0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)):**
ao concluir cada tarefa/fase, **roteie** cada fato para a sua camada e **só então** compacte a sessão:

- **História** (o que foi feito, datado, por-PR) → **histórico estruturado**: o **PR/Issue** é o
  registro; o **`CHANGELOG.md` não é mais destino autoral** (é stub). O relatório de história é **gerado
  sob demanda** (`.orion/tmp/reports/`), não editado à mão.
- **Status de item** (critérios/`passes`) → a **Issue SDD** é a **fonte da verdade** (L2, ADR-0006);
  o **ledger** é a **projeção de verificação** (imutável, não autoral) e o **mapa de épicos/fase vive
  em Issues/Sub-issues/Projects** (L1; `PLAN.md`/`docs/plans/` = **stub-ponteiro transitório**).
  Atualize a **Issue** ao mudar o status real; ledger e mapa **refletem**, não substituem. Na
  **fast-lane** T1 issue-less (§11.2), sem Issue: o **PR leve** é o registro de critério/status
  (projeção no ledger/Issue = **N/A**) — mas o status **nunca** volta ao `STATE.md`.
- **Orientação** (onde estou, próximo passo, última conclusão) → **`STATE.md`** (L1) — **atualize
  apenas o ponteiro** (`Agora`/`Próximo passo`/`última conclusão`) e o estado _forward-looking_
  (riscos/pendências vivos, navegação), **não anexe narrativa**.
- **Riscos/pendências vivos:** o `STATE.md` é o **resumo canônico** (lista curta, forward-looking); os
  **runbooks L4** (`docs/runbooks/`, quando existirem) guardam o **detalhe operacional** — não duplique
  o mesmo risco nas duas camadas: STATE resume e aponta, o runbook detalha.

O **STATE é um ponteiro**: não guarda cadeia narrativa ("Antes…/Antes disso…") nem status por-item —
esses vazamentos são história (→ **histórico estruturado**) ou status (→ Issue/ledger). A **tabela de
decisão história-vs-status** (fronteira canônica) e o **invariante** vivem no [ADR-0024](0024-estado-enxuto-roteamento-historia-status.md)
(com "história" agora roteada à fonte estruturada — PRs/Issues —, [ADR-0025](0025-modelo-alvo-plano-historia-compactacao-ponteiros.md));
o **tamanho-alvo** do STATE é **config operacional** (não governança — recalibrar não exige ADR),
**a ser** verificado pela rede do guard `state-budget-check` (**fatia b / T8.1b — planejada, ainda não
ativa**), que será **heurística, não garantia** (guard verde **não** prova STATE limpo — a garantia é
a revisão humana; §8.1). As Issues SDD e os ADRs preservam o
essencial **fora** da janela de contexto, permitindo retomada futura sem a conversa original.

**Núcleo L0 (sub-partição, não redefinição).** O `AGENTS.core.md` é a **visão condensada
sempre-carregada** do L0 — as regras inegociáveis por sessão (Princípios §1, Gates §3, modelo de
confiança §11), com o detalhe carregado **sob demanda** por `§X`. É uma visão **derivada/checada**
deste `AGENTS.md` (canônico), **não** uma fonte paralela: em qualquer divergência, este documento
vence ([ADR-0019](0019-nucleo-l0-condensado.md)).

> Os artefatos L1–L5 são criados na Fase 2 da construção do harness. Até lá, este `AGENTS.md`
> define o contrato que eles seguirão.
```

## Alternativas consideradas

- **(A) Manter `PLAN.md`/`CHANGELOG.md` como fonte e só adicionar um guard de coerência** (a recomendação
  original do spike T8.2). Rejeitada como alvo do O9: **trata o sintoma** (mais um guard sobre a
  duplicação) em vez de **reduzir a superfície autoral**. O guard continua na proposta, mas como **rede
  depois** de cortar espelhos (T9.6), não no lugar da redução.
- **(B) Sobrecarregar o `feature-ledger.json` com histórico narrativo.** Rejeitada: overload semântico
  de um artefato que é **projeção de verificação** ([ADR-0006](0006-ledger-executavel-de-tarefas.md)/[0016](0016-politica-projecao-ledger.md));
  mistura "o que mudou" com "o que passou". História reusa PRs/Issues; `history.json` só por lacuna real.
- **(C) Manter um mapa de plano autoral versionado (Markdown ou JSON) como fonte.** Rejeitada: recria a
  duplicação Issue↔mapa que motiva o épico. O plano **é** as Issues/Project; a versão offline é
  **derivada** (gerada), não uma segunda fonte.
- **(D) Big-bang: remover `PLAN.md`/`CHANGELOG.md` e reescrever o §4 numa só mudança.** Rejeitada:
  estoura o guardrail dos 3–4 arquivos e quebraria o get-bearings no meio da migração. Daí o
  fatiamento com o offline **antes** da remoção.

## Consequências

- **Positivas.** Uma fonte por conceito: plano = Issues/Project, história = PRs/Issues, status = Issue
  (ledger projeta), orientação = STATE. Menos Markdown autoral → menos drift por construção (fecha a
  classe do T8.2 na origem, não spot-a-spot). Read-path do get-bearings mais barato e sem fonte
  duplicada. Relatórios humanos permanecem possíveis **sob demanda**, sem virar fonte.
- **Negativas / riscos + mitigação.**
  - *Dependência do GitHub para plano/história; garantia offline em **template-repo*** → **mitigação e
    limite explícito:** a garantia offline (§1 Princípio 3) vale para o **repo de origem**, onde o
    gerador **deriva** plano/história de Issues/PRs. Num **clone de adotante** — o Orion **é** um
    template repository —, sem Issues/PRs populados, o gerador produz **vazio** e os **stubs-ponteiro**
    explicam onde plano/história passam a viver e como gerar os relatórios: **plano e história vazios
    são o comportamento correto de um template**, não uma regressão. **Não** se cria snapshot versionado
    derivado — isso reintroduziria uma fonte autoral versionada, contra a tese deste ADR. *(Resolve a
    ambiguidade offline/template-repo para as fatias T9.3/T9.4, que herdariam a lacuna.)*
  - *Janela sem fonte de plano durante a migração* → **mitigação:** T9.3 implementa o gerador **antes**
    de estubar o `PLAN.md`; aceite exige "nenhuma janela sem fonte".
  - *Edição constitucional escondida num G1* → **mitigação:** a redação verbatim do §4 mora **neste
    ADR** (G2); T9.4 só aplica; a regra de endurecimento exige declaração de supersedência.
  - *Perda de história ao estubar o CHANGELOG* → **mitigação:** texto histórico **congelado**
    (append-only), migração controlada/por referência, sem backfill; nada de reescrever prosa passada.
- **Segurança/confiança/observabilidade.** Remover artefato versionado é **T3/G3** no merge (humano
  sempre). Mexer em append-only/ledger/§4 é **T2→G2**. Observabilidade preservada via relatórios sob
  demanda (Data-First §9.1: status por issue, pendências, história consultável).

## Conformidade

Como verificar no review/CI que a implementação respeita a decisão (§8.1):

- **Nenhuma fatia** remove artefato ou edita o §4 **antes** deste ADR `aceito` (G2 humano).
- **T9.3:** o gerador de plano offline existe e roda **antes** de o `PLAN.md` virar stub; get-bearings
  não referencia `PLAN.md`/`docs/plans/` como fonte; nenhuma informação útil fica só no `PLAN.md`; a
  T9.3b aplica a **linha L1 do §4** no mesmo PR do stub (sem janela com §4 nomeando `PLAN.md` estubado).
- **T9.4:** cumulativamente com a T9.3b, o §4 final é **idêntico ao bloco** "Redação integral do §4"
  acima (T9.4b aplica a **linha L5** + roteamento de história + espelhos §2/§12); ADR-0024 recebe a nota
  de cabeçalho de supersedência parcial (append-only, sem editar a decisão histórica); `CHANGELOG.md`
  vira stub com o histórico preservado; história = **PRs mergeados** (campos imutáveis); se criar
  `history.json`, há schema + guard.
- **T9.6:** guard reprova (a) espelho não classificado no manifesto, (b) ponteiro para fonte removida,
  (c) referência normativa a `PLAN.md`/`CHANGELOG.md` como fonte, (d) quebra de schema da
  representação offline/história — **invariantes mínimos**, não equivalência semântica total.
- **Simulação do agente obediente:** um agente seguindo o §4 reescrito **roteia** história ao
  PR/Issue, **não** reinfla STATE nem recria mapa autoral; toda peça runnable (geradores/guard) roda
  **dentro** do fluxo SDD (Issue aprovada → branch → PR → merge humano), sem furar G2/T3.
- **Regra de endurecimento:** toda fatia que toca append-only/ledger/§4/plano declara a supersedência
  e aguarda autorização humana no gate correto.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho do antigo. -->
