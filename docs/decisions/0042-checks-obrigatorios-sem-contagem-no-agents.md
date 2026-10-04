# ADR-0042 — `AGENTS.md` §11.2 deixa de contar checks: aponta a lista canônica do runbook

- **Status:** proposto
- **Data:** 2026-10-04
- **Decisores:** Isa (owner) — **G2 pendente**
- **Relacionado a:** [ADR-0017](0017-fast-lane-baixo-risco.md) (fast-lane) · [ADR-0003](0003-enforcement-g3-por-perfil.md)
  (base comum de proteção) · [ADR-0041](0041-testes-cross-model-obrigatorios-no-produto.md) (check
  `cross-model`) · épico **O15** ([#20](https://github.com/isaiane/OrionHarness/milestone/20)), Issue **#332**

## Contexto

O `AGENTS.md` §11.2 diz que a fast-lane mantém "**4 checks de CI verdes**". O ruleset da `main` já exige
cinco (os quatro de CI mais `flip-revalidate`), e o ADR-0041 acrescentou o `cross-model`. Contar checks em
prosa gera deriva a cada check novo. A Issue #332 tornou o runbook `docs/runbooks/branch-protection.md` a
**lista canônica**; falta a constituição apontar para ela.

## Decisão

No `AGENTS.md` §11.2, **só** esta frase muda (o resto do arquivo é preservado):

- **DE:** `**O que MANTÉM (inegociável):** branch → PR → **4 checks de CI verdes** → **merge humano (T3/G3)**;`
- **PARA:** `**O que MANTÉM (inegociável):** branch → PR → **checks obrigatórios verdes** (lista canônica no
  runbook \`docs/runbooks/branch-protection.md\`) → **merge humano (T3/G3)**;`

O [ADR-0017](0017-fast-lane-baixo-risco.md), que também nomeia os "4 checks", recebe nota append-only no
cabeçalho apontando este ADR. A regra não muda: a fast-lane continua exigindo **todos** os checks obrigatórios e o merge humano. Muda só
de onde vem a lista. A aplicação vai **no mesmo PR** deste ADR e da lista canônica do runbook (decisão de Isa: uma frase, sem mudança de
regra — exceção ao padrão "decidir ≠ aplicar").

## Alternativas consideradas

- **Trocar "4" por "6".** Rejeitada: a deriva volta no próximo check.
- **ADR e aplicação em PRs separados** (padrão do repo). Rejeitada por Isa para este caso: custo de dois PRs
  para uma frase sem mudança de regra.

## Consequências

- **Positiva:** a constituição deixa de contradizer o ruleset; novos checks não exigem editar o `AGENTS.md`.
- **Neutra:** quem lê o §11.2 segue um link para saber quais são os checks.

## Conformidade

- **G2:** revisão humana deste ADR.
- O diff do `AGENTS.md` neste PR é exatamente a troca DE→PARA acima; nenhum texto current-state fora de ADRs
  e testes conta checks com número fixo.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho deste. -->
