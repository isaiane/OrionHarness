# docs/plans/ — stub-ponteiro

> **Camada L1** (`AGENTS.md` §4). O detalhamento por épico **não vive mais** em Markdown autoral aqui
> (épico O9; [ADR-0025](../decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md) /
> [ADR-0026](../decisions/0026-plano-milestone-com-descricao-sem-project-drafts.md)); o **modelo de plano
> vigente** é o v2 ([ADR-0031](../decisions/0031-modelo-plano-v2-milestone-completo-hierarquia-nativa.md)).

O **épico** e seu detalhamento vivem na **descrição do Milestone** (**plano completo**: `## Objetivo` + um
bloco de design por tarefa + `## Como iniciar` — ADR-0031); a **tarefa** vive na **Issue SDD** associada
(hierarquia/status nativos, sem `- [x] → #N`). Leitura sob demanda (precisa de rede/`gh`):
`node --experimental-strip-types tools/plan/plan-report.ts`. Ver [`../../PLAN.md`](../../PLAN.md) e
[`../runbooks/github-projects.md`](../runbooks/github-projects.md).
