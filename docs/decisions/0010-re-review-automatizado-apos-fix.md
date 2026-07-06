# ADR-0010 — Re-review do revisor automatizado (Codex) após aplicar fix

> **Numeração (repo):** a `main` tem ADRs `0001–0009`, então este é o **0010**.

- **Status:** proposto
- **Data:** 2026-07-06
- **Decisores:** Isa (owner) — aprovação humana pendente (gate G2)
- **Relacionado a:** `AGENTS.md` §2 (fase Review), §3 (gates/G2); `CONTRIBUTING.md` §6;
  `docs/agent-reviewer-checklist.md` §7; `docs/harness-reviewer-checklist.md` §10;
  [ADR-0008](0008-separacao-revisao-harness-vs-produto.md) (revisor independente); Issue #55

## Contexto
O projeto usa um **revisor automatizado independente** (Codex) na fase _Review_ (ADR-0008). Neste
repo, o Codex **só reavalia um PR quando acionado por comentário** (`@codex review`) — ele não
dispara sozinho a cada push. Sem uma convenção, o ciclo **revisar → corrigir → re-revisar** depende
de alguém lembrar de pedir o re-review a cada rodada, e fixes ficam sem confirmação do revisor.

O owner pediu que **solicitar o re-review vire padrão do projeto**. Como isso é uma **escolha de
processo/governança** — muda o fluxo de Review para humanos e agentes —, o `AGENTS.md §3` exige que
seja **registrada em `docs/decisions/` e aprovada no G2** (mesmo padrão de ADR-0002 para labels,
ADR-0003 para enforcement do G3 e ADR-0008 para o split de review). Registrá-la apenas como
convenção "sem ADR" contradizia o §3 — corrigido por este ADR (achado do review do Codex no PR #56).

## Decisão
Adotaremos como **padrão do projeto**: quando um **revisor automatizado** (Codex) deixa achados num
PR e o autor **aplica o fix** (commit + push na branch do PR), o autor, **por padrão**:

1. **Responde inline** ao(s) comentário(s) do revisor apontando o **commit** do fix; e
2. **Solicita novo review** comentando `@codex review` no PR — **sem esperar** pedido do humano.

**Não dispensa o review humano** nem os gates: a aprovação final e o merge continuam sendo do humano
(G3/T3), e decisões que cruzem G1/G2 seguem escalando. A convenção é **operacional** (higiene de
entrega da fase Review), aplica-se a **humanos e agentes**, e vale em ambas as rotas de review
(Harness e Product, ADR-0008).

**Amarração.** A regra vive em [`CONTRIBUTING.md`](../../CONTRIBUTING.md) §6 (fluxo de Review), com
check correspondente nos dois checklists: `docs/agent-reviewer-checklist.md` §7 (higiene de entrega)
e `docs/harness-reviewer-checklist.md` §10.

## Alternativas consideradas
- **Convenção "sem ADR" (proporcionalidade, ADR-0004):** rejeitada — o ADR-0004 trata de rigor de
  **design/arquitetura**, não de dispensar ADR para decisões de **governança**; e o precedente do
  repo registra toda escolha de processo comparável em ADR. Deixar "sem ADR" criava instrução de
  governança contraditória com o §3.
- **Automação por workflow (GitHub Action que comenta `@codex review` no push):** rejeitada nesta
  rodada por proporcionalidade e superfície — risco de disparo em hora errada e mais infra a manter.
  Pode ser reconsiderada num ADR futuro se a convenção documentada não bastar.
- **Rebaixar para "prática recomendada" (não-padrão):** rejeitada — contraria a intenção de que seja
  padrão do projeto, aplicável a agentes de forma enforceável.

## Consequências
- **Positivas:** o ciclo revisar→corrigir→re-revisar fecha sem depender de memória; o padrão fica
  **versionado e enforceável** (checklists) para humanos e agentes; coerente com o §3 e o precedente.
- **Negativas/riscos:** acoplamento a um revisor específico (Codex) — mitigado por o texto tratar de
  "revisor automatizado" em geral; ruído de re-reviews em PRs muito iterativos — mitigado por ser
  higiene de entrega, não gate. Este ADR é **mudança de harness** → passa por **Harness Review**.

## Conformidade
Verificável: (1) `CONTRIBUTING.md` §6 descreve a convenção do re-review após fix; (2) os dois
reviewer-checklists têm o check correspondente apontando o §6; (3) em PRs com revisor automatizado, o
histórico mostra resposta inline ao achado + `@codex review` após o fix; (4) o merge segue exigindo
review humano (G3).
