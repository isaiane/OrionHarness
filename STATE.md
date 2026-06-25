# STATE — Índice de Estado

> **Camada L1 (índice leve)** (`AGENTS.md` §4). Ponteiro de orientação rápida: o agente lê isto
> ao iniciar uma sessão para saber **onde estamos e qual o próximo passo**. **Não duplica**
> conteúdo — o detalhe vive nas Issues SDD e nos artefatos linkados. Atualize ao concluir cada
> tarefa/fase.

## Agora

- **Fase do pipeline:** entre épicos — O1 concluído; próximo épico ainda **não planejado** (volta ao G1).
- **Épico ativo:** nenhum. **O1 — Coerência dos guardrails: concluído** (T1.1 + T1.2).
- **Última conclusão:** #18 · T1.2 · enforcement do G3 por perfil — mergeado (PR #19, `881fce3`);
  ADR-0003 **aceito**; branch protection da `main` **aplicada** (4 checks + linear + conversas).
- **Regra de foco:** **uma** tarefa ativa por vez; nenhuma nova Issue antes desta verde e mergeada.

## Próximo passo

O1 fechado. Para iniciar a próxima linha de trabalho: **planejar o próximo épico** no `PLAN.md`
e obter aprovação do plano (**gate G1**) antes de desdobrar em Issues SDD. Sem tarefa ativa até lá.

## Riscos / pendências em aberto

- Confirmar a licença (atual: MIT) ao adotar em contexto organizacional.
- **Perfil de proteção = Solo:** o enforcement do "humano aprova" no merge é procedural (ADR-0003);
  migrar para o perfil Time (`approvals ≥ 1` + `CODEOWNERS`) quando houver 2+ mantenedores.

## Ponteiros

`PLAN.md` · PR #19 (T1.2, mergeado) · ADR-0003 · `MEMORY.md` · `AGENTS.md` · `docs/product/` ·
`docs/decisions/` · `CHANGELOG.md`
