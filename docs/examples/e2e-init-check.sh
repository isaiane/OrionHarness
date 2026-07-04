#!/usr/bin/env bash
# e2e-init-check.sh — CASO DE EXEMPLO da convenção de verificação e2e (ADR-0009).
#
# Tipo do artefato: **CLI**. A convenção manda **exercer o contrato público** da
# ferramenta real, como um usuário faria pela shell, observando o comportamento
# na fronteira (exit code + saída) — **não** um teste unitário de função interna.
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
INIT="$ROOT/init.sh"

fail=0
pass=0

# expect_exit <esperado> <descrição> -- <comando...>
expect_exit() {
  local expected="$1" desc="$2"; shift 2
  [ "$1" = "--" ] && shift
  local out rc
  out="$("$@" 2>&1)"; rc=$?
  if [ "$rc" = "$expected" ]; then
    printf 'PASS  %-42s exit=%s\n' "$desc" "$rc"; pass=$((pass + 1))
  else
    printf 'FAIL  %-42s exit=%s (esperado %s)\n' "$desc" "$rc" "$expected"
    printf '      saída: %s\n' "$out"; fail=$((fail + 1))
  fi
}

echo "== e2e: contrato público do init.sh (ADR-0009) =="

# 1+2. Dry-run: contrato promete exit 0 **e** nenhum efeito colateral. As duas
#       asserções envolvem a **mesma** invocação, e o snapshot `before` é tirado
#       **antes de qualquer** `--check` — senão um efeito de primeira execução já
#       teria mutado a árvore, e o before/after passaria falsamente.
before="$(git -C "$ROOT" status --porcelain)"
check_out="$(bash "$INIT" --check 2>&1)"; check_rc=$?
after="$(git -C "$ROOT" status --porcelain)"

if [ "$check_rc" = 0 ]; then
  printf 'PASS  %-42s exit=%s\n' "init.sh --check (dry-run)" "$check_rc"; pass=$((pass + 1))
else
  printf 'FAIL  %-42s exit=%s (esperado 0)\n' "init.sh --check (dry-run)" "$check_rc"
  printf '      saída: %s\n' "$check_out"; fail=$((fail + 1))
fi

if [ "$before" = "$after" ]; then
  printf 'PASS  %-42s\n' "--check não alterou a árvore de trabalho"; pass=$((pass + 1))
else
  printf 'FAIL  %-42s\n' "--check alterou a árvore de trabalho"; fail=$((fail + 1))
fi

# 3. Argumento inválido: contrato promete exit 2.
expect_exit 2 "init.sh --nope (argumento inválido)" -- bash "$INIT" --nope

# 4. Excesso de argumentos: contrato promete exit 2.
expect_exit 2 "init.sh a b (argumentos demais)" -- bash "$INIT" a b

echo "-- resumo: $pass ok, $fail falhas --"
[ "$fail" = 0 ] || exit 1
echo "e2e OK: o contrato público do init.sh confere."
