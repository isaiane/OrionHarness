#!/usr/bin/env node
// state-budget-check.ts — REDE HEURÍSTICA do STATE como PONTEIRO (T8.1b / épico O8; Issue #127; ADR-0024,
// modelo-alvo ADR-0025). A fatia b do ADR-0024: DEPOIS que a convenção de autoria (§4 reescrita + os dois
// reviewer-checklists) passou a ROTEAR por construção (fatia a / T8.1a), esta rede pega os sinais ÓBVIOS de
// história/status VAZANDO de volta ao `STATE.md`. Reusa o padrão visão-derivada + guard do repo
// (ADR-0019 `l0-core-manifest.ts` / ADR-0023 `adr-index.ts` / T9.6 `coherence-guard.ts`): funções PURAS
// exportadas p/ vitest, self-check que PROVA a mordida, exit ≠ 0 adequado a gate de CI.
//
// O guard lê o `STATE.md` real + o ORÇAMENTO de `.orion/state-budget.json` e reprova CINCO sinais óbvios:
//   S1. TAMANHO acima do orçamento — o número é CONFIG operacional (ADR-0024 item 4: recalibrar NÃO exige
//       ADR/G2), calibrado a um STATE-ponteiro real + folga; vive no config, nunca no texto constitucional
//       (embutir a contagem no §4 viraria o proxy em objetivo — o Goodhart que o Orion combate).
//   S2. CADEIA 'Antes…/Antes disso…' — marcador de retro-narrativa que o §4 proíbe no STATE. Casa em
//       QUALQUER início de cláusula do bullet lógico (inclui as linhas de continuação unidas — senão um
//       `Antes disso:` numa 2ª linha do bullet escaparia).
//   S3. ACUMULAÇÃO de bullets DATADOS — a ADR-0024 (isenção de referências sancionadas) isenta uma data/
//       prazo PONTUAL (ex.: um risco `Certificado expira em 2026-09-01`) e manda morder a ACUMULAÇÃO de
//       bullets datados/narrativos. Logo o guard tolera até `maxDatedBullets` (config, default 1) e morde
//       quando o nº de bullets datados o EXCEDE — um log datado. (Distinguir narrativa-passada de prazo num
//       ÚNICO bullet é semântico; a ADR deferiu a classificação a esta fatia e a garantia é a revisão humana.)
//   S4. REPETIÇÃO de 'última conclusão' — ≥2 MARCADORES de última conclusão (headings `## Última conclusão`
//       E/OU bullets ROTULADOS `Última conclusão:`) são uma CADEIA; o formato aprovado tem UM. Só o RÓTULO
//       conta (uma menção em prosa como `- Atualizar a última conclusão após o merge` não é marcador).
//   S5. STATUS POR-ITEM — checkbox de critério SDD (`- [ ]`/`- [x]`, inclusive listas `+`/ordenadas) no
//       STATE; status por-item é autoritativo na Issue (L2), projetado no ledger, e NUNCA volta ao STATE (§4).
//
// ISENÇÃO DE REFERÊNCIA SANCIONADA (ADR-0024, "Isenção de referências sancionadas" + design desta fatia):
// um `#N` de Issue/PR é PONTEIRO para a fonte canônica — passa livremente (qualquer contagem; ele APONTA,
// não narra); por isso o guard NÃO conta `#N`. Uma data/prazo PONTUAL também passa (S3 só morde a
// ACUMULAÇÃO acima de `maxDatedBullets`), honrando a isenção de prazo forward-looking da ADR. O que morde é
// acumulação datada, cadeia 'Antes…', repetição de última conclusão, checkbox e tamanho — sinais de
// HISTÓRIA/STATUS, não de ponteiro. CAVEAT (deliberado, ver LIMITAÇÃO): a ACUMULAÇÃO de bullets narrativos
// com `#N` (`- PR #128 corrigiu X`) NÃO é contada — distinguir narrativa de ponteiro é semântico, fica com a
// revisão humana; e listas embutidas em BLOCKQUOTE no corpo não são inspecionadas.
//
// LIMITAÇÃO (impressa na saída — §8.1; ADR-0024 "Limitação conhecida"): é HEURÍSTICA e REDE, não garantia.
// Regex casa FORMA, não sentido — um autor pode escrever narrativa histórica SEM esses marcadores (ex.:
// "resolvemos o problema e ficou tudo funcionando"), ou UM único bullet narrativo datado (abaixo do limiar),
// e PASSAR no guard. Logo GUARD VERDE NÃO PROVA que o STATE está limpo — prova só que os padrões conhecidos
// não apareceram. A GARANTIA do invariante (STATE = ponteiro; história → PRs mergeados; status → Issue) é a
// REVISÃO HUMANA (item dos dois reviewer-checklists), não este guard. Não enfraqueça checklist algum "porque
// o guard cobre" — ele não cobre.
//
// Roda em Node ≥ 22.6 via type stripping, SEM rede/token/API, sem toolchain:
//   node --experimental-strip-types tools/smoke/state-budget-check.ts   → self-check (born-green + prova mordida)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

/** Orçamento operacional do STATE (config, não governança — ADR-0024 item 4). `note` é documentação livre. */
export interface BudgetConfig {
  maxLines: number;
  /** Máximo de bullets DATADOS tolerados (referência/prazo pontual). Acima disso = acumulação = morde. Default 1. */
  maxDatedBullets?: number;
  note?: string;
}

/** Default de `maxDatedBullets` quando o config o omite: 1 = uma data/prazo pontual passa; ≥2 = acumulação. */
export const DEFAULT_MAX_DATED_BULLETS = 1;

/** Um bullet LÓGICO do corpo do STATE: linha 1-indexada + texto (continuações unidas) + segmentos físicos. */
export interface Bullet {
  line: number;
  text: string;
  /** Cada linha física do bullet, trimada e com o marcador `-`/`*` removido do início (para S2 por-cláusula). */
  segments: string[];
}

export interface StateBudgetReport {
  ok: boolean;
  violations: string[];
  metrics: { lines: number; maxLines: number; bullets: number };
}

/** A limitação, impressa na saída do guard — a mesma que vive no ADR-0024/§4. */
export const LIMITATION =
  "LIMITAÇÃO: heurística/rede, não garantia (§8.1; ADR-0024). Regex casa forma, não sentido — narrativa " +
  "histórica SEM marcadores, ou UM único bullet datado (abaixo do limiar), passa; `#N` e data/prazo pontual " +
  "são ponteiros sancionados. CAVEATS CONHECIDOS (rede não persegue toda evasão — perseguir cada forma " +
  "Markdown seria reimplementar um parser; a garantia é a revisão humana): (a) listas dentro de BLOCKQUOTE " +
  "no corpo (`> - [x] …`) não são inspecionadas; (b) ACUMULAÇÃO de bullets narrativos com `#N` " +
  "(`- PR #128 corrigiu X`, `- PR #129 …`) não é contada — um `#N` é tratado como ponteiro; distinguir " +
  "narrativa de ponteiro é semântico; (c) este guard é ANTI-LEAK (excesso/narrativa/status), NÃO valida " +
  "ESTRUTURA MÍNIMA — um STATE vazio/mutilado (sem `Agora`/`Próximo passo`/`Última conclusão`) passa; " +
  "cobrar a presença das seções é revisão humana / fatia futura. Guard verde NÃO prova STATE limpo; a garantia do invariante " +
  "(STATE=ponteiro; história→PRs mergeados; status→Issue) é a REVISÃO HUMANA (dois reviewer-checklists). " +
  "Não enfraqueça checklist 'porque o guard cobre'.";

// ────────────────────────────────────────────────────────────────────────────────────────────────────
// Predicados PUROS — cada um recebe insumos já materializados (testável sem I/O), retorna violações.
// ────────────────────────────────────────────────────────────────────────────────────────────────────

// Marcador de lista no INÍCIO da linha: `-`/`*`/`+` (não-ordenada) OU `N.`/`N)` (ordenada). Cobrir `+`
// e a forma ordenada fecha o dribble de status por lista padrão (`+ [x]`, `1. [ ]`) — achado Codex #4.
const BULLET_RE = /^(\s*)(?:[-*+]|\d+[.)])\s+/;
const BLOCKQUOTE_RE = /^\s*>/; //              linha de blockquote (cabeçalho do STATE) — NÃO é corpo
const HEADING_RE = /^\s*#/; //                 heading (`## Última conclusão`) — NÃO é bullet
const CONTINUATION_RE = /^\s+\S/; //           linha indentada não-vazia: continuação do bullet corrente
const ISO_DATE_RE = /\b\d{4}-\d{2}-\d{2}\b/; // data de calendário (narrativa datada)
// 'Antes…' no INÍCIO DE CLÁUSULA: começo do texto (`^`) ou após espaço — pega o marcador numa linha de
// continuação unida por espaço (`… atual **Antes disso:** …`). O `[*_]{0,2}` OPCIONAL antes E depois de
// 'antes[ disso]' tolera o dois-pontos FORA da ênfase (`**Antes disso**:`, forma comum) — achado Codex #5.
const ANTES_RE = /(^|\s)[*_]{0,2}\s*antes(\s+disso)?[*_]{0,2}\s*(:|…|\.\.\.)/i;
// Bullet ROTULADO 'Última conclusão:' — âncora no INÍCIO do bullet + dois-pontos. Casar a frase em qualquer
// ponto (o `/última conclus/` anterior) marcava um passo legítimo como `- Atualizar a última conclusão após
// o merge` como 2º marcador → falso-vermelho (achado Codex #2). Só o rótulo-ponteiro conta.
const LAST_CONCLUSION_BULLET_RE = /^[*_]{0,2}\s*última\s+conclus[ãa]o[*_]{0,2}\s*:/i;
// Heading `## Última conclusão`: o texto do heading DEVE começar com o rótulo canônico. Casar a frase em
// qualquer ponto (`.*última conclus`) marcava `## Como atualizar a última conclusão` como 2º marcador →
// falso-vermelho (achado Codex round 3, mesmo tipo do #2). Só o heading-rótulo conta.
const LAST_CONCLUSION_HEADING_RE = /^\s*#{1,6}\s+última\s+conclus[ãa]o\b/i;
const CHECKBOX_RE = /^\[[ xX]\]/; //           checkbox de critério SDD, com o marcador de lista já removido

/** Conta as linhas do STATE ignorando UM `\n` final (arquivo terminado em newline não conta linha vazia). */
export function countLines(content: string): number {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\n$/, "");
  return normalized === "" ? 0 : normalized.split("\n").length;
}

/**
 * Extrai os bullets LÓGICOS do CORPO: linhas de lista (`-`/`*`) que NÃO estão em blockquote nem heading,
 * com as continuações INDENTADAS unidas ao bullet (`text`) E preservadas como `segments` (uma entrada por
 * linha física, trimada) — os segmentos deixam o S2 casar `Antes…` no início de uma linha de continuação.
 * O cabeçalho do STATE (blockquote `>`, que cita "Antes…/Antes disso…" e "Última conclusão" como orientação)
 * e os headings de seção ficam de fora por construção — é o que mantém o guard born-green.
 */
export function extractBodyBullets(content: string): Bullet[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const bullets: Bullet[] = [];
  let cur: Bullet | null = null;
  const flush = (): void => {
    if (cur) bullets.push(cur);
    cur = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    if (BLOCKQUOTE_RE.test(raw) || HEADING_RE.test(raw) || raw.trim() === "") {
      flush(); // blockquote, heading ou linha vazia encerram o bullet corrente
      continue;
    }
    if (BULLET_RE.test(raw)) {
      flush();
      const seg = raw.replace(BULLET_RE, "").trim();
      cur = { line: i + 1, text: seg, segments: [seg] };
    } else if (cur && CONTINUATION_RE.test(raw)) {
      const seg = raw.trim();
      cur.text += " " + seg; // continuação indentada do bullet corrente
      cur.segments.push(seg);
    } else {
      flush(); // prosa não-indentada (ex.: seção Ponteiros) — não é bullet
    }
  }
  flush();
  return bullets;
}

/** Marcadores de 'última conclusão' no doc: headings canônicos (`## Última conclusão`) + bullets rotulados. */
export function extractLastConclusionMarkers(content: string): number[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const markers: number[] = [];
  for (let i = 0; i < lines.length; i++)
    if (LAST_CONCLUSION_HEADING_RE.test(lines[i] ?? "")) markers.push(i + 1);
  for (const b of extractBodyBullets(content))
    if (LAST_CONCLUSION_BULLET_RE.test(b.text)) markers.push(b.line);
  return markers.sort((a, b) => a - b);
}

/** S1 — TAMANHO acima do orçamento. O número é config (recalibrar não exige ADR — ADR-0024 item 4). */
export function checkSize(lines: number, maxLines: number): string[] {
  return lines > maxLines
    ? [
        `orçamento estourado: STATE.md tem ${lines} linhas > ${maxLines} (config .orion/state-budget.json). ` +
          `Um ponteiro não cresce sem limite — roteie história→PRs mergeados e status→Issue (§4); ` +
          `recalibre o config só se o crescimento do ponteiro for legítimo (não afrouxe para caber narrativa).`,
      ]
    : [];
}

/** S2 — CADEIA 'Antes…/Antes disso…': marcador de retro-narrativa no início de QUALQUER cláusula do bullet
 *  (varre `segments` — cada linha física — para não deixar escapar um `Antes` numa continuação unida). */
export function checkAntesChain(bullets: Bullet[]): string[] {
  return bullets
    .filter((b) => b.segments.some((s) => ANTES_RE.test(s)))
    .map(
      (b) =>
        `cadeia narrativa 'Antes…' na linha ${b.line}: retro-narrativa — o STATE não guarda cadeia ` +
        `histórica (§4). Roteie o "antes" para os PRs mergeados; mantenha só o ponteiro forward-looking.`,
    );
}

/** S3 — ACUMULAÇÃO de bullets DATADOS. Tolera até `maxDatedBullets` (referência/prazo pontual sancionado);
 *  morde quando o nº de bullets datados o EXCEDE — a acumulação datada que a ADR-0024 manda reprovar. */
export function checkDatedBullets(bullets: Bullet[], maxDatedBullets: number): string[] {
  const dated = bullets.filter((b) => ISO_DATE_RE.test(b.text));
  return dated.length > maxDatedBullets
    ? [
        `acumulação de bullets datados: ${dated.length} bullets com data ISO (linhas ` +
          `${dated.map((b) => b.line).join(", ")}) > limiar ${maxDatedBullets} (config) — o STATE é ` +
          `ponteiro, não log; datas por-PR vão para o histórico (PRs mergeados). Uma data/prazo pontual é ` +
          `sancionada; a acumulação é narrativa histórica.`,
      ]
    : [];
}

/** S4 — REPETIÇÃO de 'última conclusão': ≥2 marcadores (heading E/OU bullet) = cadeia (o formato tem UM). */
export function checkRepeatedLastConclusion(markerLines: number[]): string[] {
  return markerLines.length >= 2
    ? [
        `repetição de 'última conclusão' (cadeia narrativa): ${markerLines.length} marcadores de última ` +
          `conclusão (linhas ${markerLines.join(", ")}) — o formato aprovado tem UMA (ponteiro). Um ` +
          `encadeamento é história → roteie para os PRs mergeados.`,
      ]
    : [];
}

/** S5 — STATUS POR-ITEM: checkbox de critério SDD no STATE (status é autoritativo na Issue L2, não no STATE). */
export function checkStatusCheckboxes(bullets: Bullet[]): string[] {
  return bullets
    .filter((b) => CHECKBOX_RE.test(b.text))
    .map(
      (b) =>
        `status por-item na linha ${b.line}: checkbox de critério (SDD) no STATE — status por-item é ` +
        `autoritativo na Issue SDD (L2), projetado no ledger; nunca volta ao STATE (§4).`,
    );
}

/** Agrega os CINCO sinais. PURA: recebe o conteúdo e o config já materializados (o I/O fica no CLI). */
export function runStateBudgetCheck(input: {
  content: string;
  config: BudgetConfig;
}): StateBudgetReport {
  const lines = countLines(input.content);
  const bullets = extractBodyBullets(input.content);
  const maxDated = input.config.maxDatedBullets ?? DEFAULT_MAX_DATED_BULLETS;
  const violations: string[] = [];
  violations.push(...checkSize(lines, input.config.maxLines));
  violations.push(...checkAntesChain(bullets));
  violations.push(...checkDatedBullets(bullets, maxDated));
  violations.push(...checkRepeatedLastConclusion(extractLastConclusionMarkers(input.content)));
  violations.push(...checkStatusCheckboxes(bullets));
  return {
    ok: violations.length === 0,
    violations,
    metrics: { lines, maxLines: input.config.maxLines, bullets: bullets.length },
  };
}

// ────────────────────────────────────────────────────────────────────────────────────────────────────
// Config — carregamento FAIL-CLOSED: sem orçamento válido o guard NÃO roda (um config quebrado não pode
// silenciar a rede). Forma mínima; recalibrar `maxLines`/`maxDatedBullets` é config, não governança (ADR-0024 item 4).
// ────────────────────────────────────────────────────────────────────────────────────────────────────

export function isValidBudgetConfig(x: unknown): x is BudgetConfig {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  if (typeof o.maxLines !== "number" || !Number.isInteger(o.maxLines) || o.maxLines <= 0)
    return false;
  // maxDatedBullets é OPCIONAL, mas se presente deve ser inteiro ≥ 0 (0 = nenhuma data tolerada).
  if ("maxDatedBullets" in o && o.maxDatedBullets !== undefined) {
    const m = o.maxDatedBullets;
    if (typeof m !== "number" || !Number.isInteger(m) || m < 0) return false;
  }
  if ("note" in o && o.note !== undefined && typeof o.note !== "string") return false;
  return true;
}

export function loadBudgetConfig(path: string): BudgetConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf-8"));
  } catch (e) {
    throw new Error(
      `config de orçamento ilegível ('${path}'): ${(e as Error).message} — falha fechada (o guard não roda sem orçamento válido).`,
    );
  }
  if (!isValidBudgetConfig(parsed))
    throw new Error(
      `config de orçamento inválida ('${path}'): exige { "maxLines": inteiro positivo, "maxDatedBullets"?: inteiro ≥ 0, "note"?: string } — falha fechada.`,
    );
  return parsed;
}

// ────────────────────────────────────────────────────────────────────────────────────────────────────
// Self-check: (1) roda contra o STATE.md + config REAIS (deve passar — nasce verde); (2) PROVA que cada
// um dos 5 sinais MORDE, pela PORTA AGREGADA (`runStateBudgetCheck`), não pelos helpers diretos — remover
// o wiring de um sinal deixaria o self-check verde sem cobrir aquele sinal. Exit ≠ 0 se o real falhar OU
// alguma mordida não for pega. LÊ a saída (verde do runner ≠ output correto).
if (process.argv[1]?.endsWith("state-budget-check.ts")) {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const config = loadBudgetConfig(join(root, ".orion/state-budget.json"));
  const content = readFileSync(join(root, "STATE.md"), "utf-8");

  const real = runStateBudgetCheck({ content, config });
  console.log(
    JSON.stringify({
      caso: "STATE.md REAL",
      ok: real.ok,
      ...real.metrics,
      violations: real.violations,
    }),
  );

  // Mordidas sintéticas pela porta agregada. Para isolar UM sinal por vez, os casos 2–5 usam um orçamento
  // FOLGADO de linhas (só o sinal-alvo dispara); o caso 1 usa um orçamento apertado contra um conteúdo maior.
  const run = (c: string): string[] =>
    runStateBudgetCheck({ content: c, config: { maxLines: 999 } }).violations;
  const biteSize = runStateBudgetCheck({
    content: "l1\nl2\nl3\nl4\nl5",
    config: { maxLines: 3 },
  }).violations.some((v) => v.includes("orçamento estourado"));
  // S2: 'Antes' numa LINHA DE CONTINUAÇÃO do bullet (o gap do `^`-only que o Codex apontou).
  const biteAntes = run("## Agora\n- item atual\n  **Antes disso:** ajustamos o parser.").some(
    (v) => v.includes("cadeia narrativa 'Antes"),
  );
  // S3: ACUMULAÇÃO (2 datadas > default 1) morde; UMA data/prazo pontual passa (isenção).
  const biteDated = run("## Log\n- fez X em 2026-08-04\n- fez Y em 2026-08-05").some((v) =>
    v.includes("acumulação de bullets datados"),
  );
  // S4: duas seções `## Última conclusão` (formato de HEADING do repo) — o gap do Codex.
  const biteRepeated = run(
    "## Última conclusão\n- #10 (PR #11)\n\n## Última conclusão\n- #12 (PR #13)",
  ).some((v) => v.includes("repetição de 'última conclusão'"));
  const biteCheckbox = run("## Agora\n- [x] Critério 1 passa\n- [ ] Critério 2 pendente").some(
    (v) => v.includes("status por-item"),
  );
  // S5 em listas `+` e ORDENADAS (`1.`) — o dribble de marcador que o Codex #4 apontou.
  const biteCheckboxAlt = run("## Agora\n+ [x] Critério A\n1. [ ] Critério B").some((v) =>
    v.includes("status por-item"),
  );
  // S2 com dois-pontos FORA da ênfase (`**Antes disso**:`) — o gap do Codex #5.
  const biteAntesEmphasis = run("## Agora\n- **Antes disso**: fizemos o anterior.").some((v) =>
    v.includes("cadeia narrativa 'Antes"),
  );
  // ISENÇÃO: `#N` (múltiplos que descrevem UMA conclusão) e UMA data/prazo pontual NÃO mordem.
  const isencaoRef =
    run("## Última conclusão\n- **[#174]** (T9.7b, PR #178 + flip #179): fecha o épico O9.")
      .length === 0;
  const isencaoPrazo = run("## Riscos\n- Certificado expira em 2026-09-01.").length === 0;
  // ISENÇÃO #2 (Codex): menção EM PROSA a 'última conclusão' num passo legítimo NÃO é marcador.
  const isencaoConclusaoProse =
    run("## Próximo passo\n- Atualizar a última conclusão após o merge de #127.").length === 0;

  const morde =
    biteSize &&
    biteAntes &&
    biteAntesEmphasis &&
    biteDated &&
    biteRepeated &&
    biteCheckbox &&
    biteCheckboxAlt &&
    isencaoRef &&
    isencaoPrazo &&
    isencaoConclusaoProse;
  console.log(
    JSON.stringify({
      caso: "mutação (deve morder) + isenção (deve passar)",
      morde,
      biteSize,
      biteAntes,
      biteAntesEmphasis,
      biteDated,
      biteRepeated,
      biteCheckbox,
      biteCheckboxAlt,
      isencaoRef,
      isencaoPrazo,
      isencaoConclusaoProse,
    }),
  );

  console.log(LIMITATION);

  if (!real.ok || !morde) {
    console.error(
      "FALHA: guard vermelho no STATE.md real, ou uma mordida sintética não foi detectada, ou uma isenção regrediu.",
    );
    process.exit(1);
  }
}
