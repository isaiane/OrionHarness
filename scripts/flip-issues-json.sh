#!/usr/bin/env bash
# flip-issues-json.sh — monta o `--issues-json` do flip-batch (ADR-0033 / T10.2, #257 fatia B2).
#
# Emite (stdout) um ARRAY JSON `[{number,state,stateReason}]` SÓ das Issues em `awaitingFlip` (via
# `flip-batch --list-issues`), consultadas UMA-A-UMA no `gh` — sem varrer todas as Issues e sem paginação
# (o conjunto já vem escopado do ledger). É o insumo do sinal de evidência do flip-batch. Repassa argumentos
# extras (ex.: `--base <ref>`) ao `--list-issues`.
#
# Requer: Node >= 22.6 (type stripping) e `gh` autenticado (GH_TOKEN no CI).
set -euo pipefail

nums="$(node --disable-warning=ExperimentalWarning --experimental-strip-types \
  tools/ledger/flip-batch.ts --list-issues "$@")"

# Nenhuma entrada aguardando flip → array vazio (flip-batch trata como "nada a flipar").
if [ -z "${nums//[[:space:]]/}" ]; then
  printf '[]\n'
  exit 0
fi

{
  while IFS= read -r n; do
    [ -n "$n" ] || continue
    gh issue view "$n" --json number,state,stateReason
  done <<<"$nums"
} | jq -s '.'
