# ADR-0008 — Separação dos processos de revisão: Harness Review vs Product Review

> **Numeração (repo):** próximo livre após o #36 (ADR-0007). Confirmar **0008** no estado mergeado.

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

1. **Harness Review (revisão de instruções)** — objeto: regras/guardrails/fluxos (camada **L0**:
   `AGENTS.md`, `foundations.md`, ADRs, pipeline, gates, checklists, runbooks de processo). Valida a
   **qualidade das instruções** *antes da adoção*, **simulando um agente que as seguirá ao pé da
   letra** para achar ambiguidade, inconsistência, contradição entre seções, deadlock de gate e
   efeito indesejado. Checklist: `docs/harness-reviewer-checklist.md` (novo).
2. **Product Review (revisão de produto)** — objeto: artefatos do agente executor (código, testes,
   config). Valida **conformidade com Spec/ADR/regras de negócio, qualidade e regressões**.
   Checklist: `docs/agent-reviewer-checklist.md` (atual).

**Regra de seleção (na fase _Review_):**
- PR toca **L0/governança** → **Harness Review**.
- PR toca **código/testes/config de produto** → **Product Review**.
- PR toca **ambos** → **ambas**, cada uma escopada à sua parte.

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
