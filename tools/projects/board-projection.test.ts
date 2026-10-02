import { describe, it, expect } from "vitest";
import {
  projectColumn,
  selfCheck,
  COLUMNS,
  BLOCKED_LABEL,
  IN_PROGRESS_LABEL,
  IN_REVIEW_LABEL,
  type TaskState,
} from "./board-projection.ts";

const open = (...labels: string[]): TaskState => ({ issueState: "open", labels });

describe("projectColumn — sinal explícito na Issue (ADR-0038 §2)", () => {
  it("sem sinal ⇒ Backlog", () => {
    expect(projectColumn(open()).column).toBe("Backlog");
    expect(projectColumn(open("type:task", "trust:T2")).column).toBe("Backlog");
  });

  it("status:in-progress ⇒ In progress", () => {
    expect(projectColumn(open(IN_PROGRESS_LABEL)).column).toBe("In progress");
  });

  it("status:in-review ⇒ In review", () => {
    expect(projectColumn(open(IN_REVIEW_LABEL)).column).toBe("In review");
  });

  it("blocked ⇒ Blocked", () => {
    expect(projectColumn(open(BLOCKED_LABEL)).column).toBe("Blocked");
  });

  it("fechada ⇒ Done, qualquer motivo", () => {
    expect(projectColumn({ issueState: "closed", labels: [] }).column).toBe("Done");
  });
});

describe("precedência: Done > Blocked > In review > In progress > Backlog", () => {
  it("fechada vence qualquer rótulo", () => {
    expect(projectColumn({ issueState: "closed", labels: [BLOCKED_LABEL, IN_REVIEW_LABEL, IN_PROGRESS_LABEL] }).column).toBe("Done");
  });

  it("blocked vence os rótulos de status", () => {
    expect(projectColumn(open(IN_REVIEW_LABEL, BLOCKED_LABEL)).column).toBe("Blocked");
    expect(projectColumn(open(IN_PROGRESS_LABEL, BLOCKED_LABEL)).column).toBe("Blocked");
  });

  it("in-review vence in-progress (rótulos simultâneos)", () => {
    expect(projectColumn(open(IN_PROGRESS_LABEL, IN_REVIEW_LABEL)).column).toBe("In review");
  });

  it("unblock devolve à coluna do rótulo de status", () => {
    expect(projectColumn(open(IN_REVIEW_LABEL)).column).toBe("In review");
  });
});

describe("rótulos de gate NÃO movem coluna (ADR-0038 §3)", () => {
  it("needs-human-approval ou ready sozinhos ⇒ Backlog", () => {
    expect(projectColumn(open("needs-human-approval")).column).toBe("Backlog");
    expect(projectColumn(open("ready")).column).toBe("Backlog");
    expect(projectColumn(open("needs-human-approval", "ready")).column).toBe("Backlog");
  });

  it("gate + status: vale o status", () => {
    expect(projectColumn(open("needs-human-approval", IN_PROGRESS_LABEL)).column).toBe("In progress");
  });
});

describe("cinco colunas, sem Ready (ADR-0038 §1)", () => {
  it("COLUMNS tem exatamente as cinco, sem Ready", () => {
    expect(COLUMNS).toEqual(["Backlog", "In progress", "In review", "Blocked", "Done"]);
    expect(COLUMNS).not.toContain("Ready");
  });

  it("toda projeção cai numa das cinco", () => {
    for (const t of [open(), open(IN_PROGRESS_LABEL), open(IN_REVIEW_LABEL), open(BLOCKED_LABEL), { issueState: "closed", labels: [] } as TaskState])
      expect(COLUMNS).toContain(projectColumn(t).column);
  });

  it("idempotente e independente da ordem dos rótulos", () => {
    expect(projectColumn(open("a", IN_PROGRESS_LABEL)).column).toBe(projectColumn(open(IN_PROGRESS_LABEL, "a")).column);
  });
});

describe("fail-closed — entrada malformada nunca avança", () => {
  it("não-objeto ou issueState inválido ⇒ Backlog", () => {
    expect(projectColumn(null as unknown as TaskState).column).toBe("Backlog");
    expect(projectColumn([] as unknown as TaskState).column).toBe("Backlog");
    expect(projectColumn({ issueState: "OPEN", labels: [IN_REVIEW_LABEL] } as unknown as TaskState).column).toBe("Backlog");
  });

  it("labels não-array é tolerado (sem sinal)", () => {
    expect(projectColumn({ issueState: "open", labels: "status:in-review" as unknown as string[] }).column).toBe("Backlog");
  });
});

describe("selfCheck — casos canônicos batem", () => {
  it("nenhum caso diverge", () => {
    expect(selfCheck()).toBe(0);
  });
});
