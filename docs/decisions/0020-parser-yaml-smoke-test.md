# ADR-0020 — Parser YAML real na camada estática do smoke-test

- **Status:** aceito  <!-- G2: aprovado pelo humano (owner) em 2026-07-24 -->
- **Data:** 2026-07-23 (proposto) · 2026-07-24 (aceito no G2)
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** Issue **#75** (§4 — escolha (a) condicionada a este ADR); ADR-0005/0012 (stack
  Node/TS single-language); `scripts/smoke-test.sh` / `tools/smoke/static-check.ts`.

## Contexto
A #75 removeu o `python3`/`pyyaml` do smoke-test (coerência com o ADR-0005/0012 e fim do falso-vermelho
`pyyaml`), reescrevendo a **camada estática** em TypeScript (`tools/smoke/static-check.ts`). A validação
de YAML entrou como **checagem estrutural leve** (escolha (b) da Issue: sem parser, sem `node_modules`).
A Harness Review (Codex) mostrou que a heurística leve deixa **YAML malformado passar como verde**
(false-green): primeiro `[` não fechado, depois **indentação inválida de mapping** — e a cada reforço
surge outra classe (chaves duplicadas, âncoras…). Validar sintaxe YAML **completa** é, na prática,
**escrever um parser**; heurística nunca converge. A Issue #75 §4 já previa isto e **condicionou a
escolha (a)** — parser real — a **um ADR/G2**, porque muda o fluxo do smoke-test.

## Decisão
Adotar um **parser YAML real** — **`js-yaml`** (devDependency; já presente como dep transitiva, madura e
pequena) — na camada estática (`yamlLint` = `yaml.loadAll`, capturando `YAMLException`). Em consequência,
o **smoke-test passa a exigir `node_modules`**: rode **`npm ci` antes** (`bash scripts/smoke-test.sh`).
O job `smoke-test` do CI ganha um passo `npm ci`; o ritual de get-bearings (`docs/getting-started.md` §7)
anota o pré-requisito.

## Alternativas consideradas
- **Manter a heurística leve (escolha (b)):** rejeitada — **false-green** em classes de malformação não
  cobertas; reforçar caso a caso é whack-a-mole que não converge sem um parser.
- **Escrever um validador "completo" à mão:** rejeitada — é reimplementar um parser YAML (custo/risco de
  bug e de falso-positivo), sem ganho sobre uma lib madura.
- **Vendorizar um parser no repo (sem `npm`):** rejeitada — manutenção/segurança piores que declarar a
  devDependency e resolver via lockfile.
- **Voltar a usar `python`/`pyyaml`:** rejeitada — contraria o ADR-0005/0012 (single-language) e traz de
  volta o falso-vermelho ambiental que a #75 eliminou.

## Consequências
- **Positivas:** rigor **completo** de sintaxe YAML (workflows, template SDD, `.pre-commit-config.yaml`)
  — o smoke deixa de dar verde em YAML quebrado; sem heurística frágil; runtime **único Node/TS**.
- **Negativas/trade-off:** o smoke-test **deixa de rodar "só com type stripping"** — passa a **exigir
  `node_modules`** (`npm ci`). É a mudança de fluxo que motiva este G2. Mitigação: `npm ci` já é
  pré-requisito de `npm run typecheck`/`npm test` (os outros checks core do get-bearings), então o
  atrito incremental é baixo; a guarda no script imprime instrução clara se `node_modules/js-yaml`
  faltar.
- **Segurança/observabilidade:** `js-yaml` fixado por semver + lockfile; nenhuma execução de conteúdo
  YAML (só parse — `loadAll`, não `load` com tipos custom perigosos).

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho deste. -->
