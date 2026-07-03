# ADR-0008 — Separação dos processos de revisão: Harness Review vs Product Review

> **Numeração (repo):** a `main` tem ADRs `0001–0007`, então este é o **0008**.

- **Status:** aceito
- **Data:** 2026-06-29
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** `AGENTS.md` §2 (fase Review), §8/§8.1 (qualidade/verificação), §11 (confiança);
  `docs/agent-reviewer-checklist.md`; lição empírica do PR #36 (Codex vs `/code-review`)

## Contexto
O harness é, ao mesmo tempo, um **conjunto de regras** e um **gerador de produtos** que seguem
essas regras. Hoje existe **um** processo de review (a fase _Review_ + `agent-reviewer-checklist.md`),
desenhado para **produto** (conformidade com Spec, regressão, princípios). Quando se **muda o harness**
(constituição/ADR/pipeline/gates), esse processo é o objeto errado: a pergunta não é "o código
conforma?", e sim "**estas instruções, seguidas por um agente, são inequívocas e sem
contradição/deadlock/efeito indesejado?**". No #36 isso ficou explícito — o `/code-review` (postura de
produto) validou a coerência do diff, mas os furos de **governança, roteamento, deadlock de gate e
diagrama** só foram pegos por um revisor independente com postura de **simular o agente obediente**
(Codex).

## Decisão
Adotar **dois processos de revisão distintos**, selecionados pelo **tipo de artefato alterado**:

1. **Harness Review (revisão de instruções)** — objeto: **artefatos de governança/instrução**:
   `AGENTS.md`, `CLAUDE.md`, `docs/architecture/foundations.md`, ADRs (`docs/decisions/`), definição
   de pipeline/gates, checklists de review, runbooks de **processo** e demais documentos que
   descrevem o próprio harness (índices/guias de reuso — ex.: `docs/README.md`). Valida a **qualidade
   das instruções** *antes da adoção*, **simulando um agente que as seguirá ao pé da letra** para achar
   ambiguidade, inconsistência, contradição entre seções, deadlock de gate e efeito indesejado.
   Checklist: `docs/harness-reviewer-checklist.md` (novo).
2. **Product Review (revisão de produto)** — objeto: **artefatos de produto**: código, testes e
   config do agente executor, **e** os documentos de produto de `docs/product/` (product-context,
   spec, discovery — camada L0.5). Valida **conformidade com Spec/ADR/regras de negócio, qualidade
   e regressões**. Checklist: `docs/agent-reviewer-checklist.md` (atual).

**Regra de seleção (na fase _Review_, por artefato, sem gaps):**
- PR toca **artefatos de governança/instrução** (lista do item 1) → **Harness Review**.
- PR toca **artefatos de produto** (código/testes/config ou `docs/product/`) → **Product Review**.
- PR toca **ambos** → **ambas**, cada uma escopada à sua parte.
- Artefatos de **memória/estado** (`PLAN.md`, `docs/plans/`, `STATE.md`, `CHANGELOG.md`,
  `MEMORY.md`, deltas do ledger) **acompanham** a revisão do PR — não selecionam processo por si
  sós. **PR só-de-memória**
  (sem governança nem produto) usa **Harness Review em escopo reduzido** (coerência do estado),
  para não ficar órfão de revisão; em **PR misto**, o escopo reduzido roda **em complemento** ao
  processo selecionado, escopado aos artefatos de estado.
- **Desempate pela função, não pelo formato:** artefato que **instrui ou gateia o processo**, mesmo
  executável (ex.: workflow de CI que implementa um gate), é governança/instrução; artefato que
  **implementa o produto** é produto. Na dúvida, escalar ao humano (G2).

**Independência (obrigatória nos dois):** o revisor é **independente do autor** (agente/modelo
distinto, ou revisor automático — ex.: Codex). O autor compartilha os pontos cegos do próprio
trabalho; a independência é o que faz a revisão valer (lição #36).

## Alternativas consideradas
- **Manter um único processo/checklist:** rejeitada — foi a causa de o #36 precisar de 5 rodadas de
  achados que o review de produto não enxergou.
- **Sempre rodar os dois em todo PR:** rejeitada por proporcionalidade (ADR-0004) — seleciona-se pelo
  tipo de artefato; produto consumidor quase sempre roda só Product Review.

## Consequências
- **Positivas:** mudanças no harness passam a ser validadas como **instruções** (a postura que pega
  os furos de governança); produto segue com review de conformidade; independência reduz pontos
  cegos. Esclarece o papel meta do repo enquanto ele se constrói.
- **Negativas/riscos:** um segundo checklist para manter; risco de dúvida na seleção — mitigado pela
  regra explícita e pelo caso "ambos". Este próprio ADR é uma mudança de harness → deve passar por
  **Harness Review** antes do merge.

## Conformidade
Verificável: a fase _Review_ em `AGENTS.md §2` distingue os dois processos e a regra de seleção;
existe `docs/harness-reviewer-checklist.md`; ambos exigem revisor independente do autor; um PR que
muda L0 traz evidência de Harness Review (simulação do agente obediente + as varreduras).
