# [SDD] TX.Y — <título acionável>

> Issue Spec-Driven (AGENTS.md §5). Épico **OX**. Tarefa LEAN. Classe de confiança **T?** · Gate **G?**.
>
> **Promovida de:** Milestone #M (`"<título do épico aprovado no G1>"`) — `<texto da tarefa promovida: o
> item `- [ ] …` do épico que virou esta Issue>`. (Proveniência **ADR-0026**: registra o snapshot do G1 —
> o **título** e a **tarefa** — para preservá-lo mesmo se o Milestone for renomeado depois.)

## 1. Contexto
## 2. Problema / Oportunidade
## 3. Objetivo  <!-- mensurável -->
## 4. Escopo
## 5. Fora de escopo
## 6. Critérios de aceite
- [ ] <condição verificável>
## 7. Dependências
## 8. Riscos  <!-- + mitigação -->
## 9. Plano de validação
## Data-First (§9.1)
- Como saberemos que está em uso? / que gerou o resultado? / eventos-métricas?
## Classe de confiança (§11)
**T?** — <justificativa; o que exige humano>
## 10. Definition of Done (§12)
- [ ] Critérios de aceite (§6) provados por **testes da tarefa + suíte de regressão** (SEMPRE); **E2E com
      ferramenta real só quando** houver superfície observável de risco (§8.2 / ADR-0009) — a condicional é
      do E2E, não dos testes.
- [ ] **§8.1 verificada por completo:** conformidade com **spec/regras/ADRs e fluxos dependentes**;
      artefatos runnable **rodados e a saída lida**; varredura repo-wide por contradições em mudança de postura.
- [ ] Princípios §7 respeitados (lean/flat). **Se passar de 3–4 arquivos: parar e fatiar** (vertical slice
      registrado no G1) — **não** abrir uma Issue grande.
- [ ] **Quando aplicável**, docs e **ADR (se G2) aceito** atualizados **no mesmo PR** (gatilho D2) — sem
      re-espelhar (aponta, não reafirma). Sem mudança de contrato/comportamento, não força churn.
- [ ] Data-First (§9.1): estratégia de sinal definida **e a instrumentação implementada** quando o
      evento/métrica **faz parte da entrega** (não basta prever).
- [ ] `STATE.md` **roteado** (só ponteiro — história→PR mergeado, `CHANGELOG.md` stub).
- [ ] **Classe de confiança declarada (`T?`) confirmada e o gate correspondente cumprido**; review
      independente; **merge feito pelo humano** (T3/G3), com CI verde.
