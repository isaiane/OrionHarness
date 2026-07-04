# STATE — Índice de Estado

> **Camada L1 (índice leve)** (`AGENTS.md` §4). Ponteiro de orientação rápida: o agente lê isto
> ao iniciar uma sessão para saber **onde estamos e qual o próximo passo**. **Não duplica**
> conteúdo — o detalhe vive nas Issues SDD e nos artefatos linkados. Atualize ao concluir cada
> tarefa/fase.

## Agora

- **Fase do pipeline:** Build — épico **O2** (núcleo runnable); T2.0–T2.3 concluídas, **T2.4 a iniciar**.
- **Épico ativo:** O2 — Núcleo runnable (`PLAN.md`). O1 e O3 concluídos.
- **Última conclusão:** #32 · T2.3 · **`init.sh`** (template + convenção) — stub poliglota do bootstrap
  na raiz (`--check` = dry-run seguro, exit 0; arg inválido = 2), implementação concreta do
  Initializer (ADR-0007); convenção dos **dois smokes** (produto vs. harness) em
  `docs/getting-started.md`; ledger projeta a #32.
- **Regra de foco:** **uma** tarefa ativa por vez; nenhuma nova Issue antes desta verde e mergeada.

## Próximo passo

**T2.4 — ritual get-bearings + regressão por sessão (#33)**: ritual de início de sessão que reforça
a checagem do ledger e a regressão (fora de escopo da T2.3).

## Riscos / pendências em aberto

- Confirmar a licença (atual: MIT) ao adotar em contexto organizacional.
- **Perfil de proteção = Solo:** o enforcement do "humano aprova" no merge é procedural (ADR-0003);
  migrar para o perfil Time (`approvals ≥ 1` + `CODEOWNERS`) quando houver 2+ mantenedores.
- **Projeção da #43 no ledger diferida (rastreada):** o `extractAcceptance` trunca bullets
  multi-linha (achado do review do #44); o fix é tooling → PR próprio com **Product Review**,
  rastreado na **Issue #45** (contexto completo na própria Issue). A #43 entra no ledger quando o
  gerador estiver correto (convenção do CONTRIBUTING, exceção "gerador com bug"). _Nota: #46 é
  duplicata da #45 — fechar._

## Ponteiros

`PLAN.md` · #32 (T2.3/O2) · `init.sh` · ADR-0007 · ADR-0008 · `MEMORY.md` · `AGENTS.md` ·
`docs/getting-started.md` · `docs/product/` · `docs/decisions/` · `CHANGELOG.md`
