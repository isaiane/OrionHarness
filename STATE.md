# STATE — Índice de Estado

> **Camada L1 (índice leve)** (`AGENTS.md` §4). Ponteiro de orientação rápida: o agente lê isto
> ao iniciar uma sessão para saber **onde estamos e qual o próximo passo**. **Não duplica**
> conteúdo — o detalhe vive nas Issues SDD e nos artefatos linkados. Atualize ao concluir cada
> tarefa/fase.

## Agora

- **Fase do pipeline:** **Build/Review** — **O4 iniciada**. O1/O2/O3 concluídos.
- **Épico ativo:** **O4 — Verificação real & execução equipada** (`PLAN.md`); tarefa ativa **T4.1**
  (#51), aguardando **G2** (ADR-0009 `proposto`).
- **Última conclusão:** #33 · T2.4 · **ritual get-bearings + regressão por sessão** — documentado em
  `docs/getting-started.md` §7 (pwd/`STATE`/`PLAN`/ledger/`git log` → `init.sh --check` → **regressão
  core antes de codar**); check nos **dois** reviewer-checklists (Product + Harness §9); ledger
  projeta a #33. **Fecha a O2.**
- **Em revisão:** **T4.1** (#51) — convenção **e2e opt-in** com ferramenta real
  ([ADR-0009](docs/decisions/0009-verificacao-e2e-ferramenta-real.md), **proposto**): materializa o
  §8.1 por tipo (UI → browser/MCP; API/CLI → contrato público); amarrada ao
  `agent-reviewer-checklist.md` e ao **DoD §12**; caso de exemplo rodável
  `docs/examples/e2e-init-check.sh` (evidência anexável); ledger projeta a #51 (`passes:false`).
  **Harness Review**; **sem merge** até G2+G3.
- **Regra de foco:** **uma** tarefa ativa por vez; nenhuma nova Issue antes desta verde e mergeada.

## Próximo passo

**T4.1 (#51) em revisão** — aprovar o ADR-0009 (G2) e mergear o PR (G3). Depois seguem **T4.2** (#52,
hook de sandbox/allowlist) e **T4.3** (#53, observabilidade de custo/tokens) da O4. Pendências
**rastreadas** aguardando priorização: **#45** (fix do `extractAcceptance`), **#47** (triagem de
arquivos não-rastreados) e **#49** (reconciliar poliglota × ADR-0005).

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

`PLAN.md` · #51 (T4.1/O4) · ADR-0009 (`proposto`) · `docs/examples/e2e-init-check.sh` ·
`docs/agent-reviewer-checklist.md` · `AGENTS.md` §8.1/§12 · #33 (T2.4/O2) ·
`docs/getting-started.md` §7 (ritual get-bearings) · `init.sh` · ADR-0007 · ADR-0008 · `MEMORY.md` ·
`docs/product/` · `docs/decisions/` · `CHANGELOG.md`
