import { describe, expect, it } from "vitest";
import type { LedgerItem } from "./ledger-guard.ts";
import {
  applyFlip,
  awaitingFlipIssues,
  batchMode,
  buildPrBody,
  coalesceDecision,
  HUMAN_STEP_LINE,
  humanStepChecked,
  uncheckHumanStep,
  livenessDecision,
  parseEligibleArg,
  eligibleForBatch,
  isEvidenced,
  projectBatch,
  type IssueState,
} from "./flip-batch.ts";

const item = (over: Partial<LedgerItem> = {}): LedgerItem => ({
  id: "F-0001-aaa",
  issue: 1,
  category: "functional",
  description: "d",
  steps: [],
  acceptance: "a",
  passes: false,
  ...over,
});

const closedDone = (n: number): IssueState => ({ number: n, state: "CLOSED", stateReason: "COMPLETED" });

describe("isEvidenced — sinal de evidência (ADR-0033: Issue CLOSED + completed)", () => {
  it("Issue CLOSED + completed → evidenciada", () => {
    expect(isEvidenced(item({ issue: 9 }), new Map([[9, closedDone(9)]]))).toBe(true);
    expect(isEvidenced(item({ issue: 9 }), new Map([[9, { number: 9, state: "closed", stateReason: "completed" }]]))).toBe(true);
  });
  it("Issue aberta → NÃO evidenciada", () => {
    expect(isEvidenced(item({ issue: 9 }), new Map([[9, { number: 9, state: "OPEN" }]]))).toBe(false);
  });
  it("CLOSED not-planned/duplicate → NÃO evidenciada", () => {
    expect(isEvidenced(item({ issue: 9 }), new Map([[9, { number: 9, state: "CLOSED", stateReason: "NOT_PLANNED" }]]))).toBe(false);
    expect(isEvidenced(item({ issue: 9 }), new Map([[9, { number: 9, state: "CLOSED", stateReason: null }]]))).toBe(false);
  });
  it("Issue ausente entre as lidas → NÃO evidenciada (fail-closed)", () => {
    expect(isEvidenced(item({ issue: 9 }), new Map())).toBe(false);
  });
});

describe("eligibleForBatch — awaitingFlip ∩ evidência", () => {
  it("filtra por evidência e ordena por id", () => {
    const aw = [item({ id: "F-9-b", issue: 2 }), item({ id: "F-9-a", issue: 1 }), item({ id: "F-9-c", issue: 3 })];
    const issues = new Map<number, IssueState>([[1, closedDone(1)], [3, closedDone(3)]]); // 2 sem evidência
    expect(eligibleForBatch(aw, issues).map((e) => e.id)).toEqual(["F-9-a", "F-9-c"]);
  });
  it("nada evidenciado → lote vazio", () => {
    expect(eligibleForBatch([item({ issue: 1 })], new Map([[1, { number: 1, state: "OPEN" }]]))).toEqual([]);
  });
});

describe("applyFlip — só os elegíveis viram true (puro)", () => {
  it("flipa apenas os ids do lote; demais intactos", () => {
    const led = [item({ id: "F-a" }), item({ id: "F-b" }), item({ id: "F-c", passes: true })];
    const out = applyFlip(led, new Set(["F-a"]));
    expect(out.find((x) => x.id === "F-a")!.passes).toBe(true);
    expect(out.find((x) => x.id === "F-b")!.passes).toBe(false);
    expect(led.find((x) => x.id === "F-a")!.passes).toBe(false); // não muta o original
  });
});

describe("buildPrBody — correlaciona o lote às Issues", () => {
  it("agrupa por Issue e explicita que humano mergeia", () => {
    const body = buildPrBody([item({ id: "F-0206-x", issue: 206 }), item({ id: "F-0206-y", issue: 206 }), item({ id: "F-0244-z", issue: 244 })]);
    expect(body).toContain("**3**"); // 3 entradas no lote
    expect(body).toContain("- #206: `F-0206-x`, `F-0206-y`");
    expect(body).toContain("- #244: `F-0244-z`");
    expect(body).toContain(HUMAN_STEP_LINE); // passo humano, desmarcado (ADR-0037 §4(b)(ii))
    expect(humanStepChecked(body)).toBe(false);
    expect(body).toMatch(/merge é humano|nunca integra/i);
  });
});

describe("awaitingFlipIssues — #N únicos e ordenados de awaitingFlip (--list-issues)", () => {
  it("dedupe por Issue, ordena numérico, ignora pendente/já-true/legado/superseded", () => {
    const scoped = [
      item({ id: "F-5-a", issue: 5 }), // entregue + false → awaiting
      item({ id: "F-2-a", issue: 2 }), // entregue + false → awaiting
      item({ id: "F-2-b", issue: 2 }), // mesma Issue → dedupe
      item({ id: "F-9-pend", issue: 9 }), // NÃO entregue → pendente, fora
      item({ id: "F-7-done", issue: 7, passes: true }), // já true → fora
      item({ id: "F-8-leg", issue: 8 }), // legado → fora
      item({ id: "F-3-sup", issue: 3 }), // superseded → fora
    ];
    const delivered = new Set(["F-5-a", "F-2-a", "F-2-b", "F-7-done", "F-8-leg", "F-3-sup"]);
    expect(awaitingFlipIssues(scoped, new Set(["F-8-leg"]), delivered, new Set(["F-3-sup"]))).toEqual([2, 5]);
  });
  it("nada aguardando flip → lista vazia", () => {
    expect(awaitingFlipIssues([], new Set(), new Set(), new Set())).toEqual([]);
  });
});

describe("projectBatch — integra classificação + evidência", () => {
  it("só entrega entregue-E-evidenciada; pendente (não em main) fica de fora", () => {
    const scoped = [
      item({ id: "F-1-done", issue: 1 }), // entregue (em deliveredIds) + evidência → elegível
      item({ id: "F-2-premature", issue: 2 }), // entregue mas Issue aberta → sem evidência
      item({ id: "F-3-pending", issue: 3 }), // NÃO em deliveredIds (projeção desta branch) → nem awaiting
    ];
    const issues = new Map<number, IssueState>([[1, closedDone(1)], [2, { number: 2, state: "OPEN" }], [3, closedDone(3)]]);
    const r = projectBatch(scoped, scoped, new Set(), new Set(["F-1-done", "F-2-premature"]), new Set(), issues);
    expect(r.eligible.map((e) => e.id)).toEqual(["F-1-done"]);
    expect(r.flipped.find((x) => x.id === "F-1-done")!.passes).toBe(true);
    expect(r.flipped.find((x) => x.id === "F-3-pending")!.passes).toBe(false);
  });
});

describe("coalesceDecision — janela de coalescência (ADR-0037 §2, #257 fatia a)", () => {
  const now = "2026-10-01T12:00:00Z";

  it("sem atividade de flip ⇒ open", () => {
    expect(coalesceDecision(now, 1, []).decision).toBe("open");
  });

  it("última atividade dentro da janela ⇒ skip (entregas espaçadas não abrem um PR cada)", () => {
    expect(coalesceDecision(now, 1, ["2026-10-01T11:30:00Z"]).decision).toBe("skip");
  });

  it("última atividade fora da janela ⇒ open", () => {
    expect(coalesceDecision(now, 1, ["2026-10-01T10:00:00Z", "2026-10-01T10:59:00Z"]).decision).toBe("open");
  });

  it("vale o instante MAIS recente (abertura ou integração)", () => {
    expect(coalesceDecision(now, 1, ["2026-09-30T00:00:00Z", "2026-10-01T11:45:00Z"]).decision).toBe("skip");
  });

  it("limite exato da janela ⇒ open", () => {
    expect(coalesceDecision(now, 1, ["2026-10-01T11:00:00Z"]).decision).toBe("open");
  });

  it("entrada inválida ⇒ skip marcado como inválido (a CLI sai ≠ 0, Codex #304)", () => {
    expect(coalesceDecision("lixo", 1, []).invalid).toBe(true);
    expect(coalesceDecision(now, 0, []).invalid).toBe(true);
    expect(coalesceDecision(now, 1, ["2026-10-01T11:30:00Z"]).invalid).toBeUndefined();
    expect(coalesceDecision("lixo", 1, []).decision).toBe("skip");
    expect(coalesceDecision(now, 0, []).decision).toBe("skip");
    expect(coalesceDecision(now, Number.NaN, []).decision).toBe("skip");
    expect(coalesceDecision(now, 1, ["não-data"]).decision).toBe("skip");
  });
});

describe("batchMode — lote do App × manual (ADR-0037 §2, Codex #304)", () => {
  const APP = "app/orion-flip-bot";
  const pr = (n: number, login: string, over: Partial<{ headRefName: string; isCrossRepository: boolean }> = {}) => ({
    number: n,
    headRefName: "flip/lote-1",
    isCrossRepository: false,
    author: { login, is_bot: login.startsWith("app/") },
    ...over,
  });

  it("sem lote aberto ⇒ new", () => {
    expect(batchMode([], APP).mode).toBe("new");
    expect(batchMode([pr(1, "isaiane", { headRefName: "feat/1-x" })], APP).mode).toBe("new");
  });

  it("lote MANUAL aberto ⇒ skip (nunca reescreve lote humano)", () => {
    expect(batchMode([pr(7, "isaiane")], APP).mode).toBe("skip");
    expect(batchMode([pr(7, "isaiane"), pr(8, APP)], APP).mode).toBe("skip");
  });

  it("lote de OUTRO bot ⇒ skip, não é do App (Codex #304 r2)", () => {
    expect(batchMode([pr(5, "app/outro-bot")], APP).mode).toBe("skip");
  });

  it("um lote do App aberto ⇒ update com o PR", () => {
    const r = batchMode([pr(9, APP)], APP);
    expect(r.mode).toBe("update");
    expect(r.pr?.number).toBe(9);
  });

  it("fork não conta", () => {
    expect(batchMode([pr(3, "isaiane", { isCrossRepository: true })], APP).mode).toBe("new");
  });

  it("dois lotes do App ⇒ error; login do App ausente ⇒ error (fail-closed)", () => {
    expect(batchMode([pr(1, APP), pr(2, APP)], APP).mode).toBe("error");
    expect(batchMode([], undefined).mode).toBe("error");
    expect(batchMode([], "").mode).toBe("error");
  });
});

describe("humanStepChecked — caixa do passo humano marcada (ADR-0037 §4(b)(ii), #257 b2)", () => {
  const marked = HUMAN_STEP_LINE.replace("- [ ]", "- [x]");

  it("marcada ⇒ true (aceita [x]/[X] e '*')", () => {
    expect(humanStepChecked(`corpo\n${marked}\n`)).toBe(true);
    expect(humanStepChecked(HUMAN_STEP_LINE.replace("- [ ]", "* [X]"))).toBe(true);
  });

  it("desmarcada, ausente, texto diferente ou corpo inválido ⇒ false", () => {
    expect(humanStepChecked(HUMAN_STEP_LINE)).toBe(false);
    expect(humanStepChecked("sem caixa")).toBe(false);
    expect(humanStepChecked("- [x] Conferi tudo")).toBe(false);
    expect(humanStepChecked(null)).toBe(false);
  });

  it("caixa dentro de bloco cercado ou comentário HTML NÃO conta (Codex #306)", () => {
    expect(humanStepChecked("```markdown\n" + marked + "\n```\n")).toBe(false);
    expect(humanStepChecked("~~~\n" + marked + "\n~~~")).toBe(false);
    expect(humanStepChecked("<!--\n" + marked + "\n-->")).toBe(false);
    expect(humanStepChecked("```\n" + marked)).toBe(false); // bloco não fechado vai até o fim
    expect(humanStepChecked("```\nexemplo\n```\n" + marked)).toBe(true); // fora do bloco conta
  });
});

describe("uncheckHumanStep — confirmação velha é desmarcada (ADR-0037 §4(b)(ii), #257 b3)", () => {
  const marked = HUMAN_STEP_LINE.replace("- [ ]", "- [x]");

  it("desmarca a caixa marcada e preserva o resto do corpo", () => {
    const r = uncheckHumanStep(`antes\n${marked}\ndepois\n`);
    expect(r.changed).toBe(true);
    expect(r.body).toBe(`antes\n${HUMAN_STEP_LINE}\ndepois\n`);
    expect(humanStepChecked(r.body)).toBe(false);
  });

  it("aceita `* [X]` e indentação", () => {
    const r = uncheckHumanStep("  " + HUMAN_STEP_LINE.replace("- [ ]", "* [X]"));
    expect(r.changed).toBe(true);
    expect(r.body).toBe("  " + HUMAN_STEP_LINE.replace("- [ ]", "* [ ]"));
  });

  it("não toca outras caixas marcadas nem corpo sem a caixa marcada", () => {
    const other = "- [x] Conferi tudo";
    expect(uncheckHumanStep(other)).toEqual({ body: other, changed: false });
    expect(uncheckHumanStep(HUMAN_STEP_LINE)).toEqual({ body: HUMAN_STEP_LINE, changed: false });
  });
});

describe("livenessDecision — monitor independente do flip-batch (ADR-0037 §4(c), #257 c1)", () => {
  const now = "2026-10-03T12:00:00Z";

  it("sem entradas elegíveis ⇒ ok (mesmo sem rodada nenhuma)", () => {
    expect(livenessDecision(now, 48, 0, null).decision).toBe("ok");
    expect(livenessDecision(now, 48, 0, "2026-09-01T00:00:00Z").decision).toBe("ok");
  });

  it("elegíveis e nenhuma rodada bem-sucedida ⇒ alert", () => {
    expect(livenessDecision(now, 48, 2, null).decision).toBe("alert");
  });

  it("última rodada bem-sucedida dentro do prazo ⇒ ok", () => {
    expect(livenessDecision(now, 48, 2, "2026-10-02T06:17:00Z").decision).toBe("ok");
  });

  it("última rodada bem-sucedida no limite ou além do prazo ⇒ alert", () => {
    expect(livenessDecision(now, 48, 1, "2026-10-01T12:00:00Z").decision).toBe("alert");
    expect(livenessDecision(now, 48, 1, "2026-09-30T00:00:00Z").decision).toBe("alert");
  });

  it("entrada inválida ⇒ alert marcado como inválido (a CLI sai ≠ 0)", () => {
    expect(livenessDecision("lixo", 48, 1, null).invalid).toBe(true);
    expect(livenessDecision(now, 0, 1, null).invalid).toBe(true);
    expect(livenessDecision(now, Number.NaN, 1, null).invalid).toBe(true);
    expect(livenessDecision(now, 48, Number.NaN, null).invalid).toBe(true);
    expect(livenessDecision(now, 48, -1, null).invalid).toBe(true);
    expect(livenessDecision(now, 48, 1, "não-data").invalid).toBe(true);
    expect(livenessDecision(now, 48, 1, "não-data").decision).toBe("alert");
    expect(livenessDecision(now, 48, 1, "2026-10-03T00:00:00Z").invalid).toBeUndefined();
  });

  it("instante no futuro além de 5 min ⇒ alert inválido; dentro da tolerância ⇒ ok (Codex #316)", () => {
    expect(livenessDecision(now, 48, 1, "2026-10-03T12:06:00Z").invalid).toBe(true);
    expect(livenessDecision(now, 48, 1, "2026-10-03T12:06:00Z").decision).toBe("alert");
    expect(livenessDecision(now, 48, 1, "2026-10-03T12:04:00Z").decision).toBe("ok");
  });
});

describe("parseEligibleArg — `--eligible` vazio não vira 0 (Codex #316)", () => {
  it("ausente ou em branco ⇒ NaN (livenessDecision trata como inválido)", () => {
    expect(parseEligibleArg(undefined)).toBeNaN();
    expect(parseEligibleArg("")).toBeNaN();
    expect(parseEligibleArg("  ")).toBeNaN();
    expect(livenessDecision("2026-10-03T12:00:00Z", 48, parseEligibleArg(""), null).invalid).toBe(true);
  });

  it("número válido passa", () => {
    expect(parseEligibleArg("0")).toBe(0);
    expect(parseEligibleArg("3")).toBe(3);
  });
});
