import { describe, it, expect, vi } from "vitest";
import { classifyLane, selfCheck, type ActionDescriptor } from "./fast-lane-eligibility.ts";

// Base elegível: T1, reversível, 1 arquivo, sem cruzar gate/governança/dado sensível ⇒ fast.
const base: ActionDescriptor = {
  trustClass: "T1",
  crossesG1: false,
  crossesG2: false,
  touchesGovernance: false,
  touchesSensitiveData: false,
  filesTouched: 1,
  reversible: true,
};

describe("classifyLane — via T1", () => {
  it("T1 trivial reversível ⇒ fast", () => {
    expect(classifyLane(base).lane).toBe("fast");
  });

  it("governança/T2 (cruza G2) ⇒ full", () => {
    const d = classifyLane({ ...base, trustClass: "T2", crossesG2: true, touchesGovernance: true });
    expect(d.lane).toBe("full");
    expect(d.reasons.length).toBeGreaterThan(0);
  });

  it("T4 ⇒ blocked (recusar/escalar, não roteável)", () => {
    expect(classifyLane({ ...base, trustClass: "T4" }).lane).toBe("blocked");
  });

  it("T0 puro ⇒ full (a via é só T1)", () => {
    expect(classifyLane({ ...base, trustClass: "T0" }).lane).toBe("full");
  });

  it("cruza G1 ⇒ full", () => {
    expect(classifyLane({ ...base, crossesG1: true }).lane).toBe("full");
  });

  it("toca dado sensível ⇒ full", () => {
    expect(classifyLane({ ...base, touchesSensitiveData: true }).lane).toBe("full");
  });

  it("> 4 arquivos ⇒ full (guardrail §7)", () => {
    expect(classifyLane({ ...base, filesTouched: 5 }).lane).toBe("full");
  });

  it("irreversível ⇒ full", () => {
    expect(classifyLane({ ...base, reversible: false }).lane).toBe("full");
  });
});

describe("classifyLane — fail-closed (descritores malformados)", () => {
  it("filesTouched inválido (-1/0/1.5/NaN) ⇒ full", () => {
    for (const f of [-1, 0, 1.5, Number.NaN]) {
      expect(classifyLane({ ...base, filesTouched: f }).lane).toBe("full");
    }
  });

  it("flag boolean não-boolean ⇒ full", () => {
    expect(classifyLane({ ...base, crossesG1: 0 as unknown as boolean }).lane).toBe("full");
    expect(classifyLane({ ...base, touchesGovernance: undefined as unknown as boolean }).lane).toBe("full");
    expect(classifyLane({ ...base, reversible: "yes" as unknown as boolean }).lane).toBe("full");
  });

  it("trustClass inválido ⇒ full", () => {
    const d = classifyLane({ ...base, trustClass: "T9" as unknown as ActionDescriptor["trustClass"] });
    expect(d.lane).toBe("full");
  });

  it("T4 malformado (campos ausentes) ⇒ blocked (precedência sobre validação)", () => {
    // { trustClass: "T4" } sem os demais campos NÃO pode virar `full` roteável.
    const d = classifyLane({ trustClass: "T4" } as unknown as ActionDescriptor);
    expect(d.lane).toBe("blocked");
  });

  it("descritor não-objeto (null/primitivo/array) ⇒ full sem crashar", () => {
    for (const bad of [null, 42, "x", true, []]) {
      expect(classifyLane(bad as unknown as ActionDescriptor).lane).toBe("full");
    }
  });
});

describe("selfCheck", () => {
  it("os casos canônicos batem o lane esperado (0 divergências)", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      expect(selfCheck()).toBe(0);
    } finally {
      spy.mockRestore();
    }
  });
});
