# ADR-0046 — Constituição autossuficiente: o `AGENTS.md` enuncia a regra; ADR é só proveniência

> Architecture Decision Record (`AGENTS.md` §3, gate G2). ADRs são **append-only**: uma decisão
> revista não é apagada — cria-se um novo ADR que a substitui.
>
> **Ao criar um ADR — ou mudar seu número/título/status/nome —, regenere o índice** e commite o
> `README.md`: `node --experimental-strip-types tools/adr/adr-index.ts --write`
> ([ADR-0023](0023-indice-gerado-de-adrs.md)).

- **Status:** proposto
- **Data:** 2026-10-08
- **Decisores:** Isa (owner) — G2 pendente
- **Relacionado a:** Issue #358 (O16.1), épico **O16** (Milestone #21 — distribuição do harness como
  pacote + CLI), [ADR-0019](0019-nucleo-l0-condensado.md) (núcleo L0),
  [ADR-0024](0024-estado-enxuto-roteamento-historia-status.md) e
  [ADR-0025](0025-modelo-alvo-plano-historia-compactacao-ponteiros.md) (tabela história-vs-status),
  [ADR-0018](0018-revisao-cross-model.md) (protocolo cross-model),
  [ADR-0030](0030-pipeline-spec-tests-implementation.md), [ADR-0039](0039-marcador-de-autoria-modelo.md),
  [ADR-0040](0040-v1-testes-pelo-codex-no-pr.md) e
  [ADR-0041](0041-testes-cross-model-obrigatorios-no-produto.md) (testes de aceite do outro modelo),
  [ADR-0009](0009-verificacao-e2e-ferramenta-real.md) (e2e), [ADR-0031](0031-modelo-plano-v2-milestone-completo-hierarquia-nativa.md)
  (padrão "ADR carrega o texto; fatia irmã aplica")

## Contexto

O épico O16 separa o **repositório central** do harness da **instância distribuída** ao produto. A
instância **não** recebe os ADRs do Orion (Zona D do épico): eles são deliberação interna do central.
Hoje o `AGENTS.md` cita ADRs de dois jeitos:

- **Proveniência** — "decidido em…": a regra está por extenso no próprio `AGENTS.md` e o ADR só registra
  de onde ela veio.
- **Delegação** — para saber **o que vale**, o leitor precisa abrir o ADR.

No produto, os links quebram e a regra delegada some: a constituição nasce furada. Esta tarefa é o
caminho crítico do O16 — sem ela, nenhuma outra pode retirar os ADRs do pacote.

**Levantamento (HEAD `50a0d63`, 2026-10-08).** O `AGENTS.md` tem **16 links** markdown para
`docs/decisions/` e **26 ocorrências** `ADR-NNNN` em **24 linhas** (algumas sem link). Há ainda **5
menções à pasta** `docs/decisions/` sem link (linhas 58, 176, 203, 349 e 563). A Issue #358 estimou
"21 links e 27 menções" na abertura; a contagem correta é a deste parágrafo.

## Decisão

Adotaremos as regras abaixo para o `AGENTS.md`.

**1. Toda regra que o `AGENTS.md` enuncia está nele por extenso.** Nenhuma seção exige abrir um ADR
para conhecer a regra que enuncia. ADR citado é **proveniência**, nunca fonte. O alcance desta decisão é
o das **citações existentes** (inventário abaixo) **mais** o protocolo de testes de aceite do outro modelo
(ORION-0039/0040/0041, com o ORION-0030 pendente de amarração), que o `AGENTS.md` hoje não cita mas o
CI já impõe. Regras ativas de **outros** ADRs que o `AGENTS.md` não cita ficam para uma varredura
própria (#371, follow-up da #358), fora desta decisão.

**2. Formato da proveniência: `ORION-NNNN`, sem link** (decisão de Isa no G1 da #358, 2026-10-07).
No repositório central, `ORION-NNNN` designa o mesmo documento que `docs/decisions/NNNN-*.md` — a
renomeação é **só no texto**, nenhum arquivo de ADR é renomeado; o índice
[`README.md`](README.md) resolve o número. No produto, `ORION-NNNN` aponta para uma decisão herdada do
Orion Harness, consultável no repositório central.

**3. A pasta `docs/decisions/` continua citável sem link.** As menções ao caminho como lugar onde se
registram ADRs (G2, camada L3, conformidade da §8.1) são regra, não proveniência: no produto, apontam
para os ADRs **do próprio produto**.

**4. Os ADRs de cada projeto seguem sequência própria a partir de `0001`.** No produto, a numeração
começa em `0001` sem colisão com o Orion, porque as decisões herdadas aparecem só como `ORION-NNNN`.

**5. Um guard impede a volta da delegação** (fatia 1c da #358). Ele vale **só para o `AGENTS.md`**,
que no produto é arquivo gerenciado e não se edita localmente (O16): as decisões do próprio produto
são citadas nos arquivos do produto — seus ADRs e a extensão declarada —, fora do alcance do guard. No `smoke-test`, ele reprova um
`AGENTS.md` que contenha: link markdown para `docs/decisions/` (relativo); link para `/docs/decisions/`
de URL absoluta; ou ocorrência `ADR-NNNN`. Aceita `ORION-NNNN` e a menção à pasta sem link. É
checagem de **forma**: a semântica (uma delegação escrita sem citar ADR, ex.: "conforme decidido")
continua com o revisor humano (§8.1).

### Inventário das citações (HEAD `50a0d63`)

Classificação **por leitura** de cada linha contra o ADR citado — não só por grep. "Proveniência" =
a regra já está por extenso no `AGENTS.md`; "delegação" = parte da regra só existe no ADR.

| Linha | Seção | ADR citado | Classe | Tratamento |
|---|---|---|---|---|
| 17 | §1 (P2) | 0017 (link) | proveniência — a fast-lane está por extenso no §11.2 | R1 |
| 47 | §2 (tabela, Initialize) | 0006 | proveniência — "sem ledger, gerado pós-Spec" está na própria linha | R2 |
| 51 | §2 (tabela, Review) | 0008 | proveniência — os dois processos estão nas linhas 54–91 | R2 |
| 52 | §2 (tabela, Ship) | 0024/0025 | proveniência — o roteamento está na própria linha e no §4 | R2 |
| 55 | §2 (Review) | 0008 (link) | proveniência — regra de seleção e desempate por extenso | R1 |
| 99 | §2 (independência) | 0018 (link), 0008, 0010 | **delegação parcial** — o item 4 do ORION-0018 (classe roteia o desfecho) e o protocolo de testes de aceite (item 5 do ORION-0018; ORION-0039/0040/0041; ORION-0030 pendente) não estão no `AGENTS.md` | R1 + **D2** |
| 138 | §2.2 | 0007 (link) | proveniência — "decisão fundadora"; o papel está por extenso | R1 |
| 151 | §2.2 | 0006 | proveniência — a frase explica o semeia-e-cresce | R2 |
| 188 | §3 | 0017 (link) | proveniência | R1 |
| 208–209 | §4 (Regra de compactação) | 0024, 0025 (links) | proveniência — os bullets enunciam a regra | R1 |
| 216 | §4 | 0006 | proveniência | R2 |
| 232–233 | §4 | 0024, 0025 (links) | **delegação** — "a tabela história-vs-status e o invariante **vivem no** ADR-0024" | **D1** |
| 244 | §4 (Núcleo L0) | 0019 (link) | proveniência — "este documento vence" por extenso | R1 |
| 292 | §7 | 0004 (link) | proveniência — justificativa da postura lean/flat | R1 |
| 329 | §8 | 0008 | proveniência | R2 |
| 356 | §8.1 (e2e) | 0009 (link) | **delegação parcial** — o critério de risco e as restrições de segurança só estão no ORION-0009 | **D3** |
| 424 | §11 | 0004 (link) | proveniência — o opt-in de event-driven está no §7 | R1 |
| 459–460 | §11.2 | 0017, 0004 (links) | proveniência — conferido contra o ORION-0017: elegibilidade, o que remove/mantém, correlação issue-less, aprovação no merge, escalação e transição estão por extenso | R1 |
| 472 | §11.2 | 0008 (link) | proveniência — o critério de desempate está no §2 | R1 |
| 546 | §12 | 0024/0025 | proveniência — o roteamento está na própria linha | R2 |
| 554 | §12 | 0009 | proveniência (a regra completa passa a estar no §8.1 por D3) | R2 |

Fora das citações a ADR: as linhas **246–247** (nota "Os artefatos L1–L5 são criados na Fase 2…") e
**562–563** (rodapé "A primeira decisão fundadora será registrada… na Fase 2") estão desatualizadas —
tratadas por **D4** e **D5**.

### Texto a aplicar no `AGENTS.md` (fatia 1b — aplicação G1)

Este ADR **carrega o texto exato**; a fatia 1b **apenas aplica** (padrão ORION-0031: decidir ≠ aplicar).
O bloco é **verificável por enumeração**: as regras R1/R2 dizem exatamente o que muda em cada linha
listada; os blocos D1–D5 trazem o texto novo inteiro; **todas as demais linhas do `AGENTS.md` são
preservadas na íntegra**. As linhas abaixo são as da HEAD `50a0d63`.

> Por que regras e não DE/PARA nas linhas R1: o `static-check` resolve todo link markdown deste arquivo
> a partir de `docs/decisions/` — inclusive dentro de blocos de código —, então copiar aqui as linhas
> originais com link quebraria o smoke. As regras abaixo são mecânicas e não deixam margem.

**R1 — link para ADR vira proveniência sem link.** Nas linhas 17, 55, 99, 138, 188, 208, 209, 244,
292, 424, 459, 460 e 472, cada link markdown cujo alvo está em `docs/decisions/` é substituído **pelo
seu texto-âncora**, com o prefixo `ADR-` trocado por `ORION-` (ex.: o link de âncora `ADR-0017` vira
o texto `ORION-0017`). Nenhum outro caractere da linha muda, exceto pelas ocorrências que R2 também
alcança na mesma linha.

**R2 — menção sem link vira proveniência.** Nas linhas 47, 51, 52, 99, 151, 216, 329, 546 e 554, cada
ocorrência `ADR-NNNN` vira `ORION-NNNN`; a forma composta `ADR-0024/0025` vira
`ORION-0024/ORION-0025` (cada decisão com o prefixo completo).
Nenhum outro caractere muda.

**D1 — §4, linhas 230–233: a tabela história-vs-status entra no `AGENTS.md`.** As linhas 230–233 (do
início do parágrafo "O **STATE é um ponteiro**" até o fim da linha 233, terminada em ";") são
substituídas pelo bloco abaixo. A linha 234 ("o **tamanho-alvo** do STATE é **config operacional**…")
em diante é preservada, com o "o" inicial passando a "O" por abrir frase.

```markdown
O **STATE é um ponteiro**: não guarda cadeia narrativa ("Antes…/Antes disso…") nem status por-item —
esses vazamentos são história (→ **histórico estruturado**) ou status (→ Issue/ledger). Este é o
**invariante** do estado (constitucional — muda só via G2). A **tabela de decisão história-vs-status**
é a fronteira canônica (ORION-0024, com a rota da história atualizada por ORION-0025):

| Linha típica | Vai para | Fica no STATE? |
|---|---|---|
| "T4.3 concluída no PR #63; fez X, corrigiu Y" (narrativa datada) | **PR mergeado** (L5) | Não |
| "#82 superseded por #103" (evento histórico) | **PR mergeado** (L5) | Não |
| "Última conclusão: #94 (PR #95)" (ponteiro de orientação) | — | **Sim** (1 linha) |
| "Agora: O7 concluído; sem tarefa ativa → replanejar" | — | **Sim** (Agora) |
| "Próximo passo: G1 do épico X" | — | **Sim** (Próximo passo) |
| Status de item (critérios/`passes`) | **Issue SDD** (L2, fonte da verdade); projeção → **ledger**; épico → **Milestone** | Não |
| Riscos/pendências **vivos**, navegação (estado _forward-looking_) | — | **Sim** |

```

**D2 — §2, após a linha 104: testes de aceite do outro modelo e classe.** O parágrafo das linhas
93–104 é preservado (com R1/R2 aplicados à linha 99). Entre a linha 104 e a linha em branco 105 (que
precede o "### 2.1") entram **uma linha em branco e os dois parágrafos**:

```markdown
**Testes de aceite do outro modelo.** Em todo PR, o revisor **deriva os testes de aceite de forma
independente** — da **mesma Issue** (na fast-lane issue-less, da descrição do PR leve + o critério de
aceite declarado) — e os avalia contra o diff. Num PR que altera **código de produto** (todo caminho fora
da lista de caminhos de harness do check `cross-model`; `docs/product/` é produto), isso é **verificado
por máquina**: o PR traz ao menos um **commit de teste de aceite** marcado pelo trailer
`Model-Authored-By` de um modelo **diferente** do que marcou a implementação, **antes** do primeiro
commit de implementação e **intacto** até o fim do PR; testes do próprio implementador e commits humanos
não contam como prova (ORION-0039, ORION-0040, ORION-0041). Num PR **só de harness**, a mesma exigência
vale quando o PR leva o rótulo `cross-model`. Ficam **isentos** da exigência — não da revisão
independente — a fast-lane T1, o T1 que cai no fluxo completo e as mudanças sem comportamento
observável (rótulo `cross-model:isento`, com justificativa no PR). O pipeline completo de contrato
(ORION-0030: testes aprovados e imutáveis antes da implementação, em T2+ com comportamento observável)
já está decidido e entra em vigor com a sua fatia de amarração; até lá, vale este parágrafo.

**Classe roteia o desfecho.** A concordância leva a **merge humano de rotina** só em **T1/T2**. **T3**
sempre escala ao humano, mesmo com concordância e testes verdes; **T4** é `blocked` — recusada, não
liberável por arbitragem, e **notificada** ao humano. A descorrelação de erros é **parcial**: o
protocolo pega erro de **implementação**, não de **intenção**; a Issue SDD bem especificada continua
sendo a alavanca (§5).
```

**D3 — §8.1, linhas 354–359: a convenção e2e por extenso.** As linhas 354–359 (do "Quando a tarefa
entrega **superfície de usuário observável**" até "…dispensam a e2e — justifique no PR.") são
substituídas por:

```markdown
Quando a tarefa entrega **superfície de usuário observável** (UI/API/CLI) **e** o risco justifica —
fluxo novo, mudança de contrato, correção de bug com comportamento observável —, a verificação de
correção inclui uma **verificação end-to-end com a ferramenta real** (convenção **opt-in por
tipo/risco**, ORION-0009): **UI** → automação de browser/MCP, exercendo a tela como usuário com os
componentes aprovados (§11.1); **API** → chamada ao endpoint real pela fronteira HTTP; **CLI** →
invocação do comando real pela shell, observando exit code, saída e efeitos — sempre o **contrato
público**, não unidade. A **evidência** da execução (log/exit code, screenshot ou gravação) é anexada
ao PR (integra o DoD, §12), **sem PII nem segredos** (§10). A e2e usa só ações **T0/T1** por padrão
(ler, dry-run, serviço efêmero local), sem tocar `main`, credenciais reais, dados de produção ou
ambientes externos sem gate. Tarefas sem superfície de usuário observável (docs/governança, refactor
interno, só memória/estado) dispensam a e2e — justifique no PR. Na dúvida sobre a aplicabilidade,
**suba de nível** (§11) e verifique.
```

**D4 — §4, linhas 245–247: nota desatualizada removida.** A linha em branco 245 e a nota das linhas
246–247 ("Os artefatos L1–L5 são criados na Fase 2…") são **removidas**; a linha 248 (em branco) passa
a separar o parágrafo "Núcleo L0" do "## 5.".

**D5 — rodapé, linhas 562–563.** Substituídas por:

```markdown
_Esta constituição evolui apenas via ADR aprovado (gate G2) no repositório central do Orion Harness.
Num projeto derivado, ela chega pela atualização do harness e não é editada localmente: as decisões do
projeto ficam em `docs/decisions/`, em sequência própria a partir de `0001`, e as regras próprias, na
extensão declarada do projeto. Decisões herdadas do Orion aparecem aqui só como proveniência
`ORION-NNNN`._
```

## Alternativas consideradas

- **Distribuir os ADRs do Orion junto com o pacote** (Zona B). Rejeitada: carrega 45+ documentos de
  deliberação interna em todo produto, conflita com a numeração própria do produto e contradiz a
  métrica do épico ("sem resíduo do Orion").
- **Proveniência com link absoluto para o repo central.** Rejeitada no G1 da #358 (Isa, 2026-10-07):
  amarra o produto a uma URL externa que pode mudar e mistura governança local com navegação para fora.
  O custo — no central, o leitor não clica até o ADR — é pequeno: `ORION-NNNN` resolve pelo índice.
- **Renomear os arquivos de ADR para `ORION-NNNN-*.md`.** Rejeitada: quebraria todos os links e
  referências de outros documentos, o índice gerado e os guards, sem ganho para o produto.
- **Manter a delegação e só trocar o link por proveniência.** Rejeitada: o link sumiria, mas a regra
  continuaria fora do `AGENTS.md` — exatamente o furo que esta decisão fecha.

## Consequências

- **Positivas.** O `AGENTS.md` passa a ser lido sozinho, no central e no produto. A sequência de ADR do
  produto não colide com a do Orion. O guard da 1c impede regressão de forma.
- **Negativas.** O `AGENTS.md` cresce (a tabela de D1 e os parágrafos de D2/D3, ~35 linhas, fora das
  seções do núcleo L0). A promessa de autossuficiência é **delimitada** (ponto 1): regras ativas de ADRs
  que o `AGENTS.md` não cita só entram com a varredura da #371. No central, há dois nomes para o mesmo ADR (`ORION-NNNN` no `AGENTS.md`,
  `ADR-NNNN` no resto) até a tarefa 3 do O16 (#365) tratar a Zona B.
- **Fora desta decisão** (registrado para não se perder):
  - `AGENTS.core.md` e `CLAUDE.md` também linkam o ORION-0019 — tarefa 3 (#365).
  - A §12 delega o ciclo do ledger ao `CONTRIBUTING.md#ciclo-do-ledger`; se o `CONTRIBUTING.md` não for
    distribuído, é outra delegação quebrada — a zona dele é decisão da tarefa 2 (#364).
  - Os ponteiros para `docs/examples/*.ts` e `tools/` mudam com o move da Zona A — tarefa 4 (#366).
  - Outras referências à construção do harness por fase ("Fase 4 do harness" na §2, "(Fase 4)" na §9,
    "(Fase 5)" na §10, "T2.3"/"T2.4" na §2.2) não são citação a ADR nem "Fase 2"; ficam fora do escopo da
    #358 e merecem follow-up próprio.

## Conformidade

- **Fatia 1b:** depois da aplicação, `grep -nE "ADR-[0-9]{4}|\]\(docs/decisions/" AGENTS.md` não
  retorna nada; cada linha do inventário confere com R1/R2 ou com o bloco D correspondente, comparada
  linha a linha no review; `scripts/smoke-test.sh` verde (inclui o anti-drift do núcleo L0 e o
  `coherence-guard`).
- **Fatia 1c:** o guard reprova link relativo para `docs/decisions/`, link absoluto para
  `/docs/decisions/` e menção `ADR-NNNN` no `AGENTS.md`, e aceita `ORION-NNNN` e a menção à pasta sem
  link — com teste de mordida para cada caso.
