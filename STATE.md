# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ **PRs mergeados**, L5; `CHANGELOG.md` = stub — [ADR-0025](docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger) — só o ponteiro (`Agora` / `Próximo passo` /
> `Última conclusão`) e o estado _forward-looking_ (riscos, navegação). Ao fechar a sessão, **roteie**
> (Regra de compactação, §4) — **não anexe narrativa** ("Antes…/Antes disso…").

## Agora

- **Fase do pipeline: Build** · **iniciativa "skill orquestradora versionada"** (ADR-0028 **aceito**) em
  implementação via **Issue [#193](https://github.com/isaiane/OrionHarness/issues/193)**. **S1 entregue**
  (fonte da skill em `skills/orion-orchestrator/` + fix "rotear"); a próxima é **S2** (packaging). **Épicos
  O1–O6, O8 e O9 concluídos** — **O7** (_Merge assistido_) segue **reservado / em preparação**.

## Próximo passo

- **S2** (packaging: build/install atômico + selo e check de frescor + docs); depois **S3** (classificar no
  manifesto + varredura do guard + teste de regressão "aterrissar") e o **follow-up S4** (reduzir espelhos
  T0–T4/fast-lane + completar templates SDD: proveniência de Milestone e DoD). Ordem S2 → S3 (ADR-0028).

## Última conclusão

- **S1** ([PR #194](https://github.com/isaiane/OrionHarness/pull/194), Issue #193): versiona a fonte da
  skill `orion-orchestrator` no repo + corrige "aterrissar→rotear" **na fonte** (ponteiro para §4/ADR-0024-0025).
  Restam S2/S3 + follow-up S4. _(História → PR mergeado.)_

## Riscos / pendências em aberto

- **Skill `orion-orchestrator`:** o handoff diz "aterrissar estado" (contra o **rotear** do §4) — em
  tratamento via **ADR-0028 / [#193](https://github.com/isaiane/OrionHarness/issues/193)** (versionar a
  skill no repo e corrigir na fonte).
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
