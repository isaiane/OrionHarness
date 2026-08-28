# Convenções e lições (hard-won)

## Git / GitHub
- **`Closes #N` em inglês** no corpo do PR. "Fecha #N" NÃO fecha a issue (GitHub só reconhece
  close/closes/closed, fix/fixes/fixed, resolve/resolves/resolved).
- Conventional Commits; **cabeçalho ≤100** e **cada linha do corpo ≤100** (commitlint). No terminal,
  use vários `-m`.
- Branch por Issue: `feat/<nº>-slug` / `fix/…` / `chore/…`. PR pequeno, escopado.

## CI / gh
- 4 checks obrigatórios: `lint-test-build`, `secret-scan`, `smoke-test`, `pre-commit`.
- CI bloqueante de verdade: nada de `|| true` / `|| echo` mascarando lint/test.
- `gh api` com objeto aninhado → **`--input - <<'JSON' … JSON`** (JSON real). **Nunca** `-F
  required_status_checks.strict=true` (vira chave plana literal) nem `restrictions=` (manda "" em
  vez de null) → 422.
- `restrictions: null`, não `""`.

## Arquitetura (ADR lean/flat)
- Postura **lean/flat por padrão**: encapsulamento simples; **sem** abstração preventiva (sem
  interface para implementação única; port só com ≥2 implementações reais).
- Clean Architecture/Hexagonal, event-driven, CQRS/ES/Saga/ACL = **opt-in** com dor documentada.
- Guardrail dos **3–4 arquivos**: se espalhar além disso, pare e proponha vertical slice.

## Stack / tooling
- Stack: **Node.js LTS 22 + TypeScript** (ESM, strict). Meta-tooling em TS (single-language).
- Tooling runnable roda em **Node ≥ 22 via type stripping** (`node arquivo.ts`) — sem toolchain;
  testes com vitest.
- Sandbox costuma ter o **registry npm bloqueado** → não tente `npm install` para verificar; rode
  a lógica TS via `node`, e instrua o humano a `npm install` + commitar o lockfile + confirmar CI.
- `passWithNoTests` só é aceitável no estágio esqueleto (sem tooling ainda) — é falso-verde estreito.

## Verificação
- **§8.1:** verde ≠ correto. Cheque spec, regras de negócio, ADRs, impacto e regressões.
- Mudança de **postura da constituição** → **varredura repo-wide** (incl. `CLAUDE.md`, `README`,
  `CONTRIBUTING`, `docs/observability`, `docs/testing-strategy`, `docs/architecture/foundations`),
  não só as seções editadas. **O `CONTRIBUTING` é um doc-resumo do fluxo** — mudança de pipeline/gates
  precisa atualizá-lo também (foi um dos misses do #36). Distinga **current-state** (corrigir) de **histórico/point-in-time**
  (CHANGELOG, texto original de ADR — append-only, não tocar).
- **Mudança no pipeline de fases → varra TRÊS camadas, não uma:**
  1. **Enumerações** da sequência (ex.: `prime → … → ship`) em todos os docs current-state.
  2. **Instruções de roteamento entre fases** — o "prossiga para X / próxima fase" de **cada**
     fase. Uma fase nova pode entrar na lista e ainda assim ser **contornada** pelo roteamento de
     outra fase (ex.: o Prime mandando "ir direto para o Plan" pula o `initialize`).
  3. **Diagramas (Mermaid/visual)** — abra **cada bloco ` ```mermaid `** e confira nós/arestas. O
     grep de texto **não** alcança o diagrama (rótulos próprios: `Prime`, `Plano`…), então um
     diagrama de onboarding pode seguir roteando `Prime → Plano` sem a fase nova. Foi o que o Codex
     pegou no diagrama do README depois de o texto já estar correto.
- ADRs **append-only**: supersede via ADR novo + nota de cabeçalho ("parcialmente superseded por
  ADR-XXXX"); preserve o texto histórico.

## Ciclo de review (humano + automáticos)
- O PR passa por **revisores automáticos** (ex.: **Codex** via comentário) além do meu review e do
  seu merge. Leia os comentários do PR (`pull_request_read get_review_comments`) e consolide.
- **Após corrigir achados de um revisor automático e dar push, deixe um novo comentário no PR com
  exatamente `@codex review`** para disparar nova revisão e fechar o ciclo.
- Responda/marque como resolvido o thread do achado, referenciando o commit do fix.

## Issues
- **Antes de criar uma Issue, cheque duplicatas** (`list_issues`/`search_issues` por título/`type:task`).
  Já houve T2.1 duplicada por criar sem verificar o que já existia.
- **A substância SDD mora na Issue (L2, committada), NÃO no handoff (scratch gitignored).** O handoff
  é andaime de execução; some. A Issue é a fonte da verdade e o artefato de retomada. Se a Issue estiver
  enxuta e o handoff "compensar" com Data-First/Riscos/Plano de validação, a fonte da verdade fica pobre.
  **Ao gerar/revisar uma Issue, confira o template §5 completo + §9.1:** Contexto, Problema/Oportunidade,
  Objetivo, Escopo, Fora de escopo, Critérios de aceite, Dependências, **Riscos**, **Plano de validação**,
  **Data-First (3 perguntas)**, **justificativa da classe de confiança** (não só no cabeçalho), DoD.
  Caso real: a #53 (T4.3) nasceu enxuta enquanto a irmã #45 trazia o template cheio. Corretivo pós-G1:
  **editar o corpo da Issue** (completude ≠ mudança de escopo → não re-dispara G1).
- **Marque estimativa vs. fato em sinais de custo/métrica.** Campos calculados por preço de tabela
  (ex.: `cost.usd`) são **estimados**; contadores (tokens) são **fato**. Diga isso explícito na convenção
  para ninguém tratar estimativa como valor faturado. Fixe também o **idioma dos campos livres** (ex.:
  `event`/nomes de campo em EN; free-text sob política única).

## STATE.md — referências a outras Issues
- **Cheque o estado (aberta/fechada) de TODA issue citada no STATE pós-merge.** O "Agora/Próximo" que
  aponta follow-ups (`#45`/`#49`/…) vira **stale** se listar uma issue **já fechada** como pendente.
  Não é issue-fantasma (existe) — é referência desatualizada. Caso real (T4.3): o passo listava `#47`,
  que já estava **completed** → tirar da lista. Verifique com `issue_read`/`gh issue view` antes de atualizar o ponteiro do STATE.

## Artefatos vivos (ledger e afins) — precisam de GATILHO, não só de princípio
- Um artefato que deve **crescer/atualizar com o tempo** (ex.: o `feature-ledger.json`) **congela** se
  o ADR só declara o *princípio* ("semeia-e-cresce") sem um **gatilho operacional explícito** (quem
  atualiza, quando). Sintoma real: o ledger nasceu com a #29 e ficou parado enquanto a #31 já estava
  ativa — pego pelo Codex.
- Padrão recomendado: **cada PR atualiza a SUA fatia.** Ao abrir o PR de uma tarefa que alcançou o G1,
  rode o gerador projetando a **própria Issue** e committe o delta (entradas `passes:false`). Isso
  (a) distribui o trabalho por PR, (b) mantém o artefato em dia sem um passo central esquecível, e
  (c) **não** projeta tarefas ainda não-prontas (que só entram quando seus PRs abrirem).
- Ao escrever um ADR de artefato vivo, **exija a seção "gatilho/owner/quando"** — não aceite só a
  semântica do conteúdo.

## Estado canônico (STATE.md) — rotear e atualizar o ponteiro PÓS-MERGE
> **Fonte canônica:** o roteamento vive no `AGENTS.md` §4 (Regra de compactação) / ADR-0024 / ADR-0025;
> a rede `state-budget-check` (ativa) **verifica** o STATE como ponteiro. Esta seção é o **gist
> operacional** — em qualquer conflito, o `AGENTS.md` vigente vence.
- `STATE.md` é o **ponteiro de início de sessão** lido em `main`; o próximo agente parte dele. Se o
  PR de uma tarefa grava o estado **pré-merge** ("em review") e defere um `chore(state)` separado, o
  `main` fica **stale no instante do merge** e trava o fluxo one-task-at-a-time (achado do Codex no #36).
- **Convenção:** a PR de uma tarefa **roteia o estado pós-merge** (história→PR mergeado, status→Issue/
  ledger) e **atualiza só o ponteiro** no STATE — a tarefa vira "última conclusão" (com o nº do PR) e o
  "Agora/Próximo" já aponta a **tarefa seguinte**. Assim o merge já deixa o estado correto, **sem
  `chore(state)` separado**; **nunca anexe narrativa** ("Antes…/Antes disso…") — é o que a rede
  `state-budget-check` reprova.
  **Pós-O9:** o `PLAN.md` **não** é atualizado — é stub-ponteiro; a conclusão da tarefa vive na
  **Issue** (fonte de status) e no **PR mergeado** (história). O `CHANGELOG.md` também é stub e
  **não** recebe narrativa.
- **Distinção importante:** `STATE.md` é **ponteiro pós-merge (não-gate)** → **atualiza só o ponteiro**,
  não despeja narrativa nem status por item.
  O **status de ADR** é **governança** → fica `proposto` até o G2 humano, só então `aceito`. Não
  confunda os dois.

## Termos formais e regeneração de artefatos (lições do #43)
- **Use os termos que a constituição já define; não sobrecarregue rótulos.** Ao escrever uma regra
  nova, reutilize a **taxonomia formal** existente (ex.: as camadas L0–L5 da §4, onde ADRs=L3,
  runbooks=L4, produto=L0.5) — **não** invente um segundo sentido para "L0". Caso real: a regra de
  seleção do ADR-0008 definiu "L0/governança" de um jeito que **contradizia a §4**, podendo misrotear
  a própria Harness Review. Antes de finalizar uma regra, **cheque-a contra as definições já
  existentes** (é o item "conflito repo-wide" do checklist — aplique-o em você mesmo).
- **Uma regra de classificação tem que cobrir TODOS os casos.** Enumere os baldes de forma exaustiva
  (governança, produto-docs L0.5, código/testes/config, memória) — um artefato sem balde recria a
  ambiguidade que a regra queria eliminar.
- **Regenerou um artefato derivado? LEIA o output.** Rodar o gerador não basta — verifique o
  resultado. Caso real: o `ledger-from-issues` truncou critérios multi-linha (`extractAcceptance` só
  pegava uma linha física) e gravou entradas corrompidas no ledger; ninguém notou até o review, porque
  ninguém releu o JSON gerado. "Verde do gerador" ≠ "output correto".

## Coerência de GOVERNANÇA (ao importar mecanismos do artigo/benchmark)
Distinto da varredura de texto: aqui a pergunta é se a peça **contorna um gate** — ela pode estar
tecnicamente correta e ainda assim **furar a governança**.
- **Regra-mãe:** toda peça runnable executa **DENTRO do fluxo SDD**, nunca fora. A execução
  complementa os gates; jamais os bypassa.
- Checklist por mecanismo importado (initializer, ledger, init.sh, sandbox, agente, …):
  - Escreve/commita **antes de uma Issue SDD aprovada**? → viola §1 (Princípio 2) e §6. Gateie via
    **Issue de bootstrap (G1)** + fluxo Git normal (branch → PR → merge humano).
  - Faz **merge/commit autônomo** em `main`? → viola **T3**: humano sempre.
  - Toma **decisão estrutural/de processo** sem ADR? → viola **G2**.
  - Acessa **dado sensível/ferramenta** sem autorização? → viola §10/§11.
- Caso real (não esquecer): o **Initializer** do ADR-0007 produzia `init.sh`/ledger/**commit inicial**
  **antes** de qualquer Issue aprovada e **sem gate** — contradizendo §1.2/§6. Pego pelo **Codex**,
  não pela varredura de enumerações/roteamento. Lição: ao importar um mecanismo, **simule um agente
  obediente seguindo-o ao pé da letra** e veja se ele atravessa algum gate.
- **Ordem do pipeline vs. ordem dos gates (deadlock de gate):** ao **gatear uma fase**, verifique se
  ela não passa a exigir um artefato/aprovação que **só uma fase posterior cria** — senão vira
  **deadlock circular**. Caso real: gatear o `initialize` (que roda **antes do Plan**) atrás de uma
  Issue aprovada (**G1**), sendo que Issues só nascem na **Spec** (**depois do Plan**) → o agente
  precisaria da Issue antes de poder criá-la. Saídas: (a) caminho **explícito** que cria o artefato
  cedo (ex.: Issue de bootstrap pré-Plan de primeira classe), ou (b) **mover a fase** para depois do
  passo que cria o artefato. Corolário: um artefato que **projeta/depende** de Issues (ex.: o ledger
  inicial) não pode ser produzido **antes** de existirem Issues.
