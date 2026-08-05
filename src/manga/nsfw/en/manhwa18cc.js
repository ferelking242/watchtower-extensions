const watchtowerSources = [{
  "name": "Manhwa18.cc",
  "lang": "en",
  "baseUrl": "https://manhwa18.cc",
  "apiUrl": "",
  "iconUrl": "https://manhwa18.cc/favicon.ico",
  "typeSource": "single",
  "itemType": 0,
  "isManga": true,
  "version": "1.0.0",
  "pkgPath": "manga/nsfw/en/manhwa18cc.js",
  "notes": "Manhwa18.cc — manhwa/manga adulte (18+). Équivalent JS de all.manhwa18cc Mihon.",
  "isNsfw": true
}];

const BASE = "https://manhwa18.cc";

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
    for (const card of doc.select("article, .book-item, .manga-item, .item, .card")) {
      const a = card.selectFirst("a[href]");
      if (!a) continue;
      let link = a.attr("href") || "";
      if (!link || link === "#") continue;
      if (!link.startsWith("http")) link = BASE + link;
      if (seen.has(link)) continue;
      seen.add(link);
      const img = card.selectFirst("img");
      const thumb = img?.attr("data-src") || img?.attr("src") || img?.attr("data-original") || "";
      const name = card.selectFirst("h3, h2, .book-title, .manga-name, .title")?.text?.trim() ||
                   img?.attr("alt") || a.attr("title") || "Manhwa";
      items.push({ name, imageUrl: thumb, link });
    }
    return { list: items, hasNextPage: !!doc.selectFirst("a[rel=next],.next,.pagination-next,.nextpostslink") };
  }

  async getPopular(page) {
    const res = await new Client().get(`${BASE}/manga-list?type=topview&status=all&page=${page}`, this.getHeaders());
    return this._parse(res.body);
  }

  async getLatestUpdates(page) {
    const res = await new Client().get(`${BASE}/manga-list?status=all&page=${page}`, this.getHeaders());
    return this._parse(res.body);
  }

  async search(query, page, filters) {
    const res = await new Client().get(`${BASE}/search-story/${encodeURIComponent(query)}?page=${page}`, this.getHeaders());
    return this._parse(res.body);
  }

  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const doc = new Document(res.body);
    const name = doc.selectFirst("h1, .book-name, .manga-name")?.text?.trim() || "Manhwa";
    const imageUrl = doc.selectFirst(".book-cover img, .manga-cover img, .info-cover img")?.attr("src") ||
                     doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
    const description = doc.selectFirst(".description, .summary, .manga-desc")?.text?.trim() || "";
    const genre = doc.select("a[href*=genre], a[href*=tag], .genre a, .tags a").map(el => ({ name: el.text.trim() }));
    const chapters = [];
    for (const ch of doc.select(".chapter-list a, .chapters a, [class*=chapter] a").slice(0, 200)) {
      const href = ch.attr("href") || "";
      if (!href || href === "#") continue;
      const chUrl = href.startsWith("http") ? href : BASE + href;
      chapters.push({ name: ch.text?.trim() || "Chapter", url: chUrl });
    }
    if (chapters.length === 0) chapters.push({ name: "Read", url });
    return { name, imageUrl, description, genre, chapters };
  }

  async getPageList(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const pages = [];

    // Try JSON image array
    const arrM = html.match(/(?:chapter_images|images|listImgs)\s*=\s*(\[[^\]]+\])/i);
    if (arrM) {
      try {
        const arr = JSON.parse(arrM[1].replace(/'/g, '"'));
        for (const item of arr) {
          const u = typeof item === "string" ? item : (item.url || item.src || item.img || "");
          if (u) pages.push({ url: u.startsWith("http") ? u : BASE + u, headers: this.getHeaders(url) });
        }
      } catch (_) {}
    }

    // Fallback: img tags
    if (pages.length === 0) {
      const doc = new Document(html);
      for (const img of doc.select(".reading-content img, .chapter-content img, #chapter-images img, img[data-src]")) {
        const src = img.attr("data-src") || img.attr("src") || img.attr("data-original") || "";
        if (src && !src.includes("logo") && !src.includes("avatar")) {
          pages.push({ url: src.startsWith("http") ? src : BASE + src, headers: this.getHeaders(url) });
        }
      }
    }

    return pages;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
