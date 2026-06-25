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
| O1 | Coerência dos guardrails | CI bloqueante (T1.1) + alinhar o gate de review ao enforcement (T1.2) | em andamento | #15 (T1.1, concluída) · #18 (T1.2, em review) |

#### O1 — tarefas LEAN

| Tarefa | Descrição | Classe | Gate | Status | Issue |
|--------|-----------|--------|------|--------|-------|
| T1.1 | CI bloqueante: lint/test reprovam o build — remover `\|\| true` / `\|\| echo` da trilha Python; tolerar **apenas** o exit 5 do pytest ("nenhum teste coletado") | T2 | — | concluído | #15 |
| T1.2 | Alinhar G3 ao enforcement por perfil (Solo/Time): base comum (PR + 4 checks + linear + conversas) e exceção Solo (`approvals = 0` + merge humano/T3), via ADR-0003 | T2 | G2 (ADR) | em review | #18 |

> Itens são desdobrados em tarefas LEAN e Issues SDD conforme cada épico é aprovado (G1). O detalhe
> de cada tarefa vive na sua Issue SDD (a #15 para a T1.1). Atualize o `STATE.md` ao mudar de fase
> ou status.
