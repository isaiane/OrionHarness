# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ **PRs mergeados**, L5; `CHANGELOG.md` = stub — [ADR-0025](docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger) — só o ponteiro (`Agora` / `Próximo passo` /
> `Última conclusão`) e o estado _forward-looking_ (riscos, navegação). Ao fechar a sessão, **roteie**
> (Regra de compactação, §4) — **não anexe narrativa** ("Antes…/Antes disso…").

## Agora

- **Épico O10** — board derivado **ao vivo**: projetor-único no Project 7 (token `project`-only), convenção
  `Blocked` ↔ rótulos de gate, associação pela branch (`feat|fix|chore/<n>-…`, `tests/issue-N`), eventos
  `create`/`delete`/`edited`, serialização por Issue nos eventos e reconciliação **diária**.

## Próximo passo

- **Fechar os pendentes do O10** antes de fechá-lo (bloco 8, G1): regex do nome da branch ancorado no nome
  inteiro + reconciliação sob o lock por Issue; decidir o critério de "divergência impossível" do #272
  (provar ou superseder, ADR-0027). Depois, **O13** (go-live do flip): ADR do gatilho (**G2**) → #257 → #259.
  **#289** no backlog. Teto **WIP=1**.

## Última conclusão

- **#278** — board via branch, `edited`, serialização por Issue e reconciliação diária; dry-run da
  reconciliação conferido. _(História → PR #296.)_

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
