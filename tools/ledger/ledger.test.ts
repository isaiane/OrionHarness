import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Ajv } from "ajv";
import { diff, type LedgerItem } from "./ledger-guard.ts";
import {
  project,
  merge,
  makeId,
  inferCategory,
  validationSteps,
  extractAcceptance,
  isSdd,
  loadIssues,
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

  it("FAIL (fail-closed) em id duplicado no head — mascara edição via dup (Codex #105 r7)", () => {
    // entrada editada + duplicado intacto de mesmo id: sem o guard, o Map colapsaria e passaria.
    const errs = diff(
      [item({ id: "F-0001-abc123", description: "orig" })],
      [item({ id: "F-0001-abc123", description: "EDITADO" }), item({ id: "F-0001-abc123", description: "orig" })],
    );
    expect(errs.some((e) => e.includes("duplicado"))).toBe(true);
  });

  it("FAIL em id duplicado na base", () => {
    expect(diff([item(), item()], [item()]).some((e) => e.includes("duplicado"))).toBe(true);
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

  it("junta continuações multi-linha de um mesmo bullet num único critério", () => {
    const body = [
      "## Critérios de aceite",
      "- [ ] Bullet de critério que quebra em várias linhas",
      "  físicas até o próximo bullet, mantendo a",
      "  coerência de sentido.",
      "- Segundo critério, numa linha só.",
      "",
      "## Fora de escopo",
      "- não capturar",
    ].join("\n");
    expect(extractAcceptance(body)).toEqual([
      "Bullet de critério que quebra em várias linhas físicas até o próximo bullet, mantendo a coerência de sentido.",
      "Segundo critério, numa linha só.",
    ]);
  });

  it("cobre checkbox, numerado e parêntese que quebra linha", () => {
    const body = [
      "## Critérios de aceite",
      "1. Critério numerado que continua",
      "   numa segunda linha.",
      "- [x] Checkbox marcado com continuação",
      "  (incluindo um parêntese",
      "  que quebra a linha).",
      "* Bullet com asterisco simples.",
    ].join("\n");
    expect(extractAcceptance(body)).toEqual([
      "Critério numerado que continua numa segunda linha.",
      "Checkbox marcado com continuação (incluindo um parêntese que quebra a linha).",
      "Bullet com asterisco simples.",
    ]);
  });

  it("linha branca encerra a continuação (não vaza para o próximo bullet)", () => {
    const body = [
      "## Critérios de aceite",
      "- Primeiro critério",
      "  com continuação.",
      "",
      "- Segundo critério isolado.",
    ].join("\n");
    expect(extractAcceptance(body)).toEqual([
      "Primeiro critério com continuação.",
      "Segundo critério isolado.",
    ]);
  });

  it("não regride IDs de critérios de uma linha (hash estável)", () => {
    // O critério de uma linha continua projetando o mesmo texto/ID de antes do fix.
    const accs = extractAcceptance(issue.body!);
    expect(accs).toEqual(["primeiro critério", "segundo critério com api endpoint"]);
    expect(makeId(42, accs[0]!)).toBe(makeId(42, "primeiro critério"));
  });

  it("infere categoria", () => {
    expect(inferCategory("validar endpoint da api")).toBe("contract");
    expect(inferCategory("ajustar contraste do tema")).toBe("style");
    expect(inferCategory("somar dois números")).toBe("functional");
  });

  it("steps são condicionais à categoria — e2e nunca incondicional (#85, ADR-0022; Codex #113 P2)", () => {
    // functional (catch-all, sem superfície declarada) → NÃO exige e2e (critério de aceite do #85).
    const fn = validationSteps("functional", 42);
    expect(fn).toHaveLength(1);
    expect(fn[0]).not.toMatch(/\bend-to-end\b/i);
    expect(fn[0]).toContain("Plano de validação da Issue #42");
    expect(fn[0]).toMatch(/e2e só se/i); // e2e explicitamente condicional
    // A técnica é uma DICA por categoria (style→browser, contract→contrato público) SEMPRE condicional
    // ("quando"/"só se") — nunca uma exigência incondicional gravada num campo imutável (Codex P2).
    for (const c of ["style", "contract", "functional"]) {
      const step = validationSteps(c, 42)[0]!;
      expect(step).toMatch(/quando|só se/i);
      expect(step).toMatch(/ADR-0009/);
      expect(step).toMatch(/^Validar /); // não afirma a técnica de forma incondicional ("Exercer …")
    }
    expect(validationSteps("style", 42)[0]).toMatch(/browser/i);
    expect(validationSteps("contract", 42)[0]).toMatch(/contrato público/i);
  });

  it("project cabla o step ao category de cada critério (#85)", () => {
    // #42: "primeiro critério" (functional) + "segundo critério com api endpoint" (contract).
    const out = project([issue]);
    const fn = out.find((i) => i.category === "functional")!;
    const contract = out.find((i) => i.category === "contract")!;
    expect(fn.steps).toEqual(validationSteps("functional", 42));
    expect(contract.steps).toEqual(validationSteps("contract", 42));
    // Nenhuma entrada nasce hardcodando e2e universal (o bug que o #85 fecha).
    expect(out.every((i) => !/^Validar end-to-end/.test(i.steps[0]!))).toBe(true);
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
    expect(second.collisions).toHaveLength(0);
  });

  it("merge: id já-presente NÃO-herdado = idempotência, sem colisão (#106)", () => {
    const gen = project([issue]);
    const first = merge([], gen);
    // reprojeta com o mesmo id já presente, mas ele NÃO está no conjunto herdado → idempotência
    const again = merge(first.result, gen, new Set(["outro-id-qualquer"]));
    expect(again.added).toHaveLength(0);
    expect(again.collisions).toHaveLength(0);
  });

  it("merge: id gerado que coincide com um HERDADO = colisão reportada (#106)", () => {
    const inherited = project([issue])[0]!; // simula uma entrada herdada (pré-origem-local)
    // uma projeção local gera o MESMO id (mesmo número + aceite) → colisão, não silent-drop
    const { added, collisions } = merge([inherited], [inherited], new Set([inherited.id]));
    expect(added).toHaveLength(0);
    expect(collisions.map((c) => c.id)).toContain(inherited.id);
  });

  it("merge: id herdado AUSENTE do ledger ainda é colisão (não reconstrói) — Codex #109", () => {
    const gen = project([issue])[0]!;
    // a entrada herdada NÃO está no `existing` (temporariamente ausente/corrompido), mas o id ∈ herdados
    const { added, collisions } = merge([], [gen], new Set([gen.id]));
    expect(added).toHaveLength(0); // não anexa (não reconstrói a herdada)
    expect(collisions.map((c) => c.id)).toContain(gen.id);
  });

  it("isSdd reconhece a label type:task em string ou objeto", () => {
    expect(isSdd({ number: 1, labels: ["type:task"] })).toBe(true);
    expect(isSdd({ number: 2, labels: [{ name: "type:task" }] })).toBe(true);
    expect(isSdd({ number: 3, labels: ["type:docs"] })).toBe(false);
  });
});

describe("loadIssues (--from-gh deprecado — #83)", () => {
  it("--from-gh recusa com erro guiado (não projeta em massa)", () => {
    expect(() => loadIssues({ fromGh: true })).toThrow(/deprecado.*#83/);
  });

  it("sem --issues-json recusa (caminho canônico é per-PR)", () => {
    expect(() => loadIssues({ fromGh: false })).toThrow(/--issues-json/);
  });

  it("--issues-json lê a Issue do arquivo", () => {
    const dir = mkdtempSync(join(tmpdir(), "co83-"));
    const p = join(dir, "iss.json");
    writeFileSync(p, JSON.stringify([{ number: 999, labels: ["type:task"], body: "x" }]));
    const issues = loadIssues({ fromGh: false, issuesJson: p });
    expect(issues).toHaveLength(1);
    expect(issues[0]!.number).toBe(999);
  });
});
