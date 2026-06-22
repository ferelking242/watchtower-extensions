const watchtowerSources = [{
      "name": "MLP France",
      "langs": ["fr", "en"],
      "ids": { "fr": 841627593, "en": 192847365 },
      "baseUrl": "https://mlp-france.com",
      "apiUrl": "https://mlp-france.com",
      "iconUrl": "https://mlp-france.com/source/lyra16.png",
      "typeSource": "single",
      "itemType": 1,
      "version": "1.4.0",
      "pkgPath": "watch/fr/mlpfrance.js",
      "editableBaseUrl": false,
      "hasCloudflare": false,
      "videoQualities": ["720p", "480p", "360p"],
      "subCategories": ["film", "fim", "eqg", "g5", "retro", "cartoon", "extras"],
      "supportsForYou": true,
      "supportsComments": false,
      "requiresAccount": false,
      "hasDRM": false,
      "paywall": "free",
      "hasSubtitles": true,
      "hasDub": true,
      "notes": "MLP France — Films carrousel + FiM S1-9 + EqG + G5 + Pony Life + Rétro + Cartoons + Extras. VF + VOSTFR. MP4 direct."
    }];

    const BASE = "https://mlp-france.com";

    // ── FILMS (carrousel accueil — page 1 de getPopular) ──────────────────────
    const FILMS = [
      { n: "MLP: Nouvelle Génération (Film 2021)", u: BASE+"/mlpg5/mlpnewgen.php", i: BASE+"/source/banmlpnewgen.png", cat: "g5"   },
      { n: "MLP: Le Film (2017)",                  u: BASE+"/films/mlp2017.php",    i: BASE+"/source/banmlp2017.png",  cat: "film"  },
      { n: "Equestria Girls (Film 1)",             u: BASE+"/films/eqg.php",        i: BASE+"/source/baneqg.png",     cat: "eqg"   },
      { n: "EqG: Rainbow Rocks",                  u: BASE+"/films/rbr.php",        i: BASE+"/source/banrbr.png",     cat: "eqg"   },
      { n: "EqG: Friendship Games",               u: BASE+"/films/fsg.php",        i: BASE+"/source/banfsg.png",     cat: "eqg"   },
      { n: "EqG: Legend of Everfree",             u: BASE+"/films/loe.php",        i: BASE+"/source/banloe.png",     cat: "eqg"   },
    ];

    // ── SÉRIES (tout le reste, par section) ───────────────────────────────────
    const SERIES = [
      // ── G5 — Séries ──
      { n: "Make Your Mark",          u: BASE+"/mlpg5/mym.php",          i: BASE+"/source/banmym.png",                 cat: "g5"      },
      { n: "Tell Your Tale — S1",     u: BASE+"/mlpg5/tlts1.php",        i: BASE+"/source/bantlts.png",                cat: "g5"      },
      { n: "Tell Your Tale — S2",     u: BASE+"/mlpg5/tlts2.php",        i: BASE+"/source/bantlts.png",                cat: "g5"      },
      { n: "Tell Your Tale — S3",     u: BASE+"/mlpg5/tlts3.php",        i: BASE+"/source/bantlts.png",                cat: "g5"      },
      // ── FiM — Friendship is Magic ──
      { n: "MLP FiM — Saison 1",      u: BASE+"/episodes/saison1.php",   i: BASE+"/source/bansaison1.png",             cat: "fim"     },
      { n: "MLP FiM — Saison 2",      u: BASE+"/episodes/saison2.php",   i: BASE+"/source/bansaison2.png",             cat: "fim"     },
      { n: "MLP FiM — Saison 3",      u: BASE+"/episodes/saison3.php",   i: BASE+"/source/bansaison3.png",             cat: "fim"     },
      { n: "MLP FiM — Saison 4",      u: BASE+"/episodes/saison4.php",   i: BASE+"/source/bansaison4.png",             cat: "fim"     },
      { n: "MLP FiM — Saison 5",      u: BASE+"/episodes/saison5.php",   i: BASE+"/source/bansaison5.png",             cat: "fim"     },
      { n: "MLP FiM — Saison 6",      u: BASE+"/episodes/saison6.php",   i: BASE+"/source/bansaison6.png",             cat: "fim"     },
      { n: "MLP FiM — Saison 7",      u: BASE+"/episodes/saison7.php",   i: BASE+"/source/bansaison7.png",             cat: "fim"     },
      { n: "MLP FiM — Saison 8",      u: BASE+"/episodes/saison8.php",   i: BASE+"/source/bansaison8.png",             cat: "fim"     },
      { n: "MLP FiM — Saison 9",      u: BASE+"/episodes/saison9.php",   i: BASE+"/source/bansaison9.png",             cat: "fim"     },
      { n: "MLP FiM — Spéciaux",      u: BASE+"/episodes/specials.php",  i: BASE+"/source/Logo-MLPFrance-default.png", cat: "fim"     },
      // ── Equestria Girls — Séries ──
      { n: "EqG — Spéciaux",          u: BASE+"/episodes/egs.php",       i: BASE+"/source/baneqg.png",                 cat: "eqg"     },
      { n: "EqG — Mini-Séries S1",    u: BASE+"/episodes/egms.php",      i: BASE+"/source/baneqg.png",                 cat: "eqg"     },
      { n: "EqG — Mini-Séries S2",    u: BASE+"/episodes/egms2.php",     i: BASE+"/source/baneqg.png",                 cat: "eqg"     },
      // ── Pony Life ──
      { n: "Pony Life (S1 + S2)",     u: BASE+"/episodes/ponylife.php",  i: BASE+"/source/Logo-MLPFrance-default.png", cat: "fim"     },
      // ── Rétro MLP ──
      { n: "Mon Petit Poney G1 (1983)", u: BASE+"/retro/g1.php",         i: BASE+"/source/bang1.png",                  cat: "retro"   },
      { n: "MLP Tales G2",            u: BASE+"/retro/g2.php",           i: BASE+"/source/bang2.png",                  cat: "retro"   },
      { n: "MLP G3",                  u: BASE+"/retro/g3.php",           i: BASE+"/source/bang3.png",                  cat: "retro"   },
      // ── Cartoons — Star VS ──
      { n: "Star VS — Saison 1",      u: BASE+"/star/saison1.php",       i: BASE+"/source/starban.png",                cat: "cartoon" },
      { n: "Star VS — Saison 2",      u: BASE+"/star/saison2.php",       i: BASE+"/source/starban.png",                cat: "cartoon" },
      { n: "Star VS — Saison 3",      u: BASE+"/star/saison3.php",       i: BASE+"/source/starban.png",                cat: "cartoon" },
      { n: "Star VS — Saison 4",      u: BASE+"/star/saison4.php",       i: BASE+"/source/starban.png",                cat: "cartoon" },
      // ── Cartoons — Luz à Osville ──
      { n: "Luz à Osville — S1",      u: BASE+"/luz/saison1.php",        i: BASE+"/source/luzban.png",                 cat: "cartoon" },
      { n: "Luz à Osville — S2",      u: BASE+"/luz/saison2.php",        i: BASE+"/source/luzban.png",                 cat: "cartoon" },
      { n: "Luz à Osville — S3",      u: BASE+"/luz/saison3.php",        i: BASE+"/source/luzban.png",                 cat: "cartoon" },
      { n: "Luz à Osville — Extras",  u: BASE+"/luz/extras.php",         i: BASE+"/source/luzban.png",                 cat: "cartoon" },
      // ── Cartoons — Littlest Pet Shop ──
      { n: "Littlest Pet Shop — S1",  u: BASE+"/lps/saison1.php",        i: BASE+"/source/lpsban.png",                 cat: "cartoon" },
      { n: "Littlest Pet Shop — S2",  u: BASE+"/lps/saison2.php",        i: BASE+"/source/lpsban.png",                 cat: "cartoon" },
      { n: "Littlest Pet Shop — S3",  u: BASE+"/lps/saison3.php",        i: BASE+"/source/lpsban.png",                 cat: "cartoon" },
      { n: "Littlest Pet Shop — S4",  u: BASE+"/lps/saison4.php",        i: BASE+"/source/lpsban.png",                 cat: "cartoon" },
      // ── Extras ──
      { n: "Chansons",                u: BASE+"/extras/chansons.php",    i: BASE+"/source/Logo-MLPFrance-default.png", cat: "extras"  },
      { n: "Extras — Bonus Officiels",u: BASE+"/extras/bonus.php",       i: BASE+"/source/banbonus.png",               cat: "extras"  },
      { n: "Extras — Mashup Films",   u: BASE+"/extras/mashup.php",      i: BASE+"/source/banextra.png",               cat: "extras"  },
      { n: "Extras — Vidéos Fandom",  u: BASE+"/extras/fandom.php",      i: BASE+"/source/Logo-MLPFrance-default.png", cat: "extras"  },
    ];

    const CATALOG = FILMS.concat(SERIES);

    // Lookup rapide URL → entrée CATALOG
    var _byUrl = {};
    CATALOG.forEach(function(c) { _byUrl[c.u] = c; });

    class DefaultExtension extends MProvider {
      constructor() { super(); }

      _h(ref) {
        return {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Referer":    ref || (BASE + "/"),
          "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8"
        };
      }

      _dec(s) {
        return String(s || "")
          .replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#039;/g,"'")
          .replace(/&eacute;/g,"é").replace(/&agrave;/g,"à").replace(/&egrave;/g,"è")
          .replace(/&ccedil;/g,"ç").replace(/&ecirc;/g,"ê").replace(/&ocirc;/g,"ô")
          .replace(/&ugrave;/g,"ù").replace(/&nbsp;/g," ").replace(/<[^>]+>/g,"").trim();
      }

      _abs(href, base) {
        if (!href) return "";
        href = href.trim();
        if (/^https?:\/\//.test(href)) return href;
        if (href.startsWith("/")) return BASE + href;
        var parts = base.replace(/\/[^/]*$/, "").split("/");
        href.split("/").forEach(function(p) {
          if (p === "..") parts.pop(); else if (p !== ".") parts.push(p);
        });
        return parts.join("/");
      }

      _toItem(c) { return { link: c.u, imageUrl: c.i, name: c.n }; }

      // ── getPopular : page 1 = films (carrousel), suite = séries ──────────────
      async getPopular(page) {
        if (page === 1) {
          return { list: FILMS.map(this._toItem), hasNextPage: true };
        }
        var pp = 20, s = (page - 2) * pp;
        return {
          list: SERIES.slice(s, s + pp).map(this._toItem),
          hasNextPage: s + pp < SERIES.length
        };
      }

      // ── getLatestUpdates : scrape accueil.php + fallback G5/cartoon ──────────
      async getLatestUpdates(page) {
        var pp = 20, s = (page - 1) * pp;
        var recent = [];
        try {
          var r = await new Client().get(BASE + "/accueil.php", { headers: this._h() });
          var sortM = r.body.match(/<div class="sortieindex">([\s\S]*?)<\/div>/i);
          if (sortM) {
            var txt = sortM[1].toLowerCase().replace(/<[^>]+>/g, " ");
            CATALOG.forEach(function(c) {
              var words = c.n.toLowerCase().replace(/[—\-]/g," ").split(/\s+/).filter(function(w){ return w.length > 4; });
              if (words.some(function(w){ return txt.includes(w); })) recent.push(c);
            });
          }
        } catch(e) { /* réseau KO */ }
        if (recent.length === 0) {
          recent = CATALOG.filter(function(c){ return c.cat==="g5" || c.cat==="cartoon"; });
        }
        return {
          list: recent.slice(s, s + pp).map(this._toItem),
          hasNextPage: s + pp < recent.length
        };
      }

      // ── getForYou : ordre thématique complet ──────────────────────────────────
      async getForYou(page) {
        var ORDER = ["g5","film","eqg","fim","retro","cartoon","extras"];
        var ordered = [];
        ORDER.forEach(function(cat){
          CATALOG.filter(function(c){ return c.cat===cat; }).forEach(function(c){ ordered.push(c); });
        });
        var pp = 20, s = (page - 1) * pp;
        return {
          list: ordered.slice(s, s + pp).map(this._toItem),
          hasNextPage: s + pp < ordered.length
        };
      }

      // ── search ────────────────────────────────────────────────────────────────
      async search(query, page, filterList) {
        var q = (query || "").toLowerCase();
        var res = CATALOG.filter(function(c){ return c.n.toLowerCase().includes(q); });
        return { list: res.map(this._toItem), hasNextPage: false };
      }

      // ── getDetail ─────────────────────────────────────────────────────────────
      async getDetail(url) {
        var r    = await new Client().get(url, { headers: this._h(url) });
        var html = r.body;
        var _this = this;

        // Titre de page
        var tM   = html.match(/<title>([^<]+)<\/title>/i);
        var name = tM ? this._dec(tM[1]).replace(/^MLP France\s*[-—]\s*/i,"").trim() : "";

        // Image + description depuis CATALOG (fiable) ou depuis la page
        var cat  = _byUrl[url];
        var imageUrl = cat ? cat.i : "";
        if (!imageUrl) {
          var bM = html.match(/<img[^>]+src="([^"]+)"[^>]*width="960"/i);
          imageUrl = bM ? this._abs(bM[1], url) : "";
        }
        var description = cat ? cat.n : name;

        var episodes = [];
        var seen     = new Set();

        // ── Détection des en-têtes de saison (pages multi-saisons : ponylife, etc.) ──
        var seasons  = [];
        var shRe = /<span[^>]*class="large"[^>]*>\s*<b>([^<]+)<\/b>/gi;
        var shm;
        while ((shm = shRe.exec(html)) !== null) {
          var shLabel = this._dec(shm[1]).trim();
          if (/saison|season|partie|part/i.test(shLabel)) {
            seasons.push({ pos: shm.index, label: shLabel });
          }
        }
        var multiSeason = seasons.length > 1;

        function seasonOf(pos) {
          var label = "";
          for (var si = 0; si < seasons.length; si++) {
            if (seasons[si].pos <= pos) label = seasons[si].label;
            else break;
          }
          return label;
        }

        // ── Extraction des éléments de liste : list1 à list9+ ─────────────────
        var liRe = /<li class="list\d+">([\s\S]{1,2500}?)<\/li>/gi;
        var m;
        while ((m = liRe.exec(html)) !== null) {
          var item    = m[1];
          var liPos   = m.index;
          var season  = multiSeason ? seasonOf(liPos) : "";

          // Miniature de l'épisode
          var imgM  = item.match(/<img[^>]+src="([^"]+)"/i);
          var epImg = imgM ? _this._abs(imgM[1], url) : "";

          // Texte <b> (hors liens) → titre/numéro de l'épisode
          var bTexts = [];
          var bRe = /<b>([\s\S]{1,400}?)<\/b>/gi;
          var bm;
          while ((bm = bRe.exec(item)) !== null) {
            var inner = bm[1].replace(/<br\s*\/?>/gi," ").replace(/<a[^>]*>[\s\S]*?<\/a>/gi,"");
            var t = _this._dec(inner).trim();
            if (t) bTexts.push(t);
          }

          // Texte brut (sans balises, sans images) → sous-titre éventuel
          var plain = item
            .replace(/<img[^>]+>/gi,"")
            .replace(/<[^>]+>/g," ")
            .replace(/&nbsp;/g," ")
            .replace(/\s{2,}/g," ")
            .trim();
          var titlePart = plain;
          bTexts.forEach(function(bt){ titlePart = titlePart.replace(bt," "); });
          titlePart = titlePart
            .replace(/\b(VOSTFR|VOSTF|VF|VO|ENGLISH|FRENCH|FRANÇAIS|ESPAÑOL|LATINO|BRASILEIRO|ITALIANO|NEDERLANDS|DEUTSCH|POLSKI|MAGYAR|DANSK)\b/gi,"")
            .replace(/\s{2,}/g," ").trim();

          var base2 = bTexts.length
            ? (titlePart ? bTexts.join(" — ") + " — " + titlePart : bTexts.join(" — "))
            : titlePart;
          if (season) base2 = season + (base2 ? " — " + base2 : "");

          var beforeCount = episodes.length;

          // Liens class="link" → un épisode par langue
          var lkRe = /href="([^"]+)"[^>]*class="link"[^>]*>([^<]{1,80})<\/a>/gi;
          var lm;
          while ((lm = lkRe.exec(item)) !== null) {
            var eu   = _this._abs(lm[1], url);
            if (seen.has(eu)) continue;
            seen.add(eu);
            var lang   = _this._dec(lm[2]).trim();
            var epName = (base2 && base2.toLowerCase() !== lang.toLowerCase())
              ? base2 + " [" + lang + "]"
              : lang;
            episodes.push({ name: epName, url: eu, imageUrl: epImg });
          }

          // Fallback : liens .php sans class="link" (pages avec flags cliquables)
          if (episodes.length === beforeCount) {
            var anyRe = /href="([^"]+\.php[^"]*)"/gi;
            while ((lm = anyRe.exec(item)) !== null) {
              var eu2 = _this._abs(lm[1], url);
              if (seen.has(eu2)) continue;
              seen.add(eu2);
              var ctx  = item.slice(Math.max(0, lm.index - 30), lm.index + 180);
              var lang2 = /french|vf|fr\.png/i.test(ctx)    ? "VF"
                        : /english|vostfr|en\.png/i.test(ctx) ? "VOSTFR"
                        : /español|es\.png|spanish/i.test(ctx) ? "ES"
                        : /italiano|it\.png/i.test(ctx)       ? "IT"
                        : /deutsch|de\.png|german/i.test(ctx) ? "DE"
                        : /polski|pl\.png/i.test(ctx)         ? "PL"
                        : /latino|mx\.png/i.test(ctx)         ? "Latino"
                        : /brasil|br\.png/i.test(ctx)         ? "BR"
                        : /dutch|nl\.png/i.test(ctx)          ? "NL"
                        : /magyar|hu\.png/i.test(ctx)         ? "HU"
                        : /dansk|dk\.png/i.test(ctx)          ? "DK"
                        : "VOIR";
              var lbl   = base2 || lang2;
              episodes.push({ name: lbl !== lang2 ? lbl + " [" + lang2 + "]" : lang2, url: eu2, imageUrl: epImg });
            }
          }
        }

        // ── Fallback tableau (page fandom / extras) ───────────────────────────
        if (episodes.length === 0) {
          var tdRe = /<td[^>]*>([\s\S]{1,600}?)<\/td>/gi;
          while ((m = tdRe.exec(html)) !== null) {
            var cell = m[1];
            var lkM  = cell.match(/href="([^"]+)"[^>]*class="link"[^>]*>([\s\S]{1,200}?)<\/a>/i);
            if (!lkM) continue;
            var eu3  = /^https?:\/\//.test(lkM[1]) ? lkM[1] : this._abs(lkM[1], url);
            if (seen.has(eu3)) continue;
            seen.add(eu3);
            episodes.push({ name: this._dec(lkM[2]), url: eu3 });
          }
        }

        // ── Fallback player direct (la page EST déjà un player) ──────────────
        if (episodes.length === 0 &&
            (html.includes("NPlayer") || html.includes("makamour") || html.includes(".mp4"))) {
          episodes.push({ name: name || "Regarder", url: url });
        }

        if (episodes.length === 0) episodes.push({ name: name || "Ouvrir", url: url });

        return {
          name:        name || (cat ? cat.n : url),
          imageUrl:    imageUrl,
          description: description,
          episodes:    episodes
        };
      }

      // ── getVideoList : extrait les MP4/WebM depuis NPlayer ───────────────────
      async getVideoList(url) {
        if (/\.(mp4|webm|m3u8)(\?[^?]*)?$/i.test(url)) {
          return [{ url: url, quality: "AUTO", headers: this._h(url) }];
        }

        var r    = await new Client().get(url, { headers: this._h(url) });
        var html = r.body;
        var videos = [];
        var m;

        // NPlayer : '720p': 'url.mp4'
        var mp4Re = /['"]?(\d+p)['"]?\s*:\s*['"]([^'"]+\.mp4[^'"]*)['"]/gi;
        while ((m = mp4Re.exec(html)) !== null) {
          videos.push({ url: m[2], quality: m[1], headers: this._h(url) });
        }

        // WebM si aucun MP4
        if (videos.length === 0) {
          var webmRe = /['"]?(\d+p)['"]?\s*:\s*['"]([^'"]+\.webm[^'"]*)['"]/gi;
          while ((m = webmRe.exec(html)) !== null) {
            videos.push({ url: m[2], quality: m[1] + " (WebM)", headers: this._h(url) });
          }
        }

        // Lien direct MP4/WebM/M3U8 brut
        if (videos.length === 0) {
          var directRe = /['"](https?:\/\/[^'"]+\.(?:mp4|webm|m3u8)[^'"]*)['"]/gi;
          while ((m = directRe.exec(html)) !== null) {
            if (!videos.some(function(v){ return v.url === m[1]; })) {
              videos.push({ url: m[1], quality: "AUTO", headers: this._h(url) });
            }
          }
        }

        // Iframe (player externe)
        if (videos.length === 0) {
          var ifRe = /<iframe[^>]+src="([^"]+)"/gi;
          while ((m = ifRe.exec(html)) !== null) {
            if (!m[1].includes("javascript")) {
              videos.push({ url: m[1], quality: "AUTO", headers: this._h() });
            }
          }
        }

        if (videos.length === 0) videos.push({ url: url, quality: "AUTO", headers: this._h() });
        return videos;
      }

      getComments(url, page) { return Promise.resolve([]); }
    }
