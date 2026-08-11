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
// (`--input <arquivo>`) OU busca ao vivo via `gh issue list --json …`. Sem rede/sem auth: **falha
// clara** (não grava relatório enganoso). As funções puras são exportadas para cobertura por vitest
// (o `smoke-test`/CI NÃO chama o caminho de rede — exercita via fixture).
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
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
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
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const hasFlag = (name: string): boolean => process.argv.includes(name);

/**
 * Restringe `--out` ao diretório de scratch `REPORTS_DIR` (Codex P1). O gerador roda como chamada T1
 * permitida no tool-guard (ADR-0011); sem esta trava, `--out AGENTS.md` truncaria um arquivo de
 * governança versionado **driblando a revisão**. Fora do scratch → erro claro (fail-closed).
 */
export function resolveOutPath(out: string): string {
  const base = resolve(REPORTS_DIR);
  const target = resolve(out);
  if (target !== base && !target.startsWith(base + sep)) {
    throw new Error(
      `--out deve ficar dentro de ${REPORTS_DIR}/ (scratch, gitignored) — recebido: ${out}. ` +
        "Um relatório gerado não sobrescreve arquivo versionado (governança/produto).",
    );
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
    const msg = (e as { stderr?: Buffer | string; message?: string }).stderr?.toString().trim();
    throw new Error(
      `falha ao consultar o GitHub via \`gh\` (rede/auth/\`gh\` ausente?). ` +
        `Detalhe: ${msg || (e as Error).message}. ` +
        `Rode com rede e \`gh auth status\` OK, ou use --input <arquivo> (fixture/offline).`,
    );
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) throw new Error("resposta do `gh` não é um array de Issues");
  assertNotTruncated(parsed.length, ISSUE_FETCH_LIMIT);
  return parsed as PlanIssue[];
}

function loadFromInput(file: string): PlanIssue[] {
  const parsed = JSON.parse(readFileSync(file, "utf-8")) as unknown;
  if (!Array.isArray(parsed)) throw new Error(`--input ${file}: conteúdo não é um array de Issues`);
  return parsed as PlanIssue[];
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
  const input = arg("--input");
  const repo = arg("--repo");

  // Valida o destino ANTES de buscar (fail-fast, sem gastar rede para depois rejeitar).
  let outPath: string;
  try {
    outPath = resolveOutPath(arg("--out") ?? `${REPORTS_DIR}/plan.md`);
  } catch (e) {
    console.error(`erro de destino: ${(e as Error).message}`);
    return 2;
  }

  let issues: PlanIssue[];
  const source = input ? `--input ${input}` : "gh (ao vivo)";
  try {
    issues = input ? loadFromInput(input) : fetchIssuesViaGh(repo);
  } catch (e) {
    console.error(`erro ao obter Issues: ${(e as Error).message}`);
    return 2; // falha fechada — NÃO grava relatório enganoso
  }

  const md = renderReport(issues, { repo, source, generatedAt: new Date().toISOString() });
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, md.endsWith("\n") ? md : md + "\n");

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
