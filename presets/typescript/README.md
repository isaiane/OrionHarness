# Preset — TypeScript / JavaScript

Para projetos web/full-stack e APIs/backend em Node.

## Arquivos

- `eslint.config.mjs` — ESLint flat config (typescript-eslint).
- `.prettierrc.json` — formatação (alinhada ao `.editorconfig`).
- `tsconfig.base.json` — TypeScript em modo `strict`; estenda com `"extends"`.

## Ativação

```bash
npm i -D eslint typescript-eslint prettier typescript vitest
# copie os arquivos deste preset para a raiz do projeto
```

Adicione ao `package.json` os scripts que o CI executa:

```json
{
  "scripts": {
    "lint": "eslint .",
    "format": "prettier --check .",
    "test": "vitest run --coverage",
    "build": "tsc -p tsconfig.json"
  }
}
```

`tsconfig.json` do projeto:

```json
{ "extends": "./tsconfig.base.json", "include": ["src"] }
```
