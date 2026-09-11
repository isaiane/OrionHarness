import { describe, expect, it } from "vitest";
import { crossModelRequired, type TriggerDecision } from "./cross-model-trigger.ts";

function decide(input: unknown): TriggerDecision {
  let decision: TriggerDecision | undefined;

  expect(() => {
    decision = crossModelRequired(input as readonly string[]);
  }).not.toThrow();

  expect(decision).toBeDefined();
  expect(decision?.reason.trim().length).toBeGreaterThan(0);
  return decision as TriggerDecision;
}

describe("crossModelRequired — classificação por superfície", () => {
  it.each([
    "src/domain.ts",
    "src/component.tsx",
    "lib/index.js",
    "lib/view.jsx",
    "scripts/task.mjs",
    "scripts/config.cjs",
  ])("exige revisão para código-fonte (%s) e cita o arquivo gatilho", (sourceFile) => {
    const decision = decide([sourceFile]);

    expect(decision.required).toBe(true);
    expect(decision.reason).toContain(sourceFile);
  });

  it.each([
    "src/domain.test.ts",
    "src/component.spec.tsx",
    "lib/index.test.js",
    "lib/view.spec.jsx",
    "scripts/task.test.mjs",
    "scripts/config.spec.cjs",
    "src/__tests__/domain.ts",
    "tests/integration.ts",
    "fixtures/example.js",
    "mocks/service.ts",
  ])("prioriza a classificação de teste para %s", (testFile) => {
    expect(decide([testFile]).required).toBe(false);
  });

  it("dispensa revisão quando há somente documentação, configuração e testes", () => {
    const decision = decide([
      "README.md",
      "docs/architecture/overview.md",
      "package.json",
      ".github/workflows/ci.yml",
      "src/feature.test.ts",
      "tests/acceptance.ts",
    ]);

    expect(decision.required).toBe(false);
  });

  it("exige revisão quando uma lista mista contém qualquer arquivo-fonte", () => {
    const trigger = "src/feature.ts";
    const decision = decide(["README.md", "package.json", "tests/feature.ts", trigger]);

    expect(decision.required).toBe(true);
    expect(decision.reason).toContain(trigger);
  });

  it("é determinístico e não altera a entrada", () => {
    const changedFiles = Object.freeze(["README.md", "src/feature.ts"]);

    const first = decide(changedFiles);
    const second = decide(changedFiles);

    expect(second).toEqual(first);
    expect(changedFiles).toEqual(["README.md", "src/feature.ts"]);
  });
});

describe("crossModelRequired — fail-closed", () => {
  it("exige revisão para a lista vazia", () => {
    expect(decide([]).required).toBe(true);
  });

  it.each([null, undefined, "src/feature.ts", 42, true, {}])(
    "exige revisão sem lançar para entrada que não seja lista (%s)",
    (invalidInput) => {
      expect(decide(invalidInput).required).toBe(true);
    },
  );

  it.each([
    { label: "null", input: ["src/feature.ts", null] },
    { label: "número", input: ["src/feature.ts", 42] },
    { label: "string vazia", input: [""] },
    { label: "string em branco", input: ["   "] },
  ])("exige revisão sem lançar para lista com item inválido ($label)", ({ input }) => {
    expect(decide(input).required).toBe(true);
  });
});
