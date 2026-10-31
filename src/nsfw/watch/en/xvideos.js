const watchtowerSources = [{
  "name": "XVideos",
  "lang": "en",
  "baseUrl": "https://www.xvideos.com",
  "apiUrl": "",
  "iconUrl": "https://www.xvideos.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.3.3",
  "login": false,
  "forYou": false,
  "pkgPath": "nsfw/watch/en/xvideos.js",
  "notes": "Adult content (18+) — ZeusDL powered streaming",
  "isNsfw": true
}];

class DefaultExtension extends MProvider {
  static get BASE_URL() { return "https://www.xvideos.com"; }
  // XVideos is published under country mirrors that serve the exact same
  // markup and share the media CDN. On many EU networks (and through the app's
  // Cloudflare worker proxy, which answers the canonical host with a tiny
  // "Please visit https://www.xvideos.com" stub) the canonical host returns an
  // empty block page, so every rail, tag, category and search result came back
  // empty. The mirrors are used as fallback transports below.
  static get MIRRORS() {
    return ["https://www.xvideos.es", "https://fr.xvideos.com"];
  }
  // Cloudflare Worker that forwards a request and answers
  // `{statusCode, headers, body}` (the same contract the web build relies on).
  static get PROXY_URL() {
    return "https://watchtower-proxy.aivos-dev.workers.dev/proxy";
  }

  // Per-transport HTTP budget. The app client defaults to a 60 s request
  // timeout, which is longer than the 40 s execution budget the caller allows
  // for `search`: a single blackholed host (the canonical one is unreachable on
  // some networks) swallowed the whole budget before a mirror was ever tried,
  // and the call died as "TIMEOUT after 40014ms" with zero results. Bounding
  // each hop means a dead host costs a few seconds and the mirrors still get
  // their turn.
  static get REQUEST_TIMEOUT() { return 10; }
  static get CONNECT_TIMEOUT() { return 5; }

  // Total time `_get` may spend across all transports. Keeps the worst case
  // (every host slow) inside the caller's execution budget instead of being
  // killed mid-cascade by the watchdog.
  static get TRANSPORT_DEADLINE_MS() { return 24000; }

  get supportsLatest() { return true; }

  // Origin that answered the last request. Links are still emitted against the
  // canonical `BASE_URL` so the catalog stays portable, but a second pass
  // rewrites them onto the origin the device can actually reach.
  _activeHost() {
    return this._hostOverride || DefaultExtension.BASE_URL;
  }

  _toActiveHost(value) {
    const host = this._hostOverride;
    if (!host || !value) return value;
    return String(value).split(DefaultExtension.BASE_URL).join(host);
  }

  getHeaders(url) {
    return {
      "Referer": `${this._activeHost()}/`,
      "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,*/*;q=0.8",
      "Accept-Language": "en,en-US;q=0.8"
    };
  }

  // ── HTTP ─────────────────────────────────────────────────────────────────
  // A blocked host answers a *stub* page (HTTP 200, ~80 bytes, "Please visit
  // https://www.xvideos.com"). It cannot be told apart from real markup by the
  // status code, so the transport layer sniffs it and moves on to the next
  // mirror.
  _isStubBody(body) {
    const text = String(body || "");
    // A Cloudflare interstitial ("Just a moment…", "Attention Required!") is a
    // few KB and carries no listing markup, so the size heuristic below misses
    // it and the transport layer accepted it as a real page — every search then
    // returned zero cards. Classified by wording, whatever the size.
    if (/just a moment|checking your browser|cf-chl|cf_chl|enable javascript and cookies|verify you are human|attention required|you have been blocked|error 1020|challenge-platform/i
      .test(text) && !/id=["']video[-_]|thumb-block|mozaique/i.test(text)) {
      return true;
    }
    if (text.length > 4000) return false;
    if (/please visit|veuillez visiter|visitar|besuchen|visitez|visita|bezoek|请访问|not available in your (country|region)/i
      .test(text)) {
      return true;
    }
    // The block page is localised, so the wording is not reliable on its own.
    // Every real XVideos page is tens of KB and carries listing markup; a tiny
    // HTML page that only advertises an XVideos host is a stub whatever its
    // language. JSON listing endpoints are exempt: they are small and mention
    // XVideos in their URLs but are legitimate.
    return text.length < 1000 &&
      /^\s*</.test(text) &&
      /xvideos/i.test(text) &&
      !/thumb-block|<video|mozaique|id=["']tags["']|id=["']video[-_]/i.test(text);
  }

  // Pull a working mirror out of the blocked page itself: XVideos prints the
  // visitor's country domain on the stub (e.g. "Please visit
  // https://www.xvideos.com"). It is the most likely mirror to answer.
  _findMirrorInBody(body) {
    const match = /https?:\/\/[a-z0-9.-]*xvideos[a-z0-9.-]*/i.exec(String(body || ""));
    if (!match) return null;
    const candidate = match[0].replace(/\/+$/, "");
    if (candidate === DefaultExtension.BASE_URL) return null;
    return candidate;
  }

  _transports() {
    const list = [{ kind: "direct", host: DefaultExtension.BASE_URL }];
    for (const host of DefaultExtension.MIRRORS) {
      list.push({ kind: "direct", host });
    }
    list.push({ kind: "proxy", host: DefaultExtension.BASE_URL });
    // Put the origin that already answered this session first. The canonical
    // host is blackholed on some networks; without this every single call paid
    // its REQUEST_TIMEOUT again before reaching the mirror that works.
    const known = this._hostOverride;
    if (known) {
      const index = list.findIndex((t) => t.host === known);
      if (index > 0) list.unshift(list.splice(index, 1)[0]);
    }
    return list;
  }

  async _directFetch(host, route, headers) {
    const url = `${host}${route}`;
    const res = await new Client({
      timeout: DefaultExtension.REQUEST_TIMEOUT,
      connectTimeout: DefaultExtension.CONNECT_TIMEOUT,
    }).get(url, headers);
    return { url, statusCode: res && (res.statusCode || res.status), body: res && res.body };
  }

  async _proxyFetch(host, route, headers) {
    const target = `${host}${route}`;
    const res = await new Client({
      timeout: DefaultExtension.REQUEST_TIMEOUT,
      connectTimeout: DefaultExtension.CONNECT_TIMEOUT,
    }).post(
      DefaultExtension.PROXY_URL,
      { "Content-Type": "application/json", "Accept": "application/json" },
      { method: "GET", url: target, headers }
    );
    if (!res || typeof res.body !== "string") {
      throw new Error("XVideos proxy returned an invalid response");
    }
    let payload;
    try {
      payload = JSON.parse(res.body);
    } catch (_) {
      throw new Error("XVideos proxy returned unparseable JSON");
    }
    if (payload && payload.error) {
      throw new Error(`XVideos proxy error: ${payload.error}`);
    }
    return { url: target, statusCode: payload && payload.statusCode, body: payload && payload.body };
  }

  // Returns the response body as a string; every caller scrapes markup or JSON
  // from it. The canonical host is tried first, then the country mirrors, then
  // the worker proxy. A 4xx/5xx or a block stub moves on to the next transport;
  // only when every transport is refused is the failure surfaced.
  async _get(path) {
    let route = String(path || "");
    if (/^https?:\/\//i.test(route)) {
      try { const parsed = new URL(route); route = parsed.pathname + parsed.search; } catch (_) { /* keep as-is */ }
    }
    if (!route.startsWith("/")) route = `/${route}`;

    let lastError;
    let lastReason = "network";
    let lastStatus = 0;
    let haveReason = false;
    let advertisedHost = null;
    const deadline = Date.now() + DefaultExtension.TRANSPORT_DEADLINE_MS;
    for (const transport of this._transports()) {
      if (Date.now() >= deadline) break;
      const headers = this.getHeaders(`${transport.host}/`);
      try {
        const res = transport.kind === "proxy"
          ? await this._proxyFetch(transport.host, route, headers)
          : await this._directFetch(transport.host, route, headers);
        const body = String(res.body || "");
        const status = Number(res.statusCode);
        if (body.trim() && !this._isStubBody(body) &&
            (!Number.isFinite(status) || status < 400)) {
          if (transport.host !== DefaultExtension.BASE_URL) {
            // Serve everything from the origin that answered so detail and
            // playback requests follow the same route.
            this._hostOverride = transport.host;
            extLog("info", `XVideos using transport=${transport.kind} host=${transport.host} route=${route}`);
          }
          return body;
        }
        const reason = this._isStubBody(body) ? "blocked-stub"
          : Number.isFinite(status) && status >= 400 ? "http"
            : "empty-body";
        if (!haveReason) {
          lastReason = reason;
          lastStatus = Number.isFinite(status) ? status : 0;
          haveReason = true;
        }
        if (reason === "blocked-stub" && !advertisedHost) {
          advertisedHost = this._findMirrorInBody(body);
        }
      } catch (error) {
        if (!lastError) lastError = error;
      }
    }

    if (advertisedHost && !DefaultExtension.MIRRORS.includes(advertisedHost)) {
      // One last shot at the mirror the block page advertised.
      try {
        const res = await this._directFetch(advertisedHost, route, this.getHeaders(`${advertisedHost}/`));
        const body = String(res.body || "");
        if (body.trim() && !this._isStubBody(body)) {
          this._hostOverride = advertisedHost;
          extLog("info", `XVideos using advertised host=${advertisedHost} route=${route}`);
          return body;
        }
      } catch (_) { /* fall through to the error below */ }
    }

    if (lastReason === "http") {
      throw new Error(`XVideos returned HTTP ${lastStatus} for ${route}`);
    }
    if (lastReason === "empty-body") {
      throw new Error(`XVideos returned an empty response for ${route}`);
    }
    if (lastReason === "blocked-stub") {
      extLog("warn", `XVideos blocked on this network route=${route}`);
      throw new Error(
        `XVideos is blocked on this network (route ${route}). The direct site and every mirror were refused.`
      );
    }
    extLog("error", `XVideos network request failed route=${route} error=${lastError && lastError.message}`);
    throw new Error(`XVideos request failed for ${route}: ${lastError && lastError.message}`);
  }

  // ── Small helpers ────────────────────────────────────────────────────────
  _absolute(href) {
    const raw = String(href || "").replace(/\\\//g, "/").trim();
    if (!raw) return "";
    if (/^https?:/i.test(raw)) return raw;
    if (raw.startsWith("//")) return `https:${raw}`;
    return `${this._activeHost()}${raw.startsWith("/") ? "" : "/"}${raw}`;
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
      return `${this._activeHost()}/video.${eid}/${slug}`;
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

  // ── Profile directory (`/profileslist`) ──────────────────────────────────
  // `/pornstars-index` and `/channels-index` list performers and studios;
  // `/profileslist` is the site-wide member directory (188 pages, ~556 M
  // profiles). Its cards use the same `id="profile_<slug>"` shape as the other
  // directories, so `_parseProfileCards` handles them too — only the link
  // prefix differs, and `_normalizeProfileLink` keeps `/profiles/<slug>` as-is.
  async _profilesDirectory(page) {
    const html = await this._get(`/profileslist${this._pageSuffix(page)}`);
    const items = this._parseProfileCards(html, "profiles");
    return { list: items, hasNextPage: items.length > 0 && this._hasNextPage(html) };
  }

  // ── Languages (`/lang`) ──────────────────────────────────────────────────
  // 38 language feeds ("Porno en Français", "Porn in Arabic"…). Each links to
  // `/lang/<code>`, whose listing is a normal video grid, so a language behaves
  // exactly like a category and is browsable through `language_<code>`.
  //
  // The index draws its flags with CSS sprite classes (`flag-small flag-fr`),
  // not `<img>`, so there is no artwork to read. The card keeps the language's
  // own flag as an emoji in the title and borrows a real video cover instead
  // of pointing at a third-party flag CDN the app does not ship.
  _flagEmoji(code) {
    const iso = String(code || "").toLowerCase();
    if (!/^[a-z]{2}$/.test(iso)) return "";
    return String.fromCodePoint(
      ...iso.split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 97),
    );
  }

  _parseLanguages(html) {
    const items = [];
    const seen = {};
    const re = /<a[^>]+class=["'][^"']*\blang-index-link\b[^"']*["'][^>]*href=["'](\/lang\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = re.exec(String(html || "")))) {
      const code = match[1].slice("/lang/".length).split(/[/?#]/)[0];
      if (!code || seen[code]) continue;
      seen[code] = true;
      const body = match[2];
      const flag = /class=["'][^"']*\bflag-([a-z]{2})\b/i.exec(body);
      const label = /<span[^>]*class=["'][^"']*\blang-index-name\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i.exec(body);
      const count = /<span[^>]*class=["'][^"']*\blang-index-count\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i.exec(body);
      const emoji = flag ? this._flagEmoji(flag[1]) : "";
      const name = this._text(label ? label[1] : "") || this._text(body) || code;
      items.push({
        name: emoji ? `${emoji} ${name}` : name,
        imageUrl: "",
        link: this._absolute(match[1]),
        collectionId: `language_${code}`,
        description: count ? `${this._text(count[1])} videos` : "Browse videos",
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
  // grid can page through it without a second network shape. The page is kept
  // small because each visible tag costs one listing request to borrow its
  // cover (see `_borrowCovers`).
  static get TAG_PAGE_SIZE() { return 12; }

  // How many cards get a borrowed cover per list. The tag index holds
  // thousands of entries so it stays capped, but the category, language and
  // studio indexes are only a few dozen each and are covered in full — capping
  // them at 12 left two thirds of the "Catégories" grid and every single
  // "Langues" card without artwork.
  static get COVER_LIMIT() { return 40; }

  // The tag index carries no artwork at all — `/tags` lists `<b>name</b>` plus a
  // count. The cover is therefore borrowed from the tag's own listing: its
  // first video thumbnail. `_borrowCovers` runs the lookups through a small
  // pool so a page of 24 tags costs a couple of seconds, not 24 serial round
  // trips, and never more than [COVER_CONCURRENCY] sockets at once.
  static get COVER_CONCURRENCY() { return 8; }

  // First video thumbnail of a listing page, used as the tag's cover.
  _firstListingImage(html) {
    for (const block of String(html || "").split(/(?=<div[^>]+id=["']video[-_])/).slice(1)) {
      const image = this._cardImage(block);
      if (image) return image;
    }
    return "";
  }

  // Fills `imageUrl` on items whose listing page is derived from a slug
  // (`tag_<slug>` → `/tags/<slug>`, `category_<slug>` → `/c/<slug>`). Items
  // that already carry artwork, or whose lookup fails, are left untouched so a
  // single dead slug cannot blank the whole grid.
  async _borrowCovers(items, prefix, route, limit) {
    const cap = Number.isFinite(limit) && limit > 0 ? limit : DefaultExtension.COVER_LIMIT;
    const pending = [];
    for (const item of items) {
      if (pending.length >= cap) break;
      const id = item && item.collectionId ? String(item.collectionId) : "";
      if (!id.startsWith(prefix) || (item.imageUrl && item.imageUrl.length)) continue;
      pending.push({ item, slug: id.slice(prefix.length) });
    }
    let cursor = 0;
    const worker = async () => {
      while (cursor < pending.length) {
        const job = pending[cursor++];
        if (!job.slug) continue;
        try {
          const html = await this._get(route(job.slug));
          const image = this._firstListingImage(html);
          if (image) job.item.imageUrl = image;
        } catch (_) { /* keep the gradient fallback for this one card */ }
      }
    };
    const workers = [];
    for (let i = 0; i < Math.min(DefaultExtension.COVER_CONCURRENCY, pending.length); i++) {
      workers.push(worker());
    }
    await Promise.all(workers);
    return items;
  }

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
      const link = `${this._activeHost()}/video.${eid}/${slug}`;
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
    const slice = all.slice(start, start + size);
    await this._borrowCovers(slice, "tag_", (slug) => `/tags/${slug}`, size);
    return { list: slice, hasNextPage: start + size < all.length };
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

  // ── Recommendations ("Pour vous" tab on the detail screen) ───────────────
  // The detail page embeds `var video_related = [ ... ]` (a JSON array of up
  // to ~40 sibling videos) alongside the player config. The extension did not
  // implement this hook, so the tab stayed permanently empty. The page also
  // carries the video's own keyword tags; when the related literal is missing
  // (signed-out or partially rendered responses) the first tag drives a real
  // listing instead of an empty tab.
  _parseRelatedJson(html) {
    const marker = /var\s+video_related\s*=\s*(\[)/i.exec(String(html || ""));
    if (!marker) return [];
    const start = html.indexOf("[", marker.index);
    if (start < 0) return [];
    let depth = 0;
    for (let i = start; i < html.length; i++) {
      const ch = html[i];
      if (ch === "[") depth++;
      else if (ch === "]") {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(html.slice(start, i + 1)); } catch (_) { return []; }
        }
      }
    }
    return [];
  }

  async getRecommendations(url) {
    const target = String(url || "").split("#")[0];
    if (!target) return [];
    const body = await this._get(target);

    const items = [];
    const seen = {};
    for (const video of this._parseRelatedJson(body)) {
      const link = this._absolute(video && video.u ? video.u : "");
      if (!link || seen[link]) continue;
      seen[link] = true;
      const name = this._decodeEntities(String(video.t || video.tf || "").trim());
      if (!name) continue;
      items.push({
        name,
        imageUrl: this._absolute(video.i || video.il || video.if || video.ip || ""),
        previewUrl: this._absolute(video.ipu || ""),
        link,
        description: [video.d, video.n, video.r].filter(Boolean).join(" • "),
      });
    }
    if (items.length) return items.slice(0, 24);

    // Fallback: the detail page's own tags. The first tag is the closest
    // match to the video's subject, so its listing is a usable "related" rail.
    const tagJson = /"video_tags":\s*\[([^\]]*)\]/i.exec(body);
    if (!tagJson) return [];
    const tag = /"([^"]+)"/.exec(tagJson[1]);
    if (!tag) return [];
    const slug = tag[1].trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
    if (!slug) return [];
    try {
      const listing = await this._videoListing(`/tags/${slug}`, 1);
      return (listing.list || []).slice(0, 24);
    } catch (_) {
      return [];
    }
  }

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
      const items = this._parseCategories(html);
      await this._borrowCovers(items, "category_", (slug) => `/c/${slug}`);
      return { list: items, hasNextPage: false };
    }

    // "Explorer" — the site's discovery entry points: categories, then the
    // most used tags, then the language feeds. Each opens a real listing.
    if (id === "explore" || id === "discover") {
      const home = await this._get("/");
      const categories = this._parseCategories(home);
      const tags = (await this._tagsPage(1)).list.slice(0, 8);
      const languages = this._parseLanguages(await this._get("/lang")).slice(0, 6);
      await this._borrowCovers(categories, "category_", (slug) => `/c/${slug}`);
      await this._borrowCovers(tags, "tag_", (slug) => `/tags/${slug}`);
      await this._borrowCovers(languages, "language_", (code) => `/lang/${code}`);
      return { list: categories.concat(tags, languages), hasNextPage: false };
    }

    // "Profils" — the site-wide member directory.
    if (id === "profiles" || id === "members") return this._profilesDirectory(page);

    // "Langues" — the 39 language feeds. The `/lang` index draws its flags with
    // CSS sprite classes (`flag-small flag-fr`), not `<img>`, so there is no
    // artwork to read; the cover is borrowed from the language's own listing
    // like a tag or a category. Without this every language card rendered as a
    // bare gradient tile.
    if (id === "languages" || id === "lang") {
      const items = this._parseLanguages(await this._get("/lang"));
      await this._borrowCovers(items, "language_", (code) => `/lang/${code}`);
      return { list: items, hasNextPage: false };
    }

    // `language_<code>` — one language's video listing.
    if (id.startsWith("language_")) {
      const code = id.slice("language_".length);
      if (!code) return { list: [], hasNextPage: false };
      return this._videoListing(`/lang/${code}`, page);
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
