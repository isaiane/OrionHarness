// Conventional Commits — Orion Harness (AGENTS.md §6).
// Requer @commitlint/cli e @commitlint/config-conventional (devDependencies do projeto Node)
// ou execução via npx. Integrado ao hook commit-msg em .pre-commit-config.yaml.
// ESM: o package.json é "type":"module" desde a T2.0 (ADR-0005) — use export default.
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Tipos permitidos.
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "docs", "refactor", "test", "chore", "build", "ci", "perf", "revert"],
    ],
    "subject-case": [0], // permite PT-BR com maiúsculas/acentos
    "header-max-length": [2, "always", 100],
  },
};
