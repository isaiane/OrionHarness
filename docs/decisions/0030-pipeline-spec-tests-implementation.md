# ADR-0030 — Pipeline Specification → Tests → Implementation (contrato executável)

> Architecture Decision Record (`AGENTS.md` §3, gate G2). ADRs são **append-only**: uma decisão
> revista não é apagada — cria-se um novo ADR que a substitui.
>
> **Ao criar um ADR — ou mudar seu número/título/status/nome —, regenere o índice** e commite o
> `README.md`: `node --experimental-strip-types tools/adr/adr-index.ts --write`
> ([ADR-0023](0023-indice-gerado-de-adrs.md)).

- **Status:** proposto  <!-- humano aprova (G2) → muda para: aceito -->
- **Data:** 2026-08-30
- **Decisores:** Isa (owner) — aprovação humana (gate **G2**)
- **Relacionado a:** épico **O7** (merge assistido por evidência), tarefa **T7.0**
  ([#203](https://github.com/isaiane/OrionHarness/issues/203));
  **supersede parcialmente** [ADR-0018](0018-revisao-cross-model.md) (**apenas o item 5** — ordem dos
  testes deixa de ser preferência e passa a ser requisito para as classes recortadas);
  **reafirma** [ADR-0008](0008-separacao-revisao-harness-vs-produto.md) e
  [ADR-0017](0017-fast-lane-baixo-risco.md) (proporcionalidade);
  [ADR-0009](0009-verificacao-e2e-ferramenta-real.md) (recorte por risco);
  [ADR-0003](0003-enforcement-g3-por-perfil.md) (T3/G3 preservado).

## Contexto

O [ADR-0018](0018-revisao-cross-model.md) já fixou o essencial: quem **revisa e escreve os testes de
aceite** deve ser **distinto** de quem **implementa**, autorrevisão é bloqueada, e divergência escala
ao humano. Mas o item 5 recusou explicitamente tornar a **ordem** obrigatória — "antecipar a escrita
dos testes é preferível, **não** requisito de ordem" —, com o argumento de que a independência vem da
autoria distinta, não de reordenar o pipeline.

O argumento é válido para **independência**. Ele não cobre um segundo problema, que a prática de
agentic coding torna agudo:

> O LLM interpreta a spec errado → escreve o teste conforme a interpretação errada → implementa para
> passar nesse teste → **CI verde** → feature errada.

Quando o **mesmo** agente deriva o comportamento esperado e o realiza, o teste deixa de ser prova e
vira eco da implementação. Escrever os testes **antes**, por **outro** modelo, e **congelá-los**, faz
o teste voltar a ser o que ele é: um **contrato executável da Issue**.

Há também um segundo vazio, específico de automação: **falhar não é o mesmo que falhar pelo motivo
certo.** `SyntaxError`, módulo não encontrado, fixture inválida ou erro de compilação também
produzem saída vermelha — e um pipeline ingênuo lê isso como "RED, ótimo, siga". Isso não é TDD; é
teste quebrado passando por especificação.

## Decisão

Adotamos o pipeline **Specification → Tests → Implementation**, em que os testes são o **contrato
executável** da Issue.

**1. A ordem passa a ser requisito — para as classes recortadas (§9).**
Os testes de aceite derivados pelo **revisor** existem **antes** da implementação. Isto **supersede o
item 5 do [ADR-0018](0018-revisao-cross-model.md)**, e **só** ele: independência de autoria,
divergência-como-sinal, concordância-não-é-autoridade e o roteamento por classe permanecem intactos.

**2. O contrato é imutável para quem implementa.**
Os testes de especificação ficam em caminho próprio e são **read-only** para o agente implementador.
O CI reprova qualquer diff sobre eles no PR de implementação:

```bash
git diff --quiet origin/main...HEAD -- tests/specifications/ || exit 1
```

Sem isso, o caminho mais curto para o verde é o agente reescrever `expect(201)` como `expect(404)` —
*reward hacking*, e o mecanismo inteiro se anula.

**3. RED válido é verificado, não presumido.**
Uma etapa de **validação de falha** distingue:

- **RED bom** — o teste roda, a infraestrutura está sã, e a asserção falha por **comportamento
  ausente** (`Expected 201, received 404`);
- **RED ruim** — `SyntaxError`, módulo não encontrado, falha de compilação, fixture/infra quebrada.

**RED ruim reprova a geração.** O agente autor entrega, junto dos testes, um **manifesto**
(`test-contract.json`) declarando, por cenário: o critério de aceite de origem, o arquivo, o cenário,
e a **falha esperada antes da implementação**. A validação confere o observado contra o declarado.

**4. Suíte existente e testes gerados rodam separados.**
`npm test` agregado destrói a distinção. A ordem é: **baseline verde antes** da geração → gerar →
**baseline continua verde** → **testes novos falham como declarado**. Enfraquecer, pular ou remover
teste existente reprova.

**5. Os papéis, e os que não existem.**

| Papel | Quem | Natureza |
|---|---|---|
| **Autor da Spec** | humano + Cowork (Issue SDD) | já existe (G1) |
| **Autor dos testes** | um modelo (ex.: Codex), via Action oficial | novo |
| **Revisor dos testes** | **o humano**, no PR de contrato — assessorado por LLM, aprovado por pessoa | gate, não papel de agente |
| **Implementador** | modelo **distinto do autor dos testes** | já existe |
| **Revisor da implementação** | protocolo cross-model vigente (`@codex review`) | já existe |
| **Validador** | **script determinístico**, não agente | novo, mas barato |

Três leituras que **reduzem** a máquina e corrigem uma atribuição inviável:

- **O revisor dos testes tem de ser o humano — com dois modelos não há arranjo válido.** Chamando A o
  autor dos testes, R o revisor deles e I o implementador, valem três restrições: **A ≠ I**
  ([ADR-0018](0018-revisao-cross-model.md)), **R ≠ A** (ninguém se autorrevisa) e **R ≠ I** — quem
  aprova o contrato **não** pode ser quem será obrigado por ele, sob pena de aprovar o contrato que
  sabe satisfazer e de resolver ambiguidade na direção da própria implementação futura. Com dois
  modelos as três não fecham: se A = Codex, então R = Claude, e I não pode ser nenhum dos dois.
  **O humano fecha o sistema** — e é o desenho certo, não um remendo: é o único revisor capaz de
  detectar erro de **intenção**, e é exatamente para onde a tese do O7 desloca a supervisão.
- **A revisão da implementação não é papel novo.** O PR final cai no protocolo cross-model já vigente
  (`@codex review`), com o autor impedido de se revisar.
- **O validador não precisa de LLM.** Tudo que ele afirma é determinístico: suíte existente passa;
  novos falham antes; passam depois; nenhum arquivo fora do escopo; contrato não modificado. Um LLM
  aqui adicionaria custo e não-determinismo a checagens que `git diff` e o runner respondem. Postura
  lean (§7): agente onde há julgamento, script onde há verdade.

> **Por que o pipeline totalmente automático é rejeitado.** Se um modelo aprova o contrato e outro o
> implementa, e nenhum humano lê o contrato, um erro de **interpretação da Issue** atravessa intacto:
> o autor escreve o contrato errado, o revisor aprova o contrato errado, o implementador satisfaz o
> contrato errado, o revisor de código aprova a implementação correta-para-o-contrato, e o merge sai
> **verde**. Quatro etapas de validação, nenhuma capaz de ver o erro — porque todas herdam a mesma
> leitura da Issue. Automatizar a revisão do contrato remove o humano **exatamente** do ponto em que
> o pipeline é mais fraco.

**6. Escopo do autor de testes é fechado no CI, não pedido no prompt.**
O agente autor só pode tocar arquivos de teste/fixture/mock. A garantia é uma checagem de diff no
workflow — instrução em prompt é preferência, não controle:

```bash
git diff --name-only | grep -Ev '(^tests/|\.test\.|\.spec\.|__tests__|fixtures|mocks)' && exit 1
```

**7. Comando é menção; estado é artefato; coluna é projeção.**
Três coisas distintas, que não podem virar a mesma:

- **Comando** — uma **menção em comentário** (`@codex tests`, `@claude implement`) dispara o workflow
  via `on: issue_comment`. É imperativo e é ato de pessoa.
- **Estado** — deriva de **artefato**, não de rótulo: o PR de contrato existe; foi **aprovado**
  (a *review approval* do GitHub já é legível por máquina); o PR de implementação existe; mergeou.
- **Coluna do Project** — **projeção derivada** do estado acima (ADR do board, épico O10).

Corolário: **o pipeline não cria label nenhuma.** Uma label `tests-approved` duplicaria o que a
aprovação do PR já diz — e duas representações do mesmo ciclo de vida é a classe de duplicação que o
épico O9 eliminou. Permanecem apenas as labels que já existem por outro motivo: a de **G1** (decisão
humana, sem outro registro) e `blocked` / `needs-human-approval`.

**8. Os agentes entram por Actions oficiais, não por invocação artesanal.**
[`openai/codex-action`](https://github.com/openai/codex-action) e
[`anthropics/claude-code-action`](https://code.claude.com/docs/en/github-actions) rodam dentro do
workflow com prompt versionado e permissões declaradas. O `@codex review` gerenciado continua sendo
usado para o que ele já faz — revisar o PR final —, sem ser reaproveitado para outra função.

Os modelos são **workers substituíveis**: o GitHub guarda estado e artefatos, o workflow orquestra.
Trocar o implementador não muda nada a montante.

**9. Recorte por classe (proporcionalidade — §1 Princípio 4, ADR-0009/0017).**
O pipeline completo **não** roda em toda mudança. Rodá-lo num T1 de fast-lane custaria uma geração de
testes, um PR extra e uma validação para trocar uma linha de doc.

- **T1 fast-lane (§11.2):** **fora** do pipeline. Continua com PR leve + revisão cross-model.
- **T2+ com superfície de comportamento observável:** pipeline **completo**.
- **T2+ sem comportamento observável** (docs, governança, config): **fora** — não há contrato a
  escrever. Segue o ADR-0018 como hoje.

O recorte é **por conteúdo do diff/da Issue**, não por tamanho.

**10. T3/G3 intactos.**
Nenhuma etapa aqui integra nada. Os workflows **abrem PR**; o merge continua humano.

**11. Topologia de branch: a `main` nunca fica vermelha.**
O PR de contrato é **artefato de revisão** e **não mergeia**:

```
tests/issue-N ──── PR de contrato (draft, vermelho por desenho) → revisão humana
      │
      └── feat/N-slug ──── PR de implementação (verde) → main
```

- a branch de implementação **nasce da branch de testes**, herdando o contrato;
- só o **resultado combinado** — contrato + implementação, verde — chega à `main`;
- o PR de contrato é **draft**: fica vermelho por desenho, e o draft impede merge acidental e torna o
  vermelho **esperado** em vez de alarmante;
- ele **não** carrega `Closes #N` — quem fecha a Issue é o PR de implementação.

As alternativas foram descartadas: mergear o contrato deixaria a `main` com testes falhando (fura o
**Princípio 5**) e excluir os testes de especificação do CI criaria uma categoria de teste que não
roda — coisa de que o §8.1 desconfia por princípio.

## Decisões em aberto (o G2 precisa fechá-las)

**(i) Credenciais — duas coisas distintas, decididas juntas.**

- **Chaves de provedor** (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) autenticam os **modelos**;
- **identidade no GitHub** autentica a **automação** — e é o mesmo problema do ADR do board: um PR
  aberto por workflow com o `GITHUB_TOKEN` padrão **não dispara** os checks obrigatórios. Para o PR de
  contrato isso pesa pouco (a validação do RED ocorre **dentro** do job, antes de abrir o PR), mas
  para o PR de implementação é bloqueante.

Ambas são **§10** e ato humano. Guardar segredo e instalar App são atos seus; o agente **não** cria
nem manipula credencial. O agente autor de testes roda com escopo de escrita **limitado ao workspace**
e **sem rede irrestrita**.

## Alternativas consideradas

- **(A) Manter o ADR-0018 como está (ordem = preferência).** Rejeitada: não cobre o caso em que o
  mesmo agente interpreta a spec e escreve o teste que a "prova". O teste vira eco.
- **(B) Autor dos testes e implementador no mesmo modelo, só em etapas diferentes.** Rejeitada: viola
  a independência do ADR-0018 e reintroduz o eco.
- **(C) Validador como agente LLM.** Rejeitada: todos os seus vereditos são determinísticos; um LLM
  adiciona custo e variância sem ganho (§7).
- **(D) Um LLM como revisor do contrato, aprovando sozinho.** Rejeitada por duas razões independentes:
  com dois modelos, **R ≠ A e R ≠ I** não fecham (§5); e automatizar essa aprovação retira o humano
  do único ponto capaz de pegar **erro de intenção**, deixando o pipeline verde sobre um contrato
  errado.
- **(E) Máquina de estados com oito labels.** Rejeitada: duplica o ciclo de vida que os artefatos já
  registram (PR aberto, PR aprovado, PR mergeado) e que o board projeta. A aprovação de PR já é
  legível por máquina; label seria segunda verdade.
- **(F) Pipeline em toda mudança.** Rejeitada: desproporcional (§1 Princípio 4); mataria a fast-lane.

## Consequências

- **Positivas.** O teste deixa de ser eco e volta a ser contrato. O implementador vira substituível
  sem mudar nada a montante. "RED" passa a ser **verificado**, não presumido. O espaço de decisão do
  implementador encolhe: em vez de interpretar a Issue livremente, ele resolve um contrato executável.
- **Negativas / riscos + mitigação.**
  - *Latência e custo por tarefa sobem* — uma geração, um PR e uma validação a mais. **Mitigação:** o
    recorte por classe (§9) mantém o trivial fora.
  - *Reward hacking* — **mitigação:** contrato read-only verificado por diff no CI (§2).
  - *Falso RED aceito como bom* — **mitigação:** manifesto + validação de motivo da falha (§3).
  - *Erro de intenção continua passando* — se a **Issue** estiver errada, testes e implementação
    ficam consistentemente errados e o CI fica verde. O ADR-0018 já nomeia isto ("captura erros de
    implementação, não de intenção"). **Este pipeline não fecha esse buraco** — apenas o desloca para
    o G1, o que aumenta o peso da Issue SDD bem especificada. Registrar isso é parte da decisão.
  - *Mais uma superfície de credencial* — **mitigação:** sandbox com escopo de escrita limitado, sem
    rede irrestrita, e decisão conjunta com a credencial do board (ver Decisões em aberto).

## Conformidade

- **Modelo de confiança.** Gerar testes e abrir PR é **T1**. Integrar é **T3** e permanece humano.
  Mudar a ordem obrigatória do protocolo é **T2→G2** — é o que este ADR faz.
- **Declaração de supersedência (regra de endurecimento, [ADR-0025](0025-modelo-alvo-plano-historia-compactacao-ponteiros.md)).**
  Supersede **exclusivamente o item 5** do [ADR-0018](0018-revisao-cross-model.md); todo o restante
  daquele ADR permanece. O ADR-0018 recebe **nota de cabeçalho** (append-only); sua decisão histórica
  **não** é editada.
- **§8.1.** Verde não prova correção: o pipeline prova que a implementação satisfaz o **contrato**,
  não que o contrato satisfaz a **intenção**. A revisão humana do PR de testes é onde a intenção é
  conferida — e é por isso que ela não pode virar carimbo.
