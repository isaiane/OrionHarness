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

# Links internos .md
for dp, _, fs in os.walk("."):
    if "/.git" in dp:
        continue
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
cat > "$TMP/leaked.env" <<'LEAK'
AWS_KEY=AKIAIOSFODNN7EXAMPLE
GITHUB_TOKEN=ghp_012345678901234567890123456789abcdef
api_key = "supersecretvalue123"
LEAK

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
head "Resultado"
printf '  %d verificação(ões) OK, %d falha(s)\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ] && { echo "  SMOKE-TEST: PASS"; exit 0; } || { echo "  SMOKE-TEST: FAIL"; exit 1; }
