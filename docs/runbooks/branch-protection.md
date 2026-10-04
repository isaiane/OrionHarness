# Runbook — Proteção de `main` e checks obrigatórios

> Configuração recomendada para sustentar os gates de governança (`AGENTS.md` §3) e manter o
> repositório verde. Aplicar em **Settings → Branches → Add branch protection rule** para `main`.
>
> Escolha o perfil conforme o tamanho do time: **Solo** (um único mantenedor) ou **Time**
> (dois ou mais). A diferença está só no gate de aprovação humana — os demais checks são iguais.
>
> **Política de enforcement do G3 por perfil:** registrada em
> [ADR-0003](../decisions/0003-enforcement-g3-por-perfil.md). A **base comum** (PR obrigatório +
> push direto bloqueado + checks obrigatórios + histórico linear + resolução de conversas) vale para os dois
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
    "contexts": ["lint-test-build", "secret-scan", "smoke-test", "pre-commit", "flip-revalidate", "cross-model"]
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
>
> **Gate de migração Solo→Time — identidade do projetor de Projects ([ADR-0035](../decisions/0035-projetor-de-projects-usa-pat-de-menor-privilegio-para-board-user-owned.md) ponto 7):**
> a exceção de identidade-por-ator (projetor sob PAT do owner) **só vale no Solo**. **ANTES** de completar a
> troca para Time, execute: (1) **provisionar um ator de automação distinto** para o board — conta-bot
> colaboradora do Project **ou** migrar o board para um Project de organização (sob App); (2) **revogar o
> `PROJECTS_TOKEN`** (PAT do owner) e apontar o projetor ao novo ator; (3) confirmar que nenhum workflow
> autentica mais como o mantenedor. Sem isso, o projetor seguiria autenticando como um humano no perfil Time.
>
> **Se escolher o Project de organização:** não basta migrar o board + trocar credencial — o
> `.github/workflows/project-board.yml` hoje fixa `PROJECT_OWNER=isaiane`/`PROJECT_NUMBER=7` e resolve via
> `user(login:$owner){ projectV2 }`, que **não** resolve Project de org; é preciso **reconfigurar o workflow**
> (owner/tipo/número + trocar a query para `organization(login:$owner){ projectV2 }`) na mesma fatia. A opção
> **conta-bot colaboradora do Project 7 atual** **não** exige mudança no workflow (o board segue user-owned).

> **Comando verificado em 2026-06-25** contra a API real, **com os 4 contextos de CI da época** (antes de
> `flip-revalidate` e `cross-model`): retorna 200 e `gh api repos/:owner/:repo/branches/main/protection` confirma
> os checks `required`,
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
  - Adicione os checks obrigatórios (aparecem após rodarem ao menos uma vez). **Esta é a lista
    canônica** — os demais textos do harness apontam para cá em vez de contar checks:
    - `lint-test-build`
    - `secret-scan`
    - `smoke-test`
    - `pre-commit`
    - `flip-revalidate` — revalida o lote no PR de flip (trivial nos demais PRs; ADR-0033/0037)
    - `cross-model` — teste de aceite de outro modelo em PR de produto (ADR-0041)
  - Repo com **ruleset** (como este): os mesmos contextos em *Rules → Require status checks to pass*.
- ☑️ **Require conversation resolution before merging.**
- ☑️ **Require linear history** (combina com trunk-based + squash/rebase).
- ☑️ **Do not allow bypassing the above settings** (aplica as regras inclusive a administradores).
- Merge via **squash** para manter o histórico linear e legível por Issue.

## Perfil Solo (um único mantenedor)

O GitHub **não permite aprovar o próprio PR**. Exigir aprovação com um só mantenedor trava os
merges. Portanto:

- **Required approvals = 0.**
- **Não** marque "Require review from Code Owners".

O gate de qualidade fica garantido por **PR obrigatório + checks obrigatórios verdes** (lista acima). O gate humano G3 é
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

> Os nomes dos checks devem casar com os `jobs` dos workflows: `lint-test-build`, `secret-scan`, `smoke-test` e
> `pre-commit` em [`ci.yml`](../../.github/workflows/ci.yml); `flip-revalidate` em
> [`flip-revalidate.yml`](../../.github/workflows/flip-revalidate.yml); `cross-model` em
> [`cross-model.yml`](../../.github/workflows/cross-model.yml).
