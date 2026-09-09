# Runbook — Install do GitHub App do flip automatizado

> **Ato humano** (T3) que **destrava** a automação de flip em lote do ledger — a Action decidida no
> [ADR-0033](../decisions/0033-flip-automatizado-lote-projects-derivado.md) e implementada em
> `tools/ledger/flip-batch.ts` (#257). Operacionaliza `AGENTS.md` §10 e o
> [Runbook de Segredos](secrets.md) (menor privilégio, rotação).
>
> **Sequência.** Faça este install **antes** de habilitar o workflow (`flip-batch.yml`, a fatia de
> mecânica-GitHub do #257): a Action só roda sob a identidade do App e com os segredos abaixo. Enquanto
> o App **não** estiver instalado, o **flip manual segue sendo o processo vivo** (o rewrite dos docs
> current-state em `CONTRIBUTING.md`/`docs/getting-started.md` para o split de owner landa
> **atomicamente com o deploy** do workflow — ADR-0033).

## Por que um App (e não um PAT)

A automação **abre** o PR de flip `false→true` em lote, mas **nunca integra** (o merge é humano —
T3/G3). Um **GitHub App** dá identidade própria, permissões mínimas e auditoria clara ("aberto pelo
App, não por um humano" — sinal Data-First do ADR-0033), sem depender do token pessoal de ninguém.

## 1. Registrar o App

Em **Settings → Developer settings → GitHub Apps → New GitHub App** (na conta/org dona do repo):

- **Nome:** algo como `orion-flip-bot` (identidade reconhecível nos PRs de flip).
- **Webhook:** desative (`Active` desmarcado) — a Action roda por **agenda**, não por webhook.
- **Repository permissions** (só estas — menor privilégio, ADR-0033 ponto 7):
  - **Contents:** Read and write — criar a branch `flip/<lote>` e commitar o diff do ledger.
  - **Pull requests:** Read and write — abrir o PR de flip e escrever o corpo correlacionando o lote.
  - **Issues:** Read-only — reler o estado da Issue (CLOSED + `completed`) para o sinal de evidência.
  - **Projects:** Read and write — o ADR-0033 (ponto 7) define **o mesmo App** como **único escritor** do
    Project derivado (T10.3). Concedido **agora** para evitar uma troca de permissão + reaprovação no deploy
    do T10.3; a automação de flip (T10.2) ainda **não** o exerce.
  - _(Metadata: Read — obrigatória e implícita.)_
- **Nenhuma outra permissão.** Em especial, **nada** que conceda administração do repo.

> **A exclusão do merge NÃO é uma permissão de App.** GitHub Apps não têm um bit "pode mergear" separado
> de `Contents`/`Pull requests` — pior: `Contents: write` (necessário para commitar a branch) **já
> autoriza o endpoint de merge**. A garantia de que a automação **não integra** é imposta no **ruleset da
> `main`** (passo 4): o check `flip-revalidate` **e** a **restrição actor-level** que exclui o App de
> integrar. Por isso o ADR-0033 exige as **duas** camadas (permissão mínima **+** ruleset).

## 2. Instalar no repositório

Após criar o App, **Install App** e escolha **Only select repositories → este repo**. Não instale
org-wide (menor privilégio).

## 3. Segredos (`APP_ID` / `APP_PRIVATE_KEY`)

Gere uma **private key** (PEM) na página do App e guarde em **Settings → Secrets and variables →
Actions** do repo:

- `APP_ID` — o **App ID** numérico (não o client ID).
- `APP_PRIVATE_KEY` — o conteúdo **completo** do `.pem` (com as linhas `-----BEGIN/END …-----`).

Trate o PEM como segredo de produção: **rotacione** sob suspeita de exposição e siga o
[Runbook de Segredos](secrets.md) (nunca no repositório; menor privilégio; JIT). Se vazar, **revogue a
key na página do App agora** e gere outra.

## 4. Ruleset da `main` — a exclusão do merge

> **O gate é na base, não no prefixo.** Os requisitos de PR (checks, review, quem integra) são impostos
> pela proteção do **branch-alvo** do PR. Um PR de flip é `flip/<lote> → main`, logo quem o gateia é a
> proteção da **`main`** — mirar um ruleset em `flip/**` **não** gate o merge na `main`
> (ADR-0033:206-208). A convenção `flip/<lote>` é só o **nome da branch de trabalho**, não o alvo do gate.

> **Ordem de bootstrap.** O contexto `flip-revalidate` só aparece na lista de checks **depois** que o
> workflow rodou ao menos uma vez (a UI só oferece checks já executados — igual a
> [`branch-protection.md`](branch-protection.md) §"checks"). Sequência: (1) install do App + segredos
> (passos 1–3); (2) deploy do workflow da **fatia B** e um **seed run** num PR `flip/**` de exemplo; (3)
> quando o contexto surgir, adicione-o como **required** na `main` **antes** de permitir o merge de
> qualquer PR de flip real.

Na proteção/ruleset da **`main`** (**Settings → Rules → Rulesets**, alvo **`main`** — ou complemente a
[Proteção de `main`](branch-protection.md) existente):

- **Require a pull request before merging** — a automação só **abre**; a integração é PR (já vale para
  todo PR à `main`).
- **Require status checks to pass → `flip-revalidate`** (`tools/ledger/flip-revalidate.ts`) entre os checks
  **required da `main`**. Em PR que **não** flipa nada o CLI passa trivialmente ("nada a revalidar"), então
  ele só **morde** o PR de flip, revalidando a evidência (Issue CLOSED + `completed`) e reprovando quando
  ela mudou. **Exigir o contexto globalmente só é seguro se o workflow (fatia B) rodar e reportar esse job
  em _todo_ PR à `main`**, fazendo o filtro flip-vs-não-flip **dentro** do job. Se ele disparasse só em
  `flip/**`, os PRs comuns ficariam travados em **"Expected"** (contexto required que nunca chega).
  **Constraint da fatia B:** gatilho em todos os PRs à `main`, no-op interno para os não-flip.
  - **Janela de reopen (não totalmente fechável por check).** Um check em `pull_request` cola o verde ao
    **SHA do head**; se a Issue reabrir **entre o último run e o merge**, o verde velho ainda deixaria
    integrar. O ADR-0033 §81–86 fixa o **invariante** (a evidência vale **na integração**; refresh periódico
    **não basta**) mas deixa a **mecânica exata para a fatia B** (T10.2). **Nenhum check preso a um SHA é
    atômico com uma mudança de estado _externa_ (a Issue):** a **merge queue** (`merge_group`) **estreita** a
    janela — reexecuta o check contra o estado do grupo antes de integrar — mas **não a fecha**: uma Issue
    reaberta **entre o check do `merge_group` e a integração** não muda o SHA nem o check. Fechar o resíduo
    exige **invalidação event-driven** — a fatia B **remove/reenfileira** o flip quando a Issue reabre — e,
    enquanto não houver, o resíduo é **procedural** (ADR-0003 / ADR-0033 §81–86). No deploy da fatia B:
    **merge queue na `main`** _e_ o **gatilho de invalidação por reabertura de Issue** (a mecânica exata é da
    fatia B — ver o caveat abaixo).
- **Exclua o App de integrar a `main` (actor-level).** Não basta "não dar bypass": no perfil **Solo**
  (`approvals=0`), o token `Contents: write` do App **já autoriza o endpoint de merge** sem bypass nenhum
  (ADR-0033:135-138). Configure a **restrição de atualização do ruleset** (lista de **bypass**) para
  permitir **só o mantenedor humano**, **não** o App — senão uma credencial comprometida ou uma mudança
  futura de workflow executa o **merge T3 proibido**. **Ressalva de conta pessoal:** o mecanismo exato varia
  (repos de conta pessoal não têm o "Restrict who can push" clássico da branch-protection; usa-se a
  restrição do próprio ruleset) — a forma precisa é **confirmada no deploy** (caveat abaixo). Enquanto o
  perfil for **Solo**, parte desta fronteira é **procedural** (ADR-0003/ADR-0033:135-138) e fica
  **declarada**, não suavizada.
- **Require human review + merge (G3):** no **Solo**, o merge humano com CI verde é o próprio G3
  ([ADR-0003](../decisions/0003-enforcement-g3-por-perfil.md)); no **Time**, `approvals ≥ 1` + `CODEOWNERS`.
  Ver [Proteção de `main`](branch-protection.md).

> **Caveat — mecânica exata confirmada no deploy (fatia B / T10.3).** Este runbook fixa o **contrato** (o
> quê garantir); alguns detalhes de mecânica-GitHub só se validam **rodando** com o App instalado e variam
> por tipo de conta/escopo — ficam **confirmados no deploy**, não aqui:
> - a forma precisa da **restrição do ruleset** que exclui o App de integrar, e sua **verificação por
>   inspeção** do ruleset/API (não só observar que "não houve merge");
> - **pinnar a fonte** do check `flip-revalidate` ao workflow publisher esperado (para outro integrante com
>   acesso a status/checks não publicar um contexto homônimo verde);
> - o **escopo da permissão de Projects** para o T10.3 — Projects v2 **org-level** via GraphQL exige a
>   permission de **organização**, não a de repositório; ajustado quando o T10.3 deployar o projetor;
> - o **gatilho de invalidação event-driven** que remove/reenfileira um flip quando sua Issue **reabre**
>   (fecha o resíduo da janela de reopen que nem `merge_group` cobre; até existir, o resíduo é procedural).
>
> Motivo: proporcionalidade — validar essas mecânicas exige o deploy real, e o ADR-0033 já assume a
> fronteira **em parte procedural no Solo**.

## 5. Fallback e saúde (pós-deploy)

- **Automação indisponível → owner manual reassume** (ADR-0033 §70–73): se a credencial for revogada, a
  agenda desligada ou o job falhar de forma persistente, o **owner humano** volta a flipar as entradas
  **com sinal** à mão — nenhuma entrada elegível fica órfã.
- **Sinal de saúde observável (não só "job falhou").** Uma agenda **desligada não gera run nenhum** — então
  detectar apenas *falhas* de job **não** pega o modo de falha mais silencioso (a entrada ficaria órfã sem
  ninguém perceber). O sinal tem de ser um **heartbeat positivo**: a automação registra que **rodou** a
  cada ciclo (ex.: um artefato/summary datado "último ciclo em `<ts>`"), e a **ausência** do heartbeat além
  de _N_ ciclos é o alarme. **O monitor e a escalação são código da fatia B** (T10.2); este runbook fixa o
  **contrato operacional** que ela deve satisfazer:
  - o **owner é notificado** (Issue/alerta) quando o heartbeat some por _N_ ciclos **ou** o job falha _≥ K_
    vezes seguidas — o que ocorrer primeiro;
  - ao ser notificado, o **owner manual reassume** os flips com sinal até a automação voltar;
  - **credencial revogada** ou **ruleset alterado** contam como "indisponível" e disparam a mesma rota.
- **Entradas sem sinal** (Issue não-CLOSED/`completed`) seguem no **caminho humano-exceção permanente** —
  a automação nunca as flipa nem as "possui".

## 6. Verificação (após habilitar o workflow)

Dispare a Action manualmente (workflow dispatch). O resultado é **determinado pelo estado** — verifique o
caminho aplicável (não assuma que sempre abre um PR):

1. **Caminho do PR (com ≥1 entrada elegível — `awaitingFlip ∩ evidência`):** abre **um** PR de flip em
   `flip/<lote>` sob a **identidade do App** (não humana). Se não houver entrada elegível real, **encene uma
   entrada descartável** só para este teste e **limpe-a depois**. **Sem** entradas elegíveis → **no-op**
   (nenhum PR) — resultado válido, não falha. **Com um lote já aberto** → **atualiza ou pula** (nunca abre um
   2º — invariante "1 lote por vez", ADR-0033).
2. **Inspecione o ruleset/API** e confirme que o App **não** consta entre os atores que podem integrar a
   `main` — observar que "não houve merge" **não** prova a restrição (o workflow, por desenho, nunca chama
   o endpoint de merge). É a inspeção do ruleset, não o comportamento do job, que atesta a fronteira T3.
3. `flip-revalidate` roda como check required no PR de flip **e** reporta (trivial) nos demais PRs à `main`.
