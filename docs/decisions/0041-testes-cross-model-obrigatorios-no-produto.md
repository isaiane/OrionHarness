# ADR-0041 — testes do outro modelo: obrigatórios em PR de produto, por marcação em PR de harness

- **Status:** proposto
- **Data:** 2026-10-03
- **Decisores:** Isa (owner) — **G2 pendente**
- **Relacionado a:** [ADR-0018](0018-revisao-cross-model.md) (cross-model; o revisor deriva
  e avalia os testes de aceite) · [ADR-0039](0039-marcador-de-autoria-modelo.md) (trailer `Model-Authored-By`, lista
  fechada) · [ADR-0040](0040-v1-testes-pelo-codex-no-pr.md) (v1: testes pelo `@codex` no PR de contrato,
  trailer declarado) · [ADR-0030](0030-pipeline-spec-tests-implementation.md) §9 (recorte por classe) · épico
  **O12** ([#17](https://github.com/isaiane/OrionHarness/milestone/17)), Issue **#327**

## Contexto

O ADR-0039 e o ADR-0040 deram aos commits um marcador de autoria-modelo (`Model-Authored-By`) e um caminho
para o Codex escrever os testes (`@codex` no PR de contrato). Falta dizer **onde** isso é obrigatório. O ADR-0018
já exige que o revisor derive e avalie testes de aceite, mas só por **atestação**: escrevê-los **antes** da
implementação e **commitá-los** com a marca do modelo não é requisito, e nenhuma máquina confere; o ADR-0030 só
torna isso requisito depois da sua amarração, ainda não feita.

A mantenedora decidiu (2026-10-03) onde a regra pesa: no **produto** — o sistema que o projeto constrói —,
e não no **harness** — governança, documentação e ferramental deste próprio template —, onde a
**verificação automática** fica a critério de quem trabalha (a revisão do ADR-0018 segue obrigatória).

## Decisão

Este ADR fixa o **princípio**. O algoritmo exato — o que conta como teste de aceite, o papel de cada commit,
como se detecta a rota do PR — fica no **código do check** (fatia b da #327), com um teste por caso, revisado
ali. Na dúvida, o check **exige** (fail-closed).

**1. Produto: ao menos um teste de aceite de outro modelo.** Um PR que altera **código de produto** precisa de
**pelo menos um commit de teste de aceite** marcado (`Model-Authored-By`, ADR-0039/0040) por um modelo
**diferente** do que marcou a implementação. Testes do próprio implementador (TDD) e commits **humanos** (sem
marca) são permitidos e **não** contam como prova. Fixtures e mocks acompanham os testes, mas sozinhos não são
teste de aceite. O teste de aceite precisa **continuar presente e sem alteração** no estado final do PR — se o
implementador o editar ou remover, ele deixa de valer como prova (é o "sem editá-los" do ADR-0018); testes
próprios do implementador podem ficar ao lado.

**2. Harness: a mesma regra, só com o rótulo `cross-model`.** Num PR que toca **só harness**, o ponto 1 vale
apenas quando o PR final leva o rótulo `cross-model` (mantenedora ou agente aplica); a prova pode vir de testes
do harness. O rótulo `pipeline:contract` segue marcando o PR de contrato e **não** liga esta exigência.

**3. Isentos: PRs fora do pipeline de contrato.** As rotas que o ADR-0030 §9 deixa fora do pipeline — fast-lane
T1, T1 full-lane e mudanças sem comportamento observável — **não** têm onde o outro modelo escrever os testes
(o ADR-0040 os pede no PR de contrato) e ficam **fora** da exigência. Nelas segue valendo a revisão
cross-model **independente** do ADR-0018 (o `@codex review` serve quando quem implementou **não** foi o
Codex; senão, outro modelo revisa).

**4. Produto × harness — a taxonomia do `AGENTS.md` §2.** **Produto** = código, testes e config do agente
executor **e** os documentos de `docs/product/`; **harness** = governança/instrução, memória/estado e o
ferramental do próprio template. O check a aplica por uma **lista fixa de caminhos de harness**; **qualquer
outro caminho é produto**. Lista inicial:

- governança e estado: `AGENTS.md`, `AGENTS.core.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `SECURITY.md`,
  `README.md`, `CHANGELOG.md`, `STATE.md`, `PLAN.md`, `MEMORY.md`, `CODEOWNERS`, `LICENSE`,
  `feature-ledger.json`;
- diretórios: `docs/` **exceto `docs/product/`** (que é produto), `tools/`, `scripts/`, `skills/`,
  `presets/`, `templates/`, `.github/`, `.orion/`, `.claude/`;
- configuração do repositório: `package.json`, `package-lock.json`, `tsconfig.json`, `eslint.config.mjs`,
  `commitlint.config.js`, `vitest.config.ts`, `init.sh` e os arquivos ocultos de configuração da raiz
  (`.editorconfig`, `.env.example`, `.gitignore`, `.gitleaksignore`, `.nvmrc`, `.pre-commit-config.yaml`,
  `.prettierignore`, `.prettierrc.json`).

A lista vive no código do check. **Mudá-la é emenda deste ADR (G2)**, não um PR comum — pôr um caminho de
produto nela desligaria a exigência.

**Limite declarado:** a configuração da raiz (`package.json`, `tsconfig.json` e afins) conta como harness,
mesmo quando um projeto derivado a usa como config do executor. Tratá-la como produto bloquearia para sempre
os PRs de atualização de dependências (Dependabot), que não têm testes de outro modelo.

**Limite declarado:** `tools/`, `scripts/`, `presets/` e `templates/` contam inteiros como harness. No template,
essas pastas são do harness e o código de produto vive fora delas (ex.: `src/`); um projeto derivado que ponha
código de produto ali deve **emendar a lista** (G2) — senão o check não exige nada nesses caminhos.

**5. Verificado por máquina, sem integrar; vigência.** O check confere os **commits do PR** (ADR-0039 ponto 4)
e **não integra** — merge segue humano. A força da prova é a do ADR-0040 (trailer declarado). A regra passa a
valer **com o merge da fatia b da #327**, que também atualiza o checklist de Product Review
(`docs/agent-reviewer-checklist.md`); até lá, vale o ADR-0018 como está.

**6. Relação com o ADR-0018 e o ADR-0030.** Para PR de **produto**, este ADR torna **obrigatório e
verificado por máquina** o que o ADR-0018 só pede por atestação: o teste de aceite do outro modelo
**commitado** com a marca. A revisão do ADR-0018 (o revisor deriva e avalia testes de aceite) continua
obrigatória em qualquer PR, inclusive de harness sem rótulo. Este ADR define só o que o check **impõe
sozinho**: ele **não dispensa** nada do ADR-0030 — onde o pipeline do 0030 vale (T2+ com comportamento
observável, após a sua amarração), vale com ou sem o rótulo; o rótulo `cross-model` apenas **liga** a
verificação automática num PR de harness.

## Alternativas consideradas

- **Obrigatório em todo PR com código.** Rejeitada (Isa): pesaria em todo trabalho do harness, onde a
  revisão cross-model independente do ADR-0018 já cobre a independência.
- **Só por marcação, em qualquer PR.** Rejeitada (Isa): no produto, a regra precisa valer sem depender de
  alguém lembrar do rótulo.
- **Lista de produto** (em vez de lista de harness). Rejeitada: cada projeto derivado organiza o produto do
  seu jeito; o harness é conhecido e estável — listar o harness e tratar o resto como produto é o lado seguro.

## Consequências

- **Positiva:** nos projetos derivados do template, todo PR de produto passa a ter testes do outro modelo
  verificados por máquina.
- **Positiva:** o trabalho no harness não ganha atrito; a exigência é opt-in pelo rótulo `cross-model`.
- **Neutra:** o algoritmo exato vive no código do check, com testes — não neste ADR (evita regra em prosa
  que um check não consegue executar sem ambiguidade).
- **Negativa:** lista de harness incompleta faria um PR de harness exigir testes à toa — o lado seguro;
  corrige-se ajustando a lista.
- **Neutra:** neste repositório, quase só harness, o check raramente exige; o efeito aparece nos derivados.

## Conformidade

- **G2:** revisão humana deste ADR.
- **Fatia b da #327:** o check implementa os pontos 1–4 com um teste por caso (fail-closed na dúvida),
  atualiza o checklist de Product Review (ponto 5), rejeita valor fora da lista fechada e não integra; cria o rótulo `cross-model` em
  `.github/labels.yml`.
- **Append-only:** o ADR-0018 e o ADR-0040 recebem nota no cabeçalho apontando este ADR; as decisões não são
  editadas.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho deste. -->
