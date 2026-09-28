# ADR-0035 — projetor de Projects usa PAT de menor privilégio para board user-owned

- **Status:** proposto  <!-- humano aprova (G2) → muda para: aceito -->
- **Data:** 2026-09-28
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** [ADR-0033](0033-flip-automatizado-lote-projects-derivado.md) **ponto 7** (identidade da automação) e a decisão de **escrita restrita ao projetor** · T10.3 (#272) · PRs #276/#279 · `.github/workflows/project-board.yml`

## Contexto

O [ADR-0033](0033-flip-automatizado-lote-projects-derivado.md) fixou como **normativo** que a escrita no
Project é **restrita ao projetor** e que a automação atua sob um **GitHub App** de **menor privilégio**
(ponto 7 + a decisão de escrita restrita ao projetor). A T10.3 (#272) implementou o projetor do board; no
**deploy** descobriu-se que um
**installation-token de GitHub App não alcança Projects v2 de conta de usuário** (o board é o **Project 7**,
de `isaiane` — conta **User**): `gh: Could not resolve to a ProjectV2 with the number 7`. Como paliativo,
o #279 trocou o token do projetor por um **PAT do usuário** (`PROJECTS_TOKEN`) — o que **funciona e foi
verificado ao vivo**, mas **desvia** do desenho "App + menor privilégio" que o ADR-0033 tornou normativo.
O PAT em uso hoje é **clássico** com escopo `repo` + `project` — **mais amplo** que o token downscoped do
App (o escopo `repo` é, inclusive, capaz de push/merge), o que é uma **regressão de menor privilégio** que
precisa de decisão de governança (o Codex sinalizou como dívida de conformidade, não redação — #281 P1).

A restrição do App não é contornável para board de conta de usuário: GitHub Apps de instalação de repo
não recebem acesso a Projects v2 **owned pela conta do usuário**. Migrar o board para uma **organização**
(onde o App alcança) seria mudança estrutural desproporcional ao ganho atual.

## Decisão

1. **Aceita-se um PAT como identidade do projetor** do board **quando o Project é owned por conta de
   usuário** (caso do Project 7) — **exceção explícita** ao "App projetor" do ADR-0033 (**ponto 7**),
   restrita a este caso; para board **org-owned**, o App do ADR-0033 permanece a regra.
2. **Menor privilégio é requisito DURO:** o token DEVE ser um **PAT fine-grained** com **apenas**
   **Projects: Read and write** (conta) + **Issues/Pull requests: Read** (repo) — **sem `Contents`** (o
   `checkout` usa o `GITHUB_TOKEN` automático; nenhuma chamada do projetor toca endpoint de conteúdo) e
   **sem** nenhuma permissão capaz de **merge/push**. Isso não é só higiene: é o que **efetivamente** impede
   a automação de integrar (ver ponto 3). Se o fine-grained for comprovadamente incapaz de ler Projects v2
   de usuário, **parar e escalar** (não relaxar para o clássico como norma).
3. **A fronteira "a automação não integra" depende de o TOKEN ser incapaz de merge** — o ruleset **não**
   basta aqui: um PAT **clássico com `repo`** autentica como o **próprio owner** (`isaiane`), que **precisa**
   poder mergear no perfil Solo; logo um ruleset que permite o owner mergear **também permite** um merge via
   esse PAT. Omitir comandos de merge do workflow é proteção **apenas procedural**. Portanto o requisito de
   token **read-only no repo** (ponto 2) é a proteção **real** de T3; a fronteira de merge do ADR-0033 (ponto
   7, via ruleset) vale para a **identidade separada** (App), não para um PAT do owner.
4. **O PAT clássico `repo` em uso hoje (#279) é uma EXPOSIÇÃO de T3, não um "transitório" confortável:**
   deve ser **substituído pelo fine-grained read-only o quanto antes**; enquanto persistir, é **dívida de
   segurança** declarada (o workflow não mergeia, mas o token **poderia**).
5. **Rotação/guarda são ato humano:** o secret `PROJECTS_TOKEN` é criado/rotacionado pelo owner. **Ausência**
   do secret deixa o projetor **inativo (no-op verde)** — guard `-z` já implementado. **Expiração/revogação**
   é diferente: o `GH_TOKEN` fica não-vazio, o guard **não** dispara, e a **primeira** chamada `gh` falha →
   **run vermelho** (retryable). O sinal de saúde é o **run falho** + o heartbeat; monitorar/escalar por aí
   (não há "inatividade graciosa" na expiração).
6. **Reconciliação do critério `F-0272-ce5006`:** o critério "escritor único (**App** projetor)" fica
   **superseditado por este ADR** (a palavra "App" é substituída por "projetor sob PAT de menor privilégio"
   para board user-owned) — a exclusão no `.orion/ledger-lifecycle.json` passa a citar **ADR-0035**, não
   "mal-redigido". O substantivo (escritor **único** + nativas de Status **off**) segue verificado ao vivo.
7. **Identidade-por-ator: exceção ACEITA para o perfil Solo.** O PAT autentica como o **próprio owner**
   (`isaiane`), não como ator de automação distinto — a auditoria do GitHub não separa ações do projetor
   das do humano, o que **desvia** de identidade-por-ator (o motivo do "App separado" do ADR-0033). Este
   desvio é **aceito explicitamente no G2** enquanto o perfil for **Solo** (ADR-0003): há **um único humano**,
   então a separação de identidade agrega pouco à auditoria hoje, e as alternativas de identidade distinta
   (conta-bot; org) são **desproporcionais** ao ganho atual. **Condição de reversão:** ao migrar para o
   perfil **Time** (2+ mantenedores / `CODEOWNERS`), esta exceção **cai** — adota-se um **ator de automação
   distinto** (conta-bot colaboradora do Project **ou** board org-owned sob App). Registrado como **dívida de
   identidade** declarada, não silenciada.

## Alternativas consideradas

- **Manter o App (ADR-0033 puro).** Rejeitada: tecnicamente **impossível** para Project de conta de
  usuário — o App não resolve o Project.
- **Conta-bot como ator distinto** (usuário GitHub separado, colaborador do Project 7, com PAT próprio).
  Adiada: dá identidade-por-ator + menor privilégio, mas gerir +1 conta é desproporcional no Solo; é o
  **upgrade** quando migrar para Time (ponto 7).
- **Migrar o board para uma organização.** Adiada: o App alcançaria (identidade própria, sem PAT), mas
  criar/migrar org é desproporcional agora; reconsiderável no perfil Time.
- **Manter `ce5006` pendente como dívida (opção B do owner).** Rejeitada em favor de decidir por ADR: a
  automação já está viva; a honestidade vem de **registrar a exceção no G2** + reduzir o privilégio do
  token, não de deixar a dívida sem decisão.
- **Auto-merge / afrouxar o ruleset.** Rejeitada (mantém o ADR-0033 §5/§7): a fronteira de merge segue
  humana e imposta por ruleset.

## Consequências

- **Positivas:** o board projetado (T10.3) fica **conforme** — a exceção é explícita, escopada a board
  user-owned, e o privilégio do token é reduzido ao mínimo. `F-0272-ce5006` reconcilia-se legitimamente.
- **Negativas/risco:** um PAT é credencial **pessoal** (não identidade de App) e **rotacionável à mão** —
  risco de **expiração/revogação** (o `GH_TOKEN` fica não-vazio, o guard `-z` **não** dispara e o run vai
  **vermelho** → monitorar/escalar pelo run falho; ver ponto 5) e de escopo excessivo (mitigado: fine-grained
  mínimo obrigatório — ponto 2; o clássico `repo` é **exposição a fechar**, ponto 4). *Segurança:* a
  não-integração **depende de o token ser read-only** (ponto 3) — o ruleset **não** basta para um PAT do
  owner; o workflow também não mergeia.
- **Identidade (dívida aceita, ponto 7):** o PAT autentica como o **próprio owner**, não como ator de
  automação distinto — a auditoria não separa projetor de humano. Exceção **aceita no G2 para o perfil
  Solo**; **cai** ao migrar para Time (conta-bot ou org). Declarada, não silenciada.
- **Confiança/observabilidade:** sem mudança nos gates (G1/G2/G3); o projetor continua a **abrir/escrever
  Status**, nunca integrar.

## Conformidade

- **Review/CI (§8.1):** o `project-board.yml` usa `secrets.PROJECTS_TOKEN` para as chamadas `gh` e **não**
  executa merge; a proteção **real** de não-integração é o **token ser read-only** (ponto 3) — o ruleset não
  basta para um PAT do owner.
- **Menor privilégio:** a fatia de aplicação **substitui** o PAT clássico pelo **fine-grained mínimo**
  (Projects r/w + Issues/PRs read; **sem** Contents nem merge). Verificável na descrição do PAT (ato humano
  documentado no runbook). Manter o clássico não é caminho aceito — é exposição a fechar (ponto 4).
- **Ledger:** a exclusão de `F-0272-ce5006` no `.orion/ledger-lifecycle.json` cita **ADR-0035** (superseded
  por decisão, não "mal-redigido").
- **ADR-0033:** recebe **nota de cabeçalho** de supersedência **parcial** (§7, para board user-owned)
  apontando para este ADR; texto histórico preservado (append-only).

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho do antigo. -->
