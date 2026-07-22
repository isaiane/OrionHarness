// fast-lane-eligibility.ts — Predicado de referência do FAST-LANE T1 (T5.1 / O5, §11/§3).
//
// Decide, para uma ação proposta por agente, se ela pode seguir pelo caminho leve (fast-lane) ou
// se DEVE cair no fluxo SDD completo. O fast-lane NUNCA afrouxa T3 (merge humano/G3), o CI verde,
// nem toca postura de constituição (isso é G2). É só uma via de menor cerimônia para o que já é
// comprovadamente de baixo risco. "Na dúvida, sobe de nível" (§11) → default é `full`.
//
// Roda em Node ≥ 22 via type stripping, sem toolchain:
//   node --experimental-strip-types docs/examples/fast-lane-eligibility.ts            # demo + self-check
//   node --experimental-strip-types docs/examples/fast-lane-eligibility.ts '<json>'   # classifica 1 descritor
//   echo '<json>' | node --experimental-strip-types docs/examples/fast-lane-eligibility.ts -
// Em modo demo, o script SAI COM CÓDIGO ≠ 0 se qualquer caso divergir do resultado esperado
// (regressão própria do predicado — Codex #U).

import { readFileSync } from "node:fs";

/** Classe de confiança da ação (AGENTS.md §11). */
export type TrustClass = "T0" | "T1" | "T2" | "T3" | "T4";
const TRUST_CLASSES: readonly TrustClass[] = ["T0", "T1", "T2", "T3", "T4"];

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

/** Campos boolean do descritor — validados como estritamente boolean (fail-closed, Codex #T). */
const BOOL_FIELDS: readonly (keyof ActionDescriptor)[] = [
  "crossesG1",
  "crossesG2",
  "touchesGovernance",
  "touchesSensitiveData",
  "reversible",
];

// `blocked` = ação T4 (proibida, §11): recusar e escalar — NÃO é roteável nem a `fast` nem a `full`.
export type Lane = "fast" | "full" | "blocked";

export interface LaneDecision {
  lane: Lane;
  reasons: string[]; // por que caiu para `full`/`blocked` (vazio ⇒ elegível ao fast-lane)
}

/**
 * Regra do fast-lane (conjuntiva; qualquer falha derruba para `full`):
 *  - descritor bem-formado (classe válida + todos os flags boolean; senão fail-closed ⇒ full);
 *  - classe = T1 (efeito reversível de baixo impacto a integrar). T0 puro (leitura) não usa a via —
 *    não há mudança a commitar; T4 é `blocked` (recusar/escalar). O domínio deste predicado é
 *    "mudança a integrar" (T1+);
 *  - não cruza G1 nem G2 (sem nova capacidade/escopo nem decisão estrutural);
 *  - não toca governança (por FUNÇÃO — §2/ADR-0008: AGENTS.md/ADR/gates, checklists de review,
 *    seções de processo, foundations.md, workflows de gate…) nem dado sensível;
 *  - cabe no guardrail dos 3–4 arquivos;
 *  - é reversível.
 * O que o fast-lane REMOVE: Issue SDD de 10 campos + ADR para mudanças triviais.
 * O que ele MANTÉM (inegociável): branch → PR → 4 checks verdes → merge humano (T3/G3).
 */
export function classifyLane(a: ActionDescriptor): LaneDecision {
  // Validação fail-closed de tipos: um caller `any`/JS pode passar não-booleans (`crossesG1: 0`,
  // `touchesGovernance: undefined`) ou classe inválida; nada disso pode virar `fast` por omissão.
  const record = a as unknown as Record<string, unknown>;
  const typeReasons: string[] = [];
  if (!TRUST_CLASSES.includes(record.trustClass as TrustClass))
    typeReasons.push(`trustClass inválido (${JSON.stringify(record.trustClass)}) — fail-closed ⇒ full`);
  for (const f of BOOL_FIELDS)
    if (typeof record[f] !== "boolean")
      typeReasons.push(`campo ${f} não-boolean (${JSON.stringify(record[f])}) — fail-closed ⇒ full`);
  if (typeReasons.length > 0) return { lane: "full", reasons: typeReasons };

  // T4 é PROIBIDA (§11): não é fast nem full — recusar e escalar. Tem de sair antes da seleção.
  if (a.trustClass === "T4")
    return { lane: "blocked", reasons: ["classe T4 — ação proibida (§11): recusar e escalar, não roteável"] };
  const reasons: string[] = [];
  if (a.trustClass !== "T1")
    reasons.push(`classe ${a.trustClass} ≠ T1 (fast-lane é só T1; T0 puro não precisa de via, §11.2)`);
  if (a.crossesG1) reasons.push("cruza G1 (nova capacidade/escopo → precisa de Plano/Issue)");
  if (a.crossesG2) reasons.push("cruza G2 (decisão estrutural/processo → precisa de ADR)");
  if (a.touchesGovernance) reasons.push("toca governança (AGENTS.md/ADR/gates) → G2");
  if (a.touchesSensitiveData) reasons.push("toca dado sensível (§10)");
  // fail-closed: um filesTouched inválido (negativo/NaN/fracionário) NÃO pode furar o guardrail.
  if (!Number.isInteger(a.filesTouched) || a.filesTouched < 1)
    reasons.push(`filesTouched inválido (${a.filesTouched}) — esperado inteiro ≥ 1 (fail-closed ⇒ full)`);
  else if (a.filesTouched > 4)
    reasons.push(`espalha por ${a.filesTouched} arquivos (> guardrail 3–4)`);
  if (!a.reversible) reasons.push("efeito irreversível");
  return { lane: reasons.length === 0 ? "fast" : "full", reasons };
}

/** Casos-canônicos com o resultado esperado — servem de demo E de auto-verificação (Codex #U). */
const CASOS: ReadonlyArray<{ nome: string; a: ActionDescriptor; esperado: Lane }> = [
  {
    nome: "typo em README (T1, reversível, 1 arquivo)",
    esperado: "fast",
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
    esperado: "full",
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
  {
    nome: "exfiltrar segredo (T4 — proibida)",
    esperado: "blocked",
    a: {
      trustClass: "T4",
      crossesG1: false,
      crossesG2: false,
      touchesGovernance: false,
      touchesSensitiveData: true,
      filesTouched: 1,
      reversible: false,
    },
  },
];

/** Roda os casos canônicos e assert o `lane` esperado; retorna o nº de divergências. */
export function selfCheck(): number {
  let falhas = 0;
  for (const c of CASOS) {
    const d = classifyLane(c.a);
    const ok = d.lane === c.esperado;
    if (!ok) falhas++;
    console.log(JSON.stringify({ caso: c.nome, ...d, esperado: c.esperado, ok }));
  }
  return falhas;
}

// CLI: sem args ⇒ demo + self-check (exit ≠ 0 em divergência). Com um JSON (ou `-` p/ stdin) ⇒
// classifica aquele descritor. Assim a evidência anexada a um PR cobre a AÇÃO REAL, não casos fixos.
if (import.meta.main ?? (process.argv[1]?.endsWith("fast-lane-eligibility.ts") ?? false)) {
  const arg = process.argv[2];
  if (arg && arg !== "--demo") {
    const raw = arg === "-" ? readFileSync(0, "utf8") : arg;
    let descriptor: ActionDescriptor;
    try {
      descriptor = JSON.parse(raw) as ActionDescriptor;
    } catch (e) {
      console.error(`descritor JSON inválido: ${(e as Error).message}`);
      process.exit(2);
    }
    console.log(JSON.stringify(classifyLane(descriptor)));
  } else {
    const falhas = selfCheck();
    if (falhas > 0) {
      console.error(`SELF-CHECK FALHOU: ${falhas} caso(s) divergente(s) do esperado`);
      process.exit(1);
    }
  }
}
