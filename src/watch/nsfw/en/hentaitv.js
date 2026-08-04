const watchtowerSources = [{
  "name": "hentai.tv",
  "lang": "en",
  "baseUrl": "https://hentai.tv",
  "apiUrl": "https://hentai.tv",
  "iconUrl": "https://hentai.tv/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.0",
  "pkgPath": "watch/nsfw/en/hentaitv.js",
  "notes": "Hentai streaming — top-ranked on EverythingMoe (18+)",
  "isNsfw": true
}];

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://hentai.tv/",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9"
    };
  }

  _parse(html) {
    const items = [];
    const seen = new Set();
    const re = /<a[^>]+href="(https?:\/\/hentai\.tv\/[^"]+\/)"[^>]*>[\s\S]{0,600}?<img[^>]+(?:data-src|src)="([^"]+)"[^>]*>[\s\S]{0,200}?<(?:h[123]|div[^>]*title)[^>]*>([^<]{2,120})<\//gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const link = m[1];
      if (seen.has(link)) continue;
      seen.add(link);
      items.push({ name: m[3].trim(), imageUrl: m[2], link });
    }
    if (items.length === 0) {
      const re2 = /<article[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?<img[^>]+(?:data-src|src)="([^"]+)"[\s\S]*?<\/article>/gi;
      while ((m = re2.exec(html)) !== null) {
        const link = m[1].startsWith("http") ? m[1] : "https://hentai.tv" + m[1];
        if (seen.has(link)) continue;
        seen.add(link);
        const titleM = m[0].match(/<h\d[^>]*>([^<]+)<\/h\d>/i) || m[0].match(/title="([^"]+)"/i);
        items.push({ name: titleM ? titleM[1].trim() : "Episode", imageUrl: m[2], link });
      }
    }
    return { list: items, hasNextPage: /class="next|rel="next/i.test(html) };
  }

  async getPopular(page) {
    const res = await new Client().get(`https://hentai.tv/videos/popular/page/${page}/`, this.getHeaders());
    return this._parse(res.body);
  }

  async getLatestUpdates(page) {
    const res = await new Client().get(`https://hentai.tv/videos/latest/page/${page}/`, this.getHeaders());
    return this._parse(res.body);
  }

  async search(query, page, filters) {
    const res = await new Client().get(`https://hentai.tv/?s=${encodeURIComponent(query)}&page=${page}`, this.getHeaders());
    return this._parse(res.body);
  }

  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const title = (html.match(/<h1[^>]*class="[^"]*(?:title|entry-title)[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) ||
                   html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) || [])[1] || "Hentai";
    const thumb = (html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) || [])[1] || "";
    const desc  = (html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i) || [])[1] || "";
    const tags  = [];
    const tagRe = /<a[^>]+rel="tag"[^>]*>([^<]+)<\/a>/gi;
    let t;
    while ((t = tagRe.exec(html)) !== null) tags.push({ name: t[1].trim() });
    return {
      name: title.replace(/<[^>]+>/g, "").trim(),
      imageUrl: thumb,
      description: desc,
      genre: tags,
      episodes: [{ name: title.replace(/<[^>]+>/g, "").trim(), url }]
    };
  }

  async getVideoList(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const videos = [];
    const m3u8Re = /(?:file|src|url)\s*[=:]\s*["']([^"']+\.m3u8[^"']*)['"]/gi;
    const mp4Re  = /(?:file|src|url)\s*[=:]\s*["']([^"']+\.mp4[^"']*)['"]/gi;
    let m;
    while ((m = m3u8Re.exec(html)) !== null) {
      videos.push({ url: m[1], quality: "HLS", originalUrl: m[1], headers: this.getHeaders(url) });
    }
    while ((m = mp4Re.exec(html)) !== null) {
      videos.push({ url: m[1], quality: "MP4", originalUrl: m[1], headers: this.getHeaders(url) });
      if (videos.length >= 5) break;
    }
    // iframe fallback
    if (videos.length === 0) {
      const iframeM = html.match(/<iframe[^>]+src="([^"]+)"/i);
      if (iframeM) {
        const iRes = await new Client().get(iframeM[1], { ...this.getHeaders(url), Referer: url });
        const iHtml = iRes.body;
        while ((m = m3u8Re.exec(iHtml)) !== null)
          videos.push({ url: m[1], quality: "HLS", originalUrl: m[1], headers: this.getHeaders(url) });
      }
    }
    return videos;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
