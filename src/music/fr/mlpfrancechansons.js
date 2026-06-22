const watchtowerSources = [{
    "name": "MLP France — Chansons",
    "langs": ["fr", "en"],
    "ids": { "fr": 563741892 },
    "baseUrl": "https://mlp-france.com",
    "apiUrl": "https://mlp-france.com",
    "iconUrl": "https://mlp-france.com/source/lyra16.png",
    "typeSource": "single",
    "itemType": 3,
    "version": "1.1.0",
    "pkgPath": "music/fr/mlpfrancechansons.js",
    "editableBaseUrl": false,
    "hasCloudflare": false,
    "supportsForYou": false,
    "supportsComments": false,
    "requiresAccount": false,
    "hasDRM": false,
    "paywall": "free",
    "notes": "MLP France — Chansons. Lecture directe MP3 (VF + EN). FiM S1-S9, Films, EqG, G5."
  }];

  const BASE = "https://mlp-france.com";

  const SONGS_CATALOG = [
    // FiM
    { n: "FiM — Saison 1", u: `${BASE}/extras/chansons/saison1.php`, i: `${BASE}/source/bansaison1.png` },
    { n: "FiM — Saison 2", u: `${BASE}/extras/chansons/saison2.php`, i: `${BASE}/source/bansaison2.png` },
    { n: "FiM — Saison 3", u: `${BASE}/extras/chansons/saison3.php`, i: `${BASE}/source/bansaison3.png` },
    { n: "FiM — Saison 4", u: `${BASE}/extras/chansons/saison4.php`, i: `${BASE}/source/bansaison4.png` },
    { n: "FiM — Saison 5", u: `${BASE}/extras/chansons/saison5.php`, i: `${BASE}/source/bansaison5.png` },
    { n: "FiM — Saison 6", u: `${BASE}/extras/chansons/saison6.php`, i: `${BASE}/source/bansaison6.png` },
    { n: "FiM — Saison 7", u: `${BASE}/extras/chansons/saison7.php`, i: `${BASE}/source/bansaison7.png` },
    { n: "FiM — Saison 8", u: `${BASE}/extras/chansons/saison8.php`, i: `${BASE}/source/bansaison8.png` },
    { n: "FiM — Saison 9", u: `${BASE}/extras/chansons/saison9.php`, i: `${BASE}/source/bansaison9.png` },
    { n: "FiM — Spéciaux", u: `${BASE}/extras/chansons/specials.php`, i: `${BASE}/source/Logo-MLPFrance-default.png` },
    { n: "MLP: Le Film (2017)", u: `${BASE}/extras/chansons/movie.php`, i: `${BASE}/source/banmlp2017.png` },
    // Equestria Girls
    { n: "Equestria Girls",         u: `${BASE}/extras/chansons/eqg.php`, i: `${BASE}/source/baneqg.png` },
    { n: "EqG: Rainbow Rocks",      u: `${BASE}/extras/chansons/rbr.php`, i: `${BASE}/source/banrbr.png` },
    { n: "EqG: Friendship Games",   u: `${BASE}/extras/chansons/fsg.php`, i: `${BASE}/source/banfsg.png` },
    { n: "EqG: Legend of Everfree", u: `${BASE}/extras/chansons/loe.php`, i: `${BASE}/source/banloe.png` },
    { n: "EqG — Spéciaux",          u: `${BASE}/extras/chansons/egs.php`, i: `${BASE}/source/baneqg.png` },
    // Compilations
    { n: "Albums Officiels (EN)", u: `${BASE}/extras/chansons/albumen.php`,  i: `${BASE}/source/Logo-MLPFrance-default.png` },
    { n: "Albums Officiels (FR)", u: `${BASE}/extras/chansons/albumfr.php`,  i: `${BASE}/source/Logo-MLPFrance-default.png` },
    { n: "Remix Officiels",       u: `${BASE}/extras/chansons/remix.php`,    i: `${BASE}/source/Logo-MLPFrance-default.png` },
    { n: "Extended & Alternatives",u: `${BASE}/extras/chansons/extended.php`,i: `${BASE}/source/Logo-MLPFrance-default.png` },
    // G5
    { n: "G5 — A New Generation", u: `${BASE}/mlpg5/chansons/newgen.php`,  i: `${BASE}/source/banmlpnewgen.png` },
    { n: "G5 — Make Your Mark",    u: `${BASE}/mlpg5/chansons/mym.php`,     i: `${BASE}/source/banmym.png` },
    { n: "G5 — Tell Your Tale",    u: `${BASE}/mlpg5/chansons/tyt.php`,     i: `${BASE}/source/bantlts.png` },
    { n: "G5 — Podcast",           u: `${BASE}/mlpg5/chansons/podcast.php`, i: `${BASE}/source/Logo-MLPFrance-default.png` },
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

    async getPopular(page) {
      const pp = 20, s = (page - 1) * pp;
      return {
        list: SONGS_CATALOG.slice(s, s + pp).map(c => ({ link: c.u, imageUrl: c.i, name: c.n })),
        hasNextPage: s + pp < SONGS_CATALOG.length
      };
    }

    async getLatestUpdates(page) { return this.getPopular(page); }
    async getForYou(page)        { return this.getPopular(page); }

    async search(query, page) {
      const q = (query || "").toLowerCase();
      const res = SONGS_CATALOG.filter(c => c.n.toLowerCase().includes(q));
      return { list: res.map(c => ({ link: c.u, imageUrl: c.i, name: c.n })), hasNextPage: false };
    }

    // ── getDetail : extraire la playlist MP3 depuis le player JS ──────────────
    async getDetail(url) {
      const r    = await new Client().get(url, { headers: this._h(url) });
      const html = r.body;

      const tM = html.match(/<title>([^<]+)<\/title>/i);
      const name = tM ? tM[1].replace(/^MLP France\s*[-—]\s*/i, "").trim() : "";

      const bM = html.match(/<img[^>]+src="([^"]+)"[^>]+width="960"/i);
      const rawImg = bM ? bM[1] : "";
      const imageUrl = rawImg.startsWith("http") ? rawImg
        : rawImg ? `${BASE}/${rawImg.replace(/^\.\.\//, "")}` : "";

      const cat = SONGS_CATALOG.find(c => c.u === url);
      const description = cat?.n || name;

      const episodes = [];

      // Playlist JS : { path: '...mp3', title: '...', artist: '...' }
      const plRe = /\{\s*path\s*:\s*['"]([^'"]+\.mp3[^'"]*)['"][,\s\S]{0,200}?title\s*:\s*['"]([^'"]+)['"]/gi;
      let m;
      while ((m = plRe.exec(html)) !== null) {
        episodes.push({ name: m[2].trim(), url: m[1].trim() });
      }

      // Fallback : liens MP3 directs dans la page
      if (episodes.length === 0) {
        const mp3Re = /href="(https?:\/\/[^'"]+\.mp3[^'""]*)"/gi;
        while ((m = mp3Re.exec(html)) !== null) {
          episodes.push({
            name: m[1].split("/").pop().replace(/%20/g, " ").replace(/\.mp3$/, ""),
            url: m[1]
          });
        }
      }

      if (episodes.length === 0) episodes.push({ name: name || "Écouter", url });

      return { name: name || description, imageUrl, description, episodes };
    }

    // ── getVideoList : retourne l'URL MP3 ─────────────────────────────────────
    async getVideoList(url) {
      if (/\.mp3(\?[^?]*)?$/i.test(url)) {
        return [{ url, quality: "MP3", headers: this._h() }];
      }
      const r    = await new Client().get(url, { headers: this._h(url) });
      const html = r.body;
      const videos = [];
      const mp3Re = /['"](https?:\/\/[^'"]+\.mp3[^'"]*)['"]/gi;
      let m;
      while ((m = mp3Re.exec(html)) !== null) {
        if (!videos.some(v => v.url === m[1])) {
          videos.push({ url: m[1], quality: "MP3", headers: this._h() });
        }
      }
      if (videos.length === 0) videos.push({ url, quality: "MP3", headers: this._h() });
      return videos;
    }

    getComments(url, page) { return Promise.resolve([]); }
  }
