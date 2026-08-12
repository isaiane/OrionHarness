# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ `CHANGELOG.md`, L5) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger / refletido no `PLAN.md` L1) — só o ponteiro (`Agora` / `Próximo passo` /
> `Última conclusão`) e o estado _forward-looking_ (riscos, navegação). Ao fechar a sessão, **roteie**
> (Regra de compactação, §4) — **não anexe narrativa** ("Antes…/Antes disso…").

## Agora

- **Fase do pipeline:** **Plan** — **épico O9** (fim do Markdown autoral como fonte) em andamento;
  **T9.3b concluída** ([#140](https://github.com/isaiane/OrionHarness/issues/140)): `PLAN.md`/`docs/plans/`
  = **stub-ponteiro**, fora do read-path; §4 L1 + §2/§6 aplicados. Próxima fatia: **T9.4a** (histórico
  estruturado, adição pura) — sem tarefa ativa (WIP=1).
- **Épico O8** (Higiene sustentável do estado): **T8.1a concluída** (#125), **T8.2 concluída** (#128,
  spike). **T8.1b** ([#127](https://github.com/isaiane/OrionHarness/issues/127)) — deferida até T9.1/T9.2,
  agora **destravada**; classifica os próprios artefatos no seu PR (gatilho D2 do manifesto). **Épicos
  O1–O6 concluídos.**

## Próximo passo

- **T9.4a** — histórico estruturado a partir de PRs mergeados (adição pura), a próxima na sequência do
  ADR-0025 (`…→T9.3b→T9.4a→T9.4b→…`). **Abrir a Issue SDD T9.4a (G1).**
- **Follow-ups da T9.3b:** [#143](https://github.com/isaiane/OrionHarness/issues/143) (repontar menções
  de **nav** a `PLAN.md` — fora do núcleo atômico, §7) — depende deste merge.

## Última conclusão

- **[#140](https://github.com/isaiane/OrionHarness/issues/140)** (T9.3b, épico O9): `PLAN.md`/`docs/plans/`
  **fora do read-path** — stub-ponteiro para Milestones/Project + relatório gerado; **linha L1 do §4** +
  §2/§6 (fluxo Plan→Spec) aplicados; get-bearings e espelhos normativos de plano repontados; manifesto
  atualizado. **Núcleo atômico** (8 arquivos, exceção vertical-slice §7). _(Narrativa → CHANGELOG/PR.)_

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
- **Costura transitória T9.3b→T9.4b:** o §4 L1 já nomeia Milestones (PLAN=stub), mas as **expressões de
  roteamento** de status/história (parágrafo "STATE é um ponteiro" do §4; cabeçalho do STATE; MEMORY/
  CONTRIBUTING) ainda citam `PLAN.md`/`CHANGELOG.md` — migram na **T9.4b** (ADR-0025 §9). Estado esperado,
  não contradição do read-path do plano.

## Ponteiros

[`PLAN.md`](PLAN.md) (stub → Milestones/Project) · [`CHANGELOG.md`](CHANGELOG.md) (L5, história) ·
[`docs/decisions/README.md`](docs/decisions/README.md) (índice de ADRs — `grep` por tema) ·
[`AGENTS.md`](AGENTS.md) §4 (Regra de compactação) · [`AGENTS.core.md`](AGENTS.core.md) (núcleo L0) ·
[`docs/getting-started.md`](docs/getting-started.md) §7 (ritual get-bearings) · [`MEMORY.md`](MEMORY.md)
