# [SDD] TX.Y — <título acionável>

> Issue Spec-Driven (AGENTS.md §5). Épico **OX**. Tarefa LEAN. Classe de confiança **T?** · Gate **G?**.
>
> **Promovida de:** _(só quando promovida de um Milestone — **deixe vazio** para Issues de bootstrap ou
> follow-up, que nascem fora do fluxo Plan→Spec; o `sdd-task.yml` permite vazio)_ Milestone #M
> (`"<título do épico aprovado no G1>"`) — `"<n>. <nome da tarefa>"` (o **identificador estável** = ordinal
> + nome, **sem** o `###` — ADR-0031 §2), com o **snapshot do bloco de design aprovado** (os 5 campos —
> Necessidade/Escopo/Forma dos critérios/Classe/Dependências — **e o `## Objetivo` do épico** vigente no G1;
> o `###` aparece só dentro do snapshot copiado, não no identificador).
> (Proveniência **ADR-0031 §2**: o snapshot no corpo torna o aprovado **distinguível de edições posteriores**
> — qualquer mudança material do bloco/objetivo/título do épico é **mudança de plano → re-G1**. Supersede a
> proveniência só-título+tarefa do ADR-0026.)

<!-- Snapshot do bloco aprovado no G1 — só quando promovida de um Milestone; COPIE VERBATIM do Milestone
     (não normalize) e substitua o esqueleto abaixo. Apague este bloco se a Issue não for promovida. -->

```text
## Objetivo
<cole o ## Objetivo do épico, verbatim>

### <n>. <nome da tarefa>
**Necessidade.** …
**Escopo.** …
**Forma dos critérios.** …
**Classe** T? / G?
**Dependências.** …
```

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
      ferramenta real** quando houver superfície observável de risco (§8.1 / ADR-0009) — a condicional é do
      E2E, não dos testes. **Se pular o E2E, registre no PR a justificativa** (waiver: por que não há risco).
- [ ] **§8.1 verificada por completo:** conformidade com **spec/regras/ADRs e fluxos dependentes**;
      artefatos runnable **rodados e a saída lida**; varredura repo-wide por contradições em mudança de postura.
- [ ] Princípios §7 respeitados (lean/flat). **Se passar de 3–4 arquivos: parar e fatiar** (vertical slice
      registrado no G1) — **não** abrir uma Issue grande.
- [ ] **Quando aplicável**, docs e **ADR (se G2) aceito** atualizados **no mesmo PR** (gatilho D2) — sem
      re-espelhar (aponta, não reafirma). Sem mudança de contrato/comportamento, não força churn.
- [ ] Data-First (§9.1): estratégia de sinal definida **e a instrumentação implementada** quando o
      evento/métrica **faz parte da entrega** (não basta prever).
- [ ] **Critérios projetados no `feature-ledger.json`** (`passes:false`, born-red) quando a Issue é
      `type:task` full-lane — a entrada nasce `false` no PR da entrega; o flip `false→true` é follow-up
      pós-merge (o guard proíbe nascer `true`).
- [ ] `STATE.md` **roteado** (só ponteiro — história→PR mergeado, `CHANGELOG.md` stub).
- [ ] **Classe de confiança declarada (`T?`) confirmada e o gate correspondente cumprido**; review
      independente; **merge feito pelo humano** (T3/G3), com CI verde.
