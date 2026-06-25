<div align="center">

  <img src="https://raw.githubusercontent.com/ferelking242/watchtower/main/assets/icon/icon.png" width="120" alt="Watchtower" />
https://google.com
  # Watchtower Extensions

  **Le dépôt officiel d'extensions pour [Watchtower](https://github.com/ferelking242/watchtower)**
  *Regarder · Lire · Écouter · Jouer — tout en un*

  [![Extensions Watch](https://img.shields.io/badge/Watch-60%20sources-blue?style=flat-square&logo=youtube)](https://github.com/ferelking242/watchtower-extensions/blob/main/index/watch.json)
  [![Extensions Manga](https://img.shields.io/badge/Manga-15%20sources-orange?style=flat-square&logo=bookstack)](https://github.com/ferelking242/watchtower-extensions/blob/main/index/manga.json)
  [![Extensions Novel](https://img.shields.io/badge/Novel-10%20sources-purple?style=flat-square)](https://github.com/ferelking242/watchtower-extensions/blob/main/index/novel.json)
  [![Extensions Music](https://img.shields.io/badge/Music-4%20sources-green?style=flat-square&logo=spotify)](https://github.com/ferelking242/watchtower-extensions/blob/main/index/music.json)
  [![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)](LICENSE)

  </div>

  ---

  ## 📋 Table des matières

  - [Ajouter le dépôt à Watchtower](#-ajouter-le-dépôt-à-watchtower)
  - [Ajouter le dépôt via Live Container](#-via-live-container)
  - [Ajouter manuellement](#-ajouter-manuellement)
  - [Dépôts disponibles par app](#-dépôts-disponibles-par-app)
  - [Architecture du dépôt](#-architecture-du-dépôt)
  - [Créer une extension](#-créer-une-extension)
  - [Créer son propre dépôt](#-créer-son-propre-dépôt)
  - [Contribuer](#-contribuer)

  ---

  ## 📲 Ajouter le dépôt à Watchtower

  > **Watchtower** — ouvre l'app → **Plus** → **Paramètres** → **Browse**

  Clique sur l'un des boutons ci-dessous pour ajouter le ou les dépôts correspondants :

  ### Tous les dépôts d'un coup

  [![Add All](https://img.shields.io/badge/➕%20Ajouter%20tous%20les%20dépôts-Watchtower-1a1a2e?style=for-the-badge&logo=github)](watchtower://add-repo?url=https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/repo.json)

  ### Par type de contenu

  | Type | Bouton |
  |------|--------|
  | 📺 **Watch** — Anime, Films, Séries | [![Add Watch](https://img.shields.io/badge/➕%20Watch-blue?style=flat-square)](watchtower://add-repo?url=https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/index/watch.json) |
  | 📖 **Manga** — Manga, Manhwa, Comics | [![Add Manga](https://img.shields.io/badge/➕%20Manga-orange?style=flat-square)](watchtower://add-repo?url=https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/index/manga.json) |
  | 📚 **Novel** — Webnovels, Light novels | [![Add Novel](https://img.shields.io/badge/➕%20Novel-purple?style=flat-square)](watchtower://add-repo?url=https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/index/novel.json) |
  | 🎵 **Music** — Streaming musical | [![Add Music](https://img.shields.io/badge/➕%20Music-green?style=flat-square)](watchtower://add-repo?url=https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/index/music.json) |
  | 🎮 **Game** — ROMs & émulation | [![Add Game](https://img.shields.io/badge/➕%20Game-red?style=flat-square)](watchtower://add-repo?url=https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/index/game.json) |

  ---

  ## 🐳 Via Live Container

  > Si tu as installé l'app via **Live Container**, utilise ces boutons à la place :

  [![Add All (LC)](https://img.shields.io/badge/➕%20Ajouter%20tous%20les%20dépôts-Live%20Container-0f3460?style=for-the-badge&logo=docker)](livecontainer://add-repo?url=https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/repo.json)

  | Type | Bouton |
  |------|--------|
  | 📺 Watch | [![Add Watch LC](https://img.shields.io/badge/➕%20Watch-LC-blue?style=flat-square)](livecontainer://add-repo?url=https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/index/watch.json) |
  | 📖 Manga | [![Add Manga LC](https://img.shields.io/badge/➕%20Manga-LC-orange?style=flat-square)](livecontainer://add-repo?url=https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/index/manga.json) |
  | 📚 Novel | [![Add Novel LC](https://img.shields.io/badge/➕%20Novel-LC-purple?style=flat-square)](livecontainer://add-repo?url=https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/index/novel.json) |
  | 🎵 Music | [![Add Music LC](https://img.shields.io/badge/➕%20Music-LC-green?style=flat-square)](livecontainer://add-repo?url=https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/index/music.json) |
  | 🎮 Game | [![Add Game LC](https://img.shields.io/badge/➕%20Game-LC-red?style=flat-square)](livecontainer://add-repo?url=https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/index/game.json) |

  ---

  ## 🔗 Ajouter manuellement

  Ouvre l'app → **Plus** → **Paramètres** → **Browse** → **Dépôts d'extensions** → **+**

  Colle l'URL correspondante :

  ```
  # Dépôt principal (auto-détecte tous les types)
  https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/repo.json

  # Watch (Anime, Films, Séries)
  https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/index/watch.json

  # Manga & Comics
  https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/index/manga.json

  # Novels
  https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/index/novel.json

  # Musique
  https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/index/music.json

  # Jeux / ROMs
  https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/index/game.json
  ```

  ---

  ## 🌐 Dépôts disponibles par app

  > Ces URLs sont compatibles avec plusieurs apps basées sur le même moteur.

  <details>
  <summary><strong>📺 Watchtower</strong> — app principale</summary>

  | Bouton | URL |
  |--------|-----|
  | [![Watchtower All](https://img.shields.io/badge/All-Watchtower-1a1a2e?style=flat-square)](watchtower://add-repo?url=https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/repo.json) | `watchtower://add-repo?url=…/repo.json` |
  | [![Watchtower Manga](https://img.shields.io/badge/Manga-Watchtower-orange?style=flat-square)](watchtower://add-repo?url=https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/index/manga.json) | `watchtower://add-repo?url=…/index/manga.json` |
  | [![Watchtower Novel](https://img.shields.io/badge/Novel-Watchtower-purple?style=flat-square)](watchtower://add-repo?url=https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/index/novel.json) | `watchtower://add-repo?url=…/index/novel.json` |

  </details>

  <details>
  <summary><strong>🦊 Mangayomi</strong> — fork upstream</summary>

  | Bouton | URL |
  |--------|-----|
  | [![Mangayomi Manga](https://img.shields.io/badge/Manga-Mangayomi-orange?style=flat-square)](mangayomi://add-repo?url=https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/index/manga.json) | `mangayomi://add-repo?url=…/index/manga.json` |
  | [![Mangayomi Novel](https://img.shields.io/badge/Novel-Mangayomi-purple?style=flat-square)](mangayomi://add-repo?url=https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/index/novel.json) | `mangayomi://add-repo?url=…/index/novel.json` |

  </details>

  <details>
  <summary><strong>📦 Live Container</strong> — installation sandboxée iOS</summary>

  | Bouton | URL |
  |--------|-----|
  | [![LC All](https://img.shields.io/badge/All-LiveContainer-0f3460?style=flat-square)](livecontainer://add-repo?url=https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/repo.json) | `livecontainer://add-repo?url=…/repo.json` |
  | [![LC Manga](https://img.shields.io/badge/Manga-LiveContainer-orange?style=flat-square)](livecontainer://add-repo?url=https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/index/manga.json) | `livecontainer://add-repo?url=…/index/manga.json` |
  | [![LC Novel](https://img.shields.io/badge/Novel-LiveContainer-purple?style=flat-square)](livecontainer://add-repo?url=https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/index/novel.json) | `livecontainer://add-repo?url=…/index/novel.json` |

  </details>

  ---

  ## 🗂️ Architecture du dépôt

  ```
  watchtower-extensions/
  │
  ├── 📁 src/                        ← Code source des extensions (.js)
  │   │
  │   ├── 📁 watch/                  ← Sources vidéo (anime, films, séries)
  │   │   ├── 📁 multi/              ← Extensions multi-langues (1 fichier = N langues)
  │   │   ├── 📁 en/                 ← Sources anglophones uniquement
  │   │   ├── 📁 fr/                 ← Sources francophones uniquement
  │   │   ├── 📁 de/ es/ zh/ …      ← Autres langues
  │   │   └── 📁 nsfw/               ← Contenu adulte (désactivé par défaut)
  │   │       ├── 📁 en/
  │   │       ├── 📁 ja/             ← JAV & sources japonaises
  │   │       └── 📁 multi/
  │   │
  │   ├── 📁 manga/                  ← Sources manga, manhwa, comics
  │   │   ├── 📁 multi/              ← MangaDex, Comick, Webtoons, Mangafire…
  │   │   ├── 📁 en/ fr/ ar/ …      ← Sources langue-spécifiques
  │   │   └── 📁 nsfw/multi/        ← MangaDex Unlocked
  │   │
  │   ├── 📁 novel/en/               ← RoyalRoad, WuxiaWorld, NovelFire…
  │   ├── 📁 game/en/                ← Sources ROM / émulation
  │   ├── 📁 music/                  ← SoundCloud, Deezer, YouTube Music…
  │   └── 📁 plugins/               ← Plugins système (téléchargeurs, sync…)
  │
  ├── 📁 index/                      ← Index JSON générés (lus par l'app)
  │   ├── watch.json                 ← Index Watch
  │   ├── manga.json                 ← Index Manga
  │   ├── novel.json                 ← Index Novel
  │   ├── game.json                  ← Index Game
  │   └── music.json                 ← Index Music
  │
  ├── 📁 docs/                       ← Site web GitHub Pages
  ├── 📁 tools/                      ← Scripts de build et de test
  ├── 📁 local_sources/              ← Templates pour sources personnelles
  ├── 📄 repo.json                   ← Point d'entrée principal
  └── 📄 README.md
  ```

  > **Pourquoi `multi/` ?** MangaDex supporte 45 langues avec un seul fichier. L'ancienne structure créait 42 entrées identiques dans la marketplace. Maintenant : **1 entrée, toutes les langues**.

  ---

  ## 🔧 Créer une extension

  <details>
  <summary><strong>Voir le guide complet</strong></summary>

  ### Structure minimale

  Une extension = un fichier JS qui exporte `watchtowerSources` :

  ```javascript
  const watchtowerSources = [{
    "name": "Ma Source",
    "lang": "en",                  // ou "multi" si plusieurs langues
    "baseUrl": "https://monsite.com",
    "iconUrl": "https://monsite.com/favicon.ico",
    "typeSource": "single",
    "itemType": 1,                 // 0=manga 1=watch 2=novel 4=game
    "isManga": false,
    "isNsfw": false,
    "hasCloudflare": false,
    "version": "1.0.0",
    "appMinVerReq": "0.5.0",
    "sourceCodeLanguage": 1,       // 1=JavaScript
  }];

  async function search(query, page) {
    const url = `${source.baseUrl}/search?q=${encodeURIComponent(query)}&page=${page}`;
    const res = await fetch(url);
    const $ = await parseHtml(await res.text());
    return {
      list: $('.item').toArray().map(el => ({
        name: $(el).find('.title').text().trim(),
        imageUrl: $(el).find('img').attr('src'),
        link: $(el).find('a').attr('href'),
      })),
      hasNextPage: !!$('.next-page').length,
    };
  }

  async function getDetail(url) { /* … */ }
  async function getVideoList(url) { /* … */ }   // pour watch
  async function getPageList(url) { /* … */ }    // pour manga
  ```

  ### Types de contenu (`itemType`)

  | Valeur | Type |
  |--------|------|
  | `0` | Manga / Comic |
  | `1` | Watch / Anime / Vidéo |
  | `2` | Novel / Ebook |
  | `4` | Game / ROM |

  ### APIs disponibles dans le runtime

  | API | Description |
  |-----|-------------|
  | `fetch(url, options?)` | HTTP avec support cookies |
  | `parseHtml(html)` | Sélecteur Cheerio-like |
  | `source` | Config de la source courante |
  | `btoa` / `atob` | Base64 |
  | `CryptoJS` | AES, MD5, etc. |

  ### Extension multi-langues

  Si ta source supporte plusieurs langues, utilise `"lang": "multi"` et le champ `"langs"` :

  ```javascript
  const watchtowerSources = [{
    "lang": "multi",
    "langs": ["en", "fr", "de", "ja"],
    "ids": {
      "en": 810342358,
      "fr": 545017689,
      // …
    }
  }];
  ```

  Cela crée **une seule entrée** dans la marketplace avec un sélecteur de langue intégré.

  ### Contenu NSFW

  ```javascript
  // Dans le fichier source :
  "isNsfw": true

  // Placement dans le repo :
  src/watch/nsfw/en/masource.js
  src/manga/nsfw/multi/masource.js
  ```

  Le contenu NSFW est masqué par défaut — l'utilisateur doit l'activer dans **Paramètres → Browse**.

  </details>

  ---

  ## 🏗️ Créer son propre dépôt

  <details>
  <summary><strong>Guide pas à pas</strong></summary>

  ### 1. Structure minimale

  ```
  mon-depot/
  ├── repo.json
  ├── index/
  │   └── manga.json
  └── src/
      └── manga/
          └── en/
              └── masource.js
  ```

  ### 2. `repo.json`

  ```json
  {
    "name": "Mon Dépôt",
    "website": "https://github.com/moncompte/mon-depot",
    "watchJsonUrl":  "https://raw.githubusercontent.com/moncompte/mon-depot/main/index/watch.json",
    "mangaJsonUrl":  "https://raw.githubusercontent.com/moncompte/mon-depot/main/index/manga.json",
    "novelJsonUrl":  "https://raw.githubusercontent.com/moncompte/mon-depot/main/index/novel.json"
  }
  ```

  ### 3. `index/manga.json`

  ```json
  [
    {
      "name": "Ma Source",
      "id": 9000000001,
      "baseUrl": "https://monsite.com",
      "lang": "en",
      "typeSource": "single",
      "iconUrl": "https://monsite.com/favicon.ico",
      "isNsfw": false,
      "hasCloudflare": false,
      "sourceCodeUrl": "https://raw.githubusercontent.com/moncompte/mon-depot/main/src/manga/en/masource.js",
      "version": "1.0.0",
      "isManga": true,
      "itemType": 0,
      "appMinVerReq": "0.5.0",
      "sourceCodeLanguage": 1
    }
  ]
  ```

  > **ID unique** : commence à `9000000001` pour éviter les collisions avec ce dépôt officiel.

  ### 4. Publier

  Rends le repo GitHub public, puis partage l'URL :
  ```
  https://raw.githubusercontent.com/moncompte/mon-depot/main/repo.json
  ```

  ### 5. Mises à jour

  À chaque modification d'un fichier JS, **incrémente le champ `version`** dans l'index JSON. Watchtower affiche alors le badge « Mettre à jour » dans la marketplace.

  </details>

  ---

  ## 🤝 Contribuer

  1. **Fork** ce dépôt
  2. Place ton fichier JS dans `src/<type>/<lang>/masource.js`
  3. Ajoute une entrée dans `index/<type>.json`
  4. Si c'est une mise à jour, **bump la version** dans l'index
  5. Ouvre une **Pull Request** — titre : `[manga/en] Add MonSite v1.0.0`

  ### Règles

  - ✅ Sources NSFW → `isNsfw: true` + placées dans `src/<type>/nsfw/<lang>/`
  - ✅ Version SemVer : `MAJOR.MINOR.PATCH`
  - ✅ `appMinVerReq` doit correspondre à la version Watchtower minimum requise
  - ❌ Pas de code malveillant ou de tracking utilisateur
  - ❌ Pas de clés API hardcodées

  ---

  <div align="center">

  **MIT License** · [Watchtower](https://github.com/ferelking242/watchtower) · [Signaler un bug](https://github.com/ferelking242/watchtower-extensions/issues)

  </div>
  
