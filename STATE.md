# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ `CHANGELOG.md`, L5) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger / refletido no `PLAN.md` L1) — só o ponteiro (`Agora` / `Próximo passo` /
> `Última conclusão`) e o estado _forward-looking_ (riscos, navegação). Ao fechar a sessão, **roteie**
> (Regra de compactação, §4) — **não anexe narrativa** ("Antes…/Antes disso…").

## Agora

- **Fase do pipeline:** **Plan** — **épico O9** (fim do Markdown autoral como fonte) em andamento;
  **T9.1 concluída** (**[ADR-0025](docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)
  `aceito`** no G2, #130, PR #131). Próxima fatia: **T9.2**. WIP=1 (sem tarefa ativa → G1 da T9.2).
- **Épico O8** (Higiene sustentável do estado): **T8.1a concluída** (#125), **T8.2 concluída** (#128,
  spike). **T8.1b deferida** ([#127](https://github.com/isaiane/OrionHarness/issues/127)) para depois de
  T9.1/T9.2 — **não** é dependência do O9. **Épicos O1–O6 concluídos.**

## Próximo passo

- **T9.2** — manifesto de classificação dos artefatos (sem mutação destrutiva). **Destravada** pelo
  ADR-0025 aceito; **abrir a Issue SDD T9.2 (G1)**. A sequência do O9 (nove fatias) está no ADR-0025.
  _(Escopo em `PLAN.md` §O9.)_

## Última conclusão

- **[#130](https://github.com/isaiane/OrionHarness/issues/130)** (T9.1, épico O9): **ADR-0025 `aceito`**
  (modelo-alvo de plano/história/compactação/ponteiros), PR #131. _(O que decidiu → ADR-0025; história →
  PR #131 / CHANGELOG.)_

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
