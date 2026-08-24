# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ **PRs mergeados**, L5; `CHANGELOG.md` = stub — [ADR-0025](docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger) — só o ponteiro (`Agora` / `Próximo passo` /
> `Última conclusão`) e o estado _forward-looking_ (riscos, navegação). Ao fechar a sessão, **roteie**
> (Regra de compactação, §4) — **não anexe narrativa** ("Antes…/Antes disso…").

## Agora

- **Fase do pipeline: Plan** (aguardando replanejamento G1) · **sem tarefa ativa (WIP=0).** **Épico O9**
  (fim do Markdown autoral como fonte) **concluído**: plano e
  história vivem em fonte estruturada (Milestones / PRs mergeados), o Markdown autoral virou ponteiro/stub, e
  o **guard de coerência** cobre a origem — inclusive o **mecanismo D4** (relatório gerado não vira fonte,
  **verificado** por sentinela + CHECK 5). **Épicos O1–O6 e O9 concluídos.**
- **Aberto:** **épico O8** (higiene sustentável do estado) — resta **T8.1b**
  ([#127](https://github.com/isaiane/OrionHarness/issues/127)), o `state-budget-check` (guard mínimo do STATE
  como ponteiro), **deferida e agora destravada**.

## Próximo passo

- **Replanejar (G1)** a próxima fatia — candidata natural: **T8.1b ([#127](https://github.com/isaiane/OrionHarness/issues/127))**,
  guard heurístico do orçamento do STATE, que **fecha o O8**. _(O9 fechar não fecha o O8.)_

## Última conclusão

- **[#174](https://github.com/isaiane/OrionHarness/issues/174)** (T9.7b, PR #178 + flip #179): **mecanismo
  D4** — sentinela nos 4 geradores + **CHECK 5** no guard de coerência reprova (via `git grep`) relatório
  gerado committado (`git add -f`/cópia). "Relatório não vira fonte" passa a ser **verificado**, não
  convenção. **Fecha o épico O9.** _(História → PR mergeado.)_

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
