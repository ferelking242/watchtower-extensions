const watchtowerSources = [{
    "name": "MLP France Comics",
    "langs": ["fr", "en"],
    "ids": { "fr": 748291036, "en": 295817403 },
    "baseUrl": "https://mlp-france.com",
    "apiUrl": "https://mlp-france.com",
    "iconUrl": "https://mlp-france.com/source/lyra16.png",
    "typeSource": "single",
    "isManga": true,
    "itemType": 0,
    "version": "1.2.0",
    "pkgPath": "manga/fr/mlpfrancecomics.js",
    "editableBaseUrl": false,
    "hasCloudflare": false,
    "requiresAccount": false,
    "hasDRM": false,
    "paywall": "free",
    "supportsForYou": false,
    "supportsComments": false,
    "notes": "MLP France Comics — PDF streamé via iframe. Chaque numéro = un épisode lisible sans téléchargement."
  }];

  const BASE = "https://mlp-france.com";

  const COMIC_CATALOG = [
    { n: "Série Principale",    u: `${BASE}/comics/issues.php`,      i: `${BASE}/source/banbookg4.png` },
    { n: "Annuels & Spéciaux",  u: `${BASE}/comics/annual.php`,      i: `${BASE}/source/banbookg4.png` },
    { n: "Micro-Séries",        u: `${BASE}/comics/microseries.php`, i: `${BASE}/source/banbookg4.png` },
    { n: "Friends Forever",     u: `${BASE}/comics/friends.php`,     i: `${BASE}/source/banbookg4.png` },
    { n: "Legends of Magic",    u: `${BASE}/comics/lomagic.php`,     i: `${BASE}/source/banbookg4.png` },
    { n: "Séries Courtes",      u: `${BASE}/comics/shorts.php`,      i: `${BASE}/source/banbookg4.png` },
    { n: "Divers",              u: `${BASE}/comics/divers.php`,      i: `${BASE}/source/banbookg4.png` },
    { n: "Livres",              u: `${BASE}/comics/livres.php`,      i: `${BASE}/source/banbookg4.png` },
    { n: "Comics G5",           u: `${BASE}/mlpg5/comics.php`,       i: `${BASE}/source/banbookg5.png` },
  ];

  class DefaultExtension extends MProvider {
    constructor() { super(); }

    _h(ref) {
      return {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        "Referer": ref || `${BASE}/`,
        "Accept-Language": "fr-FR,fr;q=0.9"
      };
    }

    _abs(href, base) {
      if (!href) return "";
      if (href.startsWith("http")) return href;
      if (href.startsWith("/")) return `${BASE}${href}`;
      const dir = base.split("/").slice(0, -1).join("/");
      return `${dir}/${href}`;
    }

    _dec(s) {
      return String(s || "")
        .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'")
        .replace(/&eacute;/g, "é").replace(/&agrave;/g, "à").replace(/&ccedil;/g, "ç")
        .replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    }

    async getPopular(page) {
      const pp = 20, s = (page - 1) * pp;
      return {
        list: COMIC_CATALOG.slice(s, s + pp).map(c => ({ link: c.u, imageUrl: c.i, name: c.n })),
        hasNextPage: s + pp < COMIC_CATALOG.length
      };
    }

    async getLatestUpdates(page) { return this.getPopular(page); }
    async getForYou(page)        { return this.getPopular(page); }

    async search(query, page) {
      const q = (query || "").toLowerCase();
      const res = COMIC_CATALOG.filter(c => c.n.toLowerCase().includes(q));
      return { list: res.map(c => ({ link: c.u, imageUrl: c.i, name: c.n })), hasNextPage: false };
    }

    // ── getDetail : liste les numéros depuis la page de série ────────────────
    async getDetail(url) {
      const r    = await new Client().get(url, { headers: this._h(url) });
      const html = r.body;

      const tM = html.match(/<title>([^<]+)<\/title>/i);
      const name = tM ? this._dec(tM[1]).replace(/^MLP France\s*[-—]\s*/i, "").trim() : "";

      const bM = html.match(/<img[^>]+src="([^"]+)"[^>]+width="960"/i);
      const imageUrl = bM ? this._abs(bM[1], url) : "";

      const cat = COMIC_CATALOG.find(c => c.u === url);
      const description = cat?.n || name;

      const episodes = [];
      const seen = new Set();

      // <li class="list4"> : chaque numéro a une vignette + lien "Lire"
      const li4Re = /<li class="list4">([\s\S]{1,1200}?)<\/li>/gi;
      let m;
      while ((m = li4Re.exec(html)) !== null) {
        const item = m[1];
        const lireM = item.match(/href="([^"]+\.php[^"]*)"[^>]*class="link"[^>]*>\s*Lire\s*<\/a>/i)
                   || item.match(/href="([^"]+\.php[^"]*)"[^>]*>\s*Lire\s*<\/a>/i);
        if (!lireM) continue;
        const eu = this._abs(lireM[1], url);
        if (seen.has(eu)) continue;
        seen.add(eu);
        const titleM = item.match(/<b>([^<]+)<\/b>/i);
        const epName = titleM ? this._dec(titleM[1]) : eu.split("ep=").pop() || "Numéro";
        episodes.push({ name: epName, url: eu });
      }

      // Fallback : liens "Lire" hors list4
      if (episodes.length === 0) {
        const fbRe = /href="([^"]+\.php[^"]*)"[^>]*class="link"[^>]*>\s*Lire\s*<\/a>/gi;
        while ((m = fbRe.exec(html)) !== null) {
          const eu = this._abs(m[1], url);
          if (!seen.has(eu)) {
            seen.add(eu);
            episodes.push({ name: eu.split("ep=").pop() || "Lire", url: eu });
          }
        }
      }

      if (episodes.length === 0) episodes.push({ name: name || "Ouvrir", url });
      return { name: name || description, imageUrl, description, episodes };
    }

    // ── getVideoList : extrait l'URL PDF depuis la page viewer ───────────────
    async getVideoList(url) {
      const r    = await new Client().get(url, { headers: this._h(url) });
      const html = r.body;
      const videos = [];

      const ifRe = /<iframe[^>]+src="([^"]+\.pdf[^"]*)"[^>]*>/gi;
      let m;
      while ((m = ifRe.exec(html)) !== null) {
        videos.push({ url: m[1], quality: "PDF", headers: this._h(url) });
      }

      if (videos.length === 0) {
        const dlRe = /href="([^"]+\.pdf[^"]*)"[^>]*class="link"/gi;
        while ((m = dlRe.exec(html)) !== null) {
          videos.push({ url: m[1], quality: "PDF", headers: this._h(url) });
        }
      }

      if (videos.length === 0) {
        const anyPdf = /['"](https?:\/\/[^'"]+\.pdf[^'"]*)['"]/gi;
        while ((m = anyPdf.exec(html)) !== null) {
          videos.push({ url: m[1], quality: "PDF", headers: this._h(url) });
        }
      }

      if (videos.length === 0) videos.push({ url, quality: "PDF", headers: this._h() });
      return videos;
    }

    getComments(url, page) { return Promise.resolve([]); }
  }
