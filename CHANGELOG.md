# Changelog

Todas as mudanças notáveis deste projeto são documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota
[Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não publicado]

### Corrigido

- **CI bloqueante (trilha Python):** removidos os mascaramentos `|| true` / `|| echo` em `ruff` e
  `pytest`; lint e teste agora **reprovam** o build. O exit 5 do pytest ("nenhum teste coletado") é
  tolerado para o template novo; qualquer outra falha bloqueia o merge (`AGENTS.md` §1.5/§8). (#15)

### Adicionado

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
