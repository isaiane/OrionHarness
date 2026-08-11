# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ `CHANGELOG.md`, L5) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger / refletido no `PLAN.md` L1) — só o ponteiro (`Agora` / `Próximo passo` /
> `Última conclusão`) e o estado _forward-looking_ (riscos, navegação). Ao fechar a sessão, **roteie**
> (Regra de compactação, §4) — **não anexe narrativa** ("Antes…/Antes disso…").

## Agora

- **Fase do pipeline:** **Plan** — **épico O9** (fim do Markdown autoral como fonte) em andamento;
  **T9.5b concluída** ([#137](https://github.com/isaiane/OrionHarness/issues/137),
  PR [#138](https://github.com/isaiane/OrionHarness/pull/138)). Próxima fatia: **T9.3a** (sequência do
  ADR-0025) — sem tarefa ativa (WIP=1).
- **Épico O8** (Higiene sustentável do estado): **T8.1a concluída** (#125), **T8.2 concluída** (#128,
  spike). **T8.1b** ([#127](https://github.com/isaiane/OrionHarness/issues/127)) — deferida até T9.1/T9.2,
  agora **destravada**; classifica os próprios artefatos no seu PR (gatilho D2 do manifesto). **Épicos
  O1–O6 concluídos.**

## Próximo passo

- **T9.3a** — substituto offline do plano (gerador de `.orion/tmp/reports/plan.md`, **adição pura**),
  a próxima na sequência do ADR-0025 (`T9.2→T9.5b→T9.3a→T9.3b→…`). **Abrir a Issue SDD T9.3a (G1).**
  _(Escopo em `PLAN.md` §O9.)_

## Última conclusão

- **[#137](https://github.com/isaiane/OrionHarness/issues/137)** (T9.5b, épico O9): espelhos da
  **fast-lane** reduzidos a **ponteiros** (§11.2 / ADR-0017 + predicado); texto operacional preservado
  (D3); manifesto atualizado no mesmo PR (gatilho D2). _(Narrativa → CHANGELOG/PR; fonte da fast-lane intocada.)_

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
