# ADR-0003 — Enforcement do gate G3 (aprovação humana de merge) por perfil

> Architecture Decision Record (`AGENTS.md` §3, gate G2). ADRs são **append-only**.
>
> Número **0003** = próximo livre em `docs/decisions/` no momento desta tarefa (o repo tinha
> 0001–0002). A numeração 0004–0008 do pacote de evolução (`orion-evolution-proposal/`) é
> **conceitual e ainda não adotada**; ao adotar, renumere em ordem de adoção.

- **Status:** aceito
- **Data:** 2026-06-24
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** `AGENTS.md` §3 (G3), §11 (modelo de confiança / T3); `CODEOWNERS`;
  `docs/runbooks/branch-protection.md`; Issue SDD da T1.2 (#18); épico O1

## Contexto

O G3 (`AGENTS.md` §3) exige "CI verde + aprovação humana" para todo merge em `main`. Hoje a `main`
está no **perfil Solo** com `Required approvals = 0`, então a aprovação humana **não é enforçada
pelo GitHub** — divergência entre a constituição e a configuração. Não há como exigir um segundo
aprovador num repositório de um único humano (o autor não pode aprovar o próprio PR), o que motivou
o `approvals = 0`. É preciso uma política que **enforce o G3 sem inviabilizar o fluxo Solo**.

## Decisão

**O G3 é enforçado por perfil**, com uma base comum de proteção de `main`:

**Base comum (ambos os perfis):**
- PR obrigatório; **push direto em `main` bloqueado**.
- **4 checks obrigatórios verdes:** `lint-test-build`, `secret-scan`, `smoke-test`, `pre-commit`.
- **Histórico linear** e **resolução de conversas** exigidos.
- Quando o **agente revisor** existir (Fase 4), seu check entra como obrigatório — garantindo review
  do agente **antes** do merge humano.

**Perfil Solo (padrão atual):**
- `Required approvals = 0`.
- A aprovação humana do G3 é **o ato de o humano fazer o merge**, garantida por **T3** (`§11`):
  o agente **nunca** executa merge em `main`. O humano revisa o PR (com CI verde) e dá o merge — e
  esse ato é a aprovação.
- **Honestidade do controle:** no Solo o agente pode operar com a credencial do humano, então o
  GitHub não distingue "humano vs. agente" no clique de merge. O enforcement do "humano aprova" é,
  portanto, **procedural** (constituição T3) somado aos controles técnicos da base comum. Assume-se
  e registra-se essa limitação em vez de mascará-la.

**Perfil Time:**
- `Required approvals ≥ 1` + review obrigatório de `CODEOWNERS`. O enforcement passa a ser também
  técnico (segundo aprovador humano), além da base comum.

## Alternativas consideradas

- **Exigir `approvals ≥ 1` também no Solo:** rejeitada — travaria 100% dos merges (autor não aprova
  o próprio PR), inviabilizando o perfil Solo.
- **Manter `approvals = 0` sem registrar nada:** rejeitada — é o estado atual e a própria causa da
  divergência G3 vs. enforcement.
- **Usar `enforce_admins` para impedir o humano de burlar:** parcialmente adotável no Time; no Solo
  impediria o único humano de operar. Fica como opção do perfil Time.

## Consequências

- **Positivas:** fecha o gap declarado; G3 vira **explícito e verificável** por perfil; o Solo
  segue operável; a base comum (PR + 4 checks + linear + conversas) eleva o piso de qualidade em
  ambos os perfis.
- **Negativas / riscos:** no Solo, parte do enforcement é **procedural** (depende de T3 e da
  disciplina de o humano fazer o merge), não puramente técnico. Mitigação: T3 é guardrail
  inegociável e os 4 checks são obrigatórios; migração para o perfil Time quando houver 2+ pessoas.

## Conformidade

Verificável: `gh api repos/:owner/:repo/branches/main/protection` mostra PR obrigatório, os 4
checks `required`, `required_linear_history = true`, `required_conversation_resolution = true` e
push direto desabilitado; `branch-protection.md` documenta a política por perfil; nenhum merge em
`main` é executado pelo agente (T3); no Time, `required_approving_review_count ≥ 1` + `CODEOWNERS`.
