# [SDD] TX.Y — <título acionável>

> Issue Spec-Driven (AGENTS.md §5). Épico **OX**. Tarefa LEAN. Classe de confiança **T?** · Gate **G?**.
>
> **Promovida de:** Milestone #M — `<texto da tarefa promovida: o item `- [ ] …` do épico que virou esta
> Issue>`. (Proveniência: a fonte do plano é o **Milestone**; esta Issue é a **promoção** de uma de suas
> tarefas no G1 — ADR-0026.)

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
- [ ] Critérios de aceite (§6) provados — regressão/testes onde há superfície observável de risco.
- [ ] §8.1 verificada: artefatos runnable **rodados e a saída lida** (rodar não basta).
- [ ] Princípios §7 respeitados (lean/flat; guardrail dos 3–4 arquivos, ou vertical slice registrado no G1).
- [ ] Docs atualizados **no mesmo PR** (gatilho D2) — sem re-espelhar; a skill/prosa aponta, não reafirma.
- [ ] Data-First (§9.1): o sinal de uso/observabilidade está previsto.
- [ ] ADR (se G2) aceito; `STATE.md` **roteado** (só ponteiro — história→PR mergeado, `CHANGELOG.md` stub).
- [ ] Review independente; **merge feito pelo humano** (T3/G3), com CI verde.
