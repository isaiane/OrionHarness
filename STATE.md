# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ **PRs mergeados**, L5; `CHANGELOG.md` = stub — [ADR-0025](docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger) — só o ponteiro (`Agora` / `Próximo passo` /
> `Última conclusão`) e o estado _forward-looking_ (riscos, navegação). Ao fechar a sessão, **roteie**
> (Regra de compactação, §4) — **não anexe narrativa** ("Antes…/Antes disso…").

## Agora

- **Fase do pipeline: Plan** (aguardando replanejamento G1) · **sem tarefa ativa (WIP=0).** **Épicos
  O1–O6, O8 e O9 concluídos** — **O7** (_Merge assistido_) segue **reservado / em preparação**. O **épico
  O8** (higiene sustentável do estado) fechou com **T8.1b**
  ([#127](https://github.com/isaiane/OrionHarness/issues/127)): a rede `state-budget-check` (guard
  heurístico do STATE como ponteiro) está **ativa** no smoke-test.

## Próximo passo

- **Replanejar (G1)** a próxima fatia/épico — **sem candidata pré-definida** (WIP=0). O mapa de épicos
  vive nos **Milestones** (relatório sob demanda `node --experimental-strip-types tools/plan/plan-report.ts`,
  precisa de rede).

## Última conclusão

- **[#127](https://github.com/isaiane/OrionHarness/issues/127)** (T8.1b, PR #188 + ledger #189/#190): rede
  `state-budget-check` **ativa** — reprova sinais óbvios de história/status vazando ao STATE (tamanho,
  retro-narrativa, datas acumuladas, repetição do rótulo de conclusão, checkbox), com isenções sancionadas
  de ponteiro. É **rede, não garantia** (§8.1). **Fecha o épico O8.** _(História → PR mergeado.)_

## Riscos / pendências em aberto

- **Fora do repo:** o template de handoff da skill `orion-orchestrator` ainda diz "aterrissar estado no
  STATE.md" — atualizar para **rotear** (senão novas tarefas reintroduzem o inchaço).
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
