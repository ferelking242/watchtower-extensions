const watchtowerSources = [{
  "name": "JAVMost",
  "lang": "ja",
  "baseUrl": "https://javmost.com",
  "apiUrl": "",
  "iconUrl": "https://javmost.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.1",
  "pkgPath": "javmost/ja/ja.javmost.js",
  "notes": "Watch free JAV online streaming",
  "isNsfw": true
}];

const BASE_URL = "https://javmost.com";

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://javmost.com/"
    };
  }

  async getPopular(page) {
    const url = `${BASE_URL}/page/${page}/`;
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
    const url = `${BASE_URL}/search/${q}/page/${page}/`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, BASE_URL);
  }

  _parse(html, base) {
    const doc = new Document(html);
    const items = [];
    // JAVMost cards: img.card-img-top[data-src], title in h1.card-title inside .card-block a
    const cards = doc.select(".card, .card-block, [class*='card']");
    for (const card of cards) {
      const titleEl = card.selectFirst("h1.card-title a, h2.card-title a, .card-title a");
      if (!titleEl) continue;
      const href = titleEl.attr("href") || "";
      if (!href) continue;
      const title = titleEl.attr("alt") || titleEl.text?.trim() || "";
      const img = card.selectFirst("img.card-img-top, img[data-src], img");
      const thumb = img?.attr("data-src") || img?.attr("src") || "";
      const link = href.startsWith("http") ? href : base + href;
      if (title) items.push({ name: title, imageUrl: thumb, link });
    }
    // fallback: direct img[data-src] + closest link
    if (items.length === 0) {
      const imgs = doc.select("img[data-src]");
      for (const img of imgs) {
        const thumb = img.attr("data-src") || "";
        const alt = img.attr("alt") || img.attr("name") || "";
        const link = base + "/" + alt + "/";
        if (alt) items.push({ name: alt, imageUrl: thumb, link });
      }
    }
    const hasNext = !!doc.selectFirst(".pagination .next, a[rel='next'], li.next a");
    return { list: items, hasNextPage: hasNext || items.length >= 12 };
  }

  async getDetail(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const doc = new Document(res.body);
    const title = doc.selectFirst("meta[property='og:title']")?.attr("content")
      || doc.selectFirst("h1, h2")?.text || "Unknown";
    const thumb = doc.selectFirst("meta[property='og:image']")?.attr("content") || "";
    const tags = doc.select(".tags a, .genre a, [class*='tag'] a").map(el => ({ name: el.text.trim() }));
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
    if (videos.length === 0) {
      const iframeM = html.match(/src="(https?:\/\/(?!www\.google|facebook|cdn\.javmost)[^"]{15,200})"/);
      if (iframeM) videos.push({ url: iframeM[1], quality: "Embed", originalUrl: iframeM[1], headers: this.getHeaders(url) });
    }
    return videos;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
