# AGENTS.md — watchtower-extensions

Catalogue d'extensions JS pour Watchtower. Chaque extension est un fichier
`src/<category>/<lang>/<slug>.js` référencé par `index/<category>.json`.

## Commandes utiles

```bash
# Validation statique (structure + index sync) — à lancer avant chaque commit
node tools/validate-extensions.mjs

# Harnais live (mêmes checks que la CI "Live Extension Validation")
node tools/run_all_tests.mjs --files "src/manga/fr/x.js" --deep --strict --out /tmp/r.json
node tools/run_all_tests.mjs --files "a.js,b.js" --deep --concurrency 5 --out /tmp/r.json

# Synchroniser les versions index <- source
node tools/sync_versions.mjs --dry-run
```

`run_all_tests.mjs` teste : `getPopular`, `getLatestUpdates`, `search`,
`getDetail`, cover, `getPageList` (+ pagination page 2 si `hasNextPage`).
En mode `--deep`/`--strict`, la pagination qui répète la page 1 est une erreur.

## Pièges de validation (Node 20 / undici)

La CI tourne sous Node 20 (fetch undici). Beaucoup de sites FR bloquent cette
empreinte TLS avec un **403**, alors que `curl`/`python` passent en 200. Une
extension dont le site renvoie 403 sous undici ne peut pas être validée : ne pas
la livrer. Sites 403 confirmés sous undici : Akuma, Kagane, MangaDot, OniSaga,
Ma Brute, Blossom Scans, AniVerse, Banchan Scan, izneo, Manhuarm, Solaris,
SimplyHentai (`api.simply-hentai.com`).

Sites atteignables (200 sous undici) et déjà portés : PornPics (FR/EN),
NamiComi (FR/EN), HentaiHand (EN), HentaiEra, HentaiZap, Dragon Ball Multiverse.

## Format d'une extension

- `watchtowerSources` = tableau d'UN objet métadonnées (name, lang, baseUrl,
  iconUrl, `pkgPath`, `sourceCodeUrl` non requis ici, `itemType`, `isNsfw`…).
- `class DefaultExtension extends MProvider` doit exposer au minimum
  `getPopular`, `getLatestUpdates`, `search`, `getDetail`, `getPageList`,
  `getFilterList`, `getSourcePreferences` (même `return []`).
- `lang:"all"` est accepté par le validateur.
- NSFW : fichiers sous `src/nsfw/...`, `"isNsfw": true`, `itemType: 0` pour les
  galeries manga/image.

## Index

- Entrée d'index : `sourceCodeUrl` pointe vers
  `https://cdn.jsdelivr.net/gh/ferelking242/watchtower-extensions@main/src/...`.
- Icônes : **locales** dans `assets/icons/`, référencées via
  `https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/assets/icons/...`.
  `tools/fetch_icons.mjs` résout le vrai favicon/apple-touch-icon (suit les
  redirections, pas de Google). Ne pas régénérer d'icônes placeholder SVG.
  Beaucoup de sites FR sont derrière Cloudflare (403 undici). Ordre de repli
  pour récupérer un vrai logo : (1) favicon déclaré, (2) `og:image` / logo,
  (3) icônes du web-manifest, (4) favicon Google/DuckDuckGo, (5) le logo
  embarqué dans l'extension Mihon amont (`res/mipmap-xxxhdpi/ic_launcher.png`)
  quand le domaine correspond. Rejeter l'icône générique renvoyée par les
  proxys pour un domaine inconnu (hash appris au vol).
- IDs : utiliser 2000001170+ pour les nouvelles entrées (pas de collision).
- Un fichier `.js` non référencé par un index est compté comme "unindexed" par
  le CLI Watchtower (`extensions list --include-unindexed`).

## Push

Remote : `https://github.com/ferelking242/watchtower-extensions.git` (branche
`main`). Ne pas ouvrir de PR sans demande explicite.
