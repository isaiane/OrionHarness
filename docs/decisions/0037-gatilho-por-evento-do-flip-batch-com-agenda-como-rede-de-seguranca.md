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
Cada rodada recalcula o lote **inteiro** (todas as entradas elegíveis, não só as da Issue que fechou). Se já
houver um PR de flip **aberto**, a rodada **atualiza esse PR** (ou **pula**, se nada mudou); só abre um PR
novo quando não há lote aberto. O invariante "**um lote aberto por vez**" do ADR-0033 continua normativo.

**3. A agenda permanece como rede de segurança** (decisão de Isa no G1 da #301).
Uma varredura agendada roda a **mesma** rodada (recalcula o lote, atualiza ou pula). Ela cobre eventos
perdidos (Action que falhou, evento não entregue, Issue fechada antes do merge da entrega tornar a entrada
elegível). A **cadência** segue sendo parâmetro operacional (ADR-0033 ponto 9) — muda sem novo ADR.

**4. Requisitos das travas — pré-requisito do go-live (tarefa 2, #257).**
Nenhum gatilho automático (evento **ou** agenda) é ligado antes de as três travas estarem no ar:

- **(a) Serialização.** Todos os disparos (evento, agenda, dispatch) entram num **único** grupo de
  `concurrency` do flip-batch, sem `cancel-in-progress`; a rodada lê o estado **ao vivo** dentro do trecho
  serializado. Dois disparos concorrentes resultam em **um** lote, nunca em dois PRs nem em escrita com
  snapshot velho.
- **(b) Evidência válida no merge.** Reafirma o invariante do ADR-0033 ponto 1 ("nenhuma entrada é integrada
  se sua evidência não valer no momento do merge") com o mecanismo mínimo: **(i)** reabrir (ou remover o sinal
  de) uma Issue do lote dispara uma revalidação **event-driven** que **bloqueia** o merge do PR de flip (o
  status-check obrigatório fica vermelho ou a entrada sai do lote); **e (ii)** a revalidação roda contra o
  estado do momento da integração — via **merge queue** (`merge_group`) quando disponível no repo, ou um
  mecanismo equivalente que a tarefa 2 justifique. A tarefa 2 deve registrar qual mecanismo cobre a janela
  entre o último verde e o merge.
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
é registrada por **nota de cabeçalho** (append-only) no ADR-0033, sem editar a decisão histórica.

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
- **Negativa — mais disparos:** cada fechamento roda uma rodada; o custo é contido pela serialização (a) e
  pelo "atualiza ou pula" do lote único.
- **Negativa — dependência de mecanismo de merge:** a trava (b)(ii) depende de merge queue ou equivalente; se
  o repo não oferecer merge queue, a tarefa 2 precisa provar o equivalente antes do go-live.
- **Segurança/confiança:** sem mudança nos gates; a automação abre/atualiza PR e **nunca integra** (T3/G3).

## Conformidade

- **Aplicação (tarefa 2, #257):** trocar o `workflow_dispatch`-only do `flip-batch.yml` por
  `issues: closed` (`completed`) + `schedule` + `workflow_dispatch`, **só depois** das travas (a), (b) e (c).
  Verificável: os eventos no workflow; o grupo de `concurrency` único; o check bloqueante da revalidação; o
  alerta de liveness.
- **Docs (tarefa 3, #259):** CONTRIBUTING/getting-started descrevem o gatilho por evento + agenda e o split de
  owner (automação escreve, humano integra).
- **Nota de cabeçalho** no ADR-0033 apontando este ADR (append-only).
