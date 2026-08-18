#!/usr/bin/env node
// history-report.ts — Gerador do índice de história OFFLINE (Orion, ADR-0025, fatia T9.4a).
//
// Projeta a **história** (camada L5, "o que mudou, datado, por-PR mergeado") a partir da fonte GitHub —
// **PRs _mergeados_** — para leitura humana/agente num relatório SOB DEMANDA. Saída em
// `.orion/tmp/reports/history.md` (scratch, **gitignored** — NÃO é fonte versionada; um relatório
// committado recriaria a fonte autoral que o O9 elimina).
//
// **Adição pura (T9.4a):** nada sai do read-path aqui. Estubar o `CHANGELOG.md` e aplicar o §4 (linha
// L5 + roteamento) é a fatia irmã T9.4b — proibido nesta fatia (o ADR proíbe estubar antes de o índice
// existir e rodar; §9 "adição antes de remoção… T9.4a antes de T9.4b").
//
// **Contrato de história IMUTÁVEL (ADR-0025 item 3):** a história é definida por **PRs _mergeados_** —
// PRs abertos ou fechados-sem-merge NÃO contam como entrega — e pelos **campos imutáveis do merge**:
// **merge commit (oid) + timestamp de merge (`mergedAt`)**. Metadados EDITÁVEIS (título/corpo do PR)
// são EXIBIÇÃO, não a fonte de verdade do que foi entregue: o relatório mostra o título por
// conveniência, mas a âncora é o par (mergeCommit, mergedAt). Por isso um PR sem esses campos é rejeitado
// (falha fechada) — não é uma entrega ancorável.
//
// **Sem projeção persistida (ADR-0025 item 4 / D4):** este gerador escreve APENAS o relatório scratch.
// NÃO cria `history.json` nem qualquer projeção versionada — isso é decisão estrutural (schema + guard)
// e exige G2 novo; só nasce se ficar demonstrada lacuna real do read-path offline, e aí a fatia PARA e
// abre G2 (não decide no G1). O `feature-ledger.json` (projeção de VERIFICAÇÃO) NÃO é tocado.
//
// **Acesso (reuso, não segunda via):** reusa o idioma `gh → json → tool` e as **travas de caminho de
// escrita já provadas** no `tools/plan/plan-report.ts` (T9.3a) — `resolveOutPath`/`REPORTS_DIR` fecham o
// escape por `../`/symlink; segurança crítica NÃO é re-derivada aqui. `main()` consome JSON pré-buscado
// (`--input`) OU busca ao vivo via `gh pr list --state merged --json …`. **Sem rede/sem auth** o fetch
// **degrada para relatório VAZIO** (o read-path offline vê o ponteiro — ADR-0025), NÃO falha; já
// **truncamento/resposta inválida** falham fechado (não mascaram história incompleta). As funções puras
// são exportadas para cobertura por vitest (o `smoke-test`/CI NÃO chama o caminho de rede — usa fixture).
//
// CLI (Node >= 22.6 — onde `--experimental-strip-types` existe; o engines ">=22.6" do repo casa):
//   node --experimental-strip-types tools/history/history-report.ts [--out <arq>] [--repo <owner/repo>]
//   node --experimental-strip-types tools/history/history-report.ts --input <prs.json>   # offline/fixture
import { writeFileSync, readFileSync, mkdirSync, renameSync } from "node:fs";
import { dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import process from "node:process";
// Reuso das travas de escrita/segurança e utilitários já PROVADOS na fatia irmã T9.3a (plan-report):
// não se duplica código de contenção de caminho (symlink/`../`) — duplicar segurança convida a drift.
import {
  REPORTS_DIR,
  resolveOutPath,
  repoRoot,
  nodeSupportsStripTypes,
  FetchUnavailableError,
  UsageError,
} from "../plan/plan-report.ts";

/** Teto de PRs buscados do `gh` numa chamada (`--limit` não pagina — ver `assertPrsNotTruncated`). */
export const PR_FETCH_LIMIT = 1000;

/**
 * Falha fechada se o fetch atingiu o teto (o `--limit` do `gh` **não** pagina, então um retorno igual ao
 * teto pode estar **truncado**). Mensagem em termos de **PR/história** — não reusa o guard do plano, que
 * falaria em "Issues"/"plano" e daria diagnóstico errado exatamente quando é preciso intervir (Codex P3).
 */
export function assertPrsNotTruncated(count: number, limit: number): void {
  if (count >= limit) {
    throw new Error(
      `o fetch atingiu o teto de ${limit} PRs — a história seria truncada e apresentaria um índice ` +
        "incompleto como completo. Pagine (ex.: `gh api --paginate`) ou eleve o teto conscientemente.",
    );
  }
}

/** Buffer do `execFileSync` (o default ~1 MiB estoura com muitos PRs/títulos — mesmo motivo do plano). */
const GH_MAX_BUFFER = 64 * 1024 * 1024;

/** Merge commit imutável do GitHub — a âncora de identidade da entrega (ADR-0025 item 3). */
export interface MergeCommit {
  oid: string;
}

/**
 * Um PR **mergeado** — a unidade de história (ADR-0025 item 3). `number`/`title` para exibição;
 * `mergedAt` + `mergeCommit.oid` são os **campos imutáveis** que ancoram a entrega. `baseRefName`/
 * `author` são opcionais (exibição/proveniência).
 */
export interface MergedPr {
  number: number;
  title: string;
  mergedAt: string; // ISO-8601 UTC `Z`, precisão de segundo (imutável, o formato do `gh`) — âncora temporal
  mergeCommit: MergeCommit | null; // imutável — âncora de identidade
  baseRefName?: string;
  author?: { login?: string } | null;
}

/**
 * Instante ISO-8601 em **UTC canônico `Z`, precisão de segundo** — o formato que o `gh` retorna em
 * `mergedAt` (ex.: `2026-08-17T02:11:00Z`). O contrato é DELIBERADAMENTE restrito a `Z` de comprimento
 * fixo (sem offset numérico nem fração): (1) offsets fariam a ordenação lexicográfica divergir da
 * cronológica (Codex P2 — `+14:00` parece depois mas é 13h antes de `Z`); (2) comprimento fixo torna a
 * comparação de string **provadamente** cronológica, sem `Date.parse` (mantém o determinismo). Um
 * `--input` com offset/fração é rejeitado (fail-closed correto) — não é o dado real do `gh`.
 */
const ISO_INSTANT_UTC = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/;

/** OID de merge commit: hex plausível (SHA-1=40, SHA-256=64; aceita forma curta ≥7). */
const OID_HEX = /^[0-9a-f]{7,64}$/i;

/** Dias no mês, com ano bissexto para fevereiro (regra gregoriana). `month` é 1–12. */
function daysInMonth(year: number, month: number): number {
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]!;
}

/**
 * Valida um instante ISO-8601 **UTC `Z` real** (não só a forma): além das faixas de mês/hora, valida o
 * **dia contra o mês/ano bissexto** — `2026-02-31`, `2025-02-29` (não bissexto) e `2026-04-31` são
 * recusados (Codex P2). Sem `new Date` (que **normalizaria** `2026-02-31`→mar em vez de recusar).
 */
export function isValidIsoInstant(s: string): boolean {
  const m = ISO_INSTANT_UTC.exec(s);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const min = Number(m[5]);
  const sec = Number(m[6]);
  if (month < 1 || month > 12) return false;
  // Segundo 0–59: `:60` (leap second) só existe a 23:59:60 em datas específicas e o `gh` NUNCA o emite —
  // aceitá-lo em horário arbitrário (`12:30:60`) deixaria passar `--input` corrompido (Codex P2).
  if (hour > 23 || min > 59 || sec > 59) return false;
  return day >= 1 && day <= daysInMonth(year, month);
}

/** Extrai `YYYY-MM-DD` de um `mergedAt` ISO já validado (sem `new Date` — determinístico, sem timezone). */
export function mergeDate(pr: MergedPr): string {
  return pr.mergedAt.slice(0, 10);
}

/** Extrai `YYYY-MM` (ciclo/mês) de um `mergedAt` ISO já validado. */
export function mergeMonth(pr: MergedPr): string {
  return pr.mergedAt.slice(0, 7);
}

/** Forma curta do merge commit (7 hex) para exibição; a identidade completa é o oid inteiro no PR/git. */
export function shortOid(pr: MergedPr): string {
  return pr.mergeCommit ? pr.mergeCommit.oid.slice(0, 7) : "(sem oid)";
}

/**
 * Sanitiza o título **editável** do PR para texto plano seguro numa linha de lista Markdown (Codex P2):
 * o título não pode introduzir comentário HTML (`<!--`), link, heading nem linha nova — títulos são
 * editáveis independentemente da âncora imutável, então poderiam **corromper o doc gerado** ao regerar.
 * Colapsa controles/quebras numa linha e escapa os caracteres que mudam **estrutura** (não a emphasis
 * cosmética `*`/`_`, para não enfear títulos reais). A barra invertida é escapada **primeiro**.
 */
export function sanitizeTitle(title: string): string {
  return title
    .replace(/[\u0000-\u001f]+/g, " ") // controles/quebras (\n,\r,\t…) -> nao injeta linhas/headings
    .replace(/\\/g, "\\\\") // barra invertida primeiro (senão os escapes abaixo dobram)
    .replace(/`/g, "\\`") // crase: não abre/fecha code span (engoliria o `oid`)
    .replace(/</g, "&lt;") // `<!--`/tags não viram HTML/comentário
    .replace(/>/g, "&gt;")
    .replace(/\|/g, "\\|") // pipe: defensivo p/ contexto de tabela
    .replace(/\[/g, "\\[") // colchete: não abre link
    .replace(/\]/g, "\\]")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Valida a forma mínima de um PR mergeado (mesma postura fail-closed do plano). Um PR sem `mergedAt`
 * ISO **ou** sem `mergeCommit.oid` NÃO é uma entrega ancorável (contrato imutável, ADR-0025 item 3) —
 * rejeitado em vez de virar uma linha de história sem âncora. `state`, quando presente, precisa ser
 * MERGED (o fetch já filtra `--state merged`, mas uma fixture não pode injetar um PR aberto como história).
 */
export function isValidMergedPr(x: unknown): x is MergedPr {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  if (typeof o.number !== "number" || typeof o.title !== "string") return false;
  if (typeof o.mergedAt !== "string" || !isValidIsoInstant(o.mergedAt)) return false;
  const mc = o.mergeCommit as Record<string, unknown> | null | undefined;
  if (typeof mc !== "object" || mc === null || typeof mc.oid !== "string" || !OID_HEX.test(mc.oid))
    return false;
  // `state` é opcional na nossa forma, mas se vier tem de ser MERGED (fixture não injeta aberto/fechado).
  if (o.state !== undefined && !/^merged$/i.test(String(o.state))) return false;
  return true;
}

/**
 * Valida um array de PRs antes de renderizar; falha **fechada** no primeiro inválido **e** em número de
 * PR repetido. Um PR é a **unidade de história**: um número duplicado (páginas sobrepostas / `--input`
 * editado) inflaria o resumo e duplicaria linhas (Codex P2); âncora conflitante (mesmo #, oid/mergedAt
 * diferentes) é ainda mais grave e recebe diagnóstico próprio.
 */
export function validateMergedPrs(arr: unknown[], origin: string): MergedPr[] {
  const seen = new Map<number, MergedPr>();
  arr.forEach((x, idx) => {
    if (!isValidMergedPr(x)) {
      throw new Error(
        `${origin}: PR inválido no índice ${idx} — number/title/mergedAt(ISO)/mergeCommit.oid ausentes ` +
          "ou state != MERGED (resposta não confiável; falha fechada em vez de gerar história falsa).",
      );
    }
    const prev = seen.get(x.number);
    if (prev) {
      const conflito = prev.mergeCommit?.oid !== x.mergeCommit?.oid || prev.mergedAt !== x.mergedAt;
      throw new Error(
        `${origin}: PR #${x.number} aparece mais de uma vez (índice ${idx})` +
          (conflito ? " com âncoras (merge commit/mergedAt) CONFLITANTES" : "") +
          " — um PR é único; falha fechada em vez de duplicar história.",
      );
    }
    seen.set(x.number, x);
  });
  return arr as MergedPr[];
}

export interface HistorySummary {
  total: number;
  first: string | null; // data (YYYY-MM-DD) do PR mergeado mais antigo
  last: string | null; //  data (YYYY-MM-DD) do PR mergeado mais recente
}

/**
 * Ordena PRs por merge **mais recente primeiro**; desempate por número decrescente (determinístico).
 * A comparação de string é **cronológica** porque `isValidIsoInstant` garante UTC `Z` de comprimento
 * fixo (`YYYY-MM-DDTHH:MM:SSZ`) — sem offsets/frações, o lexical == absoluto (Codex P2). Sem `Date.parse`.
 */
export function sortByMergedDesc(prs: MergedPr[]): MergedPr[] {
  return [...prs].sort((a, b) => {
    if (a.mergedAt < b.mergedAt) return 1;
    if (a.mergedAt > b.mergedAt) return -1;
    return b.number - a.number;
  });
}

export function summarize(prs: MergedPr[]): HistorySummary {
  if (prs.length === 0) return { total: 0, first: null, last: null };
  const sorted = sortByMergedDesc(prs);
  return {
    total: prs.length,
    last: mergeDate(sorted[0]!),
    first: mergeDate(sorted[sorted.length - 1]!),
  };
}

export interface RenderOpts {
  repo?: string;
  generatedAt?: string; // injetável para testes determinísticos
  source?: string; // "gh (ao vivo)" | "--input <arquivo>"
}

/**
 * Renderiza o índice de história em Markdown. Função **pura** (sem I/O, sem relógio) — `generatedAt` é
 * injetado. Agrupa por **mês de merge** (`YYYY-MM`, o "por ciclo" do papel L5 do §4), mais recente
 * primeiro; dentro do mês, PRs em ordem de merge decrescente. Cada linha: data · #nº · título · `oid`.
 */
export function renderReport(prs: MergedPr[], opts: RenderOpts = {}): string {
  const repo = opts.repo ?? "(repo atual)";
  const generatedAt = opts.generatedAt ?? "(sem timestamp)";
  const source = opts.source ?? "(desconhecida)";
  const s = summarize(prs);

  const out: string[] = [];
  out.push(`# História (relatório gerado) — ${repo}`);
  out.push("");
  out.push(
    "> Relatório **gerado sob demanda** a partir dos **PRs _mergeados_** do GitHub — fonte L5 da " +
      "história (ADR-0025). A identidade imutável de cada entrega é o **merge commit + `mergedAt`** (o " +
      "título, editável, é só exibição); cada linha traz uma **referência abreviada** (data + OID curto) " +
      "por legibilidade — a identidade completa (timestamp + OID inteiros) vive no PR/commit de merge do " +
      "GitHub, não neste índice. Scratch em `.orion/tmp/reports/` (**gitignored**): não é fonte versionada.",
  );
  out.push(`>`);
  out.push(`> Gerado em: ${generatedAt} · Fonte: ${source}`);
  out.push("");

  if (prs.length === 0) {
    out.push(
      "**Resumo:** 0 PR(s) mergeado(s).",
      "",
      "_Nenhum PR mergeado encontrado — história vazia. Num clone limpo/sem rede (template-repo) este é " +
        "o comportamento correto: a história vive nos PRs mergeados do GitHub; o stub do `CHANGELOG.md` " +
        "explica como consultá-la (gere este relatório com rede/`gh`)._",
      "",
    );
    return out.join("\n");
  }

  out.push(`**Resumo:** ${s.total} PR(s) mergeado(s) · de ${s.first} a ${s.last}.`);
  out.push("");

  // Agrupa por mês (YYYY-MM), meses mais recentes primeiro; dentro do mês, merge decrescente.
  const sorted = sortByMergedDesc(prs);
  const byMonth = new Map<string, MergedPr[]>();
  for (const pr of sorted) {
    const key = mergeMonth(pr);
    const arr = byMonth.get(key);
    if (arr) arr.push(pr);
    else byMonth.set(key, [pr]); // Map preserva ordem de inserção = meses já decrescentes (sorted)
  }
  for (const [month, list] of byMonth) {
    out.push(`## ${month} (${list.length} PR(s))`);
    for (const pr of list) {
      out.push(
        `- ${mergeDate(pr)} · #${pr.number} · ${sanitizeTitle(pr.title)}  \`${shortOid(pr)}\``,
      );
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
  // — senão `… --input` cairia num fetch ao vivo silencioso em vez de rejeitar (Codex, precedente plano).
  if (val === undefined || val.startsWith("--")) {
    throw new UsageError(
      `a opção ${name} exige um valor (recebeu ${val === undefined ? "nada" : `\`${val}\``}).`,
    );
  }
  return val;
}
const hasFlag = (name: string): boolean => process.argv.includes(name);

const VALUE_FLAGS = new Set(["--input", "--repo", "--out"]);
const BOOL_FLAGS = new Set(["--help", "-h"]);

/** Recusa argumento desconhecido: um typo (`--inpt`) seria ignorado e cairia no fetch ao vivo (precedente plano). */
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
 * Busca os PRs **mergeados** no GitHub via `gh` (mesmo mecanismo de acesso do ledger/plano — auth via
 * `gh`, sem segunda via). `--state merged` garante o contrato (abertos/fechados-sem-merge não entram).
 * Falha **fechada e clara** em erro operacional; **degrada** (FetchUnavailableError) sem rede/auth/`gh`.
 */
export function fetchMergedPrsViaGh(repo?: string): MergedPr[] {
  const args = [
    "pr",
    "list",
    "--state",
    "merged",
    "--limit",
    String(PR_FETCH_LIMIT),
    "--json",
    "number,title,mergedAt,mergeCommit,baseRefName,author",
  ];
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
    const stderr = err.stderr?.toString() ?? "";
    const detail = stderr.trim() || err.message || "erro desconhecido";
    const msg = `falha ao consultar PRs via \`gh\`. Detalhe: ${detail}`;
    // Só sinais RECONHECIDOS de indisponibilidade degradam para vazio (precedente plano): `gh` ausente
    // (ENOENT), auth requerida (exit 4) ou erro de rede no stderr. Repo inexistente/permissão/API são
    // erros OPERACIONAIS → falha fechada (não mascarar como "história vazia").
    // Inclui a mensagem PADRÃO do próprio `gh` quando um processo autenticado perde a rede — ele sai
    // com exit 1 (não 4) e "error connecting to …/check your internet connection" (Codex P2): sem isto,
    // o offline autenticado cairia como erro operacional (exit 2) em vez de degradar para vazio.
    const network =
      /could not resolve host|could not connect|network is unreachable|connection refused|dial tcp|no such host|temporary failure in name resolution|i\/o timeout|timed out|Get "https?:|error connecting to|check your internet connection/i;
    const unavailable = err.code === "ENOENT" || err.status === 4 || network.test(stderr);
    if (unavailable) {
      throw new FetchUnavailableError(
        `${msg} — offline/sem auth (rode com rede e \`gh auth status\` OK, ou use --input).`,
      );
    }
    throw new Error(`${msg} — erro operacional (ex.: repo inexistente/permissão). Falha fechada.`);
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) throw new Error("resposta do `gh` não é um array de PRs");
  assertPrsNotTruncated(parsed.length, PR_FETCH_LIMIT);
  return validateMergedPrs(parsed, "gh");
}

function loadFromInput(file: string): MergedPr[] {
  const parsed = JSON.parse(readFileSync(file, "utf-8")) as unknown;
  if (!Array.isArray(parsed)) throw new Error(`--input ${file}: conteúdo não é um array de PRs`);
  return validateMergedPrs(parsed, `--input ${file}`);
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
      "Uso: history-report.ts [--out <arq>] [--repo <owner/repo>] [--input <prs.json>]\n" +
        "  Gera o índice de história a partir dos PRs mergeados do GitHub (ADR-0025 — L5).\n" +
        "  Âncora imutável: merge commit + mergedAt; título é exibição. Agrupa por mês (por ciclo).\n" +
        "  --input usa JSON pré-buscado (fixture/offline); sem ele, busca ao vivo via `gh pr list --state merged`.\n" +
        "  Saída padrão: .orion/tmp/reports/history.md (scratch, gitignored). NÃO cria history.json (G2).",
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
    assertKnownArgs();
    input = arg("--input");
    repo = arg("--repo");
    outPath = resolveOutPath(arg("--out") ?? `${REPORTS_DIR}/history.md`, root);
  } catch (e) {
    console.error(`erro de uso: ${(e as Error).message}`);
    return 2;
  }

  let prs: MergedPr[];
  let source: string;
  if (input) {
    try {
      prs = loadFromInput(input);
      source = `--input ${input}`;
    } catch (e) {
      console.error(`erro ao obter PRs: ${(e as Error).message}`);
      return 2; // erro de usuário (arquivo malformado/ausente) — falha fechada
    }
  } else {
    try {
      prs = fetchMergedPrsViaGh(repo);
      source = "gh (ao vivo)";
    } catch (e) {
      if (e instanceof FetchUnavailableError) {
        // ADR-0025: offline/sem auth → gerar relatório VAZIO (o read-path degrada para o ponteiro), NÃO
        // falhar. Truncamento/dado inválido caem no else → falha fechada (não mascarar história incompleta).
        console.warn(`aviso: ${(e as Error).message}`);
        console.warn("gerando relatório VAZIO (offline degrada para o ponteiro — ADR-0025).");
        prs = [];
        source = "gh indisponível (offline/sem auth) — história vazia";
      } else {
        console.error(`erro ao obter PRs: ${(e as Error).message}`);
        return 2;
      }
    }
  }

  const now = new Date().toISOString();
  let md: string;
  try {
    md = renderReport(prs, { repo, source, generatedAt: now });
  } catch (e) {
    console.error(`erro ao renderizar a história: ${(e as Error).message}`); // fail-closed
    return 2;
  }
  // Escrita ATÔMICA (precedente plano): grava num temp de nome aleatório no mesmo dir (validado) com flag
  // `wx` (O_CREAT|O_EXCL) e faz `rename` sobre o alvo. O rename troca a entrada de diretório, não o inode
  // — então um alvo hard/sym-linkado a um arquivo versionado não é truncado; `wx` recusa temp pré-plantado.
  mkdirSync(dirname(outPath), { recursive: true });
  const tmp = `${outPath}.tmp-${randomBytes(9).toString("hex")}`;
  try {
    writeFileSync(tmp, md.endsWith("\n") ? md : md + "\n", { flag: "wx" });
    renameSync(tmp, outPath);
  } catch (e) {
    console.error(`erro ao gravar o relatório: ${(e as Error).message}`);
    return 2;
  }

  const s = summarize(prs);
  console.log("HISTORY REPORT");
  console.log(`  PRs mergeados: ${s.total}${s.total > 0 ? ` (de ${s.first} a ${s.last})` : ""}`);
  console.log(`  Fonte:         ${source}`);
  console.log(`  -> gravado em  ${outPath}`);
  if (s.total === 0)
    console.log(
      "  (história vazia — sem PRs mergeados/offline; correto num clone/template sem rede)",
    );
  return 0;
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
