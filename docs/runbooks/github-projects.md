# Runbook — GitHub Projects, Issues e Milestones

> Como gerir tarefas no Orion Harness (`AGENTS.md` §6). **Issues SDD** = tarefas; **Milestones** =
> épicos; **Project (board)** = fluxo de trabalho.

## Estrutura

- **Milestones** são a **fonte do épico** (não o `PLAN.md`, que é stub-ponteiro): título = épico;
  **descrição** = **plano completo** (modelo v2, [ADR-0031](../decisions/0031-modelo-plano-v2-milestone-completo-hierarquia-nativa.md)):
  `## Objetivo` do épico + um **bloco de design por tarefa** (`### <n>. <nome>` com os cinco campos
  `**Necessidade.**` · `**Escopo.**` · `**Forma dos critérios.**` · `**Classe**` · `**Dependências.**`),
  encerrada por `## Como iniciar` — o artefato aprovado no **G1**. Crie/edite um Milestone por épico
  **proposto** — a **descrição é o artefato que o G1 aprova** (não existe "épico aprovado" antes do
  Milestone). A **gramática canônica** do bloco e o conteúdo mínimo do `## Como iniciar` vivem no
  **ADR-0031 §2/§6**; o Milestone **O11** ([#16](https://github.com/isaiane/OrionHarness/milestone/16)) é o
  **exemplo canônico**. Não há `gh milestone`; use a REST via `gh api` (ADR-0026 L91-99):

  ```bash
  # criar (o -f muda o método para POST):
  gh api repos/{owner}/{repo}/milestones -f title='O9 — …' -f description='## Objetivo
  <resultado compartilhado que escopa o épico>

  ### 1. <nome da tarefa>
  **Necessidade.** <a dor/força, como problema>
  **Escopo.** <o que a tarefa faz>
  **Forma dos critérios.** <como o aceite será verificável>
  **Classe** T? / gate
  **Dependências.** <ADRs aceitos, outras tarefas>

  ## Como iniciar
  <prompt de kick-off — ver ADR-0031 §6>'
  # editar a descrição (PATCH explícito):
  gh api -X PATCH repos/{owner}/{repo}/milestones/{number} -f description='…'
  # ler (gerador/get-bearings): --paginate senão páginas somem
  gh api "repos/{owner}/{repo}/milestones?state=all&per_page=100" --paginate
  ```
- **Issues SDD** representam as **tarefas LEAN**. Use o template "Tarefa Spec-Driven (SDD)".
  **Promoção completa (Spec — ADR-0031 §2), nesta ordem:** (0) **idempotência — procure primeiro** uma
  Issue existente com o traço `Promovida de: Milestone #M …`; se existir, **não recrie** — retome a
  partir do passo (2), **verificando/reparando a associação** ao Milestone antes de seguir (no v2 a
  associação nativa é a **única** fonte de promoção — pular o passo (2) deixaria a Issue órfã do
  Milestone, some do `plan-report`, e a mesma tarefa poderia ser re-promovida); (1) crie a Issue
  (decompondo o bloco de design nos 10 campos SDD); (2) **vincule-a ao Milestone** do épico (via
  `--milestone`); (3) no corpo da Issue, cite
  `Promovida de: Milestone #M ("<épico>") — "<n>. <nome>"` **com o snapshot** do bloco de design aprovado
  (os 5 campos + o `## Objetivo` do épico vigente no G1 — ADR-0031 ponto 2). **Hierarquia e status são
  nativos** (Milestone + Issues aberta/fechada + `stateReason`); **não** se marca `- [x] … → #N` na
  descrição — o `plan-report.ts` reconcilia as Issues **associadas** pelo **estado nativo**. Mudança
  material do bloco/objetivo/título pós-G1 é **mudança de plano → re-G1**.
- **Project (board)** dá a visão de fluxo sobre as Issues.

## Board (colunas / campo Status) — sinal explícito na Issue

As **cinco colunas** são **normativas** ([ADR-0038](../decisions/0038-board-por-sinal-explicito-na-issue.md),
que supersede o ponto 6 do [ADR-0033](../decisions/0033-flip-automatizado-lote-projects-derivado.md)), em
**sentence case**:

`Backlog → In progress → In review → Blocked → Done`

O board é **projeção derivada, nunca fonte** (ADR-0006/0026/0033): a **fonte** é a **Issue SDD**. A etapa é um
**sinal explícito** que o **agente** aplica na Issue no momento em que ela acontece — o projetor só **espelha**
estado + rótulos, pela função pura [`tools/projects/board-projection.ts`](../../tools/projects/board-projection.ts).
Nada é deduzido por nome de branch, `Closes #N` ou papel de PR.

| Precedência | Sinal na Issue | Coluna |
|---|---|---|
| 1 | Issue **fechada** (qualquer motivo) | **Done** |
| 2 | rótulo `blocked` | **Blocked** |
| 3 | rótulo `status:in-review` | **In review** |
| 4 | rótulo `status:in-progress` | **In progress** |
| 5 | nenhum dos anteriores | **Backlog** |

Remover `blocked` devolve a Issue à coluna do seu rótulo de status. Uma Issue **reaberta** cai na coluna dos
rótulos que tiver (quem reabre ajusta o rótulo à etapa real).

### Quando aplicar cada rótulo (ADR-0038 §4)

Quem aplica é o **agente que executa a tarefa** (skill `orion-orchestrator`); o humano também pode. Os rótulos
vão **sempre na Issue da tarefa**, nunca no PR.

| Momento | Ação na Issue |
|---|---|
| Começa a implementação, ou a **próxima fatia** de uma tarefa entregue em vários PRs | aplica `status:in-progress` e remove `status:in-review` |
| Pede a **revisão independente** do PR de **implementação** (`@codex review`, ou o revisor de outro modelo quando o Codex implementou). A revisão do PR de **contrato** (ADR-0030) **não** muda a coluna — a fase de contrato é `In progress` (ADR-0038 §3a) | troca `status:in-progress` por `status:in-review` |
| Novas rodadas de review e correções | mantém `status:in-review` (até o merge) |
| Algo **fora do gate** impede o avanço (dependência externa, acesso, terceiro) | aplica `blocked`; remove ao destravar |
| Tarefa **pausada** (WIP=1) | remove o rótulo de status (volta a Backlog) e registra a pausa na Issue |
| PR mergeado fecha a Issue | nada — fechada ⇒ Done |

**Nunca arraste o cartão** para mudar de coluna: a reconciliação desfaz. Para corrigir, ajuste o rótulo.

### Rótulos de gate e de classe (não movem coluna)

| Rótulo | Significado | Aplicar quando | Remover quando |
|---|---|---|---|
| `needs-human-approval` | parada num gate humano **agora** (G1/G2) | o agente **para** num gate (Issue/ADR proposto aguardando G1/G2; replan G1) | **todos** os gates pendentes foram dados (no G1 adicione `ready`; se o G2 pende, fica até o ADR ser aceito) |
| `ready` | G1 dado | no G1 | a tarefa **volta ao G1** (replan, mudança material) — reaplique só após a nova aprovação |
| `trust:T*` | classe de confiança (T1, sem rótulo: na seção *Classe* da Issue) | na criação | — |

**G1/G2 pendente nunca recebe `blocked`** — aguardar gate fica em **Backlog** (ADR-0038 §3). O merge (G3) não
usa rótulo.

## Campos customizados úteis

- **Fase do pipeline** (single select): prime · initialize · plan · spec · build · review · ship.
- **Classe de confiança** (single select): T0 · T1 · T2 · T3 (espelha `AGENTS.md` §11).
- **Épico** (vinculado ao Milestone).

## Projeção (escritor único) — as automações nativas de Status ficam DESLIGADAS

**Escritor único** (ADR-0033 escrita restrita ao projetor): o **único** caminho de escrita de Status é o workflow projetor
[`.github/workflows/project-board.yml`](../../.github/workflows/project-board.yml), sob a identidade do
PAT clássico `PROJECTS_TOKEN` (escopo `project` apenas — ADR-0035/0036). As **automações nativas do Projects** (built-in workflows: *item added →
Backlog*, *PR aberto → In review*, *Issue fechada → Done*, *Auto-add*…) **NÃO** são usadas — seriam um
**segundo escritor** que sobrescreveria a projeção (o *Auto-add* também enche o board de PRs sem status). O
board tem **só Issues**. O workflow:

- dispara **só** em eventos de **Issue** (aberta, fechada, reaberta, rótulo aplicado/removido) e na
  reconciliação por **`schedule`** (diária, 06:17 UTC) ou `workflow_dispatch` — **sem** eventos de PR ou de
  branch (ADR-0038 §5);
- **serializa por Issue**: o job `resolve` descobre as Issues afetadas (só com o `GITHUB_TOKEN`) e o job
  `project` roda **por Issue** com `concurrency: board-issue-<n>`, lendo o estado **ao vivo** dentro do
  trecho serializado — um run atrasado escreve o estado atual, nunca um snapshot velho;
- adiciona o item ao Project se faltar e **seta o Status** pela coluna que a função projeta;
- **nunca toca merge** (T3/G3 humano).

**Reconciliação** (`schedule` diário + `workflow_dispatch`): reprojeta **todas** as Issues (abertas e fechadas) a partir das fontes —
repara um arrasto manual de cartão (a idempotência estabiliza replay, mas não conserta edição fora-de-banda —
ADR-0033 (escrita restrita ao projetor)). Input **`dry_run`**: só reporta a coluna projetada, sem escrever (use antes de ligar ao
vivo). **Lock único:** cada alvo da reconciliação é um job no **mesmo** grupo `board-issue-<n>` dos eventos —
não há escritor fora dos grupos por Issue, e a reconciliação nunca sobrescreve com estado velho a coluna que um
evento acabou de gravar (#298). O **dry-run** usa um grupo próprio (`board-issue-<n>-dry`) para não tirar da
fila uma escrita pendente. Acima de 256 Issues (limite da matrix) o `resolve` **falha fechado** em vez de
truncar — aí é preciso dividir em lotes.

### Setup humano (uma vez, fora do código)

Como foram o install do App e o ruleset (ADR-0033 decide o desenho; instalar/configurar é ato humano):

1. **Project 7** (`isaiane/#7`) é o board deste repo. Garanta o campo **Status** com as **5 opções** na
   grafia exata: `Backlog`, `In progress`, `In review`, `Blocked`, `Done` (sem `Ready` — ADR-0038).
2. **Desligue as automações nativas** do Project (Settings → Workflows): *Item added to project*,
   *Pull request merged*, *Auto-add* e qualquer outra que escreva Status ou adicione PRs — para não haver
   segundo escritor nem PRs no board. **Board já existente:** desligar o *Auto-add* não tira os PRs que ele já
   inseriu — remova os itens de PR do Project (ex.: `gh project item-list` + `gh project item-delete`) antes
   de reconciliar; o projetor só trata Issues e nunca os removeria.
3. **Secret do repo `PROJECTS_TOKEN`** — um **PAT clássico do usuário** (dono do Project 7) com escopo
   **`project` APENAS** — **sem `repo`/`public_repo`** (→ **incapaz de merge**) e sem `Contents` (o `checkout`
   usa o `GITHUB_TOKEN`; reads de issues/PRs são **públicos**). **Fine-grained NÃO serve** — não acessa
   Projects v2 de conta de usuário (`Resource not accessible`). Política:
   [ADR-0036](../decisions/0036-token-classico-project-only-para-o-projetor-de-projects-supersede-adr-0035-ponto-2.md)
   (aceito, G2 — supersede o ponto 2/4 do
   [ADR-0035](../decisions/0035-projetor-de-projects-usa-pat-de-menor-privilegio-para-board-user-owned.md)).
   O workflow **verifica os scopes reais** do token (header `X-OAuth-Scopes`) e **aborta (fail-closed)** se
   houver `repo`/`public_repo` — a descrição do PAT não garante o escopo. *(Um installation-token de GitHub
   App **não** alcança Projects v2 de conta de usuário; por isso o projetor usa PAT, não o App do flip.)*
4. **Rótulos** (já em `.github/labels.yml`, aplicados pelo workflow `labels` — ADR-0002, **não** criar à
   mão): `status:in-progress`, `status:in-review` e `blocked` movem a coluna; `needs-human-approval`,
   `ready` e `pipeline:contract` **não** movem (seções acima). Rode o workflow `labels` uma vez num repo novo.
5. **Só então ligue o gate:** defina a **variável de repo** `PROJECT_BOARD_ENABLED=true`
   (Settings → Secrets and variables → Actions → Variables). O workflow `project-board` é **desligado por
   padrão** (`if: vars.PROJECT_BOARD_ENABLED == 'true'`) — sem isso ele não roda, evitando que projetor e
   automação nativa coexistam como dois escritores entre o merge e o setup. Rode antes um `dry_run`.

## Rastreabilidade

Mantenha o vínculo `Issue → branch → commit → PR → merge` (fundações §1.5) — na **fast-lane
issue-less** (`AGENTS.md` §11.2), `branch → commit → PR → merge` (sem Issue; o PR é a unidade de
rastreabilidade). A **descrição do Milestone** é o **plano** (blocos de design); as **Issues associadas**
ao Milestone (estado nativo) são as tarefas promovidas — o vínculo tarefa→Issue vive no corpo da Issue
(`Promovida de:`), não na descrição. O [`STATE.md`](../../STATE.md) aponta o épico/Issues ativos.
