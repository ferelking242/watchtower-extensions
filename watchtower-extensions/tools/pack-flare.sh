#!/usr/bin/env bash
# pack-flare.sh — Empaquète un dossier plugin en fichier .flare (ZIP Watchtower)
#
# Usage: ./tools/pack-flare.sh <plugin-id>
# Exemple: ./tools/pack-flare.sh com.watchtower.youtube-downloader
#
# Résultat: dist/<plugin-id>.flare

set -euo pipefail

PLUGIN_ID="${1:-}"
if [[ -z "$PLUGIN_ID" ]]; then
  echo "Usage: $0 <plugin-id>"
  echo "Exemple: $0 com.watchtower.youtube-downloader"
  exit 1
fi

PLUGINS_DIR="$(dirname "$0")/../plugins"
PLUGIN_DIR="$PLUGINS_DIR/$PLUGIN_ID"
DIST_DIR="$(dirname "$0")/../dist"
OUTPUT="$DIST_DIR/$PLUGIN_ID.flare"

# ── Vérifications ──────────────────────────────────────────────────────────────

if [[ ! -d "$PLUGIN_DIR" ]]; then
  echo "❌ Dossier plugin introuvable : $PLUGIN_DIR"
  exit 1
fi

if [[ ! -f "$PLUGIN_DIR/manifest.json" ]]; then
  echo "❌ manifest.json manquant dans $PLUGIN_DIR"
  exit 1
fi

# Validation JSON du manifest
if ! python3 -c "import json; json.load(open('$PLUGIN_DIR/manifest.json'))" 2>/dev/null; then
  echo "❌ manifest.json invalide (JSON malformé)"
  exit 1
fi

# Vérification version manifest
SCHEMA_VER=$(python3 -c "import json; d=json.load(open('$PLUGIN_DIR/manifest.json')); print(d.get('schemaVersion','1'))" 2>/dev/null || echo "1")
echo "📋 schemaVersion: $SCHEMA_VER"

# ── Build ──────────────────────────────────────────────────────────────────────

mkdir -p "$DIST_DIR"

# Nettoyer les fichiers inutiles avant packaging
TMPDIR=$(mktemp -d)
cp -r "$PLUGIN_DIR/." "$TMPDIR/"
find "$TMPDIR" -name ".DS_Store" -delete
find "$TMPDIR" -name "*.tmp" -delete
find "$TMPDIR" -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

# Créer le ZIP → renommer en .flare
cd "$TMPDIR"
zip -r "$OUTPUT" . -x "*.git*" > /dev/null

echo "✅ Plugin empaqueté !"
echo "   ID      : $PLUGIN_ID"
echo "   Output  : $OUTPUT"
echo "   Taille  : $(du -sh "$OUTPUT" | cut -f1)"
echo ""
echo "Pour installer manuellement : copiez le .flare dans Watchtower → Extensions → Installer depuis fichier"

# Cleanup
rm -rf "$TMPDIR"
