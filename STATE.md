# STATE — Índice de Estado

> **Camada L1 (índice leve)** (`AGENTS.md` §4). Ponteiro de orientação rápida: o agente lê isto
> ao iniciar uma sessão para saber **onde estamos e qual o próximo passo**. **Não duplica**
> conteúdo — o detalhe vive nas Issues SDD e nos artefatos linkados. Atualize ao concluir cada
> tarefa/fase.

## Agora

- **Fase do pipeline:** **tarefa ativa = #71** (allowlist de `docs/examples/` no tool-guard) — em
  _Review_, PR aberto aguardando revisão e **G2/G3 humanos**. O1/O2/O3/O4 concluídos.
- **Em andamento:** **#71** · a `SHELL_ALLOW` do [`tools/guard/tool-guard.ts`](tools/guard/tool-guard.ts)
  passa a liberar a execução de exemplos-evidência versionados de `docs/examples/` (`node .ts` e
  `bash`/`./` `.sh`), reusando o anti-traversal e sem alvo arbitrário. **Decisão de segurança em
  [ADR-0015](docs/decisions/0015-allowlist-docs-examples.md) (`proposto` — humano flipa no G2 →
  `aceito`)** + nota append-only no ADR-0011. Args dos exemplos **flags-only** (achado Codex P2). **#71
  projetada no `feature-ledger.json`** (3 critérios, `passes:false`, `ledger-guard` verde — achado Codex
  P1). Testes vitest e checks tool-guard/ledger-guard do smoke-test verdes.
- **Antes (última conclusão):** #74 (PR **#76**) · **check de commitlint determinístico** no
  [`scripts/smoke-test.sh`](scripts/smoke-test.sh): o exercício do hook real passa a alimentar a
  mensagem pelo `.git/COMMIT_EDITMSG` (que o hook de fato lê), com backup/restore, e valida os dois
  lados (rejeita inválida / aceita válida) — corrige o falso-vermelho local × verde no CI. Fix shell,
  sem ADR.
- **Antes:** **#67** (semântica do ledger *as-accepted*, ADR-0014 — PR #72; corpo da #43 corrigido +
  #43 projetada no `feature-ledger.json`); **#62** (alvo de leitura no tool-guard, ADR-0013 — PR #69);
  **#49** (consolidação Node/TS, ADR-0012 — PR #68); **#65** (reprojeção do #53 no ledger — PR #66);
  **#53/T4.3** (observabilidade de custo/tokens, **fecha a O4** — PR #63); **#52/T4.2** (tool-guard
  base, ADR-0011); **#51/T4.1** (e2e, ADR-0009 — abriu a O4).
- **Governança recente:** **ADR-0014** (semântica do ledger *as-accepted*), ADR-0013 (alvo de leitura
  no tool-guard), ADR-0012 (consolidação Node/TS), ADR-0009 (e2e), ADR-0010 (re-review) e ADR-0011
  (hook de guarda) **aceitos** (G2).
- **Regra de foco:** **uma** tarefa ativa por vez; nenhuma nova Issue antes desta verde e mergeada.

## Próximo passo

**Concluir a #71** — revisão (Product + Harness pela toca no ADR-0011) + **G2** (flip do ADR-0015
`proposto`→`aceito`) + **G3** (merge humano). Depois, **replanejar (volta ao _Plan_/G1)**: escolher com
o humano o próximo work item entre os follow-ups **abertos**: **#75** (remover python do
`smoke-test.sh`, alinhando ao ADR-0005/0012; descoberto ao corrigir o #74) e **#73** (hygiene do
ledger — política de auto-projeção + backfill de #45/#62/#67; descoberto na revisão do PR #72). Não
abrir nova tarefa sem G1 — só apontar.

## Riscos / pendências em aberto

- Confirmar a licença (atual: MIT) ao adotar em contexto organizacional.
- **Perfil de proteção = Solo:** o enforcement do "humano aprova" no merge é procedural (ADR-0003);
  migrar para o perfil Time (`approvals ≥ 1` + `CODEOWNERS`) quando houver 2+ mantenedores.
- **`.github/labels.yml`** ainda tem labels de stack multi-linguagem (comentário "projetos
  poliglotas", linha ~52) — **fora do escopo do #49** (não é afirmação de capacidade atual do harness);
  reavaliar se as labels `stack:*` fazem sentido sob a leitura única Node/TS (candidato a follow-up).
- **Allowlist de `docs/examples/` no tool-guard (residual do #62):** endereçado pela **#71** (em
  _Review_, PR aberto) — a `SHELL_ALLOW` passa a liberar `node .ts` e `bash`/`./` `.sh` de
  `docs/examples/`, decisão em ADR-0015 (`proposto`, aguardando G2). Fecha o sub-ponto de execução de
  exemplo que ficara fora do escopo do #62/ADR-0013.

## Ponteiros

`PLAN.md` · **#53 (T4.3, concluída — fecha a O4)** · `docs/observability.md` · `docs/examples/observability-cost-log.ts` · #52 (T4.2, `tools/guard/`) · ADR-0011 (`aceito`) · **#62 (tool-guard alvo de leitura, ADR-0013 `aceito`)** · #55 · ADR-0010 (`aceito`) · #51 (T4.1/O4) · ADR-0009 (`aceito`) · #57 (reconciliação) ·
`docs/examples/e2e-init-check.sh` ·
`docs/agent-reviewer-checklist.md` · `AGENTS.md` §8.1/§12 · #33 (T2.4/O2) ·
`docs/getting-started.md` §7 (ritual get-bearings) · `init.sh` · ADR-0007 · ADR-0008 · `MEMORY.md` ·
`docs/product/` · `docs/decisions/` · **ADR-0014 (`aceito` — semântica do ledger as-accepted, #67)** ·
**#43 (projetada no `feature-ledger.json`)** · **ADR-0015 (`proposto` — allowlist `docs/examples/`, #71)** ·
`CHANGELOG.md`
