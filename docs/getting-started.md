# Começando um projeto a partir do Orion Harness

Guia para inicializar um novo projeto a partir deste template, preservando contexto, governança e
qualidade desde o primeiro commit.

## 1. Criar o repositório

Clique em **"Use this template" → Create a new repository** no GitHub. Isso gera um repositório
independente com toda a fundação.

## 2. Personalizar a base

- [ ] `CODEOWNERS` — substitua `@owner`/placeholders pelo seu usuário ou equipe.
- [ ] `LICENSE` — confirme a licença (padrão: MIT) e o detentor do copyright.
- [ ] `README.md` — ajuste o topo para descrever **seu** produto.
- [ ] `CHANGELOG.md` — limpe o histórico do harness e comece o do produto.
- [ ] `PLAN.md` — substitua os épicos de exemplo pelo plano do seu projeto.
- [ ] `STATE.md` — reinicie o estado (sem épico ativo ainda).

## 3. Ativar guardrails locais

```bash
pipx install pre-commit        # ou: pip install pre-commit --break-system-packages
pre-commit install
pre-commit install --hook-type commit-msg
```

Escolha e copie o preset da sua stack de [`../presets/`](../presets/) e garanta os scripts
`lint`/`test`/`build` (o CI os executa automaticamente).

## 4. Configurar o GitHub

- [ ] Proteção de `main` — siga [`runbooks/branch-protection.md`](runbooks/branch-protection.md).
- [ ] Labels — sincronizam pelo workflow `labels`. Rode uma vez ao iniciar o projeto:
      Actions → `labels` → Run workflow (ou `gh workflow run labels.yml`).
- [ ] GitHub Project (board) — siga [`runbooks/github-projects.md`](runbooks/github-projects.md).
- [ ] Segredos — configure em Settings → Secrets; ative secret scanning e push protection.
- [ ] Ajuste [`../.github/dependabot.yml`](../.github/dependabot.yml) aos ecossistemas usados.

## 5. Fase 0 — Prime (contexto antes de planejar)

Antes de qualquer plano, preencha o contexto (gate **G0**):

- [ ] [`product/product-context.md`](product/product-context.md)
- [ ] [`product/spec.md`](product/spec.md) (incluindo o bloco **Data-First**)

Se faltar contexto, conduza o discovery
([`product/discovery-guide.md`](product/discovery-guide.md)).

## 6. Initialize — bootstrap do ambiente (`init.sh`)

O **`init.sh`** (raiz do repositório) é o script de bootstrap **reproduzível do ambiente executável**
proposto pelo papel **Initializer** (`AGENTS.md` §2.2, [ADR-0007](decisions/0007-papel-initializer.md)).
Ele roda **uma vez** no bootstrap do projeto e faz duas coisas:

1. **Sobe o ambiente** — instala as dependências da **stack padrão Node/TypeScript**
   ([ADR-0005](decisions/0005-stack-padrao-node-typescript.md)): `npm ci` (ou `npm install`),
   espelhando a trilha node do [`../.github/workflows/ci.yml`](../.github/workflows/ci.yml). Outras
   stacks são **templates futuros** (ADR-0005) — adapte este `init.sh` se a sua diferir.
2. **Roda o smoke do _produto_** — uma checagem de fumaça de que o **produto** sobe e responde
   (ex.: subir o serviço e checar `/health`; ou um e2e mínimo).

**Convenção — dois smokes distintos, não confunda:**

| Script | Objeto | Papel |
|--------|--------|-------|
| `init.sh` (smoke) | o **produto** que você constrói | prova que o ambiente runnable sobe e o produto responde |
| [`../scripts/smoke-test.sh`](../scripts/smoke-test.sh) | o **harness** | autovalidação dos guardrails (roda no CI) |

O smoke do produto no `init.sh` nasce como **placeholder** (`TODO`): **cada projeto o preenche** com o
comando real de fumaça do seu produto. O `init.sh` versionado aqui é o **template** dessa convenção.

Uso:

```bash
./init.sh            # sobe o ambiente e roda o smoke do produto
./init.sh --check    # dry-run seguro: imprime o que faria, sem efeitos colaterais; exit 0
```

O `--check` é um **dry-run sem efeitos** (útil em CI/inspeção); argumento inválido sai com `2`. Como
qualquer trabalho, o bootstrap entra pelo fluxo SDD (Issue → branch → PR → **merge humano**): o
`init.sh` é um script que o humano/agente **roda**, não um caminho que contorna gate.

## 7. Ciclo de evolução

Siga o pipeline da constituição:

`prime → initialize → plan → spec → build → review → ship`

> O **initialize** é um bootstrap opcional/one-time do ambiente executável (ver `AGENTS.md` §2.2),
> **gateado** como qualquer trabalho: Issue de bootstrap (G1) → branch → PR → merge humano (não é
> fase "livre"). As sessões seguintes entram direto no loop `plan → … → ship`.

1. **Plan** → épicos/tarefas LEAN no `PLAN.md` (gate **G1**).
2. **Spec** → cada tarefa vira uma **Issue SDD** (template); decisões viram **ADR** (gate **G2**).
3. **Build** → branch por Issue, TDD, Conventional Commits.
4. **Review** → revisor **independente**, por tipo de artefato (ADR-0008): produto →
   [`agent-reviewer-checklist.md`](agent-reviewer-checklist.md); mudança de governança/instruções →
   [`harness-reviewer-checklist.md`](harness-reviewer-checklist.md); ambos → as duas; PR só de
   memória/estado → Harness Review em escopo reduzido (`AGENTS.md` §2). Sempre seguido do review
   humano no PR.
5. **Ship** → PR com CI verde + aprovação (gate **G3**); atualize `STATE.md`/`CHANGELOG.md`.

> Leia [`../AGENTS.md`](../AGENTS.md) por inteiro: é a constituição que governa o agente no seu
> projeto.
