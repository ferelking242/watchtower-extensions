const watchtowerSources = [{
  "name": "E-Hentai",
  "lang": "en",
  "baseUrl": "https://e-hentai.org",
  "apiUrl": "https://api.e-hentai.org/api.php",
  "iconUrl": "https://e-hentai.org/favicon.ico",
  "typeSource": "single",
  "itemType": 0,
  "isManga": true,
  "version": "1.0.0",
  "pkgPath": "manga/nsfw/en/ehentai.js",
  "notes": "E-Hentai galleries (18+). API JSON officielle. Compte recommandé pour contenu complet.",
  "isNsfw": true,
  "requiresAccount": false,
  "hasCloudflare": false
}];

const BASE = "https://e-hentai.org";
const API  = "https://api.e-hentai.org/api.php";

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": BASE + "/",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
    };
  }

  _parse(html) {
    const doc = new Document(html);
    const items = [];
    const seen = new Set();
    // Table view
    for (const row of doc.select("tr.gtr, .gl3t, .it5, .it2, .itd")) {
      const a = row.selectFirst("a[href*=g/]");
      if (!a) continue;
      let link = a.attr("href") || "";
      if (!link.startsWith("http")) link = BASE + link;
      if (seen.has(link)) continue;
      seen.add(link);
      const img = row.selectFirst("img");
      const thumb = img?.attr("data-src") || img?.attr("src") || img?.attr("data-cfsrc") || "";
      const titleEl = row.selectFirst(".glink, .it5 div, td:nth-child(2) a, .gl1e div");
      const name = titleEl?.text?.trim() || a.text?.trim() || "Doujin";
      items.push({ name, imageUrl: thumb, link });
    }
    // Thumbnail grid view
    if (items.length === 0) {
      for (const div of doc.select(".id1, .id2, .id3, .id4, .id5")) {
        const a = div.selectFirst("a[href*=g/]");
        if (!a) continue;
        let link = a.attr("href") || "";
        if (!link.startsWith("http")) link = BASE + link;
        if (seen.has(link)) continue;
        seen.add(link);
        const img = div.selectFirst("img");
        const thumb = img?.attr("data-src") || img?.attr("src") || "";
        const name = div.selectFirst(".gl1c, .glink")?.text?.trim() || "Doujin";
        items.push({ name, imageUrl: thumb, link });
      }
    }
    const hasNextPage = !!doc.selectFirst("a[onclick*=next], [id=dnext], .ptt td:last-child a");
    return { list: items, hasNextPage };
  }

  async getPopular(page) {
    const p = page - 1;
    const res = await new Client().get(`${BASE}/?f_search=&f_cats=0&page=${p}`, this.getHeaders());
    return this._parse(res.body);
  }

  async getLatestUpdates(page) {
    return this.getPopular(page);
  }

  async search(query, page, filters) {
    const p = page - 1;
    const q = encodeURIComponent(query);
    const res = await new Client().get(`${BASE}/?f_search=${q}&page=${p}`, this.getHeaders());
    return this._parse(res.body);
  }

  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const doc = new Document(res.body);
    const name = doc.selectFirst("#gn")?.text?.trim() ||
                 doc.selectFirst('meta[property="og:title"]')?.attr("content") || "Doujin";
    const thumb = doc.selectFirst("#gd1 div")?.attr("style")?.match(/url\(([^)]+)\)/)?.[1] ||
                  doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
    const pagesEl = doc.selectFirst("td.gdt2:last-of-type, #gmid td.gdt2");
    const pagesText = pagesEl?.text?.trim() || "";
    const description = `Pages: ${pagesText.replace(/\D+$/, "") || "?"}`;

    // Tags
    const tags = [];
    for (const row of doc.select("#taglist tr")) {
      for (const tag of row.select("div.gt a, div.gtl a")) {
        tags.push({ name: tag.text.trim() });
      }
    }

    // Page count
    const totalM = pagesText.match(/(\d+)/);
    const total = totalM ? parseInt(totalM[1]) : 0;

    // Build chapters as pages
    const chapters = [{ name: `Read (${total} pages)`, url, dateUpload: Date.now() }];
    return { name, imageUrl: thumb, description, genre: tags, chapters };
  }

  async getPageList(url) {
    // Get gallery ID and token from URL: https://e-hentai.org/g/GIDNUM/TOKEN/
    const m = url.match(/\/g\/(\d+)\/([a-f0-9]+)\//i);
    if (!m) return [];
    const gid   = parseInt(m[1]);
    const token = m[2];

    // First fetch gallery page to get page count
    const res  = await new Client().get(url, this.getHeaders(url));
    const html = res.body;

    // Find page thumbnails / page links
    const pages = [];
    const pageLinks = [];
    const linkRe = /<a[^>]+href="(https?:\/\/e-hentai\.org\/s\/[^"]+)"[^>]*>/gi;
    let lm;
    while ((lm = linkRe.exec(html)) !== null) pageLinks.push(lm[1]);

    // Use API to batch get image URLs
    if (pageLinks.length > 0) {
      // Build page-token pairs from links like /s/TOKEN/GID-PAGE
      const gids = [];
      const tokens = [];
      for (const pl of pageLinks.slice(0, 40)) {
        const pm = pl.match(/\/s\/([a-f0-9]+)\/\d+-(\d+)/i);
        if (pm) { gids.push(gid); tokens.push(pm[1]); }
      }
      if (gids.length > 0) {
        try {
          const apiBody = JSON.stringify({
            method: "gtoken",
            gidlist: gids.map((g, i) => [g, tokens[i]])
          });
          const apiRes = await new Client().post(API, this.getHeaders(url), apiBody);
          const data = JSON.parse(apiRes.body);
          // Now fetch each page image
          for (const pl of pageLinks.slice(0, 20)) {
            try {
              const pRes = await new Client().get(pl, this.getHeaders(url));
              const imgM = pRes.body.match(/id="img"[^>]+src="([^"]+)"/i) ||
                           pRes.body.match(/<img[^>]+id="img"[^>]+src="([^"]+)"/i);
              if (imgM) pages.push({ url: imgM[1], headers: this.getHeaders(url) });
            } catch (_) {}
          }
        } catch (_) {}
      }
    }

    // Fallback: extract from page links directly
    if (pages.length === 0) {
      for (const pl of pageLinks.slice(0, 10)) {
        try {
          const pRes = await new Client().get(pl, this.getHeaders(url));
          const imgM = pRes.body.match(/id="img"[^>]+src="([^"]+)"/i);
          if (imgM) pages.push({ url: imgM[1], headers: this.getHeaders(url) });
        } catch (_) {}
      }
    }

    return pages;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
