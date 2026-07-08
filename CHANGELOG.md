# Changelog

Todas as mudanças notáveis deste projeto são documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota
[Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não publicado]

### Adicionado

- **Hook de guarda pre-tool-use de referência (`tool-guard`) (T4.2/O4):** materializa o **action
  system** e o **modelo de confiança T0–T4** (`AGENTS.md` §10/§11) num módulo único opt-in
  ([`tools/guard/tool-guard.ts`](tools/guard/tool-guard.ts)). Postura **fail-safe (default-deny)**:
  nega por padrão; só libera ferramentas de leitura (T0) e comandos que **casam a allowlist explícita**
  (T0/T1). Entrada **não-parseável/malformada → block**; **proibidos** (T4, ex.: `rm -rf /`,
  baixa-e-executa, force-push, `/etc/passwd`) e **leitura de segredos** (`.env`, `~/.ssh/id_rsa`,
  `.pem`/`.key`, `.npmrc`, `~/.aws/` — exemplos públicos como `.env.example` seguem liberados)
  precedem a allowlist; **comandos compostos/encadeados** (`&&`, `;`, `|`, `$(…)`, `>`) são bloqueados
  (a allowlist casa o comando inteiro, não só o prefixo); **validadores** de comandos sensíveis
  bloqueiam ações **T3** (`git push` para `main`, `npm publish`) — a guarda **recusa**, não decide.
  Cobertura **vitest** que espelha o `test_security.py` do benchmark + **check comportamental** no
  [`scripts/smoke-test.sh`](scripts/smoke-test.sh) (bloqueia proibido/fora da allowlist/composto,
  libera comando seguro) — é a e2e do §8.1/ADR-0009 para uma **biblioteca interna** (sem
  CLI/UI). Preset de referência: **não** acoplado a runtime de agente específico (fica por projeto).
  Decisão em [ADR-0011](docs/decisions/0011-hook-sandbox-allowlist-referencia.md) (**aceito** no G2).
  Validação de alvo/args robusta (glob, canonicalização, read-only×mutante por script) roteada ao
  follow-up **#62**. Ledger projeta a #52 (5 critérios, `passes:false`). (#52)
- **Convenção de re-review do revisor automatizado (Codex):** vira **padrão do projeto** solicitar
  um novo review (`@codex review`) **após aplicar o fix** de achados do Codex (o Codex só reavalia
  quando acionado por comentário, não no push). Documentada no
  [`CONTRIBUTING.md`](CONTRIBUTING.md) §6 (fluxo de Review) e com check correspondente nos **dois**
  reviewer-checklists — Product ([`agent-reviewer-checklist.md`](docs/agent-reviewer-checklist.md) §7)
  e Harness ([`harness-reviewer-checklist.md`](docs/harness-reviewer-checklist.md) §10). Não dispensa
  o review humano (G3). Decisão em
  [ADR-0010](docs/decisions/0010-re-review-automatizado-apos-fix.md) (**aceito** no G2). (#55)
- **Convenção de verificação end-to-end com ferramenta real (T4.1/O4):** materializa o
  `AGENTS.md` §8.1 ("verde ≠ correto") com um instrumento **opt-in por tipo/risco**, dirigido por
  agente — UI → automação de browser/MCP; API/CLI → **exercício do contrato público** (não unidade).
  Amarrada ao [`docs/agent-reviewer-checklist.md`](docs/agent-reviewer-checklist.md) (§2, condicional
  "quando aplicável"), ao `AGENTS.md` §8.1 e ao **DoD §12** (evidência anexada ao PR ou dispensa
  justificada). Restrita a T0/T1, sem PII/segredos na evidência (§10/§11). Caso de exemplo rodável
  [`docs/examples/e2e-init-check.sh`](docs/examples/e2e-init-check.sh) exercita o contrato público
  (CLI) do `init.sh` real (dry-run exit 0 sem efeitos; argumento inválido exit 2). Decisão em
  [ADR-0009](docs/decisions/0009-verificacao-e2e-ferramenta-real.md) (**aceito** no G2 via merge do
  #54; status reconciliado na #57). Ledger projeta a #51 (4 critérios, `passes:false`).
  **Abre o épico O4.** (#51)
- **Ritual de início de sessão (get-bearings + regressão) (T2.4):** documentado em
  [`docs/getting-started.md`](docs/getting-started.md) §7 como contraparte de **início** da Regra de
  compactação (`AGENTS.md` §4). Antes de implementar, cada sessão: `pwd`/`git status` → lê `STATE.md`
  → varre `PLAN.md`/`feature-ledger.json`/`git log` → `./init.sh --check` → roda **1–2 checks core de
  regressão** (`typecheck`/`test` ou `smoke-test.sh`) — operacionaliza o §8.1 como ritmo (linha de
  base verde **antes** da mudança). É **só leitura + dry-run + testes** (T0/T1): não muta o repo nem
  contorna gate. Check correspondente nos **dois** checklists de review — Product
  ([`agent-reviewer-checklist.md`](docs/agent-reviewer-checklist.md)) e Harness
  ([`harness-reviewer-checklist.md`](docs/harness-reviewer-checklist.md) §9) — apontando o §7
  canônico, para ser enforceável nos dois caminhos de review (ADR-0008). Ledger projeta a #33.
  **Fecha o épico O2.** (#33)
- **Template `init.sh` + convenção (T2.3):** stub versionado na raiz do bootstrap de ambiente
  executável (papel Initializer, [ADR-0007](docs/decisions/0007-papel-initializer.md)). Fixado na
  **stack padrão Node/TypeScript** ([ADR-0005](docs/decisions/0005-stack-padrao-node-typescript.md);
  outras stacks = templates futuros): sobe o ambiente (`npm ci`, espelhando a trilha node do
  `.github/workflows/ci.yml`) e roda um **smoke do produto** (placeholder que cada projeto preenche).
  Contrato: `./init.sh --check` é um **dry-run sem efeitos** (exit 0), sem flag executa o bootstrap,
  argumento inválido sai com 2.
  Orquestração em bash (ADR-0005). A convenção — dois smokes **distintos**: `init.sh` (produto) vs.
  `scripts/smoke-test.sh` (autovalidação do harness) — está documentada em
  [`docs/getting-started.md`](docs/getting-started.md). Ledger projeta a #32. (#32)
- **Separação Harness Review vs Product Review (T3.0/O3):** a fase _Review_ (`AGENTS.md` §2) bifurca em
  **dois processos**, selecionados pelo tipo de artefato do PR — **Harness Review** (mudanças de governança/instruções:
  constituição/ADRs/pipeline/gates; valida as **instruções** simulando um agente obediente; novo
  [`docs/harness-reviewer-checklist.md`](docs/harness-reviewer-checklist.md)) e **Product Review**
  (código/testes/config; [`docs/agent-reviewer-checklist.md`](docs/agent-reviewer-checklist.md)).
  PR que toca ambos passa pelas duas, cada uma escopada à sua parte; revisor **independente do
  autor** obrigatório nos dois. Lição empírica do PR #36. Decisão em
  [ADR-0008](docs/decisions/0008-separacao-revisao-harness-vs-produto.md). (#43)
- **Papel Initializer no pipeline (T2.2):** o pipeline de fases (`AGENTS.md` §2) passa a
  `prime → initialize → plan → spec → build → review → ship`. O **`initialize`** é um bootstrap
  **opcional/one-time e gateado** do **ambiente executável** (distinto do Prime, que prepara
  contexto): via **Issue de bootstrap de primeira classe** (G1 pré-Plan, sem depender de Plan→Spec)
  **propõe** `init.sh` (T2.3), notas de progresso e o commit inicial, pelo fluxo Git normal
  (branch → PR → merge humano). O **`feature-ledger.json` inicial NÃO faz parte do bootstrap** —
  é gerado pós-Spec (semeia-e-cresce, ADR-0006). Decisão em
  [ADR-0007](docs/decisions/0007-papel-initializer.md); enumeração do pipeline alinhada em `README`,
  `docs/getting-started.md` e `docs/runbooks/github-projects.md`; ADR-0001 (item 2) anotado como
  estendido (append-only). (#31)
- **Feature Ledger executável (T2.1):** projeção em JSON das Issues SDD (L2 continua soberana),
  com tooling em TypeScript em `tools/ledger/` — `ledger-guard.ts` (gate append-only: `passes` só
  `false→true`; reprova remoção/edição de campo imutável e regressão), `ledger-from-issues.ts`
  (gerador idempotente, IDs `F-<issue>-<hash6>`) e `feature-ledger.schema.json`. Guard plugado no
  `scripts/smoke-test.sh` (job smoke-test) com base `origin/main` × head do PR; coberto por vitest.
  `feature-ledger.json` inicial projeta a #29. Decisão em
  [ADR-0006](docs/decisions/0006-ledger-executavel-de-tarefas.md). (#29)
- **Stack Node/TS + esqueleto do projeto (T2.0):** stack padrão definida em
  [ADR-0005](docs/decisions/0005-stack-padrao-node-typescript.md) (Node LTS 22, ESM, TypeScript
  strict, npm, Vitest, ESLint flat + Prettier; Zod/pino/Fastify/tsup opt-in). Esqueleto na raiz
  (`package.json`, `tsconfig.json` estendendo o preset, `vitest.config.ts`, `.nvmrc`,
  `eslint.config.mjs`, `.prettierrc.json`) + `package-lock.json`; `lint`/`typecheck`/`test` verdes.
  A trilha node do CI passa a rodar `npm run typecheck --if-present`. `.orion/` (scratch) excluído
  do lint/typecheck. Fundação da O2 (pré-requisito do ledger, T2.1). (#26)

### Corrigido

- **smoke-test (link-checker estático):** passa a podar `node_modules/`, `.orion/`, `dist/`,
  `coverage/` e `.pytest_cache/` ao varrer links de `.md` — antes acusava links quebrados dentro de
  dependências após `npm install`. (#29)
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
