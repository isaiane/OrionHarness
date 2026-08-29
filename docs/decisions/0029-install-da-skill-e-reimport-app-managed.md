# ADR-0029 — Install da skill é reimport app-managed (supersede as cláusulas de install do ADR-0028)

> Architecture Decision Record (`AGENTS.md` §3, gate G2). ADRs são **append-only**: uma decisão
> revista não é apagada — cria-se um novo ADR que a substitui.
>
> **Ao criar um ADR — ou mudar seu número/título/status/nome —, regenere o índice** e commite o
> `README.md`: `node --experimental-strip-types tools/adr/adr-index.ts --write`
> ([ADR-0023](0023-indice-gerado-de-adrs.md)).

- **Status:** aceito  <!-- G2 aprovado por Isa (owner) em 2026-08-29 (PR #196) -->
- **Data:** 2026-08-29 (proposto · aceito no G2)
- **Decisores:** Isa (owner) — aprovação humana (gate **G2**)
- **Relacionado a:** **supersede parcialmente** o [ADR-0028](0028-skill-orquestradora-versionada-no-harness.md)
  (as cláusulas de _install_ do item 2 e da Conformidade); descoberto na implementação da **S2**
  ([#193](https://github.com/isaiane/OrionHarness/issues/193), PR #196); mesma família visão-derivada + guard
  ([ADR-0019](0019-nucleo-l0-condensado.md)/[ADR-0023](0023-indice-gerado-de-adrs.md)); épico **O9**.

## Contexto

O [ADR-0028](0028-skill-orquestradora-versionada-no-harness.md) decidiu **versionar a skill
`orion-orchestrator`** no repo, com o **install como artefato de build** e um **check de frescor que falha
fechado**. A redação otimista do item 2 e da Conformidade assumiu três coisas que a **implementação da S2**
(PR #196) mostrou não se sustentarem contra a realidade do app Claude:

1. **"build-and-install atômico"** — supôs um passo de _install_ automatizado pelo repo.
2. **"check fail-closed se o _install_ estiver defasado"** — supôs que o CI pudesse comparar contra a
   **cópia instalada**.
3. **"empacotamento reproduzível"** — foi lido, por um revisor, como **byte-reproducibility do ZIP**.

O que a S2 confirmou: **o install é gerenciado pelo app Claude** — ele extrai o `.skill` e registra um
`skillId` próprio em `~/Library/.../skills-plugin/…`; **o repo não escreve nesse diretório** e não tem como
inspecioná-lo no CI. Manter as três cláusulas como estão deixa um agente que segue o ADR **literalmente**
com requisitos **incompatíveis** com o que o harness pode fazer. Corrigir isso **in-place** no ADR-0028
violaria o **append-only** (o próprio cabeçalho do ADR-0028 manda que uma decisão revista vire **novo ADR**).
Daí este ADR.

## Decisão

Adotaremos a leitura abaixo, que **supersede as três cláusulas de install** do ADR-0028. **Todo o resto do
ADR-0028 permanece vigente** (fonte versionada em `skills/`; ponteiro > espelho, O9; a prosa da skill é
varrida pelo guard na S3; gates G0–G3; merge humano T3).

1. **Build atômico no repo; install = reimport do usuário.** Há **build atômico** (`scripts/build-skill.sh`
   empacota **só `git ls-files`** — sem untracked/symlink — para um temp e faz `mv` sobre o destino só no
   sucesso; o selo é gravado só após o build). **Não há passo de install automatizado**: a **importação** do
   `.skill` no app é **ação do usuário**. A cópia instalada é **derivada**, não canônica.
2. **O check falha fechado sobre _fonte↔build_**, não sobre o install. O `--check` (no smoke-test/CI) compara
   o **hash da fonte rastreada** com o **selo committado** (`skills/orion-orchestrator.stamp`) — verde só se a
   fonte estiver em dia com o selo. A **cópia instalada** (app-managed) é refrescada **reimportando** o
   `.skill` reconstruído; o repo **não** a verifica (está fora do seu alcance).
3. **"Reproduzível" = conteúdo determinístico (selo), não bytes do ZIP.** A identidade reproduzível é o
   **selo = hash length-delimited da fonte rastreada** (independe de mtime). O `.skill` (ZIP) **não é
   committado** (scratch gitignored), então a variação de **mtime** do arquivo é **irrelevante** — não há
   requisito de byte-reproducibility do ZIP. Se um dia o `.skill` for **distribuído/committado**, a
   byte-reproducibility vira requisito próprio de um **novo ADR**.

## Alternativas consideradas

- **(A) Editar as cláusulas in-place no ADR-0028.** Rejeitada: viola o **append-only** (decisão revista vira
  novo ADR); mistura, no mesmo artefato, a decisão aceita e sua substituição, obscurecendo qual G2 fixou o
  modelo vigente — exatamente o achado do Codex (P1) que motiva este ADR.
- **(B) Implementar de fato o install atômico gerenciado pelo repo.** Rejeitada: o install é **do app**
  (skillId próprio); escrever em `~/Library/.../skills-plugin/…` seria frágil, específico de plataforma e
  fora do domínio do harness — trocaria uma cláusula otimista por acoplamento pior.
- **(C) Marcar o ADR-0028 inteiro como "substituído".** Rejeitada: **desproporcional** — só as cláusulas de
  install mudam; o resto da decisão (versionar, ponteiro, guard) segue válido e em uso.

## Consequências

- **Positivas.** O modelo vigente fica num **único G2 rastreável** (este ADR), sem contradição interna no
  ADR-0028; o append-only é respeitado; a Conformidade do harness passa a ser **verificável de verdade**
  (fonte↔build no CI), sem prometer o que não se pode checar (a cópia instalada).
- **Negativas / riscos + mitigação.** A **cópia instalada** pode ficar **defasada** silenciosamente (a fonte
  muda, ninguém reimporta) → mitigação: o `getting-started` documenta o ciclo **fonte→build→reimport** e o
  `STATE.md` registra o risco residual até a **S3** (guard de regressão que reprova "aterrissar estado").
- **Segurança/confiança.** Sem novos poderes: o build continua empacotando **só arquivos rastreados e
  regulares** (rejeita untracked/symlink em qualquer componente do caminho), então o `.skill` não embute
  credenciais/arquivos externos. Merge humano (T3/G3); a skill segue **deferindo ao `AGENTS.md`** vigente.

## Conformidade

Como verificar no review/CI que a implementação respeita esta decisão (§8.1):

- O **ADR-0028** contém, no lugar da antiga nota in-place, **apenas um ponteiro curto** para este ADR-0029
  (append-only); a **decisão revista das cláusulas de install vive aqui**, não lá.
- Existe **build atômico** documentado (temp + `mv`), empacotando **só `git ls-files`** (sem
  untracked/symlink em nenhum componente), com **selo length-delimited** e um **`--check` que falha fechado**
  sobre **fonte↔build**; a cópia instalada é descrita como **derivada** (reimport do usuário).
- Nenhuma parte do harness afirma verificar a **cópia instalada** nem promete **install automatizado**; o
  ciclo **fonte→build→reimport** está no `getting-started`.
- O índice de ADRs (`docs/decisions/README.md`) lista **0029** e é regenerado
  (`node --experimental-strip-types tools/adr/adr-index.ts --write`).

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho do antigo. -->
