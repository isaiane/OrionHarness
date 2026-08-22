import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  summarizePending,
  renderReport,
  computePendingEntries,
  type PendingData,
} from "./pending-report.ts";
import { lifecycleFingerprint } from "../ledger/ledger-origin.ts";
import type { LedgerItem } from "../ledger/ledger-guard.ts";
import type { PlanIssue } from "../plan/plan-report.ts";

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
  steps: ["validar"],
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

describe("summarizePending", () => {
  it("conta issues abertas, critérios pendentes e issues com pendência", () => {
    const data: PendingData = {
      openIssues: [iss(173, "T9.7a"), iss(127, "T8.1b")],
      pendingEntries: [led(29, "a", false), led(29, "b", false), led(74, "c", false)],
    };
    expect(summarizePending(data)).toEqual({ openIssues: 2, pendingCriteria: 3, pendingIssues: 2 });
  });
});

describe("renderReport — legível por um humano sem contexto", () => {
  const data: PendingData = {
    openIssues: [iss(173, "T9.7a — relatórios", "OPEN", { milestone: { title: "O9" } })],
    pendingEntries: [led(29, "schema valida", false), led(173, "gerador roda", false)],
  };
  const md = renderReport(data, {
    repo: "o/r",
    generatedAt: "2026-08-21T00:00:00Z",
    source: "fixture",
  });

  it("marca como gerado/scratch/gitignored (não fonte)", () => {
    expect(md).toContain("relatório gerado");
    expect(md).toContain(".orion/tmp/reports/");
    expect(md).toContain("gitignored");
  });
  it("lista Issues abertas por épico e verificação pendente por issue", () => {
    expect(md).toContain("## Issues abertas (por épico)");
    expect(md).toContain("### O9 (1)");
    expect(md).toContain("- #173 T9.7a — relatórios");
    expect(md).toContain("## Verificação pendente no ledger");
    expect(md).toContain("### #173 (1 pendente(s))");
    expect(md).toContain("- [ ] gerador roda");
  });

  it("banner de offline quando as Issues faltam; o ledger ainda rende", () => {
    const off = renderReport(
      { openIssues: [], pendingEntries: [led(29, "x", false)] },
      {
        issuesAvailable: false,
      },
    );
    expect(off).toContain("Issues indisponíveis");
    expect(off).toContain("Indisponível offline");
    expect(off).toContain("- [ ] x"); // parte de ledger presente offline
  });

  it("estados vazios são explícitos (sem Issue aberta / sem pendência)", () => {
    const empty = renderReport({ openIssues: [], pendingEntries: [] }, {});
    expect(empty).toContain("_Nenhuma Issue aberta._");
    expect(empty).toContain("_Nenhuma verificação pendente no escopo._");
  });
});

describe("computePendingEntries — operação escopada canônica (D6), fail-closed", () => {
  const roots: string[] = [];
  // Repo válido: origem `orion` + lifecycle com `legacySha256` correto (loadScopedLedger valida ambos).
  const mkRepo = (
    ledger: LedgerItem[],
    legacyIds: string[] = [],
  ): { root: string; ledgerPath: string } => {
    const root = mkdtempSync(join(tmpdir(), "pending-"));
    roots.push(root);
    mkdirSync(join(root, ".orion"), { recursive: true });
    const ledgerPath = join(root, "feature-ledger.json");
    writeFileSync(ledgerPath, JSON.stringify(ledger));
    writeFileSync(join(root, ".orion/ledger-origin.json"), JSON.stringify({ origin: "orion" }));
    const legacySubset = ledger.filter((e) => legacyIds.includes(e.id));
    writeFileSync(
      join(root, ".orion/ledger-lifecycle.json"),
      JSON.stringify({
        regimeAdr: "ADR-0022",
        adoptedOn: "2026-07-28",
        legacyEntryIds: legacyIds,
        legacySha256: lifecycleFingerprint(legacySubset),
      }),
    );
    return { root, ledgerPath };
  };
  afterEach(() => {
    while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
  });

  it("pendentes = todas passes:false (sem legado)", () => {
    const { root, ledgerPath } = mkRepo([
      led(1, "a", false),
      led(2, "b", true),
      led(3, "c", false),
    ]);
    const pend = computePendingEntries(root, ledgerPath);
    expect(pend.map((e) => e.issue).sort()).toEqual([1, 3]);
  });

  it("passes:true nunca é pendente", () => {
    const { root, ledgerPath } = mkRepo([led(1, "a", true, "F-1-a"), led(1, "b", true, "F-1-b")]);
    expect(computePendingEntries(root, ledgerPath)).toEqual([]);
  });

  it("entrada legada (no marcador de lifecycle) é excluída das pendências (§d ADR-0022)", () => {
    const { root, ledgerPath } = mkRepo(
      [led(1, "legado", false, "F-1-leg"), led(2, "sob-regime", false, "F-2-reg")],
      ["F-1-leg"],
    );
    const pend = computePendingEntries(root, ledgerPath);
    expect(pend.map((e) => e.id)).toEqual(["F-2-reg"]);
  });

  it("marcador de origem inválido → FALHA FECHADA (não cai para escopo inteiro — Codex #175/#3)", () => {
    const { root, ledgerPath } = mkRepo([led(1, "a", false)]);
    writeFileSync(join(root, ".orion/ledger-origin.json"), JSON.stringify({ origin: "banana" }));
    expect(() => computePendingEntries(root, ledgerPath)).toThrow();
  });
});
