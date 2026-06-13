const watchtowerSources = [{
  "name": "NJAV",
  "lang": "ja",
  "baseUrl": "https://njav.tv",
  "apiUrl": "",
  "iconUrl": "https://njav.tv/assets/123av/images/favicon.png",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.0",
  "pkgPath": "njav/ja/ja.njav.js",
  "notes": "NJAV — HD JAV streaming, multi-language (en/ja/zh)",
  "isNsfw": true
}];

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://njav.tv/"
    };
  }

  async getPopular(page) {
    const url = `${this.source.baseUrl}/en?page=${page}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, this.source.baseUrl);
  }

  get supportsLatest() { return true; }

  async getLatestUpdates(page) {
    const url = `${this.source.baseUrl}/en?page=${page}&sort=new`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, this.source.baseUrl);
  }

  async search(query, page, filters) {
    const q = encodeURIComponent(query.trim());
    const url = `${this.source.baseUrl}/en?search=${q}&page=${page}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, this.source.baseUrl);
  }

  _parse(html, base) {
    const doc = new Document(html);
    const items = [];
    const cards = doc.select(".item, [class*='video-item'], article, .movie-item, [class*='thumb']");
    for (const card of cards) {
      const a = card.selectFirst("a[href*='/en/video/'], a[href*='/video/'], a");
      if (!a) continue;
      const href = a.attr("href") || "";
      if (!href || href === "/" || href === base) continue;
      const img = card.selectFirst("img");
      const title = img?.attr("alt") || a.attr("title") || card.selectFirst(".title, h2, h3, span")?.text || "";
      const thumb = img?.attr("data-src") || img?.attr("src") || "";
      const link = href.startsWith("http") ? href : base + href;
      if (title && title.length > 2) items.push({ name: title.trim(), imageUrl: thumb, link });
    }
    const hasNext = !!doc.selectFirst(".next, a[rel='next'], [aria-label='Next']");
    return { list: items, hasNextPage: hasNext || items.length >= 15 };
  }

  async getDetail(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const doc = new Document(res.body);
    const title = doc.selectFirst("meta[property='og:title']")?.attr("content") || doc.selectFirst("h1")?.text || "Unknown";
    const thumb = doc.selectFirst("meta[property='og:image']")?.attr("content") || "";
    const tags = doc.select(".tags a, [class*='genre'] a, [class*='tag'] a, .categories a").map(el => ({ name: el.text.trim() }));
    return { name: title.trim(), imageUrl: thumb, description: "", genre: tags, episodes: [{ name: title.trim() || "Watch", url }] };
  }

  async getVideoList(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const html = res.body;
    const videos = [];
    const m3u8Rx = /["'`](https?:\/\/[^"'`]+\.m3u8[^"'`]{0,150})["'`]/g;
    let m;
    while ((m = m3u8Rx.exec(html)) !== null) {
      if (!videos.find(v => v.url === m[1]))
        videos.push({ url: m[1], quality: "HLS", originalUrl: m[1], headers: this.getHeaders(url) });
    }
    if (videos.length === 0) {
      const mp4Rx = /["'`](https?:\/\/[^"'`]+\.mp4[^"'`]{0,150})["'`]/g;
      while ((m = mp4Rx.exec(html)) !== null) {
        if (!videos.find(v => v.url === m[1]))
          videos.push({ url: m[1], quality: "MP4", originalUrl: m[1], headers: this.getHeaders(url) });
        if (videos.length >= 3) break;
      }
    }
    if (videos.length === 0) {
      const fileM = html.match(/file\s*:\s*["']([^"']+)["']/);
      if (fileM) videos.push({ url: fileM[1], quality: "JWPlayer", originalUrl: fileM[1], headers: this.getHeaders(url) });
    }
    return videos;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
