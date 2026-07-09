# STATE — Índice de Estado

> **Camada L1 (índice leve)** (`AGENTS.md` §4). Ponteiro de orientação rápida: o agente lê isto
> ao iniciar uma sessão para saber **onde estamos e qual o próximo passo**. **Não duplica**
> conteúdo — o detalhe vive nas Issues SDD e nos artefatos linkados. Atualize ao concluir cada
> tarefa/fase.

## Agora

- **Fase do pipeline:** **épico O4 concluído** — **sem tarefa ativa**. O1/O2/O3/O4 concluídos. O
  próximo passo é **replanejar** (volta ao _Plan_/G1).
- **Última conclusão:** #53 (PR **#63**) · **observabilidade de custo/tokens** (T4.3, **fecha a O4**): convenção
  base do sinal `agent.execution.cost` em [`docs/observability.md`](docs/observability.md) — objeto
  `cost` (`cost.model`/`cost.tokens_input`/`cost.tokens_output`/`cost.tokens_total`/`cost.usd`) por
  execução, correlacionado por `correlation_id`, **sem PII/segredos** (§10); `cost.usd` marcado como
  **ESTIMADO** (tokens são fato); **preset opt-in por stack** (operacionaliza o §9 **sem tocar** sua
  política — **sem ADR/G2** por design). Exemplo rodável
  [`docs/examples/observability-cost-log.ts`](docs/examples/observability-cost-log.ts). Ledger
  projeta a #53 (5 critérios, `passes:false`). **Sem superfície de usuário** → e2e formal dispensada
  (ADR-0009); evidência = o exemplo rodável.
- **Antes:** **#52/T4.2** (hook de guarda `tool-guard`, ADR-0011) e **#51/T4.1** (convenção e2e,
  ADR-0009 — abriu a O4).
- **Governança recente:** ADR-0009 (e2e), ADR-0010 (re-review) e **ADR-0011** (hook de guarda)
  **aceitos** (G2).
- **Regra de foco:** **uma** tarefa ativa por vez; nenhuma nova Issue antes desta verde e mergeada.

## Próximo passo

**Replanejar (volta ao _Plan_/G1)** — a O4 fechou e não há tarefa ativa. Escolher, **com o humano
(G1)**, o próximo work item entre os follow-ups **abertos** rastreados: **#45** (fix
`extractAcceptance` — trunca critérios multi-linha, visível na projeção da #53 no ledger), **#49**
(poliglota × ADR-0005), **#62** (validar alvo de leitura no tool-guard — achado P2 do Codex no #61).
Não abrir nova tarefa sem G1 — só apontar.

## Riscos / pendências em aberto

- Confirmar a licença (atual: MIT) ao adotar em contexto organizacional.
- **Perfil de proteção = Solo:** o enforcement do "humano aprova" no merge é procedural (ADR-0003);
  migrar para o perfil Time (`approvals ≥ 1` + `CODEOWNERS`) quando houver 2+ mantenedores.
- **Projeção da #43 no ledger diferida (rastreada):** o `extractAcceptance` trunca bullets
  multi-linha (achado do review do #44); o fix é tooling → PR próprio com **Product Review**,
  rastreado na **Issue #45** (contexto completo na própria Issue). A #43 entra no ledger quando o
  gerador estiver correto (convenção do CONTRIBUTING, exceção "gerador com bug"). _Nota: #46 é
  duplicata da #45 — fechar._
- **Poliglota × ADR-0005:** `ci.yml`/`README`/`presets` ainda poliglotas, em desacordo com o
  ADR-0005 ("CI numa só linguagem"); decisão G2/ADR rastreada na **Issue #49**.

## Ponteiros

`PLAN.md` · **#53 (T4.3, concluída — fecha a O4)** · `docs/observability.md` · `docs/examples/observability-cost-log.ts` · #52 (T4.2, `tools/guard/`) · ADR-0011 (`aceito`) · #62 (follow-up tool-guard) · #55 · ADR-0010 (`aceito`) · #51 (T4.1/O4) · ADR-0009 (`aceito`) · #57 (reconciliação) ·
`docs/examples/e2e-init-check.sh` ·
`docs/agent-reviewer-checklist.md` · `AGENTS.md` §8.1/§12 · #33 (T2.4/O2) ·
`docs/getting-started.md` §7 (ritual get-bearings) · `init.sh` · ADR-0007 · ADR-0008 · `MEMORY.md` ·
`docs/product/` · `docs/decisions/` · `CHANGELOG.md`
