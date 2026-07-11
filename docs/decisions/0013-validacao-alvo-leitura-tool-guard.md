# ADR-0013 — Validação de alvo de leitura no tool-guard (estende o ADR-0011)

> **Numeração:** `0013` = próximo livre em `docs/decisions/` na `main` **após** o 0012 (#49). Se o
> 0012 ainda não tiver mergeado quando esta tarefa for implementada, confirme o próximo livre com
> `git ls-files docs/decisions/` e renumere em ordem de adoção.

- **Status:** proposto  <!-- humano aprova (G2) → muda para: aceito -->
- **Data:** 2026-07-11
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** [ADR-0011](0011-hook-sandbox-allowlist-referencia.md) (hook de guarda);
  `AGENTS.md` §10 (segurança/segredos), §11 (modelo de confiança T0–T4); Issue **#62**;
  achado **P2** do Codex no PR #61.

## Contexto
O `tool-guard.ts` (T4.2, ADR-0011) classifica ferramentas de leitura
(`Read`/`Grep`/`Glob`/`LS`/`NotebookRead`) como **T0 pelo nome**, ignorando o **alvo** lido. A
interface `ToolCall` modela só `{ tool, command? }` — não carrega o caminho/pattern. Isso foi
documentado como **limite conhecido** no ADR-0011. Em integrações onde o read tool carrega um
caminho, um `Read` de `/etc/shadow`, `.env` ou outro arquivo com segredo seria **liberado como T0** —
enquanto o lado Bash já bloqueia `/etc/(passwd|shadow)` e leitura de segredos. Incoerência com a
definição de T0 ("leitura sem dado sensível", §11) e com *secure by default / fail secure* (§10).

## Decisão
Estender o `tool-guard` para **inspecionar o alvo de leitura** e **falhar-fechado** quando o alvo é
sensível ou não pode ser validado:

1. **Modelo.** Estender `ToolCall` com o alvo de leitura (ex.: `path`/`args`), **retrocompatível**
   (campo opcional; chamadas sem alvo continuam válidas na assinatura).
2. **Política (denylist de alvos, espelhando o lado Bash).** Quando um alvo de leitura é fornecido:
   alvo **sensível** — **credenciais de sistema `/etc/(passwd|shadow)`**, `.env*`, `~/.ssh/`, chaves
   privadas (`.pem`/`.key`/`id_*`), `.npmrc`, `~/.aws/`, `/proc/*/environ`: o **mesmo conjunto
   `SENSITIVE_READ_TARGETS`** aplicado ao lado Bash (fonte única — o `/etc/(passwd|shadow)` migra de
   `SHELL_FORBID` para esse conjunto, para não ser bloqueado num lado e liberado no outro), com a
   normalização anti-traversal (e `\` → `/` **só no alvo de leitura**, para paths estilo Windows como
   `.ssh\config` — nunca no comando Bash, onde `\` é escape de shell) → **bloqueio (T4)**; alvo
   **presente mas não-validável** (vazio) → **fail-closed**; caminho comum (ex.: `src/x.ts`) →
   segue **T0**.
   - **Ativação opt-in por runtime, com modo estrito opcional** (evita regressão): hoje as read tools
     são T0 sem alvo e o modelo `{ tool, command? }` não carrega path — aplicar "ausente → fail-closed"
     **universalmente** bloquearia toda leitura. Portanto:
     - **Default (retrocompatível):** read tool **sem** `path` → **T0 legado**. A validação entra
       **quando a integração fornece o alvo** (campo `path` opt-in).
     - **Modo estrito (`strictReadTarget`, opt-in por projeto):** um projeto que garante sempre
       fornecer o alvo liga a flag; então read tool **sem** `path` vira **fail-closed** ("alvo
       esperado e ausente"). Desligado (default) não muda nada.
   - Nem **fail-open** (mantém o buraco), nem **bloqueio geral** (quebra leituras): o furo do `.env`
     fecha quando há alvo; o modo estrito fecha também o "sem alvo" para quem quiser rigor total.
3. **Amarração.** Esta decisão **estende** (não supersede) a política default-deny do ADR-0011 ao lado
   das read tools; anexar **nota de cabeçalho** no ADR-0011 apontando para este ADR.

## Alternativas consideradas
- **Manter como limite conhecido** (status quo do ADR-0011): rejeitada. É lacuna real no modelo de
  confiança — o mesmo alvo é bloqueado pelo lado Bash e liberado pelo lado read tool.
- **Bloquear toda read tool que traga um caminho:** rejeitada. Grosseiro demais; quebra leituras
  legítimas e esvazia o valor do T0.

## Consequências
- **Positivas:** fail-secure coerente entre o lado Bash e o lado read tool; T0 volta a significar
  "leitura sem dado sensível"; decisão tipada `{ allow, klass, reason }` já é auditável. A `reason`
  identifica **o padrão/categoria negado** (ex.: o `source` do regex), **nunca o caminho literal** —
  para não vazar path de usuário (ex.: `/home/alice/.ssh/id_rsa`) em log/memória versionada
  (§10 — sem PII/segredos; Data-First §9.1).
- **Negativas / risco:** falsos positivos ao bloquear leituras legítimas — mitigar com **allowlist de
  caminhos por review**. Modelar `path` pode **acoplar** a guarda ao formato de input do runtime —
  manter o campo **genérico e opt-in**, sem embutir num runtime específico.
- **Limite residual (conhecido):** um **glob que trunca o nome sensível** (ex.: `/etc/passw*` →
  `passwd`) não é casado pelo regex — exige canonicalização com filesystem, **mesma classe** do glob de
  shell já documentado como limite no ADR-0011 (cresce por review). O glob no **diretório** sensível
  (`~/.ssh*`/`~/.aws*`) **é** coberto.

## Conformidade
Verificável (§8.1): vitest cobre `Read`/`Grep`/`Glob`/`LS` de caminho **sensível bloqueado** (T4),
alvo **presente vazio → fail-closed**, **caminho comum ainda T0** (sem regressão), **`path` ausente →
T0 no default** e **fail-closed com `strictReadTarget`**; `smoke-test.sh` exercita um read sensível
plantado sendo bloqueado; política registrada (este ADR + nota no ADR-0011) e aprovada no G2.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho do antigo. -->
