# ADR-0036 — token clássico project-only para o projetor de Projects (supersede ADR-0035 ponto 2)

- **Status:** proposto  <!-- humano aprova (G2) → muda para: aceito -->
- **Data:** 2026-09-30
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** **supersede o ponto 2** de [ADR-0035](0035-projetor-de-projects-usa-pat-de-menor-privilegio-para-board-user-owned.md) (os demais pontos do 0035 seguem vigentes) · T10.3 (#272) · `.github/workflows/project-board.yml`

## Contexto

O [ADR-0035](0035-projetor-de-projects-usa-pat-de-menor-privilegio-para-board-user-owned.md) (aceito) fixou,
no **ponto 2**, que o token do projetor deveria ser um **PAT fine-grained**. O deploy **refutou** essa
premissa: um **PAT fine-grained NÃO acessa Projects v2 de conta de usuário** (`Resource not accessible by
personal access token` na resolução do Project) — confirmado em duas tentativas. Logo o ponto 2 é
**incumprível** para board user-owned e precisa ser **superseditado** por decisão que reflita o que funciona,
mantendo o menor privilégio. Este ADR é **novo** (não emenda in-place) porque ADR é **append-only**: decisão
revista vira ADR novo (convenção do repo / ADR-0033).

## Decisão

1. **Token do projetor = PAT CLÁSSICO com escopo `project` APENAS.** Sem `repo` e sem `public_repo` — logo
   **incapaz de merge/push**. As leituras de issues/PRs vêm de **dados públicos** do repo (não exigem escopo
   de repo); a escrita de Status usa o escopo `project`.
2. **Supersede o ponto 2 do ADR-0035** (fine-grained). Os **demais pontos do ADR-0035 permanecem vigentes**:
   escritor único, nativas de Status off (ponto ce5006/§ escrita restrita), gate de ativação, identidade-por-ator
   aceita no Solo (ponto 7), gate de migração Solo→Time.
3. **Fine-grained fica rejeitado** para este caso (comprovadamente incapaz). Se o GitHub passar a suportar
   fine-grained para Projects v2 de usuário, um ADR futuro pode reconsiderar (menor blast radius potencial).

## Alternativas consideradas

- **PAT fine-grained (ADR-0035 ponto 2).** Rejeitada: **não funciona** para Projects v2 de conta de usuário
  (erro de acesso, confirmado 2×).
- **PAT clássico com `repo` + `project`** (o que estava vivo antes). Rejeitada: `repo` é **capaz de merge** —
  exposição de T3 desnecessária; `project`-only remove isso.
- **Conta-bot / board org-owned** (identidade isolada). Adiadas: reduzem o blast radius **de verdade**
  (acesso a Projects isolado), mas são o **upgrade do perfil Time** (ADR-0035 ponto 7); desproporcionais no Solo.

## Consequências

- **Positiva — fecha a exposição capaz-de-merge:** sem `repo`, um token vazado **não** mergeia/escreve código
  na `main` (a preocupação central do ADR-0035 ponto 4 fica **fechada**, não mais "a fechar").
- **Negativa — blast radius de Projects (user E org):** o escopo clássico `project` concede read/write a
  Projects v2 de **usuário E de organização** que o owner acessa ([docs do GitHub: scope `project`](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps#available-scopes)).
  Um token vazado poderia mutar (`item-delete`/`field-delete`) **qualquer** Project que o owner alcança — não
  só o Project 7 nem só os pessoais. É **maior** do que o ADR-0035 declarara (só "conta pessoal"). *Mitigação
  parcial:* só o board (Project 7) é reconstruível; token é secret armazenado. **Isolação real** = identidade
  cujo acesso a Projects seja restrito (conta-bot colaboradora só do Project 7 / org sob App) — upgrade Time.
  **Este residual (maior, org-inclusive) é o que o G2 deste ADR aceita explicitamente para o perfil Solo.**
- **Segurança/confiança:** sem mudança nos gates (G1/G2/G3); o projetor abre/escreve Status, nunca integra.

## Conformidade

- O secret `PROJECTS_TOKEN` é um **PAT clássico com só `project`** (sem `repo`/`public_repo`) — ato humano,
  verificável na descrição do PAT.
- **Escrita validada ao vivo:** um `workflow_dispatch` **não-dry-run** (reconciliação) do `project-board`
  completa **verde** — como o `sync_issue` é fail-closed (erro de `updateProjectV2ItemFieldValue` ⇒ run
  vermelho), um run verde com os `::notice::#N → coluna` **prova** que o `project`-only **escreve** Status.
  Evidência: run `36714252027` (2026-09-30) — 90 itens projetados (86 Done + 4 Blocked), verde.
- Espelhos (`docs/runbooks/github-projects.md`, comentário do `project-board.yml`) descrevem `project`-only.
- Nota de supersedência **append** no ponto 2 do ADR-0035 apontando para este ADR.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho do antigo. -->
