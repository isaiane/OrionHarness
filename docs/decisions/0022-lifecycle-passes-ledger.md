# ADR-0022 — Lifecycle de conclusão do Feature Ledger (validação aplicável + owner/gatilho da flip `passes:true`)

> **Numeração:** `0022` = próximo livre em `docs/decisions/` (a `main` tem `0001–0021`). Confirme com
> `git ls-files docs/decisions/` antes de commitar; se algum 002x novo tiver mergeado, renumere em ordem
> de adoção.

- **Status:** aceito
- **Data:** 2026-07-28 (aceito; proposto em 2026-07-27)
- **Decisores:** Isa (owner) — aprovação humana (gate G2), concedida no merge do PR #113
- **Relacionado a:** [ADR-0006](0006-ledger-executavel-de-tarefas.md) (ledger semeia-e-cresce; append-only),
  [ADR-0016](0016-politica-projecao-ledger.md) (política de **projeção** — quais entram, `passes:false`),
  [ADR-0009](0009-verificacao-e2e-ferramenta-real.md) (e2e opt-in por tipo/risco),
  [ADR-0014](0014-semantica-ledger-as-accepted.md) (as-accepted); `AGENTS.md` §8.1, §11 (T0–T4), §12 (DoD);
  `CONTRIBUTING.md` §Ledger; `docs/agent-reviewer-checklist.md`; `docs/getting-started.md` §7 (get-bearings);
  Issue **#85**; origem: achado do Codex no PR #81 (#73), diferido como limitação conhecida do ADR-0016.

## Contexto
O [ADR-0016](0016-politica-projecao-ledger.md) fixou a **projeção** (toda `type:task` no escopo nasce
`passes:false`, per-PR) mas **deixou explícito** que não tratava da **conclusão** (`passes:true`), diferindo-a
para o **#85**. Na prática o mecanismo de conclusão **não existia**:

1. **Gerador hardcodava e2e:** `tools/ledger/ledger-from-issues.ts` gravava
   `steps: ["Validar end-to-end conforme o Plano de validação da Issue #N"]` em **toda** entrada, e o
   `feature-ledger.schema.json` afirmava que `passes` só vira `true` "com evidência e2e" — **mesmo** para
   tarefas **sem superfície observável** (docs/governança/estado), contrariando o **opt-in por tipo/risco**
   do [ADR-0009](0009-verificacao-e2e-ferramenta-real.md).
2. **`steps` é imutável** pós-merge (`ledger-guard.ts`, campo em `IMMUTABLE`) — não dá para realinhar depois.
3. **Flip sem owner/gatilho:** o `ledger-guard` rejeita item **novo** já `true` (deve nascer `false`), então a
   transição `false→true` só cabe num **PR posterior** ao que criou a entrada — mas **nenhum artefato definia
   quem** faz e **quando**. Resultado: **todas** as entradas `false` (57 quando o #85 foi aberto; **~105** à
   data deste ADR), indistinguíveis de pendentes, e a promessa
   de "não fica `false` pra sempre" sem sustentação.

## Decisão
Definimos o **lifecycle de conclusão** de uma entrada do ledger, sem violar o append-only (ADR-0006):

**(a) `steps` = plano de validação _aplicável_, sempre condicional (e2e opt-in ao ADR-0009).** O gerador
deriva do sinal de superfície que já infere (`inferCategory`) uma **dica de técnica por categoria**, mas
**sempre subordinada** ao opt-in do ADR-0009 — **nunca** uma exigência **incondicional** de e2e:
- `style` (UI) → "…**quando** entregar superfície de UI observável **de risco relevante**, via automação de
  browser (ADR-0009 §1)";
- `contract` (API/CLI) → "…**quando** entregar superfície de API/CLI observável **de risco relevante**,
  exercendo o contrato público (ADR-0009 §2–3)";
- `functional` (catch-all, **sem** superfície declarada) → step **neutro** ("e2e **só se** entregar superfície
  observável **de risco relevante**").

As **duas** condições do ADR-0009 (superfície observável **E** risco relevante) entram no condicional — o step
não exige e2e só por haver superfície.

**Por que condicional em _todo_ caso, e não `categoria ⇒ e2e` (Codex P2 no PR #113):** `inferCategory` só lê o
**texto do critério**, sem sinal real de **tipo-de-artefato/risco** — um critério de docs com "API" cairia em
`contract` e um CLI descrito como "comando retorna exit 2" cairia em `functional`. Como `steps` é **imutável**
pós-merge, uma afirmação **incondicional** de e2e petrificaria a classificação errada. Mantendo a técnica como
**dica condicional**, a **decisão de aplicabilidade é do revisor humano** ("na dúvida, suba de nível" — ADR-0009):
o `steps` é **documentação** do plano, **não** enforcement. O schema deixa de afirmar e2e **universal**. Assim,
uma tarefa **sem e2e não carrega exigência de e2e** — o critério de aceite central do #85.

**(b) Owner e gatilho da flip `false→true` (follow-up, _não_ gate da própria entrega).** A entrada **nasce
`false`** no PR da tarefa (o `ledger-guard` proíbe **nascer `true`**), então a flip é **estruturalmente** um PR
**posterior** ao que criou a entrada — logo **não pode** ser condição de conclusão da própria entrega (seria
circular: a entrega nunca fecharia o DoD). Definimos:
- **DoD da entrega (§12):** projetar a entrada (`false`) com o plano aplicável **e anexar a evidência** quando a
  e2e se aplica (ou justificar a dispensa, ADR-0009). **Sem** exigir a flip.
- **Owner da flip:** a **sessão/PR de follow-up** que, no **get-bearings**, pega a entrada `false` cuja evidência
  aplicável **já existe** (produzida na entrega) e a **flipa** `false→true` — o `ledger-guard` **permite** a
  transição de item **existente**.
- **Gatilho:** a entrada aparecer `passes:false` na **view no escopo** do get-bearings (`ledger-origin.ts
  --scoped`, §7) **com a evidência disponível** — é o mecanismo que garante que `false` é **transitório**, não
  permanente ("não fica `false` pra sempre"). **Reforço no review:** ambos os checklists (Product **e Harness**,
  pois tarefas de governança roteiam por Harness) verificam que entradas entregues são flipadas assim que
  existem em `main`. Como o ritual ainda **não distingue** na tooling "entregue-aguardando-flip" de
  "pendente-não-entregue", o agente **decide pela Issue/PR/STATE** da entrada (a distinção automatizada é
  **follow-up**, ver Consequências).

**(c) Via de processo da flip (terminante, sem regresso).** A flip `false→true` é **irreversível** (o
`ledger-guard` rejeita `true→false`), então **não** é elegível à **fast-lane** (que exige ação T1 reversível,
§11.2); e cair no **full-SDD** geraria uma **nova** `type:task` cuja própria projeção criaria **outra** entrada
`false` — regresso infinito. Resolvemos definindo a flip como **transição de manutenção escopada, ancorada na
Issue original** (reuso da Issue que gerou a entrada), **não** um novo `type:task`: **não projeta entrada nova**
(sem regresso), dispensa **novo G1/G2**. **Classe de confiança:** a **edição** `false→true` na branch é uma
**proposta T2** — o **agente pode** fazê-la (validação + review), pois **não** é a mutação irreversível de
`main`; o que é **irreversível** é o **merge**, então o **merge é T3/G3** (humano), como qualquer `main`. Assim a
via **respeita o T0–T4** (§11): **nada** automatiza um T3 — o agente **propõe** a flip, o humano **mergeia**. É
análoga ao bootstrap do ledger-origin (passo de manutenção, **não** tarefa — ADR-0021): cabe no PR de follow-up
que já toca a área, ou num PR de manutenção dedicado que referencia a Issue original.

**(d) Legado pré-ADR-0022 — exclusão explícita (não é flip-debt).** O corte é **as entradas já presentes no
ledger do _parent_ deste PR** (as ~105 pré-#85) — **não** "antes do merge do ADR", senão as **3 entradas do
próprio #85** (projetadas neste mesmo PR, mas **sob o regime** do ADR-0022) se auto-excluiriam, contradizendo o
`STATE.md`, que as espera flipadas depois. Essas ~105 (`passes:false` com `steps` legados que ainda citam
"end-to-end") ficam
**fora** da obrigação de flip — uma **exclusão enumerável e permanente**, **análoga** à "pré-ledger" (ADR-0016)
e à "pré-origem-local" (ADR-0021): não são dívida, **não** inundam a obrigação "não fica `false` pra sempre",
que passa a valer **só** para entradas projetadas **sob o regime do ADR-0022** (deste PR em diante). Marcar esse
corte na **tooling** (esconder/rotular o legado no `--scoped`) é **follow-up** (ver Consequências); por ora é
**política** — o agente trata `false` legado como fora de escopo de flip.

**(e) Append-only preservado.** Só a transição de item **existente** `false→true` (o `ledger-guard` já a
permite); **nada** reescreve `steps`/`description`/`acceptance`. As entradas históricas ficam intactas (seus
`steps` antigos continuam válidos no schema — só descrições mudaram); esta decisão vale **dali pra frente**
(fora de escopo: reprojetar histórico).

## Alternativas consideradas
- **Gerador decide a aplicabilidade da e2e para `functional` (default = exigir, "suba de nível"):** rejeitada.
  Faria **toda** entrada carregar e2e — nenhuma tarefa ficaria "sem e2e", falhando o critério do #85 e
  inflando docs/governança/estado com cerimônia (contra ADR-0009/0004). O "suba de nível" é responsabilidade
  do **revisor** (onde o contexto está), não de um classificador por palavra-chave. O gerador documenta o
  **default aplicável**; o humano levanta o nível quando o caso pede.
- **`categoria ⇒ e2e` incondicional (técnica afirmada p/ `style`/`contract`):** rejeitada (Codex P2, PR #113).
  Como `inferCategory` não tem sinal de tipo-de-artefato/risco e `steps` é imutável, afirmar a técnica
  petrificaria classificações erradas (docs com "API"→e2e; CLI→neutro). Adotado o meio-termo: técnica como
  **dica condicional** em **todo** caso ("quando/só se"), com a aplicabilidade decidida no **review**.
- **Marcador explícito de e2e na Issue (label/campo `no-e2e`):** rejeitada por proporcionalidade — adiciona
  burocracia por Issue; a **categoria** (agora como **dica condicional**) já orienta sem petrificar a decisão.
- **Flip como gate do DoD da própria entrega:** rejeitada (Codex P1, PR #113) — **circular**: a entrada nasce
  `false` (guard) e a flip é um PR posterior, então a entrega **nunca** fecharia o próprio DoD e a projeção
  ficaria travada. A flip é **follow-up** rastreado pelo get-bearings; o DoD exige só **projeção + evidência**.
- **Tornar `steps` mutável para realinhar pós-merge:** rejeitada — quebra a tamper-evidence do append-only
  (ADR-0006). O realinhamento vale **para novas entradas**; as históricas permanecem as-accepted (ADR-0014).
- **Helper `--flip <id>` no gerador:** diferido (YAGNI) — a flip é uma edição `false→true` trivial, **validada
  pelo `ledger-guard`**; um comando dedicado pode virar follow-up se o volume justificar.

## Consequências
- **Positivas:** o `passes:true` passa a ter **caminho definido** (owner + gatilho + reforço no review/
  get-bearings) **sem circularidade** (a flip é follow-up, não gate da entrega); entradas sem superfície não
  carregam e2e espúria; o ledger deixa de ser "tudo pendente".
- **Negativas / risco:** a flip depende de um **PR posterior** ao da entrada (consequência do "nasce `false`"
  do guard) — mitigado pela **view de get-bearings** que **resgata** entradas entregues-mas-não-flipadas e pelo
  check nos **dois** checklists. A **dica** de técnica por categoria pode não bater com o tipo real — por isso é
  **condicional** e a decisão fica no **review** (ADR-0009), não petrificada no `steps` imutável.
- **Limitação conhecida (tooling do lifecycle, follow-up rastreado):** a **política** desta decisão (distinguir
  "entregue-aguardando-flip" de "pendente"; excluir o legado pré-ADR-0022 da obrigação de flip) está definida,
  mas a **tooling** ainda não a reflete — o `ledger-origin.ts --scoped` rotula **todo** `false` como "pendente"
  e mostra o legado. Enquanto o follow-up não fecha isso, o agente aplica a política **por julgamento** (Issue/
  PR/STATE), guiado por (a)/(c)/(d) e pelos checklists. **Follow-up rastreado (#114):** ensinar o `--scoped` a
  (i) marcar/filtrar o legado pré-ADR-0022 e (ii) sinalizar candidatos a flip (entrega com evidência em
  `main`), fechando o gap entre política e ferramenta.
  - **RESOLVIDO (#114):** o `ledger-origin.ts --scoped` passa a **classificar** cada entrada em **aguardando
    flip** (sob-regime & `false` & já em `main`) / **pendente** (sob-regime & `false` recém-projetada nesta
    branch, ainda **não** em `main` → **não** flipar) / **concluída** / **legado**, e **oculta o legado por
    padrão** (`--all` lista). A distinção aguardando-flip×pendente usa a baseline `origin/main` (resolvida
    pelo CLI, git read-only; indisponível → vazio conservador = tudo pendente). Via o marcador
    [`.orion/ledger-lifecycle.json`](../../.orion/ledger-lifecycle.json) que **enumera** o legado pré-ADR-0022
    (o corte é por **enumeração** — número de issue não serve, pois #87–#108 são pré-ADR-0022 apesar de >
    #85) + `sha256` de tamper-evidence (padrão do `inheritedEntryIds`, ADR-0021). O ritual (§7) e o smoke
    passam a refletir a distinção.
  - **RESOLVIDO (#116):** o **guard base×head do marcador de lifecycle** existe — `ledger-origin.ts
    --guard-lifecycle <base> <head>` (`diffLifecycle`/`readBaseLifecycle`, espelhando o `diffOrigin`)
    **congela o corte**: permite só a introdução e mudança de `note`, e **rejeita** mover/reclassificar/
    re-fingerprintar `legacyEntryIds`/`legacySha256`/`adoptedOn`/`regimeAdr` e **remover** o marcador
    estabelecido; **fail-closed** em base inválida. Roda no `smoke-test`/CI (base = `origin/main`), fechando
    o bypass do re-fingerprint auto-consistente que o `--scoped` de head-state não pega. A tamper-evidence
    deixa de depender só do fingerprint de estado + review.
- **Segurança/confiança:** classe **T2** (toca gerador/schema — código, com review). Merge é **T3/G3**. Esta é
  também **mudança de harness/governança** → **Harness Review** antes do merge. A **edição** da flip (escrever
  `false→true` na branch) é uma **proposta T2** — o agente **pode** fazê-la (validação + review); o **merge** é
  **T3/G3** (humano), como qualquer `main`. Nada aqui automatiza um T3 (§c).

## Conformidade
Verificável (§8.1): (1) o gerador emite `steps` **sempre condicionais** (técnica como dica por categoria,
subordinada ao ADR-0009; `functional` neutro) — coberto por vitest em `tools/ledger/ledger.test.ts`; (2) o
schema e o `ledger-guard` seguem **coerentes** (a flip `false→true` de item existente passa; nascer `true`
falha); (3) `CONTRIBUTING.md` §Ledger, `AGENTS.md` §12 e **ambos** os checklists (`agent-reviewer-checklist`
+ `harness-reviewer-checklist`) descrevem a **projeção (DoD)** e o **owner/gatilho da flip (follow-up via
get-bearings)**; (4) o ADR-0016 aponta esta decisão como **RESOLVIDO** para a limitação `#85`.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho do antigo. -->
