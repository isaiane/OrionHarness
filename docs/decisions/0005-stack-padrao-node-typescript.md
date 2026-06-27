# ADR-0005 — Stack padrão do template: Node.js + TypeScript

> **Numeração (repo):** após o #24, o repo tem ADRs `0001–0004`. Esta é a fundação da **O2**:
> **stack = 0005** (esta) e **ledger = 0006**. Substitui o ADR-0008 conceitual do pacote
> `orion-evolution-proposal/` (aquela numeração fica aposentada).

- **Status:** aceito
- **Data:** 2026-06-26
- **Decisores:** Isa (owner) — aprovação humana (gate G2)
- **Relacionado a:** `AGENTS.md` §7 (lean/flat), §9/§10/§11; ADR-0004 (reconciliação lean/flat);
  `presets/typescript/` (tsconfig/eslint/prettier já existentes); CI (trilha node); PLAN épico
  **O2** (pré-requisito da T2.1 ledger)

## Contexto

O harness é poliglota por detecção, mas **não define stack padrão** — ambiguidade que já gerou
decisões implícitas (CI assume `npm`; presets só de TS; stubs runnable em Python). Decisão de
escopo: **consolidar UMA stack**; outras stacks viram templates específicos no futuro.

## Decisão

Adotar **Node.js + TypeScript** como stack padrão, em **núcleo obrigatório** + **defaults por tipo
de projeto** (opt-in, fiéis ao lean/flat do ADR-0004).

### Núcleo obrigatório
1. **Runtime:** Node.js **LTS 22.x**, **ESM** (`"type":"module"`), fixado em `.nvmrc` + `engines`.
2. **Linguagem:** **TypeScript `strict`** (estende `presets/typescript/tsconfig.base.json`);
   `tsc --noEmit` como type-check de primeira classe.
3. **Pacotes:** **npm** com lockfile commitado (consistência com CI/allowlist). pnpm = futuro.
4. **Testes:** **Vitest**.
5. **Lint/format:** **ESLint flat + Prettier** (promove `presets/typescript/` a default canônico).
6. **Validação de fronteiras:** **Zod** (API-First §7; entrada validada do action system §2.3).
7. **Config (12-Factor):** env parseado por Zod, falha-rápido (fail-secure §8.1).
8. **Observabilidade:** **pino** (JSON + redaction de PII, §9/§10); OTel opt-in.
9. **Estrutura:** design flat (regra das 3 responsabilidades, ADR-0004).

### Scripts canônicos
`lint` (eslint) · `format` (prettier) · `typecheck` (tsc --noEmit) · `test` (vitest run). **CI:**
a trilha node passa a rodar `npm run typecheck --if-present` (erro de tipo reprova — coerente com
T1.1).

### Defaults por tipo (opt-in)
Serviço HTTP → **Fastify** (schema-first, integra Zod); biblioteca → **tsup**; CLI → **tsx**.

### Meta-tooling do harness
Os artefatos runnable (ledger e futuros guards) são **TypeScript** — repo consumidor
**single-language**. Rodam em Node ≥ 22 **sem toolchain** (type stripping) no CI, e com vitest nos
testes. `scripts/smoke-test.sh` segue em bash (orquestração).

## Alternativas consideradas
- **pnpm** em vez de npm: futuro (evita peça móvel agora). **Jest/`node:test`** em vez de Vitest:
  atrito ESM/menos ergonomia. **Biome** em vez de ESLint+Prettier: ecossistema menos maduro;
  presets já são ESLint/Prettier. **Tooling em Python:** mantém duas linguagens — rejeitado.

## Consequências
- **Positivas:** fim da ambiguidade; CI/presets/allowlist/meta-tooling numa só linguagem;
  fronteiras tipadas (Zod) reforçam §8.1; logs com redaction atendem §9/§10; base lean.
- **Negativas/riscos:** acoplamento ao ecossistema Node/TS (mitigado: outras stacks = templates
  futuros); dependências novas (vitest, zod, pino) mantidas mínimas.

## Conformidade
Projeto possui `package.json` (ESM, engines), `tsconfig` estendendo o base, ESLint flat + Prettier,
Vitest e scripts canônicos; `tsc --noEmit` e `vitest` rodam no CI e reprovam em falha; meta-tooling
em TS; smoke-test em bash.
