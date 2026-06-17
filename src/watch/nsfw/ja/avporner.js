const watchtowerSources = [{
  "name": "AVPorner",
  "lang": "ja",
  "baseUrl": "https://avporner.com",
  "apiUrl": "",
  "iconUrl": "https://avporner.com/favicon.ico?v=1.1",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.1",
  "pkgPath": "avporner/ja/ja.avporner.js",
  "notes": "AV porn streaming — Japanese and Asian content",
  "isNsfw": true
}];

const BASE_URL = "https://avporner.com";

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://avporner.com/"
    };
  }

  async getPopular(page) {
    const url = `${BASE_URL}/?page=${page}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, BASE_URL);
  }

  get supportsLatest() { return true; }

  async getLatestUpdates(page) {
    const url = `${BASE_URL}/?page=${page}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, BASE_URL);
  }

  async search(query, page, filters) {
    const q = encodeURIComponent(query.trim());
    const url = `${BASE_URL}/search/${q}/?page=${page}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, BASE_URL);
  }

  _parse(html, base) {
    const doc = new Document(html);
    const items = [];
    const cards = doc.select(".video-list, [class*='video_list'], .col-md-3.col-sm-6");
    for (const card of cards) {
      const a = card.selectFirst("a[href*='/watch/']") || card.selectFirst("a[href*='.html']");
      if (!a) continue;
      const href = a.attr("href") || "";
      if (!href) continue;
      const img = card.selectFirst("img");
      const title = img?.attr("alt") || a.attr("title") || "";
      const thumb = img?.attr("src") || img?.attr("data-src") || "";
      const link = href.startsWith("http") ? href : base + href;
      if (title) items.push({ name: title.trim(), imageUrl: thumb, link });
    }
    const hasNext = !!doc.selectFirst(".pagination .next, a[rel='next'], li.next a");
    return { list: items, hasNextPage: hasNext || items.length >= 16 };
  }

  async getDetail(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const doc = new Document(res.body);
    const title = doc.selectFirst("meta[property='og:title']")?.attr("content")
      || doc.selectFirst("h1, h2")?.text || "Unknown";
    const thumb = doc.selectFirst("meta[property='og:image']")?.attr("content") || "";
    const tags = doc.select(".tags a, [class*='tag'] a, .categories a").map(el => ({ name: el.text.trim() }));
    return {
      name: title.trim(), imageUrl: thumb, description: "",
      genre: tags, episodes: [{ name: title.trim() || "Watch", url }]
    };
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
