# ADR-0007 — Papel Initializer no pipeline (bootstrap de ambiente executável)

> **Numeração (repo):** a `main` tem ADRs `0001–0006`, então este é o **0007**.

- **Status:** aceito
- **Data:** 2026-06-27
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** `AGENTS.md` §2 (pipeline de fases), §2.1 (Prime), §4 (compactação/retomada);
  ADR-0006 (ledger); Issue #31; épico **O2**; _Effective Harnesses for Long-Running Agents_
  (initializer agent); benchmark `autonomous-coding` (`initializer_prompt.md`)

## Contexto
O artigo separa **dois papéis** com prompts iniciais distintos: **initializer** (primeira sessão,
prepara o ambiente) + **coding agent** (sessões seguintes, progresso incremental). O Orion tem o
loop (pipeline de fases) e o **Prime** (verifica *contexto*), mas **não** tem o papel que prepara o
**ambiente executável**. Hoje esse bootstrap é um checklist **manual** no `getting-started.md` — sem
ele, cada sessão redescobre como subir o projeto e pode herdar quebras não documentadas.

## Decisão
Adicionar o papel **`initialize`** ao pipeline, **distinto do Prime**:

1. **Prime** (Fase 0) prepara **contexto** (Spec/Product Context, gate G0). **Initializer** prepara
   **ambiente executável**.
2. O Initializer roda **uma vez** no bootstrap do projeto (após o primeiro Prime), produzindo:
   `init.sh` (impl em T2.3), o **`feature-ledger.json` inicial** (via `ledger-from-issues`, ADR-0006),
   notas de progresso e o **commit inicial**.
3. **Pipeline** em `AGENTS.md §2` passa a:
   `prime → initialize → plan → spec → build → review → ship` — `initialize` é **fase de bootstrap
   opcional**, executada quando o ambiente ainda não existe (pulada se já existe).
4. **Complementaridade:** não substitui o Prime nem o `getting-started.md` (onboarding humano segue
   válido); **equipa** o ambiente que o Prime contextualizou.

**Escopo deste ADR:** adicionar o papel e atualizar o pipeline/doc. A **implementação do `init.sh`**
é a **T2.3** e o **ritual de sessão** ("get bearings + regressão") é a **T2.4** — fora daqui.

## Alternativas consideradas
- **Sobrecarregar o Prime com o bootstrap:** rejeitada — mistura responsabilidades (contexto vs.
  ambiente) e dilui o gate G0.
- **Manter só o checklist manual:** rejeitada — não é runnable, não economiza contexto e não dá
  base para o ritual de regressão (T2.4).

## Consequências
- **Positivas:** sessões iniciam com estado conhecido; retomada mais barata (menos tokens); base
  para o check de regressão de início de sessão (T2.4); fecha a metade do kernel do artigo que
  faltava.
- **Negativas / riscos:** um papel a mais no pipeline. Mitigação: é fase de bootstrap **leve**
  (one-time), e o detalhe operacional (`init.sh`) fica na T2.3.

## Conformidade
Verificável: pipeline em `AGENTS.md §2` inclui `initialize`, distinto do Prime; o ADR documenta o
handoff de bootstrap (init.sh, ledger inicial, progress, commit inicial); implementação concreta
referida às tarefas T2.3/T2.4.
