# ADR-0035 — projetor de Projects usa PAT de menor privilégio para board user-owned

- **Status:** proposto  <!-- humano aprova (G2) → muda para: aceito -->
- **Data:** 2026-09-28
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** [ADR-0033](0033-flip-automatizado-lote-projects-derivado.md) §7 (identidade da automação) e §108-110 (escrita restrita ao projetor) · T10.3 (#272) · PRs #276/#279 · `.github/workflows/project-board.yml`

## Contexto

O [ADR-0033](0033-flip-automatizado-lote-projects-derivado.md) fixou como **normativo** que a escrita no
Project é **restrita ao projetor** e que a automação atua sob um **GitHub App** de **menor privilégio**
(§7, §108-110). A T10.3 (#272) implementou o projetor do board; no **deploy** descobriu-se que um
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
   usuário** (caso do Project 7) — **exceção explícita** ao "App projetor" do ADR-0033 §7, restrita a este
   caso; para board **org-owned**, o App do ADR-0033 permanece a regra.
2. **Menor privilégio é obrigatório:** o token DEVE ser um **PAT fine-grained** com **apenas**:
   **Projects: Read and write** (conta) + **Contents/Issues/Pull requests: Read** (repo) — **sem** escopo
   capaz de merge/push. O **PAT clássico com `repo`** hoje em uso é **transitório** e deve ser
   **substituído** pelo fine-grained na fatia de aplicação (se o fine-grained for comprovadamente incapaz
   de ler Projects v2 de usuário, registrar o motivo e manter o clássico com o **mínimo** de escopos, como
   dívida documentada).
3. **A fronteira "a automação não integra" NÃO se apoia no escopo do token** (o PAT pode ser
   write-capable): permanece imposta pelo **branch ruleset** da `main` (como no ADR-0033 §7) e pelo fato de
   o workflow projetor **não** executar merge. O projetor só lê o repo e escreve **Status** no Project.
4. **Rotação/guarda são ato humano:** o secret `PROJECTS_TOKEN` é criado/rotacionado pelo owner; sua
   ausência deixa o projetor **inativo (no-op)**, nunca inseguro (guard já implementado).
5. **Reconciliação do critério `F-0272-ce5006`:** o critério "escritor único (**App** projetor)" fica
   **superseditado por este ADR** (a palavra "App" é substituída por "projetor sob PAT de menor privilégio"
   para board user-owned) — a exclusão no `.orion/ledger-lifecycle.json` passa a citar **ADR-0035**, não
   "mal-redigido". O substantivo (escritor **único** + nativas de Status **off**) segue verificado ao vivo.

## Alternativas consideradas

- **Manter o App (ADR-0033 puro).** Rejeitada: tecnicamente **impossível** para Project de conta de
  usuário — o App não resolve o Project.
- **Migrar o board para uma organização.** Adiada: o App alcançaria, mas criar/migrar org é
  desproporcional agora; reconsiderável se o repo virar org (já há nota no STATE sobre perfil Time).
- **Manter `ce5006` pendente como dívida (opção B do owner).** Rejeitada em favor de decidir por ADR: a
  automação já está viva; a honestidade vem de **registrar a exceção no G2** + reduzir o privilégio do
  token, não de deixar a dívida sem decisão.
- **Auto-merge / afrouxar o ruleset.** Rejeitada (mantém o ADR-0033 §5/§7): a fronteira de merge segue
  humana e imposta por ruleset.

## Consequências

- **Positivas:** o board projetado (T10.3) fica **conforme** — a exceção é explícita, escopada a board
  user-owned, e o privilégio do token é reduzido ao mínimo. `F-0272-ce5006` reconcilia-se legitimamente.
- **Negativas/risco:** um PAT é credencial **pessoal** (não identidade de App) e **rotacionável à mão** —
  risco de expiração (mitigado: guard deixa o projetor inativo, não quebrado) e de escopo excessivo
  (mitigado: exigência de fine-grained mínimo; clássico `repo` é transitório). *Segurança:* a não-integração
  não depende do token — é **ruleset** + workflow que não mergeia.
- **Confiança/observabilidade:** sem mudança nos gates (G1/G2/G3); o projetor continua a **abrir/escrever
  Status**, nunca integrar.

## Conformidade

- **Review/CI (§8.1):** o `project-board.yml` usa `secrets.PROJECTS_TOKEN` para as chamadas `gh` e **não**
  executa merge; a fronteira de não-integração é verificável no **ruleset** (não no escopo do token).
- **Menor privilégio:** a fatia de aplicação troca o PAT clássico pelo **fine-grained mínimo** (ou registra
  o motivo de manter o clássico com escopo mínimo). Verificável na descrição do secret/PAT (ato humano
  documentado no runbook).
- **Ledger:** a exclusão de `F-0272-ce5006` no `.orion/ledger-lifecycle.json` cita **ADR-0035** (superseded
  por decisão, não "mal-redigido").
- **ADR-0033:** recebe **nota de cabeçalho** de supersedência **parcial** (§7, para board user-owned)
  apontando para este ADR; texto histórico preservado (append-only).

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho do antigo. -->
