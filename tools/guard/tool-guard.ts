// tool-guard.ts — Hook de guarda pre-tool-use de REFERÊNCIA (action system, ADR-0011).
//
// Postura FAIL-SAFE (default-deny): nega por padrão; só libera o que casa a
// allowlist explícita e passa os validadores. Materializa o modelo de confiança
// T0–T4 (AGENTS.md §11) e o "secure by default / fail secure" (§10).
//
// Roda em Node ≥ 22 via type stripping (`node tool-guard.ts`), sem toolchain.
// Preset opt-in: a integração com um runtime de agente específico é por projeto.

export type TrustClass = "T0" | "T1" | "T2" | "T3" | "T4";

export interface ToolCall {
  /** Nome da ferramenta (ex.: "Read", "Bash"). */
  tool: string;
  /** Comando de shell, quando `tool === "Bash"`. */
  command?: string;
}

export interface Decision {
  allow: boolean;
  klass: TrustClass;
  reason: string;
}

/** Ferramentas de leitura sem efeito colateral (T0) — liberadas. */
const READONLY_TOOLS = new Set(["Read", "Grep", "Glob", "LS", "NotebookRead"]);

/** Allowlist de comandos de shell (T0/T1): regex ancoradas no início do comando. */
const SHELL_ALLOW: RegExp[] = [
  /^git (status|log|diff|show|branch|rev-parse|remote -v)\b/,
  /^(ls|cat|head|tail|wc|grep|rg|find|pwd|echo)\b/,
  /^node --experimental-strip-types \S/,
  /^npm (run (lint|typecheck|test|format)|ci|install)\b/,
  /^\.\/(init\.sh|scripts\/smoke-test\.sh)\b/,
];

/** Proibidos (T4): bloqueio incondicional — PRECEDE a allowlist. */
const SHELL_FORBID: RegExp[] = [
  /\brm\s+-[rf]{1,2}\s+[~/]/, //           remoção destrutiva de raiz/home
  /:\s*\(\s*\)\s*\{.*\}\s*;/, //           fork bomb
  /\b(curl|wget)\b[^\n]*\|\s*(sh|bash|zsh)\b/, // baixa-e-executa
  /\bgit\s+push\b[^\n]*--force\b/, //      force-push
  /\/etc\/(passwd|shadow)\b/, //           credenciais do sistema
];

/** Validadores de comandos sensíveis: retornam motivo do bloqueio (T3) ou null. */
const SENSITIVE_VALIDATORS: Array<(cmd: string) => string | null> = [
  (cmd) =>
    /\bgit\s+push\b/.test(cmd) && /(\borigin\b\s+)?\bmain\b/.test(cmd)
      ? "push direto para main é T3 (o merge é humano)"
      : null,
  (cmd) => (/\bnpm\s+publish\b/.test(cmd) ? "npm publish é T3 (release é humano)" : null),
];

function isToolCall(x: unknown): x is ToolCall {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.tool === "string" && (o.command === undefined || typeof o.command === "string");
}

/** Decide se uma chamada de ferramenta pode ser executada. Nunca lança: na dúvida, bloqueia. */
export function guardToolCall(call: unknown): Decision {
  // 1. Fail-safe: entrada malformada/não-parseável → bloqueia.
  if (!isToolCall(call)) {
    return { allow: false, klass: "T4", reason: "entrada não-parseável (fail-safe block)" };
  }

  // 2. Ferramenta de leitura sem efeito colateral → T0.
  if (READONLY_TOOLS.has(call.tool)) {
    return { allow: true, klass: "T0", reason: `${call.tool}: leitura sem efeito colateral` };
  }

  // 3. Shell (Bash): proibidos → validadores sensíveis → allowlist → default-deny.
  if (call.tool === "Bash") {
    const cmd = (call.command ?? "").trim();
    if (cmd === "") {
      return { allow: false, klass: "T4", reason: "comando Bash vazio (fail-safe block)" };
    }
    for (const bad of SHELL_FORBID) {
      if (bad.test(cmd))
        return { allow: false, klass: "T4", reason: `padrão proibido: ${bad.source}` };
    }
    for (const validate of SENSITIVE_VALIDATORS) {
      const reason = validate(cmd);
      if (reason) return { allow: false, klass: "T3", reason };
    }
    for (const ok of SHELL_ALLOW) {
      if (ok.test(cmd)) return { allow: true, klass: "T1", reason: "comando casa a allowlist" };
    }
    return { allow: false, klass: "T2", reason: "fora da allowlist (fail-safe block)" };
  }

  // 4. Ferramenta desconhecida → bloqueia por padrão (fail-safe).
  return {
    allow: false,
    klass: "T2",
    reason: `ferramenta não reconhecida: ${call.tool} (fail-safe block)`,
  };
}
