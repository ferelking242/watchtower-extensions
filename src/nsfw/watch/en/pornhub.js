const watchtowerSources = [{
  "name": "PornHub",
  "lang": "en",
  "baseUrl": "https://www.pornhub.com",
  "apiUrl": "",
  "iconUrl": "https://www.pornhub.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.5",
  "pkgPath": "nsfw/watch/en/pornhub.js",
  "notes": "Adult content (18+) — native HLS/MP4 quality extraction",
  "isNsfw": true
}];

class DefaultExtension extends MProvider {
  static get BASE_URL() {
    return "https://www.pornhub.com";
  }

  static get USER_AGENT() {
    return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  }

  get supportsLatest() {
    return true;
  }

  _pref(key, fallback) {
    const prefs = this.source && this.source.prefs;
    if (!Array.isArray(prefs)) return fallback;
    const found = prefs.find((pref) => pref && pref.key === key);
    return found && found.value !== undefined && found.value !== null && found.value !== ""
      ? String(found.value)
      : fallback;
  }

  get preferredQuality() {
    return this._pref("preferred_quality", "auto").toLowerCase();
  }

  getHeaders(url) {
    return {
      "Referer": url || `${DefaultExtension.BASE_URL}/`,
      "User-Agent": DefaultExtension.USER_AGENT,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.8",
      "Cookie": "accessAgeDisclaimerPH=1; platform=pc"
    };
  }

  async _get(url) {
    const response = await new Client().get(url, this.getHeaders(url));
    if (!response || typeof response.body !== "string") {
      throw new Error("PornHub returned an invalid response");
    }
    if (response.statusCode && (response.statusCode < 200 || response.statusCode >= 400)) {
      throw new Error(`PornHub request failed with HTTP ${response.statusCode}`);
    }
    return response.body;
  }

  _absolute(value) {
    const href = String(value || "").trim();
    if (!href) return "";
    if (/^https?:\/\//i.test(href)) return href;
    return `${DefaultExtension.BASE_URL}${href.startsWith("/") ? href : `/${href}`}`;
  }

  _text(element) {
    return element && typeof element.text === "string"
      ? element.text.replace(/\s+/g, " ").trim()
      : "";
  }

  _cleanUrl(value) {
    return String(value || "")
      .replace(/\\u0026/g, "&")
      .replace(/\\\//g, "/")
      .replace(/&amp;/g, "&")
      .trim();
  }

  _hasNextPage(doc, page, items) {
    if (items.length === 0 || page >= 50) return false;
    for (const anchor of doc.select("a[rel='next'], .pagination a, .pagination3 a, .paginationGated a")) {
      const href = anchor.attr("href") || "";
      if (anchor.attr("rel") === "next") return true;
      const match = href.match(/[?&]page=(\d+)/);
      if (match && Number(match[1]) > page) return true;
    }
    return items.length >= 20;
  }

  _parseList(html, page) {
    const doc = new Document(html);
    const items = [];
    const seen = {};
    const cards = doc.select("li.pcVideoListItem, .videoBox");

    for (const card of cards) {
      const anchor = card.selectFirst("a[href*='/view_video.php']");
      if (!anchor) continue;

      const link = this._absolute(anchor.attr("href"));
      if (!link || seen[link]) continue;
      seen[link] = true;

      const title = anchor.attr("title") ||
        card.selectFirst(".title a")?.text ||
        card.selectFirst("img")?.attr("alt") ||
        "Untitled";
      const image = card.selectFirst("img");
      const thumbnail = this._cleanUrl(
        image?.attr("data-image") ||
        image?.attr("data-src") ||
        image?.attr("src") ||
        image?.attr("data-mediabook")
      );
      const duration = this._text(
        card.selectFirst(".videoDuration, .duration, .videoDurationText")
      );

      // `link` is the Watchtower card contract. `url` keeps the repository
      // smoke-test harness and older clients compatible without changing the
      // native app payload.
      items.push({
        name: String(title).replace(/\s+/g, " ").trim(),
        imageUrl: thumbnail,
        link,
        url: link,
        description: duration ? `Duration: ${duration}` : ""
      });
    }

    return {
      list: items,
      hasNextPage: this._hasNextPage(doc, page, items)
    };
  }

  async _list(order, page) {
    const url = `${DefaultExtension.BASE_URL}/video?o=${order}&page=${page}`;
    return this._parseList(await this._get(url), page);
  }

  async getPopular(page) {
    return this._list("mv", page);
  }

  async getLatestUpdates(page) {
    return this._list("n", page);
  }

  async search(query, page) {
    const value = String(query || "").trim();
    if (!value) return this.getPopular(page);
    const url = `${DefaultExtension.BASE_URL}/video/search?search=${encodeURIComponent(value)}&page=${page}`;
    return this._parseList(await this._get(url), page);
  }

  _meta(doc, property) {
    return this._cleanUrl(doc.selectFirst(`meta[property='${property}']`)?.attr("content"));
  }

  _extractFlashvars(html) {
    const match = String(html || "").match(/var\s+flashvars_\d+\s*=\s*(\{[\s\S]*?\});/);
    if (!match) return null;
    try {
      return JSON.parse(match[1]);
    } catch (_) {
      return null;
    }
  }

  async getDetail(url) {
    const html = await this._get(url);
    const doc = new Document(html);
    const title = this._meta(doc, "og:title") ||
      this._text(doc.selectFirst("h1.title, h1.page-title")) ||
      "PornHub video";
    const imageUrl = this._meta(doc, "og:image");
    const description = this._meta(doc, "og:description") ||
      this._text(doc.selectFirst(".video-description, .description, .infoWrapper"));
    const genre = [];
    const seenTags = {};

    for (const tag of doc.select(".tagsWrapper a, .categoriesWrapper a, .categoriesWrap a")) {
      const name = this._text(tag);
      if (name && !seenTags[name.toLowerCase()]) {
        seenTags[name.toLowerCase()] = true;
        genre.push(name);
      }
    }

    const chapter = {
      name: title,
      url,
      thumbnailUrl: imageUrl,
      description
    };

    return {
      name: title,
      link: url,
      imageUrl,
      description,
      genre,
      chapters: [chapter],
      // `episodes` is accepted by Watchtower for backwards compatibility.
      episodes: [chapter]
    };
  }

  _videoQuality(video) {
    const raw = Array.isArray(video.quality) ? "" : String(video.quality || "");
    if (raw && /^\d+$/.test(raw)) return `${raw}p`;
    if (raw) return raw.toLowerCase().includes("p") ? raw : raw;
    return String(video.format || "Auto").toLowerCase() === "mp4"
      ? "Direct"
      : "Auto";
  }

  _qualityScore(video) {
    const quality = this._videoQuality(video).toLowerCase();
    const preferred = this.preferredQuality;
    if (preferred === "auto") {
      return quality.includes("hls") ? 0 : quality.includes("mp4") ? 1 : 2;
    }
    if (quality.includes(preferred)) return 0;
    const pixels = Number((quality.match(/(\d{3,4})p?/) || [])[1] || 0);
    return 10000 - pixels;
  }

  async getVideoList(url) {
    const html = await this._get(url);
    const headers = this.getHeaders(url);
    const definitions = this._extractFlashvars(html)?.mediaDefinitions;
    const videos = [];
    const seen = {};

    if (Array.isArray(definitions)) {
      for (const definition of definitions) {
        const mediaUrl = this._cleanUrl(definition && definition.videoUrl);
        if (!mediaUrl || seen[mediaUrl]) continue;
        seen[mediaUrl] = true;
        const format = String(definition.format || "").toLowerCase();
        const quality = this._videoQuality(definition);
        videos.push({
          url: mediaUrl,
          quality: format === "hls" ? `${quality} · HLS` : `${quality} · MP4`,
          originalUrl: mediaUrl,
          headers,
          _defaultQuality: !!definition.defaultQuality
        });
      }
    }

    // Social metadata is a useful fallback when PornHub serves a reduced page
    // without the player flashvars block.
    if (videos.length === 0) {
      const doc = new Document(html);
      for (const meta of doc.select("meta[property='og:video'], meta[property='og:video:secure_url'], meta[name='twitter:player:stream']")) {
        const mediaUrl = this._cleanUrl(meta.attr("content"));
        if (!mediaUrl || !/\.mp4(?:[?#]|$)/i.test(mediaUrl) || seen[mediaUrl]) continue;
        seen[mediaUrl] = true;
        videos.push({ url: mediaUrl, quality: "240p · MP4", originalUrl: mediaUrl, headers });
      }
    }

    videos.sort((a, b) => {
      if (this.preferredQuality === "auto" && a._defaultQuality !== b._defaultQuality) {
        return a._defaultQuality ? -1 : 1;
      }
      return this._qualityScore(a) - this._qualityScore(b);
    });
    for (const video of videos) delete video._defaultQuality;
    return videos;
  }

  async getCustomList(listId, page) {
    if (listId === "trending") return this._list("ht", page);
    if (listId === "new") return this._list("n", page);
    if (listId === "catalogue") return this._list("mv", page);
    return this.getPopular(page);
  }

  async getPageList() {
    return [];
  }

  getFilterList() {
    return [];
  }

  getSourcePreferences() {
    return [{
      key: "preferred_quality",
      listPreference: {
        title: "Preferred quality",
        summary: "Quality placed first in the player.",
        valueIndex: 0,
        entries: ["Auto (HLS)", "1080p", "720p", "480p", "240p"],
        entryValues: ["auto", "1080", "720", "480", "240"]
      }
    }];
  }
}