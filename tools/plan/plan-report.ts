#!/usr/bin/env node
// plan-report.ts — Gerador do relatório de plano OFFLINE (Orion, ADR-0025, fatia T9.3a).
//
// Projeta o **mapa de épicos/tarefas** (camada L1) a partir da fonte GitHub — Milestones (épico) +
// Issues (tarefa) — para leitura humana num relatório SOB DEMANDA. Saída em
// `.orion/tmp/reports/plan.md` (scratch, **gitignored** — NÃO é fonte versionada; um relatório
// committado recriaria a fonte autoral que o O9 elimina).
//
// **Adição pura (T9.3a):** nada sai do read-path aqui. Estubar o `PLAN.md` é a fatia irmã T9.3b.
//
// **Acesso (D2):** reusa o mesmo mecanismo do `tools/ledger/ledger-from-issues.ts` — o idioma
// `gh → json → tool` (auth via `gh`, sem segunda via). O `main()` consome JSON já buscado
// (`--input <arquivo>`) OU busca ao vivo via `gh issue list --json …`. **Sem rede/sem auth** o fetch
// **degrada para relatório VAZIO** (o read-path offline vê o stub-ponteiro — ADR-0025 linhas 97–103,
// 344–351), NÃO falha; já **truncamento/resposta inválida** falham fechado (não mascaram plano
// incompleto). As funções puras são exportadas para cobertura por vitest (o `smoke-test`/CI NÃO chama
// o caminho de rede — exercita via fixture).
//
// **Épico (D2, ponte transitória):** o Orion ainda não populou Milestones; hoje o épico só existe
// pela convenção de prefixo no título (`T9.x` → `O9`). Então o épico de uma Issue é a **Milestone
// quando houver; senão o prefixo do título**. Fica pronto para quando as Milestones forem populadas.
//
// **Limitação declarada (Codex P1, adiada por decisão do owner):** o gerador deriva o plano das
// **Issues** (`gh issue list`). Os **draft items** do Project (fonte pré-Spec durante a fase Plan,
// ADR-0025 linhas 78–92) e Milestones vazias **não** entram — buscá-los exige Projects v2/GraphQL,
// escopo além da adição pura da T9.3a. Enquanto a fase Plan não roda com drafts, o mapa de Issues é
// suficiente; incluir drafts é follow-up (T9.3b/futuro), não esta fatia.
//
// CLI (Node >= 22, type stripping):
//   node --experimental-strip-types tools/plan/plan-report.ts [--out <arquivo>] [--repo <owner/repo>]
//   node --experimental-strip-types tools/plan/plan-report.ts --input <issues.json>   # offline/fixture
import {
  writeFileSync,
  readFileSync,
  mkdirSync,
  existsSync,
  realpathSync,
  lstatSync,
  renameSync,
} from "node:fs";
import { dirname, resolve, sep, isAbsolute, basename } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import process from "node:process";

export interface PlanIssue {
  number: number;
  title: string;
  state: string; // "OPEN" | "CLOSED" (gh `--json state`); comparado case-insensitive
  labels?: (string | { name?: string })[];
  milestone?: { title?: string | null } | null;
}

export interface EpicGroup {
  epic: string;
  issues: PlanIssue[];
}

const SEM_EPICO = "(sem épico)";

/** Diretório de saída permitido — scratch, gitignored. Um relatório **nunca** vira fonte versionada. */
export const REPORTS_DIR = ".orion/tmp/reports";

/** Teto de Issues buscadas do `gh` numa chamada (`--limit` não pagina — ver `assertNotTruncated`). */
export const ISSUE_FETCH_LIMIT = 500;

/**
 * Fonte indisponível (sem rede / sem auth / `gh` ausente). Distinta de erro de dado (truncamento,
 * resposta inválida): o ADR-0025 (linhas 97–103, 344–351) manda **degradar para relatório vazio**
 * neste caso — o offline vê o ponteiro, não falha. Truncamento/dado inválido continuam falha fechada.
 */
export class FetchUnavailableError extends Error {}

/** Erro de uso da CLI (flag sem valor, etc.) — falha fechada com mensagem de uso (Codex r3). */
export class UsageError extends Error {}

/** Valida a forma mínima de uma Issue (Codex r3): `[{}]` não pode virar `#undefined … undefined`. */
export function isValidIssue(x: unknown): x is PlanIssue {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return typeof o.number === "number" && typeof o.title === "string" && typeof o.state === "string";
}

/** Valida um array de Issues antes de renderizar/resumir; falha **fechada** no primeiro inválido. */
export function validateIssues(arr: unknown[], origin: string): PlanIssue[] {
  arr.forEach((x, idx) => {
    if (!isValidIssue(x)) {
      throw new Error(
        `${origin}: Issue inválida no índice ${idx} — faltam campos number/title/state válidos ` +
          "(resposta não confiável; falha fechada em vez de gerar relatório falso).",
      );
    }
  });
  return arr as PlanIssue[];
}

const labelNames = (i: PlanIssue): string[] =>
  (i.labels ?? []).map((l) => (typeof l === "string" ? l : (l.name ?? ""))).filter(Boolean);

export const isOpen = (i: PlanIssue): boolean => /open/i.test(i.state ?? "");

/**
 * Épico derivado do prefixo do título: `T<major>.<minor>[letra]` → `O<major>` (ex.: "T9.3a …" → "O9");
 * um título que já começa por `O<n>` é o próprio épico. Sem correspondência → `null` (a Issue cai em
 * `(sem épico)`). Ponte transitória enquanto não há Milestones (D2).
 *
 * Robusto ao prefixo histórico de tag (`[SDD] T1.1 …`, `[chore] …`): tags iniciais entre colchetes são
 * descartadas antes de casar. Como fallback (títulos que citam a tarefa no meio, ex.: "docs(...): da
 * T5.1 …"), procura o primeiro token `T<major>.<minor>` no título. É heurística — quando as Milestones
 * forem populadas (D2), a Milestone tem precedência em `epicOf` e dispensa este parser.
 */
export function parseEpicFromTitle(title: string): string | null {
  let t = (title ?? "").trim();
  while (/^\[[^\]]*\]\s*/.test(t)) t = t.replace(/^\[[^\]]*\]\s*/, "");
  const mt = t.match(/^T(\d+)\.\d+/i) ?? t.match(/\bT(\d+)\.\d+/i);
  if (mt) return `O${mt[1]}`;
  const mo = t.match(/^O(\d+)\b/i);
  if (mo) return `O${mo[1]}`;
  return null;
}

/** Épico de uma Issue: Milestone quando houver (fonte-alvo do ADR-0025); senão o prefixo do título. */
export function epicOf(i: PlanIssue): string {
  const ms = i.milestone?.title?.trim();
  if (ms) return ms;
  return parseEpicFromTitle(i.title) ?? SEM_EPICO;
}

/** Ordena épicos: `O<n>` por número crescente primeiro; rótulos não-`O<n>` alfabéticos; `(sem épico)` por último. */
function epicSortKey(epic: string): [number, number, string] {
  if (epic === SEM_EPICO) return [2, 0, epic];
  const m = epic.match(/^O(\d+)$/);
  if (m) return [0, Number(m[1]), epic];
  return [1, 0, epic.toLowerCase()];
}

export function groupByEpic(issues: PlanIssue[]): EpicGroup[] {
  const byEpic = new Map<string, PlanIssue[]>();
  for (const i of issues) {
    const epic = epicOf(i);
    const arr = byEpic.get(epic);
    if (arr) arr.push(i);
    else byEpic.set(epic, [i]);
  }
  const groups: EpicGroup[] = [...byEpic.entries()].map(([epic, list]) => ({
    epic,
    // Abertas primeiro, depois fechadas; dentro de cada estado, por número crescente.
    issues: [...list].sort(
      (a, b) => Number(isOpen(b)) - Number(isOpen(a)) || a.number - b.number,
    ),
  }));
  return groups.sort((a, b) => {
    const [ka0, ka1, ka2] = epicSortKey(a.epic);
    const [kb0, kb1, kb2] = epicSortKey(b.epic);
    return ka0 - kb0 || ka1 - kb1 || ka2.localeCompare(kb2);
  });
}

export interface Summary {
  epics: number;
  total: number;
  open: number;
  closed: number;
}

export function summarize(issues: PlanIssue[]): Summary {
  const open = issues.filter(isOpen).length;
  return {
    epics: new Set(issues.map(epicOf)).size,
    total: issues.length,
    open,
    closed: issues.length - open,
  };
}

export interface RenderOpts {
  repo?: string;
  generatedAt?: string; // injetável para testes determinísticos
  source?: string; // "gh (ao vivo)" | "--input <arquivo>"
}

/** Renderiza o relatório Markdown. Função **pura** (sem I/O, sem relógio) — `generatedAt` é injetado. */
export function renderReport(issues: PlanIssue[], opts: RenderOpts = {}): string {
  const repo = opts.repo ?? "(repo atual)";
  const generatedAt = opts.generatedAt ?? "(sem timestamp)";
  const source = opts.source ?? "(desconhecida)";
  const s = summarize(issues);
  const groups = groupByEpic(issues);

  const out: string[] = [];
  out.push(`# Plano (relatório gerado) — ${repo}`);
  out.push("");
  out.push(
    "> Relatório **gerado sob demanda** a partir de GitHub Milestones (épico) + Issues (tarefa) — " +
      "fonte L1 do plano (ADR-0025). Scratch em `.orion/tmp/reports/` (**gitignored**): não é fonte " +
      "versionada. O plano operacional vive no GitHub; este arquivo é uma **leitura offline** derivada.",
  );
  out.push(`>`);
  out.push(`> Gerado em: ${generatedAt} · Fonte: ${source}`);
  out.push("");
  out.push(
    `**Resumo:** ${s.epics} épico(s) · ${s.total} tarefa(s) (${s.open} aberta(s) · ${s.closed} fechada(s)).`,
  );
  out.push("");

  if (issues.length === 0) {
    out.push(
      "_Nenhuma Issue encontrada — plano vazio. Num clone limpo/sem Issues (template-repo) este é o " +
        "comportamento correto: o plano vive no GitHub; abra Milestones/Issues para populá-lo._",
    );
    out.push("");
    return out.join("\n");
  }

  for (const g of groups) {
    const gOpen = g.issues.filter(isOpen).length;
    const gClosed = g.issues.length - gOpen;
    out.push(`## ${g.epic} (${gOpen} aberta(s) · ${gClosed} fechada(s))`);
    for (const i of g.issues) {
      const estado = isOpen(i) ? "aberta" : "fechada";
      const tipo = labelNames(i)
        .filter((n) => n.startsWith("type:"))
        .join(", ");
      const tag = tipo ? ` \`${tipo}\`` : "";
      out.push(`- #${i.number} [${estado}]${tag} ${i.title}`);
    }
    out.push("");
  }
  return out.join("\n");
}

// ─────────────────────────────────── I/O (main) ───────────────────────────────────

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i < 0) return undefined;
  const val = process.argv[i + 1];
  // Flag presente mas sem valor (última posição ou seguida de outra flag): erro de uso, não "omitida"
  // (Codex r3) — senão `… --input` cairia num fetch ao vivo silencioso em vez de rejeitar.
  if (val === undefined || val.startsWith("--")) {
    throw new UsageError(`a opção ${name} exige um valor (recebeu ${val === undefined ? "nada" : `\`${val}\``}).`);
  }
  return val;
}
const hasFlag = (name: string): boolean => process.argv.includes(name);

/** Raiz do repositório (git). Fallback para o cwd se git falhar — mantém o gerador utilizável fora de git. */
export function repoRoot(): string {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return process.cwd();
  }
}

/**
 * Realpath do diretório existente mais profundo a partir de `dir`, re-anexando a cauda inexistente.
 * Segue symlinks dos componentes **existentes** — é o que permite detectar um ancestral symlinkado que
 * escaparia do scratch (Codex P1-symlink).
 */
function realExistingDir(dir: string): string {
  let cur = resolve(dir);
  const tail: string[] = [];
  while (!existsSync(cur)) {
    tail.unshift(basename(cur));
    const parent = dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  const real = realpathSync(cur);
  return tail.length ? resolve(real, ...tail) : real;
}

/**
 * Restringe `--out` ao scratch `REPORTS_DIR` **ancorado na raiz do repo** (Codex P1/P2). O gerador roda
 * como chamada T1 permitida no tool-guard (ADR-0011); sem esta trava, `--out AGENTS.md` truncaria um
 * arquivo de governança versionado **driblando a revisão**. Defesas:
 *  - **Raiz, não cwd** (P2): rodado de um subdir, o relatório ainda cai no diretório gitignored da raiz.
 *  - **Symlink-safe** (P1): compara o **realpath** do diretório-pai do alvo contra o realpath do scratch —
 *    um ancestral symlinkado que apontasse para fora é rejeitado; alvo que já é symlink também.
 * `baseDir` é injetável para teste; por padrão, a raiz do repo.
 */
export function resolveOutPath(out: string, baseDir: string = repoRoot()): string {
  const target = isAbsolute(out) ? resolve(out) : resolve(baseDir, out);
  const realBase = realExistingDir(resolve(baseDir, REPORTS_DIR));
  const realParent = realExistingDir(dirname(target));
  const inside = realParent === realBase || realParent.startsWith(realBase + sep);
  if (!inside) {
    throw new Error(
      `--out deve ficar dentro de ${REPORTS_DIR}/ na raiz do repo (scratch, gitignored) — recebido: ${out}. ` +
        "Um relatório gerado não sobrescreve arquivo versionado (governança/produto).",
    );
  }
  if (existsSync(target) && lstatSync(target).isSymbolicLink()) {
    throw new Error(`--out aponta para um symlink (${out}) — recusado para não escrever fora do scratch.`);
  }
  return target;
}

/**
 * Falha fechada se o fetch atingiu o teto (Codex P2): `--limit` **não** pagina, então um retorno igual
 * ao teto pode estar **truncado** — apresentar contagens/grupos truncados como o plano completo é pior
 * que falhar. Fixture/offline (`--input`) não passa por aqui.
 */
export function assertNotTruncated(count: number, limit: number): void {
  if (count >= limit) {
    throw new Error(
      `o fetch atingiu o teto de ${limit} Issues — o relatório seria truncado e apresentaria um plano ` +
        "incompleto como completo. Pagine (ex.: `gh api --paginate`) ou eleve o teto conscientemente.",
    );
  }
}

/**
 * Busca as Issues no GitHub via `gh` (mesmo mecanismo de acesso do ledger — auth via `gh`, sem segunda
 * via). Falha **fechada e clara** sem rede/sem auth/sem `gh` — o gerador roda no ritual diário; degradar
 * em silêncio é pior que não existir.
 */
export function fetchIssuesViaGh(repo?: string): PlanIssue[] {
  const args = [
    "issue",
    "list",
    "--state",
    "all",
    "--limit",
    String(ISSUE_FETCH_LIMIT),
    "--json",
    "number,title,state,labels,milestone",
  ];
  if (repo) args.push("-R", repo);
  let raw: string;
  try {
    raw = execFileSync("gh", args, { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    const err = e as { status?: number; code?: string; stderr?: Buffer | string; message?: string };
    const stderr = err.stderr?.toString() ?? "";
    const detail = stderr.trim() || err.message || "erro desconhecido";
    const msg = `falha ao consultar o GitHub via \`gh\`. Detalhe: ${detail}`;
    // Só sinais RECONHECIDOS de indisponibilidade degradam para vazio (Codex r3): `gh` ausente
    // (ENOENT), auth requerida (exit 4) ou erro de rede no stderr. Repo inexistente/permissão/API
    // são erros OPERACIONAIS → falha fechada (não mascarar como "plano vazio").
    const network =
      /could not resolve host|could not connect|network is unreachable|connection refused|dial tcp|no such host|temporary failure in name resolution|i\/o timeout|timed out|Get "https?:/i;
    const unavailable = err.code === "ENOENT" || err.status === 4 || network.test(stderr);
    if (unavailable) {
      throw new FetchUnavailableError(
        `${msg} — offline/sem auth (rode com rede e \`gh auth status\` OK, ou use --input).`,
      );
    }
    throw new Error(`${msg} — erro operacional (ex.: repo inexistente/permissão). Falha fechada.`);
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) throw new Error("resposta do `gh` não é um array de Issues");
  assertNotTruncated(parsed.length, ISSUE_FETCH_LIMIT);
  return validateIssues(parsed, "gh");
}

function loadFromInput(file: string): PlanIssue[] {
  const parsed = JSON.parse(readFileSync(file, "utf-8")) as unknown;
  if (!Array.isArray(parsed)) throw new Error(`--input ${file}: conteúdo não é um array de Issues`);
  return validateIssues(parsed, `--input ${file}`);
}

function main(): number {
  if (hasFlag("--help") || hasFlag("-h")) {
    console.log(
      "Uso: plan-report.ts [--out <arquivo>] [--repo <owner/repo>] [--input <issues.json>]\n" +
        "  Gera o relatório de plano (mapa de épicos/tarefas) a partir de GitHub Issues/Milestones.\n" +
        "  --input usa JSON pré-buscado (fixture/offline); sem ele, busca ao vivo via `gh`.\n" +
        "  Saída padrão: .orion/tmp/reports/plan.md (scratch, gitignored).",
    );
    return 0;
  }
  const root = repoRoot();

  // Parse de args + destino ANTES de buscar (fail-fast). Flag sem valor (UsageError) e destino fora do
  // scratch são erros de uso → exit 2, sem tocar em rede nem em arquivo.
  let input: string | undefined;
  let repo: string | undefined;
  let outPath: string;
  try {
    input = arg("--input");
    repo = arg("--repo");
    outPath = resolveOutPath(arg("--out") ?? `${REPORTS_DIR}/plan.md`, root);
  } catch (e) {
    console.error(`erro de uso: ${(e as Error).message}`);
    return 2;
  }

  let issues: PlanIssue[];
  let source: string;
  if (input) {
    try {
      issues = loadFromInput(input);
      source = `--input ${input}`;
    } catch (e) {
      console.error(`erro ao obter Issues: ${(e as Error).message}`);
      return 2; // erro de usuário (arquivo malformado/ausente) — falha fechada
    }
  } else {
    try {
      issues = fetchIssuesViaGh(repo);
      source = "gh (ao vivo)";
    } catch (e) {
      if (e instanceof FetchUnavailableError) {
        // ADR-0025 (97–103, 344–351): offline/sem auth → gerar relatório VAZIO (o read-path degrada
        // para o stub-ponteiro), NÃO falhar. Truncamento/dado inválido caem no else → falha fechada,
        // para não mascarar um plano incompleto como vazio.
        console.warn(`aviso: ${(e as Error).message}`);
        console.warn("gerando relatório VAZIO (offline degrada para o ponteiro — ADR-0025).");
        issues = [];
        source = "gh indisponível (offline/sem auth) — plano vazio";
      } else {
        console.error(`erro ao obter Issues: ${(e as Error).message}`);
        return 2;
      }
    }
  }

  const md = renderReport(issues, { repo, source, generatedAt: new Date().toISOString() });
  // Escrita ATÔMICA (Codex r3): grava num temp no mesmo dir (validado) e faz `rename` sobre o alvo. O
  // rename troca a **entrada de diretório**, não o inode — então um alvo hard-linkado (ou symlinkado) a
  // um arquivo versionado não é truncado pelo inode compartilhado. Encerra a classe de links.
  mkdirSync(dirname(outPath), { recursive: true });
  const tmp = `${outPath}.tmp-${process.pid}`;
  writeFileSync(tmp, md.endsWith("\n") ? md : md + "\n");
  renameSync(tmp, outPath);

  const s = summarize(issues);
  console.log("PLAN REPORT");
  console.log(`  Issues lidas:  ${s.total} (${s.open} abertas · ${s.closed} fechadas)`);
  console.log(`  épicos:        ${s.epics}`);
  console.log(`  -> gravado em  ${outPath}`);
  if (s.total === 0)
    console.log("  (plano vazio — sem Issues; comportamento correto num clone/template sem plano)");
  return 0;
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
