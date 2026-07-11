# Presets por stack

> A stack de referência do Orion Harness é **Node.js/TypeScript**
> ([ADR-0005](../docs/decisions/0005-stack-padrao-node-typescript.md),
> [ADR-0012](../docs/decisions/0012-consolidacao-stack-node-ts.md)). Este preset é um ponto de
> partida opt-in: copie o conteúdo de [`typescript/`](typescript/) para a raiz do projeto (ou
> referencie-o) e ajuste conforme necessário. Ferramentas e versões são **decisão de cada projeto**.

## Preset disponível

| Tipo de projeto | Stack | Preset |
|-----------------|-------|--------|
| Web / full-stack · API / backend | TypeScript/JS | [`typescript/`](typescript/) |

**Outras linguagens (Python, mobile, etc.) são roadmap** — templates futuros/externos, fora do
conjunto embarcado (ADR-0012). Adapte o preset TypeScript ou traga um template próprio.

## Como ativar

1. Copie os arquivos de configuração de [`typescript/`](typescript/) para a raiz do projeto.
2. Instale as ferramentas indicadas e ative os hooks (`pre-commit install`).
3. Garanta que os comandos `lint`/`test`/`build` existam — o CI (`.github/workflows/ci.yml`) os
   executa automaticamente (stack Node/TS).

O preset respeita o [`.editorconfig`](../.editorconfig) e os Conventional Commits.
