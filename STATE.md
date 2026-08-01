# STATE — Índice de Estado

> **Camada L1 (índice leve)** (`AGENTS.md` §4). Ponteiro de orientação rápida: o agente lê isto
> ao iniciar uma sessão para saber **onde estamos e qual o próximo passo**. **Não duplica**
> conteúdo — o detalhe vive nas Issues SDD e nos artefatos linkados. Atualize ao concluir cada
> tarefa/fase.

## Agora

- **Fase do pipeline:** **épico O6** (Hygiene & navegação) **em andamento** — **T6.0** (**#121**):
  índice **gerado** de ADRs + guard anti-drift, reusando o padrão do ADR-0019, via **ADR-0023**. **O1–O5
  todos concluídos** (O5 fechou com a **T5.3**/PR #95 + follow-ups #96/#98 mergeados; #73 mergeada, PR #81).
- **Em andamento:** **#121** (T6.0, **G1 aprovado**: novo épico O6, **G2/ADR-0023**, fatiado — começar por
  (a)). **Fatia (a)** (este PR): **ADR-0023** (`aceito` — **G2 aprovado pelo owner em 2026-08-01**) + gerador puro
  `tools/adr/adr-index.ts` (`buildAdrIndex` + I/O `--write`/`--check` + self-check) + `adr-index.test.ts`
  (extração, limpeza de HTML, template excluído, ordenação, drift, fail-soft, escape de `|`, colisão de
  número) + `README.md` **gerado** (23 ADRs, ordenado, idempotente). **Fatia (b)** (próximo PR): guard no `scripts/smoke-test.sh`
  + convenção de autoria (`CONTRIBUTING`/`0000-template.md`) + findability (`getting-started` §7/`MEMORY.md`).
  **#121 projetada** no ledger (7 critérios, `passes:false`). **T2 · Harness Review · merge humano (T3).**
- **Última conclusão:** **#116** (PR **#119**) · **guard base×head do marcador de lifecycle** (follow-up do
  #114/ADR-0022 §d). **Abordagem (G1):** novo `ledger-origin.ts --guard-lifecycle <base> <head>`
  (`diffLifecycle`/`readBaseLifecycle`, espelhando o `diffOrigin`) **congela o corte do legado** — só
  introdução + `note`; **rejeita** mover/reclassificar/re-fingerprintar `legacyEntryIds`/`legacySha256`/
  `adoptedOn`/`regimeAdr` e **remover** o marcador; **fail-closed** em base inválida. Roda no **smoke-test/CI**
  (base = `origin/main`), fechando o bypass auto-consistente que o `--scoped` de head-state não pega. A
  introdução do corte é **origin-aware** (orion → fronteira = base; derivado local → vazio) e o head rejeita
  **symlink**/`null` presente e valida os **metadados do regime** na introdução (Codex r2–r7). **244 testes**;
  caveat do ADR-0022 **RESOLVIDO**. **T2 · PR misto → Harness Review _e_ Product Review** (código
  `ledger-origin.ts`/testes + governança). **Harness Review do Codex (7 rodadas → 👍) + Product Review do
  owner. T2 · merge humano a pedido do owner (T3/G3); sem novo ADR** (dentro do ADR-0022). **#116 projetada**
  (3 critérios), **flipadas `passes:true` no PR #120** (transição de manutenção, §c). _Lifecycle do ledger
  completo (#85→#114→#116); nenhuma dívida remanescente._
- **Última conclusão:** **#114** (PR **#117**) · **tooling do lifecycle no `--scoped`** (follow-up do
  #85/ADR-0022). **Abordagem (G1):** `ledger-origin.ts --scoped` **classifica** cada entrada em **aguardando
  flip** (entregue em `main`) / **pendente** (`false` recém-projetada na branch, não flipar) / **concluída**
  / **legado** (oculto por padrão; `--all` lista), via o novo marcador `.orion/ledger-lifecycle.json` que
  **enumera** o legado pré-ADR-0022 + `sha256` (tamper-evidence). **Corte por enumeração**, não por número de
  issue (dados: #87–#108 são legado apesar de > #85). Baseline de entrega (`origin/main`) resolvida pelo CLI
  (git read-only, pela raiz do repo; `maxBuffer` p/ o ledger append-only; indisponível → conservador). 220
  testes; ritual §7 + smoke refletem; caveat do ADR-0022 **RESOLVIDO**. **Harness Review do Codex (12 rodadas
  → 👍) + Product Review do owner.** **T2 · merge humano a pedido do owner (T3/G3); sem novo ADR** (dentro do
  ADR-0022). **#114 projetada** (3 critérios), **flipadas `passes:true` no PR #118** (transição de manutenção,
  §c). _Follow-up remanescente: **#116** (guard base×head do marcador de lifecycle)._
- **Última conclusão:** **#85** (PR **#113**) · **lifecycle de `passes:true` no ledger** (follow-up do
  #73/#81, limitação conhecida do ADR-0016). **Abordagem (G1):** (a) `steps` do gerador **sempre
  condicionais** — técnica como **dica por categoria** (`style`→browser, `contract`→contrato público,
  `functional`→neutro) subordinada às **duas** condições do ADR-0009 (superfície **E** risco), sem e2e
  incondicional em campo imutável — fecha o hardcode "Validar end-to-end"; (b) flip `false→true` é
  **follow-up** (guard proíbe nascer `true` → sempre PR posterior; **edição T2 / merge T3/G3**), rastreada
  pelo get-bearings e checada em **ambos** os checklists; o **DoD §12** exige só **projeção + evidência**
  (não a flip — evita deadlock). **Novo [ADR-0022](docs/decisions/0022-lifecycle-passes-ledger.md) `aceito`
  (G2)**; ADR-0016 e ADR-0021 ganham bullet **RESOLVIDO (#85)**. **Harness Review do Codex endereçada em 5
  rodadas** (convergindo — DoD circular, G1→G2, rota Harness, categoria⇒e2e, fast-lane, legado, lane/T3 da
  flip, ponteiros) + **Product Review do owner no merge**. **T2 · merge humano a pedido do owner (T3/G3)**.
  **#85 projetada** (3 critérios). _Follow-up de tooling: **#114**. As 3 entradas do #85 são flipadas
  `false→true` no **PR #115** (transição de manutenção, §c do ADR-0022 — 1º exercício do lifecycle que esta
  tarefa define)._
- **Última conclusão:** **#83** (PR **#112**) · **deprecar o `--from-gh` do gerador** (coerência com a
  projeção per-PR, achado do Codex no #81). **Abordagem (A) (G1):** o `--from-gh` (projetava **todas**
  as `type:task` abertas → drift) foi **deprecado** — novo `loadIssues` **recusa** com erro guiado; a
  fonte única do gerador é **`--issues-json`** com a Issue do PR. Removido o `fetchFromGh` + o
  `execFileSync(gh)`. Notas: append-only no ADR-0006 + **caveat do ADR-0016 resolvido** (padrão
  append-only: caveat original preservado + bullet RESOLVIDO — Harness Review pegou um rewrite in-place).
  **Dentro do ADR-0006/0016**, **sem novo ADR**. **T2 · Harness Review**. **#83 projetada** (2 critérios,
  via o próprio `--issues-json`).
- **Última conclusão:** **#108** (PR **#111**) · **tool-guard robusto à normalização de aspas/escape do
  shell** (follow-up do #103; limitação pré-existente aflorada no PR #105 r5-6). **Abordagem (c) (G1):**
  as denylists de segurança (`SHELL_FORBID`/`SENSITIVE_READ_TARGETS`/validadores **e** `SHELL_MUTATING`)
  casam também uma **view normalizada** (`stripShellQuoting` — sem aspas/escape) além do texto cru → fecha
  bypasses como `cat ".e""nv"` → `.env` e `git diff --out""put=x`. Conservador (falso-positivo = bloqueio);
  uso legítimo (`grep "foo"`, `find -name "*.ts"`) intacto. Resíduo (glob não-aspeado) = **caveat no
  ADR-0011**, **sem novo ADR**. Harness Review (Codex) endereçada (o `SHELL_MUTATING` foi lacuna do próprio
  fix, fechada). **T2 · Harness Review**. **#108 projetada** (3 critérios).
- **Última conclusão:** **#107** (PR **#110**) · **get-bearings consome a view no escopo** (follow-up do
  #103, achado P2 do Codex). **Abordagem (B) (G1):** novo `ledger-origin.ts --scoped` imprime as entradas
  de `inScope` (com status `passes`); o `getting-started` §7 (ritual) passa a rodá-lo em vez de ler o
  `feature-ledger.json` cru — num repo derivado as herdadas (pré-origem-local) ficam **ocultas**, no Orion
  a view é o ledger inteiro. **Dentro do ADR-0021/0016** (nota append-only no ADR-0021), **sem novo ADR**.
  Harness Review do Codex: **👍 sem achados**. **T2 · Harness Review**. **#107 projetada** (3 critérios).
- **Antes:** **#106** (PR **#109**) · **guard de colisão de IDs local×herdado no gerador**
  (follow-up do #103, achado P1 do Codex). **Abordagem (b) (G1):** o `ledger-from-issues.merge` consulta o
  `inheritedEntryIds` do marcador — `id` gerado ∈ herdados = **colisão → falha fechado** (nada gravado),
  checada **independentemente** do ledger atual; `id` já-presente não-herdado = idempotência; marcador
  presente vazio/`null`/inválido = falha fechado. No Orion (`origin:orion`) inalterado. **Dentro do
  ADR-0006/0016/0021** (nota append-only no ADR-0021), **sem novo ADR**. Harness Review (Codex, 3 rodadas)
  endereçada; #106 ganhou seção `Critérios de aceite` (projeção as-accepted fiel). **T2 · Harness Review**.
  **#106 projetada** no ledger (3 critérios).
- **Antes:** **#103** (PR **#105**) · **bootstrap do ledger p/ repos derivados — marcador de
  origem local (sem apagar)** · **supersede #82/PR #102**. **[ADR-0021](docs/decisions/0021-bootstrap-ledger-origem-local.md)
  `aceito` (G2, 2026-07-25)**. Mecanismo: o repo derivado **não apaga** o ledger herdado — grava
  [`.orion/ledger-origin.json`](.orion/ledger-origin.json) (`origin: "local"`), entradas herdadas viram
  **"pré-origem-local"** (fora de escopo, ADR-0016). Semântica do guard **inalterada** + endurecimento
  (rejeita `id` duplicado); `--init --write` reservado ao humano no tool-guard; marcador **imutável**
  (guard base×head) + fail-closed; sinal verificável/tamper-evident (#407); exclusão enumerada (#417);
  estado de origem **visível** no smoke/CI (#415); nota forward no ADR-0006 (#424). **Harness Review
  (Codex, 9 rodadas) endereçada**; follow-ups **#106/#107/#108**. `ledger-origin.ts` + schema (vitest 54
  no `ledger-origin`); smoke **10/0**; 182 testes; **#103 projetada**. **T2 · Harness Review** (ADR-0008).
- **Antes:** **#75** (PR **#101**) · **remove python/pyyaml do `scripts/smoke-test.sh`**
  (alinha ao ADR-0005/0012 — runtime único Node/TS): a camada estática vira o **módulo TypeScript**
  [`tools/smoke/static-check.ts`](tools/smoke/static-check.ts) — **typechecado + vitest** (23 casos), o
  shell **só invoca**. YAML por **parser real `js-yaml`** (**escolha (a)**, **[ADR-0020](docs/decisions/0020-parser-yaml-smoke-test.md)
  (`aceito` no G2)**): rigor completo de sintaxe (indentação/mapping/flow), sem o false-green da
  heurística (Codex apontou classes sucessivas — parser converge). **Trade-off do G2:** o smoke passa a
  **exigir `node_modules`** (`npm ci` antes) — job `smoke-test` do CI ganha `npm ci`; get-bearings §7
  anotado. Template SDD por extração de `label:`; JSON/links/§refs/artefatos/PR/CI preservados e
  **mordendo**; `walk` **não segue symlinks**. `ci.yml` dropa o **pyyaml órfão** (mantém `pre-commit` da
  Seção 2, §5). **Mata a classe de falso-vermelho `pyyaml`**; smoke local/CI **verde** (9/0). **T2** ·
  **G2 (ADR-0020)**. **#75 projetada no ledger**. Linha: **Harness Review** (ADR-0008).
- **Antes:** **#93** (PR **#100**) · **alinha o guard-text do `fast-lane-eligibility.ts`**
  ao do `cross-model-review.ts` (follow-up do #92/T5.2): sob o tool-guard a evidência é o **self-check
  sem-args**; os modos de input JSON/stdin são para **operador/CI rodando `node` direto**, fora do shell
  guardado — **por design do ADR-0015**, não bypass. **Só comentário — sem mudança de lógica/allowlist**;
  T1 (fluxo normal, sem ADR). **#93 projetada no ledger**. Linha: **Harness Review** (ADR-0008).
- **Antes:** **#98** (PR **#99**) · **fence CommonMark + escopo do onboarding** (follow-up da
  T5.3) — `extractSections` trata fence à la CommonMark (char+comprimento; fence aninhado; crase-fence
  rejeita info com crase) e o `getting-started` escopa os passos 1–4 como **bootstrap humano** (precedem
  o G0), com o ciclo do agente gateado (incl. **Initialize/G1**) a partir do Prime. Opera **dentro do
  ADR-0019** (sem novo ADR); vitest 17 casos; **#98 projetada no ledger**. Linha: **Harness Review** (ADR-0008).
- **Antes:** **#96** (PR **#97**) · **hygiene do guard do núcleo L0** — pula blocos cercados + indent 1–3;
  conta `§id` antes de filtrar tier; lê tier da coluna certa; ancora `§id` à 1ª célula; núcleo no topo do
  onboarding. **#96 projetada no ledger**.
- **Conclusão substantiva (T5.3):** **#94** (PR **#95**) · **núcleo L0 condensado** (**fecha o O5**) —
  sub-particiona o **L0** (§4) em núcleo sempre-carregado ([`AGENTS.core.md`](AGENTS.core.md)) + detalhe
  sob demanda, sem redefinir "L0" nem renumerar; anti-drift no guard do
  [`scripts/smoke-test.sh`](scripts/smoke-test.sh). **[ADR-0019](docs/decisions/0019-nucleo-l0-condensado.md)
  (`aceito` no G2)**; **#94 projetada no ledger**. Detalhe em
  [`CHANGELOG.md`](CHANGELOG.md) e no ADR-0019.
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
- **Governança recente:** **ADR-0020** (parser YAML no smoke-test — **`aceito`** no G2, #75),
  **ADR-0019** (núcleo L0 condensado — **`aceito`** no G2, #94),
  **ADR-0018** (protocolo cross-model — **`aceito`** no G2, #91), **ADR-0017**
  (fast-lane T1 — **`aceito`** no G2, #87), **ADR-0016**
  (política de projeção do ledger, #73), **ADR-0015** (allowlist de exemplos `docs/examples/`),
  ADR-0014 (semântica *as-accepted*), ADR-0013 (alvo de leitura no tool-guard), ADR-0012
  (consolidação Node/TS), ADR-0009 (e2e), ADR-0010 (re-review) e ADR-0011 (hook de guarda)
  **aceitos** (G2).
- **Regra de foco:** **uma tarefa ativa por vez** — não **iniciar/implementar** nova tarefa antes da
  ativa estar verde e mergeada. **Caso atual: sem tarefa ativa** (#116 concluída — PR #119 mergeado) →
  **replanejar (G1)** antes de iniciar novo work item. (Flip do #116 resolvido no PR #120.)
  **Criar Issue de follow-up de rastreio** (backlog) **é permitido** — o que a regra proíbe é **começar** a
  implementação sem G1.

## Próximo passo

**Replanejar (volta ao Plan/G1) — sem tarefa ativa** (#116 mergeada no PR #119; o **lifecycle do ledger está
completo** — #85→#114→#116, **zero caveats abertos** no ADR-0022). Decidir com o humano (G1) a próxima linha.
**Dívida do #116 — RESOLVIDA no merge do PR #120:** as **3 entradas do #116** flipadas `false→true` na
**transição de manutenção** (§c do ADR-0022; edição T2, merge T3/G3), com a evidência aplicável (suíte vitest
+ `--guard-lifecycle` real) — no `--scoped` deixam de ser "aguardando flip" e viram **concluída**. Com isso o
**lifecycle do ledger está completo** (#85→#114→#116, zero dívidas). **Não iniciar novo work item sem G1.**

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
