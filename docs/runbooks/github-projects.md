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

As **seis colunas** são **normativas** ([ADR-0033](../decisions/0033-flip-automatizado-lote-projects-derivado.md) §130),
em **sentence case**:

`Backlog → Ready → In progress → In review → Blocked → Done`

O board é **projeção derivada de eventos, nunca fonte** (ADR-0006/0026/0033): a **fonte de status** é a
**Issue SDD**; o Status do board só **reflete**. A coluna sai da função pura
[`tools/projects/board-projection.ts`](../../tools/projects/board-projection.ts) (origens de evento do
ADR-0033 §116):

- **Backlog** — Issue aberta em intake, sem sinal de avanço.
- **Ready** — G1 dado (rótulo `ready`), sem PR ainda.
- **In progress** — PR de **contrato** aberto (spec/tests do pipeline, ADR-0030; rótulo `pipeline:contract`).
- **In review** — PR de **implementação** aberto. *(O papel do PR distingue as duas — não colapsam, §116(ii).)*
- **Blocked** — rótulo de gate `blocked`/`needs-human-approval`; **unblock** remove o rótulo e a projeção
  **retorna** à coluna derivável do evento (§116(iii)). O gatilho ao vivo do rótulo + skill é **T10.4**.
- **Done** — Issue fechada como `completed` **ou** PR vinculado mergeado.

## Campos customizados úteis

- **Fase do pipeline** (single select): prime · initialize · plan · spec · build · review · ship.
- **Classe de confiança** (single select): T0 · T1 · T2 · T3 (espelha `AGENTS.md` §11).
- **Épico** (vinculado ao Milestone).

## Projeção (escritor único) — as automações nativas de Status ficam DESLIGADAS

**Escritor único** (ADR-0033 §108/§111): o **único** caminho de escrita de Status é o workflow projetor
[`.github/workflows/project-board.yml`](../../.github/workflows/project-board.yml), sob a identidade do
**GitHub App** (Projects rw). As **automações nativas do Projects** (built-in workflows: *item added →
Backlog*, *PR aberto → In review*, *Issue fechada → Done*…) **NÃO** são usadas — seriam um **segundo
escritor** que sobrescreveria a projeção e não distingue o papel do PR. O workflow:

- dispara em eventos de `issues`/`pull_request` (e reconciliação por `workflow_dispatch`);
- adiciona o item ao Project se faltar e **seta o Status** pela coluna que a função projeta;
- **nunca toca merge** (T3/G3 humano).

**Reconciliação** (`workflow_dispatch`): reprojeta todas as Issues a partir das fontes — repara um arrasto
manual de cartão (a idempotência estabiliza replay, mas não conserta edição fora-de-banda — ADR-0033 §108–110).

### Setup humano (uma vez, fora do código)

Como foram o install do App e o ruleset (ADR-0033 decide o desenho; instalar/configurar é ato humano):

1. **Project 7** (`isaiane/#7`) é o board deste repo. Garanta o campo **Status** com as **6 opções** na
   grafia exata, incluindo **`Blocked`** entre `In review` e `Done`.
2. **Desligue as automações nativas de Status** do Project (Settings → Workflows): *Item added to project*,
   *Pull request merged*, *Auto-add* que escrevam Status — para não haver segundo escritor.
3. **Secrets do repo** `APP_ID` e `APP_PRIVATE_KEY` (o mesmo App do flip, que já tem Projects rw).
4. **Convenções de rótulo:** `ready` = G1 dado (alimenta `Ready`); `pipeline:contract` = PR de contrato
   (spec/tests); `blocked`/`needs-human-approval` = `Blocked` (gatilho ao vivo é T10.4).

## Rastreabilidade

Mantenha o vínculo `Issue → branch → commit → PR → merge` (fundações §1.5) — na **fast-lane
issue-less** (`AGENTS.md` §11.2), `branch → commit → PR → merge` (sem Issue; o PR é a unidade de
rastreabilidade). A **descrição do Milestone** é o **plano** (blocos de design); as **Issues associadas**
ao Milestone (estado nativo) são as tarefas promovidas — o vínculo tarefa→Issue vive no corpo da Issue
(`Promovida de:`), não na descrição. O [`STATE.md`](../../STATE.md) aponta o épico/Issues ativos.
