# ADR-0017 — Fast-lane para ações T1 de baixo risco

> **Numeração:** 0017 = próximo livre em `docs/decisions/` na `main` (último commitado: 0016).
> Confirme com `git ls-files docs/decisions/` antes de fixar.

- **Status:** proposto  <!-- humano aprova (G2) → muda para: aceito -->
- **Data:** 2026-07-21
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** `AGENTS.md` §3 (gates), §7 (lean/flat), §11 (modelo de confiança T0–T4);
  ADR-0004 (proporcionalidade/lean-flat); épico **O5** / Issue T5.1; Onda 4 do plano original.

## Contexto
O modelo de confiança (§11) classifica cada ação em T0–T4, mas essa classe **não altera o processo**:
a mesma cerimônia SDD (Issue de 10 campos, ADR quando estrutural, dupla revisão) recai sobre **toda**
tarefa, do typo em doc à mudança de fluxo. Isso contraria a proporcionalidade que o ADR-0004 já
estabelece e a postura lean/flat (§7): impõe custo fixo de processo onde o risco não mora, desincentivando
mudanças pequenas e corretas. Falta a **manifestação de processo** do §11 — hoje ele governa *o que é
automatizável*, mas não *quanta cerimônia* cada classe carrega.

## Decisão
Adotar um **fast-lane**: um caminho de menor cerimônia para ações **estritamente T1** (efeito
reversível de baixo impacto), dispensando a **Issue SDD de 10 campos** e o **ADR** para mudanças
triviais elegíveis, e **mantendo integralmente** os controles onde o risco vive. **T0 puro** (leitura
sem efeito) **não usa a via** — não há mudança a integrar (já é automático, §11); a via existe para o
que **se commita**.

**Elegibilidade (conjuntiva — todas verdadeiras):**
1. classe de confiança = **T1** (efeito reversível de baixo impacto a integrar);
2. **não cruza G1** (sem nova capacidade/escopo) **nem G2** (sem decisão estrutural/stack/processo/segurança);
3. **não toca governança/instrução nem dado sensível** (§10). Governança é definida por **função**
   (§2, critério de desempate / ADR-0008), **não** por lista fechada: além de
   `AGENTS.md`/ADRs/gates/`CLAUDE.md`, inclui checklists de review, seções de processo de
   `CONTRIBUTING.md`/`docs/getting-started.md`, `docs/architecture/foundations.md`,
   `docs/testing-strategy.md`, `SECURITY.md` e workflows de CI que implementam um gate. Na dúvida,
   trate como governança (⇒ `full`);
4. cabe no **guardrail dos 3–4 arquivos** (§7);
5. é **reversível**.

**O que o fast-lane REMOVE (para o elegível):** a Issue SDD de 10 campos e o ADR. Substitui por um
**PR leve** com: descrição de 1–3 linhas, o **critério de aceite verificável** e a **classe declarada**.

**O que o fast-lane MANTÉM (inegociável):** branch por mudança → PR → **4 checks de CI verdes**
(`lint-test-build`/`secret-scan`/`smoke-test`/`pre-commit`) → **merge humano (T3/G3)**; tool-guard e
convenções de commit; Harness/Product Review conforme o artefato.

**Reconciliação com os invariantes SDD.** O §1 (Princípio 2), a fase _Build_ (§2) e a autonomia do §3
falam em "Issue SDD aprovada" como unidade de trabalho. A fast-lane **não desloca a aprovação para
antes do build** (isso seria um deadlock temporal — o PR só existe depois do código): ela **dispensa
a aprovação pré-build** e **realoca a aprovação humana inegociável para o gate de merge** (T3/G3). A
via remove a *cerimônia de especificação* e o *pré-gate*, não a revisão nem o merge. Como não há
Issue, a convenção de Git do §6 vira **issue-less** (branch `fast/<slug>`, commits sem `#<nº>`, o
**PR** como unidade de rastreabilidade — `branch → commit → PR → merge`), e a fase _Review_ usa a
**descrição do PR** como substituto da Issue nos checklists (a formalização dos itens *issue-less* de
`docs/agent-reviewer-checklist.md`/`docs/harness-reviewer-checklist.md` fica rastreada em follow-up).
Estes ajustes foram carimbados nos invariantes do `AGENTS.md` (§1/§2/§3/§6/§10/§11.2) e propagados aos
**docs-espelho operacionais** — `docs/architecture/foundations.md` §1.5 (auditoria), `CONTRIBUTING.md`
(branches/commits/PRs), o **PR template**, `docs/observability.md` (correlação) e
`docs/runbooks/github-projects.md` (rastreabilidade) — para nenhum invariante categórico ficar órfão.
Fica de follow-up (#89) só a formalização dos itens *issue-less* dos **checklists de review**
(`agent`/`harness-reviewer-checklist`).

**Fronteira de classe.** A **rota** da via (branch → PR → merge) pressupõe **efeito a integrar** — é de
fato **T1**; um **T0 puro** (leitura) completa sem PR. E **T4 é proibida** (§11): não é `fast` nem
`full`, mas **`blocked`** (recusar e escalar) — o predicado de referência trata T4 antes da seleção.

**Regra de escalação:** qualquer critério de elegibilidade que falhe — **ou** a descoberta, durante a
execução, de que a mudança cruza G1/G2, toca governança ou deixa de ser reversível — **derruba a ação
para o fluxo SDD completo**. Default na dúvida: **`full`** ("na dúvida, sobe de nível", §11).

O predicado de referência (`docs/examples/fast-lane-eligibility.ts`) implementa exatamente esta regra
conjuntiva e é a evidência rodável da decisão.

## Alternativas consideradas
- **Manter tudo no fluxo pesado (status quo):** rejeitada — cerimônia desproporcional em T1
  contradiz ADR-0004 e §7; custo fixo desincentiva correções pequenas.
- **Fast-lane até T2:** rejeitada — T2 já é "médio impacto / mudança de fluxo / dado sensível" e exige
  review por definição (§11); incluí-lo dissolveria a fronteira de risco.
- **Auto-classificar PRs por heurística/label sem gate:** rejeitada (por ora) — mover a *classificação*
  para automação sem revisão reintroduz o risco de misclassificação sem trava humana; fica como
  possível evolução, fora do escopo de T5.1.
- **Dispensar também o merge humano em T1:** rejeitada — **T3/G3 é inegociável**; a via rápida reduz
  cerimônia de *especificação*, nunca a autoridade de *merge*.

## Consequências
- **Positivas:** velocidade proporcional ao risco; menos atrito em docs/ajustes reversíveis; o §11
  passa a ter manifestação de processo, não só de automação; coerência com ADR-0004 e §7.
- **Negativas/riscos + mitigação:**
  - *Afrouxar demais* → elegibilidade conjuntiva/exaustiva + default `full` + T3/G3 preservado.
  - *Misclassificação (T2 disfarçado de T1)* → Harness Review confere a classe; travas objetivas
    (reversibilidade, ≤4 arquivos) no predicado.
  - *Drift de governança* → `touchesGovernance ⇒ full` por construção; editar `AGENTS.md`/ADR nunca
    é fast-lane.
- **Segurança/confiança/observabilidade:** nenhuma ação T2+/sensível entra na via rápida (§10/§11
  preservados); sinal opcional `process.lane` no PR para observabilidade do processo (Data-First,
  sem PII).

## Conformidade
- **Review/CI:** o revisor confirma, para todo PR marcado fast-lane, que os 5 critérios valem e que
  **nenhum** gate (G1/G2/T3) foi contornado; PRs fast-lane que tocarem governança/dado sensível são
  rejeitados e reencaminhados ao fluxo completo.
- **§8.1:** rodar `docs/examples/fast-lane-eligibility.ts` (dois casos: elegível × escala) e anexar o
  output; simular um agente obediente para confirmar que a via rápida não fura gate.
- **Repo-wide:** como altera a **postura da constituição** (§11/§3), a implementação varre os docs
  current-state (`CLAUDE.md`, `README`, `CONTRIBUTING`, `docs/getting-started`, `foundations`) — e, se
  tocar roteamento de fase, os **diagramas Mermaid**.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho deste. -->
