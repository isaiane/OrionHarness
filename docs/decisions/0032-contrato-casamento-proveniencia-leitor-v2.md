# ADR-0032 — Modelo de proveniência `Promovida de:` (formato + casamento do leitor v2)

> **Numeração:** 0032 = próximo livre em `docs/decisions/` na `main` mergeada.
>
> **Ao criar o ADR — ou mudar seu número/título/status/nome (inclusive flipar para `aceito` no G2) —
> regenere o índice e commite o `README.md`:** `node --experimental-strip-types tools/adr/adr-index.ts --write`
> (o smoke-test **reprova** índice divergente — ADR-0023).

- **Status:** aceito  <!-- G2 aprovado pelo owner (Isa) em 2026-09-07T18:53:15Z -->
- **Data:** 2026-09-07 (proposto) · 2026-09-07T18:53:15Z (aceite no G2 — insumo do **`t*`** = `max(aceite, merge #234)`, Parte II.5)
- **Decisores:** Isa (owner) — aprovação humana (gate **G2**)
- **Relacionado a:** `AGENTS.md` §2/§5; [ADR-0031](0031-modelo-plano-v2-milestone-completo-hierarquia-nativa.md)
  (proveniência de bloco + invariante 1:1) e [ADR-0026](0026-plano-milestone-com-descricao-sem-project-drafts.md);
  épico **O11** (#16); **#234** (aplica o **formato** na skill/template/form — fatia irmã G1, **pós-G2**);
  **#222** (implementa o **casamento** no `plan-report`). Coerente com [ADR-0024](0024-estado-enxuto-roteamento-historia-status.md)/[ADR-0025](0025-modelo-alvo-plano-historia-compactacao-ponteiros.md).

## Contexto

O leitor v2 do `plan-report` precisa **casar** cada Issue associada a um Milestone com o **bloco de design**
que a originou. Isso exige (i) um **formato de proveniência** parseável no corpo da Issue e (ii) uma
**política** de como o leitor casa e tolera esses traços. O review do Codex (PRs #235/#236) mostrou que
**ambos** — formato **e** casamento — são **um só schema de proveniência** que o leitor consome, logo
**decisão de governança (G2)**, não aplicação de skill (G1). Este ADR decide o **modelo inteiro**; a skill/
template/formulário (**#234**) **aplicam** o formato (G1, pós-G2) e o `plan-report` (**#222**) implementa o
casamento. Padrão do repo: **decidir ≠ aplicar** (ADR-0025/0026/0031).

Restrições reais (O11 #16): **3 blocos × 8 Issues** (fatias/follow-ups não vêm de bloco); Issues antigas com
formatos divergentes/nome com drift. Casamento 1:1 **estrito** rejeitaria o canônico; **sem limites**
deixaria Issue nova malformada escapar da validação.

## Decisão

### Parte I — Formato do traço `Promovida de:` (no corpo da Issue)

**Duas classes canônicas + exceção de bootstrap. Cada forma é uma LINHA copiável completa** (o parser lê a
linha `Promovida de: …` literal — não separada por texto):

- **(A) promoção de bloco:** `Promovida de: Milestone #M ("<título do épico>") — "<n>. <nome>"`, seguida do
  **snapshot verbatim** do bloco (`## Objetivo` do épico + os 5 campos), como no ADR-0031 §2. `<n>. <nome>` é
  o cabeçalho **verbatim** do bloco (sem `###`) e é o **identificador estável** (renomear = re-G1).
- **(B) follow-up:** `Promovida de: follow-up — <origem causal>`, onde `<origem causal>` é uma referência
  **causal, resolvível e a um artefato DISTINTO**: um `ADR-00NN` **aceito**, ou uma Issue/PR `#<n>`
  **pré-existente** que **originou/motivou** esta — **nunca** a própria Issue nem um **bloco do mesmo épico**
  (auto/bloco-referência é **rejeitada**). **Não** carrega `— "<n>. <nome>"`. *(Resolvibilidade sozinha não
  basta [Codex r3-B]: sem exigir artefato distinto e causal, uma tarefa planejada poderia se marcar B com o
  próprio `#<n>` e sumir do bloco.)*
- **Exceção bootstrap:** Issue de **bootstrap de 1ª classe** (pré-Plan, §2.2) **pode** deixar `Promovida de:`
  **vazio** — não há bloco nem origem de follow-up. É a única ausência legítima.

### Parte II — Contrato de casamento (leitor v2)

**1. Corte primeiro (precedência).** O leitor classifica cada Issue associada a um Milestone v2 pelo
**instante efetivo `t*`** (Parte II.5) **antes** de aplicar as regras estritas: uma Issue **pré-`t*`**
(legado/congelado) **nunca** falha — vai para o balde **"associada, fora dos blocos"** mesmo que o traço
pareça classe A mas não case (nome/Milestone drift). Só Issues **em `t*` ou depois** seguem as regras
estritas de A/B abaixo. *(Resolve a ambiguidade [Codex #236-3]: pré-`t*` tolera; pós-`t*` é estrito — o O11
canônico fica verde.)*

**2. Classe A casa 1:1 por IDENTIDADE COMPLETA + SNAPSHOT QUE CASA.** Para uma Issue **pós-corte**, casa um
bloco só se: (i) o **Milestone #M + título** do traço = o Milestone da associação nativa; (ii) `<n>. <nome>`
= um cabeçalho de bloco; **e (iii) o snapshot CASA o bloco** — `## Objetivo` + os 5 campos do corpo **iguais**
(materialmente) ao bloco referenciado na descrição. Casamento **1:1** (cada bloco ↔ no máx. uma Issue).
*(iii resolve [#236-5]/[Codex r3-A]: **presença não basta** — um snapshot obsoleto/arbitrário com o cabeçalho
certo certificaria proveniência após drift de escopo/critérios/classe/deps. Divergência material = edição
pós-G1 → **re-G1**, não casamento.)*

**3. Fail-closed (pós-corte):** (a) `<n>. <nome>` inexistente (dangling); (b) duas Issues no mesmo bloco
(dupla promoção); (c) Milestone citado ≠ associação nativa (**épico errado**); (d) snapshot **ausente ou
divergente** numa classe A; (e) traço **ausente/malformado** (nem A nem B válida) numa Issue pós-corte de
Milestone v2.

**4. Classe B (pós-corte) = "associada, fora dos blocos"** — reportada, não casada, **não** falha — **desde
que** a origem seja **causal, distinta e verificável** (Parte I.B): um `ADR-00NN` aceito, ou uma Issue/PR
`#<n>` **pré-existente** que originou esta — **nunca** a própria Issue nem um **bloco do mesmo épico**. Um
"follow-up" **sem** origem assim numa Issue pós-corte → **fail-closed** (não vira porta dos fundos; [#236-6]).
*(Resíduo [Codex r3-B]: um B que **semanticamente duplica um bloco pendente** — origem causal válida, mas
"esconde" o bloco — é **caveat de revisão humana**; o leitor não infere intenção. Perseguir isso em regra
exigiria detectar intenção — fora do alcance de um parser. A revisão humana no G1 da promoção cobre.)*

**5. Instante efetivo `t*` — UM só, para tudo.** `t*` = o **maior** entre (a) o **timestamp UTC exato** do
aceite deste ADR (campo Data, `…Z`, não dia-calendário — [#236-2]) e (b) o **merge da aplicação do formato
(#234)** — antes de (b) o template ainda mandava "vazio", então nada do intervalo é cobrado ([#236-4]). **`t*`
é o único instante usado** — para a precedência (II.1), para "pós-corte" (II.2–II.4) **e** para o
congelamento do grandfather — eliminando a ambiguidade de dois instantes ([Codex r3-C]). **Grandfather
congelado por associação em `t*`:** o conjunto tolerado = Issues **associadas a um Milestone v2 em `t*`**
(congelado por **enumeração** no repo — hoje as 8 do O11). Uma Issue **movida para** um Milestone v2 **depois**
de `t*` **não** é grandfathered — segue as regras estritas ([#236-1]).

## Alternativas consideradas

- **(A) 1:1 estrito sem grandfather.** Rejeitada: rejeitaria o O11 real (3 blocos × 8 Issues).
- **(B) Grandfather sem corte / só por `createdAt`.** Rejeitada ([#236-1/#236-2]): Issue nova (ou antiga movida
  in) escaparia da validação; dia-calendário é ambíguo.
- **(C) Casar só por `<n>. <nome>` (ignorar Milestone/snapshot).** Rejeitada ([#236-5], épico errado / escopo
  desatualizado aceito como válido).
- **(D) Formato da classe B na skill (G1), casamento no ADR (G2) — separados.** Rejeitada ([#235-3]): o
  formato B **é** parte do schema que o leitor consome → governança; decidir junto evita corte artificial.
- **(E) Snapshot/hash versionado do casamento.** Rejeitada por ora (YAGNI): traço + snapshot no corpo +
  corte bastam.

## Consequências

- **Positivas.** Um só modelo coerente (formato + casamento + corte). O leitor casa sem falso-vermelho no O11
  canônico (pré-corte tolerado) e sem silenciar erros reais (dangling/dupla/épico-errado/snapshot-ausente/
  malformado pós-corte). Desbloqueia a **#222** e dá à aplicação (#234) uma fonte única.
- **Negativas / riscos + mitigação.** *Enumeração do conjunto grandfathered* exige um artefato pequeno
  (lista de #s legados por Milestone v2), mantido **append-only** — bounded (legado é finito). *Fetch amplia a
  superfície* (o leitor lê `body`, `createdAt`, associação) → fail-closed + testes (#222). *Corte por instante*
  usa `createdAt` UTC do GitHub — objetivo.
- **Segurança/confiança/observabilidade.** Modelo de processo = **T2 → G2** (este ADR). Sem efeito T3; nada
  removido. Observável: casamentos 1:1 + lista "fora dos blocos"; ausência de erro num Milestone v2 com Issues
  pós-corte conformes é o sinal estrutural.

## Conformidade

Como verificar (§8.1) que a **aplicação (#234)** e o **leitor (#222)** respeitam:

- **#234 (formato):** skill/template/`sdd-task.yml` emitem A (linha completa + snapshot), B (linha completa
  com origem **verificável**) e permitem **vazio só no bootstrap**. Cada exemplo é uma linha `Promovida de: …`
  copiável ([#235-1/#235-2]).
- **#222 (casamento):** testes cobrindo corte-primeiro (pré-corte tolera; pós-corte estrito), classe A 1:1
  por Milestone+`<n>. <nome>`+snapshot, os 5 fail-closed, classe B verificável, e **congelamento por
  associação** (Issue movida in pós-corte não é tolerada). O O11 real (#16) roda **verde**.
- **`t*`:** um só instante = `max(aceite UTC, merge #234)`; usado para precedência, "pós-corte" e o
  congelamento do grandfather. Testar que uma Issue associada em `t*` é tolerada e uma movida in depois **não**.
- **Append-only:** para reverter, novo ADR que supersede este.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho do antigo. -->
