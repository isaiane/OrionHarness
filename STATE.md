# STATE — Índice de Estado

> **Camada L1 (índice leve)** (`AGENTS.md` §4). Ponteiro de orientação rápida: o agente lê isto
> ao iniciar uma sessão para saber **onde estamos e qual o próximo passo**. **Não duplica**
> conteúdo — o detalhe vive nas Issues SDD e nos artefatos linkados. Atualize ao concluir cada
> tarefa/fase.

## Agora

- **Fase do pipeline:** Build — épico **O2** (núcleo runnable); T2.0–T2.2 concluídas, **T2.3 a iniciar**.
- **Épico ativo:** O2 — Núcleo runnable (`PLAN.md`). O1 e GF-1 concluídos.
- **Última conclusão:** #43 · GF-1 · separação **Harness Review vs Product Review** — ADR-0008
  **aceito**; fase _Review_ bifurcada em `AGENTS.md §2` (regra de seleção por tipo de artefato);
  `docs/harness-reviewer-checklist.md` criado; ledger projeta a #43.
- **Regra de foco:** **uma** tarefa ativa por vez; nenhuma nova Issue antes desta verde e mergeada.

## Próximo passo

**T2.3 — `init.sh` (#32)**: implementa concretamente o Initializer definido na T2.2 (bootstrap
reproduzível do ambiente runnable). Em seguida **T2.4 — ritual get-bearings + regressão (#33)**.

## Riscos / pendências em aberto

- Confirmar a licença (atual: MIT) ao adotar em contexto organizacional.
- **Perfil de proteção = Solo:** o enforcement do "humano aprova" no merge é procedural (ADR-0003);
  migrar para o perfil Time (`approvals ≥ 1` + `CODEOWNERS`) quando houver 2+ mantenedores.

## Ponteiros

`PLAN.md` · #43 (GF-1) · ADR-0008 · ADR-0007 · `MEMORY.md` · `AGENTS.md` ·
`docs/harness-reviewer-checklist.md` · `docs/product/` · `docs/decisions/` · `CHANGELOG.md`
