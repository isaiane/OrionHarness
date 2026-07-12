# STATE — Índice de Estado

> **Camada L1 (índice leve)** (`AGENTS.md` §4). Ponteiro de orientação rápida: o agente lê isto
> ao iniciar uma sessão para saber **onde estamos e qual o próximo passo**. **Não duplica**
> conteúdo — o detalhe vive nas Issues SDD e nos artefatos linkados. Atualize ao concluir cada
> tarefa/fase.

## Agora

- **Fase do pipeline:** **sem épico ativo** — **tarefa ativa: #67** (semântica do ledger *as-accepted*
  + projeção da #43), em PR aguardando **G2** (flip do **ADR-0014** `proposto`→`aceito`) e merge (T3).
  O1/O2/O3/O4 concluídos; **#62** (validação de alvo de leitura no tool-guard) **mergeada** (PR #69,
  ADR-0013 aceito).
- **⚠️ Pré-merge (#67):** o merge depende do **flip do ADR-0014** (`proposto`→`aceito`, G2). Ao aprovar,
  rodar o flip **antes** do merge e limpar esta nota + a de "aguardando G2" no `CHANGELOG.md`.
- **Em andamento:** **#67** · **semântica do ledger *as-accepted*** ([ADR-0014](docs/decisions/0014-semantica-ledger-as-accepted.md),
  `proposto`): o ledger é projeção **histórica por Issue**, fiel à entrega, **não** reconciliada ao
  estado atual (coerente com o append-only do ADR-0006). Aplicação: corpo da **#43** corrigido (2
  termos de rascunho×entrega comprovados por git — `mudança de L0`→`governança/instrução`, `3 camadas`→
  `3 representações`) e **#43 projetada** no `feature-ledger.json` (5 critérios, `passes:false`).
  Nota de cabeçalho no ADR-0006 + anotação no `CONTRIBUTING.md`. Aguardando **G2** (flip) + merge.
- **Última conclusão:** #62 (PR **#69**) · **validação de alvo de leitura no tool-guard** (fecha o
  limite conhecido do ADR-0011): a guarda inspeciona o **alvo** de uma read tool (`ToolCall.path`,
  opt-in) contra a mesma denylist de segredos do lado Bash — alvo sensível (credenciais de sistema
  `/etc/(passwd|shadow)`, `.env`/`.envrc`, `~/.ssh`, `~/.aws` incl. dir/glob, chaves, `.npmrc`,
  `/proc/*/environ`; normalizado por traversal/`\`→`/`/minúsculas) → **block (T4)**; alvo vazio →
  **fail-closed**; comum → T0; **sem alvo → T0 legado**, ou **fail-closed com `strictReadTarget`**
  (opt-in). **29 testes vitest** + check no `smoke-test.sh`; endurecida por 8 achados do Codex (limites
  residuais — glob que trunca nome, separadores atípicos de `.env` — documentados no ADR). Decisão em
  [ADR-0013](docs/decisions/0013-validacao-alvo-leitura-tool-guard.md) (**aceito** no G2; emenda no
  ADR-0011).
- **Antes:** **#49** (consolidação Node/TS, ADR-0012 — PR #68); **#65** (reprojeção do #53 no ledger —
  PR #66); **#53/T4.3** (observabilidade de custo/tokens, **fecha a O4** — PR #63); **#52/T4.2**
  (tool-guard base, ADR-0011); **#51/T4.1** (e2e, ADR-0009 — abriu a O4).
- **Governança recente:** **ADR-0013** (alvo de leitura no tool-guard), ADR-0012 (consolidação
  Node/TS), ADR-0009 (e2e), ADR-0010 (re-review) e ADR-0011 (hook de guarda) **aceitos** (G2).
- **Regra de foco:** **uma** tarefa ativa por vez; nenhuma nova Issue antes desta verde e mergeada.

## Próximo passo

**Concluir o #67** — aguardar o **G2** (flip do ADR-0014 `proposto`→`aceito`) e o merge (T3) do PR.
Depois, **replanejar (volta ao _Plan_/G1)** entre os follow-ups **abertos** rastreados: **#73**
(hygiene do ledger — política de auto-projeção + backfill de #45/#62/#67; descoberto na revisão do PR
#72) e **#71** (allowlist de `docs/examples/` no tool-guard). Escolher **com o humano (G1)**; não abrir
nova tarefa sem G1 — só apontar.

## Riscos / pendências em aberto

- Confirmar a licença (atual: MIT) ao adotar em contexto organizacional.
- **Perfil de proteção = Solo:** o enforcement do "humano aprova" no merge é procedural (ADR-0003);
  migrar para o perfil Time (`approvals ≥ 1` + `CODEOWNERS`) quando houver 2+ mantenedores.
- **`.github/labels.yml`** ainda tem labels de stack multi-linguagem (comentário "projetos
  poliglotas", linha ~52) — **fora do escopo do #49** (não é afirmação de capacidade atual do harness);
  reavaliar se as labels `stack:*` fazem sentido sob a leitura única Node/TS (candidato a follow-up).
- **Allowlist de `docs/examples/` no tool-guard (residual do #62):** a #62 tinha, por comentário, um
  sub-ponto de estender a `SHELL_ALLOW` para `node --experimental-strip-types docs/examples/…` (achado
  na revisão da T4.3). O PR do #62 entrega **só a validação de alvo de leitura** (escopo do handoff/ADR-0013);
  esse sub-ponto (execução de exemplo, concern distinto) fica como **follow-up pequeno** — abrir issue
  própria ou dobrar num ADR de allowlist.

## Ponteiros

`PLAN.md` · **#53 (T4.3, concluída — fecha a O4)** · `docs/observability.md` · `docs/examples/observability-cost-log.ts` · #52 (T4.2, `tools/guard/`) · ADR-0011 (`aceito`) · **#62 (tool-guard alvo de leitura, ADR-0013 `aceito`)** · #55 · ADR-0010 (`aceito`) · #51 (T4.1/O4) · ADR-0009 (`aceito`) · #57 (reconciliação) ·
`docs/examples/e2e-init-check.sh` ·
`docs/agent-reviewer-checklist.md` · `AGENTS.md` §8.1/§12 · #33 (T2.4/O2) ·
`docs/getting-started.md` §7 (ritual get-bearings) · `init.sh` · ADR-0007 · ADR-0008 · `MEMORY.md` ·
`docs/product/` · `docs/decisions/` · **ADR-0014 (`proposto` — semântica do ledger as-accepted, #67)** ·
**#43 (projetada no `feature-ledger.json`)** · `CHANGELOG.md`
