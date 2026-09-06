# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ **PRs mergeados**, L5; `CHANGELOG.md` = stub — [ADR-0025](docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger) — só o ponteiro (`Agora` / `Próximo passo` /
> `Última conclusão`) e o estado _forward-looking_ (riscos, navegação). Ao fechar a sessão, **roteie**
> (Regra de compactação, §4) — **não anexe narrativa** ("Antes…/Antes disso…").

## Agora

- **Épico O11** ([#16](https://github.com/isaiane/OrionHarness/milestone/16)) — **aplicação do v2**. Fatias
  (a), (b) e (c) mergeadas: o **v2 é canônico e ativo** (`AGENTS.md` §2/§4 verbatim; `plan-report` dual-format).
  Em curso: **fatia (d)** ([#225](https://github.com/isaiane/OrionHarness/issues/225), sub-fatias d1/d2/d3) —
  **d1** (runbook `github-projects.md`) **feito**; faltam **d2** (espelhos leves) e **d3** (manifesto).
  Épicos **O1–O6, O8, O9 concluídos**; **O7**/**O10** abertos.

## Próximo passo

- **Fatia (d)** ([#225](https://github.com/isaiane/OrionHarness/issues/225)) — próximas sub-fatias (≤3–4
  arquivos; §7): **d2** espelhos leves (`CONTRIBUTING`/`plans/README`/`discovery-guide`/`PLAN.md` + `getting-started`
  se preciso), **d3** `docs/examples/artifact-manifest.ts` (+ coherence self-check). É a **mitigação da janela**
  (enquanto v1, esses guias contradizem o §2/§4 já v2). **Antes** de flipar `F-0207-b41939` (fica `false`):
  corrigir a **#207 (re-G1)** — o re-fatiamento tornou "skill no mesmo PR do ADR" insatisfazível;
  `F-0207-ec162a` (coerência) fica `false` até (d) completa.
  **Achado (candidato a follow-up):** o Milestone #12 (O7) tem a #203 associada fora do checklist →
  `plan-report` live falha-fechado nele (dado pré-existente do O7). Backlog: **#222** (leitor v2 — gramática
  profunda dos 5 rótulos, prompt do `Como iniciar`, casamento 1:1, fences CommonMark) · **#213** (guard
  append-only base×head do histórico de ADR + hardening `--new`). WIP=1; novas tarefas nascem do Milestone (G1).

## Última conclusão

- **O11 aplicação (d1)** ([#225](https://github.com/isaiane/OrionHarness/issues/225)) — runbook
  `github-projects.md` no v2 (descrição = plano completo, promoção nativa sem `→ #N`, `Promovida de:` com
  snapshot). O **v2 já é canônico** desde a (c) ([#224](https://github.com/isaiane/OrionHarness/issues/224),
  `AGENTS.md` §2/§4 verbatim). _(História → PR mergeado; flip `F-0224` concluído; `F-0225` só após d1+d2+d3.)_

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
