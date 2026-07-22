import { describe, it, expect, vi } from "vitest";
import { routeCrossModel, distinctAuthorship, selfCheck, type CrossModelRound } from "./cross-model-review.ts";

// Base concordante: implementador ≠ revisor, testes do revisor, verde, T2 ⇒ human_merge.
const base: CrossModelRound = {
  implementerModel: "claude-code",
  reviewerModel: "codex",
  testsAuthoredByReviewer: true,
  testsPass: true,
  trustClass: "T2",
};

describe("routeCrossModel — roteamento", () => {
  it("concordância + verde (T2) ⇒ human_merge (independente)", () => {
    const d = routeCrossModel(base);
    expect(d.route).toBe("human_merge");
    expect(d.independent).toBe(true);
    expect(d.reasons).toHaveLength(0);
  });

  it("divergência (testes do revisor falham) ⇒ escalate_human", () => {
    const d = routeCrossModel({ ...base, testsPass: false });
    expect(d.route).toBe("escalate_human");
    expect(d.reasons.length).toBeGreaterThan(0);
  });

  it("autorrevisão (autor == revisor) ⇒ escalate_human (independência quebrada)", () => {
    const d = routeCrossModel({ ...base, reviewerModel: "claude-code" });
    expect(d.route).toBe("escalate_human");
    expect(d.independent).toBe(false);
  });

  it("testes escritos pelo autor (não pelo revisor) ⇒ escalate_human", () => {
    expect(routeCrossModel({ ...base, testsAuthoredByReviewer: false }).route).toBe("escalate_human");
  });

  it("concordância mas T3 ⇒ escalate_human (exige decisão humana)", () => {
    expect(routeCrossModel({ ...base, trustClass: "T3" }).route).toBe("escalate_human");
  });

  it("T4 ⇒ blocked (proibida, não roteável — nem merge, nem arbitragem)", () => {
    expect(routeCrossModel({ ...base, trustClass: "T4" }).route).toBe("blocked");
  });
});

describe("routeCrossModel — fail-closed (rodadas malformadas)", () => {
  it("trustClass inválido ⇒ escalate_human", () => {
    const d = routeCrossModel({ ...base, trustClass: "T9" as unknown as CrossModelRound["trustClass"] });
    expect(d.route).toBe("escalate_human");
  });

  it("flags não-boolean ⇒ escalate_human", () => {
    expect(routeCrossModel({ ...base, testsPass: "yes" as unknown as boolean }).route).toBe("escalate_human");
    expect(routeCrossModel({ ...base, testsAuthoredByReviewer: 1 as unknown as boolean }).route).toBe("escalate_human");
  });

  it("modelos vazios/ausentes ⇒ escalate_human", () => {
    expect(routeCrossModel({ ...base, reviewerModel: "" }).route).toBe("escalate_human");
    expect(routeCrossModel({ ...base, implementerModel: "   " }).route).toBe("escalate_human");
  });

  it("T4 malformado (campos ausentes) ⇒ blocked (precedência sobre validação)", () => {
    const d = routeCrossModel({ trustClass: "T4" } as unknown as CrossModelRound);
    expect(d.route).toBe("blocked");
  });

  it("rodada não-objeto (null/primitivo/array) ⇒ escalate_human sem crashar", () => {
    for (const bad of [null, 42, "x", true, []]) {
      expect(routeCrossModel(bad as unknown as CrossModelRound).route).toBe("escalate_human");
    }
  });

  it("primitivos não-serializáveis (BigInt/symbol/undefined) ⇒ escalate_human sem lançar", () => {
    // JSON.stringify(1n) lança TypeError; o fail-closed deve RETORNAR a rota, não crashar.
    for (const bad of [1n, Symbol("x"), undefined]) {
      expect(() => routeCrossModel(bad as unknown as CrossModelRound)).not.toThrow();
      expect(routeCrossModel(bad as unknown as CrossModelRound).route).toBe("escalate_human");
    }
    // BigInt DENTRO de um campo (objeto válido, trustClass BigInt) também não pode lançar.
    const withBigIntField = { ...base, trustClass: 1n as unknown as CrossModelRound["trustClass"] };
    expect(() => routeCrossModel(withBigIntField)).not.toThrow();
    expect(routeCrossModel(withBigIntField).route).toBe("escalate_human");
  });
});

describe("distinctAuthorship", () => {
  it("normaliza espaço/caixa e rejeita iguais/vazios", () => {
    expect(distinctAuthorship("Claude-Code", "  claude-code ")).toBe(false);
    expect(distinctAuthorship("claude-code", "codex")).toBe(true);
    expect(distinctAuthorship("", "codex")).toBe(false);
  });
  // CAVEAT documentado no fonte: aliases do mesmo modelo (`codex` vs `codex-cli`) NÃO são detectados
  // por comparação de string — o chamador real deve canonicalizar antes de rotear.
  it("(limite conhecido) aliases do mesmo modelo passam como distintos", () => {
    expect(distinctAuthorship("codex", "codex-cli")).toBe(true);
  });
});

describe("selfCheck", () => {
  it("os casos canônicos batem a rota esperada (0 divergências)", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      expect(selfCheck()).toBe(0);
    } finally {
      spy.mockRestore();
    }
  });
});
