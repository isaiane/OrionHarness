# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ **PRs mergeados**, L5; `CHANGELOG.md` = stub — [ADR-0025](docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger) — só o ponteiro (`Agora` / `Próximo passo` /
> `Última conclusão`) e o estado _forward-looking_ (riscos, navegação). Ao fechar a sessão, **roteie**
> (Regra de compactação, §4) — **não anexe narrativa** ("Antes…/Antes disso…").

## Agora

- **Épico O15 — Consolidação e simplificação** (#20). **#347** (corte **C2**): ADR-0043 **aceito** — teto de
  duas rodadas de review do Codex por PR. Aguarda o merge. C3 (uma fonte por regra) aprovado, a seguir.

## Próximo passo

- Merge da #347 → **C3** (uma fonte por regra; G2) → decisão de Isa sobre C4, C5 e C8 → fechar o O15.
  Teto **WIP=1**.

## Última conclusão

- **#344/#334** — auditoria do harness + cortes C1/C6/C7 (flip diário, `priority:*`, Dependabot). _(História →
  PR #345.)_

## Riscos / pendências em aberto

- **Janela de reopen (todo PR de flip):** `flip-revalidate` (preso ao SHA) **não** revalida se a Issue
  reabrir **entre o verde e o merge** → risco de flip falso. **Manual/dispatch:** procedural (merge pronto +
  conferir a Issue). **Gatilho automático** (ADR-0037): merge queue (ou equivalente) + invalidação por
  reabertura **estreitam** a janela, mas não a fecham — o resíduo segue **procedural** (passo humano no merge).
- **Go-live do flip FEITO** (#257 d): resíduo procedural (passo humano no merge) e fora do alcance do monitor
  (Actions desligado no repo; mudança de ruleset — conferir por inspeção).
- **Skill `orion-orchestrator`:** o fix "aterrissar"→"rotear" **é imposto por CI** desde a S3 (regressão no
  `coherence-guard.test.ts`). Residual: a **cópia instalada** (app-managed) segue **defasada até reimport**
  do `.skill` reconstruído — fora do alcance do repo (ADR-0029).
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
