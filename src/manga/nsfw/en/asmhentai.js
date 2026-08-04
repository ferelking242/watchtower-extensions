const watchtowerSources = [{
  "name": "AsmHentai",
  "lang": "en",
  "baseUrl": "https://asmhentai.com",
  "apiUrl": "",
  "iconUrl": "https://asmhentai.com/favicon.ico",
  "typeSource": "single",
  "itemType": 0,
  "isManga": true,
  "version": "1.0.0",
  "pkgPath": "manga/nsfw/en/asmhentai.js",
  "notes": "AsmHentai — hentai doujin reading (18+). Équivalent JS de all.asmhentai (Mihon).",
  "isNsfw": true
}];

const BASE = "https://asmhentai.com";

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
    for (const card of doc.select(".c_dot, .gallery-item, .cover_box, article, .item")) {
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
    return { list: items, hasNextPage: !!doc.selectFirst("a[rel=next],.next,.nextpostslink") };
  }

  async getPopular(page) {
    const res = await new Client().get(`${BASE}/?sort=5&page=${page}`, this.getHeaders());
    return this._parse(res.body);
  }

  async getLatestUpdates(page) {
    const res = await new Client().get(`${BASE}/?page=${page}`, this.getHeaders());
    return this._parse(res.body);
  }

  async search(query, page, filters) {
    const res = await new Client().get(`${BASE}/?search=${encodeURIComponent(query)}&page=${page}`, this.getHeaders());
    return this._parse(res.body);
  }

  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const doc = new Document(res.body);
    const name = doc.selectFirst("h1, .gallery-title")?.text?.trim() || "Doujin";
    const imageUrl = doc.selectFirst(".cover img, .thumb img")?.attr("src") ||
                     doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
    const description = doc.selectFirst(".g_info, .info, .description")?.text?.trim() || "";
    const genre = doc.select("a[href*=tag],.tags a").map(el => ({ name: el.text.trim() }));
    return { name, imageUrl, description, genre, chapters: [{ name: "Read", url }] };
  }

  async getPageList(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const pages = [];

    // Find reader URL
    const readerM = html.match(/href="([^"]+\/reader\/[^"]+)"/i) ||
                    html.match(/href="([^"]+\/read\/[^"]+)"/i);
    if (readerM) {
      const readerUrl = readerM[1].startsWith("http") ? readerM[1] : BASE + readerM[1];
      try {
        const rRes = await new Client().get(readerUrl, this.getHeaders(url));
        const rHtml = rRes.body;
        const imgArrM = rHtml.match(/var\s+(?:images|g_images|img)\s*=\s*(\[[^\]]+\])/i);
        if (imgArrM) {
          const arr = JSON.parse(imgArrM[1].replace(/'/g, '"'));
          for (const item of arr) {
            const u = typeof item === "string" ? item : (item.url || item.src || "");
            if (u) pages.push({ url: u.startsWith("http") ? u : BASE + u, headers: this.getHeaders(url) });
          }
        }
        if (pages.length === 0) {
          const imgRe = /<img[^>]+(?:data-src|src)="([^"]+(?:jpg|png|webp)(?:[^"]{0,80})?)"[^>]*>/gi;
          let m;
          const seen = new Set();
          while ((m = imgRe.exec(rHtml)) !== null) {
            const u = m[1];
            if (!seen.has(u) && !u.includes("thumb") && !u.includes("cover") && !u.includes("logo")) {
              seen.add(u);
              pages.push({ url: u.startsWith("http") ? u : BASE + u, headers: this.getHeaders(url) });
            }
          }
        }
      } catch (_) {}
    }

    // Fallback: extract from gallery page
    if (pages.length === 0) {
      const imgRe = /<img[^>]+(?:data-src|src)="([^"]+(?:jpg|png|webp)[^"]{0,80})"[^>]*>/gi;
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
