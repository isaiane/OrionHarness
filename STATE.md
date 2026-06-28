# STATE — Índice de Estado

> **Camada L1 (índice leve)** (`AGENTS.md` §4). Ponteiro de orientação rápida: o agente lê isto
> ao iniciar uma sessão para saber **onde estamos e qual o próximo passo**. **Não duplica**
> conteúdo — o detalhe vive nas Issues SDD e nos artefatos linkados. Atualize ao concluir cada
> tarefa/fase.

## Agora

- **Fase do pipeline:** Review/Ship — épico **O2** (núcleo runnable); T2.0 + T2.1 concluídas, **T2.2 em review**.
- **Épico ativo:** O2 — Núcleo runnable (`PLAN.md`). O1 concluído.
- **Em andamento:** #31 · T2.2 · papel Initializer no pipeline — ADR-0007 **aceito**; pipeline em
  `AGENTS.md §2` passa a incluir `initialize` (distinto do Prime); doc-only (sem código); PR aberto,
  **aguardando merge humano** (T3/G3).
- **Última conclusão:** #29 · T2.1 · Feature Ledger executável — mergeado (PR #34); ADR-0006 aceito.
- **Regra de foco:** **uma** tarefa ativa por vez; nenhuma nova Issue antes desta verde e mergeada.

## Próximo passo

Você: revisar e **mergear** o PR da #31 (CI verde). Após o merge, marcar a T2.2 como `concluído` no
`PLAN.md`. O2 segue com **T2.3 (#32, init.sh — implementa o Initializer)** → **T2.4 (#33, get-bearings)**.

## Riscos / pendências em aberto

- Confirmar a licença (atual: MIT) ao adotar em contexto organizacional.
- **Perfil de proteção = Solo:** o enforcement do "humano aprova" no merge é procedural (ADR-0003);
  migrar para o perfil Time (`approvals ≥ 1` + `CODEOWNERS`) quando houver 2+ mantenedores.

## Ponteiros

`PLAN.md` · #31 (T2.2, em review) · ADR-0007 · ADR-0006 · `MEMORY.md` · `AGENTS.md` ·
`docs/product/` · `docs/decisions/` · `CHANGELOG.md`
