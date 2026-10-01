# Rapport : extensions manga — Watchtower vs Mihon

**Date :** 1er octobre 2026  
**Watchtower :** `index/manga.json` au commit `HEAD` — **157 extensions** (663 fichiers JS au total dans `src/`)  
**Mihon :** dépôt d'extensions **Keiyoushi** (`keiyoushi/extensions`, fichier `index.pb` décodé) — **1 380 extensions / 2 357 sources**  
**Méthode :** appariement nom de site + domaine racine entre chaque source Keiyoushi et nos fichiers `src/**` — 416 sources couvertes, **1 941 manquantes**.

---

## 1. Ce que nous avons (Watchtower)

**Total : 157 extensions manga** (dont NSFW marquées).

| Langue | Extensions |
|---|---:|
| Français (`fr`) | 60 |
| Anglais (`en`) | 51 |
| Arabe (`ar`) | 34 |
| Chinois (`zh`) | 5 |
| Toutes langues (`all`) | 2 |
| Espagnol (`es`) | 2 |
| Italien (`it`) | 1 |
| Japonais (`ja`) | 1 |
| Russe (`ru`) | 1 |

### Français (60)

- **Anime-Sama** — https://anime-sama.to
- **AralosBD** — https://aralosbd.fr
- **Astral Manga** — https://astral-manga.fr
- **Banana Scan** — https://harmony-scan.fr
- **BentoBento** — https://bentobento.fr
- **Big Solo** — https://bigsolo.org
- **BlueSolo** — https://bluesolo.org
- **Chaos Trad** — https://chaostrad.fr
- **CrunchyScan** — https://crunchyscan.fr
- **Dassou Scan** — https://dassouscan.com
- **Epsilon Scan** — https://epsilonscan.to *(NSFW)*
- **FMTeam** — https://fmteam.fr
- **Furyo Squad** — https://www.furyosociety.com
- **Hana Book** — https://www.hana-book.fr
- **Hentai Origines** — https://hentai-origines.com
- **Hentai Scan Reader** — https://hentai.scanreader.net
- **Hentai Scantrad** — https://hentai.scantrad-vf.cc
- **Hentai Zone** — https://hentaizone.xyz
- **Histoire d'Hentai** — https://hhentai.fr
- **Japscan** — https://www.japscan.lol
- **Kiwiya Scans** — https://kiwiyascans.com
- **Lanor Trad** — https://lanortrad.com
- **Lel Manga** — https://www.lelmanga.com
- **LelScan** — https://lelscans.net
- **LelScanVF** — https://www.lelscanfr.com
- **Les Poroïniens** — https://lesporoiniens.org
- **Leviathan Scans** — https://levithanscans.com
- **Manga Corporation** — https://manga-corporation.com
- **Manga Kawaii** — https://www.mangakawaii.io
- **Manga Moins** — https://mangamoins.com
- **Manga Nova** — https://www.manga-nova.com
- **Manga Scantrad** — https://manga-scantrad.io
- **MangaHub FR** — https://mangahub.fr
- **Mangas Origines** — https://mangas-origines.fr
- **Mangas Scans** — https://mangas-scans.com
- **MLP France Comics** — https://mlp-france.com
- **Ono** — https://www.ono.live
- **Ortega Scans** — https://ortegascans.fr
- **Pantheon Scan** — https://pantheon-scan.com
- **Perf Scan** — https://perf-scan.xyz
- **Phenix Scans** — https://phenix-scans.co
- **Pornhwa FR** — https://pornhwa.fr
- **Poseidon Scans** — https://poseidon-scans.net
- **Raijin Scans** — https://raijin-scans.fr
- **Rimu Scans** — https://rimuscan.fr
- **Scan Hentai Menu** — https://x-manga.org
- **Scan Reader** — https://scanreader.net
- **Scan-Manga** — https://m.scan-manga.com
- **Scan-VF** — https://www.scan-vf.net
- **Scans FR** — https://scansfr.com
- **Scantrad One Piece** — https://scan-op.com
- **Scantrad Union** — https://scantrad-union.com
- **Siren Scans FR** — https://sirenscans.fr
- **Soft Epsilon Scan** — https://epsilonsoft.to *(NSFW)*
- **Sushi Scan** — https://sushiscan.net
- **Sushi Scan FR** — https://sushiscan.fr
- **Team ScanR** — https://teamscanr.fr
- **ToonFR** — https://toonfr.com
- **Twatt** — https://twatt.fr
- **Yaoi Scan** — https://yaoiscan.fr

### Anglais (51)

- **AllManga** — https://allmanga.to
- **AsmHentai** — https://asmhentai.com *(NSFW)*
- **Asura Scans** — https://asurascans.com
- **Atsumaru** — https://atsumaru.com
- **ComicsAll** — https://comics-all.com
- **Comix** — https://comix.to
- **Coolmic** — https://coolmic.me
- **Cubari** — https://cubari.moe
- **Diva Scans** — https://divascans.com
- **Dynasty Scans** — https://dynasty-scans.com
- **E-Hentai** — https://e-hentai.org *(NSFW)*
- **Flame Comics** — https://flamecomics.com
- **GlobalComix** — https://globalcomix.com
- **Goda** — https://goda-comic.com
- **Harimanga** — https://www.harimanga.co.uk
- **Hentai2Read** — https://hentai2read.com *(NSFW)*
- **HentaiFox** — https://hentaifox.com *(NSFW)*
- **Hiperdex** — https://hiperdex.com
- **Hive Scans** — https://hivetoons.org
- **IMHentai** — https://imhentai.xxx *(NSFW)*
- **King of Shojo** — https://kingofshojo.com
- **LikeManga** — https://likemanga.org
- **Lily Manga** — https://lilymanga.com
- **Lunar Manga** — https://lunarmanga.com
- **Luscious** — https://www.luscious.net *(NSFW)*
- **Manga Ball** — https://mangaball.com
- **MANGA Plus by SHUEISHA** — https://mangaplus.shueisha.co.jp
- **MANGA Plus Creators** — https://mangaplus.shueisha.co.jp
- **MangaDNA** — https://mangadna.com
- **MangaFire** — https://mangafire.to
- **Mangafire** — https://mangafire.to
- **MangaForFree** — https://mangaforfree.net
- **MangaForFree.net** — https://mangaforfree.net
- **MangaFox** — https://mangafox.me
- **MangaFreak** — https://mangafreak.net
- **MangaKatana** — https://mangakatana.com
- **Mangapark** — https://mangapark.io
- **Mangapill** — https://mangapill.com
- **MangaTaro** — https://mangataro.com
- **MangaToon** — https://mangatoon.mobi
- **Manhwa18.cc** — https://manhwa18.cc *(NSFW)*
- **ManhwaZ** — https://manhwaz.com
- **Multporn** — https://multporn.net *(NSFW)*
- **NHentai** — https://nhentai.net *(NSFW)*
- **Pururin** — https://pururin.to *(NSFW)*
- **ReadComicOnline** — https://readcomiconline.li
- **ReadHentai** — https://readhentai.net *(NSFW)*
- **Toomics** — https://toomics.com
- **Tsumino** — https://www.tsumino.com *(NSFW)*
- **Webtoons** — https://www.webtoons.com
- **Weeb Central** — https://weebcentral.com

### Arabe (34)

- **3asq** — https://3asq.org
- **Anyone Manga** — https://anyonemanga.com
- **Arab Toons** — https://arabtoons.net
- **ArabManhwa** — https://arabmanhwa.com
- **ArbxComix** — https://arbxcomix.com
- **Area Manga** — https://areamanga.com
- **AriaToon** — https://ariatoon.com
- **Brown Manga** — https://brownmanga.com
- **Despair Manga** — https://despairmanga.com
- **Dilar** — https://dilar.me
- **Empire Webtoon** — https://empire-webtoon.com
- **Hijala** — https://hijala.com
- **Kawii Manga** — https://kawiimanga.com
- **Manga Starz** — https://mangastarz.com
- **MangaCloud** — https://mangacloud.me
- **MangaDar** — https://mangadar.org
- **MangaDex** — https://mangadex.org
- **MangaDex (unlocked)** — https://mangadex.org
- **MangaHub** — https://mangahub.ru
- **Mangalek** — https://mangalek.com
- **Mangalink** — https://mangalink.org
- **MangaLionz** — https://mangalionz.com
- **MangaSpark** — https://mangaspark.com
- **MangaSwat** — https://mangaswat.com
- **MangaTek** — https://mangatek.com
- **MangaTuk** — https://mangatuk.com
- **Manhatic** — https://manhatic.com
- **NeverScans** — https://neverscans.com
- **Oduto - Boruto** — https://nb19u.blogspot.com
- **Onma** — https://onma.org
- **Rocks Manga** — https://rocksmanga.com
- **StellarSaber** — https://stellarsaber.com
- **TeamX** — https://olympustaff.com
- **Yokai** — https://yokai.lol

### Chinois (5)

- **动漫之家** — https://www.dmzj.com
- **古风漫画** — https://www.gufengmh.com
- **拷贝漫画** — https://www.mangacopy.com
- **新新漫画** — http://www.77mh.xyz
- **漫画柜** — https://www.manhuagui.com

### Toutes langues (2)

- **Batoto (v2)** — https://bato.to
- **Comick** — https://comick.dev

### Espagnol (2)

- **MangaKakalot** — https://mangakakalot.com
- **MangaSee** — https://mangaseeonline.us

### Italien (1)

- **MangaWorld** — https://www.mangaworld.ac

### Japonais (1)

- **WeLoMa** — https://weloma.art

### Russe (1)

- **Mangalib** — https://mangalib.org/ru *(NSFW)*

---

## 2. Ce que Mihon a (Keiyoushi)

**Total : 1380 extensions (2357 sources).**

| Langue | Sources |
|---|---:|
| Anglais (`en`) | 471 |
| Japonais (`ja`) | 166 |
| Espagnol (`es`) | 158 |
| pt-BR (`pt-BR`) | 139 |
| Indonésien (`id`) | 106 |
| Français (`fr`) | 97 |
| Vietnamien (`vi`) | 96 |
| Turc (`tr`) | 93 |
| Toutes langues (`all`) | 87 |
| Chinois (`zh`) | 77 |
| Arabe (`ar`) | 75 |
| Russe (`ru`) | 57 |
| Thaïlandais (`th`) | 48 |
| Coréen (`ko`) | 41 |
| Italien (`it`) | 40 |
| Allemand (`de`) | 32 |
| Ukrainien (`uk`) | 19 |
| Polonais (`pl`) | 18 |
| Portugais (`pt`) | 17 |
| Tchèque (`cs`) | 14 |
| Finnois (`fi`) | 14 |
| Bulgare (`bg`) | 13 |
| Hongrois (`hu`) | 12 |
| Néerlandais (`nl`) | 12 |
| Grec (`el`) | 12 |
| Hindi (`hi`) | 11 |
| es-419 (`es-419`) | 11 |
| zh-Hant (`zh-Hant`) | 11 |
| Catalan (`ca`) | 10 |
| Danois (`da`) | 10 |
| zh-Hans (`zh-Hans`) | 10 |
| Norvégien (`no`) | 9 |
| Roumain (`ro`) | 9 |
| Hébreu (`he`) | 9 |
| Suédois (`sv`) | 9 |
| sk (`sk`) | 9 |
| jv (`jv`) | 8 |
| other (`other`) | 8 |
| Latin (`la`) | 8 |
| Malais (`ms`) | 8 |
| Persan (`fa`) | 7 |
| Filipino (`tl`) | 7 |
| sr (`sr`) | 7 |
| ceb (`ceb`) | 6 |
| et (`et`) | 6 |
| eo (`eo`) | 6 |
| ga (`ga`) | 6 |
| Lituanien (`lt`) | 6 |
| hr (`hr`) | 6 |
| fil (`fil`) | 6 |
| Bengali (`bn`) | 6 |
| sl (`sl`) | 6 |
| Tamil (`ta`) | 6 |
| is (`is`) | 6 |
| Mongol (`mn`) | 6 |
| Népalais (`ne`) | 6 |
| eu (`eu`) | 5 |
| sq (`sq`) | 5 |
| ur (`ur`) | 5 |
| Birman (`my`) | 5 |
| lv (`lv`) | 4 |
| kn (`kn`) | 4 |
| ml (`ml`) | 4 |
| af (`af`) | 4 |
| be (`be`) | 4 |
| ka (`ka`) | 4 |
| te (`te`) | 4 |
| mo (`mo`) | 3 |
| az (`az`) | 3 |
| cv (`cv`) | 3 |
| Kazakh (`kk`) | 3 |
| uz (`uz`) | 3 |
| km (`km`) | 3 |
| zu (`zu`) | 3 |
| am (`am`) | 3 |
| gl (`gl`) | 3 |
| gn (`gn`) | 3 |
| gu (`gu`) | 3 |
| hy (`hy`) | 3 |
| ig (`ig`) | 3 |
| lb (`lb`) | 3 |
| lo (`lo`) | 3 |
| mg (`mg`) | 3 |
| mi (`mi`) | 3 |
| mk (`mk`) | 3 |
| mr (`mr`) | 3 |
| mt (`mt`) | 3 |
| ny (`ny`) | 3 |
| sd (`sd`) | 3 |
| si (`si`) | 3 |
| sm (`sm`) | 3 |
| sn (`sn`) | 3 |
| sw (`sw`) | 3 |
| yo (`yo`) | 3 |
| pa (`pa`) | 2 |
| zh-tw (`zh-tw`) | 2 |
| ab (`ab`) | 2 |
| bs (`bs`) | 2 |
| fo (`fo`) | 2 |
| ht (`ht`) | 2 |
| ha (`ha`) | 2 |
| ku (`ku`) | 2 |
| ky (`ky`) | 2 |
| ps (`ps`) | 2 |
| rm (`rm`) | 2 |
| Serbe-Croate (`sh`) | 2 |
| ss (`ss`) | 2 |
| st (`st`) | 2 |
| so (`so`) | 2 |
| tg (`tg`) | 2 |
| ti (`ti`) | 2 |
| to (`to`) | 2 |
| tk (`tk`) | 2 |
| co (`co`) | 1 |
| br (`br`) | 1 |
| vec (`vec`) | 1 |
| lmo (`lmo`) | 1 |
| zh-TW (`zh-TW`) | 1 |
| ko-KR (`ko-KR`) | 1 |
| es-MX (`es-MX`) | 1 |
| zh-CN (`zh-CN`) | 1 |
| es-AR (`es-AR`) | 1 |
| zh-HK (`zh-HK`) | 1 |
| as (`as`) | 1 |
| bho (`bho`) | 1 |
| bo (`bo`) | 1 |
| cnr (`cnr`) | 1 |
| cy (`cy`) | 1 |
| doi (`doi`) | 1 |
| dv (`dv`) | 1 |
| ee (`ee`) | 1 |
| haw (`haw`) | 1 |
| hmn (`hmn`) | 1 |
| ilo (`ilo`) | 1 |
| kok (`kok`) | 1 |
| lg (`lg`) | 1 |
| ln (`ln`) | 1 |
| lus (`lus`) | 1 |
| mai (`mai`) | 1 |
| mni (`mni`) | 1 |
| mww (`mww`) | 1 |
| nso (`nso`) | 1 |
| or (`or`) | 1 |
| qu (`qu`) | 1 |
| ro-MD (`ro-MD`) | 1 |
| rw (`rw`) | 1 |
| sa (`sa`) | 1 |
| ts (`ts`) | 1 |
| xh (`xh`) | 1 |
| yi (`yi`) | 1 |

### Anglais (470)

- 18 Porn Comic — https://18porncomic.com
- 1Manga.co — https://1manga.co
- 3Hentai — https://3hentai.net
- 8Muses — https://comics.8muses.com
- Akai Comic — https://akaicomic.org
- Akaza Scans — https://akazascans.org
- Akuma — https://akuma.moe
- Alandal — https://alandal.com
- AllManga — https://mkissa.to
- AllPornComic — https://allporncomic.com
- AllPornComic.io — https://allporncomic.io
- Alpha Manga — https://www.alpha-manga.com
- Anisa Scans — https://anisascans.in
- AP Comics — https://apcomics.org
- Aqua Manga — https://aquareader.org
- Arc-Relight — https://arc-relight.com
- Arena Scans — https://arenascan.com
- Art Lapsa — https://artlapsa.com
- AsiaToon — https://asiatoon.net
- AsmHentai — https://asmhentai.com
- Asmodeus Scans — https://asmotoon.com
- Assorted Scans — https://assortedscans.com
- Aster Scans — https://asterscans.com
- Asura Scans — https://asurascans.com
- Athrea Scans — https://athreascans.com
- Atsumaru — https://atsu.moe
- aurora — https://comicaurora.com
- Bakkin — https://bakkin.moe/reader/
- Bakkin Self-hosted — http://127.0.0.1/
- BatCave — https://batcave.biz
- Battle In 5 Seconds After Meeting — https://www.deatte5.com
- Bbato — https://bato1.com
- BookWalker — https://bookwalker.com
- Borat Scans — https://boratscans.com
- BrainRotComics — https://brainrotcomics.com
- Broccoli Soup — https://politeandgood.com
- Bun Manga — https://bunmanga.com
- buttsmithy — https://incase.buttsmithy.com
- Clone Manga — https://manga.clone-army.org
- Clown Corps — https://clowncorps.net
- Cocomic — https://cocomic.co
- Collected Curios — https://www.collectedcurios.com
- Colorized Mangas — https://colorizedmangas.com
- Comic Asura — https://comicasura.net
- Comic CX — https://comic.cx
- Comic Fury — https://comicfury.com
- ComicHubFree — https://comichubfree.com
- ComicK Fanmade — https://comickfan.com
- ComicLand — https://comicland.org
- ComicsKingdom — https://wp.comicskingdom.com
- Comikey — https://comikey.com
- Comivex — https://comivex.com
- Comix — https://comix.to
- Commit Strip — https://www.commitstrip.com
- Coolmic — https://coolmic.me
- Cubari — https://cubari.moe
- Cucumber Manga — https://cucumbermanga.com
- CulturedWorks — https://culturedworks.com
- Cutie Comics — https://cutiecomics.com
- Cyanide & Happiness — https://explosm.net
- Danke fürs Lesen — https://danke.moe
- Dark Legacy Comics — https://www.darklegacycomics.com
- Dark Science — https://dresdencodak.com
- Darths & Droids — https://www.darthsanddroids.net
- Death Toll Scans — https://reader.deathtollscans.net
- Decadence Scans — https://reader.decadencescans.com
- DFlowScans — https://dflow.alwaysdata.net
- Digital Comic Museum — https://digitalcomicmuseum.com
- Diva Scans — https://divascans.org
- Doujin.io - J18 — https://doujin.io
- Doujins — https://doujins.com
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- DragonTea — https://dragontea.ink
- Drake Scans — https://drakecomic.net
- Dusk Scans — https://duskscans.com
- Dynasty Scans — https://dynasty-scans.com
- Eggporncomics — https://eggporncomics.com
- El Goonish Shive — https://www.egscomics.com
- Elan School — https://elan.school
- Elf Toon — https://elftoon.com
- emaqi — https://emaqi.com
- Eris Scans — https://erisscans.com
- Ero18x — https://ero18x.com
- Erofus — https://www.erofus.com
- Eva Scans — https://evascans.net
- Existential Comics — https://existentialcomics.com
- EZmanga — https://ezmanga.org
- Fairy Scans — https://fairyscans.org
- Flame Comics — https://flamecomics.xyz
- Frieren Online — https://www.frieren.online
- GakaMangas — https://gakamangas.com
- Galaxy Manga — https://galaxymanga.io
- GalaxyDegenScans — https://gdscans.com
- GEDE Comix — https://gedecomix.com
- Gensura — https://gensura.net
- Genz Toons — https://genztoons.org
- GingeRTooN — https://gingertoon.com
- GirlsTop — https://en.girlstop.info
- GlobalComix — https://globalcomix.com
- Goda — https://manhuascans.org
- Gone with the Blastwave — https://www.blastwave-comic.com
- Gourmet Scans — https://gourmetsupremacy.com
- Greed Scans — https://gojoscans.com
- Grim Scans — https://grimscans.com
- Grrl Power Comic — https://www.grrlpowercomic.com
- Gunnerkrigg Court — https://www.gunnerkrigg.com
- Guya — https://guya.cubari.moe
- Hachirumi — https://hachirumi.com
- Hades Scans — https://hadesscans.com
- HDoujin — https://hdoujin.org
- Hennojin — https://hennojin.com
- Hentai3z.CC — https://hentai3z.cc
- Hentai4Free — https://hentai4free.net
- HentaiEnvy — https://hentaienvy.com
- HentaiEra — https://hentaiera.com
- HentaiFox — https://hentaifox.com
- HentaiHand — https://hentaihand.com
- HentaiHere — https://hentaihere.com
- HentaiKisu — https://hentaikisu.com
- HentaiKun — https://hentaikun.com
- HentaiNexus — https://hentainexus.com
- HentaiRead — https://hentairead.com
- HentaiRead.io — https://hentairead.io
- HentaiRox — https://hentairox.com
- HentaiSco — https://hentaisco.cc
- HentaiTnT — https://hentaitnt.net
- HentaiXComic — https://hentaixcomic.com
- HentaiXDickgirl — https://hentaixdickgirl.com
- HentaiXYuri — https://hentaixyuri.com
- HentaiZap — https://hentaizap.com
- Hentara — https://hentara.com
- Hijala Scans — https://en-hijala.com
- Hiperdex — https://hiperdex.tv
- Hive Scans — https://hivetoons.org
- Hiveworks Comics — https://hiveworkscomics.com
- HM2D — https://doujindistrict.com
- HOLONOMETRIA — https://holoearth.com
- Honeytoon — https://honeytoon.com
- HonkaiImpact3 — https://manga.honkaiimpact3.com
- HotComics — https://hotcomics.me
- Hunlight Comics — https://hunlightcomics.com
- Hyakuro Translations — https://hyakuro.net
- I Roved Out — https://www.irovedout.com
- I'm An Evil God — https://imanevilgod.com
- IMHentai — https://imhentai.xxx
- InfinityScans — https://infinityscans.org
- INKR — https://comics.inkr.com
- izneo (webtoons) — https://www.izneo.com/en/webtoon
- J-Novel — https://j-novel.club
- Jinmangas — https://jinmangas.com
- K Manga — https://kmanga.kodansha.com
- Kagane — https://kagane.to
- Kaizen Scan — https://kaizenscan.com
- KaliScan — https://kaliscan.com
- Kappa Beast — https://kappabeast.com
- Kayn Scans — https://kaynscans.com
- keenspot — https://twokinds.keenspot.com
- Ken Scans — https://kencomics.com
- Kewn Scans — https://kewnscans.org
- Kill Six Billion Demons — https://killsixbilliondemons.com
- King of Shojo — https://kingofshojo.com
- KingComiX — https://kingcomix.com
- Kissmanga.in — https://kissmanga.in
- Kodansha — https://kodansha.us
- KokoMangas — https://kokomangas.com
- KSGroupScans — https://ksgroupscans.com
- Kun Manga Online — https://www.kunmanga.online
- KuraManga — https://kuramanga.com
- Lagoon Scans — https://lagoonscans.com
- League of Legends — https://universe.leagueoflegends.com/en_us/comic/
- Leslie&Victims — https://leslie-victims.pages.dev
- LHTranslation — https://lhtranslation.net
- LikeManga — https://likemanga.ink
- Lily Manga — https://lilymanga.net
- LinkManga — https://linkmanga.com
- Loading Artist — https://loadingartist.com
- LoLoBun — https://www.lolobun.com
- Lua Scans — https://luacomic.org
- Luminare Translations — https://luminaretranslations.com
- Luna Toons — https://lunatoons.org
- Lunar Manga — https://lunarx.to
- Luscious — https://www.luscious.net
- LustToon — https://lustoon.com
- Madara Scans — https://madarascans.org
- MadaraDex — https://madaradex.org
- Madokami — https://manga.madokami.al
- Magical Translators — https://mahoushoujobu.com
- Magus Manga — https://magustoon.org
- Mahouirexnohentaikarte — https://mahouirexnohentaikarte.com
- Manga 18x — https://manga18x.net
- Manga Ball — https://mangaball.com
- Manga Dass — https://mangadass.com
- Manga Demon — https://demonicscans.org
- Manga District — https://mangadistrict.com
- Manga Drama — https://mangadrama.com
- Manga Kiss — https://mangakiss.org
- Manga Million — https://mangamillion.shueisha.co.jp
- Manga Mirai — https://mangamirai.com
- MANGA Plus by SHUEISHA — https://mangaplus.shueisha.co.jp
- MANGA Plus Creators by SHUEISHA — https://mangaplus-creators.jp
- Manga Trend — https://mangatrend.org
- Manga UP! — https://global.manga-up.com
- Manga-Bay — https://manga-bay.biz
- Manga.uno — https://manga.uno
- Manga18.Club — https://manga18.club
- Manga18Free — https://manga18free.com
- Manga18fx — https://manga18fx.com
- Manga18Me — https://manga18.me
- Mangabat — https://www.mangabats.com
- MangaBolt — https://mangabolt.com
- Mangack — https://mangack.com
- MangaCloud — https://mangacloud.org
- MangaDE — https://mangade.io
- MangaDex — https://mangadex.org
- MangaDia — https://mangadia.com
- MangaDNA — https://mangadna.com
- MangaDot — https://mangadot.net
- MangaFire — https://mangafire.to
- Mangaforfree.com — https://mangaforfree.com
- MangaForFree.net — https://mangaforfree.net
- MangaFox — https://fanfox.net
- MangaFox.fun — https://mangafox.fun
- Mangafreak — https://ww3.mangafreak.me
- Mangafree — https://mangafree.info
- MangaGeko — https://www.mgeko.cc
- MangaGG — https://mangagg.com
- Mangago — https://www.mangago.me
- MangaHe — https://mangahe.com
- Mangahere — https://www.mangahere.cc
- MangaHere.onl — https://mangahere.onl
- MangaHub — https://mangahub.io
- MangaK — https://mangak.io
- MangaKa — https://mangaka.cc
- Mangakakalot — https://www.mangakakalot.gg
- Mangakakalot.fun — https://mangakakalot.fun
- MangaKatana — https://mangakatana.com
- MangaLix — https://mangalix.com
- MangaManiacs — https://mangamaniacs.org
- MangaMelon — https://mangamelon.com
- Mangamo — https://www.mangamo.com
- Manganato — https://www.natomanga.com
- MangaNel — https://manganel.me
- MangaNow — https://manganow.to
- MangaOnline.fun — https://mangaonline.fun
- MangaOwl.io (unoriginal) — https://mangaowl.io
- MangaPanda.onl — https://mangapanda.onl
- MANGAPDF — https://mangapdf.org
- MangaPill — https://mangapill.com
- MangaPlaza — https://mangaplaza.com
- MangaRead.org — https://www.mangaread.org
- MangaReader.in — https://mangareader.in
- MangaReader.site — https://mangareader.site
- Mangasushi — https://mangasushi.org
- MangaTaro — https://mangataro.org
- Mangatellers — https://reader.mangatellers.gr
- MangaToday — https://mangatoday.fun
- MangaToon (Limited) — https://mangatoon.mobi
- Mangatown — https://www.mangatown.com
- MangaTX — https://mangatx.cc
- MangaYi — https://mangayi.com
- MangaYY — https://mangayy.org
- Mango — http://127.0.0.1:9000
- Manhua Plus — https://manhuaplus.com
- Manhua Rush — https://manhuarush.vercel.app
- Manhua Zonghe — https://www.manhuazonghe.com
- ManhuaHot — https://manhuahot.com
- Manhuanext — https://manhuanext.com
- ManhuaPlus (Unoriginal) — https://manhuaplus.org
- Manhuarm — https://manhuarmtl.com
- ManhuaTop — https://manhuatop.org
- ManhuaUS — https://manhuaus.com
- Manhwa Comics — https://manhwacomics.com
- Manhwa Reads — https://manhwareads.com
- Manhwa Toon — https://www.manhwatoon.me
- Manhwa18 — https://manhwa18.com
- Manhwa18.cc — https://manhwa18.cc
- Manhwa18.net — https://manhwa18.net
- Manhwa68 — https://manhwa68.com
- ManhwaBuddy — https://manhwabuddy.com
- ManhwaClub.net — https://manhwaclub.net
- ManhwaDen — https://www.manhwaden.com
- ManhwaGet — https://manhwaget.com
- ManhwaHub — https://manhwahub.net
- Manhwalike — https://manhwalike.com
- ManhwaManhua — https://manhwamanhua.com
- ManhwaNex — https://manhwanex.com
- ManhwaRead — https://manhwaread.com
- Manhwatop — https://manhwatop.com
- ManhwaZ — https://manhwaz.com
- ManhwaZone — https://manhwazone.com
- Manta Comics — https://manta.net/en
- MayoTune — https://mayochuu.xyz
- Megatokyo — https://megatokyo.com
- Mehgazone — https://mehgazone.com
- MeiToon — https://meitoon.org
- Mgread.io — https://mgread.io
- Milftoon — https://milftoon.xxx
- Mist Scans — https://mistscans.com
- MLBB Lore — https://play.mobilelegends.com
- Monochrome Custom — https://monochromecms.netlify.app
- Monochrome Scans — https://manga.d34d.one
- Multporn — https://multporn.net
- MurimScan — https://www.murimscans.site
- MyAdultComics — https://myadultcomics.com
- MyHentaiComics — https://myhentaicomics.com
- MyHentaiGallery — https://myhentaigallery.com
- MyReadingManga — https://myreadingmanga.info
- NamiComi — https://namicomi.com
- New Manhwa — https://saymanhwa.com
- NexComic — https://nexcomic.com
- nHentai.com (unoriginal) — https://nhentai.com
- NHentai.to — https://nhentai.to
- NHentai.xxx — https://nhentai.xxx
- Niadd — https://www.niadd.com
- NineAnime — https://www.nineanime.com
- NineHentai — https://9hentai.so
- Ninekon — https://app.ninekon.com
- NixManga — https://nixmanga.com
- NovelCool — https://www.novelcool.com
- Nuvia Toon — https://nuviatoon.com
- Nux Scans — https://nuxscans-comics.blogspot.com
- Nyanu Kafe — https://nyanukafe.com
- Nyra Scans — https://nyrascans.com
- Nyx Scans — https://nyxscans.com
- OctopusManga — https://octopusmanga.com
- Oglaf — https://www.oglaf.com
- Oh Joy Sex Toy — https://www.ohjoysextoy.com
- Omega Scans — https://omegascans.org
- Omoi — https://www.omoi.com
- One Piece Fans — https://one-piece-fans2.com
- One Punch Man Online — https://1punchman.com
- OneManga.info — https://onemanga.info
- OniSaga — https://onisaga.com
- Only The Best Hentai — https://onlythebesthentai.com
- oots — https://www.giantitp.com
- Oppai Stream — https://read.oppai.stream
- Orchisasia — https://www.orchisasia.org
- Orion Scans — https://orion-scans.com
- PandaChaika — https://panda.chaika.moe
- Paradise Scans — https://paradisescans.com
- Paritehaber — https://www.paritehaber.com
- Patch Friday — https://patchfriday.com
- Petrotechsociety — https://www.petrotechsociety.org
- Philia Scans — https://philiascans.org
- Pixiv — https://www.pixiv.net
- PornComix — https://bestporncomix.com
- Pornhwa18 — https://pornhwa18.com
- PornPics — https://www.pornpics.com
- Qi Scans — https://qimanga.com
- Questionable Content — https://www.questionablecontent.net
- Rackus — https://rackusreads.com
- Rage Scans — https://ragescans.com
- Randowiz — https://randowis.com
- Raven Scans — https://ravenscans.org
- Razure — https://razure.org
- Read Attack on Titan Shingeki no Kyojin Manga — https://ww12.readsnk.com
- Read Berserk Manga — https://readberserk.com
- Read Black Clover Manga Online — https://ww10.readblackclover.com
- Read Chainsaw Man Manga Online — https://ww6.readchainsawman.com
- Read Comics Online — https://readcomicsonline.ru
- Read Fairy Tail & Edens Zero Manga Online — https://ww9.readfairytail.com
- Read Horimiya Online — https://read-horimiya.online
- Read Jujutsu Kaisen Manga Online — https://ww6.readjujutsukaisen.com
- Read Kingdom Manga Online — https://ww6.readkingdom.com
- Read Nanatsu no Taizai 7 Deadly Sins Manga Online — https://ww8.read7deadlysins.com
- Read One Piece Manga Online — https://ww13.readonepiece.com
- Read One-Punch Man Manga Online — https://ww7.readopm.com
- Read Solo Leveling Manga Manhwa Online — https://ww4.readsololeveling.org
- Read Tokyo Ghoul Re & Tokyo Ghoul Manga Online — https://ww12.tokyoghoulre.com
- Read Vagabond Manga — https://readbagabondo.com
- ReadAllComics — https://readallcomics.com
- ReadComicOnline — https://readcomiconline.li
- Real Life Comics — https://reallifecomics.com
- ReiManga — https://reimanga.net
- Renascans — https://renascans.net
- Revival Scans — https://www.revivalscans.com
- Rinko Comics — https://rinkocomics.com
- RitharScans — https://ritharscans.com
- Rizz Comic — https://rizzfables.com
- Rizz Comic (unoriginal) — https://rizzcomic.com
- RokariComics — https://rokaricomics.com
- Rolia Scan — https://roliascan.com
- Rose Squad Scans — https://rosesquadscans.aishiteru.org
- S2Manga — https://s2read.com
- Sabrina Online — https://www.sabrina-online.com
- SACACHISPA — https://sacachispa.site
- Sana Scans — https://sanascans.com
- Sandra and Woo — https://www.sandraandwoo.com
- Saturday Morning Breakfast Comics — https://smbc-comics.com
- SayManhwa — https://saymanhwa.com
- ScansGG — https://scans.gg
- SchaleNetwork — https://schale.network
- Schlock Mercenary — https://www.schlockmercenary.com
- Scythe Scans — https://scythescans.com
- SeraphicDeviltry — https://seraphic-deviltry.com
- Setsu Scans — https://setsuscans.com
- SilentQuill — https://silentquill.net
- Simply Hentai — https://www.simply-hentai.com
- Siren Scans — https://sirenscans.org
- Sleepy Translations — https://sleepytranslations.com
- Solar and Sundry — https://sas-api.fly.dev
- Spmanhwa — https://spmanhwa.online
- SpyFakku — https://hentalk.pw
- StoneScape — https://stonescape.xyz
- Sunshine Butterfly Scans — https://wings.sbs
- SUPER MEGA — https://www.supermegacomics.com
- Swords Comic — https://swordscomic.com
- Tapas — https://tapas.io
- Tappytoon — https://www.tappytoon.com/en
- TCB Scans — https://tcbonepiecechapters.com
- Team Shadowi — https://www.team-shadowi.com
- Temple Scan — https://templetoons.com
- The Blank — https://theblank.net
- The Duck Webcomics — https://www.theduckwebcomics.com
- The Girl from Random Chatting Manga Online — https://thegirlfromrandomchatting.com
- The Library of Ohara — https://thelibraryofohara.com
- The Property of Hate — https://jolleycomics.com
- Thunder Scans — https://en-thunderscans.com
- TimelessToons — https://timelesstoons.org
- TodayManga — https://todaymanga.com
- Toomics — https://global.toomics.com
- ToonGod — https://www.toongod.org
- ToonHey — https://toonhey.com
- Toonily — https://toonily.com
- Toonily.me — https://toontop.io
- Toonizy — https://toonizy.com
- Toonz — https://toonz.to
- Top Manhua — https://mangatop.org
- TopManhua.fan — https://www.topmanhua.fan
- TopManhua.net — https://topmanhua.net
- TritiniaScans — https://tritinia.org
- Valir Scans — https://valirscans.org
- Vanilla Scans — https://vanillascans.org
- vgperson — https://vgperson.com
- Vinne Veritas - CCC — https://ccc.vinnieveritas.com
- Violet Scans — https://violetscans.org
- Vision Haze — https://www.visionhaze.com
- Vixen Logic — https://www.vixenlogic.com
- VIZ — https://www.viz.com
- Vortex Scans — https://vortexscans.org
- Voyce.Me — https://www.voyce.me
- VyvyManga — https://mangavyvy.net
- War For Rayuba — https://xrabohrok.github.io/WarMap/#/
- Webcomics — https://webcomicsapp.com
- Webdex Scans — https://webdexscans.com
- WebNovel — https://www.webnovel.com
- Webtoons.com — https://www.webtoons.com
- WebtoonScan — https://webtoonscan.com
- WebtoonXYZ — https://www.webtoon.xyz
- Weeb Central — https://weebcentral.com
- WitchScans — https://witchtoons.net
- WoopRead — https://woopread.com
- Writer Scans — https://writerscans.com
- WuxiaWorld — https://wuxiaworld.site
- XCOMIC — https://xcomic.me
- xkcd — https://xkcd.com
- XlecX — https://xlecx.one
- XoManga — https://www.xomanga.site
- XOXO Comics — https://xoxocomic.com
- XYZ Comics — https://xyzcomics.com
- YakshaComics — https://yakshacomics.com
- YaoiHot — https://yaoihot.com
- Yaoihub — https://yaoihub.org
- YaoiScan — https://yaoiscan.com
- YellowNote — https://en.xchina.co
- Yorai — https://yorai.io
- YSK Comics — https://www.ysk-comics.com
- Zazamanga — https://www.zazamanga.com
- Zinmanga — https://mangazin.org
- Zinmanga.net — https://www.zinmanga.net

### Japonais (165)

- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- Alphapolis — https://www.alphapolis.co.jp
- Ameba Manga — https://dokusho-ojikan.jp
- Asacomi — https://asacomi.jp
- AsmHentai — https://asmhentai.com
- Bibibi Comic — https://bibibi-comic.com
- Big Comics — https://bigcomics.jp
- Booklista Studio — https://studio.booklista.co.jp
- BookWalker Japan — https://bookwalker.jp
- C'moA — https://www.cmoa.jp
- Champion Cross — https://championcross.jp
- Ciao Plus — https://ciao.shogakukan.co.jp
- Comic Boost — https://comic-boost.com
- Comic Border — https://comicborder.com
- Comic Days — https://comic-days.com
- Comic Earth Star — https://comic-earthstar.com
- Comic Festa — https://comic.iowl.jp
- Comic Fury — https://comicfury.com
- COMIC FUZ — https://comic-fuz.com
- Comic Gardo — https://comic-gardo.com
- Comic Grast — https://novema.jp
- Comic Nettai — https://www.comicnettai.com
- Comic Pash — https://comicpash.jp
- Comic Ride — https://comicride.jp
- Comic Room Base — https://comic-room-base.com
- Comic Ryu — https://comic-ryu.jp
- Comic Y-OURs — https://comic-y-ours.com
- Comico — https://www.comico.jp
- Comirela — https://comirela.com
- Corocoro Online — https://www.corocoro.jp
- Corona EX — https://to-corona-ex.com
- CyComi — https://cycomi.com
- DMM/FANZA — https://book.dmm.com
- DMM/FANZA — https://book.dmm.co.jp
- Docomo — https://dbook.docomo.ne.jp
- Dokiraw — https://dokiraw.click
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- DreComi+ — https://drecomi-plus.jp
- eBookJapan — https://ebookjapan.yahoo.co.jp
- FireCross — https://firecross.jp
- Flower Comics — https://flowercomics.jp
- FOD — https://manga.fod.fujitv.co.jp
- G-Comi — https://g-comi.jp
- Gangan Online — https://www.ganganonline.com
- GANMA! — https://ganma.jp
- Gaugau Monster Plus — https://gaugau.futabanet.jp
- GlobalComix — https://globalcomix.com
- Goraku Web — https://gorakuweb.com
- Hachiraw — https://hachiraw.net
- Hana To Yume+ — https://hanayume.com
- HAYA Comic — https://hayacomic.jp
- HDoujin — https://hdoujin.org
- Hennojin — https://hennojin.com
- HentaiEnvy — https://hentaienvy.com
- HentaiEra — https://hentaiera.com
- HentaiFox — https://hentaifox.com
- HentaiHand — https://hentaihand.com
- HentaiRox — https://hentairox.com
- HentaiZap — https://hentaizap.com
- HERO'S Web — https://heros-web.com
- HOLONOMETRIA — https://holoearth.com
- Ichicomi — https://ichicomi.com
- Idol. gravureprincess .date — https://idol.gravureprincess.date
- IMHentai — https://imhentai.xxx
- J-N Books — https://comic.j-nbooks.jp
- Jmanga — https://jmanga.cyou
- Jump Rookie! — https://rookie.shonenjump.com
- Jump Toon — https://jumptoon.com
- KadoComi — https://comic-walker.com
- Kagane — https://kagane.to
- KimiComi — https://kimicomi.com
- Kiraboshi — https://kirapo.jp
- KissLove — https://klz9.com
- KL Raw — https://www.klraw.info
- Klto9 — https://klto9.com
- Kmansin09 — https://kmansin09.top
- Kumaraw — https://kumaraw.com
- Kurage Bunch — https://kuragebunch.com
- League of Legends — https://universe.leagueoflegends.com/ja_jp/comic/
- Line Manga — https://manga.line.me
- Love4u — https://love4u.net
- Lunar Manga — https://lunarx.to
- Luscious — https://www.luscious.net
- Magazine Pocket — https://pocket.shonenmagazine.com
- MAGCOMI — https://magcomi.com
- MagKan — https://kansai.mag-garden.co.jp
- Manga Ball — https://mangaball.com
- Manga Kingdom — https://comic.k-manga.jp
- Manga Mura — https://mangamura.me
- Manga One — https://manga-one.com
- Manga Saison — https://mechacomi.jp
- Manga SPA — https://mangaspa.nikkan-spa.jp
- Manga Toshokan Z — https://www.mangaz.com
- Manga UP! (Japan) — https://www.manga-up.com
- Manga Zegra — https://manga-zegra.com
- Manga-5 — https://manga-5.com
- Manga-Park — https://manga-park.com
- Manga1000 — https://hachiraw.win
- MangaBang Comics — https://comics.manga-bang.com
- MangaBu — https://mangabu.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- MangaFire — https://mangafire.to
- MangaKuro — https://mangakuro.net
- Mangalt — https://mangalt.jp
- MangaMee — https://manga-mee.jp
- MangaMeets — https://manga-meets.jp
- MangaNo — https://manga-no.com
- MangaToon (Limited) — https://mangatoon.mobi
- MayoTune — https://mayochuu.xyz
- Mecha Comic — https://mechacomic.jp
- Mokuro — https://mokuro.moe
- MomonGA — https://momon-ga.com
- Music Book Japan — https://music-book.jp
- MyReadingManga — https://myreadingmanga.info
- Nami Comic — https://namicomic.jp
- NamiComi — https://namicomi.com
- nHentai.com (unoriginal) — https://nhentai.com
- NHentai.to — https://nhentai.to
- NHentai.xxx — https://nhentai.xxx
- Nicomanga — https://nicomanga.com
- Nicovideo Seiga — https://sp.manga.nicovideo.jp
- NihonKuni — https://nihonkuni.com
- Nikkangecchan — https://nikkangecchan.jp
- Ohta Web Comic — https://webcomic.ohtabooks.com
- OniSaga — https://onisaga.com
- PandaChaika — https://panda.chaika.moe
- Pash Up! — https://pash-up.jp
- PiaComic — https://piacomic.jp
- Piccoma — https://piccoma.com
- Pixiv — https://www.pixiv.net
- Pixiv Comic — https://comic.pixiv.net
- Raw Otaku — https://rawotaku.com
- Raw UwU — https://rawuwu.net
- Raw1001 — https://raw1001.net
- Raw18 — https://raw18.icu
- RawBaka — https://rawbaka.com
- Rawdevart.art — https://rawdevart.art
- RawINU — https://rawinu.com
- Rawkuma — https://rawkuma.net
- RawMiu — https://rawmiu.com
- Reader Store — https://ebookstore.sony.jp
- RimacomiPlus — https://rimacomiplus.jp
- SayManhwa — https://saymanhwa.com
- SchaleNetwork — https://schale.network
- Sen Manga — https://raw.senmanga.com
- Shonen Jump+ — https://shonenjumpplus.com
- Simply Hentai — https://www.simply-hentai.com
- Sokuyomi — https://sokuyomi.jp
- Sunday Web Every — https://www.sunday-webry.com
- TakeComic — https://takecomic.jp
- Tonari no Young Jump — https://tonarinoyj.jp
- Twi4 — https://sai-zen-sen.jp/comics/twi4
- U-NEXT — https://video.unext.jp
- Weekly Young Magazine — https://yanmaga.jp
- WeLoveManga — https://weloma.net
- XCOMIC — https://xcomic.me
- Yomonga — https://www.yomonga.com
- Young Animal — https://younganimal.com
- Young Champion — https://youngchampion.jp
- Young Jump+ — https://ynjn.jp
- Zebrack — https://zebrack-comic.shueisha.co.jp
- Zenon — https://comic-zenon.com
- Zerosum Online — https://zerosumonline.com

### Espagnol (157)

- 3Hentai — https://3hentai.net
- AKAYA — https://akaya.io
- Akuma — https://akuma.moe
- AnzManga — https://www.anzmanga25.com
- ApollComics — https://apollcomics.es
- Asia Lotus — https://asialotuss.com
- BarManga — https://archiviumbar.com
- Bega Translation — https://begatranslation.com
- Bloom Scans — https://bloomscans.com
- BokugenTranslation — https://bokugents.com
- Bymichi Scan — https://bymichiby.com
- CapibaraTraductor — https://capibaratraductor.com
- Catharsis World — https://newcatharsis.dig-it.info
- Catoons — https://cattoons.org
- Celestial Moon — https://celestialmoonscan.es
- Cerberus Series — https://legionscans.com/wp
- ChoChoX — https://chochox.com
- Code Arc Mangas — https://mangas.codearctraducciones.com
- Colorcito Scan — https://colorcitotoons.site
- Colorcito Scan — https://coloresito.site
- Comic Fury — https://comicfury.com
- ComicsKingdom — https://wp.comicskingdom.com
- Comikey — https://comikey.com
- Dark Room Fansub — https://lector-darkroomfansub.blogspot.com
- Dat-Gar Scan — https://datgarscanlation.blogspot.com
- DoujinHentai — https://doujinhentai.net
- DoujinsHell — https://doujinshell.net
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- DragonTranslation.org — https://dragontranslation.org
- Dynasty — https://manhuako.net
- Emperor Scan — https://imperiomanhua.com
- EnchiladaScan — https://enchiladascan.github.io/enchiladaweb
- Es.Mi2Manga — https://es.mi2manga.com
- EternalMangas — https://eternalmangas.org
- Falco Scan — https://falcoscan.net
- Gistamis House — https://gistamishousefansub.blogspot.com
- GlobalComix — https://globalcomix.com
- Gremory Mangas — https://gremoryhistorias.org
- Hades no Fansub — https://lectorhades.latamtoon.com
- Harem de Kira — https://kiraproject.lat
- HDoujin — https://hdoujin.org
- HeavenManga — https://heavenmanga.com
- HentaiEnvy — https://hentaienvy.com
- HentaiEra — https://hentaiera.com
- HentaiHall — https://hentaihall.com
- HentaiHand — https://hentaihand.com
- HentaiMode — https://hentaimode.com
- HentaiZap — https://hentaizap.com
- Honeytoon — https://honeytoon.com
- House Of Otakus — https://houseofotakusv2.xyz
- Ikigai Mangas — https://visorikigai.gettocaboca.com
- Ikuhentai — https://ikuhentai.net
- IMHentai — https://imhentai.xxx
- InfraFandub — https://infrafandub.com
- InManga — https://inmanga.com
- Inmortal Scan — https://scan-inmortal.com
- InsanosScan — https://insanoslibrary.com
- Inventario Oculto — https://inventariooculto.com
- Jeaz Scans — https://lectorhub.j5z.xyz
- Kagane — https://kagane.to
- Kazoku Den — https://www.kazokuden.com
- Koinobori Scan — https://visorkoi.com
- League of Legends — https://universe.leagueoflegends.com/es_es/comic/
- Lector Asteria — https://visor.chifa-tong.online
- LectorJPG — https://visorjpg.lat
- LectorManga.lat — https://lector-mangas.lat
- LeerCapitulo — https://www.leercapitulo.co
- LeerMangaEsp — https://mangalect.org
- LeerManhwas — https://leermanhwas.com
- Lmtos — https://lmtos.net
- Lolivault — https://lector.lolivault.net
- Luna Pieces — https://lunapiecesfansub.com
- Lunar Manga — https://lunarx.to
- Luscious — https://www.luscious.net
- Magical Translators — https://mahoushoujobu.com
- Manga Ball — https://mangaball.com
- Manga Crab — https://es.mangacrab.org
- Manga Million — https://mangamillion.shueisha.co.jp
- Manga Mukai — https://mangamukai.com
- MANGA Plus by SHUEISHA — https://mangaplus.shueisha.co.jp
- MANGA Plus Creators by SHUEISHA — https://mangaplus-creators.jp
- Manga Romance — https://mangaromance19.com
- Manga TV — https://mangatv.net
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- MangaFire — https://mangafire.to
- MangaOni — https://manga-oni.com
- Mangas No Sekai — https://mangasnosekai.com
- Mangas.in — https://m440.in
- MangaToon (Limited) — https://mangatoon.mobi
- MangoLibreria — https://mangolibreria.com
- Manhuarm — https://manhuarmtl.com
- Manhwa-Latino — https://manhwa-latino.com
- ManhwaOnline — https://manhwa-online.com
- ManhwasMe — https://manhwas.me
- ManhwaWeb — https://manhwaweb.com
- Manta Comics — https://manta.net/es
- Mantraz Scan — https://mantrazscan.co
- Marmota — https://marmota.me
- Menudo-Fansub — https://www.menudo-fansub.com
- MHScans — https://mhscans.com
- Miau Scan — https://leemiau.com
- Monopoly Scan — https://monopolymanhua.com
- Mundo Manhwa — https://mundomanhwa.com
- MyReadingManga — https://myreadingmanga.info
- NamiComi — https://namicomi.com
- NekoScans — https://nekoproject.org
- NeoManga — https://www.neomanga.online
- NexusScanlation — https://nexusscanlation.com
- Niadd — https://es.niadd.com
- Nova Manhwas — https://novamanhwa.cc
- NovelCool — https://es.novelcool.com
- Olympus Scanlation — https://olympusxyz.com
- One Piece Fans — https://one-piece-fans2.com
- ONF MANGAS — https://onfmangas.com
- OniSaga — https://onisaga.com
- OrckuMangas — https://orckumangas.com
- PandaChaika — https://panda.chaika.moe
- Platinum Lily Scan — https://platinumlilyscan.com
- Plot Twist No Fansub — https://plotnofansub.com
- Ragna Scans — https://lector.ragnascan.xyz
- Ragnarok Scanlation — https://ragnarokscanlation.org
- RavenManga — https://raventard.xyz
- RichtoScan — https://r1.richtoon.top
- Rncalation — https://rncalation.online
- SamuraiScan — https://samurai.j5z.xyz
- SapphireScan — https://www.sapphirescan.com
- SayManhwa — https://saymanhwa.com
- SeraphicDeviltry — https://spanish.seraphic-deviltry.com
- Shadow Manga — https://shademanga.com
- Simply Hentai — https://www.simply-hentai.com
- SkyMangas — https://skymangas.com
- Spicy Scan — https://spicyseries.com
- Submanhwa — https://submanhwa.com
- Taurus Fansub — https://lectortaurus.com
- Temple Scan — https://aedexnox.akan01.com
- The Library of Ohara — https://thelibraryofohara.com
- TMOHentai (unoriginal) — https://tmohentai.app
- Toomics — https://global.toomics.com
- Toon-es — https://toon-es.com
- TopComicPorno — https://topcomicporno.com
- TopComicPorno.net — https://topcomicporno.net
- Traducciones Moonlight — https://traduccionesmoonlight.com
- Uchuujin Projects — https://uchuujinmangas.com
- VCPVMP — https://vercomicsporno.com
- VCPVMP — https://vermangasporno.com
- Ver Manhwas — https://vermanhwa.com
- Vinne Veritas - CCC — https://ccc.vinnieveritas.com
- Webcomics — https://webcomicsapp.com
- Webtoons.com — https://www.webtoons.com
- XCOMIC — https://xcomic.me
- xkcd — https://es.xkcd.com
- YellowNote — https://es.xchina.co
- Yupmanga — https://www.yupmanga.com
- Yuri-Online — https://yuri-online.com
- ZonaTMO.org (unoriginal) — https://zonatmo.org
- Zonatmo.to (unoriginal) — https://zonatmo.to

### pt-BR (139)

- Acervo Hentai — https://acervohentai.com
- AcervoEremita — https://acervoeremita.com
- Amuy — https://apenasmaisumyaoi.com
- AnimeXNovel — https://www.animexnovel.com
- Apenas Uma Fã — https://apenasuma-fa.blogspot.com
- Argos Comics — https://aniargos.com
- Argos Scan — https://argoscomics.online
- Arthur Scan — https://arthurscan.xyz
- Astratoons — https://new.astratoons.com
- Azuretoons — https://azuretoons.com
- Bakai — https://bakai.org
- Blackout Comics — https://blackoutcomics.com
- Bladetoons — https://bladetoons.com
- Boruto Explorer — https://leitor.borutoexplorer.com.br
- BR Yaoi — https://bryaoi.com
- Brasil Hentai — https://brasilhentai.com
- Café com Yaoi — https://cafecomyaoi.com.br
- Capitoons — https://capitoons.com
- Cerise Scan — https://loverstoon.net
- Comic Fury — https://comicfury.com
- Comikey — https://comikey.com
- Comikey — https://br.comikey.com
- Coven Scan — https://covendasbruxonas.com
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- Ego Toons — https://egotoons.com
- Ero Sect — https://erosect.xyz
- Euphoria Scan — https://euphoriascan.com
- ExHentai.net.br — https://exhentai.net.br
- Fenix Project — https://fenixproject.site
- Fleur Blanche — https://fbsquadx.com
- FlowerManga.net — https://flowermangas.net
- GALAX Scans — https://galaxscanlator.blogspot.com
- Geass Comics — https://geasscomics.xyz
- Ghost Scan — https://ghostscan.xyz
- GlobalComix — https://globalcomix.com
- Hanami Heaven — https://hanamiheaven.org
- Hanmokku Scan — https://hanmokkuscan.blogspot.com
- Hentai Season — https://hentaiseason.com
- Hentai Tokyo — https://hentaitokyo.net
- HentaiHand — https://hentaihand.com
- HipercooL — https://lerhentais.com
- Hipertoon — https://hipertoon.com
- Honeytoon — https://honeytoon.com
- Hora Hentai — https://horahentai.com
- Hot Cabaret Scan — https://hotcabaretscan.com
- HQ Now! — https://www.hq-now.com
- Hunters Scans — https://readhunters.xyz
- Inkapk — https://inkapk.net
- Kagane — https://kagane.to
- Kami Sama Explorer — https://leitor.kamisama.com.br
- KivaraToons — https://kivaratoons.com
- KuroMangas — https://kuromangas.com
- League of Legends — https://universe.leagueoflegends.com/pt_br/comic/
- Leitor de Mangas — https://leitordemangas.com
- Leitura Manga — https://leituramanga.net
- Ler 999 — https://ler999.blogspot.com
- Little Tyrant — https://tiraninha.world
- Lunar Manga — https://lunarx.to
- Lura Toon — https://luratoons.net
- Luscious — https://www.luscious.net
- Lycan Toons — https://lycantoons.com
- Maid Scan — https://empreguetes.wtf
- Manga Ball — https://mangaball.com
- Manga Flix — https://mangaflix.net
- Manga Livre Blog — https://mangalivre.blog
- Manga Livre.to — https://mangalivre.to
- Manga Million — https://mangamillion.shueisha.co.jp
- Manga NXY — https://manganyx.com
- Manga Online — https://mangaonline.green
- MANGA Plus by SHUEISHA — https://mangaplus.shueisha.co.jp
- Manga Stop — https://mangastop.net
- MangaDash — https://mangadash.net
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- MangaFire — https://mangafire.to
- MangaLivre.org — https://mangalivre.org
- Mangas Brasuka — https://mangasbrasuka.org
- MangaToon (Limited) — https://mangatoon.mobi
- ManGeek — https://mangeek.app
- Mango Toons — https://mangotoons.com
- Manhastro — https://manhastro.net
- Manhuarm — https://manhuarmtl.com
- Mediocre Toons — https://mediocrescan.com
- Miau Scan — https://leemiau.com
- MiniTwo Scan — https://minitwoscan.com
- Monte Tai — https://montetaiscanlator.xyz
- MR Tenzus — https://mrtenzus.com
- Mugiwaras Oficial — https://mugiwarasoficial.org
- Muito Hentai — https://www.muitohentai.com
- Mundo Hentai — https://mundohentaioficial.com
- MyReadingManga — https://myreadingmanga.info
- NamiComi — https://namicomi.com
- Nebulosa Scan — https://nebulosascan.com
- Nexus Toons — https://nx-toons.xyz
- Niadd — https://br.niadd.com
- Ninja Scan — https://ninjacomics.xyz
- Nocturne Summer — https://nocfsb.com
- NovelCool — https://br.novelcool.com
- NoxManga — https://noxmangas.org
- OneReader — https://onereader.net
- OniSaga — https://onisaga.com
- Osaka Scan — https://www.osakascan.com
- Pink Rosa — https://scanpinkrosa.blogspot.com
- Pink Sea Unicorn — https://psunicorn.com
- PizzariaScan — https://pizzariacomics.com
- Pluma Comics — https://plumacomics.cloud
- Point Zero Toons — https://kitsuneyako.com
- Portal Yaoi — https://portalyaoi.com
- RF Dragon Scan — https://rfdragonscan.net
- Risentoons — https://risentoons.xyz
- Roxinha — https://roxinha.online
- Sagrado Império da Britannia — https://imperiodabritannia.net
- Saikai Scan — https://housesaikai.net
- Shirai Scans — https://shiraixis.space
- SlimeRead (unoriginal) — https://slimeread.app
- Starlight Scan — https://starligthscan.com
- TaimuMangas — https://beta.taimumangas.com
- Taiyō — https://taiyo.moe
- Tankou Hentai — https://tankouhentai.com
- Tao Sect — https://taosect.com
- Temaki mangás — https://temakimangas.blogspot.com
- Tia Manhwa — https://tiamanhwa.com
- Toomics — https://global.toomics.com
- ToonBr — https://beta.toonbr.com
- ToonLivre — https://toonlivre.net
- Traduções do Lipe — https://traducoesdolipe.blogspot.com
- Tsundoku Traduções — https://tsundoku.com.br
- Universo Hentai — https://universohentai.com
- Vegitoons — https://vegitoons.black
- Verdinha — https://verdinha.wtf
- Wolftoon — https://wolftoon.lovable.app
- XCOMIC — https://xcomic.me
- XXX Yaoi — https://3xyaoi.com
- Yaoi Fan Club — https://www.yaoifanclub.com
- Yomu Comics — https://yomu.com.br
- Yomu Mangás — https://yomumangas.com
- Yugen Mangás — https://yugenmangasbr.dxtg.online
- Yuri on Air — https://yurionair.top
- ZettaHQ — https://zettahq.com

### Indonésien (106)

- 3Hentai — https://3hentai.net
- Aarlas — https://www.arlas.online
- Ainz Scans ID — https://v3.ainzscans01.com
- Akuma — https://akuma.moe
- APKOMIK — https://01.apkomik.com
- Astral Scans — https://astralscans.site
- BacaKomik — https://bacakomik.my
- Bacami — https://v1.bacami.site
- Comicaso — https://v3.comicaso.pro
- Comikey — https://comikey.com
- CosmicScans — https://04.cosmicscans.to
- CrotPedia — https://crotpedia.net
- DailySuka — https://dailysuka.com
- Dojing.net — https://dojing.net
- Doujindesu — https://doujin.desu.xxx
- Doujinku — https://doujinku.org
- DreamTeams Scans — https://dreamteams.space
- GlobalComix — https://globalcomix.com
- Hentai Crot — https://hentaicrot.com
- HentaiHand — https://hentaihand.com
- HOLONOMETRIA — https://holoearth.com
- Holotoon — https://holodek.run
- Hwago — https://02.hwago.xyz
- Ikiru — https://08.ikiru.wtf
- IsekaiKomik — https://ch1.isekaikomik.site
- Izanami Scans — https://izanamiscans.my.id
- Kagane — https://kagane.to
- Kaguya — https://02.kaguya.pro
- Kanzenin — https://kanzenin.info
- Kiryuu — https://v7.kiryuu.to
- KlikManga — https://klikmanga.org
- Komik Dewasa — https://komikdewasa.mom
- Komik Dewasa Art — https://komikdewasa.art
- Komik Next G Online — https://komiknextgonline.com
- Komik Station — https://komikstation.org
- Komikindo — https://komikindo.cam
- KomikIndoID — https://komikindo.ch
- KomikNesia — https://v1.komiknesiaku.com
- Komiktap — https://komiktap.info
- Komiku — https://komiku.org
- Komiku.com — https://01.komiku.asia
- Komikzoid — https://01.komikzoid.id
- KumaPoi — https://kumapoi.info
- KumoPoi — https://beta.kumopoi.com
- Kuro Manga — https://kuromanga.id
- LepoyTL — https://www.lepoytl.my.id
- LianScans — https://www.lianscans.com
- LumosKomik — https://03.lumosgg.com
- Lunar Manga — https://lunarx.to
- Luvyaa — https://v5.luvyaa.co
- Maid - Manga — https://www.maid.my.id
- Manga Ball — https://mangaball.com
- Manga Can — https://mangacanblog.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MANGA Plus by SHUEISHA — https://mangaplus.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- Mangakuri — https://lc2.mangakuri.online
- Mangalay — http://mangalay.blogspot.com
- Mangasusu — https://mangasusuku.com
- MangaToon (Limited) — https://mangatoon.mobi
- Manhuarm — https://manhuarmtl.com
- Manhwa Indo — https://www.manhwaindo.my
- Manhwa List — https://manhwalist.asia
- ManhwaDesu — https://manhwadesu.wiki
- ManhwaLand.mom — https://02.manhwaland.land
- MG Komik — https://id.mgkomik.cc
- Mihentai — https://mihentai.net
- MikoRoku — https://www.mikoroku.com
- MyReadingManga — https://myreadingmanga.info
- NamiComi — https://namicomi.com
- Narasi Ninja — https://narasininja.net
- Natsu — https://natsu.one
- NgamenKomik — https://ngamenkomik05.blogspot.com
- Ngomik (unoriginal) — https://02.ngomik.cc
- Noromax — https://noromax02.my.id
- OkyyKomik — https://www.okyykomik.my.id
- Omicaso — https://omicaso.org
- Ota Scans — https://yurilab.top
- PandaChaika — https://panda.chaika.moe
- Pix Hentai — https://pixhentai.com
- Pramramadhan — https://01.pramramadhan.my.id
- ReYume — https://www.re-yume.my.id
- Riztranslation — https://riztranslation.pages.dev
- Roseveil — https://roseveil.org
- Ryukomik — https://ryukomik.my.id
- Sasangeyou — https://sasangeyou.net
- SayManhwa — https://saymanhwa.com
- Sekte Doujin — https://sektedoujin.cc
- Sekte Komik — https://01.sektekomik.id
- Shinigami — https://11.shinigami.asia
- Shiro Doujin — https://shirodoujin.com
- ShiyuraSub — https://shiyurasub.blogspot.com
- Siikomik — https://siikomik.id
- Softkomik — https://softkomik.co
- Soul Scans — https://v1.soulscans.org
- The Library of Ohara — https://thelibraryofohara.com
- TheManga — https://themanga.site
- Tooncubus — https://www.tooncubus.top
- Ulas Comic — https://www.ulascomic01.xyz
- VoraToon — https://v4.voratoon.com
- Webcomics — https://webcomicsapp.com
- Webtoons.com — https://www.webtoons.com
- West Manga — https://v1.westmanga.my
- Wurmz — https://wurmz.net
- XCOMIC — https://xcomic.me

### Français (96)

- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- AnimeSama — https://anime-sama.to
- AralosBD — https://aralosbd.fr
- Astral-Manga — https://astral-manga.fr
- Banchan Scan — https://banchanscan.fr
- BigSolo — https://bigsolo.org
- Blossom Scans — https://blossom-scans.com
- Blue Solo — https://bluesolo.org
- ChaosTrad — https://chaostrad.fr
- Comic Fury — https://comicfury.com
- Commit Strip — https://www.commitstrip.com
- Dassou Scan — https://dassouscan.com
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- Epsilon Scan — https://epsilonscan.to
- FMTEAM — https://fmteam.fr
- FuryoSquad — https://www.furyosociety.com
- GlobalComix — https://globalcomix.com
- Hana Book — https://www.hana-book.fr
- Harmony-Scan — https://harmony-scan.fr
- Hentai Origines — https://hentai-origines.com
- Hentai Scan Reader — https://hentai.scanreader.net
- Hentai-Scantrad — https://hentai-scantrad.org
- HentaiEnvy — https://hentaienvy.com
- HentaiEra — https://hentaiera.com
- HentaiHand — https://hentaihand.com
- HentaiZap — https://hentaizap.com
- HentaiZone — https://hentaizone.xyz
- HistoireDHentai — https://hhentai.fr
- Honeytoon — https://honeytoon.com
- IMHentai — https://imhentai.xxx
- izneo (webtoons) — https://www.izneo.com/fr/webtoon
- Japscan — https://www.japscan.foo
- Kagane — https://kagane.to
- Kiwiya Scans — https://kiwiyascans.com
- LanorTrad — https://lanortrad.com
- League of Legends — https://universe.leagueoflegends.com/fr_fr/comic/
- Lelmanga — https://www.lelmanga.com
- Lelscan — https://lelscans.net
- Lelscan-VF — https://www.lelscanfr.com
- Les Poroiniens — https://lesporoiniens.org
- Lunar Manga — https://lunarx.to
- Luscious — https://www.luscious.net
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MANGA Plus by SHUEISHA — https://mangaplus.shueisha.co.jp
- Manga-Corporation — https://manga-corporation.com
- Manga-Scantrad — https://manga-scantrad.io
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- MangaFire — https://mangafire.to
- MangaHub.fr — https://mangahub.fr
- Mangakawaii — https://www.mangakawaii.fr
- MangaMoins — https://mangamoins.com
- MangaNova — https://www.manga-nova.com
- Mangas-Origines.fr — https://mangas-origines.fr
- MangaToon (Limited) — https://mangatoon.mobi
- Manhuarm — https://manhuarmtl.com
- NamiComi — https://namicomi.com
- Niadd — https://fr.niadd.com
- NovelCool — https://fr.novelcool.com
- OniSaga — https://onisaga.com
- Ono — https://www.ono.live
- Ortega Scans — https://ortegascans.fr
- PandaChaika — https://panda.chaika.moe
- Pantheon Scan — https://pantheon-scan.com
- Perf Scan — https://perf-scan.xyz
- PhenixScans (unoriginal) — https://phenix-scans.co
- Pornhwa.fr — https://pornhwa.fr
- Poseidon Scans — https://poseidon-scans.net
- Raijin Scans — https://raijin-scans.fr
- Rimu Scans — https://rimuscan.fr
- SayManhwa — https://saymanhwa.com
- Scan Reader — https://scanreader.net
- Scan VF — https://www.scan-vf.net
- Scan-Manga — https://m.scan-manga.com
- ScanR — https://teamscanr.fr
- ScansFR — https://scansfr.com
- Scantrad Union — https://scantrad-union.com
- Simply Hentai — https://www.simply-hentai.com
- Siren Scans FR — https://sirenscans.fr
- Soft Epsilon Scan — https://epsilonsoft.to
- Solaris Scans — https://solaris-scans.fr
- Sushi-Scan — https://sushiscan.net
- Sushiscan.fr — https://sushiscan.fr
- Tappytoon — https://www.tappytoon.com/fr
- The Library of Ohara — https://thelibraryofohara.com
- Toomics — https://global.toomics.com
- Toon FR — https://toonfr.com
- Twatt — https://twatt.fr
- Webcomics — https://webcomicsapp.com
- Webtoons.com — https://www.webtoons.com
- X-Manga — https://x-manga.org
- XCOMIC — https://xcomic.me
- xkcd — https://xkcd.lapin.org
- YaoiScan — https://yaoiscan.fr

### Vietnamien (94)

- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- Ariverse — https://arigl.xyz
- CBHentai — https://2tencb.pro
- CManga — https://cmangax18.com
- CuuTruyen — https://cuutruyen.net
- CuuTruyen (unoriginal) — https://cuutruyen.moe
- DamCoNuong — https://damconuong.name
- DaoMeoDen — https://daomeoden.net
- Dilib — https://dilib.vn
- DocTruyen3Q — https://doctruyen3qhub.vip
- DocTruyen5s — https://manga.io.vn
- Dua Leo Truyen — https://dualeotruyenwk.com
- FastScan — https://fastscan.org
- FoxTruyen — https://foxtruyen2.com
- GantzVN — https://gantzvn.com
- GlobalComix — https://globalcomix.com
- Goc Truyen Tranh — https://goctruyentranh.com
- Goc Truyen Tranh Vui — https://goctruyentranhvui41.com
- HentaiHand — https://hentaihand.com
- HentaiVN.plus — https://hentaivn.show
- HentaiVNx — https://www.hentaivnx.com
- Học Viện 2Ten — https://hv2tcomics.net
- Kagane — https://kagane.to
- KamiComic — https://kamicomi.com
- KhoManhwa — https://khomanhwa.com
- KiraKira — https://truyenkira.net
- LoppyToon — https://loppytoonn.com
- Lunar Manga — https://lunarx.to
- LuotTruyen — https://luottruyen999.com
- LuvEvaLand — https://luvevalands2.co
- LXManga — https://lxmanga.space
- LxManga.org (unoriginal) — https://lxmanga.org
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MANGA Plus by SHUEISHA — https://mangaplus.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- MangaToon (Limited) — https://mangatoon.mobi
- MeDamTruyen — https://saytongtaii.site
- MeHentai — https://mehentai.live
- MeoSSS — https://meosss.com
- MeoSua — https://meosua.org
- MeTruyen18 — https://metruyen18.pro
- MiMi — https://mimihentai.moe
- MiMiHentai — https://mimihentai.net
- MinoTruyen — https://minotruyenv5.xyz
- MoeTruyen — https://moetruyen.net
- MoeTruyenSuiCao (unoriginal) — https://moe.suicaodex.com
- MyReadingManga — https://myreadingmanga.info
- NetTruyenCO (unoriginal) — https://nettruyenar.com
- NetTruyenS (unoriginal) — https://nettruyen13s.com
- NetTruyenViet (unoriginal) — https://nettruyenviet10.com
- NetTruyenX (unoriginal) — https://nettruyenx.net
- NhatTruyen — https://nhattruyenqq.com
- NhentaiClub — https://nhentaiclub.online
- Otakusic — https://otakusic.com
- OTruyen — https://otruyen.cc
- PandaChaika — https://panda.chaika.moe
- Panomic — https://panomic.online
- SangChanhTeam — https://sangchanhteam.com
- SayHentai — https://sayhentai.cx
- SayManhwa — https://saymanhwa.com
- Seikowo — https://seikowo-app.blogspot.com
- SinhSieuSao — https://sinhsieusao.com
- SoaiCaComic — https://soaicacomic2.top
- Team Lanh Lung — https://lanhlungteam3.top
- TeleTruyen — https://teletruyen.com
- ThienThaiTruyen — https://thienthaitruyen15.com
- Thỏ Ham Ngủ — https://thohamngu.xyz
- Top Truyen — https://www.toptruyenzonek.com
- Tranh18 — https://tranh18.cc
- Truyen Hentai 18+ — https://truyenhentai18.net
- Truyen tranh dam my — https://truyentranhdammyy.site
- Truyen18 — https://truyen18.co
- TruyenGGVN — https://truyenggvn.com
- TruyenHentaivn — https://truyenhentaivn.store
- TruyenHentaiz — https://truyenhentaiz.net
- TruyenMM — https://truyenmmhayr.com
- TruyenQQ — https://truyenqqko.com
- TruyenQQ VN — https://truyenqq.com.vn
- TruyenTini — https://truyentini.net
- TruyenTuoiTho — https://truyentuoitho.com
- TruyenTVN — https://truyentvn.net
- TuiTruyen — https://tuitruyen.top
- TuSachXinhXinh — https://tusachxinhxinh12.online
- UmeTruyen — https://umetruyenz.org
- ViHentai — https://vi-hentai.moe
- VinaHentai — https://vinahentai.help
- ViTruyen — https://vitruyen1.com
- XCOMIC — https://xcomic.me
- YuriGarden — https://yurigarden.moe
- YuriNeko — https://yurinekoz.com
- ZetTruyen — https://www.zettruyen1.com

### Turc (93)

- 3Hentai — https://3hentai.net
- Afrodit Scans — https://afroditscans.com
- Akuma — https://akuma.moe
- Alucard Scans — https://alucardscans.com
- Amanga Planet — https://www.amangaplanet.com.tr
- Anikiga — https://anikiga.com
- ArazNovel — https://manga.araznovel.com
- Arcura Fansub — https://arcurafansub.com
- Asura Scans TR — https://asurascans.com.tr
- DiamondFansub — https://diamondfansub.com
- Domal Fansub — https://dom4lfansub.online
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- Elder Manga — https://eldermanga.com
- Eski Mangalar — https://eskimangalar.com
- gafeland — https://gafeland.com
- Gaiatoon — https://gaiatoon.com
- Garcia Manga — https://garciamanga.com
- GhosToon — https://ghostoon.com
- GlobalComix — https://globalcomix.com
- Gölge Bahçesi — https://golgebahcesi.com
- Hattori Manga — https://hattorimanga.net
- Hattori Scans — https://hattoriscans.com
- Hayalistic — https://hayalistic.online
- HentaiHand — https://hentaihand.com
- Holy Scans — https://holyscans.com.tr
- JuraTempest — https://juratempe.st
- Koreli Manga — https://korelimanga.com
- Koreli Scans — https://www.nabicix.com
- Kuroi Manga — https://kuroimanga.site
- Lavinia Fansub — https://laviniafansub.shop
- League of Legends — https://universe.leagueoflegends.com/tr_tr/comic/
- Limon Manga — https://limonmanga.com
- Luna Scans — https://tuhafscans.com
- Lunar Manga — https://lunarx.to
- Manga Bahçesi — https://mangabahcesi.com
- Manga Ball — https://mangaball.com
- Manga Diyarı — https://mangadiyari.com
- Manga Kusu — https://mangakusu.com
- Manga Million — https://mangamillion.shueisha.co.jp
- Manga Portalı — https://www.mangaportali.com
- Manga Şehri.net — https://manga-sehri.net
- Manga-TR — https://manga-tr.com
- MangaDenizi — https://mangadenizi.net
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- Mangadusleri — https://mangadusleri.mom
- MangaTilkisi — https://www.tilkiscans.com
- MangaWOW — https://mangawow.org
- MangaWT — https://mangawt.com
- MangaZure — https://mangazure.net
- Mangitto — https://mangtto.com
- Merlin Scans — https://merlintoon.com
- Mikrokosmos Fansub — https://mikrokosmosfb.blogspot.com
- MilaSub — https://millascan.com
- Mono Manga — https://monomanga.com.tr
- Moon Daisy Scans — https://moondaisyscans.pro
- MyReadingManga — https://myreadingmanga.info
- NamiComi — https://namicomi.com
- Nemesis scans — https://nemesisscans.com
- nHentai.com (unoriginal) — https://nhentai.com
- Nirvana Manga — https://nirvanamanga.com
- Nivera Fansub — https://niverafansub.one
- OkuToon — https://okutoon.com
- Opiatoon — https://opiatoon.shop
- Ori Manga — https://orimanga.net
- PandaChaika — https://panda.chaika.moe
- Paradox Scans — https://paradoxscans.com
- Pati Manga — https://www.patimanga.com
- Ragnar Scans — https://ragnarscans.net
- Raindrop Fansub — https://www.raindropteamfan.com
- Rüya Manga — https://www.ruyamanga2.com
- Serein Scan — https://sereinscan.com
- Shadow Çeviri — https://shadowceviri.blogspot.com
- Shijie Scans — https://shijiescans.com
- Siyah Melek — https://siyahmelek.live
- Slept Manga — https://sleptmanga.com.tr
- Stray Fansub — https://strayfansub.net
- SummerToon — https://summertoons.net
- Sunset Manga — https://sunsetmanga.com
- Tarot Scans — https://www.tarotscans.com
- Tenshi Manga — https://tenshimanga.com
- TonizuToon — https://tonizu.top
- Toontaku — https://toontaku.com
- Tortuga Ceviri — https://tortugaceviri.com
- Tr Manga — https://trmanga.com
- Türkçe Manga Oku — https://trmangaoku.com
- Uzay Manga — https://uzaymanga.com
- Webtoon Hatti — https://webtoonhatti.club
- WebtoonOku — https://webtoonoku.org
- XCOMIC — https://xcomic.me
- Yaoi Flix — https://yaoiflix.fit
- Yaoi Manga Oku — https://yaoimangaoku.net
- ÇaprazManga — https://caprazmanga.com

### Toutes langues (84)

- 3600000 Beauty — https://3600000.xyz
- 3Hentai — https://3hentai.net
- 4KHD — https://www.4khd.com
- AHottie — https://ahottie.top
- Akuma — https://akuma.moe
- AllPornComics.co — https://allporncomics.co
- AsmHentai — https://asmhentai.com
- BaoBua — https://baobua.net
- Buon Dua — https://buondua.com
- Comic Fury — https://comicfury.com
- Comic Growl — https://comic-growl.com
- Comick (Unoriginal) — https://comick.live
- Comics Valley — https://comicsvalley.com
- Coomer — https://coomer.st
- CosplayTele — https://cosplaytele.com
- Cubari — https://cubari.moe
- Danbooru — https://danbooru.donmai.us
- DeviantArt — https://www.deviantart.com
- Doujiva — https://doujiva.com
- e621 — https://e621.net
- Elite Babes — https://www.elitebabes.com
- Everia.club — https://everia.club
- EveriaClub (unoriginal) — https://www.everiaclub.com
- Femjoy Hunter — https://www.femjoyhunter.com
- FoamGirl — https://foamgirl.net
- FTV Hunter — https://www.ftvhunter.com
- Grabber Zone — https://grabber.zone
- HDoujin — https://hdoujin.org
- Hentai Cosplay — https://hentai-cosplay-xxx.com
- HentaiEnvy — https://hentaienvy.com
- HentaiEra — https://hentaiera.com
- HentaiFox — https://hentaifox.com
- HentaiHand — https://hentaihand.com
- HentaiLoop — https://hentailoop.com
- HentaiRox — https://hentairox.com
- HentaiZap — https://hentaizap.com
- HNI-Scantrad — https://hni-scantrad.net
- IMHentai — https://imhentai.xxx
- JJCOS — https://jjcos.com
- Joymii Hub — https://www.joymiihub.com
- Junmeitu — https://meijuntu.com
- Kemono — https://kemono.cr
- Kiutaku — https://kiutaku.com
- Kodoku Studio — https://kodokustudio.com
- Komga — https://127.0.0.1:25600
- LANraragi — http://127.0.0.1:3000
- Lunar Manga — https://lunarx.to
- Luscious — https://www.luscious.net
- Manga Draft — https://mangadraft.com
- Manga18fx — https://manga18fx.com
- Manga18Me — https://manga18.me
- MangaCrazy — https://mangacrazy.net
- MangaDNA — https://mangadna.com
- MangaForFree.net — https://mangaforfree.net
- Manhwa-raw — https://manhwa-raw.com
- Manhwa18.cc — https://manhwa18.cc
- Metart Hunter — https://www.metarthunter.com
- MissKon — https://misskon.com
- Mitaku — https://mitaku.net
- nHentai.com (unoriginal) — https://nhentai.com
- NHentai.to — https://nhentai.to
- NHentai.xxx — https://nhentai.xxx
- OniSaga — https://onisaga.com
- OSOSEDKI — https://ososedki.com
- PandaChaika — https://panda.chaika.moe
- Pawchive — https://pawchive.pw
- Pepper&Carrot — https://www.peppercarrot.com
- Photos18 — https://www.photos18.com
- Playmate Hunter — https://pmatehunter.com
- Project Suki — https://projectsuki.com
- RokuHentai — https://rokuhentai.com
- SchaleNetwork — https://schale.network
- Simply Cosplay — https://www.simply-cosplay.com
- StashApp — http://localhost:9999
- Taddy INK (Webtoons) — https://taddy.org
- Twicomi — https://twicomi.com
- V2PH — https://www.v2ph.com
- XArt Hunter — https://www.xarthunter.com
- Xasiat Albums — https://www.xasiat.com
- XCOMIC — https://xcomic.me
- XGMN — http://xgmn8.vip
- Xiutaku — https://xiutaku.com
- Yabai — https://yabai.si
- Yaoi Manga Online — https://yaoimangaonline.com

### Chinois (77)

- 18Manhua — https://18mh.org
- 3Hentai — https://3hentai.net
- 6Manhua — https://www.liumanhua.com
- 92Manhua — http://www.92mh.com
- Akuma — https://akuma.moe
- AsmHentai — https://asmhentai.com
- Baka Manhua — https://bakamh.com
- Baozi Manhua — https://cn.baozimh.com
- BH3 — https://comic.bh3.com
- BiliManga — https://www.bilimanga.net
- BoyLove — https://boylove.cc
- Cartoon18 — https://www.cartoon18.com
- CManhua — https://cmanhua.com
- Comic Fury — https://comicfury.com
- Comicabc — https://www.8comic.com
- Dm5 — https://www.dm5.com
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- Dumanwu — https://m.dumanwu1.com
- FavComic — https://www.favcomic.com
- GoDa — https://baozimh.org
- Guazimanhua — https://www.guazimanhua.com
- H-Comic — https://h-comic.com
- HanabiManga — https://uhkvqrxmcapgtpspglrp.moedot.net
- Hanime1 — https://hanimeone.me
- HANMAN18 — https://hanman18.com
- HDoujin — https://hdoujin.org
- HentaiFox — https://hentaifox.com
- HentaiHand — https://hentaihand.com
- HentaiRox — https://hentairox.com
- Hikarinagi — https://www.hikarinagi.org
- Ikmmh — https://ymcdnyfqdapp.ikmmh.com
- JComic — https://jcomic.net
- Jinman Tiantang — https://18comic.vip
- Kagane — https://kagane.to
- Komiic — https://komiic.com
- Lunar Manga — https://lunarx.to
- Luscious — https://www.luscious.net
- Manga Ball — https://mangaball.com
- Manga Xiao Si — https://www.jjmhw2.top
- Mangabz — https://mangabz.com
- MangaDot — https://mangadot.net
- MangaToon (Limited) — https://mangatoon.mobi
- Manhua160 — https://www.mh160mh.com
- ManHuaGui — https://www.manhuagui.com
- Manhuaren — http://mangaapi.manhuaren.com
- Manhuashe — https://www.311s.com
- Manhuawu — https://www.mhua5.com
- Manwa — https://manwa.me
- MH1234 — https://m.wmh1234.com
- Miaoqu Manhua — https://www.miaoqumh.org
- MyComic — https://mycomic.com
- MyReadingManga — https://myreadingmanga.info
- nHentai.com (unoriginal) — https://nhentai.com
- NHentai.to — https://nhentai.to
- NHentai.xxx — https://nhentai.xxx
- NNHanman — https://nnhanman.xyz
- PandaChaika — https://panda.chaika.moe
- Picacomic — https://manhuabika.com
- Pixiv — https://www.pixiv.net
- PornPics — https://www.pornpics.com
- Roumanwu — https://rouman5.com
- Rumanhua — https://m.rumanhua2.com
- SchaleNetwork — https://schale.network
- Shenshi Huisuo — https://www.hentaiclub.net
- Simply Hentai — https://www.simply-hentai.com
- Terra Historicus — https://comic.hypergryph.com
- Tongli — https://ebook.tongli.com.tw
- Toptoon.net — https://www.toptoon.net
- vomic — https://www.vomicmh.com
- WNACG — https://www.wn07.cfd
- XCOMIC — https://xcomic.me
- xkcd — https://xkcd.tw
- Yidan Girl — https://yidan9.club
- YKMH — https://www.ykmh.net
- Zaimanhua — https://manhua.zaimanhua.com
- Zazhimi — https://www.zazhimi.net
- Zerobyw — http://www.zerobyw33.com

### Arabe (75)

- 3asq — https://3asq.online
- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- Anyone Manga — https://anyonemanga.com
- Arab Hentai — https://arabhentai.net
- Arab Toons — https://arabtoons.net
- ArabManhwa — https://arabmanhwa.com
- Arabs Hentai — https://arabshentai.com
- ArbxComix — https://arbxcomix.com
- Area Manga — https://ar.kenmanga.com
- AriaToon — https://ariatoon.com
- Azora — https://azorafly.com
- Comic Verse — https://arcomixverse.blogspot.com
- Despair Manga — https://despair-manga.net
- Detective Conan Ar — https://manga.detectiveconanar.com
- Dilar — https://dilar.tube
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- Duskoryvile — https://duskoryvile.com
- Empire Webtoon — https://webtoonempire-bl.com
- EShadow — https://eshadow.net
- GlobalComix — https://globalcomix.com
- Goon Scans — https://goonscans.org
- Hentai Lek — https://hentailek.com
- Hentai Slayer — https://hentaislayer.net
- HentaiHand — https://hentaihand.com
- HentaiMan — https://hentaiman.net
- Hijala — https://hijala.com
- HizoManga — https://hizomanga.net
- Kagane — https://kagane.to
- Kawii Manga — https://kawaiimanga.org
- Lava Scans — https://lavascans.com
- Loner Translations — https://loner-tl.blogspot.com
- Lunar Manga — https://lunarx.to
- Manga Ai Land — https://manga-ai-land.blogspot.com
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- Manga Starz — https://starzmanga.com
- Manga Tales — https://www.mangatales.com
- MangaCloud — https://mangacloud.online
- MangaDar — https://mangadar.com
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- MangaHub — https://www.mangaxhentai.com
- Mangalek — https://mangalik.net
- Mangalink — https://link-manga.net
- MangaLionz — https://manga-lionz.org
- MangaSpark — https://sparkmanga.net
- MangaSwat — https://meshmanga.com
- MangaTek — https://mangatek.com
- MangaTime — https://mangatime.org
- MangaTuk — https://mangatuk.com
- Manhatic — https://manhatic.com
- Manhatok — https://manhatok.blogspot.com
- Manhuarm — https://manhuarmtl.com
- Murim — https://www.murim.site
- MyReadingManga — https://myreadingmanga.info
- NamiComi — https://namicomi.com
- NeverScans — https://neverscans.com
- nHentai.com (unoriginal) — https://nhentai.com
- Oduto — https://nb19u.blogspot.com
- Onma — https://onma.top
- Orca Manga — https://infinity896.blogspot.com
- PandaChaika — https://panda.chaika.moe
- Paradise BL — https://paradise-bl.com
- Rocks Manga — https://rocksmanga.com
- SayManhwa — https://saymanhwa.com
- StellarSaber — https://stellarsaber.pro
- Team X — https://olympustaff.com
- The Library of Ohara — https://thelibraryofohara.com
- XCOMIC — https://xcomic.me
- XSano Manga — https://www.xsano-manga.com
- Yokai — https://yokai-team.blogspot.com
- Yona Bar — https://yonaber.com
- YSK Comics — https://www.ysk-comics.com
- Yuri Moon Sub — https://yurimoonsub.blogspot.com

### Russe (57)

- 3Hentai — https://3hentai.net
- AComics — https://acomics.ru
- Akuma — https://akuma.moe
- AllHentai — https://20.allhen.online
- AstraManga — https://astramanga.org
- Com-X — https://ru.com-x.life
- Comic Fury — https://comicfury.com
- Desu — https://desu.uno
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- GlobalComix — https://globalcomix.com
- HenChan — https://xxl.hentaichan.live
- HentaiEnvy — https://hentaienvy.com
- HentaiEra — https://hentaiera.com
- HentaiHand — https://hentaihand.com
- HentaiLib — https://hentailib.me
- HentaiZap — https://hentaizap.com
- IMHentai — https://imhentai.xxx
- InkStory — https://inkstory.net
- Kagane — https://kagane.to
- League of Legends — https://universe.leagueoflegends.com/ru_ru/comic/
- Lunar Manga — https://lunarx.to
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MANGA Plus by SHUEISHA — https://mangaplus.shueisha.co.jp
- Manga-shi — https://manga-shi.org
- MangaBuff — https://mangabuff.ru
- MangaChan — https://im.manga-chan.me
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- Mangahub — https://mangahub.ru
- MangaLib — https://mangalib.me
- MangaMen — https://mangamen.com
- MangaPoisk — https://mangapoisk.me
- MintManga — https://2.mintmanga.one
- MyReadingManga — https://myreadingmanga.info
- NamiComi — https://namicomi.com
- Niadd — https://ru.niadd.com
- NineGrid — https://9grid.cc
- NovelCool — https://ru.novelcool.com
- Nude-Moon — https://nude-moon.org
- PandaChaika — https://panda.chaika.moe
- PureManga — https://v1.puremanga.me
- ReadManga — https://a.zazaza.me
- SeiManga — https://1.seimanga.me
- SelfManga — https://1.selfmanga.live
- Senkognito — https://senkuro.me
- Senkuro — https://senkuro.me
- Simply Hentai — https://www.simply-hentai.com
- SlashLib — https://slashlib.me
- Tomilo-lib — https://tomilo-lib.ru
- UniComics — https://unicomics.ru
- Usagi — https://web.usagi.one
- WaManga — https://wamanga.ru
- XCOMIC — https://xcomic.me
- xkcd — https://xkcd.ru
- YagamiProject — https://read.yagami.me
- YaoiChan — https://yaoi-chan.me

### Thaïlandais (48)

- 3Hentai — https://3hentai.net
- Cat300 — https://cat-300.com
- Doodmanga — https://www.doodmanga.com
- Doujin Moon — https://doujinmoon.com
- Doujin-Lc — https://doujin-lc.net
- DoujinZa — https://doujinza.com
- Ecchi-Doujin — https://ecchi-doujin.com
- Fin Manga — https://www.fin-manga.com
- GlobalComix — https://globalcomix.com
- Go Manga — https://www.go-manga.com
- God-Doujin — https://god-doujin.com
- HentaiHand — https://hentaihand.com
- Kagane — https://kagane.to
- Lunar Manga — https://lunarx.to
- Luscious — https://www.luscious.net
- Makimaaaaa — https://makimaaaaa.com
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MANGA Plus by SHUEISHA — https://mangaplus.shueisha.co.jp
- Manga-Lc — https://manga-lc.net
- Manga168 — https://manga1688.com
- MangaBlackCat — https://mangablackcat.com
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- MangaIsekaiThai — https://www.mangaisekaithai.net
- MangaKimi — https://www.mangakimi.com
- Mangastep — https://mangastep.com
- MangaToon (Limited) — https://mangatoon.mobi
- ManhuaBug — https://www.manhuabug.com
- ManhuaThai — https://www.manhuathai.com
- ManhwaBreakup — https://www.manhwabreakup.com
- MikuDoujin — https://miku-doujin.com
- NamiComi — https://namicomi.com
- Nekopost — https://www.nekopost.net
- Niceoppai — https://www.niceoppai.net
- NTR-Manga — https://www.ntr-manga.net
- OreManga — https://www.oremanga.net
- PandaChaika — https://panda.chaika.moe
- ReaperTrans — https://reapertrans.com
- SayManhwa — https://saymanhwa.com
- Singmanga — https://www.sing-manga.com
- Slow Manga — https://www.slow-manga.net
- Sodsaime — https://www.xn--l3c0azab5a2gta.com
- Speed Manga — https://speed-manga.net
- Tanuki-Manga — https://www.tanuki-manga.net
- ToomTam-Manga — https://toomtam-manga.com
- Webtoons.com — https://www.webtoons.com
- XCOMIC — https://xcomic.me

### Coréen (37)

- 11toon — https://www.11toon.com
- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- BlackToon — https://blacktoon.me
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- GlobalComix — https://globalcomix.com
- HDoujin — https://hdoujin.org
- HentaiEnvy — https://hentaienvy.com
- HentaiEra — https://hentaiera.com
- HentaiFox — https://hentaifox.com
- HentaiHand — https://hentaihand.com
- HentaiZap — https://hentaizap.com
- IMHentai — https://imhentai.xxx
- Kagane — https://kagane.to
- League of Legends — https://universe.leagueoflegends.com/ko_kr/comic/
- Lunar Manga — https://lunarx.to
- Luscious — https://www.luscious.net
- Manatoki — https://manatoki552.net
- Manga Ball — https://mangaball.com
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- MangaForFree.net — https://mangaforfree.net
- Manhwa18.cc — https://manhwa18.cc
- ManhwaClub.net — https://manhwaclub.net
- MyReadingManga — https://myreadingmanga.info
- NamiComi — https://namicomi.com
- Naver Comic — https://comic.naver.com
- nHentai.com (unoriginal) — https://nhentai.com
- NHentai.to — https://nhentai.to
- PandaChaika — https://panda.chaika.moe
- Pixiv — https://www.pixiv.net
- RawDEX — https://rawdex.net
- Simply Hentai — https://www.simply-hentai.com
- Toonkor — https://toonkor0.org
- Wolf.com — https://wfwf507.com
- XCOMIC — https://xcomic.me
- YellowNote — https://kr.xchina.co

### Italien (40)

- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- Anime GDR Club — http://www.agcscanlation.it
- Comic Fury — https://comicfury.com
- DDT Team — https://ddt.hastateam.com
- DigitalTeam — https://dgtread.com
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- GlobalComix — https://globalcomix.com
- GTO The Great Site — https://reader.gtothegreatsite.net
- Hasta Team — https://reader.hastateam.com
- HentaiArchive — https://www.hentai-archive.com
- HentaiFantasy — https://hentaifantasy.it
- HentaiHand — https://hentaihand.com
- Honeytoon — https://honeytoon.com
- Juin Jutsu Team Reader — https://www.juinjutsureader.ovh
- Kagane — https://kagane.to
- League of Legends — https://universe.leagueoflegends.com/it_it/comic/
- Lunar Manga — https://lunarx.to
- LupiTeam — https://lupiteam.net
- Luscious — https://www.luscious.net
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- Mangaworld — https://www.mangaworld.mx
- MangaworldAdult — https://www.mangaworldadult.net
- Manhuarm — https://manhuarmtl.com
- MyReadingManga — https://myreadingmanga.info
- NamiComi — https://namicomi.com
- Niadd — https://it.niadd.com
- NIFTeam — https://read-nifteam.info
- NovelCool — https://it.novelcool.com
- Phoenix Scans — https://www.phoenixscans.com
- Simply Hentai — https://www.simply-hentai.com
- The Library of Ohara — https://thelibraryofohara.com
- Toomics — https://global.toomics.com
- TuttoAnimeManga — https://tuttoanimemanga.net
- Walpurgi Scan — https://www.walpurgiscan.it
- XCOMIC — https://xcomic.me
- ZeurelScan — https://www.zeurelscan.com

### Allemand (32)

- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- Comic Fury — https://comicfury.com
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- GlobalComix — https://globalcomix.com
- HentaiEnvy — https://hentaienvy.com
- HentaiEra — https://hentaiera.com
- HentaiHand — https://hentaihand.com
- HentaiZap — https://hentaizap.com
- Honeytoon — https://honeytoon.com
- IMHentai — https://imhentai.xxx
- Kagane — https://kagane.to
- League of Legends — https://universe.leagueoflegends.com/de_de/comic/
- Lunar Manga — https://lunarx.to
- Luscious — https://www.luscious.net
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MANGA Plus by SHUEISHA — https://mangaplus.shueisha.co.jp
- Manga Tube — https://manga-tube.me
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- MyReadingManga — https://myreadingmanga.info
- NamiComi — https://namicomi.com
- Niadd — https://de.niadd.com
- NovelCool — https://de.novelcool.com
- Sandra and Woo — https://www.sandraandwoo.com
- SayManhwa — https://saymanhwa.com
- Simply Hentai — https://www.simply-hentai.com
- Tappytoon — https://www.tappytoon.com/de
- Toomics — https://global.toomics.com
- Webtoons.com — https://www.webtoons.com
- XCOMIC — https://xcomic.me

### Ukrainien (19)

- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- ComixTopia — https://comixtopia.in.ua
- DGManga — https://dgmanga.app
- Faust — https://faust-web.com
- GlobalComix — https://globalcomix.com
- HentaiHand — https://hentaihand.com
- HoneyManga — https://honey-manga.com.ua
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- MangaInUa — https://manga.in.ua
- Mangarama — https://mangarama.com.ua
- NamiComi — https://namicomi.com
- nHentai.com (unoriginal) — https://nhentai.com
- PandaChaika — https://panda.chaika.moe
- XCOMIC — https://xcomic.me
- Zenko — https://zenko.online

### Polonais (18)

- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- Comic Fury — https://comicfury.com
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- GlobalComix — https://globalcomix.com
- HentaiHand — https://hentaihand.com
- Kagane — https://kagane.to
- League of Legends — https://universe.leagueoflegends.com/pl_pl/comic/
- Lunar Manga — https://lunarx.to
- Magical Translators — https://mahoushoujobu.com
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- MangaHoNa — https://mangahona.pl
- NamiComi — https://namicomi.com
- Simply Hentai — https://www.simply-hentai.com
- XCOMIC — https://xcomic.me

### Portugais (17)

- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- GlobalComix — https://globalcomix.com
- Kagane — https://kagane.to
- Lunar Manga — https://lunarx.to
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- MangaFire — https://mangafire.to
- NamiComi — https://namicomi.com
- OniSaga — https://onisaga.com
- PandaChaika — https://panda.chaika.moe
- Revistas e Quadrinhos — https://revistasequadrinhos.com
- SayManhwa — https://saymanhwa.com
- Webcomics — https://webcomicsapp.com
- XCOMIC — https://xcomic.me

### Tchèque (14)

- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- Evil production — https://evil-manga.eu
- GlobalComix — https://globalcomix.com
- HentaiHand — https://hentaihand.com
- League of Legends — https://universe.leagueoflegends.com/cs_cz/comic/
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- nHentai.com (unoriginal) — https://nhentai.com
- PandaChaika — https://panda.chaika.moe
- XCOMIC — https://xcomic.me

### Finnois (14)

- 3Hentai — https://3hentai.net
- Comic Fury — https://comicfury.com
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- GlobalComix — https://globalcomix.com
- HentaiHand — https://hentaihand.com
- Lunar Manga — https://lunarx.to
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- nHentai.com (unoriginal) — https://nhentai.com
- PandaChaika — https://panda.chaika.moe
- XCOMIC — https://xcomic.me

### Bulgare (13)

- 3Hentai — https://3hentai.net
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- GlobalComix — https://globalcomix.com
- HentaiHand — https://hentaihand.com
- Lunar Manga — https://lunarx.to
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- nHentai.com (unoriginal) — https://nhentai.com
- Utsukushii — https://utsukushii-bg.com
- XCOMIC — https://xcomic.me

### Grec (12)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- GlobalComix — https://globalcomix.com
- HentaiHand — https://hentaihand.com
- League of Legends — https://universe.leagueoflegends.com/el_gr/comic/
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- nHentai.com (unoriginal) — https://nhentai.com
- PandaChaika — https://panda.chaika.moe
- XCOMIC — https://xcomic.me

### Hongrois (12)

- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- GlobalComix — https://globalcomix.com
- HentaiHand — https://hentaihand.com
- League of Legends — https://universe.leagueoflegends.com/hu_hu/comic/
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### Néerlandais (12)

- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- GlobalComix — https://globalcomix.com
- HentaiHand — https://hentaihand.com
- Lunar Manga — https://lunarx.to
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### es-419 (11)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- Kagane — https://kagane.to
- League of Legends — https://universe.leagueoflegends.com/es_mx/comic/
- Lunar Manga — https://lunarx.to
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- MangaFire — https://mangafire.to
- NamiComi — https://namicomi.com
- OniSaga — https://onisaga.com
- Toomics — https://global.toomics.com
- XCOMIC — https://xcomic.me

### Hindi (11)

- Akuma — https://akuma.moe
- GlobalComix — https://globalcomix.com
- HentaiHand — https://hentaihand.com
- Kagane — https://kagane.to
- Lunar Manga — https://lunarx.to
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### zh-Hant (11)

- Creative Comic Collection — https://www.creative-comic.tw
- GlobalComix — https://globalcomix.com
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- NoyAcg — https://api.noyteam.online
- SayManhwa — https://saymanhwa.com
- Toomics — https://global.toomics.com
- Webtoons.com — https://www.webtoons.com
- XCOMIC — https://xcomic.me
- YellowNote — https://tw.xchina.co

### Catalan (10)

- Akuma — https://akuma.moe
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- Fansubs.cat — https://manga.fansubs.cat
- Hentai.cat — https://manga.hentai.cat
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### Danois (10)

- Akuma — https://akuma.moe
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- GlobalComix — https://globalcomix.com
- Lunar Manga — https://lunarx.to
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### zh-Hans (10)

- Dongman Manhua — https://www.dongmanmanhua.cn
- GlobalComix — https://globalcomix.com
- Iqiyi — https://bud.m.iqiyi.com
- Kuaikanmanhua — https://www.kuaikanmanhua.com
- MangaDex — https://mangadex.org
- NamiComi — https://namicomi.com
- SayManhwa — https://saymanhwa.com
- Tencent Comics (ac.qq.com) — https://m.ac.qq.com
- Toomics — https://global.toomics.com
- YellowNote — https://xchina.co

### Hébreu (9)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- GlobalComix — https://globalcomix.com
- Lunar Manga — https://lunarx.to
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### Norvégien (9)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- GlobalComix — https://globalcomix.com
- Lunar Manga — https://lunarx.to
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### Roumain (9)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- GlobalComix — https://globalcomix.com
- League of Legends — https://universe.leagueoflegends.com/ro_ro/comic/
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- nHentai.com (unoriginal) — https://nhentai.com
- XCOMIC — https://xcomic.me

### sk (9)

- GlobalComix — https://globalcomix.com
- HentaiHand — https://hentaihand.com
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- nHentai.com (unoriginal) — https://nhentai.com
- XCOMIC — https://xcomic.me

### Suédois (9)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- GlobalComix — https://globalcomix.com
- Lunar Manga — https://lunarx.to
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### jv (8)

- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- HentaiHand — https://hentaihand.com
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- nHentai.com (unoriginal) — https://nhentai.com
- PandaChaika — https://panda.chaika.moe
- XCOMIC — https://xcomic.me

### Latin (8)

- 3Hentai — https://3hentai.net
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- HentaiHand — https://hentaihand.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- nHentai.com (unoriginal) — https://nhentai.com
- XCOMIC — https://xcomic.me

### Malais (8)

- GlobalComix — https://globalcomix.com
- Lunar Manga — https://lunarx.to
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### other (7)

- Comic Fury — https://comicfury.com
- Cubari — https://cubari.moe
- FoolSlide Customizable — https://127.0.0.1
- HentaiHand — https://hentaihand.com
- Luscious — https://www.luscious.net
- nHentai.com (unoriginal) — https://nhentai.com
- XCOMIC — https://xcomic.me

### Persan (7)

- GlobalComix — https://globalcomix.com
- Lunar Manga — https://lunarx.to
- Manga Ball — https://mangaball.com
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### sr (7)

- HentaiHand — https://hentaihand.com
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- nHentai.com (unoriginal) — https://nhentai.com
- XCOMIC — https://xcomic.me

### Filipino (7)

- 3Hentai — https://3hentai.net
- HentaiHand — https://hentaihand.com
- Lunar Manga — https://lunarx.to
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- nHentai.com (unoriginal) — https://nhentai.com
- PandaChaika — https://panda.chaika.moe

### Bengali (6)

- GlobalComix — https://globalcomix.com
- Lunar Manga — https://lunarx.to
- Manga Ball — https://mangaball.com
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### ceb (6)

- Akuma — https://akuma.moe
- HentaiHand — https://hentaihand.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- nHentai.com (unoriginal) — https://nhentai.com
- XCOMIC — https://xcomic.me

### eo (6)

- Akuma — https://akuma.moe
- HentaiHand — https://hentaihand.com
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- nHentai.com (unoriginal) — https://nhentai.com
- XCOMIC — https://xcomic.me

### et (6)

- Akuma — https://akuma.moe
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### fil (6)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- GlobalComix — https://globalcomix.com
- MangaDex — https://mangadex.org
- NamiComi — https://namicomi.com
- SayManhwa — https://saymanhwa.com
- XCOMIC — https://xcomic.me

### ga (6)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### hr (6)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### is (6)

- 3Hentai — https://3hentai.net
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### Lituanien (6)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### Mongol (6)

- HentaiHand — https://hentaihand.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- nHentai.com (unoriginal) — https://nhentai.com
- XCOMIC — https://xcomic.me

### Népalais (6)

- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### sl (6)

- GlobalComix — https://globalcomix.com
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### Tamil (6)

- GlobalComix — https://globalcomix.com
- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### eu (5)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### Birman (5)

- 3Hentai — https://3hentai.net
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### sq (5)

- GlobalComix — https://globalcomix.com
- Manga Ball — https://mangaball.com
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### ur (5)

- GlobalComix — https://globalcomix.com
- Lunar Manga — https://lunarx.to
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### af (4)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### be (4)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### ka (4)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### kn (4)

- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### lv (4)

- GlobalComix — https://globalcomix.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### ml (4)

- Manga Ball — https://mangaball.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### te (4)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### am (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### az (3)

- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### cv (3)

- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### gl (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### gn (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### gu (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### hy (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### ig (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### Kazakh (3)

- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### km (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### lb (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### lo (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### mg (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### mi (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### mk (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### mo (3)

- 3Hentai — https://3hentai.net
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### mr (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### mt (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### ny (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### sd (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### si (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### sm (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### sn (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### sw (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### uz (3)

- MangaDex — https://mangadex.org
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### yo (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### zu (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### ab (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### bs (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### fo (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### ha (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### ht (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### ku (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### ky (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### pa (2)

- Manga Million — https://mangamillion.shueisha.co.jp
- NamiComi — https://namicomi.com

### ps (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### rm (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### Serbe-Croate (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### so (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### ss (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### st (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### tg (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### ti (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### tk (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### to (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### zh-tw (2)

- MangaDot — https://mangadot.net
- Pixiv — https://www.pixiv.net

### as (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### bho (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### bo (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### br (1)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com

### cnr (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### co (1)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com

### cy (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### doi (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### dv (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### ee (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### es-AR (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### es-MX (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### haw (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### hmn (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### ilo (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### ko-KR (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### kok (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### lg (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### lmo (1)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com

### ln (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### lus (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### mai (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### mni (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### mww (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### nso (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### or (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### qu (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### ro-MD (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### rw (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### sa (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### ts (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### vec (1)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com

### xh (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### yi (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### zh-CN (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### zh-HK (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### zh-TW (1)

- Manga Million — https://mangamillion.shueisha.co.jp

---

## 3. Mihon les a, nous non (extensions manquantes)

**Total : 1941 sources manquantes**, soit 1232 extensions distinctes Keiyoushi absentes de notre catalogue.

| Langue | Sources manquantes |
|---|---:|
| Anglais (`en`) | 418 |
| Japonais (`ja`) | 151 |
| Espagnol (`es`) | 146 |
| pt-BR (`pt-BR`) | 130 |
| Indonésien (`id`) | 99 |
| Vietnamien (`vi`) | 90 |
| Turc (`tr`) | 87 |
| Toutes langues (`all`) | 74 |
| Chinois (`zh`) | 63 |
| Russe (`ru`) | 49 |
| Arabe (`ar`) | 42 |
| Thaïlandais (`th`) | 40 |
| Italien (`it`) | 33 |
| Français (`fr`) | 32 |
| Coréen (`ko`) | 30 |
| Allemand (`de`) | 23 |
| Ukrainien (`uk`) | 15 |
| Polonais (`pl`) | 14 |
| Portugais (`pt`) | 13 |
| Tchèque (`cs`) | 10 |
| Hongrois (`hu`) | 9 |
| Finnois (`fi`) | 9 |
| Catalan (`ca`) | 8 |
| Néerlandais (`nl`) | 8 |
| Bulgare (`bg`) | 8 |
| Grec (`el`) | 8 |
| Hindi (`hi`) | 7 |
| es-419 (`es-419`) | 7 |
| zh-Hans (`zh-Hans`) | 7 |
| zh-Hant (`zh-Hant`) | 7 |
| jv (`jv`) | 6 |
| Danois (`da`) | 6 |
| Latin (`la`) | 6 |
| ceb (`ceb`) | 5 |
| et (`et`) | 5 |
| other (`other`) | 5 |
| ga (`ga`) | 5 |
| Norvégien (`no`) | 5 |
| Roumain (`ro`) | 5 |
| Lituanien (`lt`) | 5 |
| hr (`hr`) | 5 |
| Hébreu (`he`) | 5 |
| Suédois (`sv`) | 5 |
| Filipino (`tl`) | 5 |
| is (`is`) | 5 |
| sk (`sk`) | 5 |
| eo (`eo`) | 4 |
| eu (`eu`) | 4 |
| fil (`fil`) | 4 |
| Birman (`my`) | 4 |
| sr (`sr`) | 4 |
| Mongol (`mn`) | 4 |
| Malais (`ms`) | 4 |
| Népalais (`ne`) | 4 |
| sl (`sl`) | 4 |
| mo (`mo`) | 3 |
| km (`km`) | 3 |
| zu (`zu`) | 3 |
| af (`af`) | 3 |
| am (`am`) | 3 |
| be (`be`) | 3 |
| gl (`gl`) | 3 |
| gn (`gn`) | 3 |
| gu (`gu`) | 3 |
| hy (`hy`) | 3 |
| ig (`ig`) | 3 |
| ka (`ka`) | 3 |
| kn (`kn`) | 3 |
| lb (`lb`) | 3 |
| lo (`lo`) | 3 |
| lv (`lv`) | 3 |
| mg (`mg`) | 3 |
| mi (`mi`) | 3 |
| mk (`mk`) | 3 |
| ml (`ml`) | 3 |
| mr (`mr`) | 3 |
| mt (`mt`) | 3 |
| ny (`ny`) | 3 |
| sd (`sd`) | 3 |
| si (`si`) | 3 |
| sm (`sm`) | 3 |
| sn (`sn`) | 3 |
| sw (`sw`) | 3 |
| Tamil (`ta`) | 3 |
| te (`te`) | 3 |
| yo (`yo`) | 3 |
| Persan (`fa`) | 3 |
| pa (`pa`) | 2 |
| zh-tw (`zh-tw`) | 2 |
| ab (`ab`) | 2 |
| sq (`sq`) | 2 |
| az (`az`) | 2 |
| Bengali (`bn`) | 2 |
| bs (`bs`) | 2 |
| cv (`cv`) | 2 |
| fo (`fo`) | 2 |
| ht (`ht`) | 2 |
| ha (`ha`) | 2 |
| Kazakh (`kk`) | 2 |
| ku (`ku`) | 2 |
| ky (`ky`) | 2 |
| ps (`ps`) | 2 |
| rm (`rm`) | 2 |
| Serbe-Croate (`sh`) | 2 |
| ss (`ss`) | 2 |
| st (`st`) | 2 |
| so (`so`) | 2 |
| tg (`tg`) | 2 |
| ti (`ti`) | 2 |
| to (`to`) | 2 |
| tk (`tk`) | 2 |
| ur (`ur`) | 2 |
| uz (`uz`) | 2 |
| co (`co`) | 1 |
| br (`br`) | 1 |
| vec (`vec`) | 1 |
| lmo (`lmo`) | 1 |
| zh-TW (`zh-TW`) | 1 |
| ko-KR (`ko-KR`) | 1 |
| es-MX (`es-MX`) | 1 |
| zh-CN (`zh-CN`) | 1 |
| es-AR (`es-AR`) | 1 |
| zh-HK (`zh-HK`) | 1 |
| as (`as`) | 1 |
| bho (`bho`) | 1 |
| bo (`bo`) | 1 |
| cnr (`cnr`) | 1 |
| cy (`cy`) | 1 |
| doi (`doi`) | 1 |
| dv (`dv`) | 1 |
| ee (`ee`) | 1 |
| haw (`haw`) | 1 |
| hmn (`hmn`) | 1 |
| ilo (`ilo`) | 1 |
| kok (`kok`) | 1 |
| lg (`lg`) | 1 |
| ln (`ln`) | 1 |
| lus (`lus`) | 1 |
| mai (`mai`) | 1 |
| mni (`mni`) | 1 |
| mww (`mww`) | 1 |
| nso (`nso`) | 1 |
| or (`or`) | 1 |
| qu (`qu`) | 1 |
| ro-MD (`ro-MD`) | 1 |
| rw (`rw`) | 1 |
| sa (`sa`) | 1 |
| ts (`ts`) | 1 |
| xh (`xh`) | 1 |
| yi (`yi`) | 1 |

### Anglais (418)

- 18 Porn Comic — https://18porncomic.com
- 1Manga.co — https://1manga.co
- 3Hentai — https://3hentai.net
- 8Muses — https://comics.8muses.com
- Akai Comic — https://akaicomic.org
- Akaza Scans — https://akazascans.org
- Akuma — https://akuma.moe
- Alandal — https://alandal.com
- AllPornComic — https://allporncomic.com
- AllPornComic.io — https://allporncomic.io
- Alpha Manga — https://www.alpha-manga.com
- Anisa Scans — https://anisascans.in
- AP Comics — https://apcomics.org
- Aqua Manga — https://aquareader.org
- Arc-Relight — https://arc-relight.com
- Arena Scans — https://arenascan.com
- Art Lapsa — https://artlapsa.com
- AsiaToon — https://asiatoon.net
- Asmodeus Scans — https://asmotoon.com
- Assorted Scans — https://assortedscans.com
- Aster Scans — https://asterscans.com
- Athrea Scans — https://athreascans.com
- Aurora — https://comicaurora.com
- Bakkin — https://bakkin.moe/reader/
- Bakkin Self-hosted — http://127.0.0.1/
- BatCave — https://batcave.biz
- Battle In 5 Seconds After Meeting — https://www.deatte5.com
- Bbato — https://bato1.com
- BookWalker — https://bookwalker.com
- Borat Scans — https://boratscans.com
- BrainRotComics — https://brainrotcomics.com
- Broccoli Soup — https://politeandgood.com
- Bun Manga — https://bunmanga.com
- Buttsmithy — https://incase.buttsmithy.com
- Clone Manga — https://manga.clone-army.org
- Clown Corps — https://clowncorps.net
- Cocomic — https://cocomic.co
- Collected Curios — https://www.collectedcurios.com
- Colorized Mangas — https://colorizedmangas.com
- Comic Asura — https://comicasura.net
- Comic CX — https://comic.cx
- Comic Fury — https://comicfury.com
- ComicHubFree — https://comichubfree.com
- ComicK Fanmade — https://comickfan.com
- ComicLand — https://comicland.org
- Comics Kingdom — https://wp.comicskingdom.com
- Comikey — https://comikey.com
- Comivex — https://comivex.com
- Commit Strip — https://www.commitstrip.com
- Cucumber Manga — https://cucumbermanga.com
- CulturedWorks — https://culturedworks.com
- Cutie Comics — https://cutiecomics.com
- Cyanide & Happiness — https://explosm.net
- Danke fürs Lesen — https://danke.moe
- Dark Legacy Comics — https://www.darklegacycomics.com
- Dark Science — https://dresdencodak.com
- Darths & Droids — https://www.darthsanddroids.net
- Death Toll Scans — https://reader.deathtollscans.net
- Decadence Scans — https://reader.decadencescans.com
- DFlowScans — https://dflow.alwaysdata.net
- Digital Comic Museum — https://digitalcomicmuseum.com
- Doujin.io - J18 — https://doujin.io
- Doujins — https://doujins.com
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- DragonTea — https://dragontea.ink
- Drake Scans — https://drakecomic.net
- Dusk Scans — https://duskscans.com
- Eggporncomics — https://eggporncomics.com
- El Goonish Shive — https://www.egscomics.com
- Elan School — https://elan.school
- Elf Toon — https://elftoon.com
- emaqi — https://emaqi.com
- Eris Scans — https://erisscans.com
- Ero18x — https://ero18x.com
- Erofus — https://www.erofus.com
- Eva Scans — https://evascans.net
- Existential Comics — https://existentialcomics.com
- EZmanga — https://ezmanga.org
- Fairy Scans — https://fairyscans.org
- Frieren Online — https://www.frieren.online
- GakaMangas — https://gakamangas.com
- Galaxy Manga — https://galaxymanga.io
- GalaxyDegenScans — https://gdscans.com
- GEDE Comix — https://gedecomix.com
- Gensura — https://gensura.net
- Genz Toons — https://genztoons.org
- GingeRTooN — https://gingertoon.com
- GirlsTop — https://en.girlstop.info
- Gone with the Blastwave — https://www.blastwave-comic.com
- Gourmet Scans — https://gourmetsupremacy.com
- Greed Scans — https://gojoscans.com
- Grim Scans — https://grimscans.com
- Grrl Power Comic — https://www.grrlpowercomic.com
- Gunnerkrigg Court — https://www.gunnerkrigg.com
- Guya — https://guya.cubari.moe
- Hachirumi — https://hachirumi.com
- Hades Scans — https://hadesscans.com
- HDoujin — https://hdoujin.org
- Hennojin — https://hennojin.com
- Hentai3z.CC — https://hentai3z.cc
- Hentai4Free — https://hentai4free.net
- HentaiEnvy — https://hentaienvy.com
- HentaiEra — https://hentaiera.com
- HentaiHand — https://hentaihand.com
- HentaiHere — https://hentaihere.com
- HentaiKisu — https://hentaikisu.com
- HentaiKun — https://hentaikun.com
- HentaiNexus — https://hentainexus.com
- HentaiRead — https://hentairead.com
- HentaiRead.io — https://hentairead.io
- HentaiRox — https://hentairox.com
- HentaiSco — https://hentaisco.cc
- HentaiTnT — https://hentaitnt.net
- HentaiXComic — https://hentaixcomic.com
- HentaiXDickgirl — https://hentaixdickgirl.com
- HentaiXYuri — https://hentaixyuri.com
- HentaiZap — https://hentaizap.com
- Hentara — https://hentara.com
- Hijala Scans — https://en-hijala.com
- Hiveworks Comics — https://hiveworkscomics.com
- HM2D — https://doujindistrict.com
- HOLONOMETRIA — https://holoearth.com
- Honeytoon — https://honeytoon.com
- Honkai Impact 3rd — https://manga.honkaiimpact3.com
- HotComics — https://hotcomics.me
- Hunlight Comics — https://hunlightcomics.com
- Hyakuro Translations — https://hyakuro.net
- I Roved Out — https://www.irovedout.com
- I'm An Evil God — https://imanevilgod.com
- InfinityScans — https://infinityscans.org
- INKR — https://comics.inkr.com
- izneo — https://www.izneo.com/en/webtoon
- J-Novel — https://j-novel.club
- Jinmangas — https://jinmangas.com
- K Manga — https://kmanga.kodansha.com
- Kagane — https://kagane.to
- Kaizen Scan — https://kaizenscan.com
- KaliScan — https://kaliscan.com
- Kappa Beast — https://kappabeast.com
- Kayn Scans — https://kaynscans.com
- Keenspot TwoKinds — https://twokinds.keenspot.com
- Ken Scans — https://kencomics.com
- Kewn Scans — https://kewnscans.org
- KillSixBillionDemons — https://killsixbilliondemons.com
- KingComiX — https://kingcomix.com
- Kissmanga.in — https://kissmanga.in
- Kodansha — https://kodansha.us
- KokoMangas — https://kokomangas.com
- KSGroupScans — https://ksgroupscans.com
- Kun Manga Online — https://www.kunmanga.online
- KuraManga — https://kuramanga.com
- Lagoon Scans — https://lagoonscans.com
- League of Legends — https://universe.leagueoflegends.com/en_us/comic/
- Leslie&Victims — https://leslie-victims.pages.dev
- LHTranslation — https://lhtranslation.net
- LinkManga — https://linkmanga.com
- Loading Artist — https://loadingartist.com
- LoLoBun — https://www.lolobun.com
- Lua Scans — https://luacomic.org
- Luminare Translations — https://luminaretranslations.com
- Luna Toons — https://lunatoons.org
- LustToon — https://lustoon.com
- Madara Scans — https://madarascans.org
- MadaraDex — https://madaradex.org
- Madokami — https://manga.madokami.al
- Magical Translators — https://mahoushoujobu.com
- Magus Manga — https://magustoon.org
- Mahouirexnohentaikarte — https://mahouirexnohentaikarte.com
- Manga 18x — https://manga18x.net
- Manga Dass — https://mangadass.com
- Manga Demon — https://demonicscans.org
- Manga District — https://mangadistrict.com
- Manga Drama — https://mangadrama.com
- Manga Kiss — https://mangakiss.org
- Manga Million — https://mangamillion.shueisha.co.jp
- Manga Mirai — https://mangamirai.com
- MANGA Plus Creators by SHUEISHA — https://mangaplus-creators.jp
- Manga Trend — https://mangatrend.org
- Manga UP! — https://global.manga-up.com
- Manga-Bay — https://manga-bay.biz
- Manga.uno — https://manga.uno
- Manga18.Club — https://manga18.club
- Manga18.me — https://manga18.me
- Manga18Free — https://manga18free.com
- Manga18fx — https://manga18fx.com
- Mangabat — https://www.mangabats.com
- MangaBolt — https://mangabolt.com
- Mangack — https://mangack.com
- MangaDE — https://mangade.io
- MangaDia — https://mangadia.com
- MangaDot — https://mangadot.net
- Mangafree — https://mangafree.info
- MangaGeko — https://www.mgeko.cc
- MangaGG — https://mangagg.com
- Mangago — https://www.mangago.me
- MangaHe — https://mangahe.com
- Mangahere — https://www.mangahere.cc
- MangaHere.onl — https://mangahere.onl
- MangaK — https://mangak.io
- MangaKa — https://mangaka.cc
- MangaLix — https://mangalix.com
- MangaManiacs — https://mangamaniacs.org
- MangaMelon — https://mangamelon.com
- Mangamo — https://www.mangamo.com
- Manganato — https://www.natomanga.com
- MangaNel — https://manganel.me
- MangaNow — https://manganow.to
- MangaOnline.fun — https://mangaonline.fun
- MangaOwl.io (unoriginal) — https://mangaowl.io
- MangaPanda.onl — https://mangapanda.onl
- MANGAPDF — https://mangapdf.org
- MangaPlaza — https://mangaplaza.com
- MangaRead.org — https://www.mangaread.org
- MangaReader.in — https://mangareader.in
- MangaReader.site — https://mangareader.site
- Mangasushi — https://mangasushi.org
- Mangatellers — https://reader.mangatellers.gr
- MangaToday — https://mangatoday.fun
- Mangatown — https://www.mangatown.com
- MangaTX — https://mangatx.cc
- MangaYi — https://mangayi.com
- MangaYY — https://mangayy.org
- Mango — http://127.0.0.1:9000
- Manhua Plus — https://manhuaplus.com
- Manhua Rush — https://manhuarush.vercel.app
- Manhua Zonghe — https://www.manhuazonghe.com
- ManhuaHot — https://manhuahot.com
- Manhuanext — https://manhuanext.com
- ManhuaPlus (Unoriginal) — https://manhuaplus.org
- Manhuarm — https://manhuarmtl.com
- ManhuaTop — https://manhuatop.org
- ManhuaUS — https://manhuaus.com
- Manhwa Comics — https://manhwacomics.com
- Manhwa Reads — https://manhwareads.com
- Manhwa Toon — https://www.manhwatoon.me
- Manhwa68 — https://manhwa68.com
- ManhwaBuddy — https://manhwabuddy.com
- ManhwaClub.net — https://manhwaclub.net
- ManhwaDen — https://www.manhwaden.com
- ManhwaGet — https://manhwaget.com
- ManhwaHub — https://manhwahub.net
- Manhwalike — https://manhwalike.com
- ManhwaManhua — https://manhwamanhua.com
- ManhwaNex — https://manhwanex.com
- ManhwaRead — https://manhwaread.com
- Manhwatop — https://manhwatop.com
- ManhwaZone — https://manhwazone.com
- Manta — https://manta.net/en
- MayoTune — https://mayochuu.xyz
- Megatokyo — https://megatokyo.com
- Mehgazone — https://mehgazone.com
- MeiToon — https://meitoon.org
- Mgread.io — https://mgread.io
- Milftoon — https://milftoon.xxx
- Mist Scans — https://mistscans.com
- MLBB Lore Comics — https://play.mobilelegends.com
- Monochrome Custom — https://monochromecms.netlify.app
- Monochrome Scans — https://manga.d34d.one
- MurimScan — https://www.murimscans.site
- MyAdultComics — https://myadultcomics.com
- MyHentaiComics — https://myhentaicomics.com
- MyHentaiGallery — https://myhentaigallery.com
- MyReadingManga — https://myreadingmanga.info
- NamiComi — https://namicomi.com
- New Manhwa — https://saymanhwa.com
- NexComic — https://nexcomic.com
- Niadd — https://www.niadd.com
- NineAnime — https://www.nineanime.com
- NineHentai — https://9hentai.so
- Ninekon — https://app.ninekon.com
- NixManga — https://nixmanga.com
- NovelCool — https://www.novelcool.com
- Nuvia Toon — https://nuviatoon.com
- Nux Scans — https://nuxscans-comics.blogspot.com
- Nyanu Kafe — https://nyanukafe.com
- Nyra Scans — https://nyrascans.com
- Nyx Scans — https://nyxscans.com
- OctopusManga — https://octopusmanga.com
- Oglaf — https://www.oglaf.com
- Oh Joy Sex Toy — https://www.ohjoysextoy.com
- Omega Scans — https://omegascans.org
- Omoi — https://www.omoi.com
- One Piece Fans — https://one-piece-fans2.com
- One Punch Man Online — https://1punchman.com
- OneManga.info — https://onemanga.info
- OniSaga — https://onisaga.com
- Only The Best Hentai — https://onlythebesthentai.com
- Oppai Stream — https://read.oppai.stream
- Orchisasia — https://www.orchisasia.org
- Orion Scans — https://orion-scans.com
- PandaChaika — https://panda.chaika.moe
- Paradise Scans — https://paradisescans.com
- Paritehaber — https://www.paritehaber.com
- Patch Friday — https://patchfriday.com
- Petrotechsociety — https://www.petrotechsociety.org
- Philia Scans — https://philiascans.org
- Pixiv — https://www.pixiv.net
- PornComix — https://bestporncomix.com
- Pornhwa18 — https://pornhwa18.com
- PornPics — https://www.pornpics.com
- QiScans — https://qimanga.com
- Questionable Content — https://www.questionablecontent.net
- Rackus — https://rackusreads.com
- Rage Scans — https://ragescans.com
- Randowiz — https://randowis.com
- Raven Scans — https://ravenscans.org
- Razure — https://razure.org
- Read Attack on Titan Shingeki no Kyojin Manga — https://ww12.readsnk.com
- Read Berserk Manga — https://readberserk.com
- Read Black Clover Manga Online — https://ww10.readblackclover.com
- Read Chainsaw Man Manga Online — https://ww6.readchainsawman.com
- Read Comics Online — https://readcomicsonline.ru
- Read Fairy Tail & Edens Zero Manga Online — https://ww9.readfairytail.com
- Read Horimiya Online — https://read-horimiya.online
- Read Jujutsu Kaisen Manga Online — https://ww6.readjujutsukaisen.com
- Read Kingdom Manga Online — https://ww6.readkingdom.com
- Read Nanatsu no Taizai 7 Deadly Sins Manga Online — https://ww8.read7deadlysins.com
- Read One Piece Manga Online — https://ww13.readonepiece.com
- Read One-Punch Man Manga Online — https://ww7.readopm.com
- Read Solo Leveling Manga Manhwa Online — https://ww4.readsololeveling.org
- Read Tokyo Ghoul Re & Tokyo Ghoul Manga Online — https://ww12.tokyoghoulre.com
- Read Vagabond Manga — https://readbagabondo.com
- ReadAllComics — https://readallcomics.com
- Real Life Comics — https://reallifecomics.com
- ReiManga — https://reimanga.net
- Renascans — https://renascans.net
- Revival Scans — https://www.revivalscans.com
- Rinko Comics — https://rinkocomics.com
- RitharScans — https://ritharscans.com
- Rizz Comic — https://rizzfables.com
- Rizz Comic (unoriginal) — https://rizzcomic.com
- RokariComics — https://rokaricomics.com
- Rolia Scan — https://roliascan.com
- Rose Squad Scans — https://rosesquadscans.aishiteru.org
- S2Manga — https://s2read.com
- Sabrina Online — https://www.sabrina-online.com
- SACACHISPA — https://sacachispa.site
- Sana Scans — https://sanascans.com
- Sandra and Woo — https://www.sandraandwoo.com
- Saturday Morning Breakfast Comics — https://smbc-comics.com
- SayManhwa — https://saymanhwa.com
- ScansGG — https://scans.gg
- SchaleNetwork — https://schale.network
- Schlock Mercenary — https://www.schlockmercenary.com
- Scythe Scans — https://scythescans.com
- SeraphicDeviltry — https://seraphic-deviltry.com
- Setsu Scans — https://setsuscans.com
- SilentQuill — https://silentquill.net
- Simply Hentai — https://www.simply-hentai.com
- Sleepy Translations — https://sleepytranslations.com
- Solar and Sundry — https://sas-api.fly.dev
- Spmanhwa — https://spmanhwa.online
- SpyFakku — https://hentalk.pw
- StoneScape — https://stonescape.xyz
- Sunshine Butterfly Scans — https://wings.sbs
- SUPER MEGA — https://www.supermegacomics.com
- Swords Comic — https://swordscomic.com
- Tapas — https://tapas.io
- Tappytoon — https://www.tappytoon.com/en
- TCB Scans — https://tcbonepiecechapters.com
- Team Shadowi — https://www.team-shadowi.com
- Temple Scan — https://templetoons.com
- The Blank — https://theblank.net
- The Duck Webcomics — https://www.theduckwebcomics.com
- The Girl from Random Chatting Manga Online — https://thegirlfromrandomchatting.com
- The Library of Ohara — https://thelibraryofohara.com
- The Order Of The Stick (OOTS) — https://www.giantitp.com
- The Property of Hate — https://jolleycomics.com
- Thunder Scans — https://en-thunderscans.com
- TimelessToons — https://timelesstoons.org
- TodayManga — https://todaymanga.com
- ToonGod — https://www.toongod.org
- ToonHey — https://toonhey.com
- Toonily — https://toonily.com
- Toonily.me — https://toontop.io
- Toonizy — https://toonizy.com
- Toonz — https://toonz.to
- Top Manhua — https://mangatop.org
- TopManhua.fan — https://www.topmanhua.fan
- TopManhua.net — https://topmanhua.net
- TritiniaScans — https://tritinia.org
- Valir Scans — https://valirscans.org
- Vanilla Scans — https://vanillascans.org
- vgperson — https://vgperson.com
- Vinnie Veritas - CCC — https://ccc.vinnieveritas.com
- Violet Scans — https://violetscans.org
- Vision Haze — https://www.visionhaze.com
- Vixen Logic — https://www.vixenlogic.com
- VIZ Manga — https://www.viz.com
- VIZ Shonen Jump — https://www.viz.com
- Vortex Scans — https://vortexscans.org
- VoyceMe — https://www.voyce.me
- VyvyManga — https://mangavyvy.net
- War For Rayuba — https://xrabohrok.github.io/WarMap/#/
- Webcomics — https://webcomicsapp.com
- Webdex Scans — https://webdexscans.com
- WebNovel — https://www.webnovel.com
- WebtoonScan — https://webtoonscan.com
- WebtoonXYZ — https://www.webtoon.xyz
- WitchScans — https://witchtoons.net
- WoopRead — https://woopread.com
- Writer Scans — https://writerscans.com
- WuxiaWorld — https://wuxiaworld.site
- XCOMIC — https://xcomic.me
- xkcd — https://xkcd.com
- XlecX — https://xlecx.one
- XoManga — https://www.xomanga.site
- XOXO Comics — https://xoxocomic.com
- XYZ Comics — https://xyzcomics.com
- YakshaComics — https://yakshacomics.com
- YaoiHot — https://yaoihot.com
- Yaoihub — https://yaoihub.org
- Yorai — https://yorai.io
- YSK Comics — https://www.ysk-comics.com
- Zazamanga — https://www.zazamanga.com
- Zinmanga — https://mangazin.org
- Zinmanga.net — https://www.zinmanga.net
- 小黄书 — https://en.xchina.co

### Japonais (151)

- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- Alphapolis — https://www.alphapolis.co.jp
- Ameba Manga — https://dokusho-ojikan.jp
- Asacomi — https://asacomi.jp
- Bibibi Comic — https://bibibi-comic.com
- Big Comics — https://bigcomics.jp
- Booklista Studio — https://studio.booklista.co.jp
- BookWalker Japan — https://bookwalker.jp
- C'moA — https://www.cmoa.jp
- Champion Cross — https://championcross.jp
- Ciao Plus — https://ciao.shogakukan.co.jp
- Comic Boost — https://comic-boost.com
- Comic Border — https://comicborder.com
- Comic Days — https://comic-days.com
- Comic Earth Star — https://comic-earthstar.com
- Comic Festa — https://comic.iowl.jp
- Comic Fury — https://comicfury.com
- COMIC FUZ — https://comic-fuz.com
- Comic Gardo — https://comic-gardo.com
- Comic Grast — https://novema.jp
- Comic Nettai — https://www.comicnettai.com
- Comic Pash — https://comicpash.jp
- Comic Ride — https://comicride.jp
- Comic Room Base — https://comic-room-base.com
- Comic Ryu — https://comic-ryu.jp
- Comic Y-OURs — https://comic-y-ours.com
- Comirela — https://comirela.com
- Corocoro Online — https://www.corocoro.jp
- Corona EX — https://to-corona-ex.com
- CyComi — https://cycomi.com
- DMM — https://book.dmm.com
- Docomo — https://dbook.docomo.ne.jp
- Dokiraw — https://dokiraw.click
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- DreComi+ — https://drecomi-plus.jp
- eBookJapan — https://ebookjapan.yahoo.co.jp
- FANZA — https://book.dmm.co.jp
- FireCross — https://firecross.jp
- Flower Comics — https://flowercomics.jp
- FOD — https://manga.fod.fujitv.co.jp
- G-Comi — https://g-comi.jp
- Gangan Online — https://www.ganganonline.com
- GANMA! — https://ganma.jp
- Goraku Web — https://gorakuweb.com
- Hachiraw — https://hachiraw.net
- Hana To Yume+ — https://hanayume.com
- HAYA Comic — https://hayacomic.jp
- HDoujin — https://hdoujin.org
- Hennojin — https://hennojin.com
- HentaiEnvy — https://hentaienvy.com
- HentaiEra — https://hentaiera.com
- HentaiHand — https://hentaihand.com
- HentaiRox — https://hentairox.com
- HentaiZap — https://hentaizap.com
- HERO'S Web — https://heros-web.com
- HOLONOMETRIA — https://holoearth.com
- Ichicomi — https://ichicomi.com
- Idol. gravureprincess .date — https://idol.gravureprincess.date
- J-N Books — https://comic.j-nbooks.jp
- Jmanga — https://jmanga.cyou
- Jump Rookie! — https://rookie.shonenjump.com
- Jump Toon — https://jumptoon.com
- Kagane — https://kagane.to
- KimiComi — https://kimicomi.com
- Kiraboshi — https://kirapo.jp
- KissLove — https://klz9.com
- KL Raw — https://www.klraw.info
- Klto9 — https://klto9.com
- Kmansin09 — https://kmansin09.top
- Kumaraw — https://kumaraw.com
- Kurage Bunch — https://kuragebunch.com
- League of Legends — https://universe.leagueoflegends.com/ja_jp/comic/
- Line Manga — https://manga.line.me
- Love4u — https://love4u.net
- Magazine Pocket — https://pocket.shonenmagazine.com
- MAGCOMI — https://magcomi.com
- MagKan — https://kansai.mag-garden.co.jp
- Manga Kingdom — https://comic.k-manga.jp
- Manga Mura — https://mangamura.me
- Manga One — https://manga-one.com
- Manga Saison — https://mechacomi.jp
- Manga SPA — https://mangaspa.nikkan-spa.jp
- Manga UP! (Japan) — https://www.manga-up.com
- Manga Zegra — https://manga-zegra.com
- Manga-5 — https://manga-5.com
- Manga1000 — https://hachiraw.win
- MangaBang Comics — https://comics.manga-bang.com
- MangaBu — https://mangabu.jp
- MangaDot — https://mangadot.net
- MangaKuro — https://mangakuro.net
- Mangalt — https://mangalt.jp
- MangaMee — https://manga-mee.jp
- MangaMeets — https://manga-meets.jp
- MangaNo — https://manga-no.com
- MayoTune — https://mayochuu.xyz
- Mecha Comic — https://mechacomic.jp
- Mokuro — https://mokuro.moe
- momon:GA — https://momon-ga.com
- Music Book Japan — https://music-book.jp
- MyReadingManga — https://myreadingmanga.info
- Nami Comic — https://namicomic.jp
- NamiComi — https://namicomi.com
- Nicomanga — https://nicomanga.com
- Nicovideo Seiga — https://sp.manga.nicovideo.jp
- NihonKuni — https://nihonkuni.com
- Nikkangecchan — https://nikkangecchan.jp
- Ohta Web Comic — https://webcomic.ohtabooks.com
- OniSaga — https://onisaga.com
- PandaChaika — https://panda.chaika.moe
- Pash Up! — https://pash-up.jp
- PiaComic — https://piacomic.jp
- Piccoma — https://piccoma.com
- Pixiv — https://www.pixiv.net
- Pixivコミック — https://comic.pixiv.net
- Raw Otaku — https://rawotaku.com
- Raw UwU — https://rawuwu.net
- Raw1001 — https://raw1001.net
- Raw18 — https://raw18.icu
- RawBaka — https://rawbaka.com
- Rawdevart.art — https://rawdevart.art
- RawINU — https://rawinu.com
- Rawkuma — https://rawkuma.net
- RawMiu — https://rawmiu.com
- Reader Store — https://ebookstore.sony.jp
- RimacomiPlus — https://rimacomiplus.jp
- SayManhwa — https://saymanhwa.com
- SchaleNetwork — https://schale.network
- Sen Manga — https://raw.senmanga.com
- Shonen Jump+ — https://shonenjumpplus.com
- Simply Hentai — https://www.simply-hentai.com
- Sokuyomi — https://sokuyomi.jp
- Sunday Web Every — https://www.sunday-webry.com
- TakeComic — https://takecomic.jp
- Tonari no Young Jump — https://tonarinoyj.jp
- Twi4 — https://sai-zen-sen.jp/comics/twi4
- U-NEXT — https://video.unext.jp
- XCOMIC — https://xcomic.me
- Yomonga — https://www.yomonga.com
- Young Animal — https://younganimal.com
- Young Champion — https://youngchampion.jp
- Young Jump+ — https://ynjn.jp
- Zebrack — https://zebrack-comic.shueisha.co.jp
- Zenon — https://comic-zenon.com
- Zerosum Online — https://zerosumonline.com
- がうがうモンスター＋ — https://gaugau.futabanet.jp
- カドコミ — https://comic-walker.com
- コミコ — https://www.comico.jp
- マンガ図書館Z — https://www.mangaz.com
- ヤンマガ（グラビア） — https://yanmaga.jp
- ヤンマガ（マンガ） — https://yanmaga.jp

### Espagnol (146)

- 3Hentai — https://3hentai.net
- AKAYA — https://akaya.io
- Akuma — https://akuma.moe
- AnzManga — https://www.anzmanga25.com
- ApollComics — https://apollcomics.es
- Asia Lotus — https://asialotuss.com
- BarManga — https://archiviumbar.com
- Bega Translation — https://begatranslation.com
- Bloom Scans — https://bloomscans.com
- BokugenTranslation — https://bokugents.com
- Bymichi Scan — https://bymichiby.com
- CapibaraTraductor — https://capibaratraductor.com
- Catharsis World — https://newcatharsis.dig-it.info
- Catoons — https://cattoons.org
- Celestial Moon — https://celestialmoonscan.es
- Cerberus Series — https://legionscans.com/wp
- ChoChoX — https://chochox.com
- Code Arc Mangas — https://mangas.codearctraducciones.com
- Colorcito Scan — https://coloresito.site
- Colorcito Toons — https://colorcitotoons.site
- Comic Fury — https://comicfury.com
- Comics Kingdom — https://wp.comicskingdom.com
- Comikey — https://comikey.com
- Dark Room Fansub — https://lector-darkroomfansub.blogspot.com
- Dat-Gar Scan — https://datgarscanlation.blogspot.com
- DoujinHentai — https://doujinhentai.net
- DoujinsHell — https://doujinshell.net
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- DragonTranslation.org — https://dragontranslation.org
- Emperor Scan — https://imperiomanhua.com
- EnchiladaScan — https://enchiladascan.github.io/enchiladaweb
- Es.Mi2Manga — https://es.mi2manga.com
- EternalMangas — https://eternalmangas.org
- Falco Scan — https://falcoscan.net
- Gistamis House — https://gistamishousefansub.blogspot.com
- Gremory Mangas — https://gremoryhistorias.org
- Hades no Fansub — https://lectorhades.latamtoon.com
- Harem de Kira — https://kiraproject.lat
- HDoujin — https://hdoujin.org
- HeavenManga — https://heavenmanga.com
- HentaiEnvy — https://hentaienvy.com
- HentaiEra — https://hentaiera.com
- HentaiHall — https://hentaihall.com
- HentaiHand — https://hentaihand.com
- HentaiMode — https://hentaimode.com
- HentaiZap — https://hentaizap.com
- Honeytoon — https://honeytoon.com
- House Of Otakus — https://houseofotakusv2.xyz
- Ikigai Mangas — https://visorikigai.gettocaboca.com
- Ikuhentai — https://ikuhentai.net
- InfraFandub — https://infrafandub.com
- InManga — https://inmanga.com
- Inmortal Scan — https://scan-inmortal.com
- InsanosScan — https://insanoslibrary.com
- Inventario Oculto — https://inventariooculto.com
- Jeaz Scans — https://lectorhub.j5z.xyz
- Kagane — https://kagane.to
- Kazoku Den — https://www.kazokuden.com
- Koinobori Scan — https://visorkoi.com
- League of Legends — https://universe.leagueoflegends.com/es_es/comic/
- Lector Asteria — https://visor.chifa-tong.online
- LectorJPG — https://visorjpg.lat
- LectorManga.lat — https://lector-mangas.lat
- LeerCapitulo — https://www.leercapitulo.co
- LeerMangaEsp — https://mangalect.org
- LeerManhwas — https://leermanhwas.com
- Lmtos — https://lmtos.net
- Lolivault — https://lector.lolivault.net
- Luna Pieces — https://lunapiecesfansub.com
- Magical Translators — https://mahoushoujobu.com
- Manga  TV — https://mangatv.net
- Manga Crab — https://es.mangacrab.org
- Manga Million — https://mangamillion.shueisha.co.jp
- Manga Mukai — https://mangamukai.com
- MANGA Plus Creators by SHUEISHA — https://mangaplus-creators.jp
- Manga Romance — https://mangaromance19.com
- MangaDot — https://mangadot.net
- MangaOni — https://manga-oni.com
- Mangas No Sekai — https://mangasnosekai.com
- Mangas.in — https://m440.in
- MangoLibreria — https://mangolibreria.com
- Manhuarm — https://manhuarmtl.com
- Manhwa-Latino — https://manhwa-latino.com
- ManhwaOnline — https://manhwa-online.com
- ManhwasMe — https://manhwas.me
- ManhwaWeb — https://manhwaweb.com
- Manta — https://manta.net/es
- Mantraz Scan — https://mantrazscan.co
- Marmota — https://marmota.me
- Menudo-Fansub — https://www.menudo-fansub.com
- MHScans — https://mhscans.com
- Miau Scan — https://leemiau.com
- Monopoly Scan — https://monopolymanhua.com
- Mundo Manhwa — https://mundomanhwa.com
- MyReadingManga — https://myreadingmanga.info
- NamiComi — https://namicomi.com
- NekoScans — https://nekoproject.org
- NeoManga — https://www.neomanga.online
- NexusScanlation — https://nexusscanlation.com
- Niadd — https://es.niadd.com
- Nova Manhwas — https://novamanhwa.cc
- NovelCool — https://es.novelcool.com
- Olympus Scanlation — https://olympusxyz.com
- One Piece Fans — https://one-piece-fans2.com
- ONF MANGAS — https://onfmangas.com
- OniSaga — https://onisaga.com
- Orcku Mangas — https://orckumangas.com
- PandaChaika — https://panda.chaika.moe
- Platinum Lily Scan — https://platinumlilyscan.com
- Plot Twist No Fansub — https://plotnofansub.com
- Ragna Scans — https://lector.ragnascan.xyz
- Ragnarok Scanlation — https://ragnarokscanlation.org
- RavenManga — https://raventard.xyz
- RichtoScan — https://r1.richtoon.top
- Rncalation — https://rncalation.online
- SamuraiScan — https://samurai.j5z.xyz
- SapphireScan — https://www.sapphirescan.com
- SayManhwa — https://saymanhwa.com
- SeraphicDeviltry — https://spanish.seraphic-deviltry.com
- Shadow Manga — https://shademanga.com
- Shadow Manga (+18) — https://shademanga.com
- Simply Hentai — https://www.simply-hentai.com
- SkyMangas — https://skymangas.com
- Spicy Scan — https://spicyseries.com
- Submanhwa — https://submanhwa.com
- Taurus Fansub — https://lectortaurus.com
- Temple Scan — https://aedexnox.akan01.com
- The Library of Ohara — https://thelibraryofohara.com
- TMOHentai (unoriginal) — https://tmohentai.app
- Toon-es — https://toon-es.com
- TopComicPorno — https://topcomicporno.com
- TopComicPorno.net — https://topcomicporno.net
- Traducciones Moonlight — https://traduccionesmoonlight.com
- Uchuujin Projects — https://uchuujinmangas.com
- VCP — https://vercomicsporno.com
- Ver Manhwas — https://vermanhwa.com
- Vinnie Veritas - CCC — https://ccc.vinnieveritas.com
- VMP — https://vermangasporno.com
- Webcomics — https://webcomicsapp.com
- XCOMIC — https://xcomic.me
- xkcd — https://es.xkcd.com
- Yupmanga — https://www.yupmanga.com
- Yuri-Online — https://yuri-online.com
- ZonaTMO.org (unoriginal) — https://zonatmo.org
- Zonatmo.to (unoriginal) — https://zonatmo.to
- 小黄书 — https://es.xchina.co

### pt-BR (130)

- Acervo Hentai — https://acervohentai.com
- AcervoEremita — https://acervoeremita.com
- Amuy — https://apenasmaisumyaoi.com
- AnimeXNovel — https://www.animexnovel.com
- Apenas Uma Fã — https://apenasuma-fa.blogspot.com
- Argos Comics — https://aniargos.com
- Argos Scan — https://argoscomics.online
- Arthur Scan — https://arthurscan.xyz
- Astratoons — https://new.astratoons.com
- Azuretoons — https://azuretoons.com
- Bakai — https://bakai.org
- Blackout Comics — https://blackoutcomics.com
- Bladetoons — https://bladetoons.com
- Boruto Explorer — https://leitor.borutoexplorer.com.br
- BR Yaoi — https://bryaoi.com
- Brasil Hentai — https://brasilhentai.com
- Café com Yaoi — https://cafecomyaoi.com.br
- Capitoons — https://capitoons.com
- Cerise Scan — https://loverstoon.net
- Comic Fury — https://comicfury.com
- Comikey — https://comikey.com
- Comikey Brasil — https://br.comikey.com
- Coven Scan — https://covendasbruxonas.com
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- Ego Toons — https://egotoons.com
- EroSect — https://erosect.xyz
- Euphoria Scan — https://euphoriascan.com
- ExHentai.net.br — https://exhentai.net.br
- Fenix Project — https://fenixproject.site
- Fleur Blanche — https://fbsquadx.com
- FlowerManga.net — https://flowermangas.net
- GALAX Scans — https://galaxscanlator.blogspot.com
- Geass Comics — https://geasscomics.xyz
- Ghost Scan — https://ghostscan.xyz
- Hanami Heaven — https://hanamiheaven.org
- Hanmokku Scan — https://hanmokkuscan.blogspot.com
- Hentai Season — https://hentaiseason.com
- Hentai Tokyo — https://hentaitokyo.net
- HentaiHand — https://hentaihand.com
- Hipercool — https://lerhentais.com
- Hipertoon — https://hipertoon.com
- Honeytoon — https://honeytoon.com
- Hora Hentai — https://horahentai.com
- Hot Cabaret Scan — https://hotcabaretscan.com
- HQ Now! — https://www.hq-now.com
- Hunters Scan — https://readhunters.xyz
- Inkapk — https://inkapk.net
- Kagane — https://kagane.to
- Kami Sama Explorer — https://leitor.kamisama.com.br
- KivaraToons — https://kivaratoons.com
- KuroMangas — https://kuromangas.com
- League of Legends — https://universe.leagueoflegends.com/pt_br/comic/
- Leitor de Mangas — https://leitordemangas.com
- Leitura Mangá — https://leituramanga.net
- Ler 999 — https://ler999.blogspot.com
- Little Tyrant — https://tiraninha.world
- Lura Toon — https://luratoons.net
- Lycan Toons — https://lycantoons.com
- Maid Scan — https://empreguetes.wtf
- Manga Livre Blog — https://mangalivre.blog
- Manga Livre.to — https://mangalivre.to
- Manga Million — https://mangamillion.shueisha.co.jp
- Manga NXY — https://manganyx.com
- Manga Online — https://mangaonline.green
- Manga Stop — https://mangastop.net
- MangaDash — https://mangadash.net
- MangaDot — https://mangadot.net
- MangaFlix — https://mangaflix.net
- MangaLivre.org — https://mangalivre.org
- Mangas Brasuka — https://mangasbrasuka.org
- ManGeek — https://mangeek.app
- Mango Toons — https://mangotoons.com
- Manhastro — https://manhastro.net
- Manhuarm — https://manhuarmtl.com
- Mediocre Toons — https://mediocrescan.com
- Miau Scan — https://leemiau.com
- MiniTwo Scan — https://minitwoscan.com
- Monte Tai — https://montetaiscanlator.xyz
- MR Tenzus — https://mrtenzus.com
- Mugiwaras Oficial — https://mugiwarasoficial.org
- Muito Hentai — https://www.muitohentai.com
- Mundo Hentai — https://mundohentaioficial.com
- MyReadingManga — https://myreadingmanga.info
- NamiComi — https://namicomi.com
- Nebulosa Scan — https://nebulosascan.com
- Nexus Toons — https://nx-toons.xyz
- Niadd — https://br.niadd.com
- Ninja Scan — https://ninjacomics.xyz
- Nocturne Summer — https://nocfsb.com
- NovelCool — https://br.novelcool.com
- NoxManga — https://noxmangas.org
- OneReader — https://onereader.net
- OniSaga — https://onisaga.com
- Osaka Scan — https://www.osakascan.com
- Pink Rosa — https://scanpinkrosa.blogspot.com
- Pink Sea Unicorn — https://psunicorn.com
- PizzariaScan — https://pizzariacomics.com
- Pluma Comics — https://plumacomics.cloud
- Point Zero Toons — https://kitsuneyako.com
- Portal Yaoi — https://portalyaoi.com
- RF Dragon Scan — https://rfdragonscan.net
- Risentoons — https://risentoons.xyz
- Roxinha — https://roxinha.online
- Sagrado Império da Britannia — https://imperiodabritannia.net
- Saikai Scan — https://housesaikai.net
- Shirai Scans — https://shiraixis.space
- SlimeRead (unoriginal) — https://slimeread.app
- Starlight Scan — https://starligthscan.com
- Taimu Mangas — https://beta.taimumangas.com
- Taiyō — https://taiyo.moe
- Tankou Hentai — https://tankouhentai.com
- Tao Sect — https://taosect.com
- Temaki mangás — https://temakimangas.blogspot.com
- Tia Manhwa — https://tiamanhwa.com
- ToonBr — https://beta.toonbr.com
- ToonLivre — https://toonlivre.net
- Traduções do Lipe — https://traducoesdolipe.blogspot.com
- Tsundoku Traduções — https://tsundoku.com.br
- Universo Hentai — https://universohentai.com
- Vegitoons — https://vegitoons.black
- Verdinha — https://verdinha.wtf
- Wolftoon — https://wolftoon.lovable.app
- XCOMIC — https://xcomic.me
- XXX Yaoi — https://3xyaoi.com
- Yaoi Fan Club — https://www.yaoifanclub.com
- Yomu Comics — https://yomu.com.br
- Yomu Mangás — https://yomumangas.com
- Yugen Mangás — https://yugenmangasbr.dxtg.online
- Yuri on Air — https://yurionair.top
- ZettaHQ — https://zettahq.com

### Indonésien (99)

- 3Hentai — https://3hentai.net
- Aarlas — https://www.arlas.online
- Ainz Scans ID — https://v3.ainzscans01.com
- Akuma — https://akuma.moe
- APKOMIK — https://01.apkomik.com
- Astral Scans — https://astralscans.site
- BacaKomik — https://bacakomik.my
- Bacami — https://v1.bacami.site
- Comicaso — https://v3.comicaso.pro
- Comikey — https://comikey.com
- CosmicScans — https://04.cosmicscans.to
- CrotPedia — https://crotpedia.net
- DailySuka  — https://dailysuka.com
- Dojing.net — https://dojing.net
- Doujindesu — https://doujin.desu.xxx
- Doujinku — https://doujinku.org
- DreamTeams Scans — https://dreamteams.space
- Hentai Crot — https://hentaicrot.com
- HentaiHand — https://hentaihand.com
- HOLONOMETRIA — https://holoearth.com
- Holotoon — https://holodek.run
- Hwago — https://02.hwago.xyz
- Ikiru — https://08.ikiru.wtf
- IsekaiKomik — https://ch1.isekaikomik.site
- Izanami Scans — https://izanamiscans.my.id
- Kagane — https://kagane.to
- Kaguya — https://02.kaguya.pro
- Kanzenin — https://kanzenin.info
- Kiryuu — https://v7.kiryuu.to
- KlikManga — https://klikmanga.org
- Komik Dewasa Art — https://komikdewasa.art
- Komik Dewasak — https://komikdewasa.mom
- Komik Next G Online — https://komiknextgonline.com
- Komik Station — https://komikstation.org
- Komikindo — https://komikindo.cam
- KomikIndoID — https://komikindo.ch
- KomikNesia — https://v1.komiknesiaku.com
- Komiktap — https://komiktap.info
- Komiku — https://komiku.org
- Komiku.com — https://01.komiku.asia
- Komikzoid — https://01.komikzoid.id
- KumaPoi — https://kumapoi.info
- KumoPoi — https://beta.kumopoi.com
- Kuro Manga — https://kuromanga.id
- LepoyTL — https://www.lepoytl.my.id
- LianScans — https://www.lianscans.com
- LumosKomik — https://03.lumosgg.com
- Luvyaa — https://v5.luvyaa.co
- Maid - Manga — https://www.maid.my.id
- Manga Can — https://mangacanblog.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- Mangakuri — https://lc2.mangakuri.online
- Mangalay — http://mangalay.blogspot.com
- Mangasusu — https://mangasusuku.com
- Manhuarm — https://manhuarmtl.com
- Manhwa Indo — https://www.manhwaindo.my
- Manhwa List — https://manhwalist.asia
- ManhwaDesu — https://manhwadesu.wiki
- ManhwaLand.mom — https://02.manhwaland.land
- MG Komik — https://id.mgkomik.cc
- Mihentai — https://mihentai.net
- MikoRoku — https://www.mikoroku.com
- MyReadingManga — https://myreadingmanga.info
- NamiComi — https://namicomi.com
- NarasiNinja — https://narasininja.net
- Natsu — https://natsu.one
- NgamenKomik — https://ngamenkomik05.blogspot.com
- Ngomik (unoriginal) — https://02.ngomik.cc
- Noromax — https://noromax02.my.id
- OkyyKomik — https://www.okyykomik.my.id
- Omicaso — https://omicaso.org
- Ota Scans — https://yurilab.top
- PandaChaika — https://panda.chaika.moe
- Pix Hentai — https://pixhentai.com
- Pramramadhan — https://01.pramramadhan.my.id
- ReYume — https://www.re-yume.my.id
- Riztranslation — https://riztranslation.pages.dev
- Roseveil — https://roseveil.org
- Ryukomik — https://ryukomik.my.id
- Sasangeyou — https://sasangeyou.net
- SayManhwa — https://saymanhwa.com
- Sekte Doujin — https://sektedoujin.cc
- Sekte Komik — https://01.sektekomik.id
- Shinigami — https://11.shinigami.asia
- Shiro Doujin — https://shirodoujin.com
- ShiyuraSub — https://shiyurasub.blogspot.com
- Siikomik — https://siikomik.id
- Softkomik — https://softkomik.co
- Soul Scans — https://v1.soulscans.org
- The Library of Ohara — https://thelibraryofohara.com
- TheManga — https://themanga.site
- Tooncubus — https://www.tooncubus.top
- Ulas Comic — https://www.ulascomic01.xyz
- VoraToon — https://v4.voratoon.com
- Webcomics — https://webcomicsapp.com
- West Manga — https://v1.westmanga.my
- Wurmz — https://wurmz.net
- XCOMIC — https://xcomic.me

### Vietnamien (90)

- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- Ariverse — https://arigl.xyz
- CBHentai — https://2tencb.pro
- CManga — https://cmangax18.com
- CuuTruyen — https://cuutruyen.net
- CuuTruyen (unoriginal) — https://cuutruyen.moe
- DamCoNuong — https://damconuong.name
- DaoMeoDen — https://daomeoden.net
- Dilib — https://dilib.vn
- DocTruyen3Q — https://doctruyen3qhub.vip
- DocTruyen5s — https://manga.io.vn
- Dưa Leo Truyện — https://dualeotruyenwk.com
- FastScan — https://fastscan.org
- FoxTruyen — https://foxtruyen2.com
- GantzVN — https://gantzvn.com
- Goc Truyen Tranh Vui — https://goctruyentranhvui41.com
- GocTruyenTranh — https://goctruyentranh.com
- HentaiHand — https://hentaihand.com
- HentaiVN.plus — https://hentaivn.show
- HentaiVNx — https://www.hentaivnx.com
- Học Viện 2Ten — https://hv2tcomics.net
- Kagane — https://kagane.to
- KamiComic — https://kamicomi.com
- KhoManhwa — https://khomanhwa.com
- KiraKira — https://truyenkira.net
- LoppyToon — https://loppytoonn.com
- LuotTruyen — https://luottruyen999.com
- LuvEvaLand — https://luvevalands2.co
- LXManga — https://lxmanga.space
- LxManga.org (unoriginal) — https://lxmanga.org
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- MeDamTruyen — https://saytongtaii.site
- MeHentai — https://mehentai.live
- MeoSSS — https://meosss.com
- MeoSua — https://meosua.org
- MeTruyen18 — https://metruyen18.pro
- MiMi — https://mimihentai.moe
- MiMiHentai — https://mimihentai.net
- MinoTruyen Comics — https://minotruyenv5.xyz
- MinoTruyen Hentai — https://minotruyenv5.xyz
- MinoTruyen Manga — https://minotruyenv5.xyz
- MoeTruyen — https://moetruyen.net
- MoeTruyenSuiCao (unoriginal) — https://moe.suicaodex.com
- MyReadingManga — https://myreadingmanga.info
- NetTruyenCO (unoriginal) — https://nettruyenar.com
- NetTruyenS (unoriginal) — https://nettruyen13s.com
- NetTruyenViet (unoriginal) — https://nettruyenviet10.com
- NetTruyenX (unoriginal) — https://nettruyenx.net
- NhatTruyen — https://nhattruyenqq.com
- NhentaiClub — https://nhentaiclub.online
- Otakusic — https://otakusic.com
- OTruyen — https://otruyen.cc
- PandaChaika — https://panda.chaika.moe
- Panomic — https://panomic.online
- SangChanhTeam — https://sangchanhteam.com
- SayHentai — https://sayhentai.cx
- SayManhwa — https://saymanhwa.com
- Seikowo — https://seikowo-app.blogspot.com
- SinhSieuSao — https://sinhsieusao.com
- SoaiCaComic — https://soaicacomic2.top
- Team Lạnh Lùng — https://lanhlungteam3.top
- TeleTruyen — https://teletruyen.com
- ThienThaiTruyen — https://thienthaitruyen15.com
- Thỏ Ham Ngủ — https://thohamngu.xyz
- Top Truyen — https://www.toptruyenzonek.com
- Tranh18 — https://tranh18.cc
- Truyen18 — https://truyen18.co
- TruyenGGVN — https://truyenggvn.com
- TruyenHentaivn — https://truyenhentaivn.store
- TruyenHentaiz — https://truyenhentaiz.net
- TruyenMM — https://truyenmmhayr.com
- TruyenQQ — https://truyenqqko.com
- TruyenQQ VN — https://truyenqq.com.vn
- TruyenTini — https://truyentini.net
- TruyenTuoiTho — https://truyentuoitho.com
- TruyenTVN — https://truyentvn.net
- Truyện Hentai 18+ — https://truyenhentai18.net
- Truyện tranh đam mỹ — https://truyentranhdammyy.site
- TuiTruyen — https://tuitruyen.top
- TuSachXinhXinh — https://tusachxinhxinh12.online
- UmeTruyen — https://umetruyenz.org
- ViHentai — https://vi-hentai.moe
- VinaHentai — https://vinahentai.help
- ViTruyen — https://vitruyen1.com
- XCOMIC — https://xcomic.me
- YuriGarden — https://yurigarden.moe
- YuriNeko — https://yurinekoz.com
- ZetTruyen — https://www.zettruyen1.com

### Turc (87)

- 3Hentai — https://3hentai.net
- Afrodit Scans — https://afroditscans.com
- Akuma — https://akuma.moe
- Alucard Scans — https://alucardscans.com
- Amanga Planet — https://www.amangaplanet.com.tr
- Anikiga — https://anikiga.com
- ArazNovel — https://manga.araznovel.com
- Arcura Fansub — https://arcurafansub.com
- DiamondFansub — https://diamondfansub.com
- Domal Fansub — https://dom4lfansub.online
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- Elder Manga — https://eldermanga.com
- Eski Mangalar — https://eskimangalar.com
- gafeland — https://gafeland.com
- Gaiatoon — https://gaiatoon.com
- Garcia Manga — https://garciamanga.com
- GhosToon — https://ghostoon.com
- Gölge Bahçesi — https://golgebahcesi.com
- Hattori Manga — https://hattorimanga.net
- Hattori Scans — https://hattoriscans.com
- Hayalistic — https://hayalistic.online
- HentaiHand — https://hentaihand.com
- Holy Scans — https://holyscans.com.tr
- JuraTempest — https://juratempe.st
- Koreli Manga — https://korelimanga.com
- Koreli Scans — https://www.nabicix.com
- Kuroi Manga — https://kuroimanga.site
- Lavinia Fansub — https://laviniafansub.shop
- League of Legends — https://universe.leagueoflegends.com/tr_tr/comic/
- Limon Manga — https://limonmanga.com
- Luna Scans — https://tuhafscans.com
- Manga Bahçesi — https://mangabahcesi.com
- Manga Diyarı — https://mangadiyari.com
- Manga Kusu — https://mangakusu.com
- Manga Million — https://mangamillion.shueisha.co.jp
- Manga Portalı — https://www.mangaportali.com
- Manga Şehri.net — https://manga-sehri.net
- Manga-TR — https://manga-tr.com
- MangaDenizi — https://mangadenizi.net
- MangaDot — https://mangadot.net
- Mangadusleri — https://mangadusleri.mom
- MangaTilkisi — https://www.tilkiscans.com
- MangaWOW — https://mangawow.org
- MangaWT — https://mangawt.com
- MangaZure — https://mangazure.net
- Mangitto — https://mangtto.com
- Merlin Scans — https://merlintoon.com
- Mikrokosmos Fansub — https://mikrokosmosfb.blogspot.com
- MilaSub — https://millascan.com
- Mono Manga — https://monomanga.com.tr
- Moon Daisy Scans — https://moondaisyscans.pro
- MyReadingManga — https://myreadingmanga.info
- NamiComi — https://namicomi.com
- Nemesisscans — https://nemesisscans.com
- Nirvana Manga — https://nirvanamanga.com
- Nivera Fansub — https://niverafansub.one
- OkuToon — https://okutoon.com
- Opiatoon — https://opiatoon.shop
- Ori Manga — https://orimanga.net
- PandaChaika — https://panda.chaika.moe
- Paradox Scans — https://paradoxscans.com
- Pati Manga — https://www.patimanga.com
- Ragnar Scans — https://ragnarscans.net
- Raindrop Fansub — https://www.raindropteamfan.com
- Rüya Manga — https://www.ruyamanga2.com
- Serein Scan — https://sereinscan.com
- Shadow Çeviri — https://shadowceviri.blogspot.com
- Shijie Scans — https://shijiescans.com
- Siyah Melek — https://siyahmelek.live
- Slept Manga — https://sleptmanga.com.tr
- Stray Fansub — https://strayfansub.net
- SummerToon — https://summertoons.net
- Sunset Manga — https://sunsetmanga.com
- Tarot Scans — https://www.tarotscans.com
- Tenshi Manga — https://tenshimanga.com
- TonizuToon — https://tonizu.top
- Toontaku — https://toontaku.com
- Tortuga Ceviri — https://tortugaceviri.com
- TrManga — https://trmanga.com
- Türkçe Manga Oku — https://trmangaoku.com
- Uzay Manga — https://uzaymanga.com
- Webtoon Hatti — https://webtoonhatti.club
- WebtoonOku — https://webtoonoku.org
- XCOMIC — https://xcomic.me
- Yaoi Flix — https://yaoiflix.fit
- Yaoi Manga Oku — https://yaoimangaoku.net
- ÇaprazManga — https://caprazmanga.com

### Toutes langues (74)

- 3600000 Beauty — https://3600000.xyz
- 3Hentai — https://3hentai.net
- 4KHD — https://www.4khd.com
- AHottie — https://ahottie.top
- Akuma — https://akuma.moe
- AllPornComics.co — https://allporncomics.co
- BaoBua — https://baobua.net
- Buon Dua — https://buondua.com
- Comic Fury — https://comicfury.com
- Comic Growl — https://comic-growl.com
- Comics Valley — https://comicsvalley.com
- Coomer — https://coomer.st
- CosplayTele — https://cosplaytele.com
- Danbooru — https://danbooru.donmai.us
- DeviantArt — https://www.deviantart.com
- Doujiva — https://doujiva.com
- e621 — https://e621.net
- Elite Babes — https://www.elitebabes.com
- Everia.club — https://everia.club
- EveriaClub (unoriginal) — https://www.everiaclub.com
- Femjoy Hunter — https://www.femjoyhunter.com
- FoamGirl — https://foamgirl.net
- FTV Hunter — https://www.ftvhunter.com
- Grabber Zone — https://grabber.zone
- HDoujin — https://hdoujin.org
- Hentai Cosplay — https://hentai-cosplay-xxx.com
- HentaiEnvy — https://hentaienvy.com
- HentaiEra — https://hentaiera.com
- HentaiHand — https://hentaihand.com
- HentaiLoop — https://hentailoop.com
- HentaiRox — https://hentairox.com
- HentaiZap — https://hentaizap.com
- HNI-Scantrad — https://hni-scantrad.net
- JJCOS — https://jjcos.com
- Joymii Hub — https://www.joymiihub.com
- Junmeitu — https://meijuntu.com
- Kemono — https://kemono.cr
- Kiutaku — https://kiutaku.com
- Kodoku Studio — https://kodokustudio.com
- Komga — https://127.0.0.1:25600
- Komga (2) — https://127.0.0.1:25600
- Komga (3) — https://127.0.0.1:25600
- LANraragi (1) — http://127.0.0.1:3000
- LANraragi (2) — http://127.0.0.1:3000
- Manga18.me — https://manga18.me
- Manga18fx — https://manga18fx.com
- MangaCrazy — https://mangacrazy.net
- MangaDraft — https://mangadraft.com
- Manhwa-raw — https://manhwa-raw.com
- Metart Hunter — https://www.metarthunter.com
- MissKon — https://misskon.com
- Mitaku — https://mitaku.net
- OniSaga — https://onisaga.com
- OSOSEDKI — https://ososedki.com
- PandaChaika — https://panda.chaika.moe
- Pawchive — https://pawchive.pw
- Pepper&Carrot — https://www.peppercarrot.com
- Photos18 — https://www.photos18.com
- Playmate Hunter — https://pmatehunter.com
- Project Suki — https://projectsuki.com
- Roku Hentai — https://rokuhentai.com
- SchaleNetwork — https://schale.network
- Simply Cosplay — https://www.simply-cosplay.com
- StashApp — http://localhost:9999
- Taddy INK (Webtoons) — https://taddy.org
- Twicomi — https://twicomi.com
- V2PH — https://www.v2ph.com
- XArt Hunter — https://www.xarthunter.com
- XAsiat Albums — https://www.xasiat.com
- XCOMIC — https://xcomic.me
- Xiutaku — https://xiutaku.com
- Yabai — https://yabai.si
- Yaoi Manga Online — https://yaoimangaonline.com
- 性感美女 — http://xgmn8.vip

### Chinois (63)

- 18漫画 — https://18mh.org
- 3Hentai — https://3hentai.net
- 92漫画 — http://www.92mh.com
- Akuma — https://akuma.moe
- Cartoon18 — https://www.cartoon18.com
- CManhua — https://cmanhua.com
- Comic Fury — https://comicfury.com
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- H-Comic — https://h-comic.com
- Hanime1.me — https://hanimeone.me
- HANMAN18 — https://hanman18.com
- HDoujin — https://hdoujin.org
- HentaiHand — https://hentaihand.com
- HentaiRox — https://hentairox.com
- Hikarinagi — https://www.hikarinagi.org
- JComic — https://jcomic.net
- Kagane — https://kagane.to
- Komiic — https://komiic.com
- Manga Xiao Si — https://www.jjmhw2.top
- Mangabz — https://mangabz.com
- MangaDot — https://mangadot.net
- MyComic — https://mycomic.com
- MyReadingManga — https://myreadingmanga.info
- PandaChaika — https://panda.chaika.moe
- Pixiv — https://www.pixiv.net
- PornPics — https://www.pornpics.com
- SchaleNetwork — https://schale.network
- Simply Hentai — https://www.simply-hentai.com
- TOPTOON頂通 — https://www.toptoon.net
- vomic — https://www.vomicmh.com
- XCOMIC — https://xcomic.me
- xkcd — https://xkcd.tw
- zero搬运网 — http://www.zerobyw33.com
- 《崩坏3》IP站 — https://comic.bh3.com
- 一耽女孩 — https://yidan9.club
- 优酷漫画 — https://www.ykmh.net
- 六漫画 — https://www.liumanhua.com
- 再漫画 — https://manhua.zaimanhua.com
- 动漫屋 — https://www.dm5.com
- 包子漫画 — https://cn.baozimh.com
- 哔咔漫画 — https://manhuabika.com
- 喜漫漫画 — https://www.favcomic.com
- 喵趣漫画 — https://www.miaoqumh.org
- 嗶哩漫畫 — https://www.bilimanga.net
- 巴卡漫画 — https://bakamh.com
- 杂志迷 — https://www.zazhimi.net
- 東立 — https://ebook.tongli.com.tw
- 泰拉记事社 — https://comic.hypergryph.com
- 漫画160 — https://www.mh160mh.com
- 漫画人 — http://mangaapi.manhuaren.com
- 漫画屋 — https://www.mhua5.com
- 漫画社 — https://www.311s.com
- 漫蛙 — https://manwa.me
- 無限動漫 — https://www.8comic.com
- 爱看漫 — https://ymcdnyfqdapp.ikmmh.com
- 瓜子漫画 — https://www.guazimanhua.com
- 禁漫天堂 — https://18comic.vip
- 紳士漫畫 — https://www.wn07.cfd
- 绅士会所 — https://www.hentaiclub.net
- 肉漫屋 — https://rouman5.com
- 花火漫画 — https://uhkvqrxmcapgtpspglrp.moedot.net
- 香香腐宅 — https://boylove.cc
- 鸟鸟韩漫 — https://nnhanman.xyz

### Russe (49)

- 3Hentai — https://3hentai.net
- AComics — https://acomics.ru
- Akuma — https://akuma.moe
- AllHentai — https://20.allhen.online
- AstraManga — https://astramanga.org
- Com-X — https://ru.com-x.life
- Comic Fury — https://comicfury.com
- Desu — https://desu.uno
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- HenChan — https://xxl.hentaichan.live
- HentaiEnvy — https://hentaienvy.com
- HentaiEra — https://hentaiera.com
- HentaiHand — https://hentaihand.com
- HentaiLib — https://hentailib.me
- HentaiZap — https://hentaizap.com
- InkStory — https://inkstory.net
- Kagane — https://kagane.to
- League of Legends — https://universe.leagueoflegends.com/ru_ru/comic/
- Manga Million — https://mangamillion.shueisha.co.jp
- Manga-shi — https://manga-shi.org
- MangaBuff — https://mangabuff.ru
- MangaChan — https://im.manga-chan.me
- MangaDot — https://mangadot.net
- MangaMen — https://mangamen.com
- MangaPoisk — https://mangapoisk.me
- MintManga — https://2.mintmanga.one
- MyReadingManga — https://myreadingmanga.info
- NamiComi — https://namicomi.com
- Niadd — https://ru.niadd.com
- NineGrid — https://9grid.cc
- NovelCool — https://ru.novelcool.com
- Nude-Moon — https://nude-moon.org
- PandaChaika — https://panda.chaika.moe
- PureManga — https://v1.puremanga.me
- ReadManga — https://a.zazaza.me
- SeiManga — https://1.seimanga.me
- SelfManga — https://1.selfmanga.live
- Senkognito — https://senkuro.me
- Senkuro — https://senkuro.me
- Simply Hentai — https://www.simply-hentai.com
- SlashLib — https://slashlib.me
- Tomilo-lib — https://tomilo-lib.ru
- UniComics — https://unicomics.ru
- Usagi — https://web.usagi.one
- WaManga — https://wamanga.ru
- XCOMIC — https://xcomic.me
- xkcd — https://xkcd.ru
- YagamiProject — https://read.yagami.me
- YaoiChan — https://yaoi-chan.me

### Arabe (42)

- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- Azora — https://azorafly.com
- Comic Verse — https://arcomixverse.blogspot.com
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- Duskoryvile — https://duskoryvile.com
- EShadow — https://eshadow.net
- Goon Scans — https://goonscans.org
- HentaiHand — https://hentaihand.com
- HentaiMan — https://hentaiman.net
- Hizo Manga — https://hizomanga.net
- Kagane — https://kagane.to
- Lava Scans — https://lavascans.com
- Loner Translations — https://loner-tl.blogspot.com
- Manga Ai Land — https://manga-ai-land.blogspot.com
- Manga Million — https://mangamillion.shueisha.co.jp
- Manga Tales — https://www.mangatales.com
- MangaDot — https://mangadot.net
- MangaTime — https://mangatime.org
- Manhatok — https://manhatok.blogspot.com
- Manhuarm — https://manhuarmtl.com
- Murim — https://www.murim.site
- MyReadingManga — https://myreadingmanga.info
- NamiComi — https://namicomi.com
- Orca Manga — https://infinity896.blogspot.com
- PandaChaika — https://panda.chaika.moe
- Paradise BL — https://paradise-bl.com
- SayManhwa — https://saymanhwa.com
- The Library of Ohara — https://thelibraryofohara.com
- XCOMIC — https://xcomic.me
- XSano Manga — https://www.xsano-manga.com
- Yona Bar — https://yonaber.com
- YSK Comics — https://www.ysk-comics.com
- Yuri Moon Sub — https://yurimoonsub.blogspot.com
- أريا مانجا — https://ar.kenmanga.com
- شبكة كونان العربية — https://manga.detectiveconanar.com
- مانجا ليك — https://mangalik.net
- مانجا لينك — https://link-manga.net
- هنتاي العرب — https://arabshentai.com
- هنتاي العرب - نت — https://arabhentai.net
- هنتاي سلاير — https://hentaislayer.net
- هنتاي ليك — https://hentailek.com

### Thaïlandais (40)

- 3Hentai — https://3hentai.net
- Cat300 — https://cat-300.com
- Doodmanga — https://www.doodmanga.com
- Doujin Moon — https://doujinmoon.com
- Doujin-Lc — https://doujin-lc.net
- DoujinZa — https://doujinza.com
- Ecchi-Doujin — https://ecchi-doujin.com
- Fin Manga — https://www.fin-manga.com
- Go Manga — https://www.go-manga.com
- God-Doujin — https://god-doujin.com
- HentaiHand — https://hentaihand.com
- Kagane — https://kagane.to
- Makimaaaaa — https://makimaaaaa.com
- Manga Million — https://mangamillion.shueisha.co.jp
- Manga-Lc — https://manga-lc.net
- Manga168 — https://manga1688.com
- MangaBlackCat — https://mangablackcat.com
- MangaDot — https://mangadot.net
- MangaIsekaiThai — https://www.mangaisekaithai.net
- MangaKimi — https://www.mangakimi.com
- Mangastep — https://mangastep.com
- ManhuaBug — https://www.manhuabug.com
- ManhuaThai — https://www.manhuathai.com
- ManhwaBreakup — https://www.manhwabreakup.com
- MikuDoujin — https://miku-doujin.com
- NamiComi — https://namicomi.com
- Nekopost — https://www.nekopost.net
- Niceoppai — https://www.niceoppai.net
- NTR-Manga — https://www.ntr-manga.net
- OreManga — https://www.oremanga.net
- PandaChaika — https://panda.chaika.moe
- ReaperTrans — https://reapertrans.com
- SayManhwa — https://saymanhwa.com
- SingManga — https://www.sing-manga.com
- Slow Manga — https://www.slow-manga.net
- Speed Manga — https://speed-manga.net
- Tanuki-Manga — https://www.tanuki-manga.net
- ToomTam-Manga — https://toomtam-manga.com
- XCOMIC — https://xcomic.me
- สดใสเมะ — https://www.xn--l3c0azab5a2gta.com

### Italien (33)

- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- Anime GDR Club — http://www.agcscanlation.it
- Comic Fury — https://comicfury.com
- DDT Team — https://ddt.hastateam.com
- DigitalTeam — https://dgtread.com
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- GTO The Great Site — https://reader.gtothegreatsite.net
- Hasta Team — https://reader.hastateam.com
- HentaiArchive — https://www.hentai-archive.com
- HentaiFantasy — https://hentaifantasy.it
- HentaiHand — https://hentaihand.com
- Honeytoon — https://honeytoon.com
- Juin Jutsu Team Reader — https://www.juinjutsureader.ovh
- Kagane — https://kagane.to
- League of Legends — https://universe.leagueoflegends.com/it_it/comic/
- LupiTeam — https://lupiteam.net
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- MangaworldAdult — https://www.mangaworldadult.net
- Manhuarm — https://manhuarmtl.com
- MyReadingManga — https://myreadingmanga.info
- NamiComi — https://namicomi.com
- Niadd — https://it.niadd.com
- NIFTeam — https://read-nifteam.info
- NovelCool — https://it.novelcool.com
- Phoenix Scans — https://www.phoenixscans.com
- Simply Hentai — https://www.simply-hentai.com
- The Library of Ohara — https://thelibraryofohara.com
- TuttoAnimeManga — https://tuttoanimemanga.net
- Walpurgi Scan — https://www.walpurgiscan.it
- XCOMIC — https://xcomic.me
- ZeurelScan — https://www.zeurelscan.com

### Français (32)

- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- Banchan Scan — https://banchanscan.fr
- Blossom Scans — https://blossom-scans.com
- Comic Fury — https://comicfury.com
- Commit Strip — https://www.commitstrip.com
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- Dragon Ball Multiverse Parody — https://www.dragonball-multiverse.com
- HentaiEnvy — https://hentaienvy.com
- HentaiEra — https://hentaiera.com
- HentaiHand — https://hentaihand.com
- HentaiZap — https://hentaizap.com
- Honeytoon — https://honeytoon.com
- izneo — https://www.izneo.com/fr/webtoon
- Kagane — https://kagane.to
- League of Legends — https://universe.leagueoflegends.com/fr_fr/comic/
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- Manhuarm — https://manhuarmtl.com
- NamiComi — https://namicomi.com
- Niadd — https://fr.niadd.com
- NovelCool — https://fr.novelcool.com
- OniSaga — https://onisaga.com
- PandaChaika — https://panda.chaika.moe
- SayManhwa — https://saymanhwa.com
- Simply Hentai — https://www.simply-hentai.com
- Solaris Scans — https://solaris-scans.fr
- Tappytoon — https://www.tappytoon.com/fr
- The Library of Ohara — https://thelibraryofohara.com
- Webcomics — https://webcomicsapp.com
- XCOMIC — https://xcomic.me
- xkcd — https://xkcd.lapin.org

### Coréen (30)

- 11toon — https://www.11toon.com
- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- HDoujin — https://hdoujin.org
- HentaiEnvy — https://hentaienvy.com
- HentaiEra — https://hentaiera.com
- HentaiHand — https://hentaihand.com
- HentaiZap — https://hentaizap.com
- Kagane — https://kagane.to
- League of Legends — https://universe.leagueoflegends.com/ko_kr/comic/
- Manatoki — https://manatoki552.net
- MangaDot — https://mangadot.net
- ManhwaClub.net — https://manhwaclub.net
- MyReadingManga — https://myreadingmanga.info
- NamiComi — https://namicomi.com
- Naver Webtoon — https://comic.naver.com
- Naver Webtoon Best Challenge — https://comic.naver.com
- Naver Webtoon Challenge — https://comic.naver.com
- PandaChaika — https://panda.chaika.moe
- Pixiv — https://www.pixiv.net
- RawDEX — https://rawdex.net
- Simply Hentai — https://www.simply-hentai.com
- Toonkor — https://toonkor0.org
- XCOMIC — https://xcomic.me
- 小黄书 — https://kr.xchina.co
- 늑대닷컴 - 만화책 — https://wfwf507.com
- 늑대닷컴 - 웹툰 — https://wfwf507.com
- 늑대닷컴 - 포토툰 — https://wfwf507.com
- 블랙툰 — https://blacktoon.me

### Allemand (23)

- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- Comic Fury — https://comicfury.com
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- HentaiEnvy — https://hentaienvy.com
- HentaiEra — https://hentaiera.com
- HentaiHand — https://hentaihand.com
- HentaiZap — https://hentaizap.com
- Honeytoon — https://honeytoon.com
- Kagane — https://kagane.to
- League of Legends — https://universe.leagueoflegends.com/de_de/comic/
- Manga Million — https://mangamillion.shueisha.co.jp
- Manga Tube — https://manga-tube.me
- MangaDot — https://mangadot.net
- MyReadingManga — https://myreadingmanga.info
- NamiComi — https://namicomi.com
- Niadd — https://de.niadd.com
- NovelCool — https://de.novelcool.com
- Sandra und Woo — https://www.sandraandwoo.com
- SayManhwa — https://saymanhwa.com
- Simply Hentai — https://www.simply-hentai.com
- Tappytoon — https://www.tappytoon.com/de
- XCOMIC — https://xcomic.me

### Ukrainien (15)

- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- ComixTopia — https://comixtopia.in.ua
- DGManga — https://dgmanga.app
- Faust — https://faust-web.com
- HentaiHand — https://hentaihand.com
- HoneyManga — https://honey-manga.com.ua
- Manga Million — https://mangamillion.shueisha.co.jp
- MANGA/in/UA — https://manga.in.ua
- MangaDot — https://mangadot.net
- Mangarama — https://mangarama.com.ua
- NamiComi — https://namicomi.com
- PandaChaika — https://panda.chaika.moe
- XCOMIC — https://xcomic.me
- Zenko — https://zenko.online

### Polonais (14)

- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- Comic Fury — https://comicfury.com
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- HentaiHand — https://hentaihand.com
- Kagane — https://kagane.to
- League of Legends — https://universe.leagueoflegends.com/pl_pl/comic/
- Magical Translators — https://mahoushoujobu.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- MangaHoNa — https://mangahona.pl
- NamiComi — https://namicomi.com
- Simply Hentai — https://www.simply-hentai.com
- XCOMIC — https://xcomic.me

### Portugais (13)

- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- Kagane — https://kagane.to
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- OniSaga — https://onisaga.com
- PandaChaika — https://panda.chaika.moe
- Revistas e Quadrinhos — https://revistasequadrinhos.com
- SayManhwa — https://saymanhwa.com
- Webcomics — https://webcomicsapp.com
- XCOMIC — https://xcomic.me

### Tchèque (10)

- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- Evil production — https://evil-manga.eu
- HentaiHand — https://hentaihand.com
- League of Legends — https://universe.leagueoflegends.com/cs_cz/comic/
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- PandaChaika — https://panda.chaika.moe
- XCOMIC — https://xcomic.me

### Finnois (9)

- 3Hentai — https://3hentai.net
- Comic Fury — https://comicfury.com
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- HentaiHand — https://hentaihand.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- PandaChaika — https://panda.chaika.moe
- XCOMIC — https://xcomic.me

### Hongrois (9)

- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- HentaiHand — https://hentaihand.com
- League of Legends — https://universe.leagueoflegends.com/hu_hu/comic/
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### Bulgare (8)

- 3Hentai — https://3hentai.net
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- HentaiHand — https://hentaihand.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- Utsukushii — https://utsukushii-bg.com
- XCOMIC — https://xcomic.me

### Catalan (8)

- Akuma — https://akuma.moe
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- Fansubs.cat — https://manga.fansubs.cat
- Hentai.cat — https://manga.hentai.cat
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### Grec (8)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- HentaiHand — https://hentaihand.com
- League of Legends — https://universe.leagueoflegends.com/el_gr/comic/
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- PandaChaika — https://panda.chaika.moe
- XCOMIC — https://xcomic.me

### Néerlandais (8)

- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- HentaiHand — https://hentaihand.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### es-419 (7)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- Kagane — https://kagane.to
- League of Legends — https://universe.leagueoflegends.com/es_mx/comic/
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- OniSaga — https://onisaga.com
- XCOMIC — https://xcomic.me

### Hindi (7)

- Akuma — https://akuma.moe
- HentaiHand — https://hentaihand.com
- Kagane — https://kagane.to
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### zh-Hans (7)

- Dongman Manhua — https://www.dongmanmanhua.cn
- NamiComi — https://namicomi.com
- SayManhwa — https://saymanhwa.com
- 小黄书 — https://xchina.co
- 快看漫画 — https://www.kuaikanmanhua.com
- 爱奇艺叭嗒 — https://bud.m.iqiyi.com
- 腾讯动漫 — https://m.ac.qq.com

### zh-Hant (7)

- CCC追漫台 — https://www.creative-comic.tw
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- NoyAcg — https://api.noyteam.online
- SayManhwa — https://saymanhwa.com
- XCOMIC — https://xcomic.me
- 小黄书 — https://tw.xchina.co

### Danois (6)

- Akuma — https://akuma.moe
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### jv (6)

- 3Hentai — https://3hentai.net
- Akuma — https://akuma.moe
- HentaiHand — https://hentaihand.com
- MangaDot — https://mangadot.net
- PandaChaika — https://panda.chaika.moe
- XCOMIC — https://xcomic.me

### Latin (6)

- 3Hentai — https://3hentai.net
- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- HentaiHand — https://hentaihand.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### ceb (5)

- Akuma — https://akuma.moe
- HentaiHand — https://hentaihand.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### et (5)

- Akuma — https://akuma.moe
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### ga (5)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### Hébreu (5)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### hr (5)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### is (5)

- 3Hentai — https://3hentai.net
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### Lituanien (5)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### Norvégien (5)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### other (5)

- Comic Fury — https://comicfury.com
- Comic Fury (No Text) — https://comicfury.com
- FoolSlide Customizable — https://127.0.0.1
- HentaiHand — https://hentaihand.com
- XCOMIC — https://xcomic.me

### Roumain (5)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- League of Legends — https://universe.leagueoflegends.com/ro_ro/comic/
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### sk (5)

- HentaiHand — https://hentaihand.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### Suédois (5)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### Filipino (5)

- 3Hentai — https://3hentai.net
- HentaiHand — https://hentaihand.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- PandaChaika — https://panda.chaika.moe

### eo (4)

- Akuma — https://akuma.moe
- HentaiHand — https://hentaihand.com
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### eu (4)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### fil (4)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com
- NamiComi — https://namicomi.com
- SayManhwa — https://saymanhwa.com
- XCOMIC — https://xcomic.me

### Mongol (4)

- HentaiHand — https://hentaihand.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### Malais (4)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### Birman (4)

- 3Hentai — https://3hentai.net
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### Népalais (4)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### sl (4)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### sr (4)

- HentaiHand — https://hentaihand.com
- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### af (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### am (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### be (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### Persan (3)

- MangaDot — https://mangadot.net
- NamiComi — https://namicomi.com
- XCOMIC — https://xcomic.me

### gl (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### gn (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### gu (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### hy (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### ig (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### ka (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### km (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### kn (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### lb (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### lo (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### lv (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### mg (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### mi (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### mk (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### ml (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### mo (3)

- 3Hentai — https://3hentai.net
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### mr (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### mt (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### ny (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### sd (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### si (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### sm (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### sn (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### sw (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### Tamil (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### te (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### yo (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### zu (3)

- Manga Million — https://mangamillion.shueisha.co.jp
- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### ab (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### az (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### Bengali (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### bs (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### cv (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### fo (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### ha (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### ht (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### Kazakh (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### ku (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### ky (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### pa (2)

- Manga Million — https://mangamillion.shueisha.co.jp
- NamiComi — https://namicomi.com

### ps (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### rm (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### Serbe-Croate (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### so (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### sq (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### ss (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### st (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### tg (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### ti (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### tk (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### to (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### ur (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### uz (2)

- MangaDot — https://mangadot.net
- XCOMIC — https://xcomic.me

### zh-tw (2)

- MangaDot — https://mangadot.net
- Pixiv — https://www.pixiv.net

### as (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### bho (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### bo (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### br (1)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com

### cnr (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### co (1)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com

### cy (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### doi (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### dv (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### ee (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### es-AR (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### es-MX (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### haw (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### hmn (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### ilo (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### ko-KR (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### kok (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### lg (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### lmo (1)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com

### ln (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### lus (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### mai (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### mni (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### mww (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### nso (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### or (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### qu (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### ro-MD (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### rw (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### sa (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### ts (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### vec (1)

- Dragon Ball Multiverse — https://www.dragonball-multiverse.com

### xh (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### yi (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### zh-CN (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### zh-HK (1)

- Manga Million — https://mangamillion.shueisha.co.jp

### zh-TW (1)

- Manga Million — https://mangamillion.shueisha.co.jp

---

## 4. Notes

- Le classement par langue se base sur la langue déclarée par la source (Keiyoushi) et, de notre côté, sur le champ `langs` du manifeste (à défaut `lang`).
- Les extensions multi-langues apparaissent sous la langue de leur source principale.
- La comparaison est faite source par source : une extension Keiyoushi multi-sources peut être partiellement couverte.
- Rapport généré automatiquement à partir de `index/manga.json` et de l'index décodé de Keiyoushi.
