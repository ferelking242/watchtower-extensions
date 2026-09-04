const watchtowerSources = [{
  "name": "YouJizz",
  "lang": "en",
  "baseUrl": "https://www.youjizz.com",
  "apiUrl": "",
  "iconUrl": "https://www.youjizz.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.0",
  "pkgPath": "watch/nsfw/en/youjizz.js",
  "notes": "Adult content (18+) — YouJizz free tube",
  "isNsfw": true
}];

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "Referer": "https://www.youjizz.com/",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9"
    };
  }
  async getPopular(page) {
    const res = await new Client().get(`https://www.youjizz.com/most-popular/${page}`, this.getHeaders());
    return this._parse(res.body, page);
  }
  get supportsLatest() { return true; }
  async getLatestUpdates(page) {
    const res = await new Client().get(`https://www.youjizz.com/newest/${page}`, this.getHeaders());
    return this._parse(res.body, page);
  }
  async search(query, page, filters) {
    const q = encodeURIComponent(query.trim());
    const res = await new Client().get(`https://www.youjizz.com/search/${q}/${page}`, this.getHeaders());
    return this._parse(res.body, page);
  }
  _parse(html, page) {
    const doc = new Document(html);
    const items = [];
    const cards = doc.select(".video-listing-thumb, .video-thumb");
    for (const card of cards) {
      const a = card.selectFirst("a[href*='/videos/']");
      if (!a) continue;
      const href = a.attr("href") || "";
      if (!href) continue;
      const title = a.attr("title") || card.selectFirst("p.video-title")?.text || "Unknown";
      const img = card.selectFirst("img");
      const thumb = img?.attr("data-src") || img?.attr("src") || "";
      const link = href.startsWith("http") ? href : "https://www.youjizz.com" + href;
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
    const m3u8 = html.match(/file:\s*["']([^"']+\.m3u8[^"']*)/);
    if (m3u8) videos.push({ url: m3u8[1], quality: "Auto (HLS)", originalUrl: m3u8[1] });
    const mp4 = html.match(/file:\s*["']([^"']+\.mp4[^"']*)/);
    if (mp4 && !m3u8) videos.push({ url: mp4[1], quality: "Auto", originalUrl: mp4[1] });
    return videos;
  }
  async getPageList(url) { return []; }
  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
