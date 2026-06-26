# STATE — Índice de Estado

> **Camada L1 (índice leve)** (`AGENTS.md` §4). Ponteiro de orientação rápida: o agente lê isto
> ao iniciar uma sessão para saber **onde estamos e qual o próximo passo**. **Não duplica**
> conteúdo — o detalhe vive nas Issues SDD e nos artefatos linkados. Atualize ao concluir cada
> tarefa/fase.

## Agora

- **Fase do pipeline:** Review/Ship — épico O1 (coerência dos guardrails), reaberto pela T1.3.
- **Épico ativo:** O1 — Coerência dos guardrails (`PLAN.md`).
- **Em andamento:** #23 · T1.3 · reconciliar `AGENTS.md §7` à postura lean/flat — G1 e G2 aprovados;
  ADR-0004 **aceito**; §7 + foundations §2.1/§2.2 + reviewer-checklist reescritos; PR aberto,
  **aguardando merge humano** (T3/G3).
- **Última conclusão:** #18 · T1.2 · enforcement do G3 por perfil — mergeado (PR #19); ADR-0003 aceito.
- **Regra de foco:** **uma** tarefa ativa por vez; nenhuma nova Issue antes desta verde e mergeada.

## Próximo passo

Você: revisar e **mergear** o PR da #23 (CI verde). Após o merge, marcar a T1.3 como `concluído` no
`PLAN.md` e reavaliar se o O1 fecha de novo. Depois, planejar o próximo épico (**G1**).

## Riscos / pendências em aberto

- Confirmar a licença (atual: MIT) ao adotar em contexto organizacional.
- **Perfil de proteção = Solo:** o enforcement do "humano aprova" no merge é procedural (ADR-0003);
  migrar para o perfil Time (`approvals ≥ 1` + `CODEOWNERS`) quando houver 2+ mantenedores.

## Ponteiros

`PLAN.md` · #23 (T1.3, em review) · ADR-0004 · ADR-0003 · `MEMORY.md` · `AGENTS.md` ·
`docs/product/` · `docs/decisions/` · `CHANGELOG.md`
