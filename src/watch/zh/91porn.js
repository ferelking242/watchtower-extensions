const watchtowerSources = [{
  "name": "91Porn",
  "lang": "zh",
  "baseUrl": "https://91porn.com",
  "apiUrl": "",
  "iconUrl": "https://91porn.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.2",
  "pkgPath": "91porn/zh/zh.91porn.js",
  "notes": "91Porn — Chinese homemade and Asian amateur videos",
  "isNsfw": true
}];

const BASE_URL = "https://91porn.com";

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://91porn.com/",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
    };
  }

  async getPopular(page) {
    const url = `${BASE_URL}/v.php?viewkey=most_viewed&page=${page}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, BASE_URL);
  }

  get supportsLatest() { return true; }

  async getLatestUpdates(page) {
    const url = `${BASE_URL}/v.php?viewkey=latest&page=${page}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, BASE_URL);
  }

  async search(query, page, filters) {
    const q = encodeURIComponent(query.trim());
    const url = `${BASE_URL}/v.php?viewkey=search&keyword=${q}&page=${page}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, BASE_URL);
  }

  _parse(html, base) {
    const doc = new Document(html);
    const items = [];
    const cards = doc.select(".well, .video-item, .thumb, li[class*='video'], .videoWrapper, .videos-text-align");
    for (const card of cards) {
      const a = card.selectFirst("a[href*='view_video.php'], a[href*='/video/']") || card.selectFirst("a");
      if (!a) continue;
      const href = a.attr("href") || "";
      if (!href || !href.includes("video")) continue;
      const img = card.selectFirst("img");
      const title = card.selectFirst(".video-title, .title, span.title, h3, h2")?.text || img?.attr("alt") || a.attr("title") || "";
      const thumb = img?.attr("data-src") || img?.attr("src") || "";
      const link = href.startsWith("http") ? href : base + href;
      if (title && title.length > 2) items.push({ name: title.trim(), imageUrl: thumb, link });
    }
    const hasNext = !!doc.selectFirst(".next, a[rel='next'], .pagination .next") || /page=2|&page=\d/.test(html);
    return { list: items, hasNextPage: hasNext || items.length >= 10 };
  }

  async getDetail(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const doc = new Document(res.body);
    const clean = (s) => (s || "").replace(/\s*-\s*91porn\s*$/i, "").replace(/<[^>]+>/g, "").trim();
    let title = doc.selectFirst("meta[property='og:title']")?.attr("content") || doc.selectFirst("h1")?.text || "";
    if (!title || title.length < 2) {
      const tm = res.body.match(/<title>([^<]*)<\/title>/i);
      if (tm) title = tm[1];
    }
    title = clean(title);
    const thumb = doc.selectFirst("meta[property='og:image']")?.attr("content") || doc.selectFirst("#player_one")?.attr("poster") || "";
    const tags = doc.select(".tags a, [class*='tag'] a, .categories a").map(el => ({ name: el.text.trim() }));
    return { name: title || "Unknown", imageUrl: thumb, description: "", genre: tags, episodes: [{ name: title || "Watch", url }] };
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
    // 91porn writes the real <source> via document.write(strencode2("...url-encoded..."))
    const encRe = /strencode2\("([^"]+)"\)/g;
    let m;
    while ((m = encRe.exec(html)) !== null) {
      try {
        const decoded = decodeURIComponent(m[1]);
        const sm = decoded.match(/src='([^']+)'/i) || decoded.match(/src="([^"]+)"/i) || decoded.match(/https?:\/\/[^'"\s]+/i);
        if (sm) push(sm[1], "MP4");
      } catch (e) {}
    }
    // direct m3u8/mp4 fallback
    const m3u8Rx = /["'`](https?:\/\/[^"'`]+\.m3u8[^"'`]{0,150})["'`]/g;
    while ((m = m3u8Rx.exec(html)) !== null) push(m[1], "HLS");
    const mp4Rx = /["'`](https?:\/\/[^"'`]+\.mp4[^"'`]{0,150})["'`]/g;
    while ((m = mp4Rx.exec(html)) !== null) {
      push(m[1], "MP4");
      if (videos.length >= 3) break;
    }
    return videos;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
