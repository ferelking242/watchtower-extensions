const watchtowerSources = [{
  "name": "haho.moe",
  "lang": "en",
  "baseUrl": "https://haho.moe",
  "apiUrl": "",
  "iconUrl": "https://haho.moe/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.0",
  "pkgPath": "watch/nsfw/en/hahomoe.js",
  "notes": "haho.moe hentai streaming (18+)",
  "isNsfw": true
}];

const BASE = "https://haho.moe";

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": BASE + "/",
      "Accept-Language": "en-US,en;q=0.9"
    };
  }

  _parse(html) {
    const doc = new Document(html);
    const items = [];
    const seen = new Set();
    for (const card of doc.select("article, .video-item, .item, [class*='episode'], [class*='video']")) {
      const a = card.selectFirst("a[href]");
      if (!a) continue;
      let link = a.attr("href") || "";
      if (!link || link === "#") continue;
      if (!link.startsWith("http")) link = BASE + link;
      if (seen.has(link)) continue;
      seen.add(link);
      const img = card.selectFirst("img");
      const thumb = img?.attr("data-src") || img?.attr("src") || "";
      const name = card.selectFirst("h1,h2,h3,.title,[class*=title]")?.text?.trim() ||
                   a.attr("title") || "Hentai";
      items.push({ name, imageUrl: thumb, link });
    }
    return { list: items, hasNextPage: !!doc.selectFirst("a.next,[rel=next],.next-page") };
  }

  async getPopular(page) {
    const res = await new Client().get(`${BASE}/?page=${page}&sort=view`, this.getHeaders());
    return this._parse(res.body);
  }

  async getLatestUpdates(page) {
    const res = await new Client().get(`${BASE}/?page=${page}`, this.getHeaders());
    return this._parse(res.body);
  }

  async search(query, page, filters) {
    const res = await new Client().get(`${BASE}/?s=${encodeURIComponent(query)}&page=${page}`, this.getHeaders());
    return this._parse(res.body);
  }

  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const doc = new Document(res.body);
    const name = doc.selectFirst("h1")?.text?.trim() ||
                 (res.body.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) || [])[1] || "Hentai";
    const imageUrl = doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
    const description = doc.selectFirst('meta[name="description"]')?.attr("content") || "";
    const genre = doc.select("a[rel=tag],.tags a").map(el => ({ name: el.text.trim() }));
    return { name, imageUrl, description, genre, episodes: [{ name, url }] };
  }

  async getVideoList(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const videos = [];
    const seen = new Set();
    const push = (src, quality) => {
      if (!src || seen.has(src)) return;
      seen.add(src);
      videos.push({ url: src, quality, originalUrl: src, headers: this.getHeaders(url) });
    };
    // Embed page carries <video><source src=... title=1080p/720p/...>
    const grabSources = (h) => {
      const srcRe = /<source[^>]+src="([^"]+)"[^>]*title="([^"]*)"[^>]*>/gi;
      let m;
      while ((m = srcRe.exec(h)) !== null) push(m[1], (m[2] || "MP4").replace("p", "p"));
      const mp4Re = /["'](https?:\/\/[^"']+\.mp4[^"']*)['"]/gi;
      while ((m = mp4Re.exec(h)) !== null) {
        push(m[1], "MP4");
        if (videos.length >= 6) break;
      }
    };
    const iframeM = html.match(/<iframe[^>]+src="([^"]+)"/i);
    if (iframeM) {
      let src = iframeM[1];
      if (!src.startsWith("http")) src = "https://haho.moe" + (src.startsWith("/") ? "" : "/") + src;
      try {
        const iRes = await new Client().get(src, { ...this.getHeaders(src), Referer: url });
        grabSources(iRes.body);
      } catch (_) {}
    }
    if (videos.length === 0) grabSources(html);
    return videos;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
