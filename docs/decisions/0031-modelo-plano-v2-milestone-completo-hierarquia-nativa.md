# ADR-0031 — Modelo de gestão de plano/tarefas v2 (Milestone completo + hierarquia nativa)

> Architecture Decision Record (`AGENTS.md` §3, gate G2). ADRs são **append-only**: uma decisão revista
> não é apagada — cria-se um novo ADR que a substitui.
>
> **Ao criar um ADR — ou mudar seu número/título/status/nome (inclusive flipar para `aceito` no G2) —,
> regenere o índice** e commite o `README.md`:
> `node --experimental-strip-types tools/adr/adr-index.ts --write` ([ADR-0023](0023-indice-gerado-de-adrs.md)).

> **Nota (append-only) — §2 esclarecida por [ADR-0034](0034-h2-nao-bloco-no-preambulo-milestone-v2.md) (`aceito` no G2, 2026-09-08):**
> a §2 passa a **permitir seções H2 não-bloco no preâmbulo** (entre `## Objetivo` e o primeiro `### bloco`)
> como **prosa não-normativa inerte** (ex.: `## Restrições transversais`, `## Tarefas (blocos de design)`),
> **sem `###`** (um `### <n>. <nome>` inicia a lista de blocos) e **sem constraints aprovadas no G1** (essas
> vivem no `## Objetivo`/blocos, capturados pelo snapshot `Promovida de:`). Blocos seguem ancorados em `###`;
> H2 não-bloco **após** o 1º `###` continua inválido. O "layout que fuja dessa forma" lê-se com essa ressalva.

- **Status:** aceito  <!-- G2 aprovado pelo owner (isaiane) em 2026-09-03 -->
- **Data:** 2026-09-01 (proposto) · 2026-09-03 (aceito no G2)
- **Decisores:** Isa (owner) — aprovação humana (gate **G2**)
- **Relacionado a:** épico **O11** (#16), Issue **#207** (T11.1). **Supersede parcialmente**
  [ADR-0026](0026-plano-milestone-com-descricao-sem-project-drafts.md) (o **modelo de plano**: descrição =
  *checklist* LEAN de frases `- [ ]` + reconciliação `- [x] → #N`) e a **camada de plano** do
  [ADR-0025](0025-modelo-alvo-plano-historia-compactacao-ponteiros.md) (a redação verbatim do §4 L1 que
  ambos carregam, "descrição = Objetivo + Tarefas propostas em checklist"). **Mantém** todo o resto de
  ADR-0025/0026 (épico = Milestone; Project = board opcional; história = PRs mergeados; ledger = projeção;
  `PLAN.md`/`CHANGELOG.md` → stub; ADR numerado pelo próximo-livre). Toca `AGENTS.md` §2/§4/§6 (redação
  verbatim abaixo, **aplicada em fatia irmã**); coerente com [ADR-0024](0024-estado-enxuto-roteamento-historia-status.md)
  (STATE = ponteiro) e o padrão visão-derivada+guard de [ADR-0019](0019-nucleo-l0-condensado.md).

## Contexto

O modelo de plano vigente é o [ADR-0026](0026-plano-milestone-com-descricao-sem-project-drafts.md): a
descrição do Milestone é um **checklist LEAN de frases** (`- [ ] <tarefa>`), e a promoção de cada tarefa a
Issue marca o item como `- [x] <tarefa> → #N` (reconciliação). Esse modelo assenta sobre a camada de plano
do [ADR-0025](0025-modelo-alvo-plano-historia-compactacao-ponteiros.md), que fixou "épico = Milestone;
plano = GitHub-backed; `PLAN.md` = stub".

A prática do épico **O11** (#16) expôs dois pontos de dor:

- **Planos finos demais para decomposição a frio.** Um *checklist* de uma frase por tarefa **não carrega
  contexto suficiente** para uma sessão fria (Cowork) decompor a tarefa em Issue SDD sem contexto externo.
  A necessidade arquitetural, o escopo, a forma dos critérios, a classe de confiança e as dependências de
  cada tarefa ficam **fora** do artefato aprovado no G1 — reconstruídos de memória, com drift.
- **Mapa de status em Markdown que pode driftar.** O marcador `- [x] <tarefa> → #N` é uma **segunda fonte**
  de hierarquia/status, paralela ao estado **nativo** do GitHub (Milestone + issues aberta/fechada). Duas
  fontes do mesmo fato divergem em silêncio — exatamente a classe de drift que o épico O9 (ADR-0025) queria
  eliminar, reintroduzida em miniatura pela reconciliação.

Restrições de governança: **append-only** (ADR-0025/0026 não podem ser editados — supersedência é por
**nota de cabeçalho**); mudança de **modelo de plano** é decisão de governança → **G2** (§3, [ADR-0016](0016-politica-projecao-ledger.md));
a redação canônica do `AGENTS.md` (§2/§4/§6) muda **por fatia de aplicação** que apenas aplica o texto
verbatim que este ADR carrega (padrão ADR-0025/0026: **decidir ≠ aplicar**), **não** por edição ad-hoc.

## Decisão

Adotamos o **modelo de gestão de plano/tarefas v2**, supersedência **parcial** de
[ADR-0026](0026-plano-milestone-com-descricao-sem-project-drafts.md) (modelo checklist) e da **camada de
plano** de [ADR-0025](0025-modelo-alvo-plano-historia-compactacao-ponteiros.md). O épico
[O11 (#16)](https://github.com/isaiane/OrionHarness/milestone/16) é o **exemplo canônico** já escrito neste
formato. As seis decisões:

**1. A descrição do Milestone é o PLANO COMPLETO — `## Objetivo` do épico + um bloco de design por tarefa.**
A descrição do Milestone deixa de ser um *checklist* de frases e passa a ser um **plano completo**: abre com
o **`## Objetivo`** do épico — o **resultado compartilhado que escopa o épico** (preservado do ADR-0026; a
necessidade por-tarefa **não** substitui o objetivo do épico) — e segue com um **bloco de design por
tarefa**, com os campos **Necessidade** (a dor/força, enunciada como problema) · **Escopo** (o que a tarefa
faz) · **Forma dos critérios** (como o aceite será verificável) · **Classe** (confiança T?/gate) ·
**Dependências**. Continua **GitHub-backed** (descrição nativa do Milestone, não um arquivo Markdown
paralelo) e continua sendo o artefato aprovado no **G1**.

**O bloco é a semente da Issue SDD, não os 10 campos (§5).** "Contexto suficiente **sem contexto externo**"
significa que a orchestrator **decompõe o bloco na Issue SDD completa** (os 10 campos — inclusive
fora-de-escopo, riscos, plano de validação) a partir do **bloco + do contexto do repo** (spec, ADRs, código)
— **sem** buscar informação fora do plano/repo —, e o **humano aprova no G1**. O bloco **não duplica** os 10
campos; é o insumo que os **origina**. Se um bloco não-trivial deixar um input material ambíguo, a promoção
**para e pede clarificação (re-G1)** antes de virar Issue — nunca inventa o input faltante.

**Gramática canônica do bloco (parseável — pré-requisito do `plan-report` v2).** Para que o leitor v2 divida
a descrição de forma **determinística** e case cada bloco com sua Issue, o bloco tem forma fixa (o
Milestone [O11](https://github.com/isaiane/OrionHarness/milestone/16) é o exemplo canônico):

- **Abertura:** a descrição começa com **`## Objetivo`** (o resultado do épico), **antes** do primeiro bloco.
- **Cabeçalho** `### <n>. <nome da tarefa>` — o **cabeçalho completo (ordinal `<n>` + nome) é o identificador
  estável** da tarefa (é o que o `Promovida de: … — "<n>. <nome>"` referencia; renomear = mudança de plano →
  re-G1). **Nomes de tarefa são únicos dentro do Milestone** — o ordinal desambigua, mas o traço não pode
  ficar ambíguo (invariante 1:1 proposta↔Issue, ADR-0026).
- **Cinco campos**, cada um aberto por um **rótulo em negrito** na ordem: `**Necessidade.**` ·
  `**Escopo.**` · `**Forma dos critérios.**` · `**Classe**` (T?/gate) · `**Dependências.**`.
- **Fronteira do bloco:** do seu `### ` até o próximo `### ` **ou** o `## Como iniciar` (que encerra a lista).

Um layout que fuja dessa forma **não** é v2-válido; o `plan-report` (follow-up) e o revisor humano cobram-na.

**2. Hierarquia e status são NATIVOS — sem o marcador `- [x] → #N`.**
A lista de tarefas e a hierarquia vêm do **Milestone nativo + Issues associadas** a ele (via
`gh … --milestone`; **não** são *sub-issues* no sentido do GitHub — uma *sub-issue* exigiria uma Issue-pai,
que a alternativa (B) rejeita); o **status** é o **nativo** do GitHub — issue **aberta/fechada** + a **barra
de progresso** do Milestone. **Não** há marcador `- [x] <tarefa> → #N` na descrição (elimina a segunda fonte
de status e o drift da reconciliação). O **traço G1→Issue** — a proveniência que amarra a Issue à tarefa
aprovada no plano — vive no **corpo da Issue** (`Promovida de: Milestone #M ("<épico>") — "<tarefa>"`),
**não** na descrição do Milestone. A descrição do Milestone é o **plano** (o que se pretende); o estado
real (o que já virou Issue e em que ponto está) é **lido do GitHub**, não remarcado à mão.

**Imutabilidade do aprovado no G1 (snapshot no corpo, sem tooling).** Como o **nome** da tarefa não
distingue o **aprovado no G1** de uma **edição posterior** da descrição, o `Promovida de:` **cita o bloco de
design aprovado** — o snapshot dos 5 campos **e o `## Objetivo` do épico vigente no G1** — **no corpo da
Issue** (versionado e revisado no G1), não só o nome. Assim um revisor compara o snapshot (bloco **e**
objetivo) com a descrição atual do Milestone. **Qualquer mudança material** pós-G1 — do bloco
(escopo/critérios/classe/deps), do **objetivo do épico** **ou do título do épico** (parte da identidade
aprovada e da proveniência `Promovida de:` — ADR-0026 já exige re-aprovação p/ título) — é **mudança de
plano → re-G1** (§3): a Spec não promove sob bloco/objetivo/título materialmente alterado sem reaprovação. (Snapshot/hash **versionado** continua
rejeitado — alternativa C — por ser superfície extra: o snapshot no corpo + o re-G1 bastam.)

**Status nativo lê `stateReason`, não só aberta/fechada (Codex r2).** Uma Issue fechada como **`not planned`
/ `duplicate`** (via `gh issue close --reason`) **não** conta como **concluída**. O leitor v2 (o
`plan-report`, ver Consequências) consome `stateReason` (`gh issue list --json stateReason`) para **não**
reportar tarefa abandonada/duplicada como entregue — só `completed` conta como concluída.

**Caveat da barra de progresso (denominador).** A **barra nativa do Milestone** conta apenas as **Issues já
associadas** — não os blocos de design **ainda não promovidos**. Num Milestone **parcialmente promovido**
ela pode marcar 100% com tarefas pendentes. Logo, a **completude do plano** lê-se da **descrição** (o
conjunto de blocos de design — a fonte do que foi aprovado no G1); a barra nativa é **conveniência sobre as
Issues promovidas**, não a medida do plano inteiro. **Segunda limitação da barra (Codex r7):** ela conta
**toda** Issue fechada — inclusive `not planned`/`duplicate` —, então **superconta** mesmo entre as
promovidas (uma tarefa cancelada aparece como avanço). Só o **relatório v2** (que lê `stateReason`, acima) é
exato quanto a *concluído*; a barra nativa **não** deve ser lida como sinal de conclusão. Nenhum marcador de
status paralelo volta à descrição.

**3. As descrições enunciam a NECESSIDADE arquitetural como problema — sem cravar o número do ADR a criar.**
Um bloco de design (no Milestone) e o corpo de uma Issue enunciam a **necessidade** ("o owner/gatilho da
flip exige uma decisão de governança") — **sem cravar o número do ADR que a tarefa vai criar** (`ADR-00NN`):
esse número não existe no momento do plano/Spec (é reservado à execução, ponto 4), e cravá-lo cria uma
dependência frágil que **colide sob merges paralelos** (invalidada 3× em O7/O10) e um buraco que o revisor
automático flagra. **Citar um ADR já aceito como dependência é diferente — e permitido** (recomendado: uma
sessão fria precisa da decisão que a governa). A proibição é apenas **preassinalar** o **ADR ainda-não-criado**
da própria tarefa, não referenciar decisões existentes.

**4. O ADR que a solução exigir é criado NA EXECUÇÃO, numerado pelo próximo-livre no momento da criação.**
Quando uma tarefa exige uma decisão de governança, o **Build** cria o ADR **na execução**, numerado pela
**sequência incremental (próximo-livre) no momento da criação** — varrendo `docs/decisions/` na `main`
mergeada, **sem** reservar nem cravar número antes. **O ADR nasce `proposto` e o Build PARA no G2:** criar o
ADR é **proposta** — **nada que dependa** da decisão **chega à `main`** antes da **aprovação humana (G2)**.
O **gate operativo é o merge (T3/G3)**: o humano **flipa o ADR para `aceito` (G2) ANTES do merge**, então a
`main` **nunca** recebe implementação dependente sob um ADR `proposto`. (Esta própria fatia é **só-decisão**
— ADR + notas de supersedência + índice: **nenhuma** implementação dependente da decisão — skill/templates/
form, `AGENTS.md`, docs — vai neste PR; ela é **fatia irmã pós-G2**, ver ponto 5.) Quem mergeia
primeiro fixa o número; o outro **rebumpa
antes do merge** (um ADR ainda **não mergeado na `main`** — mesmo já commitado na branch — pode ser
renumerado; um ADR **já na `main`**, nunca — aí supersede-se por nota). *(A automação desse
cálculo — script gerador + guard de CI fail-closed — é a **tarefa 2 do O11**, Issue própria, que **depende
deste ADR aceito**; não é escopo desta fatia.)*

**5. Postura lean/flat; meta-tooling em TypeScript (single-language); guardrail dos 3–4 arquivos por fatia.**
O modelo v2 e o tooling que o sirva seguem a postura **lean/flat** (§7, [ADR-0004](0004-reconciliacao-s7-lean-flat.md)):
abstração conquistada, não prevista. Meta-tooling em **TypeScript** (single-language, Node ≥ 22.6 via type
stripping — [ADR-0005](0005-stack-padrao-node-typescript.md)/[ADR-0012](0012-consolidacao-stack-node-ts.md)).
O **guardrail dos 3–4 arquivos** (§7) vale por **fatia**: uma mudança que se espalha além de 3–4 arquivos
**para** e propõe um *vertical slice* menor (ou escala) — inclusive a aplicação desta decisão ao
current-state (ver Conformidade).

**Esta fatia é DECISÃO-ONLY (dentro do guardrail); a aplicação é fatia(s) irmã(s) — padrão decidir≠aplicar
([ADR-0025](0025-modelo-alvo-plano-historia-compactacao-ponteiros.md) §9).**
Este PR contém **apenas a decisão**: o ADR-0031 + as **notas de supersedência** em ADR-0025/0026 + o
**índice** regenerado + o **ledger** born-false + o **ponteiro do STATE** (**6 arquivos**; os 4 além do texto
do ADR são **mecânica append/projeção obrigatória por PR** — notas append-only, índice gerado, ledger, STATE).
**Nenhuma implementação** do v2 vai aqui. A **aplicação** entra como **fatias irmãs ordenadas**, cada uma
**≤3–4 arquivos**, pós-G2:
(a) alinhar a **skill `orion-orchestrator` + templates + form** `sdd-task.yml` ao v2;
(b) **suporte v2 no `plan-report`** (leitor **dual-format** v1+v2 + `stateReason`) — **antes** de (c), senão o
get-bearings do `docs/getting-started.md` quebra no intervalo (o parser v1 rejeita Milestone v2);
(c) `AGENTS.md` §2/§4 (redação verbatim carregada aqui — aplicação G1) — **ativa** o v2 canônico;
(d) espelhos current-state (`CONTRIBUTING`/`getting-started`/runbooks/`discovery-guide`/`PLAN.md`);
(e) `artifact-manifest.ts`.
O ponto 4 (nada dependente antes do G2) vale **sem exceção** (não há bundle). Quanto ao **§7**, esta é a
**fatia-decisão irredutível**; os 6 arquivos são **exceção mínima escalada e registrada no G1**
([ADR-0025](0025-modelo-alvo-plano-historia-compactacao-ponteiros.md) §9 permite) — **não** "conformidade
sem exceção", e **muito** menor que o bundle de 11 da Opção A. *(Re-fatiado da opção "decisão + skill no
mesmo PR": o owner priorizou o guardrail no G1; o critério "skill no mesmo PR" da #207 migra para a fatia
irmã (a) — ver a nota do ledger no STATE.)*

**6. Todo Milestone v2 carrega um bloco `## Como iniciar`.**
A descrição de todo Milestone v2 termina com um bloco **`## Como iniciar`** — o **prompt de kick-off** que o
humano cola numa sessão fria (Cowork, com a skill `orion-orchestrator`) para promover a **próxima tarefa
pendente** do épico a uma Issue SDD, sem contexto externo. É o que torna o plano **auto-inicializável**: o
plano completo (ponto 1) + o prompt de arranque (ponto 6) bastam para a sessão fria operar.

**Conteúdo mínimo (não pode ser um heading vazio).** Um `## Como iniciar` válido é um prompt (bloco
` ```text `) que **obrigatoriamente** manda a sessão: (a) usar a skill `orion-orchestrator` e nomear o
**repo + o Milestone/épico** (a descrição é o plano); (b) **ler `AGENTS.core.md` + `AGENTS.md`** (§3/§4/§5/§11)
e a descrição inteira **antes de agir**; (c) **identificar a próxima tarefa não-promovida** (menor `<n>` sem
Issue associada) e **checar duplicata** (`search_issues`) antes de criar; (d) **promover** esse bloco a
Issue SDD (10 campos) **como PROPOSTA aguardando G1**, associada ao Milestone, com o traço `Promovida de:`;
(e) **parar no G1** e não mutar o repo/mergear (WIP=1; a constituição vence em divergência). O
[O11](https://github.com/isaiane/OrionHarness/milestone/16) traz o exemplo canônico. Um bloco que não cubra
esse mínimo **não** é v2-válido (o revisor humano cobra).

### Redação verbatim — o que muda no `AGENTS.md` §2 e §4 (aplicada em fatia irmã, G1)

Este ADR **carrega o texto exato** dos trechos do `AGENTS.md` que o modelo v2 altera; uma **fatia irmã de
aplicação** os aplica (é **aplicação G1**, não nova edição G2 — padrão ADR-0025/0026). O bloco é
**verificável por enumeração**: lista **exatamente** as linhas que mudam (de→para) e afirma que **todo o
resto do §2/§4 é preservado na íntegra** (em especial as demais linhas das tabelas, a Regra de compactação,
o roteamento de STATE, a rede `state-budget-check` e o parágrafo Núcleo L0). Nenhuma linha histórica é
tocada aqui; a redação verbatim que ADR-0025/0026 já carregam permanece **congelada** (point-in-time,
append-only) — o alvo v2 do §4 L1 passa a ser **este** bloco.

**§2 — tabela de fases, linhas Plan e Spec. DE:**

```markdown
| **Plan** | Planejador | Spec + Product Context | **Milestone(s)** (título = épico; descrição = Objetivo + Tarefas propostas LEAN em checklist) — artefato aprovado no G1 | ✅ Aprovação humana do plano (G1) |
| **Spec** | Especificador | Plano aprovado (descrição do Milestone) | **Promove** cada tarefa proposta a **Issue SDD** associada ao Milestone (marca `- [x] … → #N` na descrição; a Issue cita `Promovida de: Milestone #M`) | ✅ Aprovação humana das Issues |
```

**PARA:**

```markdown
| **Plan** | Planejador | Spec + Product Context | **Milestone(s)** (título = épico; descrição = **plano completo**: **`## Objetivo`** do épico + um **bloco de design por tarefa** — Necessidade / Escopo / Forma dos critérios / Classe / Dependências — encerrada por `## Como iniciar`) — artefato aprovado no G1 | ✅ Aprovação humana do plano (G1) |
| **Spec** | Especificador | Plano aprovado (descrição do Milestone) | **Promove** cada tarefa a **Issue SDD** **associada ao Milestone** (via `--milestone`; hierarquia/status **nativos**, **sem** marcador `- [x] … → #N`); a Issue cita `Promovida de: Milestone #M` **no corpo** | ✅ Aprovação humana das Issues |
```

**§4 — tabela de camadas, linha **L1** Plano. DE:**

```markdown
| **L1** Plano | **GitHub Milestones (épico — mapa autoritativo; título = épico, descrição = Objetivo + Tarefas propostas pré-Spec em checklist, aprovada no G1) + Issues de tarefa (promovidas na Spec, associadas ao Milestone); Project = board opcional (visão derivada, não fonte)** (fonte); relatório gerado em `.orion/tmp/reports/plan.md` (leitura offline, gitignored); `PLAN.md`/`docs/plans/` = **stub-ponteiro transitório** | Mapa de épicos (Milestone) e detalhamento; gate G1 |
```

**PARA:**

```markdown
| **L1** Plano | **GitHub Milestones (épico — mapa autoritativo; título = épico, descrição = plano completo pré-Spec: `## Objetivo` do épico + um bloco de design por tarefa — Necessidade/Escopo/Forma dos critérios/Classe/Dependências — encerrada por `## Como iniciar`, aprovada no G1) + Issues de tarefa (promovidas na Spec, associadas ao Milestone; hierarquia/status nativos, sem marcador `- [x] → #N`); Project = board opcional (visão derivada, não fonte)** (fonte); relatório gerado em `.orion/tmp/reports/plan.md` (leitura offline, gitignored); `PLAN.md`/`docs/plans/` = **stub-ponteiro transitório** | Mapa de épicos (Milestone) e detalhamento; gate G1 |
```

**§6 — linha "Gestão".** A frase `GitHub **Milestones** (épicos; descrição = plano pré-Spec) + **Issues**
(tarefas SDD) + **Project** (board opcional/visão derivada)` **permanece** — "plano pré-Spec" já é neutra
quanto à forma; nenhuma edição do §6 é necessária. *(Registrado para a fatia irmã não "consertar" o que
não quebrou.)*

Todo o restante de §2/§4/§6 é **preservado na íntegra**. A fatia irmã que aplicar este bloco também
propaga o v2 aos **espelhos current-state não-constitucionais** (`CONTRIBUTING.md`,
`docs/getting-started.md`, `docs/plans/README.md`, `docs/runbooks/github-projects.md`,
`docs/product/discovery-guide.md`, `PLAN.md`) **e à metadata executável do manifesto de coerência**
[`docs/examples/artifact-manifest.ts`](../examples/artifact-manifest.ts) (hoje o `MANIFEST` ainda descreve
`- [x] … → #N` e o ADR-0026 como decisão de plano vigente; a aplicação reponta para o v2/ADR-0031, senão o
coherence-guard retém o modelo superseded) — ver Conformidade.

## Alternativas consideradas

- **(A) Manter o checklist do ADR-0026 e só enriquecer o texto de cada `- [ ]`.** Rejeitada: um item de
  checklist multi-linha rico reintroduz prosa de status por-item na descrição e **não** remove o marcador
  `- [x] → #N` (a segunda fonte de status). Não ataca a raiz (dois problemas), só o primeiro pela metade.
- **(B) Criar Issue-pai de épico (issue como plano) em vez de usar a descrição do Milestone.** Rejeitada:
  o épico já é o **Milestone** (ADR-0025, mantido); uma Issue-pai paralela recria hierarquia fora do nativo
  — o oposto do ponto 2. O Milestone nativo + Issues associadas já dá a hierarquia sem artefato novo.
- **(C) Snapshot/hash versionado do plano aprovado no G1** (artefato/tooling de imutabilidade forte).
  Rejeitada nesta fatia (mesma decisão do ADR-0026): o **snapshot do bloco no corpo da Issue** (ponto 2 —
  o `Promovida de:` cita os **5 campos + o `## Objetivo` do épico** aprovados, versionados e revisados no
  G1) + o **re-G1** para mudança material já tornam o aprovado **distinguível e verificável**, sem um
  artefato/hash versionado à parte
  (superfície extra sem dor documentada — YAGNI). Reabre-se em novo ADR se o snapshot-no-corpo se mostrar
  insuficiente na prática.
- **(D) Aplicar o v2 ao `AGENTS.md` + todo o current-state neste mesmo PR.** Rejeitada: estoura o guardrail
  dos 3–4 arquivos (§7) — são ~13 arquivos, incluindo a constituição — e editar o `AGENTS.md` diretamente
  seria um G2 embutido num PR de entrega. O padrão do repo (ADR-0025/0026: **decidir ≠ aplicar**) mantém a
  decisão aqui e a aplicação em fatia(s) irmã(s) de aplicação (G1, texto já aprovado no G2 deste ADR).

## Consequências

- **Positivas.** O plano vira **auto-suficiente para decomposição a frio** (ponto 1 + ponto 6): uma sessão
  fria promove a próxima tarefa sem contexto externo. **Uma só fonte de status/hierarquia** (nativo do
  GitHub) — some a segunda fonte e o drift da reconciliação (ponto 2). A **necessidade desacoplada do
  número de ADR** (pontos 3–4) elimina a colisão de números sob merges paralelos. Modelo **implementável
  hoje** com `gh`/GitHub nativo, sem tooling novo (o tooling de numeração é a tarefa 2).
- **Negativas / riscos + mitigação.**
  - *Descrição de Milestone mais longa (blocos de design).* → É prosa **GitHub-backed** na fonte nativa do
    épico, não arquivo autoral paralelo; o alvo do O9 era acabar com **arquivos autorais paralelos**, não
    com contexto na fonte nativa. O O11 (#16) mostra que cabe.
  - *Migrar planos legados (checklist → blocos v2).* → Trabalho pontual e por-épico; o **O10** migra na
    **tarefa 3 do O11** (Issue própria, depende deste ADR aceito). Épicos concluídos ficam **congelados**
    (point-in-time) — não se reescreve plano passado.
  - *Janela de transição: a skill diz "use v2" enquanto o `AGENTS.md` canônico ainda descreve o checklist —
    e a própria skill defere ao `AGENTS.md` vigente.* Um agente frio, entre o merge desta fatia e o da fatia
    de aplicação, pode cair num conflito (rodar v1 ou parar). → **Mitigação:** (i) a cadeia append-only — o
    §4 aponta para ADR-0025/0026, que agora trazem **nota de cabeçalho** apontando para este ADR-0031 (o
    modelo **decidido**); (ii) a **fatia de aplicação deve seguir imediatamente** (é a próxima do O11, sem
    outra tarefa do fluxo completo entre elas — WIP=1); (iii) a skill carrega uma **nota de transição
    explícita** (não silenciosa): na janela, **priorize aterrissar a aplicação do `AGENTS.md`** antes de
    promover novas tarefas sob o v2. **Não** se opera o v2 em produção com o §2/§4 ainda em v1.
  - *O gerador de plano `tools/plan/plan-report.ts` não lê o v2 — falha-fechado.* Ele reconcilia Issues
    associadas pelo marcador `- [x] … → #N`; sem o marcador, **lança erro** (reproduzido no O11 hoje: "Issue
    #209 atribuída ao Milestone #16 mas não aparece na descrição"). → **Mitigação:** ensinar o `plan-report`
    a **ler blocos de design** (pela gramática canônica do ponto 1) **+ reconciliar Issues associadas pelo
    estado nativo** (incluindo `stateReason` — `not planned`/`duplicate` **não** contam como concluída) é
    **follow-up nomeado** (fatia própria, junto/antes da aplicação). Esse follow-up precisa de **suporte
    dual-format (v1 legacy + v2)** — ou **migração de todo Milestone legado não-congelado**: hoje o **O7**
    segue aberto em *checklist* v1 e o fetch é `state=all` (Milestones concluídos/congelados permanecem v1,
    point-in-time). Um leitor que só parseie v2 **quebra/omite** O7 e o histórico. **É pré-requisito de
    ADOÇÃO do v2, não deste G2:** este ADR
    **decide** o modelo; a barra de progresso e o get-bearings via `plan-report` só ficam corretos quando essa
    fatia e a de aplicação aterrissarem. Enquanto isso, o get-bearings do plano é o **Milestone no GitHub**
    (descrição = blocos de design), não o relatório gerado.
- **Segurança/confiança/observabilidade.** Mudança de **modelo de plano** = **T2 → G2** (este ADR, humano).
  Nenhum artefato versionado é removido; nenhum efeito T3. **Observabilidade (Data-First §9.1):** o v2 é
  observável nos artefatos — Milestones passam a ter blocos de design + `## Como iniciar`; Issues nascem com
  `Promovida de: …` no corpo; **ausência** do marcador `- [x] → #N` é o sinal estrutural da adoção.

## Conformidade

Como verificar no review/CI que a implementação respeita a decisão (§8.1):

- **Decide os 6 pontos** do Escopo da #207 (1–6 acima), com a redação canônica do v2.
- **Supersedência (append-only):** o `git diff` de
  [ADR-0025](0025-modelo-alvo-plano-historia-compactacao-ponteiros.md) e
  [ADR-0026](0026-plano-milestone-com-descricao-sem-project-drafts.md) mostra **apenas** a **nota de
  cabeçalho** adicionada — **nenhuma** linha do texto histórico dessas decisões é alterada.
- **Alinhamento skill/templates/form — fatia irmã (pós-G2), NÃO esta fatia:** a skill
  [`orion-orchestrator`](../../skills/orion-orchestrator/SKILL.md) (tabela **"onde cada conceito mora"** +
  regras de estado/plano), os templates ([`sdd-issue.md`](../../skills/orion-orchestrator/templates/sdd-issue.md),
  `adr.md`, `reference/workflow.md`) e o form `.github/ISSUE_TEMPLATE/sdd-task.yml` passam a refletir o v2
  na **fatia irmã (a)** do ponto 5 — **não** neste PR (que é decisão-only). Aqui o `git diff` **não** toca
  `skills/` nem `.github/`.
- **Varredura repo-wide (§8.1), 3 camadas — feita e roteada:** (1) **enumerações** do modelo de plano no
  current-state contradizem o v2 em `AGENTS.md` §2/§4, `CONTRIBUTING.md`, `docs/getting-started.md`,
  `docs/plans/README.md`, `docs/runbooks/github-projects.md`, `docs/product/discovery-guide.md`, `PLAN.md`
  **e a metadata do `MANIFEST` em `docs/examples/artifact-manifest.ts`** (`- [x] → #N` / ADR-0026 como
  decisão vigente) — todos roteados à fatia de aplicação;
  (2) **roteamento entre fases** inalterado (o pipeline não muda, só o formato do artefato do Plan);
  (3) **diagramas Mermaid** (`README.md`, `docs/architecture/ui-agent-harness.md`,
  `skills/orion-orchestrator/SKILL.md`, `skills/orion-orchestrator/reference/conventions.md`) — abertos,
  **nenhum** desenha o marcador `- [x] → #N` nem a forma do plano, logo **nenhuma** aresta muda. A
  correção da camada (1) no current-state é uma **fatia irmã de aplicação** (aplica a redação verbatim do
  §2/§4 acima; guardrail 3–4 → sub-fatiar) — separada por **guardrail dos 3–4 arquivos** (§7) e por o
  `AGENTS.md` ser constituição (a decisão é G2 aqui; a aplicação é G1 lá).
- **Coerência de governança (agente obediente):** a promoção continua **Issue aprovada (G1) → branch → PR
  → merge humano (T3)**; nenhuma peça do v2 contorna um gate (o plano é aprovado no G1; o ADR de execução é
  G2; o merge é humano). O status nativo **não** volta ao `STATE.md` (ponteiro; [ADR-0024](0024-estado-enxuto-roteamento-historia-status.md)).
- **Guards/CI:** `scripts/smoke-test.sh` verde (inclui o anti-drift do núcleo L0 e o índice de ADRs
  regenerado); a **entrada do ledger desta fatia nasce `false`** (flip é follow-up pós-merge).

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho deste. -->
