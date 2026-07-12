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
python3 - <<'PY' && ok "camada estática íntegra" || bad "camada estática com problemas"
import re, os, glob, json, sys
errs = []

# YAML
try:
    import yaml
    for f in glob.glob(".github/**/*.yml", recursive=True) + \
             glob.glob(".github/**/*.yaml", recursive=True) + [".pre-commit-config.yaml"]:
        list(yaml.safe_load_all(open(f, encoding="utf-8")))
except Exception as e:
    errs.append(f"YAML: {e}")

# JSON
for f in glob.glob("presets/**/*.json", recursive=True):
    try:
        json.load(open(f, encoding="utf-8"))
    except Exception as e:
        errs.append(f"JSON {f}: {e}")

# Links internos .md (pula diretórios gerados/dependências e scratch)
SKIP_DIRS = {".git", "node_modules", ".orion", "dist", "coverage", ".pytest_cache"}
for dp, dirs, fs in os.walk("."):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for f in fs:
        if not f.endswith(".md"):
            continue
        p = os.path.join(dp, f)
        for m in re.finditer(r'\]\((?!https?://)([^)#]+?)(?:#[^)]*)?\)', open(p, encoding="utf-8").read()):
            tgt = m.group(1)
            if not re.search(r'\.\w+$', tgt) and not tgt.endswith("/"):
                continue
            if not os.path.exists(os.path.normpath(os.path.join(dp, tgt))):
                errs.append(f"link quebrado: {p} -> {tgt}")

# Cross-refs de seções (§N): válidas se existirem em AGENTS.md OU nos docs de arquitetura
secs = set()
for f in ["AGENTS.md"] + glob.glob("docs/architecture/*.md"):
    secs |= set(re.findall(r'^#{2,3}\s+(\d+(?:\.\d+)?)', open(f, encoding="utf-8").read(), re.M))
refs = set(re.findall(r'§\s*(\d+(?:\.\d+)?)', open("AGENTS.md", encoding="utf-8").read()))
for r in sorted(refs - secs):
    errs.append(f"§{r} referenciado mas inexistente")

# Artefatos obrigatórios
must = ["AGENTS.md", "CLAUDE.md", "README.md", "PLAN.md", "STATE.md", "MEMORY.md",
        "CHANGELOG.md", "SECURITY.md", "CONTRIBUTING.md", ".env.example",
        "docs/architecture/foundations.md", "docs/architecture/ui-agent-harness.md",
        "docs/product/spec.md", "docs/product/product-context.md", "docs/product/discovery-guide.md",
        "docs/decisions/0001-fundacoes-do-orion-harness.md",
        ".github/ISSUE_TEMPLATE/sdd-task.yml", ".github/PULL_REQUEST_TEMPLATE.md",
        ".github/workflows/ci.yml"]
for m in must:
    if not os.path.exists(m):
        errs.append(f"artefato ausente: {m}")

# Template de Issue SDD completo
try:
    import yaml
    doc = yaml.safe_load(open(".github/ISSUE_TEMPLATE/sdd-task.yml"))
    labels = {b.get("attributes", {}).get("label", "") for b in doc["body"]}
    req = ["Contexto", "Problema", "Objetivo", "Escopo", "Fora de escopo", "Critérios de aceite",
           "Data-First", "Dependências", "Riscos", "Plano de validação", "Definição de pronto"]
    for r in req:
        if not any(r.lower() in l.lower() for l in labels):
            errs.append(f"Issue SDD sem campo: {r}")
    if not any("confian" in b.get("attributes", {}).get("label", "").lower() for b in doc["body"]):
        errs.append("Issue SDD sem classe de confiança")
except Exception as e:
    errs.append(f"Issue SDD: {e}")

# PR template força a verificação §8.1
pr = open(".github/PULL_REQUEST_TEMPLATE.md", encoding="utf-8").read()
for c in ["Conforme a Spec", "regras de negócio", "decisões arquiteturais", "fluxos existentes", "Regressões"]:
    if c not in pr:
        errs.append(f"PR template sem item §8.1: {c}")

# CI usa o binário gitleaks (sem dependência de licença)
ci = open(".github/workflows/ci.yml", encoding="utf-8").read()
if "gitleaks-action" in ci or "gitleaks detect" not in ci:
    errs.append("CI secret-scan não usa o binário gitleaks")

for e in errs:
    print("    -", e, file=sys.stderr)
sys.exit(1 if errs else 0)
PY

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

# Se houver pre-commit e config commitlint, exercita o hook real (informativo).
if command -v pre-commit >/dev/null 2>&1; then
  if echo "mensagem invalida" > /tmp/_cm 2>/dev/null && \
     pre-commit run commitlint --hook-stage commit-msg --commit-msg-filename /tmp/_cm >/dev/null 2>&1; then
    bad "pre-commit/commitlint aceitou mensagem inválida"
  else
    ok "pre-commit/commitlint disponível e rejeita mensagem inválida"
  fi
  rm -f /tmp/_cm
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
  python3 - "$TMP/leaked.env" <<'PY' && ok "equivalente detectou o segredo plantado" || bad "equivalente NÃO detectou o segredo"
import re, sys
pats = [r"AKIA[0-9A-Z]{16}", r"ghp_[0-9A-Za-z]{36}",
        r"(?i)(secret|token|password|api[_-]?key)\s*[:=]\s*['\"][^'\"]{8,}['\"]"]
t = open(sys.argv[1], encoding="utf-8").read()
sys.exit(0 if any(re.search(p, t) for p in pats) else 1)
PY
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
head "Resultado"
printf '  %d verificação(ões) OK, %d falha(s)\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ] && { echo "  SMOKE-TEST: PASS"; exit 0; } || { echo "  SMOKE-TEST: FAIL"; exit 1; }
