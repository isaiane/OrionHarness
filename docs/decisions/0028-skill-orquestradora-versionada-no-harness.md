# ADR-0028 — Skill orquestradora versionada no harness (fonte no repo; install = build)

> Architecture Decision Record (`AGENTS.md` §3, gate G2). ADRs são **append-only**: uma decisão
> revista não é apagada — cria-se um novo ADR que a substitui.
>
> **Ao criar um ADR — ou mudar seu número/título/status/nome —, regenere o índice** e commite o
> `README.md`: `node --experimental-strip-types tools/adr/adr-index.ts --write`
> ([ADR-0023](0023-indice-gerado-de-adrs.md)).

> **Nota (append-only) — reconciliação com a realidade do install (S2, #196; Codex).** A implementação
> (S2) confirmou que o **install é gerenciado pelo app Claude** (ele extrai o `.skill` e registra um
> `skillId` próprio); o repo **não** escreve nesse diretório. Isso **supersede** três cláusulas deste ADR
> (item 2 e Conformidade, "install = build") que a redação anterior assumiu de forma otimista:
> 1. **"build-and-install atômico"** → há **build atômico no repo** (empacota só `git ls-files`, sem
>    untracked/symlink; selo gravado só após o build), mas **não há passo de install automatizado**: o
>    **import** do `.skill` é **ação do usuário no app**.
> 2. **"check fail-closed se o _install_ estiver defasado"** → leia-se **"check fonte↔build"**: o CI compara
>    o hash da fonte RASTREADA com o selo committado; a **cópia instalada** (app-managed) é refrescada
>    **reimportando** o `.skill` reconstruído.
> 3. **"empacotamento reproduzível"** → reproduzível no sentido de **conteúdo determinístico**: o **selo
>    (hash da fonte)** é a **identidade reproduzível**. O `.skill` (ZIP) **não é committado** (scratch
>    gitignored), então a variação de **mtime** do arquivo é **irrelevante** — não é requisito de
>    byte-reproducibility do ZIP.
>
> **Todo o resto da decisão permanece** (fonte versionada; ponteiro > espelho; guard varre a prosa na S3).
> Autorizado pelo owner no **merge do #196** (a decisão de versionar/build não muda; corrige-se só a
> premissa do install, descoberta na implementação).

- **Status:** aceito  <!-- G2 aprovado em 2026-08-28 (PR #192) -->
- **Data:** 2026-08-27 (proposto) · 2026-08-28 (aceito no G2)
- **Decisores:** Isa (owner) — aprovação humana (gate **G2**)
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
2. **Install = artefato de build, com frescor verificável.** Um **passo de empacotamento reproduzível**
   gera o pacote instalável a partir da fonte, via **build-and-install atômico**; a **cópia local** (em
   `~/Library/.../skills-plugin/…`) passa a ser **derivada**, não canônica. Como packaging reproduzível
   **sozinho não elimina** o drift fonte↔install (a fonte muda, ninguém reinstala, o agente roda a cópia
   **stale** com CI verde), o build grava um **selo de frescor** (hash/versão da fonte) e há um **check que
   falha fechado** — sinaliza antes do uso se o install estiver defasado vs. a fonte no repo ativo. O
   mecanismo exato (script dedicado vs. fluxo `skill-creator`) é **detalhe de implementação da Issue**,
   desde que reproduzível, atômico e com o check de frescor.
3. **Ponteiro, não espelho (O9), resolvido no repo ATIVO.** A skill **aponta** para a fonte canônica
   (`AGENTS.md` §4, ADRs) nas regras transversais (roteamento do STATE, gates, modelo de confiança) em vez
   de **reafirmá-las por extenso**; retém apenas o **gist operacional inevitável** (templates/checklists que
   ela executa). Os ponteiros resolvem contra a **raiz do repositório ATIVO em runtime** (não o pacote
   instalado em `~/Library/…`) e **falham fechado** se a constituição não for encontrada — um ponteiro que
   resolve para o pacote instalado é **bug**. Ela **defere ao `AGENTS.md` vigente** em qualquer conflito —
   nunca é fonte paralela.
4. **A prosa-viva da skill é VARRIDA pelo guard (não opcional).** A prosa transversal da skill (`SKILL.md`,
   `reference/`, templates que reafirmam regra) **entra nos `scanDirs`/cobertura do manifesto (T9.2)** e é
   varrida pelo **guard de coerência** — **não** pode ser classificada como "fora-de-domínio" (senão o
   próprio drift que motiva este ADR passaria no CI). Além disso, um **padrão/teste de regressão** reprova a
   instrução stale **"aterrissar estado"** (a forma exata do drift). Assim o modelo é **guard-backed de
   fato**, não só no review.
5. **Fatiamento (guardrail §7).** A implementação **excede 3–4 arquivos** (fonte + packaging + manifesto +
   `getting-started`), então é **sub-fatiada em ordem**: **S1** — fonte em `skills/` + fix de roteamento
   ("aterrissar"→"rotear" + ref ao `state-budget-check`); **S2** — packaging (build/install atômico + selo e
   check de frescor) + docs do ciclo fonte→build→install; **S3** — classificação no manifesto + varredura do
   guard sobre a prosa da skill + teste de regressão. Cada sub-fatia respeita o guardrail ou **registra a
   exceção _vertical slice_ (§7) no G1** — nunca sprawl silencioso.

Este ADR **decide o modelo e autoriza as sub-fatias S1–S3**; **não** implementa nada (nenhum arquivo
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
- **Segurança/confiança/observabilidade.** O gate segue a natureza da mudança: **edição de conteúdo**
  (redação, template, correção) é **G1** (Issue); só mudança **estrutural/processo/stack/segurança** exige
  **G2** (ADR) — não se cria ADR para editar uma frase. Em qualquer via, **merge humano (T3/G3)**, sem
  commit autônomo. A skill continua **deferindo ao `AGENTS.md`** — não pode decidir governança sozinha nem
  bypassar gates.

## Conformidade

Como verificar no review/CI que a implementação respeita esta decisão (§8.1):

- **Nenhum arquivo em `skills/`** é criado antes deste ADR `aceito` (G2 humano); a implementação segue as
  **sub-fatias S1–S3** (cada uma no guardrail §7 ou com exceção _vertical slice_ registrada no G1).
- A fonte existe em `skills/orion-orchestrator/` e a skill **aponta** para `§4`/ADR-0024-0025 no roteamento
  do STATE (sem reafirmar a regra por extenso); **nenhum resíduo** de "aterrissar estado" — a orientação é
  **rotear + atualizar só o ponteiro**, citando a rede `state-budget-check` como verificação. A prosa da
  skill está nos **`scanDirs`** e um **teste de regressão** reprova "aterrissar estado" (o drift é pego no
  **CI**, não só no review).
- Existe um **passo de empacotamento reproduzível e atômico** documentado (fonte → install), com **selo de
  frescor** (hash/versão) e um **check que falha fechado** se o install estiver defasado vs. a fonte; a
  cópia local é descrita como **derivada**.
- Os **ponteiros de governança** da skill resolvem contra a **raiz do repo ATIVO em runtime** e **falham
  fechado** se a constituição não for encontrada (nunca resolvem para o pacote instalado).
- O **gate segue a natureza da mudança** (conteúdo=G1; estrutural/processo/stack/segurança=G2); sempre com
  merge humano.
- A skill **não** trata `PLAN.md`/`CHANGELOG.md`/`STATE.md` como fonte narrativa e **defere ao `AGENTS.md`
  vigente** — sem fonte paralela.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho do antigo. -->
