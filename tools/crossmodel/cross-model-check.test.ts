import { describe, expect, it } from "vitest";
import {
  LABEL_EXEMPT,
  LABEL_REQUIRE,
  checkCrossModel,
  isFixture,
  isHarness,
  isPrInfo,
  isTestFile,
  parseMarker,
  type CommitInfo,
  type PrInfo,
} from "./cross-model-check.ts";

const commit = (
  sha: string,
  model: string | null,
  files: [string, string | null][],
): CommitInfo => ({
  sha,
  message: `feat: x\n\n${model ? `Model-Authored-By: ${model}\n` : ""}`,
  files: files.map(([path, blob]) => ({ path, blob })),
});
const pr = (commits: CommitInfo[], over: Partial<PrInfo> = {}): PrInfo => {
  const headBlobs: Record<string, string> = {};
  for (const c of commits) for (const f of c.files) if (f.blob) headBlobs[f.path] = f.blob;
  const changedFiles = [...new Set(commits.flatMap((c) => c.files.map((f) => f.path)))];
  return { headRef: "feat/1-x", labels: [], changedFiles, headBlobs, commits, ...over };
};

describe("classificação de caminhos (ADR-0041 ponto 4)", () => {
  it("harness = lista fixa; docs/product/ e o resto são produto", () => {
    expect(isHarness("tools/ledger/x.ts")).toBe(true);
    expect(isHarness("docs/runbooks/a.md")).toBe(true);
    expect(isHarness("STATE.md")).toBe(true);
    expect(isHarness("docs/product/spec.md")).toBe(false);
    expect(isHarness("src/app.ts")).toBe(false);
    expect(isHarness("lib/novo-dir/x.ts")).toBe(false);
  });
  it("teste executável × fixture/mock", () => {
    expect(isTestFile("src/a.test.ts")).toBe(true);
    expect(isTestFile("tests/a.ts")).toBe(true);
    expect(isTestFile("src/__tests__/a.ts")).toBe(true);
    expect(isTestFile("tests/fixtures/a.json")).toBe(false);
    expect(isFixture("tests/fixtures/a.json")).toBe(true);
    expect(isFixture("src/__mocks__/a.ts")).toBe(true);
    expect(isTestFile("src/a.ts")).toBe(false);
  });
});

describe("parseMarker (lista fechada, ADR-0039)", () => {
  it("nenhuma, válida, fora da lista, duplicada", () => {
    expect(parseMarker("feat: x")).toEqual({ kind: "none" });
    expect(parseMarker("feat: x\n\nModel-Authored-By: codex")).toEqual({
      kind: "valid",
      model: "codex",
    });
    expect(parseMarker("feat: x\n\nModel-Authored-By: openai").kind).toBe("invalid");
    expect(parseMarker("x\n\nModel-Authored-By: codex\nModel-Authored-By: claude").kind).toBe(
      "invalid",
    );
  });
});

describe("checkCrossModel — produto", () => {
  const test = commit("t1", "codex", [["src/a.test.ts", "b-test"]]);
  const impl = commit("i1", "claude", [["src/a.ts", "b-impl"]]);

  it("passa com teste de aceite de outro modelo intacto", () => {
    expect(checkCrossModel(pr([test, impl]))).toMatchObject({ ok: true, required: true });
  });
  it("bloqueia PR de produto sem nenhum teste de aceite de outro modelo", () => {
    expect(checkCrossModel(pr([impl]))).toMatchObject({ ok: false, required: true });
  });
  it("bloqueia quando o mesmo modelo escreveu teste e implementação", () => {
    const sameTest = commit("t1", "claude", [["src/a.test.ts", "b-test"]]);
    expect(checkCrossModel(pr([sameTest, impl])).ok).toBe(false);
  });
  it("aceita TDD do implementador e commit humano ao lado do teste de aceite de outro modelo", () => {
    const tdd = commit("i1", "claude", [
      ["src/a.ts", "b-impl"],
      ["src/a.unit.test.ts", "b-unit"],
    ]);
    const human = commit("h1", null, [["src/b.ts", "b-human"]]);
    expect(checkCrossModel(pr([test, tdd, human])).ok).toBe(true);
  });
  it("bloqueia se o teste de aceite foi alterado depois (não está intacto no estado final)", () => {
    const later = commit("i2", "claude", [["src/a.test.ts", "b-test-editado"]]);
    expect(checkCrossModel(pr([test, impl, later])).ok).toBe(false);
  });
  it("fixture/mock sozinho não é teste de aceite", () => {
    const fixture = commit("f1", "codex", [["tests/fixtures/a.json", "b-fx"]]);
    expect(checkCrossModel(pr([fixture, impl])).ok).toBe(false);
  });
  it("teste do harness não prova mudança de produto", () => {
    const harnessTest = commit("t1", "codex", [["tools/x.test.ts", "b-h"]]);
    expect(checkCrossModel(pr([harnessTest, impl])).ok).toBe(false);
  });
  it("rejeita valor de Model-Authored-By fora da lista fechada", () => {
    const bad = commit("t1", "openai", [["src/a.test.ts", "b-test"]]);
    expect(checkCrossModel(pr([bad, impl]))).toMatchObject({ ok: false });
  });
  it("arquivo fora da lista de harness é tratado como produto", () => {
    const c = commit("i1", "claude", [["lib/novo/x.ts", "b"]]);
    expect(checkCrossModel(pr([c]))).toMatchObject({ ok: false, required: true });
  });
  it("implementação humana (sem marca) + teste de aceite marcado passa", () => {
    const humanImpl = commit("h1", null, [["src/a.ts", "b-impl"]]);
    expect(checkCrossModel(pr([test, humanImpl])).ok).toBe(true);
  });
  it("produto só com docs/product/ não exige", () => {
    const doc = commit("d1", "claude", [["docs/product/spec.md", "b"]]);
    expect(checkCrossModel(pr([doc]))).toMatchObject({ ok: true, required: false });
  });
});

describe("checkCrossModel — harness e isenções", () => {
  const hImpl = commit("i1", "claude", [["tools/x.ts", "b-impl"]]);
  it("não bloqueia PR só de harness sem o rótulo cross-model", () => {
    expect(checkCrossModel(pr([hImpl]))).toMatchObject({ ok: true, required: false });
  });
  it("exige a regra num PR de harness com o rótulo cross-model", () => {
    expect(checkCrossModel(pr([hImpl], { labels: [LABEL_REQUIRE] }))).toMatchObject({
      ok: false,
      required: true,
    });
    const hTest = commit("t1", "codex", [["tools/x.test.ts", "b-t"]]);
    expect(checkCrossModel(pr([hTest, hImpl], { labels: [LABEL_REQUIRE] })).ok).toBe(true);
  });
  it("não exige em PR fora do pipeline de contrato (fast-lane e rótulo de isenção)", () => {
    const impl = commit("i1", "claude", [["src/a.ts", "b"]]);
    expect(checkCrossModel(pr([impl], { headRef: "fast/ajuste" }))).toMatchObject({
      ok: true,
      required: false,
    });
    expect(checkCrossModel(pr([impl], { labels: [LABEL_EXEMPT] }))).toMatchObject({
      ok: true,
      required: false,
    });
  });
  it("marca inválida bloqueia mesmo onde não exige", () => {
    const bad = commit("i1", "gpt-5", [["tools/x.ts", "b"]]);
    expect(checkCrossModel(pr([bad])).ok).toBe(false);
  });
});

describe("endurecimentos (Codex #329)", () => {
  const impl = commit("i1", "claude", [["src/a.ts", "b-impl"]]);
  it("arquivo não executável na área de testes não é teste de aceite", () => {
    expect(isTestFile("tests/README.md")).toBe(false);
    expect(isTestFile("tests/case.json")).toBe(false);
    const doc = commit("t1", "codex", [["tests/README.md", "b-doc"]]);
    expect(checkCrossModel(pr([doc, impl])).ok).toBe(false);
  });
  it("toque posterior invalida o teste, mesmo com o conteúdo restaurado", () => {
    const t = commit("t1", "codex", [["src/a.test.ts", "b-test"]]);
    const edit = commit("i2", "claude", [["src/a.test.ts", "b-outro"]]);
    const restore = commit("i3", "claude", [["src/a.test.ts", "b-test"]]);
    expect(checkCrossModel(pr([t, impl, edit, restore])).ok).toBe(false);
  });
  it("rótulos cross-model e cross-model:isento juntos bloqueiam", () => {
    const t = commit("t1", "codex", [["src/a.test.ts", "b-test"]]);
    expect(checkCrossModel(pr([t, impl], { labels: [LABEL_REQUIRE, LABEL_EXEMPT] })).ok).toBe(
      false,
    );
  });
  it("marca só vale no bloco final de trailers", () => {
    expect(parseMarker("feat: x\n\nModel-Authored-By: codex\ntexto em prosa").kind).toBe("none");
    expect(parseMarker("feat: x\n\nModel-Authored-By: codex\n\nmais prosa").kind).toBe("none");
    expect(
      parseMarker("feat: x\n\ncorpo\n\nModel-Authored-By: codex\nCo-Authored-By: A <a@b>"),
    ).toEqual({ kind: "valid", model: "codex" });
  });
  it("teste de aceite depois da implementação não vale", () => {
    const t = commit("t1", "codex", [["src/a.test.ts", "b-test"]]);
    expect(checkCrossModel(pr([impl, t])).ok).toBe(false);
  });
  it("valida a forma completa da entrada", () => {
    expect(
      isPrInfo({ headRef: "x", labels: [], changedFiles: [], headBlobs: {}, commits: [] }),
    ).toBe(true);
    expect(isPrInfo({ labels: [], changedFiles: [], commits: [] })).toBe(false);
    expect(
      isPrInfo({
        headRef: "x",
        labels: [],
        changedFiles: [],
        headBlobs: {},
        commits: [{ sha: "a" }],
      }),
    ).toBe(false);
  });
});

describe("endurecimentos (Codex #329, rodada 2)", () => {
  const impl = commit("i1", "claude", [["src/a.ts", "b-impl"]]);
  it("ignora o que vem depois da linha --- (notas de patch)", () => {
    const msg = "feat: x\n\nModel-Authored-By: claude\n---\nnota\n\nModel-Authored-By: codex";
    expect(parseMarker(msg)).toEqual({ kind: "valid", model: "claude" });
  });
  it("fixture do commit de teste alterado depois invalida o teste", () => {
    const t = commit("t1", "codex", [
      ["src/a.test.ts", "b-test"],
      ["tests/fixtures/a.json", "b-fx"],
    ]);
    const fx = commit("i2", "claude", [["tests/fixtures/a.json", "b-fx2"]]);
    expect(checkCrossModel(pr([t, impl, fx])).ok).toBe(false);
    expect(checkCrossModel(pr([t, impl])).ok).toBe(true);
  });
});

describe("endurecimentos (Codex #329, rodada 3)", () => {
  it("trailer com linha de continuação é desdobrado e validado (valor fora da lista ⇒ inválido)", () => {
    expect(parseMarker("feat: x\n\nModel-Authored-By: codex\n  extra").kind).toBe("invalid");
    expect(parseMarker("feat: x\n\nCo-Authored-By: A\n  <a@b>\nModel-Authored-By: codex")).toEqual({
      kind: "valid",
      model: "codex",
    });
  });
  it("headBlobs precisa ser objeto de strings", () => {
    const base = { headRef: "x", labels: [], changedFiles: [], commits: [] };
    expect(isPrInfo({ ...base, headBlobs: [] })).toBe(false);
    expect(isPrInfo({ ...base, headBlobs: { "src/a.ts": null } })).toBe(false);
    expect(isPrInfo({ ...base, headBlobs: { "src/a.ts": "b" } })).toBe(true);
  });
});

describe("endurecimentos (Codex #329, rodada 4)", () => {
  it("mensagem com CRLF tem a marca reconhecida", () => {
    expect(parseMarker("feat: x\r\n\r\nModel-Authored-By: codex\r\n")).toEqual({
      kind: "valid",
      model: "codex",
    });
  });
});
