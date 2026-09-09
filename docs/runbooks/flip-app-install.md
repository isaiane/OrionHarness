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
- **Repository permissions** (só estas — menor privilégio, ADR-0033):
  - **Contents:** Read and write — criar a branch `flip/<lote>` e commitar o diff do ledger.
  - **Pull requests:** Read and write — abrir o PR de flip e escrever o corpo correlacionando o lote.
  - **Issues:** Read-only — reler o estado da Issue (CLOSED + `completed`) para o sinal de evidência.
  - _(Metadata: Read — obrigatória e implícita.)_
- **Nenhuma outra permissão.** Em especial, **nada** que conceda administração do repo.

> **A exclusão do merge NÃO é uma permissão de App.** GitHub Apps não têm um bit "pode mergear"
> separado de `Contents`/`Pull requests`. A garantia de que a automação **não integra** é o **branch
> ruleset** do passo 4 — não a lista de permissões. Por isso o ADR-0033 exige as **duas** camadas.

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

## 4. Branch ruleset de `flip/**` — a exclusão do merge

Em **Settings → Rules → Rulesets → New branch ruleset**, alvo **`flip/**`**:

- **Require a pull request before merging** — a automação só **abre**; a integração é PR.
- **Require status checks to pass:** marque **`flip-revalidate`** (`tools/ledger/flip-revalidate.ts`)
  como **required**. Ele revalida a evidência da Issue (CLOSED + `completed`) e reprova o lote quando ela
  mudou. **Atenção à janela de reopen:** um check disparado em `pull_request` cola o resultado verde ao
  **SHA do head** — se a Issue reabrir **entre o último run e o merge humano**, esse verde velho ainda
  deixaria integrar. O [ADR-0033](../decisions/0033-flip-automatizado-lote-projects-derivado.md) §81–86 é
  explícito: um **refresh periódico não basta** (há janela); a evidência tem de valer **no instante da
  integração**. Marcar o check como required, sozinho, **não** fecha essa janela. Fechá-la é **mecânica da
  fatia B** (o workflow, T10.2): rodar o `flip-revalidate` **no momento do merge** — via **merge queue**
  (evento `merge_group`), que reexecuta o check contra o estado atual imediatamente antes de integrar.
  Configure, então, **as duas camadas**: (a) o check **required** no ruleset **e** (b) a **merge queue** em
  `flip/**` exigindo o mesmo check no `merge_group`.
  _(O check passa a existir quando o workflow da fatia B o roda; habilite required + merge queue no mesmo
  deploy.)_
- **Require human review + merge (G3):** no perfil **Solo**, o merge humano com CI verde é o próprio G3
  ([ADR-0003](../decisions/0003-enforcement-g3-por-perfil.md)); no perfil **Time**, `approvals ≥ 1` +
  `CODEOWNERS`. Ver [Proteção de `main`](branch-protection.md).
- A identidade do **App não integra**: não conceda a ele bypass do ruleset.

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

Dispare a Action manualmente (workflow dispatch) e confirme:

1. Abre **um** PR de flip na branch `flip/<lote>` sob a **identidade do App** (não humana).
2. **Não** consegue mergear (o ruleset barra) — a integração continua humana.
3. `flip-revalidate` roda como check required no PR de flip.
