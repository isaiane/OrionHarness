// Testes do MANIFESTO de classificação (T9.2 / O9). Provam que a validação de consistência interna
// aceita o manifesto real e MORDE cada classe de defeito — verde ≠ correto (lição #43): o caso válido
// e as mordidas rodam juntos.

import { describe, expect, it } from "vitest";
import {
  COVERAGE_DOMAIN,
  MANIFEST,
  RULES,
  validateManifest,
  type ManifestEntry,
} from "./artifact-manifest.ts";

describe("manifesto real", () => {
  it("é válido (papel único por par, baldes/grupos/fatias coerentes, cobertura completa)", () => {
    const r = validateManifest(MANIFEST, COVERAGE_DOMAIN.files);
    expect(r.violations).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("classifica cada par com um papel do enum e só usa regras declaradas", () => {
    for (const e of MANIFEST) expect(RULES).toContain(e.rule);
    // Todo arquivo do domínio tem ≥1 entrada.
    const files = new Set(MANIFEST.map((e) => e.file));
    for (const f of COVERAGE_DOMAIN.files) expect(files.has(f)).toBe(true);
  });

  it("separa os dois grupos de espelho exigidos pelo critério de aceite", () => {
    const gov = MANIFEST.filter((e) => e.group === "governance-authoritative");
    const plan = MANIFEST.filter((e) => e.group === "plan-history");
    expect(gov.length).toBeGreaterThan(0);
    expect(plan.length).toBeGreaterThan(0);
    // governance-authoritative muda nas T9.5; plan-history só nas T9.3/T9.4.
    for (const e of gov) expect(["T9.5a", "T9.5b"]).toContain(e.slice);
    for (const e of plan) expect(["T9.3b", "T9.4a", "T9.4b"]).toContain(e.slice);
  });

  it("marca referências normativas a PLAN/CHANGELOG como fonte", () => {
    const norm = MANIFEST.filter((e) => e.normativeSourceRef);
    expect(norm.length).toBeGreaterThan(0);
    for (const e of norm)
      expect(["plano-L1", "historia-L5", "roteamento-historia"]).toContain(e.rule);
  });
});

describe("o validador morde", () => {
  const base = MANIFEST;

  it("par duplicado (dois papéis para o mesmo (arquivo, regra))", () => {
    const r = validateManifest([...base, base[0]!], COVERAGE_DOMAIN.files);
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.includes("par duplicado"))).toBe(true);
  });

  it("grupo incoerente com a fatia", () => {
    const bad: ManifestEntry = {
      file: "Z.md", rule: "fast-lane", role: "mirror",
      destiny: "keep", slice: "T9.3b", group: "governance-authoritative", note: "x",
    };
    const r = validateManifest([...base, bad], COVERAGE_DOMAIN.files);
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.includes("governance-authoritative exige"))).toBe(true);
  });

  it("destino stub/remove sem fatia executora", () => {
    const bad: ManifestEntry = {
      file: "Z.md", rule: "plano-L1", role: "source",
      destiny: "stub", slice: null, group: "plan-history", note: "x",
    };
    const r = validateManifest([...base, bad], COVERAGE_DOMAIN.files);
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.includes("exige uma fatia executora"))).toBe(true);
  });

  it("arquivo do domínio sem nenhuma entrada", () => {
    const r = validateManifest(base, [...COVERAGE_DOMAIN.files, "docs/fantasma.md"]);
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.includes("cobertura"))).toBe(true);
  });

  it("T9.4a com destino destrutivo (adição pura, ADR-0025 §9)", () => {
    const bad: ManifestEntry = {
      file: "Z.md", rule: "historia-L5", role: "source",
      destiny: "stub", slice: "T9.4a", group: "plan-history", note: "x",
    };
    const r = validateManifest([...base, bad], COVERAGE_DOMAIN.files);
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.includes("T9.4a é adição pura"))).toBe(true);
  });

  it("citação a .orion/tmp viola a re-derivação", () => {
    const bad: ManifestEntry = {
      file: "Z.md", rule: "manifesto", role: "source",
      destiny: "keep", slice: null, group: "na", note: "veja .orion/tmp/algo.md",
    };
    const r = validateManifest([...base, bad], COVERAGE_DOMAIN.files);
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.includes(".orion/tmp"))).toBe(true);
  });
});
