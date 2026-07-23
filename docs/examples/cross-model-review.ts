// cross-model-review.ts — Predicado de referência do PROTOCOLO CROSS-MODEL (T5.2 / O5).
//
// Operacionaliza a independência de revisor do ADR-0008 ("revisor independente do autor —
// agente/modelo distinto") num protocolo concreto: o modelo que REVISA/escreve os testes de aceite
// não pode ser o mesmo que IMPLEMENTA, e a DIVERGÊNCIA entre o teste (do revisor) e a implementação
// vira SINAL que roteia a atenção humana. Concordância + verde é evidência de baixo risco (conecta
// ao fast-lane, T5.1); divergência escala. T3/G3 (merge humano) permanece SEMPRE.
//
// EVIDÊNCIA SOB O TOOL-GUARD (ADR-0011/0015) = o modo **sem args** (demo + self-check):
//   node --experimental-strip-types docs/examples/cross-model-review.ts   # demo + self-check
// É o único caminho compatível com o guard (allowlist flags-only, `|` bloqueado) e roda no CI/agente;
// já exercita TODAS as rotas canônicas (concordância/divergência/autorrevisão/T3/T4/malformado) e SAI
// COM CÓDIGO ≠ 0 se qualquer caso divergir do esperado (regressão própria).
//
// Modos de INPUT (roteiam a RODADA REAL de um PR) — para um **operador humano/CI rodando `node`
// diretamente**, FORA do shell guardado do agente. Os args posicionais/`stdin` abaixo NÃO passam pela
// allowlist do guard, e isso é **por design**: o ADR-0015 rejeitou afrouxá-la — não é um bypass, é a
// via não-guardada de quem opera o `node` na mão:
//   node --experimental-strip-types docs/examples/cross-model-review.ts '<json>'
//   echo '<json>' | node --experimental-strip-types docs/examples/cross-model-review.ts -
// Aí a saída cobre a RODADA REAL (implementer/reviewer/testes/classe): um PR autorrevisado ou
// divergente NÃO consegue produzir um output "verde" (fail-closed).

import { readFileSync } from "node:fs";
import process from "node:process";

/** Classe de confiança da ação sob revisão (AGENTS.md §11). */
export type TrustClass = "T0" | "T1" | "T2" | "T3" | "T4";
const TRUST_CLASSES: readonly TrustClass[] = ["T0", "T1", "T2", "T3", "T4"];

/** Uma rodada de revisão cross-model sobre um PR. */
export interface CrossModelRound {
  implementerModel: string; //          quem implementou (autor)
  reviewerModel: string; //             quem revisa / escreveu os testes de aceite
  testsAuthoredByReviewer: boolean; //  os testes de aceite vieram do revisor (não do autor)?
  testsPass: boolean; //                a implementação passa nos testes do revisor?
  trustClass: TrustClass;
}

// `blocked` = ação T4 (proibida, §11): recusar E NOTIFICAR (humano/segurança) — a ação é
// **não-liberável** e não roteável a merge. NÃO significa "sem humano": o L0 exige T4 recusada _e_
// escalada; o que muda vs. `escalate_human` (T3 e divergências) é que aqui o humano é **notificado**,
// mas NÃO arbitra para liberar (numa divergência ele pode limpar; numa T4 não).
export type Route = "human_merge" | "escalate_human" | "blocked";

export interface ReviewDecision {
  route: Route;
  reasons: string[]; //  por que escalou/bloqueou (vazio ⇒ segue para merge humano de rotina)
  independent: boolean; // a independência autor≠revisor foi satisfeita?
}

/** Campos boolean do descritor — validados como estritamente boolean (fail-closed). */
const BOOL_FIELDS: readonly (keyof CrossModelRound)[] = ["testsAuthoredByReviewer", "testsPass"];

/**
 * Formata um valor arbitrário para as mensagens de diagnóstico SEM lançar. `JSON.stringify` lança em
 * `BigInt` (`TypeError`) e devolve `undefined` para `undefined`/funções/símbolos — um caller `any`
 * pode passar qualquer um desses. Aqui o fail-closed precisa **retornar** a rota `escalate_human`, não
 * crashar; então nunca formatamos input com `JSON.stringify` direto.
 */
const fmt = (v: unknown): string => {
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
};

/**
 * Independência de autoria: os identificadores precisam ser não-vazios e distintos.
 * CAVEAT (limite conhecido — não resolvido aqui de propósito): a comparação é sobre o
 * IDENTIFICADOR reportado, não sobre identidade canônica de modelo. Se o MESMO modelo for reportado
 * sob aliases/versões diferentes (ex.: `codex` vs `codex-cli`), esta checagem os trata como
 * distintos e pode rotear a autorrevisão para `human_merge`. Num uso real, o chamador deve
 * **normalizar para um identificador canônico** (família/instância) antes de rotear — ou, na dúvida
 * sobre serem o mesmo modelo, **escalar** (fail-safe). O ADR-0018 documenta que a descorrelação de
 * erros é **parcial**; este predicado captura o caso comum (nomes distintos declarados), não a
 * evasão por alias.
 */
export function distinctAuthorship(implementer: string, reviewer: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase();
  return (
    typeof implementer === "string" &&
    typeof reviewer === "string" &&
    norm(implementer) !== "" &&
    norm(reviewer) !== "" &&
    norm(implementer) !== norm(reviewer)
  );
}

/**
 * Roteamento cross-model (fail-closed — na dúvida, sobe de nível, §11):
 *  - descritor malformado (não-objeto, classe inválida, flags não-boolean, modelos vazios) → escala;
 *  - classe T4 (proibida, §11) → `blocked`: recusar E notificar (humano/segurança), não liberável
 *    nem roteável (precedência sobre o resto — distinto de `escalate_human`, que arbitra p/ liberar);
 *  - autor == revisor (independência quebrada) → escala (viola ADR-0008);
 *  - testes NÃO escritos pelo revisor → escala (perde o valor da derivação independente);
 *  - testes FALHAM (divergência teste×implementação) → escala: humano arbitra (bug ou Issue ambígua);
 *  - classe T3 → escala: exige decisão humana por definição (§11);
 *  - classe T0 → escala: leitura pura não entra na rota de PR/review (descritor suspeito, fail-closed);
 *  - distinto + testes do revisor + verde + classe **T1/T2** → MERGE HUMANO de rotina (T3 nunca é pulado).
 */
export function routeCrossModel(r: CrossModelRound): ReviewDecision {
  // Guarda de objeto: `null`/primitivo/array não são rodadas válidas.
  if (r === null || typeof r !== "object" || Array.isArray(r))
    return {
      route: "escalate_human",
      reasons: [`rodada inválida (${fmt(r)}) — esperado objeto (fail-closed ⇒ escala)`],
      independent: false,
    };
  const rec = r as unknown as Record<string, unknown>;

  // T4 tem PRECEDÊNCIA (§11): proibida ⇒ `blocked`, independentemente dos demais campos — um
  // descritor T4 NÃO pode virar `human_merge` nem mesmo `escalate_human` (não é arbitrável: recusar).
  if (rec.trustClass === "T4")
    return {
      route: "blocked",
      reasons: ["classe T4 — ação proibida (§11): recusar E notificar humano/segurança; não liberável (sem arbitragem-que-libera)"],
      independent: distinctAuthorship(String(rec.implementerModel ?? ""), String(rec.reviewerModel ?? "")),
    };

  // Validação fail-closed: um caller `any`/JS pode passar classe inválida ou flags não-boolean;
  // nada disso pode virar `human_merge` por omissão.
  const typeReasons: string[] = [];
  if (!TRUST_CLASSES.includes(rec.trustClass as TrustClass))
    typeReasons.push(`trustClass inválido (${fmt(rec.trustClass)}) — fail-closed ⇒ escala`);
  if (typeof rec.implementerModel !== "string" || rec.implementerModel.trim() === "")
    typeReasons.push(`implementerModel inválido (${fmt(rec.implementerModel)}) — fail-closed ⇒ escala`);
  if (typeof rec.reviewerModel !== "string" || rec.reviewerModel.trim() === "")
    typeReasons.push(`reviewerModel inválido (${fmt(rec.reviewerModel)}) — fail-closed ⇒ escala`);
  for (const f of BOOL_FIELDS)
    if (typeof rec[f] !== "boolean")
      typeReasons.push(`campo ${f} não-boolean (${fmt(rec[f])}) — fail-closed ⇒ escala`);
  const independent = distinctAuthorship(String(rec.implementerModel ?? ""), String(rec.reviewerModel ?? ""));
  if (typeReasons.length > 0) return { route: "escalate_human", reasons: typeReasons, independent };

  const reasons: string[] = [];
  if (!independent)
    reasons.push(`independência quebrada: revisor (${r.reviewerModel}) == autor (${r.implementerModel})`);
  if (!r.testsAuthoredByReviewer)
    reasons.push("testes de aceite não foram escritos pelo revisor (derivação não-independente)");
  if (!r.testsPass) reasons.push("divergência: implementação falha nos testes do revisor → humano arbitra");
  // T3 nunca é auto-roteado: exige decisão humana por definição (§11). (T4 já saiu como `blocked`.)
  if (r.trustClass === "T3") reasons.push(`classe ${r.trustClass} exige decisão humana (§11)`);
  // T0 (leitura pura) não gera mudança a commitar nem entra na rota de PR/review: um descritor T0 aqui
  // é classificação inválida → escala (fail-closed), nunca `human_merge` (não esconder efeito colateral).
  if (r.trustClass === "T0")
    reasons.push("classe T0 — leitura pura não entra na rota de PR/review; descritor suspeito → escala");
  return { route: reasons.length === 0 ? "human_merge" : "escalate_human", reasons, independent };
}

/** Casos-canônicos com a rota esperada — servem de demo E de auto-verificação. */
const CASOS: ReadonlyArray<{ nome: string; r: CrossModelRound; esperado: Route }> = [
  {
    nome: "Claude implementa, Codex testa, verde (T2)",
    esperado: "human_merge",
    r: { implementerModel: "claude-code", reviewerModel: "codex", testsAuthoredByReviewer: true, testsPass: true, trustClass: "T2" },
  },
  {
    nome: "Codex testa, implementação falha (divergência)",
    esperado: "escalate_human",
    r: { implementerModel: "claude-code", reviewerModel: "codex", testsAuthoredByReviewer: true, testsPass: false, trustClass: "T2" },
  },
  {
    nome: "mesmo modelo revisa a si (independência quebrada)",
    esperado: "escalate_human",
    r: { implementerModel: "claude-code", reviewerModel: "claude-code", testsAuthoredByReviewer: true, testsPass: true, trustClass: "T2" },
  },
  {
    nome: "testes escritos pelo autor, não pelo revisor",
    esperado: "escalate_human",
    r: { implementerModel: "claude-code", reviewerModel: "codex", testsAuthoredByReviewer: false, testsPass: true, trustClass: "T2" },
  },
  {
    nome: "concordância mas classe T3 (exige humano)",
    esperado: "escalate_human",
    r: { implementerModel: "claude-code", reviewerModel: "codex", testsAuthoredByReviewer: true, testsPass: true, trustClass: "T3" },
  },
  {
    nome: "ação T4 proibida (bloqueada, não roteável)",
    esperado: "blocked",
    r: { implementerModel: "claude-code", reviewerModel: "codex", testsAuthoredByReviewer: true, testsPass: true, trustClass: "T4" },
  },
  {
    nome: "descritor T0 (leitura pura não entra em review) → escala",
    esperado: "escalate_human",
    r: { implementerModel: "claude-code", reviewerModel: "codex", testsAuthoredByReviewer: true, testsPass: true, trustClass: "T0" },
  },
  // Casos MALFORMADOS: garantem que o fail-closed é exercido pelo próprio self-check guardado (não só
  // pelo vitest) — uma regressão no fail-closed derruba o self-check (exit ≠ 0), não passa despercebida.
  {
    nome: "descritor malformado: trustClass inválido → fail-closed",
    esperado: "escalate_human",
    r: { implementerModel: "claude-code", reviewerModel: "codex", testsAuthoredByReviewer: true, testsPass: true, trustClass: "T9" as unknown as TrustClass },
  },
  {
    nome: "descritor malformado: flag não-boolean → fail-closed",
    esperado: "escalate_human",
    r: { implementerModel: "claude-code", reviewerModel: "codex", testsAuthoredByReviewer: "sim" as unknown as boolean, testsPass: true, trustClass: "T2" },
  },
];

/** Roda os casos canônicos e assert a `route` esperada; retorna o nº de divergências. */
export function selfCheck(): number {
  let falhas = 0;
  for (const c of CASOS) {
    const d = routeCrossModel(c.r);
    const ok = d.route === c.esperado;
    if (!ok) falhas++;
    console.log(JSON.stringify({ caso: c.nome, ...d, esperado: c.esperado, ok }));
  }
  return falhas;
}

// CLI: sem args ⇒ demo + self-check (exit ≠ 0 em divergência). Com um JSON (ou `-` p/ stdin) ⇒
// roteia aquela rodada REAL. Fail-closed: JSON inválido sai com código 2.
if (import.meta.main ?? (process.argv[1]?.endsWith("cross-model-review.ts") ?? false)) {
  const arg = process.argv[2];
  if (arg && arg !== "--demo") {
    const raw = arg === "-" ? readFileSync(0, "utf8") : arg;
    let round: CrossModelRound;
    try {
      round = JSON.parse(raw) as CrossModelRound;
    } catch (e) {
      console.error(`rodada JSON inválida: ${(e as Error).message}`);
      process.exit(2);
    }
    console.log(JSON.stringify(routeCrossModel(round)));
  } else {
    const falhas = selfCheck();
    if (falhas > 0) {
      console.error(`SELF-CHECK FALHOU: ${falhas} caso(s) divergente(s) do esperado`);
      process.exit(1);
    }
  }
}
