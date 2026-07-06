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
| O4 | Verificação real & execução equipada | Materializar o §8.1 com instrumento: convenção e2e opt-in com ferramenta real (T4.1) → hook de sandbox/allowlist de referência (T4.2) → observabilidade de custo/tokens (T4.3), via ADR-0009 | em andamento | #51 (T4.1, concluída) · #52 (T4.2) · #53 (T4.3) |

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
| T4.2 | Hook de sandbox/allowlist de referência (action system, modelo de confiança T0–T4) | T2 | G2 (ADR) | planejado | #52 |
| T4.3 | Observabilidade de custo/tokens | T2 | — | planejado | #53 |

> Itens são desdobrados em tarefas LEAN e Issues SDD conforme cada épico é aprovado (G1). O detalhe
> de cada tarefa vive na sua Issue SDD (a #15 para a T1.1). Atualize o `STATE.md` ao mudar de fase
> ou status.
