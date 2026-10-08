# ADR-0047 — Distribuição como pacote + CLI e partição em zonas

> Architecture Decision Record (`AGENTS.md` §3, gate G2). ADRs são **append-only**: uma decisão
> revista não é apagada — cria-se um novo ADR que a substitui.
>
> **Ao criar um ADR — ou mudar seu número/título/status/nome —, regenere o índice** e commite o
> `README.md`: `node --experimental-strip-types tools/adr/adr-index.ts --write`
> ([ADR-0023](0023-indice-gerado-de-adrs.md)).

- **Status:** aceito  <!-- G2: aprovado por Isa (owner) em 2026-10-08 (PR #379) -->
- **Data:** 2026-10-08 (proposto e aceito no G2)
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** Issue #364 (O16.2, ADR A), épico **O16** (Milestone #21);
  **supersede parcialmente** [ADR-0001](0001-fundacoes-do-orion-harness.md) (só a distribuição "GitHub
  template repository" do item 1) e [ADR-0021](0021-bootstrap-ledger-origem-local.md) (só para produtos
  gerados pelo `orion new`); **emenda** [ADR-0041](0041-testes-cross-model-obrigatorios-no-produto.md)
  ponto 4 (lista de caminhos de harness no produto); [ADR-0046](0046-constituicao-autossuficiente-adr-como-proveniencia.md)
  (proveniência `ORION-NNNN`); o empacotamento executável é do ADR B da #364 (ADR irmão)

## Contexto

O Orion Harness é distribuído como **GitHub template repository** (ADR-0001 item 1). "Use this template"
não é fork: o repo do produto nasce sem ancestral comum com o Orion, `git merge upstream/main` falha
(*unrelated histories*) e uma correção que entra no Orion depois do clone **não chega** ao produto. O
produto também herda tudo — ADRs, ledger, estado e história do Orion.

O épico O16 troca esse modelo por **pacote + CLI** (`orion`), separando o **repositório central**
(autoridade do harness) da **instância no produto** (só o necessário para implementar e evoluir o
produto). Antes de empacotar (tarefa 4), gerar (5), congelar (6) ou atualizar (7), é preciso fixar o
que vai para onde, em que formato o produto declara o que recebeu e como o produto acrescenta regra
própria sem editar o que é do harness.

Levantamento (HEAD `64e0f88`, 2026-10-08): 173 arquivos rastreados. Só os candidatos óbvios à Zona B
somam 25; a meta "menos de 20" do Milestone não cabe sem quebrar links da constituição. As cinco
escolhas de desenho deste ADR foram apresentadas com alternativas e decididas por Isa em 2026-10-08.

## Decisão

**1. Modelo de distribuição.** O harness deixa de ser distribuído como template repository e passa a
ser um **pacote instalável e atualizável pelo CLI `orion`**. O caminho de **ida** (central → produto) é
o `orion update`; o de **volta** não é merge: o produto propõe mudança de harness abrindo **Issue no
repositório central**. Supersede só a distribuição do ADR-0001 item 1; o resto do ADR-0001 permanece.
**Vigência:** a substituição vale a partir da **primeira versão publicada do pacote** (`orion new`
funcionando, tarefas 4–5). Até lá, o template repository continua sendo o caminho oficial de onboarding
— o `README.md` e o `getting-started` seguem válidos — para que sempre exista uma rota usável.

**2. Fase 0.** O canal é o `npx` direto do GitHub — sem publicação em registro e sem token. O **repo
central é o próprio pacote** (`bin`/`files` no `package.json` da raiz, implementados na tarefa 4) e o
binário se chama **`orion`**, com os comandos **`new`**, **`validate`**, **`doctor`** e **`update`**.

**Identidade imutável da versão.** Uma tag pode ser movida ou recriada; por isso a versão instalada é
identificada pelo par **versão + SHA do commit**. No `orion new` e no `orion update`, o CLI resolve a tag
`vX.Y.Z` para o SHA do commit (a rede já está presente, porque o `npx` baixa o pacote) e **fixa o SHA**
nos shims (`npx github:isaiane/OrionHarness#<sha>`) e no `.orion/harness.json`. Depois disso, mover a
tag não muda o que o produto executa. O `orion doctor` reprova shim cujo SHA difere do `harness.json`. Como defesa extra, o
repo central protege as tags `v*` contra mover e apagar (regra do GitHub, ato humano). O
`package.json` do produto **não** declara o harness como dependência. O contrato do CLI é de **processo** (comandos, exit codes, arquivos em disco), nunca
import de módulo. Como as ferramentas rodam a partir de `node_modules` é decisão do **ADR B**.

**3. Quatro zonas.** Todo arquivo rastreado do central pertence a exatamente uma zona:

- **A — pacote:** o que roda, constrói ou é consumido pelo harness (`tools/`, `docs/examples/`,
  `scripts/`, `presets/`, `skills/`, `package.json` e as configs de build/teste do central). **Não fica**
  no repo do produto.
- **B — gerenciado:** fica no repo do produto **porque tem um leitor que só o encontra ali** — o agente
  (constituição e o que ela linka), o GitHub (workflows, templates, rótulos) ou uma ferramenta que lê a
  raiz (`.pre-commit-config.yaml`, `commitlint.config.js`, `.editorconfig`). Substituído no
  `orion update`; congelado pelo freeze guard (tarefa 6).
- **C — semente do produto:** copiado **uma vez** pelo `orion new` e daí em diante do produto
  (`docs/product/`); o update nunca toca.
- **D — só do central:** nunca distribuído — ADRs, ledger, estado, história e Milestones do Orion.
  Alguns caminhos de D **existem no produto com conteúdo próprio**, gerado pelo `orion new`
  (`STATE.md`, `PLAN.md`, `CHANGELOG.md`, `MEMORY.md`, `feature-ledger.json`, `.orion/*`, `README.md`,
  `LICENSE`, `CODEOWNERS`, `SECURITY.md`, `init.sh`, `.env.example`, `.gitignore`, `.gitleaksignore`,
  `.nvmrc`, `.github/dependabot.yml`, `docs/getting-started.md`): no central são D; no produto são C.

**Regra de fechamento por links.** Arquivo da Zona B só linka arquivo que também existe no produto:
Zona B, Zona C ou contraparte gerada de D. Link para a **pasta** `docs/decisions/` é permitido — no
produto ela guarda os ADRs do próprio produto (ADR-0046 ponto 3).

**A lista concreta é o manifesto** [`tools/distribution/zones.json`](../../tools/distribution/zones.json),
revisado neste mesmo PR. Este ADR fixa as regras; não repete a lista em prosa (uma segunda cópia
derivaria). Mudar a zona de um arquivo é mudança do manifesto, revisada no PR que a faz; mudar uma regra
ou o teto é emenda deste ADR (G2). Na abertura: **A 67, B 25, C 4, D 77**.

**4. Teto da Zona B: 30 arquivos.** O número vale como alarme, não como meta: o check da fatia 2b
reprova a Zona B acima de 30, e subir o teto é emenda deste ADR. Os quatro runbooks de integração
(`docs/runbooks/`) **não** entram na Zona B: viram **um** guia de configuração gerenciado (tarefa 5),
que conta 1. Reduzir mais — por exemplo, juntar os quatro workflows `flip-*` em menos shims — é
oportunidade da tarefa 4, não requisito.

**5. `.orion/harness.json` e manifesto da versão.**

- O produto declara a instalação em `.orion/harness.json`: `version` (a versão instalada), `commit`
  (o SHA dela, o mesmo fixado nos shims),
  `managed` (mapa `caminho → sha256` dos arquivos da Zona B) e `extensions` (arquivos de extensão
  declarados, sem interseção com `managed`). O schema é entregue na fatia 2b.
- A **fonte da verdade** do que é gerenciado e dos hashes é o **manifesto da versão dentro do pacote**
  (`manifests/<versão>.json`: `version`, `managed`, algoritmo do hash e normalização). O `harness.json`
  do produto é uma **declaração conferida contra** esse manifesto — versão igual à do manifesto, commit
  igual ao fixado nos shims,
  `managed` igual ao do pacote, `extensions` sem interseção. Um PR do produto que altere um gerenciado e
  "corrija" o hash no `harness.json` não engana o freeze guard (tarefa 6).
- **Normalização antes do hash:** conteúdo em UTF-8 com fim de linha convertido para LF; sha256 sobre
  os bytes resultantes. O produto recebe um `.gitattributes` gerenciado com `eol=lf` para a Zona B.
- **Manifestos históricos:** o pacote carrega o manifesto de **cada versão publicada**, então a versão
  nova confere a instalada **sem rede**. O manifesto de uma versão entra no **mesmo PR que prepara a
  publicação** daquela versão (antes da tag, que é ato humano); um check do central reprova a
  publicação sem o manifesto da versão do `package.json`. **Manifesto de versão publicada é imutável**:
  um check do central reprova edição ou remoção de `manifests/<versão>.json` já publicado — assim a
  versão nova confere a instalada contra o mesmo manifesto que a instalou. Se a versão instalada no produto **não** tem
  manifesto no pacote, o `orion update` e o `orion doctor` **recusam** com mensagem que diz isso — não
  adivinham.

**6. Extensão do produto: `AGENTS.product.md`.**

- Fica na raiz do produto e é declarada em `extensions` do `harness.json`. Guarda as **regras próprias
  do produto**, que podem citar os ADRs do próprio produto (`docs/decisions/`, a partir de `0001`).
- **Quem carrega:** o `AGENTS.core.md`, sempre carregado, ganha a instrução "se existir
  `AGENTS.product.md`, carregue-o também". A instrução vale igual no central, que não tem extensão. A
  edição do `AGENTS.core.md` (e o ponteiro no `CLAUDE.md`) é da tarefa 3 (#365).
- **Precedência:** a extensão **acrescenta** regras do produto e **não relaxa** o `AGENTS.md`; em
  conflito, o `AGENTS.md` vence e o agente escala ao humano.
- **O produto não edita o `AGENTS.md`** nem outro arquivo da Zona B: eles são congelados pelo freeze
  guard. Mudança de harness vira Issue no repositório central.

**7. Integrações herdadas (premissa 8 do O16).**

- **Cross-model, board e flip em lote** são Zona B e vão para todo produto. O que vive no GitHub
  (Codex instalado, proteção da `main`, Project, PAT, App) não é automatizável: vira **orientação** no
  guia de configuração, na ordem em que precisa acontecer — cross-model antes do primeiro PR de código.
- **Cross-model** vale desde o primeiro PR e falha fechado. **Lista de caminhos de harness no produto**
  (emenda ao ADR-0041 ponto 4), **derivada do manifesto de zonas**: harness são os arquivos da **Zona B**,
  **todas as contrapartes geradas de D** (`generatedCounterpart` — estado, ledger, `.orion/`, `README.md`,
  `LICENSE`, `CODEOWNERS`, `SECURITY.md`, `docs/getting-started.md` e afins), `docs/decisions/`,
  `AGENTS.product.md` e as configs da raiz que o ADR-0041 já lista. Arquivo novo de governança entra pela
  sua zona, sem nova emenda. **Todo o resto é
  produto** — inclusive `tools/` e `scripts/` próprios do produto, que a lista atual do central trataria
  como harness e assim desligaria a exigência. No central, a lista do ADR-0041 não muda. A emenda vale
  quando o check distribuído for implementado (tarefas 4–5).
- **Board:** dono e número do Project passam a variáveis do repo (`PROJECT_OWNER`, `PROJECT_NUMBER`);
  um Project por produto; só Project de conta pessoal (Project de organização fica fora do épico).
- **Workflow que depende de segredo** (board, flip em lote) fica **inativo e verde** — no-op com aviso —
  até ser configurado; nunca vermelho por falta de setup.

**8. Ledger do produto.** O `feature-ledger.json` do produto **nasce vazio**, e o
`.orion/ledger-origin.json` nasce com `origin: "local"` e **nenhuma entrada herdada**. Supersede o
ADR-0021 **só para produtos gerados pelo `orion new`**: o produto não carrega entradas do Orion (que
seriam resíduo). Repos derivados pelo modelo antigo (template) seguem o ADR-0021; o central segue
`origin: "orion"`.

**9. Fora deste ADR, registrado.**

- **`orion adopt`** (adotar um repo existente) não existe na Fase 0: a Fase 0 é **só greenfield** —
  repo criado pelo `orion new`, ou já com `.orion/harness.json`. Épico próprio.
- O bootstrap manual do `docs/getting-started.md` §§1–4 ("Use this template") vira **legado**, sem ser
  apagado: vale para repos criados pelo modelo antigo. A nota de legado entra na fatia 2c.
- O empacotamento executável (TypeScript a partir de `node_modules`, dependências de runtime, tool-guard
  no produto) é do **ADR B** da #364.

### Links da Zona B que hoje quebram no produto (lista de trabalho)

A regra de fechamento por links já tem violações conhecidas. O check da fatia 2b **reprova** link da Zona
B para fora do produto, com uma **lista de exceções temporária e explícita** no `zones.json`
(`linkClosureExceptions`, arquivo → destinos) cobrindo só a dívida abaixo; cada tarefa que resolve um
link o retira da lista, e um link novo fora dela reprova o CI.

- **Para ADRs do Orion (Zona D):** `AGENTS.core.md`, `CLAUDE.md`, `CONTRIBUTING.md`, os dois checklists,
  `foundations.md` e `observability.md` — tarefa 3 (#365).
- **Para a Zona A** (`docs/examples/*.ts`): `AGENTS.md`, `AGENTS.core.md`, `CONTRIBUTING.md`, os dois
  checklists e `observability.md` — tarefa 4 (#366).
- **Para os runbooks** (Zona D): `CONTRIBUTING.md` — tarefa 5 (#367), que cria o guia de configuração.

## Alternativas consideradas

- **Manter o template repository e documentar um "merge manual" de atualizações.** Rejeitada: sem
  ancestral comum, todo arquivo vira conflito; o caminho de ida continua não existindo.
- **Teto de 20 na Zona B.** Rejeitada (Isa, 2026-10-08): exigiria tirar do produto documentos que a
  constituição linka (checklists, `foundations.md`, `CONTRIBUTING.md`), quebrando o fechamento por links.
- **Ledger herdado (ADR-0021 como está).** Rejeitada: deixaria resíduo do Orion no produto, contra a
  métrica 1 do épico.
- **Produto edita o `AGENTS.md` localmente.** Rejeitada: desfaz o congelamento, que é o que permite ao
  `orion update` só substituir, sem merge de três vias.
- **`harness.json` como referência do freeze guard.** Rejeitada: o arquivo é editável pelo próprio PR
  que ele deveria barrar.
- **Buscar a versão antiga pela rede no `orion update`.** Rejeitada: adiciona rede e ponto de falha a
  um comando que pode ser offline; os manifestos são pequenos (caminhos e hashes).

## Consequências

- **Positivas.** O produto recebe correções do harness por `orion update`, com diff revisável. Cada
  arquivo do central tem destino definido e verificável por máquina. O produto ganha um lugar para
  regra própria sem tocar no que é do harness.
- **Negativas.** A Zona B tem 25 arquivos, acima da meta original; cada update pode tocar todos. O
  manifesto de zonas passa a ser mais um artefato a manter — mitigado pelo check da 2b, que reprova
  arquivo novo sem zona no próprio PR que o cria. Publicar uma versão passa a exigir o manifesto dela,
que daí em diante não pode ser editado.
- **Não verificado pelo repo:** a configuração do lado do GitHub (Codex, proteção da `main`, Project,
  PAT, App) — é orientação no guia de configuração, nunca promessa de verificação.

## Conformidade

- **Fatia 2b:** o check do manifesto reprova arquivo rastreado sem zona, arquivo em mais de uma zona e
  Zona B acima de 30, com teste de mordida de cada caso; reprova link da Zona B para fora das Zonas B/C e
  contrapartes geradas que não esteja na lista de exceções, e reprova exceção que não corresponda mais a
  um link existente (para a lista só encolher); o schema do `harness.json` aceita um exemplo válido e reprova um sem
  `version`, um com hash fora do formato e um com extensão também em `managed`.
- **Fatia 2c:** `project-board.yml` lê `vars.PROJECT_OWNER`/`vars.PROJECT_NUMBER`; nota de legado no
  `getting-started` §§1–4.
- **Tarefas 4–7:** o freeze guard e o update conferem contra o manifesto da versão no pacote; o produto
  gerado nasce com ledger vazio, `AGENTS.product.md` declarado e a lista de harness do `cross-model`
  derivada das zonas.
