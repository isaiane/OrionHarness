# ADR-0039 — marcador de autoria-modelo nos commits: trailer `Model-Authored-By` (aditivo ao ADR-0018)

- **Status:** proposto
- **Data:** 2026-10-02
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** **aditivo** ao [ADR-0018](0018-revisao-cross-model.md) (não o reverte nem supersede) ·
  [ADR-0030](0030-pipeline-spec-tests-implementation.md) (ordem spec → testes → implementação) · spike
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
- `Co-Authored-By` já existe nos commits do agente, mas tem semântica de **coautoria humana** no GitHub
  (nome + e-mail, atribuição no perfil) — não serve para registrar o papel de um modelo.

## Decisão

**1. Formato.** A autoria-modelo é registrada por um **git trailer** na mensagem do commit:

```text
Model-Authored-By: <família>
```

`<família>` é o identificador **da família do modelo**, em minúsculas e sem versão (ex.: `codex`, `claude`).
A comparação é por família — duas versões da mesma família **não** contam como modelos distintos (o ADR-0018
exige independência de modelo, e versões de uma família compartilham o viés que o protocolo quer evitar). Um
commit tem **no máximo um** `Model-Authored-By`.

**2. Quem injeta e onde.** O **próprio modelo autor** escreve o trailer na mensagem do **commit que ele
gera**:

- **testes de aceite** (revisor, ex.: Codex): o pedido `@codex` no PR **instrui** a incluir
  `Model-Authored-By: codex` no commit dos testes — a mensagem é gerada pelo modelo, então o trailer nasce com
  o artefato, sem reescrever histórico;
- **implementação** (implementador, ex.: Claude): o agente inclui `Model-Authored-By: claude` nos seus
  commits, junto do `Co-Authored-By` que já usa.

Sem Action que reescreva commits e sem passo manual extra da humana no fluxo normal. Se o modelo omitir o
trailer, o commit fica **sem marcador** — a tarefa 2 trata a ausência como falha (fail-closed onde o
protocolo exige cross-model); o caminho de correção é **pedir de novo ao modelo autor**, nunca o
implementador escrever o trailer de outro modelo.

**3. Semântica.** `Model-Authored-By: X` afirma que o **conteúdo** do commit foi **gerado pelo modelo X** no
papel de **autor** daquele artefato (não como revisor de outro conteúdo). Commit materializado pela humana a
partir da tarefa do modelo (o "Create PR" do connector) conta como autoria do modelo. Commit **sem** o
trailer não tem autoria-modelo declarada. Edição posterior de um arquivo de teste por **outro** modelo é um
commit **dele**, com o trailer **dele** — é isso que o enforcer detecta.

**4. Precede o enforcer.** A tarefa 2 do O12 **lê este trailer** para verificar, no PR, que a família dos
commits de teste ≠ a família dos commits de implementação. Este ADR **não** define o check, o predicado de
superfície, nem o que bloqueia — só o marcador que o check consome.

**5. Limite declarado.** O trailer torna a regra **verificável por máquina**, não **infalsificável**:
qualquer autor de commit pode escrever qualquer trailer. A garantia contra falsificação continua sendo a
**revisão humana no merge** (T3) e o histórico auditável do PR — o marcador troca "confiar na atestação" por
"conferir um sinal explícito", não por prova criptográfica.

**6. Questão em aberto (não decidida aqui).** No spike, a revisão do Codex pegou um erro **no próprio
critério** da Issue. O ADR-0018 declara capturar erros de **implementação**, não de **intenção**. Se essa
observação amplia o escopo do 0018 para erros de intenção fica para **decisão à parte**; este ADR não a toma.

## Alternativas consideradas

- **Git author/committer como sinal.** Rejeitada: o spike mostrou que o connector commita como a humana —
  o sinal não distingue modelos.
- **Reusar `Co-Authored-By`.** Rejeitada: semântica de coautoria humana (atribuição no GitHub, e-mail);
  misturar papéis de modelo com coautores confunde o enforcer e o perfil.
- **Action que injeta o trailer** (reescreve os commits do PR). Rejeitada: reescrever histórico de PR é
  intrusivo, e a Action não sabe **quem** gerou o conteúdo — só repetiria o que alguém declarou.
- **Humano-no-loop escreve o trailer** ao materializar o commit. Rejeitada como caminho normal: adiciona um
  passo manual a cada PR e não está disponível na UI do "Create PR"; o modelo já gera a mensagem.
- **Marcador fora do commit** (rótulo ou comentário no PR). Rejeitada: não acompanha o artefato — commits
  podem ser trazidos de outro PR (fast-forward, cherry-pick) e o rótulo não diz **quais** commits são de quem.

## Consequências

- **Positiva:** a regra "autor dos testes ≠ implementador" passa a ter um **sinal explícito** que um check
  lê; a conformidade do 0018 sobe de *atestada pelo revisor* para *verificável por máquina*.
- **Positiva:** sem infraestrutura nova — só uma convenção de mensagem de commit e uma instrução no pedido ao
  modelo.
- **Negativa:** depende de o modelo **obedecer** à instrução; omissão ⇒ commit sem marcador (o enforcer
  bloqueia e o pedido é refeito).
- **Negativa:** forjável por quem escreve o commit — mitigado pela revisão humana no merge (ponto 5).
- **Neutra:** os commits do agente passam a carregar `Model-Authored-By` além do `Co-Authored-By`; a skill e
  o pedido padrão ao Codex ganham a instrução quando a tarefa 2 entrar (aplicação fora deste ADR).

## Conformidade

- **G2:** revisão humana deste ADR contra o ADR-0018 e os achados do spike #270.
- **Tarefa 2 do O12:** o enforcer lê `Model-Authored-By` exatamente no formato do ponto 1 e compara por
  família (ponto 1); trata ausência conforme o ponto 2; não promete infalsificabilidade (ponto 5).
- **Append-only:** o ADR-0018 recebe só uma **nota no cabeçalho** apontando para este ADR; o texto da decisão
  histórica não é editado.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho deste. -->
