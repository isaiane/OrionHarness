import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Ajv } from "ajv";
import type { LedgerItem } from "./ledger-guard.ts";
import {
  fingerprint,
  lifecycleFingerprint,
  validateShape,
  verifyProvenance,
  diffOrigin,
  inScope,
  inheritedIdSet,
  initLocalOrigin,
  readBaseMarker,
  loadLedger,
  validateLifecycleShape,
  verifyLifecycle,
  classifyLifecycle,
  lifecycleAbsenceError,
  gitTreePath,
  resolveDeliveredIds,
  diffLifecycle,
  readBaseLifecycle,
  readHeadLifecycle,
  type LedgerOrigin,
  type LedgerLifecycle,
} from "./ledger-origin.ts";
import { symlinkSync } from "node:fs";

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

describe("inheritedIdSet (#106)", () => {
  it("orion → conjunto vazio (nada herdado)", () => {
    expect(inheritedIdSet({ origin: "orion" }).size).toBe(0);
  });

  it("local → os ids herdados do marcador", () => {
    const s = inheritedIdSet(initLocalOrigin(seed, "2026-07-24"));
    expect(s.has(seed[0]!.id)).toBe(true);
    expect(s.size).toBe(seed.length);
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

describe("loadLedger (rejeita não-array — Codex #105 r9)", () => {
  const dir = mkdtempSync(join(tmpdir(), "co105-ledger-"));
  const write = (name: string, content: string): string => {
    const p = join(dir, name);
    writeFileSync(p, content);
    return p;
  };

  it("array de entradas válidas → ok", () => {
    expect(loadLedger(write("ok.json", JSON.stringify(seed)))).toHaveLength(seed.length);
  });

  it("objeto JSON válido não-array ({}) → lança (não 'undefined entrada(s)')", () => {
    expect(() => loadLedger(write("obj.json", "{}"))).toThrow();
  });

  it("array com entrada sem id string → lança", () => {
    expect(() => loadLedger(write("noid.json", JSON.stringify([{ issue: 1 }])))).toThrow();
  });
});

describe("view no escopo p/ get-bearings (#107)", () => {
  const localPending = item({ id: "F-9001-aaa", issue: 9001, passes: false });
  const localDone = item({ id: "F-9002-bbb", issue: 9002, passes: true });

  it("derivado: a view (inScope) traz só as locais; herdadas ficam ocultas", () => {
    const marker = initLocalOrigin(seed, "2026-07-24");
    const ledger = [...seed, localPending, localDone];
    const scoped = inScope(marker, ledger);
    // o que o --scoped resume: entradas no escopo, pendentes (passes:false) e herdadas ocultas
    expect(scoped.map((x) => x.id)).toEqual([localPending.id, localDone.id]);
    expect(scoped.filter((x) => !x.passes)).toHaveLength(1);
    expect(ledger.length - scoped.length).toBe(seed.length);
  });

  it("orion: a view é o ledger inteiro (no-op benéfico)", () => {
    expect(inScope({ origin: "orion" }, seed).map((x) => x.id)).toEqual(seed.map((x) => x.id));
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

// ─── Lifecycle (ADR-0022 / #114) ──────────────────────────────────────────────────────────────────
describe("lifecycle: schema × validateLifecycleShape", () => {
  const schema = JSON.parse(readFileSync("tools/ledger/ledger-lifecycle.schema.json", "utf-8"));
  const validate = new Ajv().compile(schema);

  const mk = (over: Partial<LedgerLifecycle> = {}): LedgerLifecycle => ({
    regimeAdr: "ADR-0022",
    adoptedOn: "2026-07-28",
    legacySha256: fingerprint(seed),
    legacyEntryIds: seed.map((it) => it.id),
    ...over,
  });

  it("o .orion/ledger-lifecycle.json versionado valida contra o schema", () => {
    validate(JSON.parse(readFileSync(".orion/ledger-lifecycle.json", "utf-8")));
    expect(validate.errors ?? []).toEqual([]);
  });

  it("schema e validateLifecycleShape concordam num marcador bem-formado", () => {
    const m = mk();
    expect(validate(m)).toBe(true);
    expect(validateLifecycleShape(m)).toEqual([]);
  });

  it("ambos rejeitam campo desconhecido, sha inválido e data inválida", () => {
    for (const bad of [
      mk({ regimeAdr: "" }),
      { ...mk(), extra: 1 } as unknown,
      mk({ legacySha256: "nope" }),
      mk({ adoptedOn: "28/07/2026" }),
    ]) {
      expect(validate(bad)).toBe(false);
      expect(validateLifecycleShape(bad)).not.toEqual([]);
    }
  });
});

describe("verifyLifecycle (tamper-evidence)", () => {
  const marker: LedgerLifecycle = {
    regimeAdr: "ADR-0022",
    adoptedOn: "2026-07-28",
    legacySha256: lifecycleFingerprint(seed), // fingerprint só dos campos imutáveis
    legacyEntryIds: seed.map((it) => it.id),
  };

  it("PASS quando os ids legado existem e o fingerprint (imutável) bate", () => {
    expect(verifyLifecycle(marker, [...seed, item({ id: "F-0085-novo", issue: 85 })])).toEqual([]);
  });

  it("PASS num flip legítimo `passes:false→true` de entrada legada (Codex r2 #117: não quebra a CI)", () => {
    const flipped = [item({ id: "F-0029-aaa111", issue: 29, passes: true }), seed[1]!];
    expect(verifyLifecycle(marker, flipped)).toEqual([]); // `passes` fora do fingerprint
  });

  it("FAIL quando um campo IMUTÁVEL de entrada legada é editado (fingerprint diverge)", () => {
    const tampered = [item({ id: "F-0029-aaa111", issue: 29, description: "EDITADO" }), seed[1]!];
    expect(verifyLifecycle(marker, tampered).some((e) => e.includes("fingerprint"))).toBe(true);
  });

  it("FAIL quando um id legado sumiu do ledger", () => {
    expect(verifyLifecycle(marker, [seed[0]!]).some((e) => e.includes("ausente"))).toBe(true);
  });
});

describe("resolveDeliveredIds — baseline EXPLÍCITA inválida falha (Codex r7 #117)", () => {
  const dir = mkdtempSync(join(tmpdir(), "base-"));

  it("--base válido (array) → ids", () => {
    const p = join(dir, "ok.json");
    writeFileSync(p, JSON.stringify([{ id: "F-1" }, { id: "F-2" }]));
    const r = resolveDeliveredIds(p, "feature-ledger.json");
    expect("ids" in r && [...r.ids]).toEqual(["F-1", "F-2"]);
  });

  it("--base ausente → error (não fallback conservador)", () => {
    expect(resolveDeliveredIds(join(dir, "nao-existe.json"), "feature-ledger.json")).toHaveProperty("error");
  });

  it("--base com JSON inválido → error", () => {
    const p = join(dir, "bad.json");
    writeFileSync(p, "{ nope");
    expect(resolveDeliveredIds(p, "feature-ledger.json")).toHaveProperty("error");
  });

  it("--base não-array (ex.: {}) → error", () => {
    const p = join(dir, "obj.json");
    writeFileSync(p, "{}");
    expect(resolveDeliveredIds(p, "feature-ledger.json")).toHaveProperty("error");
  });

  it("--base com entry malformado (sem id string, ex.: [{issue:1}]) → error (Codex r8)", () => {
    const p = join(dir, "malformed.json");
    writeFileSync(p, JSON.stringify([{ issue: 1 }]));
    expect(resolveDeliveredIds(p, "feature-ledger.json")).toHaveProperty("error");
  });
});

describe("gitTreePath (relativo à RAIZ do repo — Codex r6/r11 #117)", () => {
  const root = "/repo";
  it("path relativo (resolvido vs cwd) → root-relative quando root == cwd", () => {
    // path relativo resolve contra a cwd; com root == cwd o resultado é o próprio nome.
    expect(gitTreePath("feature-ledger.json", process.cwd())).toBe("feature-ledger.json");
  });

  it("path ABSOLUTO dentro da raiz (mesmo de um subdir) → root-relative, não `../`", () => {
    expect(gitTreePath("/repo/sub/dir/feature-ledger.json", root)).toBe("sub/dir/feature-ledger.json");
  });

  it("path FORA da raiz (`..`) → null (baseline via git não se aplica; use --base)", () => {
    expect(gitTreePath("/fora/ledger.json", root)).toBeNull();
  });
});

describe("diffLifecycle (guard base×head — congela o corte do legado, #116)", () => {
  const mk = (over: Partial<LedgerLifecycle> = {}): LedgerLifecycle => ({
    regimeAdr: "ADR-0022",
    adoptedOn: "2026-07-28",
    legacySha256: lifecycleFingerprint(seed),
    legacyEntryIds: seed.map((it) => it.id),
    ...over,
  });

  it("introdução VINCULADA ao ledger da base: legacyEntryIds == ids(base) → OK (Codex #119 r2)", () => {
    // `mk()` usa exatamente os ids/fingerprint de `seed` → bate com baseLedger = seed.
    expect(diffLifecycle(null, mk(), seed)).toEqual([]);
  });

  it("introdução sem o ledger da base → fail-closed", () => {
    expect(diffLifecycle(null, mk()).some((e) => e.includes("requer o ledger da base"))).toBe(true);
  });

  it("introdução com legacyEntryIds ⊂ base (subconjunto arbitrário) → FAIL", () => {
    const errs = diffLifecycle(null, mk({ legacyEntryIds: [seed[0]!.id] }), seed);
    expect(errs.some((e) => e.includes("legacyEntryIds"))).toBe(true);
  });

  it("introdução com legacySha256 que não bate o base → FAIL", () => {
    const errs = diffLifecycle(null, mk({ legacySha256: "sha256:" + "0".repeat(64) }), seed);
    expect(errs.some((e) => e.includes("legacySha256"))).toBe(true);
  });

  it("introdução com regimeAdr errado ('ADR-9999') → FAIL (metadado congelado; Codex #119 r5)", () => {
    expect(diffLifecycle(null, mk({ regimeAdr: "ADR-9999" }), seed).some((e) => e.includes("regimeAdr"))).toBe(true);
  });

  it("introdução com adoptedOn futuro → FAIL (não pode ser futuro)", () => {
    const errs = diffLifecycle(null, mk({ adoptedOn: "2099-01-01" }), seed, "2026-07-31");
    expect(errs.some((e) => e.includes("adoptedOn"))).toBe(true);
  });

  it("introdução com metadados válidos + fronteira correta → OK", () => {
    expect(diffLifecycle(null, mk(), seed, "2026-07-31")).toEqual([]);
  });

  it("introdução em DERIVADO local (fronteira vazia []): cut vazio OK; cut não-vazio → FAIL (Codex #119 r3)", () => {
    // cmdGuardLifecycle passa baseLedger = [] p/ origem local (sem legado local).
    const emptyCut = mk({ legacyEntryIds: [], legacySha256: lifecycleFingerprint([]) });
    expect(diffLifecycle(null, emptyCut, [])).toEqual([]);
    expect(diffLifecycle(null, mk(), []).some((e) => e.includes("legacyEntryIds"))).toBe(true);
  });

  it("introdução com head malformado → erro de forma", () => {
    expect(diffLifecycle(null, { regimeAdr: "ADR-0022" } as unknown as LedgerLifecycle, seed)).not.toEqual([]);
  });

  it("idempotente (base == head) → OK", () => {
    expect(diffLifecycle(mk(), mk())).toEqual([]);
  });

  it("só `note` muda → OK", () => {
    expect(diffLifecycle(mk(), mk({ note: "novo racional" }))).toEqual([]);
  });

  it("FAIL ao mover/reclassificar `legacyEntryIds` (encolher)", () => {
    const errs = diffLifecycle(mk(), mk({ legacyEntryIds: [seed[0]!.id] }));
    expect(errs.some((e) => e.includes("legacyEntryIds"))).toBe(true);
  });

  it("FAIL ao re-fingerprintar `legacySha256`", () => {
    const errs = diffLifecycle(mk(), mk({ legacySha256: "sha256:" + "0".repeat(64) }));
    expect(errs.some((e) => e.includes("legacySha256"))).toBe(true);
  });

  it("FAIL ao mudar `adoptedOn`/`regimeAdr`", () => {
    expect(diffLifecycle(mk(), mk({ adoptedOn: "2026-08-01" })).some((e) => e.includes("adoptedOn"))).toBe(true);
    expect(diffLifecycle(mk(), mk({ regimeAdr: "ADR-9999" })).some((e) => e.includes("regimeAdr"))).toBe(true);
  });

  it("FAIL ao remover o marcador estabelecido (base presente → head ausente)", () => {
    expect(diffLifecycle(mk(), null).some((e) => e.includes("removido"))).toBe(true);
  });

  it("base ausente e head ausente → OK (repo sem corte)", () => {
    expect(diffLifecycle(null, null)).toEqual([]);
  });
});

describe("readBaseLifecycle", () => {
  const dir = mkdtempSync(join(tmpdir(), "lifecycle-base-"));
  const valid: LedgerLifecycle = {
    regimeAdr: "ADR-0022",
    adoptedOn: "2026-07-28",
    legacySha256: lifecycleFingerprint(seed),
    legacyEntryIds: seed.map((it) => it.id),
  };

  it("arquivo GENUINAMENTE ausente → absent (introdução legítima)", () => {
    expect(readBaseLifecycle(join(dir, "inexistente.json")).kind).toBe("absent");
  });

  it("presente mas vazio/`null` → invalid (base corrompida, NÃO absent — Codex #119)", () => {
    const pn = join(dir, "null.json");
    writeFileSync(pn, "null");
    expect(readBaseLifecycle(pn).kind).toBe("invalid");
    const pe = join(dir, "empty.json");
    writeFileSync(pe, "  \n");
    expect(readBaseLifecycle(pe).kind).toBe("invalid");
  });

  it("bem-formado → value", () => {
    const p = join(dir, "ok.json");
    writeFileSync(p, JSON.stringify(valid));
    const r = readBaseLifecycle(p);
    expect(r.kind).toBe("value");
  });

  it("presente-mas-inválido (JSON quebrado / forma inválida) → invalid (fail-closed)", () => {
    const p1 = join(dir, "broken.json");
    writeFileSync(p1, "{ nope");
    expect(readBaseLifecycle(p1).kind).toBe("invalid");
    const p2 = join(dir, "badshape.json");
    writeFileSync(p2, JSON.stringify({ regimeAdr: "ADR-0022" }));
    expect(readBaseLifecycle(p2).kind).toBe("invalid");
  });
});

describe("readHeadLifecycle (rejeita symlink/`null` presente — Codex #119 r2)", () => {
  const dir = mkdtempSync(join(tmpdir(), "lifecycle-head-"));
  const valid: LedgerLifecycle = {
    regimeAdr: "ADR-0022",
    adoptedOn: "2026-07-28",
    legacySha256: lifecycleFingerprint(seed),
    legacyEntryIds: seed.map((it) => it.id),
  };

  it("arquivo regular bem-formado → value", () => {
    const p = join(dir, "ok.json");
    writeFileSync(p, JSON.stringify(valid));
    expect(readHeadLifecycle(p).kind).toBe("value");
  });

  it("arquivo GENUINAMENTE ausente → removed (marcador deletado)", () => {
    expect(readHeadLifecycle(join(dir, "inexistente.json")).kind).toBe("removed");
  });

  it("SYMLINK → invalid (o blob rastreado seria só o caminho)", () => {
    const target = join(dir, "target.json");
    writeFileSync(target, JSON.stringify(valid));
    const link = join(dir, "link.json");
    symlinkSync(target, link);
    const r = readHeadLifecycle(link);
    expect(r.kind).toBe("invalid");
    expect(r.kind === "invalid" && r.reason).toMatch(/symlink/i);
  });

  it("presente mas `null`/vazio → invalid (corrompido, não 'removido')", () => {
    const pn = join(dir, "null.json");
    writeFileSync(pn, "null");
    expect(readHeadLifecycle(pn).kind).toBe("invalid");
  });
});

describe("lifecycleAbsenceError (fail-closed p/ Orion)", () => {
  const local = initLocalOrigin(seed, "2026-07-24");
  it("presente → sem erro (qualquer origem)", () => {
    expect(lifecycleAbsenceError({ origin: "orion" }, true)).toEqual([]);
    expect(lifecycleAbsenceError(local, true)).toEqual([]);
  });
  it("ausente + origem orion → FAIL (marcador versionado removido)", () => {
    expect(lifecycleAbsenceError({ origin: "orion" }, false)).toHaveLength(1);
  });
  it("ausente + origem local → OK (derivado sem legado local)", () => {
    expect(lifecycleAbsenceError(local, false)).toEqual([]);
  });
});

describe("classifyLifecycle", () => {
  const legado = item({ id: "F-0031-leg", issue: 31, passes: false });
  const entregue = item({ id: "F-0090-await", issue: 90, passes: false });
  const branchNew = item({ id: "F-0114-new", issue: 114, passes: false });
  const concluida = item({ id: "F-0085-done", issue: 85, passes: true });
  const legacyIds = new Set([legado.id]);
  const delivered = new Set([entregue.id]); // só a entregue está em origin/main

  it("separa legado / aguardando-flip / pendente / concluída", () => {
    const v = classifyLifecycle([legado, entregue, branchNew, concluida], legacyIds, delivered);
    expect(v.legacy.map((x) => x.id)).toEqual([legado.id]);
    expect(v.awaitingFlip.map((x) => x.id)).toEqual([entregue.id]);
    expect(v.pending.map((x) => x.id)).toEqual([branchNew.id]);
    expect(v.done.map((x) => x.id)).toEqual([concluida.id]);
  });

  it("recém-projetada NÃO entregue (ausente da baseline) é PENDENTE, não aguardando-flip (Codex r1 #117)", () => {
    const v = classifyLifecycle([branchNew], new Set(), new Set()); // nada entregue
    expect(v.awaitingFlip).toHaveLength(0);
    expect(v.pending.map((x) => x.id)).toEqual([branchNew.id]);
  });

  it("mesma entrada vira aguardando-flip depois de entregue (∈ baseline)", () => {
    const v = classifyLifecycle([branchNew], new Set(), new Set([branchNew.id]));
    expect(v.pending).toHaveLength(0);
    expect(v.awaitingFlip.map((x) => x.id)).toEqual([branchNew.id]);
  });

  it("id legado tem precedência mesmo se passes=true (fora da obrigação de flip)", () => {
    const legTrue = item({ id: "F-0031-leg", issue: 31, passes: true });
    const v = classifyLifecycle([legTrue], legacyIds, new Set());
    expect(v.legacy.map((x) => x.id)).toEqual([legTrue.id]);
    expect(v.done).toHaveLength(0);
  });
});
