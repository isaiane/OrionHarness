# Checklist do Revisor de Harness (revisão de instruções)

> Para PRs que mudam **artefatos de governança/instrução** (constituição, ADRs, pipeline/gates,
> checklists, runbooks de processo) — a **lista canônica** vive em `AGENTS.md` §2, fase _Review_.
> **Qualquer PR com deltas de memória/estado roda a seção 8** (escopo reduzido) **e a seção 9**
> (ritual): no PR só-de-memória rodam a §8 + §9; no PR misto, **em complemento** ao processo
> selecionado. A **§9 (ritual de get-bearings) roda em toda rota**, para todo PR de tarefa.
> Decisão fundadora: ADR-0008. **Objeto:** as regras. **Pergunta-mãe:** *se um agente seguir estas
> instruções ao pé da letra, elas são inequívocas, consistentes e sem efeito indesejado?*
> **Revisor independente do autor** (idealmente agente/modelo distinto ou revisor automático).

## 1. Simulação do agente obediente
- [ ] Para **cada regra nova/alterada**, siga-a literalmente e descreva o comportamento resultante.
- [ ] Esse comportamento é **inequívoco** (uma única interpretação razoável)?
- [ ] Produz algum **efeito indesejado** ou caminho que viola a intenção?

## 2. Coerência de pipeline (3 representações)
- [ ] **Enumerações** da sequência (`prime → … → ship`) atualizadas em todos os docs current-state.
- [ ] **Roteamento entre fases** — o "prossiga para X" de cada fase reflete a mudança (não contorna
      a fase nova).
- [ ] **Diagramas (Mermaid/visual)** — abrir cada bloco `mermaid` e conferir nós/arestas.

## 3. Coerência de governança (não furar gate)
- [ ] O mecanismo/instrução **executa dentro do fluxo SDD**, sem escrever/commitar antes de Issue
      aprovada (§1, princípio 2 / §6), sem merge autônomo em `main` (T3), sem decisão estrutural sem ADR (G2),
      sem acesso a dado sensível sem autorização (§10/§11).

## 4. Ordem pipeline × gates (deadlock)
- [ ] Nenhuma fase passa a **exigir um artefato/aprovação que só uma fase posterior cria**.

## 5. Artefatos vivos
- [ ] Todo artefato que cresce/atualiza (ledger e afins) tem **gatilho/owner/quando** explícito —
      não só o princípio.

## 6. ADRs e histórico
- [ ] Numeração = próximo livre; **append-only** (supersede via ADR novo + nota, sem reescrever o
      histórico); distinguir **current-state** (corrigir) de **histórico/point-in-time** (não tocar).

## 7. Conflito repo-wide
- [ ] A instrução nova **não contradiz** outra seção (varredura repo-wide, incl. `CLAUDE.md`,
      `README`, `foundations`, docs de convenção).

## 8. Escopo reduzido — deltas de memória/estado
> Para **qualquer PR** cujo diff inclua memória/estado (`PLAN.md`, `docs/plans/`, `STATE.md`,
> `CHANGELOG.md`, `MEMORY.md`, deltas do ledger — `AGENTS.md` §2). PR **só** de memória/estado:
> rode esta seção **e a §9** (não há regra nova a simular, mas o ritual vale para todo PR de tarefa).
> PR **misto**: rode esta seção (escopada aos artefatos de estado) **além** do processo selecionado
> (Harness 1–7 e/ou Product Review) — e a **§9** roda **sempre**, em qualquer rota.
- [ ] **Sem contradição entre artefatos de estado** — `STATE.md` × `PLAN.md` × `docs/plans/`
      **alterados no PR** × `CHANGELOG.md` × `MEMORY.md` contam a mesma história (fase, épico
      ativo, última conclusão, detalhe do épico).
- [ ] **Delta do ledger consistente** — entradas novas/alteradas apontam para a **Issue certa** e
      não contradizem `STATE.md`/`PLAN.md` (o `ledger-guard` só valida append-only e transições de
      `passes`, não a semântica).
- [ ] **Sem regressão de escopo** — nenhuma conclusão, decisão ou pendência registrada some ou muda
      de sentido na edição.
- [ ] **Ponteiros válidos** — links, Issues, ADRs e caminhos citados existem e são **versionados**
      (nada de caminhos efêmeros/ignorados pelo git).

## 9. Ritual de início de sessão (get-bearings)
> Aplica-se a **todo PR de tarefa** (independe de haver delta de estado): o ritual do
> [`getting-started.md`](getting-started.md) §7 vale para **qualquer** sessão de trabalho — inclusive
> mudanças de harness, que roteiam só para cá. Mesmo check do Product Review, para que a regra seja
> **enforceável nos dois caminhos** (ADR-0008).
- [ ] **Ritual de get-bearings** seguido pelo implementador: bearings pegos (`STATE.md`/ledger/
      `git log`) e **regressão core** rodada **antes** de implementar (§8.1 como ritmo;
      `docs/getting-started.md` §7).

## 10. Re-review do revisor automatizado (Codex)
> Vale em **toda rota** (mesmo check do Product Review, higiene de entrega).
- [ ] Se um revisor automatizado (Codex) deixou achados e o fix foi aplicado, o autor **respondeu
      inline** apontando o commit **e** solicitou novo review (`@codex review`) — `CONTRIBUTING.md` §6.

---
**Na dúvida sobre ambiguidade ou efeito de uma regra, escale ao humano (G2) em vez de aprovar.**
