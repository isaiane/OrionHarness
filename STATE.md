# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ **PRs mergeados**, L5; `CHANGELOG.md` = stub — [ADR-0025](docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger) — só o ponteiro (`Agora` / `Próximo passo` /
> `Última conclusão`) e o estado _forward-looking_ (riscos, navegação). Ao fechar a sessão, **roteie**
> (Regra de compactação, §4) — **não anexe narrativa** ("Antes…/Antes disso…").

## Agora

- **Épico O14** (board por sinal explícito) — **T14.1 (#307)**: ADR-0038 `proposto` — cinco colunas (sai
  `Ready`), o agente sinaliza a etapa por rótulo na Issue (`status:in-progress`, `status:in-review`, `blocked`)
  e o projetor só espelha; `needs-human-approval` não move coluna. Aguarda **G2**. **#257 (O13) pausada**
  (b3/c/d pendentes; flip só por dispatch).

## Próximo passo

- **G2 do ADR-0038** (flip `proposto→aceito` antes do merge) → **tarefa 2 do O14** (projetor por rótulo +
  skill + runbook) → retomar a **#257** (b3 → c → d) → **#259**. **#289** no backlog. Teto **WIP=1**.

## Última conclusão

- **#257 fatias a/b1/b2** — coalescência, invalidação por reabertura e passo humano exigido pelo check.
  _(História → PRs #304/#305/#306.)_

## Riscos / pendências em aberto

- **Janela de reopen (todo PR de flip):** `flip-revalidate` (preso ao SHA) **não** revalida se a Issue
  reabrir **entre o verde e o merge** → risco de flip falso. **Manual/dispatch:** procedural (merge pronto +
  conferir a Issue). **Gatilho automático** (ADR-0037): merge queue (ou equivalente) + invalidação por
  reabertura **estreitam** a janela, mas não a fecham — o resíduo segue **procedural** (passo humano no merge).
- **Go-live do flip DEFERIDO:** ligar evento/agenda exige serialização + estreitamento da janela + passo
  humano no merge + **monitor de liveness independente** (ADR-0037). Aplicação no **#257**. **Flips pendentes:** **#257**/**#259** `false` (flipam ao fechar).
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
