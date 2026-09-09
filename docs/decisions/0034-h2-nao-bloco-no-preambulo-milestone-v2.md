# ADR-0034 — Seções H2 não-bloco no preâmbulo do Milestone v2 (esclarece a gramática ADR-0031 §2)

> Architecture Decision Record (`AGENTS.md` §3, gate G2). ADRs são **append-only**: uma decisão revista
> não é apagada — cria-se um novo ADR que a substitui.
>
> **Ao criar um ADR — ou mudar seu número/título/status/nome (inclusive flipar para `aceito` no G2) —,
> regenere o índice** e commite o `README.md`:
> `node --experimental-strip-types tools/adr/adr-index.ts --write` ([ADR-0023](0023-indice-gerado-de-adrs.md)).

> **Numeração:** `0034` = próximo livre em `docs/decisions/` na `main` (sequência `0001–0033` contígua ao
> criar; confirme com `tools/adr/adr-sequence.ts --check` antes do commit). **ADR ainda não mergeado na
> `main` pode ser renumerado; mergeado, nunca** (ADR-0031).

- **Status:** aceito  <!-- G2 aprovado pelo owner (Isa) em 2026-09-08 -->
- **Data:** 2026-09-08 (proposto e aceito no G2)
- **Decisores:** Isa (owner) — aprovação humana (gate **G2**)
- **Relacionado a:** Issue **#244**; **esclarece/amplia** [ADR-0031](0031-modelo-plano-v2-milestone-completo-hierarquia-nativa.md) §2
  (gramática do Milestone v2); aplicado pelo leitor `plan-report` ([ADR-0032](0032-contrato-casamento-proveniencia-leitor-v2.md), #222); `AGENTS.md` §2/§4.

## Contexto

A ADR-0031 §2 fixa a **gramática canônica** da descrição do Milestone v2: abre com `## Objetivo`, segue com
**blocos de design `### <n>. <nome>`** (fronteira: `###` → `###` ou `## Como iniciar`), encerra com
`## Como iniciar`; e declara que "**um layout que fuja dessa forma não é v2-válido**". O leitor v2
(`parseMilestoneBodyV2`, #222) implementa isso **rejeitando qualquer H2** que não seja `## Objetivo`/`## Como
iniciar` (falha-fechado).

Rodado **ao vivo**, o leitor falha-fechado nos **dois épicos v2 ativos**:

- **O10 (#15)** usa `## Tarefas (blocos de design)` (rótulo antes dos blocos).
- **O11 (#16)** usa `## Restrições transversais (decididas)` **e** `## Tarefas (blocos de design)`.

Ambos os H2s ficam **no preâmbulo** (entre `## Objetivo` e o primeiro `###`). A ironia: a própria ADR-0031 §2
aponta o **O11 como "exemplo canônico"** da gramática — mas o O11 real usa essas seções. Ou seja, a gramática
**sub-especificou**: épicos reais precisam de seções organizadoras (o `## Restrições transversais` é sinal
legítimo), e a forma estrita não as previu.

## Decisão

**1. Seções H2 não-bloco são permitidas no PREÂMBULO como prosa NÃO-NORMATIVA inerte.**
Entre `## Objetivo` e o **primeiro** bloco `### <n>. <nome>`, a descrição **pode** conter seções H2
adicionais (ex.: `## Restrições transversais`, `## Tarefas (blocos de design)`). Elas são **contexto inerte,
não-normativo**: o leitor **não** as parseia como blocos nem como tarefas. **Duas restrições fecham a
ambiguidade e o gate:**
- **Sem `###` no preâmbulo.** Uma seção de preâmbulo **não** pode conter cabeçalho `###` — um `### <n>. <nome>`
  em qualquer ponto **inicia a lista de blocos** (encerra o preâmbulo). Isso evita que um `### 1. Segurança`
  dentro de `## Restrições` seja lido como (ou confundido com) a primeira tarefa.
- **Não-normativo.** Constraint material aprovada no G1 **não** vive no preâmbulo — vai no `## Objetivo` ou nos
  blocos, que **são** capturados pelo snapshot `Promovida de:` (ADR-0031/0032). O preâmbulo é contexto
  organizador; mudá-lo não é "mudança de plano" e por isso **não** precisa entrar no snapshot.

**2. Determinismo do casamento preservado.**
Os blocos continuam **ancorados** em `### <n>. <nome>`; a **fronteira do bloco** (`###` → `###` ou `## Como
iniciar`) é **inalterada**. `## Objetivo` continua a abertura; sua seção termina no próximo H2. `## Como
iniciar` continua encerrando a lista.

**3. H2 não-bloco só no preâmbulo (antes do 1º `###`).**
Depois do primeiro bloco, **só** `## Como iniciar` encerra a lista — **nenhuma** nova seção H2 é permitida no
meio ou no fim dos blocos (evita ambiguidade "isto está dentro do bloco ou é seção nova?"). Um H2 não-bloco
**após** um `###` permanece **inválido** (falha-fechado).

**4. Supersedência por esclarecimento (append-only).**
Registra-se **nota de cabeçalho** na ADR-0031 apontando para esta; o texto histórico da ADR-0031 é preservado.

## Alternativas consideradas

- **Reformatar O10/O11 para a gramática estrita** (a direção (B) do #244). Dobrar `## Restrições transversais`
  no `## Objetivo` e remover o wrapper. Rejeitada: incha o Objetivo (que é "o resultado que escopa o épico"),
  **perde** a seção Restrições como estrutura, e é remendo por-milestone que exige policiar o template p/ sempre.
- **Permitir H2 não-bloco em qualquer posição** (não só no preâmbulo). Rejeitada: um H2 no meio dos blocos
  torna a fronteira ambígua e quebra o parsing determinístico (o valor central da §2).
- **Permitir `###` não-tarefa no preâmbulo.** Rejeitada: colide com o identificador de bloco `### <n>. <nome>`
  e criaria tarefa fantasma; por isso o preâmbulo é `###`-free (Decisão, ponto 1).

## Consequências

- **Positiva:** O10/O11 (e futuros épicos) ficam **válidos sem editar** as descrições; o `plan-report` ao vivo
  deixa de falhar-fechado neles; épicos ganham estrutura organizadora sem perder determinismo.
- **Negativa/risco:** a superfície do parser cresce um pouco (aceitar preâmbulo). → *Mitigação:* a permissão é
  **restrita ao preâmbulo**; blocos seguem `###`-ancorados; teste explícito de que H2 pós-`###` ainda
  falha-fechado.
- **Observabilidade/confiança:** inalteradas — nada muda no casamento 1:1, no traço `Promovida de:` (ADR-0032)
  nem nos gates.

## Conformidade

Como verificar (fatia de aplicação — sibling G1 — e review, `AGENTS.md` §8.1):

- `parseMilestoneBodyV2` **aceita** H2 não-bloco no preâmbulo (não falha-fechado), **rejeita** H2 não-bloco
  **após** o primeiro `###`, e trata **qualquer `### <n>. <nome>` como início da lista de blocos** (um `###`
  "dentro" de uma seção de preâmbulo encerra o preâmbulo — não vira tarefa fantasma nem é ignorado); testes
  vitest provam os três casos.
- O preâmbulo é **não-normativo** — nenhuma constraint de plano aprovada no G1 depende dele (só `## Objetivo`
  e blocos, capturados pelo snapshot `Promovida de:`).
- `plan-report` rodado **ao vivo** renderiza **O10 (#15)** e **O11 (#16)** sem falha-fechada.
- Casamento de blocos inalterado (blocos por `### <n>. <nome>`; `## Objetivo`/`## Como iniciar` como antes).
- Gramática na skill/template alinhada; `AGENTS.md` §2/§4 conferido (é resumo, não a gramática exaustiva —
  ajusta só se contradisser).
- `tools/adr/adr-index.ts --check` verde (saída lida); `tools/adr/adr-sequence.ts --check` verde; nota na
  ADR-0031 **só adiciona** (histórico intocado).

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho do antigo. -->
