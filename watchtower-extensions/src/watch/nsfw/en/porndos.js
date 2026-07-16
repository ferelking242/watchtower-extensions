const watchtowerSources = [{
  "name": "PornDos",
  "lang": "en",
  "baseUrl": "https://www.porndos.com",
  "apiUrl": "",
  "iconUrl": "https://www.porndos.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.0",
  "pkgPath": "watch/nsfw/en/porndos.js",
  "notes": "Adult content (18+) — multi-quality MP4 (360p/480p/720p)",
  "isNsfw": true
}];
class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://www.porndos.com/"
    };
  }
  async getPopular(page) {
    const url = `https://www.porndos.com/`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parseList(res.body);
  }
  get supportsLatest() { return false; }
  async getLatestUpdates(page) { return this.getPopular(page); }
  async search(query, page, filters) {
    const q = encodeURIComponent(query.trim());
    const url = `https://www.porndos.com/search/?q=${q}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parseList(res.body);
  }
  _parseList(html) {
    const doc = new Document(html);
    const items = [];
    for (const card of doc.select(".thumb .item, .thumb")) {
      const a = card.selectFirst("a[href*='/video/']");
      if (!a) continue;
      const href = a.attr("href") || "";
      if (!href || !href.includes("/video/")) continue;
      const img = card.selectFirst("img[data-src], img");
      let thumb = img?.attr("data-src") || img?.attr("src") || "";
      if (thumb && thumb.startsWith("/")) thumb = "https://www.porndos.com" + thumb;
      const titleEl = card.selectFirst("img[alt], a[title]");
      const title = titleEl?.attr("alt") || titleEl?.attr("title") || a.text?.trim() || "Unknown";
      const qual = card.selectFirst(".overlay, .hdqual")?.text?.trim() || "";
      items.push({
        name: title.trim(),
        imageUrl: thumb,
        link: href.startsWith("http") ? href : "https://www.porndos.com" + href,
        description: qual
      });
    }
    return { list: items, hasNextPage: false };
  }
  async getDetail(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const doc = new Document(res.body);
    const title = doc.selectFirst("h1")?.text?.trim()
      || doc.selectFirst('meta[property="og:title"]')?.attr("content") || "Unknown";
    const thumb = doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
    const tags = doc.select(".tags a, .categories a").map(el => ({ name: el.text.trim() }));
    return { name: title, imageUrl: thumb, description: "", genre: tags,
      episodes: [{ name: title, url }] };
  }
  async getVideoList(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const html = res.body;
    const videos = [];
    const vidMatch = html.match(/video_id:\s*'(\d+)'/);
    if (vidMatch) {
      const id = vidMatch[1];
      const base = "https://www.porndos.com";
      const qualities = [
        { q: "720p", suffix: "-720" },
        { q: "480p", suffix: "-480" },
        { q: "360p", suffix: "-360" }
      ];
      for (const { q, suffix } of qualities) {
        const streamUrl = `${base}/get_stream/${id}${suffix}.mp4`;
        videos.push({ url: streamUrl, quality: q, originalUrl: streamUrl, headers: this.getHeaders(url) });
      }
    }
    return videos;
  }
  async getPageList(url) { return []; }
  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
