import { describe, it, expect } from "vitest";
import { projectColumn, selfCheck, COLUMNS, type TaskState } from "./board-projection.ts";

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

describe("selfCheck — casos canônicos batem (regressão própria)", () => {
  it("nenhum caso diverge", () => {
    expect(selfCheck()).toBe(0);
  });
});
