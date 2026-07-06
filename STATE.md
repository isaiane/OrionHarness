# STATE — Índice de Estado

> **Camada L1 (índice leve)** (`AGENTS.md` §4). Ponteiro de orientação rápida: o agente lê isto
> ao iniciar uma sessão para saber **onde estamos e qual o próximo passo**. **Não duplica**
> conteúdo — o detalhe vive nas Issues SDD e nos artefatos linkados. Atualize ao concluir cada
> tarefa/fase.

## Agora

- **Fase do pipeline:** **entre tarefas na O4** — **sem tarefa ativa**. O1/O2/O3 concluídos; na O4,
  **T4.1 concluída**. Próxima: **T4.2 (#52)**.
- **Última conclusão:** #55 · **convenção de re-review do Codex**
  ([ADR-0010](docs/decisions/0010-re-review-automatizado-apos-fix.md), **aceito**): `@codex review`
  após aplicar fix; `CONTRIBUTING.md` §6 + checklists (Product §7, Harness §10, roteada em toda rota).
  Mergeada no #56. Antes: **#57** (reconciliação pós-#54) e **#51/T4.1** (convenção e2e, ADR-0009 —
  abre a O4).
- **Épico O4 — próximas:** **T4.2** (#52, hook de sandbox/allowlist de referência — action system,
  T0–T4) e **T4.3** (#53, observabilidade de custo/tokens), em `planejado`. A T4.2 precisa de
  **ADR-0011** (segurança) + **G2**, e roda **as duas linhas de review** (introduz código de produto:
  `tools/guard/`).
- **Governança recente aceita:** ADR-0009 (verificação e2e) e ADR-0010 (re-review do Codex).
- **Regra de foco:** **uma** tarefa ativa por vez; nenhuma nova Issue antes desta verde e mergeada.

## Próximo passo

**Iniciar a T4.2 (#52)** — hook de sandbox/allowlist de referência. Sequência prevista: rascunhar o
**ADR-0011** (registra o hook como implementação de referência do action system §10/§11 + T0–T4) →
**G2** → implementar `tools/guard/tool-guard.ts` (allowlist + fail-safe block + validadores) **com
testes vitest** (TDD) + plug no `scripts/smoke-test.sh` → **e2e** (ADR-0009, contrato CLI) → **ambas as
revisões** (Harness p/ ADR+convenção; Product p/ o hook). Alternativas rastreadas, se repriorizar:
**#45** (fix `extractAcceptance`), **#47** (triagem de não-rastreados), **#49** (poliglota × ADR-0005).

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

`PLAN.md` · **#52 (T4.2, próxima)** · #55 · ADR-0010 (`aceito`) · #51 (T4.1/O4) · ADR-0009 (`aceito`) · #57 (reconciliação) ·
`docs/examples/e2e-init-check.sh` ·
`docs/agent-reviewer-checklist.md` · `AGENTS.md` §8.1/§12 · #33 (T2.4/O2) ·
`docs/getting-started.md` §7 (ritual get-bearings) · `init.sh` · ADR-0007 · ADR-0008 · `MEMORY.md` ·
`docs/product/` · `docs/decisions/` · `CHANGELOG.md`
