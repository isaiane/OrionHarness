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
  parseMilestoneBodyV2,
  detectMilestoneFormat,
  issueStatusLabel,
  isCompleted,
  renderMilestonePlan,
  isValidMilestone,
  isGhUnavailable,
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
  it("fail-closed: proposta com texto duplicado no mesmo Milestone (Codex)", () => {
    const dupText: PlanMilestone[] = [
      {
        number: 9,
        title: "O9",
        state: "OPEN",
        description: "## Tarefas\n- [x] mesma → #130\n- [ ] mesma",
      },
    ];
    expect(() => renderMilestonePlan(dupText, issues, opts)).toThrow(/aparece duas vezes/);
  });
  it("Milestones vazios (offline/indisponível) → relatório explícito de 0 épicos (Codex #A)", () => {
    const md = renderMilestonePlan([], [], {
      ...opts,
      source: "Milestones indisponíveis (offline)",
    });
    expect(md).toContain("**Resumo:** 0 épico(s)");
    expect(md).toContain("Milestones indisponíveis (offline)");
  });
  it("fail-closed: Issue atribuída ao Milestone mas ausente do checklist (Codex, bidirecional)", () => {
    const iss: PlanIssue[] = [
      { number: 130, title: "T", state: "CLOSED", milestone: { number: 9 } },
    ];
    const m: PlanMilestone[] = [
      { number: 9, title: "O9", state: "OPEN", description: "## Objetivo\nX." }, // sem checklist
    ];
    expect(() => renderMilestonePlan(m, iss, opts)).toThrow(/não foi reconciliada/);
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

describe("isGhUnavailable — classifica indisponibilidade do gh vs. erro operacional (#160)", () => {
  it("reconhece a mensagem PADRÃO de offline do gh (exit 1, não 4) — a lacuna do #160", () => {
    expect(isGhUnavailable({ status: 1, stderr: "error connecting to api.github.com" })).toBe(true);
    expect(
      isGhUnavailable({ status: 1, stderr: "check your internet connection and try again" }),
    ).toBe(true);
  });
  it("reconhece gh ausente (ENOENT) e auth requerida (exit 4)", () => {
    expect(isGhUnavailable({ code: "ENOENT" })).toBe(true);
    expect(isGhUnavailable({ status: 4, stderr: "authentication required" })).toBe(true);
  });
  it("reconhece sinais de rede clássicos (stderr ou message)", () => {
    expect(isGhUnavailable({ stderr: "could not resolve host: api.github.com" })).toBe(true);
    expect(isGhUnavailable({ stderr: "network is unreachable" })).toBe(true);
    expect(isGhUnavailable({ message: "dial tcp: i/o timeout" })).toBe(true);
  });
  it("NÃO degrada erro OPERACIONAL (repo inexistente/permissão) — falha fechada", () => {
    expect(
      isGhUnavailable({ status: 1, stderr: "GraphQL: Could not resolve to a Repository" }),
    ).toBe(false);
    expect(
      isGhUnavailable({ status: 1, stderr: "HTTP 403: Resource not accessible by integration" }),
    ).toBe(false);
    expect(isGhUnavailable({ status: 1, stderr: "" })).toBe(false);
  });
});

// ───────── Fatia (b) — dual-format v2 + stateReason (ADR-0031) ─────────

// Descrição v2 mínima válida (ADR-0031 §2): ## Objetivo + blocos ### <n>. <nome> + ## Como iniciar.
const v2Body = (nomes: string[] = ["Primeira tarefa", "Segunda tarefa"]) =>
  [
    "## Objetivo",
    "Redesenhar a gestão do plano.",
    "",
    ...nomes.flatMap((nome, i) => [
      `### ${i + 1}. ${nome}`,
      "**Necessidade.** dor.",
      "**Escopo.** o que faz.",
      "**Forma dos critérios.** verificável.",
      "**Classe** T2 · G1",
      "**Dependências.** nenhuma.",
      "",
    ]),
    "## Como iniciar",
    "",
    "```text",
    "Cole numa sessão Cowork…",
    "```",
  ].join("\n");

describe("detectMilestoneFormat — v1 vs v2", () => {
  it("v2 quando há bloco `### <n>. <nome>`", () => {
    expect(detectMilestoneFormat(v2Body())).toBe("v2");
  });
  it("v1 quando é checklist `## Tarefas`", () => {
    expect(detectMilestoneFormat("## Objetivo\nX\n## Tarefas\n- [ ] uma")).toBe("v1");
  });
  it("v1 para descrição vazia/nula", () => {
    expect(detectMilestoneFormat("")).toBe("v1");
    expect(detectMilestoneFormat(null)).toBe("v1");
  });
});

describe("parseMilestoneBodyV2 — blocos de design (fail-closed)", () => {
  it("extrai objetivo e os nomes das tarefas (ordinal + nome)", () => {
    const { objetivo, taskNames } = parseMilestoneBodyV2(v2Body(["Alfa", "Beta"]));
    expect(objetivo).toBe("Redesenhar a gestão do plano.");
    expect(taskNames).toEqual(["1. Alfa", "2. Beta"]);
  });
  it("fail-closed: sem ## Objetivo", () => {
    const b = v2Body().replace("## Objetivo\nRedesenhar a gestão do plano.\n", "");
    expect(() => parseMilestoneBodyV2(b)).toThrow(/Objetivo/);
  });
  it("fail-closed: sem ## Como iniciar", () => {
    const b = v2Body().replace(/## Como iniciar[\s\S]*$/, "");
    expect(() => parseMilestoneBodyV2(b)).toThrow(/Como iniciar/);
  });
  it("fail-closed: nome de tarefa duplicado", () => {
    expect(() => parseMilestoneBodyV2(v2Body(["Igual", "Igual"]))).toThrow(/duplicado|único/);
  });
});

describe("issueStatusLabel / isCompleted — stateReason (ADR-0031)", () => {
  const mk = (state: string, stateReason?: string | null): PlanIssue => ({
    number: 1,
    title: "T",
    state,
    stateReason,
  });
  it("aberta", () => {
    expect(issueStatusLabel(mk("OPEN"))).toBe("aberta");
    expect(isCompleted(mk("OPEN"))).toBe(false);
  });
  it("concluída só com CLOSED + completed", () => {
    expect(issueStatusLabel(mk("CLOSED", "COMPLETED"))).toBe("concluída");
    expect(isCompleted(mk("CLOSED", "COMPLETED"))).toBe(true);
  });
  it("not planned / duplicate NÃO são concluída", () => {
    expect(issueStatusLabel(mk("CLOSED", "NOT_PLANNED"))).toBe("fechada (não planejada)");
    expect(issueStatusLabel(mk("CLOSED", "DUPLICATE"))).toBe("fechada (duplicata)");
    expect(isCompleted(mk("CLOSED", "NOT_PLANNED"))).toBe(false);
    expect(isCompleted(mk("CLOSED", "DUPLICATE"))).toBe(false);
  });
  it("CLOSED sem reason conhecido → fechada (não afirma concluída)", () => {
    expect(issueStatusLabel(mk("CLOSED", null))).toBe("fechada");
    expect(isCompleted(mk("CLOSED", null))).toBe(false);
  });
});

describe("renderMilestonePlan — v2 e dual-format", () => {
  const opts = { repo: "o/r", generatedAt: "T", source: "fixture" };
  it("v2: reconcilia Issues associadas pelo estado nativo, SEM lançar (era o falso-vermelho do O11)", () => {
    const ms: PlanMilestone[] = [{ number: 16, title: "O11", state: "OPEN", description: v2Body() }];
    const iss: PlanIssue[] = [
      { number: 220, title: "fatia b", state: "OPEN", milestone: { number: 16 } },
      { number: 209, title: "fatia a", state: "CLOSED", stateReason: "COMPLETED", milestone: { number: 16 } },
    ];
    const md = renderMilestonePlan(ms, iss, opts);
    expect(md).toContain("## O11 [aberto] · v2");
    expect(md).toContain("**Tarefas planejadas (2):**");
    expect(md).toContain("- 1. Primeira tarefa");
    expect(md).toContain("**Issues promovidas (2 · 1 concluída(s)):**");
    expect(md).toContain("- #209 [concluída] fatia a");
    expect(md).toContain("- #220 [aberta] fatia b");
  });
  it("v2: Issue fechada como not planned NÃO conta como concluída", () => {
    const ms: PlanMilestone[] = [{ number: 16, title: "O11", state: "OPEN", description: v2Body() }];
    const iss: PlanIssue[] = [
      { number: 1, title: "x", state: "CLOSED", stateReason: "NOT_PLANNED", milestone: { number: 16 } },
    ];
    const md = renderMilestonePlan(ms, iss, opts);
    expect(md).toContain("**Issues promovidas (1 · 0 concluída(s)):**");
    expect(md).toContain("- #1 [fechada (não planejada)] x");
  });
  it("dual-format: v1 (checklist) e v2 (blocos) no mesmo run, ambos renderizados", () => {
    const ms: PlanMilestone[] = [
      { number: 7, title: "O7", state: "OPEN", description: "## Objetivo\nLegado.\n## Tarefas\n- [x] T7.1 → #70\n- [ ] T7.2" },
      { number: 16, title: "O11", state: "OPEN", description: v2Body() },
    ];
    const iss: PlanIssue[] = [
      { number: 70, title: "t71", state: "CLOSED", stateReason: "COMPLETED", milestone: { number: 7 } },
      { number: 220, title: "fatia b", state: "OPEN", milestone: { number: 16 } },
    ];
    const md = renderMilestonePlan(ms, iss, opts);
    expect(md).toContain("## O7 [aberto]"); // v1 sem sufixo · v2
    expect(md).not.toContain("## O7 [aberto] · v2");
    expect(md).toContain("- #70 [concluída] T7.1");
    expect(md).toContain("- [ ] T7.2 _(proposta pendente)_");
    expect(md).toContain("## O11 [aberto] · v2");
    expect(md).toContain("- #220 [aberta] fatia b");
  });
  it("v2 fail-closed: descrição detectada v2 mas malformada (sem Como iniciar) lança", () => {
    const bad = v2Body().replace(/## Como iniciar[\s\S]*$/, "");
    const ms: PlanMilestone[] = [{ number: 16, title: "O11", state: "OPEN", description: bad }];
    expect(() => renderMilestonePlan(ms, [], opts)).toThrow(/Como iniciar/);
  });
});

// ───────── Fatia (b), rodada 2 — rigor do parser v2 (Codex #221) ─────────
describe("parseMilestoneBodyV2 — rigor da gramática (Codex #221)", () => {
  // fix #1: ## Como iniciar presente + header malformado → detecta v2 e falha-fechado (não vira v1-vazio)
  it("#1 detecta v2 por `## Como iniciar` mesmo com header de bloco malformado", () => {
    const bad = "## Objetivo\nX.\n\n### 1 Task\n**Necessidade.** a\n\n## Como iniciar\n```text\np\n```";
    expect(detectMilestoneFormat(bad)).toBe("v2");
    expect(() => parseMilestoneBodyV2(bad)).toThrow(/malformado|### <n>/);
  });
  // #2 roteado a follow-up (decisão A): o leitor NÃO valida a gramática profunda dos 5 rótulos — o
  // exemplo canônico (O11) não traz `**Escopo.**` em todo bloco; falhar-fechado rejeitaria o canônico.
  it("#2 (A) tolera bloco sem um rótulo (não valida a gramática profunda — follow-up)", () => {
    const semEscopo = [
      "## Objetivo", "X.", "",
      "### 1. Tarefa", "**Necessidade.** a **Forma dos critérios.** b **Classe** T2 **Dependências.** c", "",
      "## Como iniciar", "```text", "p", "```",
    ].join("\n");
    expect(() => parseMilestoneBodyV2(semEscopo)).not.toThrow();
    expect(parseMilestoneBodyV2(semEscopo).taskNames).toEqual(["1. Tarefa"]);
  });
  // fix #3: `### N.` dentro do prompt de `## Como iniciar` (após a fronteira) é ignorado
  it("#3 ignora `### N.` dentro do prompt de Como iniciar (fronteira)", () => {
    const comExemplo = [
      "## Objetivo", "X.", "",
      "### 1. Real", "**Necessidade.** a", "**Escopo.** b", "**Forma dos critérios.** c", "**Classe** T2", "**Dependências.** d", "",
      "## Como iniciar", "```text", "Exemplo de bloco no prompt:", "### 3. Exemplo No Prompt", "```",
    ].join("\n");
    const { taskNames } = parseMilestoneBodyV2(comExemplo);
    expect(taskNames).toEqual(["1. Real"]); // o `### 3.` do prompt NÃO entra
  });
});

// ───────── Fatia (b), rodada 3 — rigor estrutural (Codex #221 r3) ─────────
describe("parseMilestoneBodyV2 — ordem/objetivo/Como iniciar (Codex #221 r3)", () => {
  it("#A falha-fechado: bloco antes do `## Objetivo`", () => {
    const blocoAntes = [
      "### 1. Tarefa", "**Necessidade.** a", "",
      "## Objetivo", "X.", "",
      "## Como iniciar", "```text", "p", "```",
    ].join("\n");
    expect(() => parseMilestoneBodyV2(blocoAntes)).toThrow(/antes do .*Objetivo|começar pelo/i);
  });
  it("#A falha-fechado: `## Objetivo` repetido", () => {
    const objDuplo = [
      "## Objetivo", "X.", "",
      "### 1. Tarefa", "**Necessidade.** a", "",
      "## Objetivo", "Y.", "",
      "## Como iniciar", "```text", "p", "```",
    ].join("\n");
    expect(() => parseMilestoneBodyV2(objDuplo)).toThrow(/repetido|único/i);
  });
  it("#C-mínimo falha-fechado: `## Como iniciar` vazio", () => {
    const comoVazio = [
      "## Objetivo", "X.", "",
      "### 1. Tarefa", "**Necessidade.** a", "",
      "## Como iniciar", "",
    ].join("\n");
    expect(() => parseMilestoneBodyV2(comoVazio)).toThrow(/Como iniciar.*vazio|vazio/i);
  });
  it("#C-mínimo aceita `## Como iniciar` com conteúdo (prompt)", () => {
    const ok = [
      "## Objetivo", "X.", "",
      "### 1. Tarefa", "**Necessidade.** a", "",
      "## Como iniciar", "```text", "Cole numa sessão…", "```",
    ].join("\n");
    expect(() => parseMilestoneBodyV2(ok)).not.toThrow();
  });
});

// ───────── Fatia (b), rodada 4 — rigor estrutural (Codex #221 r4) ─────────
describe("plan-report v2 — rigor estrutural r4 (Codex #221 r4)", () => {
  it("#E detecta v2 por QUALQUER `### ` (malformado sem Como iniciar) → parse falha-fechado", () => {
    const bad = "## Objetivo\nX.\n\n### 1 Task\n**Necessidade.** a";
    expect(detectMilestoneFormat(bad)).toBe("v2"); // v1 nunca usa ###
    expect(() => parseMilestoneBodyV2(bad)).toThrow(/malformado|### <n>/);
  });
  it("#F falha-fechado: ordinais de tarefa duplicados (`### 1. Alpha` + `### 1. Beta`)", () => {
    const dupOrd = [
      "## Objetivo", "X.", "",
      "### 1. Alpha", "**Necessidade.** a", "",
      "### 1. Beta", "**Necessidade.** b", "",
      "## Como iniciar", "```text", "p", "```",
    ].join("\n");
    expect(() => parseMilestoneBodyV2(dupOrd)).toThrow(/ordinal.*repetido|repetido/i);
  });
  it("#H isValidIssue: milestone não-null exige `number` numérico", () => {
    const base = { number: 1, title: "T", state: "OPEN" };
    expect(isValidIssue({ ...base, milestone: null })).toBe(true);
    expect(isValidIssue({ ...base, milestone: { number: 16, title: "O11" } })).toBe(true);
    expect(isValidIssue({ ...base, milestone: { title: "O11" } })).toBe(false); // sem number
    expect(isValidIssue({ ...base, milestone: { number: "16" } })).toBe(false); // number string
  });
  it("#D issuesUnavailable: preserva Milestones e marca status não lido (não '0 épicos')", () => {
    const ms: PlanMilestone[] = [{ number: 16, title: "O11", state: "OPEN", description: v2Body() }];
    const md = renderMilestonePlan(ms, [], {
      repo: "o/r", generatedAt: "T", source: "offline", issuesUnavailable: true,
    });
    expect(md).toContain("**Resumo:** 1 épico(s)"); // conta real, não 0
    expect(md).toContain("## O11 [aberto] · v2");
    expect(md).toContain("**Tarefas planejadas (2):**");
    expect(md).toContain("status das Issues não lido");
    expect(md).not.toContain("nenhuma Issue promovida"); // não afirma zero
  });
});

// ───────── Fatia (b), rodada 5 — integridade de snapshot (Codex #221 r5) ─────────
describe("plan-report v2 — integridade de snapshot r5 (Codex #221 r5)", () => {
  it("#I falha-fechado: `#N` de Issue repetido no mesmo Milestone v2", () => {
    const ms: PlanMilestone[] = [{ number: 16, title: "O11", state: "OPEN", description: v2Body() }];
    const dup: PlanIssue[] = [
      { number: 220, title: "a", state: "OPEN", milestone: { number: 16 } },
      { number: 220, title: "a-dup", state: "OPEN", milestone: { number: 16 } },
    ];
    expect(() => renderMilestonePlan(ms, dup, { repo: "o/r", generatedAt: "T", source: "fx" })).toThrow(
      /reconciliada duas vezes|1:1/,
    );
  });
  it("#K isValidIssue: stateReason fora do enum do gh → inválido", () => {
    const base = { number: 1, title: "T", state: "CLOSED" };
    expect(isValidIssue({ ...base, stateReason: "COMPLETED" })).toBe(true);
    expect(isValidIssue({ ...base, stateReason: "NOT_PLANNED" })).toBe(true);
    expect(isValidIssue({ ...base, stateReason: "DUPLICATE" })).toBe(true);
    expect(isValidIssue({ ...base, stateReason: "" })).toBe(true);
    expect(isValidIssue({ ...base, stateReason: null })).toBe(true);
    expect(isValidIssue({ ...base, stateReason: "COMPLETE" })).toBe(false); // typo
    expect(isValidIssue({ ...base, stateReason: "done" })).toBe(false);
  });
});

// ───────── Fatia (b), rodada 6 — enum exato, fences, headings exatos (Codex #221 r6) ─────────
describe("plan-report v2 — r6 (Codex #221 r6)", () => {
  it("#L isValidIssue: só o enum EXATO do gh (NOT_PLANNED, não NOTPLANNED/NOT PLANNED)", () => {
    const base = { number: 1, title: "T", state: "CLOSED" };
    expect(isValidIssue({ ...base, stateReason: "NOT_PLANNED" })).toBe(true);
    expect(isValidIssue({ ...base, stateReason: "NOTPLANNED" })).toBe(false);
    expect(isValidIssue({ ...base, stateReason: "NOT PLANNED" })).toBe(false);
  });
  it("#M detecção ignora `### ` dentro de code fence (v1 legado com exemplo não vira v2)", () => {
    const v1ComFence = [
      "## Objetivo", "Legado.", "",
      "```md", "### example", "```", "",
      "## Tarefas", "- [ ] T7.1",
    ].join("\n");
    expect(detectMilestoneFormat(v1ComFence)).toBe("v1"); // o ### está cercado → não é heading
  });
  it("#M parser ignora `### ` cercado no objetivo (não vira bloco)", () => {
    const objComFence = [
      "## Objetivo", "X.", "```text", "### não é bloco", "```", "",
      "### 1. Real", "**Necessidade.** a", "",
      "## Como iniciar", "```text", "p", "```",
    ].join("\n");
    expect(parseMilestoneBodyV2(objComFence).taskNames).toEqual(["1. Real"]);
  });
  it("#N headings reservados por IGUALDADE: `## Como iniciar later` não é a fronteira", () => {
    const comoErrado = [
      "## Objetivo", "X.", "",
      "### 1. Real", "**Necessidade.** a", "",
      "## Como iniciar later", "```text", "p", "```",
    ].join("\n");
    expect(() => parseMilestoneBodyV2(comoErrado)).toThrow(/Como iniciar/);
  });
  it("#N `## Objetivo extra` não é reconhecido como objetivo", () => {
    const objErrado = [
      "## Objetivo extra", "X.", "",
      "### 1. Real", "**Necessidade.** a", "",
      "## Como iniciar", "```text", "p", "```",
    ].join("\n");
    expect(() => parseMilestoneBodyV2(objErrado)).toThrow(/Objetivo/);
  });
});
