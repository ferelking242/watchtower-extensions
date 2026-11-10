const watchtowerSources = [{
  "name": "noodlemagazine",
  "lang": "en",
  "baseUrl": "https://noodlemagazine.com",
  "apiUrl": "",
  "iconUrl": "https://noodlemagazine.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.2.0",
  "pkgPath": "nsfw/watch/en/noodlemagazine.js",
  "uiLayout": "ui-layouts/noodlemagazine.json",
  "uiLayoutVersion": "1.1.0",
  "notes": "Adult content (18+) — noodlemagazine",
  "isNsfw": true
}];

const BASE_URL = "https://noodlemagazine.com";

const SEARCH_SHORTCUTS = [
  ["Hiding the towels", "hiding the towels"],
  ["Degold", "degold"],
  ["Short film", "shortfilm"],
  ["Tina Nanami and 712", "tina nanami and 712"],
  ["Gangbangs", "gangbangs"],
  ["Japanese vs Black", "japanese vs black"],
  ["Slugs 2004", "slugs 2004"],
  ["FSDSS 949", "fsdss 949"],
  ["Guinevere Honey", "guinevere honey"],
  ["Small Japanese", "small japanese"],
  ["Romy Indy", "romy indy"],
  ["Turkey car", "turkey car"],
  ["Lezley Zen", "lezley zen"],
  ["Melany Evans", "melany evans"],
  ["Indian bhabhi slut", "indian bhabhi slut"],
  ["Kala Grey", "kala grey"],
  ["Nudist tribune", "nudist tribune"],
  ["Family Orrverse", "family orrverse"],
  ["Puretaboo primal", "puretaboo primal"],
  ["Desi maids ffm", "desi maids ffm"]
];

const TIME_PERIODS = [
  ["Day", "day"],
  ["Week", "week"],
  ["Month", "month"]
];

class DefaultExtension extends MProvider {
  getHeaders(url) {
    // The runtime supplies the User-Agent for its current request context.
    return {
      "Referer": url || BASE_URL + "/",
      "Accept-Language": "en-US,en;q=0.9"
    };
  }

  _pageUrl(path, page) {
    const currentPage = Math.max(1, Number(page) || 1);
    const base = BASE_URL + path;
    if (currentPage <= 1) return base;
    const separator = path.indexOf("?") >= 0 ? "&" : "?";
    // NoodleMagazine uses zero-based `p` for pagination; `page` is ignored.
    return base + separator + "p=" + (currentPage - 1);
  }

  _absoluteUrl(value) {
    const raw = String(value || "").trim();
    if (!raw || /^javascript:/i.test(raw) || raw === "#") return "";
    try {
      return new URL(raw, BASE_URL).href;
    } catch (_) {
      return raw.indexOf("/") === 0 ? BASE_URL + raw : "";
    }
  }

  _searchSlug(query) {
    return String(query || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => encodeURIComponent(part))
      .join("+");
  }

  _isChallenge(status, body) {
    return status === 403 || status === 429 || status === 503 ||
      /<title[^>]*>\s*(?:just a moment|attention required)|cf-chl-|__cf_chl|cf_challenge|enable javascript and cookies to continue|verify you are human/i.test(String(body || ""));
  }

  async _requestHtml(url, referer) {
    const response = await new Client().get(url, this.getHeaders(referer || url));
    const status = Number(response && response.statusCode || 0);
    const body = String(response && response.body || "");
    if (this._isChallenge(status, body)) {
      throw new Error(
        "NoodleMagazine: Cloudflare challenge (HTTP " +
        (status || "unknown") +
        ") — open the source in the app browser, complete verification, then retry."
      );
    }
    if (status >= 400) {
      throw new Error("NoodleMagazine: HTTP " + status + " — " + url);
    }
    return body;
  }

  async getPopular(page) {
    return this._listing("/home", page);
  }

  get supportsLatest() { return true; }

  async getLatestUpdates(page) {
    return this._listing("/home?range=recent", page);
  }

  async search(query, page, filters) {
    const cleanQuery = String(query || "").trim();
    if (!cleanQuery) return this.getPopular(page);
    return this._listing("/video/" + this._searchSlug(cleanQuery), page);
  }

  async _listing(path, page) {
    const url = this._pageUrl(path, page);
    const html = await this._requestHtml(url);
    return this._parse(html, page);
  }

  _parse(html, page) {
    const doc = new Document(String(html || ""));
    const items = [];
    const seen = {};
    for (const a of doc.select("a[href*='/watch/']")) {
      const link = this._absoluteUrl(a.attr("href"));
      if (!link || seen[link]) continue;
      let host = "";
      try { host = new URL(link).hostname.toLowerCase(); } catch (_) {}
      if (host !== "noodlemagazine.com" && host !== "www.noodlemagazine.com") continue;

      const img = a.selectFirst("img");
      const titleNode = a.selectFirst(".title, .video-title, h2, h3");
      const candidates = [
        a.attr("title"),
        img && img.attr("alt"),
        titleNode && titleNode.text,
        a.text
      ];
      let title = "";
      for (const candidate of candidates) {
        const value = String(candidate || "").replace(/\s+/g, " ").trim();
        if (value && value.toLowerCase() !== "watch now") {
          title = value;
          break;
        }
      }
      if (!title) continue;
      const imageUrl = this._absoluteUrl(
        img && (img.attr("data-src") || img.attr("data-original") || img.attr("src"))
      );
      seen[link] = true;
      items.push({ name: title, imageUrl: imageUrl, link: link });
    }

    const currentPage = Math.max(1, Number(page) || 1);
    let hasNextPage = !!doc.selectFirst("a[rel='next'], a.next, .pagination .next a");
    if (!hasNextPage) {
      for (const link of doc.select("a[href]")) {
        const href = link.attr("href") || "";
        const sitePage = href.match(/[?&]p=(\d+)/i);
        const legacyPage = href.match(/[?&]page=(\d+)/i);
        if (
          (sitePage && Number(sitePage[1]) >= currentPage) ||
          (legacyPage && Number(legacyPage[1]) > currentPage)
        ) {
          hasNextPage = true;
          break;
        }
      }
    }
    if (!hasNextPage) {
      const more = doc.selectFirst(".more[data-page]");
      const nextPage = Number(more && more.attr("data-page"));
      if (Number.isFinite(nextPage) && nextPage >= currentPage) {
        hasNextPage = true;
      }
    }
    if (!hasNextPage && items.length >= 20) hasNextPage = true;
    return { list: items, hasNextPage: hasNextPage };
  }

  async getDetail(url) {
    const pageUrl = this._absoluteUrl(url);
    if (!pageUrl) throw new Error("NoodleMagazine: invalid video URL.");
    const html = await this._requestHtml(pageUrl);
    const doc = new Document(html);
    const playerUrl = this._playerUrlFromHtml(html);
    if (playerUrl) this._cachePlayerUrl(pageUrl, playerUrl);
    const title = (
      doc.selectFirst("h1")?.text ||
      doc.selectFirst('meta[property="og:title"]')?.attr("content") ||
      doc.selectFirst("title")?.text ||
      "Video"
    ).replace(/\s+/g, " ").trim();
    const imageUrl =
      doc.selectFirst('meta[property="og:image"]')?.attr("content") ||
      doc.selectFirst("video[poster]")?.attr("poster") ||
      "";
    const description =
      doc.selectFirst('meta[property="og:description"]')?.attr("content") ||
      doc.selectFirst('meta[name="description"]')?.attr("content") ||
      "";
    return {
      name: title,
      imageUrl: this._absoluteUrl(imageUrl),
      description: description,
      genre: [],
      episodes: [{ name: title, url: pageUrl }]
    };
  }

  async getVideoList(url) {
    const pageUrl = this._absoluteUrl(url);
    if (!pageUrl) return [];

    let playerUrl = this._cachedPlayerUrl(pageUrl);
    if (!playerUrl) {
      const pageHtml = await this._requestHtml(pageUrl);
      playerUrl = this._playerUrlFromHtml(pageHtml);
      if (playerUrl) this._cachePlayerUrl(pageUrl, playerUrl);
    }
    if (!playerUrl) {
      throw new Error("NoodleMagazine: player URL not found in video page.");
    }

    let playerHtml = "";
    let mediaSources = [];
    if (/\.(?:mp4|m3u8)(?:[?#]|$)/i.test(playerUrl)) {
      mediaSources = [{ file: playerUrl, label: "Auto" }];
    } else {
      playerHtml = await this._requestHtml(playerUrl, pageUrl);
      mediaSources = this._mediaSources(playerHtml);
    }

    const seen = {};
    const videos = [];
    for (const source of mediaSources) {
      const streamUrl = this._absoluteUrl(source && (source.file || source.src || source.url));
      if (!streamUrl || seen[streamUrl]) continue;
      const type = String(source && source.type || "").toLowerCase();
      if (!/\.(?:mp4|m3u8)(?:[?#]|$)/i.test(streamUrl) &&
          !/mp4|mpegurl|m3u8|hls/.test(type)) {
        continue;
      }
      seen[streamUrl] = true;

      const rawQuality = String(source && (source.label || source.quality) || "Auto").trim();
      const quality = /^\d{3,4}$/.test(rawQuality) ? rawQuality + "p" : rawQuality;
      videos.push({
        url: streamUrl,
        originalUrl: streamUrl,
        quality: quality,
        headers: this.getHeaders(playerUrl)
      });
    }
    if (!videos.length) {
      throw new Error("NoodleMagazine: no playable MP4/HLS sources found in player response.");
    }
    return videos;
  }

  _playerUrlFromHtml(html) {
    const doc = new Document(String(html || ""));
    const value =
      doc.selectFirst('meta[property="og:video:secure_url"]')?.attr("content") ||
      doc.selectFirst('meta[property="og:video"]')?.attr("content") ||
      doc.selectFirst("iframe[src]")?.attr("src") ||
      "";
    return this._absoluteUrl(value);
  }

  _cachePlayerUrl(pageUrl, playerUrl) {
    if (!this._playerUrlCache) this._playerUrlCache = {};
    this._playerUrlCache[pageUrl] = { url: playerUrl, savedAt: Date.now() };
    const keys = Object.keys(this._playerUrlCache);
    if (keys.length > 48) delete this._playerUrlCache[keys[0]];
  }

  _cachedPlayerUrl(pageUrl) {
    const entry = this._playerUrlCache && this._playerUrlCache[pageUrl];
    if (!entry || Date.now() - entry.savedAt > 2 * 60 * 1000) return "";
    return entry.url;
  }

  _playlistObject(html) {
    const source = String(html || "");
    const assignment = /(?:window\s*\.\s*)?playlist\s*=\s*/i.exec(source);
    if (!assignment) return null;

    const start = source.indexOf("{", assignment.index + assignment[0].length);
    if (start < 0) return null;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < source.length; i++) {
      const char = source[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') inString = true;
      else if (char === "{") depth++;
      else if (char === "}" && --depth === 0) {
        try {
          return JSON.parse(source.slice(start, i + 1));
        } catch (_) {
          return null;
        }
      }
    }
    return null;
  }

  _mediaSources(html) {
    const playlist = this._playlistObject(html);
    if (playlist && Array.isArray(playlist.sources)) return playlist.sources;

    const doc = new Document(String(html || ""));
    const sources = [];
    for (const node of doc.select("video[src]")) {
      const src = node.attr("src");
      if (src) sources.push({ file: src, label: "Auto" });
    }
    for (const node of doc.select("source[src]")) {
      const src = node.attr("src");
      if (src) sources.push({ file: src, label: "Auto" });
    }
    return sources;
  }

  _collectionItem(name, listId, link, imageUrl) {
    return {
      name: name,
      link: link || BASE_URL + "/",
      url: link || BASE_URL + "/",
      imageUrl: imageUrl || "",
      collectionId: listId,
      description: "Open " + name + " videos",
      metadata: { collection: true }
    };
  }

  _quickSearchItems() {
    return SEARCH_SHORTCUTS.map(([name, query]) =>
      this._collectionItem(
        name,
        "search_query:" + encodeURIComponent(query),
        BASE_URL + "/video/" + this._searchSlug(query)
      )
    );
  }

  async _timePeriodItems() {
    const covers = await Promise.all(TIME_PERIODS.map(async ([, range]) => {
      try {
        const result = await this._listing("/home?range=" + range, 1);
        const firstWithCover = (result.list || []).find((item) => item.imageUrl);
        return firstWithCover ? firstWithCover.imageUrl : "";
      } catch (error) {
        try {
          console.warn("NoodleMagazine: period cover unavailable for " + range, error);
        } catch (_) {}
        return "";
      }
    }));
    return TIME_PERIODS.map(([name, range], index) =>
      this._collectionItem(
        name,
        "range:" + range,
        this._pageUrl("/home?range=" + range, 1),
        covers[index]
      )
    );
  }

  async _recentTrendItems() {
    const doc = new Document(await this._requestHtml(BASE_URL + "/home"));
    const items = [];
    const seen = {};
    for (const anchor of doc.select(".suggestions a")) {
      const link = this._absoluteUrl(anchor.attr("href"));
      const name = String(anchor.text || "").replace(/\s+/g, " ").trim();
      if (!link || !name) continue;

      let pathname = "";
      let host = "";
      try {
        const parsed = new URL(link);
        pathname = parsed.pathname;
        host = parsed.hostname.toLowerCase();
      } catch (_) {}
      if (
        (host !== "noodlemagazine.com" && host !== "www.noodlemagazine.com") ||
        !pathname.startsWith("/video/")
      ) {
        continue;
      }
      const slug = pathname.slice("/video/".length);
      let query = slug.replace(/\+/g, " ");
      try { query = decodeURIComponent(query); } catch (_) {}
      query = query.trim();
      if (!query || seen[query.toLowerCase()]) continue;
      seen[query.toLowerCase()] = true;
      items.push(
        this._collectionItem(
          name,
          "search_query:" + encodeURIComponent(query),
          link
        )
      );
    }
    return items;
  }

  async getCustomList(listId, page) {
    const id = String(listId || "");
    if (id === "popular") return this.getPopular(page);
    if (id === "latest") return this.getLatestUpdates(page);
    const routes = {
      "watching_now": "/now",
      "trending": "/popular/trending",
      "explore": "/home?range=explore",
      "recent": "/home?range=recent",
      "raped": "/video/raped",
      "bitch": "/video/bitch"
    };
    if (routes[id]) return this._listing(routes[id], page);
    if (id === "time_periods") {
      return { list: await this._timePeriodItems(), hasNextPage: false };
    }
    if (id === "quick_searches") {
      return { list: this._quickSearchItems(), hasNextPage: false };
    }
    if (id === "recent_trends") {
      return { list: await this._recentTrendItems(), hasNextPage: false };
    }
    if (id.indexOf("range:") === 0) {
      const range = id.slice("range:".length);
      if (range === "day" || range === "week" || range === "month") {
        return this._listing("/home?range=" + range, page);
      }
    }
    if (id.indexOf("search_query:") === 0) {
      let query = id.slice("search_query:".length);
      try { query = decodeURIComponent(query); } catch (_) {}
      return this.search(query, page);
    }
    return { list: [], hasNextPage: false };
  }

  async getPageList(url) { return []; }
  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
