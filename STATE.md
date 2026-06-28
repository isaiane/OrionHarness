# STATE — Índice de Estado

> **Camada L1 (índice leve)** (`AGENTS.md` §4). Ponteiro de orientação rápida: o agente lê isto
> ao iniciar uma sessão para saber **onde estamos e qual o próximo passo**. **Não duplica**
> conteúdo — o detalhe vive nas Issues SDD e nos artefatos linkados. Atualize ao concluir cada
> tarefa/fase.

## Agora

- **Fase do pipeline:** Build — épico **O2** (núcleo runnable); T2.0 + T2.1 concluídas, **T2.2 a iniciar**.
- **Épico ativo:** O2 — Núcleo runnable (`PLAN.md`). O1 concluído.
- **Última conclusão:** #29 · T2.1 · Feature Ledger executável — mergeado (PR #34, `c9b4534`);
  ADR-0006 **aceito**; tooling em `tools/ledger/` + guard no smoke-test; cobertura vitest.
- **Regra de foco:** **uma** tarefa ativa por vez; nenhuma nova Issue antes desta verde e mergeada.

## Próximo passo

**T2.2 — Papel Initializer no pipeline (#31, ADR)**, próxima da O2. Em seguida **T2.3 (#32, init.sh)**
→ **T2.4 (#33, get-bearings)**. Preparar a Issue/ADR da T2.2 (gates G1/G2) sobre o ledger recém-entregue.

## Riscos / pendências em aberto

- Confirmar a licença (atual: MIT) ao adotar em contexto organizacional.
- **Perfil de proteção = Solo:** o enforcement do "humano aprova" no merge é procedural (ADR-0003);
  migrar para o perfil Time (`approvals ≥ 1` + `CODEOWNERS`) quando houver 2+ mantenedores.

## Ponteiros

`PLAN.md` · PR #34 (T2.1, mergeado) · ADR-0006 · ADR-0005 · `MEMORY.md` · `AGENTS.md` ·
`docs/product/` · `docs/decisions/` · `CHANGELOG.md`
