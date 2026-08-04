const watchtowerSources = [{
  "name": "IMHentai",
  "lang": "en",
  "baseUrl": "https://imhentai.xxx",
  "apiUrl": "",
  "iconUrl": "https://imhentai.xxx/favicon.ico",
  "typeSource": "single",
  "itemType": 0,
  "isManga": true,
  "version": "1.0.0",
  "pkgPath": "manga/nsfw/en/imhentai.js",
  "notes": "IMHentai — hentai doujin reading (18+)",
  "isNsfw": true
}];

const BASE = "https://imhentai.xxx";

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
    for (const card of doc.select(".gallery_item, .cover_box, .galleries-grid .gallery, article, .item")) {
      const a = card.selectFirst("a[href]");
      if (!a) continue;
      let link = a.attr("href") || "";
      if (!link || link === "#") continue;
      if (!link.startsWith("http")) link = BASE + link;
      if (seen.has(link)) continue;
      seen.add(link);
      const img = card.selectFirst("img");
      const thumb = img?.attr("data-src") || img?.attr("src") || "";
      const name = card.selectFirst(".caption, h2, h3, .title, .gname")?.text?.trim() ||
                   img?.attr("alt") || a.attr("title") || "Doujin";
      items.push({ name, imageUrl: thumb, link });
    }
    return { list: items, hasNextPage: !!doc.selectFirst("a.nextpostslink,[rel=next],.next-page,.pagination a:last-child") };
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
    const res = await new Client().get(`${BASE}/search/?key=${encodeURIComponent(query)}&page=${page}`, this.getHeaders());
    return this._parse(res.body);
  }

  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const doc = new Document(res.body);
    const name = doc.selectFirst("h1, .cover_box h1, .gallery_title")?.text?.trim() || "Doujin";
    const imageUrl = doc.selectFirst(".cover img, .thumb img, img.cover")?.attr("src") ||
                     doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
    const description = doc.selectFirst(".gallery_info, .g_info, .info")?.text?.trim() || "";
    const genre = doc.select("a[href*=tag], a[href*=genre], .tags a").map(el => ({ name: el.text.trim() }));
    const pageCountEl = doc.selectFirst("li:contains('Pages'), [class*=pages]");
    const pageCount = pageCountEl?.text?.replace(/\D+/g, "") || "?";
    return {
      name,
      imageUrl,
      description: description || `Pages: ${pageCount}`,
      genre,
      chapters: [{ name: "Read", url }]
    };
  }

  async getPageList(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const pages = [];
    
    // IMHentai reader URL pattern: /reader/NUMBER/
    const readerM = html.match(/<a[^>]+href="([^"]+\/reader\/[^"]+)"[^>]*>/i);
    const readerUrl = readerM ? (readerM[1].startsWith("http") ? readerM[1] : BASE + readerM[1]) : url + "1/";
    
    try {
      const rRes = await new Client().get(readerUrl, this.getHeaders(url));
      const rHtml = rRes.body;
      
      // Find image array in JS
      const imgArrM = rHtml.match(/var\s+(?:images|img_path|g_images)\s*=\s*(\[[^\]]+\])/i) ||
                      rHtml.match(/"images"\s*:\s*(\[[^\]]+\])/i);
      if (imgArrM) {
        try {
          const arr = JSON.parse(imgArrM[1].replace(/'/g, '"'));
          for (const item of arr) {
            const u = typeof item === "string" ? item : (item.url || item.src || "");
            if (u) pages.push({ url: u.startsWith("http") ? u : BASE + u, headers: this.getHeaders(url) });
          }
        } catch (_) {}
      }

      // Fallback: extract images from reader page
      if (pages.length === 0) {
        const imgRe = /<img[^>]+(?:data-src|src)="([^"]+(?:jpg|png|webp)[^"]{0,80})"/gi;
        let m;
        const seen = new Set();
        while ((m = imgRe.exec(rHtml)) !== null) {
          const u = m[1];
          if (!seen.has(u) && !u.includes("logo") && !u.includes("avatar") && !u.includes("thumb")) {
            seen.add(u);
            pages.push({ url: u.startsWith("http") ? u : BASE + u, headers: this.getHeaders(url) });
          }
        }
      }
    } catch (_) {}

    return pages;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
