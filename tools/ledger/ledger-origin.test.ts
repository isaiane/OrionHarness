import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { Ajv } from "ajv";
import type { LedgerItem } from "./ledger-guard.ts";
import {
  fingerprint,
  validateShape,
  verifyProvenance,
  inScope,
  initLocalOrigin,
  type LedgerOrigin,
} from "./ledger-origin.ts";

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

const seed: LedgerItem[] = [
  item({ id: "F-0029-aaa111", issue: 29 }),
  item({ id: "F-0030-bbb222", issue: 30 }),
];

describe("schema do marcador de origem", () => {
  const schema = JSON.parse(readFileSync("tools/ledger/ledger-origin.schema.json", "utf-8"));
  const validate = new Ajv().compile(schema);

  it("o .orion/ledger-origin.json versionado valida contra o schema", () => {
    validate(JSON.parse(readFileSync(".orion/ledger-origin.json", "utf-8")));
    expect(validate.errors ?? []).toEqual([]);
  });

  it("aceita um marcador de origem local bem-formado", () => {
    expect(validate(initLocalOrigin(seed, "2026-07-24"))).toBe(true);
  });

  it("rejeita origem local sem seedSha256", () => {
    expect(validate({ origin: "local", bootstrappedOn: "2026-07-24", inheritedEntryIds: [] })).toBe(false);
  });

  it("rejeita campo desconhecido", () => {
    expect(validate({ origin: "orion", extra: 1 })).toBe(false);
  });
});

describe("fingerprint", () => {
  it("é estável e insensível à ordem (reorder-safe)", () => {
    expect(fingerprint(seed)).toBe(fingerprint([...seed].reverse()));
  });

  it("muda se uma entrada é editada", () => {
    const edited = [item({ id: "F-0029-aaa111", issue: 29, passes: true }), seed[1]!];
    expect(fingerprint(edited)).not.toBe(fingerprint(seed));
  });
});

describe("validateShape", () => {
  it("aceita origem orion", () => {
    expect(validateShape({ origin: "orion" })).toEqual([]);
  });

  it("aceita origem local bem-formada", () => {
    expect(validateShape(initLocalOrigin(seed, "2026-07-24"))).toEqual([]);
  });

  it("rejeita origin desconhecido", () => {
    expect(validateShape({ origin: "outro" })).toHaveLength(1);
  });

  it("aponta campos faltantes na origem local", () => {
    expect(validateShape({ origin: "local" }).length).toBeGreaterThan(0);
  });

  it("rejeita seedSha256 mal-formado", () => {
    const m = { ...initLocalOrigin(seed, "2026-07-24"), seedSha256: "sha256:xyz" };
    expect(validateShape(m).some((e) => e.includes("seedSha256"))).toBe(true);
  });

  it("rejeita campo desconhecido (additionalProperties, Codex #105)", () => {
    expect(validateShape({ origin: "orion", extra: 1 }).some((e) => e.includes("desconhecido"))).toBe(true);
  });

  it("rejeita note não-string", () => {
    expect(validateShape({ origin: "orion", note: 1 }).some((e) => e.includes("note"))).toBe(true);
  });
});

// Contrato: o validador manual do runtime (--check) e o schema JSON (Ajv) devem CONCORDAR em cada
// fixture — aceitar/rejeitar juntos (Codex #105: eles divergiam em additionalProperties/note).
describe("validateShape ≡ schema Ajv (equivalência)", () => {
  const schema = JSON.parse(readFileSync("tools/ledger/ledger-origin.schema.json", "utf-8"));
  const ajv = new Ajv().compile(schema);
  const fixtures: unknown[] = [
    { origin: "orion" },
    { origin: "orion", note: "ok" },
    { origin: "orion", extra: 1 },
    { origin: "orion", note: 1 },
    { origin: "outro" },
    initLocalOrigin(seed, "2026-07-24"),
    { origin: "local", bootstrappedOn: "2026-07-24", inheritedEntryIds: [] },
    { origin: "local", bootstrappedOn: "24/07", seedSha256: "sha256:xyz", inheritedEntryIds: [1] },
    { ...initLocalOrigin(seed, "2026-07-24"), lixo: true },
    { ...initLocalOrigin(seed, "2026-07-24"), note: 42 },
    [],
    null,
  ];
  for (const [i, fx] of fixtures.entries()) {
    it(`concordam na fixture #${i}`, () => {
      expect(validateShape(fx).length === 0).toBe(ajv(fx));
    });
  }
});

describe("verifyProvenance (tamper-evident)", () => {
  const marker = initLocalOrigin(seed, "2026-07-24");

  it("origem orion não tem procedência a conferir", () => {
    expect(verifyProvenance({ origin: "orion" }, seed)).toEqual([]);
  });

  it("passa quando a semente está intacta (com entradas locais adicionadas)", () => {
    const grown = [...seed, item({ id: "F-0100-ccc333", issue: 100 })];
    expect(verifyProvenance(marker, grown)).toEqual([]);
  });

  it("falha se uma entrada herdada foi editada (fingerprint diverge)", () => {
    const tampered = [item({ id: "F-0029-aaa111", issue: 29, passes: true }), seed[1]!];
    expect(verifyProvenance(marker, tampered).some((e) => e.includes("diverge"))).toBe(true);
  });

  it("falha se uma entrada herdada sumiu (append-only violado)", () => {
    expect(verifyProvenance(marker, [seed[0]!]).some((e) => e.includes("ausente"))).toBe(true);
  });
});

describe("inScope", () => {
  it("orion: todo o ledger está no escopo", () => {
    expect(inScope({ origin: "orion" }, seed)).toEqual(seed);
  });

  it("local: só as entradas não-herdadas entram no escopo", () => {
    const marker = initLocalOrigin(seed, "2026-07-24");
    const local = item({ id: "F-0100-ccc333", issue: 100 });
    expect(inScope(marker, [...seed, local])).toEqual([local]);
  });
});

describe("initLocalOrigin", () => {
  it("marca todas as entradas atuais como herdadas e fixa o fingerprint", () => {
    const m = initLocalOrigin(seed, "2026-07-24") as Extract<LedgerOrigin, { origin: "local" }>;
    expect(m.origin).toBe("local");
    expect(m.inheritedEntryIds).toHaveLength(seed.length);
    expect(m.seedSha256).toBe(fingerprint(seed));
  });
});
