# STATE — Índice de Estado

> **Camada L1 (índice leve)** (`AGENTS.md` §4). Ponteiro de orientação rápida: o agente lê isto
> ao iniciar uma sessão para saber **onde estamos e qual o próximo passo**. **Não duplica**
> conteúdo — o detalhe vive nas Issues SDD e nos artefatos linkados. Atualize ao concluir cada
> tarefa/fase.

## Agora

- **Fase do pipeline:** Build — épico **O2** (núcleo runnable); T2.0 concluída, **T2.1 a iniciar**.
- **Épico ativo:** O2 — Núcleo runnable (`PLAN.md`). O1 concluído.
- **Última conclusão:** #26 · T2.0 · stack Node/TS (ADR-0005) + esqueleto — mergeado (PR #27,
  `2f56639`); toolchain na raiz, `lint`/`typecheck`/`test`/`format` verdes; typecheck no CI.
- **Regra de foco:** **uma** tarefa ativa por vez; nenhuma nova Issue antes desta verde e mergeada.

## Próximo passo

**T2.1 — ledger SDD em TypeScript** (já no `PLAN.md`, depende da T2.0/stack). Preparar a Issue SDD
(gate **G1**) e implementar o meta-tooling runnable em TS sobre o esqueleto recém-criado.
`PLAN.md`. Em seguida, **T2.1 — ledger SDD em TypeScript** (já no PLAN, depende da T2.0).

## Riscos / pendências em aberto

- Confirmar a licença (atual: MIT) ao adotar em contexto organizacional.
- **Perfil de proteção = Solo:** o enforcement do "humano aprova" no merge é procedural (ADR-0003);
  migrar para o perfil Time (`approvals ≥ 1` + `CODEOWNERS`) quando houver 2+ mantenedores.

## Ponteiros

`PLAN.md` · PR #27 (T2.0, mergeado) · ADR-0005 · ADR-0004 · `MEMORY.md` · `AGENTS.md` ·
`docs/product/` · `docs/decisions/` · `CHANGELOG.md`
