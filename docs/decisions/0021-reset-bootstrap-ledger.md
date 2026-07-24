# ADR-0021 — Reset de bootstrap do ledger (guard bootstrap-aware)

- **Status:** proposto  <!-- humano aprova (G2) → muda para: aceito -->
- **Data:** 2026-07-24
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** Issue **#82**; **ADR-0006** (ledger append-only) e **ADR-0016** (política de
  projeção) — **estende** (referencia, não reescreve); `tools/ledger/ledger-guard.ts`;
  `docs/getting-started.md` §2.

## Contexto
A #82 precisa definir como um repo derivado do template (que **herda** o `feature-ledger.json` do Orion
via "Use this template") estabelece um ledger de **origem local** sem violar o append-only (ADR-0006). A
1ª tentativa (nota no ADR-0016 + reset por **commit direto na `main` pré-proteção**) tem buracos que a
Harness Review (Codex, PR #102) expôs: (a) a exceção de commit direto ficava no `CONTRIBUTING`, mas a
constituição (`AGENTS.md`) — que **prevalece** — define `main` protegida + PR **sem exceção**; (b) numa
**org com ruleset** que já exige PR, a proteção existe **antes** do passo §4, e o push direto é rejeitado
desde o início; (c) o `ledger-guard` **roda local** (no `smoke-test.sh`) e, entre o reset e o push,
compara contra o `origin/main` herdado → acusa **remoção**. Raiz comum: **qualquer** reset do ledger
herdado é uma "remoção" que o guard vê (local **ou** PR), e "direto-na-`main`" **não é universal**.

## Decisão
Tornar o **`ledger-guard` bootstrap-aware**: a transição **base não-vazia → head vazio (`[]`)** é
reconhecida como o **reset one-time de origem local** e é **permitida** (`isBootstrapReset`). Com isso o
reset do repo derivado passa pelo **fluxo normal** (Issue → branch → **PR** → merge humano) — **sem**
commit direto na `main`, **sem** exceção na constituição e **compatível com rulesets de org**; e a
validação **local** (`smoke-test.sh`) passa. O `[]` é o marcador **inequívoco** de "começar do zero";
depois dele o append-only volta a valer **integralmente** (o reset é o **marco** que o invariante passa
a proteger, não uma edição sob ele).

**Segurança do carve-out:** restrito a `head === []` (zeramento total, não remoção parcial — esta segue
proibida). É seguro porque um PR de agente **nunca** esvazia o ledger inteiro (agentes **adicionam**
entradas); o zeramento é **glaring e auditável** no diff do PR; e o **merge humano (T3/G3)** é o backstop.
O guard **loga** o carve-out (`PASS (reset de bootstrap …)`), então não é passagem silenciosa.

## Alternativas consideradas
- **Reset por commit direto na `main` pré-proteção (1ª tentativa):** rejeitada — subordinada ao
  `CONTRIBUTING` (a constituição vence e não abre exceção), quebra sob ruleset de org e o guard local vê
  a remoção. Sem rota compatível única.
- **Sancionar a exceção de commit direto na constituição (`AGENTS.md`) + bypass de ruleset por admin:**
  rejeitada — mais superfície de governança, procedimento de org frágil, e ainda deixa o guard local
  acusando o reset.
- **Gitignore do ledger / reset no `init.sh`:** já rejeitadas na nota do ADR-0016 (o Orion precisa do
  ledger versionado; o `init.sh` é bootstrap de ambiente).

## Consequências
- **Positivas:** uma **rota única e compatível** para o bootstrap do ledger em derivados (PR normal),
  válida inclusive sob rulesets de org; validação local coerente; a constituição e o fluxo de Git ficam
  **sem exceção especial**. Resolve os 3 achados do Codex no #102.
- **Negativas/limite:** um carve-out no `ledger-guard` (transição para `[]`). Mitigado pelo escopo
  estrito (só zeramento total), pela visibilidade (log + diff do PR) e pelo **merge humano** como
  backstop. **Estende** o ADR-0006 (append-only) — não o reescreve; o invariante segue integral fora do
  reset de bootstrap.
- **Doc:** `getting-started` §2 passa a descrever o reset via **PR normal** (não commit direto); a nota
  do ADR-0016 e o `CONTRIBUTING` são reconciliados (sem a exceção de commit direto).

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho deste. -->
