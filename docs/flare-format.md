# Format `.flare` — Watchtower Extension Package

## Qu'est-ce qu'un `.flare` ?

Un fichier `.flare` est une archive **ZIP renommée** contenant tout le nécessaire pour un plugin Watchtower. Le nom vient des fusées de signalisation envoyées depuis une tour de guet — mémorable, court, propriétaire.

```
com.auteur.nom-plugin.flare  ←  ZIP standard renommé
```

---

## Arbre complet — Plugin YouTube (exemple de référence)

```
com.watchtower.youtube-downloader/
│
├── manifest.json                ← OBLIGATOIRE — métadonnées, capacités, commandScopes
│
├── ui/
│   ├── schema.json              ← [méthode JSON] UI déclarative → rendu par ManifestUiRenderer
│   ├── main.dart                ← [méthode eval] Dart source → interprété par d4rt
│   └── index.html               ← [méthode HTML] interface WebView (fallback)
│
└── assets/
    ├── icon.png                 ← icône 512×512 PNG
    └── banner.png               ← bannière 1200×400 PNG (optionnel)
```

> Il n'y a **pas** de compilation offline en `.evc` — Watchtower utilise **d4rt** qui interprète le Dart source directement à l'exécution, comme pour les extensions de sources. Pas de build step, juste le `.dart` dans le `.flare`.

---

## Les 3 méthodes UI

### Méthode 1 : `eval` — Dart natif via d4rt (le plus puissant)

Le fichier `ui/main.dart` est interprété par le moteur **d4rt** embarqué dans l'APK. Il retourne un widget Flutter 100% natif. C'est la méthode la plus performante et la plus flexible.

**Principe :**
```dart
class MonPlugin extends WPlugin {
  // WPlugin = bridge injecté par Watchtower dans le contexte d4rt

  @override
  Widget buildWidget(BuildContext context) {
    return MonEcran(plugin: this);
  }

  Future<void> download() async {
    // Appel ZeusDL — binaire déjà dans l'APK
    final result = await WatchtowerZeusDL.start(
      command: 'zeusdl',
      args: ['--url', _url, '--output', '\$DOWNLOADS/MonPlugin', '--format', _format],
      onProgress: (pct, speed, eta, size) { /* mise à jour UI */ },
    );
    if (result.success) WatchtowerNotif.show(title: 'Terminé', body: result.fileName);
  }
}

const plugin = MonPlugin();
```

**Bridges d4rt disponibles dans ce contexte :**

| Bridge | Description |
|--------|-------------|
| `WPlugin` | Classe de base à hériter — fournit `buildWidget()` |
| `WatchtowerZeusDL` | `start(command, args, onProgress, onLog)` — lance ZeusDL binary |
| `WatchtowerContext` | `userConfig`, `pluginId`, `basePath`, `pluginDir` |
| `WatchtowerLog` | `info()`, `warn()`, `error()`, `success()`, `progress()` → log vers l'UI |
| `WatchtowerNotif` | `show(title, body)` — notification système |
| `WatchtowerStorage` | `read(path)`, `write(path, data)` dans `$DOWNLOADS` |
| `WatchtowerCache` | Cache clé/valeur persistant |

**ZeusDL est un binaire déjà dans l'APK** — pas besoin de l'installer. Les plugins l'appellent via `commandScopes` déclarés dans le manifest. Exactement comme le plugin TikTok Downloader.

---

### Méthode 2 : `json` — UI déclarative (le plus simple)

Le fichier `ui/schema.json` est lu par **ManifestUiRenderer** (déjà dans l'app) et génère des widgets Flutter natifs automatiquement. L'utilisateur peut modifier le JSON pour changer labels, positions, couleurs — sans coder.

```json
{
  "version": 2,
  "title": "Mon Plugin",
  "screens": [
    {
      "id": "main",
      "widgets": [
        { "type": "url_field", "id": "url",     "label": "URL",     "required": true },
        { "type": "chip_select","id": "quality","label": "Qualité", "options": [{"label":"1080p","value":"1080p"},{"label":"720p","value":"720p"}]},
        { "type": "toggle",    "id": "audio",   "label": "Audio uniquement", "default": false },
        { "type": "divider" },
        { "type": "button",    "id": "go",      "label": "Télécharger", "action": "download", "style": "primary" }
      ],
      "output": { "type": "progress_log", "showSpeed": true, "showEta": true }
    }
  ]
}
```

**Types de widgets JSON disponibles :**

| Type | Description | Params clés |
|------|-------------|-------------|
| `url_field` | Champ URL avec validation + bouton coller | `id`, `label`, `placeholder`, `required`, `validator` |
| `text_field` | Champ texte libre | `id`, `label`, `placeholder`, `secure` |
| `number_field` | Champ numérique | `id`, `label`, `min`, `max`, `step` |
| `chip_select` | Chips sélectionnables (une seule) | `id`, `label`, `options[]` (`label`+`value`), `default` |
| `multi_chip` | Chips multi-sélection | `id`, `label`, `options[]`, `maxSelect` |
| `toggle` | Interrupteur on/off | `id`, `label`, `description`, `default` |
| `slider` | Curseur numérique | `id`, `label`, `min`, `max`, `divisions` |
| `select` | Dropdown | `id`, `label`, `options[]`, `default` |
| `text` | Texte statique | `value`, `style` (body/subtitle/caption/heading) |
| `divider` | Séparateur | — |
| `button` | Bouton d'action | `id`, `label`, `action`, `style` (primary/secondary/danger) |
| `image` | Image | `src` (assets/ ou URL), `height` |

**Types d'output :**

| Type | Description |
|------|-------------|
| `progress_log` | Log texte + barre de progression + vitesse/ETA |
| `file_result` | Fichier résultat avec bouton d'ouverture |
| `json_view` | JSON formaté (pour plugins API/sync) |
| `log_only` | Log texte sans progression |

---

### Méthode 3 : `html` — WebView (fallback)

Le fichier `ui/index.html` s'affiche dans un WebView (`flutter_inappwebview`). Communication bidirectionnelle avec Flutter via bridge message.

**Flutter → JS (messages entrants) :**
```javascript
window.addEventListener('message', (e) => {
  const { type, message, percent, speed, eta } = e.data;
  // types: 'log', 'progress', 'done', 'error'
});
```

**JS → Flutter (actions) :**
```javascript
// Via l'API injectée par Watchtower
window.Watchtower.postAction('download', { url, quality, format });
// ou via postMessage standard
window.parent.postMessage({ action: 'download', values: { url } }, '*');
```

---

## Templates natifs embarqués

Watchtower embarque des templates d'UI pré-construits. Le plugin choisit son template dans `manifest.json` via `"ui": { "template": "downloader" }`. Le `schema.json` peut surcharger n'importe quel champ du template.

| Template | Description | Pour quoi |
|----------|-------------|-----------|
| `downloader` | URL + qualité + format + progression ZeusDL | YouTube, TikTok, etc. |
| `browser` | Recherche + liste de résultats scrollable | Sources de contenu |
| `sync` | Token/login + toggles + bouton sync | AniList, Trakt, MAL |
| `player` | Player média + contrôles | Lecture directe |
| `settings` | Formulaire de configuration groupé | Préférences plugin |

---

## `manifest.json` — Référence complète

```json
{
  "schemaVersion": "2",
  "id": "com.auteur.mon-plugin",
  "name": "Mon Plugin",
  "version": "1.0.0",
  "author": "Nom",
  "description": "Courte description",
  "icon": "assets/icon.png",
  "color": "#FF0000",
  "category": "downloader",
  "tags": ["youtube", "video"],

  "flare": {
    "specVersion": "1.0",
    "packageFormat": "flare",
    "minAppVersion": "8.1.0"
  },

  "ui": {
    "method": "json",
    "schema": "ui/schema.json",
    "htmlFallback": "ui/index.html",
    "evalSource": "ui/main.dart",
    "template": "downloader"
  },

  "requirements": {
    "zeusdl": { "version": ">=1.0.0", "optional": false }
  },

  "commandScopes": ["zeusdl", "ffmpeg"],

  "networkAccess": ["*.example.com"],

  "permissions": ["network", "downloads", "storage.read", "storage.write", "notifications"],

  "writePaths": ["$DOWNLOADS/MonPlugin"],

  "runtimeTypes": ["downloader"],

  "userConfig": {
    "fields": [
      { "key": "quality", "type": "select", "label": "Qualité",
        "options": ["1080p","720p","480p"], "default": "1080p" }
    ]
  },

  "watchtower": {
    "minVersion": "8.1.0",
    "apis": ["HTTP", "Download", "Notification", "Storage", "ZeusDL"]
  },

  "license": "MIT",
  "isNsfw": false,
  "requiresAccount": false,
  "paywall": "free"
}
```

---

## `commandScopes` et ZeusDL

ZeusDL est un **binaire déjà inclus dans l'APK Watchtower**. Les plugins ne l'installent pas — ils déclarent juste qu'ils veulent l'utiliser via `commandScopes`.

Référence (identique au plugin TikTok Downloader qui fonctionne) :
```json
"commandScopes": ["zeusdl", "ffmpeg"]
```

ZeusDL sera appelé par le runner avec les arguments déclarés dans `ui.json` ou construits par `ui/main.dart`.

---

## Packager en `.flare`

```bash
./tools/pack-flare.sh com.watchtower.youtube-downloader
# → dist/com.watchtower.youtube-downloader.flare
```

---

## Soumettre au registry

1. Fork `ferelking242/watchtower-extensions`
2. Ajoutez votre dossier dans `plugins/com.auteur.nom/`
3. Remplissez `manifest.json` (schemaVersion 2)
4. Testez : `./tools/validate-plugin.sh com.auteur.nom`
5. Pull Request → le CI valide + package automatiquement le `.flare`
