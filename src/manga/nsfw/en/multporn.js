const watchtowerSources = [{
  "name": "Multporn",
  "lang": "en",
  "baseUrl": "https://multporn.net",
  "apiUrl": "",
  "iconUrl": "https://multporn.net/favicon.ico",
  "typeSource": "single",
  "itemType": 0,
  "isManga": true,
  "version": "1.0.0",
  "pkgPath": "manga/nsfw/en/multporn.js",
  "notes": "Multporn — western/hentai comics & doujin (18+). Équivalent JS de all.multporn Mihon.",
  "isNsfw": true
}];

const BASE = "https://multporn.net";

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
    for (const card of doc.select(".views-row,.item,.gallery-item,article,.node-teaser")) {
      const a = card.selectFirst("a[href]");
      if (!a) continue;
      let link = a.attr("href") || "";
      if (!link || link === "#") continue;
      if (!link.startsWith("http")) link = BASE + link;
      if (seen.has(link)) continue;
      seen.add(link);
      const img = card.selectFirst("img");
      const thumb = img?.attr("data-src") || img?.attr("src") || "";
      const name = card.selectFirst("h3,h2,.views-field-title,.title")?.text?.trim() ||
                   img?.attr("alt") || "Comic";
      items.push({ name, imageUrl: thumb, link });
    }
    return { list: items, hasNextPage: !!doc.selectFirst("a[rel=next],.pager-next,li.next a,.pager__item--next a") };
  }

  async getPopular(page) {
    const res = await new Client().get(`${BASE}/comics?sort_by=totalcount&page=${page - 1}`, this.getHeaders());
    return this._parse(res.body);
  }

  async getLatestUpdates(page) {
    const res = await new Client().get(`${BASE}/comics?page=${page - 1}`, this.getHeaders());
    return this._parse(res.body);
  }

  async search(query, page, filters) {
    const res = await new Client().get(`${BASE}/search/node/${encodeURIComponent(query)}?page=${page - 1}`, this.getHeaders());
    return this._parse(res.body);
  }

  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const doc = new Document(res.body);
    const name = doc.selectFirst("h1, .node-title, .page-header")?.text?.trim() || "Comic";
    const imageUrl = doc.selectFirst(".field-type-image img, .comic-cover img")?.attr("src") ||
                     doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
    const description = doc.selectFirst(".field-name-body,.field-name-field-description,.node-description")?.text?.trim() || "";
    const genre = doc.select(".field-name-field-categories a, .field-name-field-tags a, a[href*=comics]")
      .map(el => ({ name: el.text.trim() }));
    return { name, imageUrl, description, genre, chapters: [{ name: "Read", url }] };
  }

  async getPageList(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const pages = [];
    const doc = new Document(html);

    // Multporn uses a Drupal-based gallery: images in .jb-image or field-slideshow
    const seen = new Set();
    for (const img of doc.select(".jb-image img, .field-slideshow-image img, .comic-page img, .views-slideshow-cycle-main-frame img, img[typeof=foaf:Image]")) {
      const src = img.attr("data-src") || img.attr("src") || img.attr("data-original") || "";
      if (!src || seen.has(src) || src.includes("logo") || src.includes("avatar")) continue;
      seen.add(src);
      pages.push({ url: src.startsWith("http") ? src : BASE + src, headers: this.getHeaders(url) });
    }

    // Fallback: parse drupalSettings or JSON blob for image list
    if (pages.length === 0) {
      const settingsM = html.match(/drupalSettings\s*=\s*(\{.{200,}?\})\s*;/s) ||
                        html.match(/jQuery\.extend\(Drupal\.settings,\s*(\{.+?\})\s*\)/s);
      if (settingsM) {
        try {
          // Extract image URLs from the settings blob
          const imgRe = /"uri"\s*:\s*"([^"]+(?:jpg|jpeg|png|webp)[^"]*)"/gi;
          let m;
          const localSeen = new Set();
          while ((m = imgRe.exec(settingsM[1])) !== null) {
            let u = m[1].replace(/\\/g, "");
            if (u.startsWith("public://")) u = `${BASE}/sites/default/files/${u.slice(9)}`;
            if (!u.startsWith("http")) u = BASE + u;
            if (!localSeen.has(u) && !u.includes("thumb") && !u.includes("styles")) {
              localSeen.add(u);
              pages.push({ url: u, headers: this.getHeaders(url) });
            }
          }
        } catch (_) {}
      }
    }

    // Final fallback: all img tags
    if (pages.length === 0) {
      const imgRe = /<img[^>]+(?:data-src|src)="([^"]+(?:jpg|jpeg|png|webp)[^"]{0,200})"/gi;
      let m;
      while ((m = imgRe.exec(html)) !== null) {
        const u = m[1];
        if (!seen.has(u) && !u.includes("thumb") && !u.includes("logo") && u.includes("files/")) {
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
