# ADR-0044 — fonte única do ciclo do ledger: `CONTRIBUTING.md`; os demais textos apontam

- **Status:** proposto
- **Data:** 2026-10-04
- **Decisores:** Isa (owner) — **G2 pendente** (textos aprovados por Isa antes do PR)
- **Relacionado a:** [ADR-0022](0022-lifecycle-passes-ledger.md) (ciclo do `passes`) ·
  [ADR-0027](0027-exclusao-superseded-pos-regime-ledger.md) (superseded) ·
  [ADR-0033](0033-flip-automatizado-lote-projects-derivado.md)/[ADR-0037](0037-gatilho-por-evento-do-flip-batch-com-agenda-como-rede-de-seguranca.md)
  (flip automatizado) · [ADR-0042](0042-checks-obrigatorios-sem-contagem-no-agents.md) (precedente: lista de
  checks) · épico **O15** ([#20](https://github.com/isaiane/OrionHarness/milestone/20)), corte **C3** da
  auditoria (#334), Issue **#349**

## Contexto

A regra do ciclo do ledger — a entrada nasce `passes:false` no PR da entrega; a flip para `true` vem num PR
posterior, pelo lote automático; legado e superseded são isentos — estava escrita por extenso em seis
lugares: `AGENTS.md` §12, `CONTRIBUTING.md`, `docs/getting-started.md` §7, os dois checklists de review e a
skill. Cada mudança exigia editar todos, e a varredura sempre deixava uma cópia para trás (três rodadas de
review no #337 só para alinhar). O `AGENTS.md` ainda descrevia a flip como "follow-up rastreada pelo
get-bearings", anterior à automação.

## Decisão

1. **Uma regra, um lugar.** A fonte do ciclo do ledger é o **`CONTRIBUTING.md`**, no trecho marcado com a
   âncora `#ciclo-do-ledger`. A regra em si **não muda**.
2. **Os demais textos** — `AGENTS.md` §12, `getting-started` §7, os dois checklists e a skill — ficam com **uma
   frase curta e um link** para essa âncora.
3. No `AGENTS.md` §12, **só** este trecho do DoD muda (o resto do arquivo é preservado):
   - **DE:** "**quando a tarefa é `type:task` no escopo do ledger (ADR-0016; N/A na fast-lane issue-less,
     §11.2, que não tem Issue a projetar), a(s) entrada(s) do Feature Ledger da Issue projetada(s)
     (`passes:false`) com o plano de validação aplicável e a evidência anexada quando a e2e se aplica
     (ADR-0022). A flip para `passes:true` — num PR posterior, pois o `ledger-guard` proíbe a entrada nascer
     `true` — é obrigação de follow-up rastreada pelo get-bearings (`docs/getting-started.md` §7), não gate de
     conclusão desta tarefa (senão a entrega nunca fecharia o próprio DoD). Duas classes são isentas da flip e
     enumeradas em `.orion/ledger-lifecycle.json`: o legado pré-ADR-0022 (§d do ADR-0022) e as entradas
     superseded/mal-redigidas (ADR-0027), que não devem ser flipadas (flipar registraria conclusão falsa) — o
     `--scoped` as rotula fora de "aguardando flip".**"
   - **PARA:** "**quando a tarefa é `type:task` no escopo do ledger** (exceto na fast-lane, §11.2), **o PR
     projeta as entradas da Issue com `passes:false`**, com o plano de validação e a evidência, quando houver.
     A flip para `true` e as isenções seguem o [ciclo do ledger](../../CONTRIBUTING.md#ciclo-do-ledger)."
     (No `AGENTS.md`, o link é relativo à raiz: `CONTRIBUTING.md#ciclo-do-ledger`.)
4. A aplicação vai **no mesmo PR** deste ADR (como no ADR-0042): textos pequenos, sem mudança de regra.
5. **Daqui em diante,** uma regra repetida em mais de um lugar ganha o mesmo tratamento quando for alterada:
   fonte única + ponteiros.

## Alternativas consideradas

- **Manter as seis cópias e sincronizar com mais cuidado.** Rejeitada: a sincronização falhou repetidas vezes.
- **Fonte única no `AGENTS.md`.** Rejeitada: o `AGENTS.md` é a constituição (G2 a cada ajuste operacional);
  o `CONTRIBUTING.md` é o guia operacional que já tinha o texto mais completo.

## Consequências

- **Positiva:** uma edição por mudança na regra; menos texto defasado e menos achados de review.
- **Neutra:** quem lê um checklist segue um link para o detalhe.

## Conformidade

- **G2:** revisão humana deste ADR.
- O diff do `AGENTS.md` neste PR é exatamente a troca DE→PARA do ponto 3.
- Fora do `CONTRIBUTING.md` e dos ADRs, nenhum texto current-state descreve o ciclo do ledger por extenso.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho deste. -->
