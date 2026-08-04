# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ `CHANGELOG.md`, L5) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger / refletido no `PLAN.md` L1) — só o ponteiro (`Agora` / `Próximo passo` /
> `Última conclusão`) e o estado _forward-looking_ (riscos, navegação). Ao fechar a sessão, **roteie**
> (Regra de compactação, §4) — **não anexe narrativa** ("Antes…/Antes disso…").

## Agora

- **Épico O8** (Higiene sustentável do estado) **em andamento** — **T8.1a** entregue: o `STATE.md`
  volta a ser **ponteiro por construção** (Regra de compactação `§4` reescrita para **rotear**;
  roteamento cobrado nos dois reviewer-checklists e no `CONTRIBUTING.md`), via **ADR-0024** (`proposto`
  → G2). **Épicos O1–O6 concluídos.**

## Próximo passo

- **T8.1b** (fatia b — a **rede**): guard `tools/smoke/state-budget-check.ts` + **config** de orçamento
  (calibrado ao STATE-ponteiro + folga) + wiring no `scripts/smoke-test.sh`. **Abrir Issue de follow-up
  e aguardar G1**, **depois** de esta fatia (T8.1a) mergear — ligar o guard antes da convenção faria
  todo PR falhar o budget. Fora disso, sem tarefa ativa → **replanejar (G1)**.

## Última conclusão

- **#125** (T8.1a, épico O8, [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)) —
  convenção de autoria que mantém o STATE enxuto por construção. _(História detalhada em
  [`CHANGELOG.md`](CHANGELOG.md); status por-item na Issue #125, projetado no ledger via
  `ledger-origin.ts --scoped`.)_

## Riscos / pendências em aberto

- Confirmar a licença (atual: MIT) ao adotar em contexto organizacional.
- **Perfil de proteção = Solo:** o enforcement do "humano aprova" no merge é procedural (ADR-0003);
  migrar para o perfil Time (`approvals ≥ 1` + `CODEOWNERS`) quando houver 2+ mantenedores.
- **`.github/labels.yml`** ainda tem labels de stack multi-linguagem (comentário "projetos
  poliglotas") — reavaliar se as `stack:*` fazem sentido sob a leitura única Node/TS (candidato a follow-up).
- **Fora do repo (T8.1a):** o template de handoff da skill `orion-orchestrator` ainda diz "aterrissar
  estado no STATE.md" — atualizar para **rotear** (senão novas tarefas reintroduzem o inchaço).

## Ponteiros

[`PLAN.md`](PLAN.md) (mapa de épicos) · [`CHANGELOG.md`](CHANGELOG.md) (L5, história) ·
[`docs/decisions/README.md`](docs/decisions/README.md) (índice de ADRs — `grep` por tema) ·
[`AGENTS.md`](AGENTS.md) §4 (Regra de compactação) · [`AGENTS.core.md`](AGENTS.core.md) (núcleo L0) ·
[`docs/getting-started.md`](docs/getting-started.md) §7 (ritual get-bearings) · [`MEMORY.md`](MEMORY.md)
