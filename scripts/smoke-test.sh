#!/usr/bin/env bash
# =============================================================================
# Orion Harness — Smoke-test de autovalidação
#
# Valida, de forma automatizável, a integridade do harness em duas frentes:
#   1) ESTÁTICA      — sintaxe, consistência, links e completude dos artefatos.
#   2) COMPORTAMENTAL — os guardrails "mordem" (Conventional Commits rejeita
#                       mensagem inválida; secret scan detecta segredo plantado).
#
# Usa as ferramentas reais quando disponíveis (gitleaks, pre-commit); caso
# contrário, aplica um equivalente offline e sinaliza no log. Sai com código != 0
# se qualquer verificação falhar — adequado para gate de CI.
#
# Uso:  bash scripts/smoke-test.sh
# =============================================================================
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
[ -z "$ROOT" ] && ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || { echo "não encontrei a raiz do repositório"; exit 1; }

PASS=0; FAIL=0
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; PASS=$((PASS+1)); }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$1"; FAIL=$((FAIL+1)); }
head() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }

# ---------------------------------------------------------------------------
head "1. Estática — sintaxe, consistência e completude"
# Runtime único: Node (ADR-0005/0012). Sem python/pyyaml — parse de YAML substituído por checagem
# estrutural leve (Issue #75, escolha (b)): sem parser/dep, sem `node_modules`, sem `npm install`.
node --input-type=module - <<'JS' && ok "camada estática íntegra" || bad "camada estática com problemas"
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, normalize, dirname } from "node:path";

const errs = [];
const read = (f) => readFileSync(f, "utf-8");

// Espelha os SKIP_DIRS do os.walk python (gerados/dependências/scratch).
const SKIP = new Set([".git", "node_modules", ".orion", "dist", "coverage", ".pytest_cache"]);
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
const files = walk(".").map((p) => p.replace(/^\.\//, ""));

// YAML — checagem estrutural LEVE (sem parser; escolha (b) da #75). O parse python só verificava
// "é YAML sintaticamente válido"; sem reintroduzir parser/dep, cobrimos a classe de quebra comum e
// determinística: arquivo não-vazio e SEM TAB de indentação (YAML proíbe tab p/ indentar). O schema
// dos workflows é validado pelo próprio GitHub Actions no push; o template SDD (estruturado) é
// checado por campos abaixo.
const yamlFiles = files.filter(
  (f) => /\.ya?ml$/.test(f) && (f.startsWith(".github/") || f === ".pre-commit-config.yaml"),
);
for (const f of yamlFiles) {
  const txt = read(f);
  if (txt.trim() === "") { errs.push(`YAML vazio: ${f}`); continue; }
  txt.split(/\r?\n/).forEach((ln, i) => {
    if (/^ *\t/.test(ln) || /^\t/.test(ln)) errs.push(`YAML ${f}:${i + 1}: TAB na indentação (YAML proíbe)`);
  });
}

// JSON — parse real (Node tem JSON nativo).
for (const f of files.filter((f) => f.startsWith("presets/") && f.endsWith(".json"))) {
  try { JSON.parse(read(f)); } catch (e) { errs.push(`JSON ${f}: ${e.message}`); }
}

// Links internos .md (só alvos com extensão ou terminados em "/", como no python).
const linkRe = /\]\((?!https?:\/\/)([^)#]+?)(?:#[^)]*)?\)/g;
for (const p of files.filter((f) => f.endsWith(".md"))) {
  const txt = read(p);
  for (const m of txt.matchAll(linkRe)) {
    const tgt = m[1];
    if (!/\.\w+$/.test(tgt) && !tgt.endsWith("/")) continue;
    if (!existsSync(normalize(join(dirname(p), tgt)))) errs.push(`link quebrado: ${p} -> ${tgt}`);
  }
}

// Cross-refs de seções (§N): válidas se existirem em AGENTS.md OU nos docs de arquitetura.
const secs = new Set();
for (const f of ["AGENTS.md", ...files.filter((f) => /^docs\/architecture\/.*\.md$/.test(f))]) {
  if (!existsSync(f)) continue;
  for (const m of read(f).matchAll(/^#{2,3}\s+(\d+(?:\.\d+)?)/gm)) secs.add(m[1]);
}
const refs = new Set([...read("AGENTS.md").matchAll(/§\s*(\d+(?:\.\d+)?)/g)].map((m) => m[1]));
for (const r of [...refs].filter((r) => !secs.has(r)).sort()) errs.push(`§${r} referenciado mas inexistente`);

// Artefatos obrigatórios.
const must = ["AGENTS.md", "AGENTS.core.md", "CLAUDE.md", "README.md", "PLAN.md", "STATE.md", "MEMORY.md",
  "CHANGELOG.md", "SECURITY.md", "CONTRIBUTING.md", ".env.example",
  "docs/architecture/foundations.md", "docs/architecture/ui-agent-harness.md",
  "docs/product/spec.md", "docs/product/product-context.md", "docs/product/discovery-guide.md",
  "docs/decisions/0001-fundacoes-do-orion-harness.md",
  ".github/ISSUE_TEMPLATE/sdd-task.yml", ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/workflows/ci.yml"];
for (const m of must) if (!existsSync(m)) errs.push(`artefato ausente: ${m}`);

// Template de Issue SDD completo — extrai os `label:` via regex (sem parser YAML).
const sddPath = ".github/ISSUE_TEMPLATE/sdd-task.yml";
if (!existsSync(sddPath)) {
  errs.push("Issue SDD: template ausente");
} else {
  const labels = [...read(sddPath).matchAll(/^\s*label:\s*(.+?)\s*$/gm)]
    .map((m) => m[1].replace(/^["']|["']$/g, "").toLowerCase());
  const req = ["Contexto", "Problema", "Objetivo", "Escopo", "Fora de escopo", "Critérios de aceite",
    "Data-First", "Dependências", "Riscos", "Plano de validação", "Definição de pronto"];
  for (const r of req) if (!labels.some((l) => l.includes(r.toLowerCase()))) errs.push(`Issue SDD sem campo: ${r}`);
  if (!labels.some((l) => l.includes("confian"))) errs.push("Issue SDD sem classe de confiança");
}

// PR template força a verificação §8.1.
const pr = existsSync(".github/PULL_REQUEST_TEMPLATE.md") ? read(".github/PULL_REQUEST_TEMPLATE.md") : "";
for (const c of ["Conforme a Spec", "regras de negócio", "decisões arquiteturais", "fluxos existentes", "Regressões"])
  if (!pr.includes(c)) errs.push(`PR template sem item §8.1: ${c}`);

// CI usa o binário gitleaks (sem dependência de licença).
const ci = existsSync(".github/workflows/ci.yml") ? read(".github/workflows/ci.yml") : "";
if (ci.includes("gitleaks-action") || !ci.includes("gitleaks detect")) errs.push("CI secret-scan não usa o binário gitleaks");

for (const e of errs) console.error("    - " + e);
process.exit(errs.length ? 1 : 0);
JS

# ---------------------------------------------------------------------------
head "2. Comportamental — Conventional Commits rejeita mensagem inválida"
TYPES='feat|fix|docs|refactor|test|chore|build|ci|perf|revert'
check_msg() { # 0 = aceita, 1 = rejeita (espelha commitlint.config.js)
  local m="$1"
  [ "${#m}" -gt 100 ] && return 1
  echo "$m" | grep -Eq "^($TYPES)(\([^)]+\))?!?: .+"
}
if check_msg "atualiza coisas"; then bad "mensagem inválida foi aceita"; else ok "mensagem inválida rejeitada"; fi
if check_msg "feat(smoke): valida harness (#1)"; then ok "mensagem válida aceita"; else bad "mensagem válida rejeitada"; fi

# Se houver pre-commit e config commitlint, exercita o hook real de forma
# DETERMINÍSTICA. Este hook (alessandrojcm/commitlint-pre-commit-hook) valida o
# .git/COMMIT_EDITMSG — não o arquivo passado em --commit-msg-filename —, então
# alimentamos a mensagem por lá, preservando/restaurando o COMMIT_EDITMSG do
# usuário. Antes (passar /tmp/_cm) validava o último commit real: falso vermelho
# local × verde no CI conforme o .git (Issue #74).
if command -v pre-commit >/dev/null 2>&1; then
  CMSG="$(git rev-parse --git-path COMMIT_EDITMSG 2>/dev/null || echo .git/COMMIT_EDITMSG)"
  CBAK=""
  [ -f "$CMSG" ] && CBAK="$(mktemp)" && cp "$CMSG" "$CBAK"
  run_commitlint_hook() { # $1 = mensagem; retorna o exit do hook (0 = aceitou)
    printf '%s\n' "$1" > "$CMSG"
    pre-commit run commitlint --hook-stage commit-msg --commit-msg-filename "$CMSG" >/dev/null 2>&1
  }
  if run_commitlint_hook "mensagem invalida"; then
    bad "pre-commit/commitlint aceitou mensagem inválida"
  elif ! run_commitlint_hook "feat(smoke): mensagem válida (#1)"; then
    bad "pre-commit/commitlint rejeitou mensagem válida"
  else
    ok "pre-commit/commitlint disponível: rejeita inválida e aceita válida"
  fi
  # Restaura o COMMIT_EDITMSG original (ou remove, se não existia antes).
  if [ -n "$CBAK" ]; then cp "$CBAK" "$CMSG"; rm -f "$CBAK"; else rm -f "$CMSG"; fi
else
  printf '  \033[33m·\033[0m pre-commit ausente — pulei o hook real (regra validada acima)\n'
fi

# ---------------------------------------------------------------------------
head "3. Comportamental — secret scan detecta segredo plantado"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
# Fixtures montados em runtime e fragmentados no fonte: o scanner deve detectá-los
# APENAS no arquivo gerado em $TMP, nunca neste script versionado.
aws_fixture="AKIA""IOSFODNN7EXAMPLE"
ghp_fixture="ghp_""012345678901234567890123456789abcdef"
{
  echo "AWS_KEY=${aws_fixture}"
  echo "GITHUB_TOKEN=${ghp_fixture}"
  printf 'api_key = "%s"\n' "supersecretvalue123"
} > "$TMP/leaked.env"

if command -v gitleaks >/dev/null 2>&1; then
  # Repo limpo: gitleaks deve passar (exit 0).
  if gitleaks detect --source . --no-banner >/dev/null 2>&1; then
    ok "gitleaks: repositório limpo sem vazamentos"
  else
    bad "gitleaks acusou vazamento no repositório (revisar)"
  fi
  # Segredo plantado: gitleaks deve falhar (exit != 0).
  if gitleaks detect --source "$TMP" --no-git --no-banner >/dev/null 2>&1; then
    bad "gitleaks NÃO detectou o segredo plantado"
  else
    ok "gitleaks detectou o segredo plantado"
  fi
else
  printf '  \033[33m·\033[0m gitleaks ausente — usando equivalente offline (regras espelhadas)\n'
  LEAKED="$TMP/leaked.env" node --input-type=module - <<'JS' && ok "equivalente detectou o segredo plantado" || bad "equivalente NÃO detectou o segredo"
import { readFileSync } from "node:fs";
const t = readFileSync(process.env.LEAKED, "utf-8");
const pats = [/AKIA[0-9A-Z]{16}/, /ghp_[0-9A-Za-z]{36}/,
  /(secret|token|password|api[_-]?key)\s*[:=]\s*['"][^'"]{8,}['"]/i];
process.exit(pats.some((p) => p.test(t)) ? 0 : 1);
JS
fi

# ---------------------------------------------------------------------------
head "Ledger (ADR-0006) — append-only / sem regressão de escopo"
if [ ! -f feature-ledger.json ]; then
  printf '  \033[33m·\033[0m feature-ledger.json ausente — pulando ledger-guard\n'
elif ! command -v node >/dev/null 2>&1; then
  printf '  \033[33m·\033[0m node ausente — pulando ledger-guard (requer Node >= 22.6)\n'
else
  git fetch origin main --quiet 2>/dev/null || true
  if ! git rev-parse --verify --quiet origin/main >/dev/null 2>&1; then
    # Sem o ref origin/main (offline/shallow) não dá para obter o base com segurança.
    # Pular é mais seguro que comparar contra [] (geraria FAIL espúrio com itens passes:true).
    printf '  \033[33m·\033[0m origin/main inacessível — pulando ledger-guard (sem base confiável)\n'
  else
    # Ref existe: ausência do arquivo significa, de forma confiável, "main ainda não tem ledger".
    git show origin/main:feature-ledger.json > "$TMP/ledger-base.json" 2>/dev/null || echo "[]" > "$TMP/ledger-base.json"
    if node --experimental-strip-types tools/ledger/ledger-guard.ts "$TMP/ledger-base.json" feature-ledger.json >/dev/null 2>&1; then
      ok "ledger-guard: append-only respeitado (base origin/main -> head atual)"
    else
      bad "ledger-guard: violação de append-only/escopo no feature-ledger.json"
    fi
  fi
fi

# ---------------------------------------------------------------------------
head "Tool-guard (ADR-0011) — action system / fail-safe default-deny"
if ! command -v node >/dev/null 2>&1; then
  printf '  \033[33m·\033[0m node ausente — pulando tool-guard (requer Node >= 22.6)\n'
else
  # Exercita a guarda de referência com comandos reais: um proibido (T4), um
  # fora da allowlist (T2) e um composto/encadeado (T2) devem ser BLOQUEADOS; um
  # seguro (allowlist) LIBERADO. Também valida o ALVO de leitura (#62/ADR-0013):
  # um Read de segredo (.env) é BLOQUEADO e um Read comum é LIBERADO.
  # Materializa a e2e do §8.1/ADR-0009 para uma biblioteca interna (sem CLI/UI).
  if node --experimental-strip-types --input-type=module - >/dev/null 2>&1 <<'JS'; then
import { pathToFileURL } from "node:url";
const mod = await import(pathToFileURL(process.cwd() + "/tools/guard/tool-guard.ts").href);
const blocked = mod.guardToolCall({ tool: "Bash", command: "rm -rf /" });
const outside = mod.guardToolCall({ tool: "Bash", command: "shutdown -h now" });
const chained = mod.guardToolCall({ tool: "Bash", command: "git status && shutdown -h now" });
const allowed = mod.guardToolCall({ tool: "Bash", command: "git status" });
const readSecret = mod.guardToolCall({ tool: "Read", path: ".env" });
const readOk = mod.guardToolCall({ tool: "Read", path: "src/app.ts" });
process.exit(
  !blocked.allow && !outside.allow && !chained.allow && allowed.allow &&
  !readSecret.allow && readOk.allow ? 0 : 1
);
JS
    ok "tool-guard: bloqueia proibido/fora da allowlist e Read de segredo; libera seguro"
  else
    bad "tool-guard: comportamento fail-safe/allowlist/alvo-de-leitura divergente"
  fi
fi

# ---------------------------------------------------------------------------
head "Núcleo L0 (ADR-0019) — manifesto core|detail exaustivo, dentro do orçamento"
if ! command -v node >/dev/null 2>&1; then
  printf '  \033[33m·\033[0m node ausente — pulando guard do núcleo L0 (requer Node >= 22.6)\n'
else
  # Anti-drift contínuo: cruza o manifesto curado (docs/examples/l0-core-manifest.ts) com as seções
  # REAIS do AGENTS.md. Falha se alguma seção ficou órfã (nova/renumerada sem reclassificar),
  # duplicada/fantasma, ou se o tier core estourou o orçamento de linhas. Também confirma que o guard
  # MORDE (a mutação que esquece uma seção precisa ser detectada).
  if node --experimental-strip-types --input-type=module - >/dev/null 2>&1 <<'JS'; then
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const mod = await import(pathToFileURL(process.cwd() + "/docs/examples/l0-core-manifest.ts").href);
const agentsMd = readFileSync(process.cwd() + "/AGENTS.md", "utf-8");
const coreMd = readFileSync(process.cwd() + "/AGENTS.core.md", "utf-8");
const ids = mod.extractSectionIds(agentsMd);
const manifest = mod.buildManifest(agentsMd); // pesos vivos do AGENTS.md, não constante confiada
const real = mod.validateManifest(ids, manifest, mod.CORE_BUDGET_LINES);
const bites = mod.validateManifest(ids, manifest.slice(1), mod.CORE_BUDGET_LINES);
const drift = mod.coreMapDrift(coreMd); // mapa humano do AGENTS.core.md == manifesto executável
process.exit(real.ok && drift.length === 0 && ids.length === manifest.length && !bites.ok ? 0 : 1);
JS
    ok "núcleo L0: manifesto exaustivo × AGENTS.md, mapa==manifesto, core no orçamento, guard morde"
  else
    bad "núcleo L0: manifesto órfão/duplicado/fantasma, mapa divergente, orçamento estourado ou guard não morde"
  fi
fi

# ---------------------------------------------------------------------------
head "Resultado"
printf '  %d verificação(ões) OK, %d falha(s)\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ] && { echo "  SMOKE-TEST: PASS"; exit 0; } || { echo "  SMOKE-TEST: FAIL"; exit 1; }
