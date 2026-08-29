#!/usr/bin/env bash
# =============================================================================
# build-skill.sh — Empacota a skill VERSIONADA `orion-orchestrator` (S2 / #193; ADR-0028).
#
# A FONTE canônica vive em `skills/orion-orchestrator/` (SKILL.md + reference/ + templates/); o INSTALL é
# ARTEFATO DE BUILD (ADR-0028 item 2). Este script:
#   --package (default) : gera o `.skill` (ZIP) em .orion/tmp/ (gitignored) A PARTIR da fonte + grava o selo.
#   --stamp             : (re)grava só o SELO DE FRESCOR (hash sha256 da fonte) em skills/orion-orchestrator.stamp.
#   --check             : compara o hash da fonte com o selo committado — exit != 0 se divergir (guard de
#                         frescor: editou a fonte sem regravar o selo/rebuildar → CI vermelho). Wire no smoke-test.
#
# LIMITE (honesto, ADR-0028): o **install** é gerenciado pelo app Claude (extrai o `.skill` e registra num
# manifest.json com skillId próprio). Este script NÃO escreve no dir gerenciado do app — o **import** do
# `.skill` gerado é ação do usuário (ver docs/getting-started.md). O check de frescor cobre **fonte↔selo**;
# a defasagem do install em si é resolvida re-importando o `.skill` reconstruído.
#
# Uso:  bash scripts/build-skill.sh [--package|--stamp|--check]
# =============================================================================
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
[ -z "$ROOT" ] && ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || { echo "não encontrei a raiz do repositório"; exit 1; }

SKILL_DIR="skills/orion-orchestrator"
STAMP="skills/orion-orchestrator.stamp"
OUT_DIR=".orion/tmp"
OUT="$OUT_DIR/orion-orchestrator.skill"

[ -d "$SKILL_DIR" ] || { echo "fonte ausente: $SKILL_DIR"; exit 1; }

# sha256 portável (macOS: shasum; Linux/CI: sha256sum).
_sha256() {
  if command -v shasum >/dev/null 2>&1; then shasum -a 256 | awk '{print $1}';
  else sha256sum | awk '{print $1}'; fi
}

# Hash DETERMINÍSTICO do conteúdo da fonte: para cada arquivo (ordenado, LC_ALL=C), o caminho + o conteúdo.
# Sensível a caminho E conteúdo; independente de timestamps (por isso o selo é estável, o ZIP não precisa ser).
source_hash() {
  find "$SKILL_DIR" -type f | LC_ALL=C sort | while IFS= read -r f; do
    printf '%s\0' "$f"; cat "$f"
  done | _sha256
}

read_stamp() { # extrai o valor de `sha256=` do selo committado (vazio se ausente)
  [ -f "$STAMP" ] || { echo ""; return; }
  grep -E '^sha256=' "$STAMP" | head -1 | sed 's/^sha256=//'
}

write_stamp() {
  local h="$1"
  {
    echo "# Selo de frescor da skill orion-orchestrator (S2, #193 / ADR-0028)."
    echo "# Hash sha256 do conteúdo de $SKILL_DIR/. Regrave/rebuilde: bash scripts/build-skill.sh"
    echo "# O install é derivado (ADR-0028): reimporte o .skill reconstruído no app após mudar a fonte."
    echo "sha256=$h"
  } > "$STAMP"
}

case "${1:---package}" in
  --check)
    have="$(source_hash)"; want="$(read_stamp)"
    if [ -z "$want" ]; then
      echo "SKILL-STAMP: FAIL — selo ausente ($STAMP). Rode: bash scripts/build-skill.sh --stamp"
      exit 1
    elif [ "$have" = "$want" ]; then
      echo "SKILL-STAMP: PASS (fonte em dia com o selo — $have)"
      exit 0
    else
      echo "SKILL-STAMP: FAIL — a fonte de $SKILL_DIR mudou sem regravar o selo/rebuildar."
      echo "  fonte: $have"
      echo "  selo:  $want"
      echo "  Conserto: bash scripts/build-skill.sh --stamp  (e reimporte o .skill no app)"
      exit 1
    fi
    ;;
  --stamp)
    h="$(source_hash)"; write_stamp "$h"
    echo "SKILL-STAMP: gravado ($h) em $STAMP"
    ;;
  --package)
    h="$(source_hash)"; write_stamp "$h"
    mkdir -p "$OUT_DIR"
    rm -f "$OUT"
    ( cd "$SKILL_DIR" && zip -rqX "$OLDPWD/$OUT" . -x '.*' ) || { echo "zip falhou"; exit 1; }
    echo "SKILL BUILD: $OUT (fonte $h)"
    echo "  Import: abra o app Claude e importe '$OUT' (o install é gerenciado pelo app; ver getting-started §)."
    ;;
  *)
    echo "uso: bash scripts/build-skill.sh [--package|--stamp|--check]"; exit 2
    ;;
esac
