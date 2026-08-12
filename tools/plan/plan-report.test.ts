import { describe, it, expect } from "vitest";
import { resolve, join } from "node:path";
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import {
  parseEpicFromTitle,
  epicOf,
  groupByEpic,
  summarize,
  renderReport,
  isOpen,
  resolveOutPath,
  assertNotTruncated,
  REPORTS_DIR,
  ISSUE_FETCH_LIMIT,
  type PlanIssue,
} from "./plan-report.ts";

// Fixture no formato de `gh issue list --json number,title,state,labels,milestone` (sem rede).
const issue = (
  number: number,
  title: string,
  state: "OPEN" | "CLOSED" = "OPEN",
  extra: Partial<PlanIssue> = {},
): PlanIssue => ({
  number,
  title,
  state,
  labels: [{ name: "type:task" }],
  milestone: null,
  ...extra,
});

describe("parseEpicFromTitle — ponte transitória (prefixo)", () => {
  it("T<major>.<minor>[letra] → O<major>", () => {
    expect(parseEpicFromTitle("T9.3a — Gerador de plano offline")).toBe("O9");
    expect(parseEpicFromTitle("T8.2 (spike) — Investigar…")).toBe("O8");
    expect(parseEpicFromTitle("T10.1 — algo")).toBe("O10");
  });
  it("título que já é épico O<n>", () => {
    expect(parseEpicFromTitle("O9 — Fim do Markdown autoral")).toBe("O9");
  });
  it("descarta tag inicial entre colchetes ([SDD] T1.1 → O1)", () => {
    expect(parseEpicFromTitle("[SDD] T1.1 — CI bloqueante")).toBe("O1");
    expect(parseEpicFromTitle("[SDD] T5.1 — Fast-lane")).toBe("O5");
    expect(parseEpicFromTitle("[chore] T2.3 — algo")).toBe("O2");
  });
  it("fallback: token T<n>.<n> no meio do título", () => {
    expect(parseEpicFromTitle("[SDD] docs(fast-lane): refinamentos da T5.1 (README)")).toBe("O5");
  });
  it("sem correspondência → null", () => {
    expect(parseEpicFromTitle("chore(deps): bump vitest")).toBeNull();
    expect(parseEpicFromTitle("[SDD] feat(guard): validar alvo de leitura")).toBeNull();
    expect(parseEpicFromTitle("[SDD] Separação Harness Review vs Product Review (ADR-0008)")).toBeNull();
    expect(parseEpicFromTitle("")).toBeNull();
  });
});

describe("epicOf — Milestone tem precedência sobre o prefixo (D2)", () => {
  it("usa a Milestone quando presente", () => {
    const i = issue(1, "T9.3a — x", "OPEN", { milestone: { title: "Épico O9 (Milestone)" } });
    expect(epicOf(i)).toBe("Épico O9 (Milestone)");
  });
  it("cai no prefixo quando não há Milestone", () => {
    expect(epicOf(issue(1, "T9.3a — x"))).toBe("O9");
  });
  it("Milestone vazia/whitespace não sobrepõe o prefixo", () => {
    expect(epicOf(issue(1, "T9.3a — x", "OPEN", { milestone: { title: "   " } }))).toBe("O9");
  });
  it("sem prefixo e sem Milestone → (sem épico)", () => {
    expect(epicOf(issue(84, "chore(deps): bump"))).toBe("(sem épico)");
  });
});

describe("groupByEpic — ordenação", () => {
  const issues = [
    issue(84, "chore(deps): bump", "OPEN"),
    issue(130, "T9.1 — ADR-0025", "CLOSED"),
    issue(125, "T8.1a — STATE", "CLOSED"),
    issue(139, "T9.3a — Gerador", "OPEN"),
  ];
  it("épicos O<n> por número crescente; (sem épico) por último", () => {
    const groups = groupByEpic(issues);
    expect(groups.map((g) => g.epic)).toEqual(["O8", "O9", "(sem épico)"]);
  });
  it("dentro do épico: abertas antes de fechadas, depois por número", () => {
    const groups = groupByEpic(issues);
    const o9 = groups.find((g) => g.epic === "O9")!;
    expect(o9.issues.map((i) => [i.number, isOpen(i)])).toEqual([
      [139, true], // aberta primeiro
      [130, false], // fechada depois
    ]);
  });
});

describe("summarize", () => {
  it("conta épicos, total, abertas e fechadas", () => {
    const s = summarize([
      issue(139, "T9.3a — x", "OPEN"),
      issue(130, "T9.1 — y", "CLOSED"),
      issue(84, "chore: z", "OPEN"),
    ]);
    expect(s).toEqual({ epics: 2, total: 3, open: 2, closed: 1 });
  });
});

describe("resolveOutPath — trava de escrita no scratch (Codex P1/P2)", () => {
  const base = mkdtempSync(join(tmpdir(), "plan-out-"));
  mkdirSync(join(base, REPORTS_DIR), { recursive: true });
  mkdirSync(join(base, "outside"), { recursive: true });

  it("aceita o default e caminhos dentro de REPORTS_DIR, ancorado na base (P2)", () => {
    expect(resolveOutPath(`${REPORTS_DIR}/plan.md`, base)).toBe(resolve(base, REPORTS_DIR, "plan.md"));
    expect(resolveOutPath(`${REPORTS_DIR}/sub/x.md`, base)).toBe(resolve(base, REPORTS_DIR, "sub/x.md"));
  });
  it("rejeita destino fora do scratch (não sobrescreve arquivo versionado)", () => {
    expect(() => resolveOutPath("AGENTS.md", base)).toThrow(/dentro de/);
    expect(() => resolveOutPath("/etc/passwd", base)).toThrow(/dentro de/);
    expect(() => resolveOutPath(`${REPORTS_DIR}/../../../AGENTS.md`, base)).toThrow(/dentro de/);
  });
  it("rejeita ancestral symlinkado que escaparia do scratch (P1)", () => {
    symlinkSync(join(base, "outside"), join(base, REPORTS_DIR, "link"));
    expect(() => resolveOutPath(`${REPORTS_DIR}/link/x.md`, base)).toThrow(/dentro de/);
  });
  it("rejeita alvo que já é symlink (P1)", () => {
    writeFileSync(join(base, "outside", "real.md"), "");
    symlinkSync(join(base, "outside", "real.md"), join(base, REPORTS_DIR, "aslink.md"));
    expect(() => resolveOutPath(`${REPORTS_DIR}/aslink.md`, base)).toThrow(/symlink/);
  });
});

describe("assertNotTruncated — fail-closed no teto (Codex P2)", () => {
  it("passa abaixo do teto", () => {
    expect(() => assertNotTruncated(ISSUE_FETCH_LIMIT - 1, ISSUE_FETCH_LIMIT)).not.toThrow();
  });
  it("falha ao atingir o teto (possível truncamento)", () => {
    expect(() => assertNotTruncated(ISSUE_FETCH_LIMIT, ISSUE_FETCH_LIMIT)).toThrow(/truncad/);
  });
});

describe("renderReport", () => {
  const opts = { repo: "isaiane/OrionHarness", generatedAt: "2026-08-11T00:00:00Z", source: "fixture" };

  it("estado vazio: explica que plano vazio é correto num template", () => {
    const md = renderReport([], opts);
    expect(md).toContain("Nenhuma Issue encontrada");
    expect(md).toContain("template-repo");
    expect(md).not.toContain("## O"); // nenhuma seção de épico
  });

  it("determinístico (mesmo input → mesma saída)", () => {
    const issues = [issue(139, "T9.3a — Gerador", "OPEN"), issue(130, "T9.1 — ADR", "CLOSED")];
    expect(renderReport(issues, opts)).toBe(renderReport(issues, opts));
  });

  it("mapa utilizável: cabeçalho, resumo, épico, nº/estado/tipo e nota gitignored", () => {
    const md = renderReport(
      [
        issue(139, "T9.3a — Gerador de plano offline", "OPEN"),
        issue(130, "T9.1 — ADR-0025", "CLOSED"),
        issue(84, "chore(deps): bump", "OPEN", { labels: [{ name: "type:chore" }] }),
      ],
      opts,
    );
    expect(md).toContain("# Plano (relatório gerado) — isaiane/OrionHarness");
    expect(md).toContain("gitignored");
    expect(md).toContain("**Resumo:** 2 épico(s) · 3 tarefa(s) (2 aberta(s) · 1 fechada(s)).");
    expect(md).toContain("## O9 (1 aberta(s) · 1 fechada(s))");
    expect(md).toContain("- #139 [aberta] `type:task` T9.3a — Gerador de plano offline");
    expect(md).toContain("- #130 [fechada] `type:task` T9.1 — ADR-0025");
    expect(md).toContain("## (sem épico) (1 aberta(s) · 0 fechada(s))");
    expect(md).toContain("- #84 [aberta] `type:chore` chore(deps): bump");
    // O9 aparece antes de (sem épico)
    expect(md.indexOf("## O9")).toBeLessThan(md.indexOf("## (sem épico)"));
  });
});
