# Contribuindo no Orion Harness

Este guia operacionaliza a constituição [`AGENTS.md`](AGENTS.md). Em conflito, **`AGENTS.md`
prevalece**. Vale para contribuidores humanos e agentes.

## Fluxo de contribuição (resumo do pipeline)

1. **Prime (Fase 0).** Confirme que `docs/product/` (Product Context + Spec) cobre o necessário.
   Se não, rode o discovery ([`docs/product/discovery-guide.md`](docs/product/discovery-guide.md)).
   Gate **G0**.
2. **Plan.** O trabalho entra em [`PLAN.md`](PLAN.md) como épico/tarefas LEAN. Gate **G1**
   (aprovação humana) antes de virar Issues.
3. **Spec.** Cada tarefa LEAN vira uma **Issue SDD** (template de tarefa). Decisões arquiteturais
   viram **ADR** em [`docs/decisions/`](docs/decisions/). Gate **G2**.
4. **Build.** Trabalhe em uma branch por Issue, com TDD.
5. **Review.** Agente revisor + review humano no PR.
6. **Ship.** Merge com CI verde. Gate **G3**.

## Branches (trunk-based)

- `main` é protegida e **sempre liberável**. Nada de commits diretos.
- Uma branch curta por Issue:
  - `feat/<nº>-slug` — nova funcionalidade
  - `fix/<nº>-slug` — correção
  - `docs/<nº>-slug` — documentação
  - `chore/<nº>-slug` — manutenção
- Branches são de vida curta; PRs pequenos e frequentes. Trabalho incompleto fica atrás de feature
  flag, não em branch longeva.
- `release/*` é um **preset opcional** para projetos com versionamento formal.

## Commits (Conventional Commits)

Formato: `tipo(escopo opcional): descrição` — ex.: `feat(auth): adiciona login por OTP (#42)`.
Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`. Referencie a
Issue (`#<nº>`). A automação de Conventional Commits/commitlint entra na Fase 4.

## Pull Requests

- Escopado a **uma** Issue; use o [template de PR](.github/PULL_REQUEST_TEMPLATE.md).
- Preencha a verificação de correção (§8.1) e o checklist de DoD (§12).
- Exige **CI verde** + **aprovação humana** (ver [`CODEOWNERS`](CODEOWNERS)) antes do merge.
- Ações classe **T3** (irreversíveis/alto risco) exigem gate **G3** explícito.

## Gestão de tarefas (GitHub Projects)

- **Issues SDD** = tarefas; **Milestones** = épicos; **Project (board)** = fluxo.
- Veja [`docs/runbooks/github-projects.md`](docs/runbooks/github-projects.md) para a configuração
  do board, campos e automações sugeridas.
- Proteção de `main` e checks obrigatórios em
  [`docs/runbooks/branch-protection.md`](docs/runbooks/branch-protection.md).

## Definição de pronto

Uma contribuição só está pronta quando atende ao **DoD global** (`AGENTS.md` §12). Mantenha o
repositório **verde**.
