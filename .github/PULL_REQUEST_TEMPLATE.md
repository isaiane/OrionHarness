<!-- PR pequeno, escopado a UMA Issue SDD (AGENTS.md §6).
     FAST-LANE (T0/T1 issue-less — §11.2/ADR-0017): não há Issue. Apague o "Closes #<nº>", declare a
     classe + o critério de aceite abaixo, e marque os itens que dependem da Issue como "N/A (fast-lane)".
     A via mantém CI verde + merge humano (T3/G3); qualquer critério que caia → fluxo completo. -->

## Issue relacionada

Closes #<nº> <!-- fast-lane: apague esta linha (PR issue-less é a unidade de rastreabilidade) -->

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

- [ ] DoD da Issue cumprido (AGENTS.md §12) — _fast-lane: DoD do PR (critério de aceite declarado)_
- [ ] Princípios de engenharia §7 considerados (desvios justificados abaixo)
- [ ] Data-First §9.1: uso/resultado observável (quando funcionalidade)
- [ ] Classe do modelo de confiança §11 respeitada; gate correspondente cumprido
- [ ] Commits seguem Conventional Commits
- [ ] `STATE.md` / `CHANGELOG.md` atualizados quando aplicável
- [ ] Issue `type:task` **projetada no `feature-ledger.json`** (delta aditivo, `ledger-guard` verde) — N/A **só** se a Issue estiver **fora do escopo do ADR-0016** (não-`type:task`/exclusão definida), na **fast-lane issue-less** (sem Issue a projetar), ou via o **follow-up rastreado** quando o gerador não puder projetar
- [ ] Sem segredos no diff

## Classe de confiança (§11)

<!-- T0 / T1 / T2 / T3 — justifique se T2+ -->

## Notas / desvios

_Justificativas de desvios de princípios ou pontos de atenção para o revisor._
