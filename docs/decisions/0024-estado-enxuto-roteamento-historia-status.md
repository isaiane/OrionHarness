# ADR-0024 — Estado enxuto: STATE é ponteiro; história e status roteados por construção

> Architecture Decision Record (`AGENTS.md` §3, gate G2). ADRs são **append-only**: uma decisão
> revista não é apagada — cria-se um novo ADR que a substitui.
>
> **Ao criar um ADR — ou mudar seu número/título/status/nome —, regenere o índice** e commite o
> `README.md`: `node --experimental-strip-types tools/adr/adr-index.ts --write`
> ([ADR-0023](0023-indice-gerado-de-adrs.md)).

- **Status:** proposto
- **Data:** 2026-08-03
- **Decisores:** _humano (gate G2) — pendente_
- **Relacionado a:** #125 (T8.1a), épico **O8** (higiene sustentável do estado), `AGENTS.md` §4
  (Regra de compactação), [ADR-0019](0019-nucleo-l0-condensado.md) (padrão visão-derivada + guard,
  reusado pela rede da fatia b), [ADR-0023](0023-indice-gerado-de-adrs.md)

## Contexto

O `STATE.md` é a camada **L1** de orientação (`AGENTS.md` §4): um **ponteiro** que o agente lê no
início da sessão para saber **onde está** e **qual o próximo passo**. Ele **inflou** — ~209 linhas,
com uma cadeia narrativa (`Última conclusão:` repetido, `Antes:`, `Antes disso:`, detalhamento de
PRs concluídos).

O inchaço **não é acidente**: é **gerado por construção** pela **Regra de compactação (§4)**, que
manda "atualize o `STATE.md`" ao fechar cada sessão **sem dizer o que vai lá** nem que se deve
**rotear** o conteúdo para a camada certa. O passo "aterrissar estado" de cada tarefa então **anexa
narrativa** ao STATE em vez de roteá-la. Cada tarefa adiciona um parágrafo; o ponteiro vira log.

Restrições relevantes:
- O **read-path** do get-bearings (`getting-started` §7) lê o STATE nominalmente por `Agora`,
  `Próximo passo` e **`última conclusão`**; o **`CHANGELOG.md` está fora** desse read-path.
- A história **já existe** no `CHANGELOG.md` (L5) e o status por item **já existe** na **Issue SDD**
  (L2, fonte da verdade — ADR-0006), projetado no ledger e refletido no `PLAN.md` (L1). O STATE
  **duplica** essas camadas — contra a própria nota da tabela §4 ("não duplica conteúdo").

## Decisão

Corrigimos o **mecanismo gerador** (a convenção de autoria), não só o artefato.

**1. Invariante (constitucional — muda só via G2).**
O **STATE é um ponteiro de orientação**: contém **apenas** `Agora` (fase/épico ativo), `Próximo
passo` e `última conclusão` (mais riscos/pendências vivos e ponteiros de navegação — estado
_forward-looking_). O STATE **não guarda cadeia narrativa** ("Antes…/Antes disso…") nem status
por-item. O roteamento é:

- **História** (o que foi feito, datado, por-PR) → **`CHANGELOG.md`** (L5).
- **Status de item** (critérios/`passes`) → a **Issue SDD** é a **fonte da verdade** (L2, ADR-0006);
  o **ledger** é a **projeção de verificação** (imutável) e o **`PLAN.md`** o mapa de fase (L1). **Na
  fast-lane** T1 issue-less (§11.2), sem Issue: o **PR leve** é o registro (Issue/ledger = **N/A**).
- **Orientação** (onde estou, próximo passo, última conclusão) + estado _forward-looking_
  (riscos/navegação) → **`STATE.md`** (L1, ponteiro) — **em qualquer via**, status **nunca** volta ao STATE.

**2. Regra de compactação (§4) reescrita para rotear.**
Ao fechar a sessão, o agente **roteia** cada fato para sua camada e **só atualiza o ponteiro** no
STATE — não anexa narrativa. A tabela de decisão abaixo é a fronteira canônica.

**3. Tabela de decisão história-vs-status** (canônica; reduz o thrash na fronteira):

| Linha típica | Vai para | Fica no STATE? |
|---|---|---|
| "T4.3 concluída no PR #63; fez X, corrigiu Y" (narrativa datada) | **CHANGELOG** (L5) | Não |
| "#82 superseded por #103" (evento histórico) | **CHANGELOG** | Não |
| "Última conclusão: #94 (PR #95)" (ponteiro de orientação) | — | **Sim** (1 linha, get-bearings lê) |
| "Agora: O7 concluído; sem tarefa ativa → replanejar" | — | **Sim** (Agora) |
| "Próximo passo: G1 do épico X" | — | **Sim** (Próximo passo) |
| Status de item (passes/critérios) | **Issue SDD** (L2, fonte da verdade); projeção→**ledger**, fase→**PLAN** | Não |
| Riscos/pendências **vivos**, navegação (estado _forward-looking_) | — | **Sim** (não é história nem status por-item) |

**4. O número (orçamento de linhas) é config, não governança.**
O tamanho-alvo do STATE é um **parâmetro operacional** que a **rede** (guard `state-budget-check`,
**fatia b / T8.1b**) lê de um **config** (`.orion/state-budget.json` ou const exportada);
recalibrá-lo **não** exige ADR. O número **não** aparece no texto deste invariante — embutir um proxy
de forma (contar linhas) no texto constitucional geraria churn e transformaria o proxy no objetivo
(o Goodhart que o Orion combate). O invariante mira a **história vazando**, não a contagem.

## Alternativas consideradas

- **(A) Só encolher o STATE + ligar um guard de linhas.** Rejeitada como solução primária: **trata o
  sintoma**. Com a Regra de compactação (§4) intacta, todo PR reinfla o STATE e passa a **brigar com o
  guard**; ligar o guard **antes** da convenção faria todo PR falhar o budget. (O guard entra, mas
  como **rede** na fatia b, **depois** desta convenção — ver Consequências.)
- **(B) Embutir o número do orçamento no ADR/§4.** Rejeitada: torna todo ajuste de calibração um
  evento de governança (G2) e converte o proxy de forma no objetivo (Goodhart).
- **(C — adotada) Corrigir a convenção de autoria (§4 + checklists) para rotear por construção**, com
  a contagem/heurística como **rede calibrada** separada (config + guard, fatia b), mirando o
  invariante (história vazando).

## Consequências

- **Positivas.** O STATE volta a ser barato de ler (read-path do get-bearings enxuto). A história
  não se perde — vai para a camada que a preserva append-only (CHANGELOG). O ajuste do orçamento fica
  fora da governança (sem churn de G2). A cobrança do invariante fica na **revisão humana** (checklist),
  não num proxy gameável.
- **Fatiamento (causa→efeito).** Esta decisão é entregue na **fatia a (T8.1a)**: invariante + tabela +
  §4 reescrita + checklists + reshape do STATE + validação do read-path. A **rede** (guard
  `tools/smoke/state-budget-check.ts` + config de orçamento + wiring no `scripts/smoke-test.sh`) é a
  **fatia b (T8.1b)** — Issue/PR separada, **depois** desta mergear. **Ordem importa:** o guard só
  sobre a convenção nova.
- **Os checklists são a cobrança primária.** O roteamento passa a ser item obrigatório nos **dois**
  reviewer-checklists (Harness §8 / Product §7); o guard (fatia b) é **secundário**.

### Limitação conhecida — o guard é uma rede, não uma garantia

> **Limitação conhecida — o guard é uma rede, não uma garantia.** O `state-budget-check` é
> **heurística de texto**: pega os sinais **óbvios** de história vazando (linhas acima do orçamento;
> marcadores como `#\d+`, datas, "Antes…"). Ele **não entende significado** — um autor pode escrever
> narrativa histórica **sem** esses marcadores (ex.: *"Resolvemos o problema do fence e ajustamos o
> núcleo; ficou tudo funcionando"*) e **passar no guard**. Logo, **guard verde NÃO prova que o STATE
> está limpo** — prova só que os padrões conhecidos não apareceram. A **garantia do invariante**
> (STATE = ponteiro; história → CHANGELOG) é a **revisão humana** (item de checklist Harness/Product),
> **não** o guard. O guard reduz o descuido; não substitui o julgamento. Coerente com o §8.1 ("verde
> não é prova de correção") e evita que o próprio gate vire muleta (Goodhart).

Nenhum doc ou ADR deve afirmar ou sugerir que "guard verde ⇒ STATE conforme".

## Conformidade

Como verificar que a implementação respeita esta decisão (liga-se ao `AGENTS.md` §8.1):

- **`AGENTS.md` §4** (Regra de compactação) instrui a **rotear** (história→CHANGELOG,
  status→Issue (L2, projeção→ledger/PLAN)) e **só atualizar o ponteiro** no STATE; a tabela de decisão é referenciada.
- **`CONTRIBUTING.md`** (fluxo de fechamento/Ship) reflete o roteamento.
- **Os dois reviewer-checklists** cobram, no PR, "STATE tocou **só o ponteiro**? Narrativa foi para o
  CHANGELOG?" — a garantia do invariante.
- **`STATE.md`** reduzido ao ponteiro, **preservando `última conclusão`** (read-path §7), **sem perda
  de história** (fatos removidos movidos ao CHANGELOG antes do corte; append-only).
- **Simulação do agente obediente:** um agente seguindo a §4 reescrita + os checklists **roteia** a
  história e **não** reinfla o STATE.
- **Rede (fatia b, T8.1b):** o guard lê o **config** de orçamento (calibrado a um STATE-ponteiro real
  + folga) **e** detecta vazamento de história; fiado no `scripts/smoke-test.sh` com prova de mordida.
  A rede **complementa**, não substitui, a revisão humana (ver Limitação conhecida).
- **Isenção de referências sancionadas (princípio; heurística exata deferida à fatia b):** a isenção é
  de **linhas-referência sancionadas** — uma referência `#N`/data **pontual** (a linha `Última
  conclusão: #N`; um risco/pendência que cita **um** `#N`/prazo) —, **não** de **seções inteiras**: o
  guard **ainda** deve morder a **acumulação** de bullets datados/narrativos **mesmo sob** `Agora`/
  `Riscos` (ex.: "PR #128 corrigiu X em 2026-08-04" anexado a `Agora` **não** é isento). Este ADR fixa
  o **princípio** (referência sancionada passa; acumulação narrativa reprova); a **classificação
  precisa** — distinguir referência-ponteiro de narrativa — é **decisão de design da T8.1b** (#127),
  onde o guard é construído **e testado** (PASS ponteiro/risco com 1 `#N`; FAIL bullet narrativo datado
  sob seção sancionada). Não pré-especificamos a heurística aqui (evita fixar um parser inexistente).
