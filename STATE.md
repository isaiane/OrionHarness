# STATE — Índice de Estado

> **Camada L1 — ponteiro** (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)).
> Orientação rápida para o início da sessão: **onde estamos** e **qual o próximo passo**. **Não guarda
> história** (→ **PRs mergeados**, L5; `CHANGELOG.md` = stub — [ADR-0025](docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)) nem **status por-item** (→ **Issue SDD** L2, fonte da verdade;
> projetado no ledger) — só o ponteiro (`Agora` / `Próximo passo` /
> `Última conclusão`) e o estado _forward-looking_ (riscos, navegação). Ao fechar a sessão, **roteie**
> (Regra de compactação, §4) — **não anexe narrativa** ("Antes…/Antes disso…").

## Agora

- **Fase do pipeline:** **Build** — **épico O9** (fim do Markdown autoral como fonte). Fontes de
  **plano** (Milestones, T9.3) e **história** (PRs mergeados, T9.4b #164/#165) assentadas; espelhos de
  governança reduzidos a ponteiros (**fast-lane** T9.5b #137, **roteamento/§4** T9.5a #167). **T9.6**
  ([#170](https://github.com/isaiane/OrionHarness/issues/170)) — **guard de coerência** ligado no
  `smoke-test.sh` (proposto, aguardando merge humano). Resta **T9.7** (relatórios). WIP=1.
- **Épico O8** (Higiene sustentável do estado): **T8.1a concluída** (#125), **T8.2 concluída** (#128,
  spike). **T8.1b** ([#127](https://github.com/isaiane/OrionHarness/issues/127)) — deferida até T9.1/T9.2,
  agora **destravada**; classifica os próprios artefatos no seu PR (gatilho D2 do manifesto). **Épicos
  O1–O6 concluídos.**

## Próximo passo

- **Mergear a T9.6** ([#170](https://github.com/isaiane/OrionHarness/issues/170), PR #171 — G3 humano);
  depois **T9.7** (relatórios sob demanda gerais) fecha o épico O9. A superfície de espelhos já está
  reduzida (T9.3–T9.5); o guard de coerência (T9.6) é rede heurística — não garantia.

## Última conclusão

- **[#167](https://github.com/isaiane/OrionHarness/issues/167)** (T9.5a, PR #168): espelhos em prosa do
  **roteamento/§4** (`MEMORY`, ciclo Ship do `getting-started`) reduzidos a **ponteiros** para §4/ADR-0024;
  diagrama do README verificado; checklists/templates preservados. _(História → PR mergeado.)_
- **T9.6 ([#170](https://github.com/isaiane/OrionHarness/issues/170)) ainda NÃO é conclusão** — está em
  `Agora` (proposto, aguardando merge humano/G3). Só entra aqui **após o merge** (evita que o get-bearings
  leia T9.6 como pronta e pule para a T9.7 com WIP aberto).
  _(História → PR desta fatia.)_

## Riscos / pendências em aberto

- Confirmar a licença (atual: MIT) ao adotar em contexto organizacional.
- **Perfil de proteção = Solo:** o enforcement do "humano aprova" no merge é procedural (ADR-0003);
  migrar para o perfil Time (`approvals ≥ 1` + `CODEOWNERS`) quando houver 2+ mantenedores.
- **`.github/labels.yml`** ainda tem labels de stack multi-linguagem (comentário "projetos
  poliglotas") — reavaliar se as `stack:*` fazem sentido sob a leitura única Node/TS (candidato a follow-up).
- **Fora do repo (T8.1a):** o template de handoff da skill `orion-orchestrator` ainda diz "aterrissar
  estado no STATE.md" — atualizar para **rotear** (senão novas tarefas reintroduzem o inchaço).
- **Guard de coerência é rede, não garantia (T9.6):** o `coherence-guard` reprova a FORMA (regex/
  existência) de um espelho novo, mas espelho reescrito com outras palavras escapa e a varredura cobre só
  os `scanDirs`. A cobrança **semântica** continua sendo a revisão humana — não enfraquecer checklist
  algum "porque o guard cobre". _(Follow-up opcional: ecoar essa ressalva nos reviewer-checklists — fora
  do guardrail 3–4 arquivos desta fatia.)_

## Ponteiros

**GitHub Milestones** (mapa de épicos — fonte; relatório sob demanda `node --experimental-strip-types tools/plan/plan-report.ts`, precisa de rede) ·
[`PLAN.md`](PLAN.md) (stub-ponteiro) · [`CHANGELOG.md`](CHANGELOG.md) (L5, stub → PRs mergeados) ·
[`docs/decisions/README.md`](docs/decisions/README.md) (índice de ADRs — `grep` por tema) ·
[`AGENTS.md`](AGENTS.md) §4 (Regra de compactação) · [`AGENTS.core.md`](AGENTS.core.md) (núcleo L0) ·
[`docs/getting-started.md`](docs/getting-started.md) §7 (ritual get-bearings) · [`MEMORY.md`](MEMORY.md)
