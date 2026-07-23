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
 * Extrai os ids de seção (`§N`/`§N.M`) do texto do `AGENTS.md`, na mesma convenção do smoke-test
 * (`^## N` / `^### N.M`). É a fonte "viva" da exaustividade — o manifesto é cruzado contra ela.
 */
export function extractSectionIds(agentsMd: string): string[] {
  const ids: string[] = [];
  for (const m of agentsMd.matchAll(/^#{2,3}\s+(\d+(?:\.\d+)?)\b/gm)) ids.push(`§${m[1]}`);
  return ids;
}

/** Orçamento do tier core: linhas de peso no `AGENTS.md` (hoje §1+§3+§11 = 77 ≤ 90). */
export const CORE_BUDGET_LINES = 90;

/**
 * Manifesto CURADO da constituição (todas as §1…§12). `core` = destilado no `AGENTS.core.md` (sempre
 * carregado); `detail` = carregado sob demanda. `lines` = peso aproximado da seção no `AGENTS.md`.
 * Mantido em sincronia com o mapa humano do `AGENTS.core.md` e cruzado com o `AGENTS.md` real (acima).
 */
export const CONSTITUTION_MANIFEST: SectionTier[] = [
  { id: "§1", title: "Princípios inegociáveis", tier: "core", lines: 25 },
  { id: "§2", title: "Papéis do agente (orquestrador + pipeline)", tier: "detail", lines: 68 },
  { id: "§2.1", title: "Fase 0 — Prime (G0)", tier: "detail", lines: 29 },
  { id: "§2.2", title: "Initializer — bootstrap de ambiente", tier: "detail", lines: 29 },
  { id: "§3", title: "Governança e gates (G0–G3)", tier: "core", lines: 25 },
  { id: "§4", title: "Memória e contexto (camadas) + compactação", tier: "detail", lines: 22 },
  { id: "§5", title: "Issues Spec-Driven (SDD)", tier: "detail", lines: 22 },
  { id: "§6", title: "Fluxo de Git e tarefas", tier: "detail", lines: 11 },
  { id: "§7", title: "Fundamentos de engenharia (lean/flat)", tier: "detail", lines: 33 },
  { id: "§8", title: "Qualidade e testes", tier: "detail", lines: 13 },
  { id: "§8.1", title: "Verificação de correção", tier: "detail", lines: 28 },
  { id: "§9", title: "Convenções, documentação e observabilidade", tier: "detail", lines: 8 },
  { id: "§9.1", title: "Data-First (observabilidade do uso)", tier: "detail", lines: 17 },
  { id: "§10", title: "Segurança por design e segredos", tier: "detail", lines: 19 },
  { id: "§11", title: "Fundações arquiteturais + modelo de confiança T0–T4", tier: "core", lines: 27 },
  { id: "§11.1", title: "UI Agent Harness", tier: "detail", lines: 15 },
  { id: "§11.2", title: "Fast-lane (T1)", tier: "detail", lines: 81 },
  { id: "§12", title: "Definition of Done", tier: "detail", lines: 18 },
];

// Demo/self-check: valida o manifesto REAL contra o `AGENTS.md` do repo, depois prova que o guard morde
// (mutação: remove §7 do manifesto → órfã). Exit ≠ 0 se o caso válido falhar (adequado a gate de CI).
if (process.argv[1]?.endsWith("l0-core-manifest.ts")) {
  const agentsPath = fileURLToPath(new URL("../../AGENTS.md", import.meta.url));
  const ids = extractSectionIds(readFileSync(agentsPath, "utf-8"));

  const valido = validateManifest(ids, CONSTITUTION_MANIFEST, CORE_BUDGET_LINES);
  const mutado = validateManifest(
    ids,
    CONSTITUTION_MANIFEST.filter((s) => s.id !== "§7"), // esquece a §7 → órfã
    CORE_BUDGET_LINES,
  );

  console.log(JSON.stringify({ caso: "manifesto REAL × AGENTS.md", seçõesNoAgents: ids.length, ...valido }));
  console.log(JSON.stringify({ caso: "mutação (§7 removida do manifesto)", ...mutado }));

  if (!valido.ok) {
    console.error("FALHA: manifesto real inválido contra o AGENTS.md — reclassifique/renumere.");
    process.exit(1);
  }
}
