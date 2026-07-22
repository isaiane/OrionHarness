// cross-model-review.ts — Predicado de referência do PROTOCOLO CROSS-MODEL (T5.2 / O5).
//
// Operacionaliza a independência de revisor do ADR-0008 ("revisor independente do autor —
// agente/modelo distinto") num protocolo concreto: o modelo que REVISA/escreve os testes de aceite
// não pode ser o mesmo que IMPLEMENTA, e a DIVERGÊNCIA entre o teste (do revisor) e a implementação
// vira SINAL que roteia a atenção humana. Concordância + verde é evidência de baixo risco (conecta
// ao fast-lane, T5.1); divergência escala. T3/G3 (merge humano) permanece SEMPRE.
//
// Roda em Node ≥ 22 via type stripping, sem toolchain:
//   node --experimental-strip-types docs/examples/cross-model-review.ts

import process from "node:process";

export type TrustClass = "T0" | "T1" | "T2" | "T3" | "T4";

/** Uma rodada de revisão cross-model sobre um PR. */
export interface CrossModelRound {
  implementerModel: string; //         quem implementou (autor)
  reviewerModel: string; //            quem revisa / escreveu os testes de aceite
  testsAuthoredByReviewer: boolean; //  os testes de aceite vieram do revisor (não do autor)?
  testsPass: boolean; //                a implementação passa nos testes do revisor?
  trustClass: TrustClass;
}

export type Route = "human_merge" | "escalate_human";

export interface ReviewDecision {
  route: Route;
  reasons: string[]; //  por que escalou (vazio ⇒ segue para merge humano de rotina)
  independent: boolean; // a independência autor≠revisor foi satisfeita?
}

/** Modelos são independentes se são identificadores distintos (não a mesma família/instância). */
export function distinctAuthorship(implementer: string, reviewer: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase();
  return norm(implementer) !== "" && norm(reviewer) !== "" && norm(implementer) !== norm(reviewer);
}

/**
 * Roteamento cross-model:
 *  - autor == revisor (independência quebrada) → escala (viola ADR-0008);
 *  - testes NÃO escritos pelo revisor → escala (perde o valor da derivação independente);
 *  - testes FALHAM (divergência teste×implementação) → escala: humano arbitra
 *    (ou é bug, ou a Issue está ambígua — ambos merecem olho humano);
 *  - distinto + testes do revisor + verde → segue para MERGE HUMANO de rotina (T3 nunca é pulado).
 * "Na dúvida, sobe de nível" (§11): qualquer ruído → escalate_human.
 */
export function routeCrossModel(r: CrossModelRound): ReviewDecision {
  const reasons: string[] = [];
  const independent = distinctAuthorship(r.implementerModel, r.reviewerModel);
  if (!independent)
    reasons.push(`independência quebrada: revisor (${r.reviewerModel}) == autor (${r.implementerModel})`);
  if (!r.testsAuthoredByReviewer)
    reasons.push("testes de aceite não foram escritos pelo revisor (derivação não-independente)");
  if (!r.testsPass) reasons.push("divergência: implementação falha nos testes do revisor → humano arbitra");
  // T3/T4 nunca são auto-roteados: exigem humano por definição (§11).
  if (r.trustClass === "T3" || r.trustClass === "T4")
    reasons.push(`classe ${r.trustClass} exige decisão humana (§11)`);
  return { route: reasons.length === 0 ? "human_merge" : "escalate_human", reasons, independent };
}

// Demo: três rodadas — concordância limpa, divergência, e independência quebrada.
if (process.argv[1]?.endsWith("cross-model-review.ts")) {
  const rounds: Array<{ nome: string; r: CrossModelRound }> = [
    {
      nome: "Claude implementa, Codex testa, verde (T2)",
      r: {
        implementerModel: "claude-code",
        reviewerModel: "codex",
        testsAuthoredByReviewer: true,
        testsPass: true,
        trustClass: "T2",
      },
    },
    {
      nome: "Codex testa, implementação falha (divergência)",
      r: {
        implementerModel: "claude-code",
        reviewerModel: "codex",
        testsAuthoredByReviewer: true,
        testsPass: false,
        trustClass: "T2",
      },
    },
    {
      nome: "mesmo modelo revisa a si (independência quebrada)",
      r: {
        implementerModel: "claude-code",
        reviewerModel: "claude-code",
        testsAuthoredByReviewer: true,
        testsPass: true,
        trustClass: "T2",
      },
    },
  ];
  for (const c of rounds) console.log(JSON.stringify({ caso: c.nome, ...routeCrossModel(c.r) }));
}
