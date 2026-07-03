# Contribuindo no Orion Harness

Este guia operacionaliza a constituição [`AGENTS.md`](AGENTS.md). Em conflito, **`AGENTS.md`
prevalece**. Vale para contribuidores humanos e agentes.

## Fluxo de contribuição (resumo do pipeline)

1. **Prime (Fase 0).** Confirme que `docs/product/` (Product Context + Spec) cobre o necessário.
   Se não, rode o discovery ([`docs/product/discovery-guide.md`](docs/product/discovery-guide.md)).
   Gate **G0**.
2. **Initialize** _(opcional/one-time, entre Prime e Plan)_. Quando o **ambiente runnable ainda não
   existe**, faça o bootstrap (`init.sh`, progress, commit inicial) — `AGENTS.md` §2.2 / ADR-0007.
   É **gateado**: uma **Issue de bootstrap de 1ª classe** com **G1 próprio** (aprovada após o Prime,
   sem depender de Plan→Spec) → branch → PR → **merge humano**. Se o ambiente já existe, pule direto
   para o Plan.
3. **Plan.** O trabalho entra em [`PLAN.md`](PLAN.md) como épico/tarefas LEAN. Gate **G1**
   (aprovação humana) antes de virar Issues.
4. **Spec.** Cada tarefa LEAN vira uma **Issue SDD** (template de tarefa). Decisões arquiteturais
   viram **ADR** em [`docs/decisions/`](docs/decisions/). Gate **G2**.
5. **Build.** Trabalhe em uma branch por Issue, com TDD.
6. **Review.** Revisor **independente**, por tipo de artefato (ADR-0008): mudança de **governança/instruções** →
   [Harness Review](docs/harness-reviewer-checklist.md); **produto** →
   [Product Review](docs/agent-reviewer-checklist.md); ambos → as duas. + review humano no PR.
7. **Ship.** Merge com CI verde. Gate **G3**.

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
Issue (`#<nº>`). O commitlint valida as mensagens no CI (sobre o range do PR).

**Limites de linha (commitlint):** o **cabeçalho** deve ter no máximo **100 caracteres** e
**cada linha do corpo** também **≤ 100 caracteres** (`body-max-line-length`). Quebre o corpo em
linhas/parágrafos curtos — no terminal, use vários `-m`, um por parágrafo:

```bash
git commit \
  -m "feat(auth): adiciona login por OTP (#42)" \
  -m "Primeiro parágrafo do corpo, com no máximo 100 colunas por linha." \
  -m "Segundo parágrafo, idem."
```

## Pull Requests

- Escopado a **uma** Issue; use o [template de PR](.github/PULL_REQUEST_TEMPLATE.md).
- Preencha a verificação de correção (§8.1) e o checklist de DoD (§12).
- Exige **CI verde** + **aprovação humana** (ver [`CODEOWNERS`](CODEOWNERS)) antes do merge.
- Ações classe **T3** (irreversíveis/alto risco) exigem gate **G3** explícito.
- **Ledger (semeia-e-cresce, [ADR-0006](docs/decisions/0006-ledger-executavel-de-tarefas.md)):** ao
  abrir o PR de uma tarefa, **projete a própria Issue** no ledger e committe o delta — assim o ledger
  cresce **distribuído por PR**, sem projetar tarefas ainda não-prontas:

  ```bash
  gh issue view <nº> --json number,title,body,labels | jq '[.]' > /tmp/issue.json
  node --experimental-strip-types tools/ledger/ledger-from-issues.ts \
    --issues-json /tmp/issue.json --ledger feature-ledger.json --write
  ```

  As entradas novas nascem `passes:false` (o `ledger-guard` aprova); marque `true` só com evidência
  e2e. O ritual de início de sessão (T2.4) reforça essa checagem.
  - **Exceção (gerador com bug conhecido):** se o gerador **não puder projetar corretamente** os
    critérios (ex.: bug de parsing), **difira** a projeção com uma **issue de follow-up rastreada**
    (e registre no `STATE.md`) em vez de gravar entradas incorretas — o ledger é **append-only**, e
    entrada errada não pode ser limpa depois. A projeção entra quando o gerador estiver correto.

## Gestão de tarefas (GitHub Projects)

- **Issues SDD** = tarefas; **Milestones** = épicos; **Project (board)** = fluxo.
- Veja [`docs/runbooks/github-projects.md`](docs/runbooks/github-projects.md) para a configuração
  do board, campos e automações sugeridas.
- Proteção de `main` e checks obrigatórios em
  [`docs/runbooks/branch-protection.md`](docs/runbooks/branch-protection.md).

## Definição de pronto

Uma contribuição só está pronta quando atende ao **DoD global** (`AGENTS.md` §12). Mantenha o
repositório **verde**.
