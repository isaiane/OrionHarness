import { describe, expect, it } from "vitest";
import type { LedgerItem } from "./ledger-guard.ts";
import type { IssueState } from "./flip-batch.ts";
import { flippedEntries, staleIds, batchIssues } from "./flip-revalidate.ts";

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

describe("batchIssues — Issues de origem do lote (ADR-0037 §4(b)(i), Codex #305)", () => {
  const e = (id: string, issue: number, passes: boolean) =>
    ({ id, issue, category: "functional", description: "d", steps: [], acceptance: "a", passes }) as LedgerItem;

  it("só as Issues das entradas flipadas false→true, únicas e ordenadas", () => {
    const base = [e("F-0300-a", 300, false), e("F-0298-b", 298, false), e("F-0300-c", 300, false), e("F-0001-z", 1, false)];
    const head = [e("F-0300-a", 300, true), e("F-0298-b", 298, true), e("F-0300-c", 300, true), e("F-0001-z", 1, false)];
    expect(batchIssues(base, head)).toEqual([298, 300]);
  });

  it("PR que não flipa nada ⇒ lista vazia", () => {
    const base = [e("F-0001-z", 1, false)];
    expect(batchIssues(base, base)).toEqual([]);
  });
});
