import { defineConfig } from "vitest/config";

// passWithNoTests: tolera o estágio esqueleto (sem testes ainda). A T2.1 (ledger) adiciona testes
// reais; quando houver testes, esta tolerância deixa de ser exercida.
export default defineConfig({
  test: { passWithNoTests: true },
});
