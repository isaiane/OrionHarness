#!/usr/bin/env bash
# =============================================================================
# build-skill.sh — Empacota a skill VERSIONADA `orion-orchestrator` (S2 / #193; ADR-0028).
#
# A FONTE canônica vive em `skills/orion-orchestrator/` (SKILL.md + reference/ + templates/); o INSTALL é
# ARTEFATO DE BUILD (ADR-0028 item 2). Este script:
#   --package (default) : VALIDA a fonte, gera o `.skill` (ZIP) em .orion/tmp/ (gitignored) A PARTIR DOS
#                         ARQUIVOS RASTREADOS (git ls-files) e, só se o build der certo, grava o SELO.
#   --check             : VALIDA a fonte + compara o hash da fonte (arquivos rastreados) com o selo
#                         committado (skills/orion-orchestrator.stamp) — exit != 0 se divergir. Wire no smoke.
#
# SEGURANÇA (Codex): empacota **só arquivos RASTREADOS e regulares** (nunca untracked/ignored como um
# `templates/.env`, nem symlinks) — senão o `.skill` importado no app poderia embutir credenciais/arquivos
# externos que não aparecem no git diff. O hash e o pacote usam o MESMO conjunto (git ls-files), então o
# selo É a identidade do conteúdo empacotado.
#
# ACOPLAMENTO SELO↔BUILD (Codex): NÃO existe "--stamp" solto — o selo só é (re)gravado por `--package`
# (que constrói o `.skill`). Assim a prova de frescor não pode ser atualizada independente do artefato.
#
# LIMITE HONESTO (ADR-0028, nota append-only): o repo verifica **fonte↔build** (fail-closed no CI). O
# **install** é gerenciado pelo app Claude (extrai o `.skill` e registra um skillId); o repo NÃO escreve
# nesse dir. A defasagem da cópia INSTALADA se resolve **reimportando** o `.skill` reconstruído.
#
# Uso:  bash scripts/build-skill.sh [--package|--check]
# =============================================================================
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
[ -z "$ROOT" ] && ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || { echo "não encontrei a raiz do repositório"; exit 1; }

SKILL_DIR="skills/orion-orchestrator"
STAMP="skills/orion-orchestrator.stamp"
OUT_DIR=".orion/tmp"
OUT="$ROOT/$OUT_DIR/orion-orchestrator.skill"

[ -d "$SKILL_DIR" ] || { echo "SKILL-BUILD: FAIL — fonte ausente ($SKILL_DIR); a skill versionada é obrigatória (ADR-0028)"; exit 1; }

# sha256 portável (macOS: shasum; Linux/CI: sha256sum).
_sha256() {
  if command -v shasum >/dev/null 2>&1; then shasum -a 256 | awk '{print $1}';
  else sha256sum | awk '{print $1}'; fi
}

# Arquivos RASTREADOS da fonte, relativos a SKILL_DIR (SKILL.md, reference/…), ordenados. Só o que o git
# versiona entra — untracked/ignored ficam de fora por construção.
skill_files() { ( cd "$SKILL_DIR" && git ls-files ) | LC_ALL=C sort; }

# Fail-closed se algum arquivo rastreado da fonte for SYMLINK (zip seguiria o alvo → conteúdo externo).
reject_symlinks() {
  local f bad=0
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    if [ -L "$SKILL_DIR/$f" ]; then echo "SKILL-BUILD: FAIL — symlink rastreado na fonte: $SKILL_DIR/$f (rejeitado)"; bad=1; fi
  done < <(skill_files)
  return "$bad"
}

# Fail-closed se um arquivo RASTREADO sumiu da árvore (Codex): `git ls-files` ainda o lista, mas o zip o
# PULA e retorna sucesso, e o `cat` falho não propaga → selaria um pacote INCOMPLETO. Exige todos presentes.
verify_present() {
  local f miss=0 n=0
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    n=$((n+1))
    if [ ! -f "$SKILL_DIR/$f" ]; then echo "SKILL-BUILD: FAIL — arquivo rastreado ausente na árvore: $SKILL_DIR/$f"; miss=1; fi
  done < <(skill_files)
  [ "$n" -gt 0 ] || { echo "SKILL-BUILD: FAIL — nenhum arquivo rastreado em $SKILL_DIR"; return 1; }
  return "$miss"
}

# Validação mínima do contrato de skill (Codex): frontmatter YAML FECHADO com name (slug) + description.
validate_source() {
  local skill="$SKILL_DIR/SKILL.md" fm name desc
  [ -f "$skill" ] || { echo "SKILL-BUILD: FAIL — $skill ausente"; return 4; }
  [ "$(sed -n '1p' "$skill")" = "---" ] || { echo "SKILL-BUILD: FAIL — SKILL.md sem frontmatter YAML (linha 1 ≠ '---')"; return 4; }
  # DEVE haver um '---' de FECHAMENTO antes do EOF — senão o frontmatter não é parseável pelo loader (Codex).
  [ "$(awk 'NR==1{next} /^---[[:space:]]*$/{print "y"; exit}' "$skill")" = "y" ] || {
    echo "SKILL-BUILD: FAIL — frontmatter YAML não fechado (falta a linha '---' de término)"; return 4; }
  fm="$(awk 'NR==1{next} /^---[[:space:]]*$/{exit} {print}' "$skill")"
  name="$(printf '%s\n' "$fm" | awk -F':[[:space:]]*' '/^name:/{print $2; exit}' | tr -d '[:space:]')"
  desc="$(printf '%s\n' "$fm" | awk -F':[[:space:]]*' '/^description:/{print $2; exit}')"
  [ -n "$name" ] || { echo "SKILL-BUILD: FAIL — frontmatter sem 'name'"; return 4; }
  [ -n "$desc" ] || { echo "SKILL-BUILD: FAIL — frontmatter sem 'description'"; return 4; }
  printf '%s' "$name" | grep -Eq '^[a-z0-9][a-z0-9-]*$' || { echo "SKILL-BUILD: FAIL — 'name' não é slug válido: '$name'"; return 4; }
  return 0
}

# Hash DETERMINÍSTICO do conteúdo RASTREADO da fonte: para cada arquivo (ordenado), caminho + conteúdo.
# Mesmo conjunto que o `--package` empacota → o selo é a identidade do .skill; independente de timestamps.
# (git ls-files roda DENTRO de SKILL_DIR num único cd — sem aninhar com skill_files, que já cd por conta.)
source_hash() {
  ( cd "$SKILL_DIR" && git ls-files | LC_ALL=C sort | while IFS= read -r f; do printf '%s\0' "$f"; cat "$f"; done ) | _sha256
}

read_stamp() { [ -f "$STAMP" ] && grep -E '^sha256=' "$STAMP" | head -1 | sed 's/^sha256=//' || echo ""; }

write_stamp() {
  {
    echo "# Selo de frescor da skill orion-orchestrator (S2, #193 / ADR-0028)."
    echo "# Hash sha256 do conteúdo RASTREADO de $SKILL_DIR/. Regrave rebuildando: bash scripts/build-skill.sh"
    echo "# Cobre fonte↔build; o install (app-managed) é reimportado pelo usuário após mudar a fonte."
    echo "sha256=$1"
  } > "$STAMP"
}

case "${1:---package}" in
  --check)
    validate_source || exit 4
    reject_symlinks || exit 3
    verify_present || exit 3
    have="$(source_hash)"; want="$(read_stamp)"
    if [ -z "$want" ]; then
      echo "SKILL-STAMP: FAIL — selo ausente ($STAMP). Rode: bash scripts/build-skill.sh (--package)"
      exit 1
    elif [ "$have" = "$want" ]; then
      echo "SKILL-STAMP: PASS (fonte rastreada em dia com o selo — $have)"
      exit 0
    else
      echo "SKILL-STAMP: FAIL — a fonte de $SKILL_DIR mudou sem rebuildar (selo desatualizado)."
      echo "  fonte: $have"; echo "  selo:  $want"
      echo "  Conserto: bash scripts/build-skill.sh  (rebuilda o .skill e regrava o selo; depois reimporte no app)"
      exit 1
    fi
    ;;
  --package)
    validate_source || exit 4
    reject_symlinks || exit 3
    verify_present || exit 3
    mkdir -p "$OUT_DIR"
    rm -f "$OUT"
    # Empacota SÓ os arquivos rastreados, de DENTRO de SKILL_DIR → entradas na raiz do .skill (SKILL.md, …).
    if ! ( cd "$SKILL_DIR" && git ls-files | LC_ALL=C sort | zip -qX "$OUT" -@ ); then
      echo "SKILL-BUILD: FAIL — zip falhou (nenhum selo gravado)"; exit 1
    fi
    # Selo só APÓS o build bem-sucedido (acoplamento selo↔artefato); falha ao gravar aborta (Codex).
    h="$(source_hash)"
    write_stamp "$h" || { echo "SKILL-BUILD: FAIL — não consegui gravar o selo ($STAMP)"; exit 1; }
    echo "SKILL-BUILD: $OUT (fonte rastreada $h) · selo atualizado"
    echo "  Import: abra o app Claude e importe '$OUT' — o install é gerenciado pelo app (ver getting-started §9)."
    ;;
  *)
    echo "uso: bash scripts/build-skill.sh [--package|--check]"; exit 2
    ;;
esac
