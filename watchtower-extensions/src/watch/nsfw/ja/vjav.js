const watchtowerSources = [{
  "name": "VJav",
  "lang": "ja",
  "baseUrl": "https://vjav.com",
  "apiUrl": "",
  "iconUrl": "https://vjav.com/images/favicons/favicon-32x32.png",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.1.0",
  "pkgPath": "watch/nsfw/ja/vjav.js",
  "notes": "JAV streaming site",
  "isNsfw": true
}];

const BASE_URL = "https://vjav.com";

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://vjav.com/"
    };
  }

  async getPopular(page) {
    const url = `${BASE_URL}/videos/filtered/?t=mr&m=${page}`;
    const res = await new Client().get(url, this.getHeaders(url));
    return this._parse(res.body, BASE_URL);
  }

  get supportsLatest() { return true; }

  async getLatestUpdates(page) {
    const url = `${BASE_URL}/videos/filtered/?t=n&m=${page}`;
    const res = await new Client().get(url, this.getHeaders(url));
    return this._parse(res.body, BASE_URL);
  }

  async search(query, page, filters) {
    const q = encodeURIComponent(query.trim());
    const url = `${BASE_URL}/videos/filtered/?q=${q}&m=${page}`;
    const res = await new Client().get(url, this.getHeaders(url));
    return this._parse(res.body, BASE_URL);
  }

  _parse(html, base) {
    const doc = new Document(html);
    const items = [];
    const cards = doc.select(".item, .video-item, article, [class*='thumb'], [class*='video']");
    for (const card of cards) {
      const a = card.selectFirst("a[href*='/videos/']") || card.selectFirst("a");
      if (!a) continue;
      const href = a.attr("href") || "";
      if (!href || !href.includes("/videos/")) continue;
      const img = card.selectFirst("img");
      const title = img?.attr("alt") || a.attr("title") || card.selectFirst(".title, h2, h3, span")?.text || "";
      const thumb = img?.attr("data-src") || img?.attr("src") || "";
      const link = href.startsWith("http") ? href : base + href;
      if (title) items.push({ name: title.trim(), imageUrl: thumb, link });
    }
    const hasNext = !!doc.selectFirst(".pagination .next, a[rel='next']");
    return { list: items, hasNextPage: hasNext || items.length >= 12 };
  }

  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const doc = new Document(res.body);
    const title = doc.selectFirst("meta[property='og:title']")?.attr("content") || doc.selectFirst("h1")?.text || "Unknown";
    const thumb = doc.selectFirst("meta[property='og:image']")?.attr("content") || "";
    const tags = doc.select(".tags a, [class*='genre'] a, [class*='tag'] a, .categories a").map(el => ({ name: el.text.trim() }));
    return { name: title.trim(), imageUrl: thumb, description: "", genre: tags, episodes: [{ name: title.trim() || "Watch", url }] };
  }

  async getVideoList(url) {
    const res = await new Client().get(url, this.getHeaders(url));
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
