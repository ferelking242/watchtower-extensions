const watchtowerSources = [{
  "name": "HentaiFox",
  "lang": "en",
  "baseUrl": "https://hentaifox.com",
  "apiUrl": "",
  "iconUrl": "https://hentaifox.com/favicon.ico",
  "typeSource": "single",
  "itemType": 0,
  "isManga": true,
  "version": "1.0.0",
  "pkgPath": "manga/nsfw/en/hentaifox.js",
  "notes": "HentaiFox — hentai manga reading (18+)",
  "isNsfw": true
}];

const BASE = "https://hentaifox.com";

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
    for (const card of doc.select(".cover_box, .galleries-grid .gallery, article, .item")) {
      const a = card.selectFirst("a[href]");
      if (!a) continue;
      let link = a.attr("href") || "";
      if (!link || link === "#") continue;
      if (!link.startsWith("http")) link = BASE + link;
      if (seen.has(link)) continue;
      seen.add(link);
      const img = card.selectFirst("img");
      const thumb = img?.attr("data-src") || img?.attr("src") || "";
      const name = card.selectFirst(".caption, h3, h2, .title")?.text?.trim() ||
                   img?.attr("alt") || a.attr("title") || "Hentai";
      items.push({ name, imageUrl: thumb, link });
    }
    return { list: items, hasNextPage: !!doc.selectFirst("a.nextpostslink, .next-page, [rel=next]") };
  }

  async getPopular(page) {
    const res = await new Client().get(`${BASE}/gallery/?sort=7&page=${page}`, this.getHeaders());
    return this._parse(res.body);
  }

  async getLatestUpdates(page) {
    const res = await new Client().get(`${BASE}/gallery/?page=${page}`, this.getHeaders());
    return this._parse(res.body);
  }

  async search(query, page, filters) {
    const res = await new Client().get(`${BASE}/search/?q=${encodeURIComponent(query)}&page=${page}`, this.getHeaders());
    return this._parse(res.body);
  }

  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const doc = new Document(res.body);
    const name = doc.selectFirst("h1, .g_title")?.text?.trim() || "Hentai";
    const imageUrl = doc.selectFirst(".cover img, .thumb img")?.attr("src") ||
                     doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
    const description = doc.selectFirst(".g_info, .info, .description")?.text?.trim() ||
                        `Pages: ${doc.selectFirst("[class*=pages]")?.text?.trim() || "?"}`;
    const genre = doc.select(".tags a, .tag a, a[href*=/tag/]").map(el => ({ name: el.text.trim() }));
    return {
      name,
      imageUrl,
      description,
      genre,
      chapters: [{ name: "Read", url }]
    };
  }

  async getPageList(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const pages = [];

    // HentaiFox puts images in a JS array
    const loadM = html.match(/g_th\s*=\s*["']([^"']+)["']/i) ||
                  html.match(/var\s+images\s*=\s*\[([^\]]+)\]/i);
    if (loadM) {
      // The gallery viewer page
      const viewRes = await new Client().get(url + "1/", this.getHeaders(url));
      const vHtml = viewRes.body;
      const imgRe = /"url"\s*:\s*"([^"]+)"/gi;
      let m;
      while ((m = imgRe.exec(vHtml)) !== null) {
        const imgUrl = m[1].replace(/\\/g, "");
        if (!imgUrl.includes("cover") && !imgUrl.includes("thumb"))
          pages.push({ url: imgUrl, headers: this.getHeaders(url) });
      }
    }

    // Fallback: reader pages
    if (pages.length === 0) {
      const viewRes = await new Client().get(url + "1/", this.getHeaders(url));
      const vDoc = new Document(viewRes.body);
      // Get total pages from selector
      const totalEl = vDoc.selectFirst(".total_img, #img_index");
      const total = parseInt(totalEl?.text?.trim() || "0") || 0;
      const baseImgUrl = vDoc.selectFirst("#gimg, img.lazy")?.attr("src") || "";
      if (total > 0 && baseImgUrl) {
        const baseDir = baseImgUrl.replace(/\/\d+\.\w+$/, "/");
        const ext = (baseImgUrl.match(/\.(\w+)$/) || [,"jpg"])[1];
        for (let i = 1; i <= total; i++) {
          pages.push({ url: `${baseDir}${i}.${ext}`, headers: this.getHeaders(url) });
        }
      }
    }

    // Last resort: og:image repeated pattern
    if (pages.length === 0) {
      const imgRe = /<img[^>]+(?:data-src|src)="([^"]+(?:jpg|png|webp)[^"]{0,80})"/gi;
      let m;
      const seen = new Set();
      while ((m = imgRe.exec(html)) !== null) {
        const u = m[1];
        if (!seen.has(u) && !u.includes("cover") && u.includes("galleries")) {
          seen.add(u);
          pages.push({ url: u, headers: this.getHeaders(url) });
        }
      }
    }

    return pages;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
