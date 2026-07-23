# PLAN — Plano Incremental

> **Camada L1** (`AGENTS.md` §4). Mapa de épicos do projeto. Cada épico se desdobra em tarefas
> **LEAN** (pequenas, independentes, validáveis) que, **após aprovação humana (gate G1)**, viram
> **Issues SDD** — a fonte da verdade de status. Detalhe por épico em `docs/plans/<épico>.md`.
>
> **Ao clonar o Orion Harness para um novo projeto:** substitua o conteúdo abaixo pelo plano do
> seu produto (derivado do `docs/product/`). O exemplo atual documenta a construção do próprio
> harness e serve de referência de formato.

## Como ler

- **Status:** `planejado` · `em andamento` · `concluído`.
- A coluna **Issues** lista os números das Issues SDD criadas a partir do épico (após G1).

## Épicos

### Construção do Orion Harness (meta-projeto)

| # | Épico | Objetivo | Status | Issues |
|---|-------|----------|--------|--------|
| F1 | Fundação & constituição | Estrutura base + `AGENTS.md` (princípios, pipeline, gates, fundações de segurança/confiança, AI-First, UI harness, Data-First) | concluído | — |
| F2 | Contexto, memória & Issues SDD | Templates de produto/discovery, artefatos de memória (PLAN/STATE/MEMORY/CHANGELOG), template de ADR + ADR-0001, template de Issue SDD | concluído | — |
| F3 | Git, governança & CI/CD | Branch strategy, proteção de `main`, CONTRIBUTING, templates de PR/Issue, GitHub Projects, workflows de CI (lint/test/build), scan de segredos/dependências, gates de PR | concluído | — |
| F4 | Convenções, presets, qualidade & testes | Conventional Commits + hooks, presets por stack (web/API/mobile), estratégia de testes, checklist do agente revisor, gate de cobertura | concluído | — |
| F5 | Observabilidade, segurança, docs & reuso | Convenções de observabilidade + presets, `SECURITY.md` + guia de segredos, estrutura final de docs, guia de uso do template, marcar como template repository | concluído | — |

### Coerência dos guardrails (linha de trabalho atual)

> Objetivo: fazer os guardrails **já existentes** "morderem" — sem capacidade nova nem mudança
> arquitetural. Rigor proporcional; foco na coerência entre o que a constituição exige (§1.5/§8) e
> o que o CI e a proteção de `main` de fato aplicam.

| # | Épico | Objetivo | Status | Issues |
|---|-------|----------|--------|--------|
| O1 | Coerência dos guardrails | CI bloqueante (T1.1) + enforcement do G3 por perfil (T1.2) + reconciliar §7 à postura lean/flat (T1.3) | concluído | #15 (T1.1, concluída) · #18 (T1.2, concluída) · #23 (T1.3, concluída) |
| O2 | Núcleo runnable | Stack Node/TS + esqueleto (T2.0) → ledger executável (T2.1) → Initializer (T2.2) → template init.sh (T2.3) → ritual get-bearings (T2.4) | concluído | #26 (T2.0, concluída) · #29 (T2.1, concluída) · #31 (T2.2, concluída) · #32 (T2.3, concluída) · #33 (T2.4, concluída) |
| O3 | Governança do review | Separar os processos de revisão: **Harness Review** (governança/instruções) vs **Product Review** (produto), via ADR-0008 | concluído | #43 (T3.0, concluída) |
| O4 | Verificação real & execução equipada | Materializar o §8.1 com instrumento: convenção e2e opt-in com ferramenta real (T4.1) → hook de sandbox/allowlist de referência (T4.2) → observabilidade de custo/tokens (T4.3), via ADR-0009 | concluído | #51 (T4.1, concluída) · #52 (T4.2, concluída) · #53 (T4.3, concluída) |
| O5 | Proporcionalidade & eficiência de contexto | Fazer a classe de confiança (§11) rotear a cerimônia: fast-lane T1 (T5.1) → revisão cross-model (T5.2) → núcleo L0 condensado (T5.3) — Onda 4 do plano original | em andamento | #87 (T5.1, concluída) · #91 (T5.2, concluída) |

> **Follow-up de coerência (fora de épico):** **#49** consolidou a stack em **Node/TS**
> ([ADR-0012](docs/decisions/0012-consolidacao-stack-node-ts.md)), cumprindo a Consequência do
> ADR-0005 (`ci.yml`/`README`/`presets` numa só linguagem; outras stacks = templates futuros).
>
> **Follow-up de segurança (fora de épico):** **#62** fechou o limite conhecido do ADR-0011 —
> validação do **alvo de leitura** no `tool-guard` (fail-closed em alvo sensível/não-validável),
> via [ADR-0013](docs/decisions/0013-validacao-alvo-leitura-tool-guard.md).
>
> **Follow-up de governança do ledger (fora de épico):** **#67** decidiu a **semântica do ledger** —
> *as-accepted* (projeção histórica por Issue, fiel à entrega), via
> [ADR-0014](docs/decisions/0014-semantica-ledger-as-accepted.md) — e projetou a **#43** no
> `feature-ledger.json` (corpo corrigido nos 2 termos rascunho×entrega comprovados por git).

#### O1 — tarefas LEAN

| Tarefa | Descrição | Classe | Gate | Status | Issue |
|--------|-----------|--------|------|--------|-------|
| T1.1 | CI bloqueante: lint/test reprovam o build — remover `\|\| true` / `\|\| echo` da trilha Python; tolerar **apenas** o exit 5 do pytest ("nenhum teste coletado") | T2 | — | concluído | #15 |
| T1.2 | Alinhar G3 ao enforcement por perfil (Solo/Time): base comum (PR + 4 checks + linear + conversas) e exceção Solo (`approvals = 0` + merge humano/T3), via ADR-0003 | T2 | G2 (ADR) | concluído | #18 |
| T1.3 | Reconciliar `AGENTS.md §7` à postura lean/flat: Clean Arch/Hexagonal e event-driven → opt-in (default = encapsulamento simples); regra das 3 responsabilidades + guardrail dos 3–4 arquivos; via ADR-0004 | T2 | G2 (ADR) | concluído | #23 |

#### O2 — tarefas LEAN

| Tarefa | Descrição | Classe | Gate | Status | Issue |
|--------|-----------|--------|------|--------|-------|
| T2.0 | Stack Node/TS (ADR-0005) + esqueleto na raiz (`package.json`/`tsconfig`/`vitest`/`.nvmrc`/eslint/prettier); `npm install` + lockfile; `typecheck` no CI | T2 | G2 (ADR) | concluído | #26 |
| T2.1 | Feature Ledger executável (projeção das Issues SDD em JSON): schema + guard append-only + gerador; gate no smoke-test; cobertura vitest; via ADR-0006 | T2 | G2 (ADR) | concluído | #29 |
| T2.2 | Papel Initializer no pipeline (governança/doc): adiciona a fase `initialize` (bootstrap de ambiente executável), distinta do Prime, via ADR-0007 | T2 | G2 (ADR) | concluído | #31 |
| T2.3 | Template `init.sh` + convenção | T2 | — | concluído | #32 |
| T2.4 | Ritual get-bearings + regressão por sessão | T2 | — | concluído | #33 |

#### O3 — tarefas LEAN

| Tarefa | Descrição | Classe | Gate | Status | Issue |
|--------|-----------|--------|------|--------|-------|
| T3.0 | Separação Harness Review vs Product Review: bifurcar a fase _Review_ (regra de seleção por artefato + caso "ambos" + independência do revisor); novo `harness-reviewer-checklist.md`; via ADR-0008 | T2 | G2 (ADR) | concluído | #43 |

#### O4 — tarefas LEAN

| Tarefa | Descrição | Classe | Gate | Status | Issue |
|--------|-----------|--------|------|--------|-------|
| T4.1 | Verificação e2e com ferramenta real (convenção opt-in por tipo/risco: UI → automação de browser/MCP; API/CLI → exercício do contrato público); amarrada ao `agent-reviewer-checklist.md` e ao DoD (§12) + caso de exemplo rodável; via ADR-0009 | T2 | G2 (ADR) | concluído | #51 |
| T4.2 | Hook de sandbox/allowlist de referência (action system, modelo de confiança T0–T4) | T2 | G2 (ADR) | concluído | #52 |
| T4.3 | Observabilidade de custo/tokens | T2 | — | concluído | #53 |

#### O5 — tarefas LEAN

| Tarefa | Descrição | Classe | Gate | Status | Issue |
|--------|-----------|--------|------|--------|-------|
| T5.1 | Fast-lane para ações T1 (dispensa Issue/ADR no trivial elegível; mantém PR+CI+merge humano; elegibilidade conjuntiva + escalação; T4→blocked), via ADR-0017 | T2 | G2 (ADR) | concluída | #87 |
| T5.2 | Protocolo de revisão cross-model (modelo revisor/de-testes ≠ implementador; escalação por divergência) — operacionaliza a independência do ADR-0008, via ADR-0018 | T2 | G2 (ADR) | concluída | #91 |
| T5.3 | Núcleo L0 condensado (core sempre-carregado vs. detalhe sob demanda) — altera a estrutura formal do L0, logo exige ADR | T2 | G2 (ADR) | planejado | — |

> **Follow-up da T5.1 (dentro do O5):** **#89** aplicou os refinamentos deferidos da Harness Review do
> #88 (predicado auto-verificável + validado com vitest, rota fast-lane no Mermaid, escalação
> mid-build no §11.2, checklists issue-less, sinal `lane` Data-First) — sem novo ADR (opera dentro do
> ADR-0017). Não altera o status de T5.1 (`concluída`).

> Itens são desdobrados em tarefas LEAN e Issues SDD conforme cada épico é aprovado (G1). O detalhe
> de cada tarefa vive na sua Issue SDD (a #15 para a T1.1). Atualize o `STATE.md` ao mudar de fase
> ou status.
