const watchtowerSources = [{
  "name": "DrTuber",
  "lang": "en",
  "baseUrl": "https://www.drtuber.com",
  "apiUrl": "",
  "iconUrl": "https://www.drtuber.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.0",
  "pkgPath": "watch/nsfw/en/drtuber.js",
  "notes": "Adult content (18+) — DrTuber free tube",
  "isNsfw": true
}];

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return { "Referer": "https://www.drtuber.com/", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36", "Accept-Language": "en-US,en;q=0.9" };
  }
  async getPopular(page) {
    const res = await new Client().get(`https://www.drtuber.com/popular?page=${page}`, this.getHeaders());
    return this._parse(res.body, page);
  }
  get supportsLatest() { return true; }
  async getLatestUpdates(page) {
    const res = await new Client().get(`https://www.drtuber.com/latest?page=${page}`, this.getHeaders());
    return this._parse(res.body, page);
  }
  async search(query, page, filters) {
    const q = encodeURIComponent(query.trim());
    const res = await new Client().get(`https://www.drtuber.com/search?q=${q}&page=${page}`, this.getHeaders());
    return this._parse(res.body, page);
  }
  _parse(html, page) {
    const doc = new Document(html);
    const items = [];
    const cards = doc.select(".video-item, .thumb, .item");
    for (const card of cards) {
      const a = card.selectFirst("a[href*='/video/']");
      if (!a) continue;
      const href = a.attr("href") || "";
      const title = a.attr("title") || card.selectFirst(".title")?.text || "Unknown";
      const img = card.selectFirst("img");
      const thumb = img?.attr("data-src") || img?.attr("src") || "";
      const link = href.startsWith("http") ? href : "https://www.drtuber.com" + href;
      items.push({ name: title.trim(), imageUrl: thumb, link });
    }
    return { list: items, hasNextPage: items.length >= 20 };
  }
  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders());
    const doc = new Document(res.body);
    const title = doc.selectFirst('meta[property="og:title"]')?.attr("content") || "Unknown";
    const thumb = doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
    return { name: title, imageUrl: thumb, description: "", genre: [], episodes: [{ name: title, url }] };
  }
  async getVideoList(url) {
    const res = await new Client().get(url, this.getHeaders());
    const html = res.body;
    const videos = [];
    const m3u8 = html.match(/(?:file|src)\s*[:=]\s*["']([^"']+\.m3u8[^"']*)/);
    if (m3u8) videos.push({ url: m3u8[1], quality: "Auto (HLS)", originalUrl: m3u8[1] });
    const mp4 = html.match(/(?:file|src)\s*[:=]\s*["']([^"']+\.mp4[^"']*)/);
    if (mp4 && !m3u8) videos.push({ url: mp4[1], quality: "Auto", originalUrl: mp4[1] });
    return videos;
  }
  async getPageList(url) { return []; }
  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
