const watchtowerSources = [{
  "name": "XNXX",
  "lang": "en",
  "baseUrl": "https://www.xnxx.com",
  "apiUrl": "",
  "iconUrl": "https://www.xnxx.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.2.6",
  "login": false,
  "forYou": false,
  "pkgPath": "nsfw/watch/en/xnxx.js",
  "notes": "Adult content (18+) — free XNXX catalog only",
  "isNsfw": true,
  "touchToPreview": true
}];

class DefaultExtension extends MProvider {
  static get BASE_URL() { return "https://www.xnxx.com"; }
  get supportsLatest() { return true; }

  _storedHistory() {
    try {
      if (!Array.isArray(DefaultExtension._historyCache)) {
        const preferences = new SharedPreferences();
        const raw = typeof preferences.getString === "function"
          ? preferences.getString("xnxx_watch_history", "")
          : preferences.get("xnxx_watch_history");
        const parsed = typeof raw === "string" ? JSON.parse(raw || "[]") : raw;
        DefaultExtension._historyCache = Array.isArray(parsed)
          ? parsed.filter(item => item && item.link && item.name)
          : [];
      }
      return DefaultExtension._historyCache;
    } catch (_) {
      return Array.isArray(DefaultExtension._historyCache)
        ? DefaultExtension._historyCache
        : [];
    }
  }

  async _saveHistoryItem(item) {
    try {
      const entries = this._storedHistory().filter(entry => entry.link !== item.link);
      entries.unshift(item);
      const history = entries.slice(0, 60);
      DefaultExtension._historyCache = history;
      const preferences = new SharedPreferences();
      const value = JSON.stringify(history);
      if (typeof preferences.setString === "function") {
        await preferences.setString("xnxx_watch_history", value);
      } else if (typeof preferences.set === "function") {
        // The test harness exposes set(); Watchtower's runtime uses setString().
        await preferences.set("xnxx_watch_history", value);
      }
    } catch (error) {
      extLog("warn", `XNXX local history could not be saved: ${error.message}`);
    }
  }

  _historyDescription(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "Reprise locale disponible";
    return `Vu le ${date.toLocaleString("fr-FR", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    })}`;
  }

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
    if (href.startsWith("http")) return href;
    if (href.startsWith("//")) return `https:${href}`;
    try {
      return new URL(href, `${DefaultExtension.BASE_URL}/`).toString();
    } catch (_) {
      return `${DefaultExtension.BASE_URL}${href}`;
    }
  }

  _text(el) { return (el && el.text ? el.text : "").replace(/\s+/g, " ").trim(); }

  _elementsByClass(root, className) {
    if (!root) return [];
    const elements = typeof root.getElementsByClassName === "function"
      ? root.getElementsByClassName(className)
      : root.select(`.${className}`);
    return Array.isArray(elements) ? elements : [];
  }

  _elementsByTag(root, tagName) {
    if (!root) return [];
    const elements = typeof root.getElementsByTagName === "function"
      ? root.getElementsByTagName(tagName)
      : root.select(tagName);
    return Array.isArray(elements) ? elements : [];
  }

  _image(el) {
    if (!el) return "";
    return el.attr("data-src") || el.attr("data-original") ||
      el.attr("src") || el.attr("data-image") || "";
  }

  _hasPremiumMarker(el) {
    const classes = (el.attr("class") || "").toLowerCase();
    return classes.includes("premium") || classes.includes("gold");
  }

  _checkedBody(url, response) {
    const body = String(response && response.body != null ? response.body : "");
    const rawStatus = response && (response.statusCode || response.status);
    const status = Number(rawStatus);
    const hasStatus = Number.isFinite(status) && status > 0;
    const route = (() => {
      try { return new URL(url).pathname; } catch (_) { return url; }
    })();
    const cloudflareChallenge =
      /cf-chl-|challenge-platform|cf-browser-verification|__cf_chl_|attention required|checking your browser|just a moment|verify you are human|cloudflare ray id/i
        .test(body);

    if (cloudflareChallenge) {
      const message =
        "XNXX is showing a Cloudflare verification page. Open the source, complete its verification, then retry.";
      extLog("warn", `XNXX request blocked by Cloudflare route=${route} status=${hasStatus ? status : "unknown"}`);
      throw new Error(message);
    }
    if (hasStatus && status >= 400) {
      extLog("warn", `XNXX request failed route=${route} status=${status}`);
      throw new Error(`XNXX returned HTTP ${status} for ${route}.`);
    }
    if (!body.trim()) {
      extLog("warn", `XNXX returned an empty response route=${route} status=${hasStatus ? status : "unknown"}`);
      throw new Error(`XNXX returned an empty response for ${route}.`);
    }

    extLog("info", `XNXX request ok route=${route} status=${hasStatus ? status : "unknown"} bytes=${body.length}`);
    return body;
  }

  _pageHasNext(doc, page, pathPrefix, items) {
    if (page >= 50) return false;
    const next = `${pathPrefix}/${page + 1}`;
    for (const anchor of this._elementsByTag(doc, "a")) {
      const href = anchor.attr("href") || "";
      if (href === next || href === `${next}?top`) return true;
    }
    return items.length >= 30;
  }

  _parseVideoList(html, page, mode) {
    const doc = new Document(html);
    const items = [];
    const seen = {};
    // Use the DOM's native class/tag lookups here rather than a compound CSS
    // selector. Watchtower's embedded selector engine is intentionally smaller
    // than a browser's, and older runtimes can silently miss grouped selectors.
    const cards = this._elementsByClass(doc, "thumb-block");
    let videoLinksFound = 0;

    for (const card of cards) {
      const anchors = this._elementsByTag(card, "a");
      const anchor = anchors.find(item =>
        (item.attr("href") || "").includes("/video-")
      );
      if (!anchor) continue;
      videoLinksFound++;
      if (this._hasPremiumMarker(card)) continue;
      const link = this._absolute(anchor.attr("href"));
      if (!link || seen[link]) continue;
      seen[link] = true;

      const thumbUnder = this._elementsByClass(card, "thumb-under")[0] || card;
      const titleAnchors = this._elementsByTag(thumbUnder, "a");
      const titleAnchor = titleAnchors.find(item => (item.attr("title") || "").trim()) ||
        anchors.find(item => (item.attr("title") || "").trim()) ||
        titleAnchors.find(item => this._text(item)) ||
        anchors.find(item => this._text(item)) ||
        anchor;
      const images = this._elementsByTag(card, "img");
      const imageElement = images[0] || null;
      const metadata = this._text(
        this._elementsByClass(thumbUnder, "metadata")[0] ||
        this._elementsByClass(card, "metadata")[0] ||
        this._elementsByClass(card, "duration")[0]
      );
      const duration = metadata.match(/(\d+\s*(?:min|sec|h))/i);
      const preview = [
        ...images,
        ...this._elementsByTag(card, "div"),
        ...this._elementsByTag(card, "a"),
        ...this._elementsByTag(card, "span")
      ].map(item => item.attr("data-pvv") || "").find(Boolean) || "";

      items.push({
        name: this._text(titleAnchor) || "Untitled",
        imageUrl: this._image(imageElement),
        previewUrl: this._absolute(preview),
        link,
        description: duration ? `Duration: ${duration[1]}` : ""
      });
    }
    if (!items.length) {
      extLog(
        "warn",
        `XNXX parsed zero video cards mode=${mode || "unknown"} page=${page} thumbBlocks=${cards.length} videoLinks=${videoLinksFound} htmlBytes=${String(html || "").length}`
      );
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
    for (const card of this._elementsByClass(doc, "thumb-block")) {
      const anchors = this._elementsByTag(card, "a");
      const anchor = anchors.find(item =>
        (item.attr("href") || "").includes("/pornstar/")
      );
      if (!anchor) continue;
      const link = this._absolute(anchor.attr("href"));
      if (seen[link]) continue;
      seen[link] = true;
      if (this._hasPremiumMarker(card)) continue;
      const titleBlock = this._elementsByClass(card, "title")[0];
      const title = this._elementsByTag(titleBlock, "a")[0] ||
        anchors.find(item => (item.attr("title") || "").trim()) ||
        anchor;
      const count = this._text(this._elementsByClass(card, "uploader")[0]);
      items.push({
        name: this._text(title) || "Pornstar",
        imageUrl: this._image(this._elementsByTag(card, "img")[0]),
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
    const tagRoot = typeof doc.getElementById === "function"
      ? doc.getElementById("tags")
      : null;
    const tagRows = this._elementsByTag(tagRoot, "li");
    const rows = tagRows.length ? tagRows : this._elementsByTag(doc, "li");
    for (const row of rows) {
      const anchor = this._elementsByTag(row, "a").find(item =>
        (item.attr("href") || "").startsWith("/search/")
      );
      if (!anchor) continue;
      const href = anchor.attr("href") || "";
      const count = this._text(this._elementsByTag(row, "strong")[0]);
      const name = this._text(anchor);
      if (!name) continue;
      items.push({
        name,
        imageUrl: "",
        link: this._absolute(href),
        collectionId: `search_${href.slice("/search/".length).split(/[/?#]/)[0]}`,
        description: count ? `${count} videos` : "Browse videos",
        // The layout renderer may use this to create a staggered card.
        metadata: { masonryKey: name.length + (count ? count.length : 0) }
      });
    }
    return { list: items, hasNextPage: false };
  }

  _monthSlug(monthsAgo = 1) {
    const now = new Date(Date.now());
    const total = now.getFullYear() * 12 + now.getMonth() - monthsAgo;
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
  }

  _dailySelections() {
    return [
      {
        name: "Suggestions Straight",
        link: this._absolute("/your-suggestions/straight"),
        collectionId: "suggestion_straight",
        description: "Une sélection personnalisée"
      },
      {
        name: "African · Top",
        link: this._absolute("/search/african?top&id=73997887"),
        collectionId: "search_african_top",
        description: "Les vidéos African les plus populaires"
      },
      {
        name: "Teen",
        link: this._absolute("/search/Teen"),
        collectionId: "search_teen",
        description: "Parcourir les vidéos Teen"
      },
      {
        name: "Amateur",
        link: this._absolute("/search/amateur"),
        collectionId: "search_amateur",
        description: "Parcourir les vidéos Amateur"
      },
      {
        name: "MILF",
        link: this._absolute("/search/milf"),
        collectionId: "search_milf",
        description: "Parcourir les vidéos MILF"
      }
    ].map(item => ({ ...item, imageUrl: "" }));
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
    let res;
    try {
      res = await new Client().get(url, this.getHeaders(url));
    } catch (error) {
      const route = (() => {
        try { return new URL(url).pathname; } catch (_) { return url; }
      })();
      extLog("error", `XNXX network request failed route=${route} error=${error.message}`);
      throw new Error(`XNXX request failed for ${route}: ${error.message}`);
    }
    return { url, body: this._checkedBody(url, res) };
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
      const month = this._monthSlug();
      const path = page <= 1 ? `/best/${month}` : `/best/${month}/${page}`;
      const { body } = await this._get(path);
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
      let remote = [];
      try {
        const { body } = await this._get("/history");
        remote = this._parseVideoList(body, 1, "history").list;
      } catch (error) {
        if (!this._storedHistory().length) throw error;
        extLog("warn", `XNXX website history unavailable: ${error.message}`);
      }
      const seen = new Set();
      const local = this._storedHistory().map(item => ({
        name: item.name,
        link: item.link,
        imageUrl: item.imageUrl || "",
        previewUrl: item.previewUrl || "",
        description: this._historyDescription(item.watchedAt)
      }));
      const list = [...local, ...remote].filter(item => {
        if (!item.link || seen.has(item.link)) return false;
        seen.add(item.link);
        return true;
      });
      return { list, hasNextPage: false };
    }
    if (listId === "daily") {
      return { list: this._dailySelections(), hasNextPage: false };
    }
    if (listId === "suggestion_straight") {
      const suggestionPath = page <= 1
        ? "/your-suggestions/straight"
        : `/your-suggestions/straight/${page}`;
      const { body } = await this._get(suggestionPath);
      const suggested = this._parseVideoList(body, page, "suggestions");
      if (suggested.list.length) return suggested;
      // XNXX only fills its personal suggestions from browser-local activity.
      // Give the collection a useful, paginated fallback when that data is absent.
      const fallback = await this._get(`/search/straight/${page}`);
      return this._parseVideoList(fallback.body, page, "straight");
    }
    const bestMonth = /^best_(\d{4}-\d{2})$/.exec(listId);
    if (bestMonth) {
      const monthNumber = Number(bestMonth[1].slice(-2));
      if (monthNumber < 1 || monthNumber > 12) {
        throw new Error(`Invalid XNXX best-of month: ${bestMonth[1]}`);
      }
      const path = page <= 1
        ? `/best/${bestMonth[1]}`
        : `/best/${bestMonth[1]}/${page}`;
      const { body } = await this._get(path);
      return this._parseVideoList(body, page, "best");
    }
    if (listId.startsWith("search_")) {
      const rawId = listId.slice("search_".length);
      const top = rawId.endsWith("_top");
      const query = top ? rawId.slice(0, -4) : rawId;
      const encoded = encodeURIComponent(query).replace(/%20/g, "+");
      const pagePath = page <= 1 ? "" : `/${page}`;
      const suffix = top ? "?top&id=73997887" : "";
      const { body } = await this._get(`/search/${encoded}${pagePath}${suffix}`);
      return this._parseVideoList(body, page, query);
    }
    if (listId === "pornstars") {
      const path = page <= 1 ? "/pornstars" : `/pornstars/${page}`;
      const { body } = await this._get(path);
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
    const metaTitle = doc
      .selectFirst('meta[property="og:title"]')
      ?.attr("content") || "";
    const title = this._text(
      doc.selectFirst("h1.page-title") ||
      doc.selectFirst("h2.page-title") ||
      doc.selectFirst("h1.content-title")
    ) || metaTitle.replace(/\s+/g, " ").trim()
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
    const page = new Document(body);
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

    // XNXX now signs the media URLs behind the player RPC instead of
    // embedding setVideoHLS/setVideoUrlHigh calls in the page.
    const encodedId = body.match(/setEncodedIdVideo\(['"]([^'"]+)['"]\)/)?.[1];
    const cdnId = body.match(/setIdCdnHLS\(['"]?([^'")]+)['"]?\)/)?.[1] ||
      body.match(/setIdCDN\(['"]?([^'")]+)['"]?\)/)?.[1];
    if (encodedId && cdnId) {
      const endpoint = `${DefaultExtension.BASE_URL}/html5player/getvideo/${encodedId}/${cdnId}`;
      const rpc = await new Client().get(endpoint, headers);
      const rpcBody = this._checkedBody(endpoint, rpc);
      let data;
      try {
        data = JSON.parse(rpcBody);
      } catch (error) {
        extLog("warn", `XNXX media RPC returned invalid JSON error=${error.message}`);
        throw new Error("XNXX returned an unreadable response for its video sources.");
      }
      if (data.hls) add([null, data.hls], "Auto (HLS)");
      if (data.mp4_high) add([null, data.mp4_high], "720p");
      if (data.mp4_low) add([null, data.mp4_low], "360p");
    }
    if (!videos.length) {
      add(body.match(/html5player\.setVideoHLS\(['"]([^'"]+)['"]\)/), "Auto (HLS)");
      add(body.match(/html5player\.setVideoUrlHigh\(['"]([^'"]+)['"]\)/), "720p");
      add(body.match(/html5player\.setVideoUrlLow\(['"]([^'"]+)['"]\)/), "360p");
    }

    const preferred = String(this.prefQuality || "auto").toLowerCase();
    videos.sort((a, b) => {
      const score = quality => preferred === "auto"
        ? (quality.includes("HLS") ? 0 : 1)
        : (quality.toLowerCase().includes(preferred) ? 0 : 1);
      return score(a.quality) - score(b.quality);
    });
    if (videos.length) {
      const metaTitle = page
        .selectFirst('meta[property="og:title"]')
        ?.attr("content") || "";
      const title = this._text(page.selectFirst("h1.page-title")) ||
        this._text(page.selectFirst("h1.content-title")) ||
        metaTitle.replace(/\s+/g, " ").trim() ||
        "XNXX video";
      const cover = page.selectFirst('meta[property="og:image"]')?.attr("content") || "";
      await this._saveHistoryItem({
        name: title,
        link: this._absolute(url),
        imageUrl: this._absolute(cover),
        watchedAt: Date.now()
      });
    }
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