# STATE — Índice de Estado

> **Camada L1 (índice leve)** (`AGENTS.md` §4). Ponteiro de orientação rápida: o agente lê isto
> ao iniciar uma sessão para saber **onde estamos e qual o próximo passo**. **Não duplica**
> conteúdo — o detalhe vive nas Issues SDD e nos artefatos linkados. Atualize ao concluir cada
> tarefa/fase.

## Agora

- **Fase do pipeline:** Review/Ship — épico **O2** (núcleo runnable), iniciado pela T2.0.
- **Épico ativo:** O2 — Núcleo runnable (`PLAN.md`). O1 concluído.
- **Em andamento:** #26 · T2.0 · stack Node/TS (ADR-0005) + esqueleto — G1 e G2 aprovados; ADR-0005
  **aceito**; `npm install` + lockfile; `lint`/`typecheck`/`test` verdes; typecheck no CI; PR aberto,
  **aguardando merge humano** (T3/G3).
- **Última conclusão:** #23 · T1.3 · reconciliação do `§7` (PR #24); ADR-0004 aceito.
- **Regra de foco:** **uma** tarefa ativa por vez; nenhuma nova Issue antes desta verde e mergeada.

## Próximo passo

Você: revisar e **mergear** o PR da #26 (CI verde). Após o merge, marcar a T2.0 como `concluído` no
`PLAN.md`. Em seguida, **T2.1 — ledger SDD em TypeScript** (já no PLAN, depende da T2.0).

## Riscos / pendências em aberto

- Confirmar a licença (atual: MIT) ao adotar em contexto organizacional.
- **Perfil de proteção = Solo:** o enforcement do "humano aprova" no merge é procedural (ADR-0003);
  migrar para o perfil Time (`approvals ≥ 1` + `CODEOWNERS`) quando houver 2+ mantenedores.

## Ponteiros

`PLAN.md` · #26 (T2.0, em review) · ADR-0005 · ADR-0004 · `MEMORY.md` · `AGENTS.md` ·
`docs/product/` · `docs/decisions/` · `CHANGELOG.md`
