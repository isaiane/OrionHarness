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

> Itens são desdobrados em tarefas LEAN e Issues SDD conforme cada fase é aprovada. Atualize o
> `STATE.md` ao mudar de fase ou status.
