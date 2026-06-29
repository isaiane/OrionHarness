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
2. O Initializer roda **uma vez** no bootstrap do projeto (após o primeiro Prime), **propondo**:
   `init.sh` (impl em T2.3), notas de progresso e o **commit inicial** do estado executável. **O
   `feature-ledger.json` inicial NÃO faz parte do bootstrap** (ver item 4).
3. **Caminho de bootstrap pré-Plan — resolve o deadlock de ordem.** O bootstrap **não depende de
   Plan→Spec**: após o Prime (G0), abre-se uma **Issue de bootstrap de primeira classe**, com seu
   **próprio G1** (aprovação humana do work item), **independente do ciclo Plan→Spec**. O Initialize
   a executa pelo **fluxo Git normal** (branch por Issue → PR → **merge humano**, T3/G3). **Dentro do
   fluxo SDD, sem exceção à §1 (Princípio 2) nem à §6**: o agente **propõe**; o humano **aprova e
   mergeia**; **nada de commit autônomo nem escrita fora de Issue aprovada**. (A definição do G1 em
   `AGENTS.md §3` explicita esse caminho de bootstrap.)
4. **Ledger fora do bootstrap (deferido).** O `feature-ledger.json` inicial é gerado **depois**,
   quando já existem **Issues de feature** (pós-Spec) para projetar — coerente com o
   **semeia-e-cresce** do ADR-0006. Não há ledger a projetar pré-Plan, então o ledger **não** é
   entregável do Initialize.
5. **Pipeline** em `AGENTS.md §2` passa a:
   `prime → initialize → plan → spec → build → review → ship` — `initialize` é **fase de bootstrap
   opcional e gateada** (não uma fase "livre"): executada quando o ambiente ainda não existe (pulada
   se já existe), sempre via Issue de bootstrap aprovada (G1).
6. **Complementaridade:** não substitui o Prime nem o `getting-started.md` (onboarding humano segue
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
Verificável: pipeline em `AGENTS.md §2` inclui `initialize`, distinto do Prime; o bootstrap segue um
**caminho pré-Plan gateado** (Issue de bootstrap de primeira classe → G1 → branch → PR → merge
humano), sem depender de Plan→Spec e sem commit autônomo; o handoff de bootstrap é `init.sh`,
progress e commit inicial — **o `feature-ledger.json` inicial fica fora do bootstrap** (gerado
pós-Spec, ADR-0006); implementação concreta referida às tarefas T2.3/T2.4.
