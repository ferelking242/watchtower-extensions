const watchtowerSources = [{
  "name": "1PornTV",
  "lang": "en",
  "baseUrl": "https://www.1porn.tv",
  "apiUrl": "",
  "iconUrl": "https://www.1porn.tv/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.1.0",
  "pkgPath": "watch/nsfw/en/1porntv.js",
  "notes": "Adult content (18+) — multi-quality MP4",
  "isNsfw": true
}];

class DefaultExtension extends MProvider {
  // ── Categories available for filter ─────────────────────────────────────────
  static get CATEGORIES() {
    return [
      ["All",          ""],
      ["Amateur",      "amateur"],
      ["Anal",         "anal"],
      ["Asian",        "asian"],
      ["BBW",          "bbw"],
      ["Blonde",       "blonde"],
      ["Blowjob",      "blowjob"],
      ["Brunette",     "brunette"],
      ["Casting",      "casting"],
      ["Creampie",     "creampie"],
      ["Cumshot",      "cumshot"],
      ["Ebony",        "ebony"],
      ["Facial",       "facial"],
      ["Gangbang",     "gangbang"],
      ["Hardcore",     "hardcore"],
      ["Interracial",  "interracial"],
      ["Latina",       "latina"],
      ["Lesbian",      "lesbian"],
      ["Mature",       "mature"],
      ["MILF",         "milf"],
      ["POV",          "pov"],
      ["Rough Sex",    "rough-sex"],
      ["Small Tits",   "small-tits"],
      ["Solo",         "solo"],
      ["Teen",         "teen"],
      ["Threesome",    "threesome"],
      ["Toys",         "toys"],
    ];
  }

  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://www.1porn.tv/"
    };
  }

  // ── Filter helpers ────────────────────────────────────────────────────────
  _filterSort(filters)     { return filters && filters[0] ? (filters[0].state || 0) : 0; }
  _filterCategory(filters) {
    const idx = filters && filters[1] ? (filters[1].state || 0) : 0;
    return DefaultExtension.CATEGORIES[idx] ? DefaultExtension.CATEGORIES[idx][1] : "";
  }

  // ── Listings ──────────────────────────────────────────────────────────────
  async getPopular(page) {
    // Popular: homepage paginates via ?from=N (step=120 per page)
    // Latest:  /latest-updates/ is a single page (sort filter state=1)
    const url = this._popularUrl(page, 0);
    const res = await new Client().get(url, this.getHeaders(url));
    return this._parseList(res.body, "https://www.1porn.tv", page, true);
  }

  _popularUrl(page, sortState) {
    if (sortState === 1) return "https://www.1porn.tv/latest-updates/";
    const from = (page - 1) * 120;
    return from > 0 ? `https://www.1porn.tv/?from=${from}` : "https://www.1porn.tv/";
  }

  get supportsLatest() { return true; }

  async getLatestUpdates(page) {
    const url = "https://www.1porn.tv/latest-updates/";
    const res = await new Client().get(url, this.getHeaders(url));
    return this._parseList(res.body, "https://www.1porn.tv", 1, false);
  }

  async search(query, page, filters) {
    const sort = this._filterSort(filters);
    const cat  = this._filterCategory(filters);

    // If no query: browse by category or sort
    if (!query || !query.trim()) {
      if (cat) {
        const from = (page - 1) * 120;
        const url  = from > 0
          ? `https://www.1porn.tv/categories/${cat}/?from=${from}`
          : `https://www.1porn.tv/categories/${cat}/`;
        const res  = await new Client().get(url, this.getHeaders(url));
        return this._parseList(res.body, "https://www.1porn.tv", page, true);
      }
      // No query + no category → fall back to popular/latest
      const url = this._popularUrl(page, sort);
      const res  = await new Client().get(url, this.getHeaders(url));
      return this._parseList(res.body, "https://www.1porn.tv", page, sort === 0);
    }

    // Text search — single non-paginated endpoint
    const q   = encodeURIComponent(query.trim());
    const url  = `https://www.1porn.tv/search/?q=${q}`;
    const res  = await new Client().get(url, this.getHeaders(url));
    return this._parseList(res.body, "https://www.1porn.tv", 1, false);
  }

  // canPaginate: false for single-page endpoints (search, latest-updates)
  _parseList(html, base, page, canPaginate) {
    const doc   = new Document(html);
    const items = [];
    const seen  = {};

    for (const card of doc.select(".item")) {
      const a = card.selectFirst("a[href*='/videos/']");
      if (!a) continue;
      const href = a.attr("href") || "";
      if (!href) continue;
      const link = href.startsWith("http") ? href : base + href;
      if (seen[link]) continue;
      seen[link] = 1;

      const title = (a.attr("title") || "").trim()
        || (card.selectFirst("img") ? card.selectFirst("img").attr("alt") || "" : "Unknown");
      const img   = card.selectFirst("img.thumb") || card.selectFirst("img");
      const thumb = img ? (img.attr("data-src") || img.attr("src") || "") : "";
      const durEl = card.selectFirst(".duration");
      const dur   = durEl ? (durEl.text || "").replace("Full Video", "").trim() : "";

      items.push({ name: (title || "Unknown").trim(), imageUrl: thumb, link, description: dur });
    }
    extLog('info', `1PornTV._parseList: page=${page} items=${items.length} canPaginate=${canPaginate}`);

    // hasNextPage: only for endpoints with ?from= offset (popular, category browse).
    // page size ≈120; threshold 60 guards against a final partial page triggering another request.
    const hasNext = canPaginate && items.length >= 60;
    return { list: items, hasNextPage: hasNext };
  }

  // ── Detail & video ────────────────────────────────────────────────────────
  async getDetail(url) {
    const res  = await new Client().get(url, this.getHeaders(url));
    const doc  = new Document(res.body);
    const h1   = doc.selectFirst("h1");
    const title = (h1 ? h1.text.trim() : null)
      || (doc.selectFirst('meta[property="og:title"]') || { attr: () => "" }).attr("content")
      || "Unknown";
    const ogImg = doc.selectFirst('meta[property="og:image"]');
    const thumb = ogImg ? ogImg.attr("content") : "";
    const tagEls = doc.select(".video-tags a, .tags a, .categories a");
    const tags = [];
    for (const el of tagEls) {
      const n = (el.text || "").trim();
      if (n) tags.push({ name: n });
    }
    return { name: title, imageUrl: thumb, description: "", genre: tags,
      episodes: [{ name: title, url }] };
  }

  async getVideoList(url) {
    const res    = await new Client().get(url, this.getHeaders(url));
    const html   = res.body;
    const videos = [];
    const rx     = /<source\s+src='([^']+\.mp4\/?)'[^>]+label="([^"]+)"/g;
    let m;
    while ((m = rx.exec(html)) !== null) {
      if (!m[1].includes("?download=")) {
        videos.push({ url: m[1], quality: m[2], originalUrl: m[1], headers: this.getHeaders(url) });
      }
    }
    extLog('info', `1PornTV.getVideoList: ${videos.length} sources`);
    return videos;
  }

  async getPageList(url) { return []; }

  getFilterList() {
    return [
      {
        type_name: "SelectFilter",
        name: "Sort",
        state: 0,
        values: [
          { type_name: "SelectOption", name: "Popular",        value: "popular" },
          { type_name: "SelectOption", name: "Latest Updates", value: "latest"  },
        ]
      },
      {
        type_name: "SelectFilter",
        name: "Category",
        state: 0,
        values: DefaultExtension.CATEGORIES.map(([name]) => ({
          type_name: "SelectOption",
          name,
          value: name
        }))
      }
    ];
  }

  getSourcePreferences() { return []; }
}
