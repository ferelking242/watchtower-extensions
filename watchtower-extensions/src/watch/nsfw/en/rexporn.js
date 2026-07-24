const watchtowerSources = [{
  "name": "RexPorn",
  "lang": "en",
  "baseUrl": "https://www.rexporn.st",
  "apiUrl": "",
  "iconUrl": "https://www.rexporn.st/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.2.1",
  "pkgPath": "watch/nsfw/en/rexporn.js",
  "notes": "Adult content (18+) — multi-quality MP4 streaming",
  "isNsfw": true
}];

class DefaultExtension extends MProvider {

  // ── Category & sort definitions ──────────────────────────────────────────
  static get CATEGORIES() {
    return [
      ["All",          ""],
      ["Anal",         "anal"],
      ["Asian",        "asian"],
      ["BDSM",         "bdsm"],
      ["Big Cock",     "big-cock"],
      ["Big Tits",     "big-tits"],
      ["Bisexual",     "bisexual"],
      ["Black",        "black"],
      ["Blowjob",      "blowjob"],
      ["Casting",      "casting"],
      ["Chubby",       "chubby"],
      ["Cum",          "cum"],
      ["Cumshot",      "cumshot"],
      ["Drunk",        "drunk"],
      ["Fetish",       "fetish"],
      ["Fisting",      "fisting"],
      ["Gay",          "gay"],
      ["Group Sex",    "group-sex"],
      ["Homemade",     "homemade"],
      ["Lesbian",      "lesbian"],
      ["Masturbation", "masturbation"],
      ["Mature",       "mature"],
      ["Outdoor",      "outdoor"],
      ["Party",        "party"],
      ["Pornstar",     "pornstar"],
      ["Russian",      "russian"],
      ["Shemale",      "shemale"],
      ["Teen",         "teen"],
      ["Voyeur",       "voyeur"],
      ["Full HD",      "full-hd"],
    ];
  }

  // sort states: 0=New, 1=TopRated All, 2=TopRated Month, 3=TopRated Year,
  //              4=MostPopular All, 5=MostPopular Month, 6=MostPopular Year
  static get SORT_PATHS() {
    return [
      "",               // 0 - New/Home
      "top-rated",      // 1
      "top-rated/month",// 2
      "top-rated/year", // 3
      "most-popular",   // 4
      "most-popular/month", // 5
      "most-popular/year",  // 6
    ];
  }

  // ── Headers ──────────────────────────────────────────────────────────────
  getPageHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": url || "https://www.rexporn.st/",
      "Origin": "https://www.rexporn.st"
    };
  }

  getVideoHeaders(pageUrl) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": pageUrl || "https://www.rexporn.st/"
    };
  }

  // ── Filter helpers ────────────────────────────────────────────────────────
  _filterSort(filters) {
    return (filters && filters[0]) ? (filters[0].state || 0) : 0;
  }
  _filterCategory(filters) {
    const idx = (filters && filters[1]) ? (filters[1].state || 0) : 0;
    return DefaultExtension.CATEGORIES[idx] ? DefaultExtension.CATEGORIES[idx][1] : "";
  }

  // ── URL builders ──────────────────────────────────────────────────────────

  // Build URL for popular/sorted listing
  _sortedUrl(sortState, page) {
    const path = DefaultExtension.SORT_PATHS[sortState] || "";
    if (!path) {
      // "New" — home page uses ?sort=new (page > 1 adds &page=N)
      if (page > 1) return `https://www.rexporn.st/?sort=new&page=${page}`;
      return "https://www.rexporn.st/?sort=new";
    }
    if (page > 1) return `https://www.rexporn.st/${path}/page-${page}.html`;
    return `https://www.rexporn.st/${path}`;
  }

  // Build URL for category browse
  _categoryUrl(slug, page) {
    if (page > 1) return `https://www.rexporn.st/${slug}-page-${page}.html`;
    return `https://www.rexporn.st/${slug}`;
  }

  // ── Listings ──────────────────────────────────────────────────────────────

  async getPopular(page) {
    const sort = this._filterSort(this._currentFilters || []);
    const cat  = this._filterCategory(this._currentFilters || []);

    let url, style;
    if (cat) {
      url   = this._categoryUrl(cat, page);
      style = "category";
    } else {
      url   = this._sortedUrl(sort, page);
      style = sort === 0 ? "new" : "sorted";
    }

    extLog('info', `RexPorn.getPopular: sort=${sort} cat=${cat} page=${page} url=${url}`);
    const res = await new Client().get(url, this.getPageHeaders(url));
    return this._parseList(res.body, url, page, style);
  }

  get supportsLatest() { return true; }

  async getLatestUpdates(page) {
    const url = page > 1
      ? `https://www.rexporn.st/page-${page}.html`
      : "https://www.rexporn.st/";
    const res = await new Client().get(url, this.getPageHeaders(url));
    return this._parseList(res.body, url, page, "popular");
  }

  async search(query, page, filters) {
    this._currentFilters = filters;
    const cat = this._filterCategory(filters);
    const q   = (query || "").trim();

    // No query → browse popular with current sort/category filter
    if (!q) {
      return this.getPopular(page);
    }

    // Text search (category filter narrows via search URL or category URL)
    let url;
    if (cat) {
      // Search within category: use category browse + keyword match isn't available;
      // fall back to global search and return results (category filter acts as browse)
    }
    url = page > 1
      ? `https://www.rexporn.st/videos/search/?query=${encodeURIComponent(q)}&page=${page}`
      : `https://www.rexporn.st/videos/search/?query=${encodeURIComponent(q)}`;

    extLog('info', `RexPorn.search: q="${q}" cat=${cat} page=${page} url=${url}`);
    const res = await new Client().get(url, this.getPageHeaders(url));
    return this._parseList(res.body, url, page, "search");
  }

  // ── Parse list ────────────────────────────────────────────────────────────
  // style: "popular" (/page-N.html), "new" (?page=N), "sorted" (/path/page-N.html),
  //        "category" (/slug-page-N.html), "search" (?query=...&page=N)
  _parseList(html, srcUrl, page, style) {
    const doc   = new Document(html);
    const cards = doc.select(".pitem");
    extLog('info', `RexPorn._parseList[${style}]: page=${page} cards=${cards.length}`);

    const items = [];
    const seen  = {};

    for (const card of cards) {
      const a = card.selectFirst("a");
      if (!a) continue;
      const href = a.attr("href") || "";
      if (!href.includes("/watch/")) continue;
      const link = href.startsWith("http") ? href : "https://www.rexporn.st" + href;
      if (seen[link]) continue;
      seen[link] = 1;

      const img   = a.selectFirst("img") || card.selectFirst("img");
      const thumb = img ? (img.attr("src") || img.attr("data-src") || "") : "";
      const ftitle = card.selectFirst(".ftitle");
      let title = ftitle
        ? ftitle.text.trim()
        : (img ? (img.attr("alt") || "").replace(/^Watch\s+/i, "").replace(/\s+video$/i, "").trim() : "Unknown");
      const dur  = card.selectFirst(".length") ? card.selectFirst(".length").text.trim() : "";
      const qual = card.selectFirst(".hdqual") ? card.selectFirst(".hdqual").text.trim() : "";
      const desc = [dur, qual].filter(x => !!x).join(" · ");

      items.push({ name: title || "Unknown", imageUrl: thumb, link, description: desc });
    }

    // ── hasNextPage strategy ──────────────────────────────────────────────
    // Scoped detection: look for the next-page link inside pagination containers
    // rather than broad html.includes() to avoid false positives.
    const doc2 = new Document(html);
    const cap = 50;
    let hasNext = false;

    if (page >= cap) {
      hasNext = false;
    } else if (style === "popular") {
      // Home /page-N.html — check nav anchor hrefs only
      const nextSlug = `/page-${page + 1}.html`;
      const navLinks = doc2.select(".pagination a, .pager a, .pages a, nav.pages a");
      for (const a of navLinks) {
        if ((a.attr("href") || "").includes(nextSlug)) { hasNext = true; break; }
      }
      if (!hasNext) hasNext = items.length >= 20; // fallback
    } else if (style === "category") {
      // /slug-page-N.html — scoped check
      const nextSlug = `-page-${page + 1}.html`;
      const navLinks = doc2.select(".pagination a, .pager a, .pages a, nav.pages a");
      for (const a of navLinks) {
        if ((a.attr("href") || "").includes(nextSlug)) { hasNext = true; break; }
      }
      if (!hasNext) hasNext = items.length >= 20;
    } else if (style === "sorted") {
      // /path/page-N.html — scoped check
      const nextSlug = `/page-${page + 1}.html`;
      const navLinks = doc2.select(".pagination a, .pager a, .pages a, nav.pages a");
      for (const a of navLinks) {
        if ((a.attr("href") || "").includes(nextSlug)) { hasNext = true; break; }
      }
      if (!hasNext) hasNext = items.length >= 20;
    } else if (style === "new") {
      // ?page=N in nav links OR item count heuristic
      const navLinks = doc2.select(".pagination a, .pager a, .pages a, nav.pages a");
      for (const a of navLinks) {
        if ((a.attr("href") || "").includes(`page=${page + 1}`)) { hasNext = true; break; }
      }
      if (!hasNext) hasNext = items.length >= 20;
    } else {
      // search: nav link or item count (search results don't always have explicit nav)
      const navLinks = doc2.select(".pagination a, .pager a, .pages a, nav.pages a");
      for (const a of navLinks) {
        if ((a.attr("href") || "").includes(`page=${page + 1}`)) { hasNext = true; break; }
      }
      if (!hasNext) hasNext = items.length >= 20;
    }

    return { list: items, hasNextPage: hasNext };
  }

  // ── Detail page ───────────────────────────────────────────────────────────
  async getDetail(url) {
    const res   = await new Client().get(url, this.getPageHeaders(url));
    const doc   = new Document(res.body);
    const h1    = doc.selectFirst("h1");
    const ogTitle = doc.selectFirst('meta[property="og:title"]');
    const title = (h1 ? h1.text.trim() : null) || (ogTitle ? ogTitle.attr("content").trim() : "Unknown");
    const ogImg = doc.selectFirst('meta[property="og:image"]');
    const thumbLink = doc.selectFirst('link[itemprop="thumbnailUrl"]');
    const thumb = (thumbLink ? thumbLink.attr("href") : null) || (ogImg ? ogImg.attr("content") : "");
    const tagEls = doc.select(".video-tags a, .tags a, .category a");
    const tags = [];
    for (const el of tagEls) tags.push({ name: el.text.trim() });
    return { name: title, imageUrl: thumb, description: "", genre: tags,
      episodes: [{ name: title, url }] };
  }

  // ── Video sources ─────────────────────────────────────────────────────────
  async getVideoList(url) {
    const res  = await new Client().get(url, this.getPageHeaders(url));
    const html = res.body;
    const videos = [];

    const playerTag = (html.match(/<div[^>]+id="player"[^>]*>/) || [])[0] || "";
    const dataQMatch  = playerTag.match(/data-q="([^"]+)"/);
    const dataNMatch  = playerTag.match(/data-n="([^"]+)"/);
    const dataIdMatch = playerTag.match(/data-id="([^"]+)"/);

    if (!dataQMatch || !dataNMatch || !dataIdMatch) {
      extLog('warn', "RexPorn.getVideoList: missing data-q/n/id in player tag");
      return videos;
    }

    const dataQ = dataQMatch[1];
    const dataN = dataNMatch[1];
    const vid   = parseInt(dataIdMatch[1], 10);
    const folder = Math.floor(vid / 1000) * 1000;
    const vPut  = folder + "/" + vid;

    const qualOrder  = ["1080p", "720p", "480p", "360p", "240p", "2160p"];
    const qualEntries = dataQ.split(",");

    for (const qStr of qualEntries) {
      const parts = qStr.replace(/&nbsp;/g, " ").replace(/\u00a0/g, " ").split(";");
      if (parts.length < 6) continue;
      const res   = parts[0].trim();
      const label = parts[2].trim();
      const ts    = parts[4].trim();
      const token = parts[5].trim();

      let prefix = res === "720p" ? "" : ("_" + res);
      if (prefix === "_2160p") prefix = "_4k";

      const videoUrl = `https://${dataN}.vstor.top/whpvid/${ts}/${token}/${vPut}/${vid}${prefix}.mp4`;
      videos.push({
        url: videoUrl, quality: label || res, originalUrl: videoUrl,
        headers: this.getVideoHeaders(url)
      });
    }

    videos.sort((a, b) => {
      const ai = qualOrder.findIndex(q => a.quality.includes(q.replace("p", "")));
      const bi = qualOrder.findIndex(q => b.quality.includes(q.replace("p", "")));
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    extLog('info', `RexPorn.getVideoList: ${videos.length} videos`);
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
          { type_name: "SelectOption", name: "New",                   value: "new"               },
          { type_name: "SelectOption", name: "Top Rated · All Time",  value: "top-rated"         },
          { type_name: "SelectOption", name: "Top Rated · Month",     value: "top-rated/month"   },
          { type_name: "SelectOption", name: "Top Rated · Year",      value: "top-rated/year"    },
          { type_name: "SelectOption", name: "Most Popular · All",    value: "most-popular"      },
          { type_name: "SelectOption", name: "Most Popular · Month",  value: "most-popular/month"},
          { type_name: "SelectOption", name: "Most Popular · Year",   value: "most-popular/year" },
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
