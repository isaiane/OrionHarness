#!/usr/bin/env node
// agents-provenance-guard.ts — GUARD DE FORMA da constituição autossuficiente (O16.1c / Issue #358;
// ADR-0046 ponto 5). O `AGENTS.md` enuncia toda regra que cita por extenso; ADR do Orion aparece só como
// proveniência `ORION-NNNN`, SEM link. Este guard impede a volta da delegação por forma: reprova no
// `AGENTS.md`
//   G1. link markdown RELATIVO para `docs/decisions/` (`](docs/decisions/…)`, `](./docs/decisions/…)` ou
//       definição de referência `[x]: docs/decisions/…`);
//   G2. link/URL ABSOLUTA para um ADR (`https://…/docs/decisions/…`);
//   G3. ocorrência `ADR-NNNN` (citação no formato antigo).
// ACEITA `ORION-NNNN` e a menção à PASTA `docs/decisions/` sem link — no produto, ela aponta para os ADRs
// do próprio produto (ADR-0046 ponto 3).
//
// LIMITAÇÃO (impressa na saída): é checagem de FORMA. Uma delegação escrita sem citar ADR ("conforme
// decidido") passa; a semântica continua com o revisor humano (§8.1). Vale só para o `AGENTS.md` (ADR-0046
// ponto 5); `AGENTS.core.md`/`CLAUDE.md` e a Zona B são da tarefa 3 do O16 (#365).
//
// Padrão do repo (ADR-0019/0023, `state-budget-check.ts`): funções PURAS exportadas p/ vitest, self-check
// que PROVA a mordida na mesma execução, exit ≠ 0 adequado a gate de CI.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

export interface ProvenanceMetrics {
  relativeLinks: number;
  absoluteLinks: number;
  adrMentions: number;
  orionMentions: number;
}

export interface ProvenanceResult {
  ok: boolean;
  metrics: ProvenanceMetrics;
  violations: string[];
}

const RELATIVE_INLINE = /\]\(\s*(?:\.\/)?docs\/decisions\//g;
const RELATIVE_REFDEF = /^\s*\[[^\]]+\]:\s*(?:\.\/)?docs\/decisions\//;
const ABSOLUTE = /https?:\/\/[^\s)>\]]*\/docs\/decisions\//g;
const ADR = /\bADR-\d{4}\b/g;
const ORION = /\bORION-\d{4}\b/g;

const count = (re: RegExp, s: string): number => (s.match(re) ?? []).length;

/** Varre o conteúdo do `AGENTS.md` e devolve as violações de forma, com o número da linha. */
export function checkAgentsProvenance(content: string): ProvenanceResult {
  const metrics: ProvenanceMetrics = {
    relativeLinks: 0,
    absoluteLinks: 0,
    adrMentions: 0,
    orionMentions: 0,
  };
  const violations: string[] = [];
  content.split("\n").forEach((line, i) => {
    const n = i + 1;
    const rel = count(RELATIVE_INLINE, line) + (RELATIVE_REFDEF.test(line) ? 1 : 0);
    const abs = count(ABSOLUTE, line);
    const adr = count(ADR, line);
    metrics.relativeLinks += rel;
    metrics.absoluteLinks += abs;
    metrics.adrMentions += adr;
    metrics.orionMentions += count(ORION, line);
    if (rel > 0)
      violations.push(
        `linha ${n}: link relativo para docs/decisions/ — cite o ADR do Orion como ORION-NNNN, sem link`,
      );
    if (abs > 0)
      violations.push(
        `linha ${n}: link absoluto para ADR — proveniência é ORION-NNNN, sem link (ADR-0046 ponto 2)`,
      );
    if (adr > 0)
      violations.push(
        `linha ${n}: menção ADR-NNNN — use ORION-NNNN e traga a regra por extenso se ela for delegada`,
      );
  });
  return { ok: violations.length === 0, metrics, violations };
}

// ────────────────────────────────────────────────────────────────────────────────────────────────────
// Self-check: (1) o `AGENTS.md` REAL passa (nasce verde); (2) cada forma proibida MORDE e cada forma
// permitida PASSA, pela função agregada. Exit ≠ 0 se o real falhar OU alguma mordida/aceite falhar.
if (process.argv[1]?.endsWith("agents-provenance-guard.ts")) {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const real = checkAgentsProvenance(readFileSync(join(root, "AGENTS.md"), "utf-8"));
  console.log(
    JSON.stringify({
      caso: "AGENTS.md REAL",
      ok: real.ok,
      ...real.metrics,
      violations: real.violations,
    }),
  );

  const bites = {
    relativo: !checkAgentsProvenance("ver [ADR](docs/decisions/0017-x.md)").ok,
    relativoPonto: !checkAgentsProvenance("ver [x](./docs/decisions/0017-x.md)").ok,
    referencia: !checkAgentsProvenance("[x]: docs/decisions/0017-x.md").ok,
    absoluto: !checkAgentsProvenance(
      "ver [x](https://github.com/o/r/blob/main/docs/decisions/0017-x.md)",
    ).ok,
    mencaoAdr: !checkAgentsProvenance("decidido no ADR-0017.").ok,
  };
  const accepts = {
    orion: checkAgentsProvenance("decidido no ORION-0017 (§11.2).").ok,
    pastaSemLink: checkAgentsProvenance("registre um **ADR** em `docs/decisions/`.").ok,
  };
  console.log(JSON.stringify({ caso: "mordida", ...bites }));
  console.log(JSON.stringify({ caso: "aceite", ...accepts }));
  console.log(
    "LIMITAÇÃO: checagem de FORMA — delegação escrita sem citar ADR passa; a semântica é do revisor (§8.1).",
  );
  const allBite = Object.values(bites).every(Boolean);
  const allAccept = Object.values(accepts).every(Boolean);
  if (!real.ok || !allBite || !allAccept) process.exit(1);
}
