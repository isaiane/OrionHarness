// observability-cost-log.ts — Exemplo mínimo do sinal de CUSTO/TOKENS por execução (T4.3, §9/§9.1).
//
// Emite uma linha de log estruturado JSON (a base de observabilidade, docs/observability.md) com o
// objeto `cost`, correlacionada por `correlation_id` (Issue → branch → commit → PR). Sem PII/segredos
// (§10). Preset opt-in por stack — a convenção define o formato; a instrumentação é por projeto.
//
// Roda em Node ≥ 22 via type stripping, sem toolchain:
//   node --experimental-strip-types docs/examples/observability-cost-log.ts
import { fileURLToPath } from "node:url";
import process from "node:process";

/** Sinal de custo de uma execução de agente. */
export interface CostSignal {
  model: string; //         id do modelo usado (não é segredo)
  tokens_input: number;
  tokens_output: number;
  tokens_total: number; //  = input + output
  usd: number; //           custo estimado em USD (ver estimateUsd)
}

/** Evento de custo — estende o log estruturado base (docs/observability.md §"Logging estruturado"). */
export interface AgentExecutionCostLog {
  timestamp: string;
  level: "info";
  message: string;
  correlation_id: string; // liga Issue → branch → commit → PR (§9)
  actor: "agent";
  context: string; //       bounded context / fase do pipeline
  event: "agent.execution.cost";
  cost: CostSignal;
}

/** Custo estimado (USD) a partir de tokens e preço por 1k tokens (in/out). */
export function estimateUsd(
  tokensInput: number,
  tokensOutput: number,
  pricePer1kInput: number,
  pricePer1kOutput: number,
): number {
  const usd = (tokensInput / 1000) * pricePer1kInput + (tokensOutput / 1000) * pricePer1kOutput;
  return Math.round(usd * 1e6) / 1e6; // 6 casas decimais
}

/** Monta o evento de custo de uma execução de agente (campos redigidos — §10). */
export function costLog(params: {
  correlationId: string;
  context: string;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  pricePer1kInput: number;
  pricePer1kOutput: number;
}): AgentExecutionCostLog {
  return {
    timestamp: new Date().toISOString(),
    level: "info",
    message: "custo de execução do agente",
    correlation_id: params.correlationId,
    actor: "agent",
    context: params.context,
    event: "agent.execution.cost",
    cost: {
      model: params.model,
      tokens_input: params.tokensInput,
      tokens_output: params.tokensOutput,
      tokens_total: params.tokensInput + params.tokensOutput,
      usd: estimateUsd(
        params.tokensInput,
        params.tokensOutput,
        params.pricePer1kInput,
        params.pricePer1kOutput,
      ),
    },
  };
}

// Demo: quando rodado diretamente, emite uma linha do sinal de custo em stdout.
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  const log = costLog({
    correlationId: "issue-53/feat-53-observabilidade-custo/PR",
    context: "pipeline:build",
    model: "example-model-1",
    tokensInput: 12000,
    tokensOutput: 3400,
    pricePer1kInput: 0.003,
    pricePer1kOutput: 0.015,
  });
  console.log(JSON.stringify(log));
}
