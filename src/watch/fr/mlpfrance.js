const watchtowerSources = [{
      "name": "MLP France",
      "langs": ["fr", "en"],
      "ids": { "fr": 841627593, "en": 192847365 },
      "baseUrl": "https://mlp-france.com",
      "apiUrl": "https://mlp-france.com",
      "iconUrl": "https://mlp-france.com/source/lyra16.png",
      "typeSource": "single",
      "itemType": 1,
      "version": "1.3.0",
      "pkgPath": "watch/fr/mlpfrance.js",
      "editableBaseUrl": false,
      "hasCloudflare": false,
      "videoQualities": ["720p", "480p", "360p"],
      "subCategories": ["film", "serie", "cartoon", "extras"],
      "supportsForYou": true,
      "supportsComments": false,
      "requiresAccount": false,
      "hasDRM": false,
      "paywall": "free",
      "hasSubtitles": true,
      "hasDub": true,
      "notes": "MLP France — G5, FiM, EqG, Retro, Luz, Star, LPS, Extras. VF + VO. MP4 direct."
    }];

    const BASE = "https://mlp-france.com";

    const CATALOG = [
      { n: "MLP: Nouvelle Génération (Film)", u: BASE+"/mlpg5/mlpnewgen.php",  i: BASE+"/source/banmlpnewgen.png", cat: "g5",      d: "My Little Pony: A New Generation (2021)" },
      { n: "Make Your Mark",                  u: BASE+"/mlpg5/mym.php",        i: BASE+"/source/banmym.png",      cat: "g5",      d: "MLP: Make Your Mark" },
      { n: "Tell Your Tale — S1",             u: BASE+"/mlpg5/tlts1.php",      i: BASE+"/source/bantlts.png",     cat: "g5",      d: "Tell Your Tale Saison 1" },
      { n: "Tell Your Tale — S2",             u: BASE+"/mlpg5/tlts2.php",      i: BASE+"/source/bantlts.png",     cat: "g5",      d: "Tell Your Tale Saison 2" },
      { n: "Tell Your Tale — S3",             u: BASE+"/mlpg5/tlts3.php",      i: BASE+"/source/bantlts.png",     cat: "g5",      d: "Tell Your Tale Saison 3" },
      { n: "MLP: Le Film (2017)",             u: BASE+"/films/mlp2017.php",    i: BASE+"/source/banmlp2017.png",  cat: "film",    d: "My Little Pony: Le Film (2017)" },
      { n: "Equestria Girls (Film 1)",        u: BASE+"/films/eqg.php",        i: BASE+"/source/baneqg.png",      cat: "eqg",     d: "Equestria Girls" },
      { n: "EqG: Rainbow Rocks",             u: BASE+"/films/rbr.php",        i: BASE+"/source/banrbr.png",      cat: "eqg",     d: "Equestria Girls: Rainbow Rocks" },
      { n: "EqG: Friendship Games",          u: BASE+"/films/fsg.php",        i: BASE+"/source/banfsg.png",      cat: "eqg",     d: "Equestria Girls: Friendship Games" },
      { n: "EqG: Legend of Everfree",        u: BASE+"/films/loe.php",        i: BASE+"/source/banloe.png",      cat: "eqg",     d: "Equestria Girls: Legend of Everfree" },
      { n: "EqG — Spéciaux",                 u: BASE+"/episodes/egs.php",     i: BASE+"/source/baneqg.png",      cat: "eqg",     d: "Equestria Girls Spéciaux" },
      { n: "EqG — Mini-Séries S1",           u: BASE+"/episodes/egms.php",    i: BASE+"/source/baneqg.png",      cat: "eqg",     d: "EqG Mini-Séries Saison 1" },
      { n: "EqG — Mini-Séries S2",           u: BASE+"/episodes/egms2.php",   i: BASE+"/source/baneqg.png",      cat: "eqg",     d: "EqG Mini-Séries Saison 2" },
      { n: "MLP FiM — Saison 1",  u: BASE+"/episodes/saison1.php",  i: BASE+"/source/bansaison1.png",             cat: "fim", d: "Friendship is Magic S1 (26 éps)" },
      { n: "MLP FiM — Saison 2",  u: BASE+"/episodes/saison2.php",  i: BASE+"/source/bansaison2.png",             cat: "fim", d: "Friendship is Magic S2 (26 éps)" },
      { n: "MLP FiM — Saison 3",  u: BASE+"/episodes/saison3.php",  i: BASE+"/source/bansaison3.png",             cat: "fim", d: "Friendship is Magic S3 (13 éps)" },
      { n: "MLP FiM — Saison 4",  u: BASE+"/episodes/saison4.php",  i: BASE+"/source/bansaison4.png",             cat: "fim", d: "Friendship is Magic S4 (26 éps)" },
      { n: "MLP FiM — Saison 5",  u: BASE+"/episodes/saison5.php",  i: BASE+"/source/bansaison5.png",             cat: "fim", d: "Friendship is Magic S5 (26 éps)" },
      { n: "MLP FiM — Saison 6",  u: BASE+"/episodes/saison6.php",  i: BASE+"/source/bansaison6.png",             cat: "fim", d: "Friendship is Magic S6 (26 éps)" },
      { n: "MLP FiM — Saison 7",  u: BASE+"/episodes/saison7.php",  i: BASE+"/source/bansaison7.png",             cat: "fim", d: "Friendship is Magic S7 (26 éps)" },
      { n: "MLP FiM — Saison 8",  u: BASE+"/episodes/saison8.php",  i: BASE+"/source/bansaison8.png",             cat: "fim", d: "Friendship is Magic S8 (26 éps)" },
      { n: "MLP FiM — Saison 9",  u: BASE+"/episodes/saison9.php",  i: BASE+"/source/bansaison9.png",             cat: "fim", d: "Friendship is Magic S9 — Finale" },
      { n: "MLP FiM — Spéciaux",  u: BASE+"/episodes/specials.php", i: BASE+"/source/Logo-MLPFrance-default.png", cat: "fim", d: "FiM Épisodes spéciaux" },
      { n: "Pony Life",            u: BASE+"/episodes/ponylife.php", i: BASE+"/source/Logo-MLPFrance-default.png", cat: "fim", d: "My Little Pony: Pony Life" },
      { n: "Mon Petit Poney G1 (1983)", u: BASE+"/retro/g1.php", i: BASE+"/source/bang1.png", cat: "retro", d: "Génération 1 (1983)" },
      { n: "MLP Tales G2",              u: BASE+"/retro/g2.php", i: BASE+"/source/bang2.png", cat: "retro", d: "My Little Pony Tales" },
      { n: "MLP G3",                    u: BASE+"/retro/g3.php", i: BASE+"/source/bang3.png", cat: "retro", d: "My Little Pony Génération 3" },
      { n: "Luz à Osville — S1",    u: BASE+"/luz/saison1.php", i: BASE+"/source/luzban.png", cat: "cartoon", d: "The Owl House — Saison 1" },
      { n: "Luz à Osville — S2",    u: BASE+"/luz/saison2.php", i: BASE+"/source/luzban.png", cat: "cartoon", d: "The Owl House — Saison 2" },
      { n: "Luz à Osville — S3",    u: BASE+"/luz/saison3.php", i: BASE+"/source/luzban.png", cat: "cartoon", d: "The Owl House — Saison 3" },
      { n: "Luz à Osville — Extras",u: BASE+"/luz/extras.php",  i: BASE+"/source/luzban.png", cat: "cartoon", d: "The Owl House — Extras" },
      { n: "Star VS — S1", u: BASE+"/star/saison1.php", i: BASE+"/source/starban.png", cat: "cartoon", d: "Star VS the Forces of Evil S1" },
      { n: "Star VS — S2", u: BASE+"/star/saison2.php", i: BASE+"/source/starban.png", cat: "cartoon", d: "Star VS the Forces of Evil S2" },
      { n: "Star VS — S3", u: BASE+"/star/saison3.php", i: BASE+"/source/starban.png", cat: "cartoon", d: "Star VS the Forces of Evil S3" },
      { n: "Star VS — S4", u: BASE+"/star/saison4.php", i: BASE+"/source/starban.png", cat: "cartoon", d: "Star VS the Forces of Evil S4" },
      { n: "Littlest Pet Shop — S1", u: BASE+"/lps/saison1.php", i: BASE+"/source/lpsban.png", cat: "cartoon", d: "Littlest Pet Shop Saison 1" },
      { n: "Littlest Pet Shop — S2", u: BASE+"/lps/saison2.php", i: BASE+"/source/lpsban.png", cat: "cartoon", d: "Littlest Pet Shop Saison 2" },
      { n: "Littlest Pet Shop — S3", u: BASE+"/lps/saison3.php", i: BASE+"/source/lpsban.png", cat: "cartoon", d: "Littlest Pet Shop Saison 3" },
      { n: "Littlest Pet Shop — S4", u: BASE+"/lps/saison4.php", i: BASE+"/source/lpsban.png", cat: "cartoon", d: "Littlest Pet Shop Saison 4" },
      { n: "Extras — Bonus Officiels", u: BASE+"/extras/bonus.php",  i: BASE+"/source/banbonus.png",               cat: "extras", d: "Bonus officiels — Behind the Scenes, Shorts, Featurettes" },
      { n: "Extras — Mashup Films",    u: BASE+"/extras/mashup.php", i: BASE+"/source/banextra.png",               cat: "extras", d: "Mashup Films FiM (résumés animés)" },
      { n: "Extras — Vidéos Fandom",   u: BASE+"/extras/fandom.php", i: BASE+"/source/Logo-MLPFrance-default.png", cat: "extras", d: "Vidéos de la communauté brony" },
    ];

    const CAT_ORDER = ["g5", "film", "eqg", "fim", "retro", "cartoon", "extras"];

    class DefaultExtension extends MProvider {
      constructor() { super(); }

      _h(ref) {
        return {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Referer": ref || (BASE + "/"),
          "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8"
        };
      }

      _dec(s) {
        return String(s || "")
          .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'")
          .replace(/&eacute;/g, "é").replace(/&agrave;/g, "à").replace(/&egrave;/g, "è")
          .replace(/&ccedil;/g, "ç").replace(/&ecirc;/g, "ê").replace(/&ocirc;/g, "ô")
          .replace(/&ugrave;/g, "ù").replace(/&nbsp;/g, " ").replace(/<[^>]+>/g, "").trim();
      }

      // Résolution d'URL relative supportant ../
      _abs(href, base) {
        if (!href) return "";
        href = href.trim();
        if (/^https?:\/\//.test(href)) return href;
        if (href.startsWith("/")) return BASE + href;
        var parts = base.replace(/\/[^/]*$/, "").split("/");
        href.split("/").forEach(function(p) {
          if (p === "..") parts.pop();
          else if (p !== ".") parts.push(p);
        });
        return parts.join("/");
      }

      async getPopular(page) {
        var pp = 20, s = (page - 1) * pp;
        return {
          list: CATALOG.slice(s, s + pp).map(function(c) { return { link: c.u, imageUrl: c.i, name: c.n }; }),
          hasNextPage: s + pp < CATALOG.length
        };
      }

      async getForYou(page) {
        var ordered = [];
        for (var ci = 0; ci < CAT_ORDER.length; ci++) {
          CATALOG.filter(function(c) { return c.cat === CAT_ORDER[ci]; }).forEach(function(c) { ordered.push(c); });
        }
        var pp = 20, s = (page - 1) * pp;
        return {
          list: ordered.slice(s, s + pp).map(function(c) { return { link: c.u, imageUrl: c.i, name: c.n }; }),
          hasNextPage: s + pp < ordered.length
        };
      }

      async getLatestUpdates(page) {
        var recent = CATALOG.filter(function(c) { return c.cat === "g5" || c.cat === "cartoon" || c.cat === "extras"; });
        var pp = 20, s = (page - 1) * pp;
        return {
          list: recent.slice(s, s + pp).map(function(c) { return { link: c.u, imageUrl: c.i, name: c.n }; }),
          hasNextPage: s + pp < recent.length
        };
      }

      async search(query, page, filterList) {
        var q = (query || "").toLowerCase();
        var res = CATALOG.filter(function(c) { return c.n.toLowerCase().includes(q) || c.d.toLowerCase().includes(q); });
        return { list: res.map(function(c) { return { link: c.u, imageUrl: c.i, name: c.n }; }), hasNextPage: false };
      }

      async getDetail(url) {
        var r    = await new Client().get(url, { headers: this._h(url) });
        var html = r.body;

        var tM = html.match(/<title>([^<]+)<\/title>/i);
        var name = tM ? this._dec(tM[1]).replace(/^MLP France\s*[-—]\s*/i, "").trim() : "";

        // Utilise l'image du CATALOG directement (URL absolue, fiable)
        var cat = CATALOG.find(function(c) { return c.u === url; });
        var imageUrl = cat ? cat.i : "";
        if (!imageUrl) {
          var bM = html.match(/<img[^>]+src="([^"]+)"[^>]*width="960"/i);
          imageUrl = bM ? this._abs(bM[1], url) : "";
        }
        var description = cat ? cat.d : name;

        var episodes = [];
        var seen = new Set();
        var _this = this;

        // ── Items liste : list1, list2, list3, list4 ──────────────────────────────
        var liRe = /<li class="list[1-4]">([\s\S]{1,2500}?)<\/li>/gi;
        var m;
        while ((m = liRe.exec(html)) !== null) {
          var item = m[1];

          // Vignette miniature de l'épisode
          var imgM = item.match(/<img[^>]+src="([^"]+)"/i);
          var epImg = imgM ? _this._abs(imgM[1], url) : "";

          // Extraire texte <b> EN EXCLUANT le contenu <a> (évite duplication lang)
          var bTexts = [];
          var bRe = /<b>([\s\S]{1,400}?)<\/b>/gi;
          var bm;
          while ((bm = bRe.exec(item)) !== null) {
            var inner = bm[1].replace(/<br\s*\/?>/gi, " ").replace(/<a[^>]*>[\s\S]*?<\/a>/gi, "");
            var t = _this._dec(inner).trim();
            if (t) bTexts.push(t);
          }
          var bLabel = bTexts.join(" — ");

          // Texte brut sans balises
          var plain = item
            .replace(/<img[^>]+>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/\s{2,}/g, " ")
            .trim();

          // Partie titre = texte brut - bLabel - labels lang
          var titlePart = plain;
          bTexts.forEach(function(bt) { titlePart = titlePart.replace(bt, " "); });
          titlePart = titlePart
            .replace(/\b(VOSTFR|VOSTF|VF|VO|ENGLISH|FRENCH|FRANÇAIS)\b/gi, "")
            .replace(/\s{2,}/g, " ")
            .trim();

          var base2 = bLabel
            ? (titlePart ? bLabel + " — " + titlePart : bLabel)
            : titlePart;

          var beforeCount = episodes.length;

          // Liens class="link"
          var lkRe = /href="([^"]+)"[^>]*class="link"[^>]*>([^<]{1,60})<\/a>/gi;
          var lm;
          while ((lm = lkRe.exec(item)) !== null) {
            var eu = _this._abs(lm[1], url);
            if (seen.has(eu)) continue;
            seen.add(eu);
            var lang = _this._dec(lm[2]).trim();
            // Évite "ENGLISH [ENGLISH]" sur pages films
            var epName = (base2 && base2.toLowerCase() !== lang.toLowerCase())
              ? base2 + " [" + lang + "]"
              : lang;
            episodes.push({ name: epName, url: eu, imageUrl: epImg });
          }

          // Fallback : liens sans class="link" (G5 NewGen flags)
          if (episodes.length === beforeCount) {
            var anyRe = /href="([^"]+\.php[^"]*)"/gi;
            while ((lm = anyRe.exec(item)) !== null) {
              var eu2 = _this._abs(lm[1], url);
              if (seen.has(eu2)) continue;
              seen.add(eu2);
              var ctx = item.slice(Math.max(0, lm.index - 20), lm.index + 150);
              var lang2 = /french|vf|fr\.png/i.test(ctx) ? "VF"
                        : /english|vostfr|vo\.php|en\.png/i.test(ctx) ? "VO"
                        : "VOIR";
              var label = base2 || lang2;
              var epName2 = (label !== lang2) ? label + " [" + lang2 + "]" : lang2;
              episodes.push({ name: epName2, url: eu2, imageUrl: epImg });
            }
          }
        }

        // ── Format table (page fandom) ────────────────────────────────────────────
        if (episodes.length === 0) {
          var tdRe = /<td[^>]*>([\s\S]{1,600}?)<\/td>/gi;
          while ((m = tdRe.exec(html)) !== null) {
            var cell = m[1];
            var lkM = cell.match(/href="([^"]+)"[^>]*class="link"[^>]*>([\s\S]{1,200}?)<\/a>/i);
            if (!lkM) continue;
            var eu3 = /^https?:\/\//.test(lkM[1]) ? lkM[1] : _this._abs(lkM[1], url);
            if (seen.has(eu3)) continue;
            seen.add(eu3);
            episodes.push({ name: _this._dec(lkM[2]), url: eu3 });
          }
        }

        // ── Fallback player direct ────────────────────────────────────────────────
        if (episodes.length === 0 &&
            (html.includes("NPlayer") || html.includes("makamour") || html.includes(".mp4"))) {
          episodes.push({ name: name || "Regarder", url: url });
        }

        if (episodes.length === 0) episodes.push({ name: name || "Ouvrir", url: url });

        return { name: name || (cat ? cat.n : url), imageUrl: imageUrl, description: description, episodes: episodes };
      }

      async getVideoList(url) {
        if (/\.(mp4|webm|m3u8)(\?[^?]*)?$/i.test(url)) {
          return [{ url: url, quality: "AUTO", headers: this._h(url) }];
        }

        var r    = await new Client().get(url, { headers: this._h(url) });
        var html = r.body;
        var videos = [];

        var mp4Re = /['"]?(\d+p)['"]?\s*:\s*['"]([^'"]+\.mp4[^'"]*)['"]/gi;
        var m;
        while ((m = mp4Re.exec(html)) !== null) {
          videos.push({ url: m[2], quality: m[1], headers: this._h(url) });
        }

        if (videos.length === 0) {
          var webmRe = /['"]?(\d+p)['"]?\s*:\s*['"]([^'"]+\.webm[^'"]*)['"]/gi;
          while ((m = webmRe.exec(html)) !== null) {
            videos.push({ url: m[2], quality: m[1] + " (WebM)", headers: this._h(url) });
          }
        }

        if (videos.length === 0) {
          var directRe = /['"](https?:\/\/[^'"]+\.(?:mp4|webm|m3u8)[^'"]*)['"]/gi;
          while ((m = directRe.exec(html)) !== null) {
            if (!videos.some(function(v) { return v.url === m[1]; })) {
              videos.push({ url: m[1], quality: "AUTO", headers: this._h(url) });
            }
          }
        }

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
  