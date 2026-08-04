# 📋 Watchtower Extensions — Plan de développement

> Checklist de toutes les extensions à coder pour couvrir les sites listés sur [EverythingMoe](https://everythingmoe.com).
> Coche `[x]` chaque fois qu'une extension est codée et pushée.

---

## 📊 Catégorisation des sites EverythingMoe

### 🎌 Anime Streaming (Sites non-hentai)
Sites déjà couverts par d'autres dépôts (Mangayomi / Swakshan / m2k3a). Pas la priorité ici.

| # | Site | Déjà dans repo | À coder |
|---|------|----------------|---------|
| 1 | Anikoto | ❌ | Optionnel |
| 2 | AnimePahe | ✅ | — |
| 3 | Re:Anime | ❌ | Optionnel |
| 4 | Miruro | ❌ | Optionnel |
| 5 | MKissa / AllAnime | ✅ | — |
| 6 | AniDB | ❌ | Optionnel |
| 7 | AniZone | ✅ | — |
| 8 | AniNeko | ❌ | Optionnel |
| 9 | AnimeStream | ❌ | Optionnel |
| 10 | Gogoanime | ✅ | — |
| 11 | AnimePahe | ✅ | — |
| 12 | 9anime / Aniwatch | ✅ | — |
| 13 | Zoro | ✅ | — |
| 14 | AnimeSuge | ✅ | — |
| 15 | YouTube | ❌ | Non |
| 16 | Anibd | ❌ | Optionnel |
| 17 | aniwaves | ❌ | Optionnel |
| 18 | AniSnatch | ❌ | Optionnel |
| 19 | AnimeX | ❌ | Optionnel |

### 🎵 Music (Sites musique)

| # | Site | Déjà dans repo | À coder |
|---|------|----------------|---------|
| 1 | Spotify | ✅ plugins/spotify.smplug | — |
| 2 | Apple Music | ✅ plugins/applemusic.smplug | — |
| 3 | Deezer | ✅ plugins/deezer.smplug | — |
| 4 | YouTube Music | ✅ plugins/youtubemusic.smplug | — |
| 5 | MusicBrainz | ✅ plugins/musicbrainz.smplug | — |
| 6 | FLAC | ✅ plugins/flac.smplug | — |
| 7 | Khinsider | ❌ | Optionnel |
| 8 | Doujin.moe | ❌ | Optionnel |

---

## 🔞 Hentai Streaming — PRIORITÉ HAUTE

> Dossier cible : `src/watch/nsfw/en/`  
> Index : `index/watch.json` avec `"isNsfw": true`

| # | Site | URL | Extension | Statut |
|---|------|-----|-----------|--------|
| 1 | hentai.tv | https://hentai.tv | hentaitv.js | ✅ Codé |
| 2 | HentaiCity | https://hentaicity.com | hentaicity.js | ✅ Codé |
| 3 | HStream.moe | https://hstream.moe | hstreammoe.js | ✅ Codé |
| 4 | hentaihaven (→ hentai.tv) | Redirige vers hentai.tv | — | ⏭️ Skip (même site) |
| 5 | Hanime.tv | https://hanime.tv | hanimedottv.js | ✅ Codé |
| 6 | haho.moe | https://haho.moe | hahomoe.js | ✅ Codé |
| 7 | Hentaverse | https://hentaverse.com | hentaverse.js | ✅ Codé |
| 8 | Hentai.SH | https://hentai.sh | hentaish.js | ✅ Codé |
| 9 | Zhentube | https://zhentube.com | zhentube.js | ✅ Codé |
| 10 | WatchHentai | https://watch-hentai.net | watchhentai.js | ✅ Codé |
| 11 | Hentai Ocean | https://hentaiocean.com | hentaiocean.js | ✅ Codé |
| 12 | UnderHentai | https://underhentai.net | underhentai.js | [ ] À coder |
| 13 | HentaiStream | https://hentaistream.com | hentaistream.js | [ ] À coder |
| 14 | HentaiPlay | https://hentaiplay.net | hentaiplay.js | [ ] À coder |
| 15 | OnlyHentaiStuff | https://onlyhentaistuff.com | onlyhentaistuff.js | [ ] À coder |
| 16 | Hanime1.me | https://hanime1.me | hanime1me.js | [ ] À coder |
| 17 | HentaiWorld | https://hentaiworld.tv | hentaiworld.js | [ ] À coder |
| 18 | MyHentaiMovie | https://myhentaimovie.com | myhentaimovie.js | [ ] À coder |
| 19 | Aki-H | https://aki-h.com | akih.js | [ ] À coder |
| 20 | Hentaini | https://hentaini.com | hentaini.js | [ ] À coder |
| 21 | Hentai2W | https://hentai2w.com | hentai2w.js | [ ] À coder |
| 22 | OceanVeil | https://oceanveil.com | oceanveil.js | [ ] À coder |
| 23 | oppai.stream | https://oppai.stream | oppaistream.js | [ ] À coder |
| 24 | Hentaigasm | https://hentaigasm.com | hentaigasm.js | [ ] À coder |
| 25 | HentaiMama | https://hentaimama.io | hentaimama.js | [ ] À coder |
| 26 | HMV Mania | https://hmvmania.com | hmvmania.js | [ ] À coder |
| 27 | Hentai0.com | https://hentai0.com | hentai0.js | [ ] À coder |
| 28 | Iwara | https://www.iwara.tv | iwara.js | [ ] À coder |
| 29 | HentaiFox.tv | https://hentaifox.tv | hentaifoxtv.js | [ ] À coder |
| 30 | Hentaibros | https://hentaibros.com | hentaibros.js | [ ] À coder |
| 31 | Hentaiser | https://hentaiser.com | hentaiser.js | [ ] À coder |
| 32 | hentai-for.me | https://hentai-for.me | hentaiforme.js | [ ] À coder |
| 33 | KissHentaiz | https://kisshentaiz.com | kisshentaiz.js | [ ] À coder |
| 34 | HentaiVideoWorld | https://hentaivideoworld.com | hentaivideoworld.js | [ ] À coder |
| 35 | ESHentai | https://eshentai.com | eshentai.js | [ ] À coder |
| 36 | Xanimeporn | https://xanimeporn.com | xanimeporn.js | [ ] À coder |
| 37 | VidHentai | https://vidhentai.net | vidhentai.js | [ ] À coder |
| 38 | HentaiFreak | https://hentaifreak.org | hentaifreak.js | [ ] À coder |
| 39 | HentaiMoon | https://hentaimoon.com | hentaimoon.js | [ ] À coder |
| 40 | MuchoHentai | https://muchohentai.com | muchohentai.js | [ ] À coder |
| 41 | HentaiCloud | https://hentaicloud.com | hentaicloud.js | [ ] À coder |
| 42 | Hentia | https://hentai.name | hentia.js | [ ] À coder |
| 43 | Hentaisea | https://hentaisea.com | hentaisea.js | [ ] À coder |

---

## 📖 Hentai Reading (Manga) — PRIORITÉ HAUTE

> Dossier cible : `src/manga/nsfw/en/`  
> Index : `index/manga.json` avec `"isNsfw": true`

### Extensions Mihon/Tachiyomi existantes qu'on n'a PAS encore en JS/Dart

Les extensions ci-dessous existent dans le dépôt **keiyoushi** (Mihon) en Kotlin/Dart mais **n'ont pas d'équivalent JS** dans watchtower-extensions :

| Extension Mihon | Package ID | Site | Statut Watchtower |
|----------------|------------|------|------------------|
| NHentai | all.nhentaicom | https://nhentai.net | ✅ Codé |
| HentaiFox | (dans nsfw) | https://hentaifox.com | ✅ Codé |
| E-Hentai | all.ehentai | https://e-hentai.org | ✅ Codé |
| IMHentai | (nsfw) | https://imhentai.xxx | [ ] À coder |
| Pururin | all.pururin | https://pururin.to | [ ] À coder |
| Hentai2Read | (nsfw) | https://hentai2read.com | [ ] À coder |
| TSumino | (nsfw) | https://www.tsumino.com | [ ] À coder |
| AllPornComics | all.allporncomicsco | https://allporncomics.co | [ ] À coder |
| MangaForFree | all.mangaforfree | https://mangaforfree.net | [ ] À coder |
| Luscious | (nsfw) | https://www.luscious.net | [ ] À coder |
| Multporn | (nsfw) | https://multporn.net | [ ] À coder |
| ReadHentai | (nsfw) | https://readhentai.net | [ ] À coder |
| HentaiFox | (nsfw) | https://hentaifox.com | ✅ Codé |
| Manhwa18 | all.manhwa18cc | https://manhwa18.cc | [ ] À coder |
| AsmHentai | all.asmhentai | https://asmhentai.com | [ ] À coder |
| HentaiBR | (nsfw) | https://hentaibr.net | [ ] Optionnel |

---

## 📊 Résumé de progression

| Catégorie | Total | Codés | Restants |
|-----------|-------|-------|----------|
| Hentai Streaming | 43 | 11 | 32 |
| Hentai Reading | 16 | 3 | 13 |
| Anime | 19 | 9 | 10 (optionnel) |
| Music | 8 | 6 | 2 (optionnel) |

---

## 🗺️ Ordre d'implémentation

### Phase 1 — Hentai Streaming prioritaires (DONE ✅)
- [x] hentai.tv
- [x] HStream.moe
- [x] Hanime.tv
- [x] HentaiCity
- [x] haho.moe
- [x] Hentaverse
- [x] Hentai.SH
- [x] Zhentube
- [x] WatchHentai
- [x] Hentai Ocean

### Phase 2 — Hentai Reading prioritaires (DONE ✅)
- [x] NHentai
- [x] HentaiFox
- [x] E-Hentai

### Phase 3 — Hentai Streaming suite
- [ ] HentaiStream
- [ ] HentaiPlay
- [ ] Hanime1.me
- [ ] HentaiWorld
- [ ] Hentaigasm
- [ ] HMV Mania
- [ ] Iwara

### Phase 4 — Hentai Reading suite
- [ ] IMHentai
- [ ] Pururin
- [ ] Hentai2Read
- [ ] TSumino
- [ ] AsmHentai
- [ ] Manhwa18
- [ ] Luscious
