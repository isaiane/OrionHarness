// Testes do zones-check (O16.2b / Issue #364; ADR-0047). Provam que o check ACEITA a árvore real e
// MORDE cada regra (verde ≠ correto, §8.1), e que o validador manual do `harness.json` CONCORDA com o
// schema JSON (Ajv) — o mesmo contrato de equivalência do ledger-origin.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv } from "ajv";
import { describe, expect, it } from "vitest";
import {
  type ZonesManifest,
  checkLinkClosure,
  makeSafeReader,
  newExceptions,
  trackedFiles,
  checkZones,
  localLinkTargets,
  validateHarnessJson,
  zonesOf,
} from "./zones-check.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const MANIFEST = JSON.parse(
  readFileSync(join(ROOT, "tools/distribution/zones.json"), "utf-8"),
) as ZonesManifest;
const SCHEMA = JSON.parse(
  readFileSync(join(ROOT, "tools/distribution/harness.schema.json"), "utf-8"),
);

const mini: ZonesManifest = {
  version: 1,
  limits: { zoneB: 2 },
  zones: {
    A: { paths: ["tools/**"] },
    B: { paths: ["AGENTS.md", "CONTRIBUTING.md"] },
    C: { paths: ["docs/product/**"] },
    D: { paths: ["docs/decisions/**", "STATE.md"], generatedCounterpart: ["STATE.md"] },
  },
  linkClosureExceptions: { "AGENTS.md": ["tools/x.ts"] },
};
const reader =
  (files: Record<string, string>) =>
  (p: string): string | undefined =>
    files[p];
const AG = ["AGENTS.md"];

describe("árvore real", () => {
  // Mesmos `git ls-files -z` e leitor seguro do self-check (Codex #385): nomes crus e sem seguir symlink.
  const files = trackedFiles(ROOT);

  it("cada arquivo rastreado está em exatamente uma zona e a Zona B cabe no teto", () => {
    const r = checkZones(files, MANIFEST);
    expect(r.violations).toEqual([]);
    expect(r.counts.B).toBeLessThanOrEqual(MANIFEST.limits.zoneB);
  });

  it("links da Zona B para fora do produto estão todos nas exceções, e nenhuma exceção é obsoleta", () => {
    expect(checkLinkClosure(MANIFEST, files, makeSafeReader(ROOT)).violations).toEqual([]);
  });
});

describe("zonas", () => {
  it("reprova arquivo sem zona", () => {
    expect(checkZones(["README.md"], mini).violations).toEqual([
      expect.stringContaining("sem zona"),
    ]);
  });

  it("reprova arquivo em duas zonas", () => {
    const m = { ...mini, zones: { ...mini.zones, C: { paths: ["x.md"] }, D: { paths: ["x.md"] } } };
    expect(zonesOf("x.md", m)).toEqual(["C", "D"]);
    expect(checkZones(["x.md"], m).violations).toEqual([
      expect.stringContaining("mais de uma zona"),
    ]);
  });

  it("reprova a Zona B acima do teto e aceita no limite", () => {
    expect(checkZones(["AGENTS.md", "CONTRIBUTING.md"], mini).ok).toBe(true);
    const m = { ...mini, limits: { zoneB: 1 } };
    expect(checkZones(["AGENTS.md", "CONTRIBUTING.md"], m).violations).toEqual([
      expect.stringContaining("acima do teto"),
    ]);
  });

  it("padrão com /** casa só o prefixo", () => {
    expect(zonesOf("tools/a/b.ts", mini)).toEqual(["A"]);
    expect(zonesOf("toolsx/a.ts", mini)).toEqual([]);
  });
});

describe("fechamento por links", () => {
  it("normaliza destinos relativos ao arquivo e ignora URLs", () => {
    expect(
      localLinkTargets("docs/a.md", "[x](../tools/y.ts) [z](https://e.com/a) [w](./b.md#s)"),
    ).toEqual(["tools/y.ts", "docs/b.md"]);
  });

  it("reprova link novo para fora do produto", () => {
    const r = checkLinkClosure(
      mini,
      AG,
      reader({ "AGENTS.md": "[a](tools/x.ts) [b](docs/decisions/0001.md)" }),
    );
    expect(r.violations).toEqual([expect.stringContaining("AGENTS.md -> docs/decisions/0001.md")]);
  });

  it("aceita Zona B/C, contraparte gerada, a pasta docs/decisions e a exceção listada", () => {
    const body =
      "[a](tools/x.ts) [b](CONTRIBUTING.md) [c](docs/product/s.md) [d](STATE.md) [e](docs/decisions/)";
    const tracked = ["AGENTS.md", "CONTRIBUTING.md", "docs/product/s.md"];
    expect(checkLinkClosure(mini, tracked, reader({ "AGENTS.md": body })).ok).toBe(true);
  });

  it("reprova exceção obsoleta (a lista só encolhe)", () => {
    const r = checkLinkClosure(mini, AG, reader({ "AGENTS.md": "sem links" }));
    expect(r.violations).toEqual([expect.stringContaining("exceção obsoleta")]);
  });

  it("reprova exceção para arquivo fora da Zona B", () => {
    const m = { ...mini, linkClosureExceptions: { "tools/a.ts": ["x"] } };
    expect(checkLinkClosure(m, AG, reader({})).violations).toEqual([
      expect.stringContaining("fora da Zona B"),
    ]);
  });
});

describe("fechamento por links — 1ª rodada do Codex (#385)", () => {
  it("lê arquivos da Zona B vindos de padrão dir/**", () => {
    const m = { ...mini, zones: { ...mini.zones, B: { paths: ["AGENTS.md", "g/**"] } } };
    const r = checkLinkClosure(
      m,
      ["AGENTS.md", "g/a.md"],
      reader({ "AGENTS.md": "[a](tools/x.ts)", "g/a.md": "[x](../tools/y.ts)" }),
    );
    expect(r.violations).toEqual([expect.stringContaining("g/a.md -> tools/y.ts")]);
  });

  it("reprova exceção de arquivo da Zona B que não existe mais", () => {
    expect(checkLinkClosure(mini, [], reader({})).violations).toEqual([
      expect.stringContaining("o arquivo não existe"),
    ]);
  });

  it("não segue arquivo da Zona B que não é legível com segurança (symlink)", () => {
    expect(checkLinkClosure(mini, AG, () => null).violations).toEqual([
      expect.stringContaining("symlink"),
    ]);
  });
});

describe("fechamento por links — 2ª rodada do Codex (#385)", () => {
  it("reprova link para arquivo inexistente, mesmo sob padrão da Zona C", () => {
    const r = checkLinkClosure(
      mini,
      AG,
      reader({ "AGENTS.md": "[a](tools/x.ts) [f](docs/product/faltando.md)" }),
    );
    expect(r.violations).toEqual([expect.stringContaining("docs/product/faltando.md")]);
  });

  it("aceita link para arquivo rastreado da Zona C", () => {
    const r = checkLinkClosure(
      mini,
      ["AGENTS.md", "docs/product/spec.md"],
      reader({ "AGENTS.md": "[a](tools/x.ts) [s](docs/product/spec.md)" }),
    );
    expect(r.ok).toBe(true);
  });

  it("detecta exceção nova contra a base e aceita a lista que só encolheu", () => {
    expect(newExceptions({ ...mini, linkClosureExceptions: {} }, mini)).toEqual([
      "AGENTS.md -> tools/x.ts",
    ]);
    expect(newExceptions(mini, { ...mini, linkClosureExceptions: {} })).toEqual([]);
  });
});

describe("harness.json", () => {
  const valid = {
    version: "0.1.0",
    commit: "a".repeat(40),
    managed: { "AGENTS.md": "b".repeat(64) },
    extensions: ["AGENTS.product.md"],
  };
  const ajv = new Ajv().compile(SCHEMA);

  it("aceita um exemplo válido", () => {
    expect(validateHarnessJson(valid)).toEqual([]);
    expect(ajv(valid)).toBe(true);
  });

  it.each([
    ["sem version", { ...valid, version: undefined }],
    ["hash fora do formato", { ...valid, managed: { "AGENTS.md": "xyz" } }],
    ["commit fora do formato", { ...valid, commit: "v0.1.0" }],
    ["caminho com ..", { ...valid, managed: { "../x": "b".repeat(64) } }],
    ["campo desconhecido", { ...valid, extra: 1 }],
    ["barra invertida com ..", { ...valid, extensions: ["..\\fora"] }],
    ["alias com ./", { ...valid, extensions: ["./AGENTS.product.md"] }],
    ["barra dupla", { ...valid, managed: { "docs//x.md": "b".repeat(64) } }],
    ["versão com zero à esquerda", { ...valid, version: "01.2.3" }],
    ["caminho absoluto do Windows", { ...valid, managed: { "C:\\x": "b".repeat(64) } }],
  ])("reprova %s (manual e schema concordam)", (_nome, fx) => {
    const clean = JSON.parse(JSON.stringify(fx));
    expect(validateHarnessJson(clean).length).toBeGreaterThan(0);
    expect(ajv(clean)).toBe(false);
  });

  it("aceita extensão com nome de propriedade herdada (só chaves próprias contam)", () => {
    const fx = { ...valid, managed: {}, extensions: ["constructor"] };
    expect(validateHarnessJson(fx)).toEqual([]);
    expect(ajv(fx)).toBe(true);
  });

  it("reprova extensão que também é gerenciada (regra fora do alcance do schema)", () => {
    expect(validateHarnessJson({ ...valid, extensions: ["AGENTS.md"] })).toEqual([
      "extensão também gerenciada: AGENTS.md",
    ]);
  });
});
