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

## Libellés de qualité

- Une entrée `quality` décrit une **résolution**, jamais le conteneur. Un flux
  HLS adaptatif s'appelle `"Auto"` (le réglage app « qualité par défaut » gère
  déjà la sélection) ; `"HLS"`, `"Auto (HLS)"`, `"HLS Auto"` sont interdits.
- Ne jamais annoncer une résolution que l'URL ne contient pas. XNXX renvoie
  `mp4_high` → `video_360p.mp4` pour une source 1080p : lire la résolution dans
  le nom de fichier (`_mp4Quality`) au lieu de supposer que `high` = 720p.
- Les vraies variantes d'un master HLS (250p..1080p) ne sont pas listées par
  l'extension : l'app les découvre en lisant le master
  (`lib/services/hls_variant_resolver.dart`). Ne pas tenter de dupliquer cette
  logique dans chaque extension.
- Bumper `"version"` dans le manifeste de toute extension modifiée, puis
  `node tools/sync_versions.mjs`. Sans bump, l'app ne propose jamais la mise à
  jour et le correctif n'atteint aucune source installée.
- `getVideoList` est le chemin critique du démarrage vidéo : tout ce qui n'est
  pas nécessaire à l'URL de lecture doit être **hors** de son `await`. XNXX
  attendait `_saveHistoryItem` (écriture SharedPreferences) avant de retourner
  les sources ; le passer en fire-and-forget a supprimé cette attente. Ne pas
  réintroduire d'`await` décoratif (historique, favoris, télémétrie) dans ce
  retour.

## Index

- Entrée d'index : `sourceCodeUrl` pointe vers
  `https://cdn.jsdelivr.net/gh/ferelking242/watchtower-extensions@main/src/...`.
- Icônes : **locales** dans `assets/icons/`, référencées via
  `https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/assets/icons/...`.
  `tools/fetch_icons.mjs` résout le vrai favicon/apple-touch-icon (suit les
  redirections, sans Google Search/DDG). Ne pas régénérer d'icônes placeholder
  SVG. Beaucoup de sites FR sont derrière Cloudflare ou injoignables depuis
  l'egress (NXDOMAIN, TLS auto-signé). Ordre de repli pour un vrai logo :
  (1) favicon déclaré, (2) `og:image` / logo, (3) icônes du web-manifest,
  (4) favicon déclaré sur l'`origin` final après redirection, (5) le logo
  embarqué dans l'extension Mihon amont (`res/mipmap-*/ic_launcher.png`),
  matché par host puis par nom,   (6) accumulateurs de favicons
  (`favicon.yandex.com`, `favicon.yandex.net`, `gstatic.com/faviconV2`) —
  utiles quand le TLS du site est cassé, (7) variante `http://` du site, (8)
  favicons archivés trouvés via l'API **CDX** de la Wayback Machine
  (`/cdx/search/cdx?url=<host>/*&filter=original:.*favicon.*`) — l'endpoint
  `/available` rate la plupart des snapshots ; l'API CDX est rate-limitée
  (`429`), espacer les appels. Rejeter le placeholder générique renvoyé par
  les proxys pour un domaine inconnu (hash appris au vol) et toute réponse
  dont le corps est du HTML même si le `Content-Type` annonce une image.
  Valider la géométrie : une icône doit être à peu près carrée (32–512 px,
  ratio ≤ 1.35) — un snapshot CDX peut renvoyer une bannière/`og:image` à la
  place du favicon. Vérifier la résolution réelle via DoH
  (`cloudflare-dns.com/dns-query`) : beaucoup de domaines sont en NXDOMAIN
  (morts) et ne pourront jamais être récupérés, ne pas s'acharner.
  Un `.svg` restant qui correspond à la signature placeholder
  (`aria-label` + `linearGradient id="g"` + `512x512`) est le rendu natif de
  secours : le garder tel quel pour les sources réellement inaccessibles
  (aucun outil raster/rendu SVG disponible localement).
- IDs : utiliser 2000001170+ pour les nouvelles entrées (pas de collision).
- `itemType` est **canonique par catalogue** : l'app mappe l'entier via
  `ItemType.values` (`0`=manga, `1`=anime, `2`=novel, `3`=music, `4`=game ;
  `lib/models/source.dart`). Une entrée de `index/watch.json` doit donc valoir
  `1`, `index/manga.json` `0`, `index/novel.json` `2`, etc. Ne **jamais** y
  écrire `2` pour dire « manga » : la source s'installe dans l'onglet Novel.
  `tools/validate-extensions.mjs` refuse ces divergences (règle «ITEMTYPE»).
- Un fichier `.js` non référencé par un index est compté comme "unindexed" par
  le CLI Watchtower (`extensions list --include-unindexed`).

## Qualité des icônes (faux logos)

Un logo **réel** est unique au site. Deux sites **sans rapport** qui partagent
le même binaire (même `md5`) = au moins une **fausse icône** (ex. `PornHub`
et `xtapes` sur le même fichier). Les variantes d'une même marque peuvent
partager légitimement (`MTL Novel` + `MTL Novel (FR/ES/…)`, `Linovelib` +
`Linovelib(繁體)`, réseau `fanmtl`, `porngo`/`xxxfiles`).
- Détecter : grouper les `assets/icons/*` raster par `md5`, comparer les
  `baseUrl`. Un groupe multi-hôte inter-marques est suspect.
- Le fallback `icons.duckduckgo.com/ip3/<host>.ico` renvoie souvent un « globe »
  générique **partagé** (16×16, ~477–1150 o) — ne pas l'utiliser comme logo
  (vérifier l'unicité du `md5` avant d'intégrer).
- Idem : les domaines parqués exposent un logo `sedoparking.com` — rejeter.
- Corriger une fausse icône : refetch (HTML déclaré → `og:image` → yandex →
  DDG → Wayback CDX/page archivée), normaliser en **128×128 PNG carré** via
  Pillow, puis si irrécupérable générer un placeholder SVG **unique et brandé**
  (initiale + couleur dérivée du nom, gabarit `aria-label`+`linearGradient id="g"`)
  plutôt que de laisser un logo étranger partagé.
- Toujours re-vérifier après : `md5` unique par marque, formes 32–512 px carré,
  fichiers > 300 o, puis `npm run validate`.

## Push

Remote : `https://github.com/ferelking242/watchtower-extensions.git` (branche
`main`). Ne pas ouvrir de PR sans demande explicite.
Le `GITHUB_TOKEN` d'app (`ghu_`) peut être en lecture seule : un `git push`
renvoie alors `403 Permission ... denied` même si l'API montre `admin`.
Utiliser `GITHUB_PERSONAL_ACCESS_TOKEN` (droits d'écriture confirmés) :

```bash
git remote set-url origin https://${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/ferelking242/watchtower-extensions.git
git push origin main
```

Si le push est refusé en interactif (« Password for … »), c'est que l'URL du
remote embarque le `ghu_` : la remplacer comme ci-dessus. Toujours `git fetch`
puis `git rebase origin/main` avant de pousser, `main` bouge vite.
