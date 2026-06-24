# STATE — Índice de Estado

> **Camada L1 (índice leve)** (`AGENTS.md` §4). Ponteiro de orientação rápida: o agente lê isto
> ao iniciar uma sessão para saber **onde estamos e qual o próximo passo**. **Não duplica**
> conteúdo — o detalhe vive nas Issues SDD e nos artefatos linkados. Atualize ao concluir cada
> tarefa/fase.

## Agora

- **Fase do pipeline:** Build — épico O1 (coerência dos guardrails).
- **Épico ativo:** O1 — Coerência dos guardrails (`PLAN.md`).
- **Última conclusão:** #15 · T1.1 · CI bloqueante na trilha Python — mergeado (PR #16, squash `aaa4917`).
- **Próxima tarefa:** T1.2 · alinhar G3 ao enforcement (Required approvals / exceção Solo) — classe
  T2, **exige ADR (gate G2)**. Ainda **sem Issue SDD** (aguarda G1).
- **Regra de foco:** **uma** tarefa ativa por vez; nenhuma nova Issue antes desta verde e mergeada.

## Próximo passo

Preparar a T1.2: (1) abrir a Issue SDD da tarefa (gate **G1**); (2) registrar o **ADR** da decisão
"perfil Solo dispensa Required approvals" **vs** "`Required approvals ≥ 1`" em `docs/decisions/`
(gate **G2**). Nenhuma mudança na proteção de `main` antes do ADR aprovado.

## Riscos / pendências em aberto

- Confirmar a licença (atual: MIT) ao adotar em contexto organizacional.
- T1.2 depende de decisão de governança (ADR/G2): hoje a `main` não exige approval (perfil Solo),
  o que mantém o G3 ("aprovação humana") sem enforcement formal — é exatamente o que a T1.2 resolve.

## Ponteiros

`PLAN.md` · PR #16 (T1.1, mergeado) · `MEMORY.md` · `AGENTS.md` · `docs/product/` ·
`docs/decisions/` · `CHANGELOG.md`
