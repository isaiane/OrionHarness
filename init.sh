#!/usr/bin/env bash
# init.sh — bootstrap do ambiente executável (Orion Initializer, ADR-0007).
# Sobe o ambiente e roda um smoke do **produto**. É um STUB: o Initializer
# preenche o comando de smoke por projeto (ver docs/getting-started.md).
#
# Uso:
#   ./init.sh            # sobe o ambiente e roda o smoke do produto
#   ./init.sh --check    # dry-run: só imprime o que faria; sem efeitos; exit 0
#   ./init.sh <outro>    # argumento inválido; exit 2
#
# Poliglota por detecção (espelha .github/workflows/ci.yml). Orquestração em
# bash (ADR-0005: meta-tooling em TS; scripts de orquestração seguem em bash).
set -uo pipefail

CHECK=0
case "${1:-}" in
  --check) CHECK=1 ;;
  "") ;;
  *) echo "uso: ./init.sh [--check]" >&2; exit 2 ;;
esac

run() {
  if [ "$CHECK" = 1 ]; then
    printf '  [dry-run] %s\n' "$*"
  else
    printf '  + %s\n' "$*"
    eval "$@" || { echo "init.sh: passo falhou: $*" >&2; exit 1; }
  fi
}

# 1. Detectar a stack do projeto.
if [ -f package.json ]; then STACK=node
elif [ -f pyproject.toml ] || [ -f requirements.txt ]; then STACK=python
elif [ -f go.mod ]; then STACK=go
else STACK=none
fi
echo "stack detectada: $STACK"

# 2. Instalar dependências (subir o ambiente).
case "$STACK" in
  node)   run "if [ -f package-lock.json ]; then npm ci; else npm install; fi" ;;
  python) run "python -m pip install -e . || pip install -r requirements.txt" ;;
  go)     run "go mod download" ;;
  *)      echo "  (sem stack detectada — nada a instalar)" ;;
esac

# 3. Smoke do PRODUTO — placeholder a preencher pelo Initializer por projeto.
#    Ex.: subir o serviço e checar /health; ou rodar um teste de fumaça e2e.
#    NÃO é a autovalidação do harness (scripts/smoke-test.sh); é do produto.
run "echo 'TODO: smoke do produto — preencher por projeto (docs/getting-started.md)'"

echo "init.sh: OK"
