# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ **PRs mergeados**, L5; `CHANGELOG.md` = stub — [ADR-0025](docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger) — só o ponteiro (`Agora` / `Próximo passo` /
> `Última conclusão`) e o estado _forward-looking_ (riscos, navegação). Ao fechar a sessão, **roteie**
> (Regra de compactação, §4) — **não anexe narrativa** ("Antes…/Antes disso…").

## Agora

- **Épico O10** — **T10.3 (#272) em entrega**: board como **projeção derivada projetor-único** (ADR-0033);
  a projeção (`tools/projects/board-projection.ts` + workflow `project-board`) é o **único escritor** de
  Status; automações nativas **a desligar no setup humano** (pendente — só então ligar o projetor ao vivo,
  senão haveria dois escritores). Re-G1 do #272 alinhou "nativo-primeiro" → escritor-único (constituição
  vence). Alvo: Project 7. WIP=1.

## Próximo passo

- **Pós-merge do #272:** **setup humano do Project 7** (desligar as automações nativas de Status, secrets
  `APP_ID`/`APP_PRIVATE_KEY`, rótulos `ready`/`pipeline:contract`) + **dry-run** da reconciliação; depois
  **T10.4 (#274)** (label de gate + runbook + skill). **Cron-go-live do flip (#257/#259)** segue **deferido**
  (Codex #268, 2×P1: merge-queue + invalidação + liveness + serialização) → **replan (G1)**. Teto **WIP=1**.

## Última conclusão

- **O11 encerrado** — Milestone **#16 fechado**; épico do modelo de plano v2 completo (9/9 Issues;
  `F-0207-b41939` é superseded/ADR-0027, não flip pendente). _(História → PRs #210–#242; #257 B2 → PR #267.)_

## Riscos / pendências em aberto

- **Janela de reopen (todo PR de flip):** `flip-revalidate` (preso ao SHA) **não** revalida se a Issue
  reabrir **entre o verde e o merge** → risco de flip falso. **Manual/dispatch:** procedural (merge pronto +
  conferir a Issue). **Cron autônomo:** exige fechamento técnico (merge-queue + invalidação) — no go-live.
- **Cron-go-live DEFERIDO:** ligar o `schedule` exige merge-queue + invalidação + liveness + serialização
  (Codex #268). Follow-up no **#257**. **Flips pendentes:** **#257**/**#259** `false` (flipam ao fechar).
- **Skill `orion-orchestrator`:** o fix "aterrissar"→"rotear" **é imposto por CI** desde a S3 (regressão no
  `coherence-guard.test.ts`). Residual: a **cópia instalada** (app-managed) segue **defasada até reimport**
  do `.skill` reconstruído — fora do alcance do repo (ADR-0029).
- **`.github/labels.yml`** ainda tem labels de stack multi-linguagem — reavaliar sob a leitura única Node/TS.
- Confirmar a licença (atual: MIT) ao adotar em contexto organizacional.
- **Perfil de proteção = Solo (procedural, ADR-0003):** o "humano aprova" no merge é procedural — inclui a
  fronteira **"App não integra"**: o ruleset exige PR + `flip-revalidate`, mas o `Contents:write` do App
  **poderia** mergear (sem exclusão actor-level imposta em solo); o workflow não faz merge e você é quem
  mergeia. Migrar p/ perfil Time (`approvals ≥ 1` + `CODEOWNERS`) endurece.

## Ponteiros

**GitHub Milestones** (mapa de épicos — fonte; relatório sob demanda `node --experimental-strip-types tools/plan/plan-report.ts`, precisa de rede) ·
[`PLAN.md`](PLAN.md) (stub-ponteiro) · [`CHANGELOG.md`](CHANGELOG.md) (L5, stub → PRs mergeados) ·
[`docs/decisions/README.md`](docs/decisions/README.md) (índice de ADRs — `grep` por tema) ·
[`AGENTS.md`](AGENTS.md) §4 (Regra de compactação) · [`AGENTS.core.md`](AGENTS.core.md) (núcleo L0) ·
[`docs/getting-started.md`](docs/getting-started.md) §7 (ritual get-bearings) · [`MEMORY.md`](MEMORY.md)
