const watchtowerSources = [{
  "name": "Pururin",
  "lang": "en",
  "baseUrl": "https://pururin.to",
  "apiUrl": "",
  "iconUrl": "https://pururin.to/favicon.ico",
  "typeSource": "single",
  "itemType": 0,
  "isManga": true,
  "version": "1.0.0",
  "pkgPath": "manga/nsfw/en/pururin.js",
  "notes": "Pururin — hentai doujin reader (18+). Équivalent JS de all.pururin Mihon.",
  "isNsfw": true
}];

const BASE = "https://pururin.to";

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
    for (const card of doc.select(".gallery-item, .item, article, .card")) {
      const a = card.selectFirst("a[href]");
      if (!a) continue;
      let link = a.attr("href") || "";
      if (!link || link === "#") continue;
      if (!link.startsWith("http")) link = BASE + link;
      if (seen.has(link)) continue;
      seen.add(link);
      const img = card.selectFirst("img");
      const thumb = img?.attr("data-src") || img?.attr("src") || "";
      const name = card.selectFirst(".caption, h2, h3, .title, .gallery-title")?.text?.trim() ||
                   img?.attr("alt") || "Doujin";
      items.push({ name, imageUrl: thumb, link });
    }
    return { list: items, hasNextPage: !!doc.selectFirst("a[rel=next],.next,.pagination-next") };
  }

  async getPopular(page) {
    const res = await new Client().get(`${BASE}/browse/collection/all?page=${page}&sort=ratings`, this.getHeaders());
    return this._parse(res.body);
  }

  async getLatestUpdates(page) {
    const res = await new Client().get(`${BASE}/browse/collection/all?page=${page}&sort=newest`, this.getHeaders());
    return this._parse(res.body);
  }

  async search(query, page, filters) {
    const res = await new Client().get(`${BASE}/search?q=${encodeURIComponent(query)}&page=${page}`, this.getHeaders());
    return this._parse(res.body);
  }

  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const doc = new Document(res.body);
    const name = doc.selectFirst("h1, .gallery-title")?.text?.trim() || "Doujin";
    const imageUrl = doc.selectFirst(".gallery-cover img, .cover img")?.attr("src") ||
                     doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
    const infoEl = doc.selectFirst(".gallery-info, .info");
    const pagesM = (infoEl?.text || "").match(/(\d+)\s*(?:pages?|p\.)/i);
    const description = `Pages: ${pagesM ? pagesM[1] : "?"}`;
    const genre = doc.select("a[href*=tag], .tags a, a[href*=genre]").map(el => ({ name: el.text.trim() }));
    return { name, imageUrl, description, genre, chapters: [{ name: "Read", url }] };
  }

  async getPageList(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const pages = [];

    // Pururin reader: pages are in a JS object or loaded via API
    const galleryIdM = url.match(/\/gallery\/(\d+)/) || url.match(/\/(\d+)\//);
    const galleryId = galleryIdM ? galleryIdM[1] : null;

    if (galleryId) {
      try {
        const apiRes = await new Client().get(`${BASE}/api/gallery/${galleryId}/reader`, this.getHeaders(url));
        const data = JSON.parse(apiRes.body);
        const imgs = data.images || data.pages || data.files || [];
        for (const img of imgs) {
          const src = typeof img === "string" ? img : (img.url || img.src || img.path || "");
          if (src) pages.push({ url: src.startsWith("http") ? src : BASE + src, headers: this.getHeaders(url) });
        }
      } catch (_) {}
    }

    // Fallback: find images from gallery page or reader
    if (pages.length === 0) {
      const readerM = html.match(/href="([^"]+\/read\/[^"]+)"/i) || html.match(/href="([^"]+\/reader\/[^"]+)"/i);
      if (readerM) {
        const rUrl = readerM[1].startsWith("http") ? readerM[1] : BASE + readerM[1];
        try {
          const rRes = await new Client().get(rUrl, this.getHeaders(url));
          const rHtml = rRes.body;
          const imgRe = /<img[^>]+(?:data-src|src)="([^"]+(?:jpg|jpeg|png|webp)[^"]{0,100})"/gi;
          let m;
          const seen = new Set();
          while ((m = imgRe.exec(rHtml)) !== null) {
            const u = m[1];
            if (!seen.has(u) && !u.includes("thumb") && !u.includes("logo")) {
              seen.add(u);
              pages.push({ url: u.startsWith("http") ? u : BASE + u, headers: this.getHeaders(url) });
            }
          }
        } catch (_) {}
      }
    }

    return pages;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
