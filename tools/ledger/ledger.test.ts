import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { Ajv } from "ajv";
import { diff, type LedgerItem } from "./ledger-guard.ts";
import {
  project,
  merge,
  makeId,
  inferCategory,
  extractAcceptance,
  isSdd,
  type Issue,
} from "./ledger-from-issues.ts";

const item = (over: Partial<LedgerItem> = {}): LedgerItem => ({
  id: "F-0001-abc123",
  issue: 1,
  category: "functional",
  description: "descrição",
  steps: ["passo"],
  acceptance: "critério",
  passes: false,
  ...over,
});

describe("schema", () => {
  it("o feature-ledger.json versionado valida contra o schema", () => {
    const schema = JSON.parse(readFileSync("tools/ledger/feature-ledger.schema.json", "utf-8"));
    const ledger = JSON.parse(readFileSync("feature-ledger.json", "utf-8"));
    const validate = new Ajv().compile(schema);
    validate(ledger);
    expect(validate.errors ?? []).toEqual([]);
  });
});

describe("ledger-guard (append-only)", () => {
  it("PASS quando idempotente", () => {
    expect(diff([item()], [item()])).toEqual([]);
  });

  it("PASS em false->true", () => {
    expect(diff([item({ passes: false })], [item({ passes: true })])).toEqual([]);
  });

  it("PASS ao adicionar item novo com passes=false", () => {
    expect(diff([], [item({ id: "F-0002-novo", passes: false })])).toEqual([]);
  });

  it("FAIL ao remover item", () => {
    const errs = diff([item()], []);
    expect(errs.some((e) => e.includes("removido"))).toBe(true);
  });

  it("FAIL ao editar campo imutável", () => {
    const errs = diff([item()], [item({ description: "outra" })]);
    expect(errs.some((e) => e.includes("imutável"))).toBe(true);
  });

  it("FAIL em regressão true->false", () => {
    const errs = diff([item({ passes: true })], [item({ passes: false })]);
    expect(errs.some((e) => e.includes("regressão"))).toBe(true);
  });

  it("FAIL em item novo já com passes=true", () => {
    const errs = diff([], [item({ id: "F-0002-novo", passes: true })]);
    expect(errs.some((e) => e.includes("deve começar false"))).toBe(true);
  });
});

describe("ledger-from-issues (projeção)", () => {
  const issue: Issue = {
    number: 42,
    title: "exemplo",
    labels: ["type:task"],
    body: [
      "## Contexto",
      "irrelevante",
      "## Critérios de aceite",
      "- [ ] primeiro critério",
      "- [ ] segundo critério com api endpoint",
      "## Outra seção",
      "- não capturar",
    ].join("\n"),
  };

  it("projeta apenas Issues type:task, com passes=false", () => {
    const naoTask: Issue = { number: 7, labels: ["type:docs"], body: issue.body };
    const out = project([issue, naoTask]);
    expect(out).toHaveLength(2);
    expect(out.every((i) => i.passes === false)).toBe(true);
    expect(out.every((i) => i.issue === 42)).toBe(true);
  });

  it("captura só os critérios sob 'Critérios de aceite'", () => {
    const accs = extractAcceptance(issue.body!);
    expect(accs).toEqual(["primeiro critério", "segundo critério com api endpoint"]);
  });

  it("não trunca bullets quebrados em múltiplas linhas (wrap de markdown)", () => {
    const body = [
      "## Critérios de aceite",
      "- [ ] primeiro critério longo que continua",
      "      na segunda linha e termina aqui.",
      "- [ ] segundo critério simples.",
      "",
      "- [ ] terceiro após linha em branco,",
      "  com continuação indentada.",
      "## Outra seção",
      "linha que não deve ser anexada",
    ].join("\n");
    expect(extractAcceptance(body)).toEqual([
      "primeiro critério longo que continua na segunda linha e termina aqui.",
      "segundo critério simples.",
      "terceiro após linha em branco, com continuação indentada.",
    ]);
  });

  it("infere categoria", () => {
    expect(inferCategory("validar endpoint da api")).toBe("contract");
    expect(inferCategory("ajustar contraste do tema")).toBe("style");
    expect(inferCategory("somar dois números")).toBe("functional");
  });

  it("IDs estáveis e independentes de caixa/espaços", () => {
    expect(makeId(42, "Primeiro   Critério")).toBe(makeId(42, "primeiro critério"));
  });

  it("merge é idempotente (rodar de novo não adiciona)", () => {
    const gen = project([issue]);
    const first = merge([], gen);
    const second = merge(first.result, gen);
    expect(second.added).toHaveLength(0);
    expect(second.result).toHaveLength(first.result.length);
  });

  it("isSdd reconhece a label type:task em string ou objeto", () => {
    expect(isSdd({ number: 1, labels: ["type:task"] })).toBe(true);
    expect(isSdd({ number: 2, labels: [{ name: "type:task" }] })).toBe(true);
    expect(isSdd({ number: 3, labels: ["type:docs"] })).toBe(false);
  });
});
