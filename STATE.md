# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ **PRs mergeados**, L5; `CHANGELOG.md` = stub — [ADR-0025](docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger) — só o ponteiro (`Agora` / `Próximo passo` /
> `Última conclusão`) e o estado _forward-looking_ (riscos, navegação). Ao fechar a sessão, **roteie**
> (Regra de compactação, §4) — **não anexe narrativa** ("Antes…/Antes disso…").

## Agora

- **T10.2 / #257 (Action de flip em lote)** — **núcleo** em entrega: `flip-batch.ts` (elegível = awaiting-flip
  ∩ evidência da Issue) + `flip-revalidate.ts` (checagem-que-bloqueia-o-merge) + 13 testes. **Workflow**
  (`flip-batch.yml` + helper) re-fatiado para fatia dedicada (mecânica-GitHub, validável só por dispatch real
  com o App); **docs** do split de owner → **#259**. **Só O10/T10.1 concluída**; O1–O6, O8, O9, O11
  concluídos; **O7** aberto.

## Próximo passo

- Fatia do **workflow** de #257 (`flip-batch.yml` + `flip-issues-json.sh` via `--list-issues` de awaitingFlip;
  paginação, 1MB→raw, concurrency global, status context, triggers) — validar por dispatch. Depois **#259**
  (docs) e **T10.3** (Project). Backlog: **#213**. WIP=1.

## Última conclusão

- **#244 + #251 — leitor v2 × descrições reais** ([#244](https://github.com/isaiane/OrionHarness/issues/244))
  — gramática H2 no preâmbulo (ADR-0034) + proveniência/checklists conformados; `plan-report` ao vivo limpo.
  _(História → PRs #248/#250/#253/#255.)_

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
