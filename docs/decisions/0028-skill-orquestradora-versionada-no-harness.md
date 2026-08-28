# ADR-0028 — Skill orquestradora versionada no harness (fonte no repo; install = build)

> Architecture Decision Record (`AGENTS.md` §3, gate G2). ADRs são **append-only**: uma decisão
> revista não é apagada — cria-se um novo ADR que a substitui.
>
> **Ao criar um ADR — ou mudar seu número/título/status/nome —, regenere o índice** e commite o
> `README.md`: `node --experimental-strip-types tools/adr/adr-index.ts --write`
> ([ADR-0023](0023-indice-gerado-de-adrs.md)).

- **Status:** proposto
- **Data:** 2026-08-27
- **Decisores:** Isa (owner) — aguarda aprovação humana no gate **G2**
- **Relacionado a:** épico **O9** (fim do Markdown autoral como fonte / reduzir espelhos); pendência
  registrada no `STATE.md` (handoff da skill dizia "aterrissar estado" contra o roteamento do §4);
  [ADR-0019](0019-nucleo-l0-condensado.md)/[ADR-0023](0023-indice-gerado-de-adrs.md) (padrão
  visão-derivada + guard + fonte única); [ADR-0024](0024-estado-enxuto-roteamento-historia-status.md)/[ADR-0025](0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)
  (roteamento do STATE — a fonte canônica para a qual a skill deve **apontar**, não reafirmar); a rede
  `state-budget-check` (T8.1b, #127) que agora **verifica** o STATE como ponteiro.

## Contexto

A skill **`orion-orchestrator`** conduz o fluxo Spec-Driven do Orion a partir do Cowork (prepara Issues
SDD, ADRs, handoffs, respeitando G0–G3 e T0–T4). Hoje ela existe **apenas como install local** do Claude
(`~/Library/.../skills-plugin/.../skills/orion-orchestrator/`), **fora do git**. Isso reproduz — na própria
ferramenta que orquestra o harness — a **classe de defeito que o épico O8/O9 combate**:

- **Drift silencioso com a constituição.** O template de handoff instruía "**aterrissar** o estado no
  `STATE.md`", enquanto o `AGENTS.md` §4 ([ADR-0024](0024-estado-enxuto-roteamento-historia-status.md)/[ADR-0025](0025-modelo-alvo-plano-historia-compactacao-ponteiros.md))
  manda **rotear** (história→PR mergeado, status→Issue/ledger) e **só atualizar o ponteiro** — sem anexar
  narrativa. Sem fonte versionada, essa divergência não é pega por review nem CI.
- **Sem governança de mudança.** Alterações na skill não passam por PR, gate, nem histórico; não há revisão
  independente (ADR-0008) nem rastreabilidade.
- **Não reproduzível.** O Orion é um **template repository**; quem clona não recebe a orquestradora, e não
  há como reconstruí-la de uma fonte canônica.

A cura que o Orion **já aplica** a artefatos-índice/núcleo é **fonte única + visão-derivada + guard**
([ADR-0019](0019-nucleo-l0-condensado.md)/[ADR-0023](0023-indice-gerado-de-adrs.md)) e **reduzir espelhos**
(O9). A skill deve entrar nesse mesmo regime.

## Decisão

Adotaremos a **skill orquestradora como artefato versionado do harness**.

1. **Fonte no repo.** A fonte da skill vive em **`skills/orion-orchestrator/`** (`SKILL.md` + `reference/`
   + `templates/`) e **evolui via SDD/PR** sob os mesmos gates G0–G3 (mudança estrutural = ADR/G2; conteúdo
   = Issue/G1; merge humano T3/G3).
2. **Install = artefato de build.** Um **passo de empacotamento reproduzível** gera o pacote instalável a
   partir da fonte; a **cópia local** (em `~/Library/.../skills-plugin/…`) passa a ser **derivada**, não
   canônica. O mecanismo exato (script dedicado vs. fluxo `skill-creator`) é **detalhe de implementação da
   Issue**, desde que reproduzível e documentado.
3. **Ponteiro, não espelho (O9).** A skill **aponta** para a fonte canônica (`AGENTS.md` §4, ADRs) nas
   regras transversais (roteamento do STATE, gates, modelo de confiança) em vez de **reafirmá-las por
   extenso**; retém apenas o **gist operacional inevitável** (templates/checklists que ela executa). Ela
   **defere ao `AGENTS.md` vigente** em qualquer conflito — nunca é fonte paralela.
4. **Classificação no manifesto.** A fonte da skill entra na **cobertura do manifesto (T9.2)** na fatia de
   implementação; o **papel exato por par (arquivo, regra)** — prosa-viva sob `scanDirs` do guard de
   coerência vs. fora-de-domínio (como código/config) — é **decidido na Issue**, não pré-fixado aqui.

Este ADR **decide o modelo e autoriza a fatia de implementação**; **não** implementa nada (nenhum arquivo
em `skills/` é criado antes deste ADR `aceito` no G2).

## Alternativas consideradas

- **(A) Repositório dedicado só para a skill.** Rejeitada: adiciona outro repo/CI/release e **desacopla** a
  skill da constituição que ela serve (a skill precisaria referenciar o `AGENTS.md` de fora, reabrindo o
  drift). O acoplamento à constituição é **feature**, não bug — versionar junto mantém os dois em passo.
- **(B) Manter local-only + corrigir a cópia instalada.** Rejeitada como solução: conserta o sintoma
  (uma frase) sem a **fonte versionada + review + reprodutibilidade**; o install volta a divergir na próxima
  edição manual.
- **(C) Versionar só o `SKILL.md`, sem passo de build.** Rejeitada: sem empacotamento reproduzível, a
  ligação fonte→install fica manual e **volta a divergir**; metade da cura (fonte) sem a outra (derivação
  verificável).

## Consequências

- **Positivas.** Uma **fonte única governada** para a orquestradora; drift pego no **review/CI** (não
  spot-a-spot); **reproduzível** para adotantes do template; alinhado ao O9 (ponteiro > espelho) e ao padrão
  visão-derivada + guard. A pendência do `STATE.md` ("aterrissar" → "rotear") passa a ser corrigida **na
  fonte**, não numa cópia efêmera.
- **Negativas / riscos + mitigação.** O harness ganha um **build step de skill** e **uma superfície nova a
  manter** → mitigação: packaging simples e documentado, sob os gates normais. A **cópia local** precisa ser
  **reinstalada da fonte** após mudanças → documentar o ciclo fonte→build→install no `getting-started`.
- **Segurança/confiança/observabilidade.** Mudança na skill vira **T2→G2/G1** com merge humano (T3/G3);
  nada de commit autônomo. A skill continua **deferindo ao `AGENTS.md`** — não pode decidir governança
  sozinha nem bypassar gates.

## Conformidade

Como verificar no review/CI que a implementação respeita esta decisão (§8.1):

- **Nenhum arquivo em `skills/`** é criado antes deste ADR `aceito` (G2 humano).
- A fonte existe em `skills/orion-orchestrator/` e a skill **aponta** para `§4`/ADR-0024-0025 no roteamento
  do STATE (sem reafirmar a regra por extenso); **nenhum resíduo** de "aterrissar estado" — a orientação é
  **rotear + atualizar só o ponteiro**, citando a rede `state-budget-check` como verificação.
- Existe um **passo de empacotamento reproduzível** documentado (fonte → install), e a cópia local é
  descrita como **derivada**.
- A fonte da skill está **classificada no manifesto (T9.2)** e o **guard de coerência** roda sobre ela
  conforme o papel decidido na Issue.
- A skill **não** trata `PLAN.md`/`CHANGELOG.md`/`STATE.md` como fonte narrativa e **defere ao `AGENTS.md`
  vigente** — sem fonte paralela.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho do antigo. -->
