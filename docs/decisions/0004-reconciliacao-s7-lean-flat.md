# ADR-0004 — Reconciliação do §7 à postura lean/flat (Effective Harnesses + autonomous-coding)

> Architecture Decision Record (`AGENTS.md` §3, gate G2). ADRs são **append-only**.
>
> **Numeração:** `0004` = próximo livre no repo (a `main` tem `0001–0003`; o `0003` entrou pelo
> PR #19). Os ADRs `0004–0008` do pacote `orion-evolution-proposal/` são conceituais e ainda **não
> commitados**; ao adotá-los, renumere para **0005–0009** para não colidir com este. (O ADR de
> stack, hoje rotulado 0008 no pacote, passa a **0009**.)
>
> **Sobre o stash:** uma tentativa anterior de redesign "lean" existiu como WIP **não commitado**
> e foi **descartada** por decisão do projeto. Este ADR **não a restaura nem a adapta** — ele
> **re-deriva a decisão do zero**, justificada pelos princípios atuais. O stash é citado apenas
> como contexto histórico.

- **Status:** aceito
- **Data:** 2026-06-24
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** `AGENTS.md` §7; `docs/architecture/foundations.md` §2.1/§2.2;
  `docs/agent-reviewer-checklist.md`; Issue SDD da T1.3 (#23); ADR de stack Node/TS (ainda não
  commitado — referência a corrigir quando entrar); **ADR-0001** (supersede parcialmente os itens
  13 e 15 — Clean Arch/Hexagonal e event-driven deixam de ser obrigatórios); épico **O1**
  (coerência dos guardrails);
  _Effective Harnesses for Long-Running Agents_; benchmark `anthropics/claude-quickstarts/autonomous-coding`

## Contexto

O `AGENTS.md §7` **commitado na `main`** prescreve, como guardrail **obrigatório**, *"SOLID,
**Clean Architecture / Hexagonal**, DDD, API-First, TDD, 12-Factor, KISS/YAGNI/DRY"*, com Clean
Architecture/Hexagonal como **default**. Essa postura é **incoerente com a direção arquitetural do
projeto**, ancorada em:

- **Effective Harnesses for Long-Running Agents** — agentes degradam quando o contexto infla;
  estrutura simples, navegável e **eficiente em contexto** é pré-requisito de confiabilidade ao
  longo de muitas janelas.
- **Benchmark `autonomous-coding`** — implementação de referência deliberadamente **minimalista e
  flat** (poucas centenas de linhas, sem camadas rituais).

Camadas físicas obrigatórias (ports/DTOs/mappers para CRUD), abstração preventiva e DI opaca
aumentam custo de contexto/tokens, latência e risco de alucinação, e quebram a **rastreabilidade
estática** que o agente usa para navegar o código. É uma contradição **ativa** entre o que a
constituição prega e o norte que o projeto adotou — daí ser tratada como **tarefa de coerência da
O1/fundações**.

## Decisão

Adotar **design lean, flat e modular como padrão**, com **abstração conquistada, não prevista**,
justificado por Effective Harnesses e pelo `autonomous-coding`:

1. **Reclassificar** Clean Architecture/Hexagonal e event-driven de **obrigatórios** para
   **opt-in com justificativa documentada** (Issue/ADR). Default = **encapsulamento simples e
   direto** (esconder ORM/clientes atrás de métodos limpos do módulo).
2. **Design flat — regra das 3 responsabilidades:** uma feature/fluxo cabe em **≤3 arquivos**
   (Entrada/Transporte · Lógica de negócio · Persistência/Infra), sem camadas rituais.
3. **Anti-overengineering:** sem interface para implementação única; **port só com ≥2
   implementações reais** ou troca contratada; nada de CQRS/Event Sourcing/Saga/ACL sem **dor
   documentada**.
4. **Guardrail dos 3–4 arquivos:** mudança que se espalha além disso faz o agente **parar** e
   propor um *vertical slice* — eficiência de contexto como princípio operacional.
5. **Preservar** DDD estratégico no nível de pastas (bounded contexts isolados; sem importação
   cruzada sem contrato) e **linguagem ubíqua** rigorosa.
6. **Manter** SOLID, API-First, TDD, 12-Factor e KISS/YAGNI/DRY como guardrails; **muda apenas** o
   status de Clean Architecture/Hexagonal/event-driven (default → opt-in).

### Amendments de implementação (sem restaurar nada do stash)

- Reescrever `AGENTS.md §7` na postura lean/flat acima.
- Ajustar `foundations.md` §2.1 (encapsulamento-first) e §2.2 (event-driven opt-in).
- Atualizar o bloco de princípios do `docs/agent-reviewer-checklist.md` (guardrail dos 3–4
  arquivos; ausência de abstração preventiva).
- **Referência pendente do ADR de stack** (hoje "ADR-0003 (lean/flat)", inexistente): como o ADR de
  stack **ainda não está commitado** neste repo, não há arquivo a corrigir agora. Quando ele
  entrar, deve apontar para **este ADR-0004** — não para o inexistente "ADR-0003 (lean)".
- (Opcional) criar um `docs/engineering-tactics.md` **novo** com o detalhe operacional, se útil —
  redigido do zero, não copiado do stash.

## Alternativas consideradas

- **Manter Clean Architecture/Hexagonal como default:** rejeitada — contradiz o norte (Effective
  Harnesses/benchmark) e infla contexto/latência.
- **Restaurar/adaptar o redesign do stash:** rejeitada por decisão do projeto — o stash é contexto
  histórico, não fonte de verdade.
- **Remover DDD/arquitetura por completo:** rejeitada — perderíamos DDD estratégico, API-First e
  isolamento por contexto, que seguem valiosos.

## Consequências

- **Positivas:** constituição alinhada ao norte; menos cerimônia/tokens/latência; código navegável
  e refatorável pela IA; coerência com a stack Node/TS (tipos fortes nas fronteiras) e com as ondas
  runnable (O2–O4).
- **Negativas / riscos:** perde-se a troca-plug "de fábrica" de ports & adapters. Mitigação:
  **contratos tipados fortes** nas fronteiras (TS/Zod) + testes na superfície pública + regra das
  **≥2 implementações**. Risco de subabstrair um caso que pedia port — mitigado pela mesma regra e
  pelo review.
- **Supersessão:** **supersede parcialmente o ADR-0001** (itens 13 e 15), que fixaram Clean
  Architecture/Hexagonal e event-driven como **obrigatórios**; ambos passam a **opt-in**. O
  restante do ADR-0001 segue vigente. O ADR-0001 recebe anotação de supersessão no cabeçalho
  (append-only — sem editar o corpo histórico).

## Conformidade

Verificável no review: `§7` reescrito reflete lean/flat (Clean Arch/Hexagonal/event-driven como
opt-in); reviewer-checklist cobre o guardrail dos 3–4 arquivos e a ausência de abstração preventiva;
quando o ADR de stack for commitado, ele referencia **este** ADR; **nenhuma** referência ao
inexistente "ADR-0003 (lean)"; qualquer port/event-driven introduzido é justificado no PR.
