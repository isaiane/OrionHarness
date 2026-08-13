# ADR-0026 — Plano simplificado: Milestone (com descrição) como fonte, sem Project drafts

> Architecture Decision Record (`AGENTS.md` §3, gate G2). ADRs são **append-only**: uma decisão revista
> não é apagada — cria-se um novo ADR que a substitui.
>
> **Ao criar um ADR — ou mudar seu número/título/status/nome —, regenere o índice** e commite o
> `README.md`: `node --experimental-strip-types tools/adr/adr-index.ts --write` ([ADR-0023](0023-indice-gerado-de-adrs.md)).

- **Status:** proposto  <!-- G2 pendente: aprovação humana do owner -->
- **Data:** 2026-08-12 (proposto)
- **Decisores:** Isa (owner) — aprovação humana (gate **G2**)
- **Relacionado a:** épico **O9**; **supersede parcialmente** [ADR-0025](0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)
  (item 1: "Pipeline Plan→Spec via Project draft items" e a mecânica draft↔épico). **Mantém** todo o
  resto do ADR-0025 (história = PRs mergeados; ledger = projeção; `PLAN.md`/`CHANGELOG.md` → stub;
  representação offline gerada; sequência de fatias). Motivado pela revisão da **T9.3b** (PR #144, #140).

## Contexto

O [ADR-0025](0025-modelo-alvo-plano-historia-compactacao-ponteiros.md) fixou que o plano operacional
vive em GitHub e que o `PLAN.md` vira stub. Para o **artefato pré-Spec** (o que o humano aprova no
**G1** antes de existirem Issues), o ADR-0025 escolheu **Project draft items**, com a associação
**épico↔draft** a ser *"definida na T9.3"*.

A implementação da **T9.3b** (PR #144) e sua revisão expuseram que esse desenho **não é operacional**:

- **Mecânica draft↔épico indefinida e sem suporte nativo.** Um Project draft **não é uma Issue** e
  **não recebe Milestone** via `gh` (não há operação). "épico = Milestone, tarefa = draft" é
  inimplementável ao pé da letra sem inventar um campo de Project + regra de sincronização — exatamente
  o que o ADR-0025 adiou para a T9.3 e que se mostrou uma **decisão de design pendente**, não um detalhe.
- **A fonte nova não substitui o `PLAN.md`.** As Milestones não estão populadas; o gerador
  ([`tools/plan/plan-report.ts`](../../tools/plan/plan-report.ts)) deriva de **Issues** e **não lê
  drafts**. Estubar o `PLAN.md` **perderia** dados de épico reais (fases F1–F5, épico reservado O7,
  **objetivos de épico**) e os drafts sumiriam do get-bearings durante o Plan — violando o critério
  "nenhuma informação útil fica só no `PLAN.md`".

A raiz é o **peso desnecessário** do subsistema de drafts: ele introduz um artefato pré-Spec paralelo
(draft) e uma sincronização (draft↔épico, draft→Issue) que o GitHub não suporta nativamente, sem ganho
proporcional. O Milestone — que o ADR-0025 **já** consagra como o mapa autoritativo de épicos — pode
ser o próprio contêiner pré-Spec.

## Decisão

Adotamos um **modelo de plano simplificado**, superseção **parcial** do ADR-0025 (item 1):

**1. O épico é o Milestone; a fonte pré-Spec é a DESCRIÇÃO do Milestone.**
O **título** do Milestone nomeia o épico; a **descrição** do Milestone guarda o **objetivo do épico** e a
**lista de tarefas propostas (pré-Spec)** — é o artefato que o humano **aprova no G1**. Sem Project
drafts, sem campo de épico custom, sem sincronização draft↔épico. A descrição é **GitHub-backed**
(editável, versionada pelo GitHub, não um arquivo Markdown paralelo no repo).

**2. Fluxo Plan→Spec sobre Milestones (com reconciliação e traço).**
- **Plan:** criar/editar **Milestones** (título = épico; descrição = **Objetivo** + **Tarefas propostas**
  como checklist `- [ ] <tarefa LEAN>`). A descrição aprovada é o artefato do **G1**.
- **Spec — promoção:** para cada proposta, criar a **Issue SDD** (10 campos, §5) **associada ao
  Milestone** e **marcar o item na descrição** como promovido, anexando o número: `- [x] <tarefa> → #N`.
  A Issue registra no corpo **`Promovida de: Milestone #M — "<texto da proposta>"`** (traço G1→Issue).
- **Reconciliação (sem duplo-render — regra do gerador e do §8.1):** um item `- [x] … → #N` **não** é
  renderizado como proposta (a **Issue #N** é a fonte); só os itens `- [ ]` (pendentes) aparecem como
  propostas. O sufixo `→ #N` é o **identificador estável** proposta↔Issue. Assim a descrição **não** vira
  um segundo mapa de status paralelo — o drift que o O9 elimina.
- **Traço/imutabilidade do aprovado no G1:** a **Issue promovida** é o registro append-only (via ledger)
  do que foi aprovado — cita o Milestone e o texto da proposta. A descrição é o **plano vivo**; alterar
  **qualquer parte aprovada no G1 — o Objetivo do épico OU uma tarefa proposta pendente** — depois do G1
  é **mudança de plano → re-G1** (§3): a Spec **não** promove sob Objetivo/tarefa materialmente alterados
  sem re-aprovação. (Snapshot/hash nativo fica como opção futura; re-G1 + o traço na Issue cobrem o caso.)
- **Idempotência/recuperação da promoção (ação de 2 passos — §11):** antes de criar a Issue, **procurar**
  uma Issue existente com o traço (`Promovida de: Milestone #M — "<texto>"`); se existir, **não** recriar
  — apenas **retomar** a marcação `- [x] … → #N`. Assim, se a criação da Issue suceder mas a edição do
  Milestone falhar, o retry **não** duplica. (Invariante aqui; algoritmo na T9.3b-mig/T9.3b.)
- **Não** há ovo-galinha: o Milestone existe antes das Issues; o G1 aprova a descrição; a Spec cria as
  Issues. Nada exige criar Issue antes do G1.

**3. Project = board opcional (visão derivada), não fonte nem requerido.**
Um Project pode espelhar Milestones/Issues como board, mas **não** é a fonte do plano e **não** é exigido
na adoção do template. Isso remove o "opcionalmente" contraditório e o requisito de drafts.

**4. O gerador lê Milestones (título + descrição) + Issues.**
A representação offline ([`tools/plan/plan-report.ts`](../../tools/plan/plan-report.ts)) passa a projetar
**Milestones (com descrição) + Issues associadas**, não só Issues. Assim o **objetivo do épico** e as
**tarefas propostas** aparecem no read-path/relatório — fechando a perda de dados que a T9.3b expôs. A
ponte transitória "Milestone-senão-prefixo-de-título" continua válida até as Milestones serem populadas.

**Operações `gh` (concretas — NÃO existe `gh milestone`).** Milestones são criados/editados via **REST**,
reusando o idioma `gh → json → tool` (auth via `gh`, sem segunda via) da T9.3a:
- criar: `gh api repos/{owner}/{repo}/milestones -f title='O9 — …' -f description='<Objetivo + checklist>'`
- editar: `gh api -X PATCH repos/{owner}/{repo}/milestones/{number} -f description='…'`
- ler (gerador): `gh api "repos/{owner}/{repo}/milestones?state=all" --paginate` (título+descrição —
  **`state=all`** senão épicos concluídos com Milestone **fechado** somem, pois o default é `open`) **+**
  `gh issue list --state all`.
Chaves aninhadas em `-f` pontilhado **não** funcionam (usar `--input` com JSON quando necessário —
convenção do repo). A T9.3b-mig enfia esses comandos no gerador/runbook (não deixa o agente sem caminho).

**5. Migração antes do stub (preserva os dados de épico; T9.3b-mig).**
Antes de estubar o `PLAN.md` (T9.3b), os **Milestones são populados** a partir da tabela atual do
`PLAN.md` (épicos F1–F5/O1–O9, objetivos, tarefas), incluindo O7 (reservado) e as fases concluídas que
valem como registro. **Backfill do traço (não copiar cru):** muitas tarefas do `PLAN.md` **já têm
Issue** — a migração **mapeia tarefa→Issue existente** e emite `- [x] <tarefa> → #N` para as
já-promovidas, distinguindo-as das propostas **genuinamente pendentes** (`- [ ]`); um copy literal como
itens desmarcados faria o gerador renderizar cada tarefa legada **duas vezes** (proposta + Issue). O
aceite da **T9.3b-mig valida** o mapeamento (0 tarefa legada com Issue aparecendo como proposta). É a
fatia de **adição/migração** que torna "nenhuma janela" verdadeiro de fato.

**6. Impacto nas fatias do O9 (ADR-0025 §9).**
A sequência do ADR-0025 é preservada, com a **T9.3b redividida**:
- **T9.3b-mig (adição pura):** popular Milestones (descrição = objetivo + tarefas) + o gerador ler
  descrições de Milestone. **Nada sai do read-path.** Gate **G1**.
- **T9.3b (stub):** só depois — estubar `PLAN.md`/`docs/plans/`, aplicar a linha L1 do §4 (redação
  ajustada por este ADR: Milestone+descrição, Project opcional) + §2/§6, repontar espelhos. Gate **G1**.

A **redação do §4/§2/§6** que o ADR-0025 carregava (Project drafts como fonte pré-Spec) é **substituída**
pela redação deste ADR (Milestone+descrição; Project opcional). O texto verbatim final do §4 é aplicado
na T9.3b (stub), como no ADR-0025 — apenas a **fonte pré-Spec** muda de "draft items" para "descrição do
Milestone".

## Redação verbatim — o que muda no §4/§2/§6 (substitui a redação de drafts do ADR-0025)

Este ADR **carrega o texto exato** dos trechos que difere do bloco "Redação integral do §4" do
[ADR-0025](0025-modelo-alvo-plano-historia-compactacao-ponteiros.md). A **T9.3b apenas aplica** (G1); o
**resto** do bloco do §4 do ADR-0025 (camadas L0–L5, Regra de compactação, roteamento, Núcleo L0)
**permanece**. Critério de aceite da T9.3b: os trechos abaixo == arquivo (após prefixar links de ADR).

**§4 — linha L1 da tabela de camadas:**

```markdown
| **L1** Plano | **GitHub Milestones (épico — mapa autoritativo; título = épico, descrição = Objetivo + Tarefas propostas pré-Spec em checklist, aprovada no G1) + Issues de tarefa (promovidas na Spec, associadas ao Milestone); Project = board opcional (visão derivada, não fonte)** (fonte); relatório gerado em `.orion/tmp/reports/plan.md` (leitura offline, gitignored); `PLAN.md`/`docs/plans/` = **stub-ponteiro transitório** | Mapa de épicos (Milestone) e detalhamento; gate G1 |
```

**§4 — bala "Status de item" (texto final completo):**

```markdown
- **Status de item** (critérios/`passes`) → a **Issue SDD** é a **fonte da verdade** (L2, ADR-0006);
  o **ledger** é a **projeção de verificação** (imutável, não autoral) e o **mapa de épicos vive em
  Milestones (épico) + Issues de tarefa** (L1; épico = **Milestone**; **Project = board opcional**;
  `PLAN.md`/`docs/plans/` = **stub-ponteiro transitório**). Atualize a **Issue** ao mudar o status real;
  ledger e mapa **refletem**, não substituem. Na **fast-lane** T1 issue-less (§11.2), sem Issue: o **PR
  leve** é o registro de critério/status (projeção no ledger/Issue = **N/A**) — mas o status **nunca**
  volta ao `STATE.md`.
```

**§2 — linhas Plan e Spec da tabela de fases:**

```markdown
| **Plan** | Planejador | Spec + Product Context | **Milestone(s)** (título = épico; descrição = Objetivo + Tarefas propostas LEAN em checklist) — artefato aprovado no G1 | ✅ Aprovação humana do plano (G1) |
| **Spec** | Especificador | Plano aprovado (descrição do Milestone) | **Promove** cada tarefa proposta a **Issue SDD** associada ao Milestone (marca `- [x] … → #N` na descrição; a Issue cita `Promovida de: Milestone #M`) | ✅ Aprovação humana das Issues |
```

**§6 — linha "Gestão":** `GitHub **Milestones** (épicos; descrição = plano pré-Spec) + **Issues** (tarefas
SDD) + **Project** (board opcional/visão derivada)` — sem draft items como fonte, sem mecânica draft↔épico.

## Alternativas consideradas

- **(A) Manter o ADR-0025 e definir a mecânica draft↔épico** (campo de Épico no Project + regra de sync
  na promoção). **Rejeitada:** reintroduz um artefato pré-Spec paralelo (draft) e uma sincronização sem
  suporte nativo do `gh`, com custo/risco desproporcional — o peso que motivou este ADR. Fica registrada
  caso um board com drafts se torne necessário no futuro.
- **(B) Plan cria Issues diretamente (sem contêiner pré-Spec).** Rejeitada: exigiria criar Issues antes
  do G1 (o ovo-galinha que o ADR-0025 evita) e sobrecarregaria a Issue com o papel de "proposta".
- **(C) Manter o `PLAN.md` como fonte e só adicionar guard.** Rejeitada pelo O9 desde o ADR-0025
  (trata o sintoma, não reduz a superfície autoral).

## Consequências

- **Positivas.** Modelo **implementável hoje** com `gh` (milestone create/edit com descrição). **Zero**
  mecânica draft↔épico. Os **objetivos de épico** e **tarefas propostas** ficam no read-path (Milestone
  descrição + gerador) — a perda de dados da T9.3b some. Uma fonte por conceito, mantida do ADR-0025.
- **Negativas / riscos + mitigação.**
  - *A descrição do Milestone é prosa editável — "Markdown autoral voltando"?* → **Não**: é GitHub-backed
    (não um arquivo versionado paralelo), é o contêiner **nativo** do épico e não duplica status por-item
    (que vive na Issue). O alvo do O9 é acabar com **arquivos autorais paralelos**, não com prosa
    descritiva na fonte nativa.
  - *Migração manual dos épicos para Milestones* → fatia **T9.3b-mig** (adição pura, G1); trabalho
    pontual e verificável (o gerador lê e confere).
  - *Offline num clone sem rede* → inalterado do ADR-0025: gerador vazio + stub-ponteiro.
- **Segurança/confiança/observabilidade.** Sem novo artefato versionado; remoção de artefato segue
  **T3/G3** (humano). Observabilidade preservada (relatório sob demanda lê Milestones+Issues).

## Conformidade

- **Nenhuma fatia** estuba o `PLAN.md` **antes** de a **T9.3b-mig** popular os Milestones e o gerador ler
  descrições (nenhuma perda de dados de épico).
- **§4/§2/§6:** a redação aplicada na T9.3b nomeia **Milestone (título+descrição) + Issues**; **Project =
  board opcional**; **sem** draft items como fonte nem mecânica draft↔épico.
- **Endurecimento (ADR-0025 §8):** esta é uma **decisão de governança nova** (fork de design do modelo
  pré-Spec) — logo **exige G2** (este ADR), não corre em G1.
- **Simulação do agente obediente:** um agente na fase Plan **cria/edita um Milestone com descrição** e o
  humano aprova no G1; na Spec, **promove as tarefas a Issues**; o get-bearings lê Milestones+Issues (ou
  o relatório gerado) — **sem** procurar um Project draft inexistente.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho do antigo. -->
