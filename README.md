<div align="center">
  <img src="https://raw.githubusercontent.com/ferelking242/watchtower/main/assets/icon/icon.png" width="100" alt="Watchtower Logo" />
  <h1>Watchtower Extensions</h1>
  <p><strong>Official extension repository for the Watchtower app</strong></p>
  <p>
    <a href="https://ferelking242.github.io/watchtower-extensions"><img src="https://img.shields.io/badge/Website-Live-brightgreen?style=flat-square" alt="Website"/></a>
    <a href="https://github.com/ferelking242/watchtower-extensions/blob/main/watch/index.json"><img src="https://img.shields.io/badge/Watch-Extensions-blue?style=flat-square&logo=youtube" alt="Watch"/></a>
    <a href="https://github.com/ferelking242/watchtower-extensions/blob/main/manga/index.json"><img src="https://img.shields.io/badge/Manga-Extensions-orange?style=flat-square&logo=bookstack" alt="Manga"/></a>
    <a href="https://github.com/ferelking242/watchtower-extensions/blob/main/novel/index.json"><img src="https://img.shields.io/badge/Novel-Extensions-purple?style=flat-square" alt="Novel"/></a>
  </p>
</div>

---

## Overview

This repository hosts all official extensions for [Watchtower](https://github.com/ferelking242/watchtower) — a unified media app for watching, reading manga, novels, and gaming.

### Repository Structure

```
watchtower-extensions/
│
├── repo.json                 ← App entry point (points to all 4 indexes)
│
├── watch/
│   ├── index.json            ← All video/streaming extensions
│   ├── en/                   ← English sources
│   ├── fr/                   ← French sources
│   ├── de/                   ← German sources
│   ├── es/                   ← Spanish sources
│   ├── zh/                   ← Chinese sources
│   ├── ...                   ← Other languages
│   └── nsfw/                 ← Adult content (isNsfw: true)
│       ├── ja/               ← Japanese adult (JAV etc.)
│       ├── ko/               ← Korean adult
│       ├── en/               ← English adult
│       └── multi/            ← Multi-language adult
│
├── manga/
│   ├── index.json            ← All manga extensions
│   └── <lang>/               ← Language subfolders
│
├── novel/
│   ├── index.json            ← All novel extensions
│   └── <lang>/               ← Language subfolders
│
└── game/
    ├── index.json            ← All game extensions
    └── <lang>/               ← Language subfolders
```

---

## Adding This Repo to Watchtower

1. Open Watchtower → **Settings** → **Browse** → **Extension Repositories**
2. Tap **+** and paste the URL of the index for your content type:

| Type  | URL |
|-------|-----|
| Watch | `https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/watch/index.json` |
| Manga | `https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/manga/index.json` |
| Novel | `https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/novel/index.json` |
| Game  | `https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/game/index.json` |

Or add the main repo.json and let the app auto-detect:
```
https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/repo.json
```

---

## Creating Your Own Extension

### 1. Extension Anatomy

An extension is a single JavaScript file that exports a `watchtowerSources` array. Each source object describes a website the app can scrape.

**Minimal example — `mysource.js`:**

```javascript
const watchtowerSources = [{
  "name": "My Source",
  "lang": "en",
  "baseUrl": "https://mysite.com",
  "apiUrl": "",
  "iconUrl": "https://mysite.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,      // 0=manga, 1=watch/anime, 2=novel, 4=game
  "isManga": false,
  "isNsfw": false,
  "hasCloudflare": false,
  "version": "1.0.0",
  "appMinVerReq": "0.5.0",
  "sourceCodeLanguage": 1,   // 1=JavaScript
  "notes": ""
}];

// ── Search ────────────────────────────────────────────────────────────────
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

// ── Detail page ───────────────────────────────────────────────────────────
async function getDetail(url) {
  const res = await fetch(url);
  const $ = await parseHtml(await res.text());
  return {
    name: $('h1').text().trim(),
    description: $('.synopsis').text().trim(),
    imageUrl: $('.cover img').attr('src'),
    chapters: $('.episode-list li').toArray().map(el => ({
      name: $(el).find('.ep-title').text().trim(),
      url: $(el).find('a').attr('href'),
    })).reverse(),
  };
}

// ── Video/Page extraction ─────────────────────────────────────────────────
async function getVideoList(url) {
  // For watch extensions: return video sources
  const res = await fetch(url);
  // ... extract video URLs ...
  return [{ url: 'https://...', quality: '1080p', headers: {} }];
}
```

### 2. `itemType` Values

| Value | Content Type |
|-------|-------------|
| `0`   | Manga / Comic |
| `1`   | Watch / Anime / Video |
| `2`   | Novel / Ebook |
| `4`   | Game / ROM |

### 3. Available APIs Inside Extensions

Watchtower injects these globals into your JS runtime:

| API | Description |
|-----|-------------|
| `fetch(url, options?)` | HTTP client with cookie support |
| `parseHtml(html)` | Returns a Cheerio-like `$` selector |
| `source` | The current source config object |
| `btoa(str)` / `atob(str)` | Base64 encode/decode |
| `CryptoJS` | Encryption utilities (AES, MD5…) |

### 4. Marking NSFW Content

Set `"isNsfw": true` in your source object. The app hides these extensions unless the user enables NSFW in Settings → Browse. Place the file under the `nsfw/` subfolder of the relevant language:

```
watch/nsfw/en/mysource.js
watch/nsfw/ja/myjavsource.js
```

---

## Creating Your Own Extension Repository

### 1. Fork or Create a Repo

Create a GitHub repository and set up this structure:

```
my-extensions/
├── repo.json
├── watch/
│   ├── index.json
│   └── en/
│       └── mysource.js
├── manga/
│   ├── index.json
│   └── en/
│       └── mymanga.js
```

### 2. Write `repo.json`

```json
{
  "name": "My Extension Repo",
  "website": "https://github.com/yourname/my-extensions",
  "watchJsonUrl": "https://raw.githubusercontent.com/yourname/my-extensions/main/watch/index.json",
  "mangaJsonUrl": "https://raw.githubusercontent.com/yourname/my-extensions/main/manga/index.json",
  "novelJsonUrl": "https://raw.githubusercontent.com/yourname/my-extensions/main/novel/index.json",
  "gameJsonUrl":  "https://raw.githubusercontent.com/yourname/my-extensions/main/game/index.json"
}
```

### 3. Write the Index (`watch/index.json`)

The index is a JSON array of source descriptor objects. Each object must match this schema:

```json
[
  {
    "name": "My Source",
    "id": 9000000001,
    "baseUrl": "https://mysite.com",
    "lang": "en",
    "typeSource": "single",
    "iconUrl": "https://mysite.com/favicon.ico",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": false,
    "sourceCodeUrl": "https://raw.githubusercontent.com/yourname/my-extensions/main/watch/en/mysource.js",
    "apiUrl": "",
    "version": "1.0.0",
    "isManga": false,
    "itemType": 1,
    "isFullData": false,
    "appMinVerReq": "0.5.0",
    "additionalParams": "",
    "sourceCodeLanguage": 1,
    "notes": ""
  }
]
```

> **ID uniqueness:** Use a high unique integer for `id` (e.g. start at `9000000001`). Avoid collisions with existing extensions.

### 4. Publish Your Repo Index URL

Make your GitHub repo public, then share the raw URL:
```
https://raw.githubusercontent.com/yourname/my-extensions/main/watch/index.json
```

Users can paste this into Watchtower → Settings → Browse → Extension Repositories.

### 5. Keeping Your Index Up to Date

When you update an extension JS file, **also bump the `version` field** in the index JSON. Watchtower uses version comparison to show the "Update" badge.

---

## Contributing

1. Fork this repository
2. Place your JS file in the correct language subfolder (`watch/en/`, `manga/fr/`, etc.)
3. Add your source entry to the corresponding `index.json`
4. Bump the version if updating an existing source
5. Open a Pull Request — title: `[watch/en] Add MySite v1.0.0`

Please ensure:
- NSFW sources use `"isNsfw": true` and are in a `nsfw/` subfolder
- Version follows `MAJOR.MINOR.PATCH` (SemVer)
- `appMinVerReq` matches the minimum Watchtower version your extension requires
- Extensions do not contain malicious code

---

## License

MIT — see [LICENSE](LICENSE)
