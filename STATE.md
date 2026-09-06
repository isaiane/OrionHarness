# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ **PRs mergeados**, L5; `CHANGELOG.md` = stub — [ADR-0025](docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger) — só o ponteiro (`Agora` / `Próximo passo` /
> `Última conclusão`) e o estado _forward-looking_ (riscos, navegação). Ao fechar a sessão, **roteie**
> (Regra de compactação, §4) — **não anexe narrativa** ("Antes…/Antes disso…").

## Agora

- **Épico O11** ([#16](https://github.com/isaiane/OrionHarness/milestone/16)) — **aplicação do v2**. Fatias
  (a) e (b) mergeadas: skill/templates/form no v2 **e** o `plan-report` agora **dual-format** (v1 legado +
  v2 + `stateReason`). Próxima: **fatia (c)** — `AGENTS.md` §2/§4. **T11.1–T11.3 + (a) + (b) entregues.**
  Épicos **O1–O6, O8, O9 concluídos**; **O7**/**O10** abertos.

## Próximo passo

- **Aplicação do v2**, fatias restantes (≤3–4 arquivos cada; §7/ADR-0031 ponto 5): (c) `AGENTS.md` §2/§4
  verbatim (G1, **ativa** o v2 e **remove a nota de transição** da skill); (d) espelhos
  (`CONTRIBUTING`/`getting-started`/runbooks/`discovery-guide`/`PLAN.md`); (e) `docs/examples/artifact-manifest.ts`.
  **Antes** de flipar `F-0207-b41939` (fica `false`): corrigir a **#207 (re-G1)** — o re-fatiamento tornou
  "skill no mesmo PR do ADR" insatisfazível; `F-0207-ec162a` (coerência) fica `false` até (c)–(e).
  **Achado (candidato a follow-up):** o Milestone #12 (O7) tem a #203 associada fora do checklist →
  `plan-report` live falha-fechado nele (dado pré-existente do O7). Backlog: **#222** (leitor v2 — gramática
  profunda dos 5 rótulos, prompt do `Como iniciar`, casamento 1:1, fences CommonMark) · **#213** (guard
  append-only base×head do histórico de ADR + hardening `--new`). WIP=1; novas tarefas nascem do Milestone (G1).

## Última conclusão

- **O11 aplicação (b)** ([#220](https://github.com/isaiane/OrionHarness/issues/220)) — `plan-report`
  **dual-format** (v1 legado + v2 + `stateReason`): lê blocos de design v2, reconcilia Issues pelo estado
  nativo (sem `→ #N`) e conta concluídas por `stateReason` (not planned/duplicate ≠ concluída). Verificado
  nos Milestones reais O10/O11. _(História → PR mergeado; flip do ledger `F-0220` = follow-up.)_

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
