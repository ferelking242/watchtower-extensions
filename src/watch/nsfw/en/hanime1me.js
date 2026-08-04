const watchtowerSources = [{
  "name": "Hanime1.me",
  "lang": "en",
  "baseUrl": "https://hanime1.me",
  "apiUrl": "",
  "iconUrl": "https://hanime1.me/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.0",
  "pkgPath": "watch/nsfw/en/hanime1me.js",
  "notes": "Hanime1.me streaming (18+) — Chinese/multilingual hentai",
  "isNsfw": true
}];

const BASE = "https://hanime1.me";

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": BASE + "/",
      "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8"
    };
  }

  _parse(html) {
    const doc = new Document(html);
    const items = [];
    const seen = new Set();
    for (const card of doc.select(".card,.video-item,.item,article")) {
      const a = card.selectFirst("a[href]");
      if (!a) continue;
      let link = a.attr("href") || "";
      if (!link || link === "#") continue;
      if (!link.startsWith("http")) link = BASE + link;
      if (seen.has(link)) continue;
      seen.add(link);
      const img = card.selectFirst("img");
      const thumb = img?.attr("data-src") || img?.attr("src") || "";
      const name = card.selectFirst("h3,h2,.title,[class*=title]")?.text?.trim() ||
                   a.attr("title") || img?.attr("alt") || "Hentai";
      items.push({ name, imageUrl: thumb, link });
    }
    return { list: items, hasNextPage: !!doc.selectFirst("a.next,[rel=next],.next,.pagination-next") };
  }

  async getPopular(page) {
    const res = await new Client().get(`${BASE}/videos?page=${page}&sort=popular`, this.getHeaders());
    return this._parse(res.body);
  }

  async getLatestUpdates(page) {
    const res = await new Client().get(`${BASE}/videos?page=${page}`, this.getHeaders());
    return this._parse(res.body);
  }

  async search(query, page, filters) {
    const res = await new Client().get(`${BASE}/search?query=${encodeURIComponent(query)}&page=${page}`, this.getHeaders());
    return this._parse(res.body);
  }

  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const doc = new Document(res.body);
    const name = doc.selectFirst("h1,.video-title")?.text?.trim() ||
                 (res.body.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) || [])[1] || "Hentai";
    const imageUrl = doc.selectFirst('meta[property="og:image"]')?.attr("content") ||
                     doc.selectFirst(".cover img,.poster img")?.attr("src") || "";
    const description = doc.selectFirst(".description,.synopsis")?.text?.trim() || "";
    const genre = doc.select("a[href*=tag],.tags a").map(el => ({ name: el.text.trim() }));
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
    return videos;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
