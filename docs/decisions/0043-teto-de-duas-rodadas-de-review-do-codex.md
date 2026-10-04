# ADR-0043 — teto de duas rodadas de review do Codex por PR (emenda ADR-0010)

- **Status:** proposto
- **Data:** 2026-10-04
- **Decisores:** Isa (owner) — **G2 pendente**
- **Relacionado a:** **emenda** o [ADR-0010](0010-re-review-automatizado-apos-fix.md) (re-review após fix) ·
  `CONTRIBUTING.md` §6 · épico **O15** ([#20](https://github.com/isaiane/OrionHarness/milestone/20)), corte
  **C2** da auditoria (#334), Issue **#347**

## Contexto

O ADR-0010 manda, depois de cada fix de achado do Codex, responder no thread e pedir `@codex review` de novo.
Não há limite de rodadas. Nos épicos O12–O15 isso gerou ciclos de 4 a 7 rodadas por PR (23 threads no #328,
12 no #329), com achados cada vez mais periféricos e regras novas a cada rodada. A auditoria do O15 apontou
esse ciclo como um dos dois maiores custos do harness.

## Decisão

1. **Rodada** = um pedido de `@codex review` e os achados que ele traz.
2. **Teto:** cada PR tem **até duas rodadas**. Os achados da 1ª e da 2ª rodada seguem o ADR-0010: corrige-se,
   responde-se no thread e pede-se nova revisão.
3. **Depois da 2ª rodada,** achado novo vira **ressalva**: resposta no thread dizendo que fica como ressalva, e
   registro no corpo do PR. O thread é resolvido.
4. **Exceção:** **P1 de segurança ou de correção** (o PR faria algo errado ou inseguro) continua sendo
   corrigido, mesmo depois do teto.
5. **A mantenedora pode pedir rodadas extras** explicitamente; o teto vale para o agente, não para ela.
6. O merge segue **humano** (G3); o teto não dispensa o review humano.

## Alternativas consideradas

- **Sem teto (ADR-0010 como está).** Rejeitada: o custo observado não converge.
- **Teto de uma rodada.** Rejeitada: a 2ª rodada costuma confirmar as correções da 1ª.
- **Ressalva para tudo depois da 1ª rodada, inclusive P1.** Rejeitada: P1 de segurança/correção não pode virar
  ressalva.

## Consequências

- **Positiva:** PRs convergem em até duas rodadas; menos aprovações por rodada para a mantenedora.
- **Negativa:** casos de borda deixam de ser corrigidos antes do merge e ficam registrados como ressalva.

## Conformidade

- **G2:** revisão humana deste ADR.
- `CONTRIBUTING.md` §6 descreve o teto; os checklists de review já apontam o §6; a skill aponta o §6.
- **Append-only:** o ADR-0010 recebe nota no cabeçalho apontando este ADR.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho deste. -->
