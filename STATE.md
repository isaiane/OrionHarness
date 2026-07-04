# STATE — Índice de Estado

> **Camada L1 (índice leve)** (`AGENTS.md` §4). Ponteiro de orientação rápida: o agente lê isto
> ao iniciar uma sessão para saber **onde estamos e qual o próximo passo**. **Não duplica**
> conteúdo — o detalhe vive nas Issues SDD e nos artefatos linkados. Atualize ao concluir cada
> tarefa/fase.

## Agora

- **Fase do pipeline:** **entre ciclos** — **O2 concluída** (núcleo runnable). **O1/O2/O3 todos
  concluídos**; sem tarefa ativa.
- **Épico ativo:** nenhum — o próximo ciclo começa por um novo **Plan** (G1). (`PLAN.md`)
- **Última conclusão:** #33 · T2.4 · **ritual get-bearings + regressão por sessão** — documentado em
  `docs/getting-started.md` §7 (pwd/`STATE`/`PLAN`/ledger/`git log` → `init.sh --check` → **regressão
  core antes de codar**); item no `agent-reviewer-checklist.md`; ledger projeta a #33. **Fecha a O2.**
- **Regra de foco:** **uma** tarefa ativa por vez; nenhuma nova Issue antes desta verde e mergeada.

## Próximo passo

**Sem tarefa ativa.** A O2 (e O1/O3) estão concluídas — o próximo ciclo começa por um novo **Plan**
(G1) para o próximo épico. Pendências **rastreadas** aguardando priorização: **#45** (fix do
`extractAcceptance`), **#47** (triagem de arquivos não-rastreados) e **#49** (reconciliar
poliglota × ADR-0005).

## Riscos / pendências em aberto

- Confirmar a licença (atual: MIT) ao adotar em contexto organizacional.
- **Perfil de proteção = Solo:** o enforcement do "humano aprova" no merge é procedural (ADR-0003);
  migrar para o perfil Time (`approvals ≥ 1` + `CODEOWNERS`) quando houver 2+ mantenedores.
- **Projeção da #43 no ledger diferida (rastreada):** o `extractAcceptance` trunca bullets
  multi-linha (achado do review do #44); o fix é tooling → PR próprio com **Product Review**,
  rastreado na **Issue #45** (contexto completo na própria Issue). A #43 entra no ledger quando o
  gerador estiver correto (convenção do CONTRIBUTING, exceção "gerador com bug"). _Nota: #46 é
  duplicata da #45 — fechar._
- **Arquivos não-rastreados (rascunhos ADR-0003/0004 + engineering-tactics):** numeração colidente,
  proveniência indeterminada; triagem rastreada na **Issue #47** (não apagar sem confirmar).
- **Poliglota × ADR-0005:** `ci.yml`/`README`/`presets` ainda poliglotas, em desacordo com o
  ADR-0005 ("CI numa só linguagem"); decisão G2/ADR rastreada na **Issue #49**.

## Ponteiros

`PLAN.md` · #33 (T2.4/O2) · `docs/getting-started.md` §7 (ritual get-bearings) · `init.sh` ·
ADR-0007 · ADR-0008 · `MEMORY.md` · `AGENTS.md` · `docs/product/` · `docs/decisions/` · `CHANGELOG.md`
