# 🏗️ ARCHITECTURE — Watchtower Extensions

> Document de référence. Toute nouvelle extension, dossier ou type **doit** respecter cet arbre et ces formats.
> Dernière mise à jour : 2026-08-21 — v2.0

---

## 1. Arbre cible (structure optimale)

```
watchtower-extensions/
│
├── repo.json                      # ⭐ Point d'entrée : URLs des index consommés par l'app
├── server.js                      # CDN statique + API d'exécution Node (dev/test)
├── ARCHITECTURE.md                # CE document
├── README.md                      # Présentation publique
│
├── src/                           # ═══ CODE DES EXTENSIONS ═══
│   ├── _shared/                   # 🔧 Libs communes chargées AVANT toute extension
│   │   ├── http.js                #    Client HTTP + retry/backoff + timeout + cache
│   │   ├── html.js                #    Parsing DOM/regex helpers
│   │   ├── geo.js                 #    Bypass géo : headers pays/fuseau standardisés
│   │   └── sign.js                #    Signature/hash spécifiques à certains sites
│   │
│   ├── watch/{lang}/*.js          # 🎬 Films & séries        (ex: watch/multi/moviebox_app.js)
│   ├── manga/{lang}/*.js          # 📖 Mangas/manwha
│   ├── novel/{lang}/*.js          # 📚 Romans/webnovels
│   ├── game/{lang}/*.js           # 🎮 ROMs/jeux
│   ├── music/{lang}/*.js          # 🎵 Sources musique JS natives
│   │
│   ├── subtitles/multi/*.js       # 🗣️ NOUVEAU — providers de sous-titres
│   ├── quiz/{lang}/*.js           # ❓ NOUVEAU — packs de quiz interactifs
│   ├── tracker/*.js               # 🔄 NOUVEAU — sync AniList/MAL/Simkl
│   ├── meta/*.js                  # 🧠 NOUVEAU — enrichissement métadonnées (TMDB…)
│   ├── lyrics/*.js                # 🎤 NOUVEAU — paroles synchronisées/non
│   ├── live/multi/*.js            # 📡 NOUVEAU — TV live/radio/podcasts
│   └── feed/{lang}/*.js           # 📰 NOUVEAU — fils d'actus/RSS pour le home
│   │
│   └── nsfw/{media}/{lang}/*.js   # 🔞 Contenu NSFW (isolé, opt-in app)
│                                   #    ex: nsfw/watch/en/... — migration depuis */nsfw
│
├── ui-layouts/                    # ═══ LAYOUTS DU HOMESCREEN ═══
│   ├── _schema.json               # NOUVEAU — schéma des composants autorisés
│   ├── moviebox_app.json          # 1 fichier par source : <nom>.json
│   └── ...
│
├── index/                         # ═══ CATALOGUES CONSOMMÉS PAR L'APP ═══
│   ├── watch.json                 # registre sources vidéo
│   ├── manga.json
│   ├── novel.json
│   ├── game.json
│   ├── music.json
│   ├── subtitles.json             # NOUVEAU
│   ├── quiz.json                  # NOUVEAU
│   ├── tracker.json               # NOUVEAU
│   ├── meta.json                  # NOUVEAU
│   ├── lyrics.json                # NOUVEAU
│   ├── live.json                  # NOUVEAU
│   └── plugins.json               # paquets .flare/.smplug
│
├── icons/                         # ═══ ICÔNES HÉBERGÉES ICI (règle : 100% local) ═══
│   ├── watch/<source>.png         # FINI les iconUrl pointant vers le repo app ou le site
│   ├── manga/<source>.png         # URL canonique :
│   ├── ...                        # https://cdn.jsdelivr.net/gh/ferelking242/watchtower-extensions@main/icons/<média>/<source>.png
│   └── _types/                    # icônes génériques par type (quiz.png, subtitles.png…)
│
├── plugins/                       # ═══ PAQUETS INSTALLABLES ═══
│   ├── schema.json                # ⚠️ À CRÉER (référencé par plugins.json mais absent !)
│   ├── _templates/                # ⚠️ À CRÉER (idem) — squelettes prêts à l'emploi
│   ├── *.smplug                   # plugins musique
│   └── com.auteur.nom.flare       # paquets complets (voir docs/flare-format.md)
│
├── tools/                         # ═══ OUTILS ═══
│   ├── test_extension.mjs         # test unitaire d'une source
│   ├── run_all_tests.mjs          # smoke-test global (popular/search/detail/videos)
│   ├── build_wext.py              # build paquets
│   ├── pack-flare.sh              # empaquetage .flare
│   ├── validate-plugin.sh         # validation manifest .flare
│   └── gen_index.mjs              # NOUVEAU — régénère les index depuis src/ (anti-désyncro)
│
├── docs/                          # formats + guides contributeurs
│   ├── flare-format.md            # format paquet plugin
│   ├── extension-api.md           # NOUVEAU — API MProvider complète par type
│   └── index.html                 # site GitHub Pages
│
└── local_sources/_template/       # dev hors dépôt (sideload)
```

### Règles d'or de l'arbre
1. **`src/` = code, `index/` = métadonnées, `ui-layouts/` = présentation, `icons/` = assets.** Jamais de mélange.
2. **1 extension = 1 fichier JS** dans `src/<type>/<lang>/`. Pas de sous-dossier par extension.
3. **Le nom du fichier = l'id de l'entrée d'index** (`en.romsfun.js` ↔ `"sourceCodeUrl": "...src/game/en/en.romsfun.js"`).
4. **Les icônes vivent dans ce repo** (`icons/`) — jamais sur le repo app ni sur un site tiers.
5. **NSFW isolé** dans `src/nsfw/`, jamais mélangé aux catalogues classiques.

---

## 2. Conventions transverses

### Langues (`{lang}`)
Codes ISO 639-1 (`en`, `fr`, `es`…) + `multi` (contenu multilingue) + `all` (agnostique).

### IDs numériques (index JSON)
| Plage | Type |
|---|---|
| `1xxx` | music |
| `19xxxxxxxx` | watch |
| `20xxxxxxxx` | manga |
| `30xxxxxxxx` | novel |
| `60xxxxxxxx` | game |
| `70xxxxxxxx` | subtitles |
| `71xxxxxxxx` | quiz |
| `72xxxxxxxx` | tracker/meta/lyrics/live/feed |

### Versioning
SemVer strict, incrémenté **à chaque modification** du fichier (l'app détecte les mises à jour via la version de l'index).

### Champs d'index standard (tous types)
```jsonc
{
  "id": 7000000001,
  "name": "OpenSubtitles Mirror",
  "lang": "multi",
  "itemType": 7,                    // 1=vidéo 2=manga 3=musique 4=jeu … 7=subs 8=quiz
  "version": "1.0.0",
  "iconUrl": "https://cdn.jsdelivr.net/gh/ferelking242/watchtower-extensions@main/icons/subtitles/opensubtitles-mirror.png",
  "sourceCodeUrl": "https://cdn.jsdelivr.net/gh/ferelking242/watchtower-extensions@main/src/subtitles/multi/subs.opensubtitlesmirror.js",
  "requiresAccount": false,
  "paywall": "free",
  "notes": "changelog court"
}
```

---

## 3. Formats par type

### 3.1 Source média (watch / manga / novel / game / music) — existant
- En-tête : `const watchtowerSources = [{ ...manifest }]` (identique à l'entrée d'index).
- Corps : `class DefaultExtension extends MProvider` avec les méthodes standard :
  `getMainPage` → sections, `getPopular`, `getLatestUpdates`, `search`, `getDetail`, `getVideoList` / `getChapters` / `getPages`.
- **Nouveau obligatoire** : importer les helpers `_shared` au lieu de dupliquer retry/headers :
  ```js
  // en tête de fichier — résolu et concaténé au build par gen_index/tools
  // @shared http.js geo.js
  ```
- Champs optionnels activés par flags dans le manifest : `supportsComments`, `forYou: true`,
  `supportsMiniaturePreview`, `supportsSubtitleProvider` → l'app affiche les UI correspondantes
  **uniquement** si le flag est vrai ET que la méthode existe.

### 3.2 ui-layouts (JSON déclaratif) — existant, à formaliser
Un fichier par source : `ui-layouts/<source>.json`. Composants connus :
`banner` · `spotlight` · `categoryPills` · `carousel` · `historyRow` · `grid`.
**Nouveaux composants prévus** : `posterRow` (rangée horizontale), `continueWatching`
(barre de progression native), `quizCard`, `newsTicker` (feed RSS), `liveNow`.

`_schema.json` décrit chaque composant (champs requis/types) → validé en CI.

### 3.3 Plugin `.flare` — existant (docs/flare-format.md)
ZIP signé : `manifest.json` (permissions, commandScopes) + `ui/` (schema|dart|html) + `assets/`.

### 3.4 Plugin musique `.smplug` — existant.

---

## 4. 🆕 Nouveaux types — specs d'API

### 4.1 Provider de sous-titres — `src/subtitles/{lang}/*.js`

```js
const watchtowerSources = [{
  id: 7000000001, name: "SubSource", lang: "multi", itemType: 7, version: "1.0.0",
  capabilities: { formats: ["srt","vtt","ass"], hearingImpaired: true, autoSync: true }
}];

class DefaultExtension extends MProvider {
  // Recherche par média OU par hash de fichier vidéo
  searchSubs(query, { imdbId, tmdbId, season, episode, fileHash, langs }) {}
  // → [{ id, lang, format, release, rating, hi(bool), downloads, url }]

  downloadSub(id, targetLang) {}   // → { url } | { content } (converti srt/vtt côté app)

  uploadSub?(detailUrl, file) {}   // optionnel — contribution communautaire
}
```
L'app appelle `searchSubs` automatiquement à l'ouverture d'une vidéo si un provider subs est actif.
Sélecteur de piste dans le lecteur : langue → release → téléchargement/cache offline.

### 4.2 Quiz — `src/quiz/{lang}/*.js`

```js
const watchtowerSources = [{
  id: 7100000001, name: "CineQuiz FR", lang: "fr", itemType: 8, version: "1.0.0",
  capabilities: { modes: ["classic","blitz","survival"], media: ["image","audio"] }
}];

class DefaultExtension extends MProvider {
  getCategories() {}              // → [{ id, name, icon, difficulty, questionCount }]
  getQuiz(categoryId, page) {}    // → questions :
  // [{ qId, type: "mcq"|"truefalse"|"order"|"media",
  //    text, mediaUrl?, options[], answerIndex|answerOrder[],
  //    explanation?, points, timeLimit }]
  submitScore?(categoryId, score) {}  // si leaderboard serveur dispo
}
```
Rendu natif (pas de WebView). Les packs peuvent être mis en cache offline.
Sources candidates : OpenTDB, Trivia API, quiz maison JSON embarqué.

### 4.3 Tracker / sync — `src/tracker/*.js`
`searchEntry(title)` → correspondance, `getStatus(entry)` → `{score, progress, status}`,
`setStatus(entry, patch)` ; OAuth géré par l'app (AniList, MyAnimeList, Simkl).

### 4.4 Meta provider — `src/meta/*.js`
Enrichissement des pages détail : `enrich(detail)` → cast/photos/synopsis/notes
complémentaires (TMDB, OMDb). Fusion non-destructive avec les données de la source.

### 4.5 Lyrics — `src/lyrics/*.js`
`searchLyrics(track{title,artist,album,duration})` → `{ synced: bool, lines[]|text }`
(LRCLIB, Musixmatch mirror…). Affichage karaoké dans le lecteur musique.

### 4.6 Live / radio / podcast — `src/live/multi/*.js`
MProvider standard mais `getVideoList` renvoie des flux directs (HLS/DASH).
Catégories pays/genres ; EPG optionnel via `getSchedule(date)`.

### 4.7 Feed / actus — `src/feed/{lang}/*.js`
Alimente le composant `newsTicker` du home : `getFeed(page)` → titres + liens + images.
Exemples : sorties Netflix/semaine, actus anime FR, sorties ROMs.

---

## 5. CI / qualité (GitHub Actions existants + à ajouter)

| Workflow | Rôle |
|---|---|
| `validate-plugin.yml` | valide les manifests `.flare` |
| `build-plugins.yml` | build/publish paquets |
| `purge-cdn.yml` | purge cache jsDelivr après push |
| `lint-extensions.yml` | **à ajouter** : `node --check` sur tout `src/**` + validation JSON des `index/` et `ui-layouts/` (schéma `_schema.json`) |
| `smoke-tests.yml` | **à ajouter** : `run_all_tests.mjs` nocturne sur un échantillon de sources |

---

## 6. Migration (TODO ordonnée)

1. [ ] Créer `plugins/schema.json` + `plugins/_templates/` (référencés mais absents aujourd'hui)
2. [ ] Déplacer les icônes vers `icons/` + réécrire tous les `iconUrl` des index
3. [ ] Extraire `src/_shared/http.js` (retry/backoff déjà codé 3× dans moviefr/moviebox/moviebox_app)
4. [ ] Déplacer `src/*/nsfw/` → `src/nsfw/*/`
5. [ ] Écrire `ui-layouts/_schema.json` + brancher la validation CI
6. [ ] Premier provider subtitles (LRCLIB-style) puis premier quiz (OpenTDB)
7. [ ] `tools/gen_index.mjs` : génération partielle des index depuis les en-têtes `watchtowerSources` (anti-désyncro index/code)
