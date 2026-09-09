import { describe, expect, it } from "vitest";
import type { LedgerItem } from "./ledger-guard.ts";
import type { IssueState } from "./flip-batch.ts";
import { flippedEntries, staleIds } from "./flip-revalidate.ts";

const item = (id: string, passes: boolean, issue = 1): LedgerItem => ({
  id,
  issue,
  category: "functional",
  description: "d",
  steps: [],
  acceptance: "a",
  passes,
});

describe("flippedEntries — o lote que o PR flipa false→true vs base", () => {
  it("pega só as que eram false na base e são true no head", () => {
    const base = [item("F-a", false), item("F-b", false), item("F-c", true)];
    const head = [item("F-a", true), item("F-b", false), item("F-c", true)];
    expect(flippedEntries(base, head).map((e) => e.id)).toEqual(["F-a"]);
  });
  it("id novo no head (não na base) não conta como flip", () => {
    expect(flippedEntries([], [item("F-novo", true)]).map((e) => e.id)).toEqual([]);
  });
});

describe("staleIds — evidência que deixou de valer (bloqueia o merge)", () => {
  const flipped = [item("F-0206-x", true, 206), item("F-0244-y", true, 244)];
  it("todas ainda CLOSED+completed → nada stale", () => {
    const issues = new Map<number, IssueState>([
      [206, { number: 206, state: "CLOSED", stateReason: "COMPLETED" }],
      [244, { number: 244, state: "CLOSED", stateReason: "COMPLETED" }],
    ]);
    expect(staleIds(flipped, issues)).toEqual([]);
  });
  it("Issue reaberta → a entrada correspondente fica stale", () => {
    const issues = new Map<number, IssueState>([
      [206, { number: 206, state: "OPEN" }],
      [244, { number: 244, state: "CLOSED", stateReason: "COMPLETED" }],
    ]);
    expect(staleIds(flipped, issues)).toEqual(["F-0206-x"]);
  });
});
