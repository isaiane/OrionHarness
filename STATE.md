# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ **PRs mergeados**, L5; `CHANGELOG.md` = stub — [ADR-0025](docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger) — só o ponteiro (`Agora` / `Próximo passo` /
> `Última conclusão`) e o estado _forward-looking_ (riscos, navegação). Ao fechar a sessão, **roteie**
> (Regra de compactação, §4) — **não anexe narrativa** ("Antes…/Antes disso…").

## Agora

- **Fatia ativa: T7.0** ([#203](https://github.com/isaiane/OrionHarness/issues/203)) — **ADR-0030**
  (pipeline Specification → Tests → Implementation) registrado como **`proposto`**, aguardando **G2**.
  Supersede o **item 5** do ADR-0018 (ordem dos testes vira requisito nas classes recortadas). Épicos
  **O1–O6, O8, O9 concluídos**; **O7** (_Merge assistido_) **ativo** e **O10** (_flip + GitHub Projects_)
  **criado** — ambos abertos nos Milestones.

## Próximo passo

- **G2 do ADR-0030** (#203) → aceitar (`proposto`→`aceito`) e mergear (T3). Depois: planejar as fatias de
  **implementação** do pipeline (workflows/Actions) no **O7**, e/ou avançar o **O10** (flip/board, que
  **configura** o board consumindo o estado "contrato em revisão" que este ADR **declara**). Novas
  tarefas nascem do Milestone/épico (G1).

## Última conclusão

- **S4** (follow-up [#195](https://github.com/isaiane/OrionHarness/issues/195)): reduzidos os espelhos na
  fonte da skill — modelo de confiança T0–T4 vira **ponteiro** para `§11`, `SKILL.md` ganha a **decisão de
  lane** (fast-lane T1 issue-less), e os templates SDD ganham **proveniência de Milestone** + **DoD como
  checklist** (§12). _(História → PR mergeado.)_

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
