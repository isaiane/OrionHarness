# ADR-0038 — board por sinal explícito na Issue: cinco colunas, o agente sinaliza e o projetor espelha (emenda ADR-0033)

- **Status:** proposto
- **Data:** 2026-10-02
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** **supersede parcialmente** [ADR-0033](0033-flip-automatizado-lote-projects-derivado.md) —
  o ponto 6 (seis colunas), as restrições (i)–(iii) da tabela de transição do ponto 4 e a origem "evento de
  branch/PR" da projeção; o resto do 0033 segue vigente · emenda a convenção `Blocked` ↔ rótulos de gate da
  T10.4 (#274) · épico **O14** ([#19](https://github.com/isaiane/OrionHarness/milestone/19)), Issue **#307**
  (T14.1) · implementação atual: #272/#278/#298

## Contexto

O [ADR-0033](0033-flip-automatizado-lote-projects-derivado.md) fez do GitHub Project uma **projeção derivada**
(nunca fonte), com **escritor único** e **reconciliação**. Ele fixou **seis** colunas
(`Backlog → Ready → In progress → In review → Blocked → Done`) e exigiu que a coluna saísse de **eventos**:
toda coluna com um alimentador de evento, inclusive `Ready`; o **papel** do PR (contrato × implementação)
separando colunas; `needs-human-approval` alimentando `Blocked`.

A implementação (#272, #278, #298) teve de **deduzir** a etapa de sinais indiretos: a Issue pelo nome da
branch (`feat|fix|chore/<n>-…`, `tests/issue-<n>`), o PR ligado por `Closes #N` ou pela branch, o papel pelo
rótulo ou pela branch, o evento `edited`, forks. Cada exceção pediu uma regra nova (foram dezenas de achados de
revisão), e mesmo assim a dedução erra: a #257, em andamento por várias fatias, ficou em **Ready**, porque as
branches (`feat/257a-…`) e os PRs (`Refs #257`) não casam com as regras. Uma Issue proposta aguardando G1 nasce
com `needs-human-approval` e cai em **Blocked**, não em Backlog.

A mantenedora definiu o fluxo esperado: toda Issue nasce em **Backlog**; implementação iniciada → **In
progress**; Codex Review solicitado → **In review**; impedimento → **Blocked**; finalizada → **Done**. E
escolheu o **meio-termo**: o **agente decide** a etapa, por um sinal **explícito** que aplica na Issue no
momento em que a etapa acontece; a automação **só espelha** esse sinal no board.

## Decisão

**1. Cinco colunas, literais.**
`Backlog`, `In progress`, `In review`, `Blocked`, `Done` — em **sentence case** (a grafia já existente no
Project). **`Ready` sai**: o G1 continua marcado pelo rótulo `ready`, mas não é coluna.

**2. A coluna sai de sinais explícitos na Issue (rótulos + estado), com precedência fixa.**

| Precedência | Sinal na Issue | Coluna |
|---|---|---|
| 1 | Issue **fechada** (qualquer motivo) | `Done` |
| 2 | rótulo `blocked` | `Blocked` |
| 3 | rótulo `status:in-review` | `In review` |
| 4 | rótulo `status:in-progress` | `In progress` |
| 5 | nenhum dos anteriores | `Backlog` |

A função continua **pura e idempotente**: o mesmo estado da Issue dá sempre a mesma coluna. Remover `blocked`
devolve a Issue à coluna do seu rótulo de status (unblock com estado de volta, por construção).

**3. `needs-human-approval` não move a Issue de coluna.**
Ele segue sendo o **rótulo de gate** (Issue/ADR aguardando G1/G2, convenção da T10.4), mas **não** alimenta
`Blocked`: uma Issue proposta nasce em **Backlog** e lá fica até a implementação começar. `Blocked` é **só**
impedimento real (`blocked`). Esta é a emenda à convenção da T10.4.

**4. Quem aplica e quando — o agente que executa a tarefa (o humano também pode).**

| Momento | Ação na Issue |
|---|---|
| Começa a implementação (Build da Issue com G1 dado: branch/worktree da tarefa criada) | aplica `status:in-progress` |
| Pede o Codex Review do PR da tarefa (`@codex review`) | troca `status:in-progress` por `status:in-review` |
| Novas rodadas de review e correções | mantém `status:in-review` (o ciclo de review é uma etapa só) |
| Algo impede o avanço (dependência externa, decisão pendente que trava o trabalho) | aplica `blocked`; remove quando destrava |
| PR mergeado fecha a Issue | nada — fechada ⇒ `Done` vence qualquer rótulo |
| Issue reaberta | quem reabre ajusta o rótulo de status à etapa real (sem rótulo ⇒ `Backlog`) |
| Tarefa pausada (WIP=1) | remove o rótulo de status (volta a `Backlog`) e registra a pausa na Issue |

Os dois rótulos `status:*` são **mutuamente exclusivos** por convenção; se ambos aparecerem, a precedência
(item 2) decide. A skill `orion-orchestrator` e o runbook passam a prescrever esses momentos (aplicação).

**5. O projetor só espelha — nada de dedução por branch ou PR.**
O projetor assina **só** eventos de **Issue** (aberta, fechada, reaberta, rótulo aplicado/removido), a
**reconciliação agendada** e o **dispatch**. Saem: eventos de PR e de branch, a associação Issue↔PR/branch, o
papel de contrato e o evento `edited`. Preservados do ADR-0033: a **projeção derivada da Issue** (o board nunca
é fonte — a fonte agora é **explícita** na Issue), o **escritor único**, a **reconciliação** que repara arrasto
manual, a **idempotência**, e o token `project`-only ([ADR-0036](0036-token-classico-project-only-para-o-projetor-de-projects-supersede-adr-0035-ponto-2.md)).
A serialização por Issue (#278/#298) continua válida.

**6. Supersedência parcial e cirúrgica do ADR-0033.**
Este ADR supersede **apenas**: o **ponto 6** (as seis colunas e `Blocked` alimentada por
`needs-human-approval`); as **restrições (i)–(iii)** da tabela de transição do ponto 4 (alimentador de evento
para `Ready`, papel do artefato separando colunas, unblock por `needs-human-approval`); e a leitura de
"projeção derivada **de eventos** de branch/PR" do ponto 4 — a projeção passa a derivar **dos sinais explícitos
da Issue**. **Preservados na íntegra:** projeção derivada, nunca fonte; escrita só pelo projetor +
reconciliação; idempotência (restrição (iv)); tudo sobre o flip (pontos 1–3, 5, 7–9, com a emenda do
[ADR-0037](0037-gatilho-por-evento-do-flip-batch-com-agenda-como-rede-de-seguranca.md)). Registro por **nota
no fim** do ADR-0033 (append-only).

## Alternativas consideradas

- **Manter a dedução (ADR-0033 + #278/#298).** Rejeitada: cada exceção vira regra, e ainda erra (#257 em
  Ready); é a complexidade que motivou este ADR.
- **O agente grava a coluna direto no Project** (sem projetor). Rejeitada: exige o token do Project na sessão
  do agente, abandona o escritor único e a reconciliação, e perde o histórico auditável na Issue.
- **Manter `Ready` como coluna** (rótulo `ready` ⇒ `Ready`). Rejeitada (decisão de Isa): o fluxo esperado não
  tem essa etapa; G1 dado sem implementação iniciada continua em Backlog.
- **`needs-human-approval` ⇒ `Blocked`** (T10.4). Rejeitada (decisão de Isa): faz Issue proposta nascer em
  Blocked; aguardar gate não é impedimento de trabalho em curso.
- **Campo customizado de etapa no Project, editado pelo agente.** Rejeitada: o board voltaria a ser fonte.

## Consequências

- **Positiva — simplicidade:** a coluna sai de uma tabela de cinco linhas; sai a dedução por branch/PR e boa
  parte do código e dos testes de #278/#298.
- **Positiva — fidelidade:** a coluna reflete a etapa que o agente declarou, inclusive em branches ou PRs fora
  de qualquer padrão.
- **Negativa — depende de o agente sinalizar:** sem o rótulo, a Issue fica em `Backlog` mesmo em andamento.
  Mitigação: os momentos ficam na skill e no runbook; o rótulo é visível e auditável na Issue; humano pode
  corrigir aplicando o rótulo (nunca arrastando o cartão — a reconciliação desfaria).
- **Neutra — histórico do ledger:** critérios já flipados de #272/#278/#298 descrevem a dedução e ficam como
  registro do que foi entregue; não regridem.
- **Segurança/confiança:** sem mudança nos gates; o projetor só move cartão, nunca integra.

## Conformidade

- **Aplicação (tarefa 2 do O14):** `board-projection.ts` mapeia só estado + rótulos (tabela do item 2);
  `project-board.yml` assina só eventos de Issue + reconciliação + dispatch; rótulos `status:in-progress` e
  `status:in-review` em `.github/labels.yml`; skill `orion-orchestrator` (com rebuild do selo) e runbook
  `github-projects.md` com os momentos do item 4; opção `Ready` removida do Project depois da reprojeção.
  Verificável: casos de teste da tabela; o workflow sem gatilhos de PR/branch; dry-run da reconciliação sem
  `Ready`.
- **Nota no fim** do ADR-0033 apontando este ADR (append-only, sem deslocar linhas citadas).
