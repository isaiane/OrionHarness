# STATE — Índice de Estado

> **Camada L1 (índice leve)** (`AGENTS.md` §4). Ponteiro de orientação rápida: o agente lê isto
> ao iniciar uma sessão para saber **onde estamos e qual o próximo passo**. **Não duplica**
> conteúdo — o detalhe vive nas Issues SDD e nos artefatos linkados. Atualize ao concluir cada
> tarefa/fase.

## Agora

- **Fase do pipeline:** **Review** — **tarefa ativa #55** (governança do re-review do Codex) pronta
  para merge. O4: **T4.1 concluída**; T4.2/T4.3 a seguir. O1/O2/O3 concluídos.
- **Tarefa ativa:** **#55** — convenção de **re-review do Codex**
  ([ADR-0010](docs/decisions/0010-re-review-automatizado-apos-fix.md), **aceito** no G2): padrão do
  projeto de pedir `@codex review` após aplicar fix; documentada no `CONTRIBUTING.md` §6 + checklists
  (Product §7, Harness §10, roteada em toda rota). **Harness Review** ok; **pronta para G3** (seu
  merge do #56). Não é tarefa da O4 (é governança paralela).
- **Última conclusão:** #57 · **reconciliação pós-#54** (ADR-0009 → `aceito`, T4.1 → `concluído`) ·
  antes, #51 · T4.1 · **convenção e2e opt-in com ferramenta real**
  ([ADR-0009](docs/decisions/0009-verificacao-e2e-ferramenta-real.md)): §8.1 por tipo (UI →
  browser/MCP; API/CLI → contrato público); caso de exemplo `docs/examples/e2e-init-check.sh`; ledger
  projeta a #51. **Abre a O4.**
- **Épico O4:** entre tarefas — próximas **T4.2** (#52, hook de sandbox/allowlist) e **T4.3** (#53,
  observabilidade de custo/tokens), em `planejado`.
- **Regra de foco:** **uma** tarefa ativa por vez; nenhuma nova Issue antes desta verde e mergeada.

## Próximo passo

**#55 (ADR-0010) pronta para merge** (este PR, G3) — governança do re-review do Codex. Depois, a O4
segue com **T4.2** (#52, hook de sandbox/allowlist) e **T4.3** (#53, observabilidade de custo/tokens).
Pendências **rastreadas** aguardando priorização: **#45** (fix do `extractAcceptance`), **#47**
(triagem de arquivos não-rastreados) e **#49** (reconciliar poliglota × ADR-0005).

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

`PLAN.md` · #55 · ADR-0010 (`aceito`) · #51 (T4.1/O4) · ADR-0009 (`aceito`) · #57 (reconciliação) ·
`docs/examples/e2e-init-check.sh` ·
`docs/agent-reviewer-checklist.md` · `AGENTS.md` §8.1/§12 · #33 (T2.4/O2) ·
`docs/getting-started.md` §7 (ritual get-bearings) · `init.sh` · ADR-0007 · ADR-0008 · `MEMORY.md` ·
`docs/product/` · `docs/decisions/` · `CHANGELOG.md`
