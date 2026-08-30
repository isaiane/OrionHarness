# Workflow, gates e numeração

## Gates (AGENTS.md §3)
- **G0 Contexto** — antes de planejar (Spec/Product Context suficientes).
- **G1 Plano/Issue** — antes de virar Issues; antes de implementar.
- **G2 Decisão** — escolha estrutural/stack/processo/segurança → **ADR** aprovado.
- **G3 Merge** — todo PR exige CI verde + aprovação humana.

## Modelo de confiança (§11) — ponteiro
As classes **T0–T4** e seus limites são a fonte no **`AGENTS.md` §11** (resolvido na raiz do repo **ATIVO**
em runtime, não neste pacote instalado). **Não** reafirme as classes aqui — consulte o §11; em conflito,
**defira ao `AGENTS.md` vigente**. Procedimento específico da skill: ela opera em **T2** (propõe
Issues/ADRs/handoff), e todo efeito **T3** (merge em `main`, deploy, credenciais, exclusão) é **humano**
(G3) — nunca automatizado. Na dúvida sobre a classe, **suba de nível** e deixe ao humano.

## Numeração de ADR
- Número = **próximo livre** em `docs/decisions/` na `main` commitada.
- Confirme o estado mergeado antes de fixar (PRs em review ainda não contam).
- Números de pacotes conceituais (ex.: `orion-evolution-proposal/`) **não** reservam slot até
  serem commitados.
- Append-only: nunca reusar/renumerar um ADR commitado; supersede via ADR novo + nota no antigo.

## Artefatos & locais
- Refs/rascunhos **temporários** do Cowork (não-handoff) → `.orion/tmp/` (gitignored, scratch).
- **O handoff/andaime NÃO é arquivo** — persiste como **comentário na Issue** (ver `SKILL.md` /
  `templates/andaime.md`); não roteie handoff para `.orion/tmp/` (scratch gitignored envelhece sem review).
- Final → caminhos rastreados (`docs/decisions/`, raiz, `.github/…`), populados pelo Claude Code
  via PR.
