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

## Covers : mesurer sans se faire piéger par le rate-limit

Plusieurs extensions (HariManga…) répartissent une même couverture sur
plusieurs miroirs CDN et le site choisit lui-même lequel il émet.

Piège mesuré : en interrogeant les hôtes en rafale, `cdn.zinmanga1.com`
ressortait à 9/58 covers (28× 404, 21× 429) face à 57/58 pour
`img-r1.2xstorage.com` — de quoi conclure que le second est le seul sain. C'est
faux : en répétant les mêmes requêtes espacées (1,5 s, 5 passes), les **deux**
hôtes servent exactement les mêmes chemins, avec 5/5 sur les covers valides. Les
404/429 venaient du rythme des requêtes, pas de l'hôte. Un hôte ne se juge
qu'avec des requêtes espacées et répétées, et il faut comparer les hôtes sur les
**mêmes chemins** plutôt que sur des totaux pris à des moments différents.

Ce qui est réellement établi :

| constat | statut |
|---|---|
| `img-r3.2xstorage.com` | DNS inexistant (définitif) |
| `img-r2.2xstorage.com` | 503 « Server busy » fréquent |
| `cdn4.zinmanga1.com` | 503 |
| `img-r1` vs `cdn.zinmanga1` | même catalogue, mêmes 404 sur les mêmes 3 chemins |
| `kimetsu-no-yaiba`, `tomo-chan-wa-onnanoko`, `a-peace-loving-vampire…` | absents sur **les deux** hôtes — 404 définitif, non réparable par le choix d'hôte |

Corollaire : un harness qui ne télécharge pas les images ne prouve rien.
`tools/dump_covers.mjs` (Node + cheerio) validait 20/20 covers alors que l'app
affichait des placeholders, parce qu'il se contentait de vérifier que `imageUrl`
n'était pas vide. Le seul verdict fiable est une requête HTTP réelle sur chaque
URL émise, à cadence espacée.

## Libellés de qualité

- Une entrée `quality` décrit une **résolution**, jamais le conteneur. Un flux
  HLS adaptatif s'appelle `"Auto"` (le réglage app « qualité par défaut » gère
  déjà la sélection) ; `"HLS"`, `"Auto (HLS)"`, `"HLS Auto"` sont interdits.
- Ne jamais annoncer une résolution que l'URL ne contient pas. XNXX renvoie
  `mp4_high` → `video_360p.mp4` pour une source 1080p : lire la résolution dans
  le nom de fichier (`_mp4Quality`) au lieu de supposer que `high` = 720p.
- Les vraies variantes d'un master HLS ne sont pas listées par l'extension en
  temps normal : l'app les découvre en lisant le master
  (`lib/services/hls_variant_resolver.dart`). **Exception contractuelle
  Watchtower ≥ x : MissAV (v1.3.0)** fetch le master lui-même (natif puis
  reroute navigateur via le client runtime) et retourne UNE entrée par vraie
  variante, étiquetée par sa vraie résolution, triée descendante. Aucune
  entrée `"Auto"` ne doit jamais revenir son `getVideoList` — c'est une
  demande produit explicite ; ne pas la « réparer » en la ramenant à une
  entrée `Auto` qui délègue au resolver app.
- Bumper `"version"` dans le manifeste de toute extension modifiée, puis
  `node tools/sync_versions.mjs`. Sans bump, l'app ne propose jamais la mise à
  jour et le correctif n'atteint aucune source installée.
- `getVideoList` est le chemin critique du démarrage vidéo : tout ce qui n'est
  pas nécessaire à l'URL de lecture doit être **hors** de son `await`. XNXX
  attendait `_saveHistoryItem` (écriture SharedPreferences) avant de retourner
  les sources ; le passer en fire-and-forget a supprimé cette attente. Ne pas
  réintroduire d'`await` décoratif (historique, favoris, télémétrie) dans ce
  retour.
- `tools/mpv_startup_bench.mjs <master.m3u8> [referer] [runs]` mesure le temps
  jusqu'à la première image en pilotant **mpv**, le runtime réel de l'app. Ne
  pas utiliser la CLI `ffmpeg` pour ça : elle ne sait pas exprimer
  `demuxer-lavf-probe-info` (il n'y a pas d'option `-probe_info`, elle échoue
  avec `Unrecognized option`), donc elle ne mesure pas ce qu'elle prétend.
  C'est de là que venait le chiffre erroné de « 10,7 s pour le probe ».

## Index

- Entrée d'index : `sourceCodeUrl` pointe vers
  `https://cdn.jsdelivr.net/gh/ferelking242/watchtower-extensions@<sha>/src/...`
  — un **commit figé**, jamais `@main`.
- **Pourquoi jamais `@main` (piège coûteux, déjà rencontré) :** l'app lit
  l'index depuis `raw.githubusercontent.com` (frais, `max-age=300`) donc elle
  voit bien « mise à jour disponible ». Mais elle télécharge ensuite le code
  depuis jsDelivr, qui sert `@main` avec `s-maxage=43200` (12 h) /
  `max-age=604800` (7 j) **et ignore la query string** : le `?_=<timestamp>`
  ajouté par l'app pour forcer un cache-miss (`fetch_sources_list.dart`)
  renvoie l'objet en cache. L'app retélécharge donc l'ancien code pendant des
  heures, et l'utilisateur ne voit jamais la mise à jour. Une URL `@<sha>` est
  immutable côté jsDelivr : nouveau commit = nouvelle URL = bon contenu
  immédiatement, sans purge.
- Le figage est automatique : `.github/workflows/pin-sources.yml` lance
  `tools/pin_sources.mjs` à chaque push sur `main` et committe les index
  réécrits (message `chore(cdn): pin sourceCodeUrl to commit`, garde
  anti-boucle incluse). En local : `npm run pin` / `npm run pin:check`.
- Purger jsDelivr (`purge-cdn.yml`) reste utile pour **l'index** lui-même, qui
  est lu par l'app depuis `raw.githubusercontent.com` mais peut aussi être
  consommé via jsDelivr. Ne jamais compter sur la purge pour les fichiers
  source : c'est le figage qui les rend toujours frais.
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

## Tags du Marketplace

Le champ `tags` de chaque entrée d'index alimente les rayons du Marketplace.
Il est **généré**, jamais écrit à la main :

```bash
node tools/generate_tags.mjs          # régénère les tags + addedAt
node tools/generate_tags.mjs --check  # vérifie sans écrire (utilisé en CI)
```

- Vocabulaire : `tools/catalog_taxonomy.mjs`, miroir de
  `lib/models/catalog_taxonomy.dart` dans Watchtower. Les deux fichiers doivent
  rester en phase : ajouter un tag d'un côté sans l'autre casse `npm run
  validate` (le Dart refuse un tag inconnu, le JS aussi).
- Les tags viennent de faits déjà présents dans le dépôt : catalogue
  d'appartenance (`itemType`), options réellement déclarées dans
  `getFilterList()`, champs `lang`/`langs`, et `forYou` pour `featured`. Le nom
  de domaine, le titre ou une marque ne classent **jamais** une extension — un
  nom français n'implique pas le français.
- `popular` et `trending` ne sont **jamais** écrits : le catalogue ne contient
  aucune statistique d'usage réelle. Les rayons « Populaire » de l'application
  utilisent un ordre déterministe documenté côté Watchtower.
- `addedAt` est dérivé de l'historique git (`index/<type>.json`) **une seule
  fois**, à la première apparition de l'entrée : le champ est ensuite immuable et
  n'est jamais réécrit. C'est indispensable car la CI clone en profondeur 2
  (`pin-sources.yml`) et verrait la révision courante comme date de création de
  toutes les entrées. Une entrée déjà datée ne déclenche donc aucune lecture
  d'historique, et un clone superficiel ne renvoie simplement aucune date pour
  une entrée nouvelle : le champ est alors omis, jamais inventé.
- `npm run test:taxonomy` teste le vocabulaire et vérifie le catalogue réel ;
  `npm run tags:check` échoue si un index n'est pas à jour. Les deux tournent
  dans `.github/workflows/validate.yml`, et `pin-sources.yml` régénère les tags
  avant de figer les URL.
- Les tags sont **rétrocompatibles** : le champ est optionnel, une entrée qui
  n'en a pas reste valide, et l'application retombe sur `itemType` + langue.

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

## XNXX — renditions de vignettes (piège)

XNXX publie trois renditions du **même** arrêt sur image, et deux d'entre elles
ne sont pas ce que leur nom suggère :

| Fichier | Taille | Contenu |
| --- | --- | --- |
| `xn_10_t.jpg` | 600x337 | **une seule** image — vignette de carte |
| `mozaique_listing.jpg` | 1056x594 | **mosaïque 3x3** de neuf images |
| `mozaique_full.jpg` | 2080x1170 | **une seule** image — hero de fiche |

`mozaique_listing` a déjà été utilisé comme couverture « haute résolution » :
chaque carte affichait alors une grille de neuf images du clip. Les cartes
doivent garder la vignette mono-image ; seul le hero de la fiche peut prendre
`mozaique_full` (netteté au zoom). Vérifier un doute avec un détecteur de
coutures (écart |x+1 − x−1| au tiers de la largeur : ~10x la médiane sur une
mosaïque, ~1x sur une image unique).

Helpers : `_coverImage()` (cartes), `_fullImage()` (fiche), `_swapFrame()`.
`data-video`/`data-mzl` annoncent souvent `mozaique_listing` : c'est
`_coverImage()` qui rétablit la mono-image.

## XNXX — sections d'accueil

`/todays-selection` est la vraie sélection du jour (paginée comme `/hits`) ;
`/your-suggestions/straight` n'est rempli que par l'activité locale du
navigateur et renvoie 0 carte en pratique (repli sur la recherche `straight`).
Les tags n'ont aucune illustration côté site : `_enrichTagCovers()` emprunte la
couverture de la première vidéo, bornée aux tuiles affichées.

## XNXX — profils (pornstar / porn-maker / channel)

La page profil livre une grille **vide** : le HTML contient 100 `.thumb-block`
fantômes et les vraies cartes arrivent d'un endpoint JSON
`/{profil}/{videos|video}/best/{page0based}` qui répond
`{ videos, nb_videos, nb_per_page, current_page }`. Parser le HTML renvoie donc
toujours 0 vidéo — d'où `_parseVideoListJson()`.

`_profileListPath()` retire d'abord un index de page déjà présent
(`/videos/best/1` → `/videos/best`), sinon on obtient `/videos/best/1/2`, 404.
Le titre vit dans `h2#profile-info-title .profile-username`, le portrait dans
le littéral `"profile_picture"` (jamais l'`og:image`, qui est une vignette).

Côté app, l'onglet « Films » d'une fiche personne pagine avec le listId
`profile_<hex du chemin>` (hex plutôt que base64 : ni `Buffer` ni `atob` ne sont
garantis par le pont QuickJS).

## XNXX — recherche et filtres

La recherche raffine par **segments de chemin**, pas par query string :
`/search/<tri>/<période>/<durée>/<qualité>/<masqué>/<mot-clé>`. Les anciens
`?top`/`?order=` étaient ignorés côté serveur (résultats identiques), ce qui
faisait passer le tri pour cassé. Certaines combinaisons sont rejetées en 500
(`/search/year/fullhd/<q>`) : `_searchListing()` dégrade en repli (sans tri, puis
mot-clé seul) pour qu'une section n'échoue jamais à s'afficher.

## XNXX — historique

`/history` n'est rempli que par la session connectée du navigateur (0 carte sans
compte). L'historique réel est **local** : `_saveHistoryItem()` écrit à chaque
lecture, `getCustomList("history")` fusionne le local et le distant. Le stockage
passe par `getLocalStorage`/`setLocalStorage` (store de session de l'app), pas
`SharedPreferences` (écriture Isar depuis le worker = silencieusement perdue).
