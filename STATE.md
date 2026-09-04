# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ **PRs mergeados**, L5; `CHANGELOG.md` = stub — [ADR-0025](docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger) — só o ponteiro (`Agora` / `Próximo passo` /
> `Última conclusão`) e o estado _forward-looking_ (riscos, navegação). Ao fechar a sessão, **roteie**
> (Regra de compactação, §4) — **não anexe narrativa** ("Antes…/Antes disso…").

## Agora

- **Épico O11** ([#16](https://github.com/isaiane/OrionHarness/milestone/16)) ativo — **T11.3**
  ([#209](https://github.com/isaiane/OrionHarness/issues/209)) **entregue, em revisão**: reescrita da
  **#206** e da descrição do **O10 (#15)** para o formato v2 (blocos de design + `## Como iniciar`) **sem
  cravar número de ADR a criar** (preassign) nem scratch — citação de ADR **aceito** permanece (ADR-0031
  §3). **T11.2** mergeada (guard `--check` ativo). Épicos
  **O1–O6, O8, O9 concluídos**; **O7** e **O10** abertos.

## Próximo passo

- **Mergear #215 (T3/G3)** e, **pós-merge**, flipar as 6 `F-0209-*` (`false→true`). Depois: a **aplicação
  do v2** em **sub-fatias ordenadas** (≤3–4 arquivos cada; §7/ADR-0031): (a) **skill + templates + form**
  `sdd-task.yml`; (b) **`plan-report` dual-format** (v1+v2 + `stateReason`) — **antes** de (c); (c)
  `AGENTS.md` §2/§4 verbatim (G1, ativa o v2); (d) espelhos (`CONTRIBUTING`/`getting-started`/runbooks/`discovery-guide`/`PLAN.md`);
  (e) `docs/examples/artifact-manifest.ts`. **Antes** de flipar `F-0207-b41939` (fica `false`): corrigir a
  **#207 (re-G1)** — o re-fatiamento tornou "skill no mesmo PR do ADR" insatisfazível; `F-0207-ec162a`
  (coerência) fica `false` até (c)–(e). Backlog: **#213** (guard append-only base×head do histórico de ADR
  + hardening residual do `--new`). WIP=1; novas tarefas nascem do Milestone/épico (G1).

## Última conclusão

- **T11.2** ([#208](https://github.com/isaiane/OrionHarness/issues/208)) — gerador + guard de sequência de
  ADR **mergeado** (PR #212); ledger **6/6** flipado (PR #214). _(História → PR mergeado.)_

## Riscos / pendências em aberto

- **Skill `orion-orchestrator`:** o fix "aterrissar"→"rotear" **é imposto por CI** desde a S3 (regressão no
  `coherence-guard.test.ts`). Residual: a **cópia instalada** (app-managed) segue **defasada até reimport**
  do `.skill` reconstruído — fora do alcance do repo (ADR-0029).
- **`.github/labels.yml`** ainda tem labels de stack multi-linguagem — reavaliar sob a leitura única Node/TS.
- Confirmar a licença (atual: MIT) ao adotar em contexto organizacional.
- **Perfil de proteção = Solo:** o "humano aprova" no merge é procedural (ADR-0003); migrar para o perfil
  Time (`approvals ≥ 1` + `CODEOWNERS`) com 2+ mantenedores.

## Ponteiros

**GitHub Milestones** (mapa de épicos — fonte; relatório sob demanda `node --experimental-strip-types tools/plan/plan-report.ts`, precisa de rede) ·
[`PLAN.md`](PLAN.md) (stub-ponteiro) · [`CHANGELOG.md`](CHANGELOG.md) (L5, stub → PRs mergeados) ·
[`docs/decisions/README.md`](docs/decisions/README.md) (índice de ADRs — `grep` por tema) ·
[`AGENTS.md`](AGENTS.md) §4 (Regra de compactação) · [`AGENTS.core.md`](AGENTS.core.md) (núcleo L0) ·
[`docs/getting-started.md`](docs/getting-started.md) §7 (ritual get-bearings) · [`MEMORY.md`](MEMORY.md)
