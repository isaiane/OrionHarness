# Runbook — Proteção de `main` e checks obrigatórios

> Configuração recomendada para sustentar os gates de governança (`AGENTS.md` §3) e manter o
> repositório verde. Aplicar em **Settings → Branches → Add branch protection rule** para `main`.
>
> Escolha o perfil conforme o tamanho do time: **Solo** (um único mantenedor) ou **Time**
> (dois ou mais). A diferença está só no gate de aprovação humana — os demais checks são iguais.
>
> **Política de enforcement do G3 por perfil:** registrada em
> [ADR-0003](../decisions/0003-enforcement-g3-por-perfil.md). A **base comum** (PR obrigatório +
> push direto bloqueado + 4 checks + histórico linear + resolução de conversas) vale para os dois
> perfis; no **Solo** o G3 ("aprovação humana") é o **ato de o humano fazer o merge** com CI verde
> (garantido por **T3**, `AGENTS.md` §11 — o agente nunca faz merge em `main`); no **Time** o G3
> também é técnico (`approvals ≥ 1` + `CODEOWNERS`).

## Comando equivalente (`gh api`) — perfil Solo

Alternativa de linha de comando ao passo a passo de UI (ação sensível sobre `main`: **proposta**
pelo agente, **executada pelo mantenedor**). Use `--input` com JSON: é a única forma confiável de
enviar **objetos aninhados** (`required_status_checks`, `required_pull_request_reviews`). Passar
esses campos via `-F` com chaves pontilhadas **não funciona** — o `gh api` as envia como chaves
planas literais e a API responde **422** sem aplicar os checks.

```bash
gh api -X PUT repos/:owner/:repo/branches/main/protection --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["lint-test-build", "secret-scan", "smoke-test", "pre-commit"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "restrictions": null,
  "required_linear_history": true,
  "required_conversation_resolution": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```

> Perfil **Time:** troque o bloco de review por
> `"required_pull_request_reviews": { "required_approving_review_count": 1, "require_code_owner_reviews": true }`
> (segundo aprovador humano + review de `CODEOWNERS`).

> **Comando verificado em 2026-06-25** contra a API real: retorna 200 e
> `gh api repos/:owner/:repo/branches/main/protection` confirma os 4 checks `required`,
> `required_linear_history=true` e `required_conversation_resolution=true`.

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
