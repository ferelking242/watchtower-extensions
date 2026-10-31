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
- **Piège du pin en retard d'un commit (déjà rencontré sur PornHub 1.4.4) :**
  quand le commit qui bumpe `"version"` touche aussi `src/`, le job de figage
  lancé sur ce commit re-pointe `sourceCodeUrl` sur le **commit précédent** —
  celui qui n'a pas encore le nouveau code. L'index annonce donc la nouvelle
  version en servant l'ancienne. C'est invisible côté CI (`pin:check` passe :
  l'URL est bien un SHA), mais l'app compare `version` (index) à `version`
  (installé) : tant qu'elles sont égales, **aucune mise à jour n'est proposée**,
  et le correctif n'atteint jamais l'utilisateur. Vérifier après un push que
  `sourceCodeUrl` du commit courant pointe bien sur ce commit, sinon rebumper la
  version (l'index et le manifeste) pour forcer une nouvelle comparaison.
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

### Logos des plugins (`index/plugins.json` → `assets/plugins/`)

Les plugins de musique suivaient la même règle de fausse icône, mais rien ne la
vérifiait : `com.spotube.deezer` et `com.spotube.spotify` publiaient le **même
binaire** (`md5 476b3dbe54`), donc Deezer affichait le logo Spotify dans le
Marketplace. `com.spotube.youtube-music` pointait en plus vers un
`assets/logo.png` inexistant (`404`), et `flac` vers un PNG **entièrement
transparent** (150 o, alpha 0 partout) qui rendait un carré vide.

- Chaque plugin publie son logo dans `assets/plugins/<slug>.png`, référencé via
  `https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/assets/plugins/<slug>.png`.
  Ne pas pointer vers le dépôt `spotube-plugin-*` : le logo doit rester
  disponible même si le dépôt amont disparaît.
- Reprendre le **vrai** logo quand le bundle `.smplug` en contient un
  (`plugins/<slug>.smplug` → `logo.png`), sinon générer un logo brandé unique
  (tuile colorée + glyphe) au format **256×256 PNG** avec Pillow.
- `tools/validate-extensions.mjs` refuse deux plugins qui partagent le même
  `md5` (« PLUGIN ICON ») et tout logo absent ; `tools/test_catalog_taxonomy.mjs`
  couvre la même règle en test unitaire. Lancer `npm run validate` et
  `npm run test:taxonomy` avant de committer une modification d'icône.

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

## XNXX — pièges de parsing (liens et vignettes)

Deux pièges ont produit un écran « Aucun résultat » / des cartes sans image
alors que le HTML était complet :

1. **Ids vidéo alphanumériques.** Les liens sont `/video-17pt1bb8/...`, jamais
   `/video-123`. Un motif `\/video-\d+` (chiffres seuls) ne matche **rien** :
   `_parseVideoCardsRegex()` est le filet de secours qui doit sauver un parse
   DOM vide, donc un `\d+` le rendait inopérant. Utiliser `[A-Za-z0-9]+`.

2. **Corps de `<script>` = texte brut.** Un parseur HTML5 conforme (le
   `package:html` de l'app) ne crée **aucun** nœud pour le markup à l'intérieur
   d'un `<script>`/`<style>`. Or `/pornstars` émet chaque vignette via
   `<script>document.write(xv.thumbs.replaceThumbUrl('<img src="...">'))</script>` :
   `getElementsByTagName("img")` renvoie 0 et les 80 cartes s'affichent sans
   cover. Les lire en chaîne avec `_scriptBlocks()` + `_scriptThumbForSlug()`
   (la vignette porte `id="pic_<slug>"`, qui la relie à sa carte).

Conséquence sur les tests : le harnais `tools/html_document.mjs` doit modéliser
la règle raw-text (il la respecte désormais), sinon il parse les balises
internes au `<script>` et les tests passent au vert pendant que l'app échoue.
De même, `_parseVideoList()` lance le fallback dès que `videoLinksFound === 0`
(pas seulement quand zéro carte est trouvée) : l'app voyait 33 cartes et 0 lien.

## XNXX — sections d'accueil

`/todays-selection` est la vraie sélection du jour (paginée comme `/hits`) ;
`/your-suggestions/straight` n'est rempli que par l'activité locale du
navigateur et renvoie 0 carte en pratique (repli sur la recherche `straight`).
Les tags n'ont aucune illustration côté site : `_enrichTagCovers()` emprunte la
couverture de la première vidéo, bornée aux tuiles affichées.

## XNXX — une carte se trouve par son id, pas par son ancre

Les journaux de l'app affichaient `thumbBlocks=36 videoLinks=0` : le DOM voyait
36 cartes mais aucun lien dedans, et le repli regex rendait 0 lui aussi. Deux
pièges, tous deux dans `_parseVideoCardsRegex` :

1. Un plafond `([\s\S]{0,600}?)<\/a>` supposait qu'une ancre se referme en
   moins de 600 caractères. La carte réelle enveloppe un `<img>` à ~15
   attributs (~900 caractères) : la page servie à l'app, plus volumineuse que
   celle du harnais, dépassait le plafond et ne produisait **aucune** carte.
2. La carte n'est pas définie par son ancre mais par sa coquille :
   `<div class="thumb-block" data-eid="1gsa3edd">` (recherche),
   `<div id="video-thumb-hbwy3c6" data-video='{"id":"hbwy3c6"…'>` (/hits) ou
   `<div id="video_1gsa3edd">`. Quand l'ancre manque, la carte existe quand même.

Le parseur découpe donc le document sur les marqueurs d'id — sans plafond de
longueur — puis reconstruit le lien depuis l'id quand l'ancre est absente.
XNXX **redirige en 301** `/video-<id>` (n'importe quel slug, ex. `/video-<id>/x`)
vers l'URL canonique, donc un lien reconstruit reste lisible. Les slashes
échappés (`https:\/\/…`) sont normalisés. Corollaire : ne jamais conditionner la
découverte d'une carte à la présence ou à la taille de son ancre.

## Le pont DOM QuickJS est synchrone — borner les parcours

Sur l'appareil, chaque lecture de nœud/attribut du DOM (`getElementsByTagName`,
`.attr`, `.text`, `getElementById`…) traverse le pont Dart en **synchrone**. Le
harnais Node, lui, est en processus : il ne montre pas ce coût (une page de tags
de 184 Ko / 2077 `<li>` s'y parcourt en 23 ms, contre des centaines d'appels
bloquants sur l'appareil). Un parcours DOM sur une grosse page dépasse donc le
budget d'exécution de 15 s, et comme **toutes** les sections de l'accueil
partagent un runtime unique, le dépassement emporte aussi les sections qui
chargeaient en parallèle (c'est ce qui vidait « Suggestions » quand « Tags »
bouclait).

Règle : sur une page volumineuse, extraire les lignes en **regex** sur le HTML
(`_parseVideoCardsRegex`, `_parseTagsRegex`) et ne garder le parcours DOM qu'en
repli. Idem pour une passe multi-pages : `_enrichTagCovers()` ne couvre que les
tuiles affichées et lit chaque couverture en regex, sans reconstruire un
`Document` par tag.

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

## 1PornTV — sélecteurs, lecteur, sections et couvertures

Le HTML du site porte plusieurs pièges mesurés. Corrigés au fil des versions
(1.2.0 : lecteur/tags/pornstars/pagination ; 1.3.0 : couvertures studios,
réseaux, UA de session) :

- **`<source>` en simple quote.** Le lecteur émet
  `<source src='…/x_720m.mp4/' type='video/mp4' label="720p">` : `src` est en
  quotes simples, `label` en quotes doubles. Un regex `src="…"` ne matche rien,
  `getVideoList` retournait `[]` et la vidéo ne se lançait jamais. Le regex doit
  accepter les deux (`src=["']…["']`).
- **Attribut `class` dupliqué.** Les tags s'écrivent
  `<a class="btn_tag" class="link" href="/categories/…/">`. Un parseur ne garde
  que le **dernier** `class`, donc `.btn_tag` ne matche jamais. Cibler par
  `href` (`.hidden_tags a[href*='/categories/']`), jamais par la classe.
- **Ligne « Pornstars » hors `.hidden_tags`.** Elle est sœur de `.hidden_tags`
  dans `.block-details` : un sélecteur scopé sur `.hidden_tags` renvoie zéro
  pornstar. Cibler `.block-details a[href*='/models/']`.
- **Studios = `.list-sponsors`.** L'A-Z `/sites/title-az/` contient aussi les
  liens de langue (`/pt/sites/title-az/`), les onglets de tri
  (`/sites/top-rated/`) et la sidebar « Top Sites ». Prendre
  `.list-sponsors .headline` + `.list-sponsors .box` (12 studios/page), pas tous
  les `a[href*='/sites/']`.
- **Couverture studio = 1re vignette de sa vidéo.** Le site ne publie **aucun
  logo** de studio : la seule image disponible pour la carte est la vignette de
  la vidéo la plus récente du studio, premier `.item` du `.box` qui suit le
  `.headline`. Titres et boîtes sont parcourus **en ordre de document** (pas
  zippés par index) : une boîte manquante décalerait sinon toutes les
  couvertures suivantes d'un studio.
- **`/networks/` est un 404.** Il n'existe pas de page index des réseaux ; la
  seule source est le menu déroulant `.sites__list a.sites__item` présent dans
  l'en-tête de chaque page (15 réseaux), lu depuis `/latest-updates/`.
  `/networks/<slug>/` (page d'un réseau) existe et liste bien ses vidéos.
- **`hasNextPage` par pagination réelle.** `.pagination a` contenant `/<n>/` ;
  un seuil sur le nombre d'items annonçait `hasNext` sur une dernière page de
  24 et bouclait sur la même page. `/sites/title-az/` pagine en `/<n>/` (86
  pages) ; `/categories/` (360) et `/tags/` (1984) tiennent sur une page.
- **Pas d'`User-Agent` figé dans `getHeaders`.** Le site est derrière un
  *managed challenge* Cloudflare dont `cf_clearance` est lié au User-Agent
  exact du moteur qui l'a résolu. Forcer une chaîne desktop Chrome écrasait l'UA
  de session à chaque requête (la couche HTTP ne remplit l'UA que si la requête
  n'en porte pas), donc le clearance ne correspondait plus et couvertures/vidéos
  restaient en 403. Laisser l'app envoyer l'UA de session.
- **Couvertures `img.1porn.tv` : le fix est côté app, pas côté extension.**
  `img.1porn.tv` renvoie `403` + `cf-mitigated: challenge` à tout client natif,
  **avec ou sans Referer/Origin/Cookie** ; la racine `https://img.1porn.tv/`
  répond un *managed challenge* qui se résout tout seul en < 1 s puis rend
  l'image en `200`. Le fix est dans
  `lib/modules/widgets/custom_extended_image_provider.dart` : quand la
  couverture est sur un hôte différent de celui de la page déclarée (ici
  `img.1porn.tv` vs `www.1porn.tv`), le fetch in-page doit partir de **l'origine
  de l'image** et non de la page déclarée — sinon la requête est cross-origin,
  le CDN ne renvoie pas d'`Access-Control-Allow-Origin` et le navigateur rejette
  la réponse (`TypeError: Failed to fetch`) alors que les octets ont été servis.
  Les posters hébergés sur `www.1porn.tv` (`/contents/models/...`) passent par
  le même chemin. `hasCloudflare` peut rester `false` : ce flag ne gate pas ce
  repli, qui se déclenche sur la **réponse** (403 + marqueur CF), pas sur le
  manifeste.
## XVideos — répertoires et pagination

Les pages d'index (`/pornstars-index`, `/channels-index`) rendent des cartes
`<div id="profile_<slug">` avec `.profile-name` et `.profile-counts`. Les liens
`/models/<slug>` sont la même fiche que `/pornstars/<slug>` : on normalise vers
`/pornstars/` pour que l'écran personne de l'app les reconnaisse.

Les grilles vidéo des fiches sont **vides** dans le HTML ; les cartes viennent de
`/<kind>/<slug>/videos/best/<page0>` en JSON (`videos` tantôt tableau, tantôt
objet creux — d'où le double parsing).

La pagination est **zéro-basée** : page logique 1 = route nue, page 2 = `/1`.
L'onglet « Nouveautés » *est* la racine `/` ; `/new/1` est la page 2 et `/new/`
répond 404 — l'ancien mapping sautait donc la page la plus récente. Le classement
`/best/<mois>` pagine avec des liens numérotés `data-page` (pas de bouton
« next »), ce que `_hasNextPage()` doit couvrir.

Côté lecture, l'endpoint `/html5player/getvideo/<eid>/<cdn>` renvoie souvent
`mp4_high` et `mp4_low` **identiques** (`mp4_sd.mp4`) : on déduplique par URL et
on nomme la qualité d'après le fichier plutôt que de proposer deux fois la même
source.
