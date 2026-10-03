# ADR-0040 — v1 do cross-model executável: testes pelo `@codex` no PR, trailer declarado (emenda ADR-0030 §8 e ADR-0039)

> **Complementado por [ADR-0041](0041-testes-cross-model-obrigatorios-no-produto.md)** (efetivo com o aceite do
> 0041 no G2): define **onde** os testes do outro modelo são obrigatórios — PR de produto sempre; PR de harness
> só com o rótulo `pipeline:contract`. O texto abaixo não foi editado.

- **Status:** aceito  <!-- G2 aprovado pelo owner (Isa) em 2026-10-03 -->
- **Data:** 2026-10-03 (proposto e aceito no G2)
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** **emenda, para a v1,** o [ADR-0030](0030-pipeline-spec-tests-implementation.md) §8 (agentes
  por Actions oficiais) e o [ADR-0039](0039-marcador-de-autoria-modelo.md) pontos 2–3 (trailer escrito pelo
  workflow; proveniência rastreável) · [ADR-0018](0018-revisao-cross-model.md) (cross-model) · spike **#270** ·
  épico **O12** ([#17](https://github.com/isaiane/OrionHarness/milestone/17)), Issue **#324** · **precede** a
  tarefa 3 do O12 (enforcer)

## Contexto

O ADR-0039 fixou o trailer `Model-Authored-By` e, alinhado ao ADR-0030 §8, mandou os testes de aceite virem
de um workflow com a Action oficial (`openai/codex-action`). Esse workflow não existe: exige chave paga da
OpenAI e puxa junto as garantias do pipeline do ADR-0030 (contrato imutável, RED verificado, suítes
separadas, escopo cercado no CI), ainda não implementadas. Exigir tudo isso antes do enforcer adia a
verificação por máquina por um épico inteiro.

O spike #270 provou um caminho que já funciona, sem custo extra: o `@codex` no PR (connector) autora os
testes a partir dos critérios da Issue; a mantenedora materializa o commit ("Create PR"); o agente traz o
commit para a branch da tarefa e implementa sem editar os testes. Isa decidiu adotar esse caminho na
**primeira versão**.

## Decisão

**1. Caminho admitido na v1.** O `@codex` no PR (connector) é caminho **admitido** de autoria dos testes
de aceite. O pedido aponta a Issue como fonte única dos critérios, o arquivo-alvo e "não implemente a
lógica", e **instrui** o Codex a incluir no commit:

```text
Model-Authored-By: codex
```

O implementador (hoje o Claude) marca os seus commits com `Model-Authored-By: claude`. Formato e lista
fechada seguem o ADR-0039 ponto 1.

**2. Identidade e força da prova.** O commit dos testes sai na **identidade da mantenedora** (é assim que o
connector commita). O trailer vale como **atestação declarada** — a mesma confiança de hoje, agora legível
por máquina. Não há `Model-Run` nem rastreio até um run de workflow nesta versão.

**3. Onde o commit entra, e ausência do trailer.** O pedido `@codex` é feito no **PR de contrato**
(`tests/issue-N`, ADR-0030 §11), e o PR do connector ("Create PR") tem essa branch como **base**. O resto do
ADR-0030 segue valendo: o contrato passa pela **revisão humana** e é fixado antes da implementação, e a
implementação parte dele (§§2, 5, 11) — este ADR muda **só o §8** (quem roda o autor dos testes). Se o
trailer faltar, o commit do Codex **não** entra na branch de contrato: pede-se de novo ao Codex, e só o
commit **com** o trailer entra. Nada de reescrever histórico. O implementador **nunca** escreve o trailer de
outro modelo.

**4. Versão futura.** A Action oficial (ADR-0030 §8), o `Model-Run` rastreável (ADR-0039 pontos 2–3) e um
**owner próprio** para os commits de teste são a evolução prevista. Quando entrarem, um novo ADR encerra
esta v1 e as regras do ADR-0030 §8 e do ADR-0039 voltam a valer por inteiro para a autoria dos testes.

**5. O que não muda.** Lista fechada e comparação por identificador (ADR-0039 ponto 1); registro que vale =
commits do PR antes do merge (ADR-0039 ponto 4); independência e autorrevisão proibida (ADR-0018); `@codex
review` segue revisando o PR final.

## Alternativas consideradas

- **Implementar já o workflow `codex-action`** (ADR-0039 como está). Rejeitada para a v1: chave paga, prompt
  a manter e o pipeline do ADR-0030 junto — um épico antes de qualquer verificação por máquina.
- **Pausar o O12.** Rejeitada por Isa: o caminho do spike já funciona e entrega a verificação agora.
- **Owner próprio (conta ou App) já na v1.** Rejeitada para a v1: o connector commita como o usuário; trocar a
  identidade exige outro mecanismo. Fica para a versão futura.

## Consequências

- **Positiva:** o enforcer (tarefa 3) pode ser construído já, sem chave paga nem workflow novo.
- **Positiva:** usa o fluxo provado no spike #270.
- **Negativa:** a prova é **declarada** (o commit é da mantenedora; qualquer um escreve qualquer trailer) —
  aceito conscientemente na v1.
- **Negativa:** depende de a mantenedora materializar o commit do Codex e de o Codex obedecer à instrução;
  omissão ⇒ refazer o pedido (ponto 3).

## Conformidade

- **G2:** revisão humana deste ADR contra o ADR-0030 §8, o ADR-0039 e o spike #270.
- **Notas append-only:** o ADR-0030 recebe nota **no fim** (convenção daquele arquivo) e o ADR-0039 nota **no
  cabeçalho**, apontando este ADR; as decisões não são editadas.
- **Tarefa 3 do O12 (o enforcer):** trata o trailer como atestação declarada (ponto 2), **não** confere
  `Model-Run` na v1 e bloqueia o commit de teste sem marcador onde a regra exige.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho deste. -->
