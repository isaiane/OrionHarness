// cross-model-trigger.ts — Predicado de referência do GATILHO CROSS-MODEL (T7.4 / O7).
//
// STUB (spike #270): a IMPLEMENTAÇÃO real vem DEPOIS dos testes de aceite autorados pelo Codex
// (ADR-0018: autor dos testes ≠ implementador; ADR-0030: testes = contrato, escritos antes). Este
// stub existe só para o módulo RESOLVER — assim o teste do Codex falha por COMPORTAMENTO AUSENTE
// (red bom), não por import quebrado (red ruim). NÃO adicione a lógica aqui até os testes do Codex
// estarem no PR e vermelhos.
//
// Dada a lista de arquivos alterados de um PR, decide se a revisão cross-model (pipeline ADR-0030) é
// EXIGIDA. Heurística de SUPERFÍCIE de arquivo apenas — classe de confiança (T0–T4) e governança-por-
// função ficam com o chamador/Issue (como fast-lane-eligibility.ts recebe descritor já classificado).

/** Decisão do gatilho: a revisão cross-model é exigida para este conjunto de arquivos? */
export interface TriggerDecision {
  required: boolean;
  reason: string; //  por que exige / dispensa (nunca vazio)
}

/**
 * Decide se a revisão cross-model é exigida a partir da lista de arquivos alterados.
 * Contrato (Issue #270 §6): determinístico por extensão/caminho; fail-closed = `required: true`;
 * nunca lança (erro vira `required: true`). A implementação real substitui este stub após o red.
 */
export function crossModelRequired(_changedFiles: readonly string[]): TriggerDecision {
  throw new Error("not implemented — aguardando os testes de aceite do Codex (spike #270)");
}
