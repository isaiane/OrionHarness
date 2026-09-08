# ADR-0033 — Flip automatizado em lote + GitHub Projects como fluxo derivado

> Architecture Decision Record (`AGENTS.md` §3, gate G2). ADRs são **append-only**: uma decisão revista
> não é apagada — cria-se um novo ADR que a substitui.
>
> **Ao criar um ADR — ou mudar seu número/título/status/nome (inclusive flipar para `aceito` no G2) —,
> regenere o índice** e commite o `README.md`:
> `node --experimental-strip-types tools/adr/adr-index.ts --write` ([ADR-0023](0023-indice-gerado-de-adrs.md)).

> **Numeração:** `0033` = próximo livre em `docs/decisions/` na `main` (sequência `0001–0032` contígua ao
> criar; confirme com `tools/adr/adr-sequence.ts --check` antes do commit — se um `003x` novo mergear antes,
> renumere em ordem de adoção). **ADR não commitado pode ser renumerado; commitado, nunca.**

- **Status:** proposto  <!-- humano aprova (G2) → muda para: aceito -->
- **Data:** 2026-09-08
- **Decisores:** Isa (owner) — aprovação humana (gate **G2**)
- **Relacionado a:** épico **O10** ([#15](https://github.com/isaiane/OrionHarness/milestone/15)), Issue **#206** (T10.1);
  **supersede parcialmente** [ADR-0022](0022-lifecycle-passes-ledger.md) (owner+gatilho da flip, item b);
  consome [ADR-0030](0030-pipeline-spec-tests-implementation.md) (pipeline — conjunto de colunas do board);
  reafirma [ADR-0006](0006-ledger-executavel-de-tarefas.md) (ledger append-only, born-false),
  [ADR-0026](0026-plano-milestone-com-descricao-sem-project-drafts.md) (fonte de status = Issue/Milestone; Project = visão derivada)
  e [ADR-0003](0003-enforcement-g3-por-perfil.md) (enforcement G3 por perfil — Solo); `AGENTS.md` §3 (gates), §11 (T0–T4), §11.2 (rastreabilidade issue-less).

## Contexto

O [ADR-0022](0022-lifecycle-passes-ledger.md) (item b) resolveu uma circularidade real: o `ledger-guard`
proíbe uma entrada **nascer `true`**, então ela nasce `false` no PR da entrega e a flip `false→true` é um
**PR posterior** (não é condição de conclusão da entrega). O desenho está correto; o **custo** é que a
**autoria** da flip ficou manual e recorrente — uma fatia relevante dos commits da `main` são `chore(ledger)`,
escritos à mão, um por tarefa concluída.

Dois vazios operacionais decorrem disso:

1. **Autoria da flip é trabalho humano/agente recorrente e mecânico.** A **elegibilidade** já é derivável e
   testada (`tools/ledger/ledger-origin.ts --scoped` classifica "aguardando flip"); falta só **quem escreve** o
   PR e **quando**.
2. **O fluxo de execução não é observável.** `STATE.md` dá o ponteiro, o Milestone dá o mapa, a Issue dá o
   status do item — mas não há representação de **em que etapa** cada tarefa está, nem registro de **quando**
   mudou de etapa (lacuna Data-First, `AGENTS.md` §9.1).

A dependência a montante — [ADR-0030](0030-pipeline-spec-tests-implementation.md), que declara o conjunto de
colunas do board — está **aceita e mergeada**. Este ADR **decide o desenho**; **não implementa nada** (Action,
workflow, App, board e labels são as fatias **T10.2–T10.4**).

## Decisão

**1. A flip continua sendo PR, mas passa a ser escrita por automação, em lote, por agenda.**
A transição `passes:false→true` continua sendo um **PR** revisado, disparado pelo **merge da entrega** e
agrupando as entradas elegíveis (`ledger-origin --scoped` = "aguardando flip") num **lote**. O que muda em
relação ao ADR-0022 (b) é **apenas o owner e o gatilho**: de autoria humana/agente ad hoc para **automação
agendada**. A automação **abre o PR de flip** com o diff `false→true` das entradas já entregues em `main`.

**2. A regra born-false permanece intacta.**
O `ledger-guard` **continua proibindo** uma entrada nascer `true`; a flip continua sendo **PR posterior** ao
da entrega — **nunca** dentro do PR da entrega. Nenhum trecho deste ADR pode ser lido como permissão para
flipar dentro da entrega ou relaxar o guard. A automação apenas **assume a autoria** de um PR que já era
sancionado; não altera o invariante.

**3. Supersedência parcial e cirúrgica do ADR-0022 (b).**
Este ADR supersede **apenas o owner e o gatilho** da flip do ADR-0022 (item b); **todo o restante** do
ADR-0022 (validação aplicável, `steps` imutável, born-false, a flip como PR posterior) é **preservado**. A
supersedência é registrada por **nota de cabeçalho** (append-only) no ADR-0022 — **sem editar** a decisão
histórica.

**4. GitHub Projects é projeção derivada de evento, nunca fonte.**
O Project passa a representar o **fluxo de execução** como **projeção derivada de eventos** do GitHub (Issue
aberta, branch criada, PR aberto, PR mergeado) — **não** um campo autoral que alguém preenche à mão. A **fonte
da verdade** de status continua sendo a **Issue SDD** ([ADR-0006](0006-ledger-executavel-de-tarefas.md)) e a
**verificação**, o `feature-ledger.json`. Isto **reafirma** o [ADR-0026](0026-plano-milestone-com-descricao-sem-project-drafts.md)
(Project = visão derivada, não fonte).

**5. Nada toca G3/T3. Auto-merge é rejeitado.**
A automação **abre PR; nunca integra.** O merge segue **humano (T3/G3)**, com CI verde. O **auto-merge é
explicitamente rejeitado** (ver Alternativas, D): mover a integração para a máquina fura o gate humano que é a
espinha do modelo de confiança.

**6. As seis colunas do board, fixadas e literais.**
`Backlog → Ready → In progress → In review → Blocked → Done` — **seis**, em **sentence case**. `Blocked` é
alimentada pelos labels `blocked`/`needs-human-approval`. A grafia e o conjunto são **normativos** aqui (as
fatias seguintes não os renegociam).

**7. Identidade da automação: GitHub App com permissões mínimas, sem merge.**
A automação atua sob um **GitHub App** com identidade própria e **permissões mínimas** — conteúdo, pull
requests e Projects — e **sem** permissão de merge. **Instalar o App e guardar credenciais é ato humano**;
este ADR decide apenas o desenho.

**8. Rota do PR de flip: rastreabilidade issue-less, sem virar fast-lane.**
O PR de flip usa a forma **issue-less** de rastreabilidade (`AGENTS.md` §11.2: `branch → commit → PR →
merge`), por não corresponder a uma Issue SDD. Mas **não** é fast-lane: mantém os **4 checks de CI**, a
**revisão** e o **merge humano** — governança por função, não redução de cerimônia.

**9. Cadência é parâmetro operacional, não texto normativo.**
A agenda do lote (diária/semanal/outra) é **config** e **não** integra o texto normativo deste ADR — pode
mudar sem novo ADR.

## Alternativas consideradas

- **(A) Manter a flip 100% manual.** É o estado atual; preserva o gate mas mantém o custo recorrente de
  `chore(ledger)` à mão. Rejeitada: a elegibilidade já é derivável — a autoria mecânica não agrega decisão
  humana.
- **(B) Flipar dentro do PR da entrega.** Elimina o PR posterior, mas **quebra a regra born-false** e a
  tamper-evidence do ledger. Rejeitada: contraria o ADR-0022/0006.
- **(C) Project como fonte de status (campo autoral).** Um board onde se arrasta cartões viraria segunda fonte
  divergente da Issue/ledger. Rejeitada: contraria o ADR-0026; projeção derivada de evento é idempotente e não
  diverge.
- **(D) Auto-merge da automação.** Fecharia o ciclo sem humano. **Rejeitada explicitamente**: fura G3/T3 — a
  automação **propõe** (abre PR), nunca integra.

## Consequências

**Positivas.**
- `chore(ledger)` escritos à mão por mês → tende a **zero** (fato contável no `git log`); nº de **PRs de flip**
  por mês → cai com o lote.
- O fluxo de execução passa a ter **registro de transição por etapa** (via Project derivado) — sinal
  Data-First que **hoje não existe**.
- O invariante born-false e o gate humano de merge ficam **inalterados**.

**Negativas / riscos + mitigação.**
- *Reabrir owner/gatilho de um ADR aceito (0022).* → supersedência **parcial e explícita** por nota
  append-only, preservando a regra born-false e o restante do ADR.
- *Board diverge da realidade.* → Project = projeção **derivada de evento**, com transições idempotentes
  (fatias seguintes); nunca autoral.
- *Automação furando gate.* → o ADR fixa: automação **abre PR, nunca integra**; nenhuma fatia altera
  G1/G2/G3; App **sem** permissão de merge.

**Impacto em segurança/confiança/observabilidade.**
- **Perfil Solo (limitação declarada, não suavizada — [ADR-0003](0003-enforcement-g3-por-perfil.md)):** com um
  único mantenedor, o **merge é executado com a credencial do humano** e **não há registro no GitHub** de que a
  autorização de fato ocorreu (o "humano aprova" é procedural). A automação com App próprio **não** muda isso —
  ela abre o PR; quem mergeia continua sendo o humano, com a limitação de auditoria do perfil Solo. Migrar para
  o perfil Time (`approvals ≥ 1` + `CODEOWNERS`) endereçaria a auditoria — fora do escopo deste ADR.
- **Observabilidade** melhora (transições por evento); a **confiança** não é reduzida (gate humano intacto).

## Conformidade

Como verificar, no review/CI, que a implementação (fatias T10.2–T10.4) respeita esta decisão (`AGENTS.md` §8.1):

- **Born-false intacta:** o `ledger-guard` continua rejeitando entrada nova `true`; nenhuma fatia relaxa o
  guard nem flipa dentro do PR da entrega. Simular um agente obediente seguindo a automação e confirmar que
  **nenhuma peça contorna um gate**.
- **Automação abre PR, nunca integra:** o App **não** tem permissão de merge; **não** há auto-merge; o PR de
  flip mantém os 4 checks + revisão + **merge humano**.
- **Project derivado:** as transições são **função de eventos** (issue/branch/PR aberto/mergeado), não campos
  autorais; a fonte de status continua Issue/ledger.
- **Colunas:** exatamente as seis, em sentence case, com `Blocked` por `blocked`/`needs-human-approval`.
- **Supersedência:** `git diff` do ADR-0022 mostra **apenas** a nota de cabeçalho adicionada (texto histórico
  intocado). `node --experimental-strip-types tools/adr/adr-index.ts --check` verde, **com leitura da saída**;
  **nenhum ADR commitado** renumerado (`tools/adr/adr-sequence.ts --check`).
- **Perfil Solo** declarado nesta seção de Conformidade — não suavizado.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho do antigo. -->
