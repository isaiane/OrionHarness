# ADR-0037 — gatilho por-evento do flip-batch, com agenda como rede de segurança (emenda ADR-0033)

- **Status:** proposto
- **Data:** 2026-10-01
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** **supersede parcialmente** o ponto 1 de [ADR-0033](0033-flip-automatizado-lote-projects-derivado.md)
  (a cláusula "agenda dispara; merge é fronteira de elegibilidade (não o gatilho)") — o restante do 0033 segue
  vigente · épico **O13** ([#18](https://github.com/isaiane/OrionHarness/milestone/18)), Issue **#301** (T13.1) ·
  go-live recusado no PR #268 · tarefas seguintes: #257 (travas + ativação), #259 (docs do split de owner)

## Contexto

O [ADR-0033](0033-flip-automatizado-lote-projects-derivado.md) decidiu que o flip `passes:false→true` do ledger
é escrito por **automação, em lote**, com **um lote aberto por vez**, só para entradas com **sinal de
conclusão**, e que a automação **nunca integra** (merge humano). O disparo ficou **por agenda**: a agenda é o
*dispatch* e o merge da entrega é só a **fronteira de elegibilidade** — explicitamente **não** um gatilho
por-merge, "senão abriria um PR por entrega e mataria o lote".

O `flip-batch` (#257) está entregue, mas roda **só por `workflow_dispatch`**. O go-live do `schedule` foi
**recusado** no PR #268 (Codex, 2×P1): faltavam (a) **revalidação no merge + invalidação** quando uma Issue do
lote reabre entre o verde e o merge, (b) **liveness** (sinal quando a automação para de rodar) e
(c) **serialização** de disparos concorrentes.

A mantenedora prefere que o flip reaja ao **fechamento da Issue de origem** — o momento em que a entrega se
conclui —, em vez de esperar o ciclo da agenda. Trocar o gatilho emenda a cláusula de dispatch do ADR-0033, e
a escolha muda o desenho das travas (sob evento, há muito mais disparos e mais concorrência que sob agenda).
Decidir o gatilho **antes** das travas evita construí-las para um disparo que seria trocado.

## Decisão

**1. Gatilho primário: fechamento da Issue como `completed`.**
O `flip-batch` passa a disparar em `on: issues: closed` filtrando `stateReason == completed`. O evento só
**dispara** uma rodada; a **elegibilidade** continua a do ADR-0033 (entregue na `main`, `passes:false`,
sinal de conclusão verificável na Issue autoritativa). Fechar uma Issue **não** elege suas entradas por si só.

**2. O lote é preservado: o evento nunca abre um PR por entrega.**
Cada rodada recalcula o lote **inteiro** (todas as entradas elegíveis, não só as da Issue que fechou). O
invariante "**um lote aberto por vez**" do ADR-0033 continua normativo:

- **Lote aberto do App:** a rodada **atualiza esse PR** (ou **pula**, se nada mudou).
- **Lote aberto manual** (caminho humano-exceção ou owner manual de fallback): a rodada **pula** — a
  automação **nunca** reescreve um lote feito à mão (Codex #302).
- **Sem lote aberto — janela de coalescência** (decisão de Isa no G2, Codex #302): uma rodada disparada por
  **evento** só abre um lote novo se **nenhum** PR de flip tiver sido aberto ou integrado nas últimas **W**
  horas (W é config, ordem de grandeza: 1 h). Dentro da janela, a rodada **pula**; as entregas que chegarem
  nela entram na primeira rodada após a janela — o próximo evento ou a agenda. Sem essa janela, entregas
  espaçadas abririam um PR cada, o que o ADR-0033 rejeitou ("mataria o lote").

**3. A agenda permanece como rede de segurança** (decisão de Isa no G1 da #301).
Uma varredura agendada roda a **mesma** rodada (recalcula o lote, atualiza ou pula, respeitando a janela de
coalescência). Ela cobre eventos perdidos (Action que falhou, evento não entregue, Issue fechada antes do
merge da entrega tornar a entrada elegível) e as entregas adiadas pela janela. A **cadência** e o **W**
seguem sendo parâmetros operacionais (ADR-0033 ponto 9) — mudam sem novo ADR.

**4. Requisitos das travas — pré-requisito do go-live (tarefa 2, #257).**
Nenhum gatilho automático (evento **ou** agenda) é ligado antes de as três travas estarem no ar:

- **(a) Serialização.** Todos os disparos (evento, agenda, dispatch) entram num **único** grupo de
  `concurrency` do flip-batch, sem `cancel-in-progress`; a rodada lê o estado **ao vivo** dentro do trecho
  serializado. Dois disparos concorrentes resultam em **um** lote, nunca em dois PRs nem em escrita com
  snapshot velho.
- **(b) Evidência válida no merge — estreitar a janela e declarar o resíduo.** O invariante do ADR-0033
  ponto 1 ("nenhuma entrada é integrada se sua evidência não valer no momento do merge") segue normativo,
  mas o GitHub **não oferece barreira atômica**: nenhum check preso a um SHA é atômico com uma mudança de
  estado **externa** (a Issue reabrir), e um handler por evento pode rodar **depois** do merge
  (`docs/runbooks/flip-app-install.md`, "Janela de reopen"). Por isso:
  - **(i) estreitar:** reabrir (ou remover o sinal de) uma Issue do lote dispara uma revalidação
    **event-driven** que **bloqueia** o PR de flip (check obrigatório vermelho ou a entrada sai do lote); e a
    revalidação roda o mais perto possível da integração — **merge queue** (`merge_group`) quando disponível
    no repo, ou um mecanismo equivalente que a tarefa 2 justifique;
  - **(ii) resíduo procedural declarado** (ADR-0003): a janela entre a última revalidação e a integração
    **não é fechada** por (i). O go-live exige um **passo humano explícito** no merge de todo PR de flip —
    **conferir que as Issues do lote seguem fechadas** — registrado no checklist/runbook do flip. Este ADR
    **não** afirma que (i) fecha a janela.
- **(c) Liveness.** Se nenhuma rodada concluir com sucesso dentro de um prazo configurável (ordem de grandeza:
  duas vezes a cadência da agenda) **enquanto houver entradas elegíveis**, a automação produz um **sinal
  observável** (por exemplo, uma Issue de alerta) e o **owner manual reassume** (ADR-0033 ponto 1).

**5. O board não é fonte do gatilho.**
O evento autoritativo é o **fechamento da Issue**, não o Status do Project. O board segue projeção derivada
(ADR-0033); nenhuma coluna dispara o flip.

**6. Supersedência parcial e cirúrgica do ADR-0033.**
Este ADR supersede **apenas** a cláusula de *dispatch* do ponto 1 do ADR-0033 ("agenda dispara; merge é
fronteira de elegibilidade (não o gatilho)"): o gatilho passa a ser o **fechamento `completed`** da Issue,
com a agenda como rede de segurança. **Preservados na íntegra:** flip como PR em lote, um lote aberto por vez,
elegibilidade por sinal de conclusão, caminho humano-exceção, owner manual como fallback, evidência válida no
merge, born-false (ponto 2), "nunca integra", identidade da automação e cadência como config. A supersedência
é registrada por **nota no fim** do ADR-0033 (append-only), sem editar a decisão histórica — no fim, e não
no topo, porque runbooks e o ledger citam o ADR-0033 **por número de linha** (regra do próprio ADR-0033).

## Alternativas consideradas

- **Só agenda (status quo do ADR-0033).** Rejeitada como gatilho primário: a entrada concluída espera o
  ciclo inteiro para virar flip; mantida como **rede de segurança** (ponto 3).
- **Só evento, sem agenda.** Rejeitada (decisão de Isa): um evento perdido deixaria a entrada órfã até o
  próximo fechamento qualquer; a liveness só detecta a automação **parada**, não o evento **perdido**.
- **Gatilho por merge da entrega (`pull_request: closed` merged).** Rejeitada como gatilho principal: o PR de
  entrega pode fechar a Issue antes de o sinal de conclusão existir, e um PR pode tocar várias Issues; o
  fechamento `completed` da Issue é o marco autoritativo (ADR-0006). Pode entrar como disparo **adicional** na
  tarefa 2 sem novo ADR, porque só dispara — não elege.
- **Um PR de flip por evento.** Rejeitada: viola o lote único do ADR-0033 e gera PR storm quando várias Issues
  fecham juntas.
- **Gatilho pelo Status do board (`Done`).** Rejeitada: o board é projeção, nunca fonte (ADR-0033).

## Consequências

- **Positiva — responsividade:** a entrada vira flip logo após a Issue fechar `completed`, sem esperar o ciclo.
- **Positiva — robustez:** a agenda cobre eventos perdidos; a liveness cobre a automação parada.
- **Negativa — mais disparos:** cada fechamento roda uma rodada; o custo é contido pela serialização (a),
  pelo "atualiza ou pula" do lote único e pela janela de coalescência.
- **Negativa — latência da janela:** uma entrega que fecha logo depois de um lote pode esperar até **W** horas
  (ou a próxima agenda) — o preço de manter o lote.
- **Negativa — resíduo procedural:** a janela entre a última revalidação e o merge continua dependendo do
  passo humano (4(b)(ii)); não há barreira atômica no GitHub.
- **Negativa — dependência de mecanismo de merge:** a trava (b)(i) usa merge queue ou equivalente; se o repo
  não oferecer merge queue, a tarefa 2 precisa justificar o equivalente antes do go-live.
- **Segurança/confiança:** sem mudança nos gates; a automação abre/atualiza PR e **nunca integra** (T3/G3).

## Conformidade

- **Aplicação (tarefa 2, #257):** trocar o `workflow_dispatch`-only do `flip-batch.yml` por
  `issues: closed` (`completed`) + `schedule` + `workflow_dispatch`, **só depois** das travas (a), (b) e (c).
  Verificável: os eventos no workflow; o grupo de `concurrency` único; a janela de coalescência (W como
  config); o skip quando o lote aberto é manual; o check bloqueante da revalidação; o passo humano do resíduo
  no checklist/runbook; o alerta de liveness.
- **Docs (tarefa 3, #259):** CONTRIBUTING/getting-started descrevem o gatilho por evento + agenda e o split de
  owner (automação escreve, humano integra).
- **Nota no fim** do ADR-0033 apontando este ADR (append-only; sem deslocar linhas citadas).
