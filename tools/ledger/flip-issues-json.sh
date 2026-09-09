#!/usr/bin/env bash
# flip-issues-json.sh — coleta o estado (number/state/stateReason) das Issues referenciadas pelo ledger,
# como entrada do `flip-batch.ts --issues-json` (ADR-0033 / T10.2, #257). Emite um array JSON no stdout.
#
# FALHA (exit 1) se QUALQUER `gh issue view` falhar (API/permissão/rate-limit): não silencia o erro — uma
# Issue omitida pareceria "sem evidência" e o run "passaria" sem trabalho, orfanando entradas elegíveis.
# O run falho é o SINAL que aciona o fallback do owner manual (ADR-0033). Requer `gh` autenticado (GH_TOKEN).
set -euo pipefail

nums=$(node -e 'const l=require("./feature-ledger.json");console.log([...new Set(l.map(e=>e.issue))].join(" "))')

first=1
printf '['
for n in $nums; do
  # sem `|| true`: se o lookup falhar, `set -e` derruba o script (exit≠0) — sinal, não silêncio.
  j=$(gh issue view "$n" --json number,state,stateReason)
  if [ "$first" = "1" ]; then first=0; else printf ','; fi
  printf '%s' "$j"
done
printf ']\n'
