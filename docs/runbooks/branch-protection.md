# Runbook — Proteção de `main` e checks obrigatórios

> Configuração recomendada para sustentar os gates de governança (`AGENTS.md` §3) e manter o
> repositório verde. Aplicar em **Settings → Branches → Branch protection rules** para `main`.

## Regras recomendadas para `main`

- **Require a pull request before merging** — sem commits diretos.
  - **Require approvals:** ao menos 1 (o `CODEOWNERS` define o revisor obrigatório). Gate **G3**.
  - **Require review from Code Owners** — habilitado.
  - **Dismiss stale approvals** ao surgir novo commit.
- **Require status checks to pass before merging** — selecione os checks do CI:
  - `ci / lint-test-build`
  - `ci / secret-scan`
  - **Require branches to be up to date before merging.**
- **Require conversation resolution before merging.**
- **Require linear history** (combina com trunk-based + squash/rebase).
- **Do not allow bypassing the above settings** (inclui administradores).
- **Restrict who can push** — ninguém empurra direto em `main`.

## Sugestões adicionais

- Habilitar **secret scanning** e **push protection** (Settings → Code security).
- Habilitar **Dependabot alerts** e updates (ver [`../../.github/dependabot.yml`](../../.github/dependabot.yml)).
- Merge via **squash** para manter o histórico linear e legível por Issue.

> Os nomes dos checks devem casar com os `jobs` de [`../../.github/workflows/ci.yml`](../../.github/workflows/ci.yml).
