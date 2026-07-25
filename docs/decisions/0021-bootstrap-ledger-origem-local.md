# ADR-0021 — Bootstrap do ledger para repos derivados: marcador de origem local (sem apagar)

> **Numeração:** `0021` = próximo livre em `docs/decisions/` na `main` (a `main` tem `0001–0020`).
> Confirme com `git ls-files docs/decisions/` antes de commitar; se algum 002x novo tiver mergeado,
> renumere em ordem de adoção.
>
> **Supersede a exploração do PR #102** (fechado, unmerged — guard *bootstrap-aware* na branch
> `feat/82-ledger-bootstrap`) e **fecha a limitação de portabilidade** registrada no
> [ADR-0016](0016-politica-projecao-ledger.md) (era o #82). Origem: **Issue #103**.

- **Status:** proposto  <!-- humano aprova (G2) → muda para: aceito -->
- **Data:** 2026-07-24
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** Issue **#103** (supersede **#82** e a exploração do PR **#102**);
  [ADR-0006](0006-ledger-executavel-de-tarefas.md) (ledger append-only) e
  [ADR-0016](0016-politica-projecao-ledger.md) (política de projeção) — **estende** (referencia, não
  reescreve); `tools/ledger/ledger-origin.ts`, `tools/ledger/ledger-origin.schema.json`,
  `.orion/ledger-origin.json`; `scripts/smoke-test.sh`; `docs/getting-started.md` §2;
  `AGENTS.md` §4 (memória/camadas), §11 (T0–T4).

## Contexto
Um repo criado via **"Use this template"** herda o `feature-ledger.json` do Orion no 1º commit (entradas
de exemplo, IDs do Orion). Ele precisa estabelecer um ledger de **origem local** — mas o **append-only**
([ADR-0006](0006-ledger-executavel-de-tarefas.md)) proíbe remover as entradas herdadas, e o `ledger-guard`
(local, no `smoke-test.sh`, e no CI) vê **qualquer** remoção como violação.

A exploração do PR #102 tentou tornar o guard **bootstrap-aware** (permitir a transição *base não-vazia →
head `[]`*). A Harness Review (Codex) mostrou que isso **não é fail-secure** (#407): **qualquer** wipe para
`[]`, em **qualquer** repo — inclusive o Orion, com entradas acumuladas — e **repetível** a qualquer
momento, passaria no guard, contornando toda a checagem de remoção. E **colide com a projeção per-PR/DoD**
(#417): se o reset fosse uma `type:task`, o [ADR-0016](0016-politica-projecao-ledger.md) exigiria projetá-la
no mesmo PR (head não-vazio), quebrando o predicado do carve-out. Raiz do problema: **o ledger herdado é
byte-a-byte idêntico ao ledger do próprio Orion** — nada no *conteúdo* distingue "repo derivado que deveria
bootstrapar" de "Orion" ou de "repo estabelecido sendo apagado". Um carve-out de remoção no guard é, ele
mesmo, superfície de ataque.

## Decisão
**Não apagar.** As entradas herdadas **permanecem** no `feature-ledger.json` do repo derivado — o
append-only fica **100% íntegro** e o **`ledger-guard` permanece intocado e fail-secure por construção**
(nenhuma remoção é permitida, em nenhum repo). Em vez de um reset, o bootstrap grava **uma vez** um
**marcador de origem** versionado, `.orion/ledger-origin.json`:

1. **Marcador de origem** (`tools/ledger/ledger-origin.schema.json`):
   - **`origin: "orion"`** no repositório Orion (origem/template) — o marco local é o **ADR-0006/#29**.
   - **`origin: "local"`** no repo derivado — grava `bootstrappedOn` (data), `seedSha256` (fingerprint da
     semente herdada) e `inheritedEntryIds` (a lista **exata** de ids herdados).
2. **Sinal verificável (#407).** O `seedSha256` + `inheritedEntryIds` é o sinal **auditável** de
   procedência: o `ledger-origin.ts --check` confirma, a qualquer momento, que as entradas herdadas
   continuam presentes e que seu fingerprint **bate** com o registrado (**tamper-evident**). Não é
   "qualquer não-vazio→vazio" — e **não há remoção** para acidente/malícia explorarem.
3. **Escopo de projeção (#417).** As entradas herdadas viram **"pré-origem-local"** — uma **exclusão
   explícita e enumerada** (`inheritedEntryIds`), análoga à exclusão **"pré-ledger"** do
   [ADR-0016](0016-politica-projecao-ledger.md): fora do escopo, **não são dívida**, **nunca** são
   projetadas/flipadas. Não existe "bootstrap-task" competindo com a projeção — o bootstrap é um passo
   **humano** (getting-started §2, precede o G0), não um `type:task` do agente. A **1ª tarefa local**
   projeta **per-PR** normalmente, por cima desse marco.
4. **Visibilidade (#415).** O `scripts/smoke-test.sh` (a) **deixa de suprimir** a saída do `ledger-guard`
   (ecoa a linha PASS/FAIL do próprio guard) e (b) roda o `ledger-origin.ts --check`, **reportando** o
   estado de origem (origem, herdadas fora de escopo, locais no escopo) no smoke e no CI.
5. **Ritual de bootstrap (getting-started §2).** O mantenedor roda
   `node --experimental-strip-types tools/ledger/ledger-origin.ts --init --write` (gera o marcador de
   origem local a partir do ledger herdado) e committa — pela via normal (branch → PR).

## Alternativas consideradas
- **Guard *bootstrap-aware* (transição `base≠[] → []`, 1ª tentativa do PR #102):** rejeitada — **não é
  fail-secure** (#407: qualquer wipe, em qualquer repo, repetível, passa) e colide com a projeção per-PR
  (#417). Adiciona um carve-out de remoção — superfície de ataque — ao guard.
- **Reset por commit direto na `main` pré-proteção:** rejeitada — a constituição (`AGENTS.md`) prevalece e
  não abre exceção; rulesets de **organização** exigem PR desde o início; e o guard local vê o reset como
  remoção (achados do PR #102).
- **Não versionar o ledger (gitignore) / reset no `init.sh`:** rejeitadas já na nota do ADR-0016 — o Orion
  **precisa** do ledger versionado (o guard compara contra `origin/main`); o `init.sh` é bootstrap de
  **ambiente** (roda no ciclo do agente, inclusive no Orion), não um reset por-derivado.
- **Apagar as entradas herdadas com um carve-out verificável (fingerprint da semente):** rejeitada — mesmo
  verificável, mantém um caminho de remoção no guard; e o fail-secure para o **próprio Orion** passa a
  depender de um argumento sutil (o fingerprint "envelhece" conforme o ledger do Orion cresce). **Não
  apagar** domina: fail-secure **por construção**, sem carve-out.

## Consequências
- **Positivas:** o `ledger-guard` fica **intocado** — append-only íntegro e fail-secure **por construção**
  (nada a atacar). Sinal de origem **verificável** e **tamper-evident** (#407). Exclusão **enumerada** e
  compatível com a projeção per-PR/DoD (#417). Estado de origem **visível** no smoke/CI (#415). Uma rota
  **única e sem exceção** na constituição (bootstrap humano + PR normal), válida sob rulesets de org.
- **Negativas / limite:** as entradas de exemplo do Orion **permanecem fisicamente** no ledger do derivado
  (inertes, `passes:false`, fora de escopo). É um custo **estético**, não de correção — e explicitamente
  autorizado pela #82 ("origem local **vazio ou marcado**"). Se um mantenedor quiser removê-las de fato,
  isso exige um **novo ADR** que supersede este (não é o caminho previsto).
- **Escopo:** trata **só** do bootstrap. A conclusão (`passes:true`) segue como limitação conhecida do
  lifecycle ([ADR-0016](0016-politica-projecao-ledger.md), follow-up **#85**).
- **Segurança/confiança:** classe **T2** (memória/estado + governança do ledger). Merge é **T3/G3**.

## Conformidade
Verificável (§8.1): ADR aceito (G2); `ledger-origin.ts`/schema cobertos por vitest; `.orion/ledger-origin.json`
(`origin: "orion"`) valida contra o schema e passa no `--check`; `scripts/smoke-test.sh` ecoa a saída do
`ledger-guard` e reporta o estado de origem (smoke local/CI verde); `docs/getting-started.md` §2 descreve o
ritual `--init`; a **nota forward** append-only no [ADR-0006](0006-ledger-executavel-de-tarefas.md) aponta
para este ADR (#424); a nota no [ADR-0016](0016-politica-projecao-ledger.md) formaliza a exclusão
**"pré-origem-local"** (#417). Este PR projeta a própria **#103** no ledger (`passes:false`).

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho deste. -->
