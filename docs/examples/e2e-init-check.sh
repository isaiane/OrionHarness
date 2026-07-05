#!/usr/bin/env bash
# e2e-init-check.sh — CASO DE EXEMPLO da convenção de verificação e2e (ADR-0009).
#
# Tipo do artefato: **CLI**. A convenção manda **exercer o contrato público** da
# ferramenta real, como um usuário faria pela shell, observando o comportamento
# na fronteira (exit code + efeitos) — **não** um teste unitário de função interna.
#
# Aqui a "ferramenta real" é o próprio `init.sh` (bootstrap do ambiente, ADR-0007),
# cujo contrato público está documentado no cabeçalho dele:
#   ./init.sh --check   → dry-run sem efeitos, exit 0
#   ./init.sh           → bootstrap (fora do escopo deste exemplo; tem efeitos)
#   ./init.sh <inválido> → exit 2
#
# A saída deste script é a **evidência anexável ao PR** exigida pelo DoD (§12)
# quando a tarefa opta por e2e. Rode a partir da raiz do repositório:
#   ./docs/examples/e2e-init-check.sh
set -uo pipefail

# Raiz do repositório (este arquivo vive em docs/examples/).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

fail=0
pass=0

ok()   { printf 'PASS  %-44s%s\n' "$1" "${2:-}"; pass=$((pass + 1)); }
bad()  { printf 'FAIL  %-44s%s\n' "$1" "${2:-}"; fail=$((fail + 1)); }

# run_init <args...> — invoca o CLI público REAL como o usuário faria: a partir
# da raiz, via `./init.sh` (executável direto). De propósito NÃO usa `bash init.sh`:
# assim a e2e falha se o binário perder o bit de execução ou tiver shebang
# quebrado — é isso que o "contrato público" promete ao usuário.
run_init() { ( cd "$ROOT" && ./init.sh "$@" ); }

# expect_exit <esperado> <descrição> -- <comando...>
expect_exit() {
  local expected="$1" desc="$2"; shift 2
  [ "$1" = "--" ] && shift
  local out rc
  out="$("$@" 2>&1)"; rc=$?
  if [ "$rc" = "$expected" ]; then
    ok "$desc" "exit=$rc"
  else
    bad "$desc" "exit=$rc (esperado $expected)"
    printf '      saída: %s\n' "$out"
  fi
}

echo "== e2e: contrato público do init.sh (ADR-0009) =="

# 0. Pré-condição: o binário da árvore de trabalho é invocável direto (bit +x).
if [ -x "$ROOT/init.sh" ]; then ok "init.sh é executável (bit +x)"; else bad "init.sh não é executável (bit +x)"; fi

# 1. Contrato de exit code, exercendo o CLI REAL (./init.sh) na árvore de trabalho.
expect_exit 0 "init.sh --check (dry-run)"      -- run_init --check
expect_exit 2 "init.sh --nope (arg inválido)"  -- run_init --nope
expect_exit 2 "init.sh a b (args demais)"      -- run_init a b

# 2. Dry-run **sem efeito colateral** — provado numa CÓPIA DESCARTÁVEL.
#    `git status` sozinho NÃO enxerga artefatos ignorados (node_modules/, dist/,
#    caches), então um --check que só escrevesse ali passaria falsamente (Codex P2).
#    A cópia parte de HEAD **sem nenhum artefato ignorado**; um manifesto `cksum`
#    de toda a árvore antes/depois pega QUALQUER arquivo criado ou alterado —
#    rastreado ou ignorado.
sandbox="$(mktemp -d)"
trap 'rm -rf "$sandbox"' EXIT
git -C "$ROOT" archive HEAD | tar -x -C "$sandbox"

manifest() { ( cd "$1" && find . -type f -exec cksum {} + | sort -k3 ); }
before="$(manifest "$sandbox")"
( cd "$sandbox" && ./init.sh --check ) >/dev/null 2>&1; sb_rc=$?
after="$(manifest "$sandbox")"

# O script não usa `set -e`: se a run na sandbox falhasse (exit ≠ 0) sem criar
# arquivos, `before == after` reportaria PASS falso. Exigimos exit 0 **e**
# árvore intacta (Codex P2).
if [ "$sb_rc" = 0 ] && [ "$before" = "$after" ]; then
  ok "--check sem efeitos (sandbox)" "exit=$sb_rc"
else
  bad "--check falhou ou tocou a árvore (sandbox)" "exit=$sb_rc"
  [ "$before" = "$after" ] || { printf '      diff:\n'; diff <(printf '%s\n' "$before") <(printf '%s\n' "$after") | sed 's/^/      /'; }
fi

echo "-- resumo: $pass ok, $fail falhas --"
[ "$fail" = 0 ] || exit 1
echo "e2e OK: o contrato público do init.sh confere."
