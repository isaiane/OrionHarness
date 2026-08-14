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
// **Fonte do plano (ADR-0026, T9.3b-mig):** o épico é o **Milestone** (título) e a **descrição** do
// Milestone carrega Objetivo + Tarefas (checklist). O gerador lê Milestones (`gh api …/milestones?
// state=all`) + Issues e renderiza épico+objetivo+tarefas, **reconciliando** cada `- [x] … → #N` com a
// Issue #N (fonte de status; **fail-closed** se `#N` sumiu). Itens `- [ ]` são propostas pendentes.
// **Fallback:** sem Milestones (template limpo / offline), agrupa por Issue via prefixo de título.
// Sem Project drafts nem mecânica draft↔épico (ADR-0026 supersede o item 1 do ADR-0025).
//
// **Limitação declarada (teto do veio de identidade — owner, Codex r4):** a reconciliação fail-closed
// cobre número, texto (por Milestone), membership e o sentido inverso (Issue atribuída ausente). NÃO
// valida (a) descrição com heading `Objetivo`/`Tarefas` **faltando/errado** (o input é sob nosso
// controle — a migração escreve o formato), nem (b) o traço `Promovida de:` no **corpo** da Issue (exige
// fetch de body + parse de traço; cenário contrived — `#N` errado que calha de ser outra Issue do mesmo
// épico). O `→ #N` da descrição é o link **aprovado no G1**; verificação de corpo fica como follow-up.
//
// CLI (Node >= 22.6 — onde `--experimental-strip-types` existe; o engines ">=22" do repo é mais largo):
//   node --experimental-strip-types tools/plan/plan-report.ts [--out <arquivo>] [--repo <owner/repo>]
//   node --experimental-strip-types tools/plan/plan-report.ts --input <issues.json>   # offline/fixture
import { writeFileSync, readFileSync, mkdirSync, existsSync, lstatSync, renameSync } from "node:fs";
import { dirname, resolve, sep, isAbsolute } from "node:path";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import process from "node:process";

export interface PlanIssue {
  number: number;
  title: string;
  state: string; // "OPEN" | "CLOSED" (gh `--json state`); comparado case-insensitive
  labels?: (string | { name?: string })[];
  milestone?: { title?: string | null; number?: number | null } | null;
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

/** Buffer do `execFileSync` (o default ~1 MiB estoura com muitas Issues/descrições — Codex). */
const GH_MAX_BUFFER = 64 * 1024 * 1024;

/**
 * Fonte indisponível (sem rede / sem auth / `gh` ausente). Distinta de erro de dado (truncamento,
 * resposta inválida): o ADR-0025 (linhas 97–103, 344–351) manda **degradar para relatório vazio**
 * neste caso — o offline vê o ponteiro, não falha. Truncamento/dado inválido continuam falha fechada.
 */
export class FetchUnavailableError extends Error {}

/** Erro de uso da CLI (flag sem valor, etc.) — falha fechada com mensagem de uso (Codex r3). */
export class UsageError extends Error {}

/**
 * Valida a forma mínima de uma Issue (Codex r3/r4): `[{}]` não pode virar `#undefined … undefined`, e
 * um `state` fora de `OPEN`/`CLOSED` (ex.: `"BANANA"`) não pode ser silenciosamente tratado como fechado
 * — `isOpen` produziria um plano plausível-mas-falso. `state` é validado contra o enum.
 */
export function isValidIssue(x: unknown): x is PlanIssue {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.number === "number" &&
    typeof o.title === "string" &&
    typeof o.state === "string" &&
    /^(open|closed)$/i.test(o.state)
  );
}

/** Valida um array de Issues antes de renderizar/resumir; falha **fechada** no primeiro inválido. */
export function validateIssues(arr: unknown[], origin: string): PlanIssue[] {
  arr.forEach((x, idx) => {
    if (!isValidIssue(x)) {
      throw new Error(
        `${origin}: Issue inválida no índice ${idx} — number/title/state ausentes ou state fora de ` +
          "OPEN/CLOSED (resposta não confiável; falha fechada em vez de gerar relatório falso).",
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
  // Prefixo tem precedência sobre menção no meio (Codex r5): `O9 — … da T8.1` é O9, não O8.
  const leadingT = t.match(/^T(\d+)\.\d+/i);
  if (leadingT) return `O${leadingT[1]}`;
  const leadingO = t.match(/^O(\d+)\b/i);
  if (leadingO) return `O${leadingO[1]}`;
  const midT = t.match(/\bT(\d+)\.\d+/i); // fallback: tarefa citada no meio do título
  if (midT) return `O${midT[1]}`;
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
    issues: [...list].sort((a, b) => Number(isOpen(b)) - Number(isOpen(a)) || a.number - b.number),
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
  // O sentinela `(sem épico)` agrupa fixes/chores sem épico — NÃO é um épico real (Codex r6).
  const epics = new Set(issues.map(epicOf));
  epics.delete(SEM_EPICO);
  return {
    epics: epics.size,
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
    throw new UsageError(
      `a opção ${name} exige um valor (recebeu ${val === undefined ? "nada" : `\`${val}\``}).`,
    );
  }
  return val;
}
const hasFlag = (name: string): boolean => process.argv.includes(name);

const VALUE_FLAGS = new Set(["--input", "--repo", "--out", "--milestones"]);
const BOOL_FLAGS = new Set(["--help", "-h"]);

/**
 * Recusa argumento desconhecido (Codex r5): um typo como `--inpt fixture.json` seria **ignorado** e a
 * CLI cairia no fetch ao vivo / sobrescreveria o relatório em vez de reclamar. Valida o argv inteiro.
 */
function assertKnownArgs(): void {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i]!;
    if (VALUE_FLAGS.has(tok)) {
      i++; // consome o valor (a presença/forma é validada em `arg()`)
      continue;
    }
    if (BOOL_FLAGS.has(tok)) continue;
    throw new UsageError(`argumento não reconhecido: ${tok} (use --help para ver as opções).`);
  }
}

/**
 * Node ≥22.6 é onde `--experimental-strip-types` existe (o `engines: ">=22"` do repo é mais largo). Em
 * runners que carregam o `.ts` sem essa flag (tsx/ts-node), esta guarda dá erro claro; sob a flag em
 * <22.6 o próprio Node recusa a flag antes daqui (Codex r5).
 */
export function nodeSupportsStripTypes(version: string): boolean {
  const m = version.match(/^v?(\d+)\.(\d+)/);
  if (!m) return true; // versão irreconhecível: não bloquear
  const major = Number(m[1]);
  const minor = Number(m[2]);
  return major > 22 || (major === 22 && minor >= 6);
}

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
 * Recusa se QUALQUER componente do caminho (de `from` subindo até `stop`, inclusive) for symlink. É a
 * defesa **airtight** contra escape por symlink (Codex r6): ao contrário do `realpath`, que **segue** o
 * link (e deixava passar um symlink apontando p/ dentro do repo), aqui um componente symlink é sempre
 * recusado — não há "aponta pra onde". Componentes inexistentes (cauda a ser criada) são ignorados.
 */
function assertNoSymlinkComponent(from: string, stop: string): void {
  const top = resolve(stop);
  let cur = resolve(from);
  for (;;) {
    if (existsSync(cur) && lstatSync(cur).isSymbolicLink()) {
      throw new Error(
        `o caminho de scratch (${REPORTS_DIR}) contém um componente symlink (${cur}) — recusado ` +
          "para não escrever fora do diretório real de scratch.",
      );
    }
    if (cur === top) break;
    const parent = dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
}

/**
 * Restringe `--out` ao scratch `REPORTS_DIR` **ancorado na raiz do repo** (Codex P1/P2/r5/r6). O gerador
 * roda como chamada T1 permitida no tool-guard (ADR-0011); sem esta trava, `--out AGENTS.md` (ou um
 * symlink no caminho do scratch) truncaria um arquivo versionado **driblando a revisão**. Defesas:
 *  - **Raiz, não cwd** (P2): `baseDir` = raiz do repo; rodado de subdir o relatório ainda cai no scratch.
 *  - **Contenção léxica** (P1): o alvo precisa ficar sob `<raiz>/REPORTS_DIR` (rejeita `../`, externos).
 *  - **Sem symlink no caminho** (r5/r6): nenhum componente do scratch nem do dir-pai do alvo pode ser
 *    symlink, e o alvo em si não pode ser symlink — fecha o escape até p/ symlink **intra-repo**.
 * `baseDir` é injetável para teste; por padrão, a raiz do repo.
 */
export function resolveOutPath(out: string, baseDir: string = repoRoot()): string {
  const scratch = resolve(baseDir, REPORTS_DIR);
  const target = isAbsolute(out) ? resolve(out) : resolve(baseDir, out);
  if (target !== scratch && !target.startsWith(scratch + sep)) {
    throw new Error(
      `--out deve ficar dentro de ${REPORTS_DIR}/ na raiz do repo (scratch, gitignored) — recebido: ${out}. ` +
        "Um relatório gerado não sobrescreve arquivo versionado (governança/produto).",
    );
  }
  assertNoSymlinkComponent(scratch, baseDir); // scratch (de REPORTS_DIR até a raiz) sem symlink
  assertNoSymlinkComponent(dirname(target), scratch); // dir-pai do alvo, dentro do scratch, sem symlink
  if (existsSync(target) && lstatSync(target).isSymbolicLink()) {
    throw new Error(
      `--out aponta para um symlink (${out}) — recusado para não escrever fora do scratch.`,
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
    raw = execFileSync("gh", args, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: GH_MAX_BUFFER, // default ~1 MiB estoura (ENOBUFS) com muitas Issues/descrições (Codex)
    });
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

// ───────────────── Milestones (fonte-alvo do plano, ADR-0026) ─────────────────

/** Milestone do GitHub = **épico** (ADR-0026). Título = épico; descrição = Objetivo + Tarefas. */
export interface PlanMilestone {
  number: number;
  title: string;
  state: string; // OPEN/CLOSED (aqui não decide status de tarefa — quem decide é a Issue)
  description?: string | null;
}

/** Uma tarefa proposta na descrição do Milestone; `issue` presente = promovida (`- [x] … → #N`). */
export interface PlanTask {
  text: string;
  issue?: number;
}

/** Ordena Milestones: grupo `F<n>` antes de `O<n>`, cada um por número; resto ao fim. */
function milestoneSortKey(title: string): [number, number, string] {
  const m = title.trim().match(/^([FO])(\d+)\b/i);
  if (m) return [m[1]!.toUpperCase() === "F" ? 0 : 1, Number(m[2]), title];
  return [2, 0, title.toLowerCase()];
}

/**
 * Extrai `## Objetivo` e o checklist de `## Tarefas` da descrição do Milestone (ADR-0026). Cada item
 * `- [x] <texto> → #N` vira tarefa **promovida** (`issue=N`); `- [ ] <texto>` vira proposta **pendente**.
 */
export function parseMilestoneBody(description?: string | null): {
  objetivo: string;
  tasks: PlanTask[];
} {
  const lines = (description ?? "").split(/\r?\n/);
  let section: "objetivo" | "tarefas" | null = null;
  const objetivo: string[] = [];
  const tasks: PlanTask[] = [];
  for (const line of lines) {
    const h = line.match(/^\s*#{1,6}\s+(.*)$/);
    if (h) {
      const t = (h[1] ?? "").trim().toLowerCase();
      section = t.startsWith("objetivo") ? "objetivo" : t.startsWith("tarefa") ? "tarefas" : null;
      continue;
    }
    if (section === "objetivo") {
      if (line.trim()) objetivo.push(line.trim());
    } else if (section === "tarefas") {
      const m = line.match(/^\s*-\s*\[( |x|X)\]\s*(.*\S)\s*$/);
      if (!m) continue;
      const checked = m[1]!.toLowerCase() === "x";
      const raw = m[2]!;
      const ref = raw.match(/(?:→|->)\s*#(\d+)\s*$/);
      const text = ref ? raw.replace(/\s*(?:→|->)\s*#\d+\s*$/, "").trim() : raw.trim();
      // Codex: `[x]` ⟺ tem `→ #N` (promovida); `[ ]` sem ref (pendente). Estado malformado
      // (`[x]` sem ref, ou `[ ]` com ref) NÃO é classificado por conveniência — falha fechada.
      if (checked !== Boolean(ref)) {
        throw new Error(
          `descrição de Milestone malformada: "${raw}" — checkbox × referência inconsistentes ` +
            "(`[x]` exige `→ #N`; `[ ]` não pode ter). Falha fechada.",
        );
      }
      tasks.push(ref ? { text, issue: Number(ref[1]) } : { text });
    }
  }
  return { objetivo: objetivo.join(" "), tasks };
}

export function isValidMilestone(x: unknown): x is PlanMilestone {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.number === "number" &&
    typeof o.title === "string" &&
    typeof o.state === "string" &&
    /^(open|closed)$/i.test(o.state) // Codex: state fora de open/closed → falha fechada, não "fechado"
  );
}

export function validateMilestones(arr: unknown[], origin: string): PlanMilestone[] {
  arr.forEach((x, i) => {
    if (!isValidMilestone(x))
      throw new Error(`${origin}: Milestone inválido no índice ${i} (number/title/state).`);
  });
  return arr as PlanMilestone[];
}

/** Busca Milestones via `gh api` REST (não existe `gh milestone`); `state=all` senão os fechados somem. */
export function fetchMilestonesViaGh(repo?: string): PlanMilestone[] {
  const path = repo
    ? `repos/${repo}/milestones?state=all&per_page=100`
    : "repos/{owner}/{repo}/milestones?state=all&per_page=100"; // placeholders documentados do gh (Codex)
  let raw: string;
  try {
    // `--slurp` embrulha as páginas num array de arrays (parse estrutural — NÃO reescrever JSON cru,
    // que corromperia títulos/descrições com `][`, Codex). Achatamos abaixo.
    raw = execFileSync("gh", ["api", path, "--paginate", "--slurp"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: GH_MAX_BUFFER,
    });
  } catch (e) {
    const err = e as { status?: number; code?: string; stderr?: Buffer | string; message?: string };
    const detail = (err.stderr?.toString() ?? "").trim() || err.message || "erro desconhecido";
    const msg = `falha ao consultar Milestones via \`gh api\`. Detalhe: ${detail}`;
    const network =
      /could not resolve host|could not connect|network|connection refused|dial tcp|no such host|timed out|Get "https?:/i;
    if (err.code === "ENOENT" || err.status === 4 || network.test(detail))
      throw new FetchUnavailableError(`${msg} — offline/sem auth.`);
    throw new Error(`${msg} — erro operacional. Falha fechada.`);
  }
  const pages = JSON.parse(raw) as unknown; // com --slurp: array de páginas (cada página = array)
  if (!Array.isArray(pages)) throw new Error("resposta de Milestones (--slurp) não é um array");
  const flat = (pages as unknown[]).flat();
  return validateMilestones(flat, "gh api milestones");
}

/**
 * Renderiza o plano a partir dos **Milestones** (épico + Objetivo + Tarefas), reconciliando cada
 * `- [x] … → #N` com a Issue #N (fonte de status). **Fail-closed** se `#N` não existe entre as Issues
 * lidas (Codex: não mascarar Issue movida/apagada). Itens `- [ ]` são propostas pendentes. Sem
 * duplo-render: renderiza a **descrição** (não as Issues em separado); `→ #N` é o identificador estável.
 */
export function renderMilestonePlan(
  milestones: PlanMilestone[],
  issues: PlanIssue[],
  opts: RenderOpts = {},
): string {
  const byNum = new Map(issues.map((i) => [i.number, i]));
  const repo = opts.repo ?? "(repo atual)";
  const generatedAt = opts.generatedAt ?? "(sem timestamp)";
  const out: string[] = [];
  out.push(`# Plano (relatório gerado) — ${repo}`);
  out.push("");
  out.push(
    "> Gerado sob demanda de **GitHub Milestones (épico) + Issues** — fonte L1 (ADR-0026). Scratch em " +
      "`.orion/tmp/reports/` (**gitignored**), não versionado.",
  );
  out.push(`>`);
  out.push(`> Gerado em: ${generatedAt} · Fonte: ${opts.source ?? "gh (ao vivo)"}`);
  out.push("");
  const sorted = [...milestones].sort((a, b) => {
    const ka = milestoneSortKey(a.title);
    const kb = milestoneSortKey(b.title);
    return ka[0] - kb[0] || ka[1] - kb[1] || ka[2].localeCompare(kb[2]);
  });
  out.push(`**Resumo:** ${sorted.length} épico(s) (Milestones).`);
  out.push("");
  // Reconciliação 1:1 (ADR-0026): cada `#N` referenciado por NO MÁXIMO um Milestone (Codex: dedup).
  const consumed = new Map<number, string>();
  for (const ms of sorted) {
    const { objetivo, tasks } = parseMilestoneBody(ms.description);
    const estado = /open/i.test(ms.state) ? "aberto" : "fechado";
    out.push(`## ${ms.title} [${estado}]`);
    if (objetivo) out.push(`_${objetivo}_`);
    out.push("");
    if (tasks.length === 0) {
      out.push("_(sem tarefas)_");
    } else {
      const seenText = new Set<string>(); // identidade única de proposta POR Milestone (ADR-0026, Codex)
      for (const t of tasks) {
        const key = t.text.trim().toLowerCase();
        if (seenText.has(key)) {
          throw new Error(
            `Milestone "${ms.title}": proposta "${t.text}" aparece duas vezes — identidade de proposta ` +
              "não é única (ADR-0026). Falha fechada.",
          );
        }
        seenText.add(key);
        if (t.issue !== undefined) {
          const prev = consumed.get(t.issue);
          if (prev) {
            throw new Error(
              `#${t.issue} referenciada em dois épicos ("${prev}" e "${ms.title}") — a reconciliação ` +
                "do ADR-0026 é 1:1. Falha fechada.",
            );
          }
          const iss = byNum.get(t.issue);
          if (!iss) {
            throw new Error(
              `Milestone "${ms.title}": tarefa "${t.text}" referencia #${t.issue}, ` +
                "que não existe entre as Issues lidas (movida/apagada?). Falha fechada.",
            );
          }
          // Se a Issue está atribuída a um Milestone, ele TEM de ser este (Codex: Issue sob o épico
          // certo). Issue sem Milestone → o link autoritativo é o `→ #N` da descrição (aprovado no G1).
          const msNum = iss.milestone?.number;
          if (typeof msNum === "number" && msNum !== ms.number) {
            throw new Error(
              `#${t.issue} está atribuída ao Milestone #${msNum}, não a "${ms.title}" (#${ms.number}). Falha fechada.`,
            );
          }
          consumed.set(t.issue, ms.title);
          out.push(`- #${t.issue} [${isOpen(iss) ? "aberta" : "fechada"}] ${t.text}`);
        } else {
          out.push(`- [ ] ${t.text} _(proposta pendente)_`);
        }
      }
    }
    out.push("");
  }
  // Reconciliação no OUTRO sentido (Codex): uma Issue ATRIBUÍDA a um destes Milestones tem de aparecer
  // no checklist. Se não (promoção interrompida — Issue criada+atribuída mas a descrição não gravou),
  // falha fechada em vez de omiti-la em silêncio.
  const msNumbers = new Set(sorted.map((m) => m.number));
  for (const iss of issues) {
    const n = iss.milestone?.number;
    if (typeof n === "number" && msNumbers.has(n) && !consumed.has(iss.number)) {
      throw new Error(
        `Issue #${iss.number} está atribuída ao Milestone #${n} mas não aparece na descrição dele ` +
          "(promoção interrompida?). Falha fechada.",
      );
    }
  }
  return out.join("\n");
}

function main(): number {
  if (!nodeSupportsStripTypes(process.version)) {
    console.error(
      `Node ${process.version}: este tool exige Node >= 22.6 (--experimental-strip-types). Atualize o Node.`,
    );
    return 2;
  }
  if (hasFlag("--help") || hasFlag("-h")) {
    console.log(
      "Uso: plan-report.ts [--out <arq>] [--repo <owner/repo>] [--input <issues.json>] [--milestones <ms.json>]\n" +
        "  Gera o relatório de plano a partir de GitHub Milestones (épico) + Issues (ADR-0026).\n" +
        "  Com Milestones: épico + objetivo + tarefas (reconcilia `→ #N` com a Issue). Sem eles: agrupa por Issue.\n" +
        "  --input/--milestones usam JSON pré-buscado (fixture/offline); sem eles, busca ao vivo via `gh`.\n" +
        "  Saída padrão: .orion/tmp/reports/plan.md (scratch, gitignored).",
    );
    return 0;
  }
  const root = repoRoot();

  // Parse de args + destino ANTES de buscar (fail-fast). Flag sem valor (UsageError) e destino fora do
  // scratch são erros de uso → exit 2, sem tocar em rede nem em arquivo.
  let input: string | undefined;
  let msInput: string | undefined;
  let repo: string | undefined;
  let outPath: string;
  try {
    assertKnownArgs();
    input = arg("--input");
    msInput = arg("--milestones");
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

  // Milestones = fonte-alvo do plano (ADR-0026). Se houver, o relatório é épico(Milestone)+objetivo+
  // tarefas; senão, cai no agrupamento por Issue (template sem Milestones, ou offline vazio).
  let milestones: PlanMilestone[] = [];
  let msSource = "";
  let milestonesUnavailable = false;
  try {
    if (msInput) {
      const parsed = JSON.parse(readFileSync(msInput, "utf-8")) as unknown;
      if (!Array.isArray(parsed)) throw new Error(`--milestones ${msInput}: não é um array`);
      milestones = validateMilestones(parsed, `--milestones ${msInput}`);
      msSource = `--milestones ${msInput}`;
    } else if (!input) {
      milestones = fetchMilestonesViaGh(repo);
      msSource = "gh (ao vivo)";
    }
  } catch (e) {
    if (e instanceof FetchUnavailableError) {
      // Milestone é a FONTE do plano (objetivos/propostas só vivem na descrição). Se o fetch falhar,
      // NÃO cair no relatório só-Issues (que omite isso parecendo usável, Codex) — degradar para VAZIO
      // explícito, como a degradação offline do ADR-0025.
      console.warn(
        `aviso: Milestones indisponíveis (${(e as Error).message}) — relatório VAZIO/offline.`,
      );
      milestonesUnavailable = true;
    } else {
      console.error(`erro ao obter Milestones: ${(e as Error).message}`);
      return 2;
    }
  }

  const now = new Date().toISOString();
  let md: string;
  try {
    if (milestonesUnavailable) {
      md = renderMilestonePlan([], [], {
        repo,
        source: "Milestones indisponíveis (offline/sem auth) — plano não lido",
        generatedAt: now,
      });
    } else if (milestones.length > 0) {
      md = renderMilestonePlan(milestones, issues, {
        repo,
        // Proveniência auditável (Codex): a fonte do plano é o Milestone; Issues só dão status.
        source: `Milestones: ${msSource} · Issues: ${source}`,
        generatedAt: now,
      });
    } else {
      md = renderReport(issues, { repo, source, generatedAt: now });
    }
  } catch (e) {
    console.error(`erro ao renderizar o plano: ${(e as Error).message}`); // fail-closed (#N inválido)
    return 2;
  }
  // Escrita ATÔMICA (Codex r3/r4): grava num temp no mesmo dir (validado) e faz `rename` sobre o alvo. O
  // rename troca a **entrada de diretório**, não o inode — então um alvo hard/sym-linkado a um arquivo
  // versionado não é truncado pelo inode compartilhado. O temp usa **nome aleatório** e flag `wx`
  // (`O_CREAT|O_EXCL`): se o caminho já existir (ex.: symlink pré-plantado), o open **falha** em vez de
  // seguir o link — fecha também o vetor do temp previsível. Encerra a classe de links/temp.
  mkdirSync(dirname(outPath), { recursive: true });
  const tmp = `${outPath}.tmp-${randomBytes(9).toString("hex")}`;
  try {
    writeFileSync(tmp, md.endsWith("\n") ? md : md + "\n", { flag: "wx" });
    renameSync(tmp, outPath);
  } catch (e) {
    console.error(`erro ao gravar o relatório: ${(e as Error).message}`);
    return 2;
  }

  const s = summarize(issues);
  console.log("PLAN REPORT");
  console.log(`  Issues lidas:  ${s.total} (${s.open} abertas · ${s.closed} fechadas)`);
  console.log(
    `  Milestones:    ${milestones.length}${milestones.length > 0 ? " (fonte do plano)" : " — fallback por prefixo/Issue"}`,
  );
  console.log(`  épicos:        ${milestones.length > 0 ? milestones.length : s.epics}`);
  console.log(`  -> gravado em  ${outPath}`);
  if (s.total === 0 && milestones.length === 0)
    console.log("  (plano vazio — sem Milestones/Issues; correto num clone/template sem plano)");
  return 0;
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
