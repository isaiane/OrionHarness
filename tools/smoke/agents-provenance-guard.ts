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
// decidido") passa; a semântica continua com o revisor humano (§8.1). Cobre as formas usuais de link
// markdown e URL (inclusive destino na linha seguinte e caminho com `..`), mas NÃO é um parser CommonMark:
// uma forma exótica que escape vira ressalva, não um novo ciclo de padrões. Vale só para o `AGENTS.md` (ADR-0046
// ponto 5); `AGENTS.core.md`/`CLAUDE.md` e a Zona B são da tarefa 3 do O16 (#365).
//
// Padrão do repo (ADR-0019/0023, `state-budget-check.ts`): funções PURAS exportadas p/ vitest, self-check
// que PROVA a mordida na mesma execução, exit ≠ 0 adequado a gate de CI.
import { readFileSync } from "node:fs";
import { join, posix } from "node:path";
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

// Os padrões varrem o DOCUMENTO inteiro (não linha a linha): o destino de um link pode começar na linha
// seguinte ao `](` ou ao `[x]:` (Codex #375). A violação é reportada na linha onde o link abre.
// Destinos de link markdown: inline `](destino)` (com ou sem `<…>`) e definição de referência `[x]: destino`.
const INLINE_DEST = /\]\(\s*(?:<([^>\n]*)>|([^\s)]+))/g;
const REFDEF_DEST = /^ {0,3}\[[^\]\n]+\]:[ \t]*\n?[ \t]*(?:<([^>\n]*)>|(\S+))/gm;
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
// Candidatos a URL absoluta; cada um é lido com `new URL()`, que normaliza `..` e `%2e` no caminho
// (Codex #375). Host entre colchetes (IPv6) cabe no candidato.
const URL_CANDIDATE = /[a-z][a-z0-9+.-]*:\/\/[^\s<>"]+/gi;
// Fronteira por letra/dígito ASCII, não `\b`: `_` é caractere de palavra e `_ADR-0046_` escaparia (Codex #375).
const ADR = /(?<![A-Za-z0-9])ADR-\d{4}(?![0-9])/g;
const ORION = /(?<![A-Za-z0-9])ORION-\d{4}(?![0-9])/g;

/** Destino relativo que, normalizado, cai em `docs/decisions/` (`././`, `x/../`, `/` inicial…). */
export function isRelativeDecisionDest(dest: string): boolean {
  if (HAS_SCHEME.test(dest)) return false;
  const path = dest.split(/[?#]/, 1)[0] ?? "";
  const norm = posix.normalize(path).replace(/^\/+/, "");
  return norm === "docs/decisions" || norm.startsWith("docs/decisions/");
}

/** URL absoluta cujo caminho, normalizado pelo parser de URL, passa por `/docs/decisions/`. */
export function isAbsoluteDecisionUrl(candidate: string): boolean {
  const literal = /\/docs\/decisions(\/|$)/;
  try {
    return literal.test(new URL(candidate).pathname);
  } catch {
    return literal.test(candidate); // não parseável: cai no teste literal (conservador)
  }
}

/** Número da linha (1-based) de uma posição no texto. */
const lineAt = (content: string, index: number): number =>
  content.slice(0, index).split("\n").length;

/** Varre o conteúdo do `AGENTS.md` e devolve as violações de forma, com o número da linha. */
export function checkAgentsProvenance(content: string): ProvenanceResult {
  const found: { line: number; msg: string }[] = [];
  const add = (index: number, msg: string): void => {
    const line = lineAt(content, index);
    found.push({ line, msg: `linha ${line}: ${msg}` });
  };

  let relativeLinks = 0;
  for (const re of [INLINE_DEST, REFDEF_DEST])
    for (const m of content.matchAll(re))
      if (isRelativeDecisionDest(m[1] ?? m[2] ?? "")) {
        relativeLinks++;
        add(
          m.index ?? 0,
          "link relativo para docs/decisions/ — cite o ADR do Orion como ORION-NNNN, sem link",
        );
      }

  let absoluteLinks = 0;
  for (const m of content.matchAll(URL_CANDIDATE))
    if (isAbsoluteDecisionUrl(m[0])) {
      absoluteLinks++;
      add(
        m.index ?? 0,
        "link absoluto para ADR — proveniência é ORION-NNNN, sem link (ADR-0046 ponto 2)",
      );
    }

  const adrMatches = [...content.matchAll(ADR)];
  for (const m of adrMatches)
    add(
      m.index ?? 0,
      "menção ADR-NNNN — use ORION-NNNN e traga a regra por extenso se ela for delegada",
    );

  // Uma violação por (linha, tipo), em ordem de linha.
  const violations = [...new Set(found.sort((a, b) => a.line - b.line).map((f) => f.msg))];
  const metrics: ProvenanceMetrics = {
    relativeLinks,
    absoluteLinks,
    adrMentions: adrMatches.length,
    orionMentions: [...content.matchAll(ORION)].length,
  };
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
    // Formas da 1ª rodada do Codex (#375): caminho não normalizado, IPv6 entre colchetes, itálico.
    relativoNaoNormalizado: !checkAgentsProvenance("ver [x](././docs/decisions/0017-x.md)").ok,
    referenciaNaoNormalizada: !checkAgentsProvenance("[x]: ./x/../docs/decisions/0017-x.md").ok,
    absolutoIpv6: !checkAgentsProvenance("ver [x](https://[2001:db8::1]/docs/decisions/0046.md)")
      .ok,
    mencaoItalico: !checkAgentsProvenance("decidido no _ADR-0046_.").ok,
    // 2ª rodada do Codex (#375): destino na linha seguinte e URL absoluta com `..`/`%2e` no caminho.
    relativoMultilinha: !checkAgentsProvenance("ver [x](\n  docs/decisions/0046.md)").ok,
    referenciaMultilinha: !checkAgentsProvenance("[x]:\n  docs/decisions/0046.md").ok,
    absolutoPontoPonto: !checkAgentsProvenance("ver [x](https://e.com/docs/x/../decisions/0046.md)")
      .ok,
    absolutoPontoCodificado: !checkAgentsProvenance(
      "ver https://e.com/docs/x/%2e%2e/decisions/0046.md",
    ).ok,
  };
  const accepts = {
    orion: checkAgentsProvenance("decidido no ORION-0017 (§11.2).").ok,
    pastaSemLink: checkAgentsProvenance("registre um **ADR** em `docs/decisions/`.").ok,
    outroLinkRelativo: checkAgentsProvenance("ver [x](docs/runbooks/branch-protection.md)").ok,
  };
  console.log(JSON.stringify({ caso: "mordida", ...bites }));
  console.log(JSON.stringify({ caso: "aceite", ...accepts }));
  console.log(
    "LIMITAÇÃO: checagem de FORMA — delegação escrita sem citar ADR passa; a semântica é do revisor (§8.1). " +
      "Cobre as formas usuais de link/URL, mas não é um parser CommonMark.",
  );
  const allBite = Object.values(bites).every(Boolean);
  const allAccept = Object.values(accepts).every(Boolean);
  if (!real.ok || !allBite || !allAccept) process.exit(1);
}
