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

## Board sugerido (colunas / campo Status)

`Backlog → Ready → In progress → In review → Blocked → Done`

- **Ready** só recebe Issues com SDD completa e dependências resolvidas.
- **In review** cobre review do agente revisor + review humano.
- **Blocked** usa a label `blocked` ou `needs-human-approval` (gate pendente).

## Campos customizados úteis

- **Fase do pipeline** (single select): prime · initialize · plan · spec · build · review · ship.
- **Classe de confiança** (single select): T0 · T1 · T2 · T3 (espelha `AGENTS.md` §11).
- **Épico** (vinculado ao Milestone).

## Automações sugeridas (GitHub Projects workflows)

- Item adicionado → **Status: Backlog**.
- PR aberto vinculado → **Status: In review**.
- Issue fechada / PR mergeado → **Status: Done**.
- Label `needs-human-approval` aplicada → **Status: Blocked**.

## Rastreabilidade

Mantenha o vínculo `Issue → branch → commit → PR → merge` (fundações §1.5) — na **fast-lane
issue-less** (`AGENTS.md` §11.2), `branch → commit → PR → merge` (sem Issue; o PR é a unidade de
rastreabilidade). A **descrição do Milestone** é o **plano** (blocos de design); as **Issues associadas**
ao Milestone (estado nativo) são as tarefas promovidas — o vínculo tarefa→Issue vive no corpo da Issue
(`Promovida de:`), não na descrição. O [`STATE.md`](../../STATE.md) aponta o épico/Issues ativos.
