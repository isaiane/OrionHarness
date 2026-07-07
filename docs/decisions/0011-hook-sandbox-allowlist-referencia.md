# ADR-0011 — Hook de sandbox/allowlist de referência (action system, T0–T4)

> **Numeração (repo):** a `main` tem ADRs `0001–0010`, então este é o **0011**. Confirme o estado
> mergeado antes de fixar (o 0010 é a convenção de re-review do Codex).

- **Status:** proposto  <!-- humano aprova (G2) → muda para: aceito -->
- **Data:** 2026-07-07
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
