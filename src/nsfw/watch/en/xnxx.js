const watchtowerSources = [{
  "name": "XNXX",
  "lang": "en",
  "baseUrl": "https://www.xnxx.com",
  "apiUrl": "",
  "iconUrl": "https://www.xnxx.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.4.0",
  "login": true,
  "loginUrl": "https://www.xnxx.com/mobile/login",
  "forYou": false,
  "pkgPath": "nsfw/watch/en/xnxx.js",
  "notes": "Adult content (18+) — free XNXX catalog only",
  "isNsfw": true,
  "touchToPreview": true,
  "videoQualities": [
    "Auto", "144p", "240p", "360p", "480p",
    "720p", "1080p", "1440p (2K)", "2160p (4K)", "4320p (8K)"
  ]
}];

class DefaultExtension extends MProvider {
  static get BASE_URL() { return "https://www.xnxx.com"; }
  static get HISTORY_KEY() { return "xnxx_watch_history"; }
  get supportsLatest() { return true; }

  // Watchtower's runtime does not expose a `localStorage` global; it exposes
  // the async `getLocalStorage`/`setLocalStorage` helpers from JsUtils, which
  // persist through the app's secure per-extension session store.
  //
  // SharedPreferences cannot be used for this: `setString` writes to Isar,
  // which only the root isolate may open, so every write made by the extension
  // worker was silently dropped and "Historique" stayed empty after a restart.
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

  // The listing is built from the cache synchronously, so a cold cache must be
  // warmed before getCustomList("history") runs. Reading localStorage is async
  // and cannot be awaited from the synchronous accessor above.
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
      extLog("warn", `XNXX history could not be read: ${error.message}`);
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

  _elementArray(elements) {
    if (!elements) return [];
    if (Array.isArray(elements)) return elements;

    let length = typeof elements.length === "number" ? elements.length : null;
    if (length === null && typeof elements.size === "number") {
      length = elements.size;
    } else if (length === null && typeof elements.size === "function") {
      try { length = elements.size(); } catch (_) {}
    }
    if (Number.isInteger(length) && length >= 0) {
      const result = [];
      for (let index = 0; index < length; index++) {
        try {
          const item = typeof elements.item === "function" ? elements.item(index)
            : typeof elements.get === "function" ? elements.get(index)
              : elements[index];
          if (item != null) result.push(item);
        } catch (_) {}
      }
      return result;
    }

    if (typeof elements.toArray === "function") {
      try {
        const converted = elements.toArray();
        if (Array.isArray(converted)) return converted;
      } catch (_) {}
    }
    if (typeof Symbol !== "undefined" && Symbol.iterator &&
        typeof elements[Symbol.iterator] === "function") {
      try { return Array.from(elements); } catch (_) {}
    }
    return [];
  }

  _elementsByClass(root, className) {
    if (!root) return [];
    if (typeof root.getElementsByClassName === "function") {
      try {
        const elements = this._elementArray(root.getElementsByClassName(className));
        if (elements.length) return elements;
      } catch (_) {}
    }
    if (typeof root.select === "function") {
      try { return this._elementArray(root.select(`.${className}`)); } catch (_) {}
    }
    return [];
  }

  _elementsByTag(root, tagName) {
    if (!root) return [];
    if (typeof root.getElementsByTagName === "function") {
      try {
        const elements = this._elementArray(root.getElementsByTagName(tagName));
        if (elements.length) return elements;
      } catch (_) {}
    }
    if (typeof root.select === "function") {
      try { return this._elementArray(root.select(tagName)); } catch (_) {}
    }
    return [];
  }

  _image(el) {
    if (!el) return "";
    // `data-mzl` is XNXX's own full-size listing thumb; `data-src` is the
    // low-resolution `_t` variant the browser swaps in while scrolling.
    return el.attr("data-mzl") || el.attr("data-src") ||
      el.attr("data-original") || el.attr("src") ||
      el.attr("data-image") || "";
  }

  // The /hits feed does not put the thumb and preview on the <img>; it embeds
  // them in the card's `data-video` JSON attribute instead.
  _cardData(card) {
    const raw = card && typeof card.attr === "function"
      ? card.attr("data-video")
      : "";
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  // XNXX paginates with a ZERO-based path suffix: logical page 1 is the bare
  // route, page 2 is `/1`, page 3 is `/2`. The app asks for logical pages, so
  // passing `page` straight through skipped a page on every call (page 2
  // returned page 3's items and the first page was shown twice).
  _pagePath(page) {
    const logical = Number(page);
    if (!Number.isFinite(logical) || logical <= 1) return "";
    return `/${Math.floor(logical) - 1}`;
  }

  // Same rule for routes that carry a mandatory index (the pornstar list has
  // no bare page 2 route: /pornstars/1 is page 2).
  _pagePathFromOne(page) {
    const logical = Number(page);
    if (!Number.isFinite(logical) || logical <= 1) return "";
    return `/${Math.floor(logical) - 1}`;
  }

  // /hits is zero-based too, but its first page is reachable at the bare route.
  _hitsPath(page) {
    return `/hits${this._pagePath(page)}`;
  }

  // XNXX's own cards use `_t` for the 600x337 listing thumbnail and ship a
  // full-size `mozaique_listing` (1056x594) next to it. Watchtower upscales
  // covers, so returning `_t` is what made every image look blurry.
  _hiResImage(url) {
    if (!url) return "";
    const match = /^(.*\/)([^/]+)\.(jpe?g|png|webp)$/i.exec(url);
    if (!match) return url;
    const prefix = match[1];
    const name = match[2];
    if (/mozaique_(full|listing)$/i.test(name)) return url;
    // Only XNXX's own generated names can be swapped; leave anything else
    // (and already high-resolution art) untouched.
    if (!/^(xn|xv|mozaique)_?\d*_?t?$/i.test(name)) return url;
    return `${prefix}mozaique_listing.jpg`;
  }

  _hasPremiumMarker(el) {
    const classes = (el.attr("class") || "").toLowerCase();
    // `thumb-channel-premium` marks a verified channel — every one of the 80
    // cards on /pornstars carries it — and `invert-if-premium` only flips a
    // badge colour. Treating those as paywalls emptied the whole section.
    if (/thumb-channel-premium|invert-if-premium/.test(classes)) return false;
    return /\bpremium\b|\bgold\b/.test(classes);
  }

  /// XNXX's RPC names its MP4 fallbacks by resolution, but `mp4_high` is not
  /// always the high one: a 1080p source can return `video_360p.mp4`. Trust
  /// the filename, then the slot name, and never invent a resolution.
  _mp4Quality(url, slot) {
    const match = String(url).match(/(\d{3,4})p/);
    if (match) return `${match[1]}p`;
    return slot === "high" ? "MP4 (high)" : "MP4 (low)";
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

  _pageHasNext(doc, page, items, html) {
    // /search and /pornstars render a dedicated "Next" anchor on every page
    // that has a successor and drop it on the last one; that check holds at
    // any depth. The previous "page + 1" href guess stopped matching as soon
    // as the route used a different page base, so pagination died after the
    // first screen.
    const raw = html || "";
    if (/class="[^"]*\bnext\b[^"]*"/.test(raw)) return true;
    for (const anchor of this._elementsByTag(doc, "a")) {
      if (/\bnext\b/.test((anchor.attr("class") || "").toLowerCase())) return true;
    }
    // /hits advertises its pages with zero-based `data-page` markers instead,
    // so compare the highest advertised index with the current one.
    const markers = [];
    const markerRe = /data-page="(\d+)"/g;
    let marker;
    while ((marker = markerRe.exec(raw))) markers.push(Number(marker[1]));
    if (markers.length) {
      return Math.max(...markers) > Math.max(0, Number(page) - 1);
    }
    return items.length >= 30;
  }

  _parseVideoCardsRegex(html) {
    // Last-resort extractor, independent of ANY DOM implementation: the QuickJS
    // runtime builds Element nodes through a Dart bridge, and when that bridge
    // fails to resolve `.thumb-block` (client quirk, markup drift, empty doc)
    // the DOM-based path above silently produces zero items and the user sees
    // "Aucun résultat" on a working page. Recover links straight from the HTML.
    //
    // Cards carry the SAME /video-… href twice (thumbnail link, then title
    // link); the title attribute only exists on the second one, so anchors are
    // grouped by link before anything is committed.
    const items = [];
    if (!html) return items;
    const anchorRe = /<a\b[^>]*\bhref=["']([^"']*\/video-\d+[^"']*)["'][^>]*>([\s\S]{0,600}?)<\/a>/gi;
    const groups = new Map();
    const blockBounds = [];
    let match;
    while ((match = anchorRe.exec(html))) {
      const link = this._absolute(match[1]);
      if (!link) continue;
      if (!groups.has(link)) {
        groups.set(link, { link, first: match, anchors: [] });
      }
      groups.get(link).anchors.push(match);
    }

    const starts = [...groups.values()].map(group => group.first.index);
    let index = 0;
    for (const group of groups.values()) {
      const blockEnd = index + 1 < starts.length ? starts[index + 1] : Math.min(html.length, group.first.index + 8000);
      const block = html.slice(group.first.index, blockEnd);
      index++;

      // Title: the `title` attr first, else any tag-free inner text of the grouped anchors.
      let name = "";
      for (const candidate of group.anchors) {
        const attr = /(^|\s)title=["']([^"']*)["']/.exec(candidate[0]);
        if (attr && attr[2].trim()) {
          name = this._decodeEntities(attr[2]).replace(/\s+/g, " ").trim();
          break;
        }
      }
      for (const candidate of group.anchors) {
        if (name) break;
        const text = this._decodeEntities(String(candidate[2]).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
        if (text.length >= 4) name = text;
      }

      // Image: first lazy-load thumb inside the grouped anchor internals
      // (the plain `src` is a blank placeholder on xnxx), else the nearest
      // one after the anchor in the block.
      let image = "";
      for (const candidate of group.anchors) {
        const img = /<img\b[^>]*\b(?:data-src|data-original)=["']([^"']+)["']/i.exec(candidate[0]);
        if (img) {
          image = img[1];
          break;
        }
      }
      if (!image) {
        const img = /<img\b[^>]*\b(?:data-src|data-original|src)=["']([^"']+)["']/i.exec(block);
        if (img) image = img[1];
      }

      const previewMatch = /\bdata-pvv=["']([^"']+)["']/i.exec(block);
      const mzlMatch = /\bdata-mzl=["']([^"']+)["']/i.exec(block);
      const duration = /(\d+\s*(?:min|sec|h)\b)/i.exec(block);
      const rawImage = mzlMatch ? mzlMatch[1] : image;
      items.push({
        name: name || "Untitled",
        imageUrl: this._hiResImage(
          rawImage.startsWith("//") ? `https:${rawImage}` : rawImage
        ),
        previewUrl: previewMatch ? this._absolute(previewMatch[1]) : "",
        link: group.link,
        description: duration ? `Duration: ${duration[1]}` : ""
      });
    }
    return items;
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
      const data = this._cardData(card);
      const preview = data.previewVideo || [
        ...images,
        ...this._elementsByTag(card, "div"),
        ...this._elementsByTag(card, "a"),
        ...this._elementsByTag(card, "span")
      ].map(item => item.attr("data-pvv") || "").find(Boolean) || "";

      items.push({
        name: this._text(titleAnchor) || "Untitled",
        imageUrl: this._hiResImage(
          data.mozaiqueListing || data.sfwThumbUrl || this._image(imageElement)
        ),
        previewUrl: this._absolute(preview),
        link,
        description: duration ? `Duration: ${duration[1]}` : ""
      });
    }
    if (!items.length) {
      // HTML fallback so a failing embedded DOM engine can never turn a
      // working page into an empty result set.
      const recovered = this._parseVideoCardsRegex(html);
      if (recovered.length) {
        extLog(
          "info",
          `XNXX DOM parse empty mode=${mode || "unknown"} page=${page}, regex fallback recovered ${recovered.length} items`
        );
        items.push(...recovered);
      } else {
        extLog(
          "warn",
          `XNXX parsed zero video cards mode=${mode || "unknown"} page=${page} thumbBlocks=${cards.length} videoLinks=${videoLinksFound} htmlBytes=${String(html || "").length}`
        );
      }
    }

    const hasNext = mode === "history"
      ? false
      : this._pageHasNext(doc, page, items, html);

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
        imageUrl: this._hiResImage(this._image(this._elementsByTag(card, "img")[0])),
        link,
        description: count ? `${count} free videos` : "Free videos"
      });
    }
    return {
      list: items,
      hasNextPage: this._pageHasNext(doc, page, items, html)
    };
  }

  // The live tag index is `/tags/<letter>` (2000 tags per letter page). A
  // bare `/tags` returns every letter at once, so the section paginates the
  // alphabet instead of repeating one page.
  _tagLetters() {
    return "abcdefghijklmnopqrstuvwxyz".split("");
  }

  _parseTags(html) {
    const doc = new Document(html);
    const items = [];
    const tagRoot = typeof doc.getElementById === "function"
      ? doc.getElementById("tags")
      : null;
    const tagRows = this._elementsByTag(tagRoot, "li");
    const rows = tagRows.length ? tagRows : this._elementsByTag(doc, "li");
    // A letter page carries ~2000 tags; the home grid shows six. Cap the
    // payload so the QuickJS bridge never marshals the whole index for a rail.
    const maxTags = 240;
    for (const row of rows) {
      if (items.length >= maxTags) break;
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
        description: count ? `${count} videos` : "Browse videos"
      });
    }
    return items;
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
        link: this._absolute("/search/african"),
        collectionId: "search_african",
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

  _categoryTags() {
    return DefaultExtension.CATEGORIES
      .filter(([, slug]) => slug)
      .map(([name, slug]) => ({
        name,
        imageUrl: "",
        link: this._absolute(`/search/${slug.replace(/ /g, "+")}`),
        collectionId: `search_${slug.replace(/ /g, "_")}`,
        description: "Parcourir les vidéos"
      }));
  }

  _filterState(filters, index) {
    // The app serializes filter state as int indexes, but defensive: some
    // payloads carry strings. Coerce so a falsy string never breaks the
    // category lookup in _filterCategory.
    const state = filters && filters[index] ? filters[index].state : 0;
    const normalized = Number(state);
    return Number.isFinite(normalized) ? normalized : 0;
  }

  _filterCategory(filters) {
    const entry = DefaultExtension.CATEGORIES[this._filterState(filters, 2)];
    return entry ? entry[1] : "";
  }

  // XNXX's own search page refines a query with PATH segments, not query
  // parameters: `/search/<period>/<length>/<quality>/<viewed>/<query>`. The
  // legacy `?top`/`?order=` parameters were silently ignored server-side
  // (identical 36/36 result sets), which is why the sort filter looked broken.
  // Order matters; the keyword always comes last.
  _filterSegments(filters) {
    const segments = [];
    const period = ["", "year", "month"][this._filterState(filters, 3)];
    if (period) segments.push(period);
    const length = [
      "", "0-10min", "10min+", "10-20min", "20min+",
    ][this._filterState(filters, 4)];
    if (length) segments.push(length);
    const quality = ["", "hd-only", "fullhd"][this._filterState(filters, 5)];
    if (quality) segments.push(quality);
    if (this._filterState(filters, 6) === 1) segments.push("hide_viewed_video");
    return segments;
  }

  // `mode` selects XNXX's sort axis for the same keyword: Default keeps the
  // relevance order, `hits` sorts by views, `random` shuffles.
  _searchPath(keyword, filters, page, mode) {
    const parts = [];
    const normalized = String(mode || "").toLowerCase();
    if (normalized === "hits" || normalized === "random") parts.push(normalized);
    parts.push(...this._filterSegments(filters));
    const encoded = encodeURIComponent(String(keyword || "").trim())
      .replace(/%20/g, "+");
    parts.push(encoded);
    const joined = parts.filter(Boolean).join("/");
    return `/search/${joined}${this._pagePath(page)}`;
  }

  // Search only ever ran with the filter set captured by `search()`. Sections
  // that list a keyword (tags, suggestions) built their URL by hand and lost
  // the refinement entirely.
  //
  // Some combinations are rejected server-side with a 500 "Internal Error"
  // instead of an empty list (e.g. `/search/year/fullhd/<q>`). Rather than
  // showing the user an error for a refinement they explicitly asked for, walk
  // back the request: drop the sort axis, then the refinements, and keep the
  // first listing that answers. A section must never fail to render.
  async _searchListing(keyword, page, filters, mode) {
    const attempts = [
      { label: "full", mode, filters },
      { label: "no-mode", mode: "", filters },
      { label: "keyword-only", mode: "", filters: [] }
    ];
    let lastError;
    for (const attempt of attempts) {
      const path = this._searchPath(keyword, attempt.filters, page, attempt.mode);
      try {
        const { body } = await this._get(path);
        if (attempt.label !== "full") {
          extLog("warn", `XNXX search degraded to ${attempt.label} for "${keyword}"`);
        }
        return this._parseVideoList(body, page, keyword);
      } catch (error) {
        lastError = error;
        if (attempt.label === "keyword-only") break;
        extLog(
          "warn",
          `XNXX search attempt=${attempt.label} failed, retrying: ${error.message}`
        );
      }
    }
    throw lastError;
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
      // A chosen category is a keyword search: keep the refinements the user
      // picked so the browse screen and the home sections agree.
      return this._searchListing(category, page, filters, "");
    }
    if (mode === 1) {
      const month = this._monthSlug();
      const path = page <= 1 ? `/best/${month}` : `/best/${month}/${page}`;
      const { body } = await this._get(path);
      const result = this._parseVideoList(body, page, "best");
      result.hasNextPage = result.list.length > 0 && page < 24;
      return result;
    }
    const { body } = await this._get(this._hitsPath(page));
    return this._parseVideoList(body, page, "hits");
  }

  async getLatestUpdates(page) {
    // XNXX does not expose a stable public "latest" route. Its /hits feed is
    // the same free, paginated catalog used by the legacy source contract.
    const { body } = await this._get(this._hitsPath(page));
    return this._parseVideoList(body, page, "hits");
  }

  async search(query, page, filters) {
    this._currentFilters = filters || [];
    const category = this._filterCategory(this._currentFilters);
    const rawQuery = (query || "").trim();
    if (!rawQuery) return this.getPopular(page);
    const keyword = category ? `${rawQuery} ${category}` : rawQuery;
    const mode = ["", "hits", "random"][this._filterState(this._currentFilters, 1)] || "";
    return this._searchListing(keyword, page, this._currentFilters, mode);
  }

  async getCustomList(listId, page) {
    if (listId === "history") {
      // Warm the localStorage-backed cache: the synchronous accessor below
      // cannot await the read, and a cold cache used to render an empty rail.
      await this._loadStoredHistory();
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
    // The layout shows "Le meilleur du mois" as a plain ranked section: the
    // month is resolved server-side here instead of through a layout month
    // selector, so no selector is needed on the home screen.
    if (listId === "best_month") {
      return this._bestOfMonth(this._monthSlug(), page);
    }
    if (listId === "best_previous") {
      // The previous month is resolved at call time so the section never goes
      // stale the way a hard-coded "best_YYYY-MM" id would.
      return this._bestOfMonth(this._monthSlug(2), page);
    }
    if (listId === "suggestion_straight") {
      // XNXX only fills /your-suggestions from browser-local activity, and its
      // pagination route 404s. It is used as a single screen; the fallback
      // keyword listing carries the paging.
      const { body } = await this._get("/your-suggestions/straight");
      const suggested = this._parseVideoList(body, 1, "suggestions");
      if (suggested.list.length) {
        suggested.hasNextPage = false;
        return suggested;
      }
      const fallback = await this._searchListing("straight", page, []);
      fallback.hasNextPage = true;
      return fallback;
    }
    const bestMonth = /^best_(\d{4}-\d{2})$/.exec(listId);
    if (bestMonth) {
      const monthNumber = Number(bestMonth[1].slice(-2));
      if (monthNumber < 1 || monthNumber > 12) {
        throw new Error(`Invalid XNXX best-of month: ${bestMonth[1]}`);
      }
      return this._bestOfMonth(bestMonth[1], page);
    }
    if (listId.startsWith("search_")) {
      const rawId = listId.slice("search_".length);
      const top = rawId.endsWith("_top");
      const query = (top ? rawId.slice(0, -4) : rawId).replace(/_/g, " ");
      // `?top` never reordered results server-side; the listing keeps its own
      // keyword order and paginates with the zero-based suffix.
      return this._searchListing(query, page, []);
    }
    if (listId === "pornstars") {
      const { body } = await this._get(`/pornstars${this._pagePathFromOne(page)}`);
      return this._parsePornstars(body, page);
    }
    if (listId === "tags") {
      // The live tag index lives at /tags/<letter>; page 1 walks A..Z. A
      // network failure falls back to the built-in category set so the grid
      // never renders empty.
      const letters = this._tagLetters();
      const index = Math.max(1, Number(page) || 1) - 1;
      const letter = letters[index];
      if (letter) {
        try {
          const { body } = await this._get(`/tags/${letter}`);
          const tags = this._parseTags(body);
          if (tags.length) {
            return { list: tags, hasNextPage: index < letters.length - 1 };
          }
        } catch (error) {
          extLog("warn", `XNXX tag index unavailable: ${error.message}`);
        }
      }
      return { list: this._categoryTags(), hasNextPage: false };
    }
    if (listId === "hits") {
      const { body } = await this._get(this._hitsPath(page));
      return this._parseVideoList(body, page, "hits");
    }
    return this.getPopular(page);
  }

  async _bestOfMonth(month, page) {
    // The best-of listing is zero-based as well: /best/<month>/1 is page 2.
    const { body } = await this._get(`/best/${month}${this._pagePath(page)}`);
    const result = this._parseVideoList(body, page, "best");
    result.hasNextPage = result.list.length > 0 && page < 24;
    return result;
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
    const cover = this._hiResImage(
      doc.selectFirst('meta[property="og:image"]')?.attr("content") || ""
    );

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
    const totalSw = Date.now();
    const pageSw = Date.now();
    const { body } = await this._get(url.replace(DefaultExtension.BASE_URL, ""));
    const pageMs = Date.now() - pageSw;
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
      const rpcSw = Date.now();
      const rpc = await new Client().get(endpoint, headers);
      const rpcBody = this._checkedBody(endpoint, rpc);
      const rpcMs = Date.now() - rpcSw;
      let data;
      try {
        data = JSON.parse(rpcBody);
      } catch (error) {
        extLog("warn", `XNXX media RPC returned invalid JSON error=${error.message}`);
        throw new Error("XNXX returned an unreadable response for its video sources.");
      }
      // mp4_high is mislabelled by XNXX itself: for a 1080p source the RPC
      // returns `video_360p.mp4`, and only the HLS master carries the real
      // renditions (250p..1080p). Do not advertise a resolution the URL does
      // not contain - read it back from the filename.
      if (data.hls) add([null, data.hls], "Auto");
      if (data.mp4_high) add([null, data.mp4_high], this._mp4Quality(data.mp4_high, "high"));
      if (data.mp4_low) add([null, data.mp4_low], this._mp4Quality(data.mp4_low, "low"));
      extLog("info", `XNXX.getVideoList timing page=${pageMs}ms mediaRpc=${rpcMs}ms`);
    }
    if (!videos.length) {
      // Same rule as above: `setVideoUrlHigh` is a slot name, not a promise.
      add(body.match(/html5player\.setVideoHLS\(['"]([^'"]+)['"]\)/), "Auto");
      const highFallback = body.match(/html5player\.setVideoUrlHigh\(['"]([^'"]+)['"]\)/);
      if (highFallback) add(highFallback, this._mp4Quality(highFallback[1], "high"));
      const lowFallback = body.match(/html5player\.setVideoUrlLow\(['"]([^'"]+)['"]\)/);
      if (lowFallback) add(lowFallback, this._mp4Quality(lowFallback[1], "low"));
    }

    if (videos.length) {
      const metaTitle = page
        .selectFirst('meta[property="og:title"]')
        ?.attr("content") || "";
      const title = this._text(page.selectFirst("h1.page-title")) ||
        this._text(page.selectFirst("h1.content-title")) ||
        metaTitle.replace(/\s+/g, " ").trim() ||
        "XNXX video";
      const cover = this._hiResImage(
        page.selectFirst('meta[property="og:image"]')?.attr("content") || ""
      );
      // Fire-and-forget: this is a localStorage write through the app's
      // session bridge, and awaiting it held up the return of `getVideoList`
      // — i.e. the video URL the player is blocked on. The history entry is a
      // nicety; it must never delay playback. `_saveHistoryItem` catches its
      // own errors, so there is no unhandled rejection to worry about.
      this._saveHistoryItem({
        name: title,
        link: this._absolute(url),
        imageUrl: this._absolute(cover),
        watchedAt: Date.now()
      });
    }
    extLog("info", `XNXX.getVideoList: ${videos.length} free sources (total ${Date.now() - totalSw}ms)`);
    return videos;
  }

  async getPageList(url) { return []; }

  // XNXX has no recommendations API: the detail page embeds the related
  // videos as a JS literal (`var video_related = [...]`) next to the player.
  // Accepts either a plain page URL or a JSON payload ({url|link}).
  async getRecommendations(url) {
    const target = this._targetUrl(url);
    if (!target) return [];
    const { body } = await this._get(target.replace(DefaultExtension.BASE_URL, ""));
    const match = body.match(/var\s+video_related\s*=\s*(\[[\s\S]*?\])\s*;/);
    let raw = [];
    if (match) {
      try { raw = JSON.parse(match[1]); } catch (_) { raw = []; }
    }
    const items = [];
    const seen = {};
    for (const video of raw) {
      const link = this._absolute(video.u || "");
      if (!link || seen[link]) continue;
      seen[link] = true;
      items.push({
        name: video.t || video.tf || "XNXX",
        imageUrl: this._absolute(video.i || video.il || video.ip || ""),
        link,
        description: [video.d, video.r, video.n].filter(Boolean).join(" • ")
      });
    }
    extLog("info", `XNXX.getRecommendations: ${items.length}/${raw.length} related item(s)`);
    if (items.length) return items.slice(0, 24);

    // The related literal is absent from some responses (a partially rendered
    // or signed-out page), which used to leave "Pour vous" empty. The page
    // still lists its own tags, and the first one describes the video well
    // enough to build a real list instead of showing nothing.
    const fallback = await this._recommendByTag(body, target);
    extLog("info", `XNXX.getRecommendations: no related literal, tag fallback → ${fallback.length} item(s)`);
    return fallback.slice(0, 24);
  }

  /// Recommendations built from the detail page's own keyword tags.
  ///
  /// Used only when the page ships no `video_related` literal: the tag search
  /// is a second request, so it must not run on the normal path.
  async _recommendByTag(body, target) {
    const doc = new Document(body);
    // Grouped/compound selectors are unreliable on the embedded selector
    // engine, so probe the tag classes one at a time.
    let anchors = [];
    for (const selector of ["a.is-keyword", ".video-tags a", ".tags a"]) {
      anchors = doc.select(selector);
      if (anchors.length) break;
    }
    const keyword = anchors
      .map((anchor) => ({ href: anchor.attr("href") || "" }))
      .find((tag) => tag.href.startsWith("/search/"));
    if (!keyword) return [];

    const { body: listing } = await this._get(keyword.href);
    const currentId = (target.match(/video-([a-z0-9]+)/i) || [])[1];
    return this._parseVideoList(listing, 1, "related").list.filter(
      (item) => item.link && (!currentId || !item.link.includes(`video-${currentId}`))
    );
  }

  // XNXX renders comments client-side: the page only ships an empty
  // #comments-container, then the browser POSTs/GETs the thread endpoint.
  // The public thread URL is
  //   /threads/video-comments/get-posts/<sort>/<id_video>/<after>/<count>
  // and returns JSON with posts.posts{id->{message,name,time_diff,votes}}.
  async getComments(url) {
    const target = this._targetUrl(url);
    if (!target) return [];
    const { body } = await this._get(target.replace(DefaultExtension.BASE_URL, ""));
    const videoId = (body.match(/"id_video"\s*:\s*(\d+)/) || [])[1];
    if (!videoId) {
      extLog("warn", "XNXX.getComments: no id_video in page, comments unavailable");
      return [];
    }
    const endpoint =
      `${DefaultExtension.BASE_URL}/threads/video-comments/get-posts/top/${videoId}/0/0`;
    let res;
    try {
      res = await new Client().get(endpoint, {
        ...this.getHeaders(endpoint),
        "Referer": this._absolute(target),
        "X-Requested-With": "XMLHttpRequest",
        "Accept": "application/json, text/javascript, */*; q=0.01"
      });
    } catch (error) {
      extLog("warn", `XNXX.getComments network failed error=${error.message}`);
      return [];
    }
    let data;
    try {
      data = JSON.parse(this._checkedBody(endpoint, res));
    } catch (error) {
      extLog("warn", `XNXX.getComments unreadable response error=${error.message}`);
      return [];
    }
    const posts = (data && data.posts && data.posts.posts) || {};
    const children = (data && data.posts && data.posts.children) || {};
    const order = (data && data.posts && data.posts.ids) || Object.keys(posts);

    // The thread endpoint returns a flat id→post map; replies carry their
    // parent id. Build the tree so the client can show nested answers instead
    // of a single flat list.
    const byId = {};
    const repliesOf = {};
    const roots = [];
    for (const id of order) {
      const post = posts[id];
      if (!post || !post.message) continue;
      const parent = post.id_parent || post.parent_id || post.parent || 0;
      const parentKey = parent && parent !== id ? String(parent) : null;
      byId[id] = { id, post, parentKey };
    }
    for (const id of Object.keys(byId)) {
      const node = byId[id];
      if (node.parentKey && byId[node.parentKey]) {
        (repliesOf[node.parentKey] = repliesOf[node.parentKey] || []).push(node);
      } else {
        roots.push(node);
      }
    }

    const build = (node, depth) => {
      const post = node.post;
      const votes = post.votes && typeof post.votes.nb === "number" ? post.votes.nb : 0;
      const rawMessage = this._decodeEntities(post.message);
      const item = {
        author: this._decodeEntities(post.name) || "Anonyme",
        avatar: post.avatar || post.profile_pic || post.user_avatar || "",
        content: rawMessage,
        date: post.time_diff || post.date || "",
        score: votes,
        replyCount: typeof children[node.id] === "number"
          ? children[node.id]
          : (repliesOf[node.id] || []).length
      };
      // Media embedded in the comment body (`<img src=…>`, `<video src=…>`).
      const images = [];
      const imageMatches = rawMessage.match(/<img[^>]+src=["']([^"']+)["']/gi) || [];
      for (const tag of imageMatches) {
        const src = (tag.match(/src=["']([^"']+)["']/i) || [])[1];
        if (src) images.push({ url: this._absolute(src), type: "image" });
      }
      const videoMatches = rawMessage.match(/<video[^>]+src=["']([^"']+)["']/gi) || [];
      for (const tag of videoMatches) {
        const src = (tag.match(/src=["']([^"']+)["']/i) || [])[1];
        if (src) images.push({ url: this._absolute(src), type: "video" });
      }
      if (images.length) item.images = images;
      if (depth < 6 && repliesOf[node.id]) {
        item.replies = repliesOf[node.id].map(child => build(child, depth + 1));
      }
      return item;
    };

    const items = roots.map(node => build(node, 0));
    extLog("info", `XNXX.getComments: ${items.length} thread(s) id=${videoId}`);
    return items.slice(0, 30);
  }
  // Normalises a recommendations/comments argument: plain URL or JSON payload.
  _targetUrl(url) {
    if (!url) return "";
    try {
      const payload = JSON.parse(url);
      if (payload && typeof payload === "object") {
        return payload.url || payload.link || "";
      }
    } catch (_) {}
    return String(url);
  }

  // The comments endpoint returns text already HTML-escaped (`An&oacute;nimo`,
  // `as&iacute;`). Watchtower renders the string verbatim, so decode the
  // entities the endpoint actually emits before handing the post back.
  _decodeEntities(value) {
    if (!value) return "";
    const named = {
      amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
      aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú",
      agrave: "à", egrave: "è", igrave: "ì", ograve: "ò", ugrave: "ù",
      acirc: "â", ecirc: "ê", icirc: "î", ocirc: "ô", ucirc: "û",
      auml: "ä", euml: "ë", iuml: "ï", ouml: "ö", uuml: "ü",
      ccedil: "ç", ntilde: "ñ", Aacute: "Á", Eacute: "É", Iacute: "Í",
      Oacute: "Ó", Uacute: "Ú", Ccedil: "Ç", Ntilde: "Ñ", hellip: "…",
      mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”"
    };
    return String(value)
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
        String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
      .replace(/&([a-z]+);/gi, (match, name) =>
        Object.prototype.hasOwnProperty.call(named, name) ? named[name] : match);
  }

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
          { type_name: "SelectOption", name: "Relevance", value: "default" },
          { type_name: "SelectOption", name: "Most viewed", value: "hits" },
          { type_name: "SelectOption", name: "Random", value: "random" }
        ]
      },
      {
        type_name: "SelectFilter",
        name: "Category",
        state: 0,
        values: DefaultExtension.CATEGORIES.map(([name]) => ({
          type_name: "SelectOption", name, value: name
        }))
      },
      {
        type_name: "SelectFilter",
        name: "Period",
        state: 0,
        values: [
          { type_name: "SelectOption", name: "Ever", value: "ever" },
          { type_name: "SelectOption", name: "Year", value: "year" },
          { type_name: "SelectOption", name: "Month", value: "month" }
        ]
      },
      {
        type_name: "SelectFilter",
        name: "Length",
        state: 0,
        values: [
          { type_name: "SelectOption", name: "All", value: "all" },
          { type_name: "SelectOption", name: "0 - 10 min", value: "0-10min" },
          { type_name: "SelectOption", name: "10 min +", value: "10min+" },
          { type_name: "SelectOption", name: "10 - 20 min", value: "10-20min" },
          { type_name: "SelectOption", name: "20 min +", value: "20min+" }
        ]
      },
      {
        type_name: "SelectFilter",
        name: "Video quality",
        state: 0,
        values: [
          { type_name: "SelectOption", name: "All", value: "all" },
          { type_name: "SelectOption", name: "720P +", value: "hd-only" },
          { type_name: "SelectOption", name: "1080P+", value: "fullhd" }
        ]
      },
      {
        type_name: "SelectFilter",
        name: "Viewed videos",
        state: 0,
        values: [
          { type_name: "SelectOption", name: "Show all", value: "show" },
          { type_name: "SelectOption", name: "Hide", value: "hide" }
        ]
      }
    ];
  }

  getSourcePreferences() {
    return [];
  }
}