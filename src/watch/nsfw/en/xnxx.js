const watchtowerSources = [{
  "name": "XNXX",
  "lang": "en",
  "baseUrl": "https://www.xnxx.com",
  "apiUrl": "",
  "iconUrl": "https://www.xnxx.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.2.0",
  "pkgPath": "watch/nsfw/en/xnxx.js",
  "notes": "Adult content (18+) — free XNXX catalog only",
  "isNsfw": true
}];

class DefaultExtension extends MProvider {
  static get BASE_URL() { return "https://www.xnxx.com"; }
  get supportsLatest() { return true; }

  static get CATEGORIES() {
    return [
      ["All", ""], ["Amateur", "amateur"], ["Anal", "anal"],
      ["Asian", "asian"], ["BBW", "bbw"], ["Big Ass", "big ass"],
      ["Big Tits", "big tits"], ["Blonde", "blonde"], ["Blowjob", "blowjob"],
      ["Brunette", "brunette"], ["Casting", "casting"],
      ["Creampie", "creampie"], ["Cumshot", "cumshot"], ["Ebony", "ebony"],
      ["Facial", "facial"], ["Gangbang", "gangbang"], ["Hardcore", "hardcore"],
      ["Interracial", "interracial"], ["Latina", "latina"], ["Lesbian", "lesbian"],
      ["MILF", "milf"], ["POV", "pov"], ["Rough Sex", "rough sex"],
      ["Solo", "solo female"], ["Teen", "teen"], ["Threesome", "threesome"],
    ];
  }

  _pref(key, fallback) {
    const prefs = this.source && this.source.prefs;
    const found = Array.isArray(prefs) && prefs.find(p => p.key === key);
    return found && found.value !== undefined && found.value !== null &&
      found.value !== "" ? found.value : fallback;
  }

  get prefQuality() { return this._pref("preferred_quality", "auto"); }

  getHeaders(url) {
    return {
      "Referer": `${DefaultExtension.BASE_URL}/`,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,*/*;q=0.8",
      "Accept-Language": "en,en-US;q=0.8"
    };
  }

  _absolute(href) {
    if (!href) return "";
    return href.startsWith("http") ? href : `${DefaultExtension.BASE_URL}${href}`;
  }

  _text(el) { return (el && el.text ? el.text : "").replace(/\s+/g, " ").trim(); }

  _image(el) {
    if (!el) return "";
    return el.attr("data-src") || el.attr("data-original") ||
      el.attr("src") || el.attr("data-image") || "";
  }

  _hasPremiumMarker(el) {
    const classes = (el.attr("class") || "").toLowerCase();
    return classes.includes("premium") || classes.includes("gold");
  }

  _pageHasNext(doc, page, pathPrefix, items) {
    if (page >= 50) return false;
    const next = `${pathPrefix}/${page + 1}`;
    for (const anchor of doc.select("a")) {
      const href = anchor.attr("href") || "";
      if (href === next || href === `${next}?top`) return true;
    }
    return items.length >= 30;
  }

  _parseVideoList(html, page, mode) {
    const doc = new Document(html);
    const items = [];
    const seen = {};
    const cards = doc.select(".thumb-block.video, .thumb-block.with-uploader");

    for (const card of cards) {
      if (this._hasPremiumMarker(card)) continue;
      const anchor = card.selectFirst("a[href*='/video-']");
      if (!anchor) continue;
      const link = this._absolute(anchor.attr("href"));
      if (!link || seen[link]) continue;
      seen[link] = true;

      const titleAnchor = card.selectFirst(".thumb-under a[title]") ||
        card.selectFirst("a[title]") ||
        card.selectFirst(".thumb-under p a") ||
        card.selectFirst(".thumb-under a");
      const image = this._image(card.selectFirst("img"));
      const metadata = this._text(
        card.selectFirst(".thumb-under .metadata") ||
        card.selectFirst(".duration")
      );
      const duration = metadata.match(/(\d+\s*(?:min|sec|h))/i);

      items.push({
        name: this._text(titleAnchor) || "Untitled",
        imageUrl: image,
        link,
        description: duration ? `Duration: ${duration[1]}` : ""
      });
    }

    const prefix = mode === "hits" ? "/hits" :
      mode === "history" ? "/history" : `/search/${mode || ""}`;
    let hasNext = mode === "hits"
      ? this._pageHasNext(doc, page, "/hits", items)
      : mode === "history"
        ? false
        : this._pageHasNext(doc, page, prefix.replace(/\/$/, ""), items);

    return { list: items, hasNextPage: hasNext };
  }

  _parsePornstars(html, page) {
    const doc = new Document(html);
    const items = [];
    const seen = {};
    for (const card of doc.select(".thumb-block.thumb-cat")) {
      if (this._hasPremiumMarker(card) && !card.selectFirst("a[href*='/pornstar/']")) {
        continue;
      }
      const anchor = card.selectFirst("a[href*='/pornstar/']");
      if (!anchor) continue;
      const link = this._absolute(anchor.attr("href"));
      if (seen[link]) continue;
      seen[link] = true;
      const title = card.selectFirst(".title a") || anchor;
      const count = this._text(card.selectFirst(".uploader"));
      items.push({
        name: this._text(title) || "Pornstar",
        imageUrl: this._image(card.selectFirst("img")),
        link,
        description: count ? `${count} free videos` : "Free videos"
      });
    }
    return {
      list: items,
      hasNextPage: this._pageHasNext(doc, page, "/pornstars", items)
    };
  }

  _parseTags(html) {
    const doc = new Document(html);
    const items = [];
    for (const row of doc.select("#tags li")) {
      const anchor = row.selectFirst("a[href]");
      if (!anchor) continue;
      const href = anchor.attr("href") || "";
      if (!href.startsWith("/search/")) continue;
      const count = this._text(row.selectFirst("strong"));
      const name = this._text(anchor);
      if (!name) continue;
      items.push({
        name,
        imageUrl: "",
        link: this._absolute(href),
        description: count ? `${count} videos` : "Browse videos",
        // The layout renderer may use this to create a staggered card.
        metadata: { masonryKey: name.length + (count ? count.length : 0) }
      });
    }
    return { list: items, hasNextPage: false };
  }

  _monthSlug(page) {
    const now = new Date(Date.now());
    const total = now.getFullYear() * 12 + now.getMonth() - (page - 1);
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
  }

  _filterState(filters, index) {
    return filters && filters[index] ? (filters[index].state || 0) : 0;
  }

  _filterCategory(filters) {
    const entry = DefaultExtension.CATEGORIES[this._filterState(filters, 2)];
    return entry ? entry[1] : "";
  }

  async _get(path) {
    const url = this._absolute(path);
    const res = await new Client().get(url, this.getHeaders(url));
    return { url, body: res.body };
  }

  async getPopular(page) {
    const filters = this._currentFilters || [];
    const mode = this._filterState(filters, 0);
    const category = this._filterCategory(filters);
    if (category) {
      const query = encodeURIComponent(category).replace(/%20/g, "+");
      const { body } = await this._get(`/search/${query}/${page}`);
      return this._parseVideoList(body, page, query);
    }
    if (mode === 1) {
      const { body } = await this._get(`/best/${this._monthSlug(page)}`);
      const result = this._parseVideoList(body, page, "best");
      result.hasNextPage = result.list.length > 0 && page < 24;
      return result;
    }
    const { body } = await this._get(`/hits/${page}`);
    return this._parseVideoList(body, page, "hits");
  }

  async getLatestUpdates(page) {
    // XNXX does not expose a stable public "latest" route. Its /hits feed is
    // the same free, paginated catalog used by the legacy source contract.
    const { body } = await this._get(`/hits/${page}`);
    return this._parseVideoList(body, page, "hits");
  }

  async search(query, page, filters) {
    this._currentFilters = filters || [];
    const category = this._filterCategory(this._currentFilters);
    const rawQuery = (query || "").trim();
    if (!rawQuery) return this.getPopular(page);
    const q = encodeURIComponent(
      category ? `${rawQuery} ${category}` : rawQuery
    ).replace(/%20/g, "+");
    const sortState = this._filterState(filters, 1);
    const sort = sortState === 1
      ? "?top"
      : sortState === 2
        ? "?order=order-az-asc"
        : "";
    const { body } = await this._get(`/search/${q}/${page}${sort}`);
    return this._parseVideoList(body, page, q);
  }

  async getCustomList(listId, page) {
    if (listId === "history") {
      const { body } = await this._get("/history");
      return this._parseVideoList(body, 1, "history");
    }
    if (listId === "pornstars") {
      const { body } = await this._get(`/pornstars/${page}`);
      return this._parsePornstars(body, page);
    }
    if (listId === "tags") {
      const path = page <= 1 ? "/tags" : `/tags/${page}`;
      const { body } = await this._get(path);
      return this._parseTags(body);
    }
    if (listId === "hits") {
      const { body } = await this._get(`/hits/${page}`);
      return this._parseVideoList(body, page, "hits");
    }
    return this.getPopular(page);
  }

  async getDetail(url) {
    const { body } = await this._get(url.replace(DefaultExtension.BASE_URL, ""));
    const doc = new Document(body);
    const title = this._text(
      doc.selectFirst("h1.page-title") ||
      doc.selectFirst("h2.page-title") ||
      doc.selectFirst("h1.content-title")
    ) || this._text(doc.selectFirst('meta[property="og:title"]')?.attr("content"))
      || "XNXX";
    const cover = doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";

    if (url.includes("/pornstar/") || url.includes("/search/")) {
      const videos = this._parseVideoList(body, 1, "detail").list;
      return {
        name: title,
        imageUrl: cover || videos[0]?.imageUrl || "",
        description: url.includes("/pornstar/")
          ? "Free videos from this porn star"
          : "Videos for this tag",
        genre: [],
        episodes: videos.map(video => ({ name: video.name, url: video.link }))
      };
    }

    const tags = [];
    for (const tag of doc.select(".video-tags a, .tags a")) {
      const name = this._text(tag);
      if (name) tags.push({ name });
    }
    return {
      name: title,
      imageUrl: cover,
      description: "",
      genre: tags,
      episodes: [{ name: title, url }]
    };
  }

  async getVideoList(url) {
    const { body } = await this._get(url.replace(DefaultExtension.BASE_URL, ""));
    const headers = { ...this.getHeaders(url), "Referer": url };
    const videos = [];
    const add = (match, quality) => {
      if (match && match[1]) {
        videos.push({
          url: match[1],
          quality,
          originalUrl: match[1],
          headers
        });
      }
    };
    add(body.match(/html5player\.setVideoHLS\('([^']+)'\)/), "Auto (HLS)");
    add(body.match(/html5player\.setVideoUrlHigh\('([^']+)'\)/), "720p");
    add(body.match(/html5player\.setVideoUrlLow\('([^']+)'\)/), "360p");

    const preferred = String(this.prefQuality || "auto").toLowerCase();
    videos.sort((a, b) => {
      const score = quality => preferred === "auto"
        ? (quality.includes("HLS") ? 0 : 1)
        : (quality.toLowerCase().includes(preferred) ? 0 : 1);
      return score(a.quality) - score(b.quality);
    });
    extLog("info", `XNXX.getVideoList: ${videos.length} free sources`);
    return videos;
  }

  async getPageList(url) { return []; }

  getFilterList() {
    return [
      {
        type_name: "SelectFilter",
        name: "Popular mode",
        state: 0,
        values: [
          { type_name: "SelectOption", name: "Most Hits", value: "hits" },
          { type_name: "SelectOption", name: "Best of Month", value: "best" }
        ]
      },
      {
        type_name: "SelectFilter",
        name: "Search sort",
        state: 0,
        values: [
          { type_name: "SelectOption", name: "Recent", value: "recent" },
          { type_name: "SelectOption", name: "Top", value: "top" },
          { type_name: "SelectOption", name: "A-Z", value: "az" }
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

  getSourcePreferences() {
    return [{
      key: "preferred_quality",
      list_preference: {
        title: "Preferred quality",
        summary: "Default free video quality picked first in the player.",
        valueIndex: 0,
        entries: ["Auto (HLS)", "720p", "360p"],
        entryValues: ["auto", "720p", "360p"]
      }
    }];
  }
}