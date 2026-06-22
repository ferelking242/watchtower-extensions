const watchtowerSources = [{
  "name": "RexPorn",
  "lang": "en",
  "baseUrl": "https://www.rexporn.st",
  "apiUrl": "",
  "iconUrl": "https://www.rexporn.st/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.0",
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
    const cards = doc.select(".pitem");
    for (const card of cards) {
      const a = card.selectFirst(".pitem_screen > a");
      if (!a) continue;
      const href = a.attr("href") || "";
      if (!href || !href.includes("/watch/")) continue;
      const img = card.selectFirst("img");
      const thumb = img?.attr("src") || "";
      const title = card.selectFirst(".ftitle")?.text?.trim()
        || img?.attr("alt")?.replace(/^Watch\s+/i, "").replace(/\s+video$/i, "").trim()
        || "Unknown";
      const dur = card.selectFirst(".length")?.text?.trim() || "";
      const qual = card.selectFirst(".hdqual")?.text?.trim() || "";
      const desc = [dur, qual].filter(Boolean).join(" · ");
      items.push({
        name: title,
        imageUrl: thumb,
        link: href.startsWith("http") ? href : "https://www.rexporn.st" + href,
        description: desc
      });
    }
    const hasNext = !!doc.selectFirst(".next-page, a[rel='next'], .pager .next")
      || html.includes('class="next"')
      || html.includes('rel="next"');
    return { list: items, hasNextPage: hasNext };
  }

  async getDetail(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const doc = new Document(res.body);
    const title = doc.selectFirst("h1")?.text?.trim()
      || doc.selectFirst('meta[property="og:title"]')?.attr("content")?.trim()
      || "Unknown";
    const thumb = doc.selectFirst('link[itemprop="thumbnailUrl"]')?.attr("href")
      || doc.selectFirst('meta[property="og:image"]')?.attr("content")
      || "";
    const tags = doc.select(".video-tags a, .tags a, .category a").map(el => ({
      name: el.text.trim()
    }));
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

    // Extract player data attributes
    const dataQ = html.match(/id="player"[^>]*data-q="([^"]+)"/)?.[1]
      || html.match(/data-q="([^"]+)"[^>]*id="player"/)?.[1];
    const dataN = html.match(/id="player"[^>]*data-n="([^"]+)"/)?.[1]
      || html.match(/data-n="([^"]+)"/)?.[1];
    const dataId = html.match(/id="player"[^>]*data-id="([^"]+)"/)?.[1]
      || html.match(/data-id="(\d+)"/)?.[1];

    if (dataQ && dataN && dataId) {
      const vid = parseInt(dataId, 10);
      const folder = Math.floor(vid / 1000) * 1000;
      const vPut = `${folder}/${vid}`;
      const qualities = dataQ.split(",");

      // Quality order: prefer highest first
      const qualOrder = ["1080p", "720p", "480p", "240p", "360p", "2160p"];

      for (const qStr of qualities) {
        // Each quality: res;hash;label;size;timestamp;token
        const parts = qStr.replace(/&nbsp;/g, " ").split(";");
        if (parts.length < 6) continue;
        const res    = parts[0].trim();  // e.g. "1080p"
        const label  = parts[2].trim();  // e.g. "FHD 1080p"
        const ts     = parts[4].trim();  // timestamp
        const token  = parts[5].trim();  // signed token

        let prefix = res === "720p" ? "" : `_${res}`;
        if (prefix === "_2160p") prefix = "_4k";

        const videoUrl = `https://${dataN}.vstor.top/whp/vid/${ts}/${token}/${vPut}/${vid}${prefix}.mp4`;
        videos.push({
          url: videoUrl,
          quality: label || res,
          originalUrl: videoUrl,
          headers: this.getHeaders(url)
        });
      }

      // Sort by quality preference
      videos.sort((a, b) => {
        const ai = qualOrder.findIndex(q => a.quality.includes(q.replace("p", "")));
        const bi = qualOrder.findIndex(q => b.quality.includes(q.replace("p", "")));
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
    }

    return videos;
  }

  async getPageList(url) { return []; }
  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
