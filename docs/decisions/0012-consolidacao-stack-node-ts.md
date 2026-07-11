# ADR-0012 — Consolidação da stack em Node/TypeScript (cumprir o ADR-0005)

> **Numeração:** `0012` = próximo livre em `docs/decisions/` na `main` (a `main` tem `0001–0011`;
> confirme com `git ls-files docs/decisions/` antes de commitar). Arquivos não-rastreados do working
> tree (`0003-design-lean-flat-modular.md`, `0004-harness-de-governanca-nao-runtime.md`) são scratch
> conceitual e **não** contam.

- **Status:** aceito
- **Data:** 2026-07-11
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** [ADR-0005](0005-stack-padrao-node-typescript.md) (stack padrão),
  [ADR-0004](0004-reconciliacao-s7-lean-flat.md) (lean/flat); `AGENTS.md` §9; Issue **#49**;
  artefatos `.github/workflows/ci.yml`, `README.md`, `presets/`, `docs/getting-started.md`.

## Contexto
O **ADR-0005** (aceito) definiu **Node.js + TypeScript** como stack padrão e, nas **Consequências**,
prometeu *"fim da ambiguidade; CI/presets/allowlist/meta-tooling numa só linguagem"*. O meta-tooling
foi de fato consolidado em TS/bash (T2.0/#26). Porém a parte **"CI numa só linguagem" não** foi
reconciliada: sobraram artefatos poliglotas em desacordo com o próprio ADR-0005 —
`.github/workflows/ci.yml` ainda **detecta stack** (node/python/go, linhas ~26–86); `README.md`
declara o harness *"Universal e poliglota"* (linha ~20); `presets/` contém `python/` e `mobile/` além
de `typescript/`. Hoje as duas leituras coexistem — exatamente a ambiguidade que o ADR-0005 dizia
eliminar. A postura **lean/flat** (ADR-0004) reforça uma leitura única: abstração/opção se ganha, não
se prevê.

## Decisão
Adotar a **leitura única Node/TS** (opção A da #49), cumprindo o ADR-0005 sem meia-decisão:

1. **CI só-node.** Remover a **detecção de stack de projeto** e os ramos Python/Go **de projeto** do
   job `lint-test-build`; o pipeline assume Node/TS. **Escopo preciso:** preservar os 4 jobs que
   produzem os checks obrigatórios (`lint-test-build`, `secret-scan`, `smoke-test`, `pre-commit`) —
   renomear/remover um deles torna o required check "missing" e altera o gate G3. O job `pre-commit`
   usa Python porque **a ferramenta pre-commit é Python** — isso é tooling de CI, não "suporte
   poliglota de projeto", e **permanece**.
2. **README.** Remover a afirmação *"Universal e poliglota"* como característica **atual**; o suporte
   a outras linguagens é reposicionado como **roadmap / templates futuros ou externos**, não como
   capacidade embarcada.
3. **`presets/`.** Manter apenas `typescript/`; `python/` e `mobile/` saem do conjunto embarcado
   (relocados como templates futuros/externos ou removidos), coerente com o `init.sh` já fixado em
   Node/TS (#32).
4. **Docs.** Alinhar `docs/getting-started.md` e referências correlatas à leitura única.

Este ADR **não supersede** o ADR-0005 — ele **realiza** a Consequência que o ADR-0005 já prometera.

## Alternativas consideradas
- **B — Reafirmar poliglota** (anotar/superseder o ADR-0005 e ajustar suas Consequências): rejeitada.
  Reabre uma decisão fechada, mantém a ambiguidade viva e contradiz o meta-tooling single-language e a
  postura lean/flat.
- **Status quo (não fazer):** rejeitada. Deixa a promessa do ADR-0005 sem cumprir; duas leituras de
  stack seguem coexistindo — dívida de coerência que já vazou para artefatos novos (o `init.sh` da
  T2.3 quase herdou o poliglota).

## Consequências
- **Positivas:** uma leitura única de stack; CI menor e mais rápido; menos superfície para manter;
  coerência entre `ci.yml`/`README`/`presets`/`init.sh`.
- **Negativas / risco:** o harness deixa de anunciar suporte poliglota embarcado — mitigado
  documentando o poliglota como **roadmap/templates externos**. Mudar o `ci.yml` afeta o **gate de
  todos os PRs** — mitigar validando num **PR pequeno com CI verde** antes do merge.

## Conformidade
Verificável no review/CI (§8.1): `ci.yml` sem ramos `python`/`go` nem passo de detecção; `README.md`
sem a afirmação "poliglota" como capacidade atual; `presets/` só com `typescript/` (demais relocados
ou documentados como futuros); `grep -ri "poligl" .` sem afirmações órfãs; `scripts/smoke-test.sh`
verde; nenhuma referência quebrada em `docs/`.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho do antigo. -->
