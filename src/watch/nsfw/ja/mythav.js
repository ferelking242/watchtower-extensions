const watchtowerSources = [{
  "name": "MyThav",
  "lang": "ja",
  "baseUrl": "https://mythav.com",
  "apiUrl": "",
  "iconUrl": "https://mythav.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.2",
  "pkgPath": "mythav/ja/ja.mythav.js",
  "notes": "MyThav — JAV streaming portal",
  "isNsfw": true
}];

const BASE_URL = "https://mythav.com";

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://mythav.com/"
    };
  }
  async getPopular(page) {
    const url = `${BASE_URL}/?page=${page}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, BASE_URL);
  }
  get supportsLatest() { return true; }
  async getLatestUpdates(page) {
    const url = `${BASE_URL}/new/?page=${page}`;
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
    const cards = doc.select("article, .post, .item, [class*='video'], [class*='movie'], [class*='thumb']");
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
    return { list: items, hasNextPage: !!doc.selectFirst(".next, a[rel='next']") || items.length >= 10 };
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
    const seen = new Set();
    const push = (src, quality) => {
      if (!src || seen.has(src)) return;
      seen.add(src);
      videos.push({ url: src, quality, originalUrl: src, headers: this.getHeaders(url) });
    };
    // Player is an iframe -> mythav.org/player/r.php?r=<b64 of upload18.org/play/index/<code>>
    const clean = (s) => (s || "").replace(/\\u0026/g, "&").replace(/\\\//g, "/");
    const grabM3u8 = (h) => {
      const src1 = (h.match(/"m3u8"\s*:\s*"([^"]+)"/) || [])[1];
      if (src1) push(clean(src1), "HLS");
      const m3u8Rx = /["'`](https?:\\?\/\\?\/[^"'`]+\.[^"'`]*m3u8[^"'`]*)["'`]/g;
      let m;
      while ((m = m3u8Rx.exec(h)) !== null) push(clean(m[1]), "HLS");
      if (videos.length === 0) {
        const mp4Rx = /["'`](https?:\\?\/\\?\/[^"'`]+\.mp4[^"'`]{0,150})["'`]/g;
        while ((m = mp4Rx.exec(h)) !== null) { push(clean(m[1]), "MP4"); }
      }
    };
    const iframeRe = /<iframe[^>]+src="([^"]+)"/gi;
    let m;
    const frames = [];
    while ((m = iframeRe.exec(html)) !== null) frames.push(m[1]);
    for (let src of frames) {
      if (!src || !/player\/r\.php|play\/index|upload/i.test(src)) continue;
      if (!src.startsWith("http")) src = new URL(src, url).href;
      try {
        // r.php carries a base64 target URL; resolve it directly
        const rp = src.match(/[?&]r=([^&]+)/);
        let target = src;
        if (rp) {
          try {
            const dec = Buffer.from(decodeURIComponent(rp[1]), "base64").toString("utf8");
            if (/^https?:\/\//.test(dec)) target = dec;
          } catch (_) {}
        }
        const ifr = await new Client().get(target, { ...this.getHeaders(url), Referer: url });
        grabM3u8(ifr.body);
      } catch (_) {}
      if (videos.length > 0) break;
    }
    if (videos.length === 0) grabM3u8(html);
    return videos;
  }
  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
