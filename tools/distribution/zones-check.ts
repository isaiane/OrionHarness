#!/usr/bin/env node
// zones-check.ts — CHECK do manifesto de zonas e do schema do `.orion/harness.json` (O16.2b / Issue #364;
// ADR-0047 decisões 3, 4 e 5). O manifesto `tools/distribution/zones.json` é a ÚNICA lista concreta de
// zonas; este check o confronta com a árvore real e reprova:
//   Z1. arquivo rastreado SEM zona;
//   Z2. arquivo rastreado em MAIS DE UMA zona;
//   Z3. Zona B acima do teto (`limits.zoneB`);
//   Z4. link de arquivo da Zona B para fora do produto (nem Zona B, nem C, nem contraparte gerada de D,
//       nem a pasta `docs/decisions/`) que não esteja em `linkClosureExceptions`;
//   Z5. exceção de link que não corresponde mais a um link existente — a lista de exceções só encolhe.
// E valida a forma do `.orion/harness.json` (schema `harness.schema.json` + a regra que o JSON Schema
// não expressa: `extensions` sem interseção com `managed`).
//
// LIMITAÇÃO (impressa na saída): os links são extraídos por padrão (`](destino)`), não por parser
// CommonMark; o fechamento por links é rede para a dívida conhecida, não prova de que nenhum link
// escapa. A classificação de cada arquivo é revisada no PR que muda o manifesto (ADR-0047).
//
// Padrão do repo (ADR-0019/0023): funções PURAS exportadas p/ vitest; self-check que PROVA a mordida
// na mesma execução; exit ≠ 0 adequado a gate de CI.
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

export type ZoneName = "A" | "B" | "C" | "D";

export interface ZonesManifest {
  version: number;
  limits: { zoneB: number };
  zones: Record<ZoneName, { paths: string[]; generatedCounterpart?: string[] }>;
  linkClosureExceptions?: Record<string, string[] | string>;
}

const ZONES: ZoneName[] = ["A", "B", "C", "D"];

/** Um padrão casa o caminho exato ou, se termina em `/**`, tudo sob o prefixo. */
export function matchesPattern(path: string, pattern: string): boolean {
  return pattern.endsWith("/**") ? path.startsWith(pattern.slice(0, -2)) : path === pattern;
}

/** Zonas cujos padrões casam o caminho (o certo é exatamente uma). */
export function zonesOf(path: string, m: ZonesManifest): ZoneName[] {
  return ZONES.filter((z) => m.zones[z].paths.some((p) => matchesPattern(path, p)));
}

export interface ZoneCheckResult {
  ok: boolean;
  counts: Record<ZoneName, number>;
  violations: string[];
}

/** Z1–Z3: cada arquivo em exatamente uma zona; Zona B dentro do teto. */
export function checkZones(files: string[], m: ZonesManifest): ZoneCheckResult {
  const counts: Record<ZoneName, number> = { A: 0, B: 0, C: 0, D: 0 };
  const violations: string[] = [];
  for (const f of files) {
    const zs = zonesOf(f, m);
    if (zs.length === 0)
      violations.push(`sem zona: ${f} — classifique-o em tools/distribution/zones.json`);
    else if (zs.length > 1) violations.push(`em mais de uma zona (${zs.join(", ")}): ${f}`);
    else counts[zs[0]!]++;
  }
  if (counts.B > m.limits.zoneB)
    violations.push(
      `Zona B com ${counts.B} arquivos, acima do teto ${m.limits.zoneB} — reduza ou emende o ADR-0047 (G2)`,
    );
  return { ok: violations.length === 0, counts, violations };
}

const LINK = /\]\(\s*<?([^)\s>#]+)/g;
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/** Destinos locais (normalizados a partir da raiz) dos links markdown de um arquivo. */
export function localLinkTargets(file: string, content: string): string[] {
  const out = new Set<string>();
  for (const m of content.matchAll(LINK)) {
    const dest = (m[1] ?? "").split("?", 1)[0] ?? "";
    if (!dest || HAS_SCHEME.test(dest)) continue;
    const base = dest.startsWith("/") ? dest.slice(1) : posix.join(posix.dirname(file), dest);
    out.add(posix.normalize(base).replace(/\/+$/, ""));
  }
  return [...out];
}

/** O destino existe no produto: Zona B, Zona C, contraparte gerada de D ou a pasta `docs/decisions`. */
export function shippedToProduct(target: string, m: ZonesManifest): boolean {
  if (target === "docs/decisions") return true;
  if ((m.zones.D.generatedCounterpart ?? []).includes(target)) return true;
  const zs = zonesOf(target, m);
  return zs.length === 1 && (zs[0] === "B" || zs[0] === "C");
}

const exceptionList = (m: ZonesManifest, file: string): string[] => {
  const v = m.linkClosureExceptions?.[file];
  return Array.isArray(v) ? v : [];
};

/** Conteúdo de um arquivo: texto, ausente (`undefined`) ou não legível com segurança (`null` —
 *  symlink ou caminho que sai do repo: não é seguido). */
export type SafeRead = (path: string) => string | null | undefined;

/** Z4–Z5: links da Zona B para fora do produto (salvo exceção) e exceções obsoletas. Os arquivos da Zona
 *  B vêm dos arquivos RASTREADOS que caem nela (cobre padrões `dir/**`) mais as entradas exatas do
 *  manifesto (cobre arquivo apagado que ainda tem exceção). */
export function checkLinkClosure(
  m: ZonesManifest,
  files: string[],
  read: SafeRead,
): { ok: boolean; outside: number; excepted: number; violations: string[] } {
  const violations: string[] = [];
  let outside = 0;
  let excepted = 0;
  const tracked = new Set(files);
  const bFiles = new Set<string>([
    ...files.filter((f) => zonesOf(f, m).join() === "B"),
    ...m.zones.B.paths.filter((p) => !p.endsWith("/**")),
  ]);
  for (const f of bFiles) {
    const exc = exceptionList(m, f);
    if (!tracked.has(f)) {
      for (const e of exc)
        violations.push(`exceção obsoleta: ${f} -> ${e} — o arquivo não existe; remova a exceção`);
      continue;
    }
    const content = read(f);
    if (content === null) {
      violations.push(
        `arquivo da Zona B não legível com segurança (symlink ou fora do repo): ${f}`,
      );
      continue;
    }
    if (content === undefined) continue;
    const excSet = new Set(exc);
    const targets = localLinkTargets(f, content).filter((t) => !shippedToProduct(t, m));
    outside += targets.length;
    for (const t of targets) {
      if (excSet.has(t)) excepted++;
      else
        violations.push(
          `link para fora do produto: ${f} -> ${t} — aponte para arquivo que vai ao produto (ADR-0047)`,
        );
    }
    for (const e of excSet)
      if (!targets.includes(e))
        violations.push(`exceção obsoleta: ${f} -> ${e} — remova-a de linkClosureExceptions`);
  }
  for (const f of Object.keys(m.linkClosureExceptions ?? {}))
    if (!f.startsWith("$") && !bFiles.has(f))
      violations.push(`exceção para arquivo fora da Zona B: ${f}`);
  return { ok: violations.length === 0, outside, excepted, violations };
}

const SEMVER = /^\d+\.\d+\.\d+$/;
const SHA1 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
// Caminho relativo seguro: sem `/` inicial, sem segmento `..`, sem `\` (traversal no Windows) e sem
// letra de unidade (`C:`) — Codex #385.
const SAFE_PATH = /^(?![\/\\])(?![A-Za-z]:)(?!.*\\)(?!.*(^|\/)\.\.(\/|$)).+$/;

/** Forma do `.orion/harness.json`: o schema + `extensions` sem interseção com `managed`. */
export function validateHarnessJson(x: unknown): string[] {
  const errs: string[] = [];
  if (typeof x !== "object" || x === null || Array.isArray(x)) return ["não é um objeto"];
  const o = x as Record<string, unknown>;
  const allowed = new Set(["version", "commit", "managed", "extensions"]);
  for (const k of Object.keys(o)) if (!allowed.has(k)) errs.push(`campo desconhecido: ${k}`);
  if (typeof o.version !== "string" || !SEMVER.test(o.version))
    errs.push("version ausente ou fora de X.Y.Z");
  if (typeof o.commit !== "string" || !SHA1.test(o.commit))
    errs.push("commit ausente ou fora do formato SHA");
  const managed = o.managed;
  if (typeof managed !== "object" || managed === null || Array.isArray(managed))
    errs.push("managed ausente");
  else
    for (const [p, h] of Object.entries(managed as Record<string, unknown>)) {
      if (!SAFE_PATH.test(p)) errs.push(`managed: caminho inválido ${p}`);
      if (typeof h !== "string" || !SHA256.test(h))
        errs.push(`managed: hash fora do formato em ${p}`);
    }
  const ext = o.extensions;
  if (!Array.isArray(ext)) errs.push("extensions ausente");
  else {
    if (new Set(ext).size !== ext.length) errs.push("extensions com item repetido");
    for (const e of ext) {
      if (typeof e !== "string" || !SAFE_PATH.test(e))
        errs.push(`extensions: caminho inválido ${String(e)}`);
      else if (managed && typeof managed === "object" && Object.hasOwn(managed, e))
        errs.push(`extensão também gerenciada: ${e}`);
    }
  }
  return errs;
}

// ────────────────────────────────────────────────────────────────────────────────────────────────────
// Self-check: (1) a árvore REAL passa (zonas, teto, links); (2) cada regra MORDE, pela função agregada,
// e o exemplo válido de `harness.json` passa. Exit ≠ 0 se o real falhar OU alguma mordida falhar.
if (process.argv[1]?.endsWith("zones-check.ts")) {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const m = JSON.parse(
    readFileSync(join(root, "tools/distribution/zones.json"), "utf-8"),
  ) as ZonesManifest;
  // `-z`: nomes crus, sem as aspas/escapes do `core.quotePath` (acentos) — Codex #385.
  const files = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf-8" })
    .split("\0")
    .filter(Boolean);
  // Não segue symlink nem lê fora do repo (Codex #385): devolve `null` nesses casos.
  const read: SafeRead = (p) => {
    const abs = join(root, p);
    if (!existsSync(abs)) return undefined;
    if (lstatSync(abs).isSymbolicLink() || !realpathSync(abs).startsWith(realpathSync(root)))
      return null;
    return readFileSync(abs, "utf-8");
  };

  const zones = checkZones(files, m);
  const links = checkLinkClosure(m, files, read);
  console.log(
    JSON.stringify({
      caso: "árvore REAL",
      ok: zones.ok && links.ok,
      ...zones.counts,
      tetoB: m.limits.zoneB,
      linksForaDoProduto: links.outside,
      excecoes: links.excepted,
      violations: [...zones.violations, ...links.violations],
    }),
  );

  const mini: ZonesManifest = {
    version: 1,
    limits: { zoneB: 1 },
    zones: {
      A: { paths: ["tools/**"] },
      B: { paths: ["AGENTS.md"] },
      C: { paths: ["docs/product/**"] },
      D: { paths: ["docs/decisions/**", "STATE.md"], generatedCounterpart: ["STATE.md"] },
    },
    linkClosureExceptions: { "AGENTS.md": ["tools/x.ts"] },
  };
  const docs =
    (body: string): SafeRead =>
    (p) =>
      p === "AGENTS.md" ? body : undefined;
  const ag = ["AGENTS.md"];
  const valid = {
    version: "0.1.0",
    commit: "a".repeat(40),
    managed: { "AGENTS.md": "b".repeat(64) },
    extensions: ["AGENTS.product.md"],
  };
  const bites = {
    semZona: !checkZones(["README.md"], mini).ok,
    duasZonas: !checkZones(["x"], {
      ...mini,
      zones: { ...mini.zones, C: { paths: ["x"] }, D: { paths: ["x"] } },
    }).ok,
    tetoB: !checkZones(["AGENTS.md", "CLAUDE.md"], {
      ...mini,
      zones: { ...mini.zones, B: { paths: ["AGENTS.md", "CLAUDE.md"] } },
    }).ok,
    linkNovo: !checkLinkClosure(mini, ag, docs("[a](tools/x.ts) [b](docs/decisions/0001-x.md)")).ok,
    excecaoObsoleta: !checkLinkClosure(mini, ag, docs("sem links")).ok,
    // 1ª rodada do Codex (#385): padrão `dir/**` na Zona B, arquivo apagado com exceção, symlink.
    linkEmPrefixoB: !checkLinkClosure(
      { ...mini, zones: { ...mini.zones, B: { paths: ["AGENTS.md", "g/**"] } } },
      ["AGENTS.md", "g/a.md"],
      (p) => (p === "g/a.md" ? "[x](../tools/y.ts)" : "[a](tools/x.ts)"),
    ).ok,
    excecaoDeArquivoApagado: !checkLinkClosure(mini, [], docs("")).ok,
    symlinkNaZonaB: !checkLinkClosure(mini, ag, () => null).ok,
    harnessBarraInvertida: validateHarnessJson({ ...valid, extensions: ["..\\fora"] }).length > 0,
    harnessSemVersion: validateHarnessJson({ ...valid, version: undefined }).length > 0,
    harnessHashRuim: validateHarnessJson({ ...valid, managed: { "AGENTS.md": "xyz" } }).length > 0,
    harnessExtensaoGerenciada:
      validateHarnessJson({ ...valid, extensions: ["AGENTS.md"] }).length > 0,
  };
  const accepts = {
    linkPermitido: checkLinkClosure(
      mini,
      ag,
      docs("[a](tools/x.ts) [s](STATE.md) [d](docs/decisions/)"),
    ).ok,
    extensaoComNomeDePrototipo:
      validateHarnessJson({ ...valid, managed: {}, extensions: ["constructor"] }).length === 0,
    harnessValido: validateHarnessJson(valid).length === 0,
  };
  console.log(JSON.stringify({ caso: "mordida", ...bites }));
  console.log(JSON.stringify({ caso: "aceite", ...accepts }));
  console.log(
    "LIMITAÇÃO: links extraídos por padrão, não por parser CommonMark; a classificação de cada arquivo é revisada no PR do manifesto (ADR-0047).",
  );
  const allBite = Object.values(bites).every(Boolean);
  const allAccept = Object.values(accepts).every(Boolean);
  if (!zones.ok || !links.ok || !allBite || !allAccept) process.exit(1);
}
