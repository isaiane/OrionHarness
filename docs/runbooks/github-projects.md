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

## Board (colunas / campo Status) — projeção derivada

As **seis colunas** são **normativas** ([ADR-0033](../decisions/0033-flip-automatizado-lote-projects-derivado.md) ponto 6),
em **sentence case**:

`Backlog → Ready → In progress → In review → Blocked → Done`

O board é **projeção derivada de eventos, nunca fonte** (ADR-0006/0026/0033): a **fonte de status** é a
**Issue SDD**; o Status do board só **reflete**. A coluna sai da função pura
[`tools/projects/board-projection.ts`](../../tools/projects/board-projection.ts) (origens de evento das
restrições da tabela de transição do ADR-0033):

- **Backlog** — Issue aberta em intake, sem sinal de avanço.
- **Ready** — G1 dado (rótulo `ready`), sem PR nem branch da tarefa.
- **In progress** — PR de **contrato** aberto (spec/tests do pipeline, ADR-0030; branch `tests/issue-<n>` ou
  rótulo `pipeline:contract`),
  **ou** a branch da tarefa existe sem PR aberto (#278). Ver [Associação Issue ↔ branch/PR](#associação-issue--branchpr-sem-closes-n).
- **In review** — PR de **implementação** aberto. *(O papel do PR distingue as duas — não colapsam, restrição (ii) da tabela de transição.)*
- **Blocked** — rótulo de gate `blocked`/`needs-human-approval`; **unblock** remove o rótulo e a projeção
  **retorna** à coluna derivável do evento (restrição (iii) da tabela de transição). Quando aplicar/remover:
  ver [Convenção `Blocked` ↔ rótulos de gate](#convenção-blocked--rótulos-de-gate).
- **Done** — Issue **fechada** (o **estado vivo** manda): `completed`, ou `not_planned`/`duplicate` (fora do
  fluxo — nunca `Backlog`). Uma Issue **reaberta** tem **precedência sobre** um PR mergeado no histórico:
  volta ao estado vivo derivado do evento (In review/Ready/Backlog), **não** fica presa em `Done`.

### Associação Issue ↔ branch/PR (sem `Closes #N`)

A Issue de uma branch ou PR sai do **nome da branch**, pela convenção do §6: `<tipo>/<n>-<slug>` → Issue
`#n` (ex.: `feat/278-board-branch`), ou pela branch de contrato do ADR-0030, `tests/issue-<n>`. Assim um PR de **contrato**, que não carrega `Closes #N`, ainda leva a
Issue a `In progress` — o **papel** de contrato vem da própria branch `tests/issue-<n>` (nenhum workflow
aplica o rótulo `pipeline:contract`, que segue aceito). Somado ao `closingIssuesReferences` do PR. O nome é
validado **por inteiro** (`<tipo>/<n>-<slug>` sem `/` no slug): `feat/278-work/other` não associa.
**Fail-closed:** só os prefixos de
tarefa do §6 — `feat`, `fix`, `chore` — associam; `docs/`, `test/`, `fast/…` (fast-lane), rotas de manutenção
(`flip/2026-10-01`, `release/…`), bots e nomes fora do padrão **não** projetam Issue nenhuma (a associação
segue pelo `Closes #N` do PR); `Closes other/repo#N` não projeta a Issue local de mesmo número; PR de fork não associa por nome
de branch. No `edited`, as Issues do corpo anterior saem de `Closes #N`, `Closes owner/repo#N` ou da URL da
Issue — só do próprio repo. A lógica vive em `issueFromBranch`/`isContractPr`/`assembleState` do
[`board-projection.ts`](../../tools/projects/board-projection.ts) (testada).

### Convenção `Blocked` ↔ rótulos de gate

Os dois rótulos de gate são **estado transitório**, não marca de classe. A precedência da projeção põe
`Blocked` **acima** de `Ready`/PR aberto, então um rótulo de gate esquecido prende a Issue em `Blocked`
mesmo com G1 dado ou PR em review. A classe de confiança vive em `trust:T*` (T1, sem rótulo: na seção
*Classe* da Issue), **nunca** em `needs-human-approval`. Os rótulos de gate vão **sempre na Issue da
tarefa**, nunca no PR: a projeção só lê rótulos de gate da Issue (os do PR só definem o papel).

| Rótulo | Aplicar quando | Remover quando | Quem |
|---|---|---|---|
| `needs-human-approval` | o agente **para** num gate humano (Issue/ADR proposto aguardando G1/G2; replan G1) | **todos** os gates pendentes foram dados. No **G1**, adicione `ready`; se o **G2** ainda pende, o rótulo **fica** (os dois convivem e a projeção mantém `Blocked`) e sai quando o ADR é aceito | o agente que para no gate (skill `orion-orchestrator`); o humano pode remover ao aprovar |
| `blocked` | a tarefa depende de algo **externo** que impede avançar (outra Issue, terceiro, acesso) | a dependência resolve | quem identifica a dependência |

- O **merge** (G3) **não** usa rótulo: o PR aberto já projeta `In review`; aplicar `needs-human-approval`
  ali só esconderia o PR em `Blocked`.
- Após remover o rótulo, a projeção recomputa no próximo evento (`unlabeled`) e a Issue volta à coluna
  derivável (`Ready`/`In progress`/`In review`/`Backlog`).

## Campos customizados úteis

- **Fase do pipeline** (single select): prime · initialize · plan · spec · build · review · ship.
- **Classe de confiança** (single select): T0 · T1 · T2 · T3 (espelha `AGENTS.md` §11).
- **Épico** (vinculado ao Milestone).

## Projeção (escritor único) — as automações nativas de Status ficam DESLIGADAS

**Escritor único** (ADR-0033 escrita restrita ao projetor): o **único** caminho de escrita de Status é o workflow projetor
[`.github/workflows/project-board.yml`](../../.github/workflows/project-board.yml), sob a identidade do
PAT clássico `PROJECTS_TOKEN` (escopo `project` apenas — ADR-0035/0036). As **automações nativas do Projects** (built-in workflows: *item added →
Backlog*, *PR aberto → In review*, *Issue fechada → Done*…) **NÃO** são usadas — seriam um **segundo
escritor** que sobrescreveria a projeção e não distingue o papel do PR. O workflow:

- dispara em eventos de `issues`, `pull_request` (incl. **`edited`**: recomputa as Issues do corpo anterior
  e do atual), **`create`/`delete`** de branch (Issue do nome), e reconciliação por **`schedule`** (diária) ou
  `workflow_dispatch`;
- **serializa por Issue**: o job `resolve` descobre as Issues afetadas (só com o `GITHUB_TOKEN`) e o job
  `project` roda **por Issue** com `concurrency: board-issue-<n>`, lendo o estado **ao vivo** dentro do
  trecho serializado — um run atrasado escreve o estado atual, nunca um snapshot velho;
- adiciona o item ao Project se faltar e **seta o Status** pela coluna que a função projeta;
- **nunca toca merge** (T3/G3 humano).

**Reconciliação** (`schedule` diário + `workflow_dispatch`): reprojeta as Issues **abertas** e as **atualizadas nos
últimos 30 dias** (cobre um fechamento cujo evento falhou; fechadas antigas são terminais em `Done`) a partir das fontes —
repara um arrasto manual de cartão (a idempotência estabiliza replay, mas não conserta edição fora-de-banda —
ADR-0033 (escrita restrita ao projetor)). Input **`dry_run`**: só reporta a coluna projetada, sem escrever (use antes de ligar ao
vivo). **Lock único:** cada alvo da reconciliação é um job no **mesmo** grupo `board-issue-<n>` dos eventos —
não há escritor fora dos grupos por Issue, e a reconciliação nunca sobrescreve com estado velho a coluna que um
evento acabou de gravar (#298). Acima de 256 alvos (limite da matrix) o `resolve` **falha fechado** em vez
de truncar.

### Setup humano (uma vez, fora do código)

Como foram o install do App e o ruleset (ADR-0033 decide o desenho; instalar/configurar é ato humano):

1. **Project 7** (`isaiane/#7`) é o board deste repo. Garanta o campo **Status** com as **6 opções** na
   grafia exata, incluindo **`Blocked`** entre `In review` e `Done`.
2. **Desligue as automações nativas de Status** do Project (Settings → Workflows): *Item added to project*,
   *Pull request merged*, *Auto-add* que escrevam Status — para não haver segundo escritor.
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
   mão): `ready` = G1 dado (alimenta `Ready`); `pipeline:contract` = PR de contrato (spec/tests, →
   `In progress`); `blocked`/`needs-human-approval` = `Blocked` (convenção na seção acima).
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
