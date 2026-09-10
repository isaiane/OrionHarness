# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ **PRs mergeados**, L5; `CHANGELOG.md` = stub — [ADR-0025](docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger) — só o ponteiro (`Agora` / `Próximo passo` /
> `Última conclusão`) e o estado _forward-looking_ (riscos, navegação). Ao fechar a sessão, **roteie**
> (Regra de compactação, §4) — **não anexe narrativa** ("Antes…/Antes disso…").

## Agora

- **Sem tarefa ativa** (WIP=0 agora; teto 1). As fatias restantes de **#257** (workflow `flip-batch.yml`) e
  **#259** (rewrite `CONTRIBUTING`/`getting-started`) estão **bloqueadas no ato humano**: instalar o GitHub
  App do flip ([`docs/runbooks/flip-app-install.md`](docs/runbooks/flip-app-install.md)). O `--list-issues`
  do núcleo já entrou (#260).

## Próximo passo

- **Flip de #213** (manutenção T2 — 4 entradas `false→true`, já elegível/evidenciado em `main`): próximo
  passo acionável pelo agente (independe do App).
- **Ato humano (paralelo):** install App/secrets → **deploy + seed da fatia B** → **completar o ruleset**
  (nesta ordem — `flip-revalidate` só vira required após a fatia B rodar; runbook §4) → destrava a **fatia B
  de #257** e o **rewrite de #259** (atômico com o deploy). Sem o App, **replanejar (G1)**; depois **T10.3**
  (Project). Teto **WIP=1**.

## Última conclusão

- **#213 — guard append-only do histórico de ADRs** (base×head, fail-closed) — reprova remoção/renumeração
  de ADR mergeado; complementa a sequência do #208. _(História → PR #262.)_

## Riscos / pendências em aberto

- **Flips de ledger pendentes (pós-merge):** **#213** → em flip (ver Próximo passo); **#257**/**#259** nascem
  `false` e só flipam quando suas Issues fecharem. Lista: `tools/ledger/ledger-origin.ts --scoped`.
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
