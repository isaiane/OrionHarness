# ADR-0016 — Política de projeção do Feature Ledger (escopo, exclusões e backfill)

> **Numeração:** `0016` = próximo livre em `docs/decisions/` na `main` (a `main` tem `0001–0015`).
> Confirme com `git ls-files docs/decisions/` antes de commitar; se algum 001x novo tiver mergeado,
> renumere em ordem de adoção.

- **Status:** proposto  <!-- humano aprova (G2) → muda para: aceito -->
- **Data:** 2026-07-20
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** [ADR-0006](0006-ledger-executavel-de-tarefas.md) (ledger semeia-e-cresce),
  [ADR-0014](0014-semantica-ledger-as-accepted.md) (semântica as-accepted); `AGENTS.md` §3 (G2), §4
  (memória/camadas), §11 (T0–T4); `CONTRIBUTING.md` §Ledger; Issue **#73**; origem: achado do Codex no
  PR #72 (#67), consolidado no PR #81 (#73).

## Contexto
O [ADR-0006](0006-ledger-executavel-de-tarefas.md) adota o ledger **semeia-e-cresce** e o
[ADR-0014](0014-semantica-ledger-as-accepted.md) fixa a semântica **as-accepted** (projeção histórica
por Issue, fiel à entrega). O que **nenhum** dos dois define de forma auditável é **quais Issues entram**
no ledger — o *escopo* de projeção. Na prática houve **drift**: várias `type:task` mergeadas nunca se
auto-projetaram (#45, #62, #67, #74), e outras **nunca deveriam** entrar (pré-ledger; duplicatas). Sem
uma regra **exaustiva** e com **status de decisão** (G2), cada backfill vira julgamento solto e o ledger
oscila entre incompleto e contaminado. É uma **escolha de processo** (§3) — daí o registro em ADR.

## Decisão
**Escopo de projeção — regra exaustiva sobre toda `type:task`:**

1. **Entra:** toda `type:task` **não-duplicada no escopo do ledger**, projetada **no próprio PR da
   tarefa** (pré-merge, **nasce `passes:false`**), uma entrada por critério de aceite, semântica
   **as-accepted** ([ADR-0014](0014-semantica-ledger-as-accepted.md)). _(A **flip `passes:true`** —
   com a validação aplicável, e2e só quando o [ADR-0009](0009-verificacao-e2e-ferramenta-real.md) exigir
   — e seu **owner/gatilho** dependem do lifecycle do ledger, hoje incompleto: **limitação conhecida**,
   ver Consequências e o follow-up **#85**.)_ **Escopo do ledger** = tarefas a partir de
   **quando o ledger passou a existir no repositório** (neste repo: o ADR-0006, marco #29). O corte é
   **por marco local**, não por número de Issue. _(Portabilidade para **repos derivados** do template —
   reset/bootstrap do ledger sem violar o append-only — é **limitação conhecida**; ver Consequências e o
   follow-up **#82**.)_
2. **Fica fora (não é dívida):**
   - **Pré-ledger:** `type:task` fechadas **antes de o ledger existir no repositório** — não havia
     ledger para projetá-las; **sem backfill retroativo** (neste repo: #15/#18/#21/#23/#26).
   - **Duplicatas** sem entrega própria (neste repo: #30 dup de #29, #46 dup de #45).
3. **Caminho normal = per-PR:** ao abrir o PR de uma tarefa no escopo, projeta-se a **própria Issue** e
   committa-se o delta (`CONTRIBUTING.md` §Ledger). **Reforço anti-drift:** o DoD do
   `PULL_REQUEST_TEMPLATE` inclui a caixa "Issue `type:task` projetada no ledger" — o **N/A** dessa caixa
   vale **só** para Issue **fora do escopo** (não-`type:task`, ou as exclusões acima) **ou** para o
   caminho de **follow-up rastreado** quando o gerador não puder projetar (exceção do CONTRIBUTING); não
   é um opt-out livre para tarefa no escopo.
4. **Backfill = exceção de reconciliação:** só para `type:task` no escopo que **deixaram de projetar** por
   drift; roda pelo mesmo `tools/ledger/ledger-from-issues.ts`, delta **aditivo**, `ledger-guard` verde.
   Correção **as-accepted** do corpo (rascunho×entrega) **antes** de projetar, com racional na Issue.

## Alternativas consideradas
- **Nota operacional sem ADR (só CONTRIBUTING + header no ADR-0006):** rejeitada. É escolha de **processo**
  com exclusões **permanentes** e mandato por-PR; o §3 pede ADR com status/racional/G2 auditáveis. Uma
  nota não carrega `proposto→aceito`. (Foi a 1ª tentativa no #81; o Codex apontou o gap de G2.)
- **Backfillar tudo (incl. pré-ledger e duplicatas):** rejeitada. Contamina o ledger com tarefas
  pré-ferramenta e entradas duplicadas; viola a fidelidade as-accepted.
- **Reconciliação as-current (reprojetar ao estado atual):** rejeitada — contraria o append-only do
  ADR-0006 e a semântica as-accepted do ADR-0014.

## Consequências
- **Positivas:** regra **exaustiva** (todo `type:task` tem balde) e **auditável** (G2); backfill vira
  operação previsível; o reforço no DoD previne o próximo drift na origem (per-PR).
- **Negativas / risco:** backfill as-accepted de Issue antiga pode exigir **correção de corpo**
  (rascunho×entrega) — mitigado pelo mesmo cuidado do #43/#67 (divergência comprovável, racional na
  Issue). Descrições do ledger são **imutáveis pós-merge**; por isso a correção vem **antes** do `--write`.
- **Limitação conhecida (portabilidade, follow-up #82):** um repo criado via "Use this template" **herda**
  o `feature-ledger.json` do Orion no 1º commit, e o append-only (ADR-0006) proíbe limpá-lo — então o
  "marco local" só vale rigorosamente **neste** repo até o reset/bootstrap do ledger para derivados ser
  definido (**#82**).
- **Caveat de tooling (follow-up #83):** o modo `--from-gh` do `tools/ledger/ledger-from-issues.ts`
  projeta **todas** as `type:task` **abertas** (sem predicado per-PR/G1) — **não** usar fora de um
  bootstrap controlado; alinhamento/deprecação à projeção per-PR é o **#83**.
- **Limitação conhecida (lifecycle de `passes:true`, follow-up #85):** hoje **todas** as entradas nascem
  e permanecem `passes:false` — o gerador **hardcoda** o step "Validar end-to-end" e o schema exige e2e
  (mesmo p/ tarefas sem superfície e2e), `steps` é imutável pós-merge, e **nenhum artefato define o
  owner/gatilho** da flip `false→true`. Enquanto o **#85** não fecha isso, esta decisão trata só de
  **projeção/backfill** (quais entram, `passes:false`), **não** da conclusão (`passes:true`).
- **Segurança/confiança:** classe **T2** (memória/estado com review). Merge é **T3/G3**.

## Conformidade
Verificável (§8.1): ADR aceito (G2); `CONTRIBUTING.md` §Ledger e a nota de cabeçalho do ADR-0006 apontam
para esta política; o `feature-ledger.json` cobre as `type:task` do escopo **já com PR** (nem pré-ledger,
nem duplicatas) — tarefas do escopo ainda **abertas/sem PR** (ex.: **#75**) projetam no **próprio PR** e
**não** são lacuna —, delta aditivo com `ledger-guard` verde; a caixa de projeção no
`PULL_REQUEST_TEMPLATE` existe. Aplicação inicial: backfill de #45/#62/#67/#74 + auto-projeção do próprio
#73 no PR #81.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho do antigo. -->
