const watchtowerSources = [{
  "name": "ReadHentai",
  "lang": "en",
  "baseUrl": "https://readhentai.net",
  "apiUrl": "",
  "iconUrl": "https://readhentai.net/favicon.ico",
  "typeSource": "single",
  "itemType": 0,
  "isManga": true,
  "version": "1.0.0",
  "pkgPath": "manga/nsfw/en/readhentai.js",
  "notes": "ReadHentai — hentai manga/doujin reader (18+)",
  "isNsfw": true
}];

const BASE = "https://readhentai.net";

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
    for (const card of doc.select(".gallery-item,.item,.thumb,article,.manga-item,.card")) {
      const a = card.selectFirst("a[href]");
      if (!a) continue;
      let link = a.attr("href") || "";
      if (!link || link === "#") continue;
      if (!link.startsWith("http")) link = BASE + link;
      if (seen.has(link)) continue;
      seen.add(link);
      const img = card.selectFirst("img");
      const thumb = img?.attr("data-src") || img?.attr("src") || "";
      const name = card.selectFirst(".caption,h2,h3,.title,.manga-title")?.text?.trim() ||
                   img?.attr("alt") || "Doujin";
      items.push({ name, imageUrl: thumb, link });
    }
    return { list: items, hasNextPage: !!doc.selectFirst("a[rel=next],.next,.nextpostslink,.pagination-next") };
  }

  async getPopular(page) {
    const res = await new Client().get(`${BASE}/?sort=popular&page=${page}`, this.getHeaders());
    return this._parse(res.body);
  }

  async getLatestUpdates(page) {
    const res = await new Client().get(`${BASE}/?page=${page}`, this.getHeaders());
    return this._parse(res.body);
  }

  async search(query, page, filters) {
    const res = await new Client().get(`${BASE}/?q=${encodeURIComponent(query)}&page=${page}`, this.getHeaders());
    return this._parse(res.body);
  }

  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const doc = new Document(res.body);
    const name = doc.selectFirst("h1,.manga-title,.gallery-title")?.text?.trim() || "Doujin";
    const imageUrl = doc.selectFirst(".cover img,.manga-cover img,.gallery-cover img")?.attr("src") ||
                     doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
    const description = doc.selectFirst(".description,.info,.manga-summary")?.text?.trim() || "";
    const genre = doc.select("a[href*=tag],a[href*=genre],.tags a,.genre a").map(el => ({ name: el.text.trim() }));
    const chapters = [];
    for (const ch of doc.select(".chapter-list a,.chapters a,a[href*=chapter],a[href*=read]")) {
      const href = ch.attr("href") || "";
      if (!href || href === "#") continue;
      chapters.push({ name: ch.text?.trim() || "Read", url: href.startsWith("http") ? href : BASE + href });
    }
    if (chapters.length === 0) chapters.push({ name: "Read", url });
    return { name, imageUrl, description, genre, chapters };
  }

  async getPageList(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const pages = [];

    // Try JSON array extraction
    const arrM = html.match(/(?:var\s+)?(?:images|pages|imgs|chapter_images)\s*=\s*(\[[^\]]+\])/i) ||
                 html.match(/"images"\s*:\s*(\[[^\]]+\])/i);
    if (arrM) {
      try {
        const arr = JSON.parse(arrM[1].replace(/'/g, '"'));
        for (const item of arr) {
          const u = typeof item === "string" ? item : (item.url || item.src || item.img || "");
          if (u) pages.push({ url: u.startsWith("http") ? u : BASE + u, headers: this.getHeaders(url) });
        }
      } catch (_) {}
    }

    // Fallback: img scraping
    if (pages.length === 0) {
      const doc2 = new Document(html);
      const seen = new Set();
      for (const img of doc2.select(".reading-content img,.chapter-content img,#chapter-images img,img[data-src],.pages img")) {
        const src = img.attr("data-src") || img.attr("src") || img.attr("data-original") || "";
        if (src && !seen.has(src) && !src.includes("logo") && !src.includes("avatar")) {
          seen.add(src);
          pages.push({ url: src.startsWith("http") ? src : BASE + src, headers: this.getHeaders(url) });
        }
      }
    }

    return pages;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
