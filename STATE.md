# STATE — Índice de Estado

> **Camada L1 (índice leve)** (`AGENTS.md` §4). Ponteiro de orientação rápida: o agente lê isto
> ao iniciar uma sessão para saber **onde estamos e qual o próximo passo**. **Não duplica**
> conteúdo — o detalhe vive nas Issues SDD e nos artefatos linkados. Atualize ao concluir cada
> tarefa/fase.

## Agora

- **Fase do pipeline:** **tarefa ativa = #73** (hygiene do ledger) — em _Review_, PR **#81** aberto,
  **G2 ✔** (ADR-0016 `aceito`), aguardando **G3** (merge humano). O1/O2/O3/O4 concluídos.
- **Em andamento:** **#73** (PR **#81**) · registra o **escopo de projeção** da convenção
  semeia-e-cresce (toda `type:task` pós-ADR-0006 não-dup; pré-ledger/duplicatas fora) em
  **[ADR-0016](docs/decisions/0016-politica-projecao-ledger.md) (`aceito` no G2)** + detalhe no
  [`CONTRIBUTING.md`](CONTRIBUTING.md) §Ledger + nota append-only no ADR-0006, e aplica o **backfill
  as-accepted** de **#45, #62, #67, #74 e o próprio #73** (20 entradas, `passes:false`, delta aditivo
  37→57, `ledger-guard` verde). #74 incluída além da lista original (drift pós-snapshot) e #62/#74
  tiveram correção as-accepted (Codex no PR #81: #62 alvo ausente→T0 default / vazio→fail-closed; #74
  critério condicional). Linha de DoD no PR template previne o próximo drift.
- **Última conclusão:** #71 (PR **#79**) · `SHELL_ALLOW` libera execução de exemplos de `docs/examples/`
  (`node --experimental-strip-types …<x>.ts` / `bash`/`./` `…<x>.sh`, args flags-only); ADR-0015
  (`aceito`); #71 projetada no ledger.
- **E antes:** #74 (PR **#76**) · **check de commitlint determinístico** no
  [`scripts/smoke-test.sh`](scripts/smoke-test.sh) via `.git/COMMIT_EDITMSG` (corrige falso-vermelho
  local × verde no CI). Fix shell, sem ADR.
- **Antes disso:** **#67** (semântica do ledger *as-accepted*, ADR-0014 — PR #72; corpo da #43 corrigido +
  #43 projetada no `feature-ledger.json`); **#62** (alvo de leitura no tool-guard, ADR-0013 — PR #69);
  **#49** (consolidação Node/TS, ADR-0012 — PR #68); **#65** (reprojeção do #53 no ledger — PR #66);
  **#53/T4.3** (observabilidade de custo/tokens, **fecha a O4** — PR #63); **#52/T4.2** (tool-guard
  base, ADR-0011); **#51/T4.1** (e2e, ADR-0009 — abriu a O4).
- **Governança recente:** **ADR-0016** (política de projeção do ledger — **`aceito`** no G2, #73),
  **ADR-0015** (allowlist de exemplos `docs/examples/` no tool-guard), ADR-0014 (semântica do
  ledger *as-accepted*), ADR-0013 (alvo de leitura no tool-guard), ADR-0012 (consolidação Node/TS),
  ADR-0009 (e2e), ADR-0010 (re-review) e ADR-0011 (hook de guarda) **aceitos** (G2).
- **Regra de foco:** **uma tarefa ativa por vez** — não **iniciar/implementar** nova tarefa antes da
  ativa estar verde e mergeada. **Caso atual: a #73 está ativa** (em _Review_, aguardando G2/G3), então
  não iniciar a #75 nem outra antes do merge da #73. **Criar Issue de follow-up de rastreio** (backlog,
  como #82/#83/#85 abertas nesta revisão) **é permitido** — o que a regra proíbe é **começar** outra
  tarefa. Só **após** o merge (reconciliação pós-merge) o próximo work item entra — e **só após G1**.

## Próximo passo

**Concluir a #73** — revisão (Harness + escopo reduzido de memória/estado) ✔, CI verde ✔; achados do
Codex endereçados por commit, **com o re-review pós-fix ainda em curso** (ADR-0010/§10 — aguardar o
veredito antes de tratar a revisão como fechada). **G2 ✔** (ADR-0016 `aceito`); **falta só o G3** (merge
humano na `main`). Só **após** o merge é que uma **reconciliação pós-merge** aterrissa o estado para
_replanejar_ — apontando os follow-ups **abertos**: **#75** (remover python do `smoke-test.sh`,
alinhando ao ADR-0005/0012; mata a classe de falso-vermelho `pyyaml`), **#82** (reset/bootstrap do
ledger p/ repos derivados do template), **#83** (alinhar/deprecar o `--from-gh` do gerador) e **#85**
(lifecycle de `passes:true` — validação não-e2e + owner/gatilho da flip) — os três últimos abertos na
revisão do #81. Não iniciar nova tarefa antes da #73 verde e mergeada (regra de foco).

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
`CHANGELOG.md`
