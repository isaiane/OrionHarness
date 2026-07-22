# STATE — Índice de Estado

> **Camada L1 (índice leve)** (`AGENTS.md` §4). Ponteiro de orientação rápida: o agente lê isto
> ao iniciar uma sessão para saber **onde estamos e qual o próximo passo**. **Não duplica**
> conteúdo — o detalhe vive nas Issues SDD e nos artefatos linkados. Atualize ao concluir cada
> tarefa/fase.

## Agora

- **Fase do pipeline:** **épico O5** (proporcionalidade & eficiência de contexto — Onda 4) **em
  andamento**; **T5.1 concluída** (PR **#88**) + **#89** (refinamentos deferidos da fast-lane)
  **concluída** (PR **#90**). O1/O2/O3/O4 concluídos; **#73** mergeada (PR #81). **Sem tarefa ativa**
  no O5 — próximo item (T5.2) entra só após G1.
- **Última conclusão:** **#89** (PR **#90**) · **refinamentos da fast-lane** — fecha os deferidos da
  T5.1/Harness Review (Codex #5/#7/#9/#B/#T/#U/#V): predicado auto-verificável + validado (input por
  CLI/stdin, fail-closed em todos os campos, **vitest** de `classifyLane`), **rota fast-lane no Mermaid**
  do README, **escalação mid-build** especificada (§11.2), **checklists issue-less** (agent/harness), e
  **sinal `lane`** Data-First (PR template + `docs/observability.md`). Sem novo ADR (opera dentro do
  ADR-0017). **#89 projetada no ledger.**
- **Decisão-mãe (a via):** **#87/T5.1** (PR **#88**) · **fast-lane T1** — a classe de confiança (§11)
  **roteia a cerimônia**: ações estritamente T1 de baixo risco **dispensam Issue SDD/ADR** (PR leve),
  mas **mantêm** branch → PR → CI verde → **merge humano (T3/G3)**. **[ADR-0017](docs/decisions/0017-fast-lane-baixo-risco.md)
  (`aceito` no G2)**; `AGENTS.md` §11.2 (+ ponteiro §3); **abre a O5**.
- **Antes:** **#73** (PR **#81**) · registra o **escopo de projeção** da convenção semeia-e-cresce
  (toda `type:task` pós-ADR-0006 não-dup; pré-ledger/duplicatas fora) em
  **[ADR-0016](docs/decisions/0016-politica-projecao-ledger.md) (`aceito` no G2)** + detalhe no
  [`CONTRIBUTING.md`](CONTRIBUTING.md) §Ledger + nota append-only no ADR-0006, e aplica o **backfill
  as-accepted** de **#45, #62, #67, #74 e o próprio #73** (20 entradas, `passes:false`, delta aditivo
  37→57, `ledger-guard` verde). Linha de DoD no PR template previne o próximo drift.
- **E antes:** #71 (PR **#79**) · `SHELL_ALLOW` libera execução de exemplos de `docs/examples/`
  (ADR-0015 `aceito`); #74 (PR #76) · check de commitlint determinístico no
  [`scripts/smoke-test.sh`](scripts/smoke-test.sh) (fix shell, sem ADR).
- **Antes disso:** **#67** (semântica do ledger *as-accepted*, ADR-0014 — PR #72); **#62** (alvo de
  leitura no tool-guard, ADR-0013 — PR #69); **#49** (consolidação Node/TS, ADR-0012 — PR #68);
  **#53/T4.3** (observabilidade de custo/tokens, **fecha a O4** — PR #63); **#52/T4.2** (tool-guard
  base, ADR-0011); **#51/T4.1** (e2e, ADR-0009 — abriu a O4).
- **Governança recente:** **ADR-0017** (fast-lane T1 — **`aceito`** no G2, #87), **ADR-0016**
  (política de projeção do ledger, #73), **ADR-0015** (allowlist de exemplos `docs/examples/`),
  ADR-0014 (semântica *as-accepted*), ADR-0013 (alvo de leitura no tool-guard), ADR-0012
  (consolidação Node/TS), ADR-0009 (e2e), ADR-0010 (re-review) e ADR-0011 (hook de guarda)
  **aceitos** (G2).
- **Regra de foco:** **uma tarefa ativa por vez** — não **iniciar/implementar** nova tarefa antes da
  ativa estar verde e mergeada. **Caso atual: sem tarefa ativa** (T5.1 concluída) → o próximo work
  item do O5 (T5.2) entra **só após G1**. **Criar Issue de follow-up de rastreio** (backlog, como
  #82/#83/#85) **é permitido** — o que a regra proíbe é **começar** a implementação sem G1.

## Próximo passo

**T5.2 — Protocolo de revisão cross-model** (próxima do épico **O5**, **sem G1 ainda** — só apontar):
operacionaliza a **independência do revisor** do ADR-0008 (modelo que revisa/testa ≠ modelo que
implementa; escalação por divergência). Escolher, **com o humano (G1)**, entre iniciar a T5.2 e os
follow-ups **abertos** de hygiene rastreados: **#75** (remover python do `smoke-test.sh`, alinhando
ao ADR-0005/0012; mata a classe de falso-vermelho `pyyaml`), **#82** (reset/bootstrap do ledger p/
repos derivados do template), **#83** (alinhar/deprecar o `--from-gh` do gerador) e **#85** (lifecycle
de `passes:true` — validação não-e2e + owner/gatilho da flip). (**#89** — refinamentos da fast-lane —
**concluída** no PR #90.) Não abrir nova tarefa sem G1.

## Riscos / pendências em aberto

- Confirmar a licença (atual: MIT) ao adotar em contexto organizacional.
- **Perfil de proteção = Solo:** o enforcement do "humano aprova" no merge é procedural (ADR-0003);
  migrar para o perfil Time (`approvals ≥ 1` + `CODEOWNERS`) quando houver 2+ mantenedores.
- **`.github/labels.yml`** ainda tem labels de stack multi-linguagem (comentário "projetos
  poliglotas", linha ~52) — **fora do escopo do #49** (não é afirmação de capacidade atual do harness);
  reavaliar se as labels `stack:*` fazem sentido sob a leitura única Node/TS (candidato a follow-up).
- ~~**Allowlist de `docs/examples/` no tool-guard (residual do #62):**~~ **RESOLVIDO** pela **#71**
  (PR #79, mergeada) — a `SHELL_ALLOW` libera `node --experimental-strip-types docs/examples/<x>.ts` e
  `bash`/`./` `docs/examples/<x>.sh` (args flags-only), decisão em ADR-0015 (`aceito`). Fecha o
  sub-ponto de execução de exemplo que
  ficara fora do escopo do #62/ADR-0013.

## Ponteiros

`PLAN.md` · **#53 (T4.3, concluída — fecha a O4)** · `docs/observability.md` · `docs/examples/observability-cost-log.ts` · #52 (T4.2, `tools/guard/`) · ADR-0011 (`aceito`) · **#62 (tool-guard alvo de leitura, ADR-0013 `aceito`)** · #55 · ADR-0010 (`aceito`) · #51 (T4.1/O4) · ADR-0009 (`aceito`) · #57 (reconciliação) ·
`docs/examples/e2e-init-check.sh` ·
`docs/agent-reviewer-checklist.md` · `AGENTS.md` §8.1/§12 · #33 (T2.4/O2) ·
`docs/getting-started.md` §7 (ritual get-bearings) · `init.sh` · ADR-0007 · ADR-0008 · `MEMORY.md` ·
`docs/product/` · `docs/decisions/` · **ADR-0014 (`aceito` — semântica do ledger as-accepted, #67)** ·
**#43 (projetada no `feature-ledger.json`)** · **ADR-0015 (`aceito` — allowlist `docs/examples/`, #71)** ·
**ADR-0017 (`aceito` — fast-lane T1, #87)** · `AGENTS.md` §11.2 · `docs/examples/fast-lane-eligibility.ts` ·
`CHANGELOG.md`
