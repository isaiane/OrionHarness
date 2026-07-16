# ADR-0011 — Hook de sandbox/allowlist de referência (action system, T0–T4)

> **Numeração (repo):** a `main` tem ADRs `0001–0010`, então este é o **0011**. Confirme o estado
> mergeado antes de fixar (o 0010 é a convenção de re-review do Codex).

> **Emenda (append-only):** o **limite conhecido** deste ADR — read tools classificadas T0 **pelo
> nome**, sem inspecionar o alvo lido — é endereçado pelo
> [ADR-0013](0013-validacao-alvo-leitura-tool-guard.md) (#62), que estende a guarda para validar o
> **alvo de leitura** (fail-closed em alvo sensível/não-validável), com ativação opt-in por runtime.
> A decisão histórica abaixo permanece inalterada.

> **Emenda (append-only):** exercendo o princípio "a allowlist cresce por review" deste ADR, o
> [ADR-0015](0015-allowlist-docs-examples.md) (#71) estende a `SHELL_ALLOW` para **executar exemplos
> versionados de `docs/examples/`** (`node .ts` e `bash`/`./` `.sh`), reusando o anti-traversal e sem
> alvo arbitrário. A decisão histórica abaixo permanece inalterada.

- **Status:** aceito
- **Data:** 2026-07-08 (proposto em 2026-07-07; aceito no G2 em 2026-07-08)
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** `AGENTS.md` §10 (segurança), §11 (modelo de confiança T0–T4);
  `docs/architecture/foundations.md` §1 (secure by default, menor privilégio) e action system;
  épico **O4**; Issue **#52**; convenção e2e da T4.1 ([ADR-0009](0009-verificacao-e2e-ferramenta-real.md));
  padrão de gate testado do `ledger-guard` (ADR-0006/T2.1)

## Contexto
As fundações descrevem **sandbox**, **menor privilégio** e um **action system** (ações tipadas,
validadas, autorizadas) + o **modelo de confiança T0–T4** — mas **sem implementação**: o harness
está *governado, não equipado*. O benchmark `autonomous-coding` mostra a versão runnable (um
`security.py` + `test_security.py`): um **hook pre-tool-use** com **allowlist**, **fail-safe block**
(nega o não-parseável) e **validadores** de comandos sensíveis.

Falta uma **implementação de referência** — não uma integração acoplada a um runtime de agente
específico (isso fica como preset), e sim um artefato **opt-in**, testado, que materialize o action
system e o T0–T4 e sirva de template para projetos derivados.

## Decisão
Adotaremos um **hook de guarda pre-tool-use de referência, opt-in**, em TypeScript (stack ADR-0005),
que materializa o action system e o modelo T0–T4:

1. **Postura fail-safe (default-deny).** A guarda **nega por padrão**; só libera o que **casa a
   allowlist explícita** e **passa os validadores**. Entrada **não-parseável/malformada → block**.
2. **Allowlist explícita** de ferramentas de leitura (T0) e de comandos de shell reversíveis (T0/T1),
   por regex ancoradas.
3. **Lista de proibidos (T4)** — bloqueio incondicional que **precede** a allowlist (ex.: remoção
   destrutiva de raiz, download-e-executa, force-push, leitura de credenciais do sistema).
4. **Validadores de comandos sensíveis** que classificam como **T3** (nunca automatizável — ex.:
   `git push` para `main`, `npm publish`) e bloqueiam.
5. Decisão tipada `{ allow, klass: T0–T4, reason }`, **com testes vitest** que espelham o
   `test_security.py` do benchmark, e **plugada no `scripts/smoke-test.sh`** (gate comportamental).

**Opt-in / preset.** É um **preset de referência** (não default de todo projeto): a **integração com
um runtime de agente específico está fora de escopo**; cada projeto pluga a guarda no seu ponto de
tool-use. A guarda **não** decide sozinha ações T3 (merge/deploy/credenciais) — ela as **bloqueia**,
deixando-as para o humano (§11).

**Coerência de governança.** O hook é um **tooling de referência** entregue **dentro do fluxo SDD**
(Issue #52 → branch → PR → merge humano). Ele **não** executa fora do fluxo, não commita, não mergeia
e não acessa dado sensível — ao contrário, é o mecanismo que **recusa** ações que furariam T3/§10.

**Artefato vivo (gatilho/owner/quando).** A **allowlist é configuração de segurança do projeto**:
cresce quando um comando seguro novo é necessário. Gatilho: toda adição/edição da allowlist ou dos
proibidos passa por **PR com as duas revisões** (Harness = a política; Product = o código/testes) —
alargar a allowlist é decisão de segurança (§10), nunca um ajuste solto.

**Allowlist ilustrativa — endurecer por projeto (defense in depth).** A allowlist/proibidos deste
hook são um **ponto de partida de referência**, não uma política exaustivamente segura: comandos
permitidos por prefixo podem carregar argumentos perigosos (execução arbitrária, expansão de
variável, alvos sensíveis), e a lista de proibidos nunca é completa. Cada projeto **deve revisar e
endurecer** a política ao adotá-la, e tratar a guarda como **uma camada** — não substitui sandbox de
SO, isolamento de processo nem gestão de segredos (§10, defense in depth). O valor do artefato é a
**estrutura fail-safe** (default-deny + camadas proibidos → segredos → validadores → operadores →
allowlist), não a completude da lista.

## Limitações conhecidas
- **Alvos sensíveis no lado Bash → bloqueados.** Além de `/etc/(passwd|shadow)`, a guarda bloqueia
  (T4) leitura de segredos/credenciais mesmo por comando permitido (`cat .env`, `cat ~/.ssh/id_rsa`,
  `find / -name id_rsa`, `.pem`/`.key`, `.npmrc`, `~/.aws/`), coerente com o modelo de segredos do
  projeto (`docs/runbooks/secrets.md`); exemplos públicos (`.env.example`/`.sample`/…) seguem
  liberados (achado P1 r2 do Codex).
- **Ferramentas de leitura (`Read`/`Grep`/…) classificadas pelo nome, não pelo alvo.** A `ToolCall`
  de referência modela só `{ tool, command? }` e **não** carrega o caminho lido — então um `Read` de
  `/etc/shadow`/`.env` seria T0. É um **limite deliberado do preset** (o alvo depende do formato de
  input do runtime, fora de escopo aqui); a validação de alvos das *read tools* fica para um follow-up
  (**Issue #62**), que estende esta política sob novo G2. Achado P2 do Codex no PR #52/#61.
- **Allowlist casa o comando inteiro, não só o prefixo.** Comandos compostos/encadeados/com redireção
  ou **expansão de variável** (`&&`, `;`, `|`, `$(…)`, `>`, `$VAR`) **não** são liberados pela allowlist
  de prefixo — a guarda os bloqueia (default-deny), pois só o prefixo não garante que o comando inteiro
  é seguro (bloqueia também `echo $GITHUB_TOKEN`). Achado P1 do Codex.
- **`node` restrito a scripts versionados do repo.** A allowlist de `node --experimental-strip-types`
  só casa alvos em `tools/`|`scripts/` terminando em `.ts`; `-e`/`--eval`/alvo arbitrário **e traversal**
  (`tools/../../tmp/evil.ts`) caem no default-deny (senão a guarda liberaria execução arbitrária de JS
  como T1). E `/proc/*/environ` entra nos alvos sensíveis (segredos em env var). Achados P1 r3/r6.
- **Allowlist só cobre formas read-only/seguras.** Formas mutantes/executoras das mesmas famílias são
  barradas antes da allowlist: `find` deleta/executa/**escreve arquivo** (`-delete`/`-exec`/`-execdir`/
  `-ok`/`-fls`/`-fprint`/`-fprint0`/`-fprintf` — conjunto fechado do GNU find; só busca é liberada) e
  `npm install`/`ci` **por lockfile** (pacote arbitrário como `npm install left-pad` cai no default-deny
  — evita supply-chain/postinstall). `git branch` e `git remote` são restritos a **formas de
  leitura/listagem** e `git diff/log --output=<file>` (que trunca arquivo) é bloqueado — qualquer
  opção/subcomando mutante (`git remote add`/`set-url`, …) cai no default-deny, fechando a **classe**,
  não só as formas enumeradas. Achados P1 r4, P2 r5, P2 r6 e P1 r7 do Codex.
- **Evasão de path: traversal normalizado; glob de shell não.** `/./` e `/../` são colapsados antes de
  casar proibidos/segredos (`cat /etc/./passwd` → bloqueado). Já **glob de shell** (`cat /etc/p?sswd`)
  **não** é resolvido — exigiria canonicalização com acesso ao filesystem, fora do escopo de um guard
  regex lean; é o **limite deste artefato** (a guarda é uma camada, não sandbox de SO — ver caveat
  acima) e a validação robusta de alvo com canonicalização fica no follow-up **Issue #62**. Achado
  P1 r5 do Codex.

## Alternativas consideradas
- **Não implementar (status quo):** rejeitada — mantém o harness "governado, não equipado"; a §10/§11
  fica sem instrumento verificável.
- **Framework de policy completo (OPA/rego, engine de regras):** rejeitada por lean/flat (ADR-0004) —
  over-engineering para uma guarda de referência; allowlist + validadores em um módulo bastam.
- **Acoplar a um runtime de agente específico:** rejeitada — vira integração, não referência; fica
  como preset por projeto (fora de escopo desta tarefa).
- **Postura default-allow com blocklist:** rejeitada — contraria *secure by default / fail secure*
  (§10); a lista de proibidos nunca é exaustiva.

## Consequências
- **Positivas:** equipa o action system e o T0–T4 (§10/§11) com um artefato **testado** e
  **reutilizável**; o fail-safe default-deny torna a guarda segura por construção; o plug no
  smoke-test faz a política "morder" no CI.
- **Negativas/riscos:** manutenção da allowlist (mitigado por ser config revisada em PR); **falso
  senso de segurança** — uma allowlist não substitui sandbox de SO (mitigado: a guarda é uma camada,
  não a única; defense in depth §10). Regex de proibidos podem ter falsos negativos → a postura
  default-deny garante que "não casou allowlist" já bloqueia.
- Este ADR **equipa** governança existente (§10/§11) — passa por **Harness Review** (a política) e
  **Product Review** (o hook e testes).

## Conformidade
Verificável: (1) comando fora da allowlist é **bloqueado** e entrada não-parseável dá **fail-safe
block** (testes); (2) validadores de comandos sensíveis (T3) cobertos por testes; (3)
`scripts/smoke-test.sh` exercita a guarda (bloqueia um comando plantado, libera um seguro); (4)
`lint`/`typecheck`/`test`/`format` verdes; (5) o ADR aceito (G2) amarra o hook a §10/§11 e ao T0–T4.

<!-- Append-only: para reverter, crie novo ADR que supersede este e anote no cabeçalho do antigo. -->
