# ADR-0006 — Ledger executável de tarefas (projeção das Issues SDD, em TypeScript)

> **Numeração (repo):** após o merge do #24, o repo terá ADRs `0001–0004`. Esta é a **O2** e
> depende de um pré-requisito (abaixo), então: **stack Node/TS = 0005** e **ledger = 0006**.
> A numeração 0004–0008 do pacote `orion-evolution-proposal/` é conceitual; este ADR a substitui.
>
> **Pré-requisito (T2.0):** a stack Node/TS precisa estar **commitada** (ADR-0005, aprovado em
> ADR-0008 do pacote) e o **esqueleto** do projeto existir (`package.json`, `tsconfig` estendendo
> `presets/typescript/`, vitest, eslint, scripts). O tooling deste ADR é **TypeScript** — não há
> sentido em entregá-lo antes da fundação.
>
> **Nota (append-only):** a **semântica** da projeção — *as-accepted* (registro histórico por Issue,
> fiel à entrega) × *as-current* (reconciliado ao estado atual) — é decidida pelo
> [ADR-0014](0014-semantica-ledger-as-accepted.md) (#67): adota-se **as-accepted**, coerente com o
> append-only deste ADR. A decisão histórica abaixo permanece inalterada.

- **Status:** aceito
- **Data:** 2026-06-26
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** `AGENTS.md` §4 (L1/L2), §5 (Issue SDD), §8/§8.1; ADR-0004 (lean/flat);
  ADR-0005 (stack Node/TS — pré-requisito); PLAN épico **O2** (T2.1); _Effective Harnesses for
  Long-Running Agents_ (feature list); benchmark `autonomous-coding` (`feature_list.json`)

## Contexto

O estado de execução vive nas **Issues SDD** (L2, fonte da verdade) e num `PLAN.md` (L1) em
**Markdown de status grosseiro**. Falta um artefato **local e legível por máquina** que o agente
leia no início da sessão para (a) escolher a próxima tarefa não concluída e (b) **reverificar** o
que já passa antes de novo trabalho (ritual da O2/initializer). O artigo e o benchmark resolvem com
um `feature_list.json` — e o benchmark observou que o modelo respeita JSON melhor que Markdown e
tende a **declarar vitória cedo** ou **marcar pronto sem testar** sem um ledger imutável.

## Decisão

Adotar um **ledger executável em JSON** como **projeção** das Issues SDD — não fonte paralela de
verdade — com tooling em **TypeScript** (ADR-0005):

1. **Origem governada.** Cada entrada deriva dos **critérios de aceite** de uma Issue SDD (campo
   `issue`). A Issue continua sendo L2; o ledger é a camada de **verificação executável** local.
2. **Schema fixo** (`feature-ledger.schema.json`): `id`, `issue`, `category`
   (`functional`/`style`/`contract`), `description`, `steps[]`, `acceptance`, `passes`.
3. **Append-only / anti-sobrescrita.** Itens só viram `passes` de `false` para `true`. **Remover**
   ou **editar campos imutáveis** é **proibido**. **Reordenar é permitido e inócuo** — os IDs são
   estáveis e o `ledger-guard` é keyed por `id` (insensível à ordem), coerente com o item 5
   ("reorder-safe").
4. **Gate de CI** (`ledger-guard.ts`) compara o ledger da `main` (base) com o do PR (head) e
   **reprova** qualquer violação. Roda em Node ≥ 22 sem toolchain (type stripping) **ou** via vitest.
5. **Gerador** (`ledger-from-issues.ts`) projeta novas Issues em entradas `passes:false`,
   append-only e idempotente; IDs estáveis e reorder-safe (`F-<issue>-<hash6>`). Fonte: `gh issue
   list --json …` (`--from-gh`) ou arquivo (`--issues-json`).
6. **Sincronização.** Conflito ledger ↔ Issue resolve-se **a favor da Issue** (governança).

> **Semeia-e-cresce (escopo/semântica).** O ledger projeta os critérios de Issues ativas/prontas e
> cresce conforme cada tarefa alcança o G1 — não é uma cópia congelada do backlog, cujos critérios
> ainda evoluem. (Por isso o ledger inicial contém só a #29 e não as Issues seguintes ainda em
> amadurecimento — coerente com o append-only.)

### Integração no CI (wiring)

Um job/checagem que, no PR, roda:
`git show origin/main:feature-ledger.json > base.json && node ledger-guard.ts base.json feature-ledger.json`.
Plugar também no `scripts/smoke-test.sh` e cobrir o tooling com **vitest**.

## Alternativas consideradas

- **Manter só `PLAN.md` + Issues:** rejeitada — sem artefato local máquina-verificável para o
  ritual de início de sessão nem gate anti-regressão de escopo.
- **Migrar status das Issues para o ledger:** rejeitada — quebraria a soberania da L2 e a
  rastreabilidade. O ledger **projeta**, não substitui.
- **Tooling em Python (stubs originais):** rejeitada — contraria a stack Node/TS (ADR-0005);
  manteria duas linguagens no repo consumidor. Os stubs Python ficam como referência histórica.

## Consequências

- **Positivas:** combate "vitória cedo" e "pronto prematuro"; habilita o check de regressão de
  início de sessão (initializer, O2); rastreabilidade reforçada; single-language (TS).
- **Negativas / riscos:** duplicação parcial Issue ↔ ledger (mitigada por "Issue vence" + gerador);
  custo do gate no CI. Depende do esqueleto Node/TS (T2.0).

## Conformidade

Verificável: ledger valida contra o schema; `ledger-guard.ts` confirma append-only e `false→true`
(exit ≠ 0 em violação); toda entrada referencia uma Issue existente; tooling em TS coberto por
vitest e plugado no CI/smoke-test.
