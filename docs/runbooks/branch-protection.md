# Runbook — Proteção de `main` e checks obrigatórios

> Configuração recomendada para sustentar os gates de governança (`AGENTS.md` §3) e manter o
> repositório verde. Aplicar em **Settings → Branches → Add branch protection rule** para `main`.
>
> Escolha o perfil conforme o tamanho do time: **Solo** (um único mantenedor) ou **Time**
> (dois ou mais). A diferença está só no gate de aprovação humana — os demais checks são iguais.

## Passo a passo (UI)

1. Repositório → **Settings** → **Branches**.
2. Em "Branch protection rules", clique em **Add rule** (proteção clássica).
3. **Branch name pattern:** `main`.
4. Marque as opções da seção correspondente ao seu perfil (abaixo) e clique em **Create**.

## Comum aos dois perfis

- ☑️ **Require a pull request before merging** — sem commits diretos em `main`.
- ☑️ **Require status checks to pass before merging**
  - ☑️ **Require branches to be up to date before merging.**
  - Adicione os checks obrigatórios (aparecem após rodarem ao menos uma vez):
    - `lint-test-build`
    - `secret-scan`
    - `smoke-test`
    - `pre-commit`
- ☑️ **Require conversation resolution before merging.**
- ☑️ **Require linear history** (combina com trunk-based + squash/rebase).
- ☑️ **Do not allow bypassing the above settings** (aplica as regras inclusive a administradores).
- Merge via **squash** para manter o histórico linear e legível por Issue.

## Perfil Solo (um único mantenedor)

O GitHub **não permite aprovar o próprio PR**. Exigir aprovação com um só mantenedor trava os
merges. Portanto:

- **Required approvals = 0.**
- **Não** marque "Require review from Code Owners".

O gate de qualidade fica garantido por **PR obrigatório + 4 checks verdes**. O gate humano G3 é
exercido pela própria pessoa ao revisar o diff e clicar em merge com o CI verde.

> Ao mudar para um time, migre para o perfil abaixo e ajuste o `CODEOWNERS`.

## Perfil Time (dois ou mais mantenedores)

- ☑️ **Require a pull request before merging**
  - **Required approvals:** ao menos **1**.
  - ☑️ **Require review from Code Owners** (gate humano G3 via `CODEOWNERS`).
  - ☑️ **Dismiss stale pull request approvals when new commits are pushed.**
- ☑️ **Restrict who can push to matching branches** — ninguém empurra direto em `main`.

## Sugestões adicionais (ambos os perfis)

- Habilitar **secret scanning** e **push protection** (Settings → Code security).
- Habilitar **Dependabot alerts** e updates (ver [`../../.github/dependabot.yml`](../../.github/dependabot.yml)).

> Os nomes dos checks devem casar com os `jobs` de [`../../.github/workflows/ci.yml`](../../.github/workflows/ci.yml).
