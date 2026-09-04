const watchtowerSources = [{
  "name": "kemono",
  "lang": "en",
  "baseUrl": "https://kemono.party",
  "apiUrl": "",
  "iconUrl": "https://kemono.party/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.0",
  "pkgPath": "watch/nsfw/en/kemono.js",
  "notes": "Adult content (18+) — Kemono Patreon/Discord content",
  "isNsfw": true
}];

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return { "Referer": "https://kemono.party/", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36", "Accept-Language": "en-US,en;q=0.9" };
  }
  async getPopular(page) {
    const res = await new Client().get("https://kemono.party/popular?page=" + page, this.getHeaders());
    return this._parse(res.body, page);
  }
  get supportsLatest() { return true; }
  async getLatestUpdates(page) {
    const res = await new Client().get("https://kemono.party/latest?page=" + page, this.getHeaders());
    return this._parse(res.body, page);
  }
  async search(query, page, filters) {
    const q = encodeURIComponent(query.trim());
    const res = await new Client().get("https://kemono.party/search/" + q + "?page=" + page, this.getHeaders());
    return this._parse(res.body, page);
  }
  _parse(html, page) {
    const doc = new Document(html);
    const items = [];
    const cards = doc.select(".gallery-item, .pic-item, .thumb, .item, .gallery, .photo, .image-item");
    for (const card of cards) {
      const a = card.selectFirst("a[href*='/gallery'], a[href*='/pic'], a[href*='/photo']");
      if (!a) continue;
      const href = a.attr("href") || "";
      const title = a.attr("title") || card.selectFirst(".title, .caption")?.text || "Gallery";
      const img = card.selectFirst("img");
      const thumb = img?.attr("data-src") || img?.attr("src") || "";
      const link = href.startsWith("http") ? href : "https://kemono.party" + href;
      items.push({ name: title.trim(), imageUrl: thumb, link });
    }
    if (items.length === 0) {
      const links = doc.select("a[href*='/gallery'], a[href*='/pic']");
      for (const a of links) {
        const href = a.attr("href") || "";
        const title = a.attr("title") || a.text?.trim() || "Gallery";
        const img = a.selectFirst("img");
        const thumb = img?.attr("data-src") || img?.attr("src") || "";
        const link = href.startsWith("http") ? href : "https://kemono.party" + href;
        if (link && !items.some(i => i.link === link)) items.push({ name: title, imageUrl: thumb, link });
      }
    }
    return { list: items, hasNextPage: items.length >= 15 };
  }
  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders());
    const doc = new Document(res.body);
    const title = doc.selectFirst('meta[property="og:title"]')?.attr("content") || "Gallery";
    const thumb = doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
    return { name: title, imageUrl: thumb, description: "", genre: [], episodes: [{ name: title, url }] };
  }
  async getVideoList(url) {
    const res = await new Client().get(url, this.getHeaders());
    const html = res.body;
    const videos = [];
    const imgRe = /(?:src|data-src|data-original)\s*=\s*["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)/gi;
    let m;
    while ((m = imgRe.exec(html)) !== null) {
      const imgUrl = m[1];
      if (imgUrl && !imgUrl.includes("thumbnail") && !imgUrl.includes("thumb") && !imgUrl.includes("logo") && !imgUrl.includes("icon") && imgUrl.length > 30) {
        videos.push({ url: imgUrl, quality: "HD", originalUrl: imgUrl });
      }
      if (videos.length >= 50) break;
    }
    return videos;
  }
  async getPageList(url) { return []; }
  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
