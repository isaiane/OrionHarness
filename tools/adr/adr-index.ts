// adr-index.ts — Gerador do ÍNDICE de ADRs (`docs/decisions/README.md`) — derivado + guard anti-drift.
// Issue #121 / ADR-0023. Reusa o padrão do ADR-0019 (VISÃO derivada + guard): o índice é uma PROJEÇÃO
// dos arquivos de ADR, NUNCA mantido à mão — um índice manual driftaria (a lição do STATE inchado). A
// fonte da verdade são os próprios ADRs; o `--check` garante que a projeção não mente.
//
// Extrai, por ADR: NÚMERO + TÍTULO (de `# ADR-NNNN — …`) + STATUS (de `- **Status:** …`, limpando o
// comentário HTML de auditoria do G2). EXCLUI o `0000-template.md`. ORDENA por número. Emite uma tabela
// Markdown com link relativo ao arquivo. Nada é escrito à mão ⇒ zero superfície de drift (ADR-0023).
//
// Roda em Node ≥ 22.6 via type stripping (`--experimental-strip-types` só existe a partir do 22.6.0),
// sem toolchain:
//   node --experimental-strip-types tools/adr/adr-index.ts --write   → grava o README (idempotente)
//   node --experimental-strip-types tools/adr/adr-index.ts --check   → exit ≠ 0 se o README divergir
//   node --experimental-strip-types tools/adr/adr-index.ts           → self-check (default; prova a mordida)

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Um arquivo de ADR cru (nome + conteúdo) — a entrada da função PURA (sem I/O → testável). */
export interface AdrFile {
  name: string; //    ex.: "0006-ledger-executavel-de-tarefas.md"
  content: string;
}

/** Uma entrada do índice, derivada de um ADR. */
export interface AdrEntry {
  num: number; //     6  (chave de ordenação; vem do PREFIXO do arquivo — a identidade do ADR)
  id: string; //      "ADR-0006"
  title: string; //   "Ledger executável de tarefas (…)"  (do heading `# ADR-NNNN — …`)
  status: string; //  "aceito"  (de `- **Status:** …`, sem o comentário HTML)
  file: string; //    "0006-….md"  (alvo do link, relativo ao README na mesma pasta)
}

// Um arquivo é "candidato a ADR" pelo NOME se começa com dígito (a convenção `NNNN-…`) OU tem o token
// `ADR<sep>dígito` (ex.: `ADR-0024-x.md`, `adr_0024.md`). Assim `README.md`, `.gitkeep` e docs soltos são
// não-ADR (null), mas um ADR MALFORMADO — inclusive com heading TAMBÉM quebrado (`ADR-0024: Title`), o
// caso de dois erros — NÃO escapa à validação: vira fail-soft em vez de sumir do índice (achado Codex).
const LOOKS_LIKE_ADR = /^\d|adr[-_ ]?\d/i;
// Slug canônico (kebab minúsculo, 4 dígitos + `-`) — nome que NÃO corrompe o link/tabela do índice
// (sem `|`, `)`, `[`…) e é a única forma completa aceita; qualquer candidato fora disso é fail-soft.
const ADR_SLUG = /^\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
// Título canônico: `# ADR-NNNN — título`. Aceita travessão/en-dash/hífen como separador (robustez).
// Espaço em torno do separador é `[ \t]` (NÃO `\s`): senão o `\s+` cruzaria o `\n` num heading de título
// VAZIO (`# ADR-0024 —`\n) e capturaria a linha de status como título. O título exige começar em `\S`
// (não-vazio) → heading sem título é fail-soft (achado Codex).
const TITLE_LINE = /^#[ \t]+ADR-(\d{4})[ \t]+[—–-][ \t]+(\S.*?)[ \t]*$/m;
// Linha de status: `- **Status:** aceito  <!-- … -->`. Mesmo cuidado do título — `[ \t]` (NÃO `\s`) e
// valor começando em `\S`: senão um status VAZIO (`- **Status:**`\n) engoliria a linha `- **Data:**`
// seguinte como status (achado Codex). Status ausente/vazio ⇒ sem match ⇒ fail-soft.
const STATUS_LINE = /^-[ \t]+\*\*Status:\*\*[ \t]*(\S.*?)[ \t]*$/m;

// Neutraliza comentários HTML (`<!-- … -->`, inclusive multi-linha) ANTES de casar o metadado: um par
// heading/status VÁLIDO preso num comentário (ex.: metadado antigo comentado) não é o metadado real e
// não pode ser extraído nem mascarar o fail-soft de um ADR malformado (achado Codex). Um comentário NÃO
// fechado é neutralizado até o EOF (`(?:-->|$)`). O comentário vira ESPAÇOS (preservando os `\n`), NÃO
// string vazia: remover com "" COLARIA os tokens vizinhos e SINTETIZARIA metadado — `<!--x-->#  ADR…`
// viraria heading, `**Sta<!--x-->tus**` viraria `**Status**` (achado Codex). Espaços preservam a
// separação (e a posição de coluna: um `# …` que era precedido por comentário fica indentado → não é H1).
const stripComments = (content: string) =>
  content.replace(/<!--[\s\S]*?(?:-->|$)/g, (m) => m.replace(/[^\n]/g, " "));

/**
 * Remove blocos cercados (```` ``` ````/`~~~`, indentação ATX 0–3) do conteúdo antes de casar os metadados:
 * um exemplo `# ADR-0024 — …` ou `- **Status:** aceito` DENTRO de um bloco de código não é o metadado real
 * e não pode ser extraído nem mascarar o fail-soft de um ADR sem heading/status (achado Codex; mesma
 * precaução do guard do núcleo L0/ADR-0019). Fecha na cerca do MESMO char com comprimento ≥ ao da abertura.
 */
export function stripFences(content: string): string {
  const out: string[] = [];
  let fence: { char: string; len: number } | null = null;
  for (const ln of content.split(/\r?\n/)) {
    if (fence) {
      const c = ln.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
      if (c && c[1]![0] === fence.char && c[1]!.length >= fence.len) fence = null;
      continue; // dentro da cerca — descarta
    }
    const o = ln.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (o) {
      // crase com info string contendo crase não abre fence (CommonMark); til aceita info livre.
      if (o[1]![0] === "~" || !o[2]!.includes("`")) fence = { char: o[1]![0]!, len: o[1]!.length };
      continue; // a própria linha de cerca não é metadado
    }
    out.push(ln);
  }
  return out.join("\n");
}

// Conta ocorrências de um padrão de linha (`/…/m`) num texto — para detectar metadado DUPLICADO.
function countMatches(re: RegExp, text: string): number {
  return (text.match(new RegExp(re.source, "gm")) ?? []).length;
}

// O metadado do ADR vive no PREÂMBULO: as linhas ATÉ a 1ª seção (`## …`). Restringir o casamento a ele
// evita aceitar um `- **Status:**` de PROSA numa seção posterior (ex.: citado no `## Contexto`) como
// metadado real (achado Codex). O título é `#` (nível 1) → fica no preâmbulo; as seções são `##`+.
function preamble(body: string): string {
  const lines = body.split(/\r?\n/);
  const end = lines.findIndex((l) => /^ {0,3}#{2,6}[ \t]/.test(l));
  return (end < 0 ? lines : lines.slice(0, end)).join("\n");
}

/**
 * Deriva a entrada de índice de um arquivo de ADR. Retorna `null` para não-ADR (README, .gitkeep, doc
 * solto SEM heading de ADR) e para o `0000-template` (excluído por construção). FAIL-SOFT com ERRO CLARO
 * para um ADR real fora do padrão — nome malformado, sem título/status no preâmbulo, número divergente —
 * incluindo um arquivo que TEM conteúdo de ADR mas nome fora da convenção (senão sumiria do índice).
 */
export function parseAdr(file: AdrFile): AdrEntry | null {
  if (file.name.toLowerCase() === "readme.md") return null; // o próprio índice gerado
  if (file.name === "0000-template.md") return null; // SÓ o template exato é isento
  // `.MD`/`.Md` maiúsculo em nome de ADR: a gramática `ADR_SLUG` exige `.md` minúsculo, então cai no
  // fail-soft abaixo — mas primeiro precisa CHEGAR aqui (readAdrFiles já casa `.md` case-insensitive).

  // Metadado casado APENAS no preâmbulo, já sem cercas nem comentários HTML.
  const pre = preamble(stripFences(stripComments(file.content)));
  // O título tem de ser o PRIMEIRO H1 do documento — não um `# ADR-NNNN — …` mais abaixo enquanto o H1
  // real está quebrado (`# ADR-0024: Broken`), que faria o índice usar o título errado (achado Codex).
  const firstH1 = pre.split(/\r?\n/).find((l) => /^#[ \t]/.test(l)) ?? null;
  const titleM = firstH1 ? firstH1.match(TITLE_LINE) : null;

  if (!ADR_SLUG.test(file.name)) {
    // Nome fora da gramática canônica. É fail-soft SE parece um ADR — nome começa com dígito OU o
    // conteúdo tem heading `# ADR-NNNN` (ex.: `ADR-0024-x.md`, `024-x.md`) — para não sumir do índice;
    // senão é doc solto genuíno (null). (achado Codex)
    if (LOOKS_LIKE_ADR.test(file.name) || titleM)
      throw new Error(
        `${file.name}: conteúdo/nome de ADR fora da convenção 'NNNN-<slug-kebab>.md' — corrija (senão sumiria do índice)`,
      );
    return null;
  }
  const numStr = file.name.slice(0, 4); // 4 dígitos garantidos por ADR_SLUG
  const num = Number(numStr);
  if (num === 0)
    throw new Error(
      `${file.name}: número 0000 é reservado ao 0000-template.md — renumere este ADR`,
    );

  if (!titleM)
    throw new Error(
      `${file.name}: sem heading no padrão '# ADR-NNNN — <título>' no preâmbulo (ADR fora do padrão)`,
    );
  if (titleM[1] !== numStr)
    throw new Error(
      `${file.name}: número do título (ADR-${titleM[1]}) diverge do arquivo (${numStr}) — renumeração inconsistente`,
    );

  const statusM = pre.match(STATUS_LINE);
  if (!statusM)
    throw new Error(
      `${file.name}: sem linha '- **Status:** …' não-vazia no preâmbulo (ADR fora do padrão)`,
    );

  // Metadado AMBÍGUO: dois títulos ou dois status no preâmbulo (edição/conflito) fariam `match` escolher
  // o 1º em silêncio e o índice registrar um estado potencialmente contraditório — fail-soft (achado Codex).
  if (countMatches(TITLE_LINE, pre) > 1)
    throw new Error(
      `${file.name}: múltiplos headings '# ADR-NNNN' no preâmbulo — metadado ambíguo`,
    );
  if (countMatches(STATUS_LINE, pre) > 1)
    throw new Error(`${file.name}: múltiplas linhas '- **Status:**' no preâmbulo — estado ambíguo`);

  return {
    num,
    id: `ADR-${numStr}`,
    title: titleM[2]!.trim(),
    status: statusM[1]!.trim(),
    file: file.name,
  };
}

const HEADER = [
  "# Índice de ADRs — GERADO (não edite à mão)",
  "",
  "> **Arquivo gerado** por [`tools/adr/adr-index.ts`](../../tools/adr/adr-index.ts) a partir dos ADRs desta pasta",
  "> (número/título/status por ADR, `0000-template` excluído, ordenado). **Não edite à mão** — rode",
  "> `node --experimental-strip-types tools/adr/adr-index.ts --write` e commite. O guard `--check` **reprova**",
  "> um README divergente dos ADRs; a fatia (b) o fia no `scripts/smoke-test.sh` (anti-drift contínuo, padrão do ADR-0019).",
  "> **Para achar o ADR de um tema, faça `grep` neste arquivo** — não leia a pasta inteira.",
  "",
  "| ADR | Título | Status |",
  "| --- | ------ | ------ |",
];

// Escapa o delimitador de célula (`|`) para não quebrar a tabela quando um título/status o contém
// (ex.: `# ADR-NNNN — Escolher A | B`) — senão a linha ganha colunas extras e `--check` abençoaria o lixo.
// A BARRA vem PRIMEIRO: em GFM um nº PAR de barras antes do `|` o deixa ativo (`\\|` = barra escapada +
// delimitador), então escapar `\` antes de `|` garante que o pipe fique sempre inerte (achado Codex).
const escCell = (s: string) => s.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");

/**
 * Função PURA: monta o Markdown do índice a partir dos arquivos de ADR. Exclui o template, ORDENA por
 * número e emite uma linha por ADR com link relativo. Determinística ⇒ `--write` duas vezes = sem diff.
 * REJEITA números duplicados (colisão de prefixo `NNNN` — ex.: corrida de numeração/rebump): dois arquivos
 * distintos com o mesmo número dariam identidade ambígua e `--check` ainda passaria (achado Codex).
 */
export function buildAdrIndex(files: AdrFile[]): string {
  const entries = files
    .map(parseAdr)
    .filter((e): e is AdrEntry => e !== null)
    .sort((a, b) => a.num - b.num);
  for (let i = 1; i < entries.length; i++)
    if (entries[i]!.num === entries[i - 1]!.num)
      throw new Error(
        `${entries[i]!.id} duplicado: '${entries[i - 1]!.file}' e '${entries[i]!.file}' têm o mesmo número — renumere (colisão de numeração)`,
      );
  const rows = entries.map(
    (e) => `| [${e.id}](${e.file}) | ${escCell(e.title)} | ${escCell(e.status)} |`,
  );
  return [...HEADER, ...rows, ""].join("\n"); // newline final único (idempotência)
}

/**
 * Wrapper de I/O: lê TODOS os `.md` do diretório (menos o próprio `README.md` gerado) — `parseAdr` decide
 * o que é ADR. Ler tudo (em vez de só os nomes canônicos) é o que dá a `parseAdr` a chance de FAIL-SOFT
 * num ADR de nome malformado (`024-x.md`, `0024_x.md`), em vez de o filtro do I/O o esconder (achado Codex).
 */
export function readAdrFiles(dir: string): AdrFile[] {
  return readdirSync(dir)
    .filter((name) => /\.md$/i.test(name) && name.toLowerCase() !== "readme.md") // `.MD` também chega
    .map((name) => ({ name, content: readFileSync(`${dir}/${name}`, "utf-8") }));
}

export interface CheckResult {
  ok: boolean;
  expected: string;
  actual: string;
}

/** Regenera o índice em memória e compara com o README commitado. `ok:false` = drift (README desatualizado). */
export function checkAdrIndex(dir: string, readmePath: string): CheckResult {
  const expected = buildAdrIndex(readAdrFiles(dir));
  let actual = "";
  try {
    actual = readFileSync(readmePath, "utf-8");
  } catch {
    actual = ""; // README ausente conta como divergência (precisa ser gerado)
  }
  return { ok: expected === actual, expected, actual };
}

// ── CLI / self-check ────────────────────────────────────────────────────────────────────────────
// Sem framework: `--write` grava, `--check` reprova em drift (exit ≠ 0), default = self-check que
// valida o índice REAL contra os ADRs E prova que o guard MORDE (README mutado ⇒ drift detectado).
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  const here = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
  const DIR = here("../../docs/decisions");
  const README = here("../../docs/decisions/README.md");

  if (process.argv.includes("--write")) {
    writeFileSync(README, buildAdrIndex(readAdrFiles(DIR)));
    console.log(`ADR-INDEX: gravado ${README.replace(process.cwd() + "/", "")}`);
  } else if (process.argv.includes("--check")) {
    const { ok } = checkAdrIndex(DIR, README);
    if (ok) {
      console.log("ADR-INDEX CHECK: PASS (README em dia com os ADRs)");
    } else {
      console.error(
        "ADR-INDEX CHECK: FAIL — README divergente dos ADRs. Rode `adr-index.ts --write` e commite.",
      );
      process.exit(1);
    }
  } else {
    // Self-check (default): (1) índice real == README; (2) o guard MORDE quando um ADR muda sem
    // regenerar. A mordida altera o TÍTULO de um ADR real (preservando o número, senão `parseAdr` já
    // reprovaria por renumeração) — robusto a qualquer status, ao contrário de mexer num `| aceito |`.
    const real = checkAdrIndex(DIR, README);
    const files = readAdrFiles(DIR);
    const indexed = files.map(parseAdr).filter((e): e is AdrEntry => e !== null);
    const realIdx = files.findIndex((f) => indexed.some((e) => e.file === f.name));
    const bites =
      realIdx < 0 ||
      buildAdrIndex(
        files.map((f, i) =>
          i === realIdx
            ? { ...f, content: f.content.replace(/^(#\s+ADR-\d{4}\s+[—–-]\s+).*$/m, "$1DRIFT") }
            : f,
        ),
      ) !== real.expected; // índice muda ⇒ `--check` (README fixo) reprovaria
    console.log(
      JSON.stringify({ caso: "índice REAL × README", emDia: real.ok, adrs: indexed.length }),
    );
    console.log(
      JSON.stringify({ caso: "guard morde (ADR alterado sem regenerar)", detectado: bites }),
    );
    if (!real.ok || !bites) {
      console.error("SELF-CHECK FALHOU: README divergente dos ADRs ou guard não morde.");
      process.exit(1);
    }
  }
}
