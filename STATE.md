# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ `CHANGELOG.md`, L5) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger / refletido no `PLAN.md` L1) — só o ponteiro (`Agora` / `Próximo passo` /
> `Última conclusão`) e o estado _forward-looking_ (riscos, navegação). Ao fechar a sessão, **roteie**
> (Regra de compactação, §4) — **não anexe narrativa** ("Antes…/Antes disso…").

## Agora

- **Fase do pipeline:** **Plan** — **épico O9** (fim do Markdown autoral como fonte) em andamento;
  **ADR-0026 `aceito`** (G2, #145: Milestone+descrição). **T9.3b-mig concluída** (#147, PR #148): **14
  Milestones populados** (F1–F5/O1–O9, com objetivo+tarefas+estado) — a **fonte GitHub-nativa está
  operacional**; o gerador lê descrições. **T9.3b (#140) DESTRAVADA** (a fonte nova existe → estubar não
  perde dados). Sem tarefa ativa (WIP=1).
- **Épico O8** (Higiene sustentável do estado): **T8.1a concluída** (#125), **T8.2 concluída** (#128,
  spike). **T8.1b** ([#127](https://github.com/isaiane/OrionHarness/issues/127)) — deferida até T9.1/T9.2,
  agora **destravada**; classifica os próprios artefatos no seu PR (gatilho D2 do manifesto). **Épicos
  O1–O6 concluídos.**

## Próximo passo

- **T9.3b** (stub, T2 → merge T3) — **abrir/retomar** e implementar: **estubar** `PLAN.md`/`docs/plans/`
  (fora do read-path) + aplicar a **linha L1 do §4** (redação do ADR-0026: Milestone+descrição) + §2/§6 +
  repontar espelhos normativos + get-bearings. Reusar o **núcleo do PR #144** (fechado, branch preservado),
  ajustando a redação p/ o ADR-0026. Agora **seguro** — a fonte nova (Milestones) está operacional. Nav
  (#143) e roteamento (T9.4b) seguem separados.

## Última conclusão

- **[#147](https://github.com/isaiane/OrionHarness/issues/147)** (T9.3b-mig, épico O9, PR #148):
  **fonte GitHub-nativa operacional** — 14 Milestones (F1–F5/O1–O9) populados com objetivo+tarefas+estado
  (backfill do traço tarefa→Issue); o **gerador lê descrições de Milestone** (`?state=all`) e reconcilia
  com Issues (fail-closed 1:1). **Adição pura** — `PLAN.md` segue a fonte L1. _(Narrativa → CHANGELOG/PR.)_

## Riscos / pendências em aberto

- Confirmar a licença (atual: MIT) ao adotar em contexto organizacional.
- **Perfil de proteção = Solo:** o enforcement do "humano aprova" no merge é procedural (ADR-0003);
  migrar para o perfil Time (`approvals ≥ 1` + `CODEOWNERS`) quando houver 2+ mantenedores.
- **`.github/labels.yml`** ainda tem labels de stack multi-linguagem (comentário "projetos
  poliglotas") — reavaliar se as `stack:*` fazem sentido sob a leitura única Node/TS (candidato a follow-up).
- **Fora do repo (T8.1a):** o template de handoff da skill `orion-orchestrator` ainda diz "aterrissar
  estado no STATE.md" — atualizar para **rotear** (senão novas tarefas reintroduzem o inchaço).
- **Follow-ups do O9 (plano):** Milestones do Orion **não populados** → o gerador (T9.3a) usa **prefixo
  de título** como ponte até a **T9.3b-mig**. Com o ADR-0026, **Project drafts saem do modelo**; o
  gerador passará a ler **descrição de Milestone** (T9.3b-mig) — aí o **sort de Milestone descritiva** e o
  **bump `engines` → `>=22.6`** (get-bearings passa a exigir o type-strip) precisam entrar.

## Ponteiros

[`PLAN.md`](PLAN.md) (mapa de épicos) · [`CHANGELOG.md`](CHANGELOG.md) (L5, história) ·
[`docs/decisions/README.md`](docs/decisions/README.md) (índice de ADRs — `grep` por tema) ·
[`AGENTS.md`](AGENTS.md) §4 (Regra de compactação) · [`AGENTS.core.md`](AGENTS.core.md) (núcleo L0) ·
[`docs/getting-started.md`](docs/getting-started.md) §7 (ritual get-bearings) · [`MEMORY.md`](MEMORY.md)
