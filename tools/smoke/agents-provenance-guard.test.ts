// Testes do agents-provenance-guard (O16.1c / Issue #358; ADR-0046 ponto 5). Provam que o guard ACEITA o
// `AGENTS.md` real e as formas permitidas e MORDE cada forma proibida (verde ≠ correto, §8.1): um guard sem
// caso FAIL provado não entra.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  type ZonesManifest,
  makeSafeReader,
  trackedFiles,
  zonesOf,
} from "../distribution/zones-check.ts";
import { checkAgentsProvenance, checkZoneBProvenance } from "./agents-provenance-guard.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const REAL = readFileSync(join(ROOT, "AGENTS.md"), "utf-8");

describe("agents-provenance-guard", () => {
  it("aceita o AGENTS.md real, sem link nem menção ADR-NNNN", () => {
    const r = checkAgentsProvenance(REAL);
    expect(r.violations).toEqual([]);
    expect(r.metrics.relativeLinks).toBe(0);
    expect(r.metrics.absoluteLinks).toBe(0);
    expect(r.metrics.adrMentions).toBe(0);
    expect(r.metrics.orionMentions).toBeGreaterThan(0);
  });

  it.each([
    ["link relativo", "ver [ADR-x](docs/decisions/0017-fast-lane.md)", "link relativo"],
    ["link relativo com ./", "ver [x](./docs/decisions/0017-fast-lane.md)", "link relativo"],
    ["definição de referência", "[x]: docs/decisions/0017-fast-lane.md", "link relativo"],
    [
      "link absoluto",
      "ver [x](https://github.com/o/r/blob/main/docs/decisions/0017-fast-lane.md)",
      "link absoluto",
    ],
    [
      "URL absoluta solta",
      "ver https://github.com/o/r/blob/main/docs/decisions/0017.md",
      "link absoluto",
    ],
    ["menção ADR-NNNN", "decidido no ADR-0017.", "menção ADR-NNNN"],
    // 1ª rodada do Codex (#375): formas que os padrões literais deixavam passar.
    ["link relativo não normalizado", "ver [x](././docs/decisions/0046.md)", "link relativo"],
    ["link relativo com ..", "ver [x](x/../docs/decisions/0046.md)", "link relativo"],
    ["link relativo à raiz", "ver [x](/docs/decisions/0046.md)", "link relativo"],
    ["link relativo entre <>", "ver [x](<./docs/decisions/0046.md>)", "link relativo"],
    ["referência não normalizada", "[x]: ././docs/decisions/0046.md", "link relativo"],
    ["URL com host IPv6", "ver [x](https://[2001:db8::1]/docs/decisions/0046.md)", "link absoluto"],
    ["esquema em maiúsculas", "ver HTTPS://example.com/docs/decisions/0046.md", "link absoluto"],
    ["menção em itálico", "decidido no _ADR-0046_.", "menção ADR-NNNN"],
    // 2ª rodada do Codex (#375): destino na linha seguinte e URL absoluta não normalizada.
    ["link com destino na linha seguinte", "ver [x](\n  docs/decisions/0046.md)", "link relativo"],
    ["referência com destino na linha seguinte", "[x]:\n  docs/decisions/0046.md", "link relativo"],
    ["URL absoluta com ..", "ver [x](https://e.com/docs/x/../decisions/0046.md)", "link absoluto"],
    [
      "URL absoluta com %2e%2e",
      "ver https://e.com/docs/x/%2e%2e/decisions/0046.md",
      "link absoluto",
    ],
  ])("reprova %s", (_nome, content, motivo) => {
    const r = checkAgentsProvenance(content);
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.includes(motivo))).toBe(true);
  });

  it("informa a linha da violação", () => {
    const r = checkAgentsProvenance("linha ok\nno ADR-0008 aqui");
    expect(r.violations).toEqual([expect.stringContaining("linha 2:")]);
  });

  it.each([
    ["proveniência ORION-NNNN", "decidido no ORION-0017 (§11.2)."],
    ["pasta docs/decisions/ sem link", "registre um **ADR** em `docs/decisions/` e aguarde."],
    ["placeholder sem dígitos", "proveniência `ORION-NNNN` e `ADR-NNNN` de template"],
    ["outro link relativo", "ver [x](docs/runbooks/branch-protection.md)"],
    ["link para outro dir com prefixo parecido", "ver [x](docs/decisions-old/x.md)"],
  ])("aceita %s", (_nome, content) => {
    expect(checkAgentsProvenance(content).ok).toBe(true);
  });

  it("reporta a linha onde o link abre quando o destino vem na linha seguinte", () => {
    const r = checkAgentsProvenance("intro\nver [x](\n  docs/decisions/0046.md)");
    expect(r.violations).toEqual([expect.stringContaining("linha 2:")]);
  });

  it("aceita URL absoluta para outra pasta", () => {
    expect(checkAgentsProvenance("ver https://e.com/docs/runbooks/x.md").ok).toBe(true);
  });

  it("conta ORION-NNNN em itálico", () => {
    expect(checkAgentsProvenance("no _ORION-0046_ e no ORION-0017").metrics.orionMentions).toBe(2);
  });
});

describe("Zona B inteira (#365)", () => {
  const manifest = JSON.parse(
    readFileSync(join(ROOT, "tools/distribution/zones.json"), "utf-8"),
  ) as ZonesManifest;
  const files = trackedFiles(ROOT);
  const zoneB = files.filter((f) => zonesOf(f, manifest).join() === "B");

  it("aceita a Zona B real: nenhuma menção ADR-NNNN nem link para ADR", () => {
    const r = checkZoneBProvenance(zoneB, makeSafeReader(ROOT));
    expect(r.violations).toEqual([]);
    expect(r.files).toBe(zoneB.length);
  });

  it("reprova arquivo da Zona B com menção ADR-NNNN, citando o arquivo e a linha", () => {
    const r = checkZoneBProvenance(["docs/a.md"], () => "ok\nno ADR-0008");
    expect(r.violations).toEqual([expect.stringMatching(/^docs\/a\.md: linha 2: menção ADR-NNNN/)]);
  });

  it("reprova arquivo da Zona B com link absoluto para ADR do repositório central", () => {
    const body =
      "ver [x](https://github.com/isaiane/OrionHarness/blob/main/docs/decisions/0017-x.md)";
    const r = checkZoneBProvenance([".github/workflows/x.yml"], () => body);
    expect(r.violations).toEqual([expect.stringContaining("link absoluto para ADR")]);
  });

  it("não olha arquivo fora da Zona B (ex.: docs/getting-started.md, Zona D, ainda cita ADRs)", () => {
    expect(zoneB).not.toContain("docs/getting-started.md");
    expect(files).toContain("docs/getting-started.md");
    const r = checkZoneBProvenance(zoneB, makeSafeReader(ROOT));
    expect(r.violations.some((v) => v.startsWith("docs/getting-started.md"))).toBe(false);
  });

  it("não segue arquivo da Zona B que não é legível com segurança", () => {
    expect(checkZoneBProvenance(["AGENTS.md"], () => null).violations).toEqual([
      expect.stringContaining("não legível com segurança"),
    ]);
  });
});

describe("links relativos ao diretório e pasta de ADRs (#365)", () => {
  it("resolve o link a partir do diretório do arquivo", () => {
    expect(checkAgentsProvenance("ver [x](decisions/0017-x.md)", "docs/a.md").ok).toBe(false);
    expect(checkAgentsProvenance("ver [x](../decisions/0017-x.md)", "docs/arch/a.md").ok).toBe(
      false,
    );
  });

  it("aceita link para a pasta docs/decisions/ (ADRs do próprio produto)", () => {
    expect(checkAgentsProvenance("[ADRs](docs/decisions/)").ok).toBe(true);
    expect(checkAgentsProvenance("[ADRs](../decisions/)", "docs/arch/a.md").ok).toBe(true);
  });
});

describe("citação composta (#391)", () => {
  it("reprova parte sem o prefixo ORION-", () => {
    const r = checkAgentsProvenance("(ORION-0006/ORION-0026/0033)");
    expect(r.violations).toEqual([expect.stringContaining("citação composta")]);
    expect(checkAgentsProvenance("ORION-0024/0025").ok).toBe(false);
  });

  it("aceita cada parte com o prefixo", () => {
    expect(checkAgentsProvenance("(ORION-0006/ORION-0026/ORION-0033)").ok).toBe(true);
  });
});

describe("URL absoluta dentro de link Markdown (#392)", () => {
  it("reprova link para a pasta de ADRs do central sem barra final", () => {
    const r = checkAgentsProvenance(
      "[ADRs](https://github.com/isaiane/OrionHarness/tree/main/docs/decisions)",
    );
    expect(r.violations).toEqual([expect.stringContaining("link absoluto para ADR")]);
  });

  it("aceita URL absoluta para outra pasta dentro de link Markdown", () => {
    expect(checkAgentsProvenance("[x](https://e.com/docs/runbooks)").ok).toBe(true);
  });
});
