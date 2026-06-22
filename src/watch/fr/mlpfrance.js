const watchtowerSources = [{
  "name": "MLP France",
  "langs": ["fr", "en"],
  "ids": { "fr": 841627593, "en": 192847365 },
  "baseUrl": "https://mlp-france.com",
  "apiUrl": "https://mlp-france.com",
  "iconUrl": "https://mlp-france.com/source/lyra16.png",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.0",
  "pkgPath": "watch/fr/mlpfrance.js",
  "editableBaseUrl": false,
  "hasCloudflare": false,
  "videoQualities": ["720p", "480p", "360p"],
  "subCategories": ["cartoon", "film", "serie", "animation"],
  "requiresAccount": false,
  "hasDRM": false,
  "paywall": "free",
  "hasSubtitles": true,
  "hasDub": true,
  "notes": "Hub FR — My Little Pony (G4/G5/Retro), Star VS, The Owl House, Littlest Pet Shop. VF + VOSTFR. Vidéos directes MP4."
}];

const BASE = "https://mlp-france.com";

const CATALOG = [
  // MLP FiM
  { n: "MLP FiM — Saison 1", u: `${BASE}/episodes/saison1.php`, i: `${BASE}/source/bansaison1.png`, d: "My Little Pony: Friendship is Magic — Saison 1 (26 éps)" },
  { n: "MLP FiM — Saison 2", u: `${BASE}/episodes/saison2.php`, i: `${BASE}/source/bansaison2.png`, d: "Saison 2 (26 éps)" },
  { n: "MLP FiM — Saison 3", u: `${BASE}/episodes/saison3.php`, i: `${BASE}/source/bansaison3.png`, d: "Saison 3 (13 éps)" },
  { n: "MLP FiM — Saison 4", u: `${BASE}/episodes/saison4.php`, i: `${BASE}/source/bansaison4.png`, d: "Saison 4 (26 éps)" },
  { n: "MLP FiM — Saison 5", u: `${BASE}/episodes/saison5.php`, i: `${BASE}/source/bansaison5.png`, d: "Saison 5 (26 éps)" },
  { n: "MLP FiM — Saison 6", u: `${BASE}/episodes/saison6.php`, i: `${BASE}/source/bansaison6.png`, d: "Saison 6 (26 éps)" },
  { n: "MLP FiM — Saison 7", u: `${BASE}/episodes/saison7.php`, i: `${BASE}/source/bansaison7.png`, d: "Saison 7 (26 éps)" },
  { n: "MLP FiM — Saison 8", u: `${BASE}/episodes/saison8.php`, i: `${BASE}/source/bansaison8.png`, d: "Saison 8 (26 éps)" },
  { n: "MLP FiM — Saison 9", u: `${BASE}/episodes/saison9.php`, i: `${BASE}/source/bansaison9.png`, d: "Saison 9 — Finale (26 éps)" },
  { n: "MLP FiM — Spéciaux", u: `${BASE}/episodes/specials.php`, i: `${BASE}/source/Logo-MLPFrance-default.png`, d: "Épisodes spéciaux FiM" },
  // Films MLP
  { n: "MLP: Le Film (2017)", u: `${BASE}/films/mlp2017.php`, i: `${BASE}/source/banmlp2017.png`, d: "My Little Pony: Le Film (2017)" },
  { n: "Equestria Girls", u: `${BASE}/films/eqg.php`, i: `${BASE}/source/baneqg.png`, d: "Equestria Girls — Film 1" },
  { n: "EqG: Rainbow Rocks", u: `${BASE}/films/rbr.php`, i: `${BASE}/source/banrbr.png`, d: "Equestria Girls: Rainbow Rocks" },
  { n: "EqG: Friendship Games", u: `${BASE}/films/fsg.php`, i: `${BASE}/source/banfsg.png`, d: "Equestria Girls: Friendship Games" },
  { n: "EqG: Legend of Everfree", u: `${BASE}/films/loe.php`, i: `${BASE}/source/banloe.png`, d: "Equestria Girls: Legend of Everfree" },
  // EqG séries
  { n: "EG Spéciaux", u: `${BASE}/episodes/egs.php`, i: `${BASE}/source/Logo-MLPFrance-default.png`, d: "Equestria Girls Spéciaux" },
  { n: "EG Mini-Séries S1", u: `${BASE}/episodes/egms.php`, i: `${BASE}/source/Logo-MLPFrance-default.png`, d: "EG Mini-Séries Saison 1" },
  { n: "EG Mini-Séries S2", u: `${BASE}/episodes/egms2.php`, i: `${BASE}/source/Logo-MLPFrance-default.png`, d: "EG Mini-Séries Saison 2" },
  { n: "Pony Life", u: `${BASE}/episodes/ponylife.php`, i: `${BASE}/source/Logo-MLPFrance-default.png`, d: "My Little Pony: Pony Life" },
  // G5
  { n: "MLP: A New Generation (Film)", u: `${BASE}/mlpg5/mlpnewgen.php`, i: `${BASE}/source/banmlpnewgen.png`, d: "My Little Pony: A New Generation (2021)" },
  { n: "MLP: Make Your Mark", u: `${BASE}/mlpg5/mym.php`, i: `${BASE}/source/banmym.png`, d: "My Little Pony: Make Your Mark" },
  { n: "Tell Your Tale — S1", u: `${BASE}/mlpg5/tlts1.php`, i: `${BASE}/source/bantlts.png`, d: "MLP: Tell Your Tale Saison 1" },
  { n: "Tell Your Tale — S2", u: `${BASE}/mlpg5/tlts2.php`, i: `${BASE}/source/bantlts.png`, d: "MLP: Tell Your Tale Saison 2" },
  { n: "Tell Your Tale — S3", u: `${BASE}/mlpg5/tlts3.php`, i: `${BASE}/source/bantlts.png`, d: "MLP: Tell Your Tale Saison 3" },
  // Retro
  { n: "Mon Petit Poney (G1 — 1983)", u: `${BASE}/retro/g1.php`, i: `${BASE}/source/bang1.png`, d: "Mon Petit Poney — Génération 1 (1983)" },
  { n: "MLP Tales (G2)", u: `${BASE}/retro/g2.php`, i: `${BASE}/source/bang2.png`, d: "My Little Pony Tales — Génération 2" },
  { n: "MLP G3", u: `${BASE}/retro/g3.php`, i: `${BASE}/source/bang3.png`, d: "My Little Pony — Génération 3" },
  // Star VS
  { n: "Star VS — Saison 1", u: `${BASE}/star/saison1.php`, i: `${BASE}/source/starban.png`, d: "Star VS the Forces of Evil S1" },
  { n: "Star VS — Saison 2", u: `${BASE}/star/saison2.php`, i: `${BASE}/source/starban.png`, d: "Star VS the Forces of Evil S2" },
  { n: "Star VS — Saison 3", u: `${BASE}/star/saison3.php`, i: `${BASE}/source/starban.png`, d: "Star VS the Forces of Evil S3" },
  { n: "Star VS — Saison 4", u: `${BASE}/star/saison4.php`, i: `${BASE}/source/starban.png`, d: "Star VS the Forces of Evil S4" },
  // Luz / The Owl House
  { n: "Luz à Osville (The Owl House)", u: `${BASE}/luz/index.php`, i: `${BASE}/source/luzban.png`, d: "The Owl House / Luz à Osville" },
  // LPS
  { n: "Littlest Pet Shop", u: `${BASE}/lps/index.php`, i: `${BASE}/source/lpsban.png`, d: "Littlest Pet Shop" },
];

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
      .replace(/&nbsp;/g, " ").replace(/<[^>]+>/g, "").trim();
  }

  _abs(href, base) {
    if (!href) return "";
    if (href.startsWith("http")) return href;
    if (href.startsWith("/")) return `${BASE}${href}`;
    const dir = base.split("/").slice(0, -1).join("/");
    return `${dir}/${href}`;
  }

  async getPopular(page) {
    const pp = 20;
    const s = (page - 1) * pp;
    return {
      list: CATALOG.slice(s, s + pp).map(c => ({ link: c.u, imageUrl: c.i, name: c.n })),
      hasNextPage: s + pp < CATALOG.length
    };
  }

  async getLatestUpdates(page) {
    const latest = CATALOG.filter(c => c.u.includes("mlpg5") || c.u.includes("tlts") || c.u.includes("luz") || c.u.includes("star"));
    return { list: latest.map(c => ({ link: c.u, imageUrl: c.i, name: c.n })), hasNextPage: false };
  }

  async search(query, page, filterList) {
    const q = (query || "").toLowerCase();
    const res = CATALOG.filter(c => c.n.toLowerCase().includes(q) || c.d.toLowerCase().includes(q));
    return { list: res.map(c => ({ link: c.u, imageUrl: c.i, name: c.n })), hasNextPage: false };
  }

  async getDetail(url) {
    const r = await new Client().get(url, this._h(url));
    const html = r.body;

    // Show name from <title>
    const tM = html.match(/<title>([^<]+)<\/title>/i);
    let name = tM ? this._dec(tM[1]).replace(/^MLP France\s*[-—]\s*/i, "").trim() : "";

    // Banner image (width=960 is always the banner)
    const bM = html.match(/<img[^>]+src="([^"]+)"[^>]+width="960"/i);
    const imageUrl = bM ? this._abs(bM[1], url) : "";

    const cat = CATALOG.find(c => c.u === url);
    const description = cat ? cat.d : name;

    const episodes = [];
    const seen = new Set();

    // ── Format 1: <li class="list3"> — FiM/Star/LPS episode grids ──
    const li3Re = /<li class="list3">([\s\S]{1,1000}?)<\/li>/gi;
    let m;
    while ((m = li3Re.exec(html)) !== null) {
      const item = m[1];

      // Episode number+title: <b>Episode N</b><br>Title<br>
      const epbM = item.match(/<b>((?:Episode|Épisode)\s*\d+[^<]*)<\/b>/i);
      const epNum = epbM ? this._dec(epbM[1]) : "";
      // Title is between </b><br> and next <br> or <a
      const epTM = item.match(/<\/b><br\s*\/?>\s*([\s\S]*?)<br\s*\/?>/i);
      const epTitle = epTM ? this._dec(epTM[1]) : "";
      const base = [epNum, epTitle].filter(Boolean).join(" — ");

      // Links: VF and VOSTFR / VO / EN / FR
      const lkRe = /<a[^>]+href="([^"]+\.php[^"]*)"[^>]*class="link"[^>]*>([^<]+)<\/a>/gi;
      let lm;
      while ((lm = lkRe.exec(item)) !== null) {
        const eu = this._abs(lm[1], url);
        if (seen.has(eu)) continue;
        seen.add(eu);
        const lang = this._dec(lm[2]).toUpperCase();
        episodes.push({ name: base ? `${base} [${lang}]` : lang, url: eu });
      }
    }

    // ── Format 2: <li class="list4"> — language selector (G5 film, etc.) ──
    if (episodes.length === 0) {
      const li4Re = /<li class="list4">([\s\S]{1,600}?)<\/li>/gi;
      while ((m = li4Re.exec(html)) !== null) {
        const item = m[1];
        const lkM = item.match(/href="([^"]+\.php[^"]*)"/i);
        const lbM = item.match(/<b>([^<]+)<\/b>/i) || item.match(/<p>([^<]+)<\/p>/i);
        if (lkM) {
          const eu = this._abs(lkM[1], url);
          if (seen.has(eu)) continue;
          seen.add(eu);
          const lb = lbM ? this._dec(lbM[1]) : eu.split("ep=").pop() || "Version";
          episodes.push({ name: lb, url: eu });
        }
      }
    }

    // ── Format 3: sub-index → saison pages ──
    if (episodes.length === 0) {
      const sRe = /href="([^"]*saison\d+\.php[^"]*)"/gi;
      while ((m = sRe.exec(html)) !== null) {
        const eu = this._abs(m[1], url);
        // Skip if it's in the nav menu (contains "../")
        const isNav = m[0].includes("../");
        if (seen.has(eu) || isNav) continue;
        seen.add(eu);
        const sn = eu.match(/saison(\d+)/i);
        episodes.push({ name: sn ? `Saison ${sn[1]}` : eu, url: eu });
      }
    }

    // ── Format 4: this IS a player page already ──
    if (episodes.length === 0 && (html.includes("NPlayer") || html.includes("makamour"))) {
      episodes.push({ name: name || "Regarder", url });
    }

    if (episodes.length === 0) episodes.push({ name: name || "Ouvrir", url });

    return { name: name || cat?.n || url, imageUrl, description, episodes };
  }

  async getVideoList(url) {
    const r = await new Client().get(url, this._h(url));
    const html = r.body;
    const videos = [];

    // NPlayer: '720p': 'https://...mp4'
    const qRe = /['"](\d+p)['"]\s*:\s*['"]([^'"]+\.mp4[^'"]*)['"]/gi;
    let m;
    while ((m = qRe.exec(html)) !== null) {
      videos.push({ url: m[2], quality: m[1], headers: this._h(url) });
    }

    // WebM fallback
    if (videos.length === 0) {
      const wRe = /['"](\d+p)['"]\s*:\s*['"]([^'"]+\.webm[^'"]*)['"]/gi;
      while ((m = wRe.exec(html)) !== null) {
        videos.push({ url: m[2], quality: m[1] + " (WebM)", headers: this._h(url) });
      }
    }

    // Any direct mp4/webm/m3u8
    if (videos.length === 0) {
      const dRe = /['"](https?:\/\/[^'"]+\.(?:mp4|webm|m3u8)[^'"]*)['"]/gi;
      while ((m = dRe.exec(html)) !== null) {
        videos.push({ url: m[1], quality: "AUTO", headers: this._h(url) });
      }
    }

    // iframe fallback
    if (videos.length === 0) {
      const ifRe = /<iframe[^>]+src="([^"]+)"/gi;
      while ((m = ifRe.exec(html)) !== null) {
        if (!m[1].includes("javascript")) {
          videos.push({ url: m[1], quality: "AUTO", headers: this._h(url) });
        }
      }
    }

    if (videos.length === 0) videos.push({ url, quality: "AUTO", headers: this._h() });

    return videos;
  }

  getForYou(page) { return this.getLatestUpdates(page); }
  getComments(url, page) { return Promise.resolve([]); }
}
