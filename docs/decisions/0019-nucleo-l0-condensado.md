# ADR-0019 — Núcleo L0 condensado (core sempre-carregado + detalhe sob demanda)

- **Status:** proposto  <!-- humano aprova (G2) → muda para: aceito -->
- **Data:** 2026-07-22
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** `AGENTS.md` §4 (camadas de memória — **L0**) e a **regra de compactação**;
  `CLAUDE.md` (ponteiro); `AGENTS.core.md` (o núcleo); épico **O5** / Issue **T5.3** (última do épico);
  Onda 4 do plano original. Sem superseder nem reabrir ADR anterior (append-only).

## Contexto
A camada **L0** (§4: `AGENTS.md`/`CLAUDE.md`/`docs/architecture/foundations.md`) é a constituição
carregada por sessão. O `AGENTS.md` (~518 linhas) lido inteiro pesa na janela e **dilui o sinal**: a
regra crítica (princípios, gates, modelo de confiança) compete com o detalhe raramente necessário. O
`CLAUDE.md` já é um **ponteiro** ("a fonte única de verdade é `AGENTS.md`"), mas não há um **núcleo
condensado** separando o que o agente precisa **sempre** do que só importa **sob demanda**. Restrição
forte: o `AGENTS.md` é a **fonte única da verdade** — nada aqui pode criar uma segunda fonte
concorrente nem **redefinir** o termo formal "L0" (§4).

## Decisão
Sub-particionar o **L0** em dois tiers, **sem** alterar o sentido de "L0" (§4) e **sem** tornar o
núcleo uma fonte paralela:

1. **Núcleo (core) — sempre carregado:** as regras **inegociáveis por sessão** — **Princípios (§1)**,
   **Gates G0–G3 (§3)** e **modelo de confiança T0–T4 (§11)**, mais os **limites** e o **fluxo
   propõe→aprova→merge** que deles derivam. Materializado em **`AGENTS.core.md`**, um documento curto
   que **destila** a regra inegociável de cada seção core e **aponta** (`§X`) para o texto canônico.
2. **Detalhe — sob demanda:** o restante do `AGENTS.md` (papéis/pipeline, memória, SDD, Git, fundações
   de engenharia, qualidade, observabilidade, segurança, fast-lane, DoD), **carregado quando a tarefa
   exige**, via ponteiro `§X` do núcleo.
3. **Canonicidade:** o `AGENTS.md` permanece **canônico**. O `AGENTS.core.md` é uma **visão
   condensada/derivada** dele — **não** um fork, **não** normativo por si: em qualquer divergência, o
   `AGENTS.md` vence.
4. **Orçamento:** o tier core cabe num **orçamento de linhas** definido — **90 linhas** de peso no
   `AGENTS.md` (hoje §1+§3+§11 = **77 linhas**, ~16% do corpo de seções; ~14% de folga para a
   constituição evoluir antes de forçar um re-tiering). O `AGENTS.core.md` em si é ainda menor, por ser
   destilado.
5. **Anti-drift (checado, não confiado):** o núcleo é **derivado/checado** contra o full. Um **guard de
   manifesto** ([`docs/examples/l0-core-manifest.ts`](../examples/l0-core-manifest.ts)) classifica
   **toda** seção da constituição em `core|detail` de forma **exaustiva** (nada órfão — lição do #43),
   **sem duplicata**, e verifica o **orçamento**. O guard roda no `scripts/smoke-test.sh` extraindo os
   `§X` **do próprio `AGENTS.md`** e cruzando com o manifesto: adicionar/renumerar uma seção sem
   reclassificar **quebra o CI**. Nenhuma seção é **renumerada** (referências `§8.1`, `§9.1`, `§11`… em
   ADRs e docs precisam continuar válidas em todo o repo).

## Alternativas consideradas
- **Manter o `AGENTS.md` inteiro sempre carregado (status quo):** rejeitada — custo de janela crescente
  e sinal diluído; contraria a proporcionalidade/eficiência de contexto que motiva o O5.
- **Forkar um resumo manual (núcleo como doc independente/normativo):** rejeitada — cria segunda fonte
  da verdade e drift garantido; viola a canonicidade do `AGENTS.md` (§4).
- **Renumerar/reorganizar as seções para compactar:** rejeitada — quebra as referências `§X` espalhadas
  em ADRs/docs (append-only e cross-refs); risco desproporcional ao ganho.
- **Cortar conteúdo da constituição:** rejeitada — condensação é sobre **tier de carregamento**, não
  sobre remover regra; nada normativo se perde (só muda de tier).

## Consequências
- **Positivas:** menor custo de janela por sessão; sinal crítico destacado; retomada mais barata;
  coerente com a "regra de compactação" da §4 (preservar o essencial fora da janela).
- **Negativas/riscos + mitigação:**
  - *Drift núcleo↔full* → núcleo como visão derivada/checada; guard no smoke-test cruza o manifesto com
    os `§X` reais do `AGENTS.md`; Harness Review compara núcleo × full.
  - *Sobrecarga do rótulo "L0"* → o ADR explicita **sub-partição dentro** do L0 (§4), não redefinição;
    checado contra a §4 (lição #43 — não sobrecarregar rótulo formal).
  - *Perda normativa* → manifesto **exaustivo** (nada órfão); nenhuma seção some, só muda de tier.
  - *Refs quebradas* → proibição de renumerar + varredura repo-wide das `§X` + o cross-ref do smoke-test.
- **Segurança/confiança/observabilidade:** sem impacto em T0–T4/gates (só **apresentação** do L0);
  métrica de processo = linhas do core vs. orçamento (checável no guard), sem PII.

## Conformidade
- **Review/CI:** o revisor (**Harness Review**, ADR-0008) confirma que o manifesto é **exaustivo**, o
  core cabe no orçamento, **nenhuma** seção foi renumerada e **nenhuma** regra normativa sumiu (núcleo ×
  full). O guard roda no `scripts/smoke-test.sh` (anti-drift contínuo).
- **§8.1:** rodar [`docs/examples/l0-core-manifest.ts`](../examples/l0-core-manifest.ts) (manifesto real
  válido × mutação órfã/duplicata/estouro) e anexar o output ao PR; checar o resultado contra a §4 (o
  "L0" mantém o sentido formal). Tarefa de governança/instruções, **sem superfície de usuário** → a
  verificação **e2e** (ADR-0009) **não se aplica** (dispensa justificada no PR).
- **Repo-wide:** por mudar a **apresentação da constituição**, varrer `CLAUDE.md`, `MEMORY.md`,
  `README`, `CONTRIBUTING`, `getting-started`, `foundations` — e **todas** as referências `§X`.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho deste. -->
