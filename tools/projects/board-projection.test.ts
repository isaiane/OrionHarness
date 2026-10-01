import { describe, it, expect } from "vitest";
import {
  projectColumn,
  selfCheck,
  COLUMNS,
  issueFromBranch,
  closingRefs,
  assembleState,
  type TaskState,
  type RawTask,
} from "./board-projection.ts";

// Base: Issue aberta em intake, sem PR nem rótulo ⇒ Backlog.
const base: TaskState = {
  issueState: "open",
  issueStateReason: null,
  labels: [],
  linkedPr: null,
};

const openPr = (role: "contract" | "implementation"): TaskState["linkedPr"] => ({
  state: "open",
  merged: false,
  role,
});

describe("projectColumn — origens de evento (ADR-0033 §116)", () => {
  it("Issue aberta, sem sinal ⇒ Backlog", () => {
    expect(projectColumn(base).column).toBe("Backlog");
  });

  it("G1 dado (rótulo ready), sem PR ⇒ Ready", () => {
    expect(projectColumn({ ...base, labels: ["ready"] }).column).toBe("Ready");
  });

  it("PR de contrato aberto ⇒ In progress", () => {
    expect(projectColumn({ ...base, linkedPr: openPr("contract") }).column).toBe("In progress");
  });

  it("PR de implementação aberto ⇒ In review", () => {
    expect(projectColumn({ ...base, linkedPr: openPr("implementation") }).column).toBe("In review");
  });

  it("Issue fechada como completed (merge fechou) ⇒ Done", () => {
    expect(projectColumn({ ...base, issueState: "closed", issueStateReason: "completed", linkedPr: { state: "closed", merged: true, role: "implementation" } }).column).toBe("Done");
  });
});

describe("estado vivo da Issue vence histórico de merge (Codex …7090)", () => {
  it("Issue reaberta (open) com PR mergeado no histórico NÃO fica Done", () => {
    const s: TaskState = { ...base, issueState: "open", linkedPr: { state: "closed", merged: true, role: "implementation" } };
    expect(projectColumn(s).column).not.toBe("Done");
    expect(projectColumn(s).column).toBe("Backlog"); // sem PR aberto/rótulo ⇒ volta ao intake vivo
  });

  it("Issue reaberta com novo PR de implementação aberto ⇒ In review", () => {
    const s: TaskState = { ...base, issueState: "open", linkedPr: openPr("implementation") };
    expect(projectColumn(s).column).toBe("In review");
  });
});

describe("Issue cancelada não vira Backlog (Codex …7109)", () => {
  it("closed not_planned ⇒ Done (fora do fluxo), não Backlog", () => {
    expect(projectColumn({ ...base, issueState: "closed", issueStateReason: "not_planned" }).column).toBe("Done");
  });

  it("closed sem razão ⇒ Done, não Backlog", () => {
    expect(projectColumn({ ...base, issueState: "closed", issueStateReason: null }).column).toBe("Done");
  });
});

describe("papel do artefato distingue etapas (ADR-0033 §116(ii))", () => {
  it("contrato e implementação NÃO colapsam na mesma coluna", () => {
    const c = projectColumn({ ...base, linkedPr: openPr("contract") }).column;
    const i = projectColumn({ ...base, linkedPr: openPr("implementation") }).column;
    expect(c).not.toBe(i);
    expect(c).toBe("In progress");
    expect(i).toBe("In review");
  });
});

describe("Blocked e unblock-return (ADR-0033 §116(iii))", () => {
  it("rótulo de gate ⇒ Blocked (mesmo com PR aberto)", () => {
    expect(projectColumn({ ...base, labels: ["needs-human-approval"], linkedPr: openPr("implementation") }).column).toBe("Blocked");
    expect(projectColumn({ ...base, labels: ["blocked"] }).column).toBe("Blocked");
  });

  it("unblock (remover o rótulo) retorna ao estado derivável, não a limbo", () => {
    const blocked: TaskState = { ...base, labels: ["needs-human-approval"], linkedPr: openPr("implementation") };
    expect(projectColumn(blocked).column).toBe("Blocked");
    const unblocked: TaskState = { ...blocked, labels: [] };
    expect(projectColumn(unblocked).column).toBe("In review"); // volta à coluna do evento
  });

  it("conclusão vence rótulo de gate remanescente (Done > Blocked)", () => {
    expect(projectColumn({ ...base, issueState: "closed", issueStateReason: "completed", labels: ["needs-human-approval"] }).column).toBe("Done");
  });
});

describe("idempotência (ADR-0033 §116(iv))", () => {
  it("reprocessar o mesmo estado dá a mesma coluna", () => {
    const s: TaskState = { ...base, linkedPr: openPr("contract") };
    const a = projectColumn(s).column;
    const b = projectColumn(s).column;
    const c = projectColumn(s).column;
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});

describe("board não-autoral / reconstrutível — a coluna é função pura do estado", () => {
  it("mesmo estado ⇒ mesma coluna, independente de ordem/histórico (derivável)", () => {
    const s1: TaskState = { ...base, labels: ["ready", "type:task"], linkedPr: null };
    const s2: TaskState = { ...base, labels: ["type:task", "ready"], linkedPr: null };
    expect(projectColumn(s1).column).toBe(projectColumn(s2).column);
  });

  it("toda projeção cai numa das 6 colunas normativas", () => {
    const amostras: TaskState[] = [
      base,
      { ...base, labels: ["ready"] },
      { ...base, linkedPr: openPr("contract") },
      { ...base, linkedPr: openPr("implementation") },
      { ...base, labels: ["blocked"] },
      { ...base, issueState: "closed", issueStateReason: "completed" },
    ];
    for (const s of amostras) expect(COLUMNS).toContain(projectColumn(s).column);
  });
});

describe("fail-closed — entrada malformada nunca projeta coluna avançada", () => {
  it("estado não-objeto ⇒ Backlog", () => {
    expect(projectColumn(null as unknown as TaskState).column).toBe("Backlog");
    expect(projectColumn(42 as unknown as TaskState).column).toBe("Backlog");
    expect(projectColumn([] as unknown as TaskState).column).toBe("Backlog");
  });

  it("issueState inválido ⇒ Backlog", () => {
    expect(projectColumn({ ...base, issueState: "weird" as unknown as "open" }).column).toBe("Backlog");
  });

  it("linkedPr malformado ⇒ Backlog (não vira In review/Done por lixo)", () => {
    expect(projectColumn({ ...base, linkedPr: { state: "open" } as unknown as TaskState["linkedPr"] }).column).toBe("Backlog");
    expect(projectColumn({ ...base, linkedPr: { state: "open", merged: false, role: "x" } as unknown as TaskState["linkedPr"] }).column).toBe("Backlog");
  });

  it("labels não-array é tolerado (ignora) sem quebrar", () => {
    expect(projectColumn({ ...base, labels: "ready" as unknown as string[] }).column).toBe("Backlog");
  });
});

describe("branch como sinal de In progress (#278 G)", () => {
  it("branch da tarefa sem PR aberto ⇒ In progress (mesmo com ready)", () => {
    expect(projectColumn({ ...base, labels: ["ready"], branch: true }).column).toBe("In progress");
  });

  it("PR de implementação aberto vence a branch ⇒ In review", () => {
    expect(projectColumn({ ...base, branch: true, linkedPr: openPr("implementation") }).column).toBe("In review");
  });

  it("rótulo de gate vence a branch ⇒ Blocked", () => {
    expect(projectColumn({ ...base, labels: ["needs-human-approval"], branch: true }).column).toBe("Blocked");
  });

  it("branch apagada (delete) recomputa ⇒ volta a Ready", () => {
    expect(projectColumn({ ...base, labels: ["ready"], branch: false }).column).toBe("Ready");
  });

  it("branch malformado ⇒ Backlog (fail-closed)", () => {
    expect(projectColumn({ ...base, branch: "yes" as unknown as boolean }).column).toBe("Backlog");
  });
});

describe("issueFromBranch — convenção <tipo>/<n>-<slug> (#278 D/G)", () => {
  it("deriva a Issue de branches de tarefa", () => {
    expect(issueFromBranch("feat/278-board-branch")).toBe(278);
    expect(issueFromBranch("docs/287-state-readme-board")).toBe(287);
    expect(issueFromBranch("refs/heads/chore/293-ledger-flip")).toBe(293);
  });

  it("fast-lane, manutenção, bots e nomes fora do padrão não projetam (fail-closed)", () => {
    expect(issueFromBranch("flip/2026-10-01")).toBeNull();
    expect(issueFromBranch("release/2026-10-01")).toBeNull();
    expect(issueFromBranch("fast/2-typo")).toBeNull();
    expect(issueFromBranch("dependabot/npm_and_yarn/vitest-4.1.10")).toBeNull();
    expect(issueFromBranch("main")).toBeNull();
    expect(issueFromBranch("feat/sem-numero")).toBeNull();
    expect(issueFromBranch("feat/278")).toBeNull();
    expect(issueFromBranch("feat/0-zero")).toBeNull();
    expect(issueFromBranch(undefined)).toBeNull();
  });
});

describe("closingRefs — Issues do corpo anterior no evento edited (#278)", () => {
  it("extrai as palavras-chave de fechamento do próprio repo", () => {
    expect(closingRefs("Closes #12\nfixes #7 e Resolved: #12")).toEqual([7, 12]);
  });

  it("aceita owner/repo#N e URL da Issue só do PRÓPRIO repo (Codex #296)", () => {
    const repo = "isaiane/OrionHarness";
    expect(closingRefs("Closes isaiane/OrionHarness#278", repo)).toEqual([278]);
    expect(closingRefs("fixes https://github.com/isaiane/orionharness/issues/12", repo)).toEqual([12]);
    expect(closingRefs("Closes other/repo#9\nresolves https://github.com/other/repo/issues/8", repo)).toEqual([]);
    expect(closingRefs("Closes isaiane/OrionHarness#278")).toEqual([]); // sem repo informado: não arrisca
  });

  it("ignora menções sem palavra-chave, refs de outro repo e entrada inválida", () => {
    expect(closingRefs("Refs #5, ver #6")).toEqual([]);
    expect(closingRefs("Closes other/repo#9")).toEqual([]);
    expect(closingRefs(null)).toEqual([]);
  });
});

describe("assembleState — PR ligado pela branch, sem Closes #N (#278 D)", () => {
  const raw = (over: Partial<RawTask> = {}): RawTask => ({
    issue: 278,
    issueState: "OPEN",
    issueStateReason: null,
    labels: ["ready"],
    closingPrs: [],
    openPrs: [],
    branches: [],
    ...over,
  });
  const contrato = { state: "OPEN", merged: false, headRefName: "test/278-contrato", labels: ["pipeline:contract"] };

  it("PR de contrato ligado só pela branch ⇒ In progress", () => {
    const s = assembleState(raw({ openPrs: [contrato] }));
    expect(s).not.toBe("invalid");
    expect(projectColumn(s as TaskState).column).toBe("In progress");
  });

  it("PR aberto de OUTRA Issue não é atribuído", () => {
    const s = assembleState(raw({ openPrs: [{ ...contrato, headRefName: "test/279-outro" }] }));
    expect(projectColumn(s as TaskState).column).toBe("Ready");
  });

  it("só a branch existe ⇒ In progress", () => {
    const s = assembleState(raw({ branches: ["main", "feat/278-x"] }));
    expect(projectColumn(s as TaskState).column).toBe("In progress");
  });

  it("PR aberto tem precedência sobre o mergeado do histórico", () => {
    const merged = { state: "MERGED", merged: true, headRefName: "feat/278-a", labels: [] };
    const aberto = { state: "OPEN", merged: false, headRefName: "feat/278-b", labels: [] };
    const s = assembleState(raw({ closingPrs: [merged], openPrs: [aberto] }));
    expect(projectColumn(s as TaskState).column).toBe("In review");
  });

  it("Issue fechada ⇒ Done", () => {
    const s = assembleState(raw({ issueState: "CLOSED", issueStateReason: "COMPLETED" }));
    expect(projectColumn(s as TaskState).column).toBe("Done");
  });

  it("dados crus malformados ⇒ invalid (fail-closed)", () => {
    expect(assembleState(null)).toBe("invalid");
    expect(assembleState({ ...raw(), issue: "278" })).toBe("invalid");
    expect(assembleState({ ...raw(), openPrs: "x" })).toBe("invalid");
    expect(assembleState(raw({ closingPrs: [{ state: "OPEN" } as unknown as RawTask["closingPrs"][number]] }))).toBe("invalid");
  });
});

describe("selfCheck — casos canônicos batem (regressão própria)", () => {
  it("nenhum caso diverge", () => {
    expect(selfCheck()).toBe(0);
  });
});
