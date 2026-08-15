# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ `CHANGELOG.md`, L5) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger / refletido no `PLAN.md` L1) — só o ponteiro (`Agora` / `Próximo passo` /
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

- **T9.3b-nav** ([#143](https://github.com/isaiane/OrionHarness/issues/143), T2 → merge T3) —
  desbloqueada por #140: repontar as **menções de nav** a `PLAN.md` **para os Milestones** (`docs/README.md`,
  `docs/product/spec.md`). Depois, na **sequência obrigatória** (ADR-0025 §9): **T9.4a/T9.4b** (história
  estruturada + stub do `CHANGELOG` + roteamento status/história do §4 / cabeçalho do STATE) → **T9.5a**
  (reduzir espelhos do roteamento/§4) → **T9.6** (guard de coerência do manifesto) → **T9.7** (relatórios).

## Última conclusão

- **[#140](https://github.com/isaiane/OrionHarness/issues/140)** (T9.3b, épico O9, PR #150): `PLAN.md`/
  `docs/plans/` **estubados** (fora do read-path); §4 L1 + bala Status + §2 Plan/Spec + §6 na redação do
  **ADR-0026**; espelhos normativos repontados p/ Milestones; manifesto `source→pointer` + slice
  `T9.3b-nav`. Roteamento status/história → **T9.4b**. _(Narrativa → CHANGELOG/PR.)_

## Riscos / pendências em aberto

- Confirmar a licença (atual: MIT) ao adotar em contexto organizacional.
- **Perfil de proteção = Solo:** o enforcement do "humano aprova" no merge é procedural (ADR-0003);
  migrar para o perfil Time (`approvals ≥ 1` + `CODEOWNERS`) quando houver 2+ mantenedores.
- **`.github/labels.yml`** ainda tem labels de stack multi-linguagem (comentário "projetos
  poliglotas") — reavaliar se as `stack:*` fazem sentido sob a leitura única Node/TS (candidato a follow-up).
- **Fora do repo (T8.1a):** o template de handoff da skill `orion-orchestrator` ainda diz "aterrissar
  estado no STATE.md" — atualizar para **rotear** (senão novas tarefas reintroduzem o inchaço).
- **Costura transitória do O9 (pós-#140):** o roteamento status/história ainda cita `PLAN.md`/`CHANGELOG.md`
  no **§4 par "STATE é ponteiro"** e no **cabeçalho do STATE** → **T9.4b**. A nav cosmética restante
  (`docs/README.md`, `docs/product/spec.md`) → **T9.3b-nav (#143)**. O guard de coerência do manifesto
  (que morde espelho não-repontado) → **T9.6**.

## Ponteiros

**GitHub Milestones** (mapa de épicos — fonte; relatório sob demanda `node --experimental-strip-types tools/plan/plan-report.ts`, precisa de rede) ·
[`PLAN.md`](PLAN.md) (stub-ponteiro) · [`CHANGELOG.md`](CHANGELOG.md) (L5, história) ·
[`docs/decisions/README.md`](docs/decisions/README.md) (índice de ADRs — `grep` por tema) ·
[`AGENTS.md`](AGENTS.md) §4 (Regra de compactação) · [`AGENTS.core.md`](AGENTS.core.md) (núcleo L0) ·
[`docs/getting-started.md`](docs/getting-started.md) §7 (ritual get-bearings) · [`MEMORY.md`](MEMORY.md)
