import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Ajv } from "ajv";
import type { LedgerItem } from "./ledger-guard.ts";
import {
  fingerprint,
  validateShape,
  verifyProvenance,
  diffOrigin,
  inScope,
  initLocalOrigin,
  readBaseMarker,
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

  it("fail-closed em id duplicado — dup intacto não mascara edição (Codex #105 r7)", () => {
    const edited = item({ id: "F-0029-aaa111", issue: 29, description: "EDITADO" });
    const tamperedWithDup = [edited, seed[0]!, seed[1]!]; // edited + dup intacto de F-0029-aaa111
    expect(verifyProvenance(marker, tamperedWithDup).some((e) => e.includes("duplicado"))).toBe(true);
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

describe("diffOrigin (imutabilidade base×head — Codex #105)", () => {
  const local = () => initLocalOrigin(seed, "2026-07-24") as Extract<LedgerOrigin, { origin: "local" }>;

  it("base ausente → head orion: introdução permitida", () => {
    expect(diffOrigin(null, { origin: "orion" })).toEqual([]);
  });

  it("base ausente → head local: bootstrap vinculado ao ledger da base permitido", () => {
    expect(diffOrigin(null, local(), seed)).toEqual([]);
  });

  it("orion → orion: permitido", () => {
    expect(diffOrigin({ origin: "orion" }, { origin: "orion" })).toEqual([]);
  });

  it("orion → local: transição one-time permitida quando bate com o ledger da base", () => {
    expect(diffOrigin({ origin: "orion" }, local(), seed)).toEqual([]);
  });

  it("orion → local SEM ledger da base: PROIBIDO (fail-closed)", () => {
    expect(diffOrigin({ origin: "orion" }, local()).some((e) => e.includes("ledger da base"))).toBe(true);
  });

  it("orion → local marcando entrada LOCAL como herdada: PROIBIDO (Codex #105 3ª rodada)", () => {
    // baseLedger só tem `seed`; o marcador declara uma entrada local extra como herdada.
    const local1 = item({ id: "F-0200-ddd444", issue: 200 });
    const sneaky = initLocalOrigin([...seed, local1], "2026-07-24");
    expect(diffOrigin({ origin: "orion" }, sneaky, seed).length).toBeGreaterThan(0);
  });

  it("local → local idêntico: permitido", () => {
    expect(diffOrigin(local(), local())).toEqual([]);
  });

  it("local → local mudando só 'note': permitido", () => {
    expect(diffOrigin(local(), { ...local(), note: "outra nota" })).toEqual([]);
  });

  it("local → orion: PROIBIDO (reverter a fronteira)", () => {
    expect(diffOrigin(local(), { origin: "orion" }).some((e) => e.includes("reverter"))).toBe(true);
  });

  it("local → local com seedSha256 diferente: PROIBIDO (re-fingerprint)", () => {
    const tampered = { ...local(), seedSha256: fingerprint([seed[0]!]) };
    expect(diffOrigin(local(), tampered).some((e) => e.includes("seedSha256"))).toBe(true);
  });

  it("local → local reclassificando ids: PROIBIDO", () => {
    const moved = { ...local(), inheritedEntryIds: [...local().inheritedEntryIds, "F-0100-ccc333"] };
    expect(diffOrigin(local(), moved).some((e) => e.includes("inheritedEntryIds"))).toBe(true);
  });

  it("local → local mudando bootstrappedOn: PROIBIDO", () => {
    expect(diffOrigin(local(), { ...local(), bootstrappedOn: "2030-01-01" }).some((e) => e.includes("bootstrappedOn"))).toBe(true);
  });
});

describe("readBaseMarker (ausente × presente-inválido — Codex #105 r8)", () => {
  const dir = mkdtempSync(join(tmpdir(), "co105-base-"));
  const write = (name: string, content: string): string => {
    const p = join(dir, name);
    writeFileSync(p, content);
    return p;
  };

  it("arquivo inexistente → absent", () => {
    expect(readBaseMarker(join(dir, "nao-existe.json")).kind).toBe("absent");
  });

  it("sentinela 'null' (smoke grava p/ ausente) → absent", () => {
    expect(readBaseMarker(write("null.json", "null")).kind).toBe("absent");
  });

  it("vazio → absent", () => {
    expect(readBaseMarker(write("vazio.json", "  ")).kind).toBe("absent");
  });

  it("presente mas truncado/não-parseável → invalid (NÃO absent)", () => {
    expect(readBaseMarker(write("bad.json", "{ trunc")).kind).toBe("invalid");
  });

  it("presente mas forma inválida → invalid", () => {
    expect(readBaseMarker(write("shape.json", JSON.stringify({ origin: "local" }))).kind).toBe("invalid");
  });

  it("marcador orion válido → value", () => {
    const r = readBaseMarker(write("ok.json", JSON.stringify({ origin: "orion" })));
    expect(r.kind).toBe("value");
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
