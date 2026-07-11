# STATE — Índice de Estado

> **Camada L1 (índice leve)** (`AGENTS.md` §4). Ponteiro de orientação rápida: o agente lê isto
> ao iniciar uma sessão para saber **onde estamos e qual o próximo passo**. **Não duplica**
> conteúdo — o detalhe vive nas Issues SDD e nos artefatos linkados. Atualize ao concluir cada
> tarefa/fase.

## Agora

- **Fase do pipeline:** **épico O4 concluído** — **sem tarefa ativa**. O1/O2/O3/O4 concluídos. O
  próximo passo é **replanejar** (volta ao _Plan_/G1).
- **Última conclusão:** #65 (PR **#66**) · **reprojeção do #53 no ledger + higiene do STATE**
  (memória/estado): com o gerador corrigido (#45, PR #64 mergeada), gravou a projeção antes
  **diferida** do #53 no `feature-ledger.json` — critérios **completos**, `passes:false` (append-only) —
  cumprindo a exceção "gerador com bug" do `CONTRIBUTING.md`. **A #43 foi retirada do escopo**: sua
  projeção codifica texto **stale** vs. os artefatos atuais (achado do Codex) — roteada para a **#67**
  (decisão de semântica do ledger *as-accepted × as-current*, provável ADR/G2). **Sem superfície de
  usuário** → e2e formal dispensada (ADR-0009); evidência = releitura do ledger + `ledger-guard` verde.
- **Antes:** **#53/T4.3** (observabilidade de custo/tokens — evento `agent.execution.cost`, objeto
  `cost`, `usd` ESTIMADO, preset opt-in; [`docs/observability.md`](docs/observability.md) + exemplo
  rodável; **fecha a O4** — PR #63); **#52/T4.2** (hook de guarda `tool-guard`, ADR-0011); **#51/T4.1**
  (convenção e2e, ADR-0009 — abriu a O4).
- **Governança recente:** ADR-0009 (e2e), ADR-0010 (re-review) e **ADR-0011** (hook de guarda)
  **aceitos** (G2).
- **Regra de foco:** **uma** tarefa ativa por vez; nenhuma nova Issue antes desta verde e mergeada.

## Próximo passo

**Replanejar (volta ao _Plan_/G1)** — a O4 fechou e não há tarefa ativa. Escolher, **com o humano
(G1)**, o próximo work item entre os follow-ups **abertos** rastreados: **#49** (poliglota ×
ADR-0005); **#62** (validar alvo de leitura no tool-guard — achado P2 do Codex no #61; inclui a
allowlist de `docs/examples/` para exemplos rodáveis, achado na revisão da T4.3); **#67** (semântica
do ledger *as-accepted × as-current* + projetar a #43 sem staleness — provável ADR/G2). Não abrir nova
tarefa sem G1 — só apontar.

## Riscos / pendências em aberto

- Confirmar a licença (atual: MIT) ao adotar em contexto organizacional.
- **Perfil de proteção = Solo:** o enforcement do "humano aprova" no merge é procedural (ADR-0003);
  migrar para o perfil Time (`approvals ≥ 1` + `CODEOWNERS`) quando houver 2+ mantenedores.
- **Poliglota × ADR-0005:** `ci.yml`/`README`/`presets` ainda poliglotas, em desacordo com o
  ADR-0005 ("CI numa só linguagem"); decisão G2/ADR rastreada na **Issue #49**.

## Ponteiros

`PLAN.md` · **#53 (T4.3, concluída — fecha a O4)** · `docs/observability.md` · `docs/examples/observability-cost-log.ts` · #52 (T4.2, `tools/guard/`) · ADR-0011 (`aceito`) · #62 (follow-up tool-guard) · #55 · ADR-0010 (`aceito`) · #51 (T4.1/O4) · ADR-0009 (`aceito`) · #57 (reconciliação) ·
`docs/examples/e2e-init-check.sh` ·
`docs/agent-reviewer-checklist.md` · `AGENTS.md` §8.1/§12 · #33 (T2.4/O2) ·
`docs/getting-started.md` §7 (ritual get-bearings) · `init.sh` · ADR-0007 · ADR-0008 · `MEMORY.md` ·
`docs/product/` · `docs/decisions/` · `CHANGELOG.md`
