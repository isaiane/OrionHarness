# ADR-0033 — Flip automatizado em lote + GitHub Projects como fluxo derivado

> Architecture Decision Record (`AGENTS.md` §3, gate G2). ADRs são **append-only**: uma decisão revista
> não é apagada — cria-se um novo ADR que a substitui.
>
> **Ao criar um ADR — ou mudar seu número/título/status/nome (inclusive flipar para `aceito` no G2) —,
> regenere o índice** e commite o `README.md`:
> `node --experimental-strip-types tools/adr/adr-index.ts --write` ([ADR-0023](0023-indice-gerado-de-adrs.md)).

> **Numeração:** `0033` = próximo livre em `docs/decisions/` na `main` (sequência `0001–0032` contígua ao
> criar; confirme com `tools/adr/adr-sequence.ts --check` antes do commit — se um `003x` novo mergear antes,
> renumere em ordem de adoção). **ADR ainda não mergeado na `main` pode ser renumerado (mesmo já commitado
> numa branch/PR); mergeado na `main`, nunca** (ADR-0031).

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
A transição `passes:false→true` continua sendo um **PR** revisado, agrupando as entradas elegíveis num
**lote**. O que muda em relação ao ADR-0022 (b) é **apenas o owner e o gatilho**: de autoria humana/agente ad
hoc para **automação agendada**.

- **Agenda dispara; merge é fronteira de elegibilidade (não o gatilho).** A automação roda **por agenda** (o
  mecanismo de dispatch); o **merge da entrega** é o que torna uma entrada **elegível** ao próximo lote — não
  um gatilho por-merge (senão abriria um PR por entrega e mataria o lote).
- **Elegibilidade exige sinal de conclusão verificável — não basta `--scoped`.** `ledger-origin --scoped`
  marcar uma entrada como "aguardando flip" significa apenas **entregue em `main` e `false`** — **não** prova
  que o critério foi **cumprido**. Entradas de critério mal-redigido são **superseded** (ADR-0027), e uma
  projeção de ledger que entre **antes** da implementação (padrão real: projeção-só-de-ledger) apareceria
  como "aguardando flip" **sem** o trabalho pronto. Logo a automação **só** flipa entradas com um **sinal
  legível-por-máquina de conclusão/evidência** (a definir em T10.2, ancorado na Issue autoritativa — ADR-0006);
  na ausência do sinal, a entrada **permanece `false`** e vai para **julgamento humano**. A automação **nunca**
  flipa cegamente o conjunto `--scoped`.

A automação **abre o PR de flip** com o diff `false→true` **apenas** das entradas elegíveis-e-com-evidência.

**2. A regra born-false permanece intacta.**
O `ledger-guard` **continua proibindo** uma entrada nascer `true`; a flip continua sendo **PR posterior** ao
da entrega — **nunca** dentro do PR da entrega. Nenhum trecho deste ADR pode ser lido como permissão para
flipar dentro da entrega ou relaxar o guard. A automação apenas **assume a autoria** de um PR que já era
sancionado; não altera o invariante.

**3. Supersedência parcial e cirúrgica do ADR-0022 (b).**
Este ADR supersede **apenas o owner e o gatilho** da flip do ADR-0022 (item b); **todo o restante** do
ADR-0022 (validação aplicável, `steps` imutável, born-false, a flip como PR posterior) é **preservado**. A
supersedência é registrada por **nota de cabeçalho** (append-only) no ADR-0022 — **sem editar** a decisão
histórica. **Efetividade e fallback:** a troca de owner só é **efetiva quando a automação estiver no ar**
(T10.2 mergeada); no intervalo entre o aceite deste ADR (G2) e esse deploy, o **owner manual permanece o
fallback explícito** — para não deixar entradas elegíveis **órfãs**. Não há janela em que "a automação é
dona" sem automação existir.

**4. GitHub Projects é projeção derivada de evento, nunca fonte.**
O Project passa a representar o **fluxo de execução** como **projeção derivada de eventos** do GitHub — **não**
um campo autoral que alguém preenche à mão. A **fonte da verdade** de status continua sendo a **Issue SDD**
([ADR-0006](0006-ledger-executavel-de-tarefas.md)) e a **verificação**, o `feature-ledger.json`. Isto
**reafirma** o [ADR-0026](0026-plano-milestone-com-descricao-sem-project-drafts.md) (Project = visão derivada).

**Restrições mínimas da tabela de transição (o mapa completo é T10.3, mas estas são normativas):** (i) **toda**
coluna tem de ter uma origem de evento determinística — inclusive `Ready` (ex.: Issue com G1 dado / label de
pronto), que **não** pode ficar sem alimentador; (ii) o **papel do artefato** distingue etapas que emitem o
mesmo tipo de evento — um PR de **contrato** (revisão do pipeline, ADR-0030) e um PR de **implementação** caem
em colunas distintas, não colapsam em "In review"; (iii) **unblock tem estado de volta** — remover
`blocked`/`needs-human-approval` retorna à coluna anterior derivável do evento, não a um limbo; (iv) as
transições são **idempotentes** (reprocessar o mesmo evento não muda a coluna). T10.3 fixa a tabela completa
respeitando (i)–(iv).

**5. Nada toca G3/T3. Auto-merge é rejeitado.**
A automação **abre PR; nunca integra.** O merge segue **humano (T3/G3)**, com CI verde. O **auto-merge é
explicitamente rejeitado** (ver Alternativas, D): mover a integração para a máquina fura o gate humano que é a
espinha do modelo de confiança.

**6. As seis colunas do board, fixadas e literais.**
`Backlog → Ready → In progress → In review → Blocked → Done` — **seis**, em **sentence case**. `Blocked` é
alimentada pelos labels `blocked`/`needs-human-approval`. A grafia e o conjunto são **normativos** aqui (as
fatias seguintes não os renegociam).

**7. Identidade da automação: GitHub App com permissões mínimas; a fronteira de merge é ruleset, não permissão.**
A automação atua sob um **GitHub App** com identidade própria e **permissões mínimas** — conteúdo, pull
requests e Projects. **Ressalva de enforcement:** `Contents:write` (necessário para commitar a branch do
flip) **também autoriza o endpoint de merge** do GitHub; com `approvals=0` no perfil Solo, "sem permissão de
merge" **não** é garantido só pela seleção de permissões do App. Portanto a fronteira "a automação não
integra" exige um **branch ruleset que exclua o App de mergear na `main`** (enforcement real) — e, enquanto o
perfil for Solo, permanece **em parte procedural** (no espírito do [ADR-0003](0003-enforcement-g3-por-perfil.md)),
declarado na Conformidade, não suavizado. **Instalar o App e guardar credenciais é ato humano**; este ADR
decide apenas o desenho.

**8. Rota do PR de flip: prefixo de manutenção dedicado, não fast-lane.**
O PR de flip **não** corresponde a uma Issue SDD, mas **também não** é fast-lane (§11.2 reserva `fast/<slug>`
ao T1 fast-lane; o flip é T2/irreversível). Logo ele **não** usa `fast/` nem uma branch Issue-numerada.
Decide-se um **prefixo de manutenção dedicado** — `flip/<data-ou-id-do-lote>` (o slug exato é T10.2) — e uma
**regra de correlação**: o **corpo do PR** enumera as Issues de origem de cada entrada do lote (`F-<issue>-*`
→ `#<issue>`), tornando o lote rastreável às suas múltiplas Issues sem fingir ser uma só. Mantém os **4 checks
de CI**, a **revisão** e o **merge humano** — governança por função, não redução de cerimônia.

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
  G1/G2/G3; a exclusão da automação do merge é por **branch ruleset** (não só permissão do App — ver ponto 7).
- *Flip cego marcando trabalho incompleto como `true`.* → elegibilidade exige **sinal de conclusão
  verificável** (ponto 1), não só `--scoped`; sem sinal, a entrada fica para julgamento humano.

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
- **Automação abre PR, nunca integra:** existe um **branch ruleset** que exclui o App de mergear na `main`
  (não basta a permissão do App — `Contents:write` autorizaria o merge); **não** há auto-merge; o PR de flip
  mantém os 4 checks + revisão + **merge humano**.
- **Flip com evidência:** a automação flipa **só** entradas com sinal de conclusão verificável (não o conjunto
  `--scoped` cru); confirmar que uma entrada projetada-mas-não-implementada **não** seria flipada.
- **Elegibilidade × dispatch:** a agenda é o dispatch; o merge é fronteira de elegibilidade — a implementação
  **não** dispara um PR por-merge.
- **Rota do flip:** branch com prefixo de manutenção dedicado (não `fast/`, não Issue-numerada); o corpo do PR
  correlaciona cada entrada às suas Issues de origem.
- **Project derivado:** transições são **função de eventos**, com origem para **toda** coluna (inclusive
  `Ready`), contrato vs implementação distinguíveis, unblock com estado de volta, idempotentes; fonte de
  status continua Issue/ledger.
- **Colunas:** exatamente as seis, em sentence case, com `Blocked` por `blocked`/`needs-human-approval`.
- **Supersedência:** `git diff` do ADR-0022 mostra **apenas** a nota de cabeçalho adicionada (texto histórico
  intocado). `node --experimental-strip-types tools/adr/adr-index.ts --check` verde, **com leitura da saída**;
  **nenhum ADR commitado** renumerado (`tools/adr/adr-sequence.ts --check`).
- **Perfil Solo** declarado nesta seção de Conformidade — não suavizado.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho do antigo. -->
