// fast-lane-eligibility.ts — Predicado de referência do FAST-LANE T0/T1 (T5.1 / O5, §11/§3).
//
// Decide, para uma ação proposta por agente, se ela pode seguir pelo caminho leve (fast-lane) ou
// se DEVE cair no fluxo SDD completo. O fast-lane NUNCA afrouxa T3 (merge humano/G3), o CI verde,
// nem toca postura de constituição (isso é G2). É só uma via de menor cerimônia para o que já é
// comprovadamente de baixo risco. "Na dúvida, sobe de nível" (§11) → default é `full`.
//
// Roda em Node ≥ 22 via type stripping, sem toolchain:
//   node --experimental-strip-types docs/examples/fast-lane-eligibility.ts

/** Classe de confiança da ação (AGENTS.md §11). */
export type TrustClass = "T0" | "T1" | "T2" | "T3" | "T4";

/** Descritor mínimo de uma ação candidata ao fast-lane. */
export interface ActionDescriptor {
  trustClass: TrustClass;
  crossesG1: boolean; //        exige plano/Issue aprovada (nova capacidade/escopo)
  crossesG2: boolean; //        decisão estrutural/stack/processo/segurança → ADR
  // Governança por FUNÇÃO (§2 / ADR-0008), não pela lista de 4 exemplos: AGENTS.md, ADRs, gates,
  // checklists de review, seções de processo (CONTRIBUTING/getting-started), foundations.md,
  // workflows de CI que implementam um gate, CLAUDE.md. Na dúvida sobre "é governança?", trate como
  // true (⇒ full). "Instrui/gateia o processo" = governança, mesmo quando executável.
  touchesGovernance: boolean;
  touchesSensitiveData: boolean; // §10 — segredos/PII
  filesTouched: number; //      guardrail dos 3–4 arquivos (§7)
  reversible: boolean; //       efeito desfazível sem dano
}

export type Lane = "fast" | "full";

export interface LaneDecision {
  lane: Lane;
  reasons: string[]; // por que caiu para `full` (vazio ⇒ elegível ao fast-lane)
}

/**
 * Regra do fast-lane (conjuntiva; qualquer falha derruba para `full`):
 *  - classe ∈ {T0, T1} (leitura ou efeito reversível de baixo impacto);
 *  - não cruza G1 nem G2 (sem nova capacidade/escopo nem decisão estrutural);
 *  - não toca governança (por FUNÇÃO — §2/ADR-0008: AGENTS.md/ADR/gates, checklists de review,
 *    seções de processo, foundations.md, workflows de gate…) nem dado sensível;
 *  - cabe no guardrail dos 3–4 arquivos;
 *  - é reversível.
 * O que o fast-lane REMOVE: Issue SDD de 10 campos + ADR para mudanças triviais.
 * O que ele MANTÉM (inegociável): branch → PR → 4 checks verdes → merge humano (T3/G3).
 */
export function classifyLane(a: ActionDescriptor): LaneDecision {
  const reasons: string[] = [];
  if (a.trustClass !== "T0" && a.trustClass !== "T1")
    reasons.push(`classe ${a.trustClass} > T1 (fast-lane só T0/T1)`);
  if (a.crossesG1) reasons.push("cruza G1 (nova capacidade/escopo → precisa de Plano/Issue)");
  if (a.crossesG2) reasons.push("cruza G2 (decisão estrutural/processo → precisa de ADR)");
  if (a.touchesGovernance) reasons.push("toca governança (AGENTS.md/ADR/gates) → G2");
  if (a.touchesSensitiveData) reasons.push("toca dado sensível (§10)");
  if (a.filesTouched > 4) reasons.push(`espalha por ${a.filesTouched} arquivos (> guardrail 3–4)`);
  if (!a.reversible) reasons.push("efeito irreversível");
  return { lane: reasons.length === 0 ? "fast" : "full", reasons };
}

// Demo: dois casos — um elegível, um que escala — impressos como log estruturado.
if (import.meta.main ?? (process.argv[1]?.endsWith("fast-lane-eligibility.ts") ?? false)) {
  const casos: Array<{ nome: string; a: ActionDescriptor }> = [
    {
      nome: "typo em README (T1, reversível, 1 arquivo)",
      a: {
        trustClass: "T1",
        crossesG1: false,
        crossesG2: false,
        touchesGovernance: false,
        touchesSensitiveData: false,
        filesTouched: 1,
        reversible: true,
      },
    },
    {
      nome: "editar gate G3 no AGENTS.md (governança)",
      a: {
        trustClass: "T2",
        crossesG1: false,
        crossesG2: true,
        touchesGovernance: true,
        touchesSensitiveData: false,
        filesTouched: 2,
        reversible: true,
      },
    },
  ];
  for (const c of casos) {
    const d = classifyLane(c.a);
    console.log(JSON.stringify({ caso: c.nome, ...d }));
  }
}
