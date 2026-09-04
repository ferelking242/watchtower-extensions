const watchtowerSources = [{
  "name": "Hentai Ocean",
  "lang": "en",
  "baseUrl": "https://hentaiocean.com",
  "apiUrl": "",
  "iconUrl": "https://hentaiocean.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.0",
  "pkgPath": "watch/nsfw/en/hentaiocean.js",
  "notes": "Hentai Ocean streaming (18+)",
  "isNsfw": true
}];

const BASE = "https://hentaiocean.com";

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": BASE + "/",
      "Accept-Language": "en-US,en;q=0.9"
    };
  }

  _parse(html) {
    const doc = new Document(html);
    const items = [];
    const seen = new Set();
    // Real structure (Bulma grid): <a class="cell card" href="/watch/<slug>">
    //   <div class="card-image"><div class="image cover-ratio"><img src="..." alt="TITLE"></div></div>
    //   <div class="card-content"><p class="subtitle is-6 ...">TITLE</p></div></a>
    for (const card of doc.select("a.cell.card[href*='/watch/']")) {
      const link = card.attr("href") || "";
      if (!link || link === "#") continue;
      const full = link.startsWith("http") ? link : BASE + link;
      if (seen.has(full)) continue;
      seen.add(full);
      const img = card.selectFirst("img");
      const thumb = img?.attr("data-src") || img?.attr("src") || "";
      const name = card.selectFirst(".subtitle")?.text?.trim() ||
                   img?.attr("alt") || "Hentai";
      items.push({ name, imageUrl: thumb, link: full });
    }
    return { list: items, hasNextPage: false };
  }

  async getPopular(page) {
    // No dedicated "popular" view — newly added is the fullest listing
    const res = await new Client().get(`${BASE}/view/newly-added${page > 1 ? `?page=${page}` : ""}`, this.getHeaders());
    return this._parse(res.body);
  }

  async getLatestUpdates(page) {
    const res = await new Client().get(`${BASE}/view/recent-releases${page > 1 ? `?page=${page}` : ""}`, this.getHeaders());
    return this._parse(res.body);
  }

  async search(query, page, filters) {
    const q = encodeURIComponent(query.trim());
    const res = await new Client().get(`${BASE}/search?q=${q}${page > 1 ? `&page=${page}` : ""}`, this.getHeaders());
    return this._parse(res.body);
  }

  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const doc = new Document(res.body);
    const name = doc.selectFirst("h1")?.text?.trim() || "Hentai";
    const imageUrl = doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
    const description = doc.selectFirst('meta[name="description"]')?.attr("content") ||
                        doc.selectFirst(".description,.synopsis,.summary")?.text?.trim() || "";
    const genre = doc.select("a[rel=tag],.tags a,.genres a").map(el => ({ name: el.text.trim() }));
    const episodes = [];
    for (const ep of doc.select(".episode-list a,.episodes a,a[href*=episode],a[href*=ep-]")) {
      const epLink = ep.attr("href") || "";
      if (!epLink || epLink === "#") continue;
      const epUrl = epLink.startsWith("http") ? epLink : BASE + epLink;
      episodes.push({ name: ep.text?.trim() || "Episode", url: epUrl });
    }
    if (episodes.length === 0) episodes.push({ name, url });
    return { name, imageUrl, description, genre, episodes };
  }

  async getVideoList(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const videos = [];
    // Watch pages embed: jsondata = { "info": [...], "mirrors": [{ "mirrorurl":
    // "https:\/\/w2.hentaiocean.com\/play?vid=<encoded file name>" }], "genres": [...] }
    const jm = html.match(/jsondata\s*=\s*(\{[\s\S]*?\})\s*<\/script>/);
    if (jm) {
      try {
        const data = JSON.parse(jm[1]);
        for (const m of data?.mirrors || []) {
          const mu = String(m.mirrorurl || "").replace(/\\\//g, "/");
          const vm = mu.match(/\/play\?vid=([^&]+)/);
          if (!vm) continue;
          let raw = vm[1];
          try { raw = decodeURIComponent(raw); } catch (_) {}
          const host = (mu.match(/^https?:\/\/[^/]+/) || ["https://w2.hentaiocean.com"])[0];
          const direct = host + "/video/" + encodeURIComponent(raw);
          videos.push({ url: direct, quality: "MP4", originalUrl: direct, headers: { ...this.getHeaders(url), Referer: host + "/" } });
        }
      } catch (_) {}
    }
    if (videos.length === 0) {
      const m3u8Re = /["'](https?:\/\/[^"']+\.m3u8[^"']*)['"]/gi;
      const mp4Re  = /["'](https?:\/\/[^"']+\.mp4[^"']*)['"]/gi;
      let m;
      while ((m = m3u8Re.exec(html)) !== null)
        videos.push({ url: m[1], quality: "HLS", originalUrl: m[1], headers: this.getHeaders(url) });
      while (videos.length < 3 && (m = mp4Re.exec(html)) !== null)
        videos.push({ url: m[1], quality: "MP4", originalUrl: m[1], headers: this.getHeaders(url) });
    }
    return videos;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
