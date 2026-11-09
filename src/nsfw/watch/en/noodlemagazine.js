const watchtowerSources = [{
  "name": "noodlemagazine",
  "lang": "en",
  "baseUrl": "https://noodlemagazine.com",
  "apiUrl": "",
  "iconUrl": "https://noodlemagazine.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.1.0",
  "pkgPath": "nsfw/watch/en/noodlemagazine.js",
  "uiLayout": "ui-layouts/noodlemagazine.json",
  "uiLayoutVersion": "1.0.0",
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
      "Referer": BASE_URL + "/",
      "Accept-Language": "en-US,en;q=0.9"
    };
  }

  _pageUrl(path, page) {
    const currentPage = Math.max(1, Number(page) || 1);
    const base = BASE_URL + path;
    if (currentPage <= 1) return base;
    return base + (path.indexOf("?") >= 0 ? "&" : "?") + "page=" + currentPage;
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

  async _requestHtml(url) {
    const response = await new Client().get(url, this.getHeaders(url));
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
      for (const link of doc.select("a[href*='page=']")) {
        const href = link.attr("href") || "";
        const match = href.match(/[?&]page=(\d+)/i);
        if (match && Number(match[1]) > currentPage) {
          hasNextPage = true;
          break;
        }
      }
    }
    if (!hasNextPage && items.length >= 20) hasNextPage = true;
    return { list: items, hasNextPage: hasNextPage };
  }

  async getDetail(url) {
    const pageUrl = this._absoluteUrl(url);
    if (!pageUrl) throw new Error("NoodleMagazine: invalid video URL.");
    const doc = new Document(await this._requestHtml(pageUrl));
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
    // The site builds its player in the page; it does not expose a stable
    // direct stream in the HTML returned to the extension. Let the normal
    // in-app browser load and play that page rather than returning an empty list.
    return [{
      url: pageUrl,
      originalUrl: pageUrl,
      quality: "Web player",
      type: "webview",
      kind: "webview",
      headers: this.getHeaders(pageUrl)
    }];
  }

  _collectionItem(name, listId, link) {
    return {
      name: name,
      link: link || BASE_URL + "/",
      url: link || BASE_URL + "/",
      imageUrl: "",
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

  _timePeriodItems() {
    return TIME_PERIODS.map(([name, range]) =>
      this._collectionItem(
        name,
        "range:" + range,
        this._pageUrl("/home?range=" + range, 1)
      )
    );
  }

  async getCustomList(listId, page) {
    const id = String(listId || "");
    if (id === "popular") return this.getPopular(page);
    if (id === "latest") return this.getLatestUpdates(page);
    const routes = {
      "watching_now": "/now",
      "trending": "/popular/trending",
      "explore": "/home?range=explore",
      "recent": "/home?range=recent"
    };
    if (routes[id]) return this._listing(routes[id], page);
    if (id === "time_periods") {
      return { list: this._timePeriodItems(), hasNextPage: false };
    }
    if (id === "quick_searches") {
      return { list: this._quickSearchItems(), hasNextPage: false };
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
