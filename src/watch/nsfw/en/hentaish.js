const watchtowerSources = [{
  "name": "Hentai.SH",
  "lang": "en",
  "baseUrl": "https://hentai.sh",
  "apiUrl": "",
  "iconUrl": "https://hentai.sh/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.0",
  "pkgPath": "watch/nsfw/en/hentaish.js",
  "notes": "Hentai.SH streaming (18+)",
  "isNsfw": true
}];

const BASE = "https://hentai.sh";

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
    // Real structure: <a class="video-card" href="/video/<slug>">
    //   <div class="video-thumb"><img src="https://edge1.hentai.sh/v/<slug>/thumb.jpg" alt="TITLE"></div>
    //   <div class="video-body"><h3>TITLE</h3>...</div></a>
    for (const card of doc.select("a.video-card[href*='/video/']")) {
      const link = card.attr("href") || "";
      if (!link || link === "#") continue;
      const full = link.startsWith("http") ? link : BASE + link;
      if (seen.has(full)) continue;
      seen.add(full);
      const img = card.selectFirst("img");
      const thumb = img?.attr("data-src") || img?.attr("src") || "";
      const name = card.selectFirst("h3")?.text?.trim() ||
                   img?.attr("alt") || "Hentai";
      items.push({ name, imageUrl: thumb, link: full });
    }
    return { list: items, hasNextPage: false };
  }

  async getPopular(page) {
    const res = await new Client().get(`${BASE}/trending${page > 1 ? `?page=${page}` : ""}`, this.getHeaders());
    return this._parse(res.body);
  }

  async getLatestUpdates(page) {
    // Home page is the “Recent Aired” grid
    const res = await new Client().get(`${BASE}/${page > 1 ? `?page=${page}` : ""}`, this.getHeaders());
    return this._parse(res.body);
  }

  async search(query, page, filters) {
    const res = await new Client().get(`${BASE}/video?q=${encodeURIComponent(query.trim())}`, this.getHeaders());
    return this._parse(res.body);
  }

  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const doc = new Document(res.body);
    const name = doc.selectFirst("h1")?.text?.trim() || "Hentai";
    const imageUrl = doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
    const description = doc.selectFirst('meta[name="description"]')?.attr("content") || "";
    const genre = doc.select("a[rel=tag],.tag,.genre").map(el => ({ name: el.text.trim() }));
    return { name, imageUrl, description, genre, episodes: [{ name, url }] };
  }

  async getVideoList(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const videos = [];
    const clean = (s) => String(s).replace(/["'\\]+$/, "");
    const m3u8Re = /["'](https?:\/\/[^"']+\.m3u8[^"']*)['"]/gi;
    const mp4Re  = /["'](https?:\/\/[^"']+\.mp4[^"']*)['"]/gi;
    let m;
    while ((m = m3u8Re.exec(html)) !== null)
      videos.push({ url: clean(m[1]), quality: "HLS", originalUrl: clean(m[1]), headers: this.getHeaders(url) });
    while (videos.length < 3 && (m = mp4Re.exec(html)) !== null)
      videos.push({ url: clean(m[1]), quality: "MP4", originalUrl: clean(m[1]), headers: this.getHeaders(url) });
    return videos;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
