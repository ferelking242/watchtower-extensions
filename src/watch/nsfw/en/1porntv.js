const watchtowerSources = [{
  "name": "1PornTV",
  "lang": "en",
  "baseUrl": "https://www.1porn.tv",
  "apiUrl": "",
  "iconUrl": "https://www.1porn.tv/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.2",
  "pkgPath": "watch/nsfw/en/1porntv.js",
  "notes": "Adult content (18+) — multi-quality MP4",
  "isNsfw": true
}];
class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://www.1porn.tv/"
    };
  }

  async getPopular(page) {
    // 1PornTV popular uses ?from=N offset pagination (0-based, 60 items per step)
    const from = (page - 1) * 60;
    const url = from > 0
      ? `https://www.1porn.tv/?from=${from}`
      : `https://www.1porn.tv/`;
    const res = await new Client().get(url, this.getHeaders(url));
    return this._parseList(res.body, "https://www.1porn.tv", page);
  }

  get supportsLatest() { return true; }

  async getLatestUpdates(page) {
    // 1PornTV /new/ — limited list, no offset pagination
    const url = `https://www.1porn.tv/new/`;
    const res = await new Client().get(url, this.getHeaders(url));
    return this._parseList(res.body, "https://www.1porn.tv", 1);
  }

  async search(query, page, filters) {
    // Search uses ?q= parameter; results are a single non-paginated set (~25 items)
    const q = encodeURIComponent(query.trim());
    const url = `https://www.1porn.tv/search/?q=${q}`;
    const res = await new Client().get(url, this.getHeaders(url));
    return this._parseList(res.body, "https://www.1porn.tv", 1);
  }

  _parseList(html, base, page) {
    const doc = new Document(html);
    const items = [];
    const seen = {};
    for (const card of doc.select(".item")) {
      const a = card.selectFirst("a[href*='/videos/']");
      if (!a) continue;
      const href = a.attr("href") || "";
      if (!href) continue;
      const link = href.startsWith("http") ? href : base + href;
      if (seen[link]) continue;
      seen[link] = 1;
      const title = a.attr("title") || card.selectFirst("img") && card.selectFirst("img").attr("alt") || "Unknown";
      const img = card.selectFirst("img.thumb") || card.selectFirst("img");
      const thumb = img ? (img.attr("data-src") || img.attr("src") || "") : "";
      const durEl = card.selectFirst(".duration");
      const dur = durEl ? (durEl.text || "").replace("Full Video", "").trim() : "";
      items.push({
        name: (title || "Unknown").trim(),
        imageUrl: thumb,
        link: link,
        description: dur
      });
    }
    extLog('info', `1PornTV._parseList: page=${page} items=${items.length}`);

    // hasNextPage: true only if we received a full page of results AND it's not the
    // /new/ or search page (those return a fixed, non-paginated set).
    // For popular (?from=) we attempt the next offset if we got >= 30 items.
    const hasNext = page > 1 ? false : items.length >= 30;
    return { list: items, hasNextPage: hasNext };
  }

  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const doc = new Document(res.body);
    const h1 = doc.selectFirst("h1");
    const title = (h1 ? h1.text.trim() : null)
      || doc.selectFirst('meta[property="og:title"]') && doc.selectFirst('meta[property="og:title"]').attr("content")
      || "Unknown";
    const ogImg = doc.selectFirst('meta[property="og:image"]');
    const thumb = ogImg ? ogImg.attr("content") : "";
    const tagEls = doc.select(".video-tags a, .tags a");
    const tags = [];
    for (const el of tagEls) {
      const name = (el.text || "").trim();
      if (name) tags.push({ name });
    }
    return { name: title, imageUrl: thumb, description: "", genre: tags,
      episodes: [{ name: title, url }] };
  }

  async getVideoList(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const videos = [];
    const rx = /<source\s+src='([^']+\.mp4\/?)'\s+type='video\/mp4'\s+label="([^"]+)"/g;
    let m;
    while ((m = rx.exec(html)) !== null) {
      if (!m[1].includes("?download=")) {
        videos.push({ url: m[1], quality: m[2], originalUrl: m[1], headers: this.getHeaders(url) });
      }
    }
    extLog('info', `1PornTV.getVideoList: ${videos.length} videos found`);
    return videos;
  }

  async getPageList(url) { return []; }
  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
