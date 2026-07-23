# ADR-0018 — Protocolo de revisão cross-model

- **Status:** aceito  <!-- G2: aprovado pelo humano (owner) em 2026-07-23 -->
- **Data:** 2026-07-22 (proposto) · 2026-07-23 (aceito no G2)
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** `AGENTS.md` §2 (fase Review), §11 (T0–T4); ADR-0008 (revisor independente do
  autor); ADR-0010 (re-review automatizado); épico **O5** / Issue T5.2; soft link com ADR-0017 (fast-lane).

## Contexto
O ADR-0008 exige revisor **independente do autor** ("agente/modelo distinto, ou revisor automático —
ex.: Codex") e o ADR-0010 fixa o ciclo de re-review. A independência, porém, está como **princípio**,
sem protocolo: não se define *quem* escreve os testes de aceite, *como* tratar a divergência entre
modelos, nem que a **autorrevisão** (o mesmo modelo revisando a própria saída) é proibida. Isso
importa porque (a) modelos exibem viés de autopreferência ao julgar a própria saída, (b) autor e
revisor sendo o mesmo modelo compartilham pontos cegos, e (c) com PRs gerados por agente em alto
volume, a atenção humana precisa ser **roteada por risco/divergência**, não gasta linha a linha.

## Decisão
Adotar um **protocolo cross-model** para a fase _Review_, estendendo ADR-0008/ADR-0010:

1. **Independência de autoria (obrigatória):** o modelo que **revisa e/ou escreve os testes de aceite**
   deve ser **distinto** do que **implementa**. Autorrevisão (autor == revisor) é **bloqueada** e
   escala ao humano. Isto **resolve a ambiguência** do "ou revisor automático" do ADR-0008: um revisor
   automático (ex.: Codex) é independente **por ser outro modelo**, não por ser automatizado — um
   revisor automático *do mesmo modelo* que implementou **é autorrevisão** (escala, automatizado ou não).
2. **Divergência é sinal:** quando os testes de aceite (derivados pelo revisor) **falham** contra a
   implementação, isso é **divergência** — pode ser bug **ou** ambiguidade da Issue. Em ambos os
   casos, **escala ao humano** (que arbitra), em vez de auto-resolver.
3. **Concordância é evidência (não autoridade de merge):** implementador ≠ revisor **+** testes do
   revisor **verdes** **+** classe **T1/T2** ⇒ o PR segue para **merge humano de rotina** (T0 puro não
   entra na rota de review — descritor T0 escala; T3/T4 abaixo). Concordância
   reduz o *escrutínio* necessário; **não** dispensa o **merge humano (T3/G3)**, que permanece em toda
   rota.
4. **Classe roteia o desfecho (§11):** **T3** (decisão humana obrigatória) sempre **escala ao humano**,
   mesmo com concordância + verde. **T4** (ação proibida) é **`blocked`** — a ação é **recusada e não
   liberável**, mas isso **não suprime a escalação**: o L0 exige T4 **recusada _e_ notificada**
   (humano/segurança). O que `blocked` remove, em relação a uma divergência, é a **arbitragem-que-libera**
   (a divergência o humano *pode* limpar; a T4 não) — **não** a notificação humana. O predicado dá
   precedência a T4 sobre os demais campos (um descritor T4 malformado não vira rota "verde").
5. **Padrão de força (dentro da fase _Review_):** o revisor **deriva os testes de aceite de forma
   independente** — da **mesma Issue** quando há uma, ou, na **rota issue-less** (fast-lane, §11.2/
   ADR-0017, onde não existe Issue por construção), da **descrição do PR leve + o critério de aceite
   declarado** (mesma fonte que os checklists já usam na variante issue-less). Os testes são avaliados
   **na fase _Review_** contra o diff — a independência vem da **autoria distinta**, **não** de
   reordenar o pipeline (Build → Review permanece; nenhum handoff pré-Build novo). Antecipar a escrita
   dos testes é **preferível quando a fonte já traz critérios executáveis**, mas é preferência, **não**
   requisito de ordem.

O predicado de referência (`docs/examples/cross-model-review.ts`) implementa este roteamento e é a
evidência rodável. **Limite reconhecido:** a descorrelação de erros é **parcial** (modelos treinados
em corpora sobrepostos); o protocolo captura erros de **implementação**, não de **intenção** — erro
de intenção na Issue passa por unanimidade, então a Issue SDD bem especificada continua sendo o
alavancador (§5).

## Alternativas consideradas
- **Manter só o princípio do ADR-0008 (status quo):** rejeitada — permite independência "no papel"
  (autor escrevendo os próprios testes) e não define tratamento de divergência.
- **Mesmo modelo revisa a própria saída (à la "métricas bastam"):** rejeitada — viés de
  autopreferência e pontos cegos compartilhados; métricas (complexidade, mutation) medem qualidade
  **estrutural**, não **correção de intenção**, e são sujeitas a Goodhart.
- **Auto-resolver divergência entre os modelos sem humano:** rejeitada — divergência é justamente o
  ponto onde o humano agrega mais (bug vs. Issue ambígua); auto-resolver esconde o sinal.
- **Dispensar merge humano quando os dois modelos concordam:** rejeitada — **T3/G3 é inegociável**;
  concordância reduz escrutínio, não a autoridade de merge. "Quem assina embaixo" continua sendo humano.

## Consequências
- **Positivas:** independência deixa de ser interpretável; atenção humana roteada por divergência
  (escassa) e não por volume (explosivo); casa com o fast-lane (T5.1 — concordância cross-model como
  evidência de baixo risco) e com a doutrina do ADR-0008/0010.
- **Negativas/riscos + mitigação:**
  - *Correlação de erros* → assumida como parcial e documentada; Issue SDD forte cobre intenção.
  - *Divergência ruidosa (flaky)* → escala ao humano, que distingue; opt-in de e2e (ADR-0009) limita flaky.
  - *Custo de dois modelos* → protocolo agnóstico e proporcional ao risco; observável via sinal de processo.
- **Segurança/confiança/observabilidade:** **T3** exige decisão humana e **T4** é **bloqueada**
  (recusada e **notificada**, não liberável) — §11; sinal `cross_model` (implementer/reviewer/route,
  incl. `blocked`) para Data-First, sem PII — **definição, owner/gatilho e métricas** em
  [`docs/observability.md`](../observability.md) (§ "Sinal de processo (cross_model)"). A **captura por
  PR é opcional/diferida por escopo**: a orquestração real de "modelo B escreve os testes" fica como
  **evolução** (fora do escopo da T5.2); quando existir, o campo é promovido a obrigatório no PR
  template, como o `lane` (ADR-0017).

## Conformidade
- **Review/CI:** o revisor confirma, para cada PR sob o protocolo, que implementador ≠ revisor, que os
  testes de aceite são de autoria do revisor, e que divergências foram escaladas (não auto-resolvidas);
  PRs com autor == revisor são rejeitados.
- **§8.1:** rodar `docs/examples/cross-model-review.ts` (três rotas) e anexar o output; simular agente
  obediente para confirmar que a autorrevisão é bloqueada e nenhum gate é contornado.
- **Repo-wide:** por mudar a **postura de processo**, a implementação varre os docs current-state
  (`AGENTS.md` §2, `CONTRIBUTING.md`, os dois checklists, `README`, `getting-started`) e, se tocar
  roteamento de fase, os **diagramas Mermaid**. ADR-0008/0010 são referenciados, **não** reescritos.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho deste.
     Este ADR ESTENDE (não supersede) ADR-0008 e ADR-0010. -->
