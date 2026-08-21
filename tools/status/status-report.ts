#!/usr/bin/env node
// status-report.ts — Gerador do relatório de STATUS POR ISSUE, OFFLINE (Orion, ADR-0025, fatia T9.7a).
//
// Projeta o **status de cada Issue** — critérios de aceite e `passes` — para leitura humana num relatório
// SOB DEMANDA. Saída em `.orion/tmp/reports/status.md` (scratch, **gitignored** — NÃO é fonte versionada;
// um relatório committado recriaria a fonte autoral que o O9 elimina; a rede de verificação disso é a T9.7b).
//
// **Adição pura (T9.7a):** nada sai do read-path; só adiciona um relatório derivado.
//
// **Ledger-first (distinção do plano/história — deliberada).** As fontes de status são o **ledger**
// (`feature-ledger.json`, projeção de VERIFICAÇÃO — ADR-0006/0016; **versionado, no clone**) e as **Issues**
// (metadados via `gh`). Ao contrário do plano/história (GitHub-sourced → offline = vazio), o ledger é
// **local**: offline o relatório ainda mostra critérios/`passes` do ledger — só os metadados vivos da Issue
// (título/estado/épico) degradam. É coerente com o ritual diário, que já lê o ledger local
// (`ledger-origin --scoped`, get-bearings §7). O relatório **lê** o ledger, **nunca** o escreve (D6/limites).
//
// **Acesso (D6 — reuso, não segunda via):** Issues via o idioma `gh → json → tool` do plano; travas de
// escrita (`resolveOutPath`/`REPORTS_DIR`) e utilitários reusados de `tools/plan/plan-report.ts` — segurança
// crítica NÃO é re-derivada. `--input` consome JSON de Issues pré-buscado (fixture/offline). **Sem rede/sem
// auth** o fetch de Issues **degrada** (metadados ausentes), NÃO falha; truncamento/resposta inválida falham
// fechado. As funções puras são exportadas para vitest (o `smoke-test`/CI NÃO chama rede — usa fixture).
//
// CLI (Node >= 22.6 — onde `--experimental-strip-types` existe; o engines ">=22.6" do repo casa):
//   node --experimental-strip-types tools/status/status-report.ts [--out <arq>] [--repo <owner/repo>]
//   node --experimental-strip-types tools/status/status-report.ts --input <issues.json> [--ledger <l.json>]
import { writeFileSync, readFileSync, mkdirSync, renameSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import process from "node:process";
// Reuso das travas de escrita/segurança e do acesso a Issues já PROVADOS na fatia T9.3a (plan-report):
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
  epicOf,
  type PlanIssue,
} from "../plan/plan-report.ts";
import { loadScopedLedger } from "../ledger/ledger-origin.ts";
import type { LedgerItem } from "../ledger/ledger-guard.ts";

/** Uma Issue e seus critérios projetados no ledger, com o veredito `passes` por critério. */
export interface StatusRow {
  issue: number;
  title?: string; //  metadado vivo da Issue (gh) — ausente offline
  open?: boolean; //  estado da Issue (gh) — ausente offline
  epic?: string; //   épico (Milestone/prefixo) — ausente offline
  criteria: { acceptance: string; passes: boolean }[];
  passed: number; //  quantos critérios com passes:true
  total: number; //   total de critérios projetados
}

/**
 * Valida a forma mínima de uma entrada de ledger para status (fail-closed): `issue` número, `acceptance`
 * string, `passes` boolean. Um ledger corrompido (campo faltando/tipo errado) NÃO pode virar um status
 * plausível-mas-falso — rejeita em vez de renderizar "0/0" ou `undefined` (mesma postura do plano).
 */
export function isValidLedgerEntry(x: unknown): x is LedgerItem {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.issue === "number" && typeof o.acceptance === "string" && typeof o.passes === "boolean"
  );
}

/** Valida o array de entradas antes de agrupar; falha **fechada** no primeiro inválido. */
export function validateLedgerEntries(arr: unknown[], origin: string): LedgerItem[] {
  arr.forEach((x, idx) => {
    if (!isValidLedgerEntry(x)) {
      throw new Error(
        `${origin}: entrada de ledger inválida no índice ${idx} — issue/acceptance/passes ausentes ou ` +
          "com tipo errado (ledger não confiável; falha fechada em vez de gerar status falso).",
      );
    }
  });
  return arr as LedgerItem[];
}

/**
 * Constrói o status por Issue: agrupa o ledger por `issue` (ordem estável de projeção) e junta os
 * metadados da Issue (`gh`) por número. Uma entrada sem Issue correspondente (offline, ou Issue removida)
 * mantém os critérios do ledger e omite os metadados — o ledger é a espinha. Ordena por número
 * **decrescente** (trabalho mais recente primeiro). Função **pura** (sem I/O).
 */
export function buildStatus(ledger: LedgerItem[], issues: PlanIssue[]): StatusRow[] {
  const byNum = new Map<number, PlanIssue>(issues.map((i) => [i.number, i]));
  const groups = new Map<number, { acceptance: string; passes: boolean }[]>();
  for (const e of ledger) {
    const arr = groups.get(e.issue);
    const crit = { acceptance: e.acceptance, passes: e.passes };
    if (arr) arr.push(crit);
    else groups.set(e.issue, [crit]);
  }
  const rows: StatusRow[] = [];
  for (const [issue, criteria] of groups) {
    const iss = byNum.get(issue);
    const passed = criteria.filter((c) => c.passes).length;
    rows.push({
      issue,
      title: iss?.title,
      open: iss ? isOpen(iss) : undefined,
      epic: iss ? epicOf(iss) : undefined,
      criteria,
      passed,
      total: criteria.length,
    });
  }
  return rows.sort((a, b) => b.issue - a.issue);
}

export interface StatusSummary {
  issues: number; //          Issues com ≥1 critério projetado
  criteria: number; //        total de critérios
  passed: number; //          critérios com passes:true
  fullyVerified: number; //   Issues com todos os critérios passes:true
}

export function summarizeStatus(rows: StatusRow[]): StatusSummary {
  return {
    issues: rows.length,
    criteria: rows.reduce((n, r) => n + r.total, 0),
    passed: rows.reduce((n, r) => n + r.passed, 0),
    fullyVerified: rows.filter((r) => r.total > 0 && r.passed === r.total).length,
  };
}

export interface RenderOpts {
  repo?: string;
  generatedAt?: string; // injetável para testes determinísticos
  source?: string;
  issuesAvailable?: boolean; // false quando os metadados de Issue não puderam ser buscados (offline)
}

/** Escapa o que muda ESTRUTURA de uma linha de lista/heading Markdown (título editável da Issue). */
function safe(text: string): string {
  return text
    .replace(/[\u0000-\u001f]+/g, " ") // controles/quebras -> não injeta linhas/headings
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Renderiza o relatório Markdown. Função **pura** (sem I/O, sem relógio) — `generatedAt` é injetado. */
export function renderReport(rows: StatusRow[], opts: RenderOpts = {}): string {
  const repo = opts.repo ?? "(repo atual)";
  const generatedAt = opts.generatedAt ?? "(sem timestamp)";
  const source = opts.source ?? "(desconhecida)";
  const s = summarizeStatus(rows);
  const out: string[] = [];
  out.push(`# Status por issue (relatório gerado) — ${repo}`);
  out.push("");
  out.push(
    "> Relatório **gerado sob demanda** do **ledger** (`feature-ledger.json` — projeção de verificação, " +
      "ADR-0006/0016) enriquecido com metadados de Issue (`gh`). Scratch em `.orion/tmp/reports/` " +
      "(**gitignored**): não é fonte versionada. O status **canônico** é a Issue (L2); este é uma leitura derivada.",
  );
  out.push(`>`);
  out.push(`> Gerado em: ${generatedAt} · Fonte: ${source}`);
  out.push("");
  if (opts.issuesAvailable === false) {
    out.push(
      "> ⚠ Metadados de Issue indisponíveis (offline/sem auth): título/estado/épico omitidos; os " +
        "critérios/`passes` abaixo vêm do **ledger local** (que está no clone).",
    );
    out.push("");
  }
  out.push(
    `**Resumo:** ${s.issues} issue(s) projetada(s) · ${s.criteria} critério(s) ` +
      `(${s.passed} verificado(s) · ${s.criteria - s.passed} pendente(s)) · ${s.fullyVerified} issue(s) 100% verificada(s).`,
  );
  out.push("");

  if (rows.length === 0) {
    out.push(
      "_Nenhuma entrada no ledger — status vazio. Num clone/template sem ledger projetado este é o " +
        "comportamento correto: o status canônico vive nas Issues; o ledger projeta a verificação._",
    );
    out.push("");
    return out.join("\n");
  }

  for (const r of rows) {
    const estado = r.open === undefined ? "sem metadados" : r.open ? "aberta" : "fechada";
    const epic = r.epic ? ` · ${safe(r.epic)}` : "";
    const title = r.title ? ` — ${safe(r.title)}` : "";
    out.push(`## #${r.issue} [${estado}]${epic} (${r.passed}/${r.total})${title}`);
    for (const c of r.criteria) {
      out.push(`- [${c.passes ? "x" : " "}] ${safe(c.acceptance)}`);
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
  if (val === undefined || val.startsWith("--")) {
    throw new UsageError(
      `a opção ${name} exige um valor (recebeu ${val === undefined ? "nada" : `\`${val}\``}).`,
    );
  }
  return val;
}
const hasFlag = (name: string): boolean => process.argv.includes(name);

const VALUE_FLAGS = new Set(["--input", "--repo", "--out", "--ledger"]);
const BOOL_FLAGS = new Set(["--help", "-h"]);

/** Recusa argumento desconhecido: um typo (`--inpt`) seria ignorado e cairia no fetch ao vivo (precedente plano). */
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
  return validateIssues(parsed, `--input ${file}`);
}

/**
 * Carrega o ledger **escopado** (`loadScopedLedger` — valida origem/procedência/lifecycle e aplica
 * `inScope`) e valida os campos que o status usa (issue/acceptance/passes). Num repo derivado, as entradas
 * herdadas do Orion ficam FORA (senão o #29 do adotante casaria com os critérios do #29 do Orion — Codex
 * #175/#4). **Falha fechada** (lança) em ledger/marcador malformado — o chamador decide o exit.
 */
export function loadScopedStatusEntries(root: string, ledgerPath: string): LedgerItem[] {
  const { scoped } = loadScopedLedger(
    join(root, ".orion/ledger-origin.json"),
    ledgerPath,
    join(root, ".orion/ledger-lifecycle.json"),
  );
  return validateLedgerEntries(scoped, ledgerPath);
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
      "Uso: status-report.ts [--out <arq>] [--repo <owner/repo>] [--input <issues.json>] [--ledger <ledger.json>]\n" +
        "  Gera o status por issue: critérios/`passes` do ledger + metadados de Issue (ADR-0025 — T9.7a).\n" +
        "  Ledger-first: offline (sem `gh`) ainda mostra o ledger local; só os metadados de Issue degradam.\n" +
        "  --input usa Issues pré-buscadas (fixture/offline); --ledger sobrescreve o caminho do ledger.\n" +
        "  Saída padrão: .orion/tmp/reports/status.md (scratch, gitignored). LÊ o ledger, nunca o escreve.",
    );
    return 0;
  }
  const root = repoRoot();

  let input: string | undefined;
  let ledgerPath: string;
  let repo: string | undefined;
  let outPath: string;
  try {
    assertKnownArgs();
    input = arg("--input");
    repo = arg("--repo");
    ledgerPath = arg("--ledger") ?? join(root, "feature-ledger.json");
    outPath = resolveOutPath(arg("--out") ?? `${REPORTS_DIR}/status.md`, root);
  } catch (e) {
    console.error(`erro de uso: ${(e as Error).message}`);
    return 2;
  }

  // Ledger = espinha (local, versionado, escopado). AUSENTE → status VAZIO (template sem projeção): degrada,
  // não crasha. PRESENTE mas malformado (ledger ou marcador de origem/lifecycle) → **falha fechada** (exit
  // 2): um relatório "vazio é normal" mascararia corrupção/perda de verificação (Codex #175/#2).
  let ledger: LedgerItem[];
  if (!existsSync(ledgerPath)) {
    console.warn(`aviso: ledger ausente (${ledgerPath}) — status VAZIO (template sem projeção).`);
    ledger = [];
  } else {
    try {
      ledger = loadScopedStatusEntries(root, ledgerPath);
    } catch (e) {
      console.error(`erro: ledger/marcador inválido (${(e as Error).message}) — falha fechada.`);
      return 2;
    }
  }

  // Metadados de Issue: enriquecem o ledger. Offline/sem auth → degradam (status ainda sai do ledger).
  let issues: PlanIssue[] = [];
  let issuesAvailable = true;
  let source: string;
  if (input) {
    try {
      issues = loadIssuesFromInput(input);
      source = `ledger: ${ledgerPath} · Issues: --input ${input}`;
    } catch (e) {
      console.error(`erro ao obter Issues: ${(e as Error).message}`);
      return 2; // arquivo malformado/ausente é erro de usuário — falha fechada
    }
  } else {
    try {
      issues = fetchIssuesViaGh(repo);
      source = `ledger: ${ledgerPath} · Issues: gh (ao vivo)`;
    } catch (e) {
      if (e instanceof FetchUnavailableError) {
        console.warn(`aviso: ${(e as Error).message}`);
        console.warn("metadados de Issue omitidos (offline degrada — o ledger local ainda rende).");
        issuesAvailable = false;
        source = `ledger: ${ledgerPath} · Issues: indisponíveis (offline/sem auth)`;
      } else {
        console.error(`erro ao obter Issues: ${(e as Error).message}`);
        return 2; // truncamento/dado inválido: falha fechada (não mascarar metadados incompletos)
      }
    }
  }

  const rows = buildStatus(ledger, issues);
  const now = new Date().toISOString();
  const md = renderReport(rows, { repo, source, generatedAt: now, issuesAvailable });

  // Escrita ATÔMICA (precedente plano): temp de nome aleatório no mesmo dir com flag `wx`, depois rename.
  mkdirSync(dirname(outPath), { recursive: true });
  const tmp = `${outPath}.tmp-${randomBytes(9).toString("hex")}`;
  try {
    writeFileSync(tmp, md.endsWith("\n") ? md : md + "\n", { flag: "wx" });
    renameSync(tmp, outPath);
  } catch (e) {
    console.error(`erro ao gravar o relatório: ${(e as Error).message}`);
    return 2;
  }

  const s = summarizeStatus(rows);
  console.log("STATUS REPORT");
  console.log(
    `  Issues:        ${s.issues} (${s.fullyVerified} 100% verificada(s)); critérios: ${s.passed}/${s.criteria} verificados`,
  );
  console.log(
    `  Metadados:     ${issuesAvailable ? "gh (ao vivo)/--input" : "indisponíveis (offline)"}`,
  );
  console.log(`  -> gravado em  ${outPath}`);
  if (rows.length === 0)
    console.log(
      "  (status vazio — sem entradas no ledger; correto num clone/template sem projeção)",
    );
  return 0;
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
