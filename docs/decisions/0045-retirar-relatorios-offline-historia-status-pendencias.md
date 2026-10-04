# ADR-0045 — retirar os relatórios offline de história, status e pendências

- **Status:** aceito  <!-- G2 aprovado pelo owner (Isa) em 2026-10-04 -->
- **Data:** 2026-10-04 (proposto e aceito no G2)
- **Decisores:** Isa (owner) — aprovação humana (gate G2); textos aprovados antes do PR
- **Relacionado a:** [ADR-0025](0025-modelo-alvo-plano-historia-compactacao-ponteiros.md) (criou os
  relatórios) · [ADR-0027](0027-exclusao-superseded-pos-regime-ledger.md) · épico **O15**
  ([#20](https://github.com/isaiane/OrionHarness/milestone/20)), corte **C4** da auditoria (#334), Issue **#352**

## Contexto

O ADR-0025 criou três geradores de relatório sob demanda: `history-report` (fatia T9.4a), `status-report` e
`pending-report` (fatia T9.7). Juntos, código e testes somam cerca de 2,1 mil linhas. Quase não são usados.
O GitHub (PRs mergeados, Milestones, Issues e board) mostra a mesma informação. Mesmo assim, eles custam:
toda mudança no ledger precisa chegar até eles (o ADR-0027 teve de ser propagado aos três), e o check 4 do
`coherence-guard` cobre o formato dos dados de história.

## Decisão

1. Os três geradores e os seus testes saem do repositório.
2. A fonte da história continua sendo os PRs mergeados (item 3 do ADR-0025, sem mudança). A consulta passa a
   ser direta no GitHub, por exemplo com `gh pr list --state merged`.
3. O gerador do plano (`plan-report`) e a pasta `.orion/tmp/reports/` ficam.
4. O `coherence-guard` deixa de checar o formato dos dados de história e continua checando o do plano.
5. No `AGENTS.md` §4 mudam só estes dois trechos, aplicados no mesmo PR:
   - **Linha L5 — DE:** "…; índice/relatório gerado sob demanda; `CHANGELOG.md` = **stub**…"
     **PARA:** "…; consulta direta no GitHub; `CHANGELOG.md` = **stub**…"
   - **Regra de compactação — DE:** "O relatório de história é **gerado sob demanda**
     (`.orion/tmp/reports/`), não editado à mão." **PARA:** "A história é **consultada no GitHub** (PRs
     mergeados), não editada à mão."

## Alternativas consideradas

- **Manter os geradores.** Rejeitada: custam manutenção e quase não são usados.

## Consequências

- Sai cerca de 2,1 mil linhas e um consumidor a menos em cada mudança do ledger.
- Num clone sem rede, deixa de haver leitura de história. Ela já saía vazia nesse caso, conforme o próprio
  ADR-0025.
- O código fica no histórico do git, se for preciso voltar.

## Conformidade

- **G2:** revisão humana deste ADR.
- O diff do `AGENTS.md` neste PR é exatamente a troca DE→PARA do ponto 5.
- Fora dos ADRs, do ledger e do trecho congelado do `CHANGELOG.md`, nenhum texto cita os três geradores.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho deste. -->
