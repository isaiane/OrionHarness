// l0-core-manifest.ts — Guarda de referência do NÚCLEO L0 CONDENSADO (T5.3 / O5, §4; ADR-0019).
//
// A T5.3 sub-particiona a camada **L0** (§4: `AGENTS.md`/`CLAUDE.md`/`foundations.md` — a constituição)
// em duas fatias: um NÚCLEO sempre-carregado (`AGENTS.core.md` — as regras que todo agente precisa por
// sessão) e o DETALHE sob demanda. NÃO redefine "L0" (termo formal da §4) nem cria uma segunda fonte da
// verdade: o `AGENTS.md` continua canônico; o núcleo é uma VISÃO condensada dele.
//
// Este guard valida um MANIFESTO que classifica cada seção da constituição em `core` | `detail`:
//   - EXAUSTIVO: toda seção existente recebe exatamente um tier (a lição do #43 — classificação cobre
//     todos os casos; nada órfão);
//   - SEM duplicata (nenhuma seção em dois tiers) e SEM fantasma (nenhum §X inexistente);
//   - ORÇAMENTO: o núcleo cabe no budget de linhas (o ponto da tarefa: reduzir a janela).
//
// ANTI-DRIFT: a lista de seções existentes é extraída do PRÓPRIO `AGENTS.md` em runtime
// (`extractSectionIds`) e cruzada com o manifesto curado abaixo — adicionar/renumerar uma seção sem
// reclassificar quebra o guard (e o CI, via `scripts/smoke-test.sh`).
//
// Roda em Node ≥ 22 via type stripping, sem toolchain:
//   node --experimental-strip-types docs/examples/l0-core-manifest.ts

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type Tier = "core" | "detail";

/** Uma seção da constituição classificada por tier. */
export interface SectionTier {
  id: string; //     ex.: "§1", "§11.2" — NÃO renumerar seções (refs cross-doc quebram)
  title: string;
  tier: Tier;
  lines: number; //  peso aproximado da seção no AGENTS.md
}

export interface ManifestReport {
  ok: boolean;
  coreLines: number;
  detailLines: number;
  violations: string[];
}

/**
 * Valida o manifesto do núcleo L0.
 * @param allSectionIds  todas as seções existentes na constituição (fonte: AGENTS.md).
 * @param manifest       classificação core|detail de cada seção.
 * @param coreBudgetLines orçamento máximo de linhas do núcleo sempre-carregado.
 */
export function validateManifest(
  allSectionIds: string[],
  manifest: SectionTier[],
  coreBudgetLines: number,
): ManifestReport {
  const violations: string[] = [];
  const seen = new Map<string, number>();
  for (const s of manifest) seen.set(s.id, (seen.get(s.id) ?? 0) + 1);

  // Exaustividade: toda seção existente está no manifesto.
  for (const id of allSectionIds)
    if (!seen.has(id)) violations.push(`seção ${id} não classificada (órfã — viola exaustividade)`);
  // Sem duplicata / sem seção fantasma.
  for (const [id, n] of seen) {
    if (n > 1) violations.push(`seção ${id} classificada ${n}× (duplicada)`);
    if (!allSectionIds.includes(id)) violations.push(`seção ${id} no manifesto não existe na constituição`);
  }

  const coreLines = manifest.filter((s) => s.tier === "core").reduce((a, s) => a + s.lines, 0);
  const detailLines = manifest.filter((s) => s.tier === "detail").reduce((a, s) => a + s.lines, 0);
  if (coreLines > coreBudgetLines)
    violations.push(`núcleo com ${coreLines} linhas > orçamento ${coreBudgetLines}`);

  return { ok: violations.length === 0, coreLines, detailLines, violations };
}

/**
 * Extrai as seções (`§N`/`§N.M`) do `AGENTS.md` COM O PESO REAL de cada uma — as linhas entre o seu
 * heading (`^## N` / `^### N.M`) e o próximo (a última vai até o fim). Fonte "viva" da exaustividade
 * E do orçamento: os `lines` NÃO são constante confiada — vêm do documento real (achado Codex #2).
 */
export function extractSections(agentsMd: string): { id: string; lines: number }[] {
  const rows = agentsMd.split(/\r?\n/);
  const heads: { id: string; at: number }[] = [];
  rows.forEach((ln, i) => {
    const m = ln.match(/^#{2,3}\s+(\d+(?:\.\d+)?)\b/);
    if (m) heads.push({ id: `§${m[1]}`, at: i });
  });
  return heads.map((h, k) => ({
    id: h.id,
    lines: (k + 1 < heads.length ? heads[k + 1]!.at : rows.length) - h.at - 1,
  }));
}

/** Ids de seção na ordem do `AGENTS.md` (derivados de `extractSections` — fonte única). */
export function extractSectionIds(agentsMd: string): string[] {
  return extractSections(agentsMd).map((s) => s.id);
}

/** Orçamento do tier core: linhas de peso no `AGENTS.md` (hoje §1+§3+§11 = 77 ≤ 90). */
export const CORE_BUDGET_LINES = 90;

/**
 * Classificação CURADA de tier por seção (todas as §1…§12). Só o `tier` é curado — `core` = destilado no
 * `AGENTS.core.md` (sempre carregado); `detail` = carregado sob demanda. As LINHAS vêm do `AGENTS.md`
 * real (`buildManifest`), então crescer uma seção core estoura o orçamento e o CI reprova — o núcleo
 * não pode divergir em silêncio (achado Codex #2). Mantido em sincronia com o mapa do `AGENTS.core.md`.
 */
export const CONSTITUTION_TIERS: { id: string; title: string; tier: Tier }[] = [
  { id: "§1", title: "Princípios inegociáveis", tier: "core" },
  { id: "§2", title: "Papéis do agente (orquestrador + pipeline)", tier: "detail" },
  { id: "§2.1", title: "Fase 0 — Prime (G0)", tier: "detail" },
  { id: "§2.2", title: "Initializer — bootstrap de ambiente", tier: "detail" },
  { id: "§3", title: "Governança e gates (G0–G3)", tier: "core" },
  { id: "§4", title: "Memória e contexto (camadas) + compactação", tier: "detail" },
  { id: "§5", title: "Issues Spec-Driven (SDD)", tier: "detail" },
  { id: "§6", title: "Fluxo de Git e tarefas", tier: "detail" },
  { id: "§7", title: "Fundamentos de engenharia (lean/flat)", tier: "detail" },
  { id: "§8", title: "Qualidade e testes", tier: "detail" },
  { id: "§8.1", title: "Verificação de correção", tier: "detail" },
  { id: "§9", title: "Convenções, documentação e observabilidade", tier: "detail" },
  { id: "§9.1", title: "Data-First (observabilidade do uso)", tier: "detail" },
  { id: "§10", title: "Segurança por design e segredos", tier: "detail" },
  { id: "§11", title: "Fundações arquiteturais + modelo de confiança T0–T4", tier: "core" },
  { id: "§11.1", title: "UI Agent Harness", tier: "detail" },
  { id: "§11.2", title: "Fast-lane (T1)", tier: "detail" },
  { id: "§12", title: "Definition of Done", tier: "detail" },
];

/**
 * Monta o manifesto EFETIVO: junta a classificação curada (`tier`) com o PESO REAL de cada seção no
 * `AGENTS.md`. Entrada curada sem seção correspondente no doc → `lines: 0` (o cross-check de fantasma
 * de `validateManifest` a acusa); seção no doc fora da lista curada → órfã (exaustividade).
 */
export function buildManifest(agentsMd: string): SectionTier[] {
  const live = new Map(extractSections(agentsMd).map((s) => [s.id, s.lines]));
  return CONSTITUTION_TIERS.map((c) => ({ ...c, lines: live.get(c.id) ?? 0 }));
}

// Demo/self-check: valida o manifesto REAL (tiers curados × pesos vivos) contra o `AGENTS.md` do repo,
// depois prova que o guard morde (mutação: remove §7 → órfã). Exit ≠ 0 se o caso válido falhar (CI).
if (process.argv[1]?.endsWith("l0-core-manifest.ts")) {
  const agentsMd = readFileSync(fileURLToPath(new URL("../../AGENTS.md", import.meta.url)), "utf-8");
  const ids = extractSectionIds(agentsMd);
  const manifest = buildManifest(agentsMd);

  const valido = validateManifest(ids, manifest, CORE_BUDGET_LINES);
  const mutado = validateManifest(ids, manifest.slice(1), CORE_BUDGET_LINES); // esquece a §1 → órfã

  console.log(JSON.stringify({ caso: "manifesto REAL × AGENTS.md (pesos vivos)", seçõesNoAgents: ids.length, ...valido }));
  console.log(JSON.stringify({ caso: "mutação (1ª seção removida do manifesto)", ...mutado }));

  if (!valido.ok) {
    console.error("FALHA: manifesto real inválido contra o AGENTS.md — reclassifique/renumere/reoçamente.");
    process.exit(1);
  }
}
