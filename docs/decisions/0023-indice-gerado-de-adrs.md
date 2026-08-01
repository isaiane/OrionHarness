# ADR-0023 — Índice gerado de ADRs (`docs/decisions/README.md`) + guard anti-drift

- **Status:** proposto  <!-- G2: aguardando aprovação humana (owner); ao aceitar, trocar para "aceito" e anotar a data -->
- **Data:** 2026-08-01 (proposto)
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** épico **O6 — Hygiene & navegação** / Issue **#121** (T6.0); **reusa** o padrão do
  [ADR-0019](0019-nucleo-l0-condensado.md) (visão derivada + guard anti-drift) e a semântica de projeção
  do [ADR-0006](0006-ledger-executavel-de-tarefas.md)/[ADR-0014](0014-semantica-ledger-as-accepted.md)
  (a fonte é o artefato, o índice é uma **projeção**); `MEMORY.md` §L3 (a pasta `docs/decisions/`).
  Sem superseder nem reabrir ADR anterior (append-only).

## Contexto

O agente do dia a dia carrega só o **núcleo L0** ([ADR-0019](0019-nucleo-l0-condensado.md)) e abre ADRs
**sob demanda**, apontados por handoff/STATE/inline. A pasta `docs/decisions/` só tem os arquivos
numerados: achar o ADR relevante por tema depende **100% de os ponteiros estarem corretos**. Se um
ponteiro esquece um ADR, o agente só o descobre **lendo a pasta inteira** — exatamente o custo de
contexto que o Orion evita. Com 22+ ADRs e crescendo, a navegação por ponteiro não escala.

A tentação óbvia — manter um índice à mão — reproduz o **anti-padrão do STATE inchado**: um índice
manual **driftaria** dos ADRs à primeira distração de autoria. A restrição forte, então, é a mesma do
ADR-0019 e do ledger: **a fonte da verdade são os arquivos**; qualquer visão condensada tem de ser
**derivada e checada**, nunca uma segunda fonte concorrente mantida em paralelo.

## Decisão

Adotar um **índice de ADrs gerado**, `docs/decisions/README.md`, como **contrato de navegação de 1ª
classe** — uma **projeção** dos ADRs, com **guard anti-drift**, instanciando o padrão do ADR-0019:

1. **Derivado, nunca autoral.** O índice contém, por ADR: **número** + **título** (extraído do heading
   `# ADR-NNNN — …`) + **status** (de `- **Status:** …`, limpando o comentário HTML de auditoria do G2).
   **Ordenado por número**, com link relativo ao arquivo. O **`0000-template.md` é excluído**. Nada é
   escrito à mão ⇒ **zero superfície de drift**.
2. **Sem coluna de tema/tags autoral.** Uma coluna curada de "tema" **driftaria** — e é redundante: o
   **título já carrega o tema** (basta `grep` "ledger", "review", "stack"…). A fonte única é o próprio ADR.
3. **Gerador puro + I/O.** `tools/adr/adr-index.ts` expõe uma função **pura** `buildAdrIndex(files) →
   string` (testável, sem I/O) e um wrapper de I/O com dois modos: **`--write`** (grava o README) e
   **`--check`** (regenera em memória e **compara** com o README commitado → **exit ≠ 0** se divergir).
   Roda em Node ≥ 22.6 por type stripping (`--experimental-strip-types`), **sem devDep nova**.
4. **Anti-drift (checado, não confiado).** Um bloco no `scripts/smoke-test.sh` roda `--check` e **reprova**
   o CI se o README divergir dos ADRs — **espelhando** o guard do núcleo L0. Criar/alterar um ADR sem
   regenerar o índice **quebra o smoke-test** (rotear por construção; o guard é a rede).
5. **Findability.** O ritual get-bearings (`getting-started` §7) e o `MEMORY.md` mandam **`grep` no
   índice** para achar um ADR por tema, em vez de varrer a pasta — fechando o loop do problema.
6. **Fail-soft.** Um ADR fora do padrão (sem heading/status, ou número do título ≠ do arquivo) **falha
   com erro claro** no gerador, em vez de emitir lixo silencioso.

> **Por que um ADR (G2) e não só aplicação do ADR-0019?** O índice passa a ser um **contrato de navegação
> de 1ª classe** (o agente confia nele para *não* ler a pasta): sua semântica — o que é derivado, o que é
> proibido curar à mão, e a garantia do guard — merece registro append-only próprio. A **disciplina de
> ponteiros** (handoff/STATE/inline) continua a defesa primária; o índice é a **rede** quando um ponteiro falha.

## Alternativas consideradas

- **Índice mantido à mão:** rejeitada — driftaria (anti-padrão do STATE); a projeção não pode depender de
  disciplina de autoria linha a linha.
- **Coluna de tema/tags curada:** rejeitada — superfície de drift e redundante com o título (que já é
  grepável). Derivar > curar.
- **Nenhum índice (status quo — só ponteiros):** rejeitada — não escala com 22+ ADRs; um ponteiro
  esquecido força varredura da pasta (o custo de contexto que motiva o O6).
- **Ferramenta externa / devDep de indexação:** rejeitada — desproporcional; Node stdlib + type stripping
  bastam, coerente com a stack (ADR-0005/0012) e o "sem toolchain" dos guards de referência.
- **Tratar como mera aplicação do ADR-0019 (Gate —):** considerada; escalada a **G2** por decisão do owner
  (o índice é contrato de navegação de 1ª classe, não um detalhe de tooling).

## Consequências

- **Positivas:** navegação por ADR barata e escalável (`grep` no índice, não varredura); a projeção **não
  mente** (guard); reusa um padrão já sancionado, sem inventar mecanismo; sem devDep nova.
- **Negativas/riscos + mitigação:**
  - *Autoria esquece de regenerar* → guard no smoke-test **cobra** (ADR novo sem `--write` ⇒ CI vermelho);
    convenção no `CONTRIBUTING.md` + nota no `0000-template.md` roteiam por construção.
  - *Índice existe mas ninguém consulta* → findability no get-bearings (`getting-started` §7 / `MEMORY.md`).
  - *ADR fora do padrão* → parser **fail-soft** com erro claro; `0000-template` excluído.
  - *Índice manual driftaria* → 100% gerado; nenhuma linha autoral no README.
- **Segurança/confiança/observabilidade:** sem impacto em T0–T4/gates (só **navegação/apresentação**);
  sinal Data-First = agentes localizam ADRs via o índice (grep) em vez de varrer; drift capturado pelo
  guard antes do merge. Sem PII.

## Conformidade

- **Review/CI:** **Harness Review** (tooling/navegação — [ADR-0008](0008-separacao-revisao-harness-vs-produto.md))
  confirma que o índice é **100% gerado** (nenhuma linha autoral), o guard **morde** (README
  dessincronizado → vermelho) e a convenção de autoria não se contradiz com o guard. O `--check` roda no
  `scripts/smoke-test.sh` (anti-drift contínuo).
- **§8.1:** rodar `tools/adr/adr-index.ts` (self-check: índice real × README **e** prova de mordida) +
  vitest (`adr-index.test.ts`: extração, limpeza de HTML, template excluído, ordenação, drift, fail-soft)
  + **idempotência** (`--write` duas vezes = sem diff) + **simulação do agente obediente** (ADR fake sem
  regenerar ⇒ smoke vermelho). Tooling/navegação **sem superfície de usuário** → a verificação **e2e**
  ([ADR-0009](0009-verificacao-e2e-ferramenta-real.md)) **não se aplica** (dispensa justificada no PR).
- **Repo-wide:** por tocar a navegação da constituição, os ponteiros de findability (`getting-started`
  §7, `MEMORY.md`) e a convenção de autoria (`CONTRIBUTING.md`, `0000-template.md`) acompanham a decisão.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho deste. -->
