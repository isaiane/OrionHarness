# STATE — Índice de Estado

> **Camada L1 (índice leve)** (`AGENTS.md` §4). Ponteiro de orientação rápida: o agente lê isto
> ao iniciar uma sessão para saber **onde estamos e qual o próximo passo**. **Não duplica**
> conteúdo — o detalhe vive nas Issues SDD e nos artefatos linkados. Atualize ao concluir cada
> tarefa/fase.

## Agora

- **Fase do pipeline:** **sem épico ativo**. O1/O2/O3/O4 concluídos; **#49** (consolidação de
  coerência, fora de épico) entregue e **aguardando G2 (flip do ADR-0012) + merge**. Depois, o próximo
  passo é **replanejar** (volta ao _Plan_/G1).
- **Última conclusão:** #49 (PR **#68**) · **consolidação da stack em Node/TS** (coerência — cumpre o ADR-0005):
  `.github/workflows/ci.yml` deixa de detectar stack (só Node/TS; os 4 jobs e o tooling Python do
  `pre-commit` preservados — não altera o gate G3); `README.md` sem "Universal e poliglota" como
  capacidade atual; `presets/` só com `typescript/` (`python/`/`mobile/` removidos → templates
  futuros); `getting-started.md`/`testing-strategy.md` alinhados. Decisão em
  [ADR-0012](docs/decisions/0012-consolidacao-stack-node-ts.md) (**proposto** — humano flipa no G2).
  **Sem superfície de usuário** → e2e formal dispensada (ADR-0009); evidência = CI verde no PR +
  `grep poligl` sem afirmação órfã.
- **Antes:** **#65** (reprojeção do #53 no ledger + higiene do STATE — PR #66); **#53/T4.3**
  (observabilidade de custo/tokens, **fecha a O4** — PR #63); **#52/T4.2** (tool-guard, ADR-0011);
  **#51/T4.1** (e2e, ADR-0009 — abriu a O4).
- **Governança recente:** **ADR-0012** (consolidação Node/TS) **proposto — aguardando G2**; ADR-0009
  (e2e), ADR-0010 (re-review) e ADR-0011 (hook de guarda) **aceitos** (G2).
- **Regra de foco:** **uma** tarefa ativa por vez; nenhuma nova Issue antes desta verde e mergeada.

## Próximo passo

**Replanejar (volta ao _Plan_/G1)** — após o merge do #49 não há tarefa ativa. Escolher, **com o
humano (G1)**, o próximo work item entre os follow-ups **abertos** rastreados: **#62** (validar alvo
de leitura no tool-guard — achado P2 do Codex no #61; inclui a allowlist de `docs/examples/` para
exemplos rodáveis, achado na revisão da T4.3); **#67** (semântica do ledger *as-accepted × as-current*
+ projetar a #43 sem staleness — provável ADR/G2). Não abrir nova tarefa sem G1 — só apontar.

## Riscos / pendências em aberto

- Confirmar a licença (atual: MIT) ao adotar em contexto organizacional.
- **Perfil de proteção = Solo:** o enforcement do "humano aprova" no merge é procedural (ADR-0003);
  migrar para o perfil Time (`approvals ≥ 1` + `CODEOWNERS`) quando houver 2+ mantenedores.
- **`.github/labels.yml`** ainda tem labels de stack multi-linguagem (comentário "projetos
  poliglotas", linha ~52) — **fora do escopo do #49** (não é afirmação de capacidade atual do harness);
  reavaliar se as labels `stack:*` fazem sentido sob a leitura única Node/TS (candidato a follow-up).

## Ponteiros

`PLAN.md` · **#53 (T4.3, concluída — fecha a O4)** · `docs/observability.md` · `docs/examples/observability-cost-log.ts` · #52 (T4.2, `tools/guard/`) · ADR-0011 (`aceito`) · #62 (follow-up tool-guard) · #55 · ADR-0010 (`aceito`) · #51 (T4.1/O4) · ADR-0009 (`aceito`) · #57 (reconciliação) ·
`docs/examples/e2e-init-check.sh` ·
`docs/agent-reviewer-checklist.md` · `AGENTS.md` §8.1/§12 · #33 (T2.4/O2) ·
`docs/getting-started.md` §7 (ritual get-bearings) · `init.sh` · ADR-0007 · ADR-0008 · `MEMORY.md` ·
`docs/product/` · `docs/decisions/` · `CHANGELOG.md`
