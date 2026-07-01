# Runbook — GitHub Projects, Issues e Milestones

> Como gerir tarefas no Orion Harness (`AGENTS.md` §6). **Issues SDD** = tarefas; **Milestones** =
> épicos; **Project (board)** = fluxo de trabalho.

## Estrutura

- **Milestones** representam os **épicos** do [`PLAN.md`](../../PLAN.md). Crie um Milestone por
  épico aprovado (gate G1).
- **Issues SDD** representam as **tarefas LEAN**. Use o template "Tarefa Spec-Driven (SDD)".
  Vincule cada Issue ao Milestone do épico.
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

Mantenha o vínculo `Issue → branch → commit → PR → merge` (fundações §1.5). O `PLAN.md` lista os
números das Issues por épico; o [`STATE.md`](../../STATE.md) aponta o épico/Issues ativos.
