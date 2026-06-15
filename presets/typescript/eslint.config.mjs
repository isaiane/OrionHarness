// Preset ESLint (flat config) — Orion Harness / TypeScript.
// Requer: eslint, typescript-eslint. Instale como devDependencies do projeto.
//   npm i -D eslint typescript-eslint
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/", "build/", "coverage/", "node_modules/"],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      "no-console": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      eqeqeq: ["error", "always"],
    },
  },
);
