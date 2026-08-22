#!/usr/bin/env node
// pending-report.ts — Gerador do relatório de PENDÊNCIAS, OFFLINE (Orion, ADR-0025, fatia T9.7a).
//
// Projeta "o que falta" para leitura humana num relatório SOB DEMANDA: **Issues abertas** (o trabalho a
// fazer) + **verificação pendente no ledger** (`passes:false` no escopo, fora do legado). Saída em
// `.orion/tmp/reports/pending.md` (scratch, **gitignored** — NÃO é fonte versionada; a rede que impede um
// relatório de virar fonte é a T9.7b).
//
// **Adição pura (T9.7a):** nada sai do read-path.
//
// **Reuso, não segunda via (D6):** a parte de ledger **reusa** a classificação de lifecycle do
// `tools/ledger/ledger-origin.ts` (`inScope` + `classifyLifecycle`) — a mesma que o `--scoped` do ritual
// diário (get-bearings §7) usa; NÃO se reimplementa a semântica de `passes`. **Simplificação declarada:**
// um relatório não resolve a baseline de entrega `origin/main` (git), então usamos `deliveredIds = ∅` — o
// que colapsa "aguardando-flip" e "pendente" numa só lista de **verificação pendente**. O corte preciso
// entregue-vs-projetada-nesta-branch continua sendo do gate `ledger-origin --scoped`; aqui o objetivo é a
// leitura humana. As Issues reusam o acesso `gh` e as travas de escrita do plano.
//
// **Ledger-first para a parte de ledger:** o ledger/marcadores são **versionados** (no clone), então a
// seção de verificação pendente rende **offline**; as Issues abertas vêm do `gh` e degradam offline.
//
// CLI (Node >= 22.6):
// **Sem `--repo` (Codex #175 r2):** o ledger é local (`repoRoot()`); as Issues abertas vêm do repo local
// (`gh`), senão cruzaria fontes não relacionadas. Para offline/fixture, use `--input`.
//
//   node --experimental-strip-types tools/pending/pending-report.ts [--out <arq>] [--input <issues.json>]
import { writeFileSync, readFileSync, mkdirSync, renameSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import process from "node:process";
import {
  REPORTS_DIR,
  resolveOutPath,
  repoRoot,
  nodeSupportsStripTypes,
  FetchUnavailableError,
  UsageError,
  fetchIssuesViaGh,
  validateIssues,
  isOpen,
  groupByEpic,
  type PlanIssue,
} from "../plan/plan-report.ts";
import {
  loadScopedLedger,
  assertMarkersWellFormed,
  classifyLifecycle,
} from "../ledger/ledger-origin.ts";
import { validateLedgerEntries, assertUniqueIssueNumbers } from "../status/status-report.ts";
import type { LedgerItem } from "../ledger/ledger-guard.ts";

/** O que compõe o relatório: Issues abertas (trabalho) + entradas de ledger com verificação pendente. */
export interface PendingData {
  openIssues: PlanIssue[];
  pendingEntries: LedgerItem[]; // passes:false no escopo, fora do legado (via classifyLifecycle)
}

export interface PendingSummary {
  openIssues: number;
  pendingCriteria: number;
  pendingIssues: number; // Issues distintas com ≥1 critério pendente
}

export function summarizePending(data: PendingData): PendingSummary {
  return {
    openIssues: data.openIssues.length,
    pendingCriteria: data.pendingEntries.length,
    pendingIssues: new Set(data.pendingEntries.map((e) => e.issue)).size,
  };
}

/** Escapa o que muda ESTRUTURA de uma linha Markdown (título de Issue / descrição de ledger editáveis). */
function safe(text: string): string {
  return text
    .replace(/[\u0000-\u001f]+/g, " ") // controles/quebras -> nao injeta linhas/headings
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export interface RenderOpts {
  repo?: string;
  generatedAt?: string;
  source?: string;
  issuesAvailable?: boolean;
}

/** Renderiza o relatório Markdown. Função **pura** (sem I/O, sem relógio). */
export function renderReport(data: PendingData, opts: RenderOpts = {}): string {
  const repo = opts.repo ?? "(repo atual)";
  const generatedAt = opts.generatedAt ?? "(sem timestamp)";
  const source = opts.source ?? "(desconhecida)";
  const s = summarizePending(data);
  const out: string[] = [];
  out.push(`# Pendências (relatório gerado) — ${repo}`);
  out.push("");
  out.push(
    "> Relatório **gerado sob demanda**: **Issues abertas** (`gh`) + **verificação pendente** no ledger " +
      "(`feature-ledger.json`, `passes:false` no escopo). Scratch em `.orion/tmp/reports/` (**gitignored**): " +
      "não é fonte versionada. A fonte canônica é a Issue (L2) / o ledger (projeção); este é uma leitura derivada.",
  );
  out.push(`>`);
  out.push(`> Gerado em: ${generatedAt} · Fonte: ${source}`);
  out.push("");
  if (opts.issuesAvailable === false) {
    out.push(
      "> ⚠ Issues indisponíveis (offline/sem auth): a seção de Issues abertas fica vazia; a **verificação " +
        "pendente** abaixo vem do **ledger local** (no clone).",
    );
    out.push("");
  }
  out.push(
    `**Resumo:** ${s.openIssues} issue(s) aberta(s) · ${s.pendingCriteria} critério(s) de verificação ` +
      `pendente(s) em ${s.pendingIssues} issue(s).`,
  );
  out.push("");

  // ── Issues abertas (por épico) ─────────────────────────────────────────────
  out.push("## Issues abertas (por épico)");
  if (data.openIssues.length === 0) {
    out.push(
      opts.issuesAvailable === false
        ? "_Indisponível offline — rode com rede/`gh` para listar as Issues abertas._"
        : "_Nenhuma Issue aberta._",
    );
    out.push("");
  } else {
    for (const g of groupByEpic(data.openIssues)) {
      out.push(`### ${safe(g.epic)} (${g.issues.length})`);
      for (const i of g.issues) out.push(`- #${i.number} ${safe(i.title)}`);
      out.push("");
    }
  }

  // ── Verificação pendente no ledger ─────────────────────────────────────────
  out.push("## Verificação pendente no ledger (`passes:false`)");
  out.push(
    "_Critérios projetados ainda não verificados (flip `passes:true` devido após a entrega, ADR-0022). " +
      "O corte entregue-aguardando-flip vs. projetada-nesta-branch é do gate `ledger-origin --scoped`._",
  );
  out.push("");
  if (data.pendingEntries.length === 0) {
    out.push("_Nenhuma verificação pendente no escopo._");
    out.push("");
  } else {
    // Agrupa por issue, ordem decrescente (trabalho mais recente primeiro).
    const byIssue = new Map<number, LedgerItem[]>();
    for (const e of data.pendingEntries) {
      const arr = byIssue.get(e.issue);
      if (arr) arr.push(e);
      else byIssue.set(e.issue, [e]);
    }
    for (const issue of [...byIssue.keys()].sort((a, b) => b - a)) {
      const items = byIssue.get(issue)!;
      out.push(`### #${issue} (${items.length} pendente(s))`);
      for (const it of items) out.push(`- [ ] ${safe(it.acceptance)}`);
      out.push("");
    }
  }
  return out.join("\n");
}

// ─────────────────────────────────── I/O (main) ───────────────────────────────────

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i < 0) return undefined;
  const val = process.argv[i + 1];
  if (val === undefined || val.startsWith("--")) {
    throw new UsageError(
      `a opção ${name} exige um valor (recebeu ${val === undefined ? "nada" : `\`${val}\``}).`,
    );
  }
  return val;
}
const hasFlag = (name: string): boolean => process.argv.includes(name);

const VALUE_FLAGS = new Set(["--input", "--out"]);
const BOOL_FLAGS = new Set(["--help", "-h"]);

function assertKnownArgs(): void {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i]!;
    if (VALUE_FLAGS.has(tok)) {
      i++;
      continue;
    }
    if (BOOL_FLAGS.has(tok)) continue;
    throw new UsageError(`argumento não reconhecido: ${tok} (use --help para ver as opções).`);
  }
}

function loadIssuesFromInput(file: string): PlanIssue[] {
  const parsed = JSON.parse(readFileSync(file, "utf-8")) as unknown;
  if (!Array.isArray(parsed)) throw new Error(`--input ${file}: conteúdo não é um array de Issues`);
  // Rejeita número de Issue duplicado (Codex #175 r2): senão o pending contaria/listaria a mesma Issue duas vezes.
  return assertUniqueIssueNumbers(validateIssues(parsed, `--input ${file}`), `--input ${file}`);
}

/**
 * Calcula os critérios de verificação pendente reusando a **operação escopada canônica**
 * (`loadScopedLedger` — a mesma validação do `--scoped`) + `classifyLifecycle`. `deliveredIds = ∅` (um
 * relatório não resolve a baseline git) → colapsa aguardando-flip + pendente numa só lista de "pendente".
 * **Fail-closed** (lança): marcador de origem/lifecycle ausente ou inválido NÃO cai para "escopo inteiro"
 * em silêncio (senão um repo derivado listaria entradas herdadas do Orion como pendências locais — Codex
 * #175/#3). O chamador decide o exit. **Ledger-first:** ledger/marcadores são versionados (no clone).
 */
export function computePendingEntries(root: string, ledgerPath: string): LedgerItem[] {
  const { scoped, legacyIds } = loadScopedLedger(
    join(root, ".orion/ledger-origin.json"),
    ledgerPath,
    join(root, ".orion/ledger-lifecycle.json"),
  );
  const entries = validateLedgerEntries(scoped, ledgerPath);
  return classifyLifecycle(entries, legacyIds, new Set<string>()).pending;
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
      "Uso: pending-report.ts [--out <arq>] [--input <issues.json>]\n" +
        "  Gera as pendências: Issues abertas (`gh`) + verificação pendente no ledger (ADR-0025 — T9.7a).\n" +
        "  Reusa a classificação de lifecycle do `ledger-origin` (D6). Ledger-first: a parte de ledger rende offline.\n" +
        "  Ledger e Issues são do repo LOCAL (sem `--repo`/`--ledger`: cruzar repos não faz sentido).\n" +
        "  --input usa Issues pré-buscadas (fixture/offline).\n" +
        "  Saída padrão: .orion/tmp/reports/pending.md (scratch, gitignored). LÊ o ledger, nunca o escreve.",
    );
    return 0;
  }
  const root = repoRoot();

  let input: string | undefined;
  let outPath: string;
  try {
    assertKnownArgs();
    input = arg("--input");
    outPath = resolveOutPath(arg("--out") ?? `${REPORTS_DIR}/pending.md`, root);
  } catch (e) {
    console.error(`erro de uso: ${(e as Error).message}`);
    return 2;
  }
  const ledgerPath = join(root, "feature-ledger.json"); // sempre o do checkout (sem --ledger)

  // Ledger (local, versionado, escopado) → verificação pendente. AUSENTE → sem pendências (template sem
  // projeção): degrada — mas ainda valida a FORMA dos marcadores (malformado + ledger ausente também falha
  // fechado — Codex #175/#3). PRESENTE mas malformado (ledger ou marcador) → **falha fechada** (exit 2):
  // "0 pendências" mascararia corrupção/perda de verificação (Codex #175/#2/#3).
  let pendingEntries: LedgerItem[];
  if (!existsSync(ledgerPath)) {
    try {
      assertMarkersWellFormed(
        join(root, ".orion/ledger-origin.json"),
        join(root, ".orion/ledger-lifecycle.json"),
      );
    } catch (e) {
      console.error(`erro: marcador inválido (${(e as Error).message}) — falha fechada.`);
      return 2;
    }
    console.warn(
      `aviso: ledger ausente (${ledgerPath}) — sem pendências de ledger (template sem projeção).`,
    );
    pendingEntries = [];
  } else {
    try {
      pendingEntries = computePendingEntries(root, ledgerPath);
    } catch (e) {
      console.error(`erro: ledger/marcador inválido (${(e as Error).message}) — falha fechada.`);
      return 2;
    }
  }

  // Issues abertas (gh) → degradam offline; o ledger ainda rende.
  let issues: PlanIssue[] = [];
  let issuesAvailable = true;
  let source: string;
  if (input) {
    try {
      issues = loadIssuesFromInput(input);
      source = `ledger: ${ledgerPath} · Issues: --input ${input}`;
    } catch (e) {
      console.error(`erro ao obter Issues: ${(e as Error).message}`);
      return 2;
    }
  } else {
    try {
      issues = fetchIssuesViaGh(); // repo LOCAL (sem --repo): o ledger é local; cruzar repos não faz sentido
      source = `ledger: ${ledgerPath} · Issues: gh (ao vivo)`;
    } catch (e) {
      if (e instanceof FetchUnavailableError) {
        console.warn(`aviso: ${(e as Error).message}`);
        console.warn("Issues abertas omitidas (offline degrada — o ledger local ainda rende).");
        issuesAvailable = false;
        source = `ledger: ${ledgerPath} · Issues: indisponíveis (offline/sem auth)`;
      } else {
        console.error(`erro ao obter Issues: ${(e as Error).message}`);
        return 2;
      }
    }
  }

  const data: PendingData = { openIssues: issues.filter(isOpen), pendingEntries };
  const now = new Date().toISOString();
  const md = renderReport(data, { source, generatedAt: now, issuesAvailable });

  mkdirSync(dirname(outPath), { recursive: true });
  const tmp = `${outPath}.tmp-${randomBytes(9).toString("hex")}`;
  try {
    writeFileSync(tmp, md.endsWith("\n") ? md : md + "\n", { flag: "wx" });
    renameSync(tmp, outPath);
  } catch (e) {
    console.error(`erro ao gravar o relatório: ${(e as Error).message}`);
    return 2;
  }

  const s = summarizePending(data);
  console.log("PENDING REPORT");
  console.log(
    `  Issues abertas:        ${s.openIssues}${issuesAvailable ? "" : " (offline — indisponível)"}`,
  );
  console.log(
    `  Verificação pendente:  ${s.pendingCriteria} critério(s) em ${s.pendingIssues} issue(s)`,
  );
  console.log(`  -> gravado em          ${outPath}`);
  return 0;
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
