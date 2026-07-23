# STATE — Índice de Estado

> **Camada L1 (índice leve)** (`AGENTS.md` §4). Ponteiro de orientação rápida: o agente lê isto
> ao iniciar uma sessão para saber **onde estamos e qual o próximo passo**. **Não duplica**
> conteúdo — o detalhe vive nas Issues SDD e nos artefatos linkados. Atualize ao concluir cada
> tarefa/fase.

## Agora

- **Fase do pipeline:** **épico O5** (proporcionalidade & eficiência de contexto — Onda 4)
  **concluído** — **T5.3 concluída** (PR **#95**) é a **última tarefa** do épico. **O1/O2/O3/O4/O5
  todos concluídos**; **#73** mergeada (PR #81). **Sem épico ativo**; **um follow-up de hygiene T1
  ativo em review — #96 (PR #97)** — **aguarda merge humano (T3/G3)**; ao mergear, **replanejar**
  (volta ao Plan/G1) antes de iniciar novo work item.
- **Última conclusão:** **#94** (PR **#95**) · **núcleo L0 condensado** (T5.3, **fecha o O5**) —
  sub-particiona o **L0** (§4) em núcleo sempre-carregado ([`AGENTS.core.md`](AGENTS.core.md)) + detalhe
  sob demanda, sem redefinir "L0" nem renumerar; anti-drift no guard do
  [`scripts/smoke-test.sh`](scripts/smoke-test.sh). **[ADR-0019](docs/decisions/0019-nucleo-l0-condensado.md)
  (`aceito` no G2)**; **#94 projetada no ledger**. Detalhe em
  [`CHANGELOG.md`](CHANGELOG.md) e no ADR-0019. Linha: **Harness Review** (ADR-0008).
- **Antes no O5:** **#91** (PR **#92**) · **protocolo de revisão cross-model** (T5.2) —
  operacionaliza a **independência do revisor** (ADR-0008) e estende o re-review (ADR-0010) num
  protocolo concreto: o modelo que **revisa/escreve os testes de aceite** deve ser **distinto** do que
  implementa (**autorrevisão bloqueada** → escala humano); a **divergência** teste×implementação
  **escala ao humano** (roteia a atenção humana por **divergência**, não por **volume de PR**); a
  **concordância + verde** reduz o *escrutínio* mas **não** dispensa o **merge humano (T3/G3)**.
  **[ADR-0018](docs/decisions/0018-revisao-cross-model.md) (`aceito` no G2)**; item nos checklists
  (§11 do Harness / §7 do Product); ponteiros em `AGENTS.md` §2 e `CONTRIBUTING.md` §6; predicado
  rodável [`docs/examples/cross-model-review.ts`](docs/examples/cross-model-review.ts) (descritor real
  por CLI/stdin, fail-closed + vitest: concordância ⇒ `human_merge`, divergência/autorrevisão/T3 ⇒
  `escalate_human`, T4 ⇒ `blocked`). ADR-0008/0010
  **referenciados, não reescritos** (append-only). **#91 projetada no ledger.**
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
- **Governança recente:** **ADR-0019** (núcleo L0 condensado — **`aceito`** no G2, #94),
  **ADR-0018** (protocolo cross-model — **`aceito`** no G2, #91), **ADR-0017**
  (fast-lane T1 — **`aceito`** no G2, #87), **ADR-0016**
  (política de projeção do ledger, #73), **ADR-0015** (allowlist de exemplos `docs/examples/`),
  ADR-0014 (semântica *as-accepted*), ADR-0013 (alvo de leitura no tool-guard), ADR-0012
  (consolidação Node/TS), ADR-0009 (e2e), ADR-0010 (re-review) e ADR-0011 (hook de guarda)
  **aceitos** (G2).
- **Regra de foco:** **uma tarefa ativa por vez** — não **iniciar/implementar** nova tarefa antes da
  ativa estar verde e mergeada. **Caso atual: #96 (follow-up T1) ativo em review no PR #97** (O5
  concluído com a T5.3); ao mergear o #96 → **replanejar (G1)** antes de iniciar novo work item. **Criar Issue de follow-up de rastreio** (backlog, como
  #82/#83/#85) **é permitido** — o que a regra proíbe é **começar** a implementação sem G1.

## Próximo passo

**Aguardar o merge do #96 (PR #97) — há um follow-up T1 em voo.** T5.3/O5 já fechados (ADR-0019
`aceito` no G2, #95 mergeado no G3), mas a **regra de foco** (uma tarefa ativa por vez) mantém o
**passo imediato** em **esperar o merge humano (T3/G3) do #96**; **só depois** vem o replanejamento.

**Ao mergear o #96 → replanejar (volta ao Plan/G1).** Não haverá próximo work item aprovado: o passo
seguinte é **decidir com o humano (G1)** a próxima linha de trabalho — um novo épico/Onda **ou** puxar
os **follow-ups abertos** de hygiene já rastreados: **#93** (alinhar o guard-text do
`fast-lane-eligibility.ts` ao do `cross-model-review.ts` — follow-up do #92), **#75** (remover python do
`smoke-test.sh`, alinhando ao ADR-0005/0012; mata a classe de falso-vermelho `pyyaml`), **#82**
(reset/bootstrap do ledger p/ repos derivados do template), **#83** (alinhar/deprecar o `--from-gh` do
gerador), **#85** (lifecycle de `passes:true` — validação não-e2e + owner/gatilho da flip) e **#98**
(fence aninhado no guard do núcleo + reorder Prime/G0 no getting-started — deferidos da review do #97).
**Não iniciar/implementar nada sem G1** (criar Issue de follow-up de rastreio é permitido).

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
**ADR-0018 (`aceito` — protocolo cross-model, #91)** · `docs/examples/cross-model-review.ts` ·
`AGENTS.md` §2 · `docs/harness-reviewer-checklist.md` §11 · `docs/agent-reviewer-checklist.md` §7 ·
**ADR-0019 (`aceito` — núcleo L0 condensado, #94)** · **`AGENTS.core.md` (núcleo L0)** ·
`docs/examples/l0-core-manifest.ts` · `AGENTS.md` §4 · `CLAUDE.md` · `CHANGELOG.md`
