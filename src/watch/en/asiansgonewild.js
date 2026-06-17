const watchtowerSources = [{
  "name": "AsiansGoneWild",
  "lang": "en",
  "baseUrl": "https://www.asiansgonewild.com",
  "apiUrl": "",
  "iconUrl": "https://www.asiansgonewild.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.1",
  "pkgPath": "asiansgonewild/en/en.asiansgonewild.js",
  "notes": "AsiansGoneWild — amateur Asian adult videos",
  "isNsfw": true
}];

const BASE_URL = "https://www.asiansgonewild.com";

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://www.asiansgonewild.com/"
    };
  }
  async getPopular(page) {
    const url = `${BASE_URL}/?page=${page}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, BASE_URL);
  }
  get supportsLatest() { return true; }
  async getLatestUpdates(page) {
    const url = `${BASE_URL}/page/${page}/`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, BASE_URL);
  }
  async search(query, page, filters) {
    const q = encodeURIComponent(query.trim());
    const url = `${BASE_URL}/?s=${q}&page=${page}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, BASE_URL);
  }
  _parse(html, base) {
    const doc = new Document(html);
    const items = [];
    const cards = doc.select("article, .post, .item, [class*='video'], [class*='thumb']");
    for (const card of cards) {
      const a = card.selectFirst("h2 a, h3 a, a[rel='bookmark'], a");
      if (!a) continue;
      const href = a.attr("href") || "";
      if (!href || href.length < 15) continue;
      const img = card.selectFirst("img");
      const title = img?.attr("alt") || a.attr("title") || a.text?.trim() || card.selectFirst(".title, h2, h3")?.text || "";
      const thumb = img?.attr("data-lazy-src") || img?.attr("data-src") || img?.attr("src") || "";
      if (title && title.length > 2) items.push({ name: title.trim(), imageUrl: thumb, link: href.startsWith("http") ? href : base + href });
    }
    return { list: items, hasNextPage: !!doc.selectFirst(".next, a[rel='next'], .next.page-numbers") || items.length >= 10 };
  }
  async getDetail(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const doc = new Document(res.body);
    const title = doc.selectFirst("meta[property='og:title']")?.attr("content") || doc.selectFirst("h1")?.text || "Unknown";
    const thumb = doc.selectFirst("meta[property='og:image']")?.attr("content") || "";
    const tags = doc.select(".tags a, [class*='tag'] a").map(el => ({ name: el.text.trim() }));
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
    if (videos.length === 0) { const f = html.match(/file\s*:\s*["']([^"']+)["']/); if (f) videos.push({ url: f[1], quality: "JWPlayer", originalUrl: f[1], headers: this.getHeaders(url) }); }
    return videos;
  }
  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
