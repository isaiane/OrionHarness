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
  validateIssues,
  isValidIssue,
  nodeSupportsStripTypes,
  parseMilestoneBody,
  renderMilestonePlan,
  isValidMilestone,
  REPORTS_DIR,
  ISSUE_FETCH_LIMIT,
  type PlanIssue,
  type PlanMilestone,
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
  it("prefixo do épico tem precedência sobre menção de tarefa no meio (Codex r5)", () => {
    expect(parseEpicFromTitle("O9 — consolida resultado da T8.1")).toBe("O9");
    expect(parseEpicFromTitle("T9.3a — depende da T8.1")).toBe("O9");
  });
  it("sem correspondência → null", () => {
    expect(parseEpicFromTitle("chore(deps): bump vitest")).toBeNull();
    expect(parseEpicFromTitle("[SDD] feat(guard): validar alvo de leitura")).toBeNull();
    expect(
      parseEpicFromTitle("[SDD] Separação Harness Review vs Product Review (ADR-0008)"),
    ).toBeNull();
    expect(parseEpicFromTitle("")).toBeNull();
  });
});

describe("parseMilestoneBody — descrição do Milestone (ADR-0026)", () => {
  const desc =
    "## Objetivo\nFazer X e Y.\n\n## Tarefas\n- [x] T1.1 — algo → #15\n- [ ] T9.4 — futuro\n- [x] T2.0 -> #26";
  it("extrai objetivo e tarefas; promovida (→ #N) vs pendente", () => {
    const { objetivo, tasks } = parseMilestoneBody(desc);
    expect(objetivo).toBe("Fazer X e Y.");
    expect(tasks).toEqual([
      { text: "T1.1 — algo", issue: 15 },
      { text: "T9.4 — futuro" },
      { text: "T2.0", issue: 26 },
    ]);
  });
  it("descrição vazia/nula → objetivo vazio, 0 tarefas", () => {
    expect(parseMilestoneBody(null)).toEqual({ objetivo: "", tasks: [] });
    expect(parseMilestoneBody("")).toEqual({ objetivo: "", tasks: [] });
  });
  it("fail-closed em checkbox×ref inconsistente (Codex)", () => {
    expect(() => parseMilestoneBody("## Tarefas\n- [ ] pendente → #7")).toThrow(/malformada/);
    expect(() => parseMilestoneBody("## Tarefas\n- [x] promovida sem ref")).toThrow(/malformada/);
  });
});

describe("renderMilestonePlan — reconciliação e fail-closed (ADR-0026)", () => {
  const ms: PlanMilestone[] = [
    {
      number: 9,
      title: "O9 — Épico",
      state: "OPEN",
      description: "## Objetivo\nX.\n## Tarefas\n- [x] T9.1 → #130\n- [ ] T9.4 — futuro",
    },
    { number: 1, title: "F1 — Fundação", state: "CLOSED", description: "## Objetivo\nBase." },
  ];
  const issues: PlanIssue[] = [{ number: 130, title: "T9.1", state: "CLOSED" }];
  const opts = { repo: "r", generatedAt: "2026-08-14T00:00:00Z", source: "fixture" };

  it("F<n> antes de O<n>; épico + objetivo + tarefas com estado da Issue", () => {
    const md = renderMilestonePlan(ms, issues, opts);
    expect(md.indexOf("## F1")).toBeLessThan(md.indexOf("## O9")); // ordenação F antes de O
    expect(md).toContain("## O9 — Épico [aberto]");
    expect(md).toContain("_X._");
    expect(md).toContain("- #130 [fechada] T9.1"); // promovida → estado da Issue
    expect(md).toContain("- [ ] T9.4 — futuro _(proposta pendente)_");
  });
  it("fail-closed: tarefa → #N inexistente entre as Issues", () => {
    const bad: PlanMilestone[] = [
      { number: 9, title: "O9", state: "OPEN", description: "## Tarefas\n- [x] T → #999" },
    ];
    expect(() => renderMilestonePlan(bad, issues, opts)).toThrow(/#999.*não existe/);
  });
  it("fail-closed: #N referenciada em dois épicos (dedup 1:1, Codex)", () => {
    const dup: PlanMilestone[] = [
      { number: 1, title: "F1", state: "CLOSED", description: "## Tarefas\n- [x] a → #130" },
      { number: 9, title: "O9", state: "OPEN", description: "## Tarefas\n- [x] b → #130" },
    ];
    expect(() => renderMilestonePlan(dup, issues, opts)).toThrow(/dois épicos/);
  });
  it("fail-closed: Issue atribuída a outro Milestone (Codex)", () => {
    const iss: PlanIssue[] = [
      { number: 130, title: "T", state: "CLOSED", milestone: { number: 3 } },
    ];
    const m: PlanMilestone[] = [
      { number: 9, title: "O9", state: "OPEN", description: "## Tarefas\n- [x] a → #130" },
    ];
    expect(() => renderMilestonePlan(m, iss, opts)).toThrow(/atribuída ao Milestone #3/);
  });
  it("fail-closed: Issue atribuída ao Milestone mas ausente do checklist (Codex, bidirecional)", () => {
    const iss: PlanIssue[] = [
      { number: 130, title: "T", state: "CLOSED", milestone: { number: 9 } },
    ];
    const m: PlanMilestone[] = [
      { number: 9, title: "O9", state: "OPEN", description: "## Objetivo\nX." }, // sem checklist
    ];
    expect(() => renderMilestonePlan(m, iss, opts)).toThrow(/não aparece na descrição/);
  });
});

describe("isValidMilestone", () => {
  it("guarda de tipo + enum de state (Codex)", () => {
    expect(isValidMilestone({ number: 1, title: "O1", state: "OPEN" })).toBe(true);
    expect(isValidMilestone({ number: 1, title: "O1", state: "closed" })).toBe(true);
    expect(isValidMilestone({ number: 1, title: "O1", state: "BANANA" })).toBe(false);
    expect(isValidMilestone({ number: 1, title: "O1" })).toBe(false);
    expect(isValidMilestone(null)).toBe(false);
  });
});

describe("nodeSupportsStripTypes — Node >= 22.6 (Codex r5)", () => {
  it("aceita >= 22.6 e rejeita 22.0–22.5", () => {
    expect(nodeSupportsStripTypes("v22.6.0")).toBe(true);
    expect(nodeSupportsStripTypes("v22.11.0")).toBe(true);
    expect(nodeSupportsStripTypes("v24.0.0")).toBe(true);
    expect(nodeSupportsStripTypes("v22.5.1")).toBe(false);
    expect(nodeSupportsStripTypes("v22.0.0")).toBe(false);
  });
  it("versão irreconhecível não bloqueia", () => {
    expect(nodeSupportsStripTypes("desconhecida")).toBe(true);
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
  it("conta épicos, total, abertas e fechadas; (sem épico) NÃO conta como épico (Codex r6)", () => {
    const s = summarize([
      issue(139, "T9.3a — x", "OPEN"),
      issue(130, "T9.1 — y", "CLOSED"),
      issue(84, "chore: z", "OPEN"), // sem épico → excluído da contagem
    ]);
    expect(s).toEqual({ epics: 1, total: 3, open: 2, closed: 1 });
  });
});

describe("resolveOutPath — trava de escrita no scratch (Codex P1/P2)", () => {
  const base = mkdtempSync(join(tmpdir(), "plan-out-"));
  mkdirSync(join(base, REPORTS_DIR), { recursive: true });
  mkdirSync(join(base, "outside"), { recursive: true });

  it("aceita o default e caminhos dentro de REPORTS_DIR, ancorado na base (P2)", () => {
    expect(resolveOutPath(`${REPORTS_DIR}/plan.md`, base)).toBe(
      resolve(base, REPORTS_DIR, "plan.md"),
    );
    expect(resolveOutPath(`${REPORTS_DIR}/sub/x.md`, base)).toBe(
      resolve(base, REPORTS_DIR, "sub/x.md"),
    );
  });
  it("rejeita destino fora do scratch (não sobrescreve arquivo versionado)", () => {
    expect(() => resolveOutPath("AGENTS.md", base)).toThrow(/dentro de/);
    expect(() => resolveOutPath("/etc/passwd", base)).toThrow(/dentro de/);
    expect(() => resolveOutPath(`${REPORTS_DIR}/../../../AGENTS.md`, base)).toThrow(/dentro de/);
  });
  it("rejeita ancestral symlinkado que escaparia do scratch (P1)", () => {
    symlinkSync(join(base, "outside"), join(base, REPORTS_DIR, "link"));
    expect(() => resolveOutPath(`${REPORTS_DIR}/link/x.md`, base)).toThrow(/symlink/);
  });
  it("rejeita alvo que já é symlink (P1)", () => {
    writeFileSync(join(base, "outside", "real.md"), "");
    symlinkSync(join(base, "outside", "real.md"), join(base, REPORTS_DIR, "aslink.md"));
    expect(() => resolveOutPath(`${REPORTS_DIR}/aslink.md`, base)).toThrow(/symlink/);
  });
  it("rejeita quando o próprio dir de scratch é symlink p/ fora da raiz (Codex r5)", () => {
    const b = mkdtempSync(join(tmpdir(), "plan-out2-"));
    const ext = mkdtempSync(join(tmpdir(), "plan-ext-"));
    mkdirSync(join(b, ".orion", "tmp"), { recursive: true });
    symlinkSync(ext, join(b, ".orion", "tmp", "reports")); // reports -> destino externo
    expect(() => resolveOutPath(`${REPORTS_DIR}/plan.md`, b)).toThrow(/symlink/);
  });
  it("rejeita scratch symlinkado p/ DENTRO do repo (raiz) — não escrever AGENTS.md (Codex r6)", () => {
    const b = mkdtempSync(join(tmpdir(), "plan-out3-"));
    mkdirSync(join(b, ".orion", "tmp"), { recursive: true });
    symlinkSync(b, join(b, ".orion", "tmp", "reports")); // reports -> raiz do próprio repo
    expect(() => resolveOutPath(`${REPORTS_DIR}/AGENTS.md`, b)).toThrow(/symlink/);
  });
});

describe("validateIssues — falha fechada em forma inválida (Codex r3)", () => {
  it("aceita Issues bem-formadas", () => {
    const ok = [{ number: 1, title: "T9.3a", state: "OPEN" }];
    expect(validateIssues(ok, "teste")).toEqual(ok);
  });
  it("rejeita elemento sem number/title/state (ex.: [{}])", () => {
    expect(() => validateIssues([{}], "teste")).toThrow(/inválida no índice 0/);
    expect(() => validateIssues([{ number: 1, title: "x" }], "teste")).toThrow(/state/);
    expect(() => validateIssues([{ number: "1", title: "x", state: "OPEN" }], "teste")).toThrow();
  });
  it("rejeita state fora de OPEN/CLOSED — ex.: BANANA (Codex r4)", () => {
    expect(() => validateIssues([{ number: 1, title: "x", state: "BANANA" }], "teste")).toThrow(
      /OPEN\/CLOSED/,
    );
  });
  it("isValidIssue: guarda de tipo + enum de state", () => {
    expect(isValidIssue({ number: 1, title: "x", state: "OPEN" })).toBe(true);
    expect(isValidIssue({ number: 1, title: "x", state: "closed" })).toBe(true);
    expect(isValidIssue({ number: 1, title: "x", state: "BANANA" })).toBe(false);
    expect(isValidIssue(null)).toBe(false);
    expect(isValidIssue({})).toBe(false);
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
  const opts = {
    repo: "isaiane/OrionHarness",
    generatedAt: "2026-08-11T00:00:00Z",
    source: "fixture",
  };

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
    expect(md).toContain("**Resumo:** 1 épico(s) · 3 tarefa(s) (2 aberta(s) · 1 fechada(s)).");
    expect(md).toContain("## O9 (1 aberta(s) · 1 fechada(s))");
    expect(md).toContain("- #139 [aberta] `type:task` T9.3a — Gerador de plano offline");
    expect(md).toContain("- #130 [fechada] `type:task` T9.1 — ADR-0025");
    expect(md).toContain("## (sem épico) (1 aberta(s) · 0 fechada(s))");
    expect(md).toContain("- #84 [aberta] `type:chore` chore(deps): bump");
    // O9 aparece antes de (sem épico)
    expect(md.indexOf("## O9")).toBeLessThan(md.indexOf("## (sem épico)"));
  });
});
