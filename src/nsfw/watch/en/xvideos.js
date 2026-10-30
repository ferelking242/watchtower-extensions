const watchtowerSources = [{
  "name": "XVideos",
  "lang": "en",
  "baseUrl": "https://www.xvideos.com",
  "apiUrl": "",
  "iconUrl": "https://www.xvideos.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.1.0",
  "login": false,
  "forYou": false,
  "pkgPath": "nsfw/watch/en/xvideos.js",
  "notes": "Adult content (18+) — ZeusDL powered streaming",
  "isNsfw": true
}];

class DefaultExtension extends MProvider {
  static get BASE_URL() { return "https://www.xvideos.com"; }

  get supportsLatest() { return true; }

  getHeaders(url) {
    return {
      "Referer": `${DefaultExtension.BASE_URL}/`,
      "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,*/*;q=0.8",
      "Accept-Language": "en,en-US;q=0.8"
    };
  }

  // ── HTTP ─────────────────────────────────────────────────────────────────
  // Returns the response body as a string; every caller scrapes markup or
  // JSON from it. A 4xx/5xx is surfaced as an error so a section fails
  // visibly instead of rendering an empty rail from an error page.
  async _get(path) {
    const url = /^https?:/i.test(path)
      ? path
      : `${DefaultExtension.BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const status = Number(res && (res.statusCode || res.status));
    if (Number.isFinite(status) && status >= 400) {
      throw new Error(`XVideos returned HTTP ${status} for ${this._pathOf(url)}`);
    }
    return String((res && res.body) || "");
  }

  // ── Small helpers ────────────────────────────────────────────────────────
  _absolute(href) {
    const raw = String(href || "").replace(/\\\//g, "/").trim();
    if (!raw) return "";
    if (/^https?:/i.test(raw)) return raw;
    if (raw.startsWith("//")) return `https:${raw}`;
    return `${DefaultExtension.BASE_URL}${raw.startsWith("/") ? "" : "/"}${raw}`;
  }

  _pathOf(url) {
    try { return new URL(url, DefaultExtension.BASE_URL).pathname; } catch (_) { return url; }
  }

  _text(value) {
    return this._decodeEntities(String(value || "").replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
  }

  // XVideos serves titles with raw entities ("Mishell Morales&period;").
  // Leaving them encoded put "&period;" / "&ntilde;" straight into the detail
  // title and the download list.
  _decodeEntities(value) {
    const named = {
      amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ",
      period: ".", comma: ",", colon: ":", semi: ";", excl: "!",
      quest: "?", sol: "/", perc: "%", hash: "#", num: "#", dollar: "$",
      lowbar: "_", lpar: "(", rpar: ")", lsqb: "[", rsqb: "]",
      ldquo: "\u201C", rdquo: "\u201D", lsquo: "\u2018", rsquo: "\u2019",
      hellip: "\u2026", ndash: "\u2013", mdash: "\u2014", deg: "\u00B0",
      euro: "\u20AC", pound: "\u00A3", copy: "\u00A9", reg: "\u00AE",
      trade: "\u2122", times: "\u00D7", middot: "\u00B7", bull: "\u2022",
      eacute: "\u00E9", egrave: "\u00E8", agrave: "\u00E0", ccedil: "\u00E7",
      uuml: "\u00FC", ouml: "\u00F6", auml: "\u00E4", ntilde: "\u00F1",
      iexcl: "\u00A1", iquest: "\u00BF", szlig: "\u00DF", aacute: "\u00E1",
      iacute: "\u00ED", oacute: "\u00F3", uacute: "\u00FA",
    };
    return String(value || "")
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
      .replace(/&([a-z][a-z0-9]*);/gi, (match, name) =>
        Object.prototype.hasOwnProperty.call(named, name.toLowerCase())
          ? named[name.toLowerCase()]
          : match);
  }

  // The QuickJS bridge may not expose Buffer/atob, so encode paths by hand.
  _toHex(text) {
    let out = "";
    for (const char of String(text || "")) {
      out += char.codePointAt(0).toString(16).padStart(4, "0");
    }
    return out;
  }

  _fromHex(hex) {
    const raw = String(hex || "");
    if (!raw || raw.length % 4 !== 0 || !/^[0-9a-f]+$/i.test(raw)) return "";
    let out = "";
    for (let i = 0; i < raw.length; i += 4) {
      out += String.fromCodePoint(parseInt(raw.slice(i, i + 4), 16));
    }
    return out;
  }

  // Zero-based page suffix: logical page 1 is the bare route, page 2 is `/1`.
  _pageSuffix(page) {
    const logical = Number(page);
    if (!Number.isFinite(logical) || logical <= 1) return "";
    return `/${Math.floor(logical) - 1}`;
  }

  _hasNextPage(html) {
    if (/class=["'][^"']*\bnext-page\b/i.test(html)) return true;
    if (/\brel=["']next["']/i.test(html)) return true;
    // The best-of ranking paginates with numbered `data-page` links instead
    // of a "next" button, so a link to page 2+ is the only signal there.
    const pagination = /<div[^>]+class=["'][^"']*\bpagination\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i.exec(html);
    return !!(pagination && /data-page=["'][1-9]\d*["']/.test(pagination[1]));
  }

  _monthSlug(monthsAgo = 0) {
    const now = new Date();
    const total = now.getFullYear() * 12 + now.getMonth() - monthsAgo;
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
  }

  // ── Card extraction ──────────────────────────────────────────────────────
  // Every listing card carries either `id="video_<eid>"` (home/search) or
  // `id="video-thumb-<eid>"` (best-of/directory rails). Splitting the markup
  // on that id keeps parsing to a few regex passes instead of one blocking
  // DOM round-trip per node, which is what the QuickJS bridge charges for.
  _splitCards(html) {
    if (!html) return [];
    return String(html).split(/(?=<div[^>]+id=["']video[-_])/).slice(1);
  }

  _cardImage(block) {
    const clean = String(block || "").replace(/\\\//g, "/");
    const dataSrc = /\bdata-src=["']([^"']+)["']/i.exec(clean);
    let url = dataSrc ? dataSrc[1] : "";
    if (!url || /blank\.gif/i.test(url)) {
      const srcset = /\bdata-srcset=["']([^"']+)["']/i.exec(clean);
      if (srcset) url = srcset[1].split(",")[0].trim().split(/\s+/)[0];
    }
    if (!url || /blank\.gif/i.test(url)) {
      const payload = /\bdata-video=["']([^"']+)["']/i.exec(clean);
      if (payload) {
        try {
          const data = JSON.parse(payload[1]);
          url = data.sfwThumbUrl || data.mozaiqueListing || data.thumb || "";
        } catch (_) {}
      }
    }
    if (!url || /blank\.gif/i.test(url)) {
      const src = /\bsrc=["'](https?:[^"']+\.(?:jpg|jpeg|png|avif)[^"']*)["']/i.exec(clean);
      if (src) url = src[1];
    }
    return url ? this._absolute(url) : "";
  }

  // Directory/profile cards embed their listing as `prof-video-click` links
  // that only resolve to the video page; rewrite them to the canonical form.
  _normalizeVideoLink(link) {
    const match = /\/prof-video-click\/([^?#]+)/i.exec(String(link || ""));
    if (!match) return this._absolute(link);
    const parts = match[1].split("/").filter(Boolean);
    if (parts.length >= 2) {
      const eid = parts[parts.length - 2];
      const slug = parts[parts.length - 1];
      return `${DefaultExtension.BASE_URL}/video.${eid}/${slug}`;
    }
    return this._absolute(link);
  }

  _parseVideoCards(html) {
    const items = [];
    const seen = {};
    for (const block of this._splitCards(html)) {
      const href = /<a[^>]+href=["'](\/video\.[^"']+|\/prof-video-click\/[^"']+)["']/i.exec(block);
      if (!href) continue;
      const link = this._normalizeVideoLink(href[1]);
      if (!link || seen[link]) continue;
      seen[link] = true;
      const titleAttr = /<div[^>]+class=["'][^"']*\btitle\b[^"']*["'][^>]*\btitle=["']([^"']+)["']/i.exec(block)
        || /<a[^>]+\btitle=["']([^"']+)["']/i.exec(block)
        || /<img[^>]+\balt=["']([^"']*)["']/i.exec(block);
      const duration = /<span[^>]+class=["'][^"']*\bduration\b[^"']*["'][^>]*>([^<]*)</i.exec(block);
      const name = this._decodeEntities(titleAttr ? titleAttr[1] : "").trim();
      const dur = duration ? duration[1].trim() : "";
      items.push({
        name: name || "Untitled",
        imageUrl: this._cardImage(block),
        link,
        description: dur ? `Duration: ${dur}` : "",
      });
    }
    return items;
  }

  // ── Directory parsers ────────────────────────────────────────────────────
  // Pornstars / channels / verified profiles all render
  // `<div id="profile_<slug">` cards with a name, a cover and a video count.
  _normalizeProfileLink(href, kind) {
    let path = String(href || "");
    if (/^https?:/i.test(path)) {
      try { path = new URL(path).pathname; } catch (_) {}
    }
    // `/models/<slug>` is the same page as `/pornstars/<slug>`; the latter is
    // what the app's person screen recognises, so normalise to it.
    if (/^\/models\//i.test(path)) {
      path = `/pornstars/${path.slice("/models/".length)}`;
    }
    if (/^\/(pornstars|channels|profiles)\//i.test(path)) {
      return this._absolute(path);
    }
    if (/^\/[a-z0-9_.-]+$/i.test(path)) {
      return this._absolute(`/${kind === "channels" ? "channels" : "pornstars"}${path}`);
    }
    return this._absolute(path);
  }

  _parseProfileCards(html, kind) {
    const items = [];
    const seen = {};
    const blocks = String(html || "").split(/(?=<div[^>]+id=["']profile_)/).slice(1);
    for (const block of blocks) {
      const idMatch = /id=["']profile_([^"']+)["']/i.exec(block);
      const hrefMatch = /<a[^>]+href=["']([^"']+)["']/i.exec(block);
      if (!idMatch && !hrefMatch) continue;
      const link = this._normalizeProfileLink(hrefMatch ? hrefMatch[1] : "", kind);
      if (!link || seen[link]) continue;
      seen[link] = true;

      const nameBlock = (/<(?:p|span)[^>]+class=["'][^"']*profile-name[^"']*["'][^>]*>([\s\S]*?)<\/(?:p|span)>/i.exec(block) || [])[1] || "";
      const nameAnchor = (/<a[^>]*>([\s\S]*?)<\/a>/i.exec(nameBlock) || [])[1];
      const name = this._text(nameAnchor || nameBlock);

      const countBlock = (/<p[^>]+class=["'][^"']*profile-counts[^"']*["'][^>]*>([\s\S]*?)<\/p>/i.exec(block) || [])[1] || "";
      const count = this._text(countBlock);

      const clean = block.replace(/\\\//g, "/");
      const portrait = /(https?:\/\/[^"'\s<>]+pp_big\.(?:jpg|jpeg|png|avif)[^"'\s<>]*)/i.exec(clean);
      const still = /(https?:\/\/[^"'\s<>]+xv_\d+_t\.(?:jpg|jpeg|png|avif)[^"'\s<>]*)/i.exec(clean);
      const imageUrl = portrait ? this._absolute(portrait[1]) : (still ? this._absolute(still[1]) : "");

      items.push({
        name: name || (idMatch ? idMatch[1] : "Profile"),
        imageUrl,
        link,
        description: count || "Browse videos",
      });
    }
    return items;
  }

  // `/tags` returns the whole index in one page; slice it so the "see all"
  // grid can page through it without a second network shape.
  static get TAG_PAGE_SIZE() { return 120; }

  _parseTags(html) {
    const items = [];
    const seen = {};
    const scope = /<ul[^>]*\bid=["']tags["'][^>]*>([\s\S]*?)<\/ul>/i.exec(String(html || ""));
    const region = scope ? scope[1] : String(html || "");
    const rowRe = /<li>\s*<a\s+href=["'](\/tags\/[^"']+)["']><b>([\s\S]*?)<\/b>\s*<span[^>]*class=["'][^"']*navbadge[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi;
    let match;
    while ((match = rowRe.exec(region))) {
      const link = this._absolute(match[1]);
      if (seen[link]) continue;
      seen[link] = true;
      const name = this._text(match[2]);
      if (!name) continue;
      const count = this._text(match[3]);
      const slug = match[1].slice("/tags/".length).split(/[/?#]/)[0];
      items.push({
        name,
        imageUrl: "",
        link,
        collectionId: `tag_${slug}`,
        description: count ? `${count} videos` : "Browse videos",
      });
    }
    return items;
  }

  _parseCategories(html) {
    const items = [];
    const seen = {};
    const scope = /<ul[^>]*\bid=["']main-cats-sub-list["'][^>]*>([\s\S]*?)<\/ul>/i.exec(String(html || ""));
    const region = scope ? scope[1] : "";
    const re = /<a[^>]+href=["'](\/c\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = re.exec(region))) {
      const link = this._absolute(match[1]);
      if (seen[link]) continue;
      seen[link] = true;
      const name = this._text(match[2]);
      if (!name) continue;
      const slug = match[1].slice("/c/".length).split(/[/?#]/)[0];
      items.push({
        name,
        imageUrl: "",
        link,
        collectionId: `category_${slug}`,
        description: "Browse category",
      });
    }
    return items;
  }

  // ── Profile video listing (JSON) ─────────────────────────────────────────
  // Profile pages ship an empty video grid; the cards come from
  // `/<kind>/<slug>/videos/best/<page0>` as `{ videos, nb_videos }`, where
  // `videos` is sometimes an array and sometimes a sparse object.
  _profileListPath(url, page) {
    const segments = this._pathOf(url).split("/").filter(Boolean);
    const kind = /^(pornstars|channels|profiles|models)$/i.test(segments[0] || "")
      ? segments[0]
      : "pornstars";
    const slug = segments[1] || "";
    const index = Math.max(0, (Number(page) || 1) - 1);
    return `/${kind}/${slug}/videos/best/${index}`;
  }

  _parseProfileVideosJson(body) {
    let payload;
    try { payload = JSON.parse(body || "{}"); } catch (_) { return null; }
    const raw = payload && payload.videos;
    const rows = Array.isArray(raw) ? raw : (raw && typeof raw === "object" ? Object.values(raw) : []);
    const items = [];
    const seen = {};
    for (const video of rows) {
      if (!video) continue;
      const eid = String(video.eid || "").trim();
      if (!eid) continue;
      const name = this._decodeEntities(String(video.tf || video.t || "").trim()).replace(/\s+/g, " ");
      const slug = String(video.u || "").split("/").filter(Boolean).pop() || "video";
      const link = `${DefaultExtension.BASE_URL}/video.${eid}/${slug}`;
      if (seen[link]) continue;
      seen[link] = true;
      const duration = String(video.d || "").trim();
      items.push({
        name: name || "Untitled",
        imageUrl: this._absolute(video.i || video.il || video.if || video.ip || ""),
        previewUrl: this._absolute(video.ipu || ""),
        link,
        description: duration ? `Duration: ${duration}` : "",
      });
    }
    const total = Number(payload && payload.nb_videos) || 0;
    const perPage = Number(payload && payload.nb_per_page) || items.length || 1;
    const current = Number(payload && payload.current_page) || 0;
    const hasNextPage = total > 0 && (current + 1) * perPage < total;
    return { list: items, hasNextPage };
  }

  // ── Listing endpoints ────────────────────────────────────────────────────
  // `/best/<month>` is the monthly popularity ranking; it is the only
  // genuinely ranked feed XVideos exposes anonymously.
  async _bestOfMonth(month, page) {
    const html = await this._get(`/best/${month}${this._pageSuffix(page)}`);
    const items = this._parseVideoCards(html);
    return { list: items, hasNextPage: items.length > 0 && this._hasNextPage(html) };
  }

  async _videoListing(path, page) {
    const html = await this._get(`${path}${this._pageSuffix(page)}`);
    const items = this._parseVideoCards(html);
    return { list: items, hasNextPage: items.length > 0 && this._hasNextPage(html) };
  }

  async _tagsPage(page) {
    const html = await this._get("/tags");
    const all = this._parseTags(html);
    const size = DefaultExtension.TAG_PAGE_SIZE;
    const index = Math.max(1, Number(page) || 1) - 1;
    const start = index * size;
    return { list: all.slice(start, start + size), hasNextPage: start + size < all.length };
  }

  async _profilePage(path, page) {
    const body = await this._get(this._profileListPath(path, page));
    return this._parseProfileVideosJson(body) || { list: [], hasNextPage: false };
  }

  // ── Standard catalogue methods ───────────────────────────────────────────
  async getPopular(page) {
    const ranked = await this._bestOfMonth(this._monthSlug(0), page);
    if (ranked.list.length) return ranked;
    // Early in a month the current best-of is still empty; fall back to the
    // curated home feed so the section never renders blank.
    const html = await this._get("/");
    return { list: this._parseVideoCards(html), hasNextPage: false };
  }

  // XVideos' "Newest" tab IS the home route; `/new/1` is page 2, `/new/2`
  // page 3 and `/new/` 404s. The previous mapping sent page 1 to `/new/1`
  // and skipped the newest page entirely.
  async getLatestUpdates(page) {
    const logical = Math.max(1, Number(page) || 1);
    const path = logical <= 1 ? "/" : `/new/${logical - 1}`;
    const html = await this._get(path);
    const items = this._parseVideoCards(html);
    return { list: items, hasNextPage: items.length > 0 && this._hasNextPage(html) };
  }

  async search(query, page, filters) {
    const q = encodeURIComponent(String(query || "").trim());
    const html = await this._get(`/?k=${q}&p=${Math.max(0, (Number(page) || 1) - 1)}`);
    const items = this._parseVideoCards(html);
    return { list: items, hasNextPage: items.length > 0 && this._hasNextPage(html) };
  }

  // ── Detail ───────────────────────────────────────────────────────────────
  _isProfileUrl(url) {
    const path = this._pathOf(url);
    if (/\/videos?\//i.test(path)) return false;
    return /^\/(pornstars|channels|profiles|models)\/[^/]+\/?$/i.test(path);
  }

  _ogContent(html, property) {
    const pattern = new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, "i",
    );
    const reversed = new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, "i",
    );
    const match = pattern.exec(html) || reversed.exec(html);
    return match ? match[1] : "";
  }

  async _videoDetail(url) {
    const body = await this._get(url);
    const title = this._decodeEntities(this._ogContent(body, "og:title")).trim();
    const image = this._ogContent(body, "og:image");
    const duration = Number(this._ogContent(body, "og:duration")) || 0;

    const tags = [];
    const tagJson = /"video_tags":\s*\[([^\]]*)\]/i.exec(body);
    if (tagJson) {
      for (const match of tagJson[1].matchAll(/"([^"]+)"/g)) {
        if (match[1]) tags.push({ name: this._decodeEntities(match[1]).trim() });
      }
    }
    const minutes = duration > 0 ? Math.round(duration / 60) : 0;
    return {
      name: title || "XVideos",
      imageUrl: image ? this._absolute(image) : "",
      description: minutes ? `${minutes} min` : "",
      genre: tags,
      episodes: [{ name: title || "Watch", url }],
    };
  }

  async _profileDetail(url) {
    const body = await this._get(url);
    // Pornstar/channel pages carry neither `og:title` nor `og:image`; the
    // display name and portrait live in the page's profile JSON config.
    const display = /"display":\s*"([^"]+)"/i.exec(body);
    const pageTitle = /<title>([^<]*)<\/title>/i.exec(body);
    const name = this._decodeEntities(
      display ? display[1] : (pageTitle ? pageTitle[1] : ""),
    )
      .replace(/\s*[-|]\s*(Profile|Pornstar|Channel) page.*$/i, "")
      .replace(/\s*[-|]\s*XVIDEOS.*$/i, "")
      .trim();
    const image = this._ogContent(body, "og:image");
    const portrait = /"profile_picture":\s*"([^"]+)"/i.exec(body)
      || /"profile_picture_small":\s*"([^"]+)"/i.exec(body);
    const cover = portrait
      ? this._absolute(portrait[1].replace(/\\\//g, "/"))
      : (image ? this._absolute(image) : "");
    const listing = await this._profilePage(url, 1);
    const videos = listing.list || [];
    return {
      name: name || "Profile",
      imageUrl: cover || (videos[0] ? videos[0].imageUrl : ""),
      description: videos.length ? `${videos.length}+ videos` : "Profile",
      genre: [],
      episodes: videos.map((video) => ({
        name: video.name,
        url: video.link,
        thumbnailUrl: video.imageUrl,
        duration: (video.description || "").replace(/^Duration:\s*/, ""),
      })),
    };
  }

  async getDetail(url) {
    const clean = String(url || "").split("#")[0].split("?")[0];
    if (this._isProfileUrl(clean)) return this._profileDetail(clean);
    return this._videoDetail(clean);
  }

  // ── Playback ─────────────────────────────────────────────────────────────
  // XVideos exposes an HLS master plus MP4 fallbacks from
  // `/html5player/getvideo/<eid>/<cdn>`. On many videos `mp4_high` and
  // `mp4_low` are the SAME `mp4_sd.mp4` URL, so labelling them "HD"/"SD"
  // offered two identical entries; dedupe by URL and name from the file.
  _mp4Quality(url) {
    const text = String(url);
    const match = text.match(/(\d{3,4})p/i);
    if (match) return `${match[1]}p`;
    if (/mp4_hd/i.test(text)) return "MP4 HD";
    if (/mp4_sd/i.test(text)) return "MP4 SD";
    return "MP4";
  }

  async getVideoList(url) {
    const headers = this.getHeaders(url);
    const body = await this._get(url);
    const videos = [];
    const seen = {};

    const push = (videoUrl, quality) => {
      const clean = String(videoUrl || "").trim();
      if (!clean || seen[clean]) return;
      seen[clean] = true;
      videos.push({ url: clean, quality, originalUrl: clean, headers });
    };

    const encodedId = /setEncodedIdVideo\(['"]([^'"]+)['"]\)/.exec(body);
    const cdnId = /setIdCdnHLS\(['"]?([^'")]+)['"]?\)/.exec(body)
      || /setIdCDN\(['"]?([^'")]+)['"]?\)/.exec(body);

    if (encodedId && cdnId) {
      try {
        const rpc = await this._get(`/html5player/getvideo/${encodedId[1]}/${cdnId[1]}`);
        const data = JSON.parse(rpc || "{}");
        if (data.hls) push(data.hls, "Auto (HLS)");
        if (data.mp4_high) push(data.mp4_high, this._mp4Quality(data.mp4_high));
        if (data.mp4_low) push(data.mp4_low, this._mp4Quality(data.mp4_low));
      } catch (error) {
        extLog("warn", `XVideos player RPC failed, using page fallback: ${error.message}`);
      }
    }

    if (!videos.length) {
      const hls = /setVideoHLS\(['"]([^'"]+)['"]\)/.exec(body);
      const high = /setVideoUrlHigh\(['"]([^'"]+)['"]\)/.exec(body);
      const low = /setVideoUrlLow\(['"]([^'"]+)['"]\)/.exec(body);
      if (hls) push(hls[1], "Auto (HLS)");
      if (high) push(high[1], this._mp4Quality(high[1]));
      if (low) push(low[1], this._mp4Quality(low[1]));
    }

    return videos;
  }

  async getPageList(url) { return []; }

  getFilterList() { return []; }

  getSourcePreferences() { return []; }

  // ── Custom lists (home layout + directory pages) ─────────────────────────
  async getCustomList(listId, page) {
    const id = String(listId || "");

    if (id === "latest") return this.getLatestUpdates(page);
    if (id === "popular") return this.getPopular(page);

    if (id === "top" || id === "best") {
      return this._bestOfMonth(this._monthSlug(0), page);
    }
    if (id === "best_previous") {
      return this._bestOfMonth(this._monthSlug(1), page);
    }

    // Actresses / pornstars directory.
    if (id === "pornstars" || id === "actresses") {
      const html = await this._get(`/pornstars-index${this._pageSuffix(page)}`);
      const items = this._parseProfileCards(html, "pornstars");
      return { list: items, hasNextPage: items.length > 0 && this._hasNextPage(html) };
    }

    // Studios are XVideos channels; `/channels-index` is their directory.
    if (id === "studios" || id === "channels") {
      const html = await this._get(`/channels-index${this._pageSuffix(page)}`);
      const items = this._parseProfileCards(html, "channels");
      return { list: items, hasNextPage: items.length > 0 && this._hasNextPage(html) };
    }

    if (id === "tags") return this._tagsPage(page);

    if (id === "categories" || id === "category") {
      const html = await this._get("/");
      return { list: this._parseCategories(html), hasNextPage: false };
    }

    // `tag_<slug>` — one tag's video listing, zero-based pages.
    if (id.startsWith("tag_")) {
      const slug = id.slice("tag_".length);
      if (!slug) return { list: [], hasNextPage: false };
      return this._videoListing(`/tags/${slug}`, page);
    }

    // `category_<slug>` — one category's video listing.
    if (id.startsWith("category_")) {
      const slug = id.slice("category_".length);
      if (!slug) return { list: [], hasNextPage: false };
      return this._videoListing(`/c/${slug}`, page);
    }

    // `profile_<hex of the profile path>` — the person screen pages a profile
    // listing with the same JSON endpoint the first page uses.
    if (id.startsWith("profile_")) {
      const path = this._fromHex(id.slice("profile_".length));
      if (!path || !/^\/(pornstars|channels|profiles|models)\//i.test(path)) {
        return { list: [], hasNextPage: false };
      }
      return this._profilePage(path, page);
    }

    return this.getPopular(page);
  }
}
