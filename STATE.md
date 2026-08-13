# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ `CHANGELOG.md`, L5) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger / refletido no `PLAN.md` L1) — só o ponteiro (`Agora` / `Próximo passo` /
> `Última conclusão`) e o estado _forward-looking_ (riscos, navegação). Ao fechar a sessão, **roteie**
> (Regra de compactação, §4) — **não anexe narrativa** ("Antes…/Antes disso…").

## Agora

- **Fase do pipeline:** **Plan** — **épico O9** (fim do Markdown autoral como fonte) em andamento;
  **T9.3a concluída** ([#139](https://github.com/isaiane/OrionHarness/issues/139),
  PR [#141](https://github.com/isaiane/OrionHarness/pull/141)). Próxima fatia: **T9.3b**
  ([#140](https://github.com/isaiane/OrionHarness/issues/140), remoção/stub — destravada por este
  merge) — sem tarefa ativa (WIP=1).
- **Épico O8** (Higiene sustentável do estado): **T8.1a concluída** (#125), **T8.2 concluída** (#128,
  spike). **T8.1b** ([#127](https://github.com/isaiane/OrionHarness/issues/127)) — deferida até T9.1/T9.2,
  agora **destravada**; classifica os próprios artefatos no seu PR (gatilho D2 do manifesto). **Épicos
  O1–O6 concluídos.**

## Próximo passo

- **T9.3b** — tirar `PLAN.md`/`docs/plans/` do read-path (**stub-ponteiro** + linha **L1 do §4** +
  §2/§6), a próxima na sequência do ADR-0025 (`…→T9.3a→T9.3b→T9.4a→…`). Issue
  [#140](https://github.com/isaiane/OrionHarness/issues/140) já aberta (rastreio, bloqueada por #139 →
  **destravada** por este merge). **G1 detalhado da T9.3b** antes de implementar; atenção ao guardrail
  3–4 arquivos (refs de plano em vários espelhos — decidir o corte no G1). _(Escopo em `PLAN.md` §O9.)_

## Última conclusão

- **[#139](https://github.com/isaiane/OrionHarness/issues/139)** (T9.3a, épico O9, PR
  [#141](https://github.com/isaiane/OrionHarness/pull/141)): **gerador de plano offline** — projeta o
  mapa de épicos/tarefas em `.orion/tmp/reports/plan.md` (scratch, gitignored) a partir do GitHub,
  reusando o acesso do `ledger-from-issues`. **Adição pura** — nada saiu do read-path.
  _(Narrativa → CHANGELOG/PR.)_

## Riscos / pendências em aberto

- Confirmar a licença (atual: MIT) ao adotar em contexto organizacional.
- **Perfil de proteção = Solo:** o enforcement do "humano aprova" no merge é procedural (ADR-0003);
  migrar para o perfil Time (`approvals ≥ 1` + `CODEOWNERS`) quando houver 2+ mantenedores.
- **`.github/labels.yml`** ainda tem labels de stack multi-linguagem (comentário "projetos
  poliglotas") — reavaliar se as `stack:*` fazem sentido sob a leitura única Node/TS (candidato a follow-up).
- **Fora do repo (T8.1a):** o template de handoff da skill `orion-orchestrator` ainda diz "aterrissar
  estado no STATE.md" — atualizar para **rotear** (senão novas tarefas reintroduzem o inchaço).
- **Follow-ups do O9 (plano):** Milestones/Project do Orion **não populados** → o gerador (T9.3a) usa
  **prefixo de título** como ponte (épico = Milestone-se-houver-senão-prefixo). Incluir **Project
  drafts** e **sort de Milestone descritiva** são follow-ups declarados (limitação no cabeçalho do
  tool); bump de **`engines` → `>=22.6`** repo-wide (type-strip) candidato a follow-up.

## Ponteiros

[`PLAN.md`](PLAN.md) (mapa de épicos) · [`CHANGELOG.md`](CHANGELOG.md) (L5, história) ·
[`docs/decisions/README.md`](docs/decisions/README.md) (índice de ADRs — `grep` por tema) ·
[`AGENTS.md`](AGENTS.md) §4 (Regra de compactação) · [`AGENTS.core.md`](AGENTS.core.md) (núcleo L0) ·
[`docs/getting-started.md`](docs/getting-started.md) §7 (ritual get-bearings) · [`MEMORY.md`](MEMORY.md)
