import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  validateManifest,
  extractSections,
  extractSectionIds,
  buildManifest,
  extractCoreMapTiers,
  coreMapDrift,
  CONSTITUTION_TIERS,
  CORE_BUDGET_LINES,
} from "./l0-core-manifest.ts";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf-8");
const AGENTS = read("../../AGENTS.md");
const CORE = read("../../AGENTS.core.md");

describe("extractSections — headings profundos e indentados (achado Codex #96)", () => {
  it("casa heading ATX indentado de 1–3 espaços", () => {
    const md = ["## 1 Princípios", "conteúdo", "   ### 1.1 Sub indentada", "x"].join("\n");
    expect(extractSections(md).map((s) => s.id)).toEqual(["§1", "§1.1"]);
  });

  it("casa `####`/`#####` e id multi-componente (ex.: 11.2.1)", () => {
    const md = ["## 11 Modelo", "a", "#### 11.2.1 Nested", "b"].join("\n");
    expect(extractSections(md).map((s) => s.id)).toEqual(["§11", "§11.2.1"]);
  });

  it("mede o peso (linhas) entre headings", () => {
    const md = ["## 1 A", "l1", "l2", "## 2 B", "l3"].join("\n");
    const w = new Map(extractSections(md).map((s) => [s.id, s.lines]));
    expect(w.get("§1")).toBe(2); // l1,l2
    expect(w.get("§2")).toBe(1); // l3
  });

  it("IGNORA heading numerado dentro de bloco cercado (achado Codex #97)", () => {
    const md = ["## 1 Real", "```md", "  ### 13 Exemplo no fence", "## 99 Também no fence", "```", "fim"].join("\n");
    expect(extractSections(md).map((s) => s.id)).toEqual(["§1"]); // §13/§99 do fence não contam
  });
});

describe("coreMapDrift — rejeita linha duplicada no mapa (achado Codex #96)", () => {
  const tiersToTable = (rows: { id: string; tier: string }[]) =>
    ["| Seção | Título | Tier | Carregar |", "|--|--|--|--|", ...rows.map((r) => `| ${r.id} | t | ${r.tier} | x |`)].join("\n");

  it("mapa idêntico ao manifesto ⇒ sem drift", () => {
    expect(coreMapDrift(tiersToTable(CONSTITUTION_TIERS))).toEqual([]);
  });

  it("id duplicado (mesmo com a última linha batendo) ⇒ drift", () => {
    const dup = [...CONSTITUTION_TIERS, { id: "§1", title: "x", tier: "detail" as const }];
    const drift = coreMapDrift(tiersToTable(dup));
    expect(drift.some((d) => d.includes("§1") && d.includes("duplicada"))).toBe(true);
  });

  it("id duplicado com tier INVÁLIDO na 2ª linha ⇒ ainda detecta (achado Codex #97)", () => {
    // §1 válido + um 2º §1 com tier "corre" — extractCoreMapTiers descartaria a 2ª; o count vê ambas.
    const table = tiersToTable(CONSTITUTION_TIERS) + "\n| §1 | x | corre | y |";
    const drift = coreMapDrift(table);
    expect(drift.some((d) => d.includes("§1") && d.includes("duplicada"))).toBe(true);
  });

  it("linha com §id e tier inválido (não-duplicada) ⇒ drift", () => {
    const table = tiersToTable(CONSTITUTION_TIERS) + "\n| §13 | x | corre | y |";
    expect(coreMapDrift(table).some((d) => d.includes("§13") && d.includes("inválido"))).toBe(true);
  });

  it("tier divergente ⇒ drift", () => {
    const flipped = CONSTITUTION_TIERS.map((c) => (c.id === "§1" ? { ...c, tier: "detail" as const } : c));
    expect(coreMapDrift(tiersToTable(flipped)).some((d) => d.startsWith("§1:"))).toBe(true);
  });
});

describe("manifesto real × documentos do repo (regressão)", () => {
  it("AGENTS.md real: exaustivo, sem violação, core no orçamento", () => {
    const r = validateManifest(extractSectionIds(AGENTS), buildManifest(AGENTS), CORE_BUDGET_LINES);
    expect(r.ok).toBe(true);
    expect(r.coreLines).toBeLessThanOrEqual(CORE_BUDGET_LINES);
  });

  it("mapa do AGENTS.core.md real == manifesto executável", () => {
    expect(coreMapDrift(CORE)).toEqual([]);
    expect(extractCoreMapTiers(CORE).length).toBe(CONSTITUTION_TIERS.length);
  });

  it("o guard morde: seção órfã ⇒ não-ok", () => {
    const r = validateManifest(extractSectionIds(AGENTS), buildManifest(AGENTS).slice(1), CORE_BUDGET_LINES);
    expect(r.ok).toBe(false);
  });
});
