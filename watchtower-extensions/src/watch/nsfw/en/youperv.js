const watchtowerSources = [{
  "name": "YouPerv",
  "lang": "en",
  "baseUrl": "https://youperv.com",
  "apiUrl": "",
  "iconUrl": "https://www.google.com/s2/favicons?sz=128&domain=youperv.com",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.1.0",
  "pkgPath": "watch/nsfw/en/youperv.js",
  "notes": "Adult content (18+) — direct MP4 streaming",
  "isNsfw": true
}];
class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://youperv.com/"
    };
  }
  async getPopular(page) {
    const url = page > 1
      ? `https://youperv.com/page/${page}/`
      : `https://youperv.com/`;
    const res = await new Client().get(url, this.getHeaders(url));
    return this._parseList(res.body);
  }
  get supportsLatest() { return true; }
  async getLatestUpdates(page) {
    const url = page > 1
      ? `https://youperv.com/page/${page}/`
      : `https://youperv.com/`;
    const res = await new Client().get(url, this.getHeaders(url));
    return this._parseList(res.body);
  }
  async search(query, page, filters) {
    const q = encodeURIComponent(query.trim());
    const url = `https://youperv.com/?do=search&subaction=search&story=${q}&from_do=search`;
    const res = await new Client().get(url, this.getHeaders(url));
    return this._parseList(res.body);
  }
  _parseList(html) {
    const doc = new Document(html);
    const items = [];
    for (const card of doc.select(".item")) {
      const a = card.selectFirst("a.item-link");
      if (!a) continue;
      const href = a.attr("href") || "";
      if (!href) continue;
      const titleEl = card.selectFirst(".item-title a") || a;
      const title = titleEl.attr("title") || titleEl.text?.trim() || "Unknown";
      const img = card.selectFirst("img.xfieldimage, img.poster, img");
      let thumb = img?.attr("src") || "";
      if (thumb && thumb.startsWith("/")) thumb = "https://youperv.com" + thumb;
      const qual = card.selectFirst(".item-meta")?.text?.trim() || "";
      items.push({
        name: title.trim(),
        imageUrl: thumb,
        link: href.startsWith("http") ? href : "https://youperv.com" + href,
        description: qual
      });
    }
    const hasNext = !!doc.selectFirst("a[href*='/page/']") || html.includes("/page/");
    return { list: items, hasNextPage: hasNext };
  }
  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const doc = new Document(res.body);
    const title = doc.selectFirst("h1")?.text?.trim()
      || doc.selectFirst('meta[property="og:title"]')?.attr("content") || "Unknown";
    const thumb = doc.selectFirst('video[poster]')?.attr("poster")
      || doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
    const tags = doc.select(".tags a, .categories a, .item-link").map(el => ({ name: el.text.trim() }));
    return { name: title, imageUrl: thumb, description: "", genre: tags,
      episodes: [{ name: title, url }] };
  }
  async getVideoList(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const videos = [];
    const srcMatch = html.match(/<source[^>]+type="video\/mp4"[^>]+src="([^"]+)"/i)
      || html.match(/<source[^>]+src="([^"]+\.mp4[^"]*)"/i)
      || html.match(/src=["']([^"']+\.mp4[^"']*)['"]/i);
    if (srcMatch) {
      let videoUrl = srcMatch[1];
      if (videoUrl.startsWith("//")) videoUrl = "https:" + videoUrl;
      videos.push({ url: videoUrl, quality: "HD", originalUrl: videoUrl, headers: this.getHeaders(url) });
    }
    return videos;
  }
  async getPageList(url) { return []; }
  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
