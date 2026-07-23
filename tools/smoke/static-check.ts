// static-check.ts — Camada ESTÁTICA do smoke-test (Orion), em TypeScript (ADR-0005/0012: meta-tooling
// runnable é TS, typechecado + coberto por vitest; o shell só orquestra). Reescreve, sem python nem
// dependência (Issue #75, escolha (b)), a validação de sintaxe/consistência/completude dos artefatos.
//
// Roda sem `node_modules` via type stripping:
//   node --experimental-strip-types tools/smoke/static-check.ts            # checagem estática (exit≠0 se erros)
//   node --experimental-strip-types tools/smoke/static-check.ts --secret <arquivo>  # fallback secret-scan
//
// Funções puras exportadas para o vitest (`static-check.test.ts`).
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

/** Diretórios gerados/dependências/scratch — espelha os SKIP_DIRS do os.walk python. */
export const SKIP_DIRS = new Set([".git", "node_modules", ".orion", "dist", "coverage", ".pytest_cache"]);

/**
 * Lista recursiva de arquivos a partir de `root`, **sem seguir symlinks** (como o os.walk python com
 * `followlinks=False`): um symlink — de arquivo ou de diretório — é ignorado, então a travessia fica
 * **limitada ao repositório** (não escapa via `docs/ext -> /usr` nem entra em ciclo). Caminhos são
 * relativos a `root`, com separador `/`.
 */
export function walkFiles(root: string): string[] {
  const out: string[] = [];
  const rec = (rel: string): void => {
    let entries;
    try {
      entries = readdirSync(rel === "" ? root : join(root, rel), { withFileTypes: true });
    } catch {
      return;
    }
    for (const d of entries) {
      if (d.isSymbolicLink()) continue; // não segue symlink (arquivo ou dir)
      if (SKIP_DIRS.has(d.name)) continue;
      const child = rel === "" ? d.name : `${rel}/${d.name}`;
      if (d.isDirectory()) rec(child);
      else if (d.isFile()) out.push(child);
    }
  };
  rec("");
  return out;
}

/**
 * Lint de YAML LEVE (sem parser; escolha (b) da #75). Retorna a razão do erro, ou `null` se OK.
 * Cobre a classe de quebra comum e determinística que o parse python pegava:
 *  - arquivo não-vazio;
 *  - sem TAB de indentação (YAML proíbe tab para indentar);
 *  - **flow-collections `[]`/`{}` balanceadas** (pega `x: [naoFechado`), contando o saldo ao longo do
 *    doc **fora** de comentários, strings e block-scalars (`|`/`>` — onde vive shell arbitrário nos
 *    workflows). O schema completo dos workflows segue validado pelo GitHub Actions no push.
 */
export function yamlLint(text: string): string | null {
  if (text.trim() === "") return "vazio";
  const lines = text.split(/\r?\n/);
  let sq = 0; // saldo de []
  let cu = 0; // saldo de {}
  let blockIndent = -1; // dentro de um block-scalar se a linha indenta mais que isto
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const indent = (raw.match(/^ */) as RegExpMatchArray)[0].length;
    if (/^ *\t/.test(raw) || /^\t/.test(raw)) return `TAB na indentação (linha ${i + 1})`;
    if (blockIndent >= 0) {
      if (raw.trim() === "") continue; // linha em branco pertence ao bloco
      if (indent > blockIndent) continue; // ainda dentro do block-scalar
      blockIndent = -1; // saiu do bloco
    }
    // Abre block-scalar? (`chave: |` / `chave: >` com indicador opcional e comentário opcional)
    if (/:\s*[|>][+-]?\d*\s*(#.*)?$/.test(raw)) {
      blockIndent = indent;
      continue;
    }
    // Conta brackets fora de aspas; `#` fora de aspas inicia comentário (resto da linha ignorado).
    let inS = false; // '
    let inD = false; // "
    for (const ch of raw) {
      if (inS) {
        if (ch === "'") inS = false;
        continue;
      }
      if (inD) {
        if (ch === '"') inD = false;
        continue;
      }
      if (ch === "'") inS = true;
      else if (ch === '"') inD = true;
      else if (ch === "#") break; // comentário até o fim da linha
      else if (ch === "[") sq++;
      else if (ch === "]") sq--;
      else if (ch === "{") cu++;
      else if (ch === "}") cu--;
    }
    if (sq < 0 || cu < 0) return `flow-collection desbalanceada perto da linha ${i + 1} (] ou } sem abertura)`;
  }
  if (sq !== 0 || cu !== 0) return `flow-collection não fechada ([]=${sq}, {}=${cu})`;
  return null;
}

/** Extrai os valores de `label:` de um issue-form YAML (sem parser); minúsculas, sem aspas. */
export function extractSddLabels(text: string): string[] {
  return [...text.matchAll(/^\s*label:\s*(.+?)\s*$/gm)].map((m) => m[1]!.replace(/^["']|["']$/g, "").toLowerCase());
}

/** Campos exigidos no template de Issue SDD (§5) + a classe de confiança (§11). */
export const SDD_REQUIRED_FIELDS = [
  "Contexto", "Problema", "Objetivo", "Escopo", "Fora de escopo", "Critérios de aceite",
  "Data-First", "Dependências", "Riscos", "Plano de validação", "Definição de pronto",
] as const;

/** Retorna os campos/label ausentes (inclui "classe de confiança" se faltar). */
export function missingSddFields(labels: string[]): string[] {
  const miss = SDD_REQUIRED_FIELDS.filter((r) => !labels.some((l) => l.includes(r.toLowerCase()))) as string[];
  if (!labels.some((l) => l.includes("confian"))) miss.push("classe de confiança");
  return miss;
}

/** Regras de detecção do fallback offline de secret-scan (espelham o gitleaks p/ os fixtures). */
export const SECRET_PATTERNS: readonly RegExp[] = [
  /AKIA[0-9A-Z]{16}/,
  /ghp_[0-9A-Za-z]{36}/,
  /(secret|token|password|api[_-]?key)\s*[:=]\s*['"][^'"]{8,}['"]/i,
];

export function detectSecret(text: string): boolean {
  return SECRET_PATTERNS.some((p) => p.test(text));
}

/** Artefatos que precisam existir na raiz do harness. */
export const MUST_EXIST = [
  "AGENTS.md", "AGENTS.core.md", "CLAUDE.md", "README.md", "PLAN.md", "STATE.md", "MEMORY.md",
  "CHANGELOG.md", "SECURITY.md", "CONTRIBUTING.md", ".env.example",
  "docs/architecture/foundations.md", "docs/architecture/ui-agent-harness.md",
  "docs/product/spec.md", "docs/product/product-context.md", "docs/product/discovery-guide.md",
  "docs/decisions/0001-fundacoes-do-orion-harness.md",
  ".github/ISSUE_TEMPLATE/sdd-task.yml", ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/workflows/ci.yml",
] as const;

/** Executa toda a checagem estática sob `root`; retorna a lista de erros (vazia ⇒ íntegra). */
export function runStaticCheck(root: string): string[] {
  const errs: string[] = [];
  const read = (f: string): string => readFileSync(join(root, f), "utf-8");
  const has = (f: string): boolean => existsSync(join(root, f));
  const files = walkFiles(root);

  // YAML — .github/**/*.yml|yaml + .pre-commit-config.yaml (lint leve reforçado).
  for (const f of files.filter((f) => /\.ya?ml$/.test(f) && (f.startsWith(".github/") || f === ".pre-commit-config.yaml"))) {
    const reason = yamlLint(read(f));
    if (reason) errs.push(`YAML ${f}: ${reason}`);
  }

  // JSON — parse real.
  for (const f of files.filter((f) => f.startsWith("presets/") && f.endsWith(".json"))) {
    try {
      JSON.parse(read(f));
    } catch (e) {
      errs.push(`JSON ${f}: ${(e as Error).message}`);
    }
  }

  // Links internos .md (só alvos com extensão ou terminados em "/").
  const linkRe = /\]\((?!https?:\/\/)([^)#]+?)(?:#[^)]*)?\)/g;
  for (const p of files.filter((f) => f.endsWith(".md"))) {
    for (const m of read(p).matchAll(linkRe)) {
      const tgt = m[1]!;
      if (!/\.\w+$/.test(tgt) && !tgt.endsWith("/")) continue;
      if (!existsSync(normalize(join(root, dirname(p), tgt)))) errs.push(`link quebrado: ${p} -> ${tgt}`);
    }
  }

  // Cross-refs de seções (§N): definidas em AGENTS.md OU nos docs de arquitetura.
  const secs = new Set<string>();
  for (const f of ["AGENTS.md", ...files.filter((f) => /^docs\/architecture\/.*\.md$/.test(f))]) {
    if (!has(f)) continue;
    for (const m of read(f).matchAll(/^#{2,3}\s+(\d+(?:\.\d+)?)/gm)) secs.add(m[1]!);
  }
  const agentsMd = has("AGENTS.md") ? read("AGENTS.md") : "";
  const refs = new Set([...agentsMd.matchAll(/§\s*(\d+(?:\.\d+)?)/g)].map((m) => m[1]!));
  for (const r of [...refs].filter((r) => !secs.has(r)).sort()) errs.push(`§${r} referenciado mas inexistente`);

  // Artefatos obrigatórios.
  for (const m of MUST_EXIST) if (!has(m)) errs.push(`artefato ausente: ${m}`);

  // Template de Issue SDD completo.
  const sdd = ".github/ISSUE_TEMPLATE/sdd-task.yml";
  if (!has(sdd)) errs.push("Issue SDD: template ausente");
  else for (const field of missingSddFields(extractSddLabels(read(sdd)))) errs.push(`Issue SDD sem campo: ${field}`);

  // PR template força a verificação §8.1.
  const pr = has(".github/PULL_REQUEST_TEMPLATE.md") ? read(".github/PULL_REQUEST_TEMPLATE.md") : "";
  for (const c of ["Conforme a Spec", "regras de negócio", "decisões arquiteturais", "fluxos existentes", "Regressões"])
    if (!pr.includes(c)) errs.push(`PR template sem item §8.1: ${c}`);

  // CI usa o binário gitleaks (sem dependência de licença).
  const ci = has(".github/workflows/ci.yml") ? read(".github/workflows/ci.yml") : "";
  if (ci.includes("gitleaks-action") || !ci.includes("gitleaks detect")) errs.push("CI secret-scan não usa o binário gitleaks");

  return errs;
}

// CLI. Sem args ⇒ checagem estática (erros p/ stderr, exit≠0 se houver). `--secret <arquivo>` ⇒
// fallback offline de secret-scan (exit 0 se detectou, 1 caso contrário).
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , flag, arg] = process.argv;
  if (flag === "--secret") {
    if (!arg) {
      console.error("uso: static-check.ts --secret <arquivo>");
      process.exit(2);
    }
    process.exit(detectSecret(readFileSync(arg, "utf-8")) ? 0 : 1);
  } else {
    const errs = runStaticCheck(process.cwd());
    for (const e of errs) console.error("    - " + e);
    process.exit(errs.length ? 1 : 0);
  }
}
