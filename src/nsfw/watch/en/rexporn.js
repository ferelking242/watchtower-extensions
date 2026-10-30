const watchtowerSources = [{
  "name": "RexPorn",
  "lang": "en",
  "baseUrl": "https://www.rexporn.st",
  "apiUrl": "",
  "iconUrl": "https://www.rexporn.st/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.2.10",
  "login": false,
  "forYou": false,
  "pkgPath": "nsfw/watch/en/rexporn.js",
  "notes": "Adult content (18+) — multi-quality MP4 streaming",
  "isNsfw": true
}];

class DefaultExtension extends MProvider {

  static get BASE_URL() { return "https://www.rexporn.st"; }

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

  static get CATEGORY_THUMBNAIL_CACHE() {
    if (!this._categoryThumbnailCache) {
      this._categoryThumbnailCache = Object.create(null);
    }
    return this._categoryThumbnailCache;
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

  // A top-level browser navigation sends neither `Origin` nor an XHR-flavoured
  // `Referer`; replaying the API headers here would look like a scripted client
  // and get the degraded page back.
  getBrowserHeaders() {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
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

  // Build URL for popular/sorted listing. The home listing paginates as
  // /page-N.html: `?sort=new&page=N` is ignored by the site and always
  // returns page 1.
  _sortedUrl(sortState, page) {
    const path = DefaultExtension.SORT_PATHS[sortState] || "";
    if (!path) {
      return page > 1 ? `https://www.rexporn.st/page-${page}.html` : "https://www.rexporn.st/";
    }
    if (page > 1) return `https://www.rexporn.st/${path}/page-${page}.html`;
    return `https://www.rexporn.st/${path}`;
  }

  // Build URL for category browse
  _categoryUrl(slug, page) {
    if (page > 1) return `https://www.rexporn.st/${slug}-page-${page}.html`;
    return `https://www.rexporn.st/${slug}`;
  }

  // Build URL for a text search, honouring the sort selector. The site keeps
  // the sort as a path segment (`/videos/search/top-rated/?query=…`); the bare
  // route serves the default relevance order.
  _searchUrl(query, page, sortState) {
    const path = DefaultExtension.SORT_PATHS[sortState] || "";
    const base = path
      ? `https://www.rexporn.st/videos/search/${path}/`
      : "https://www.rexporn.st/videos/search/";
    const params = `query=${encodeURIComponent(query)}`;
    return page > 1 ? `${base}?${params}&page=${page}` : `${base}?${params}`;
  }

  // Every listing page closes with a `.pageslinks` block whose anchors carry
  // `class="pagelink"`. On the last page the block only holds a "Prev" link,
  // so a "Next" anchor is the reliable signal. The previous
  // `.pagination/.pager/.pages` selectors never matched the live markup, which
  // left `hasNextPage` permanently true and looped page 1 forever.
  _hasNextPage(doc) {
    const links = doc.select(".pageslinks a, a.pagelink");
    for (const link of links) {
      if (/next/i.test(link.text || "")) return true;
    }
    return false;
  }

  // Pornstar names ship ROT13-obfuscated (the `.vname.rtt` class marks the
  // encoded nodes) to keep them out of naive scrapers. Decode so a card reads
  // "Aaliyah Love" instead of "Nnyvlnu Ybir".
  _rot13(value) {
    return String(value || "").replace(/[a-zA-Z]/g, (ch) => {
      const base = ch <= "Z" ? 65 : 97;
      return String.fromCharCode(((ch.charCodeAt(0) - base + 13) % 26) + base);
    });
  }

  // ── Watch history ─────────────────────────────────────────────────────────
  // Stored through the app's session bridge (`getLocalStorage`/
  // `setLocalStorage`) rather than SharedPreferences, which writes to Isar and
  // is dropped when called from the extension worker isolate.
  static get HISTORY_KEY() { return "rexporn_watch_history"; }

  _storageAvailable() {
    return typeof getLocalStorage === "function" &&
      typeof setLocalStorage === "function";
  }

  _storedHistory() {
    if (Array.isArray(DefaultExtension._historyCache)) {
      return DefaultExtension._historyCache;
    }
    return DefaultExtension._historyPending || [];
  }

  // The rail is built from the cache synchronously, so a cold cache must be
  // warmed before getCustomList("history") runs.
  async _loadStoredHistory() {
    if (Array.isArray(DefaultExtension._historyCache)) {
      return DefaultExtension._historyCache;
    }
    if (!this._storageAvailable()) {
      DefaultExtension._historyCache = [];
      return DefaultExtension._historyCache;
    }
    try {
      const raw = await getLocalStorage(
        DefaultExtension.BASE_URL,
        DefaultExtension.HISTORY_KEY,
      );
      const parsed = typeof raw === "string" ? JSON.parse(raw || "[]") : raw;
      DefaultExtension._historyCache = Array.isArray(parsed)
        ? parsed.filter(item => item && item.link && item.name)
        : [];
    } catch (error) {
      extLog("warn", `RexPorn history could not be read: ${error.message}`);
      DefaultExtension._historyCache = [];
    }
    return DefaultExtension._historyCache;
  }

  async _saveHistoryItem(item) {
    if (!this._storageAvailable()) return;
    try {
      const entries = (await this._loadStoredHistory())
        .filter(entry => entry.link !== item.link);
      entries.unshift(item);
      const history = entries.slice(0, 60);
      DefaultExtension._historyCache = history;
      DefaultExtension._historyPending = history;
      await setLocalStorage(
        DefaultExtension.BASE_URL,
        DefaultExtension.HISTORY_KEY,
        JSON.stringify(history),
      );
    } catch (error) {
      extLog("warn", `RexPorn local history could not be saved: ${error.message}`);
    }
  }

  _historyDescription(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "Déjà regardé";
    return `Vu le ${date.toLocaleString("fr-FR", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    })}`;
  }

  // ── Transports ────────────────────────────────────────────────────────────
  // The primary domain can be unreachable from some networks (ISP/ARCOM DNS
  // blocking). Requests walk a chain — direct host, then the alternate domain
  // the site itself links to, then the Worker proxy — and the first transport
  // that returns real markup wins. The proxy runs outside the blocked network,
  // so it is the transport of last resort.
  static get MIRRORS() {
    return ["https://www.rexporn.sex"];
  }
  static get PROXY_URL() {
    return "https://watchtower-proxy.aivos-dev.workers.dev/proxy";
  }

  _activeHost() {
    return this._hostOverride || DefaultExtension.BASE_URL;
  }

  _transports() {
    const list = [{ kind: "direct", host: DefaultExtension.BASE_URL }];
    for (const host of DefaultExtension.MIRRORS) list.push({ kind: "direct", host });
    list.push({ kind: "proxy", host: DefaultExtension.BASE_URL });
    return list;
  }

  _isCloudflareChallenge(body) {
    // Every real RexPorn page embeds Cloudflare's JSD beacon
    // (`challenge-platform/…/jsd/main.js`, `__CF$cv$params`), so those markers
    // must NOT count. Only an actual interstitial does.
    return /cf-chl-|cf-browser-verification|__cf_chl_|checking your browser|just a moment|verify you are human|enable javascript and cookies|attention required/i
      .test(String(body || ""));
  }

  _isStubBody(body) {
    const text = String(body || "");
    if (!text.trim()) return true;
    if (/please visit|veuillez visiter|visitar|besuchen|visitez|not available in your (country|region)/i
      .test(text)) {
      return true;
    }
    // A real RexPorn page is tens of KB and carries listing/detail markup; a
    // tiny HTML page with none of it is a block stub whatever its language.
    return text.length < 1500 &&
      /^\s*</.test(text) &&
      !/pitem|viewmov|pornstar|pornstudio|studio|vname|channels|pageslinks|data-q|itemprop="thumbnailUrl"/i.test(text);
  }

  async _directFetch(host, path, headers) {
    const url = `${host}${path}`;
    const res = await new Client().get(url, headers);
    return { url, statusCode: res && res.statusCode, body: res ? res.body : "" };
  }

  async _proxyFetch(host, path, headers) {
    const target = `${host}${path}`;
    const res = await new Client().post(
      DefaultExtension.PROXY_URL,
      { "Content-Type": "application/json", "Accept": "application/json" },
      { method: "GET", url: target, headers }
    );
    if (!res || typeof res.body !== "string") {
      throw new Error("RexPorn proxy returned an invalid response");
    }
    let payload;
    try {
      payload = JSON.parse(res.body);
    } catch (_) {
      throw new Error("RexPorn proxy returned unparseable JSON");
    }
    if (payload && payload.error) {
      throw new Error(`RexPorn proxy error: ${payload.error}`);
    }
    return { url: target, statusCode: payload && payload.statusCode, body: payload && payload.body };
  }

  async _get(url) {
    // Reduce a full page URL to a path so each transport can rebuild it
    // against its own host.
    let route = String(url || "");
    if (/^https?:\/\//i.test(route)) {
      try {
        const parsed = new URL(route);
        route = parsed.pathname + parsed.search;
      } catch (_) { /* keep as-is */ }
    }
    let lastError;
    let sawCloudflare = false;
    let sawStub = false;
    for (const transport of this._transports()) {
      const headers = this.getPageHeaders(`${transport.host}/`);
      try {
        const res = transport.kind === "proxy"
          ? await this._proxyFetch(transport.host, route, headers)
          : await this._directFetch(transport.host, route, headers);
        const body = String(res.body || "");
        const status = Number(res.statusCode);
        const challenge = this._isCloudflareChallenge(body);
        if (challenge) { sawCloudflare = true; continue; }
        if (this._isStubBody(body)) { sawStub = true; continue; }
        // Any real page wins, including a 404: callers decide what to do with
        // it (a 404 body parses to an empty list rather than an error).
        if (transport.host !== DefaultExtension.BASE_URL) {
          this._hostOverride = transport.host;
          extLog("info", `RexPorn using transport=${transport.kind} host=${transport.host} route=${route}`);
        }
        return { url: res.url, body, statusCode: status };
      } catch (error) {
        if (!lastError) lastError = error;
      }
    }
    if (sawCloudflare) {
      throw new Error(
        "RexPorn is showing a Cloudflare verification page. Open the source, complete its verification, then retry."
      );
    }
    if (sawStub) {
      throw new Error(
        `RexPorn is blocked on this network (route ${route}). The direct site and every mirror were refused.`
      );
    }
    extLog("error", `RexPorn request failed route=${route} error=${lastError && lastError.message}`);
    throw new Error(`RexPorn request failed for ${route}: ${lastError && lastError.message}`);
  }

  async _getCategoryThumbnail(slug) {
    const cache = DefaultExtension.CATEGORY_THUMBNAIL_CACHE;
    if (cache[slug]) return cache[slug];

    const request = (async () => {
      const url = this._categoryUrl(slug, 1);
      try {
        const res = await this._get(url);
        const item = this._parseList(res.body, url, 1, "category")
          .list.find(video => !!video.imageUrl);
        if (!item) {
          extLog("warn", `RexPorn category preview missing: slug=${slug}`);
          return "";
        }
        return item.imageUrl;
      } catch (error) {
        extLog("warn", `RexPorn category preview failed: slug=${slug} error=${error.message || error}`);
        return "";
      }
    })();

    cache[slug] = request;
    const imageUrl = await request;
    if (!imageUrl) delete cache[slug];
    return imageUrl;
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
    const res = await this._get(url);
    return this._parseList(res.body, url, page, style);
  }

  get supportsLatest() { return true; }

  async getLatestUpdates(page) {
    const url = page > 1
      ? `https://www.rexporn.st/page-${page}.html`
      : "https://www.rexporn.st/";
    const res = await this._get(url);
    return this._parseList(res.body, url, page, "popular");
  }

  async search(query, page, filters) {
    this._currentFilters = filters;
    const cat = this._filterCategory(filters);
    const sort = this._filterSort(filters);
    const q   = (query || "").trim();

    // No query → browse popular with current sort/category filter
    if (!q) {
      return this.getPopular(page);
    }

    // The site exposes no keyword+category route, so a category selection with
    // a query browses that category; a plain query runs a keyword search that
    // keeps the chosen sort (the sort is a path segment on the search route).
    const url = cat
      ? this._categoryUrl(cat, page)
      : this._searchUrl(q, page, sort);
    const style = cat ? "category" : "search";

    extLog('info', `RexPorn.search: q="${q}" cat=${cat} sort=${sort} page=${page} url=${url}`);
    const res = await this._get(url);
    return this._parseList(res.body, url, page, style);
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
      const thumb = img
        ? (img.attr("data-src") || img.attr("data-original") || img.attr("src") || "")
        : "";
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
    // The site renders one shared pagination block on every listing page, so a
    // single "Next" check replaces the per-style slug guessing that never
    // matched the live markup.
    const doc2 = new Document(html);
    const cap = 50;
    let hasNext = page < cap && this._hasNextPage(doc2);

    return { list: items, hasNextPage: hasNext };
  }

  _parseCollectionList(html, selector, page, style) {
    const doc = new Document(html);
    const items = [];
    const seen = {};
    const cards = doc.select(selector);

    for (const card of cards) {
      const a = card.selectFirst("a");
      if (!a) continue;
      const href = a.attr("href") || "";
      if (!href) continue;
      const link = href.startsWith("http")
        ? href
        : "https://www.rexporn.st" + href;
      if (seen[link]) continue;
      seen[link] = 1;

      const img = card.selectFirst("img");
      const titleNode = card.selectFirst(".vname") ||
        card.selectFirst(".ftitle") ||
        card.selectFirst(".name");
      let title = (titleNode ? titleNode.text : (img ? img.attr("alt") : ""))
        .replace(/^Pornstar$/i, "")
        .trim();
      // Pornstar names are ROT13-encoded in `.vname.rtt` nodes.
      if (titleNode && /(^|\s)rtt(\s|$)/.test(titleNode.attr("class") || "")) {
        title = this._rot13(title);
      }
      const descriptionNode = card.selectFirst(".vidcount") ||
        card.selectFirst(".length");
      const description = descriptionNode ? descriptionNode.text.trim() : "";

      items.push({
        name: title || "RexPorn",
        imageUrl: img ? (img.attr("src") || img.attr("data-src") || "") : "",
        link,
        url: link,
        description,
        metadata: { collection: true, collectionType: style }
      });
    }

    const hasNextPage = page < 50 && this._hasNextPage(doc);

    return { list: items, hasNextPage };
  }

  async getCustomList(listId, page) {
    if (listId === "history") {
      await this._loadStoredHistory();
      const seen = new Set();
      const list = this._storedHistory()
        .filter(item => {
          if (!item.link || seen.has(item.link)) return false;
          seen.add(item.link);
          return true;
        })
        .map(item => ({
          name: item.name,
          imageUrl: item.imageUrl || "",
          link: item.link,
          previewUrl: item.previewUrl || "",
          description: this._historyDescription(item.watchedAt)
        }));
      return { list, hasNextPage: false };
    }
    if (listId === "latest") return this.getLatestUpdates(page);
    if (listId === "top") {
      const url = this._sortedUrl(1, page);
      const res = await this._get(url);
      return this._parseList(res.body, url, page, "sorted");
    }
    if (listId === "popular") {
      const url = this._sortedUrl(4, page);
      const res = await this._get(url);
      return this._parseList(res.body, url, page, "sorted");
    }
    if (listId === "pornstars") {
      const url = page > 1
        ? `https://www.rexporn.st/pornstars-page-${page}.html`
        : "https://www.rexporn.st/pornstars";
      const res = await this._get(url);
      return this._parseCollectionList(res.body, ".pornstar", page, "pornstars");
    }
    if (listId === "studios") {
      const url = page > 1
        ? `https://www.rexporn.st/channels-page-${page}.html`
        : "https://www.rexporn.st/channels";
      const res = await this._get(url);
      const studios = this._parseCollectionList(
        res.body,
        ".pornstudio, .studio, .producer, [class*='studio'], [class*='channel']",
        page,
        "studios"
      );
      return studios;
    }
    if (listId === "categories" || listId === "tags") {
      const categories = DefaultExtension.CATEGORIES
        .filter(([, slug]) => !!slug);
      const items = new Array(categories.length);
      let nextCategory = 0;
      const loadNextCategory = async () => {
        while (nextCategory < categories.length) {
          const index = nextCategory++;
          const [name, slug] = categories[index];
          const link = `https://www.rexporn.st/${slug}`;
          const imageUrl = await this._getCategoryThumbnail(slug);
          items[index] = {
            name,
            imageUrl,
            link,
            url: link,
            collectionId: `category_${slug}`,
            description: `Browse ${name} videos`,
            genre: [name],
            metadata: { collection: true, collectionType: listId }
          };
        }
      };
      const workerCount = Math.min(4, categories.length);
      await Promise.all(
        Array.from({ length: workerCount }, () => loadNextCategory())
      );
      return { list: items, hasNextPage: false };
    }
    if (listId.startsWith("category_")) {
      const slug = listId.slice("category_".length);
      const url = this._categoryUrl(slug, page);
      const res = await this._get(url);
      return this._parseList(res.body, url, page, "category");
    }
    return this.getPopular(page);
  }

  // ── Detail page ───────────────────────────────────────────────────────────
  async getDetail(url) {
    const res   = await this._get(url);
    const doc   = new Document(res.body);
    const h1    = doc.selectFirst("h1");
    const ogTitle = doc.selectFirst('meta[property="og:title"]');
    const title = (h1 ? h1.text.trim() : null) || (ogTitle ? ogTitle.attr("content").trim() : "Unknown");
    const ogImg = doc.selectFirst('meta[property="og:image"]');
    const thumbLink = doc.selectFirst('link[itemprop="thumbnailUrl"]');
    const thumb = (thumbLink ? thumbLink.attr("href") : null) || (ogImg ? ogImg.attr("content") : "");
    if (url.includes("/pornstar/") || url.includes("/pornstars/")) {
      const videos = this._parseList(res.body, url, 1, "pornstar").list;
      return {
        name: title,
        imageUrl: thumb,
        description: "Videos from this pornstar",
        genre: [],
        episodes: videos.map(video => ({ name: video.name, url: video.link }))
      };
    }
    if (url.includes("/studio/") || url.includes("/studios/") ||
        url.includes("/channel/") || url.includes("/channels/")) {
      const videos = this._parseList(res.body, url, 1, "studio").list;
      return {
        name: title,
        imageUrl: thumb,
        description: "Videos from this studio",
        genre: [],
        episodes: videos.map(video => ({
          name: video.name,
          url: video.link,
          thumbnailUrl: video.imageUrl
        }))
      };
    }
    const tagEls = doc.select(".video-tags a, .tags a, .category a");
    const tags = [];
    for (const el of tagEls) tags.push({ name: el.text.trim() });
    // Category and tag cards link directly to a listing page. Expose that
    // listing as episodes so tapping a tag opens its videos instead of trying
    // to play the category HTML as a video source.
    if (!url.includes("/watch/")) {
      const videos = this._parseList(res.body, url, 1, "collection").list;
      if (videos.length > 0) {
        return {
          name: title,
          imageUrl: thumb,
          description: "RexPorn collection",
          genre: tags,
          episodes: videos.map(video => ({
            name: video.name,
            url: video.link,
            thumbnailUrl: video.imageUrl
          }))
        };
      }
    }
    return { name: title, imageUrl: thumb, description: "", genre: tags,
      episodes: [{ name: title, url }] };
  }

  // ── Video sources ─────────────────────────────────────────────────────────

  // The player payload is not tied to a fixed element id. It used to sit on
  // `#player`; the site now ships it on `#sync`, which is what its own
  // ssync.js reads back (getElementById('sync')). Hard-coding `#player` is why
  // this returned 0 videos after the rename. Anchor on the `data-q` attribute,
  // which is what actually identifies the player element, and read the sibling
  // attributes from that same tag so a `data-id` elsewhere on the page cannot
  // be paired with it.
  _playerTagFromHtml(html) {
    if (!html) return "";
    const qAt = html.indexOf('data-q="');
    if (qAt < 0) return "";
    const open = html.lastIndexOf("<", qAt);
    const close = html.indexOf(">", qAt);
    return (open >= 0 && close > open) ? html.slice(open, close + 1) : "";
  }

  _sourcesFromPlayerTag(playerTag, pageUrl) {
    const videos = [];
    if (!playerTag) return videos;

    const attr = (name) => {
      const m = playerTag.match(new RegExp(`${name}="([^"]+)"`));
      return m ? m[1] : "";
    };

    const dataQ = attr("data-q");
    const dataN = attr("data-n");
    const vid   = parseInt(attr("data-id"), 10);
    if (!dataQ || !dataN || !Number.isFinite(vid)) return videos;

    const folder = Math.floor(vid / 1000) * 1000;
    const vPut  = folder + "/" + vid;

    for (const qStr of dataQ.split(",")) {
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
        headers: this.getVideoHeaders(pageUrl)
      });
    }

    const qualOrder = ["1080p", "720p", "480p", "360p", "240p", "2160p"];
    videos.sort((a, b) => {
      const ai = qualOrder.findIndex(q => a.quality.includes(q.replace("p", "")));
      const bi = qualOrder.findIndex(q => b.quality.includes(q.replace("p", "")));
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    return videos;
  }

  // The site serves the player payload only to a real browser session: a plain
  // HTTP client gets a degraded page ("Video is not available") with no
  // `data-q`, on every quality, for every video. Reload the page in the app's
  // WebView — it runs the site's own scripts on the user's device and network —
  // and read the live player element's outerHTML from there. This is the only
  // way to obtain the signed quality list, so playback works whenever the site
  // would play in a browser.
  async _playerTagViaWebview(url) {
    if (typeof evaluateJavascriptViaWebview !== "function") return "";
    const script = `(function(){
      var tries = 0;
      var timer = setInterval(function(){
        tries++;
        var el = document.getElementById('sync') || document.getElementById('player');
        if (!el) { var c = document.querySelectorAll('[data-q]'); if (c.length) el = c[0]; }
        var q = el ? el.getAttribute('data-q') : '';
        if (q || tries >= 40) {
          clearInterval(timer);
          try { window.flutter_inappwebview.callHandler('setResponse', el ? el.outerHTML : ''); }
          catch (e) {}
        }
      }, 500);
    })();`;
    try {
      const out = await evaluateJavascriptViaWebview(url, this.getBrowserHeaders(), [script]);
      return out || "";
    } catch (e) {
      extLog('warn', `RexPorn.getVideoList: WebView fallback failed: ${e.message || e}`);
      return "";
    }
  }

  async getVideoList(url) {
    let html = "";
    try {
      const res = await this._get(url);
      html = res.body || "";
    } catch (e) {
      extLog('warn', `RexPorn.getVideoList: HTTP fetch failed: ${e.message || e}`);
    }

    let videos = this._sourcesFromPlayerTag(this._playerTagFromHtml(html), url);

    if (videos.length === 0) {
      extLog('info', "RexPorn.getVideoList: no payload over HTTP, retrying via WebView");
      const tag = await this._playerTagViaWebview(url);
      videos = this._sourcesFromPlayerTag(this._playerTagFromHtml(tag), url);
    }

    // Record the history entry from the page metadata, not from the extracted
    // sources. The site serves its player payload only to a real browser
    // session, so `videos` is empty whenever the WebView fallback is
    // unavailable — and gating the write on it meant a page the user had
    // genuinely opened left no trace in "Historique". Fire-and-forget for the
    // same reason as before: this storage write must never delay the URL the
    // player is blocked on.
    this._saveHistoryItem({
      name: this._titleFromHtml(html) || this._titleFromUrl(url),
      link: this._absolute(url),
      imageUrl: this._thumbFromHtml(html),
      watchedAt: Date.now()
    });

    if (videos.length === 0) {
      extLog('warn', "RexPorn.getVideoList: missing data-q/n/id in player markup");
    } else {
      extLog('info', `RexPorn.getVideoList: ${videos.length} videos`);
    }
    return videos;
  }

  /// Fallback label for the history rail when the page carries no `og:title`:
  /// the last path segment, de-slugified and title-cased
  /// ("my-drunken-stepmother" → "My Drunken Stepmother").
  _titleFromUrl(url) {
    const path = String(url || "").split(/[?#]/)[0].replace(/\/+$/, "");
    const slug = path.slice(path.lastIndexOf("/") + 1);
    if (!slug || /^\d+$/.test(slug)) return "RexPorn video";
    const words = slug.replace(/[-_]+/g, " ").trim();
    if (!words) return "RexPorn video";
    return words.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  _titleFromHtml(html) {
    if (!html) return "";
    const m = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (!m) return "";
    return m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  }

  _thumbFromHtml(html) {
    if (!html) return "";
    const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<link[^>]+itemprop=["']thumbnailUrl["'][^>]+href=["']([^"']+)["']/i);
    return m ? this._absolute(m[1]) : "";
  }

  _absolute(url) {
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    return `${this._activeHost()}${url.startsWith("/") ? "" : "/"}${url}`;
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
