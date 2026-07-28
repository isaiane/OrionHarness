# ADR-0022 — Lifecycle de conclusão do Feature Ledger (validação aplicável + owner/gatilho da flip `passes:true`)

> **Numeração:** `0022` = próximo livre em `docs/decisions/` (a `main` tem `0001–0021`). Confirme com
> `git ls-files docs/decisions/` antes de commitar; se algum 002x novo tiver mergeado, renumere em ordem
> de adoção.

- **Status:** proposto
- **Data:** 2026-07-27 (proposto)
- **Decisores:** Isa (owner) — aprovação humana (gate G2), no merge deste PR
- **Relacionado a:** [ADR-0006](0006-ledger-executavel-de-tarefas.md) (ledger semeia-e-cresce; append-only),
  [ADR-0016](0016-politica-projecao-ledger.md) (política de **projeção** — quais entram, `passes:false`),
  [ADR-0009](0009-verificacao-e2e-ferramenta-real.md) (e2e opt-in por tipo/risco),
  [ADR-0014](0014-semantica-ledger-as-accepted.md) (as-accepted); `AGENTS.md` §8.1, §11 (T0–T4), §12 (DoD);
  `CONTRIBUTING.md` §Ledger; `docs/agent-reviewer-checklist.md`; `docs/getting-started.md` §7 (get-bearings);
  Issue **#85**; origem: achado do Codex no PR #81 (#73), diferido como limitação conhecida do ADR-0016.

## Contexto
O [ADR-0016](0016-politica-projecao-ledger.md) fixou a **projeção** (toda `type:task` no escopo nasce
`passes:false`, per-PR) mas **deixou explícito** que não tratava da **conclusão** (`passes:true`), diferindo-a
para o **#85**. Na prática o mecanismo de conclusão **não existia**:

1. **Gerador hardcodava e2e:** `tools/ledger/ledger-from-issues.ts` gravava
   `steps: ["Validar end-to-end conforme o Plano de validação da Issue #N"]` em **toda** entrada, e o
   `feature-ledger.schema.json` afirmava que `passes` só vira `true` "com evidência e2e" — **mesmo** para
   tarefas **sem superfície observável** (docs/governança/estado), contrariando o **opt-in por tipo/risco**
   do [ADR-0009](0009-verificacao-e2e-ferramenta-real.md).
2. **`steps` é imutável** pós-merge (`ledger-guard.ts`, campo em `IMMUTABLE`) — não dá para realinhar depois.
3. **Flip sem owner/gatilho:** o `ledger-guard` rejeita item **novo** já `true` (deve nascer `false`), então a
   transição `false→true` só cabe num **PR posterior** ao que criou a entrada — mas **nenhum artefato definia
   quem** faz e **quando**. Resultado: **57/57 entradas `false`**, indistinguíveis de pendentes, e a promessa
   de "não fica `false` pra sempre" sem sustentação.

## Decisão
Definimos o **lifecycle de conclusão** de uma entrada do ledger, sem violar o append-only (ADR-0006):

**(a) `steps` = plano de validação _aplicável_ (e2e condicional ao ADR-0009).** O gerador deriva o step da
**categoria** já inferida — o sinal de superfície que ele computa:
- `style` (UI) → **automação de browser** (ADR-0009 §1);
- `contract` (API/CLI) → **exercício do contrato público** (ADR-0009 §2–3);
- `functional` (catch-all, **sem** superfície declarada) → step **neutro**, com a e2e **explicitamente
  condicional**. A decisão de aplicabilidade da e2e para o `functional` é do **revisor humano** ("na dúvida,
  suba de nível" — ADR-0009, no `agent-reviewer-checklist`), **não** do gerador.

O `steps` é **documentação** do plano aplicável (não é enforcement executável). O schema deixa de afirmar
e2e **universal**; passa a "evidência do plano de validação aplicável (e2e só quando o ADR-0009 exigir)".
Assim, uma tarefa **sem e2e não carrega exigência de e2e** — o critério de aceite central do #85.

**(b) Owner e gatilho da flip `false→true`.**
- **Owner:** o **autor da entrega** do critério — quem abre o **PR que anexa a evidência** do plano de
  validação aplicável (e2e quando o ADR-0009 exigir).
- **Gatilho:** a flip acontece **no primeiro PR posterior ao merge da entrada** (a entrada já existe em
  `main` como `false`, então o `ledger-guard` **permite** a transição `false→true` de item **existente**). O
  guard proíbe **nascer `true`**, então quando entrega e evidência cabem no mesmo ciclo, a flip é um **segundo
  commit/PR** — nunca a criação da entrada.
- **Reforço operacional (para não ficar `false` por esquecimento):**
  1. **DoD (§12):** a tarefa só está pronta quando a(s) entrada(s) do ledger da Issue foram **flipadas para
     `passes:true`** com a evidência aplicável anexada (ou a dispensa de e2e justificada, ADR-0009).
  2. **Review:** o `agent-reviewer-checklist` verifica a flip + evidência aplicável.
  3. **get-bearings (§7):** a view no escopo (`ledger-origin.ts --scoped`) lista as `passes:false`, então uma
     entrada **entregue mas não-flipada** é **pega na próxima sessão** e flipada — o mecanismo que garante que
     `false` é **transitório**, não permanente.

**(c) Append-only preservado.** Só a transição de item **existente** `false→true` (o `ledger-guard` já a
permite); **nada** reescreve `steps`/`description`/`acceptance`. As **57 entradas históricas** ficam intactas
(seus `steps` antigos continuam válidos no schema — só descrições mudaram); esta decisão vale **dali pra
frente** (fora de escopo: reprojetar histórico).

## Alternativas consideradas
- **Gerador decide a aplicabilidade da e2e para `functional` (default = exigir, "suba de nível"):** rejeitada.
  Faria **toda** entrada carregar e2e — nenhuma tarefa ficaria "sem e2e", falhando o critério do #85 e
  inflando docs/governança/estado com cerimônia (contra ADR-0009/0004). O "suba de nível" é responsabilidade
  do **revisor** (onde o contexto está), não de um classificador por palavra-chave. O gerador documenta o
  **default aplicável**; o humano levanta o nível quando o caso pede.
- **Marcador explícito de e2e na Issue (label/campo `no-e2e`):** rejeitada por proporcionalidade — adiciona
  burocracia por Issue para um sinal que a **categoria** já aproxima bem, com os erros no lado **seguro**
  (over-cautela vira contract/e2e; a sub-cautela é pega no review).
- **Tornar `steps` mutável para realinhar pós-merge:** rejeitada — quebra a tamper-evidence do append-only
  (ADR-0006). O realinhamento vale **para novas entradas**; as históricas permanecem as-accepted (ADR-0014).
- **Helper `--flip <id>` no gerador:** diferido (YAGNI) — a flip é uma edição `false→true` trivial, **validada
  pelo `ledger-guard`**; um comando dedicado pode virar follow-up se o volume justificar.

## Consequências
- **Positivas:** o `passes:true` passa a ter **caminho definido** (owner + gatilho + reforço no DoD/review/
  get-bearings); entradas sem superfície não carregam e2e espúria; o ledger deixa de ser "tudo pendente".
- **Negativas / risco:** a flip depende de um **PR posterior** ao da entrada (consequência do "nasce `false`"
  do guard) — mitigado pelo reforço no DoD e pela view de get-bearings que **resgata** entradas esquecidas. A
  classificação por categoria pode **sub/super-estimar** a e2e do `functional`/`contract` — os erros caem no
  lado **seguro** (ADR-0009) e o **revisor** ajusta.
- **Segurança/confiança:** classe **T2** (toca gerador/schema — código, com review). Merge é **T3/G3**. Esta é
  também **mudança de harness/governança** → **Harness Review** antes do merge.

## Conformidade
Verificável (§8.1): (1) o gerador emite `steps` **condicionais à categoria** (e2e nomeada só p/ `style`/
`contract`; `functional` neutro) — coberto por vitest em `tools/ledger/ledger.test.ts`; (2) o schema e o
`ledger-guard` seguem **coerentes** (a flip `false→true` de item existente passa; nascer `true` falha); (3)
`CONTRIBUTING.md` §Ledger, `AGENTS.md` §12 e o `agent-reviewer-checklist` descrevem o **owner/gatilho** da
flip; (4) o ADR-0016 aponta esta decisão como **RESOLVIDO** para a limitação `#85`.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho do antigo. -->
