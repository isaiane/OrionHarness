# Contribuindo no Orion Harness

Este guia operacionaliza a constituição [`AGENTS.md`](AGENTS.md). Em conflito, **`AGENTS.md`
prevalece**. Vale para contribuidores humanos e agentes.

## Fluxo de contribuição (resumo do pipeline)

1. **Prime (Fase 0).** Confirme que `docs/product/` (Product Context + Spec) cobre o necessário.
   Se não, rode o discovery ([`docs/product/discovery-guide.md`](docs/product/discovery-guide.md)).
   Gate **G0**.
2. **Initialize** _(opcional/one-time, entre Prime e Plan)_. Quando o **ambiente runnable ainda não
   existe**, faça o bootstrap (`init.sh`, progress, commit inicial) — `AGENTS.md` §2.2 / ADR-0007.
   É **gateado**: uma **Issue de bootstrap de 1ª classe** com **G1 próprio** (aprovada após o Prime,
   sem depender de Plan→Spec) → branch → PR → **merge humano**. Se o ambiente já existe, pule direto
   para o Plan.
3. **Plan.** O trabalho entra em [`PLAN.md`](PLAN.md) como épico/tarefas LEAN. Gate **G1**
   (aprovação humana) antes de virar Issues.
4. **Spec.** Cada tarefa LEAN vira uma **Issue SDD** (template de tarefa). Decisões arquiteturais
   viram **ADR** em [`docs/decisions/`](docs/decisions/). Gate **G2**.
5. **Build.** Trabalhe em uma branch por Issue, com TDD.
6. **Review.** Revisor **independente**, por tipo de artefato (ADR-0008): mudança de **governança/instruções** →
   [Harness Review](docs/harness-reviewer-checklist.md); **produto** →
   [Product Review](docs/agent-reviewer-checklist.md); ambos → as duas; PR **só de memória/estado**
   (`PLAN.md`/`docs/plans/`/`STATE.md`/`CHANGELOG.md`/`MEMORY.md`/ledger) → Harness Review em **escopo reduzido**
   (`AGENTS.md` §2). Em todos os casos, segue o **review humano** no PR.
   - **Re-review após fix (revisor automatizado)** ([ADR-0010](docs/decisions/0010-re-review-automatizado-apos-fix.md)).
     Quando um revisor automatizado (ex.: **Codex**) deixa achados e o autor aplica o fix (commit +
     push na branch do PR), **por padrão** responde-se inline ao achado apontando o commit **e**
     solicita-se um novo review comentando `@codex review` no PR — sem esperar pedido. O Codex só
     reavalia quando acionado por comentário, não no push; esta convenção fecha o ciclo
     revisar→corrigir→re-revisar. Não dispensa o **review humano** (G3).
7. **Ship.** Merge com CI verde. Gate **G3**.

> **Fast-lane (T1)** — [ADR-0017](docs/decisions/0017-fast-lane-baixo-risco.md), `AGENTS.md` §11.2.
> Mudanças **estritamente T1** de baixo risco (ex.: typo em doc, ajuste reversível) que **não**
> cruzam G1/G2, **não** tocam governança/dado sensível, cabem em 3–4 arquivos e são reversíveis podem
> **dispensar a Issue SDD de 10 campos e o ADR** (passos 4) — abrindo direto um **PR leve** (descrição
> de 1–3 linhas + critério de aceite + classe declarada). **Mantêm-se** branch → PR → CI verde →
> **merge humano (G3)** e a Review pelo artefato. Qualquer critério que falhe → **fluxo SDD completo**
> (default `full`; "na dúvida, sobe de nível"). O predicado
> [`docs/examples/fast-lane-eligibility.ts`](docs/examples/fast-lane-eligibility.ts) decide `fast|full|blocked`.

## Branches (trunk-based)

- `main` é protegida e **sempre liberável**. Nada de commits diretos.
- Uma branch curta por Issue:
  - `feat/<nº>-slug` — nova funcionalidade
  - `fix/<nº>-slug` — correção
  - `docs/<nº>-slug` — documentação
  - `chore/<nº>-slug` — manutenção
  - `fast/<slug>` — **fast-lane issue-less** (T1, sem Issue — `AGENTS.md` §11.2/ADR-0017)
- Branches são de vida curta; PRs pequenos e frequentes. Trabalho incompleto fica atrás de feature
  flag, não em branch longeva.
- `release/*` é um **preset opcional** para projetos com versionamento formal.

## Commits (Conventional Commits)

Formato: `tipo(escopo opcional): descrição` — ex.: `feat(auth): adiciona login por OTP (#42)`.
Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`. Referencie a
Issue (`#<nº>`) — **exceto na fast-lane issue-less** (§11.2), onde os commits **não** têm `#<nº>` (a
referência ao `#<PR>` é permitida após a abertura). O commitlint valida as mensagens no CI (sobre o
range do PR).

**Limites de linha (commitlint):** o **cabeçalho** deve ter no máximo **100 caracteres** e
**cada linha do corpo** também **≤ 100 caracteres** (`body-max-line-length`). Quebre o corpo em
linhas/parágrafos curtos — no terminal, use vários `-m`, um por parágrafo:

```bash
git commit \
  -m "feat(auth): adiciona login por OTP (#42)" \
  -m "Primeiro parágrafo do corpo, com no máximo 100 colunas por linha." \
  -m "Segundo parágrafo, idem."
```

## Pull Requests

- Escopado a **uma** Issue; use o [template de PR](.github/PULL_REQUEST_TEMPLATE.md). **Na fast-lane
  issue-less** (T1, §11.2), o PR **não** tem Issue: omita o `Closes #<nº>`, marque os itens que
  dependem da Issue como **N/A (fast-lane)** e descreva o critério de aceite + a classe direto no PR
  (o PR é a unidade de rastreabilidade). Elegibilidade que caia durante a execução → reintroduz a
  Issue e o fluxo completo.
- Preencha a verificação de correção (§8.1) e o checklist de DoD (§12).
- Exige **CI verde** + **aprovação humana** (ver [`CODEOWNERS`](CODEOWNERS)) antes do merge.
- Ações classe **T3** (irreversíveis/alto risco) exigem gate **G3** explícito.
- **Ledger (semeia-e-cresce, [ADR-0006](docs/decisions/0006-ledger-executavel-de-tarefas.md)):** ao
  abrir o PR de uma tarefa, **projete a própria Issue** no ledger e committe o delta — assim o ledger
  cresce **distribuído por PR**, sem projetar tarefas ainda não-prontas:

  ```bash
  gh issue view <nº> --json number,title,body,labels | jq '[.]' > /tmp/issue.json
  node --experimental-strip-types tools/ledger/ledger-from-issues.ts \
    --issues-json /tmp/issue.json --ledger feature-ledger.json --write
  ```

  As entradas novas **nascem `passes:false`** (o `ledger-guard` aprova). **A flip para `passes:true`**
  (com a validação aplicável — e2e só quando o [ADR-0009](docs/decisions/0009-verificacao-e2e-ferramenta-real.md)
  exigir — e o seu owner/gatilho) ainda **não tem lifecycle definido** no ledger: hoje o gerador hardcoda
  o step e2e e o schema o exige, então **todas** as entradas ficam `false`. Fechar isso (inclusive p/
  tarefas **sem superfície e2e**) é o **follow-up #85**. O ritual de início de sessão (T2.4) reforça a checagem.
  - **Escopo de projeção — quais Issues entram ([ADR-0016](docs/decisions/0016-politica-projecao-ledger.md), #73):**
    projeta-se **toda `type:task` não-duplicada no escopo do ledger**, **no próprio PR da tarefa**
    (pré-merge, `passes:false`; é o caminho per-PR acima), uma entrada por critério de aceite, semântica
    as-accepted. **Escopo do ledger = tarefas a partir de quando o ledger passou a existir neste
    repositório** (neste repo: o ADR-0006, marco #29) — corte por **marco local**, não por número de
    Issue. Ficam **fora**, por definição (não é dívida): **pré-ledger** — `type:task` fechadas **antes de
    o ledger existir no repo** (neste repo: #15/#18/#21/#23/#26; nunca houve ledger para projetá-las, sem
    backfill retroativo) — e **duplicatas** sem entrega própria (neste repo: #30 dup de #29, #46 dup de
    #45). O **backfill** é a exceção de reconciliação, só para tarefas no escopo que deixaram de projetar
    por drift, pelo mesmo gerador, `passes:false`, delta aditivo. _(Repos derivados do template têm
    numeração própria: o corte é o marco local de criação do ledger, não estes IDs — exemplos do Orion.)_
  - **Semântica *as-accepted* ([ADR-0014](docs/decisions/0014-semantica-ledger-as-accepted.md)):** o
    ledger é projeção **histórica por Issue**, fiel ao que a Issue **entregou/foi aceita** — não
    reconciliada ao estado atual dos artefatos. Se o corpo da Issue divergir da **própria entrega**
    (rascunho impreciso, comprovável no git/artefatos do merge), **corrija o corpo para a redação
    entregue** — com racional registrado — **antes** de projetar; **não** persiga evolução feita por
    Issue posterior (isso seria *as-current*).
  - **Exceção (gerador com bug conhecido):** se o gerador **não puder projetar corretamente** os
    critérios (ex.: bug de parsing), **difira** a projeção com uma **issue de follow-up rastreada**
    (e registre no `STATE.md`) em vez de gravar entradas incorretas — o ledger é **append-only**, e
    entrada errada não pode ser limpa depois. A projeção entra quando o gerador estiver correto.

## Gestão de tarefas (GitHub Projects)

- **Issues SDD** = tarefas; **Milestones** = épicos; **Project (board)** = fluxo.
- Veja [`docs/runbooks/github-projects.md`](docs/runbooks/github-projects.md) para a configuração
  do board, campos e automações sugeridas.
- Proteção de `main` e checks obrigatórios em
  [`docs/runbooks/branch-protection.md`](docs/runbooks/branch-protection.md).

## Definição de pronto

Uma contribuição só está pronta quando atende ao **DoD global** (`AGENTS.md` §12). Mantenha o
repositório **verde**.
