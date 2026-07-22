<!-- PR pequeno, escopado a UMA Issue SDD (AGENTS.md §6).
     FAST-LANE (T1 issue-less — §11.2/ADR-0017): não há Issue. Apague o "Closes #<nº>", preencha o
     "Critério de aceite (fast-lane)" abaixo, declare `Classe: T1` e **`Lane: fast`** (obrigatório na
     via — o default é `full`; sem isso a métrica misclassifica), e marque os itens que dependem da
     Issue como "N/A (fast-lane)". A via mantém CI verde + merge humano (T3/G3); qualquer critério que
     caia → fluxo completo. -->

## Issue relacionada

Closes #<nº> <!-- fast-lane: apague esta linha (PR issue-less é a unidade de rastreabilidade) -->

<!-- FAST-LANE apenas — o contrato verificável que substitui a Issue (o revisor avalia por ele): -->
## Critério de aceite (fast-lane)

_Só na fast-lane issue-less: **critério verificável** que substitui a Issue + **classe declarada** (T1). Apague esta seção se o PR tem Issue._

## O que foi feito

_Resumo objetivo da mudança._

## Como foi validado

_Plano de validação executado: testes, checagens, evidências._

## Verificação de correção (AGENTS.md §8.1)

- [ ] Conforme a Spec aprovada (Issue SDD / `docs/product/`)
- [ ] Conforme as regras de negócio conhecidas
- [ ] Conforme as decisões arquiteturais registradas (`docs/decisions/`)
- [ ] Impacto em fluxos existentes avaliado
- [ ] Regressões funcionais não cobertas por testes avaliadas (testes adicionados quando preciso)

## Checklist

- [ ] DoD global (AGENTS.md §12) cumprido — regressão/testes, §8.1, review independente, Data-First, e2e quando aplicável _(na fast-lane muda só a **fonte do critério de aceite**: o PR, não a Issue — o restante do DoD **permanece**)_
- [ ] Princípios de engenharia §7 considerados (desvios justificados abaixo)
- [ ] Data-First §9.1: uso/resultado observável (quando funcionalidade)
- [ ] Classe do modelo de confiança §11 respeitada; gate correspondente cumprido
- [ ] Commits seguem Conventional Commits
- [ ] `STATE.md` / `CHANGELOG.md` atualizados quando aplicável
- [ ] Issue `type:task` **projetada no `feature-ledger.json`** (delta aditivo, `ledger-guard` verde) — N/A **só** se a Issue estiver **fora do escopo do ADR-0016** (não-`type:task`/exclusão definida), na **fast-lane issue-less** (sem Issue a projetar), ou via o **follow-up rastreado** quando o gerador não puder projetar
- [ ] Sem segredos no diff

## Classe de confiança (§11) e via

- **Classe:** <!-- T0 / T1 / T2 / T3 — justifique se T2+ -->
- **Lane:** `full` <!-- default; branch `fast/<slug>` (fast-lane T1 issue-less, §11.2/ADR-0017) DEVE trocar para `fast` -->

<!-- O par (classe, lane) é o sinal Data-First da via (ADR-0017 §Data-First): capturado aqui, em todo
     PR, e agregado no histórico (ver docs/observability.md § "Sinal de processo (lane)"). Sem PII. -->

## Notas / desvios

_Justificativas de desvios de princípios ou pontos de atenção para o revisor._
