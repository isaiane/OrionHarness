# ADR-0027 — Exclusão pós-regime de entradas superseded/mal-redigidas do Feature Ledger

> Architecture Decision Record (`AGENTS.md` §3, gate G2). ADRs são **append-only**: uma decisão revista
> não é apagada — cria-se um novo ADR que a substitui.
>
> **Ao criar um ADR — ou mudar seu número/título/status/nome —, regenere o índice** e commite o
> `README.md`: `node --experimental-strip-types tools/adr/adr-index.ts --write` ([ADR-0023](0023-indice-gerado-de-adrs.md)).

- **Status:** proposto  <!-- flip → aceito no G2 (aprovação humana) no merge — ver AGENTS.md §3 -->
- **Data:** 2026-08-22 (proposto)
- **Decisores:** Isa (owner) — aprovação humana (gate **G2**)
- **Relacionado a:** épico **O8** (higiene sustentável do estado); **estende** [ADR-0022](0022-lifecycle-passes-ledger.md)
  §d (exclusão do legado) com uma exclusão **distinta** para o pós-regime; [ADR-0021](0021-bootstrap-ledger-origem-local.md)
  (`inheritedEntryIds` — padrão de exclusão enumerada + `sha256`); [ADR-0006](0006-ledger-executavel-de-tarefas.md)
  (append-only). Follow-up de **#155**; origem: revisão do Codex na PR #154 (P1 — não registrar conclusão falsa)
  sobre a entrega de **#143**.

## Contexto

O [ADR-0022](0022-lifecycle-passes-ledger.md) definiu o lifecycle de conclusão do ledger: a flip
`passes:false→true` é **irreversível** (§c; o `ledger-guard` rejeita `true→false`) e o `--scoped`
classifica cada `false` sob-regime como **aguardando flip** (já em `main`) ou **pendente**. O §d excluiu o
**legado pré-ADR-0022** dessa obrigação por **enumeração** (`legacyEntryIds` + `legacySha256` em
[`.orion/ledger-lifecycle.json`](../../.orion/ledger-lifecycle.json)), com um **guard base×head** que
**congela** o corte (imutável — #116).

A entrega da **#143** projetou a entrada **`F-0143-8b069c`** com o critério *"Manifesto: `role` dos 2
arquivos deste PR **atualizado**"*. Mas o commit de entrega, corretamente, mudou só o **`note`** das
entradas do manifesto — o **`role` seguiu `pointer`** (um ponteiro repontado **continua** pointer). O
trabalho **D2 substantivo foi feito**; só a **palavra** do critério não bate. Como a flip é irreversível,
a PR #154 **não** a flipou (não registrar conclusão falsa — Codex #154 P1), deixando-a `passes:false` de
propósito.

Resultado: o `--scoped` reporta `F-0143-8b069c` como **"aguardando flip" permanentemente e falsamente** —
ela não está aguardando flip; é um critério **não-cumprível-ao-pé-da-letra**. A exclusão do **legado** não
se aplica: `8b069c` é **pós**-regime, e o guard **rejeita** mexer no corte do legado (`legacyEntryIds`
imutável). Faltava um mecanismo **formal e enumerável** para essa classe.

## Decisão

Criamos uma **segunda** categoria de exclusão da obrigação de flip, **distinta** do legado: as entradas
**pós-regime** cujo critério é **superseded/mal-redigido** e **não pode** ser honestamente flipado.

**(a) Lista enumerada `supersededEntryIds`, separada de `legacyEntryIds`.** Em
[`.orion/ledger-lifecycle.json`](../../.orion/ledger-lifecycle.json), um novo array de objetos
`{ id, reason, sha }`:
- **`id`** — a entrada do ledger excluída (pós-ADR-0022);
- **`reason`** — **motivo obrigatório** e não-vazio (a defesa central contra virar "porta dos fundos");
- **`sha`** — `lifecycleFingerprint([entry])` da entrada **específica** (campos imutáveis; exclui `passes`),
  como **tamper-evidence**: fixa o critério mal-redigido e impede a **troca silenciosa** por outra entrada.

É **distinta** do legado por construção: o legado é um **bloco congelado** com **um** `sha256` coletivo e
sem motivo por-entrada (é "antes do regime"); a superseção é **por-entrada**, **pós-regime**, com **motivo
por-entrada**. As duas listas são **disjuntas** (verificação semântica): reclassificar um legado como
superseded é sem sentido.

**(b) `--scoped` honra a lista.** `classifyLifecycle` ganha um bucket **`superseded`**: uma entrada em
`supersededEntryIds` é rotulada **"excluída — superseded"** e **não** entra em "aguardando flip"
(nem "pendente"/"concluída"). O `--scoped` lista cada uma com o **motivo** (lista curada e pequena → sempre
visível, ao contrário do legado, oculto por padrão). Precedência: **legado → superseded → passes/entregue**.

**(c) Invariantes: append-only + imutável + motivo obrigatório + elegibilidade (guard).** `diffLifecycle`
(guard base×head, #116) passa a validar `supersededEntryIds`:
- **introdução do regime**: a lista **deve** estar vazia (nada a superseder no nascimento do corte);
- **estabelecido**: **append-only** (pode **acrescentar** exclusões, nunca **remover** — remover reabriria a
  entrada como "aguardando flip") e **imutável** por-entrada (`reason`/`sha` **congelados** — não se reescreve
  o racional nem se repontam o `sha` para outra entrada). A **forma** (schema + `validateSupersededShape`)
  exige `reason` não-vazio, `sha` válido e **id único** na lista (o schema tem `uniqueItems`; a unicidade por
  `id` além de item-idêntico é invariante de runtime, pois o draft-07 não expressa "único por chave"); a
  **tamper-evidence** (`verifyLifecycle`/`--scoped`/smoke) exige que cada id **exista** no ledger e que
  `sha == lifecycleFingerprint([entry])`.
- **elegibilidade (o que PODE ser superseded)** — duas guardas que restringem o carve-out ao seu caso legítimo
  (erro de redação de critério **já entregue e imutável**), fechando o uso como porta dos fundos:
  1. **`passes:false`** — `verifySuperseded` **rejeita** superseder uma entrada já `passes:true`: o mecanismo é
     para critérios **não-flipáveis**; como `superseded` tem precedência sobre `done`, excluir uma conclusão
     tornaria o estado de auditoria contraditório.
  2. **pertencer à base (`origin/main`)** — `diffSuperseded` **rejeita** um id recém-superseded que **não** esteja
     no ledger da base (`origin/main`); **fail-closed** se o ledger da base estiver indisponível. Superseder na
     **projeção** (uma entrada nova, ainda não entregue) esconderia um critério **nunca entregue** de pendente E
     de aguardando-flip — quando ele ainda poderia ser **corrigido/removido** antes do merge. O carve-out vale só
     para o que **já está em `main`** (imutável pelo append-only).

**(d) Aplicação a `F-0143-8b069c`.** Adicionada a `supersededEntryIds` com o motivo documentado (critério
mal-redigido; D2 substantivo cumprido; flip irreversível → não flipar; ver #155). O `--scoped` deixa de
contá-la como "aguardando flip".

## Alternativas consideradas

- **Reescrever o texto do critério no ledger:** rejeitada — o ledger é **append-only** (ADR-0006; `steps`/
  `description`/`acceptance` são imutáveis no `ledger-guard`). A exclusão é o caminho honesto.
- **Flipar `F-0143-8b069c` assim mesmo** (o trabalho foi feito): rejeitada — a flip é **irreversível**
  (ADR-0022 §c) e registraria uma conclusão **literalmente falsa** ("role atualizado" não ocorreu). Codex
  #154 P1.
- **Reusar `legacyEntryIds`** (jogar `8b069c` no corte do legado): rejeitada — o corte do legado é **por
  data/regime** e **imutável** (o guard #116 rejeita crescê-lo); misturar pós-regime nele apagaria a
  distinção auditável "antes/depois do ADR-0022" e furaria o guard.
- **`sha256` coletivo (um só, como o legado):** rejeitada — quebraria o **append-only por-entrada** (cada
  nova exclusão re-fingerprintaria o conjunto, colidindo com a imutabilidade) e perderia o motivo por-entrada.
  O `sha` **por-entrada** deixa a lista crescer sem tocar as existentes.
- **Só política (sem tooling), como o §d fez no início:** rejeitada — o gap "política sem ferramenta" foi
  justamente o que #114/#116 fecharam; repeti-lo deixaria o `--scoped` mentindo "aguardando flip".

## Consequências

- **Positivas:** o `--scoped`/get-bearings deixa de reportar `F-0143-8b069c` (e futuras análogas) como
  flip-debt falsa; a exclusão é **enumerável, motivada e auditável**, com guard que morde adulteração;
  a distinção legado×superseded permanece explícita.
- **Negativas / risco:** a lista pode virar **porta dos fundos** para mascarar flip-debt **real**
  (entregue-aguardando-flip legítimo). **Mitigação:** `reason` **obrigatório** + guard **append-only/imutável**
  + as **guardas de elegibilidade** (§c: só `passes:false` e só id **já em `origin/main`**) + **revisão humana**
  — usar **só** para superseded/mal-redigido, **nunca** para "entregue-aguardando-flip" real (esse **flipa**).
  O motivo fica visível no `--scoped` para escrutínio contínuo.
- **Lição de processo (raiz):** critério de aceite deve ser **literalmente verificável pelo efeito real**
  (ex.: "manifesto atualizado / D2 satisfeito"), **não** por um campo específico que pode legitimamente
  **não** mudar (ex.: "`role` atualizado"). Ver #155 (e a memória do harness). Fora de escopo aqui: rever a
  redação de critérios em geral.
- **Segurança/confiança:** classe **T2** (edição de config/tooling de estado; sem remoção de artefato). A
  **decisão de mecanismo** é governança nova → **G2/ADR** (este). A **edição** na branch é proposta T2 (o
  agente pode); o **merge** é **T3/G3** (humano). Nada aqui automatiza um T3.

## Conformidade

Verificável (§8.1): (1) `tools/ledger/ledger-lifecycle.schema.json` declara `supersededEntryIds`
(`{id, reason, sha}`, `additionalProperties:false`, `reason`/`sha` obrigatórios, `uniqueItems`); (2)
`tools/ledger/ledger-origin.ts` — `validateSupersededShape` (forma ≡ schema, id único), `verifySuperseded`/
`verifyLifecycle` (tamper-evidence: id existe, `sha` bate, disjunta do legado, **`passes:false`**),
`classifyLifecycle` (bucket `superseded`, fora de "aguardando flip"), `diffLifecycle`/`diffSuperseded`
(append-only + imutável + vazio na introdução + **id recém-superseded ∈ base `origin/main`**, fail-closed);
os relatórios **`--scoped`, `pending-report` e `status-report`** propagam a exclusão (não a contam como
pendente/dívida); (3) `tools/ledger/ledger-origin.test.ts` + `tools/pending/pending-report.test.ts` +
`tools/status/status-report.test.ts` cobrem forma/schema, tamper-evidence, elegibilidade, o guard e a
classificação; (4) `scripts/smoke-test.sh` roda `--scoped` (mostra "excluída/superseded") e
`--guard-lifecycle` (base = `origin/main`); (5) `.orion/ledger-lifecycle.json` traz `F-0143-8b069c` com
motivo. Rodar `--scoped` antes/depois: a contagem de "aguardando flip" **exclui** `8b069c`.

## Nota de proporcionalidade (§7 — guardrail dos 3–4 arquivos)

Esta mudança ultrapassa o guardrail de 3–4 arquivos (§7). É **deliberado e escalado ao humano** (owner,
G2): (a) é uma **decisão de governança** — por natureza toca ADR + schema + config + tooling + os checklists
+ `AGENTS.md`, um *vertical slice* de governança que não fatia sem deixar estado incoerente (ex.: tooling sem
o ADR que a autoriza, ou checklist prometendo flip de uma entrada excluída); (b) os arquivos de **relatório**
(`pending-report`, `status-report`) e o segundo guard de elegibilidade entraram como **follow-ups dirigidos
pela revisão** (Codex #181), fechando consumidores-irmãos e o bypass de projeção — cada um coerente com o
núcleo. A owner acompanhou e aprovou cada rodada; o merge é **T3/G3** humano.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho do antigo. -->
