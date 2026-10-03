// cross-model-check.ts — enforcer cross-model do PR (ADR-0041, #327 fatia b1). Lógica PURA + CLI.
//
// Princípio (ADR-0041): PR que altera CÓDIGO DE PRODUTO precisa de ao menos um commit de TESTE DE ACEITE
// marcado (`Model-Authored-By`, ADR-0039/0040) por um modelo DIFERENTE do que marcou a implementação, e esse
// teste segue presente e SEM ALTERAÇÃO no estado final do PR. Harness: a mesma regra só com o rótulo
// `cross-model`. Isentos: rotas fora do pipeline de contrato (ADR-0030 §9) — branch `fast/…` ou o rótulo
// `cross-model:isento`. TDD do implementador e commits humanos (sem marca) são permitidos e não contam como
// prova. Valor de marca fora da lista fechada ⇒ inválido. Na dúvida, EXIGE (fail-closed). Nunca integra.
//
// Uso (o workflow monta o JSON a partir da API do GitHub):
//   node --experimental-strip-types tools/crossmodel/cross-model-check.ts < pr.json
//   → exit 0 (ok) | 1 (bloqueia; motivos no stderr) | 2 (entrada inválida)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import process from "node:process";

/** Lista fechada de modelos (ADR-0039 ponto 1). Ampliar = emenda do ADR-0039 (G2). */
export const MODELS = ["claude", "codex", "gpt"] as const;

/** Rótulos (ADR-0041): liga a regra num PR de harness; marca uma rota isenta fora da fast-lane. */
export const LABEL_REQUIRE = "cross-model";
export const LABEL_EXEMPT = "cross-model:isento";

/**
 * Caminhos de HARNESS (ADR-0041 ponto 4). Qualquer outro caminho é PRODUTO. `docs/product/` é produto.
 * Mudar esta lista é emenda do ADR-0041 (G2), não um PR comum.
 */
const HARNESS_FILES = new Set([
  "AGENTS.md",
  "AGENTS.core.md",
  "CLAUDE.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "README.md",
  "CHANGELOG.md",
  "STATE.md",
  "PLAN.md",
  "MEMORY.md",
  "CODEOWNERS",
  "LICENSE",
  "feature-ledger.json",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "eslint.config.mjs",
  "commitlint.config.js",
  "vitest.config.ts",
  "init.sh",
  ".editorconfig",
  ".env.example",
  ".gitignore",
  ".gitleaksignore",
  ".nvmrc",
  ".pre-commit-config.yaml",
  ".prettierignore",
  ".prettierrc.json",
]);
const HARNESS_DIRS = [
  "docs/",
  "tools/",
  "scripts/",
  "skills/",
  "presets/",
  "templates/",
  ".github/",
  ".orion/",
  ".claude/",
];

export function isHarness(path: string): boolean {
  if (path.startsWith("docs/product/")) return false;
  return HARNESS_FILES.has(path) || HARNESS_DIRS.some((d) => path.startsWith(d));
}

const TEST_FILE = /(^|\/)(tests?|__tests__)\/|\.(test|spec)\.[^/]+$/;
const FIXTURE = /(^|\/)(__)?(fixtures|mocks)(__)?\//;

/** Arquivo de teste executável (`*.test.*`, `*.spec.*`, ou sob `tests/`/`test/`/`__tests__/`), não fixture/mock. */
export function isTestFile(path: string): boolean {
  return TEST_FILE.test(path) && !FIXTURE.test(path);
}
/** Arquivo de apoio a teste (fixture/mock) — acompanha testes, mas sozinho não é teste de aceite. */
export function isFixture(path: string): boolean {
  return FIXTURE.test(path);
}
/** Código: não é teste, nem fixture, nem documento de produto. */
function isCode(path: string): boolean {
  return !isTestFile(path) && !isFixture(path) && !path.startsWith("docs/product/");
}

export type Marker =
  | { kind: "none" }
  | { kind: "valid"; model: string }
  | { kind: "invalid"; reason: string };

/** Lê `Model-Authored-By` da mensagem do commit: nenhuma, exatamente uma válida, ou inválida. */
export function parseMarker(message: string): Marker {
  const found = [...message.matchAll(/^Model-Authored-By:[ \t]*(.*?)[ \t]*$/gim)].map(
    (m) => m[1] ?? "",
  );
  if (found.length === 0) return { kind: "none" };
  if (found.length > 1)
    return { kind: "invalid", reason: `${found.length} marcas Model-Authored-By (máximo 1)` };
  const v = found[0]!;
  return (MODELS as readonly string[]).includes(v)
    ? { kind: "valid", model: v }
    : { kind: "invalid", reason: `valor "${v}" fora da lista fechada (${MODELS.join(", ")})` };
}

export interface CommitInfo {
  sha: string;
  message: string;
  /** Arquivos que o commit tocou, com o blob resultante (`null` = removido). */
  files: { path: string; blob: string | null }[];
}
export interface PrInfo {
  headRef: string;
  labels: string[];
  /** Arquivos alterados pelo PR (diff final contra a base). */
  changedFiles: string[];
  /** Blob de cada arquivo no head do PR (estado final); ausente = não existe no head. */
  headBlobs: Record<string, string>;
  commits: CommitInfo[];
}
export interface Verdict {
  ok: boolean;
  required: boolean;
  reasons: string[];
}

export function checkCrossModel(pr: PrInfo): Verdict {
  const reasons: string[] = [];
  // 1. Marcas inválidas bloqueiam sempre (exigindo ou não).
  const markers = new Map<string, Marker>();
  for (const c of pr.commits) {
    const m = parseMarker(c.message);
    markers.set(c.sha, m);
    if (m.kind === "invalid") reasons.push(`commit ${c.sha.slice(0, 7)}: ${m.reason}`);
  }
  if (reasons.length > 0) return { ok: false, required: true, reasons };

  // 2. Rota isenta (ADR-0041 ponto 3).
  if (pr.headRef.startsWith("fast/") || pr.labels.includes(LABEL_EXEMPT)) {
    return { ok: true, required: false, reasons: ["rota fora do pipeline de contrato (isenta)"] };
  }

  // 3. Exige? Produto com código, ou harness com o rótulo.
  const productCode = pr.changedFiles.filter((f) => !isHarness(f) && isCode(f));
  const touchesProduct = pr.changedFiles.some((f) => !isHarness(f));
  const labeled = pr.labels.includes(LABEL_REQUIRE);
  const required = productCode.length > 0 || labeled;
  if (!required) {
    return {
      ok: true,
      required: false,
      reasons: [
        touchesProduct
          ? "produto sem código (ex.: docs/product/) — só as marcas presentes"
          : "só harness, sem o rótulo cross-model",
      ],
    };
  }
  // Escopo da prova: no produto, testes em caminhos de produto; no harness rotulado, qualquer teste.
  const inScope = (path: string) => (productCode.length > 0 ? !isHarness(path) : true);

  // 4. Modelos da implementação: marcas dos commits que tocam código (no escopo exigido).
  const codeInScope = (path: string) =>
    isCode(path) && (productCode.length > 0 ? !isHarness(path) : true);
  const implModels = new Set<string>();
  for (const c of pr.commits) {
    const m = markers.get(c.sha)!;
    if (m.kind === "valid" && c.files.some((f) => codeInScope(f.path))) implModels.add(m.model);
  }

  // 5. Teste de aceite qualificado: commit SÓ de teste/fixture, com ao menos um arquivo de teste no escopo,
  //    marcado por um modelo fora de implModels, e com um desses testes INTACTO no estado final.
  const qualifying = pr.commits.filter((c) => {
    const m = markers.get(c.sha)!;
    if (m.kind !== "valid" || implModels.has(m.model)) return false;
    if (!c.files.every((f) => isTestFile(f.path) || isFixture(f.path))) return false;
    return c.files.some(
      (f) =>
        isTestFile(f.path) && inScope(f.path) && f.blob !== null && pr.headBlobs[f.path] === f.blob,
    );
  });
  if (qualifying.length > 0) {
    return {
      ok: true,
      required: true,
      reasons: [
        `teste de aceite de outro modelo: ${qualifying.map((c) => c.sha.slice(0, 7)).join(", ")}`,
      ],
    };
  }
  reasons.push(
    `nenhum commit de teste de aceite marcado por um modelo diferente do da implementação (${[...implModels].join(", ") || "sem marca"}), ` +
      `presente e sem alteração no estado final${productCode.length > 0 ? ", em caminho de produto" : ""} (ADR-0041)`,
  );
  return { ok: false, required: true, reasons };
}

function main(): number {
  let pr: PrInfo;
  try {
    pr = JSON.parse(readFileSync(0, "utf-8")) as PrInfo;
    if (!Array.isArray(pr.commits) || !Array.isArray(pr.changedFiles) || !Array.isArray(pr.labels))
      throw new Error("campos ausentes");
  } catch (e) {
    console.error(`cross-model-check: entrada inválida — ${(e as Error).message}`);
    return 2;
  }
  const v = checkCrossModel(pr);
  for (const r of v.reasons) console.error(`cross-model-check: ${r}`);
  console.log(v.ok ? (v.required ? "OK" : "OK (sem exigência)") : "BLOQUEIA");
  return v.ok ? 0 : 1;
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
