const watchtowerSources = [{
  "name": "TokyoMotion",
  "lang": "ja",
  "baseUrl": "https://www.tokyomotion.net",
  "apiUrl": "",
  "iconUrl": "https://cdn.tokyo-motion.net/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.6",
  "login": false,
  "forYou": false,
  "pkgPath": "nsfw/watch/ja/tokyomotion.js",
  "notes": "Japanese porn tube — TokyoMotion",
  "isNsfw": true
}];

const BASE_URL = "https://www.tokyomotion.net";

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://www.tokyomotion.net/"
    };
  }

  async getPopular(page) {
    const url = `${BASE_URL}/?page=${page}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, BASE_URL);
  }

  get supportsLatest() { return true; }

  async getLatestUpdates(page) {
    const url = `${BASE_URL}/search?search_query=japanese&search_type=videos&page=${page}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, BASE_URL);
  }

  async search(query, page, filters) {
    const q = encodeURIComponent(query.trim());
    const url = `${BASE_URL}/search?search_query=${q}&search_type=videos&page=${page}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, BASE_URL);
  }

  _parse(html, base) {
    const doc = new Document(html);
    const items = [];
    const cards = doc.select("a.thumb-popu, .well a.thumb-popu");
    for (const card of cards) {
      const href = card.attr("href") || "";
      if (!href || !href.includes("/video/")) continue;
      const img = card.selectFirst("img.img-responsive, img");
      const title = img?.attr("title") || img?.attr("alt") || "";
      const thumb = img?.attr("src") || img?.attr("data-src") || "";
      const link = href.startsWith("http") ? href : base + href;
      if (title) items.push({ name: title.trim(), imageUrl: thumb, link });
    }
    const hasNext = !!doc.selectFirst(".pagination .next, a[rel='next']");
    return { list: items, hasNextPage: hasNext || items.length >= 16 };
  }

  async getDetail(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const doc = new Document(res.body);
    const title = doc.selectFirst("meta[property='og:title']")?.attr("content")
      || doc.selectFirst("h1, .video-title")?.text || "Unknown";
    const thumb = doc.selectFirst("meta[property='og:image']")?.attr("content") || "";
    const tags = doc.select(".video-tags a, .tags a, [class*='tag'] a").map(el => ({ name: el.text.trim() }));
    return {
      name: title.trim(), imageUrl: thumb, description: "",
      genre: tags, episodes: [{ name: title.trim() || "Watch", url }]
    };
  }

  async getVideoList(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const html = res.body;
    const doc = new Document(html);
    const videos = [];
    // TokyoMotion uses vsrc/sd/HASH pattern
    const srcEl = doc.selectFirst("source");
    const srcUrl = srcEl?.attr("src") || "";
    if (srcUrl) videos.push({ url: srcUrl, quality: "SD", originalUrl: srcUrl, headers: this.getHeaders(url) });
    // embed URL
    const iframeEl = doc.selectFirst("iframe[src*='/embed/']");
    const embedSrc = iframeEl?.attr("src") || "";
    if (embedSrc && !srcUrl) {
      // Convert embed to vsrc
      const hash = embedSrc.split("/embed/")[1] || "";
      if (hash) {
        const vsrc = `${BASE_URL}/vsrc/sd/${hash}`;
        videos.push({ url: vsrc, quality: "SD", originalUrl: vsrc, headers: this.getHeaders(url) });
      }
    }
    // fallback m3u8
    if (videos.length === 0) {
      const m3u8Rx = /["'`](https?:\/\/[^"'`]+\.m3u8[^"'`]{0,150})["'`]/g;
      let m;
      while ((m = m3u8Rx.exec(html)) !== null) {
        videos.push({ url: m[1], quality: "Auto", originalUrl: m[1], headers: this.getHeaders(url) });
      }
    }
    return videos;
  }

  async getCustomList(listId, page) {
    const p = Number(page) > 1 ? Number(page) : 1;
    if (listId === "categories") {
      const url = `${BASE_URL}/categories`;
      const res = await new Client().get(url, { headers: this.getHeaders(url) });
      const doc = new Document(res.body);
      const out = [];
      const seen = {};
      for (const a of doc.select("a")) {
        const href = a.attr("href") || "";
        if (!/^\/videos\/[^/?#]+$/.test(href)) continue;
        if (seen[href]) continue;
        seen[href] = 1;
        const img = a.selectFirst("img");
        const name = (img?.attr("title") || img?.attr("alt") || a.text || "").trim();
        if (!name) continue;
        out.push({ name: name, imageUrl: img?.attr("src") || "", link: BASE_URL + href });
      }
      return { list: out, hasNextPage: false };
    }
    if (listId === "tags") {
      const url = `${BASE_URL}/tags`;
      const res = await new Client().get(url, { headers: this.getHeaders(url) });
      const doc = new Document(res.body);
      const out = [];
      const seen = {};
      for (const a of doc.select("a.thumb-popu, a[href*='search_query=']")) {
        const href = a.attr("href") || "";
        if (!/search_query=/.test(href)) continue;
        const name = (a.text || "").trim();
        if (!name || seen[name]) continue;
        seen[name] = 1;
        out.push({ name: name, imageUrl: "", link: href.startsWith("http") ? href : BASE_URL + href });
        if (out.length >= 300) break;
      }
      return { list: out, hasNextPage: false };
    }
    if (listId && listId.indexOf("profile_") === 0) {
      const hex = listId.slice(8);
      let path = "";
      for (let i = 0; i + 4 <= hex.length; i += 4) path += String.fromCharCode(parseInt(hex.substr(i, 4), 16));
      const url = path.charAt(0) === "h" ? path : BASE_URL + path;
      const res = await new Client().get(url, { headers: this.getHeaders(url) });
      return this._parse(res.body, BASE_URL);
    }
    throw new Error("TokyoMotion: unknown section \"" + listId + "\"");
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
