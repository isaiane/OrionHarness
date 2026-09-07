# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ **PRs mergeados**, L5; `CHANGELOG.md` = stub — [ADR-0025](docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger) — só o ponteiro (`Agora` / `Próximo passo` /
> `Última conclusão`) e o estado _forward-looking_ (riscos, navegação). Ao fechar a sessão, **roteie**
> (Regra de compactação, §4) — **não anexe narrativa** ("Antes…/Antes disso…").

## Agora

- **Épico O11** ([#16](https://github.com/isaiane/OrionHarness/milestone/16)) — **aplicação do v2 completa**.
  `AGENTS.md` §2/§4 verbatim, `plan-report` dual-format, e **todos** os espelhos current-state
  (runbook/guias/stubs/README/MEMORY/plan-report JSDoc) + manifesto no v2 — fatia (d) #225 (d1/d2/d3/d4,
  consolidou (d)+(e)). Épicos **O1–O6, O8, O9 concluídos**; **O7**/**O10** abertos.

## Próximo passo

- **Flip `F-0225-*`** (6/6 → `true`) — follow-up **pós-merge** do d4 (o **merge do d4 fecha #225**; o flip só
  projeta verificação). **Antes** de flipar
  `F-0207-b41939` (fica `false`): corrigir a **#207 (re-G1)** — o re-fatiamento tornou "skill no mesmo PR do
  ADR" insatisfazível; `F-0207-ec162a` fica `false` até a #207.
  **Achado (candidato a follow-up):** o Milestone #12 (O7) tem a #203 associada fora do checklist →
  `plan-report` live falha-fechado nele (dado pré-existente do O7). Backlog: **#222** (leitor v2 — gramática
  profunda dos 5 rótulos, prompt do `Como iniciar`, casamento 1:1, fences CommonMark) · **#213** (guard
  append-only base×head do histórico de ADR + hardening `--new`). WIP=1; novas tarefas nascem do Milestone (G1).

## Última conclusão

- **O11 aplicação (d4 / fatia d completa)** ([#225](https://github.com/isaiane/OrionHarness/issues/225)) —
  `README.md`, `MEMORY.md` e o JSDoc do `plan-report` alinhados ao v2 (dual-format). **Aplicação do v2
  concluída:** constituição, espelhos e manifesto coerentes. _(História → PR mergeado; flip `F-0225` =
  follow-up pós-merge.)_

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
