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

**1. Produto: testes do outro modelo são obrigatórios.** Um PR que toca **produto** só passa se os seus
commits de teste trazem `Model-Authored-By` de um modelo **distinto** do modelo dos commits de
implementação (lista fechada e comparação do ADR-0039 ponto 1; trailer declarado do ADR-0040).

**2. Harness: só por marcação.** Um PR que toca **só harness** tem a mesma exigência **apenas** quando leva o
rótulo `pipeline:contract`, aplicado pela mantenedora ou pelo agente. Sem o rótulo, não há exigência — o
check só confere os trailers presentes (valor da lista fechada; testes ≠ implementação quando ambos
marcados).

**3. O que é harness.** Harness é uma **lista fixa de caminhos**; **qualquer outro caminho é produto**
(fail-closed: na dúvida, exige). Lista inicial:

- governança e estado: `AGENTS.md`, `AGENTS.core.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `SECURITY.md`,
  `README.md`, `CHANGELOG.md`, `STATE.md`, `PLAN.md`, `MEMORY.md`, `CODEOWNERS`, `LICENSE`,
  `feature-ledger.json`;
- diretórios: `docs/`, `tools/`, `scripts/`, `skills/`, `presets/`, `templates/`, `.github/`, `.orion/`,
  `.claude/`;
- configuração do repositório: `package.json`, `package-lock.json`, `tsconfig.json`, `eslint.config.mjs`,
  `commitlint.config.js`, `vitest.config.ts`, `init.sh` e os arquivos ocultos de configuração da raiz
  (`.editorconfig`, `.env.example`, `.gitignore`, `.gitleaksignore`, `.nvmrc`, `.pre-commit-config.yaml`,
  `.prettierignore`, `.prettierrc.json`).

A lista vive no código do check (fatia b da #327); mudá-la é um PR revisado como qualquer outro (T2).

**4. Verificado por máquina, sem integrar.** Um check no PR aplica as regras 1–3 sobre os **commits do PR**
(o registro que vale, ADR-0039 ponto 4). Ele **não integra**: merge segue humano, com os checks e a revisão
de sempre. A força da prova é a do ADR-0040 (trailer declarado).

**5. Relação com o ADR-0018.** Para PR de **produto**, este ADR torna **obrigatório** o que o ADR-0018 trata
como preferível (testes escritos pelo outro modelo). Para **harness**, o ADR-0018 segue como está. Nada mais
no ADR-0018 muda.

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
- **Positiva:** o trabalho no harness não ganha atrito; a exigência é opt-in pelo rótulo.
- **Negativa:** lista de harness incompleta faria um PR de harness exigir testes à toa — o lado seguro;
  corrige-se ajustando a lista.
- **Neutra:** neste repositório, quase só harness, o check raramente exige; o efeito aparece nos derivados.

## Conformidade

- **G2:** revisão humana deste ADR.
- **Fatia b da #327:** o check classifica os arquivos pela lista do ponto 3, exige conforme os pontos 1–2,
  rejeita valor fora da lista fechada e não integra.
- **Append-only:** o ADR-0018 e o ADR-0040 recebem nota no cabeçalho apontando este ADR; as decisões não são
  editadas.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho deste. -->
