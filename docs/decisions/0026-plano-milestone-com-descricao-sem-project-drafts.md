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

**2. Fluxo Plan→Spec sobre Milestones.**
- **Plan:** criar/editar **Milestones** (título = épico; descrição = objetivo + tarefas propostas LEAN).
  É o que o humano aprova no **G1**.
- **Spec:** **promover** cada tarefa proposta a uma **Issue SDD** (10 campos, §5) **associada ao
  Milestone** do épico. A partir da promoção, a **Issue** é a fonte de status (L2); a descrição do
  Milestone permanece como o **mapa do épico** (objetivo + tarefas), não duplicando status por-item.
- **Não** há ovo-galinha: o Milestone existe antes das Issues; o G1 aprova a descrição do Milestone; a
  Spec cria as Issues. Nada exige criar Issue antes do G1.

**3. Project = board opcional (visão derivada), não fonte nem requerido.**
Um Project pode espelhar Milestones/Issues como board, mas **não** é a fonte do plano e **não** é exigido
na adoção do template. Isso remove o "opcionalmente" contraditório e o requisito de drafts.

**4. O gerador lê Milestones (título + descrição) + Issues.**
A representação offline ([`tools/plan/plan-report.ts`](../../tools/plan/plan-report.ts)) passa a projetar
**Milestones (com descrição) + Issues associadas**, não só Issues. Assim o **objetivo do épico** e as
**tarefas propostas** aparecem no read-path/relatório — fechando a perda de dados que a T9.3b expôs. A
ponte transitória "Milestone-senão-prefixo-de-título" continua válida até as Milestones serem populadas.

**5. Migração antes do stub (preserva os dados de épico).**
Antes de estubar o `PLAN.md` (T9.3b), os **Milestones são populados** a partir da tabela atual do
`PLAN.md` (épicos F1–F5/O1–O9, objetivos, tarefas) — incluindo O7 (reservado) e as fases concluídas que
valem como registro. É a fatia de **adição/migração** que torna "nenhuma janela" verdadeiro de fato.

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
