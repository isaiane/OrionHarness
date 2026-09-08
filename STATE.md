# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ **PRs mergeados**, L5; `CHANGELOG.md` = stub — [ADR-0025](docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger) — só o ponteiro (`Agora` / `Próximo passo` /
> `Última conclusão`) e o estado _forward-looking_ (riscos, navegação). Ao fechar a sessão, **roteie**
> (Regra de compactação, §4) — **não anexe narrativa** ("Antes…/Antes disso…").

## Agora

- **Épico O11** ([#16](https://github.com/isaiane/OrionHarness/milestone/16)) — **ADR-0032 aceito** (G2) e
  **aplicado** (#234/#235; `t*` armado). **#222 (leitor v2) completa**: `reconcileV2` plugado no
  `renderMilestonePlan` (casados 1:1 + "fora dos blocos", fail-closed, grandfather de `grandfather-v2.json`)
  + gramática dos 5 campos em blocos pendentes de Milestones sem grandfather. v2 aplicado
  (constituição/espelhos/manifesto). **O1–O6, O8, O9 concluídos**; **O7**/**O10** abertos.

## Próximo passo

- Backlog (aguardando G1): **#213** (guard append-only de ADR); **#244** (leitor v2 × descrições reais —
  H2 não-bloco faz `plan-report` falhar-fechado em O10/O11). WIP=1; novas tarefas nascem do Milestone (G1).

## Última conclusão

- **Hygiene — O7 (#12) reconciliado + ledger sem "aguardando flip"** — descrição do O7 recebeu o checklist
  v1 (`→ #203`), destravando o `plan-report` nesse épico legado; `F-0158-e8662f` excluída via superseded
  ([#158](https://github.com/isaiane/OrionHarness/issues/158)). _(Classificação → `.orion/ledger-lifecycle.json`.)_

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
