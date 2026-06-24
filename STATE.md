# STATE — Índice de Estado

> **Camada L1 (índice leve)** (`AGENTS.md` §4). Ponteiro de orientação rápida: o agente lê isto
> ao iniciar uma sessão para saber **onde estamos e qual o próximo passo**. **Não duplica**
> conteúdo — o detalhe vive nas Issues SDD e nos artefatos linkados. Atualize ao concluir cada
> tarefa/fase.

## Agora

- **Fase do pipeline:** Build — épico O1 (coerência dos guardrails).
- **Épico ativo:** O1 — Coerência dos guardrails (`PLAN.md`).
- **Issue ativa:** #15 · T1.1 · CI bloqueante (lint/test reprovam o build) — classe T2.
- **Regra de foco:** **uma** tarefa ativa por vez; nenhuma nova Issue antes desta verde e mergeada.

## Próximo passo

Implementar a T1.1 pela Issue #15: branch `fix/15-ci-bloqueante` → tornar lint/test bloqueantes na
trilha Python do `.github/workflows/ci.yml` (tolerando **apenas** o exit 5 do pytest) → PR pequeno
(`Closes #15`), validado por um **teste negativo** (PR com teste quebrado deve reprovar) → CI verde
+ review humano (G3) → merge → atualizar este `STATE.md` para a próxima tarefa (T1.2).

## Riscos / pendências em aberto

- Confirmar a licença (atual: MIT) ao adotar em contexto organizacional.
- `pytest` sem testes retorna exit 5 ("nenhum teste coletado"): tolerar **apenas** esse código;
  qualquer outra falha deve reprovar (escopo da T1.1).

## Ponteiros

`PLAN.md` · Issue #15 · `MEMORY.md` · `AGENTS.md` · `docs/product/` · `docs/decisions/` ·
`CHANGELOG.md`
