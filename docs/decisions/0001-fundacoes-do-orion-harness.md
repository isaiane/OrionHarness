# ADR-0001 — Fundações do Orion Harness

- **Status:** aceito
- **Data:** 2026-06-15
- **Decisores:** Isa (owner) — aprovação humana nos gates de discovery
- **Relacionado a:** `AGENTS.md`, `docs/architecture/foundations.md`,
  `docs/architecture/ui-agent-harness.md`, `PLAN.md`

> **Atualização (2026-06-24):** os itens **13** (Fundamentos de engenharia) e **15** (Padrões
> AI-First) foram **parcialmente superseded** por
> [ADR-0004](0004-reconciliacao-s7-lean-flat.md): Clean Architecture/Hexagonal e event-driven
> deixam de ser obrigatórios e passam a **opt-in** (postura lean/flat). O texto original abaixo é
> preservado como registro histórico (ADRs são append-only).

## Contexto

O Orion Harness é um template base reutilizável para inicializar projetos desenvolvidos com
agentes de IA, inspirado em **Effective Harnesses for Long-Running Agents**. Antes de construir a
estrutura, foram coletadas e consolidadas decisões fundadoras que governam a evolução de longo
prazo do harness, com o objetivo de reduzir **regressão**, **perda de contexto** e
**inconsistência**. Este ADR registra essas decisões como a base fundadora — futuras alterações a
elas exigem novo ADR (gate G2).

## Decisão

Adotam-se as seguintes fundações:

1. **Escopo & reuso.** Template universal multi-stack, poliglota (presets por stack), distribuído
   como **GitHub template repository**. Projetos-alvo iniciais: web/full-stack, APIs/backend e
   mobile/app.
2. **Arquitetura de agentes.** Híbrida: **orquestrador executando um pipeline de fases**
   `prime → plan → spec → build → review → ship`, com gates de aprovação humana.
3. **Governança.** Aprovação humana em pontos-chave via gates **G0** (contexto), **G1** (plano),
   **G2** (decisão arquitetural/ADR) e **G3** (merge). O agente **propõe**; o humano **aprova**.
4. **Fase 0 (Prime).** Antes de planejar, o agente verifica/constrói **Product Context** e
   **Spec** (`docs/product/`); discovery estruturado quando ausentes/incompletos.
5. **Memória em camadas (L0–L5).** Guardrails, contexto de produto, plano, índice de estado,
   execução (Issues), decisões (ADRs), estado vivo e histórico; índice em `MEMORY.md`. Contexto
   vive em artefatos versionados, não na sessão.
6. **Issues Spec-Driven.** 1 tarefa LEAN = 1 Issue autossuficiente, com contexto, problema,
   objetivo, escopo, fora de escopo, critérios de aceite, dependências, riscos, plano de validação
   e DoD; `PLAN.md` é o mapa de épicos.
7. **Git & tarefas.** Trunk-based com branch por Issue, `main` protegida; Conventional Commits;
   GitHub **Projects + Issues + Milestones**. Release branch como preset opcional.
8. **CI/CD.** Lint + testes + build, scan de segredos/dependências e gates de PR por padrão;
   deploy/release como módulo opcional.
9. **Convenções.** Base universal + presets por linguagem.
10. **Documentação.** Docs-as-code estruturado (Mermaid); site estático opcional.
11. **Observabilidade.** Convenções (logging estruturado + erros + correlação) como base;
    instrumentação (métricas/tracing) opt-in por stack.
12. **Qualidade.** Testes por tarefa + DoD, agente revisor, verificação de regressão, cobertura
    configurável. **Verde não é prova de correção** (§8.1): validar conformidade com spec, regras
    de negócio, decisões arquiteturais, impacto em fluxos e regressões.
13. **Fundamentos de engenharia.** SOLID, Clean Architecture/Hexagonal, DDD, API-First, TDD,
    12-Factor, KISS/YAGNI/DRY — guia obrigatório com rigor proporcional à tarefa.
14. **Segurança por design & modelo de confiança.** AuthN/AuthZ, gestão de segredos, proteção de
    dados, auditoria, rastreabilidade e isolamento entre contextos; ações classificadas T0–T4
    definindo automação vs. aprovação humana.
15. **Padrões AI-First.** Separação de responsabilidades, boundaries de contexto, event-driven,
    workflow orchestration, action system, observabilidade e resiliência/recuperação.
16. **UI Agent Harness** (projetos com interface). Design System como fonte de verdade; UI
    composta só de tokens e componentes aprovados; catálogo (ex.: Storybook) como grounding.
17. **Data-First.** O uso real do produto deve ser observável; nenhuma funcionalidade é
    implementada sem responder, na SPEC, como saberemos que está sendo usada, se gerou o resultado
    esperado e quais eventos/métricas capturar.

## Alternativas consideradas

- **Agente único / pipeline puro** (vs. híbrido): simples ou previsível demais; o híbrido combina
  coordenação com gates auditáveis.
- **Memória só em arquivos** ou **com store externo** (vs. camadas): a primeira não controla
  crescimento; a segunda quebra a portabilidade do template. As camadas equilibram ambos, com store
  externo possível como módulo futuro.
- **GitHub Flow / Git Flow clássico** (vs. trunk-based): mais frouxo ou cerimonioso demais para
  tarefas LEAN dirigidas por agente.
- **Documentação com site estático por padrão** (vs. docs-as-code): overhead desnecessário num
  template universal; fica opcional.

## Consequências

- **Positivas:** contexto preservado e retomável; decisões e segurança auditáveis; consistência
  entre projetos; evolução governada de longo prazo; portabilidade via template.
- **Negativas / custos:** exige disciplina de manutenção dos artefatos e presets; gates adicionam
  latência; a riqueza do processo deve ser aplicada de forma **proporcional** para não pesar em
  projetos pequenos (KISS/YAGNI).

## Conformidade

Verificável pela presença e coerência dos artefatos L0–L5, pelo cumprimento dos gates G0–G3 nos
fluxos, pela classificação de ações no modelo de confiança e pelos checklists de DoD e do agente
revisor. Desvios relevantes devem ser justificados em PR ou registrados como novo ADR.
