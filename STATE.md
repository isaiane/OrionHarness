# STATE — Índice de Estado

> **Camada L1 (índice leve)** (`AGENTS.md` §4). Ponteiro de orientação rápida: o agente lê isto
> ao iniciar uma sessão para saber **onde estamos e qual o próximo passo**. **Não duplica**
> conteúdo — o detalhe vive nas Issues SDD e nos artefatos linkados. Atualize ao concluir cada
> tarefa/fase.

## Agora

- **Fase do pipeline:** **entre tarefas na O4** — **sem tarefa ativa**. O1/O2/O3 concluídos; na O4,
  **T4.1 e T4.2 concluídas**. Próxima: **T4.3 (#53)**.
- **Última conclusão:** #52 · **hook de sandbox/allowlist de referência** (T4.2): `tool-guard.ts`
  materializa o **action system** e o **modelo T0–T4** (`AGENTS.md` §10/§11) — allowlist explícita,
  **fail-safe block** (default-deny; nega o não-parseável), proibidos (T4) e validadores de comandos
  sensíveis (T3); **testes vitest (7)** + plug comportamental no `scripts/smoke-test.sh`. Decisão em
  [ADR-0011](docs/decisions/0011-hook-sandbox-allowlist-referencia.md) (**proposto** — aguarda **G2**;
  vira `aceito` **antes** do merge). Antes: **#55** (re-review do Codex, ADR-0010) e **#51/T4.1**
  (convenção e2e, ADR-0009 — abre a O4).
- **Épico O4 — próxima:** **T4.3** (#53, observabilidade de custo/tokens), em `planejado`.
- **Governança recente:** ADR-0009 (e2e) e ADR-0010 (re-review) **aceitos**; **ADR-0011** (hook de
  guarda) **proposto** — **G2 pendente**.
- **Regra de foco:** **uma** tarefa ativa por vez; nenhuma nova Issue antes desta verde e mergeada.

## Próximo passo

**Iniciar a T4.3 (#53)** — observabilidade de custo/tokens. Antes de retomar: garantir que a **T4.2
(#52)** fechou (PR mergeado por humano no G3) e que o **ADR-0011 foi flipado para `aceito`** no G2.
Alternativas rastreadas, se repriorizar: **#45** (fix `extractAcceptance`), **#47** (triagem de
não-rastreados), **#49** (poliglota × ADR-0005), **#62** (validar alvo de leitura no tool-guard —
achado P2 do Codex no #61).

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

`PLAN.md` · **#53 (T4.3, próxima)** · #52 (T4.2, `tools/guard/`) · ADR-0011 (`proposto`) · #55 · ADR-0010 (`aceito`) · #51 (T4.1/O4) · ADR-0009 (`aceito`) · #57 (reconciliação) ·
`docs/examples/e2e-init-check.sh` ·
`docs/agent-reviewer-checklist.md` · `AGENTS.md` §8.1/§12 · #33 (T2.4/O2) ·
`docs/getting-started.md` §7 (ritual get-bearings) · `init.sh` · ADR-0007 · ADR-0008 · `MEMORY.md` ·
`docs/product/` · `docs/decisions/` · `CHANGELOG.md`
