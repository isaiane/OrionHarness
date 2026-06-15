# CLAUDE.md

A constituição que rege qualquer agente de IA neste repositório está em **[`AGENTS.md`](AGENTS.md)**.

Leia `AGENTS.md` antes de qualquer trabalho. Em resumo:

- O agente **propõe**; o humano **aprova** nos gates (plano, decisões arquiteturais, merge).
- Toda evolução começa por um **plano incremental** (`PLAN.md`) de tarefas LEAN, que viram
  **Issues Spec-Driven** — a fonte da verdade de contexto e status.
- O contexto vive em **artefatos versionados** (camadas L0–L5), não na janela de sessão.
- Fundamentos de engenharia (SOLID, Clean Architecture, DDD, API-First, TDD, 12-Factor,
  KISS/YAGNI/DRY) são guardrail obrigatório, com rigor proporcional à tarefa.
- Deixe o repositório **verde**: sem merge com CI vermelho, testes falhando ou DoD incompleto.

> Este arquivo é intencionalmente um ponteiro. A fonte única de verdade é `AGENTS.md`.
