const watchtowerSources = [{
  "name": "Hentai2Read",
  "lang": "en",
  "baseUrl": "https://hentai2read.com",
  "apiUrl": "",
  "iconUrl": "https://hentai2read.com/favicon.ico",
  "typeSource": "single",
  "itemType": 0,
  "isManga": true,
  "version": "1.0.0",
  "pkgPath": "manga/nsfw/en/hentai2read.js",
  "notes": "Hentai2Read — hentai manga reading (18+)",
  "isNsfw": true
}];

const BASE = "https://hentai2read.com";

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
    for (const card of doc.select(".thumb, .gallery-item, .item, article")) {
      const a = card.selectFirst("a[href]");
      if (!a) continue;
      let link = a.attr("href") || "";
      if (!link || link === "#") continue;
      if (!link.startsWith("http")) link = BASE + link;
      if (seen.has(link)) continue;
      seen.add(link);
      const img = card.selectFirst("img");
      const thumb = img?.attr("data-src") || img?.attr("src") || "";
      const name = card.selectFirst(".caption, h2, h3, .title")?.text?.trim() ||
                   img?.attr("alt") || "Doujin";
      items.push({ name, imageUrl: thumb, link });
    }
    return { list: items, hasNextPage: !!doc.selectFirst("a[rel=next],.nextpostslink,.next") };
  }

  async getPopular(page) {
    const res = await new Client().get(`${BASE}/top/week/${page}/`, this.getHeaders());
    return this._parse(res.body);
  }

  async getLatestUpdates(page) {
    const res = await new Client().get(`${BASE}/${page}/`, this.getHeaders());
    return this._parse(res.body);
  }

  async search(query, page, filters) {
    const res = await new Client().get(`${BASE}/?q=${encodeURIComponent(query)}&page=${page}`, this.getHeaders());
    return this._parse(res.body);
  }

  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const doc = new Document(res.body);
    const name = doc.selectFirst("h1, .detail-info h1")?.text?.trim() || "Doujin";
    const imageUrl = doc.selectFirst(".detail-info img, .cover img")?.attr("src") ||
                     doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
    const description = doc.selectFirst(".detail-info .info")?.text?.trim() || "";
    const genre = doc.select("a[href*=tag],.tags a,.genre a").map(el => ({ name: el.text.trim() }));
    // Get chapters (different versions/languages)
    const chapters = [];
    for (const ch of doc.select(".chapters a, .chapter-list a, a[href*=read]")) {
      const href = ch.attr("href") || "";
      if (!href || href === "#") continue;
      const chUrl = href.startsWith("http") ? href : BASE + href;
      chapters.push({ name: ch.text?.trim() || "Read", url: chUrl });
    }
    if (chapters.length === 0) chapters.push({ name: "Read", url });
    return { name, imageUrl, description, genre, chapters };
  }

  async getPageList(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const pages = [];

    // Extract image array from JS
    const imgArrM = html.match(/var\s+(?:images|img_arr|g)\s*=\s*(\[[^\]]+\])/i) ||
                    html.match(/"images"\s*:\s*(\[[^\]]+\])/i) ||
                    html.match(/hashed_name\s*=\s*'([^']+)'/i);
    if (imgArrM && imgArrM[1].startsWith("[")) {
      try {
        const arr = JSON.parse(imgArrM[1].replace(/'/g, '"'));
        const baseDir = html.match(/cdn_url\s*=\s*'([^']+)'/i)?.[1] ||
                        html.match(/img_server\s*=\s*'([^']+)'/i)?.[1] || "";
        for (const item of arr) {
          const u = typeof item === "string" ? item : (item.src || item.url || "");
          if (u) {
            const fullUrl = u.startsWith("http") ? u : baseDir + u;
            pages.push({ url: fullUrl, headers: this.getHeaders(url) });
          }
        }
      } catch (_) {}
    }

    // Fallback: image regex
    if (pages.length === 0) {
      const imgRe = /<img[^>]+(?:data-src|src)="([^"]+(?:jpg|jpeg|png|webp)[^"]{0,100})"/gi;
      let m;
      const seen = new Set();
      while ((m = imgRe.exec(html)) !== null) {
        const u = m[1];
        if (!seen.has(u) && !u.includes("thumb") && !u.includes("logo") && !u.includes("cover")) {
          seen.add(u);
          pages.push({ url: u.startsWith("http") ? u : BASE + u, headers: this.getHeaders(url) });
        }
      }
    }

    return pages;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
