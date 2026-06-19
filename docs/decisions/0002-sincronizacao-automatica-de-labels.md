# ADR-0002 — Sincronização automática de labels via workflow

> Architecture Decision Record (`AGENTS.md` §3, gate G2). ADRs são **append-only**.

- **Status:** aceito
- **Data:** 2026-06-18
- **Decisores:** Isa (mantenedora) — aprovação do gate G2 via handoff da tarefa
- **Relacionado a:** Issue #11; gap descoberto na Issue #9; `.github/labels.yml`

## Contexto

O `.github/labels.yml` declara a convenção de labels do harness (dimensões `type:*`,
`priority:*`, `trust:*`, `stack:*`, fluxo), mas era um artefato **inerte**: nada o aplicava ao
repositório. A Issue #9 expôs o efeito — as labels `type:docs`/`stack:web` tiveram de ser criadas
à mão antes do `gh issue create`, e todo repositório gerado pelo template nasce sem as labels da
convenção, quebrando o fluxo de Issues/Projects e o Dependabot (que rotula PRs com `type:chore`).

Adicionar uma automação persistente em `.github/` com permissão de escrita (`issues: write`) é uma
decisão de **processo e segurança** — cruza o gate **G2** e exige registro em ADR.

## Decisão

Adotaremos um workflow `labels` (`.github/workflows/labels.yml`) que aplica `.github/labels.yml`
ao repositório usando `crazy-max/ghaction-github-labeler@v5`, disparado no `push` à `main` que
altere o arquivo e por `workflow_dispatch`. O `.github/labels.yml` passa a ser a **fonte da
verdade** efetiva das labels.

Salvaguardas:

- `skip-delete: true` — o workflow **nunca apaga** labels fora do arquivo (não destrói labels
  manuais ou herdadas; seguro para o template).
- `permissions: issues: write` no escopo do job — menor privilégio (`AGENTS.md` §10).
- Action de terceiro **pinada por tag** e coberta pelo Dependabot (`github-actions`), que mantém
  a versão atualizada.

## Alternativas consideradas

- **`micnncim/action-label-syncer`** (citada no comentário original): funcional, mas menos mantida
  e seu modo de sincronização padrão apaga labels ausentes do arquivo — risco maior para um
  template. Preterida pela falta de um `skip-delete` equivalente seguro.
- **Sincronização manual via `gh label create`** (status quo): zero dependências, mas inerte por
  definição — reintroduz exatamente o gap da Issue #9 em cada projeto novo. Preterida.
- **Script local + pre-commit:** exigiria token/escopo na máquina do dev e não roda no GitHub;
  pior paridade e pior segurança. Preterida.

## Consequências

- **Positivas:** a convenção de labels passa a ter efeito; projetos do template ganham as labels
  com um clique (`Run workflow`); rastreabilidade via aba Actions (Data-First).
- **Negativas / dívida:** nova dependência de action de terceiro (mitigada por pin + Dependabot) e
  um workflow com escopo de escrita (mitigado por menor privilégio + `skip-delete`).
- **Modelo de confiança:** a automação opera em classe T2 (efeito reversível com review). Apagar
  labels permanece fora de escopo.

## Conformidade

- O workflow referencia `yaml-file: .github/labels.yml` e roda nos gatilhos declarados.
- Verificação (`AGENTS.md` §8.1): alterar `labels.yml` e mergear → labels aparecem/atualizam;
  `workflow_dispatch` sincroniza; labels preexistentes não são apagadas (`skip-delete: true`).
