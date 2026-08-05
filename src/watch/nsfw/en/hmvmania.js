const watchtowerSources = [{
  "name": "HMV Mania",
  "lang": "en",
  "baseUrl": "https://hmvmania.com",
  "apiUrl": "",
  "iconUrl": "https://hmvmania.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.0",
  "pkgPath": "watch/nsfw/en/hmvmania.js",
  "notes": "HMV Mania — Hentai Music Videos (18+)",
  "isNsfw": true
}];

const BASE = "https://hmvmania.com";

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
    for (const card of doc.select("article,.video-item,.item,.post")) {
      const a = card.selectFirst("a[href]");
      if (!a) continue;
      let link = a.attr("href") || "";
      if (!link || link === "#") continue;
      if (!link.startsWith("http")) link = BASE + link;
      if (seen.has(link)) continue;
      seen.add(link);
      const img = card.selectFirst("img");
      const thumb = img?.attr("data-src") || img?.attr("src") || "";
      const name = card.selectFirst("h2,h3,.title,.entry-title")?.text?.trim() || a.attr("title") || "HMV";
      items.push({ name, imageUrl: thumb, link });
    }
    return { list: items, hasNextPage: !!doc.selectFirst("a.next,[rel=next],.nav-next") };
  }

  async getPopular(page) {
    const res = await new Client().get(`${BASE}/page/${page}/?orderby=views`, this.getHeaders());
    return this._parse(res.body);
  }

  async getLatestUpdates(page) {
    const res = await new Client().get(`${BASE}/page/${page}/`, this.getHeaders());
    return this._parse(res.body);
  }

  async search(query, page, filters) {
    const res = await new Client().get(`${BASE}/?s=${encodeURIComponent(query)}&paged=${page}`, this.getHeaders());
    return this._parse(res.body);
  }

  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const doc = new Document(res.body);
    const name = doc.selectFirst("h1,.entry-title")?.text?.trim() || "HMV";
    const imageUrl = doc.selectFirst('meta[property="og:image"]')?.attr("content") ||
                     doc.selectFirst(".entry-content img")?.attr("src") || "";
    const description = doc.selectFirst(".entry-content p,.description")?.text?.trim() || "";
    const genre = doc.select("a[rel=tag],.tags a,.cat-links a").map(el => ({ name: el.text.trim() }));
    return { name, imageUrl, description, genre, episodes: [{ name, url }] };
  }

  async getVideoList(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const videos = [];
    const m3u8Re = /["'](https?:\/\/[^"']+\.m3u8[^"']*)['"]/gi;
    const mp4Re  = /["'](https?:\/\/[^"']+\.mp4[^"']*)['"]/gi;
    let m;
    while ((m = m3u8Re.exec(html)) !== null)
      videos.push({ url: m[1], quality: "HLS", originalUrl: m[1], headers: this.getHeaders(url) });
    while (videos.length < 3 && (m = mp4Re.exec(html)) !== null)
      videos.push({ url: m[1], quality: "MP4", originalUrl: m[1], headers: this.getHeaders(url) });
    if (videos.length === 0) {
      const iM = html.match(/<iframe[^>]+src="([^"]+)"/i);
      if (iM) {
        const src = iM[1].startsWith("http") ? iM[1] : BASE + iM[1];
        try {
          const iRes = await new Client().get(src, { ...this.getHeaders(url), Referer: url });
          const im = iRes.body.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)['"]/);
          if (im) videos.push({ url: im[1], quality: "HLS", originalUrl: im[1], headers: this.getHeaders(url) });
        } catch (_) {}
      }
    }
    return videos;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
