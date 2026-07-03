# Checklist do Revisor de Harness (revisão de instruções)

> Para PRs que mudam **artefatos de governança/instrução** (constituição, ADRs, pipeline/gates,
> checklists, runbooks de processo) — a **lista canônica** vive em `AGENTS.md` §2, fase _Review_.
> PR **só de memória/estado** → rode **apenas a seção 8** (escopo reduzido).
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

## 8. Escopo reduzido — PR só de memória/estado
> Para PR que toca **apenas** memória/estado (`PLAN.md`, `docs/plans/`, `STATE.md`, `CHANGELOG.md`,
> `MEMORY.md`, deltas do ledger — `AGENTS.md` §2). Não há regra nova a simular: **rode só os itens
> abaixo**, no lugar das seções 1–7.
- [ ] **Sem contradição entre artefatos de estado** — `STATE.md` × `PLAN.md` × `docs/plans/`
      **alterados no PR** × `CHANGELOG.md` × `MEMORY.md` contam a mesma história (fase, épico
      ativo, última conclusão, detalhe do épico).
- [ ] **Sem regressão de escopo** — nenhuma conclusão, decisão ou pendência registrada some ou muda
      de sentido na edição.
- [ ] **Ponteiros válidos** — links, Issues, ADRs e caminhos citados existem e são **versionados**
      (nada de caminhos efêmeros/ignorados pelo git).

---
**Na dúvida sobre ambiguidade ou efeito de uma regra, escale ao humano (G2) em vez de aprovar.**
