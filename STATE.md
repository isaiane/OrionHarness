# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ **PRs mergeados**, L5; `CHANGELOG.md` = stub — [ADR-0025](docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger) — só o ponteiro (`Agora` / `Próximo passo` /
> `Última conclusão`) e o estado _forward-looking_ (riscos, navegação). Ao fechar a sessão, **roteie**
> (Regra de compactação, §4) — **não anexe narrativa** ("Antes…/Antes disso…").

## Agora

- **Fase do pipeline:** **Plan** — **épico O9** (fim do Markdown autoral como fonte) em andamento;
  **ADR-0026 `aceito`** (G2, #145: Milestone+descrição). **T9.3b concluída** (#140, PR #150): `PLAN.md`/
  `docs/plans/` **fora do read-path** (stub-ponteiro) + §4 L1/§2/§6 na redação do ADR-0026 + espelhos
  repontados — a **fonte do plano são os Milestones** (14 populados na T9.3b-mig #147; gerador lê
  descrições). Sem tarefa ativa (WIP=1).
- **Épico O8** (Higiene sustentável do estado): **T8.1a concluída** (#125), **T8.2 concluída** (#128,
  spike). **T8.1b** ([#127](https://github.com/isaiane/OrionHarness/issues/127)) — deferida até T9.1/T9.2,
  agora **destravada**; classifica os próprios artefatos no seu PR (gatilho D2 do manifesto). **Épicos
  O1–O6 concluídos.**

## Próximo passo

- **T9.5a** (T2 → merge T3) — na **sequência obrigatória** (ADR-0025 §9), agora que a fonte de história
  assentou: reduzir os **espelhos em prosa** do roteamento/§4 que só repetem a regra (README/MEMORY/
  getting-started restantes) a ponteiros → **T9.6** (guard de coerência do manifesto) → **T9.7** (relatórios).

## Última conclusão

- **[#164](https://github.com/isaiane/OrionHarness/issues/164)** (T9.4b, PR desta fatia): **`CHANGELOG.md`
  → stub** + §4 (linha L5 + roteamento de história) + espelhos, aplicação atômica — a história agora vive
  nos **PRs mergeados** (gerador T9.4a p/ leitura offline). _(História → PR mergeado.)_

## Riscos / pendências em aberto

- Confirmar a licença (atual: MIT) ao adotar em contexto organizacional.
- **Perfil de proteção = Solo:** o enforcement do "humano aprova" no merge é procedural (ADR-0003);
  migrar para o perfil Time (`approvals ≥ 1` + `CODEOWNERS`) quando houver 2+ mantenedores.
- **`.github/labels.yml`** ainda tem labels de stack multi-linguagem (comentário "projetos
  poliglotas") — reavaliar se as `stack:*` fazem sentido sob a leitura única Node/TS (candidato a follow-up).
- **Fora do repo (T8.1a):** o template de handoff da skill `orion-orchestrator` ainda diz "aterrissar
  estado no STATE.md" — atualizar para **rotear** (senão novas tarefas reintroduzem o inchaço).
- **Janela T9.4b→T9.5a (aceita, D5):** o §4 e os espelhos normativos de história já apontam para a fonte
  estruturada (T9.4b), mas **espelhos em prosa** que só repetem o roteamento ainda podem descrever o
  modelo antigo até a **T9.5a** reduzi-los; o **guard de coerência** do manifesto vem depois (**T9.6**).

## Ponteiros

**GitHub Milestones** (mapa de épicos — fonte; relatório sob demanda `node --experimental-strip-types tools/plan/plan-report.ts`, precisa de rede) ·
[`PLAN.md`](PLAN.md) (stub-ponteiro) · [`CHANGELOG.md`](CHANGELOG.md) (L5, stub → PRs mergeados) ·
[`docs/decisions/README.md`](docs/decisions/README.md) (índice de ADRs — `grep` por tema) ·
[`AGENTS.md`](AGENTS.md) §4 (Regra de compactação) · [`AGENTS.core.md`](AGENTS.core.md) (núcleo L0) ·
[`docs/getting-started.md`](docs/getting-started.md) §7 (ritual get-bearings) · [`MEMORY.md`](MEMORY.md)
