# Checklist do Agente Revisor (Product Review)

> **Product Review** — revisão de **produto** (código, testes, config), um dos dois processos da
> fase _Review_ (ADR-0008). Para mudanças de **governança/instruções** (constituição/ADRs/pipeline/gates/checklists), use o
> [`harness-reviewer-checklist.md`](harness-reviewer-checklist.md); PR que toca **ambos** passa
> pelas **duas** revisões, cada uma escopada à sua parte.
>
> Fase **Review** do pipeline (`AGENTS.md` §2). O agente revisor age com **olhar independente** do
> implementador, **antes** do review humano. Sua função é caçar regressões silenciosas e desvios
> de domínio — não apenas confirmar que "compila e passa nos testes" (§8.1). Resultado: um
> relatório anexado ao PR (aprovar / solicitar mudanças / escalar ao humano).

## 1. Conformidade (verificação de correção — §8.1)

- [ ] Implementação corresponde à **Spec aprovada** (Issue SDD: objetivo, escopo, critérios de aceite).
- [ ] Respeita as **regras de negócio** conhecidas (`docs/product/product-context.md`).
- [ ] Respeita as **decisões arquiteturais** registradas (`docs/decisions/`).
- [ ] **Nada fora de escopo** foi introduzido (ver "Fora de escopo" da Issue).
- [ ] **Mudança de postura da constituição** (ex.: `AGENTS.md` §7) → **varredura repo-wide** por
      afirmações da postura antiga (incl. arquivos-resumo `CLAUDE.md`/`README` e os de convenção em
      `docs/`), não só as seções editadas. ADRs ficam como **histórico** (append-only, anotados com
      supersessão).

## 2. Impacto e regressão

- [ ] **Impacto em fluxos existentes** avaliado (quem mais depende deste código?).
- [ ] **Regressões funcionais não cobertas por testes** consideradas; testes adicionados quando preciso.
- [ ] Bug corrigido tem **teste de regressão** correspondente.

## 3. Princípios de engenharia (§7 lean/flat, proporcional)

- [ ] **Lean/flat por padrão:** encapsulamento simples (ORM/I/O atrás de métodos do módulo); **sem
      abstração preventiva** (sem interface para implementação única; **port só com ≥2
      implementações** reais ou troca contratada).
- [ ] **Guardrail dos 3–4 arquivos:** a mudança não se espalha além de 3–4 arquivos sem um *vertical
      slice* (regra das 3 responsabilidades: entrada · lógica · persistência).
- [ ] **Opt-in justificado:** qualquer Clean Architecture/Hexagonal, event-driven, CQRS/ES/Saga/ACL
      ou novo port introduzido está **justificado** no PR (necessidade real em Issue/ADR).
- [ ] SOLID aplicado; DDD **estratégico**: linguagem ubíqua consistente; fronteiras de contexto
      respeitadas (sem importação cruzada sem contrato).
- [ ] API-First: contratos definidos/atualizados antes da implementação.
- [ ] KISS/YAGNI/DRY: sem over-engineering nem duplicação desnecessária.
- [ ] Desvios relevantes estão **justificados** no PR.

## 4. Segurança e modelo de confiança (§10, §11)

- [ ] **Classe de confiança** correta; ações T2+ com o gate cumprido; T3 com G3 explícito.
- [ ] Sem **segredos** no diff; segredos por env/secret manager.
- [ ] AuthN/AuthZ na fronteira das ações; menor privilégio.
- [ ] Dados sensíveis protegidos; **sem PII** em logs/métricas/memória versionada.
- [ ] Ações com efeito colateral são **auditáveis** e rastreáveis.

## 5. Observabilidade (Data-First — §9.1)

- [ ] Para funcionalidades: instrumentação de **uso** e de **resultado** conforme a Spec.
- [ ] Logging estruturado e tratamento de erros adequados; sem falha silenciosa.

## 6. UI (apenas projetos com interface — §11.1)

- [ ] UI composta **somente** de componentes aprovados e **Design Tokens** (sem valores hardcoded).
- [ ] Nenhum componente/variante novo fora do Design System sem aprovação (G2).
- [ ] Interface **rastreável** aos componentes/tokens do Design System.

## 7. Higiene de entrega

- [ ] Commits seguem Conventional Commits; PR escopado a uma Issue.
- [ ] CI verde (lint/test/build + secret-scan).
- [ ] `STATE.md` / `CHANGELOG.md` atualizados quando aplicável.
- [ ] **DoD global (§12)** cumprido.

---

**Na dúvida sobre domínio ou comportamento esperado, o revisor escala ao humano em vez de aprovar
(fail secure).**
