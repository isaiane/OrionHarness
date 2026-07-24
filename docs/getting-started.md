# Começando um projeto a partir do Orion Harness

Guia para inicializar um novo projeto a partir deste template, preservando contexto, governança e
qualidade desde o primeiro commit.

> **Comece carregando o núcleo; o detalhe sob demanda** ([ADR-0019](decisions/0019-nucleo-l0-condensado.md)):
> leia [`../AGENTS.core.md`](../AGENTS.core.md) — o **núcleo L0** com as regras inegociáveis por sessão —
> e abra a seção `§X` de [`../AGENTS.md`](../AGENTS.md) (a constituição **canônica** e completa) **quando
> a tarefa exigir**. O `AGENTS.md` vence em qualquer divergência; o núcleo é uma **visão** derivada dele.
>
> **Duas partes, nesta ordem de autoridade.** Os **passos 1–4** são o **bootstrap humano do template**,
> feito **uma vez** por uma pessoa que adota o template (criar o repo, substituir o conteúdo de exemplo,
> ativar guardrails, configurar o GitHub) — **não** são o agente operando sob os gates, e por isso
> **precedem o G0**. O **ciclo do agente**, **gateado** (**Prime/G0 → _Initialize/G1 (se o ambiente
> runnable não existe, §6)_ → Plan/G1 → Spec → Build → Review → Ship/G3**), começa em **§5 (Prime)**:
> **nenhuma mutação de estado/governança nem planejamento _pelo agente_** ocorre antes do **G0** — e,
> num repo sem ambiente runnable, o **Initialize** (bootstrap gateado, §6) vem **antes do Plan**.

> **Passos 1–4 — bootstrap humano do template (uma vez).** Feitos por **uma pessoa** que adota o
> template; **precedem** o ciclo gateado do agente. Não são o agente mutando estado/governança sob os
> gates — são a preparação humana do repositório.

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
- [ ] `feature-ledger.json` — **reinicie para `[]`** (origem local): as entradas são do Orion (exemplo)
      e não se aplicam ao seu projeto. Faça no **bootstrap** (commit direto na `main`, com os resets
      acima, **antes do §4** que configura a **proteção da `main`** — a rota direta é sancionada porque a
      proteção ainda não existe; ver [`CONTRIBUTING.md`](../CONTRIBUTING.md) § Branches). Isso
      **estabelece a origem local** do ledger e o **append-only**
      ([ADR-0006](decisions/0006-ledger-executavel-de-tarefas.md)) passa a valer a partir dela — sem
      violar o invariante, que só rege as PRs do agente **depois** (ver
      [ADR-0016](decisions/0016-politica-projecao-ledger.md) § Consequências).

## 3. Ativar guardrails locais

```bash
pipx install pre-commit        # ou: pip install pre-commit --break-system-packages
pre-commit install
pre-commit install --hook-type commit-msg
```

Copie o preset da stack de referência **Node/TypeScript** de
[`../presets/typescript/`](../presets/typescript/) e garanta os scripts `lint`/`test`/`build` (o CI
os executa automaticamente). Outras linguagens são templates futuros (ADR-0005/ADR-0012).

## 4. Configurar o GitHub

- [ ] Proteção de `main` — siga [`runbooks/branch-protection.md`](runbooks/branch-protection.md).
- [ ] Labels — sincronizam pelo workflow `labels`. Rode uma vez ao iniciar o projeto:
      Actions → `labels` → Run workflow (ou `gh workflow run labels.yml`).
- [ ] GitHub Project (board) — siga [`runbooks/github-projects.md`](runbooks/github-projects.md).
- [ ] Segredos — configure em Settings → Secrets; ative secret scanning e push protection.
- [ ] Ajuste [`../.github/dependabot.yml`](../.github/dependabot.yml) aos ecossistemas usados.

> **A partir daqui — ciclo do agente, gateado.** O **Prime (G0)** é a **primeira ação do agente**;
> **nenhuma** mutação de estado/governança nem planejamento **pelo agente** ocorre antes deste ponto (e,
> quando há ambiente a montar, antes da **Issue de bootstrap G1**, §6). Os passos 1–4 acima foram
> bootstrap **humano**.

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

## 7. Ritual de início de sessão (get-bearings)

> **Toda sessão de trabalho começa pegando o estado** — antes de implementar qualquer coisa. É a
> contraparte de **início** da _Regra de compactação_ (`AGENTS.md` §4, que **fecha** a sessão gravando
> o estado). Operacionaliza o §8.1 (**verde não é prova de correção**) como **ritmo**: você se orienta
> e roda a regressão **antes** de escrever código, não depois.

Na ordem, antes de tocar em código:

1. **Onde estou** — `pwd` + `git status`: confirme o diretório, a branch e a árvore limpa (e que a
   `main` local está atualizada).
2. **Retome o ponteiro** — leia o [`../STATE.md`](../STATE.md): *Agora*, *Próximo passo* e
   *última conclusão*.
3. **Contexto da tarefa** — varredura leve: [`../PLAN.md`](../PLAN.md) (mapa de épicos),
   [`../feature-ledger.json`](../feature-ledger.json) (o que está `passes:false` / escopo) e
   `git log --oneline -10` (o que mudou por último).
4. **Ambiente runnable** — `./init.sh --check`: confirme que o bootstrap sobe (dry-run seguro, sem
   efeitos; ver §6).
5. **Regressão antes de codar** — rode **1–2 checks core**: `npm run typecheck` + `npm test` (ou
   `bash scripts/smoke-test.sh` — este agora requer `npm ci` antes, pois a camada estática usa o parser
   `js-yaml`, [ADR-0020](decisions/0020-parser-yaml-smoke-test.md)). É a **regressão por sessão** —
   estabelece a linha de base verde **antes** da sua mudança, para que qualquer quebra posterior seja
   atribuível a ela.

O ritual é **só leitura + dry-run + testes** (classe T0/T1): **orienta**, não muta o repo nem contorna
gate. Só depois de pegar o estado você entra no ciclo abaixo.

## 8. Ciclo de evolução

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

> **Fast-lane (T1)** — mudanças **estritamente T1** de baixo risco (que não cruzam G1/G2, não
> tocam governança/dado sensível, cabem em 3–4 arquivos e são reversíveis) podem **dispensar a Issue
> SDD e o ADR** e ir direto a um **PR leve**, **sem** afrouxar CI verde nem **merge humano (G3)**.
> Regra e predicado rodável em `AGENTS.md` §11.2 /
> [ADR-0017](decisions/0017-fast-lane-baixo-risco.md) / [`examples/fast-lane-eligibility.ts`](examples/fast-lane-eligibility.ts).
