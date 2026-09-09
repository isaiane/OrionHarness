import { describe, expect, it } from "vitest";
import type { LedgerItem } from "./ledger-guard.ts";
import {
  applyFlip,
  buildPrBody,
  eligibleForBatch,
  isEvidenced,
  projectBatch,
  type IssueState,
} from "./flip-batch.ts";

const item = (over: Partial<LedgerItem> = {}): LedgerItem => ({
  id: "F-0001-aaa",
  issue: 1,
  category: "functional",
  description: "d",
  steps: [],
  acceptance: "a",
  passes: false,
  ...over,
});

const closedDone = (n: number): IssueState => ({ number: n, state: "CLOSED", stateReason: "COMPLETED" });

describe("isEvidenced — sinal de evidência (ADR-0033: Issue CLOSED + completed)", () => {
  it("Issue CLOSED + completed → evidenciada", () => {
    expect(isEvidenced(item({ issue: 9 }), new Map([[9, closedDone(9)]]))).toBe(true);
    expect(isEvidenced(item({ issue: 9 }), new Map([[9, { number: 9, state: "closed", stateReason: "completed" }]]))).toBe(true);
  });
  it("Issue aberta → NÃO evidenciada", () => {
    expect(isEvidenced(item({ issue: 9 }), new Map([[9, { number: 9, state: "OPEN" }]]))).toBe(false);
  });
  it("CLOSED not-planned/duplicate → NÃO evidenciada", () => {
    expect(isEvidenced(item({ issue: 9 }), new Map([[9, { number: 9, state: "CLOSED", stateReason: "NOT_PLANNED" }]]))).toBe(false);
    expect(isEvidenced(item({ issue: 9 }), new Map([[9, { number: 9, state: "CLOSED", stateReason: null }]]))).toBe(false);
  });
  it("Issue ausente entre as lidas → NÃO evidenciada (fail-closed)", () => {
    expect(isEvidenced(item({ issue: 9 }), new Map())).toBe(false);
  });
});

describe("eligibleForBatch — awaitingFlip ∩ evidência", () => {
  it("filtra por evidência e ordena por id", () => {
    const aw = [item({ id: "F-9-b", issue: 2 }), item({ id: "F-9-a", issue: 1 }), item({ id: "F-9-c", issue: 3 })];
    const issues = new Map<number, IssueState>([[1, closedDone(1)], [3, closedDone(3)]]); // 2 sem evidência
    expect(eligibleForBatch(aw, issues).map((e) => e.id)).toEqual(["F-9-a", "F-9-c"]);
  });
  it("nada evidenciado → lote vazio", () => {
    expect(eligibleForBatch([item({ issue: 1 })], new Map([[1, { number: 1, state: "OPEN" }]]))).toEqual([]);
  });
});

describe("applyFlip — só os elegíveis viram true (puro)", () => {
  it("flipa apenas os ids do lote; demais intactos", () => {
    const led = [item({ id: "F-a" }), item({ id: "F-b" }), item({ id: "F-c", passes: true })];
    const out = applyFlip(led, new Set(["F-a"]));
    expect(out.find((x) => x.id === "F-a")!.passes).toBe(true);
    expect(out.find((x) => x.id === "F-b")!.passes).toBe(false);
    expect(led.find((x) => x.id === "F-a")!.passes).toBe(false); // não muta o original
  });
});

describe("buildPrBody — correlaciona o lote às Issues", () => {
  it("agrupa por Issue e explicita que humano mergeia", () => {
    const body = buildPrBody([item({ id: "F-0206-x", issue: 206 }), item({ id: "F-0206-y", issue: 206 }), item({ id: "F-0244-z", issue: 244 })]);
    expect(body).toContain("**3**"); // 3 entradas no lote
    expect(body).toContain("- #206: `F-0206-x`, `F-0206-y`");
    expect(body).toContain("- #244: `F-0244-z`");
    expect(body).toMatch(/merge é humano|nunca integra/i);
  });
});

describe("projectBatch — integra classificação + evidência", () => {
  it("só entrega entregue-E-evidenciada; pendente (não em main) fica de fora", () => {
    const scoped = [
      item({ id: "F-1-done", issue: 1 }), // entregue (em deliveredIds) + evidência → elegível
      item({ id: "F-2-premature", issue: 2 }), // entregue mas Issue aberta → sem evidência
      item({ id: "F-3-pending", issue: 3 }), // NÃO em deliveredIds (projeção desta branch) → nem awaiting
    ];
    const issues = new Map<number, IssueState>([[1, closedDone(1)], [2, { number: 2, state: "OPEN" }], [3, closedDone(3)]]);
    const r = projectBatch(scoped, scoped, new Set(), new Set(["F-1-done", "F-2-premature"]), new Set(), issues);
    expect(r.eligible.map((e) => e.id)).toEqual(["F-1-done"]);
    expect(r.flipped.find((x) => x.id === "F-1-done")!.passes).toBe(true);
    expect(r.flipped.find((x) => x.id === "F-3-pending")!.passes).toBe(false);
  });
});
