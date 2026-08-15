# Runbook — GitHub Projects, Issues e Milestones

> Como gerir tarefas no Orion Harness (`AGENTS.md` §6). **Issues SDD** = tarefas; **Milestones** =
> épicos; **Project (board)** = fluxo de trabalho.

## Estrutura

- **Milestones** são a **fonte do épico** (não o `PLAN.md`, que é stub-ponteiro): título = épico;
  **descrição** = `## Objetivo` + `## Tarefas` (checklist `- [ ] <tarefa LEAN>`) — o artefato aprovado
  no **G1**. Crie/edite um Milestone por épico **proposto** — a **descrição é o artefato que o G1 aprova**
  (não existe "épico aprovado" antes do Milestone). Não há `gh milestone`; use a REST via `gh api`
  (ADR-0026 L91-99):

  ```bash
  # criar (o -f muda o método para POST):
  gh api repos/{owner}/{repo}/milestones -f title='O9 — …' -f description='## Objetivo
  …
  ## Tarefas
  - [ ] <tarefa LEAN>'
  # editar a descrição (PATCH explícito):
  gh api -X PATCH repos/{owner}/{repo}/milestones/{number} -f description='…'
  # ler (gerador/get-bearings): --paginate senão páginas somem
  gh api "repos/{owner}/{repo}/milestones?state=all&per_page=100" --paginate
  ```
- **Issues SDD** representam as **tarefas LEAN**. Use o template "Tarefa Spec-Driven (SDD)".
  **Promoção completa (Spec — ADR-0026 §2), nesta ordem:** (0) **idempotência — procure primeiro** uma
  Issue existente com o traço `Promovida de: Milestone #M …`; se existir, **não recrie** — apenas retome
  a partir do passo (3) (ADR-0026 L68-71: a criação e a marcação são 2 passos; um retry após falha
  parcial não pode duplicar); (1) crie a Issue; (2) **vincule-a ao Milestone** do épico; (3) **marque a
  proposta na descrição** do Milestone como promovida (`- [x] <tarefa> → #N`); (4) no corpo da Issue, cite
  `Promovida de: Milestone #M ("<épico>") — "<texto>"`. **Sem a marca `- [x] … → #N`**, o gerador
  **falha fechado** (reconciliação reversa: Issue vinculada ao Milestone mas ausente do checklist —
  `plan-report.ts`).
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
rastreabilidade). A **descrição do Milestone** lista as tarefas/Issues por épico (via `- [x] … → #N`); o
[`STATE.md`](../../STATE.md) aponta o épico/Issues ativos.
