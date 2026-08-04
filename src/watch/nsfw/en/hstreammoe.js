const watchtowerSources = [{
  "name": "HStream.moe",
  "lang": "en",
  "baseUrl": "https://hstream.moe",
  "apiUrl": "https://hstream.moe",
  "iconUrl": "https://hstream.moe/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.0",
  "pkgPath": "watch/nsfw/en/hstreammoe.js",
  "notes": "#3 hentai streaming — EverythingMoe (18+)",
  "isNsfw": true
}];

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://hstream.moe/",
      "Accept-Language": "en-US,en;q=0.9"
    };
  }

  _parseList(html) {
    const doc = new Document(html);
    const items = [];
    const cards = doc.select("article, .video-card, .item, .episode-item, [class*='video'], [class*='episode']");
    for (const card of cards) {
      const a = card.selectFirst("a[href]");
      if (!a) continue;
      let link = a.attr("href") || "";
      if (!link || link === "#") continue;
      if (!link.startsWith("http")) link = "https://hstream.moe" + link;
      const img = card.selectFirst("img");
      const thumb = img?.attr("data-src") || img?.attr("src") || "";
      const titleEl = card.selectFirst("h1, h2, h3, .title, [class*='title']");
      const name = titleEl?.text?.trim() || a.attr("title") || a.text?.trim() || "Episode";
      if (name.length < 2) continue;
      items.push({ name, imageUrl: thumb, link });
    }
    // fallback regex
    if (items.length === 0) {
      const re = /<a[^>]+href="(https?:\/\/hstream\.moe\/[^"]+)"[^>]*>[\s\S]{0,400}?<img[^>]+(?:data-src|src)="([^"]+)"/gi;
      let m;
      while ((m = re.exec(html)) !== null) {
        items.push({ name: "Hentai Episode", imageUrl: m[2], link: m[1] });
      }
    }
    return { list: items, hasNextPage: !!doc.selectFirst("a.next, [rel='next'], .pagination .next") };
  }

  async getPopular(page) {
    const res = await new Client().get(`https://hstream.moe/page/${page}/?orderby=views`, this.getHeaders());
    return this._parseList(res.body);
  }

  async getLatestUpdates(page) {
    const res = await new Client().get(`https://hstream.moe/page/${page}/`, this.getHeaders());
    return this._parseList(res.body);
  }

  async search(query, page, filters) {
    const res = await new Client().get(`https://hstream.moe/?s=${encodeURIComponent(query)}&page=${page}`, this.getHeaders());
    return this._parseList(res.body);
  }

  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const doc = new Document(html);
    const title = doc.selectFirst("h1")?.text?.trim() ||
      (html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) || [])[1] || "Hentai";
    const thumb = doc.selectFirst('meta[property="og:image"]')?.attr("content") ||
      doc.selectFirst("img.poster, img.cover, .entry-thumb img")?.attr("src") || "";
    const desc  = doc.selectFirst('meta[name="description"]')?.attr("content") || "";
    const tags  = doc.select("a[rel='tag'], .tags a").map(el => ({ name: el.text.trim() }));
    return {
      name: title,
      imageUrl: thumb,
      description: desc,
      genre: tags,
      episodes: [{ name: title, url }]
    };
  }

  async getVideoList(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const videos = [];
    const seen = new Set();
    const m3u8Re = /["'](https?:\/\/[^"']+\.m3u8[^"']*)['"]/gi;
    const mp4Re  = /["'](https?:\/\/[^"']+\.mp4[^"']*)['"]/gi;
    let m;
    while ((m = m3u8Re.exec(html)) !== null) {
      if (!seen.has(m[1])) { seen.add(m[1]); videos.push({ url: m[1], quality: "HLS", originalUrl: m[1], headers: this.getHeaders(url) }); }
    }
    while ((m = mp4Re.exec(html)) !== null) {
      if (!seen.has(m[1])) { seen.add(m[1]); videos.push({ url: m[1], quality: "MP4", originalUrl: m[1], headers: this.getHeaders(url) }); }
      if (videos.length >= 5) break;
    }
    // Try iframes
    if (videos.length === 0) {
      const iframeRe = /<iframe[^>]+src="([^"]+)"/gi;
      while ((m = iframeRe.exec(html)) !== null) {
        const iSrc = m[1].startsWith("http") ? m[1] : "https://hstream.moe" + m[1];
        try {
          const iRes = await new Client().get(iSrc, { ...this.getHeaders(url), Referer: url });
          const iHtml = iRes.body;
          const im3u8 = iHtml.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)['"]/);
          if (im3u8) videos.push({ url: im3u8[1], quality: "HLS", originalUrl: im3u8[1], headers: this.getHeaders(url) });
        } catch (_) {}
        if (videos.length > 0) break;
      }
    }
    return videos;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
