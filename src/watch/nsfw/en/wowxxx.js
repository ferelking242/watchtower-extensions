const watchtowerSources = [{
  "name": "WowXXX",
  "lang": "en",
  "baseUrl": "https://www.wow.xxx",
  "apiUrl": "",
  "iconUrl": "https://www.wow.xxx/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.0",
  "pkgPath": "watch/nsfw/en/wowxxx.js",
  "notes": "Adult content (18+) — multi-quality MP4",
  "isNsfw": true
}];
class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://www.wow.xxx/"
    };
  }
  async getPopular(page) {
    const from = (page - 1) * 60;
    const url = `https://www.wow.xxx/${from > 0 ? `?from=${from}` : ""}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parseList(res.body, "https://www.wow.xxx");
  }
  get supportsLatest() { return true; }
  async getLatestUpdates(page) {
    const from = (page - 1) * 60;
    const url = `https://www.wow.xxx/new/${from > 0 ? `?from=${from}` : ""}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parseList(res.body, "https://www.wow.xxx");
  }
  async search(query, page, filters) {
    const q = encodeURIComponent(query.trim());
    const url = `https://www.wow.xxx/search/?q=${q}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parseList(res.body, "https://www.wow.xxx");
  }
  _parseList(html, base) {
    const doc = new Document(html);
    const items = [];
    for (const card of doc.select(".item")) {
      const a = card.selectFirst("a[href*='/videos/']");
      if (!a) continue;
      const href = a.attr("href") || "";
      if (!href) continue;
      const title = a.attr("title") || card.selectFirst("img")?.attr("alt") || "Unknown";
      const img = card.selectFirst("img.thumb");
      const thumb = img?.attr("data-src") || img?.attr("src") || "";
      const dur = card.selectFirst(".duration")?.text?.replace("Full Video", "").trim() || "";
      items.push({
        name: title.trim(),
        imageUrl: thumb,
        link: href.startsWith("http") ? href : base + href,
        description: dur
      });
    }
    return { list: items, hasNextPage: items.length >= 30 };
  }
  async getDetail(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const doc = new Document(res.body);
    const title = doc.selectFirst("h1")?.text?.trim()
      || doc.selectFirst('meta[property="og:title"]')?.attr("content") || "Unknown";
    const thumb = doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
    const tags = doc.select(".video-tags a, .tags a").map(el => ({ name: el.text.trim() }));
    return { name: title, imageUrl: thumb, description: "", genre: tags,
      episodes: [{ name: title, url }] };
  }
  async getVideoList(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const html = res.body;
    const videos = [];
    const rx = /<source\s+src='([^']+\.mp4\/?)'\s+type='video\/mp4'\s+label="([^"]+)"/g;
    let m;
    while ((m = rx.exec(html)) !== null) {
      if (!m[1].includes("?download=")) {
        videos.push({ url: m[1], quality: m[2], originalUrl: m[1], headers: this.getHeaders(url) });
      }
    }
    return videos;
  }
  async getPageList(url) { return []; }
  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
