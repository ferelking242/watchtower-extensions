const watchtowerSources = [{
    "name": "MLP France",
    "langs": ["fr", "en"],
    "ids": { "fr": 841627593, "en": 192847365 },
    "baseUrl": "https://mlp-france.com",
    "apiUrl": "https://mlp-france.com",
    "iconUrl": "https://mlp-france.com/source/lyra16.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.1.0",
    "pkgPath": "watch/fr/mlpfrance.js",
    "editableBaseUrl": false,
    "hasCloudflare": false,
    "videoQualities": ["720p", "480p", "360p"],
    "subCategories": ["film", "serie", "cartoon"],
    "supportsForYou": true,
    "supportsComments": false,
    "requiresAccount": false,
    "hasDRM": false,
    "paywall": "free",
    "hasSubtitles": true,
    "hasDub": true,
    "notes": "MLP France — G5, FiM, EqG, Retro, Luz, Star, LPS. VF + VO. Accueil catégorisé."
  }];

  const BASE = "https://mlp-france.com";

  // ── CATALOG ──────────────────────────────────────────────────────────────────
  // Chaque entrée = UNE page de saison/film directe (jamais un index.php
  // intermédiaire) afin que getDetail() tombe directement sur les épisodes.
  const CATALOG = [
    // ── G5 NEW GEN ──────────────────────────────────────────────────────────
    { n: "MLP: Nouvelle Génération (Film)", u: `${BASE}/mlpg5/mlpnewgen.php`, i: `${BASE}/source/banmlpnewgen.png`, cat:"g5", d:"My Little Pony: A New Generation (2021)" },
    { n: "Make Your Mark",                  u: `${BASE}/mlpg5/mym.php`,         i: `${BASE}/source/banmym.png`,      cat:"g5", d:"MLP: Make Your Mark" },
    { n: "Tell Your Tale — S1",             u: `${BASE}/mlpg5/tlts1.php`,       i: `${BASE}/source/bantlts.png`,    cat:"g5", d:"Tell Your Tale Saison 1" },
    { n: "Tell Your Tale — S2",             u: `${BASE}/mlpg5/tlts2.php`,       i: `${BASE}/source/bantlts.png`,    cat:"g5", d:"Tell Your Tale Saison 2" },
    { n: "Tell Your Tale — S3",             u: `${BASE}/mlpg5/tlts3.php`,       i: `${BASE}/source/bantlts.png`,    cat:"g5", d:"Tell Your Tale Saison 3" },
    // ── FILM G4 ─────────────────────────────────────────────────────────────
    { n: "MLP: Le Film (2017)",             u: `${BASE}/films/mlp2017.php`,     i: `${BASE}/source/banmlp2017.png`, cat:"film", d:"My Little Pony: Le Film (2017)" },
    // ── EQUESTRIA GIRLS — Films ─────────────────────────────────────────────
    { n: "Equestria Girls (Film 1)",        u: `${BASE}/films/eqg.php`,         i: `${BASE}/source/baneqg.png`,     cat:"eqg",  d:"Equestria Girls" },
    { n: "EqG: Rainbow Rocks",             u: `${BASE}/films/rbr.php`,         i: `${BASE}/source/banrbr.png`,     cat:"eqg",  d:"Equestria Girls: Rainbow Rocks" },
    { n: "EqG: Friendship Games",          u: `${BASE}/films/fsg.php`,         i: `${BASE}/source/banfsg.png`,     cat:"eqg",  d:"Equestria Girls: Friendship Games" },
    { n: "EqG: Legend of Everfree",        u: `${BASE}/films/loe.php`,         i: `${BASE}/source/banloe.png`,     cat:"eqg",  d:"Equestria Girls: Legend of Everfree" },
    // ── EQUESTRIA GIRLS — Séries ────────────────────────────────────────────
    { n: "EqG — Spéciaux",                 u: `${BASE}/episodes/egs.php`,      i: `${BASE}/source/baneqg.png`,     cat:"eqg",  d:"Equestria Girls Spéciaux" },
    { n: "EqG — Mini-Séries S1",           u: `${BASE}/episodes/egms.php`,     i: `${BASE}/source/baneqg.png`,     cat:"eqg",  d:"EqG Mini-Séries Saison 1" },
    { n: "EqG — Mini-Séries S2",           u: `${BASE}/episodes/egms2.php`,    i: `${BASE}/source/baneqg.png`,     cat:"eqg",  d:"EqG Mini-Séries Saison 2" },
    // ── MLP FiM ─────────────────────────────────────────────────────────────
    { n: "MLP FiM — Saison 1",  u: `${BASE}/episodes/saison1.php`, i: `${BASE}/source/bansaison1.png`, cat:"fim", d:"Friendship is Magic S1 (26 éps)" },
    { n: "MLP FiM — Saison 2",  u: `${BASE}/episodes/saison2.php`, i: `${BASE}/source/bansaison2.png`, cat:"fim", d:"Friendship is Magic S2 (26 éps)" },
    { n: "MLP FiM — Saison 3",  u: `${BASE}/episodes/saison3.php`, i: `${BASE}/source/bansaison3.png`, cat:"fim", d:"Friendship is Magic S3 (13 éps)" },
    { n: "MLP FiM — Saison 4",  u: `${BASE}/episodes/saison4.php`, i: `${BASE}/source/bansaison4.png`, cat:"fim", d:"Friendship is Magic S4 (26 éps)" },
    { n: "MLP FiM — Saison 5",  u: `${BASE}/episodes/saison5.php`, i: `${BASE}/source/bansaison5.png`, cat:"fim", d:"Friendship is Magic S5 (26 éps)" },
    { n: "MLP FiM — Saison 6",  u: `${BASE}/episodes/saison6.php`, i: `${BASE}/source/bansaison6.png`, cat:"fim", d:"Friendship is Magic S6 (26 éps)" },
    { n: "MLP FiM — Saison 7",  u: `${BASE}/episodes/saison7.php`, i: `${BASE}/source/bansaison7.png`, cat:"fim", d:"Friendship is Magic S7 (26 éps)" },
    { n: "MLP FiM — Saison 8",  u: `${BASE}/episodes/saison8.php`, i: `${BASE}/source/bansaison8.png`, cat:"fim", d:"Friendship is Magic S8 (26 éps)" },
    { n: "MLP FiM — Saison 9",  u: `${BASE}/episodes/saison9.php`, i: `${BASE}/source/bansaison9.png`, cat:"fim", d:"Friendship is Magic S9 — Finale" },
    { n: "MLP FiM — Spéciaux",  u: `${BASE}/episodes/specials.php`, i: `${BASE}/source/Logo-MLPFrance-default.png`, cat:"fim", d:"FiM Épisodes spéciaux" },
    { n: "Pony Life",            u: `${BASE}/episodes/ponylife.php`, i: `${BASE}/source/Logo-MLPFrance-default.png`, cat:"fim", d:"My Little Pony: Pony Life" },
    // ── RETRO ───────────────────────────────────────────────────────────────
    { n: "Mon Petit Poney G1 (1983)", u: `${BASE}/retro/g1.php`, i: `${BASE}/source/bang1.png`, cat:"retro", d:"Génération 1 (1983)" },
    { n: "MLP Tales G2",              u: `${BASE}/retro/g2.php`, i: `${BASE}/source/bang2.png`, cat:"retro", d:"My Little Pony Tales" },
    { n: "MLP G3",                    u: `${BASE}/retro/g3.php`, i: `${BASE}/source/bang3.png`, cat:"retro", d:"My Little Pony Génération 3" },
    // ── LUZ À OSVILLE (The Owl House) ────── CORRIGÉ : saisons directes ────
    { n: "Luz à Osville — S1", u: `${BASE}/luz/saison1.php`, i: `${BASE}/source/luzban.png`, cat:"cartoon", d:"The Owl House — Saison 1" },
    { n: "Luz à Osville — S2", u: `${BASE}/luz/saison2.php`, i: `${BASE}/source/luzban.png`, cat:"cartoon", d:"The Owl House — Saison 2" },
    { n: "Luz à Osville — S3", u: `${BASE}/luz/saison3.php`, i: `${BASE}/source/luzban.png`, cat:"cartoon", d:"The Owl House — Saison 3" },
    { n: "Luz à Osville — Extras", u: `${BASE}/luz/extras.php`, i: `${BASE}/source/luzban.png`, cat:"cartoon", d:"The Owl House — Extras" },
    // ── STAR BUTTERFLY ──────────────────────────────────────────────────────
    { n: "Star VS — S1", u: `${BASE}/star/saison1.php`, i: `${BASE}/source/starban.png`, cat:"cartoon", d:"Star VS the Forces of Evil S1" },
    { n: "Star VS — S2", u: `${BASE}/star/saison2.php`, i: `${BASE}/source/starban.png`, cat:"cartoon", d:"Star VS the Forces of Evil S2" },
    { n: "Star VS — S3", u: `${BASE}/star/saison3.php`, i: `${BASE}/source/starban.png`, cat:"cartoon", d:"Star VS the Forces of Evil S3" },
    { n: "Star VS — S4", u: `${BASE}/star/saison4.php`, i: `${BASE}/source/starban.png`, cat:"cartoon", d:"Star VS the Forces of Evil S4" },
    // ── LITTLEST PET SHOP ──────── CORRIGÉ : saisons directes ────────────
    { n: "Littlest Pet Shop — S1", u: `${BASE}/lps/saison1.php`, i: `${BASE}/source/lpsban.png`, cat:"cartoon", d:"Littlest Pet Shop Saison 1" },
    { n: "Littlest Pet Shop — S2", u: `${BASE}/lps/saison2.php`, i: `${BASE}/source/lpsban.png`, cat:"cartoon", d:"Littlest Pet Shop Saison 2" },
    { n: "Littlest Pet Shop — S3", u: `${BASE}/lps/saison3.php`, i: `${BASE}/source/lpsban.png`, cat:"cartoon", d:"Littlest Pet Shop Saison 3" },
    { n: "Littlest Pet Shop — S4", u: `${BASE}/lps/saison4.php`, i: `${BASE}/source/lpsban.png`, cat:"cartoon", d:"Littlest Pet Shop Saison 4" },
  ];

  // ── Ordre pour l'accueil (getForYou) ────────────────────────────────────────
  // G5 (nouveau) → Films → EqG → FiM → Retro → Cartoons
  const CAT_ORDER = ["g5", "film", "eqg", "fim", "retro", "cartoon"];

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

    // ── getForYou : accueil catégorisé G5 → Films → EqG → FiM → Retro → Cartoons ──
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

    // ── getLatestUpdates : G5 + cartoons récents ──────────────────────────────
    async getLatestUpdates(page) {
      const recent = CATALOG.filter(c => c.cat === "g5" || c.cat === "cartoon");
      const pp = 20, s = (page - 1) * pp;
      return {
        list: recent.slice(s, s + pp).map(c => ({ link: c.u, imageUrl: c.i, name: c.n })),
        hasNextPage: s + pp < recent.length
      };
    }

    // ── search ────────────────────────────────────────────────────────────────
    async search(query, page, filterList) {
      const q = (query || "").toLowerCase();
      const res = CATALOG.filter(c => c.n.toLowerCase().includes(q) || c.d.toLowerCase().includes(q));
      return { list: res.map(c => ({ link: c.u, imageUrl: c.i, name: c.n })), hasNextPage: false };
    }

    // ── getDetail ─────────────────────────────────────────────────────────────
    // Appelé avec l'URL d'une page de saison/film.
    // Retourne la liste des épisodes regardables.
    async getDetail(url) {
      const r   = await new Client().get(url, { headers: this._h(url) });
      const html = r.body;

      // Titre depuis <title>
      const tM = html.match(/<title>([^<]+)<\/title>/i);
      let name = tM ? this._dec(tM[1]).replace(/^MLP France\s*[-—]\s*/i, "").trim() : "";

      // Image bannière (width="960")
      const bM = html.match(/<img[^>]+src="([^"]+)"[^>]+width="960"/i);
      const imageUrl = bM ? this._abs(bM[1], url) : "";

      const cat = CATALOG.find(c => c.u === url);
      const description = cat ? cat.d : name;

      const episodes = [];
      const seen = new Set();

      // ── Format 1 : <li class="list3"> — épisodes avec liens VF/VO ────────
      const li3Re = /<li class="list3">([\/\s\S]{1,1000}?)<\/li>/gi;
      let m;
      while ((m = li3Re.exec(html)) !== null) {
        const item = m[1];
        const epbM = item.match(/<b>((?:Episode|Épisode)\s*\d+[^<]*)<\/b>/i);
        const epNum   = epbM ? this._dec(epbM[1]) : "";
        const epTM    = item.match(/<\/b><br\s*\/?>[\s]*([\/\s\S]*?)<br\s*\/>/i);
        const epTitle = epTM ? this._dec(epTM[1]) : "";
        const base2   = [epNum, epTitle].filter(Boolean).join(" — ");

        const lkRe = /<a[^>]+href="([^"]+\.php[^"]*)"[^>]*class="link"[^>]*>([^<]+)<\/a>/gi;
        let lm;
        while ((lm = lkRe.exec(item)) !== null) {
          const eu   = this._abs(lm[1], url);
          if (seen.has(eu)) continue;
          seen.add(eu);
          const lang = this._dec(lm[2]).toUpperCase();
          episodes.push({ name: base2 ? `${base2} [${lang}]` : lang, url: eu });
        }
      }

      // ── Format 2 : <li class="list4"> — sélecteur de langue (films G5) ──
      if (episodes.length === 0) {
        const li4Re = /<li class="list4">([\/\s\S]{1,600}?)<\/li>/gi;
        while ((m = li4Re.exec(html)) !== null) {
          const item = m[1];
          const lkM  = item.match(/href="([^"]+\.php[^"]*)"/i);
          const lbM  = item.match(/<b>([^<]+)<\/b>/i) || item.match(/<p>([^<]+)<\/p>/i);
          if (lkM) {
            const eu = this._abs(lkM[1], url);
            if (seen.has(eu)) continue;
            seen.add(eu);
            const lb = lbM ? this._dec(lbM[1]) : (eu.split("ep=").pop() || "Version");
            episodes.push({ name: lb, url: eu });
          }
        }
      }

      // ── Format 3 : page déjà un player MP4 ──────────────────────────────
      if (episodes.length === 0 &&
          (html.includes("NPlayer") || html.includes("makamour") || html.includes(".mp4"))) {
        episodes.push({ name: name || "Regarder", url });
      }

      if (episodes.length === 0) episodes.push({ name: name || "Ouvrir", url });

      return { name: name || cat?.n || url, imageUrl, description, episodes };
    }

    // ── getVideoList ──────────────────────────────────────────────────────────
    async getVideoList(url) {
      const r    = await new Client().get(url, { headers: this._h(url) });
      const html = r.body;
      const videos = [];

      // NPlayer : '720p': 'https://...mp4'
      const qRe = /['"]?(\d+p)['"]?\s*:\s*['"]([^'"]+\.mp4[^'"]*)['"]/gi;
      let m;
      while ((m = qRe.exec(html)) !== null) {
        videos.push({ url: m[2], quality: m[1], headers: this._h(url) });
      }

      // WebM
      if (videos.length === 0) {
        const wRe = /['"]?(\d+p)['"]?\s*:\s*['"]([^'"]+\.webm[^'"]*)['"]/gi;
        while ((m = wRe.exec(html)) !== null) {
          videos.push({ url: m[2], quality: m[1] + " (WebM)", headers: this._h(url) });
        }
      }

      // Direct mp4 / webm / m3u8
      if (videos.length === 0) {
        const dRe = /['"](https?:\/\/[^'"]+\.(?:mp4|webm|m3u8)[^'"]*)['"]/gi;
        while ((m = dRe.exec(html)) !== null) {
          videos.push({ url: m[1], quality: "AUTO", headers: this._h(url) });
        }
      }

      // Iframe fallback
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
  