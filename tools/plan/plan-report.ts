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
// **Fonte do plano:** o épico é o **Milestone** (título) e a **descrição** é o plano. O leitor é
// **dual-format** (ADR-0031, fatia b #220): descrições **v2** = plano completo (`## Objetivo` + blocos de
// design por tarefa + `## Como iniciar`), renderizados ao lado das Issues **associadas** ao Milestone
// (estado nativo + `stateReason`; **sem** casamento 1:1 bloco↔Issue — follow-up #222); descrições
// **v1 legadas** (Objetivo + Tarefas em checklist) continuam lidas,
// reconciliando cada `- [x] … → #N` com a Issue #N (**fail-closed** se `#N` sumiu). Itens `- [ ]` são
// propostas pendentes.
// **Fallback:** sem Milestones (template limpo / offline), agrupa por Issue via prefixo de título.
// Sem Project drafts nem mecânica draft↔épico (ADR-0026 supersede o item 1 do ADR-0025).
//
// **Limitação declarada (teto do veio de identidade — owner, Codex r4):** a reconciliação fail-closed
// cobre número, texto (por Milestone), membership e o sentido inverso (Issue atribuída ausente). NÃO
// valida (a) descrição com heading `Objetivo`/`Tarefas` **faltando/errado** (o input é sob nosso
// controle — a migração escreve o formato), nem (b) o traço `Promovida de:` no **corpo** da Issue (exige
// fetch de body + parse de traço; cenário contrived — `#N` errado que calha de ser outra Issue do mesmo
// épico). No **v1**, o `→ #N` da descrição é o link **aprovado no G1**; no **v2** o link é a associação
// nativa ao Milestone + o traço `Promovida de:` no corpo. Verificação de corpo fica como follow-up.
// Também (c) **migração parcial/incremental**: se só ALGUNS Milestones existem, o modo Milestone ignora
// Issues legadas não-referenciadas (o prefixo-bridge só age sem Milestones). No Orion a migração é
// **completa** (14 Milestones); para adoção incremental do template, preservar/fail-close legadas é
// follow-up.
//
// CLI (Node >= 22.6 — onde `--experimental-strip-types` existe; o engines ">=22" do repo é mais largo):
//   node --experimental-strip-types tools/plan/plan-report.ts [--out <arquivo>] [--repo <owner/repo>]
//   node --experimental-strip-types tools/plan/plan-report.ts --input <issues.json>   # offline/fixture
import { writeFileSync, readFileSync, readdirSync, mkdirSync, existsSync, lstatSync, renameSync } from "node:fs";
import { dirname, resolve, join, sep, isAbsolute } from "node:path";
import { parseAdr } from "../adr/adr-index.ts";
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
  // gh `--json stateReason`: COMPLETED | NOT_PLANNED | DUPLICATE | REOPENED | null (só relevante p/
  // CLOSED). Só `completed` conta como **concluída** (ADR-0031: not planned/duplicate ≠ concluída).
  stateReason?: string | null;
  // gh `--json body` — corpo da Issue; fonte do traço `Promovida de:` (ADR-0032, casamento do leitor v2).
  body?: string | null;
  // gh `--json createdAt` — timestamp UTC; insumo do corte `t*` do grandfather (ADR-0032 II.5).
  createdAt?: string | null;
}

/** Classe do traço `Promovida de:` no corpo da Issue (ADR-0032 Parte I). */
export type ProvenanceTrace =
  | { klass: "A"; milestoneNumber: number; epicTitle: string; blockId: string; hasSnapshot: boolean }
  | { klass: "B"; origin: string }
  | { klass: "none" } // sem linha `Promovida de:` (bootstrap legítimo OU ausente — o casamento decide)
  | { klass: "malformed"; raw: string }; // tem `Promovida de:` mas não casa A nem B

export interface EpicGroup {
  epic: string;
  issues: PlanIssue[];
}

const SEM_EPICO = "(sem épico)";

/** Diretório de saída permitido — scratch, gitignored. Um relatório **nunca** vira fonte versionada. */
export const REPORTS_DIR = ".orion/tmp/reports";

/**
 * Sentinela legível por máquina emitido no **topo** de todo relatório gerado (T9.7b / mecanismo D4). O
 * guard de coerência (CHECK 5) faz `git grep` da forma **montada** e reprova qualquer arquivo VERSIONADO
 * que a contenha fora de `.orion/tmp/reports/` — assim `git add -f` de um relatório gerado quebra o CI
 * (o buraco que o `.gitignore` não fecha). É **verificação, não convenção**.
 *
 * Montado por concatenação DE PROPÓSITO: a forma verbatim NÃO pode aparecer num arquivo **rastreado**
 * (este fonte, o guard, os testes) — senão o `git grep` morderia o próprio código. Só o relatório GERADO
 * (em `.orion/tmp/reports/`, gitignored) carrega a forma montada. Não altere para um literal único.
 */
export const GENERATED_REPORT_SENTINEL = "<!-- " + "orion:generated-report" + " -->";

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
  // `stateReason` é opcional; se presente (string não-vazia), tem de ser um valor do ENUM do gh
  // (COMPLETED/NOT_PLANNED/DUPLICATE/REOPENED). Um typo como "COMPLETE" NÃO pode ser aceito em silêncio —
  // `isCompleted` o trataria como não-concluída e a contagem sairia errada (Codex #K). null/undefined/"" OK.
  const sr = o.stateReason;
  const srOk =
    sr === undefined ||
    sr === null ||
    (typeof sr === "string" && (sr === "" || /^(completed|not_planned|duplicate|reopened)$/i.test(sr)));
  // `milestone`, se não-null, DEVE ter `number` numérico (Codex #H): um snapshot com `{title:"O11"}` ou
  // `{number:"16"}` faria a reconciliação v2 (por `milestone.number`) falhar em silêncio ("0 promovidas").
  const ms = o.milestone;
  const msOk =
    ms === undefined ||
    ms === null ||
    (typeof ms === "object" && typeof (ms as Record<string, unknown>).number === "number");
  // `body`/`createdAt` (ADR-0032): se presentes, DEVEM ser string ou null — senão `parsePromovidaDe`
  // quebraria (`matchAll is not a function`) e um `createdAt` não-string corromperia o corte `t*` (Codex).
  const strOrNil = (v: unknown) => v === undefined || v === null || typeof v === "string";
  return (
    typeof o.number === "number" &&
    typeof o.title === "string" &&
    typeof o.state === "string" &&
    /^(open|closed)$/i.test(o.state) &&
    srOk &&
    msOk &&
    strOrNil(o.body) &&
    strOrNil(o.createdAt)
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
 * Status nativo da Issue lendo `stateReason` (ADR-0031). Uma Issue **CLOSED** só é **concluída** quando
 * `stateReason` é `completed`; fechada como `not planned`/`duplicate` **não** conta como concluída (é
 * abandono/duplicata). CLOSED sem reason conhecido (`null`/reopened/outro) fica "fechada" — não afirma
 * conclusão. OPEN → "aberta". Aplica-se aos dois formatos (v1 legado e v2).
 */
export function issueStatusLabel(i: PlanIssue): string {
  if (isOpen(i)) return "aberta";
  const r = (i.stateReason ?? "").trim();
  if (/^not_planned$/i.test(r)) return "fechada (não planejada)";
  if (/^duplicate$/i.test(r)) return "fechada (duplicata)";
  if (/^completed$/i.test(r)) return "concluída";
  return "fechada"; // CLOSED sem reason conhecido — não afirma "concluída" (ADR-0031)
}
/** `true` só quando a Issue está **concluída** (CLOSED + `completed`) — usado na contagem do plano. */
export function isCompleted(i: PlanIssue): boolean {
  return !isOpen(i) && /^completed$/i.test((i.stateReason ?? "").trim());
}

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
  // Issues indisponíveis (offline) mas Milestones lidos: preserva a estrutura dos Milestones e marca o
  // status como **não lido**, em vez de reconciliar contra `[]` e reportar "0 promovidas"/"0 épicos" (Codex #D).
  issuesUnavailable?: boolean;
  // Casamento v2 (ADR-0032) — injetados p/ manter o render **puro** (o `main()` carrega dos arquivos):
  grandfatherByMilestone?: Map<number, Set<number>>; // conjuntos congelados em t*, POR Milestone
  acceptedAdrs?: Set<string>; // ADRs aceitos (ex.: "ADR-0031") — origem causal de classe B
  knownRefs?: Set<number>; // #s de Issues **e PRs** existentes (resolve origem causal de classe B)
}

/** Renderiza o relatório Markdown. Função **pura** (sem I/O, sem relógio) — `generatedAt` é injetado. */
export function renderReport(issues: PlanIssue[], opts: RenderOpts = {}): string {
  const repo = opts.repo ?? "(repo atual)";
  const generatedAt = opts.generatedAt ?? "(sem timestamp)";
  const source = opts.source ?? "(desconhecida)";
  const s = summarize(issues);
  const groups = groupByEpic(issues);

  const out: string[] = [];
  out.push(GENERATED_REPORT_SENTINEL); // 1ª linha: marca de relatório gerado (CHECK 5 do guard, T9.7b)
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
 * Sinal RECONHECIDO de indisponibilidade do `gh` (→ degrada para vazio) vs. erro operacional (→ falha
 * fechada). Reconhece: `gh` ausente (**ENOENT**), auth requerida (**exit 4**) e mensagens de rede no
 * stderr/mensagem — **incluindo a mensagem PADRÃO do próprio `gh` sem rede** (`error connecting to …` /
 * `check your internet connection`), que sai com **exit 1** e antes caía como erro operacional (Codex
 * #159 achado #1 → follow-up #160). Unifica a classificação antes **duplicada e divergente** entre
 * `fetchIssuesViaGh` e `fetchMilestonesViaGh` (o `network` solto do 2º era largo demais — sujeito a
 * falso-positivo; as frases específicas cobrem os erros reais de rede do `gh`/git).
 */
const GH_UNAVAILABLE_STDERR =
  /could not resolve host|could not connect|network is unreachable|connection refused|dial tcp|no such host|temporary failure in name resolution|i\/o timeout|timed out|Get "https?:|error connecting to|check your internet connection/i;

export function isGhUnavailable(err: {
  code?: string;
  status?: number;
  stderr?: Buffer | string;
  message?: string;
}): boolean {
  const text = `${err.stderr?.toString() ?? ""} ${err.message ?? ""}`;
  return err.code === "ENOENT" || err.status === 4 || GH_UNAVAILABLE_STDERR.test(text);
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
    "number,title,state,labels,milestone,stateReason,body,createdAt",
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
    // (ENOENT), auth requerida (exit 4) ou erro de rede/offline no stderr (ver `isGhUnavailable`). Repo
    // inexistente/permissão/API são erros OPERACIONAIS → falha fechada (não mascarar como "plano vazio").
    if (isGhUnavailable(err)) {
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

/**
 * Números dos **PRs** (`gh pr list`) — Issues e PRs compartilham o espaço de #s; a origem causal de classe B
 * pode citar um PR (ADR-0032). **Resiliente:** offline/sem auth/erro → `[]` (a resolução só perde PRs, não
 * falha o relatório — a falha-fechada de origem inválida continua no `reconcileV2`).
 */
export function fetchPrNumbersViaGh(repo?: string): number[] {
  const args = ["pr", "list", "--state", "all", "--limit", String(ISSUE_FETCH_LIMIT), "--json", "number"];
  if (repo) args.push("-R", repo);
  let raw: string;
  try {
    raw = execFileSync("gh", args, {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: GH_MAX_BUFFER,
    });
  } catch (e) {
    const err = e as { status?: number; code?: string; stderr?: Buffer | string; message?: string };
    // Só INDISPONIBILIDADE (offline/sem auth/`gh` ausente) degrada p/ `[]`; erro OPERACIONAL (API/permissão)
    // propaga — senão uma origem-B a PR seria "não-resolvível" em silêncio por dado que falhou ao ler (Codex).
    if (isGhUnavailable(err)) return [];
    const detail = err.stderr?.toString().trim() || err.message || "erro desconhecido";
    throw new Error(`falha ao consultar PRs via \`gh pr list\`: ${detail} — erro operacional. Falha fechada.`);
  }
  const parsed = JSON.parse(raw) as unknown;
  // Resposta com forma errada = dado corrompido (não indisponibilidade) → falha explícita, como o fetch de
  // Issues; retornar `[]` esconderia origem-B a PR como "não-resolvível" (Codex).
  if (!Array.isArray(parsed)) throw new Error("resposta do `gh pr list` não é um array");
  // Truncamento é dado incompleto (não indisponibilidade) → falha EXPLÍCITA, senão uma origem causal a um
  // PR antigo (>500) seria rejeitada como "não-resolvível" em silêncio (Codex).
  assertNotTruncated(parsed.length, ISSUE_FETCH_LIMIT);
  return parsed
    .map((x) => (x as { number?: unknown }).number)
    .filter((n): n is number => typeof n === "number");
}

/**
 * Slug `owner/repo` do checkout local (via `git remote get-url origin`), ou null se indeterminável.
 *
 * **CAVEAT (cap Codex r7):** num checkout **sem remote `origin`** retorna `null` → `--repo <self>` é tratado
 * como remoto e o metadado v2 local (grandfather/ADRs) é descartado (um relatório local via `--repo` do
 * próprio repo perderia a leniência do O11). É edge (o uso canônico é **sem** `--repo`; um repo real tem
 * `origin`). Mitigação: rodar **sem** `--repo` no checkout local. Não bloqueamos o modo por isso.
 */
export function localRepoSlug(): string | null {
  try {
    const url = execFileSync("git", ["remote", "get-url", "origin"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const m = url.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?\/?$/);
    return m ? m[1]! : null;
  } catch {
    return null;
  }
}

function loadFromInput(file: string): PlanIssue[] {
  const parsed = JSON.parse(readFileSync(file, "utf-8")) as unknown;
  if (!Array.isArray(parsed)) throw new Error(`--input ${file}: conteúdo não é um array de Issues`);
  return validateIssues(parsed, `--input ${file}`);
}

// ───────────────── Milestones (fonte-alvo do plano; v2 ADR-0031, v1 legado ADR-0026) ─────────────────

/** Milestone do GitHub = **épico**. Título = épico; descrição = plano (v2: plano completo — ADR-0031; v1 legado: Objetivo + Tarefas). */
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

/** Formato da descrição do Milestone: **v2** se há bloco de design `### <n>. <nome>` **ou** um
 *  `## Como iniciar` (marcador v2, ADR-0031 §2/§6); senão **v1** (checklist `## Tarefas`). Detectar o
 *  `## Como iniciar` também garante que um header de bloco **malformado** (ex.: `### 1 Task`, sem ponto)
 *  caia no parser v2 e **falhe-fechado**, em vez de escorregar para o v1 e sumir do relatório (Codex). */
/** Zera as linhas DENTRO de code fences (``` / ~~~) — a linha de cerca e o conteúdo viram "". Um `### `
 *  ou `## Como iniciar` dentro de um exemplo cercado (comum em Milestone v1 legado) NÃO é heading real
 *  (Codex #M): sem isso, o fetch live (state=all) num v1 com fence quebraria o relatório inteiro. */
function stripFences(desc: string): string {
  let inFence = false;
  return (desc ?? "")
    .split(/\r?\n/)
    .map((l) => {
      if (/^[ \t]*(?:```|~~~)/.test(l)) {
        inFence = !inFence;
        return "";
      }
      return inFence ? "" : l;
    })
    .join("\n");
}

export function detectMilestoneFormat(description?: string | null): "v1" | "v2" {
  // v1 NUNCA usa `###` (é `## Objetivo` + `## Tarefas` + checklist). QUALQUER `### ` REAL (fora de fence)
  // ⇒ v2 (mesmo malformado, cai no parser v2 e falha-fechado — Codex #E). `## Como iniciar` idem. Um
  // `###`/`## Como iniciar` DENTRO de fence é exemplo, não heading — ignorado (Codex #M).
  const d = stripFences(description ?? "");
  return /^[ \t]*###[ \t]/m.test(d) || /^[ \t]*##[ \t]+como iniciar\b/im.test(d) ? "v2" : "v1";
}

/**
 * Parser **v2** (ADR-0031 §2). Extrai `## Objetivo` e os **nomes** das tarefas dos blocos `### <n>. <nome>`.
 * **Fail-closed** nos essenciais **estruturais** dos quais a reconciliação depende: falta de `## Objetivo`,
 * cabeçalho `###` que não casa `### <n>. <nome>` (Codex: um typo como `### 1 Task` não pode escorregar para
 * o v1 e sumir do relatório), nome de tarefa repetido, e ausência de `## Como iniciar`. O `## Como iniciar`
 * é a **fronteira** que encerra a lista — texto com forma de bloco depois dele (inclusive no fence do
 * prompt) é ignorado (Codex).
 *
 * **NÃO** valida a gramática **profunda** dos 5 campos do bloco (rótulos em negrito na ordem). Isso é
 * **author-side** e vira **follow-up**: o próprio exemplo canônico (Milestone O11) **não** traz `**Escopo.**`
 * em 2 dos 3 blocos, então um leitor que falhe-fechado nos 5 rótulos **rejeitaria o canônico** e quebraria o
 * get-bearings — pior que a lacuna. O casamento 1:1 bloco↔Issue via `Promovida de:` (exige buscar o corpo)
 * também é follow-up. No v2 a promoção é lida pelo **estado nativo** (Issue associada ao Milestone).
 */
export function parseMilestoneBodyV2(description?: string | null): {
  objetivo: string;
  taskNames: string[];
  blocks: { id: string; body: string }[];
} {
  const lines = (description ?? "").split(/\r?\n/);
  const objetivo: string[] = [];
  const taskNames: string[] = [];
  const blocks: { id: string; body: string }[] = []; // corpo de cada bloco (p/ igualdade de snapshot, ADR-0032)
  let curId: string | null = null;
  let curBody: string[] = [];
  const flushBlock = () => {
    if (curId !== null) blocks.push({ id: curId, body: curBody.join("\n").trim() });
    curId = null;
    curBody = [];
  };
  const seen = new Set<string>(); // nomes de tarefa (únicos)
  const seenOrd = new Set<string>(); // ordinais `<n>` (únicos — o identificador é `<n>. <nome>`, Codex #F)
  let section: "objetivo" | "block" | null = null;
  let objetivoCount = 0; // `## Objetivo` tem de ser ÚNICO e vir ANTES do 1º bloco (Codex #A)
  let hasComoIniciar = false;
  let comoIniciarContent = false; // `## Como iniciar` não pode ser vazio (Codex #C, ADR-0031 §6)
  let afterComoIniciar = false; // fronteira: após ele, só medimos conteúdo; ignora `### N.` do prompt
  let inFence = false; // dentro de ``` / ~~~ : `###`/`##` são exemplo, não heading (Codex #M)

  for (const line of lines) {
    if (afterComoIniciar) {
      if (line.trim()) comoIniciarContent = true; // qualquer conteúdo não-vazio no prompt
      continue;
    }
    if (/^[ \t]*(?:```|~~~)/.test(line)) {
      inFence = !inFence; // a própria cerca não é heading; se estiver no objetivo, conta como conteúdo
      if (section === "objetivo" && line.trim()) objetivo.push(line.trim());
      else if (section === "block") curBody.push(line);
      continue;
    }
    if (inFence) {
      // conteúdo cercado: nunca é heading/bloco (Codex #M). Se no objetivo, preserva como texto.
      if (section === "objetivo" && line.trim()) objetivo.push(line.trim());
      else if (section === "block") curBody.push(line);
      continue;
    }
    const h2 = line.match(/^[ \t]*##[ \t]+(.*)$/); // `## …` (não `###`)
    if (h2) {
      const t = (h2[1] ?? "").trim().toLowerCase();
      if (t === "como iniciar") {
        // heading reservado casado por IGUALDADE (Codex #N): `## Como iniciar later` NÃO é a fronteira.
        flushBlock();
        hasComoIniciar = true;
        afterComoIniciar = true; // fronteira: encerra a coleta de tarefas (Codex #3)
        continue;
      }
      if (t === "objetivo") {
        objetivoCount += 1;
        if (objetivoCount > 1)
          throw new Error("Milestone v2: `## Objetivo` repetido — deve ser único (ADR-0031 §2). Falha fechada.");
        flushBlock();
        section = "objetivo";
        continue;
      }
      // Num corpo v2 os ÚNICOS H2 válidos são `## Objetivo` e `## Como iniciar` — a fronteira do bloco é o
      // próximo `###` ou `## Como iniciar` (ADR-0031 §2). Um H2 extra (ex.: `## Restrições`) truncaria o bloco
      // e o snapshot casaria só o prefixo → rejeita como gramática inválida (Codex).
      // CAVEAT (heurística, cap Codex r7): um `## X` **indentado como code** (4+ espaços) dentro de um campo
      // é lido aqui como H2 e rejeita o Milestone. Distinguir indented-code é CommonMark; exemplo assim num
      // campo é contrived — fica à revisão humana (renomear/remover o exemplo). Não perseguimos CommonMark.
      throw new Error(
        `Milestone v2: heading H2 inesperado "## ${(h2[1] ?? "").trim()}" — só \`## Objetivo\` e ` +
          "`## Como iniciar` são válidos (blocos são `###`; ADR-0031 §2). Falha fechada.",
      );
    }
    const h3 = line.match(/^[ \t]*###[ \t]+(.*)$/); // cabeçalho de bloco de design
    if (h3) {
      flushBlock();
      if (objetivoCount === 0)
        throw new Error(
          "Milestone v2: bloco `### <n>. <nome>` antes do `## Objetivo` — a descrição deve começar pelo " +
            "objetivo (ADR-0031 §2). Falha fechada.",
        );
      const m = (h3[1] ?? "").match(/^(\d+)\.[ \t]+(\S.*?)[ \t]*$/);
      if (!m)
        throw new Error(
          `Milestone v2: cabeçalho de bloco malformado "### ${(h3[1] ?? "").trim()}" — esperado ` +
            "`### <n>. <nome>` (ADR-0031 §2). Falha fechada.",
        );
      const ord = m[1]!;
      if (seenOrd.has(ord))
        throw new Error(
          `Milestone v2: ordinal de tarefa "${ord}." repetido — o identificador \`<n>. <nome>\` deve ser ` +
            "único (o prompt seleciona o menor `<n>` não-promovido; ADR-0031 §2). Falha fechada.",
        );
      seenOrd.add(ord);
      const nome = m[2]!.trim();
      // O nome NÃO pode conter aspa dupla: a proveniência classe A o cita entre `"..."` (ADR-0032) e uma `"`
      // embutida seria irrepresentável → toda Issue do bloco viraria malformada. Rejeita no G1 (Codex).
      if (nome.includes('"'))
        throw new Error(
          `Milestone v2: nome de tarefa com aspa dupla ("${nome}") — irrepresentável na proveniência ` +
            "`Promovida de: … — \"<n>. <nome>\"` (ADR-0032). Renomeie sem aspas. Falha fechada.",
        );
      const key = nome.toLowerCase();
      if (seen.has(key))
        throw new Error(
          `Milestone v2: bloco de tarefa "${nome}" duplicado — o nome deve ser único no Milestone ` +
            "(ADR-0031 §2). Falha fechada.",
        );
      seen.add(key);
      // Identificador **verbatim** do cabeçalho (apara só as bordas) — NÃO reconstruir `${ord}. ${nome}`,
      // senão `### 1.  Alpha` (2 espaços) viraria `1. Alpha` e divergiria da proveniência copiada (Codex).
      const id = (h3[1] ?? "").trim();
      taskNames.push(id);
      curId = id; // abre a coleta do corpo deste bloco
      section = "block";
      continue;
    }
    if (section === "objetivo" && line.trim()) objetivo.push(line.trim());
    else if (section === "block") curBody.push(line);
  }
  flushBlock();

  if (objetivo.length === 0)
    throw new Error("Milestone v2: sem `## Objetivo` na descrição (ADR-0031 §2). Falha fechada.");
  if (taskNames.length === 0)
    throw new Error("Milestone v2: sem bloco de tarefa `### <n>. <nome>` (ADR-0031 §2). Falha fechada.");
  if (!hasComoIniciar)
    throw new Error("Milestone v2: sem `## Como iniciar` (ADR-0031 §6). Falha fechada.");
  if (!comoIniciarContent)
    throw new Error("Milestone v2: `## Como iniciar` vazio — exige um prompt não-vazio (ADR-0031 §6). Falha fechada.");
  return { objetivo: objetivo.join(" "), taskNames, blocks };
}

/** Os 5 rótulos do bloco de design (ADR-0031 §2), na ordem canônica. */
export const FIVE_LABELS = ["Necessidade", "Escopo", "Forma dos critérios", "Classe", "Dependências"];

/**
 * Classifica o traço `Promovida de:` no **corpo** da Issue (ADR-0032 Parte I). NÃO decide casamento
 * (isso é o leitor, com a identidade do Milestone/corte) — só o **formato**:
 * - **A** promoção de bloco: `Milestone #M ("<épico>") — "<n>. <nome>"` (+ `hasSnapshot` se o corpo
 *   traz `## Objetivo` e os 5 rótulos);
 * - **B** follow-up: `follow-up — <origem>`;
 * - **none**: sem linha `Promovida de:` (bootstrap legítimo ou ausente);
 * - **malformed**: tem a linha mas não casa A nem B.
 * O rótulo pode vir em negrito (`**Promovida de:**`) e a linha pode estar prefixada por `>` (blockquote).
 *
 * **LIMITAÇÃO declarada (heurística, §8.1 — cap consciente, Codex r7):** NÃO exclui regiões de código do
 * corpo — um `Promovida de:` **dentro de uma cerca ``` ``` ``` ou indentado como code** é lido como traço
 * real. Distinguir texto de exemplo cercado é profundidade CommonMark; o corpo da Issue é escrito pelo
 * autor no G1, então um exemplo cercado com um traço plausível é caso contrived — fica à **revisão humana**.
 */
export function parsePromovidaDe(body?: string | null): ProvenanceTrace {
  const text = body ?? "";
  // TODAS as linhas `Promovida de:` (rótulo com **negrito balanceado** opcional / prefixo `>`; valor pode
  // ser vazio — a placeholder de bootstrap conta). Contrato **traço único** (ADR-0032): 0 → none;
  // >1 → malformed (não classifica a 1ª e ignora a 2ª); ênfase desbalanceada → malformed.
  // `(\*+)?` (qualquer nº de estrelas) para DETECTAR toda declaração — inclusive não-canônica (`*`, `***`),
  // senão uma 2ª declaração escaparia da uniqueness. A canonicidade da ênfase é checada depois.
  const lineRe = /^[ \t]*(?:>[ \t]*)?(\*+)?Promovida de:(\*+)?[ \t]*(.*?)[ \t]*$/gm;
  const matches = [...text.matchAll(lineRe)];
  if (matches.length === 0) return { klass: "none" };
  if (matches.length > 1) return { klass: "malformed", raw: "múltiplos traços Promovida de:" };
  const [, open = "", close = "", restRaw = ""] = matches[0]!;
  // Ênfase canônica: nenhuma OU um par `**…**` balanceado. `*…*`, `***…***`, desbalanceada → malformed.
  if (open !== close || !(open === "" || open === "**"))
    return { klass: "malformed", raw: "ênfase não-canônica no rótulo" };
  const rest = restRaw.trim();
  if (rest === "") return { klass: "none" };
  // (A) Milestone #<M> ("<título>") — "<n>. <nome>". Delimitador **em dash `—`** (canônico, ADR-0032);
  // ancorado ao FIM da linha (lixo após o `"<n>. <nome>"` → não é A → malformed; linha completa).
  const a = rest.match(/^Milestone\s+#(\d+)\s*\(\s*"([^"]+)"\s*\)\s*—\s*"(\d+\.\s+[^"]+)"$/);
  if (a) {
    // Preserva o identificador VERBATIM (só apara bordas) — o casamento 1:1 é exato; `parseMilestoneBodyV2`
    // também preserva o espaço interno do cabeçalho, então NÃO colapsar aqui (senão diverge — Codex).
    const blockId = (a[3] ?? "").trim();
    // Heading do snapshot tem de ser EXATAMENTE `## Objetivo` (não `## Objetivo extra`/`-old`); aceita CRLF.
    const hasObjetivo = /(^|\n)[ \t]*##[ \t]+Objetivo[ \t]*(?:\r?\n|$)/.test(text);
    // Rótulos EXATOS (ADR-0031 §2): 4 com ponto, `**Classe**` sem — `\.?` frouxo aceitaria `**Necessidade**`
    // ou `**Classe.**` e certificaria snapshot malformado como presente (Codex). `includes` do token exato.
    const labelToken = (name: string) => "**" + name + (name === "Classe" ? "" : ".") + "**";
    const hasFields = FIVE_LABELS.every((l) => text.includes(labelToken(l)));
    return {
      klass: "A",
      milestoneNumber: Number(a[1]),
      epicTitle: (a[2] ?? "").trim(),
      blockId,
      hasSnapshot: hasObjetivo && hasFields,
    };
  }
  // (B) follow-up — <origem> (delimitador **em dash `—`** canônico; hífen ASCII → malformed)
  const b = rest.match(/^follow-up\s*—\s*(\S.*)$/i);
  if (b) return { klass: "B", origin: (b[1] ?? "").trim() };
  return { klass: "malformed", raw: rest };
}

/** Resultado do casamento v2 (ADR-0032): blocos casados 1:1 + Issues fora dos blocos (B/legado). */
export interface V2Reconciliation {
  matched: { blockId: string; issue: number }[];
  outsideBlocks: number[];
}

/**
 * Igualdade **material** (ADR-0032 II.2): **preserva a indentação à esquerda** (estrutura Markdown — nested
 * vs sibling é drift), só apara à direita; descarta linhas vazias e **delimitadores de cerca** (o snapshot
 * vem cercado em ` ```text ` no template SDD, o bloco do Milestone não — Codex). Tolera CRLF/espaço final.
 */
function normalizeBlockText(s: string): string {
  return s
    .split(/\r?\n/)
    .map((l) => l.replace(/[ \t]+$/, ""))
    .filter((l) => l !== "" && !/^[ \t]*(?:```|~~~)/.test(l))
    .join("\n");
}

/**
 * Extrai a seção `## <heading>` **ou** `### <heading>` de um corpo, até o próximo heading `##`/`###`.
 *
 * **LIMITAÇÃO declarada (heurística, não garantia — §8.1):** a igualdade de snapshot é uma **rede**, como o
 * `coherence-guard`/`state-budget-check`. O snapshot do template SDD vem envolto numa cerca ``` ```text ```
 * (as `###` internas SÃO os headings reais); `normalizeBlockText` descarta as cercas. **Casos residuais**
 * deixados à **revisão humana** (re-G1): (a) uma cerca de EXEMPLO *dentro* de um campo (o `###`/`##` dela
 * seria lido como fronteira) e (b) mudança **só de whitespace** que altera a estrutura Markdown (parágrafos
 * fundidos, hard-break de 2 espaços). Perseguir isso é reimplementar CommonMark; a garantia material é o G1.
 */
function extractSection(body: string, level: "##" | "###", heading: string): string | null {
  const lines = body.split(/\r?\n/);
  const esc = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headRe = new RegExp("^[ \\t]*" + level + "[ \\t]+" + esc + "[ \\t]*$");
  const i = lines.findIndex((l) => headRe.test(l));
  if (i < 0) return null;
  const out: string[] = [];
  for (let j = i + 1; j < lines.length; j++) {
    if (/^[ \t]*#{2,3}[ \t]+/.test(lines[j]!)) break; // próximo `##`/`###`
    out.push(lines[j]!);
  }
  return normalizeBlockText(out.join("\n"));
}

/**
 * Casa as Issues associadas a um Milestone **v2** com seus blocos (ADR-0032 Parte II). **Corte-primeiro**:
 * Issue no conjunto grandfather (associada em `t*`) nunca falha — vai para `outsideBlocks`. Pós-corte:
 * classe A casa **1:1** por identidade completa (Milestone #M + título + `<n>. <nome>` + **snapshot que
 * casa**); classe B (origem causal/distinta) = `outsideBlocks`; fail-closed em dangling/dupla/épico-errado/
 * snapshot-ausente-ou-divergente/traço-ausente-ou-malformado.
 */
export function reconcileV2(
  milestone: PlanMilestone,
  blocks: { id: string; body: string }[],
  issues: PlanIssue[],
  opts: {
    grandfatherIds: Set<number>;
    knownIssues?: Set<number>; // #s de Issues/PRs existentes (p/ resolver a origem causal de classe B)
    acceptedAdrs?: Set<string>; // ADRs aceitos (ex.: "ADR-0031") — origem causal válida
  },
): V2Reconciliation {
  const knownIssues = opts.knownIssues ?? new Set(issues.map((i) => i.number));
  const acceptedAdrs = opts.acceptedAdrs ?? new Set<string>();
  const assoc = issues
    .filter((i) => i.milestone?.number === milestone.number)
    .sort((a, b) => a.number - b.number);
  const matched: { blockId: string; issue: number }[] = [];
  const outsideBlocks: number[] = [];
  const consumed = new Map<string, number>(); // blockId → #issue (1:1)
  const seenIssues = new Set<number>(); // #issue já processada (rejeita registros duplicados — `--input`)
  const blockById = new Map(blocks.map((b) => [b.id, b]));
  const msObjetivo = extractSection(milestone.description ?? "", "##", "Objetivo");

  for (const iss of assoc) {
    if (seenIssues.has(iss.number))
      throw new Error(
        `#${iss.number}: registro **duplicado** de Issue na reconciliação — o casamento é 1:1 ` +
          "(um `--input`/fetch com número repetido não pode promover múltiplas tarefas). Falha fechada.",
      );
    seenIssues.add(iss.number);
    if (opts.grandfatherIds.has(iss.number)) {
      // Corte-primeiro: pré-`t*`/legado nunca falha (ADR-0032 II.1), mesmo com traço tipo A não-conforme.
      outsideBlocks.push(iss.number);
      continue;
    }
    const t = parsePromovidaDe(iss.body);
    if (t.klass === "A") {
      if (t.milestoneNumber !== milestone.number || t.epicTitle !== milestone.title)
        throw new Error(
          `#${iss.number}: traço classe A cita Milestone #${t.milestoneNumber} ("${t.epicTitle}") ≠ ` +
            `associação nativa #${milestone.number} ("${milestone.title}") — épico errado. Falha fechada.`,
        );
      const block = blockById.get(t.blockId);
      if (!block)
        throw new Error(
          `#${iss.number}: bloco "${t.blockId}" inexistente na descrição do Milestone #${milestone.number} ` +
            "(dangling). Falha fechada.",
        );
      const prev = consumed.get(t.blockId);
      if (prev !== undefined)
        throw new Error(
          `bloco "${t.blockId}" promovido por duas Issues (#${prev} e #${iss.number}) — o casamento é 1:1 ` +
            "(dupla promoção da mesma tarefa). Falha fechada.",
        );
      if (!t.hasSnapshot)
        throw new Error(
          `#${iss.number}: classe A **sem snapshot** (## Objetivo + 5 campos) no corpo — ADR-0032 II.2. ` +
            "Falha fechada.",
        );
      const snapBlock = extractSection(iss.body ?? "", "###", t.blockId);
      const snapObj = extractSection(iss.body ?? "", "##", "Objetivo");
      if (snapBlock !== normalizeBlockText(block.body) || snapObj !== msObjetivo)
        throw new Error(
          `#${iss.number}: snapshot do bloco "${t.blockId}" **diverge** da descrição do Milestone ` +
            "(edição material pós-G1 → re-G1). Falha fechada.",
        );
      consumed.set(t.blockId, iss.number);
      matched.push({ blockId: t.blockId, issue: iss.number });
    } else if (t.klass === "B") {
      // Origem causal, DISTINTA e RESOLVÍVEL (ADR-0032 II.4): `#<n>` de Issue/PR **pré-existente** (n < esta,
      // e conhecida) OU um `ADR-00NN` **aceito**. Auto-referência, bloco do épico, `#` inexistente, ADR não
      // aceito ou texto solto ("banana") → fail-closed (senão vira rota de evasão do 1:1).
      // Antes de resolver `#N`: uma origem cuja **estrutura** é classe A (a linha COMEÇA com `Milestone #M`)
      // é um bloco/milestone disfarçado de B — rejeita. Ancorado no INÍCIO (`^`): um `#220 (bug em Milestone
      // #16)` legítimo NÃO é rejeitado só por mencionar "Milestone #16" na prosa (Codex — corrige regressão).
      if (/^Milestone\s+#\d+/i.test(t.origin) || /—\s*"?\d+\.\s+\S/.test(t.origin))
        throw new Error(
          `#${iss.number}: classe B com **identificador de bloco** ("${t.origin}") — classe B NÃO carrega ` +
            "`— \"<n>. <nome>\"` (ADR-0032); um bloco anexado burlaria o snapshot/1:1. Use classe A. Falha fechada.",
        );
      const issRef = t.origin.match(/#0*(\d+)\b/);
      const adrRef = t.origin.match(/\bADR-(\d{4})\b/i);
      let resolves = false;
      if (issRef) {
        const n = Number(issRef[1]);
        if (n === iss.number)
          throw new Error(
            `#${iss.number}: classe B com **auto-referência** (#${iss.number}) — a origem tem de ser um ` +
              "artefato DISTINTO (ADR-0032). Falha fechada.",
          );
        resolves = n < iss.number && knownIssues.has(n); // pré-existente (id menor) e conhecida
      } else if (adrRef) {
        resolves = acceptedAdrs.has("ADR-" + adrRef[1]);
      }
      if (!resolves)
        throw new Error(
          `#${iss.number}: classe B com origem não-resolvível ("${t.origin}") — exige um \`ADR-00NN\` aceito ` +
            "ou um `#<n>` de Issue/PR pré-existente e conhecido (ADR-0032 II.4). Falha fechada.",
        );
      outsideBlocks.push(iss.number);
    } else {
      // none (vazio) ou malformed pós-corte num Milestone v2 → fail-closed (bootstrap não é v2-associado).
      throw new Error(
        `#${iss.number}: traço \`Promovida de:\` **ausente/malformado** num Milestone v2 pós-corte ` +
          "(ADR-0032 II.3). Falha fechada.",
      );
    }
  }
  return { matched, outsideBlocks };
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
    if (isGhUnavailable(err)) throw new FetchUnavailableError(`${msg} — offline/sem auth.`);
    throw new Error(`${msg} — erro operacional. Falha fechada.`);
  }
  const pages = JSON.parse(raw) as unknown; // com --slurp: array de páginas (cada página = array)
  if (!Array.isArray(pages)) throw new Error("resposta de Milestones (--slurp) não é um array");
  const flat = (pages as unknown[]).flat();
  return validateMilestones(flat, "gh api milestones");
}

/**
 * Lê `tools/plan/grandfather-v2.json` e devolve o conjunto congelado **por Milestone** (Map nº→Set de #s).
 * Preserva a chave `(milestone, issue)`: uma Issue movida **para outro** Milestone v2 depois de `t*` **não**
 * é grandfathered lá (ADR-0032 II.5) — por isso NÃO se achata numa união global (Codex).
 */
export function loadGrandfatherByMilestone(baseDir: string = repoRoot()): Map<number, Set<number>> {
  const f = join(baseDir, "tools/plan/grandfather-v2.json");
  const out = new Map<number, Set<number>>();
  if (!existsSync(f)) return out;
  const data = JSON.parse(readFileSync(f, "utf-8")) as { milestones?: Record<string, number[]> };
  for (const [ms, arr] of Object.entries(data.milestones ?? {})) out.set(Number(ms), new Set(arr));
  return out;
}

/**
 * Varre `docs/decisions/*.md` e devolve os ADRs **aceitos** (ex.: "ADR-0031"). Reusa o **parser canônico**
 * `parseAdr` (só o preâmbulo, sem cercas/comentários) — um `- **Status:** aceito` de EXEMPLO no corpo de um
 * ADR `proposto` NÃO o marca aceito (Codex).
 */
export function loadAcceptedAdrs(baseDir: string = repoRoot()): Set<string> {
  const dir = join(baseDir, "docs/decisions");
  const out = new Set<string>();
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (!/\.md$/i.test(name)) continue;
    const entry = parseAdr({ name, content: readFileSync(join(dir, name), "utf-8") });
    if (entry && entry.status === "aceito") out.add(entry.id);
  }
  return out;
}

/** Os 5 rótulos, na ordem canônica (ADR-0031 §2): 4 com ponto, `**Classe**` sem. */
function blockLabelTokens(): string[] {
  return FIVE_LABELS.map((n) => "**" + n + (n === "Classe" ? "" : ".") + "**");
}

/**
 * Um bloco **pendente** tem de ter os 5 rótulos NA ORDEM, cada um **abrindo uma linha** (fora de cerca) —
 * `indexOf` cru aceitaria os tokens em prosa/exemplo cercado (Codex); aqui casa `**Rótulo.**` no início da
 * linha, fora de ``` ``` ```. Fail-closed (ADR-0031 §2).
 */
function assertBlockGrammar(blockId: string, body: string): void {
  const tokens = blockLabelTokens();
  let ti = 0;
  let inFence = false;
  for (const line of body.split(/\r?\n/)) {
    if (/^[ \t]*(?:```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    // ≤3 espaços de indentação: 4+ espaços/tab é **code block** no Markdown, não um rótulo de campo (Codex).
    const stripped = line.replace(/^ {0,3}/, "");
    if (ti < tokens.length && stripped.startsWith(tokens[ti]!)) ti++;
  }
  if (ti < tokens.length)
    throw new Error(
      `Milestone v2: bloco pendente "${blockId}" sem o rótulo ${tokens[ti]} abrindo uma linha, na ordem ` +
        "canônica (Necessidade./Escopo./Forma dos critérios./Classe/Dependências.) — ADR-0031 §2. Falha fechada.",
    );
}

/**
 * Renderiza o plano a partir dos **Milestones** (dual-format). **v2** (ADR-0031/0032): lista os blocos e,
 * via `reconcileV2`, os **casados 1:1** + os "fora dos blocos" (classe B/legado), **fail-closed** no que o
 * contrato exige; e **cobra a gramática dos 5 campos nos blocos PENDENTES** (não casados) de Milestones sem
 * grandfather (os congelados/O11 ficam leniência — grandfather). **v1** legado = reconcilia `- [x] … → #N`.
 */
export function renderMilestonePlan(
  milestones: PlanMilestone[],
  issues: PlanIssue[],
  opts: RenderOpts = {},
): string {
  const byNum = new Map(issues.map((i) => [i.number, i]));
  const issuesUnknown = opts.issuesUnavailable === true; // Issues offline: preserva Milestones, status não lido
  // Casamento v2 (ADR-0032) — injetados por `opts` (render puro); `main()` carrega dos arquivos.
  const grandfatherByMs = opts.grandfatherByMilestone ?? new Map<number, Set<number>>();
  const acceptedAdrs = opts.acceptedAdrs ?? new Set<string>();
  const knownRefs = opts.knownRefs ?? new Set(issues.map((i) => i.number)); // fallback: só Issues (testes)
  const repo = opts.repo ?? "(repo atual)";
  const generatedAt = opts.generatedAt ?? "(sem timestamp)";
  const out: string[] = [];
  out.push(GENERATED_REPORT_SENTINEL); // 1ª linha: marca de relatório gerado (CHECK 5 do guard, T9.7b)
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
    const estado = /open/i.test(ms.state) ? "aberto" : "fechado";
    const fmt = detectMilestoneFormat(ms.description);
    out.push(`## ${ms.title} [${estado}]${fmt === "v2" ? " · v2" : ""}`);

    if (fmt === "v2") {
      // v2 (ADR-0031/0032): descrição = blocos de design; casamento pelo estado NATIVO via `reconcileV2`.
      // O título do épico é citado entre `"..."` na proveniência classe A (ADR-0032); uma aspa dupla nele
      // seria irrepresentável → toda Issue viraria malformada. Rejeita no G1 (mesma regra do nome do bloco).
      if (ms.title.includes('"'))
        throw new Error(
          `Milestone v2 "${ms.title}": título com aspa dupla — irrepresentável na proveniência classe A ` +
            "(ADR-0032). Renomeie o épico sem aspas. Falha fechada.",
        );
      const { objetivo, blocks } = parseMilestoneBodyV2(ms.description);
      if (objetivo) out.push(`_${objetivo}_`);
      out.push("");
      out.push(`**Tarefas planejadas (${blocks.length}):**`);
      for (const b of blocks) out.push(`- ${b.id}`);
      out.push("");
      // Grandfather POR Milestone (ADR-0032 II.5). Um Milestone com conjunto congelado (ex.: O11) é
      // **frozen** → gramática leniente (não se reescreve plano concluído); um sem, tem os blocos cobrados.
      const gfSet = grandfatherByMs.get(ms.number) ?? new Set<number>();
      const isFrozenMilestone = gfSet.size > 0;
      if (issuesUnknown) {
        // Offline: sem reconciliação (precisa das Issues), mas a **gramática é intrínseca** ao Milestone
        // (ADR-0032) — cobra os blocos de um Milestone NÃO-frozen, para a validade não depender da rede.
        if (!isFrozenMilestone) for (const b of blocks) assertBlockGrammar(b.id, b.body);
        out.push("_(status das Issues não lido — offline; Milestone lido, promoções não reconciliadas)_");
        out.push("");
        continue;
      }
      const assoc = issues.filter((i) => i.milestone?.number === ms.number);
      const rec = reconcileV2(ms, blocks, issues, {
        grandfatherIds: gfSet,
        knownIssues: knownRefs,
        acceptedAdrs,
      });
      // Marca as reconciliadas (casadas + fora dos blocos); dedup 1:1 GLOBAL — um mesmo `#N` em dois
      // Milestones (ex.: `--input` montado à mão) → falha fechada (Codex).
      const consume = (n: number) => {
        const prev = consumed.get(n);
        if (prev !== undefined)
          throw new Error(
            `#${n} reconciliada em dois Milestones ("${prev}" e "${ms.title}") — o casamento é 1:1. ` +
              "Falha fechada.",
          );
        consumed.set(n, ms.title);
      };
      for (const m of rec.matched) consume(m.issue);
      for (const n of rec.outsideBlocks) consume(n);
      const byNum = new Map(assoc.map((i) => [i.number, i]));
      const label = (n: number) => {
        const i = byNum.get(n)!;
        return `- #${n} [${issueStatusLabel(i)}] ${i.title}`;
      };
      if (rec.matched.length === 0 && rec.outsideBlocks.length === 0) {
        out.push("_(nenhuma Issue promovida ainda)_");
      } else {
        if (rec.matched.length > 0) {
          const done = rec.matched.filter((m) => isCompleted(byNum.get(m.issue)!)).length;
          out.push(`**Promovidas (casadas 1:1) (${rec.matched.length} · ${done} concluída(s)):**`);
          for (const m of [...rec.matched].sort((a, b) => a.issue - b.issue))
            out.push(`- ${m.blockId} ← #${m.issue} [${issueStatusLabel(byNum.get(m.issue)!)}]`);
        }
        if (rec.outsideBlocks.length > 0) {
          out.push("");
          out.push(`**Associadas fora dos blocos (${rec.outsideBlocks.length}):**`);
          for (const n of [...rec.outsideBlocks].sort((a, b) => a - b)) out.push(label(n));
        }
      }
      // Gramática dos 5 campos (ADR-0031 §2) em **todos** os blocos de um Milestone NÃO-frozen — inclusive
      // os **casados**: um match não prova gramática (o `hasSnapshot` acha rótulos em qualquer lugar do
      // corpo; bloco+snapshot podem ambos omitir um campo — Codex). Frozen (O11) fica leniente.
      if (!isFrozenMilestone) for (const b of blocks) assertBlockGrammar(b.id, b.body);
      out.push("");
      continue;
    }

    // v1 (legado/congelado, ADR-0026): checklist `## Tarefas` com reconciliação `→ #N`.
    const { objetivo, tasks } = parseMilestoneBody(ms.description);
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
          // O 1:1 (`→ #N` referenciado por no máx. um épico) é verificável só pela DESCRIÇÃO — independe do
          // status das Issues. Então rejeita duplicado + registra ANTES do ramo offline (Codex #Q); só a
          // existência/status da Issue é que exige o fetch (pulado quando offline).
          const prev = consumed.get(t.issue);
          if (prev) {
            throw new Error(
              `#${t.issue} referenciada em dois épicos ("${prev}" e "${ms.title}") — a reconciliação ` +
                "do ADR-0026 é 1:1. Falha fechada.",
            );
          }
          consumed.set(t.issue, ms.title);
          if (issuesUnknown) {
            // Issues offline: 1:1 já garantido acima; mostra o `#N` sem reconciliar existência/status.
            out.push(`- #${t.issue} [status não lido] ${t.text}`);
            continue;
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
          out.push(`- #${t.issue} [${issueStatusLabel(iss)}] ${t.text}`); // (consumed já registrado acima)
        } else {
          out.push(`- [ ] ${t.text} _(proposta pendente)_`);
        }
      }
    }
    out.push("");
  }
  // Reconciliação no OUTRO sentido (Codex): uma Issue ATRIBUÍDA a um destes Milestones tem de aparecer
  // no relatório — no v1 pelo checklist (`→ #N`), no v2 pela associação nativa (já consumida acima). Se
  // sobrar uma Issue associada e NÃO consumida, é promoção interrompida (v1: descrição não gravou o
  // `→ #N`) → falha fechada em vez de omiti-la em silêncio.
  const msNumbers = new Set(sorted.map((m) => m.number));
  for (const iss of issues) {
    const n = iss.milestone?.number;
    if (typeof n === "number" && msNumbers.has(n) && !consumed.has(iss.number)) {
      throw new Error(
        `Issue #${iss.number} está atribuída ao Milestone #${n} mas não foi reconciliada ` +
          "(v1: falta `→ #N` na descrição — promoção interrompida?). Falha fechada.",
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
        "  Gera o relatório de plano a partir de GitHub Milestones (épico) + Issues (ADR-0026/0031).\n" +
        "  Dual-format: Milestone v1 (checklist `## Tarefas`, reconcilia `→ #N`) ou v2 (blocos de design\n" +
        "  `### <n>. <nome>` + `## Como iniciar`; reconcilia pela associação NATIVA da Issue, sem `→ #N`;\n" +
        "  ADR-0031). Sem Milestones: agrupa por Issue.\n" +
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
  let issuesUnavailable = false; // Issues indisponíveis (offline) ⇒ não dá p/ reconciliar status (Codex #B)
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
        issuesUnavailable = true; // sem Issues não há como reconciliar status (Codex #B): não é "0 promovidas"
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
  // Metadado v2 (grandfather/ADRs) é do checkout LOCAL: aplica quando não há `--repo` OU quando ele nomeia o
  // **próprio** checkout (Codex — `--repo <self>` não deve descartar o metadado). Só cross-repo real descarta.
  const localMeta = !repo || repo === localRepoSlug();
  let md: string;
  try {
    if (milestonesUnavailable) {
      // Milestones (fonte do plano) indisponíveis → relatório vazio explícito (ADR-0025).
      md = renderMilestonePlan([], [], {
        repo,
        source: "Milestones indisponíveis (offline/sem auth) — plano não lido",
        generatedAt: now,
      });
    } else if (issuesUnavailable) {
      // Issues offline mas Milestones lidos (Codex #B/#D): PRESERVA os Milestones e marca o status como
      // não lido — nunca descartá-los para "0 épicos"/"0 promovidas" (leria como dado real). ADR-0025.
      md = renderMilestonePlan(milestones, [], {
        repo,
        source: "Issues indisponíveis (offline/sem auth) — Milestones lidos, status não reconciliado",
        generatedAt: now,
        issuesUnavailable: true,
        // Como no ramo online: metadado v2 é LOCAL — com `--repo` (alvo remoto) não aplicar (colisão de #s).
        grandfatherByMilestone: localMeta ? loadGrandfatherByMilestone() : new Map(),
      });
    } else if (milestones.length > 0) {
      if (!localMeta)
        console.warn(
          "aviso: --repo definido — metadados v2 do checkout LOCAL (grandfather-v2.json, ADRs aceitos) NÃO " +
            "são aplicados a um alvo remoto (ADR-0032); a reconciliação v2 pode falhar-fechado em Issues " +
            "não-conformes do alvo.",
        );
      md = renderMilestonePlan(milestones, issues, {
        repo,
        // Proveniência auditável (Codex): a fonte do plano é o Milestone; Issues só dão status.
        source: `Milestones: ${msSource} · Issues: ${source}`,
        generatedAt: now,
        // Metadado v2 é do **checkout local** (ADR-0032). Com `--repo` (alvo remoto), NÃO aplicar
        // grandfather/ADRs locais — números colidem e exemtariam/aceitariam por engano (Codex). Só PRs vêm
        // do alvo (`repo`), pois resolvem origem-B do próprio alvo.
        grandfatherByMilestone: localMeta ? loadGrandfatherByMilestone() : new Map(),
        acceptedAdrs: localMeta ? loadAcceptedAdrs() : new Set<string>(),
        // Issues ∪ PRs. PRs só quando **há Milestone v2** (só o casamento v2 usa `knownRefs`) e **ao vivo**
        // (`gh`): em FIXTURE (`--input`) não consulta estado vivo (determinismo). Assim um relatório só-v1
        // não aborta por truncamento/erro de PR-list à toa (Codex).
        knownRefs: new Set([
          ...issues.map((i) => i.number),
          ...(input || !milestones.some((m) => detectMilestoneFormat(m.description) === "v2")
            ? []
            : fetchPrNumbersViaGh(repo)),
        ]),
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
  if (milestonesUnavailable) {
    // O resumo tem de casar com o corpo (relatório VAZIO) — não anunciar fallback usável (Codex).
    console.log("  Milestones:    indisponíveis (offline/sem auth) — relatório VAZIO");
    console.log("  épicos:        0");
  } else {
    console.log(
      `  Milestones:    ${milestones.length}${milestones.length > 0 ? " (fonte do plano)" : " — fallback por prefixo/Issue"}`,
    );
    console.log(`  épicos:        ${milestones.length > 0 ? milestones.length : s.epics}`);
  }
  console.log(`  -> gravado em  ${outPath}`);
  if (!milestonesUnavailable && s.total === 0 && milestones.length === 0)
    console.log("  (plano vazio — sem Milestones/Issues; correto num clone/template sem plano)");
  return 0;
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
