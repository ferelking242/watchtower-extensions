const watchtowerSources = [{
  "name": "JAVLeak",
  "lang": "ja",
  "baseUrl": "https://javleak.com",
  "apiUrl": "",
  "iconUrl": "https://javleak.com/wp-content/uploads/2023/08/favicon.png",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.0",
  "pkgPath": "javleak/ja/ja.javleak.js",
  "notes": "JAVLeak — JAV HD streaming, Japanese porn movies",
  "isNsfw": true
}];

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://javleak.com/"
    };
  }
  async getPopular(page) {
    const url = `${this.source.baseUrl}/page/${page}/`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, this.source.baseUrl);
  }
  get supportsLatest() { return true; }
  async getLatestUpdates(page) {
    const url = `${this.source.baseUrl}/page/${page}/`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, this.source.baseUrl);
  }
  async search(query, page, filters) {
    const q = encodeURIComponent(query.trim());
    const url = `${this.source.baseUrl}/?s=${q}&paged=${page}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, this.source.baseUrl);
  }
  _parse(html, base) {
    const doc = new Document(html);
    const items = [];
    const cards = doc.select("article, .post, .movie-item, .video-item");
    for (const card of cards) {
      const a = card.selectFirst("a[rel='bookmark'], h2 a, h3 a, .entry-title a");
      if (!a) continue;
      const href = a.attr("href") || "";
      if (!href || href === base + "/") continue;
      const title = a.text?.trim() || a.attr("title") || "";
      const img = card.selectFirst("img.wp-post-image, .post-thumbnail img, img");
      const thumb = img?.attr("data-lazy-src") || img?.attr("data-src") || img?.attr("src") || "";
      if (title && title.length > 2) items.push({ name: title, imageUrl: thumb, link: href });
    }
    return { list: items, hasNextPage: !!doc.selectFirst(".next.page-numbers, a[rel='next']") || items.length >= 10 };
  }
  async getDetail(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const doc = new Document(res.body);
    const title = doc.selectFirst("meta[property='og:title']")?.attr("content") || doc.selectFirst("h1")?.text || "Unknown";
    const thumb = doc.selectFirst("meta[property='og:image']")?.attr("content") || "";
    const tags = doc.select(".tags-links a, [class*='tag'] a").map(el => ({ name: el.text.trim() }));
    return { name: title.trim(), imageUrl: thumb, description: "", genre: tags, episodes: [{ name: title.trim() || "Watch", url }] };
  }
  async getVideoList(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const html = res.body;
    const videos = [];
    const m3u8Rx = /["'`](https?:\/\/[^"'`]+\.m3u8[^"'`]{0,150})["'`]/g;
    let m;
    while ((m = m3u8Rx.exec(html)) !== null) {
      if (!videos.find(v => v.url === m[1])) videos.push({ url: m[1], quality: "HLS", originalUrl: m[1], headers: this.getHeaders(url) });
    }
    if (videos.length === 0) {
      const mp4Rx = /["'`](https?:\/\/[^"'`]+\.mp4[^"'`]{0,150})["'`]/g;
      while ((m = mp4Rx.exec(html)) !== null) {
        if (!videos.find(v => v.url === m[1])) videos.push({ url: m[1], quality: "MP4", originalUrl: m[1], headers: this.getHeaders(url) });
        if (videos.length >= 3) break;
      }
    }
    if (videos.length === 0) {
      const iframeM = html.match(/src="(https?:\/\/(?!www\.google|facebook)[^"]{15,200}(?:embed|player|watch)[^"]{0,100})"/);
      if (iframeM) videos.push({ url: iframeM[1], quality: "Embed", originalUrl: iframeM[1], headers: this.getHeaders(url) });
    }
    return videos;
  }
  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
