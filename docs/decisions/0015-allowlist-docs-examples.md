# ADR-0015 — Allowlist de execução de exemplos versionados (`docs/examples/`) no tool-guard

> **Numeração:** `0015` = próximo livre em `docs/decisions/` na `main` (a `main` tem `0001–0014`).
> Se algum 001x novo tiver mergeado antes desta tarefa, confirme com `git ls-files docs/decisions/` e
> renumere em ordem de adoção.

- **Status:** proposto  <!-- humano aprova (G2) → muda para: aceito -->
- **Data:** 2026-07-15
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** [ADR-0011](0011-hook-sandbox-allowlist-referencia.md) (hook de guarda/allowlist;
  "a allowlist cresce por review"), [ADR-0013](0013-validacao-alvo-leitura-tool-guard.md) (extensão da
  guarda — precedente), [ADR-0009](0009-verificacao-e2e-ferramenta-real.md) (e2e com ferramenta real);
  `AGENTS.md` §10 (segurança/menor privilégio), §11 (T0–T4); Issue **#71**; origem: achado do Codex na
  revisão da T4.3 (#63), roteado a partir do #62.

## Contexto
O `tools/guard/tool-guard.ts` (ADR-0011/0013) tem uma **allowlist de execução** (`SHELL_ALLOW`) que só
libera `node --experimental-strip-types` para scripts em **`tools/`** ou **`scripts/`**
(`tool-guard.ts:67`), com guard **anti-traversal** (`(?!\S*\.\.)`). O repo mantém **exemplos rodáveis
versionados** em **`docs/examples/`** — hoje `observability-cost-log.ts` (T4.3) e `e2e-init-check.sh`
(T4.1) — usados como **comando de evidência** do §8.1/ADR-0009 nos PRs.

Sob a guarda, `node --experimental-strip-types docs/examples/x.ts` **cai no default-deny**: um agente
obediente **não consegue rodar os próprios exemplos documentados** do repo, embora sejam versionados,
revisados e citados como evidência. É uma incoerência entre a política da guarda e o fluxo §8.1.

O ADR-0011 já estabelece que **a allowlist cresce por review** — esta decisão exerce esse princípio,
registrando-o de forma auditável (mudança de superfície de **execução** = segurança; §10 "na dúvida,
suba de nível" → registro de 1ª classe).

## Decisão
Estender a `SHELL_ALLOW` para permitir **executar exemplos versionados de `docs/examples/`**, mantendo o
fail-safe:

1. **Node (`.ts`):** liberar `node --experimental-strip-types docs/examples/<path>.ts` — adicionar
   `docs/examples` ao grupo de prefixos permitidos, **reusando o mesmo anti-traversal** `(?!\S*\.\.)` e a
   restrição a `.ts` versionado do repo.
2. **Shell (`.sh`):** liberar `bash docs/examples/<path>.sh` e `./docs/examples/<path>.sh` (o
   `e2e-init-check.sh` é exemplo real), com o **mesmo anti-traversal** e restrição a `.sh` sob
   `docs/examples/`. Precedência preservada: `SHELL_FORBID`/`SHELL_MUTATING` continuam **antes** da
   allowlist.
3. **Bounded:** libera **apenas** `docs/examples/` (conteúdo versionado/revisado) — **não** caminhos
   arbitrários, **não** `-e`/`--eval`, **não** alvo fora do repo, **não** traversal. Menor privilégio
   preservado.
4. **Args flags-only:** os args dos exemplos são restritos a **flags** (`-x`/`--flag`/`--flag=val`, sem
   `/` nem `.`) — um **alvo posicional arbitrário** após o script (ex.: `… observability-cost-log.ts
   docs/other/x.ts`, `bash e2e-init-check.sh /tmp/evil.sh`) **não casa** e cai no default-deny. Fecha a
   brecha em que um exemplo que aceite um caminho receberia um alvo fora da allowlist sob a decisão de
   baixa confiança (achado Codex P2 no #71). A forma `tools/`|`scripts/` mantém args livres (scripts como
   `ledger-guard a b` exigem args posicionais), fora do escopo desta decisão.

## Alternativas consideradas
- **Nota de emenda no ADR-0011 (sem ADR próprio):** rejeitada. É mudança de **segurança** (superfície de
  execução) e o precedente #62→ADR-0013 registra mudanças na guarda como ADR de 1ª classe; um registro
  descobrível vale mais que uma nota enterrada. (Trade-off avaliado; owner optou por ADR standalone.)
- **Manter como está / rodar exemplos fora da guarda:** rejeitada. Deixa os exemplos-evidência barrados
  e incentiva contornar a guarda — pior postura de segurança que uma allowlist explícita e estreita.
- **Alargar a allowlist para qualquer caminho `.ts`/`.sh` do repo:** rejeitada. Viola menor privilégio;
  `docs/examples/` é o conjunto justificado (exemplos-evidência), não "qualquer script".

## Consequências
- **Positivas:** os exemplos-evidência do §8.1/ADR-0009 tornam-se rodáveis **sob** a guarda; coerência
  entre a política de execução e o fluxo de verificação; convenção clara para futuros exemplos.
- **Negativas / risco:** **aumenta a superfície de execução** — mitigado por: (a) anti-traversal mantido;
  (b) restrição a `docs/examples/` versionado/revisado; (c) sem alvo/pacote arbitrário; (d) `FORBID`
  antes da allowlist. A `reason` de liberação indica o padrão casado (sem PII/segredo, §10).
- **Segurança/confiança:** classe **T2** (execução liberada com review). Merge é **T3/G3**.

## Conformidade
Verificável (§8.1): ADR aceito (G2); `SHELL_ALLOW` libera `docs/examples/<x>.ts` (node) e `<x>.sh`
(bash/`./`) e **nega** traversal (`docs/examples/../../tmp/evil.ts`) e alvo fora do conjunto; testes
vitest cobrem liberação (T1) **e** negação; seção tool-guard do `scripts/smoke-test.sh` verde; nota de
cabeçalho (append-only) no ADR-0011 apontando este ADR-0015; `STATE.md`/`CHANGELOG.md` coerentes.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho do antigo. -->
