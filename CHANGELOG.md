# Changelog

Todas as mudanças notáveis deste projeto são documentadas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota
[Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não publicado]

### Adicionado

- **Manifesto de classificação dos artefatos (#132, T9.2 / épico O9):** novo
  [`docs/examples/artifact-manifest.ts`](docs/examples/artifact-manifest.ts) (TS, Node ≥22 type-strip,
  com testes vitest) cataloga os **pares (artefato, regra)** — cada um com **exatamente um papel**
  (`source`/`pointer`/`mirror`/`history`/`projection`/`generated`/`temporary`/`deprecated`/`removed`),
  **destino** (manter/stub/remover) e a **fatia** executora, separando **espelhos de governança já
  autoritativa** (T9.5) de **espelhos de plano/história** (T9.3/T9.4) e marcando as **referências
  normativas a `PLAN.md`/`CHANGELOG.md` como fonte**. Insumo verificável do guard da T9.6; declara o
  **gatilho de manutenção** (cada fatia atualiza a sua entrada no mesmo PR) e a **regra de cobertura**.
  **Sem mutação destrutiva** — só cataloga (aplica o ADR-0025, fatia T9.2; G1).
- **Modelo-alvo de plano, história e compactação — ADR-0025 `aceito` (#130, T9.1 / épico O9, PR #131):**
  ADR (G2 aprovado) que fixa **Issues/Projects = fonte do plano** (épico = Milestone) e **PRs mergeados =
  fonte da história**; `PLAN.md`/`CHANGELOG.md` passam a stub/ponteiro nas fatias T9.2–T9.7. Carrega a
  **redação integral do novo §4** e o critério **ledger vs. `history.json`**. **Supersede parcialmente**
  o [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md) (rotas "história→CHANGELOG"
  e "status/fase→PLAN") e o [ADR-0001](docs/decisions/0001-fundacoes-do-orion-harness.md) (cláusula
  "PLAN.md = mapa de épicos" → Milestone), ambas por nota de cabeçalho append-only. Índice de ADRs
  regenerado. **Decisão apenas** — a aplicação (remoções/stubs/§4) é das fatias T9.2–T9.7.
- **STATE volta a ser ponteiro por construção — convenção de autoria (#125, T8.1a / épico O8, via
  [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)):** o `STATE.md` (L1)
  inflou **por construção** (~209 linhas, cadeia `Última conclusão:`/`Antes…`) porque a **Regra de
  compactação (`AGENTS.md` §4)** mandava "atualize o STATE" sem dizer que se deve **rotear**. Esta fatia
  corrige o **mecanismo gerador**: a §4 é reescrita para **rotear por camada** — história→`CHANGELOG.md`
  (L5), status/critérios→Issue (L2, fonte da verdade; projeção→ledger/`PLAN.md` L1), **só o ponteiro** (`Agora`/`Próximo passo`/`última
  conclusão`)→`STATE.md`. Novo **[ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)**
  (`proposto`) fixa o **invariante** (STATE=ponteiro; história→CHANGELOG; status→Issue (L2, projeção→ledger/PLAN)), a **tabela
  de decisão história-vs-status** e a **cláusula de limitação conhecida do guard** (heurística ≠ garantia —
  guard verde **não** prova STATE limpo; a garantia é a **revisão humana**, §8.1); o **número** do
  orçamento fica **fora** do invariante (config ajustável, não governança). O roteamento passa a ser
  **cobrado no PR** pelos **dois** reviewer-checklists (Harness §8 / Product §7) e pelo `CONTRIBUTING.md`
  (Ship). O `STATE.md` é **encolhido ao ponteiro** — a história removida foi **movida ao CHANGELOG antes
  do corte** (append-only; zero perda), preservando `última conclusão` (read-path do get-bearings §7).
  **Rastreabilidade Issue→PR migrada do STATE** (mapeamentos que viviam só no ponteiro; preservados aqui
  antes do corte — **conjunto completo**, todo PR citado no STATE antigo): #49→PR #68, #53→PR #63,
  #62→PR #69, #67→PR #72, #71→PR #79, #73→PR #81, #74→PR #76, #75→PR #101, #83→PR #112, #85→PR #113,
  #87→PR #88, #91→PR #92, #93→PR #100, #94→PR #95, #96→PR #97, #98→PR #99, #103→PR #105, #106→PR #109,
  #107→PR #110, #108→PR #111, #114→PR #117, #116→PR #119, #121→PRs #122/#123. A
  **rede** (guard `state-budget-check` + config + wiring no smoke-test) é a **fatia b (T8.1b)**, Issue/PR
  separada **depois** desta (ligar o guard antes da convenção faria todo PR falhar o budget). Governança/
  instruções (Harness Review, ADR-0008), **sem superfície de usuário** → **e2e dispensada** (ADR-0009).
  **T2 · G2 (ADR-0024) · merge humano (T3/G3).** #125 projetada no ledger. (#125)
- **Guard anti-drift do índice de ADRs + convenção de autoria + findability (#121, T6.0 — fatia (b),
  fecha o #121):** o [`scripts/smoke-test.sh`](scripts/smoke-test.sh) passa a rodar
  `tools/adr/adr-index.ts --check` (14º check) — **reprova o CI** se o `docs/decisions/README.md` divergir
  da projeção dos ADRs (criar um ADR, ou mudar número/título/status/nome, sem `--write` ⇒ vermelho;
  **simulação do agente obediente** comprovada) — e
  o self-check confirma que o guard **morde**. Convenção de autoria no [`CONTRIBUTING.md`](CONTRIBUTING.md) +
  nota no [`docs/decisions/0000-template.md`](docs/decisions/0000-template.md) ("ao criar/alterar um ADR,
  regenere o índice e commite"). Findability: [`docs/getting-started.md`](docs/getting-started.md) §7 (ritual
  get-bearings) e [`MEMORY.md`](MEMORY.md) mandam **`grep` no `decisions/README.md`** para achar um ADR por
  tema, em vez de varrer a pasta. Fecha o loop do ADR-0023 (rotear por construção + rede + findability). (#121)
- **Índice gerado de ADRs + guard anti-drift (#121, T6.0 / épico O6 — fatia (a), via ADR-0023):** novo
  gerador [`tools/adr/adr-index.ts`](tools/adr/adr-index.ts) projeta o índice de ADRs em
  [`docs/decisions/README.md`](docs/decisions/README.md) — **número/título/status por ADR** (extraídos do
  heading `# ADR-NNNN — …` e de `- **Status:** …`, limpando o comentário HTML), **`0000-template` excluído**,
  **ordenado por número**, com link relativo. Função **pura** `buildAdrIndex` (testável, sem I/O) + wrapper
  com modos **`--write`** (grava) e **`--check`** (reprova em drift), rodável por type stripping (Node ≥ 22.6,
  **sem devDep nova**). Cobertura [`adr-index.test.ts`](tools/adr/adr-index.test.ts) (extração,
  limpeza de HTML, template excluído, ordenação, detecção de drift, fail-soft, escape de `|`, colisão de número) +
  self-check (índice real × README **e** prova de mordida); **idempotente** (`--write` 2× = sem diff).
  Emite tabela com **escape de `|`** e **rejeita números de ADR duplicados** (colisão de prefixo).
  **Reusa o padrão do [ADR-0019](docs/decisions/0019-nucleo-l0-condensado.md)** (visão derivada + guard):
  o índice é uma **projeção** dos ADRs, nunca autoral ⇒ **zero superfície de drift**. Novo
  **[ADR-0023](docs/decisions/0023-indice-gerado-de-adrs.md)** (`aceito` — G2 aprovado em 2026-08-01). Fatia **(b)**
  (próximo PR) fia o guard no `scripts/smoke-test.sh` + convenção de autoria + findability. **#121 projetada**
  no ledger (7 critérios, `passes:false`). **T2 · Harness Review · merge humano (T3/G3).** (#121)

### Alterado

- **flips `passes:true` de manutenção — #85 (#115), #116 (#120), #121 (#124) — transição de manutenção,
  ADR-0022 §c:** completam o lifecycle das respectivas Issues aplicando a flip `false→true` das entradas
  criadas `false` (o `ledger-guard` proíbe **nascer `true`** → sempre PR posterior): **`F-0085-*`** (3,
  PR #115), **`F-0116-*`** (3, PR #120) e **`F-0121-*`** (7, PR #124). Em cada uma, **só** transição
  `false→true` de itens **existentes** — `ledger-guard` base→head verde, **append-only** intacto (nada de
  `steps`/`description`/`acceptance`); no `--scoped` deixam de ser "aguardando flip" e viram **concluída**.
  Fecham o lifecycle #85→#114→#116 e a projeção do #121, **zero `aguardando flip`/`pendente`** no escopo.
  **T2 · merge humano (T3/G3)**. (#115, #120, #124)
- **flip `passes:true` das 3 entradas do #114 (#118 — transição de manutenção, ADR-0022 §c):** as entradas
  `F-0114-*` (criadas `false` no PR #117, pois o `ledger-guard` proíbe **nascer `true`**) passam a
  `passes:true` — o lifecycle do #114 aplicado a si mesmo (como #85→#115). Evidência do plano de validação
  aplicável (critérios `functional`/sem-e2e): suíte vitest (**220**) + exercício real do `--scoped`, que passa
  a classificá-las como **concluída**. **Só** transição `false→true` de itens **existentes** — `ledger-guard`
  base→head verde, **append-only** intacto (nada de `steps`/`description`/`acceptance`). **T2 · merge humano
  (T3/G3)**. (#118)

### Corrigido

- **`--from-gh` do gerador do ledger deprecado (#83 — coerência com a projeção per-PR):** o modo
  `--from-gh` do [`ledger-from-issues.ts`](tools/ledger/ledger-from-issues.ts) buscava **todas** as
  `type:task` **abertas** (`gh issue list`) e projetava **em massa**, sem predicado de PR/G1 — Issues de
  backlog (sem PR, ainda evoluindo) viravam entradas **append-only** ([ADR-0006](docs/decisions/0006-ledger-executavel-de-tarefas.md))
  e contaminavam o ledger, o **drift** que a projeção **per-PR** do
  [ADR-0016](docs/decisions/0016-politica-projecao-ledger.md) evita. **Abordagem (A)** (G1): o modo foi
  **deprecado** — novo `loadIssues` **recusa** `--from-gh` com erro guiado apontando para `--issues-json`;
  removidos o `fetchFromGh` e o `execFileSync("gh", …)`. A **fonte única** do gerador passa a ser
  **`--issues-json`** com a **própria Issue do PR**. Notas: append-only no ADR-0006 (o item que listava
  `--from-gh`) + **caveat do ADR-0016 resolvido**. **Sem novo ADR** (opera dentro do ADR-0006/0016).
  **T2 · Harness Review**. #83 projetada no ledger (2 critérios, via o próprio `--issues-json`). (#83)

- **tool-guard robusto à normalização de aspas/escape do shell (#108 — follow-up do #103):** o
  [`tools/guard/tool-guard.ts`](tools/guard/tool-guard.ts) casava regex no **texto cru**, mas o shell
  normaliza aspas/escape **antes do `argv`** — `cat ".e""nv"` → `.env` lia o segredo **furando** a
  `SENSITIVE_READ_TARGETS` (T1 liberado). Abordagem **(c)** (G1): as denylists de **segurança**
  (`SHELL_FORBID`, `SENSITIVE_READ_TARGETS`, validadores sensíveis) passam a casar também uma **view
  normalizada** (`stripShellQuoting`: remove aspas simples/duplas — incl. vazias — e backslash-escape),
  além do cru e do sem-traversal. **Conservador** (remover aspas/escape só faz **casar mais** →
  falso-positivo = bloqueio, direção segura); **uso legítimo intacto** (`grep "foo"`, `find -name "*.ts"`,
  `echo "x"` seguem T1 — a allowlist casa por prefixo). **Resíduo** (glob não-aspeado em alvo sensível,
  `cat .en?`) documentado como **caveat no [ADR-0011](docs/decisions/0011-hook-sandbox-allowlist-referencia.md)**,
  **sem novo ADR**. **T2 · Harness Review**. #108 projetada no ledger (3 critérios). (#108)

### Adicionado

- **guard base×head do marcador de lifecycle (#116 — follow-up do #114/ADR-0022):** faltava o append-only
  do **próprio corte do legado** — sem ele, um PR poderia **encolher** `legacyEntryIds` (reclassificar um
  legado como sob-regime → "aguardando flip") ou **crescer** (ocultar uma entrada sob-regime do get-bearings),
  re-fingerprintando de forma auto-consistente e passando no `--scoped` de head-state. Novo
  [`ledger-origin.ts --guard-lifecycle <base> <head>`](tools/ledger/ledger-origin.ts) (`diffLifecycle` +
  `readBaseLifecycle`/`readHeadLifecycle`, espelhando o `diffOrigin` do marcador de origem): **congela o corte**
  — a **introdução** é **vinculada à fronteira da base**, **origin-aware** (`orion` → `legacyEntryIds ==
  ids(origin/main)` + fingerprint; **derivado `local`** → corte **vazio**, sem legado local; sem subconjunto
  arbitrário que esconderia sob-regime); depois, só `note`
  muda e **rejeita** mover/reclassificar/re-fingerprintar `legacyEntryIds`/`legacySha256`/`adoptedOn`/`regimeAdr`
  e **remover** o marcador. **Fail-closed** em base inválida; o **head** rejeita **symlink** e `null`/vazio
  presente. **Roda no `smoke-test`/CI** (base = `git show origin/main:.orion/ledger-lifecycle.json`),
  fechando o bypass que a tamper-evidence de estado (fingerprint no `--scoped`) não pegava. Testes vitest
  cobrem as transições. Fecha o caveat do ADR-0022. **T2 · PR misto → Harness Review _e_ Product Review**
  (código `ledger-origin.ts`/testes + governança). #116 projetada (3 critérios). (#116)

- **tooling do lifecycle no `--scoped` (#114 — follow-up do #85/ADR-0022):** sob a projeção per-PR toda
  entrada nasce `false` e só flipa num PR posterior, então `passes:false` ficou **ambíguo** no
  [`ledger-origin.ts --scoped`](tools/ledger/ledger-origin.ts) — que rotulava **todo** `false` como
  "pendente" e **mostrava o legado** (~105 entradas), **inundando** o get-bearings. Agora o `--scoped`
  **classifica** cada entrada em **aguardando flip** (sob-regime & `false` & **já em `main`** → candidata a
  flip), **pendente** (`false` recém-projetada **nesta branch**, ainda não em `main` → não flipar),
  **concluída** (`true`) e **legado** pré-ADR-0022 (**oculto por padrão**; `--all` lista). A distinção
  entregue×pendente usa a baseline `origin/main`, **resolvida pelo próprio CLI** (git read-only interno, sem
  redireção — compatível com o tool-guard); baseline **indisponível** (offline/checkout raso) → **vazio
  conservador** (tudo `false` vira **pendente**, nunca "entregue"). `--base <ledger>` é override explícito.
  Via o novo marcador
  [`.orion/ledger-lifecycle.json`](.orion/ledger-lifecycle.json) que **enumera** o legado + `sha256` de
  tamper-evidence. **Corte por enumeração, não por número de issue** (os dados provam que #87–#108 são
  pré-ADR-0022 apesar de > #85 — mergearam antes), padrão do `inheritedEntryIds`
  ([ADR-0021](docs/decisions/0021-bootstrap-ledger-origem-local.md)). Marcador **ausente = sem legado**
  (repo derivado: todo local é sob-regime). Ritual get-bearings (§7) e `smoke-test` refletem a distinção;
  novas funções puras (`classifyLifecycle`/`verifyLifecycle`/`validateLifecycleShape`) cobertas por vitest.
  **Guard base×head do marcador** = follow-up **#116** (hoje: fingerprint no `--scoped`/smoke + review). Fecha
  o caveat do ADR-0022. **T2 · PR misto → Harness Review _e_ Product Review** (código de produto + governança).
  #114 projetada (3 critérios). (#114)

- **lifecycle de `passes:true` no Feature Ledger (#85 — follow-up do #73/#81):** o
  [ADR-0016](docs/decisions/0016-politica-projecao-ledger.md) fixou a **projeção** (`passes:false`) mas
  diferiu a **conclusão** ao #85. Antes o gerador **hardcodava** `steps: ["Validar end-to-end …"]` em
  **toda** entrada e o schema exigia e2e — mesmo p/ tarefas **sem superfície observável**, contra o opt-in
  do [ADR-0009](docs/decisions/0009-verificacao-e2e-ferramenta-real.md) — e **nenhum artefato** definia o
  **owner/gatilho** da flip `false→true` (todas `false` — ~105 à data, indistinguíveis de pendentes). **Decisão
  ([ADR-0022](docs/decisions/0022-lifecycle-passes-ledger.md) — gate **G2**):** (a) os `steps` do
  [`ledger-from-issues.ts`](tools/ledger/ledger-from-issues.ts) viram o **plano de validação aplicável**
  **sempre condicional** — a técnica é uma **dica por categoria** (`style`→browser, `contract`→contrato
  público, `functional`→neutro) **subordinada** ao opt-in do ADR-0009, nunca e2e incondicional num campo
  imutável — e o [schema](tools/ledger/feature-ledger.schema.json) não afirma mais e2e universal; (b) a flip
  `false→true` é **follow-up** (o guard proíbe **nascer `true`**, então é sempre um **PR posterior**),
  rastreada pela view de get-bearings (`--scoped`) e checada em **ambos** os checklists (Product **e
  Harness**) — **não** é gate de conclusão da própria entrega (evitando o deadlock: DoD exige só
  **projeção + evidência**). Só transição de item **existente** `false→true` — **append-only** intacto. A
  flip é **transição de manutenção na Issue original** (não novo `type:task` → sem regresso; T3 no merge); o
  DoD exime a **fast-lane** issue-less; e o **legado pré-ADR-0022** (~105 entradas) é **exclusão explícita**
  (não flip-debt, análoga a pré-ledger/pré-origem-local). Tooling do `--scoped` p/ distinguir/filtrar =
  **follow-up rastreado** (caveat no ADR-0022). **T2 · Harness Review**. #85 projetada no ledger (3
  critérios). (#85)

- **get-bearings consome a view no escopo do ledger (#107 — follow-up do #103):** o ritual de início de
  sessão ([`docs/getting-started.md`](docs/getting-started.md) §7) lia o
  [`feature-ledger.json`](feature-ledger.json) **cru** para achar o que está `passes:false` — num repo
  derivado do template, as entradas **herdadas** do Orion (pré-origem-local, fisicamente presentes e
  `false`) fariam um agente tratar tarefa do Orion como trabalho local pendente (achado P2 do Codex no
  #103). Novo modo **`ledger-origin.ts --scoped`** imprime as entradas de `inScope` (com o status
  `passes`), e o §7 passa a rodá-lo em vez de ler o ledger cru: num derivado as herdadas ficam **ocultas**;
  no Orion (`origin:orion`) a view é o ledger inteiro (no-op benéfico). **Abordagem (B)** (G1); nota
  append-only no [ADR-0021](docs/decisions/0021-bootstrap-ledger-origem-local.md), **sem novo ADR**.
  **T2 · Harness Review**. #107 projetada no ledger (3 critérios). (#107)

### Corrigido

- **Guard de colisão de IDs local×herdado no gerador (#106 — follow-up do #103):** num repo derivado a
  numeração de Issues **reinicia**, então uma Issue local pode gerar um `id`
  (`F-<issue>-<hash6(issue:aceite)>`) **igual a um herdado** (mesmo número + mesmo aceite) — que o dedup
  do [`ledger-from-issues`](tools/ledger/ledger-from-issues.ts) descartaria **em silêncio**. Agora o
  `merge` consulta o `inheritedEntryIds` do marcador de origem
  ([`.orion/ledger-origin.json`](.orion/ledger-origin.json), via novo `inheritedIdSet`): `id` já-presente
  **não-herdado** = re-projeção idempotente; `id` gerado que coincide com um **herdado** = **colisão →
  falha fechado** (exit ≠ 0, nada gravado), com a orientação de reescrever o aceite da Issue local. A
  colisão é checada **independentemente** do ledger atual (um id herdado ausente do ledger ainda é
  colisão, não reconstrução). O marcador é lido gateando `existsSync` + `readBaseMarker` — arquivo
  **ausente** = sem herdados (Orion/legado); arquivo **presente** vazio/`null`/malformado = **falha
  fechado** (não desabilita o guard em silêncio, Codex #109). No
  Orion (`origin:orion`, sem herdados) o comportamento é **inalterado**. **Abordagem (b)** (G1); opera
  **dentro** do ADR-0006/0016/0021 (nota append-only no [ADR-0021](docs/decisions/0021-bootstrap-ledger-origem-local.md)),
  **sem novo ADR**. **T2 · Harness Review**. #106 projetada no ledger. (#106)

### Adicionado

- **Bootstrap do ledger p/ repos derivados — marcador de origem local, sem apagar (#103 · supersede #82/PR #102):**
  um repo criado via "Use this template" herda o [`feature-ledger.json`](feature-ledger.json) do Orion sob
  o append-only ([ADR-0006](docs/decisions/0006-ledger-executavel-de-tarefas.md)). Em vez de **apagar** o
  herdado (a exploração do PR #102 tornava o `ledger-guard` *bootstrap-aware* — **não fail-secure**, #407:
  qualquer wipe→`[]`, em qualquer repo, repetível, passava), o bootstrap **não remove nada**: grava um
  **marcador de origem** versionado [`.orion/ledger-origin.json`](.orion/ledger-origin.json)
  (`tools/ledger/ledger-origin.ts` + schema, cobertos por vitest — 54 casos, incl. guard de imutabilidade
  base×head e equivalência validador≡schema). As entradas herdadas viram
  **"pré-origem-local"** — exclusão **explícita e enumerada** (`inheritedEntryIds`), análoga à "pré-ledger"
  do [ADR-0016](docs/decisions/0016-politica-projecao-ledger.md) (#417). O **`ledger-guard` fica intocado e
  fail-secure por construção** (nenhuma remoção). Sinal **verificável/tamper-evident** (fingerprint da
  semente + `--check`). O [`scripts/smoke-test.sh`](scripts/smoke-test.sh) **deixa de suprimir** a saída do
  guard e **reporta** o estado de origem no smoke/CI (#415). Nota forward append-only no
  [ADR-0006](docs/decisions/0006-ledger-executavel-de-tarefas.md) → ADR-0021 (#424) e nota de resolução no
  [ADR-0016](docs/decisions/0016-politica-projecao-ledger.md). `getting-started` §2 ganha o ritual
  `ledger-origin.ts --init`. **T2 · G2 ([ADR-0021](docs/decisions/0021-bootstrap-ledger-origem-local.md),
  `aceito`).** Harness Review (Codex, PR #105, 3 rodadas): fixes materiais — **guard de imutabilidade do
  marcador** (`--guard` base×head: só `orion→local` uma vez, congela `seedSha256`/`inheritedEntryIds`;
  a transição de bootstrap é **vinculada ao ledger da base** `origin/main`, não ao head, para não
  classificar entradas locais como herdadas), `--init` **fail-closed**, marcador ausente = falha no
  smoke, validador ≡ schema, STATE reconciliado. O **tool-guard escala ao humano (T3)** qualquer
  `ledger-origin … --write` (a origem do ledger é bootstrap humano, não roda sob o agente); instrução de
  recuperação corrigida (fronteira imutável, não remover+reinit); caveat na ADR-0021 para o `--init` no
  próprio Orion (mitigado por tool-guard + backstop humano, sem acoplar o guard a git-remote). Follow-ups
  #106 (colisão de IDs) e #107 (get-bearings). #103 projetada no ledger. (#103)
- **Smoke-test sem python/pyyaml — runtime único Node/TS (#75):** alinha o
  [`scripts/smoke-test.sh`](scripts/smoke-test.sh) ao ADR-0005/0012 (single-language) removendo os **2
  blocos `python3`** (camada estática + fallback offline do secret-scan). A lógica migra para o **módulo
  TypeScript** [`tools/smoke/static-check.ts`](tools/smoke/static-check.ts) — **typechecado (`tsc`) e
  coberto por vitest** (23 casos), com o shell **apenas orquestrando** a invocação. Validação de YAML por
  **parser real `js-yaml`** (**escolha (a)**, **[ADR-0020](docs/decisions/0020-parser-yaml-smoke-test.md)**):
  rigor completo de sintaxe (indentação, mapping, flow-collection, TAB…) — sem o *false-green* da
  heurística leve (a Harness Review do Codex mostrou classes sucessivas de YAML malformado que só um
  parser pega). **Trade-off (o que motiva o G2):** o smoke-test **passa a exigir `node_modules`** (`npm
  ci` antes) — o job `smoke-test` do [`ci.yml`](.github/workflows/ci.yml) ganha um passo `npm ci` e o
  ritual de get-bearings (`docs/getting-started.md` §7) anota o pré-requisito. Template SDD por **extração
  de `label:`**; JSON, links internos, cross-refs §N, artefatos, itens §8.1 do PR template e uso do
  gitleaks **preservados e testados que mordem**; a travessia de arquivos **não segue symlinks**
  (`followlinks=false`, não escapa do repo nem entra em ciclo). O `ci.yml` também dropa o **`pyyaml`
  órfão** (mantém `pre-commit` da Seção 2 — binário externo, fora de escopo). **Mata a classe de
  falso-vermelho `pyyaml`** (`No module named 'yaml'`): smoke-test **verde** local e no CI (9/0),
  independente do `python3` no PATH. **T2 · G2 ([ADR-0020](docs/decisions/0020-parser-yaml-smoke-test.md)).**
  #75 projetada no ledger. (#75)
- **Alinhamento do guard-text dos predicados de exemplo (#93 — follow-up do #92/T5.2):** o cabeçalho de
  [`docs/examples/fast-lane-eligibility.ts`](docs/examples/fast-lane-eligibility.ts) passa a usar o
  mesmo enquadramento do [`cross-model-review.ts`](docs/examples/cross-model-review.ts): **a evidência
  compatível com o tool-guard é o modo sem-args (self-check)**; os modos de input JSON/stdin são para um
  **operador/CI rodando `node` diretamente**, fora do shell guardado — **por design do
  [ADR-0015](docs/decisions/0015-allowlist-docs-examples.md)** (allowlist flags-only), **não** um
  bypass. Consistência de doc entre os dois predicados de referência; **só comentário — sem mudança de
  lógica nem da allowlist** (T1, fluxo normal sem ADR). #93 projetada no ledger. (#93)
- **Fence aninhado no guard + escopo do onboarding (#98 — follow-up da T5.3):** fecha os dois edges
  deferidos da 2ª rodada da Harness Review do #97 (dentro do
  [ADR-0019](docs/decisions/0019-nucleo-l0-condensado.md), sem novo ADR). **(a)** `extractSections`
  ([`docs/examples/l0-core-manifest.ts`](docs/examples/l0-core-manifest.ts)) trata blocos cercados à la
  **CommonMark** — guarda o **char + comprimento** da cerca de abertura e só fecha numa cerca do mesmo
  char com comprimento ≥, então uma cerca externa de 4 crases contendo ``` de 3 **não** é fechada pela
  interna e um heading numerado **aninhado** não vira seção falsa; a abertura de **crase-fence** com
  crase na info string **não** abre fence (CommonMark), preservando headings reais seguintes (til-fence
  segue com info livre) — **17 casos vitest**. **(b)** [`docs/getting-started.md`](docs/getting-started.md)
  **escopa** os passos 1–4 como **bootstrap humano do template** (uma vez, por uma pessoa; precedem o
  G0) e marca o **ciclo do agente gateado** (Prime/G0 → **Initialize/G1 condicional** → Plan/G1 → … →
  Ship/G3) começando em §5 — resolvendo a leitura de que o agente mutaria estado/governança antes dos
  gates. #98 projetada no ledger. (#98)
- **Hygiene do guard do núcleo L0 (#96 — follow-up da T5.3):** endurece o guard e o onboarding, fechando
  os nits latentes das duas rodadas da Harness Review do #95/#97 (opera dentro do
  [ADR-0019](docs/decisions/0019-nucleo-l0-condensado.md), sem novo ADR). Em
  [`docs/examples/l0-core-manifest.ts`](docs/examples/l0-core-manifest.ts): **(a)** `extractSections`
  casa heading ATX **indentado 1–3 espaços** e **pula blocos cercados** (heading numerado em exemplo de
  código não vira seção); **(b)** `coreMapDrift` conta `§id` de **todas** as linhas de mapa **antes** de
  filtrar tier (duplicata com tier em branco/errado não escapa), **lê o tier da coluna Tier por posição**
  (não de qualquer célula) e **ancora o `§id` à 1ª célula** (evita casar um `§X` citado noutra tabela —
  ex.: `§8.1` na coluna de automação do T0–T4). Em
  [`docs/getting-started.md`](docs/getting-started.md): **(c)** carrega o **núcleo no topo** e não
  sobre-afirma a ordem (mutações de governança/planejamento valem após Prime/G0 + bootstrap G1).
  **(d)** cobertura vitest em [`docs/examples/l0-core-manifest.test.ts`](docs/examples/l0-core-manifest.test.ts)
  (13 casos). Deferidos ao **#98** (fence aninhado + reorder Prime/G0). #96 projetada no ledger. (#96)

- **Núcleo L0 condensado (#94 / T5.3 — fecha o épico O5):** sub-particiona a camada **L0** (§4) em um
  **núcleo sempre-carregado** e **detalhe sob demanda**, reduzindo o peso de janela por sessão **sem**
  perder conteúdo normativo e **sem** criar uma segunda fonte da verdade —
  **[ADR-0019](docs/decisions/0019-nucleo-l0-condensado.md)** (`aceito` no G2). O novo
  **[`AGENTS.core.md`](AGENTS.core.md)** destila as **regras inegociáveis por sessão** (Princípios §1,
  Gates G0–G3 §3, modelo de confiança T0–T4 §11 + limites e o fluxo propõe→aprova→merge) e **aponta**
  (`§X`) para o detalhe; o **[`AGENTS.md`](AGENTS.md) permanece canônico** (em qualquer divergência, ele
  vence). O **[`CLAUDE.md`](CLAUDE.md)** passa a apontar para o núcleo (sempre) + `AGENTS.md` (sob
  demanda). **"L0" não é redefinido** — o núcleo é **sub-partição dentro** do L0 (§4), não novo rótulo; e
  **nenhuma seção foi renumerada** (refs `§X` intactas). Anti-drift **checado, não confiado**: um
  **manifesto `core|detail` exaustivo** de todas as §1…§12 (curado em
  [`docs/examples/l0-core-manifest.ts`](docs/examples/l0-core-manifest.ts), roda em
  `node --experimental-strip-types`) é **cruzado com os `§X` reais do `AGENTS.md`** no
  [`scripts/smoke-test.sh`](scripts/smoke-test.sh) — órfã/duplicata/fantasma ou estouro do **orçamento
  do core (77 ≤ 90 linhas)** quebra o CI. Governança/instruções (Harness Review, ADR-0008), **sem
  superfície de usuário** → verificação **e2e** (ADR-0009) **dispensada** (justificada no PR); evidência
  = output do guard (real válido × mutação órfã). #94 projetada no ledger. (#94)
- **Protocolo de revisão cross-model (#91 / T5.2 — épico O5):** operacionaliza a **independência do
  revisor** ([ADR-0008](docs/decisions/0008-separacao-revisao-harness-vs-produto.md)) e estende o
  ciclo de re-review ([ADR-0010](docs/decisions/0010-re-review-automatizado-apos-fix.md)) num protocolo
  concreto — **[ADR-0018](docs/decisions/0018-revisao-cross-model.md)** (`aceito` no G2): o modelo que
  **revisa/escreve os testes de aceite** deve ser **distinto** do que implementa (**autorrevisão
  bloqueada** → escala humano); a **divergência** entre teste (do revisor) e implementação (bug **ou**
  Issue ambígua) **escala ao humano**, roteando a atenção humana escassa por **divergência** e não por
  **volume de PR**; a **concordância + verde** reduz o *escrutínio* mas **não** dispensa o **merge
  humano (T3/G3)**, que permanece inegociável em toda rota. Os checklists de review ganham o item de
  independência (§11 do [Harness](docs/harness-reviewer-checklist.md) / §7 do
  [Product](docs/agent-reviewer-checklist.md)); ponteiros na fase _Review_ do `AGENTS.md` (§2) e no
  `CONTRIBUTING.md` (§6); predicado rodável de referência em
  [`docs/examples/cross-model-review.ts`](docs/examples/cross-model-review.ts) — roteia uma **rodada
  real** (descritor por CLI/stdin, **fail-closed**, com self-check + vitest): concordância + verde
  (classe ≤ T2) ⇒ `human_merge`; divergência/autorrevisão/**T3** ⇒ `escalate_human`; **T4** (proibida)
  ⇒ `blocked` (não roteável). ADR-0008/0010 são **referenciados, não reescritos** (append-only). #91
  projetada no ledger. (#91)
- **Refinamentos da fast-lane (#89 — follow-up da T5.1):** fecha os itens deferidos da Harness Review
  do #88 (Codex #5/#7/#9/#B/#T/#U/#V), sem novo ADR (opera dentro do [ADR-0017](docs/decisions/0017-fast-lane-baixo-risco.md)):
  **(a)** o predicado [`fast-lane-eligibility.ts`](docs/examples/fast-lane-eligibility.ts) passa a
  aceitar um **descritor por CLI/stdin** (evidência cobre a ação real do PR), **valida todos os campos
  boolean** (fail-closed contra callers `any`) e é **auto-verificável** (self-check com exit ≠ 0 +
  **vitest** `fast-lane-eligibility.test.ts`, 16 casos); **(b)** o **diagrama Mermaid** do `README`
  ganha a **rota fast-lane** (aresta tracejada que reencontra o Build; merge humano preservado);
  **(c)** `AGENTS.md` §11.2 especifica a **transição de saída mid-build** (parar + reintroduzir
  Issue/ADR, sem auto-aprovar código pós-fato); **(d)** os **checklists de review**
  (`agent`/`harness-reviewer-checklist`) ganham a variante **issue-less** (descrição do PR como
  substituto da Issue); **(e)** o **sinal `lane`** Data-First é operacionalizado — par `(classe, lane)`
  no **PR template** + métrica em [`docs/observability.md`](docs/observability.md) (adoção, retrabalho,
  ciclo; zero `fast` em T2+/governança). #89 projetada no ledger. (#89)
- **Fast-lane para ações T1 de baixo risco (#87 / T5.1 — abre o épico O5):** faz a **classe de
  confiança** (§11) **rotear a cerimônia de especificação** — ações **estritamente T1** que **não**
  cruzam G1/G2, **não** tocam governança/dado sensível, cabem em **3–4 arquivos** e são **reversíveis**
  passam a **dispensar a Issue SDD de 10 campos e o ADR**, abrindo direto um **PR leve** (descrição de
  1–3 linhas + critério de aceite + classe declarada). **Nada afrouxado onde o risco mora:** branch →
  PR → **4 checks de CI verdes** → **merge humano (T3/G3)**, tool-guard e Conventional Commits
  permanecem; elegibilidade é **conjuntiva** e a **escalação** derruba para o **fluxo SDD completo** em
  qualquer falha (default `full`; `touchesGovernance ⇒ full`). Decisão em
  **[ADR-0017](docs/decisions/0017-fast-lane-baixo-risco.md)** (`aceito` no G2); operacionalizada em
  **`AGENTS.md` §11.2** (+ ponteiro no §3) **sem** alterar as definições T0–T4 nem os gates G0–G3.
  A exceção da via foi **carimbada nos invariantes categóricos** (§1 Princípio 2, fase _Build_ do §2,
  autonomia do §3, convenção de Git do §6 e cadeia de auditoria do §10) para nenhum ficar órfão — na
  fast-lane o **PR leve** é o work item aprovado (correlação **issue-less** `branch → commit → PR →
  merge`, branch `fast/<slug>`); e a **governança é definida por função** (§2/ADR-0008), não por lista
  fechada. A **aprovação humana** não some — a via dispensa o *pré-gate* de especificação e a **realoca
  ao merge** (T3/G3). A convenção **issue-less** foi propagada aos docs-espelho operacionais
  (`foundations.md` §1.5, `CONTRIBUTING.md`, PR template, `observability.md`, runbook de Projects); a
  formalização dos itens issue-less dos **checklists de review** fica rastreada no follow-up **#89**.
  Fronteira de classe explícita: a via é **estritamente T1** (T0 puro completa sem PR — é automático;
  T2+ exige review, com ADR só quando cruza G2) e **T4 é `blocked`** (recusar/escalar, não `full`) —
  tratada no predicado.
  Predicado de referência rodável em
  [`docs/examples/fast-lane-eligibility.ts`](docs/examples/fast-lane-eligibility.ts)
  (`node --experimental-strip-types` decide `fast|full|blocked`). Docs de fluxo reconciliados
  (`CONTRIBUTING.md`, `docs/getting-started.md`, `CLAUDE.md`, `docs/architecture/foundations.md`).
  T5.1 projetada no `feature-ledger.json` (política [ADR-0016](docs/decisions/0016-politica-projecao-ledger.md)).
  (#87)
- **Hygiene do ledger: política de projeção + backfill as-accepted (#73):** registra o **escopo de
  projeção** da convenção semeia-e-cresce em **[ADR-0016](docs/decisions/0016-politica-projecao-ledger.md)**
  (`aceito` no G2) — projeta-se **toda `type:task` pós-ADR-0006 não-duplicada**; **pré-ledger**
  (#15/#18/#21/#23/#26, sem ledger à época) e **duplicatas** (#30/#46) ficam **fora** — com detalhe
  operacional no [`CONTRIBUTING.md`](CONTRIBUTING.md) §Ledger e nota de cabeçalho append-only no
  [ADR-0006](docs/decisions/0006-ledger-executavel-de-tarefas.md). Aplica o **backfill** das `type:task`
  que deixaram de se auto-projetar por drift — **#45, #62, #67, #74 e o próprio #73** — em semântica
  **as-accepted** ([ADR-0014](docs/decisions/0014-semantica-ledger-as-accepted.md)): **20 entradas**
  `passes:false`, delta **aditivo** (37→57), `ledger-guard` verde. **#74** entrou além da lista original
  (mergeou após o snapshot de 2026-07-12 sem se auto-projetar — prova viva do drift). Duas correções
  **as-accepted** de rascunho×entrega antes de projetar (achados do Codex no PR #81): **#74** (critério
  condicional "Se a abordagem (a)/(b)" → via `.git/COMMIT_EDITMSG`, `fd5747f`) e **#62** (alvo **ausente**
  → **T0 por padrão**, não fail-closed; fail-closed só sob `strictReadTarget` ou alvo vazio), com racional
  em cada Issue. Anti-drift: linha de DoD no `PULL_REQUEST_TEMPLATE` cobrando a auto-projeção. (#73)
- **Allowlist de execução de exemplos de `docs/examples/` no `tool-guard` (#71):** a `SHELL_ALLOW`
  passa a liberar a **execução de exemplos-evidência versionados** do `docs/examples/` — `node
  --experimental-strip-types docs/examples/<x>.ts` e `bash`/`./` `docs/examples/<x>.sh` (ex.:
  `observability-cost-log.ts`, `e2e-init-check.sh`) — resolvendo a incoerência em que um agente
  obediente não conseguia rodar os próprios exemplos citados como comando de evidência do §8.1/ADR-0009.
  **Bounded/fail-safe preservado:** reusa o **anti-traversal** `(?!\S*\.\.)`, restringe a `.ts`/`.sh`
  sob `docs/examples/`, sem `-e`/`--eval`, sem alvo/pacote arbitrário; `SHELL_FORBID`/`SHELL_MUTATING`
  continuam **antes** da allowlist. Traversal (`docs/examples/../../tmp/evil.ts`) e alvo fora do conjunto
  → **default-deny (T2)**. **+2 testes vitest** (liberação T1 + negação) e o check comportamental do
  [`scripts/smoke-test.sh`](scripts/smoke-test.sh) verdes. Decisão de segurança (a allowlist cresce por
  review, ADR-0011) registrada em [ADR-0015](docs/decisions/0015-allowlist-docs-examples.md)
  (**aceito** no G2) + nota de cabeçalho (append-only) no
  [ADR-0011](docs/decisions/0011-hook-sandbox-allowlist-referencia.md). **Args flags-only** (achado
  Codex P2): os exemplos aceitam só `-x`/`--flag`/`--flag=val` — um alvo posicional após o script
  (`… x.ts docs/other/y.ts`) cai no default-deny, honrando o "sem alvo arbitrário" do ADR-0015; a forma
  `tools/`|`scripts/` mantém args livres. #71 projetada no
  [`feature-ledger.json`](feature-ledger.json) (3 critérios, `passes:false`, `ledger-guard` verde). (#71)
- **Semântica do Feature Ledger: *as-accepted* (#67):** decide **o que o ledger codifica** quando o
  corpo de uma Issue diverge dos artefatos — adota-se **as-accepted**: o ledger é projeção **histórica
  por Issue**, fiel ao que a Issue **entregou/foi aceita**, **não** reconciliada ao estado atual (isso
  violaria o append-only do [ADR-0006](docs/decisions/0006-ledger-executavel-de-tarefas.md) e conflaria
  Issues distintas). Regra da divergência: corpo ≠ **própria entrega** (rascunho, comprovável no git) →
  **corrigir o corpo** e projetar; entrega alterada por **Issue posterior** → mantém o original (não
  persegue evolução). **Aplicação à #43:** os termos `"pipeline em 3 camadas"` e `"mudança de L0"` do
  corpo eram **rascunho que nunca bateu com a entrega** (o `harness-reviewer-checklist.md` nasceu no PR
  do #43 — commit `1a669f2` — já com **"3 representações"**; `"mudança de L0"` nunca esteve no
  `AGENTS.md`); o corpo foi corrigido para a redação entregue (`artefato de governança/instrução`,
  `pipeline em 3 representações`), com racional e evidência num comentário na #43, e a **#43 foi
  projetada** no [`feature-ledger.json`](feature-ledger.json) (5 critérios, `passes:false`,
  `ledger-guard` verde). Nota de cabeçalho (append-only) no ADR-0006 + anotação da convenção no
  [`CONTRIBUTING.md`](CONTRIBUTING.md). Decisão em
  [ADR-0014](docs/decisions/0014-semantica-ledger-as-accepted.md) (**aceito** no G2). (#67)
- **Validação de alvo de leitura no `tool-guard` (#62):** fecha o **limite conhecido** do ADR-0011
  (read tools eram T0 **pelo nome**, sem olhar o alvo). A guarda passa a inspecionar o **alvo** de uma
  read tool (`Read`/`Grep`/`Glob`/`LS`/`NotebookRead`) quando o runtime o fornece (`ToolCall.path`,
  **opt-in**, campo genérico): alvo **sensível** — mesma denylist `SENSITIVE_READ_TARGETS` do lado
  Bash (credenciais de sistema `/etc/(passwd|shadow)`, `.env`/`.envrc`, `~/.ssh` e `~/.aws` incl.
  diretório/glob, chaves privadas, `.pem`/`.key`, `.npmrc`, `/proc/*/environ`; normalizado por
  traversal, `\`→`/` e minúsculas) — → **block (T4)**; alvo presente **vazio/não-validável** →
  **fail-closed**; caminho comum (`src/x.ts`) → **T0**. **Sem alvo → T0 legado** (retrocompatível, sem
  regressão) ou **fail-closed** quando o projeto liga o modo estrito **`strictReadTarget`** (opt-in).
  Coerência restaurada entre o lado Bash e o lado read tool (`AGENTS.md` §10/§11, *fail secure*). A
  `reason` de bloqueio identifica o padrão negado, não o valor lido (sem PII/segredo no sinal, §10).
  **29 testes vitest** (endurecida por 8 achados do Codex; limites residuais — glob que trunca nome,
  separadores atípicos de `.env` — documentados no ADR) + check comportamental no
  [`scripts/smoke-test.sh`](scripts/smoke-test.sh) (Read de `.env` bloqueado; Read comum liberado) — a
  e2e do §8.1/ADR-0009 para a biblioteca interna.
  Decisão em [ADR-0013](docs/decisions/0013-validacao-alvo-leitura-tool-guard.md) (**aceito** no G2),
  que **estende** (não supersede) o ADR-0011 (emenda de cabeçalho anexada).
  *Fora de escopo (residual):* a allowlist de `docs/examples/` para execução de exemplos segue como
  follow-up. (#62)
- **Observabilidade de custo/tokens por execução (T4.3/O4):** convenção base do sinal de **custo/
  tokens por execução de agente** em [`docs/observability.md`](docs/observability.md) — objeto `cost`
  no log estruturado (`cost.model`, `cost.tokens_input`, `cost.tokens_output`, `cost.tokens_total`,
  `cost.usd`), evento **`agent.execution.cost`** emitido **por execução** e correlacionado por
  `correlation_id` (`Issue → branch → commit → PR`), **sem PII/segredos** (§10). Os contadores de
  token são **fato**; **`cost.usd` é ESTIMADO** (preço de tabela × tokens) — explicitado para ninguém
  tratá-lo como valor faturado. `event`/nomes de campo em **EN**; texto livre (`message`) sob
  **política única** (idioma de documentação do repo). **Preset opt-in por stack** — operacionaliza o
  `AGENTS.md` §9/§9.1 **sem alterar** sua política (sem ADR/G2 por design; libs/CLIs podem dispensar,
  serviços/pipelines de agente tipicamente ativam). Linha na tabela **Data-First** + item no
  **checklist mínimo por funcionalidade**. Exemplo mínimo rodável
  [`docs/examples/observability-cost-log.ts`](docs/examples/observability-cost-log.ts)
  (`node --experimental-strip-types` emite a linha `agent.execution.cost`;
  `estimateUsd(12000, 3400, 0.003, 0.015) = 0.087`) — é a evidência do §8.1 (docs, **sem superfície de
  usuário** → e2e formal dispensada, ADR-0009). Projeção do #53 no ledger **inicialmente diferida**
  (bug de truncamento do gerador #45, exceção "gerador com bug" do `CONTRIBUTING.md`; ledger
  append-only) e **concluída depois** via #65, com o gerador já corrigido (ver entrada em _Corrigido_).
  **Fecha o épico O4.** (#53)
- **Hook de guarda pre-tool-use de referência (`tool-guard`) (T4.2/O4):** materializa o **action
  system** e o **modelo de confiança T0–T4** (`AGENTS.md` §10/§11) num módulo único opt-in
  ([`tools/guard/tool-guard.ts`](tools/guard/tool-guard.ts)). Postura **fail-safe (default-deny)**:
  nega por padrão; só libera ferramentas de leitura (T0) e comandos que **casam a allowlist explícita**
  (T0/T1). Entrada **não-parseável/malformada → block**; **proibidos** (T4, ex.: `rm -rf /`,
  baixa-e-executa, force-push, `/etc/passwd`) e **leitura de segredos** (`.env`, `~/.ssh/id_rsa`,
  `.pem`/`.key`, `.npmrc`, `~/.aws/` — exemplos públicos como `.env.example` seguem liberados)
  precedem a allowlist; **comandos compostos/encadeados** (`&&`, `;`, `|`, `$(…)`, `>`) são bloqueados
  (a allowlist casa o comando inteiro, não só o prefixo); **validadores** de comandos sensíveis
  bloqueiam ações **T3** (`git push` para `main`, `npm publish`) — a guarda **recusa**, não decide.
  Cobertura **vitest** que espelha o `test_security.py` do benchmark + **check comportamental** no
  [`scripts/smoke-test.sh`](scripts/smoke-test.sh) (bloqueia proibido/fora da allowlist/composto,
  libera comando seguro) — é a e2e do §8.1/ADR-0009 para uma **biblioteca interna** (sem
  CLI/UI). Preset de referência: **não** acoplado a runtime de agente específico (fica por projeto).
  Decisão em [ADR-0011](docs/decisions/0011-hook-sandbox-allowlist-referencia.md) (**aceito** no G2).
  Validação de alvo/args robusta (glob, canonicalização, read-only×mutante por script) roteada ao
  follow-up **#62**. Ledger projeta a #52 (5 critérios, `passes:false`). (#52)
- **Convenção de re-review do revisor automatizado (Codex):** vira **padrão do projeto** solicitar
  um novo review (`@codex review`) **após aplicar o fix** de achados do Codex (o Codex só reavalia
  quando acionado por comentário, não no push). Documentada no
  [`CONTRIBUTING.md`](CONTRIBUTING.md) §6 (fluxo de Review) e com check correspondente nos **dois**
  reviewer-checklists — Product ([`agent-reviewer-checklist.md`](docs/agent-reviewer-checklist.md) §7)
  e Harness ([`harness-reviewer-checklist.md`](docs/harness-reviewer-checklist.md) §10). Não dispensa
  o review humano (G3). Decisão em
  [ADR-0010](docs/decisions/0010-re-review-automatizado-apos-fix.md) (**aceito** no G2). (#55)
- **Convenção de verificação end-to-end com ferramenta real (T4.1/O4):** materializa o
  `AGENTS.md` §8.1 ("verde ≠ correto") com um instrumento **opt-in por tipo/risco**, dirigido por
  agente — UI → automação de browser/MCP; API/CLI → **exercício do contrato público** (não unidade).
  Amarrada ao [`docs/agent-reviewer-checklist.md`](docs/agent-reviewer-checklist.md) (§2, condicional
  "quando aplicável"), ao `AGENTS.md` §8.1 e ao **DoD §12** (evidência anexada ao PR ou dispensa
  justificada). Restrita a T0/T1, sem PII/segredos na evidência (§10/§11). Caso de exemplo rodável
  [`docs/examples/e2e-init-check.sh`](docs/examples/e2e-init-check.sh) exercita o contrato público
  (CLI) do `init.sh` real (dry-run exit 0 sem efeitos; argumento inválido exit 2). Decisão em
  [ADR-0009](docs/decisions/0009-verificacao-e2e-ferramenta-real.md) (**aceito** no G2 via merge do
  #54; status reconciliado na #57). Ledger projeta a #51 (4 critérios, `passes:false`).
  **Abre o épico O4.** (#51)
- **Ritual de início de sessão (get-bearings + regressão) (T2.4):** documentado em
  [`docs/getting-started.md`](docs/getting-started.md) §7 como contraparte de **início** da Regra de
  compactação (`AGENTS.md` §4). Antes de implementar, cada sessão: `pwd`/`git status` → lê `STATE.md`
  → varre `PLAN.md`/`feature-ledger.json`/`git log` → `./init.sh --check` → roda **1–2 checks core de
  regressão** (`typecheck`/`test` ou `smoke-test.sh`) — operacionaliza o §8.1 como ritmo (linha de
  base verde **antes** da mudança). É **só leitura + dry-run + testes** (T0/T1): não muta o repo nem
  contorna gate. Check correspondente nos **dois** checklists de review — Product
  ([`agent-reviewer-checklist.md`](docs/agent-reviewer-checklist.md)) e Harness
  ([`harness-reviewer-checklist.md`](docs/harness-reviewer-checklist.md) §9) — apontando o §7
  canônico, para ser enforceável nos dois caminhos de review (ADR-0008). Ledger projeta a #33.
  **Fecha o épico O2.** (#33)
- **Template `init.sh` + convenção (T2.3):** stub versionado na raiz do bootstrap de ambiente
  executável (papel Initializer, [ADR-0007](docs/decisions/0007-papel-initializer.md)). Fixado na
  **stack padrão Node/TypeScript** ([ADR-0005](docs/decisions/0005-stack-padrao-node-typescript.md);
  outras stacks = templates futuros): sobe o ambiente (`npm ci`, espelhando a trilha node do
  `.github/workflows/ci.yml`) e roda um **smoke do produto** (placeholder que cada projeto preenche).
  Contrato: `./init.sh --check` é um **dry-run sem efeitos** (exit 0), sem flag executa o bootstrap,
  argumento inválido sai com 2.
  Orquestração em bash (ADR-0005). A convenção — dois smokes **distintos**: `init.sh` (produto) vs.
  `scripts/smoke-test.sh` (autovalidação do harness) — está documentada em
  [`docs/getting-started.md`](docs/getting-started.md). Ledger projeta a #32. (#32)
- **Separação Harness Review vs Product Review (T3.0/O3):** a fase _Review_ (`AGENTS.md` §2) bifurca em
  **dois processos**, selecionados pelo tipo de artefato do PR — **Harness Review** (mudanças de governança/instruções:
  constituição/ADRs/pipeline/gates; valida as **instruções** simulando um agente obediente; novo
  [`docs/harness-reviewer-checklist.md`](docs/harness-reviewer-checklist.md)) e **Product Review**
  (código/testes/config; [`docs/agent-reviewer-checklist.md`](docs/agent-reviewer-checklist.md)).
  PR que toca ambos passa pelas duas, cada uma escopada à sua parte; revisor **independente do
  autor** obrigatório nos dois. Lição empírica do PR #36. Decisão em
  [ADR-0008](docs/decisions/0008-separacao-revisao-harness-vs-produto.md). (#43)
- **Papel Initializer no pipeline (T2.2):** o pipeline de fases (`AGENTS.md` §2) passa a
  `prime → initialize → plan → spec → build → review → ship`. O **`initialize`** é um bootstrap
  **opcional/one-time e gateado** do **ambiente executável** (distinto do Prime, que prepara
  contexto): via **Issue de bootstrap de primeira classe** (G1 pré-Plan, sem depender de Plan→Spec)
  **propõe** `init.sh` (T2.3), notas de progresso e o commit inicial, pelo fluxo Git normal
  (branch → PR → merge humano). O **`feature-ledger.json` inicial NÃO faz parte do bootstrap** —
  é gerado pós-Spec (semeia-e-cresce, ADR-0006). Decisão em
  [ADR-0007](docs/decisions/0007-papel-initializer.md); enumeração do pipeline alinhada em `README`,
  `docs/getting-started.md` e `docs/runbooks/github-projects.md`; ADR-0001 (item 2) anotado como
  estendido (append-only). (#31)
- **Feature Ledger executável (T2.1):** projeção em JSON das Issues SDD (L2 continua soberana),
  com tooling em TypeScript em `tools/ledger/` — `ledger-guard.ts` (gate append-only: `passes` só
  `false→true`; reprova remoção/edição de campo imutável e regressão), `ledger-from-issues.ts`
  (gerador idempotente, IDs `F-<issue>-<hash6>`) e `feature-ledger.schema.json`. Guard plugado no
  `scripts/smoke-test.sh` (job smoke-test) com base `origin/main` × head do PR; coberto por vitest.
  `feature-ledger.json` inicial projeta a #29. Decisão em
  [ADR-0006](docs/decisions/0006-ledger-executavel-de-tarefas.md). (#29)
- **Stack Node/TS + esqueleto do projeto (T2.0):** stack padrão definida em
  [ADR-0005](docs/decisions/0005-stack-padrao-node-typescript.md) (Node LTS 22, ESM, TypeScript
  strict, npm, Vitest, ESLint flat + Prettier; Zod/pino/Fastify/tsup opt-in). Esqueleto na raiz
  (`package.json`, `tsconfig.json` estendendo o preset, `vitest.config.ts`, `.nvmrc`,
  `eslint.config.mjs`, `.prettierrc.json`) + `package-lock.json`; `lint`/`typecheck`/`test` verdes.
  A trilha node do CI passa a rodar `npm run typecheck --if-present`. `.orion/` (scratch) excluído
  do lint/typecheck. Fundação da O2 (pré-requisito do ledger, T2.1). (#26)

### Corrigido

- **Check de commitlint determinístico no smoke-test (#74):** o exercício do hook real no
  [`scripts/smoke-test.sh`](scripts/smoke-test.sh) passava a mensagem por `--commit-msg-filename`, mas o
  hook `alessandrojcm/commitlint-pre-commit-hook` valida o `.git/COMMIT_EDITMSG` (mensagem do **último
  commit real**), ignorando o arquivo — validava o último commit, dando **falso vermelho local × verde
  no CI** (checkout novo não tem `COMMIT_EDITMSG`). Agora a mensagem é alimentada pelo próprio
  `COMMIT_EDITMSG` (que o hook lê), com **backup/restore**, e o check valida os dois lados (**rejeita**
  inválida / **aceita** válida) — determinístico local e no CI. A regra em bash (espelho) segue como
  antes. Fix shell, sem ADR. Follow-up: **#75** (remover python do `smoke-test.sh`, alinhando ao
  ADR-0005/0012). (#74)
- **Reprojeção do #53 no ledger (pós-fix #45):** com o gerador corrigido (#45, PR #64), a projeção
  antes **diferida** de [#53](https://github.com/isaiane/OrionHarness/issues/53) foi gravada no
  `feature-ledger.json` com os critérios **completos** (sem truncamento multi-linha), `passes:false` —
  cumprindo a exceção "gerador com bug" do [`CONTRIBUTING.md`](CONTRIBUTING.md) (adiar em vez de gravar
  entrada corrompida num ledger append-only). A **#43** ficou **fora do escopo**: sua projeção codifica
  texto desatualizado vs. os artefatos atuais (achado do Codex na revisão) — roteada para a
  [#67](https://github.com/isaiane/OrionHarness/issues/67) (decisão de semântica do ledger). `STATE.md`
  deixa de listar o #45 como aberto e a nota de projeção diferida foi encerrada. (#65)
- **Ledger (`extractAcceptance` truncava critérios multi-linha):** o parser de
  [`tools/ledger/ledger-from-issues.ts`](tools/ledger/ledger-from-issues.ts) capturava **apenas a
  primeira linha física** de cada bullet de "Critérios de aceite"; critérios que quebravam em várias
  linhas eram **truncados** (visível na projeção da #43/#53, ex.: `F-0043-*` terminando em "…de"). Como
  `description`/`acceptance` são imutáveis (append-only, `ledger-guard.ts`), um critério truncado que
  chegasse à `main` ficaria **permanentemente corrompido**. Agora as **linhas de continuação** de um
  mesmo bullet são juntadas (até o próximo bullet/heading/linha em branco) e os espaços normalizados —
  cobre bullet simples, checkbox, numerado e continuação com parêntese. IDs de critérios de **uma
  linha** permanecem estáveis (sem regressão de hash). Regressão coberta por **vitest**. (#45)
- **smoke-test (link-checker estático):** passa a podar `node_modules/`, `.orion/`, `dist/`,
  `coverage/` e `.pytest_cache/` ao varrer links de `.md` — antes acusava links quebrados dentro de
  dependências após `npm install`. (#29)
- **Runbook de branch protection (comando `gh api`):** o comando documentado usava `-F` com chaves
  pontilhadas (e `restrictions=`), que o `gh api` envia como chaves planas/string vazia → a API
  respondia **422** sem aplicar os checks (achado do review do PR #20). Substituído pela versão com
  `--input` e JSON aninhado (`restrictions: null`), verificada contra a API real. (#21)
- **CI bloqueante (trilha Python):** removidos os mascaramentos `|| true` / `|| echo` em `ruff` e
  `pytest`; lint e teste agora **reprovam** o build. O exit 5 do pytest ("nenhum teste coletado") é
  tolerado para o template novo; qualquer outra falha bloqueia o merge (`AGENTS.md` §1.5/§8). (#15)

### Alterado

- **Consolidação da stack em Node/TypeScript (#49):** cumpre a Consequência do
  [ADR-0005](docs/decisions/0005-stack-padrao-node-typescript.md) ("CI/presets/meta-tooling numa só
  linguagem"), eliminando a ambiguidade poliglota que ainda restava nos artefatos pré-existentes.
  Decisão em [ADR-0012](docs/decisions/0012-consolidacao-stack-node-ts.md) (opção A da #49).
  - **`.github/workflows/ci.yml`:** removidos o passo "Detectar stack" e os ramos de **projeto**
    Python/Go do job `lint-test-build` (agora só Node/TS). Os **4 jobs** que produzem os checks
    obrigatórios (`lint-test-build`, `secret-scan`, `smoke-test`, `pre-commit`) e o **tooling Python
    do `pre-commit`/`smoke-test`** (o pre-commit é ferramenta Python) foram **preservados** — o gate
    G3 não muda.
  - **`README.md`:** a afirmação *"Universal e poliglota"* deixa de ser capacidade **atual**; o
    suporte a outras linguagens vira **roadmap/templates futuros**.
  - **`presets/`:** mantém apenas `typescript/`; `python/` e `mobile/` removidos (templates
    futuros/externos), coerente com o `init.sh` já Node/TS (#32).
  - **Docs:** `docs/getting-started.md` e `docs/testing-strategy.md` alinhados à leitura única (esta
    ajusta uma referência ao preset Python removido). **Fora de escopo:** o comentário de labels
    `stack:*` em `.github/labels.yml` (candidato a follow-up).
- **Reconciliação do `§7` à postura lean/flat (T1.3):** o `AGENTS.md §7` deixa de prescrever Clean
  Architecture/Hexagonal como default obrigatório — **Clean Arch/Hexagonal e event-driven viram
  opt-in** com justificativa (Issue/ADR); default = encapsulamento simples. Introduz a **regra das
  3 responsabilidades** (≤3 arquivos) e o **guardrail dos 3–4 arquivos**; mantém SOLID/API-First/
  TDD/12-Factor/KISS/YAGNI/DRY e o DDD estratégico. Coerência propagada por todo o repo:
  `AGENTS.md` §9.1/§11, `foundations.md` §2.1/§2.2/§2.6, `CLAUDE.md`, `README.md`,
  `docs/observability.md`, `docs/testing-strategy.md` e `agent-reviewer-checklist.md`; o ADR-0001
  (itens 13/15) recebe anotação de supersessão (append-only). Decisão em
  [ADR-0004](docs/decisions/0004-reconciliacao-s7-lean-flat.md). (#23)

### Adicionado

- **Enforcement do gate G3 por perfil (T1.2):** [ADR-0003](docs/decisions/0003-enforcement-g3-por-perfil.md)
  registra a política de proteção de `main` por perfil — base comum (PR obrigatório, push direto
  bloqueado, 4 checks obrigatórios `lint-test-build`/`secret-scan`/`smoke-test`/`pre-commit`,
  histórico linear e resolução de conversas) e o gate humano via merge no Solo (T3) ou
  `approvals ≥ 1` + `CODEOWNERS` no Time. `docs/runbooks/branch-protection.md` ganha o comando
  `gh api` equivalente. A branch protection da `main` foi aplicada (4 checks + histórico linear +
  resolução de conversas), encerrando o épico **O1**. (#18)
- **Sincronização automática de labels:** workflow `labels` (`.github/workflows/labels.yml`) aplica
  `.github/labels.yml` ao repositório (push à `main` que altere o arquivo + `workflow_dispatch`),
  com `skip-delete: true` e `issues: write` de menor privilégio. Decisão registrada em
  [ADR-0002](docs/decisions/0002-sincronizacao-automatica-de-labels.md). (#11)
- **Badge de status do CI no `README`:** badge do workflow `ci.yml` no topo do `README`, linkando
  para a aba Actions, expondo a saúde da `main` (Data-First, `AGENTS.md` §9.1). (#9)
- **Fase 1 — Fundação & constituição:** estrutura base do repositório; `AGENTS.md` (constituição)
  com 7 princípios inegociáveis, pipeline de fases (`prime → plan → spec → build → review → ship`),
  gates G0–G3, camadas de memória L0–L5, padrão de Issue SDD, fundamentos de engenharia, guardrail
  de verificação de correção e Data-First; `CLAUDE.md`; `README.md`; `LICENSE` (MIT); `CODEOWNERS`;
  `.editorconfig`; `.gitignore`.
- **Fundações arquiteturais:** `docs/architecture/foundations.md` (Security by Design, modelo de
  confiança T0–T4, padrões AI-First) e `docs/architecture/ui-agent-harness.md` (UI governada por
  Design System).
- **Fase 2 — Contexto, memória & Issues SDD:** templates `docs/product/product-context.md`,
  `docs/product/spec.md` (com bloco Data-First) e `docs/product/discovery-guide.md`; artefatos de
  memória `PLAN.md`, `STATE.md`, `MEMORY.md`, `CHANGELOG.md`; template de ADR e ADR-0001 (decisões
  fundadoras).
- **Fase 3 — Git, governança & CI/CD:** `CONTRIBUTING.md`; template de Issue SDD
  (`.github/ISSUE_TEMPLATE/sdd-task.yml`) + `config.yml`; `PULL_REQUEST_TEMPLATE.md`; convenção de
  labels (`.github/labels.yml`); runbooks de proteção de `main` e GitHub Projects; workflow de CI
  poliglota (lint/test/build) + scan de segredos (gitleaks); `dependabot.yml`; workflow de release
  opcional.
- **Fase 4 — Convenções, presets, qualidade & testes:** `commitlint.config.js` e
  `.pre-commit-config.yaml` (higiene, editorconfig, gitleaks, Conventional Commits); presets por
  stack em `presets/` (TypeScript, Python, orientações Mobile); `docs/testing-strategy.md`
  (TDD, pirâmide, regressão, cobertura configurável); `docs/agent-reviewer-checklist.md`.
- **Fase 5 — Observabilidade, segurança, docs & reuso:** `docs/observability.md` (logging
  estruturado, decision logs, eventos, Data-First, tracing opt-in); `SECURITY.md`, `.env.example` e
  `docs/runbooks/secrets.md`; índice `docs/README.md` e guia de reuso `docs/getting-started.md`.

### Corrigido

- **CI:** job `secret-scan` passa a rodar o binário do `gitleaks` (`gitleaks detect`), removendo a
  dependência de `GITLEAKS_LICENSE` e o erro de intervalo no commit raiz.
- **`.gitignore`:** padrão `secrets.*` (amplo demais) ignorava silenciosamente
  `docs/runbooks/secrets.md`; substituído por padrões específicos e o runbook foi versionado.
- **`scripts/smoke-test.sh`:** fixtures de segredo fragmentados em runtime para não dispararem o
  scanner no próprio script; `.gitleaksignore` cobre os fingerprints históricos (falsos positivos).
- **`.editorconfig`:** removido `max_line_length` global (limite enforçado pelos formatters por
  stack) e relaxada a indentação para Markdown e shell, resolvendo ~114 apontamentos do
  editorconfig-checker em prosa/heredoc.

### Adicionado (autovalidação)

- `scripts/smoke-test.sh` — autovalidação do harness (estática + comportamental: Conventional
  Commits e secret scan "mordem") e job `smoke-test` no CI que o executa a cada push.
- Job `pre-commit` no CI: roda os hooks de arquivo (`pre-commit run --all-files`, com cache) e
  valida Conventional Commits sobre o range do PR (commitlint). Hook `trailing-whitespace` alinhado
  ao `.editorconfig` (preserva quebras de linha em Markdown).

---

_Ao clonar para um novo projeto, limpe este histórico e comece a registrar as mudanças do produto._
