const watchtowerSources = [{
  "name": "IMHentai",
  "lang": "en",
  "baseUrl": "https://imhentai.xxx",
  "apiUrl": "",
  "iconUrl": "https://imhentai.xxx/favicon.ico",
  "typeSource": "single",
  "itemType": 0,
  "isManga": true,
  "version": "1.0.4",
  "login": false,
  "forYou": false,
  "pkgPath": "nsfw/manga/en/imhentai.js",
  "notes": "IMHentai — hentai doujin reading (18+)",
  "isNsfw": true
}];

const BASE = "https://imhentai.xxx";
const PAGE_SIZE = 20;

class DefaultExtension extends MProvider {
  get supportsLatest() { return true; }

  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": BASE + "/",
      "Accept-Language": "en-US,en;q=0.9"
    };
  }

  _abs(url) {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    if (url.startsWith("//")) return "https:" + url;
    return BASE + url;
  }

  // IMHentai fronts most pages with a managed Cloudflare challenge. A 403 with
  // the interstitial must be reported, not parsed: an empty result would make
  // the app show "no content" and hide the fact that the source is reachable.
  async _get(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const body = res.body || "";
    // `challenge-platform`/`turnstile` are injected on every normal page, so
    // only the interstitial title and the challenge token count as a block.
    if (res.statusCode >= 400 || /just a moment|attention required|cf-chl-|verify you are human/i.test(body)) {
      throw new Error(
        `Cloudflare challenge detected (cf-chl-) for ${url} — ` +
        `the source needs browser verification (HTTP ${res.statusCode})`
      );
    }
    return body;
  }

  _parse(html, page) {
    const doc = new Document(html);
    const items = [];
    const seen = new Set();
    for (const card of doc.select("div.thumb")) {
      const a = card.selectFirst("a[href*='/gallery/']");
      if (!a) continue;
      const link = this._abs(a.attr("href") || "");
      if (!link || seen.has(link)) continue;
      seen.add(link);
      // `.inner_thumb img` is the cover; the first <img> in the card is the
      // language flag, so a bare `img` selector returns the wrong picture.
      const img = card.selectFirst(".inner_thumb img") || card.selectFirst("img.lazy");
      const thumb = this._abs(img?.attr("data-src") || img?.attr("src") || "");
      const name = card.selectFirst(".caption a")?.text?.trim() ||
                   img?.attr("alt") ||
                   a.attr("title") || "Doujin";
      items.push({ name, imageUrl: thumb, link });
    }
    // The pagination block links to page numbers; a link to the following page
    // is the only reliable "more results" signal (last pages may still be full).
    const hasNextPage = html.includes(`page=${page + 1}`) || items.length >= PAGE_SIZE;
    return { list: items, hasNextPage };
  }

  // The home listing (/ and /popular/) is behind a managed Cloudflare challenge
  // that rejects datacenter/proxy IPs. /search/ is not challenged and exposes
  // the same galleries through its sort filters (pp = popular, lt = latest).
  async getPopular(page) {
    return this._parse(await this._get(`${BASE}/search/?key=&pp=1&page=${page}`), page);
  }

  async getLatestUpdates(page) {
    return this._parse(await this._get(`${BASE}/search/?key=&lt=1&page=${page}`), page);
  }

  async search(query, page, filters) {
    return this._parse(
      await this._get(`${BASE}/search/?key=${encodeURIComponent(query)}&page=${page}`),
      page
    );
  }

  async getDetail(url) {
    const doc = new Document(await this._get(url));
    const name = doc.selectFirst("h1")?.text?.trim() ||
                 doc.selectFirst('meta[property="og:title"]')?.attr("content") || "Doujin";
    const imageUrl = this._abs(
      doc.selectFirst(".left_cover img")?.attr("data-src") ||
      doc.selectFirst(".left_cover img")?.attr("src") ||
      doc.selectFirst('meta[property="og:image"]')?.attr("content") || ""
    );
    const pages = doc.selectFirst("li.pages")?.text?.replace(/[^0-9]/g, "") || "";
    const genre = doc.select("ul.galleries_info a.tag")
      .map(el => ({ name: el.text.replace(/\s*\d+\s*$/, "").trim() }))
      .filter(g => g.name);
    const description = [
      pages ? `Pages: ${pages}` : "",
      genre.length ? genre.map(g => g.name).join(", ") : ""
    ].filter(Boolean).join("\n");
    return {
      name,
      imageUrl,
      description,
      genre,
      chapters: [{ name: "Read", url }]
    };
  }

  async getPageList(url) {
    const idM = (await this._get(url)).match(/\/gallery\/(\d+)\//);
    if (!idM) return [];
    const id = idM[1];

    // The first reader page exposes the CDN directory, the file extension and
    // the total page count; every following page reuses the same base name.
    const rHtml = await this._get(`${BASE}/view/${id}/1/`);
    const gimg = rHtml.match(/id="gimg"[^>]*src="([^"]+)"/);
    const totalM = rHtml.match(/class="total_pages">\s*(\d+)/);
    if (!gimg) return [];
    const first = this._abs(gimg[1]);
    const dot = first.lastIndexOf(".");
    const base = dot > 0 ? first.slice(0, dot).replace(/\/[^/]*$/, "/") : "";
    const ext = dot > 0 ? first.slice(dot) : ".jpg";
    const total = totalM ? parseInt(totalM[1], 10) : 1;

    const pages = [];
    for (let i = 1; i <= total; i++) {
      pages.push({ url: `${base}${i}${ext}`, headers: this.getHeaders(url) });
    }
    return pages;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
