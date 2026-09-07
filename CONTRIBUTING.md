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
3. **Plan.** O trabalho entra num **Milestone** (título = épico; descrição = **plano completo**:
   `## Objetivo` + um bloco de design por tarefa + `## Como iniciar` — [ADR-0031](docs/decisions/0031-modelo-plano-v2-milestone-completo-hierarquia-nativa.md)) — o artefato aprovado no **G1** antes de virar Issues.
   `PLAN.md`/`docs/plans/` = stub-ponteiro (o plano vive nos Milestones).
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
   - **Independência cross-model** ([ADR-0018](docs/decisions/0018-revisao-cross-model.md), estende
     ADR-0008/0010). O modelo que **revisa/escreve os testes de aceite** é **distinto** do que
     implementa: **autorrevisão** (autor == revisor) é **bloqueada** e escala ao humano; a
     **divergência** (teste do revisor falha contra a implementação — bug ou Issue ambígua) **escala
     ao humano**, não é auto-resolvida; a **concordância + verde** reduz o *escrutínio*, **não**
     dispensa o **review/merge humano (G3)**. Predicado rodável:
     [`docs/examples/cross-model-review.ts`](docs/examples/cross-model-review.ts).
7. **Ship.** Merge com CI verde. Gate **G3**. Ao fechar a sessão, aplique a **Regra de compactação**
   (`AGENTS.md` §4 / [ADR-0024](docs/decisions/0024-estado-enxuto-roteamento-historia-status.md)/[ADR-0025](docs/decisions/0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)):
   **roteie** — história→**PRs mergeados** (L5; `CHANGELOG.md` = stub, não anexe); status/critérios→**Issue SDD** (L2, fonte da verdade),
   projetado no ledger — e **atualize apenas o ponteiro** no `STATE.md`
   (`Agora`/`Próximo passo`/`última conclusão` + riscos/navegação vivos). **Não anexe narrativa** ao
   STATE (nada de "Antes…/Antes disso…"); ele é ponteiro, não log.

> **Fast-lane (T1)** — a via *issue-less* de baixo risco **dispensa a Issue SDD e o ADR** (abre um
> **PR leve**), mantendo branch → PR → CI verde → **merge humano (G3)** e a Review pelo artefato. A
> **elegibilidade completa** (conjuntiva) e a regra de escalação vivem em `AGENTS.md` §11.2 /
> [ADR-0017](docs/decisions/0017-fast-lane-baixo-risco.md); o predicado
> [`fast-lane-eligibility.ts`](docs/examples/fast-lane-eligibility.ts) decide `fast|full|blocked`. As
> convenções de branch/commit/PR desta via estão abaixo (Branches · Commits · Pull Requests).

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

  As entradas novas **nascem `passes:false`** (o `ledger-guard` aprova) e os `steps` já vêm com o **plano de
  validação aplicável** — **sempre condicional**: a técnica é uma **dica por categoria** (`style`→browser,
  `contract`→contrato público, `functional`→neutro) **subordinada** ao opt-in do
  [ADR-0009](docs/decisions/0009-verificacao-e2e-ferramenta-real.md), nunca e2e incondicional num campo
  imutável ([ADR-0022](docs/decisions/0022-lifecycle-passes-ledger.md), #85). **Lifecycle da flip
  `false→true` (ADR-0022):** o **DoD (§12) da entrega** exige **projetar** a entrada (`false`) e **anexar a
  evidência** aplicável (ou justificar a dispensa) — **não** flipar (o guard proíbe **nascer `true`**, então
  a flip é sempre um **PR posterior**). A **flip** é obrigação de **follow-up**: a view de get-bearings
  (`ledger-origin.ts --scoped`) lista as `passes:false`, e a **próxima sessão** que colhe uma entrada com a
  evidência já em `main` a **flipa** `false→true` (item **existente**) — por isso `false` é **transitório**.
  **Duas isenções** da obrigação de flip, enumeradas em `.orion/ledger-lifecycle.json` e rotuladas fora de
  "aguardando flip" pelo `--scoped`: o **legado pré-ADR-0022** (§d do ADR-0022) e as entradas
  **superseded/mal-redigidas** ([ADR-0027](docs/decisions/0027-exclusao-superseded-pos-regime-ledger.md)),
  que **nunca** devem ser flipadas (flipar registraria conclusão falsa) — o `verifySuperseded` inclusive
  **rejeita** flipar uma entrada excluída (ela é `passes:false` por definição do carve-out).
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
    (o **status/detalhe** vive nessa issue; no `STATE.md`, no máximo um **ponteiro curto** de pendência
    — nunca a narrativa, ADR-0024) em vez de gravar entradas incorretas — o ledger é **append-only**, e
    entrada errada não pode ser limpa depois. A projeção entra quando o gerador estiver correto.
- **Índice de ADRs (gerado, [ADR-0023](docs/decisions/0023-indice-gerado-de-adrs.md)):** o
  `docs/decisions/README.md` é uma **projeção** dos ADRs (número/título/status + **nome do arquivo**, que é
  o alvo do link), nunca editado à mão. Ao **criar um ADR** — ou **mudar seu número/título/status/nome**
  (inclusive flipar `Status` no G2, ou renomear o slug) —, **regenere o índice e commite**:

  ```bash
  node --experimental-strip-types tools/adr/adr-index.ts --write
  ```

  O `scripts/smoke-test.sh` roda `--check` e **reprova o CI** se o README divergir dessa projeção (ADR novo,
  ou número/título/status/nome mudado, sem regenerar ⇒ vermelho). _(Editar só o **corpo** de um ADR não muda
  o índice — não precisa regenerar.)_ **Para achar o ADR de um tema, faça `grep` no
  `docs/decisions/README.md`** — não varra a pasta inteira.

## Gestão de tarefas (GitHub Projects)

- **Issues SDD** = tarefas; **Milestones** = épicos (descrição = plano pré-Spec); **Project (board)** = opcional/visão derivada.
- Veja [`docs/runbooks/github-projects.md`](docs/runbooks/github-projects.md) para a configuração
  do board, campos e automações sugeridas.
- Proteção de `main` e checks obrigatórios em
  [`docs/runbooks/branch-protection.md`](docs/runbooks/branch-protection.md).

## Definição de pronto

Uma contribuição só está pronta quando atende ao **DoD global** (`AGENTS.md` §12). Mantenha o
repositório **verde**.
