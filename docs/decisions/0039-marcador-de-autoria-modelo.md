# ADR-0039 — marcador de autoria-modelo nos commits: trailer `Model-Authored-By` (aditivo ao ADR-0018)

- **Status:** proposto
- **Data:** 2026-10-02
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** **aditivo** ao [ADR-0018](0018-revisao-cross-model.md) (não o reverte nem supersede) ·
  [ADR-0030](0030-pipeline-spec-tests-implementation.md) (ordem spec → testes → implementação; §8 — agentes
  entram por Actions oficiais) · spike
  **#270** (PR #271, fechado sem merge) · épico **O12**
  ([#17](https://github.com/isaiane/OrionHarness/milestone/17)), Issue **#320** · **precede** a tarefa 2 do
  O12 (enforcer)

## Contexto

O ADR-0018 fixa a revisão cross-model: o modelo revisor **autora os testes de aceite** e o implementador os
faz passar **sem editá-los**; a autorrevisão é proibida. A conformidade é **atestada pelo revisor**
(§Conformidade do 0018) — não há sinal que uma máquina consiga ler.

O spike #270 provou o fluxo ponta a ponta (o Codex autorou os testes só a partir dos critérios da Issue; a
implementação foi até o verde sem editar os testes) e revelou o bloqueio:

- o connector do Codex **commita sob a identidade humana** — o git author dos testes é a mantenedora, não o
  modelo. "Autor dos testes ≠ implementador" **não é distinguível pelo git author**;
- o connector é **advisory**: roda a tarefa na nuvem e a humana materializa o commit ("Create PR"); o
  **conteúdo e a mensagem** do commit, porém, são gerados pelo modelo a partir do pedido no PR;
- o fluxo do spike (`@codex` no PR + connector) é **artesanal**: o
  [ADR-0030](0030-pipeline-spec-tests-implementation.md) §8 (aceito) exige que os agentes entrem por **Actions
  oficiais** (`openai/codex-action`, `anthropics/claude-code-action`) num workflow com prompt versionado e
  permissões declaradas, e reserva o `@codex review` gerenciado para revisar o PR final;
- `Co-Authored-By` já existe nos commits do agente, mas tem semântica de **coautoria humana** no GitHub
  (nome + e-mail, atribuição no perfil) — não serve para registrar o papel de um modelo.

## Decisão

**1. Formato.** A autoria-modelo é registrada por um **git trailer** na mensagem do commit:

```text
Model-Authored-By: <modelo>
```

`<modelo>` vem de uma **lista fechada** de identificadores canônicos, **sem versão**:

| Valor | Modelo |
|---|---|
| `claude` | Claude (Anthropic) — qualquer versão ou superfície (API, Claude Code) |
| `codex` | Codex (OpenAI) — qualquer versão ou superfície (`codex-action`, CLI) |
| `gpt` | GPT (OpenAI) — qualquer versão ou superfície |

A comparação é **por identificador**, na granularidade do L0 — "um **modelo distinto**" (`AGENTS.md` §2,
ADR-0018): `codex` ≠ `gpt` contam como distintos; versões ou superfícies do mesmo identificador, não. Este ADR
**não** muda o contrato de independência — só o torna legível por máquina. Valor **fora da lista** é
**inválido** — o enforcer o rejeita, sem normalizar (Codex #322: grafias livres equivalentes, como `openai` ou
`claude-code`, pareceriam modelos distintos). Um commit tem **no máximo um** `Model-Authored-By`. **Ampliar a
lista** (novo modelo) é emenda deste ADR (G2).

**2. Quem injeta e onde — o workflow da Action oficial.** Alinhado ao ADR-0030 §8, o trailer é escrito
pelo **workflow** que roda o agente, não pedido ao modelo:

- **testes de aceite:** o workflow que roda o `openai/codex-action` commita os testes com a **identidade de
  bot do workflow** e escreve `Model-Authored-By: codex` — **sempre**, porque o workflow sabe qual modelo
  rodou. Não há omissão a consertar nem histórico a reescrever;
- **implementação:** o workflow do implementador (ex.: `anthropics/claude-code-action`) faz o mesmo com o
  seu identificador; um agente local que implementa (ex.: Claude Code na sessão da mantenedora) escreve o
  trailer nos seus commits.

O workflow do `codex-action` ainda **não existe** no repo; criá-lo é pré-requisito do enforcer (ponto 4).

**3. Proveniência: autenticada × declarada.** O trailer vale como **prova** quando o commit vem da
**identidade de bot do workflow** da Action — o GitHub atesta quem empurrou o commit, e o run do workflow
fica registrado. Trailer num commit de **identidade humana** (ou de agente local) é **atestação declarada,
não autenticada**: qualquer um escreve qualquer string. O enforcer pode aceitá-la só onde a regra admitir
exceção, e **declara** que é atestação. `Model-Authored-By: X` afirma que o **conteúdo** do commit foi
**gerado pelo modelo X** no papel de **autor** daquele artefato; edição posterior de um teste por **outro**
modelo é um commit **dele**, com o trailer **dele** — é isso que o enforcer detecta.

**4. Precede o enforcer; o registro que vale são os commits do PR.** A tarefa 2 do O12 **lê este trailer**
para verificar, **no PR e antes do merge**, que o modelo dos commits de teste ≠ o modelo dos commits de
implementação. O **registro autoritativo** são os **commits do PR** (preservados no histórico do PR mesmo
após o merge), **não** o commit de squash da `main` — o squash junta testes e implementação num commit só e
não carrega a proveniência. Este ADR **não** define o check, o predicado de superfície, nem o que bloqueia —
só o marcador que o check consome.

**5. Limite declarado.** A garantia vem da **identidade do workflow** (ponto 3), não do trailer em si nem
da revisão humana: a revisão no merge **não** prova qual modelo gerou um commit. Fora do fluxo da Action, o
marcador é atestação declarada — útil para conferir, não para provar.

**6. Questão em aberto (não decidida aqui).** No spike, a revisão do Codex pegou um erro **no próprio
critério** da Issue. O ADR-0018 declara capturar erros de **implementação**, não de **intenção**. Se essa
observação amplia o escopo do 0018 para erros de intenção fica para **decisão à parte**; este ADR não a toma.

## Alternativas consideradas

- **Git author/committer como sinal.** Rejeitada: o spike mostrou que o connector commita como a humana —
  o sinal não distingue modelos.
- **Identificador livre** ("minúsculas, sem versão"). Rejeitada (Codex #322): grafias honestas e
  equivalentes (`codex`/`openai`, `claude`/`claude-code`) pareceriam modelos distintos — o enforcer não
  normaliza. A lista fechada é inequívoca.
- **Comparar por fornecedor** (`anthropic`/`openai`). Rejeitada (Codex #322): mais rígida que o L0 ("modelo
  distinto") — `codex` × `gpt` seriam o "mesmo modelo" — e mudaria o contrato do ADR-0018, que este ADR só
  torna verificável. Endurecer a independência exigiria emendar o `AGENTS.md` (G2), fora do escopo.
- **Reusar `Co-Authored-By`.** Rejeitada: semântica de coautoria humana (atribuição no GitHub, e-mail);
  misturar papéis de modelo com coautores confunde o enforcer e o perfil.
- **O próprio modelo escreve o trailer, pedido no `@codex` do PR** (1ª versão deste ADR). Rejeitada (Codex
  #322): é o fluxo artesanal que o ADR-0030 §8 substitui; omissão não tem conserto (a mensagem de commit é
  imutável e reescrever histórico é vedado); e o trailer seria só declarado, nunca autenticado.
- **Action que reescreve os commits do PR para injetar o trailer.** Rejeitada: intrusivo, e a Action não
  saberia **quem** gerou o conteúdo — o certo é o workflow que **rodou** o modelo escrever no ato.
- **Vários trailers no commit de squash.** Rejeitada: o squash é feito no merge, fora do workflow que
  conhece a autoria; o registro do PR já preserva a proveniência por commit.
- **Marcador fora do commit** (rótulo ou comentário no PR). Rejeitada: não acompanha o artefato — commits
  podem ser trazidos de outro PR (fast-forward, cherry-pick) e o rótulo não diz **quais** commits são de quem.

## Consequências

- **Positiva:** "autor dos testes ≠ implementador" ganha um sinal que um check lê e, no fluxo da Action, que o
  GitHub **autentica** (identidade do workflow); a conformidade do 0018 sobe de *atestada pelo revisor* para
  *verificável por máquina*.
- **Positiva:** coerente com o ADR-0030 §8 — um mecanismo só para gerar testes, sem fluxo paralelo.
- **Negativa:** depende de um workflow que **ainda não existe** (`codex-action` com prompt versionado);
  o O12 ganha esse pré-requisito antes do enforcer.
- **Negativa:** commits fora do fluxo da Action (agente local, humano) só têm atestação declarada (ponto 5).
- **Neutra:** os commits do agente passam a carregar `Model-Authored-By` além do `Co-Authored-By` (aplicação
  fora deste ADR).

## Conformidade

- **G2:** revisão humana deste ADR contra o ADR-0018, o ADR-0030 §8 e os achados do spike #270.
- **Tarefa 2 do O12:** o enforcer lê `Model-Authored-By` exatamente no formato do ponto 1, aceita só os
  valores da lista fechada e compara por identificador (ponto 1); distingue proveniência autenticada (commit
  do workflow) de declarada (ponto 3); confere os commits do PR antes do merge, não o squash (ponto 4).
- **Pré-requisito:** o workflow do `codex-action` (ADR-0030 §8) commita os testes com a identidade do bot e o
  trailer (ponto 2).
- **Append-only:** o ADR-0018 recebe só uma **nota no cabeçalho** apontando para este ADR; o texto da decisão
  histórica não é editado.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho deste. -->
