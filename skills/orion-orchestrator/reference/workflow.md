# Workflow, gates e numeração

## Gates (AGENTS.md §3)
- **G0 Contexto** — antes de planejar (Spec/Product Context suficientes).
- **G1 Plano/Issue** — antes de virar Issues; antes de implementar.
- **G2 Decisão** — escolha estrutural/stack/processo/segurança → **ADR** aprovado.
- **G3 Merge** — todo PR exige CI verde + aprovação humana.

## Modelo de confiança (§11)
- **T0** leitura sem efeito → automático.
- **T1** efeito reversível baixo (branch, arquivo, PR) → automático + auditoria.
- **T2** médio/fluxo/dado sensível → automático **com review**; humano se cruzar G1/G2.
- **T3** irreversível/alto risco (merge `main`, deploy, credenciais, exclusão) → **nunca
  automatizado**; G3 obrigatório.
- **T4** proibido (exfiltração, burlar controles, fora de escopo) → recusar e escalar.
Na dúvida sobre a classe, **suba de nível**.

## Numeração de ADR
- Número = **próximo livre** em `docs/decisions/` na `main` commitada.
- Confirme o estado mergeado antes de fixar (PRs em review ainda não contam).
- Números de pacotes conceituais (ex.: `orion-evolution-proposal/`) **não** reservam slot até
  serem commitados.
- Append-only: nunca reusar/renumerar um ADR commitado; supersede via ADR novo + nota no antigo.

## Artefatos & locais
- Handoff/refs do Cowork → `.orion/tmp/` (gitignored, scratch).
- Final → caminhos rastreados (`docs/decisions/`, raiz, `.github/…`), populados pelo Claude Code
  via PR.
