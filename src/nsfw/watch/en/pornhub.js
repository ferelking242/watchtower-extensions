const watchtowerSources = [{
  "name": "PornHub",
  "lang": "en",
  "baseUrl": "https://www.pornhub.com",
  "apiUrl": "",
  "iconUrl": "https://www.pornhub.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.1.0",
  "pkgPath": "nsfw/watch/en/pornhub.js",
  "notes": "Adult content (18+) — native HLS/MP4 quality extraction",
  "isNsfw": true
}];

const PORNHUB_CATEGORIES = [
  ["Amateur", "amateur"],
  ["Anal", "anal"],
  ["Asian", "asian"],
  ["BBW", "bbw"],
  ["Blonde", "blonde"],
  ["Brunette", "brunette"],
  ["Couples", "couples"],
  ["Lesbian", "lesbian"],
  ["Mature", "mature"],
  ["MILF", "milf"],
  ["POV", "pov"],
  ["Solo", "solo"],
];

const PORNHUB_TAGS = [
  ["Trending", "trending"],
  ["Amateur", "amateur"],
  ["Public", "public"],
  ["POV", "pov"],
  ["Couples", "couples"],
  ["Mature", "mature"],
  ["Lesbian", "lesbian"],
  ["ASMR", "asmr"],
];

const PORNHUB_LANGUAGES = [
  ["English", "english"],
  ["Spanish", "spanish"],
  ["French", "french"],
  ["German", "german"],
  ["Italian", "italian"],
  ["Portuguese", "portuguese"],
  ["Japanese", "japanese"],
  ["Korean", "korean"],
];

const PORNHUB_PLAYLISTS = [
  ["Popular playlists", "popular"],
  ["New playlists", "new"],
  ["Recommended playlists", "recommended"],
];

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

  _decodeHtml(value) {
    return String(value || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, "\"")
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&#x2F;|&#47;/gi, "/")
      .replace(/\s+/g, " ")
      .trim();
  }

  _htmlAttribute(html, name) {
    const expression = new RegExp(
      `${name}\\s*=\\s*["']([^"']+)["']`,
      "i"
    );
    const match = String(html || "").match(expression);
    return match ? this._cleanUrl(match[1]) : "";
  }

  _fallbackList(html, page) {
    const source = String(html || "");
    const items = [];
    const seen = {};
    const cardPatterns = [
      /<li\b[^>]*class=["'][^"']*pcVideoListItem[^"']*["'][\s\S]*?<\/li>/gi,
      /<div\b[^>]*class=["'][^"']*videoBox[^"']*["'][\s\S]*?<\/div>/gi
    ];

    for (const cardPattern of cardPatterns) {
      let cardMatch;
      while ((cardMatch = cardPattern.exec(source)) !== null) {
        const card = cardMatch[0];
        const hrefMatch = card.match(/href\s*=\s*["']([^"']*\/view_video\.php[^"']*)["']/i);
        if (!hrefMatch) continue;
        const link = this._absolute(hrefMatch[1]);
        if (!link || seen[link]) continue;

        const titleMatch = card.match(/title\s*=\s*["']([^"']+)["']/i);
        const imageMatch = card.match(
          /(?:data-image|data-src|data-mediabook|src)\s*=\s*["']([^"']+)["']/i
        );
        const durationMatch = card.match(
          /class=["'][^"']*(?:videoDuration|duration|videoDurationText)[^"']*["'][^>]*>([\s\S]*?)<\//
        );
        const title = this._decodeHtml(titleMatch ? titleMatch[1] : "") || "Untitled";
        const thumbnail = this._cleanUrl(imageMatch ? imageMatch[1] : "");
        const duration = this._decodeHtml(durationMatch ? durationMatch[1] : "");

        seen[link] = true;
        items.push({
          name: title,
          imageUrl: thumbnail,
          link,
          url: link,
          description: duration ? `Duration: ${duration}` : ""
        });
      }
    }

    return {
      list: items,
      hasNextPage: items.length >= 20 && page < 50
    };
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

    if (items.length === 0) {
      return this._fallbackList(html, page);
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

  async _listPath(path, page) {
    const separator = path.includes("?") ? "&" : "?";
    const url = `${DefaultExtension.BASE_URL}${path}${separator}page=${page}`;
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
    const source = String(html || "");
    const startMatch = source.match(/var\s+flashvars_\d+\s*=\s*/);
    if (!startMatch) return null;

    const start = source.indexOf("{", startMatch.index + startMatch[0].length);
    if (start < 0) return null;

    let depth = 0;
    let quote = "";
    let escaped = false;
    let end = -1;
    for (let i = start; i < source.length; i += 1) {
      const char = source[i];
      if (quote) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === quote) {
          quote = "";
        }
        continue;
      }
      if (char === "\"" || char === "'") {
        quote = char;
      } else if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    if (end < 0) return null;

    try {
      return JSON.parse(source.slice(start, end));
    } catch (_) {
      return null;
    }
  }

  _firstHtmlText(html, pattern) {
    const match = String(html || "").match(pattern);
    return match ? this._decodeHtml(match[1]) : "";
  }

  async getDetail(url) {
    const html = await this._get(url);
    const doc = new Document(html);
    const title = this._meta(doc, "og:title") ||
      this._text(doc.selectFirst("h1.title, h1.page-title")) ||
      this._firstHtmlText(html, /<h1\b[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) ||
      this._firstHtmlText(html, /<title[^>]*>([\s\S]*?)<\/title>/i) ||
      "PornHub video";
    const flashvars = this._extractFlashvars(html);
    const imageUrl = this._meta(doc, "og:image") ||
      this._cleanUrl(flashvars?.image_url) ||
      this._firstHtmlText(
        html,
        /<meta\b[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["'][^>]*>/i
      );
    const description = this._meta(doc, "og:description") ||
      this._text(doc.selectFirst(".video-description, .description, .infoWrapper")) ||
      this._firstHtmlText(
        html,
        /<meta\b[^>]*(?:property|name)=["'](?:og:description|description)["'][^>]*content=["']([^"']+)["'][^>]*>/i
      );
    const genre = [];
    const seenTags = {};

    for (const tag of doc.select(".tagsWrapper a, .categoriesWrapper a, .categoriesWrap a")) {
      const name = this._text(tag);
      if (name && !seenTags[name.toLowerCase()]) {
        seenTags[name.toLowerCase()] = true;
        genre.push(name);
      }
    }
    if (genre.length === 0) {
      const tagPattern = /<a\b[^>]*href=["'][^"']*(?:\/search\/|\/tag\/|\/categories\/)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
      let tagMatch;
      while ((tagMatch = tagPattern.exec(html)) !== null) {
        const name = this._decodeHtml(tagMatch[1]);
        if (name && !seenTags[name.toLowerCase()] && name.length < 80) {
          seenTags[name.toLowerCase()] = true;
          genre.push(name);
        }
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

  _collectionItem(name, path, imageUrl, description) {
    const link = this._absolute(path);
    return {
      name,
      imageUrl: imageUrl || "",
      link,
      url: link,
      description: description || "",
      metadata: { collection: true }
    };
  }

  async _collectionItems(definitions, page) {
    const coverSource = await this._list("mv", 1);
    const covers = coverSource.list || [];
    return definitions.map(([name, slug], index) => {
      const cover = covers[index % Math.max(covers.length, 1)]?.imageUrl || "";
      return this._collectionItem(
        name,
        `/video/search?search=${encodeURIComponent(slug)}`,
        cover,
        "Browse videos"
      );
    });
  }

  async getCustomList(listId, page) {
    if (listId === "recommended") return this._list("tr", page);
    if (listId === "trending") return this._list("ht", page);
    if (listId === "top") return this._list("mv", page);
    if (listId === "new") return this._list("n", page);
    if (listId === "shorts") return this._listPath("/shorties", page);
    if (listId === "catalogue") return this._list("mv", page);

    if (listId === "categories") {
      return {
        list: await this._collectionItems(PORNHUB_CATEGORIES, page),
        hasNextPage: false
      };
    }
    if (listId === "tags") {
      return {
        list: await this._collectionItems(PORNHUB_TAGS, page),
        hasNextPage: false
      };
    }
    if (listId === "languages") {
      return {
        list: PORNHUB_LANGUAGES.map(([name, slug]) =>
          this._collectionItem(
            name,
            `/language/${slug}`,
            "",
            "Browse videos in this language"
          )
        ),
        hasNextPage: false
      };
    }
    if (listId === "playlists") {
      return {
        list: await this._collectionItems(PORNHUB_PLAYLISTS, page),
        hasNextPage: false
      };
    }

    if (listId.startsWith("category_")) {
      const category = listId.slice("category_".length);
      return this._listPath(`/video/search?search=${encodeURIComponent(category)}`, page);
    }
    if (listId.startsWith("tag_")) {
      const tag = listId.slice("tag_".length);
      return this._listPath(`/video/search?search=${encodeURIComponent(tag)}`, page);
    }
    if (listId.startsWith("language_")) {
      return this._listPath(`/language/${listId.slice("language_".length)}`, page);
    }
    if (listId.startsWith("playlist_")) {
      return this._listPath(`/video?o=${listId.slice("playlist_".length)}`, page);
    }

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