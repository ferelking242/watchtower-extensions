const watchtowerSources = [{
  "name": "7MMTV",
  "lang": "ja",
  "baseUrl": "https://www.7mmtv.sx",
  "apiUrl": "",
  "iconUrl": "https://www.7mmtv.sx/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.0",
  "pkgPath": "7mmtv/ja/ja.7mmtv.js",
  "notes": "7MMTV — censored and uncensored JAV online",
  "isNsfw": true
}];

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://www.7mmtv.sx/"
    };
  }

  async getPopular(page) {
    const url = `${this.source.baseUrl}/en/censored_list/all/${page}.html`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, this.source.baseUrl);
  }

  get supportsLatest() { return true; }

  async getLatestUpdates(page) {
    const url = `${this.source.baseUrl}/en/censored_list/all/${page}.html`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, this.source.baseUrl);
  }

  async search(query, page, filters) {
    const q = encodeURIComponent(query.trim());
    const url = `${this.source.baseUrl}/en/search?keyword=${q}&page=${page}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, this.source.baseUrl);
  }

  _parse(html, base) {
    const doc = new Document(html);
    const items = [];
    const cards = doc.select("a[href*='/en/censored/'], a[href*='/en/uncensored/'], a[href*='/en/amateurjav/'], .item a, .movie a");
    for (const card of cards) {
      const href = card.attr("href") || "";
      if (!href || href.endsWith("_list/")) continue;
      const img = card.selectFirst("img");
      const title = img?.attr("alt") || img?.attr("title") || card.attr("title") || "";
      const thumb = img?.attr("src") || img?.attr("data-src") || "";
      const link = href.startsWith("http") ? href : base + href;
      if (title && title.length > 2) items.push({ name: title.trim(), imageUrl: thumb, link });
    }
    // deduplicate
    const seen = new Set();
    const unique = items.filter(i => { if (seen.has(i.link)) return false; seen.add(i.link); return true; });
    const hasNext = !!doc.selectFirst(".next, a[rel='next'], .pagination .next");
    return { list: unique, hasNextPage: hasNext || unique.length >= 16 };
  }

  async getDetail(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const doc = new Document(res.body);
    const title = doc.selectFirst("meta[property='og:title']")?.attr("content") || doc.selectFirst("h1, h2")?.text || "Unknown";
    const thumb = doc.selectFirst("meta[property='og:image']")?.attr("content") || "";
    const tags = doc.select(".tags a, [class*='genre'] a, [class*='tag'] a").map(el => ({ name: el.text.trim() }));
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
