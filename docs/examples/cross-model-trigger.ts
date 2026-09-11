// cross-model-trigger.ts — Predicado de referência do GATILHO CROSS-MODEL (T7.4 / O7).
//
// Dada a lista de arquivos alterados de um PR, decide se a revisão cross-model (pipeline ADR-0030) é
// EXIGIDA. Heurística de SUPERFÍCIE de arquivo apenas — a classe de confiança (T0–T4) e a governança-
// por-função ficam com o chamador/Issue (como fast-lane-eligibility.ts recebe descritor já
// classificado). Espelha o estilo de fast-lane-eligibility.ts / cross-model-review.ts: fail-closed
// ("na dúvida, exige" — §11), nunca lança, e um self-check embutido serve de demo E de evidência.
//
// EVIDÊNCIA SOB O TOOL-GUARD (ADR-0011/0015) = o modo **sem args** (demo + self-check):
//   node --experimental-strip-types docs/examples/cross-model-trigger.ts   # demo + self-check
// SAI COM CÓDIGO ≠ 0 se qualquer caso canônico divergir do esperado (regressão própria).
//
// Contrato (Issue #270 §6), provado pelos testes de aceite autorados pelo Codex (ADR-0018):
//   crossModelRequired(changedFiles): { required, reason } — determinístico por extensão/caminho;
//   fail-closed = required:true; NUNCA lança; qualquer arquivo *source* ⇒ exige (reason cita o gatilho);
//   só doc/config/test ⇒ dispensa; lista vazia/entrada inválida/item em branco ⇒ exige.

import { readFileSync } from "node:fs";
import process from "node:process";

/** Decisão do gatilho: a revisão cross-model é exigida para este conjunto de arquivos? */
export interface TriggerDecision {
  required: boolean;
  reason: string; //  por que exige / dispensa (nunca vazio)
}

/** Categoria de superfície de um caminho alterado. */
type Surface = "source" | "test" | "doc" | "config";

/** Extensões que denotam CÓDIGO comportamental (quando não classificadas como teste). */
const SOURCE_EXT = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"] as const;

/** Segmentos de diretório que denotam teste/fixture (independe da extensão do arquivo). */
const TEST_DIR_SEGMENTS = ["__tests__", "tests", "fixtures", "mocks"] as const;

const lower = (s: string) => s.toLowerCase();
const basename = (path: string) => path.slice(path.lastIndexOf("/") + 1);
const endsWithAny = (s: string, exts: readonly string[]) => exts.some((e) => s.endsWith(e));

/**
 * Classifica um caminho pela SUPERFÍCIE (case-insensitive). Precedência: teste antes de source —
 * `foo.test.ts` termina em `.ts` mas é TESTE, não código comportamental.
 */
function classifyPath(path: string): Surface {
  const p = lower(path);
  const base = basename(p);
  const segments = p.split("/");

  const isTest =
    base.includes(".test.") ||
    base.includes(".spec.") ||
    segments.some((seg) => (TEST_DIR_SEGMENTS as readonly string[]).includes(seg));
  if (isTest) return "test";

  if (endsWithAny(base, SOURCE_EXT)) return "source";
  if (base.endsWith(".md")) return "doc";
  return "config";
}

/** Uma entrada de `changedFiles` é válida sse for string não-vazia/não-branca. */
const isValidPath = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";

/**
 * Decide se a revisão cross-model é exigida a partir da lista de arquivos alterados.
 * Fail-closed (§11 "na dúvida, sobe de nível"): entrada malformada, lista vazia ou qualquer arquivo
 * *source* ⇒ `required: true`. Só doc/config/test ⇒ `required: false`. NUNCA lança — qualquer erro
 * inesperado também vira `required: true` (nunca dispensa por acidente).
 */
export function crossModelRequired(changedFiles: readonly string[]): TriggerDecision {
  try {
    if (!Array.isArray(changedFiles))
      return {
        required: true,
        reason: `entrada inválida (não é lista) — fail-closed ⇒ exige revisão`,
      };
    if (changedFiles.length === 0)
      return { required: true, reason: `lista vazia — fail-closed ⇒ exige revisão` };

    const invalid = (changedFiles as readonly unknown[]).find((f) => !isValidPath(f));
    if (invalid !== undefined || (changedFiles as readonly unknown[]).some((f) => !isValidPath(f)))
      return {
        required: true,
        reason: `entrada inválida (item não-string ou em branco: ${JSON.stringify(invalid)}) — fail-closed ⇒ exige revisão`,
      };

    // Regra source-manda: qualquer arquivo comportamental exige a revisão; o reason cita o gatilho.
    const firstSource = changedFiles.find((f) => classifyPath(f) === "source");
    if (firstSource !== undefined)
      return {
        required: true,
        reason: `superfície de comportamento observável em '${firstSource}' ⇒ exige revisão cross-model`,
      };

    return {
      required: false,
      reason: `sem superfície de comportamento observável (só doc/config/teste) ⇒ dispensa revisão cross-model`,
    };
  } catch (e) {
    // Nunca lança: um erro inesperado é tratado como fail-closed (exige), jamais como dispensa.
    return {
      required: true,
      reason: `erro inesperado (${(e as Error)?.message ?? String(e)}) — fail-closed ⇒ exige revisão`,
    };
  }
}

/** Casos-âncora (Issue #270 §6) — servem de demo E de auto-verificação. */
const CASOS: ReadonlyArray<{ nome: string; files: unknown; esperado: boolean }> = [
  { nome: "['src/foo.ts'] — source", files: ["src/foo.ts"], esperado: true },
  { nome: "['README.md'] — doc", files: ["README.md"], esperado: false },
  { nome: "['a.test.ts'] — test", files: ["a.test.ts"], esperado: false },
  {
    nome: "['docs/x.md','tools/bar.ts'] — mista c/ source",
    files: ["docs/x.md", "tools/bar.ts"],
    esperado: true,
  },
  { nome: "[] — lista vazia (fail-closed)", files: [], esperado: true },
  { nome: "[42] — não-string (fail-closed)", files: [42], esperado: true },
  {
    nome: "['config/app.json','notes.md'] — só config/doc",
    files: ["config/app.json", "notes.md"],
    esperado: false,
  },
  {
    nome: "['src/__tests__/util.ts'] — sob __tests__",
    files: ["src/__tests__/util.ts"],
    esperado: false,
  },
];

/** Roda os casos canônicos e assert o `required` esperado; retorna o nº de divergências. */
export function selfCheck(): number {
  let falhas = 0;
  for (const c of CASOS) {
    const d = crossModelRequired(c.files as readonly string[]);
    const ok = d.required === c.esperado;
    if (!ok) falhas++;
    console.log(JSON.stringify({ caso: c.nome, ...d, esperado: c.esperado, ok }));
  }
  return falhas;
}

// CLI: sem args ⇒ demo + self-check (exit ≠ 0 em divergência). Com um JSON (ou `-` p/ stdin) ⇒
// classifica aquela lista real de arquivos alterados.
if (import.meta.main ?? process.argv[1]?.endsWith("cross-model-trigger.ts") ?? false) {
  const arg = process.argv[2];
  if (arg && arg !== "--demo") {
    const raw = arg === "-" ? readFileSync(0, "utf8") : arg;
    let files: readonly string[];
    try {
      files = JSON.parse(raw) as readonly string[];
    } catch (e) {
      console.error(`lista JSON inválida: ${(e as Error).message}`);
      process.exit(2);
    }
    console.log(JSON.stringify(crossModelRequired(files)));
  } else {
    const falhas = selfCheck();
    if (falhas > 0) {
      console.error(`SELF-CHECK FALHOU: ${falhas} caso(s) divergente(s) do esperado`);
      process.exit(1);
    }
  }
}
