#!/usr/bin/env bash
# init.sh — bootstrap do ambiente executável (Orion Initializer, ADR-0007).
# Sobe o ambiente Node/TypeScript (stack padrão do harness, ADR-0005) e roda um
# smoke do **produto**. É um STUB: o Initializer preenche o comando de smoke por
# projeto (ver docs/getting-started.md).
#
# Uso:
#   ./init.sh            # sobe o ambiente e roda o smoke do produto
#   ./init.sh --check    # dry-run: só imprime o que faria; sem efeitos; exit 0
#   ./init.sh <outro>    # argumento inválido; exit 2
#
# Stack única Node/TS por decisão (ADR-0005); outras stacks são templates
# futuros. Orquestração em bash (ADR-0005: meta-tooling em TS; scripts de
# orquestração seguem em bash).
set -uo pipefail

CHECK=0
# Contrato: 0 ou 1 argumento, e o único argumento aceito é --check.
if [ "$#" -gt 1 ]; then echo "uso: ./init.sh [--check]" >&2; exit 2; fi
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

# 1. Conferir a stack padrão (Node/TypeScript, ADR-0005).
if [ ! -f package.json ]; then
  echo "init.sh: package.json não encontrado." >&2
  echo "  A stack padrão do harness é Node/TypeScript (ADR-0005). Rode a partir da" >&2
  echo "  raiz de um projeto Node, ou adapte este init.sh à stack do seu projeto." >&2
  exit 1
fi
echo "stack: node (package.json detectado)"

# 2. Instalar dependências (subir o ambiente). Espelha a trilha node do ci.yml.
run "if [ -f package-lock.json ]; then npm ci; else npm install; fi"

# 3. Smoke do PRODUTO — placeholder a preencher pelo Initializer por projeto.
#    Ex.: subir o serviço e checar /health; ou rodar um teste de fumaça e2e.
#    NÃO é a autovalidação do harness (scripts/smoke-test.sh); é do produto.
run "echo 'TODO: smoke do produto — preencher por projeto (docs/getting-started.md)'"

echo "init.sh: OK"
