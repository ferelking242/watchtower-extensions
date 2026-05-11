# Contributing to Watchtower Extensions

Thank you for your interest! Watchtower extensions are **JavaScript files** — no Java, no Kotlin, no compilation required.

## Quick Start

1. **Fork** this repository
2. Create your JS file in the right folder (e.g. `watch/en/mysource.js`)
3. Add an entry to the corresponding `index.json`
4. Open a Pull Request

## File Placement

| Content type | Folder | Index |
|-------------|--------|-------|
| Watch / Streaming | `watch/<lang>/` | `watch/index.json` |
| Watch (adult/NSFW) | `watch/nsfw/<lang>/` | `watch/index.json` (with `isNsfw: true`) |
| Manga | `manga/<lang>/` | `manga/index.json` |
| Novel | `novel/<lang>/` | `novel/index.json` |
| Game | `game/<lang>/` | `game/index.json` |

Language codes follow [ISO 639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) (`en`, `fr`, `ja`, `zh`, etc.). Use `all` for multi-language sources.

## Minimal Extension Template

```javascript
const watchtowerSources = [{
  "name": "My Source",
  "lang": "en",
  "baseUrl": "https://mysite.com",
  "apiUrl": "",
  "iconUrl": "https://mysite.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,              // 0=manga  1=watch  2=novel  4=game
  "isManga": false,
  "isNsfw": false,
  "hasCloudflare": false,
  "version": "1.0.0",
  "appMinVerReq": "0.5.0",
  "sourceCodeLanguage": 1,    // always 1 (JavaScript)
  "notes": ""
}];

async function search(query, page) { /* ... */ }
async function getDetail(url) { /* ... */ }
async function getVideoList(url) { /* ... */ }  // watch only
async function getPageList(url) { /* ... */ }   // manga only
```

## Index Entry

After placing your JS file, add an entry to `watch/index.json` (or the relevant index):

```json
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
  "sourceCodeUrl": "https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/watch/en/mysource.js",
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
```

> **IDs**: Pick a unique integer. Start at `9000000001` for community extensions.

## PR Title Format

```
[watch/en] Add MySite v1.0.0
[manga/fr] Fix URL regex for MangaFR
[novel/en] Update RoyalRoad to v1.1.0
```

## Rules

- NSFW sources **must** set `"isNsfw": true` and be placed in a `nsfw/` subfolder
- Version bumps required when updating existing sources
- No malicious code, no data harvesting
