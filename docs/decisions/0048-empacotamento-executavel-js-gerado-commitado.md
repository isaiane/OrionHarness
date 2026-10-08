# ADR-0048 — Empacotamento executável: JS gerado e commitado, com guard de defasagem

> Architecture Decision Record (`AGENTS.md` §3, gate G2). ADRs são **append-only**: uma decisão
> revista não é apagada — cria-se um novo ADR que a substitui.
>
> **Ao criar um ADR — ou mudar seu número/título/status/nome —, regenere o índice** e commite o
> `README.md`: `node --experimental-strip-types tools/adr/adr-index.ts --write`
> ([ADR-0023](0023-indice-gerado-de-adrs.md)).

- **Status:** proposto
- **Data:** 2026-10-08
- **Decisores:** Isa (owner) — G2 pendente
- **Relacionado a:** Issue #364 (O16.2, ADR B), épico **O16** (Milestone #21);
  [ADR-0047](0047-distribuicao-pacote-cli-e-particao-em-zonas.md) (ADR A: pacote + CLI, Fase 0, zonas);
  **supersede parcialmente** [ADR-0005](0005-stack-padrao-node-typescript.md) (só o "sem toolchain" do
  meta-tooling, e só no pacote distribuído); **emenda** [ADR-0011](0011-hook-sandbox-allowlist-referencia.md)
  e [ADR-0015](0015-allowlist-docs-examples.md) (allowlist do tool-guard no produto); a implementação é a
  fatia 4c da tarefa 4 (#366)

## Contexto

O meta-tooling do harness é TypeScript e roda **sem toolchain**, por type stripping
(`node --experimental-strip-types`, ADR-0005). No modelo do ADR-0047, o produto executa o harness por
`npx github:isaiane/OrionHarness#<sha>`, e o `npx` instala o pacote sob `node_modules`. O Node **recusa**
type stripping ali: no Node 22.12, rodar um `.ts` de dentro de `node_modules` dá
`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` (verificado em 2026-10-07 com um teste descartável). Sem
uma decisão de empacotamento, **nenhuma ferramenta roda no produto**.

Junto disso: `js-yaml` e `ajv`, usados pelas ferramentas em tempo de execução, estão em
`devDependencies` — o pacote instalado não os teria. E o tool-guard de referência (ADR-0011/0015) só
libera `node --experimental-strip-types` sobre `.ts` versionados em `tools/`, `scripts/` e
`docs/examples/`; no produto, o agente invoca o harness pelo `npx`, que cai no default-deny.

As opções foram apresentadas com custo e escolhidas por Isa em 2026-10-08.

## Decisão

**1. JS gerado e commitado.** Um build com `tsc` gera **JavaScript em `dist/`** a partir do TypeScript
das ferramentas distribuídas, e o `dist/` fica **versionado no repo central**. O `bin` do pacote
(`orion`) aponta para o JS em `dist/`. Como o produto fixa o SHA do commit (ADR-0047), o JS que ele
executa é exatamente o daquele commit — sem compilar nada na instalação. O `dist/` é **Zona A** no
manifesto de zonas.

**2. Guard de defasagem.** O CI do central roda o build e **reprova** se o `dist/` resultante diferir do
commitado — o TS é a fonte; o `dist/` nunca é editado à mão. O `dist/` é marcado como gerado
(`linguist-generated` no `.gitattributes` do central) para o diff do GitHub recolhê-lo na revisão.

**3. O central continua sem toolchain.** No repositório central, as ferramentas seguem rodando como
TypeScript por type stripping — smoke-test, testes e CI usam o TS. O build existe **só para distribuir**.
Supersede o "sem toolchain" do ADR-0005 **apenas para o pacote distribuído**; o resto do ADR-0005
permanece.

**4. Dependências de execução.** Toda biblioteca que o JS de `dist/` importa em tempo de execução vai
para `dependencies` do pacote — hoje `js-yaml` e `ajv`. O que só serve ao desenvolvimento (TypeScript,
vitest, eslint, prettier) continua em `devDependencies`. O e2e da tarefa 5 roda o pacote instalado e
pega dependência que faltar.

**5. Tool-guard no produto.** Na allowlist do tool-guard do produto entra **exatamente** a invocação do
harness fixada: `npx github:isaiane/OrionHarness#<sha> orion <comando>`, em que `<sha>` é o `commit` do
`.orion/harness.json` e `<comando>` é um dos comandos da Fase 0 (`new`, `validate`, `doctor`,
`update`). Qualquer outro `npx`, outro SHA ou outro repositório continua no default-deny. Emenda o
ADR-0011 ("`node` restrito a scripts versionados do repo") e o ADR-0015 só nesse ponto; no central, a
allowlist não muda.

## Alternativas consideradas

- **Compilar na instalação (`prepare`).** Rejeitada: toda execução do CI do produto começaria com o
  cache do `npx` vazio, baixaria o TypeScript e compilaria de novo — dezenas de segundos a mais por
  execução —, e o `prepare` em dependência git já foi instável entre versões do npm.
- **Artefato de publicação fora da `main`.** Rejeitada para a Fase 0: exige workflow de publicação e
  branch de release, e o SHA publicado não fica na história da `main`. Volta a ser candidata quando
  houver publicação em registro npm (épico próprio).
- **Carregador de TypeScript em tempo de execução (ex.: `tsx`).** Rejeitada: cria dependência de
  execução num binário nativo (esbuild) e não foi verificado que transpila dentro de `node_modules`.

## Consequências

- **Positivas.** O produto instala e roda o harness rápido, sem compilar, e executa exatamente o código
  do SHA fixado. O central não ganha etapa de build no fluxo de desenvolvimento.
- **Negativas.** O repo central passa a ter código gerado; todo PR que muda ferramenta distribuída traz
  também o `dist/` (recolhido no diff, conferido pelo guard). O manifesto de zonas ganha `dist/` na
  Zona A.
- **Riscos.** Esquecer de regenerar o `dist/` — o guard de defasagem reprova no próprio PR.

## Conformidade

- **Fatia 4c (#366):** build `tsc` para `dist/`; guard de defasagem no CI do central; `bin` apontando
  para `dist/`; `js-yaml` e `ajv` em `dependencies`; teste que instala o pacote num diretório temporário
  (sob `node_modules`) e roda `orion validate`.
- **Tarefa 5 (#367):** o e2e roda o pacote instalado no produto gerado; o tool-guard do produto libera só
  a invocação fixada pelo SHA do `harness.json`, com teste de mordida para outro SHA e outro `npx`.
