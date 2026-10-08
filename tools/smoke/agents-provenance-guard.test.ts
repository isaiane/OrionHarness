// Testes do agents-provenance-guard (O16.1c / Issue #358; ADR-0046 ponto 5). Provam que o guard ACEITA o
// `AGENTS.md` real e as formas permitidas e MORDE cada forma proibida (verde ≠ correto, §8.1): um guard sem
// caso FAIL provado não entra.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkAgentsProvenance } from "./agents-provenance-guard.ts";

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

  it("conta ORION-NNNN em itálico", () => {
    expect(checkAgentsProvenance("no _ORION-0046_ e no ORION-0017").metrics.orionMentions).toBe(2);
  });
});
