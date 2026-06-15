# Checklist do Agente Revisor

> Fase **Review** do pipeline (`AGENTS.md` §2). O agente revisor age com **olhar independente** do
> implementador, **antes** do review humano. Sua função é caçar regressões silenciosas e desvios
> de domínio — não apenas confirmar que "compila e passa nos testes" (§8.1). Resultado: um
> relatório anexado ao PR (aprovar / solicitar mudanças / escalar ao humano).

## 1. Conformidade (verificação de correção — §8.1)

- [ ] Implementação corresponde à **Spec aprovada** (Issue SDD: objetivo, escopo, critérios de aceite).
- [ ] Respeita as **regras de negócio** conhecidas (`docs/product/product-context.md`).
- [ ] Respeita as **decisões arquiteturais** registradas (`docs/decisions/`).
- [ ] **Nada fora de escopo** foi introduzido (ver "Fora de escopo" da Issue).

## 2. Impacto e regressão

- [ ] **Impacto em fluxos existentes** avaliado (quem mais depende deste código?).
- [ ] **Regressões funcionais não cobertas por testes** consideradas; testes adicionados quando preciso.
- [ ] Bug corrigido tem **teste de regressão** correspondente.

## 3. Princípios de engenharia (§7, proporcional)

- [ ] SOLID / Clean Architecture: domínio isolado de frameworks e I/O; dependências apontam para dentro.
- [ ] DDD: linguagem ubíqua consistente; fronteiras de contexto respeitadas.
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
