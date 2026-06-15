# Presets por stack

> Convenções de código no Orion Harness são **base universal + presets por linguagem**
> (`AGENTS.md` §9). Estes presets são pontos de partida opt-in: copie o conteúdo da pasta da sua
> linguagem para a raiz do projeto (ou referencie-o) e ajuste conforme necessário. A escolha de
> stack, ferramentas e versões é **decisão de cada projeto**.

## Mapeamento tipo de projeto → preset

| Tipo de projeto | Stack(s) típica(s) | Preset |
|-----------------|--------------------|--------|
| Web / full-stack | TypeScript/JS | [`typescript/`](typescript/) |
| API / backend | TypeScript ou Python | [`typescript/`](typescript/) · [`python/`](python/) |
| Mobile / app | nativo ou cross-platform | [`mobile/`](mobile/) (orientações) |

## Como ativar

1. Escolha o preset da sua linguagem.
2. Copie os arquivos de configuração para a raiz do projeto.
3. Instale as ferramentas indicadas e ative os hooks (`pre-commit install`).
4. Garanta que os comandos `lint`/`test`/`build` existam — o CI (`.github/workflows/ci.yml`) os
   executa automaticamente ao detectar a stack.

Todos os presets respeitam o [`.editorconfig`](../.editorconfig) e os Conventional Commits.
