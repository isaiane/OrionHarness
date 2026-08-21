import { describe, it, expect } from "vitest";
import {
  isValidLedgerEntry,
  validateLedgerEntries,
  buildStatus,
  summarizeStatus,
  renderReport,
  type StatusRow,
} from "./status-report.ts";
import type { LedgerItem } from "../ledger/ledger-guard.ts";
import type { PlanIssue } from "../plan/plan-report.ts";

// Fixture no formato de `feature-ledger.json` (entradas projetadas).
const led = (
  issue: number,
  acceptance: string,
  passes: boolean,
  id = `F-${issue}-x`,
): LedgerItem => ({
  id,
  issue,
  category: "functional",
  description: acceptance,
  steps: [],
  acceptance,
  passes,
});
const iss = (
  number: number,
  title: string,
  state = "OPEN",
  extra: Partial<PlanIssue> = {},
): PlanIssue => ({
  number,
  title,
  state,
  ...extra,
});

describe("isValidLedgerEntry / validateLedgerEntries — fail-closed", () => {
  it("aceita entrada bem-formada", () => {
    expect(isValidLedgerEntry(led(29, "schema versionado", false))).toBe(true);
  });
  it("rejeita issue/acceptance/passes ausentes ou com tipo errado", () => {
    expect(isValidLedgerEntry({ issue: "29", acceptance: "x", passes: false })).toBe(false);
    expect(isValidLedgerEntry({ issue: 29, acceptance: 123, passes: false })).toBe(false);
    expect(isValidLedgerEntry({ issue: 29, acceptance: "x", passes: "no" })).toBe(false);
    expect(isValidLedgerEntry(null)).toBe(false);
  });
  it("validateLedgerEntries lança no primeiro inválido (não gera status falso)", () => {
    expect(() => validateLedgerEntries([led(1, "ok", true), { issue: 2 }], "fixture")).toThrow(
      /inválida no índice 1/,
    );
  });
});

describe("buildStatus — agrupa por issue, junta metadados, ordena decrescente", () => {
  const ledger = [led(29, "crit A", true), led(29, "crit B", false), led(173, "crit C", false)];

  it("agrupa critérios por issue e conta passes", () => {
    const rows = buildStatus(ledger, [iss(29, "Ledger", "CLOSED"), iss(173, "T9.7a", "OPEN")]);
    const r29 = rows.find((r) => r.issue === 29)!;
    expect(r29.total).toBe(2);
    expect(r29.passed).toBe(1);
    expect(r29.title).toBe("Ledger");
    expect(r29.open).toBe(false);
  });

  it("ordena por número de issue decrescente (recente primeiro)", () => {
    const rows = buildStatus(ledger, []);
    expect(rows.map((r) => r.issue)).toEqual([173, 29]);
  });

  it("sem Issue correspondente (offline/removida) mantém os critérios e omite metadados", () => {
    const rows = buildStatus([led(999, "orfã", false)], []);
    expect(rows[0]!.title).toBeUndefined();
    expect(rows[0]!.open).toBeUndefined();
    expect(rows[0]!.total).toBe(1);
  });
});

describe("summarizeStatus", () => {
  it("conta issues, critérios, verificados e 100%-verificadas", () => {
    const rows: StatusRow[] = buildStatus(
      [led(1, "a", true), led(1, "b", true), led(2, "c", false)],
      [],
    );
    const s = summarizeStatus(rows);
    expect(s).toEqual({ issues: 2, criteria: 3, passed: 2, fullyVerified: 1 });
  });
});

describe("renderReport — legível por um humano sem contexto", () => {
  const rows = buildStatus(
    [led(29, "schema versionado", true), led(29, "valida", false)],
    [iss(29, "Ledger executável", "CLOSED")],
  );
  const md = renderReport(rows, {
    repo: "o/r",
    generatedAt: "2026-08-21T00:00:00Z",
    source: "fixture",
  });

  it("marca o relatório como gerado/scratch/gitignored (não fonte)", () => {
    expect(md).toContain("relatório gerado");
    expect(md).toContain(".orion/tmp/reports/");
    expect(md).toContain("gitignored");
  });
  it("mostra a issue com contagem e os critérios com checkbox", () => {
    expect(md).toContain("## #29 [fechada]");
    expect(md).toContain("(1/2)");
    expect(md).toContain("- [x] schema versionado");
    expect(md).toContain("- [ ] valida");
  });

  it("banner de offline quando os metadados de Issue faltam", () => {
    const off = renderReport(buildStatus([led(29, "x", false)], []), { issuesAvailable: false });
    expect(off).toContain("Metadados de Issue indisponíveis");
    expect(off).toContain("## #29 [sem metadados]");
  });

  it("estado vazio explica o comportamento correto (template/sem ledger)", () => {
    const empty = renderReport([], {});
    expect(empty).toContain("status vazio");
    expect(empty).toContain("**Resumo:** 0 issue(s)");
  });

  it("sanitiza título editável (não injeta heading/linha nova/comentário HTML)", () => {
    const md2 = renderReport(buildStatus([led(1, "c", false)], [iss(1, "t\n## falso <!-- x")]), {});
    expect(md2).not.toContain("\n## falso");
    expect(md2).toContain("&lt;!-- x");
  });
});
