# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ **PRs mergeados**, L5; `CHANGELOG.md` = stub — [ADR-0025](docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger) — só o ponteiro (`Agora` / `Próximo passo` /
> `Última conclusão`) e o estado _forward-looking_ (riscos, navegação). Ao fechar a sessão, **roteie**
> (Regra de compactação, §4) — **não anexe narrativa** ("Antes…/Antes disso…").

## Agora

- **Sem tarefa ativa** (WIP=0; teto 1). **#257:** sub-A (#260) + **B1** (#265, check `flip-revalidate`)
  entregues; **B2 pausada** (ver riscos). **#259:** runbook (#261) entregue; rewrite atrelado ao deploy da
  B2 → também pausado. Flip do ledger é **manual** (como no #213/#264).

## Próximo passo

- **Sem próximo passo do agente** enquanto a B2 está pausada. **Ato humano:** decidir o tier de enforcement
  (repo público / GitHub Pro / Team-org) — só então a B2 (App/automação) e o passo 4 (ruleset) fazem
  sentido. Novo work item do fluxo completo → **replanejar (G1)**. Flip futuro: **manual** por ora.

## Última conclusão

- **#257 fatia B1 — workflow `flip-revalidate`** em todo PR à `main` (filtro interno; required-check do
  ruleset sem travar PRs comuns). _(História → PR #265; flip de #213 → #264.)_

## Riscos / pendências em aberto

- **Enforcement de ruleset ausente (repo privado + conta pessoal Free):** rulesets/branch-protection **não
  são impostos** → o G3 e a fronteira "App **não** mergeia" (ADR-0033) são **puramente procedurais**. Por
  isso a **B2 (App/automação de flip) está pausada**: um App merge-capable (`Contents:write`) + chave em
  secrets, **sem** bloqueio técnico, é piora de segurança vs. o **flip manual**. Retomar B2 só com
  enforcement (público/Pro/Team). **Higiene:** se o App já foi instalado, **remover App + secrets** enquanto
  pausado. (#257/#259 seguem abertas como trackers; flip de #257/#259 quando fecharem.)
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
