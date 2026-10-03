# ADR-0041 — testes do outro modelo: obrigatórios em PR de produto, por marcação em PR de harness

- **Status:** proposto
- **Data:** 2026-10-03
- **Decisores:** Isa (owner) — **G2 pendente**
- **Relacionado a:** [ADR-0018](0018-revisao-cross-model.md) (cross-model; testes do revisor hoje
  *preferíveis*) · [ADR-0039](0039-marcador-de-autoria-modelo.md) (trailer `Model-Authored-By`, lista
  fechada) · [ADR-0040](0040-v1-testes-pelo-codex-no-pr.md) (v1: testes pelo `@codex` no PR de contrato,
  trailer declarado) · [ADR-0030](0030-pipeline-spec-tests-implementation.md) §9 (recorte por classe) · épico
  **O12** ([#17](https://github.com/isaiane/OrionHarness/milestone/17)), Issue **#327**

## Contexto

O ADR-0039 e o ADR-0040 deram aos commits um marcador de autoria-modelo (`Model-Authored-By`) e um caminho
para o Codex escrever os testes (`@codex` no PR de contrato). Falta dizer **onde** isso é obrigatório. Hoje o
ADR-0018 trata os testes escritos pelo revisor como **preferíveis**, não como requisito; o ADR-0030 só os
torna requisito depois da sua amarração, ainda não feita.

A mantenedora decidiu (2026-10-03) onde a regra pesa: no **produto** — o sistema que o projeto constrói —,
e não no **harness** — governança, documentação e ferramental deste próprio template —, onde ela fica a
critério de quem trabalha.

## Decisão

**1. Produto: testes do outro modelo são obrigatórios.** O **PR final** de uma mudança que toca **produto**
— o que tem testes e implementação — só passa se os commits de **teste** trazem `Model-Authored-By` de um
modelo **distinto** do dos commits de **implementação** (lista fechada e comparação do ADR-0039 ponto 1;
trailer declarado do ADR-0040). Onde a regra exige, **todo** commit que toca produto — de teste **ou** de
implementação — tem **exatamente um** `Model-Authored-By` válido; commit sem marca é **bloqueado** (sem isso, o
check compararia os testes com "ninguém"). O **PR de contrato** (`tests/issue-N`, só testes) é conferido no que lhe cabe:
os commits de teste têm o trailer, com valor da lista fechada.

**2. Harness: só por marcação, com rótulo próprio.** Um PR que toca **só harness** tem a exigência do ponto 1
**apenas** com o rótulo **`cross-model`**, aplicado no **PR final** pela mantenedora ou pelo agente. O rótulo
`pipeline:contract` segue marcando o PR de contrato (`.github/labels.yml`) e **não** liga esta exigência. Sem
o rótulo `cross-model`, o check só confere os trailers presentes (valor da lista fechada; testes ≠
implementação quando ambos marcados).

**3. Produto × harness — a taxonomia do `AGENTS.md` §2.** A separação segue a que o `AGENTS.md` §2 já usa para
escolher entre Harness Review e Product Review: **produto** = código, testes e config do agente executor
**e os documentos de `docs/product/`**; **harness** = artefatos de governança/instrução, memória/estado e o
ferramental do próprio template. O check a aplica por uma **lista fixa de caminhos de harness**; **qualquer
outro caminho é produto** (fail-closed: na dúvida, exige). Lista inicial:

- governança e estado: `AGENTS.md`, `AGENTS.core.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `SECURITY.md`,
  `README.md`, `CHANGELOG.md`, `STATE.md`, `PLAN.md`, `MEMORY.md`, `CODEOWNERS`, `LICENSE`,
  `feature-ledger.json`;
- diretórios: `docs/` **exceto `docs/product/`** (que é produto), `tools/`, `scripts/`, `skills/`,
  `presets/`, `templates/`, `.github/`, `.orion/`, `.claude/`;
- configuração do repositório: `package.json`, `package-lock.json`, `tsconfig.json`, `eslint.config.mjs`,
  `commitlint.config.js`, `vitest.config.ts`, `init.sh` e os arquivos ocultos de configuração da raiz
  (`.editorconfig`, `.env.example`, `.gitignore`, `.gitleaksignore`, `.nvmrc`, `.pre-commit-config.yaml`,
  `.prettierignore`, `.prettierrc.json`).

A lista vive no código do check (fatia b da #327). **Mudá-la é emenda deste ADR (G2)**, não um PR comum: a
lista define o alcance de uma regra de governança — pôr um caminho de produto nela desligaria a exigência.

**Limite declarado:** a configuração da raiz (`package.json`, `tsconfig.json` e afins) conta como harness,
mesmo quando um projeto derivado a usa como config do executor. Tratá-la como produto bloquearia para sempre
os PRs de atualização de dependências (Dependabot), que não têm testes de outro modelo.

**4. Papel de cada commit.** Arquivo de **teste** = caminho `*.test.*` ou `*.spec.*`, ou dentro de um diretório
`tests/`, `test/`, `__tests__/`, `fixtures/`, `__fixtures__/`, `mocks/` ou `__mocks__/` (fixtures e mocks, que o
ADR-0030 §6 permite ao autor dos testes). Um commit que só toca arquivos de teste é **de teste**; um que só toca
arquivos que não são de teste é **de implementação**; um que **mistura** os dois é **inválido** onde a regra
exige (fail-closed) — não dá para saber de quem é cada parte.

**5. Verificado por máquina, sem integrar.** Um check no PR aplica os pontos 1–4 sobre os **commits do PR** (o
registro que vale, ADR-0039 ponto 4). Ele **não integra**: merge segue humano, com os checks e a revisão de
sempre. A força da prova é a do ADR-0040 (trailer declarado).

**6. Vigência.** A regra passa a valer **com o merge da fatia b da #327** (o check), que também atualiza o
checklist de Product Review (`docs/agent-reviewer-checklist.md`) para pedir essa evidência. Até lá, vale o
ADR-0018 como está.

**7. Relação com o ADR-0018 e o ADR-0030.** Para PR de **produto**, este ADR torna **obrigatório** o que o
ADR-0018 trata como preferível (testes escritos pelo outro modelo). Este ADR define só o que o check **impõe
sozinho**: ele **não dispensa** nada do ADR-0030 — onde o pipeline do 0030 vale (T2+ com comportamento
observável, após a sua amarração), vale com ou sem o rótulo; o rótulo `cross-model` apenas **liga** a
verificação automática num PR de harness.

## Alternativas consideradas

- **Obrigatório em todo PR com código.** Rejeitada (Isa): pesaria em todo trabalho do harness, onde a
  revisão cross-model (`@codex review`) já cobre a independência.
- **Só por marcação, em qualquer PR.** Rejeitada (Isa): no produto, a regra precisa valer sem depender de
  alguém lembrar do rótulo.
- **Lista de produto** (em vez de lista de harness). Rejeitada: cada projeto derivado organiza o produto do
  seu jeito; o harness é conhecido e estável — listar o harness e tratar o resto como produto é o lado seguro.

## Consequências

- **Positiva:** nos projetos derivados do template, todo PR de produto passa a ter testes do outro modelo
  verificados por máquina.
- **Positiva:** o trabalho no harness não ganha atrito; a exigência é opt-in pelo rótulo `cross-model`.
- **Negativa:** lista de harness incompleta faria um PR de harness exigir testes à toa — o lado seguro;
  corrige-se ajustando a lista.
- **Neutra:** neste repositório, quase só harness, o check raramente exige; o efeito aparece nos derivados.

## Conformidade

- **G2:** revisão humana deste ADR.
- **Fatia b da #327:** o check classifica os arquivos pela lista do ponto 3 e os commits pelo ponto 4, exige
  conforme os pontos 1–2 (inclusive a marca em todo commit que toca produto), atualiza o checklist de Product
  Review (ponto 6), rejeita valor fora da lista fechada e não integra; cria o rótulo `cross-model` em
  `.github/labels.yml`.
- **Append-only:** o ADR-0018 e o ADR-0040 recebem nota no cabeçalho apontando este ADR; as decisões não são
  editadas.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho deste. -->
