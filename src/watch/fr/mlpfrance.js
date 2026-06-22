const watchtowerSources = [{
    "name": "MLP France",
    "langs": ["fr", "en"],
    "ids": { "fr": 841627593, "en": 192847365 },
    "baseUrl": "https://mlp-france.com",
    "apiUrl": "https://mlp-france.com",
    "iconUrl": "https://mlp-france.com/source/lyra16.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.2.0",
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

  // ── CATALOGUE ─────────────────────────────────────────────────────────────────
  const CATALOG = [
    // ── G5 NEW GEN ──────────────────────────────────────────────────────────────
    { n: "MLP: Nouvelle Génération (Film)", u: `${BASE}/mlpg5/mlpnewgen.php`,  i: `${BASE}/source/banmlpnewgen.png`, cat: "g5",      d: "My Little Pony: A New Generation (2021)" },
    { n: "Make Your Mark",                  u: `${BASE}/mlpg5/mym.php`,        i: `${BASE}/source/banmym.png`,      cat: "g5",      d: "MLP: Make Your Mark" },
    { n: "Tell Your Tale — S1",             u: `${BASE}/mlpg5/tlts1.php`,      i: `${BASE}/source/bantlts.png`,     cat: "g5",      d: "Tell Your Tale Saison 1" },
    { n: "Tell Your Tale — S2",             u: `${BASE}/mlpg5/tlts2.php`,      i: `${BASE}/source/bantlts.png`,     cat: "g5",      d: "Tell Your Tale Saison 2" },
    { n: "Tell Your Tale — S3",             u: `${BASE}/mlpg5/tlts3.php`,      i: `${BASE}/source/bantlts.png`,     cat: "g5",      d: "Tell Your Tale Saison 3" },
    // ── FILM G4 ─────────────────────────────────────────────────────────────────
    { n: "MLP: Le Film (2017)",             u: `${BASE}/films/mlp2017.php`,    i: `${BASE}/source/banmlp2017.png`,  cat: "film",    d: "My Little Pony: Le Film (2017)" },
    // ── EQUESTRIA GIRLS — Films ─────────────────────────────────────────────────
    { n: "Equestria Girls (Film 1)",        u: `${BASE}/films/eqg.php`,        i: `${BASE}/source/baneqg.png`,      cat: "eqg",     d: "Equestria Girls" },
    { n: "EqG: Rainbow Rocks",             u: `${BASE}/films/rbr.php`,        i: `${BASE}/source/banrbr.png`,      cat: "eqg",     d: "Equestria Girls: Rainbow Rocks" },
    { n: "EqG: Friendship Games",          u: `${BASE}/films/fsg.php`,        i: `${BASE}/source/banfsg.png`,      cat: "eqg",     d: "Equestria Girls: Friendship Games" },
    { n: "EqG: Legend of Everfree",        u: `${BASE}/films/loe.php`,        i: `${BASE}/source/banloe.png`,      cat: "eqg",     d: "Equestria Girls: Legend of Everfree" },
    // ── EQUESTRIA GIRLS — Séries ────────────────────────────────────────────────
    { n: "EqG — Spéciaux",                 u: `${BASE}/episodes/egs.php`,     i: `${BASE}/source/baneqg.png`,      cat: "eqg",     d: "Equestria Girls Spéciaux" },
    { n: "EqG — Mini-Séries S1",           u: `${BASE}/episodes/egms.php`,    i: `${BASE}/source/baneqg.png`,      cat: "eqg",     d: "EqG Mini-Séries Saison 1" },
    { n: "EqG — Mini-Séries S2",           u: `${BASE}/episodes/egms2.php`,   i: `${BASE}/source/baneqg.png`,      cat: "eqg",     d: "EqG Mini-Séries Saison 2" },
    // ── MLP FiM ─────────────────────────────────────────────────────────────────
    { n: "MLP FiM — Saison 1",  u: `${BASE}/episodes/saison1.php`,  i: `${BASE}/source/bansaison1.png`,             cat: "fim", d: "Friendship is Magic S1 (26 éps)" },
    { n: "MLP FiM — Saison 2",  u: `${BASE}/episodes/saison2.php`,  i: `${BASE}/source/bansaison2.png`,             cat: "fim", d: "Friendship is Magic S2 (26 éps)" },
    { n: "MLP FiM — Saison 3",  u: `${BASE}/episodes/saison3.php`,  i: `${BASE}/source/bansaison3.png`,             cat: "fim", d: "Friendship is Magic S3 (13 éps)" },
    { n: "MLP FiM — Saison 4",  u: `${BASE}/episodes/saison4.php`,  i: `${BASE}/source/bansaison4.png`,             cat: "fim", d: "Friendship is Magic S4 (26 éps)" },
    { n: "MLP FiM — Saison 5",  u: `${BASE}/episodes/saison5.php`,  i: `${BASE}/source/bansaison5.png`,             cat: "fim", d: "Friendship is Magic S5 (26 éps)" },
    { n: "MLP FiM — Saison 6",  u: `${BASE}/episodes/saison6.php`,  i: `${BASE}/source/bansaison6.png`,             cat: "fim", d: "Friendship is Magic S6 (26 éps)" },
    { n: "MLP FiM — Saison 7",  u: `${BASE}/episodes/saison7.php`,  i: `${BASE}/source/bansaison7.png`,             cat: "fim", d: "Friendship is Magic S7 (26 éps)" },
    { n: "MLP FiM — Saison 8",  u: `${BASE}/episodes/saison8.php`,  i: `${BASE}/source/bansaison8.png`,             cat: "fim", d: "Friendship is Magic S8 (26 éps)" },
    { n: "MLP FiM — Saison 9",  u: `${BASE}/episodes/saison9.php`,  i: `${BASE}/source/bansaison9.png`,             cat: "fim", d: "Friendship is Magic S9 — Finale" },
    { n: "MLP FiM — Spéciaux",  u: `${BASE}/episodes/specials.php`, i: `${BASE}/source/Logo-MLPFrance-default.png`, cat: "fim", d: "FiM Épisodes spéciaux" },
    { n: "Pony Life",            u: `${BASE}/episodes/ponylife.php`, i: `${BASE}/source/Logo-MLPFrance-default.png`, cat: "fim", d: "My Little Pony: Pony Life" },
    // ── RETRO ───────────────────────────────────────────────────────────────────
    { n: "Mon Petit Poney G1 (1983)", u: `${BASE}/retro/g1.php`, i: `${BASE}/source/bang1.png`, cat: "retro", d: "Génération 1 (1983)" },
    { n: "MLP Tales G2",              u: `${BASE}/retro/g2.php`, i: `${BASE}/source/bang2.png`, cat: "retro", d: "My Little Pony Tales" },
    { n: "MLP G3",                    u: `${BASE}/retro/g3.php`, i: `${BASE}/source/bang3.png`, cat: "retro", d: "My Little Pony Génération 3" },
    // ── LUZ À OSVILLE (The Owl House) ───────────────────────────────────────────
    { n: "Luz à Osville — S1",    u: `${BASE}/luz/saison1.php`, i: `${BASE}/source/luzban.png`, cat: "cartoon", d: "The Owl House — Saison 1" },
    { n: "Luz à Osville — S2",    u: `${BASE}/luz/saison2.php`, i: `${BASE}/source/luzban.png`, cat: "cartoon", d: "The Owl House — Saison 2" },
    { n: "Luz à Osville — S3",    u: `${BASE}/luz/saison3.php`, i: `${BASE}/source/luzban.png`, cat: "cartoon", d: "The Owl House — Saison 3" },
    { n: "Luz à Osville — Extras",u: `${BASE}/luz/extras.php`,  i: `${BASE}/source/luzban.png`, cat: "cartoon", d: "The Owl House — Extras" },
    // ── STAR BUTTERFLY ──────────────────────────────────────────────────────────
    { n: "Star VS — S1", u: `${BASE}/star/saison1.php`, i: `${BASE}/source/starban.png`, cat: "cartoon", d: "Star VS the Forces of Evil S1" },
    { n: "Star VS — S2", u: `${BASE}/star/saison2.php`, i: `${BASE}/source/starban.png`, cat: "cartoon", d: "Star VS the Forces of Evil S2" },
    { n: "Star VS — S3", u: `${BASE}/star/saison3.php`, i: `${BASE}/source/starban.png`, cat: "cartoon", d: "Star VS the Forces of Evil S3" },
    { n: "Star VS — S4", u: `${BASE}/star/saison4.php`, i: `${BASE}/source/starban.png`, cat: "cartoon", d: "Star VS the Forces of Evil S4" },
    // ── LITTLEST PET SHOP ───────────────────────────────────────────────────────
    { n: "Littlest Pet Shop — S1", u: `${BASE}/lps/saison1.php`, i: `${BASE}/source/lpsban.png`, cat: "cartoon", d: "Littlest Pet Shop Saison 1" },
    { n: "Littlest Pet Shop — S2", u: `${BASE}/lps/saison2.php`, i: `${BASE}/source/lpsban.png`, cat: "cartoon", d: "Littlest Pet Shop Saison 2" },
    { n: "Littlest Pet Shop — S3", u: `${BASE}/lps/saison3.php`, i: `${BASE}/source/lpsban.png`, cat: "cartoon", d: "Littlest Pet Shop Saison 3" },
    { n: "Littlest Pet Shop — S4", u: `${BASE}/lps/saison4.php`, i: `${BASE}/source/lpsban.png`, cat: "cartoon", d: "Littlest Pet Shop Saison 4" },
    // ── EXTRAS ──────────────────────────────────────────────────────────────────
    { n: "Extras — Bonus Officiels", u: `${BASE}/extras/bonus.php`,  i: `${BASE}/source/banbonus.png`,              cat: "extras", d: "Bonus officiels — Behind the Scenes, Shorts, Featurettes" },
    { n: "Extras — Mashup Films",    u: `${BASE}/extras/mashup.php`, i: `${BASE}/source/banextra.png`,              cat: "extras", d: "Mashup Films FiM (résumés animés)" },
    { n: "Extras — Vidéos Fandom",   u: `${BASE}/extras/fandom.php`, i: `${BASE}/source/Logo-MLPFrance-default.png`, cat: "extras", d: "Vidéos de la communauté brony" },
  ];

  const CAT_ORDER = ["g5", "film", "eqg", "fim", "retro", "cartoon", "extras"];

  class DefaultExtension extends MProvider {
    constructor() { super(); }

    _h(ref) {
      return {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Referer": ref || `${BASE}/`,
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

    _abs(href, base) {
      if (!href) return "";
      href = href.trim();
      if (href.startsWith("http")) return href;
      if (href.startsWith("/")) return `${BASE}${href}`;
      const dir = base.split("/").slice(0, -1).join("/");
      return `${dir}/${href}`;
    }

    // ── getPopular ─────────────────────────────────────────────────────────────
    async getPopular(page) {
      const pp = 20, s = (page - 1) * pp;
      return {
        list: CATALOG.slice(s, s + pp).map(c => ({ link: c.u, imageUrl: c.i, name: c.n })),
        hasNextPage: s + pp < CATALOG.length
      };
    }

    // ── getForYou ──────────────────────────────────────────────────────────────
    async getForYou(page) {
      const ordered = [];
      for (const cat of CAT_ORDER) {
        CATALOG.filter(c => c.cat === cat).forEach(c => ordered.push(c));
      }
      const pp = 20, s = (page - 1) * pp;
      return {
        list: ordered.slice(s, s + pp).map(c => ({ link: c.u, imageUrl: c.i, name: c.n })),
        hasNextPage: s + pp < ordered.length
      };
    }

    // ── getLatestUpdates ───────────────────────────────────────────────────────
    async getLatestUpdates(page) {
      const recent = CATALOG.filter(c => c.cat === "g5" || c.cat === "cartoon" || c.cat === "extras");
      const pp = 20, s = (page - 1) * pp;
      return {
        list: recent.slice(s, s + pp).map(c => ({ link: c.u, imageUrl: c.i, name: c.n })),
        hasNextPage: s + pp < recent.length
      };
    }

    // ── search ─────────────────────────────────────────────────────────────────
    async search(query, page, filterList) {
      const q = (query || "").toLowerCase();
      const res = CATALOG.filter(c => c.n.toLowerCase().includes(q) || c.d.toLowerCase().includes(q));
      return { list: res.map(c => ({ link: c.u, imageUrl: c.i, name: c.n })), hasNextPage: false };
    }

    // ── getDetail ──────────────────────────────────────────────────────────────
    // Gère TOUS les formats de page du site mlp-france.com :
    //   • list3 FiM    : <b>Episode N</b><br>Titre<br><a class="link">VF</a>
    //   • list3 Bonus  : <br>Episode N<br><b>Titre</b><br><a class="link">VO</a>
    //   • list3 MYM    : <b>Chapitre X<br>Episode N</b><br>Titre<br>
    //   • list1        : même structure que list3
    //   • list2 Mashup : <p><b>Titre</b></p><p><a class="link">VO</a></p>
    //   • list4 G1     : <p><b>Episode</b><br/>Titre<br/><a class="link">VO</a></p>
    //   • list4 NewGen : <a href="...php?ep=FR"><img .../></a>  (pas de class="link")
    //   • table Fandom : <td><a href="url" class="link"><b>Titre</b></a></td>
    async getDetail(url) {
      const r    = await new Client().get(url, { headers: this._h(url) });
      const html = r.body;

      const tM = html.match(/<title>([^<]+)<\/title>/i);
      let name = tM ? this._dec(tM[1]).replace(/^MLP France\s*[-—]\s*/i, "").trim() : "";

      const bM = html.match(/<img[^>]+src="([^"]+)"[^>]+width="960"/i);
      const imageUrl = bM ? this._abs(bM[1], url) : "";

      const cat = CATALOG.find(c => c.u === url);
      const description = cat ? cat.d : name;

      const episodes = [];
      const seen = new Set();

      // ── Items de liste : list1, list2, list3, list4 ───────────────────────────
      const liRe = /<li class="list[1-4]">([\s\S]{1,2500}?)<\/li>/gi;
      let m;
      while ((m = liRe.exec(html)) !== null) {
        const item = m[1];

        // ── Extraire le texte des balises <b> (aplatir <br> interne) ──────────
        const bTexts = [];
        const bRe = /<b>([\s\S]{1,400}?)<\/b>/gi;
        let bm;
        while ((bm = bRe.exec(item)) !== null) {
          const t = this._dec(bm[1].replace(/<br\s*\/?>/gi, " "));
          if (t) bTexts.push(t);
        }
        const bLabel = bTexts.join(" — ");

        // ── Texte brut (sans balises HTML) ────────────────────────────────────
        const plain = item
          .replace(/<img[^>]+>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/\s{2,}/g, " ")
          .trim();

        // ── Partie "titre" = texte brut moins les bLabel et les labels lang ───
        let titlePart = plain;
        for (const bt of bTexts) {
          titlePart = titlePart.replace(bt, " ");
        }
        titlePart = titlePart
          .replace(/\b(VOSTFR|VOSTF|VF|VO)\b/gi, "")
          .replace(/\s{2,}/g, " ")
          .trim();

        const base2 = bLabel
          ? (titlePart ? `${bLabel} — ${titlePart}` : bLabel)
          : titlePart;

        const beforeCount = episodes.length;

        // ── Liens class="link" (format standard) ──────────────────────────────
        const lkRe = /href="([^"]+)"[^>]*class="link"[^>]*>([^<]{1,40})<\/a>/gi;
        let lm;
        while ((lm = lkRe.exec(item)) !== null) {
          const eu = this._abs(lm[1], url);
          if (seen.has(eu)) continue;
          seen.add(eu);
          const lang = this._dec(lm[2]).toUpperCase();
          episodes.push({ name: base2 ? `${base2} [${lang}]` : lang, url: eu });
        }

        // ── Fallback : liens sans class="link" (ex: G5 New Gen img-flags) ─────
        if (episodes.length === beforeCount) {
          const anyRe = /href="([^"]+\.php[^"]*)"/gi;
          while ((lm = anyRe.exec(item)) !== null) {
            const eu = this._abs(lm[1], url);
            if (seen.has(eu)) continue;
            seen.add(eu);
            const ctx = item.slice(Math.max(0, lm.index - 20), lm.index + 150);
            const lang = /french|vf|fr\.png/i.test(ctx) ? "VF"
                       : /english|vostfr|vo\.php|en\.png/i.test(ctx) ? "VO"
                       : "VOIR";
            const label = base2 || lang;
            episodes.push({ name: label !== lang ? `${label} [${lang}]` : lang, url: eu });
          }
        }
      }

      // ── Format table (page fandom) : liens YouTube, Dailymotion, internes ────
      if (episodes.length === 0) {
        const tdRe = /<td[^>]*>([\s\S]{1,600}?)<\/td>/gi;
        while ((m = tdRe.exec(html)) !== null) {
          const cell = m[1];
          const lkM = cell.match(/href="([^"]+)"[^>]*class="link"[^>]*>([\s\S]{1,200}?)<\/a>/i);
          if (!lkM) continue;
          const eu = lkM[1].startsWith("http") ? lkM[1] : this._abs(lkM[1], url);
          if (seen.has(eu)) continue;
          seen.add(eu);
          episodes.push({ name: this._dec(lkM[2]), url: eu });
        }
      }

      // ── Fallback : page déjà un player NPlayer/MP4 ───────────────────────────
      if (episodes.length === 0 &&
          (html.includes("NPlayer") || html.includes("makamour") || html.includes(".mp4"))) {
        episodes.push({ name: name || "Regarder", url });
      }

      if (episodes.length === 0) episodes.push({ name: name || "Ouvrir", url });

      return { name: name || cat?.n || url, imageUrl, description, episodes };
    }

    // ── getVideoList ───────────────────────────────────────────────────────────
    // Extrait les sources vidéo depuis la page player.
    // Structure NPlayer : 'QUALITE': 'URL.mp4'  ou  'URL.webm'
    async getVideoList(url) {
      // URL déjà une vidéo directe
      if (/\.(mp4|webm|m3u8)(\?[^?]*)?$/i.test(url)) {
        return [{ url, quality: "AUTO", headers: this._h(url) }];
      }

      const r    = await new Client().get(url, { headers: this._h(url) });
      const html = r.body;
      const videos = [];

      // NPlayer MP4 : '720p': 'https://...mp4'
      const mp4Re = /['"](\d+p)['"]\s*:\s*['"]([^'"]+\.mp4[^'"]*)['"]/gi;
      let m;
      while ((m = mp4Re.exec(html)) !== null) {
        videos.push({ url: m[2], quality: m[1], headers: this._h(url) });
      }

      // NPlayer WebM (fallback qualité)
      if (videos.length === 0) {
        const webmRe = /['"](\d+p)['"]\s*:\s*['"]([^'"]+\.webm[^'"]*)['"]/gi;
        while ((m = webmRe.exec(html)) !== null) {
          videos.push({ url: m[2], quality: m[1] + " (WebM)", headers: this._h(url) });
        }
      }

      // Lien direct MP4 / WebM / M3U8
      if (videos.length === 0) {
        const directRe = /['"](https?:\/\/[^'"]+\.(?:mp4|webm|m3u8)[^'"]*)['"]/gi;
        while ((m = directRe.exec(html)) !== null) {
          if (!videos.some(v => v.url === m[1])) {
            videos.push({ url: m[1], quality: "AUTO", headers: this._h(url) });
          }
        }
      }

      // Iframe vidéo (YouTube, Dailymotion, hôtes externes)
      if (videos.length === 0) {
        const ifRe = /<iframe[^>]+src="([^"]+)"/gi;
        while ((m = ifRe.exec(html)) !== null) {
          if (!m[1].includes("javascript")) {
            videos.push({ url: m[1], quality: "AUTO", headers: this._h() });
          }
        }
      }

      if (videos.length === 0) videos.push({ url, quality: "AUTO", headers: this._h() });
      return videos;
    }

    getComments(url, page) { return Promise.resolve([]); }
  }
