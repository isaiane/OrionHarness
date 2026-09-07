# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ **PRs mergeados**, L5; `CHANGELOG.md` = stub — [ADR-0025](docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger) — só o ponteiro (`Agora` / `Próximo passo` /
> `Última conclusão`) e o estado _forward-looking_ (riscos, navegação). Ao fechar a sessão, **roteie**
> (Regra de compactação, §4) — **não anexe narrativa** ("Antes…/Antes disso…").

## Agora

- **Épico O11** ([#16](https://github.com/isaiane/OrionHarness/milestone/16)) — aplicação do v2 concluída
  (constituição + espelhos + manifesto; flip `F-0225` feito). Em curso: **ADR-0032** (#236, **G2 proposto**) —
  decide o **modelo de proveniência `Promovida de:`** (formato classes A/B **+** casamento do leitor v2 **+**
  corte). O #234/#235 (skill/template/form) vira **aplicação G1** do ADR (**#235 pausado/draft**); a **#222**
  implementa o casamento. Épicos **O1–O6, O8, O9 concluídos**; **O7**/**O10** abertos.

## Próximo passo

- **G2 do ADR-0032** (#236): aprovar a decisão + **flip `proposto`→`aceito`** (preenchendo o **corte** =
  instante UTC de aceite) **antes** do merge. Sequência: **ADR-0032 (G2)** → **aplicação** skill/template/form
  (re-escopo do #235, G1) → **#222** (leitor). **#207 (re-G1)** destrava os flips `F-0207-*`. Backlog: **#213**
  (guard append-only de ADR); O7 (#12) tem a #203 fora do checklist → `plan-report` live falha-fechado (dado
  pré-existente). WIP=1; novas tarefas nascem do Milestone (G1).

## Última conclusão

- **O11 — proposta ADR-0032** ([#236](https://github.com/isaiane/OrionHarness/pull/236)) — modelo de
  proveniência `Promovida de:` (formato A/B + casamento + corte) consolidado num só ADR após o review do
  Codex mostrar que o **formato também é governança** (G2). #235 (formato) pausado → vira aplicação do ADR.
  _(Aguardando G2; decisão-only, nada dependente no PR.)_

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
