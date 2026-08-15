# PLAN — stub-ponteiro (o plano vive no GitHub)

> **Camada L1** (`AGENTS.md` §4). Este arquivo **deixou de ser a fonte do plano** (épico O9 — fim do
> Markdown autoral como fonte; [ADR-0025](docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md),
> simplificado pelo [ADR-0026](docs/decisions/0026-plano-milestone-com-descricao-sem-project-drafts.md)).
> É mantido como **stub-ponteiro transitório** enquanto o §4 o nomear (remoção definitiva = fatia futura).

## Onde o plano vive agora

- **Épico = GitHub Milestone.** Título = épico; **descrição** = `## Objetivo` + `## Tarefas` (checklist
  `- [ ] <tarefa LEAN>`, com `- [x] <tarefa> → #N` quando promovida a Issue). É o artefato aprovado no **G1**.
- **Tarefa = Issue SDD**, associada ao Milestone (fonte da verdade de status — L2).
- **Project** = board opcional (visão derivada), **não** é fonte.

## Como ler (get-bearings)

Relatório gerado **sob demanda** (precisa de rede/`gh`; o arquivo em `.orion/tmp/reports/` é
**gitignored** — não versionado):

```bash
node --experimental-strip-types tools/plan/plan-report.ts
```

Se o Node for < 22.6 (sem `--experimental-strip-types`), leia os Milestones direto:
`gh api "repos/{owner}/{repo}/milestones?state=all&per_page=100" --paginate` (ambos exigem rede/`gh`
autenticado; **`--paginate`** senão páginas somem). **Sem rede/sem auth**, o read-path offline vê
**apenas este stub** — ou use dados persistidos via `--input`/`--milestones`.
Runbook: [`docs/runbooks/github-projects.md`](docs/runbooks/github-projects.md).

> **Ao clonar o Orion Harness para um novo projeto:** crie os épicos do seu produto como **Milestones**
> (não edite este stub) — ver [`docs/getting-started.md`](docs/getting-started.md).
