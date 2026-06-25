# STATE — Índice de Estado

> **Camada L1 (índice leve)** (`AGENTS.md` §4). Ponteiro de orientação rápida: o agente lê isto
> ao iniciar uma sessão para saber **onde estamos e qual o próximo passo**. **Não duplica**
> conteúdo — o detalhe vive nas Issues SDD e nos artefatos linkados. Atualize ao concluir cada
> tarefa/fase.

## Agora

- **Fase do pipeline:** Review/Ship — épico O1 (coerência dos guardrails).
- **Épico ativo:** O1 — Coerência dos guardrails (`PLAN.md`).
- **Última conclusão:** #15 · T1.1 · CI bloqueante na trilha Python — mergeado (PR #16, squash `aaa4917`).
- **Em andamento:** #18 · T1.2 · alinhar G3 ao enforcement por perfil — G1 e G2 aprovados; ADR-0003
  **aceito**; runbook + artefatos atualizados; PR aberto, **aguardando merge humano** (T3/G3).
- **Regra de foco:** **uma** tarefa ativa por vez; nenhuma nova Issue antes desta verde e mergeada.

## Próximo passo

Ações **humanas** para encerrar a T1.2 (ações sensíveis sobre `main`, não automatizadas — T3):
(1) revisar e **mergear** o PR da #18 com CI verde; (2) **aplicar a branch protection** do perfil
Solo via o comando em `docs/runbooks/branch-protection.md`; (3) validar com
`gh api .../branches/main/protection` (4 checks `required`, histórico linear, resolução de conversas,
push direto off). Após o merge, marcar a T1.2 como `concluído` no `PLAN.md`.

## Riscos / pendências em aberto

- Confirmar a licença (atual: MIT) ao adotar em contexto organizacional.
- **Branch protection ainda não aplicada:** o ADR-0003 define a política, mas o enforcement técnico
  na `main` só vale após o mantenedor rodar o comando do runbook (passo humano pendente acima).
- Branch `chore/pos-t1.1-state` (`c10aa7f`) segue não mergeada e também toca `STATE.md` — pode gerar
  pequeno overlap quando ambas entrarem; a versão da T1.2 é a mais recente.

## Ponteiros

`PLAN.md` · PR #16 (T1.1, mergeado) · `MEMORY.md` · `AGENTS.md` · `docs/product/` ·
`docs/decisions/` · `CHANGELOG.md`
