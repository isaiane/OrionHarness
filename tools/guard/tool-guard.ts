// tool-guard.ts — Hook de guarda pre-tool-use de REFERÊNCIA (action system, ADR-0011).
//
// Postura FAIL-SAFE (default-deny): nega por padrão; só libera o que casa a
// allowlist explícita e passa os validadores. Materializa o modelo de confiança
// T0–T4 (AGENTS.md §11) e o "secure by default / fail secure" (§10).
//
// Roda em Node ≥ 22 via type stripping (`node tool-guard.ts`), sem toolchain.
// Preset opt-in: a integração com um runtime de agente específico é por projeto.
//
// Validação de ALVO de leitura (#62/ADR-0013): quando a integração fornece o alvo de uma read tool
// (campo `path`), a guarda inspeciona-o contra a mesma denylist de segredos do lado Bash e falha-
// fechado em alvo sensível ou não-validável. Opt-in por runtime (sem `path` → T0 legado); o modo
// estrito `strictReadTarget` (opt-in por projeto) também barra read tool sem alvo (fail-closed).

export type TrustClass = "T0" | "T1" | "T2" | "T3" | "T4";

export interface ToolCall {
  /** Nome da ferramenta (ex.: "Read", "Bash"). */
  tool: string;
  /** Comando de shell, quando `tool === "Bash"`. */
  command?: string;
  /**
   * Alvo de leitura (caminho/pattern) de uma read tool, **quando o runtime o fornece** — opt-in
   * (#62/ADR-0013). Genérico: o adaptador do runtime mapeia o input da sua read tool para cá.
   */
  path?: string;
}

/** Opções da guarda. */
export interface GuardOptions {
  /**
   * Modo estrito de alvo de leitura (opt-in por projeto): quando `true`, uma read tool **sem** `path`
   * → fail-closed ("alvo esperado e ausente"). Default `false` = modo legado (read sem alvo → T0).
   */
  strictReadTarget?: boolean;
}

export interface Decision {
  allow: boolean;
  klass: TrustClass;
  reason: string;
}

/** Ferramentas de leitura sem efeito colateral (T0) — liberadas. */
const READONLY_TOOLS = new Set(["Read", "Grep", "Glob", "LS", "NotebookRead"]);

/**
 * Allowlist de comandos de shell (T0/T1): regex ancoradas no início do comando. Só cobre formas
 * **read-only/seguras** — formas mutantes das mesmas famílias (ex.: `git branch -D`, `find -delete`)
 * são barradas por `SHELL_MUTATING` antes de chegar aqui.
 *
 * - `node`: restrito a **executar um script versionado do repo** (`tools/`|`scripts/`, `.ts`);
 *   `-e`/`--eval`/alvo arbitrário (ex.: `/tmp/x.ts`) e **traversal** (`tools/../../tmp/evil.ts`) não
 *   casam e caem no default-deny — senão a guarda liberaria execução arbitrária de JS como T1.
 * - `npm`: só `ci`/`install` **por lockfile** (sem pacote arbitrário: `npm install left-pad` cai no
 *   default-deny — evita supply-chain / postinstall arbitrário) e `run <script conhecido>`.
 * - `git branch`: só **formas de listagem** (sem args ou flags read-only); qualquer opção mutante
 *   (`-D`, `--set-upstream-to`, `--edit-description`, …) cai no default-deny — fecha a classe, não
 *   só as opções enumeradas (achado Codex).
 */
const SHELL_ALLOW: RegExp[] = [
  /^git (status|log|diff|show|rev-parse)\b/,
  /^git branch(\s+(-a|-r|-l|-v|-vv|--list|--all|--remotes|--verbose|--color|--no-color))*\s*$/,
  // git remote só formas de leitura; add/remove/rename/set-url/… (mutam .git/config) → default-deny.
  /^git remote( -v| show \S+| get-url \S+)?\s*$/,
  /^(ls|cat|head|tail|wc|grep|rg|find|pwd|echo)\b/,
  /^node --experimental-strip-types (?!\S*\.\.)(tools|scripts)\/[\w./-]+\.ts(\s|$)/,
  /^npm (run (lint|typecheck|test|format)|ci|install)\s*$/,
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

/**
 * Alvos sensíveis de leitura (T4): mesmo comandos de leitura permitidos (`cat`/`head`/`find`/…)
 * não podem acessar segredos/credenciais. A allowlist de shell casa o verbo mas não o alvo —
 * sem isto, `cat .env` ou `cat ~/.ssh/id_rsa` seriam liberados (T1), furando o modelo de segredos
 * do projeto (`docs/runbooks/secrets.md`: segredos locais moram em `.env`). Exemplos públicos
 * (`.env.example`/`.sample`/`.template`/`.dist`) permanecem liberados.
 */
const SENSITIVE_READ_TARGETS: RegExp[] = [
  /\.env\b(?!\.(example|sample|template|dist))/, // .env local (exceto exemplos públicos)
  /(^|[\s"'~=/])\.ssh\//, //                        chaves SSH (~/.ssh/…)
  /\bid_(rsa|dsa|ecdsa|ed25519)\b/, //              chaves privadas
  /\.(pem|key)\b/, //                               material de chave/certificado privado
  /\.(npmrc|git-credentials)\b/, //                 tokens (npm, git)
  /(^|[\s"'~=/])\.aws\//, //                         credenciais AWS
  /\/proc\/[^/\s]+\/environ\b/, //                  environ do processo (segredos em env var)
];

/**
 * Formas **mutantes/executoras** de comandos "de leitura" que NÃO cabem no escopo read-only da
 * allowlist: sem isto, o prefixo classificaria `find . -delete`/`-exec`/`-fls` (deleta/executa/escreve
 * arquivo) ou `git diff --output=<file>` (trunca arquivo) como T1. Barradas antes da allowlist
 * (achados Codex P1 r4/r6). `git branch` mutante é fechado pela allowlist list-only.
 */
const SHELL_MUTATING: RegExp[] = [
  /\bgit\s+branch\b[^\n]*\s(--(delete|move|copy|force)|-[dDmMcC])\b/, // git branch destrutivo
  // find: conjunto fechado de ações que deletam/executam/escrevem arquivo (GNU find).
  /\bfind\b[^\n]*\s-(delete|exec|execdir|ok|okdir|fls|fprint0|fprintf|fprint)(\s|$|\/|=)/,
  /\bgit\b[^\n]*\s--output(=|\s|$)/, // git diff/log --output=<file> trunca/escreve arquivo
];

/**
 * Metacaracteres de shell que encadeiam/redirecionam/substituem comandos ou expandem variáveis
 * (`$VAR`/`$(…)`). Como a allowlist casa apenas o PREFIXO, um composto ("git status && shutdown")
 * ou uma expansão de segredo ("echo $GITHUB_TOKEN") passaria pelo default-deny se não fosse barrado
 * antes: só o prefixo não garante que o comando inteiro é seguro. Fail-safe: comando com metacaractere
 * → bloqueia (a allowlist cresce via review, ADR-0011).
 */
const SHELL_OPERATORS = /[;&|<>`\n$]/;

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
  return (
    typeof o.tool === "string" &&
    (o.command === undefined || typeof o.command === "string") &&
    (o.path === undefined || typeof o.path === "string")
  );
}

/**
 * Colapsa `/./` e `/x/../` para pegar evasão de path por traversal (ex.: `/etc/./passwd` →
 * `/etc/passwd`) antes de casar proibidos/segredos. Usado tanto no lado Bash quanto na validação de
 * alvo de leitura (#62). **Não** resolve globs de shell (ex.: `/etc/p?sswd`): isso exige
 * canonicalização com acesso ao filesystem — **limite residual** do guard regex, coberto pelo caveat
 * do ADR-0011 (distinto do alvo de read tool, que o ADR-0013 passa a validar).
 */
function collapseTraversal(s: string): string {
  let prev: string;
  do {
    prev = s;
    s = s.replace(/\/\.\//g, "/").replace(/\/[^/]+\/\.\.\//g, "/");
  } while (s !== prev);
  return s;
}

/**
 * Valida o ALVO de uma read tool (#62/ADR-0013), espelhando a ordem do lado Bash (segredo antes de
 * liberar). Opt-in: sem `path` segue T0 legado, salvo `strictReadTarget`. A `reason` de bloqueio
 * identifica o padrão negado (não o valor lido) — sem PII/segredo no sinal de decisão (§10).
 */
function guardReadTarget(call: ToolCall, options: GuardOptions): Decision {
  const { tool, path } = call;

  // Sem alvo fornecido: modo legado → T0; modo estrito (opt-in) → fail-closed.
  if (path === undefined) {
    return options.strictReadTarget
      ? {
          allow: false,
          klass: "T2",
          reason: `${tool}: alvo de leitura esperado e ausente (fail-closed)`,
        }
      : { allow: true, klass: "T0", reason: `${tool}: leitura sem efeito colateral` };
  }

  // Alvo presente mas vazio/em branco → não-validável → fail-closed.
  const target = path.trim();
  if (target === "") {
    return {
      allow: false,
      klass: "T2",
      reason: `${tool}: alvo de leitura não-validável (fail-closed)`,
    };
  }

  // Alvo sensível (mesma denylist do lado Bash, com normalização anti-traversal) → block (T4).
  const norm = collapseTraversal(target);
  for (const secret of SENSITIVE_READ_TARGETS) {
    if (secret.test(target) || secret.test(norm)) {
      return { allow: false, klass: "T4", reason: `alvo sensível de leitura: ${secret.source}` };
    }
  }

  // Caminho comum → T0 (sem regressão).
  return { allow: true, klass: "T0", reason: `${tool}: leitura sem efeito colateral` };
}

/** Decide se uma chamada de ferramenta pode ser executada. Nunca lança: na dúvida, bloqueia. */
export function guardToolCall(call: unknown, options: GuardOptions = {}): Decision {
  // 1. Fail-safe: entrada malformada/não-parseável → bloqueia.
  if (!isToolCall(call)) {
    return { allow: false, klass: "T4", reason: "entrada não-parseável (fail-safe block)" };
  }

  // 2. Ferramenta de leitura → T0, mas valida o ALVO quando fornecido (#62/ADR-0013).
  if (READONLY_TOOLS.has(call.tool)) {
    return guardReadTarget(call, options);
  }

  // 3. Shell (Bash): proibidos → segredos → validadores → operadores → mutantes → allowlist → deny.
  if (call.tool === "Bash") {
    const cmd = (call.command ?? "").trim();
    if (cmd === "") {
      return { allow: false, klass: "T4", reason: "comando Bash vazio (fail-safe block)" };
    }
    // Casa proibidos/segredos contra o comando cru E a forma sem traversal (`/./`, `/../`), para
    // pegar evasões como `cat /etc/./passwd`. Globs de shell (`/etc/p?sswd`) ficam para o #62.
    const norm = collapseTraversal(cmd);
    for (const bad of SHELL_FORBID) {
      if (bad.test(cmd) || bad.test(norm))
        return { allow: false, klass: "T4", reason: `padrão proibido: ${bad.source}` };
    }
    for (const secret of SENSITIVE_READ_TARGETS) {
      if (secret.test(cmd) || secret.test(norm))
        return {
          allow: false,
          klass: "T4",
          reason: `acesso a segredo/credencial: ${secret.source}`,
        };
    }
    for (const validate of SENSITIVE_VALIDATORS) {
      const reason = validate(cmd);
      if (reason) return { allow: false, klass: "T3", reason };
    }
    // Composto/encadeado/redireção ou expansão de variável ($VAR) → a allowlist de prefixo não cobre.
    if (SHELL_OPERATORS.test(cmd)) {
      return {
        allow: false,
        klass: "T2",
        reason: "metacaractere/expansão de shell (fail-safe block)",
      };
    }
    for (const mut of SHELL_MUTATING) {
      if (mut.test(cmd))
        return {
          allow: false,
          klass: "T2",
          reason: "forma mutante fora do escopo read-only (fail-safe block)",
        };
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
