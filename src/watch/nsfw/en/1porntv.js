const watchtowerSources = [{
  "name": "1PornTV",
  "lang": "en",
  "baseUrl": "https://www.1porn.tv",
  "apiUrl": "",
  "iconUrl": "https://www.1porn.tv/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.1.1",
  "pkgPath": "watch/nsfw/en/1porntv.js",
  "notes": "Adult content (18+) — multi-quality MP4",
  "isNsfw": true
}];

class DefaultExtension extends MProvider {

  // ── Sort & category definitions ───────────────────────────────────────────
  // sorts: 0=Popular, 1=Top Rated, 2=Most Popular, 3=Latest Updates
  static get SORT_BASES() {
    return ["", "top-rated", "most-popular", "latest-updates"];
  }

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
  _filterSort(filters)     { return (filters && filters[0]) ? (filters[0].state || 0) : 0; }
  _filterCategory(filters) {
    const idx = (filters && filters[1]) ? (filters[1].state || 0) : 0;
    return DefaultExtension.CATEGORIES[idx] ? DefaultExtension.CATEGORIES[idx][1] : "";
  }

  // ── URL builder ───────────────────────────────────────────────────────────
  // sort: 0=Popular(home), 1=Top Rated, 2=Most Popular, 3=Latest (single page)
  _buildUrl(sort, page, cat) {
    const base = "https://www.1porn.tv";
    const from = (page - 1) * 120;
    const fromSuffix = from > 0 ? `?from=${from}` : "";

    if (cat) {
      // Category browse — supports ?from= pagination
      return from > 0
        ? `${base}/categories/${cat}/${fromSuffix}`
        : `${base}/categories/${cat}/`;
    }

    const sortBase = DefaultExtension.SORT_BASES[sort] || "";
    if (sort === 3 || sortBase === "latest-updates") {
      // Latest Updates — single page, no pagination
      return `${base}/latest-updates/`;
    }
    if (!sortBase) {
      // Popular (home page)
      return from > 0 ? `${base}/${fromSuffix}` : `${base}/`;
    }
    // Top Rated / Most Popular — support ?from= pagination
    return from > 0
      ? `${base}/${sortBase}/${fromSuffix}`
      : `${base}/${sortBase}/`;
  }

  // ── Listings ──────────────────────────────────────────────────────────────
  async getPopular(page) {
    const filters = this._currentFilters || [];
    const sort = this._filterSort(filters);
    const cat  = this._filterCategory(filters);
    const isLatest = sort === 3;
    const url  = this._buildUrl(sort, isLatest ? 1 : page, cat);
    extLog('info', `1PornTV.getPopular: sort=${sort} cat=${cat} page=${page} url=${url}`);
    const res  = await new Client().get(url, this.getHeaders(url));
    return this._parseList(res.body, "https://www.1porn.tv", isLatest ? 1 : page, !isLatest);
  }

  get supportsLatest() { return true; }

  async getLatestUpdates(page) {
    const url = "https://www.1porn.tv/latest-updates/";
    const res = await new Client().get(url, this.getHeaders(url));
    return this._parseList(res.body, "https://www.1porn.tv", 1, false);
  }

  async search(query, page, filters) {
    this._currentFilters = filters;
    const sort = this._filterSort(filters);
    const cat  = this._filterCategory(filters);
    const q    = (query || "").trim();

    // No query → browse with sort/category
    if (!q) {
      const isLatest = sort === 3;
      const url = this._buildUrl(sort, isLatest ? 1 : page, cat);
      const res = await new Client().get(url, this.getHeaders(url));
      return this._parseList(res.body, "https://www.1porn.tv", isLatest ? 1 : page, !isLatest);
    }

    // Text search (site search is non-paginated, returns single page)
    const url = `https://www.1porn.tv/search/?q=${encodeURIComponent(q)}`;
    extLog('info', `1PornTV.search: q="${q}" url=${url}`);
    const res = await new Client().get(url, this.getHeaders(url));
    return this._parseList(res.body, "https://www.1porn.tv", 1, false);
  }

  // ── List parser ───────────────────────────────────────────────────────────
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
        || (card.selectFirst("img") ? (card.selectFirst("img").attr("alt") || "") : "Unknown");
      const img   = card.selectFirst("img.thumb") || card.selectFirst("img");
      const thumb = img ? (img.attr("data-src") || img.attr("src") || "") : "";
      const durEl = card.selectFirst(".duration");
      const dur   = durEl ? (durEl.text || "").replace("Full Video", "").trim() : "";

      items.push({ name: (title || "Unknown").trim(), imageUrl: thumb, link, description: dur });
    }
    extLog('info', `1PornTV._parseList: page=${page} items=${items.length} canPaginate=${canPaginate}`);

    // hasNextPage: only for paginated endpoints with ?from= offset.
    // Step=120; threshold 60 to avoid false positive on final partial page.
    const hasNext = canPaginate && items.length >= 60;
    return { list: items, hasNextPage: hasNext };
  }

  // ── Detail & video ────────────────────────────────────────────────────────
  async getDetail(url) {
    const res   = await new Client().get(url, this.getHeaders(url));
    const doc   = new Document(res.body);
    const h1    = doc.selectFirst("h1");
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
    const res  = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const videos = [];
    const rx = /<source\s+src='([^']+\.mp4\/?)'[^>]+label="([^"]+)"/g;
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

  // ── Filters ───────────────────────────────────────────────────────────────
  getFilterList() {
    return [
      {
        type_name: "SelectFilter",
        name: "Sort",
        state: 0,
        values: [
          { type_name: "SelectOption", name: "Popular",        value: "popular"     },
          { type_name: "SelectOption", name: "Top Rated",      value: "top-rated"   },
          { type_name: "SelectOption", name: "Most Popular",   value: "most-popular"},
          { type_name: "SelectOption", name: "Latest Updates", value: "latest"      },
        ]
      },
      {
        type_name: "SelectFilter",
        name: "Category",
        state: 0,
        values: DefaultExtension.CATEGORIES.map(([name]) => ({
          type_name: "SelectOption", name, value: name
        }))
      }
    ];
  }

  getSourcePreferences() { return []; }
}
