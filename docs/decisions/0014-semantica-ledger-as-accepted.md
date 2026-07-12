# ADR-0014 — Semântica do Feature Ledger: *as-accepted* (projeção histórica por Issue)

> **Numeração:** `0014` = próximo livre em `docs/decisions/` na `main` (a `main` tem `0001–0013`;
> confirme com `git ls-files docs/decisions/` antes de commitar).

- **Status:** aceito
- **Data:** 2026-07-12
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** [ADR-0006](0006-ledger-executavel-de-tarefas.md) (ledger executável),
  [ADR-0008](0008-separacao-revisao-harness-vs-produto.md) (seleção de review); `CONTRIBUTING.md`
  (convenção de projeção); Issue **#67**; descoberto na revisão do Codex no PR #66 (#65).

## Contexto
O **Feature Ledger** ([ADR-0006](0006-ledger-executavel-de-tarefas.md)) projeta os **critérios de
aceite** das Issues SDD em JSON **append-only** (`description`/`acceptance` imutáveis; `passes` só
`false→true`). Ao reprojetar a **#43** (#65), o Codex apontou que sua projeção codificava termos
**divergentes dos artefatos atuais** — `"pipeline em 3 camadas"` (o checklist hoje diz **"3
representações"**) e `"mudança de L0"` (o `AGENTS.md §2`/ADR-0008 hoje usam **"governança/instrução"**).

Ficou em aberto **o que o ledger codifica** quando o texto de uma Issue diverge dos artefatos:
o critério **como foi aceito** (*as-accepted*, snapshot histórico) ou o **estado atual** (*as-current*).

**Evidência decisiva (git) para a #43:** o `docs/harness-reviewer-checklist.md` foi **criado no próprio
PR do #43** (commit `1a669f2`) **já com "3 representações"**, e **"mudança de L0" nunca existiu** no
`AGENTS.md`. Logo, os termos no **corpo da Issue #43** eram **wording de rascunho que nunca bateu com o
que a #43 entregou** — não é evolução posterior de artefato; é o texto da Issue impreciso vs. a própria
entrega aceita.

## Decisão
Adotar a semântica **as-accepted**: o ledger é uma **projeção histórica, por Issue, dos critérios como
foram aceitos/entregues** — não é reconciliado continuamente com o estado atual dos artefatos.

1. **Por Issue, imutável.** Cada entrada registra o critério **daquela Issue** como aceito. Mudanças
   feitas por **outra** Issue depois **não** reescrevem entradas antigas (seriam da Issue posterior).
   Isso é o que o append-only do ADR-0006 já impõe: *as-current* exigiria **editar** entradas
   (proibido) ou reconciliação perpétua — rejeitado.
2. **Fidelidade à entrega, não ao rascunho.** *As-accepted* = **o que a Issue efetivamente entregou/foi
   aceita**, verificável no merge (git/artefatos), **não** o wording de rascunho do corpo se ele
   divergir da própria entrega. Quando o texto de uma Issue **não bate com a entrega dela** (rascunho
   impreciso), **corrija o corpo (L2) para a redação entregue/aceita** — com o racional registrado — e
   então projete. Isso **não** é *as-current* (não persegue evolução posterior); é tornar o registro
   fiel ao que foi aceito.
3. **Distinção explícita (evita o chase infinito):**
   - Texto da Issue ≠ **própria entrega** (rascunho) → **corrigir o corpo** para a entrega e projetar.
   - Entrega alterada **por Issue posterior** → *as-accepted* mantém o original; a mudança é da Issue
     posterior (não reescreva).
4. **#43 (aplicação):** cai no caso "rascunho ≠ entrega". Corrigir o corpo da #43
   (`mudança de L0` → `artefato de governança/instrução`; `pipeline em 3 camadas` →
   `pipeline em 3 representações`), registrar o racional (evidência: commit `1a669f2`), e projetar
   (`passes:false`).

## Alternativas consideradas
- **As-current (reconciliar o ledger ao estado atual):** rejeitada. Incompatível com o append-only
  (exigiria editar entradas), **conflaria** o trabalho de Issues distintas na entrada de uma só, e
  criaria manutenção perpétua (todo rename de artefato re-tocaria o ledger). É o "chase de requisito
  fantasma" que o #67 quer evitar — mas pela ponta errada.
- **Manter a #43 fora do ledger:** rejeitada. Deixa uma feature real **sem rastro** no artefato de
  verificação; a divergência era corrigível (rascunho ≠ entrega), não um impedimento.
- **Projetar o rascunho as-is (com nota):** rejeitada para a #43. Gravaria `"3 camadas"`/`"mudança de
  L0"` — que **nunca** foram a entrega — num ledger imutável, perpetuando o texto fantasma.

## Consequências
- **Positivas:** semântica clara e alinhada ao append-only (ADR-0006); o ledger é um **registro
  histórico confiável por Issue**; a #43 entra sem texto fantasma; convenção reutilizável para futuras
  reprojeções de Issues antigas.
- **Negativas / risco:** **corrigir o corpo de uma Issue fechada** é reescrever a fonte L2 — mitigado
  restringindo a correção a **divergência rascunho×entrega comprovável** (git/artefatos no merge), com
  o racional registrado no ADR e num comentário na própria Issue (auditável). **Não** vale para
  reescrever entrega evoluída por Issue posterior.

## Conformidade
Verificável (§8.1): ADR aceito registrando a semântica *as-accepted* + a regra rascunho×entrega;
`CONTRIBUTING.md` (convenção de projeção) anotado com o critério; **#43 projetada** no
`feature-ledger.json` com `acceptance` = redação **entregue/aceita** (sem `"3 camadas"`/`"mudança de
L0"`), `passes:false`, `ledger-guard` verde; comentário na #43 com o racional e a evidência
(`1a669f2`); `STATE.md`/`CHANGELOG.md` coerentes.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho do antigo. -->
