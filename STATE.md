# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ **PRs mergeados**, L5; `CHANGELOG.md` = stub — [ADR-0025](docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger) — só o ponteiro (`Agora` / `Próximo passo` /
> `Última conclusão`) e o estado _forward-looking_ (riscos, navegação). Ao fechar a sessão, **roteie**
> (Regra de compactação, §4) — **não anexe narrativa** ("Antes…/Antes disso…").

## Agora

- **#244 (leitor v2 × descrições reais)** — **aplicação do ADR-0034** entregue: `parseMilestoneBodyV2` aceita
  H2 não-bloco no preâmbulo, skill (grammar) e testes alinhados. Resta o render-limpo-ao-vivo (`bd6045`),
  bloqueado por dado de proveniência → **#251** (traços ADR-0032); #244 fecha com o #251. **Só O10/T10.1
  concluída** (#246; T10.2–T10.4 pendentes); **O11 concluído**; O1–O6, O8, O9 concluídos; **O7** aberto.

## Próximo passo

- **#251** (traços `Promovida de:` não-conformes → destrava `bd6045`/#244); ou **#213** (guard append-only de
  ADR); ou **T10.2** (Action de flip). Todos aguardando **G1**. WIP=1; tarefas nascem do Milestone.

## Última conclusão

- **O10 — T10.1 (ADR-0033) concluída** ([#206](https://github.com/isaiane/OrionHarness/issues/206))
  — decisão do flip automatizado + Projects derivado, aceita e mergeada (#246). _(História → PR #246.)_

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
