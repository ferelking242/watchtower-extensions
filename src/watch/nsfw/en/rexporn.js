const watchtowerSources = [{
  "name": "RexPorn",
  "lang": "en",
  "baseUrl": "https://www.rexporn.st",
  "apiUrl": "",
  "iconUrl": "https://www.rexporn.st/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.1",
  "pkgPath": "watch/nsfw/en/rexporn.js",
  "notes": "Adult content (18+) — multi-quality MP4 streaming",
  "isNsfw": true
}];

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://www.rexporn.st/"
    };
  }

  async getPopular(page) {
    const url = page > 1
      ? `https://www.rexporn.st/page-${page}.html`
      : `https://www.rexporn.st/`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parseList(res.body);
  }

  get supportsLatest() { return true; }

  async getLatestUpdates(page) {
    const url = page > 1
      ? `https://www.rexporn.st/latest-updates/page-${page}.html`
      : `https://www.rexporn.st/latest-updates/`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parseList(res.body);
  }

  async search(query, page, filters) {
    const q = encodeURIComponent(query.trim());
    const url = page > 1
      ? `https://www.rexporn.st/videos/search/?query=${q}&page=${page}`
      : `https://www.rexporn.st/videos/search/?query=${q}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parseList(res.body);
  }

  _parseList(html) {
    const doc = new Document(html);
    const items = [];
    // Use simple class selector only, no child combinator
    const cards = doc.select(".pitem");
    for (const card of cards) {
      // Avoid child combinator > — use attribute contains selector instead
      const a = card.selectFirst("a[href*='/watch/']");
      if (!a) continue;
      const href = a.attr("href") || "";
      if (!href) continue;
      // img is directly inside the anchor tag
      const img = a.selectFirst("img") || card.selectFirst("img");
      const thumb = img ? (img.attr("src") || "") : "";
      // title: prefer .ftitle text, fall back to img alt without prefix/suffix
      const ftitle = card.selectFirst(".ftitle");
      let title = ftitle
        ? ftitle.text.trim()
        : (img ? img.attr("alt").replace(/^Watch\s+/i, "").replace(/\s+video$/i, "").trim() : "Unknown");
      const dur  = card.selectFirst(".length") ? card.selectFirst(".length").text.trim() : "";
      const qual = card.selectFirst(".hdqual") ? card.selectFirst(".hdqual").text.trim() : "";
      const desc = [dur, qual].filter(function(x){ return !!x; }).join(" \u00b7 ");
      items.push({
        name: title || "Unknown",
        imageUrl: thumb,
        link: href.startsWith("http") ? href : "https://www.rexporn.st" + href,
        description: desc
      });
    }
    const hasNext = html.indexOf("page-" + 2) !== -1 || html.indexOf('rel="next"') !== -1;
    return { list: items, hasNextPage: hasNext };
  }

  async getDetail(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const doc = new Document(res.body);
    const h1 = doc.selectFirst("h1");
    const ogTitle = doc.selectFirst('meta[property="og:title"]');
    const title = (h1 ? h1.text.trim() : null) || (ogTitle ? ogTitle.attr("content").trim() : "Unknown");
    const ogImg = doc.selectFirst('meta[property="og:image"]');
    const thumbLink = doc.selectFirst('link[itemprop="thumbnailUrl"]');
    const thumb = (thumbLink ? thumbLink.attr("href") : null) || (ogImg ? ogImg.attr("content") : "");
    const tagEls = doc.select(".video-tags a, .tags a, .category a");
    const tags = [];
    for (const el of tagEls) tags.push({ name: el.text.trim() });
    return {
      name: title,
      imageUrl: thumb,
      description: "",
      genre: tags,
      episodes: [{ name: title, url: url }]
    };
  }

  async getVideoList(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const html = res.body;
    const videos = [];

    // Extract the full <div id="player" ...> tag first, then pick attributes
    const playerTagMatch = html.match(/<div[^>]+id="player"[^>]*>/);
    if (!playerTagMatch) return videos;
    const playerTag = playerTagMatch[0];

    const dataQMatch  = playerTag.match(/data-q="([^"]+)"/);
    const dataNMatch  = playerTag.match(/data-n="([^"]+)"/);
    const dataIdMatch = playerTag.match(/data-id="([^"]+)"/);
    if (!dataQMatch || !dataNMatch || !dataIdMatch) return videos;

    const dataQ = dataQMatch[1];
    const dataN = dataNMatch[1];
    const vid   = parseInt(dataIdMatch[1], 10);
    const folder = Math.floor(vid / 1000) * 1000;
    const vPut  = folder + "/" + vid;

    const qualOrder = ["1080p", "720p", "480p", "360p", "240p", "2160p"];
    const qualEntries = dataQ.split(",");

    for (const qStr of qualEntries) {
      // parts: res ; hash ; label ; size ; timestamp ; token
      const parts = qStr.replace(/&nbsp;/g, " ").replace(/\u00a0/g, " ").split(";");
      if (parts.length < 6) continue;
      const res    = parts[0].trim();
      const label  = parts[2].trim();
      const ts     = parts[4].trim();
      const token  = parts[5].trim();

      let prefix = res === "720p" ? "" : ("_" + res);
      if (prefix === "_2160p") prefix = "_4k";

      const videoUrl = "https://" + dataN + ".vstor.top/whp/vid/" + ts + "/" + token + "/" + vPut + "/" + vid + prefix + ".mp4";
      videos.push({
        url: videoUrl,
        quality: label || res,
        originalUrl: videoUrl,
        headers: this.getHeaders(url)
      });
    }

    videos.sort(function(a, b) {
      const ai = qualOrder.findIndex(function(q){ return a.quality.indexOf(q.replace("p","")) !== -1; });
      const bi = qualOrder.findIndex(function(q){ return b.quality.indexOf(q.replace("p","")) !== -1; });
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    return videos;
  }

  async getPageList(url) { return []; }
  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
