#!/usr/bin/env bash
# validate-plugin.sh — Valide la structure d'un dossier plugin avant soumission
#
# Usage: ./tools/validate-plugin.sh <plugin-id>

set -euo pipefail

PLUGIN_ID="${1:-}"
if [[ -z "$PLUGIN_ID" ]]; then
  echo "Usage: $0 <plugin-id>"
  exit 1
fi

PLUGIN_DIR="$(dirname "$0")/../plugins/$PLUGIN_ID"
ERRORS=0
WARNINGS=0

check() {
  local level="$1" msg="$2"
  if [[ "$level" == "ERROR" ]]; then
    echo "❌ $msg"; ((ERRORS++))
  else
    echo "⚠️  $msg"; ((WARNINGS++))
  fi
}

ok() { echo "✓ $1"; }

echo "🔍 Validation du plugin : $PLUGIN_ID"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Fichiers obligatoires ──────────────────────────────────────────────────────
[[ -f "$PLUGIN_DIR/manifest.json" ]] && ok "manifest.json présent" || check ERROR "manifest.json manquant"
[[ -f "$PLUGIN_DIR/assets/icon.png" ]] && ok "assets/icon.png présent" || check WARN "assets/icon.png manquant (recommandé)"

# ── Validation JSON ────────────────────────────────────────────────────────────
if [[ -f "$PLUGIN_DIR/manifest.json" ]]; then
  if python3 -c "import json; json.load(open('$PLUGIN_DIR/manifest.json'))" 2>/dev/null; then
    ok "manifest.json JSON valide"
  else
    check ERROR "manifest.json JSON invalide"
  fi
fi

# ── Champs obligatoires du manifest ───────────────────────────────────────────
if [[ -f "$PLUGIN_DIR/manifest.json" ]]; then
  REQUIRED_FIELDS=("id" "name" "version" "author" "description" "category" "license")
  for field in "${REQUIRED_FIELDS[@]}"; do
    if python3 -c "import json; d=json.load(open('$PLUGIN_DIR/manifest.json')); assert '$field' in d" 2>/dev/null; then
      ok "Champ '$field' présent"
    else
      check ERROR "Champ '$field' manquant dans manifest.json"
    fi
  done

  # Vérif format ID
  if python3 -c "
import json, re
d=json.load(open('$PLUGIN_DIR/manifest.json'))
assert re.match(r'^com\.[a-z0-9_-]+\.[a-z0-9_-]+$', d.get('id',''))
" 2>/dev/null; then
    ok "Format d'ID valide (com.auteur.nom)"
  else
    check ERROR "Format d'ID invalide — doit être 'com.auteur.nom-plugin'"
  fi
fi

# ── UI ─────────────────────────────────────────────────────────────────────────
if [[ -f "$PLUGIN_DIR/ui/schema.json" ]]; then
  ok "ui/schema.json présent"
  if python3 -c "import json; json.load(open('$PLUGIN_DIR/ui/schema.json'))" 2>/dev/null; then
    ok "ui/schema.json JSON valide"
  else
    check ERROR "ui/schema.json JSON invalide"
  fi
else
  check WARN "ui/schema.json absent (méthode json non disponible)"
fi

[[ -f "$PLUGIN_DIR/ui/index.html" ]] && ok "ui/index.html présent" || check WARN "ui/index.html absent (méthode html non disponible)"

# ── Scripts ────────────────────────────────────────────────────────────────────
if [[ -f "$PLUGIN_DIR/manifest.json" ]]; then
  ENTRY=$(python3 -c "import json; d=json.load(open('$PLUGIN_DIR/manifest.json')); print(d.get('runner',{}).get('entry',''))" 2>/dev/null || echo "")
  if [[ -n "$ENTRY" && -f "$PLUGIN_DIR/$ENTRY" ]]; then
    ok "Script d'entrée trouvé : $ENTRY"
  elif [[ -n "$ENTRY" ]]; then
    check ERROR "Script d'entrée introuvable : $ENTRY"
  fi
fi

# ── Résultat ───────────────────────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ $ERRORS -eq 0 && $WARNINGS -eq 0 ]]; then
  echo "✅ Plugin valide — prêt à être soumis"
elif [[ $ERRORS -eq 0 ]]; then
  echo "⚠️  Plugin valide avec $WARNINGS avertissement(s)"
else
  echo "❌ $ERRORS erreur(s), $WARNINGS avertissement(s) — corrigez avant de soumettre"
  exit 1
fi
