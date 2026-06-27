# Changelog

Todas as mudanças notáveis deste projeto são documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota
[Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não publicado]

### Adicionado

- **Stack Node/TS + esqueleto do projeto (T2.0):** stack padrão definida em
  [ADR-0005](docs/decisions/0005-stack-padrao-node-typescript.md) (Node LTS 22, ESM, TypeScript
  strict, npm, Vitest, ESLint flat + Prettier; Zod/pino/Fastify/tsup opt-in). Esqueleto na raiz
  (`package.json`, `tsconfig.json` estendendo o preset, `vitest.config.ts`, `.nvmrc`,
  `eslint.config.mjs`, `.prettierrc.json`) + `package-lock.json`; `lint`/`typecheck`/`test` verdes.
  A trilha node do CI passa a rodar `npm run typecheck --if-present`. `.orion/` (scratch) excluído
  do lint/typecheck. Fundação da O2 (pré-requisito do ledger, T2.1). (#26)

### Corrigido

- **Runbook de branch protection (comando `gh api`):** o comando documentado usava `-F` com chaves
  pontilhadas (e `restrictions=`), que o `gh api` envia como chaves planas/string vazia → a API
  respondia **422** sem aplicar os checks (achado do review do PR #20). Substituído pela versão com
  `--input` e JSON aninhado (`restrictions: null`), verificada contra a API real. (#21)
- **CI bloqueante (trilha Python):** removidos os mascaramentos `|| true` / `|| echo` em `ruff` e
  `pytest`; lint e teste agora **reprovam** o build. O exit 5 do pytest ("nenhum teste coletado") é
  tolerado para o template novo; qualquer outra falha bloqueia o merge (`AGENTS.md` §1.5/§8). (#15)

### Alterado

- **Reconciliação do `§7` à postura lean/flat (T1.3):** o `AGENTS.md §7` deixa de prescrever Clean
  Architecture/Hexagonal como default obrigatório — **Clean Arch/Hexagonal e event-driven viram
  opt-in** com justificativa (Issue/ADR); default = encapsulamento simples. Introduz a **regra das
  3 responsabilidades** (≤3 arquivos) e o **guardrail dos 3–4 arquivos**; mantém SOLID/API-First/
  TDD/12-Factor/KISS/YAGNI/DRY e o DDD estratégico. Coerência propagada por todo o repo:
  `AGENTS.md` §9.1/§11, `foundations.md` §2.1/§2.2/§2.6, `CLAUDE.md`, `README.md`,
  `docs/observability.md`, `docs/testing-strategy.md` e `agent-reviewer-checklist.md`; o ADR-0001
  (itens 13/15) recebe anotação de supersessão (append-only). Decisão em
  [ADR-0004](docs/decisions/0004-reconciliacao-s7-lean-flat.md). (#23)

### Adicionado

- **Enforcement do gate G3 por perfil (T1.2):** [ADR-0003](docs/decisions/0003-enforcement-g3-por-perfil.md)
  registra a política de proteção de `main` por perfil — base comum (PR obrigatório, push direto
  bloqueado, 4 checks obrigatórios `lint-test-build`/`secret-scan`/`smoke-test`/`pre-commit`,
  histórico linear e resolução de conversas) e o gate humano via merge no Solo (T3) ou
  `approvals ≥ 1` + `CODEOWNERS` no Time. `docs/runbooks/branch-protection.md` ganha o comando
  `gh api` equivalente. A branch protection da `main` foi aplicada (4 checks + histórico linear +
  resolução de conversas), encerrando o épico **O1**. (#18)
- **Sincronização automática de labels:** workflow `labels` (`.github/workflows/labels.yml`) aplica
  `.github/labels.yml` ao repositório (push à `main` que altere o arquivo + `workflow_dispatch`),
  com `skip-delete: true` e `issues: write` de menor privilégio. Decisão registrada em
  [ADR-0002](docs/decisions/0002-sincronizacao-automatica-de-labels.md). (#11)
- **Badge de status do CI no `README`:** badge do workflow `ci.yml` no topo do `README`, linkando
  para a aba Actions, expondo a saúde da `main` (Data-First, `AGENTS.md` §9.1). (#9)
- **Fase 1 — Fundação & constituição:** estrutura base do repositório; `AGENTS.md` (constituição)
  com 7 princípios inegociáveis, pipeline de fases (`prime → plan → spec → build → review → ship`),
  gates G0–G3, camadas de memória L0–L5, padrão de Issue SDD, fundamentos de engenharia, guardrail
  de verificação de correção e Data-First; `CLAUDE.md`; `README.md`; `LICENSE` (MIT); `CODEOWNERS`;
  `.editorconfig`; `.gitignore`.
- **Fundações arquiteturais:** `docs/architecture/foundations.md` (Security by Design, modelo de
  confiança T0–T4, padrões AI-First) e `docs/architecture/ui-agent-harness.md` (UI governada por
  Design System).
- **Fase 2 — Contexto, memória & Issues SDD:** templates `docs/product/product-context.md`,
  `docs/product/spec.md` (com bloco Data-First) e `docs/product/discovery-guide.md`; artefatos de
  memória `PLAN.md`, `STATE.md`, `MEMORY.md`, `CHANGELOG.md`; template de ADR e ADR-0001 (decisões
  fundadoras).
- **Fase 3 — Git, governança & CI/CD:** `CONTRIBUTING.md`; template de Issue SDD
  (`.github/ISSUE_TEMPLATE/sdd-task.yml`) + `config.yml`; `PULL_REQUEST_TEMPLATE.md`; convenção de
  labels (`.github/labels.yml`); runbooks de proteção de `main` e GitHub Projects; workflow de CI
  poliglota (lint/test/build) + scan de segredos (gitleaks); `dependabot.yml`; workflow de release
  opcional.
- **Fase 4 — Convenções, presets, qualidade & testes:** `commitlint.config.js` e
  `.pre-commit-config.yaml` (higiene, editorconfig, gitleaks, Conventional Commits); presets por
  stack em `presets/` (TypeScript, Python, orientações Mobile); `docs/testing-strategy.md`
  (TDD, pirâmide, regressão, cobertura configurável); `docs/agent-reviewer-checklist.md`.
- **Fase 5 — Observabilidade, segurança, docs & reuso:** `docs/observability.md` (logging
  estruturado, decision logs, eventos, Data-First, tracing opt-in); `SECURITY.md`, `.env.example` e
  `docs/runbooks/secrets.md`; índice `docs/README.md` e guia de reuso `docs/getting-started.md`.

### Corrigido

- **CI:** job `secret-scan` passa a rodar o binário do `gitleaks` (`gitleaks detect`), removendo a
  dependência de `GITLEAKS_LICENSE` e o erro de intervalo no commit raiz.
- **`.gitignore`:** padrão `secrets.*` (amplo demais) ignorava silenciosamente
  `docs/runbooks/secrets.md`; substituído por padrões específicos e o runbook foi versionado.
- **`scripts/smoke-test.sh`:** fixtures de segredo fragmentados em runtime para não dispararem o
  scanner no próprio script; `.gitleaksignore` cobre os fingerprints históricos (falsos positivos).
- **`.editorconfig`:** removido `max_line_length` global (limite enforçado pelos formatters por
  stack) e relaxada a indentação para Markdown e shell, resolvendo ~114 apontamentos do
  editorconfig-checker em prosa/heredoc.

### Adicionado (autovalidação)

- `scripts/smoke-test.sh` — autovalidação do harness (estática + comportamental: Conventional
  Commits e secret scan "mordem") e job `smoke-test` no CI que o executa a cada push.
- Job `pre-commit` no CI: roda os hooks de arquivo (`pre-commit run --all-files`, com cache) e
  valida Conventional Commits sobre o range do PR (commitlint). Hook `trailing-whitespace` alinhado
  ao `.editorconfig` (preserva quebras de linha em Markdown).

---

_Ao clonar para um novo projeto, limpe este histórico e comece a registrar as mudanças do produto._
