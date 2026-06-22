const watchtowerSources = [{
  "name": "MissAV",
  "lang": "ja",
  "baseUrl": "https://missav.ws",
  "apiUrl": "",
  "iconUrl": "https://missav.ws/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.2",
  "pkgPath": "missav/ja/ja.missav.js",
  "notes": "JAV streaming — content always Japanese, multi-language UI",
  "isNsfw": true
}];

const BASE_URL = "https://missav.ws";

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://missav.ws/",
      "Accept-Language": "en-US,en;q=0.9,ja;q=0.8"
    };
  }

  async getPopular(page) {
    const url = `${BASE_URL}/en/new?page=${page}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, BASE_URL);
  }

  get supportsLatest() { return true; }

  async getLatestUpdates(page) {
    const url = `${BASE_URL}/en/new?page=${page}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, BASE_URL);
  }

  async search(query, page, filters) {
    const q = encodeURIComponent(query.trim());
    const url = `${BASE_URL}/en/search/${q}?page=${page}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, BASE_URL);
  }

  _parse(html, base) {
    const doc = new Document(html);
    const items = [];
    const cards = doc.select("a.group, div.thumbnail a, .video-box a[href*='/en/'], .grid a[href*='/dm']");
    for (const card of cards) {
      const href = card.attr("href") || "";
      if (!href || (!href.includes("/dm") && !href.includes("/en/"))) continue;
      const title = card.attr("alt") || card.attr("title") || card.selectFirst("span, p, h3")?.text || "";
      if (!title || title.length < 3) continue;
      const img = card.selectFirst("img");
      const thumb = img?.attr("data-src") || img?.attr("src") || "";
      const link = href.startsWith("http") ? href : base + href;
      items.push({ name: title.trim(), imageUrl: thumb, link });
    }
    // Fallback: meta og tags on listing pages
    if (items.length === 0) {
      const metaItems = doc.select("meta[property='og:title']");
      const metaImg = doc.selectFirst("meta[property='og:image']")?.attr("content") || "";
      const metaUrl = doc.selectFirst("meta[property='og:url']")?.attr("content") || "";
      const metaTitle = doc.selectFirst("meta[property='og:title']")?.attr("content") || "";
      if (metaTitle && metaUrl) {
        items.push({ name: metaTitle, imageUrl: metaImg, link: metaUrl });
      }
    }
    const hasNext = !!doc.selectFirst("a[rel='next'], .pagination a[aria-label='Next'], [aria-label='next']");
    return { list: items, hasNextPage: hasNext || items.length >= 18 };
  }

  async getDetail(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const doc = new Document(res.body);
    const title = doc.selectFirst("meta[property='og:title']")?.attr("content")
      || doc.selectFirst("h1, h2")?.text || "Unknown";
    const thumb = doc.selectFirst("meta[property='og:image']")?.attr("content") || "";
    const desc = doc.selectFirst(".video-info, .description, [class*='detail']")?.text || "";
    const tags = doc.select(".tags a, .genre a, [class*='tag'] a").map(el => ({ name: el.text.trim() }));
    return {
      name: title.trim(), imageUrl: thumb, description: desc,
      genre: tags, episodes: [{ name: title.trim() || "Watch", url }]
    };
  }

  async getVideoList(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const html = res.body;
    const videos = [];
    // m3u8
    const m3u8Rx = /["'`](https?:\/\/[^"'`]+\.m3u8[^"'`]{0,100})["'`]/g;
    let m;
    while ((m = m3u8Rx.exec(html)) !== null) {
      if (!videos.find(v => v.url === m[1])) {
        videos.push({ url: m[1], quality: "HLS", originalUrl: m[1], headers: this.getHeaders(url) });
      }
    }
    // mp4
    if (videos.length === 0) {
      const mp4Rx = /["'`](https?:\/\/[^"'`]+\.mp4[^"'`]{0,100})["'`]/g;
      while ((m = mp4Rx.exec(html)) !== null) {
        videos.push({ url: m[1], quality: "MP4", originalUrl: m[1], headers: this.getHeaders(url) });
        if (videos.length >= 3) break;
      }
    }
    // jwplayer file
    if (videos.length === 0) {
      const fileM = html.match(/file\s*:\s*["']([^"']+)["']/);
      if (fileM) videos.push({ url: fileM[1], quality: "JWPlayer", originalUrl: fileM[1], headers: this.getHeaders(url) });
    }
    return videos;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
