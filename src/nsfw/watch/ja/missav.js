const watchtowerSources = [{
  "name": "MissAV",
  "lang": "ja",
  "baseUrl": "https://missav.ws",
  "apiUrl": "",
  "iconUrl": "https://missav.ws/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.2.0",
  "login": true,
  "forYou": false,
  "pkgPath": "nsfw/watch/ja/missav.js",
  "notes": "JAV streaming — 13 home sections (random, actresses, ranking), 20 site languages, HLS playback and Cloudflare clearance reuse",
  "isNsfw": true
}];

const BASE_URL = "https://missav.ws";
const DEFAULT_LANGUAGE = "en";

// Every locale the site serves has its own path prefix, so the extension
// setting writes one of these codes and `_lang()` builds every URL from it.
const LANGUAGES = [
  ["English", "en"],
  ["日本語", "ja"],
  ["中文", "zh"],
  ["繁體中文", "tw"],
  ["한국어", "ko"],
  ["ไทย", "th"],
  ["Tiếng Việt", "vi"],
  ["Bahasa Indonesia", "id"],
  ["Bahasa Melayu", "ms"],
  ["العربية", "ar"],
  ["हिन्दी", "hi"],
  ["Deutsch", "de"],
  ["Français", "fr"],
  ["Español", "es"],
  ["Italiano", "it"],
  ["Português", "pt"],
  ["Русский", "ru"],
  ["Türkçe", "tr"],
  ["Polski", "pl"],
  ["Nederlands", "nl"]
];
const LANGUAGE_CODES = LANGUAGES.map((entry) => entry[1]);
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

// Every home section is a real MissAV catalogue path (verified against the
// site navigation). "popular"/"latest" are also served through the classic
// getPopular/getLatestUpdates entry points.
const SECTIONS = {
  popular: "/new?sort=views",
  latest: "/new",
  today_hot: "/today-hot",
  weekly_hot: "/weekly-hot",
  monthly_hot: "/monthly-hot",
  new_release: "/release",
  uncensored: "/uncensored-leak",
  english_sub: "/english-subtitle",
  fc2: "/fc2",
  tokyo_hot: "/tokyohot",
  heyzo: "/heyzo",
  siro: "/siro",
  vr: "/genres/VR",
  big_breasts: "/genres/Big%20Breasts",
  creampie: "/genres/Creampie",
  // Actress directory (name + portrait) and its ranking (already sorted).
  actresses: "/actresses",
  actress_ranking: "/actresses/ranking",
  // Layout-only grid that pages through the whole catalogue.
  catalogue: "/new"
};

class DefaultExtension extends MProvider {
  // Used for media/download requests (surrit, covers): a browser UA is expected
  // there and no Cloudflare clearance is involved.
  getHeaders(url) {
    return {
      "User-Agent": USER_AGENT,
      "Referer": BASE_URL + "/",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,ja;q=0.8"
    };
  }

  // Site language chosen in the extension settings. A worker isolate has no
  // database handle, so the app sends the stored values with every request;
  // a missing preference falls back to English instead of failing the request.
  _lang() {
    try {
      const stored = new SharedPreferences().get("language");
      const value = typeof stored === "string" ? stored.trim().toLowerCase() : "";
      if (LANGUAGE_CODES.indexOf(value) >= 0) return value;
    } catch (error) {
      // A missing preference must never break a request.
    }
    return DEFAULT_LANGUAGE;
  }

  // Headers for missav.ws itself. The User-Agent is deliberately OMITTED: the
  // app fills in the UA of the WebView session that solved the Cloudflare
  // challenge, and cf_clearance is bound to that UA. Forcing a desktop Chrome
  // UA here made Cloudflare reject the clearance, so the source looped on the
  // challenge even after it was solved.
  _siteHeaders(url) {
    return {
      "Referer": BASE_URL + "/",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": this._lang() + ";q=0.9,en;q=0.8"
    };
  }

  _pageUrl(path, page) {
    const base = BASE_URL + "/" + this._lang() + path;
    const current = parseInt(page, 10) || 1;
    if (current <= 1) return base;
    return base + (path.indexOf("?") >= 0 ? "&" : "?") + "page=" + current;
  }

  // The app's HTTP layer expects the header map directly (wrapping it in
  // `{ headers: ... }` sends a bogus "headers" header and drops the UA).
  async _get(url) {
    const res = await new Client().get(url, this._siteHeaders(url));
    return this._body(res, url);
  }

  _body(res, url) {
    const body = (res && res.body) || "";
    const status = (res && res.statusCode) || 0;
    // “Cloudflare challenge” is the wording the app recognises: it opens the
    // bypass panel on the exact failing URL (kept as the last token). The body
    // markers are the ones only an interstitial carries — `challenge-platform`
    // is injected into perfectly healthy pages and must not trigger it.
    if (
      status === 403 ||
      status === 503 ||
      status === 429 ||
      /Just a moment|Attention Required|cf-chl|cf_chl|_cf_chl_opt|cf-challenge-running|Verify you are human/i.test(body)
    ) {
      throw new Error("MissAV: Cloudflare challenge (HTTP " + status + ") — " + url);
    }
    if (status >= 400) {
      throw new Error("MissAV: HTTP " + status + " — " + url);
    }
    return body;
  }

  async getPopular(page) {
    return this._parseList(
      await this._get(this._pageUrl(SECTIONS.popular, page)),
      page,
      this._sectionBadges("popular")
    );
  }

  get supportsLatest() { return true; }

  async getLatestUpdates(page) {
    return this._parseList(
      await this._get(this._pageUrl(SECTIONS.latest, page)),
      page,
      this._sectionBadges("latest")
    );
  }

  async getCustomList(id, page) {
    // `/random` redirects to one video, and the actress directory is a
    // different page shape (people, not videos). Both keep the same
    // `{ list, hasNextPage }` contract as every other section.
    if (id === "random") return this._randomList();
    if (id === "actress_ranking" || id === "actresses") {
      const path = SECTIONS[id];
      return this._parseActresses(await this._get(this._pageUrl(path, page)), page);
    }
    const path = SECTIONS[id];
    if (!path) throw new Error("MissAV: unknown home section \"" + id + "\"");
    return this._parseList(
      await this._get(this._pageUrl(path, page)),
      page,
      this._sectionBadges(id)
    );
  }

  async search(query, page, filters) {
    // Same encoding as the site's own search box (`+` is a literal AND
    // operator on MissAV, so a space must stay %20).
    const q = encodeURIComponent((query || "").trim());
    if (!q) return { list: [], hasNextPage: false };
    const path = "/search/" + q;
    return this._parseList(await this._get(this._pageUrl(path, page)), page);
  }

  // Listing markup (server rendered):
  // <div class="thumbnail group">
  //   <img data-src="https://fourhoi.com/<code>/cover-t.jpg" alt="TITLE">
  //   <span class="absolute bottom-1 right-1 ...">1:01:25</span>
  //   <div class="my-2 ..."><a class="text-secondary" href="/en/<code>">TITLE</a></div>
  // </div>
  _parseList(html, page, hints) {
    const doc = new Document(html);
    const list = [];
    const seen = {};

    for (const card of doc.select("div.thumbnail")) {
      let titleLink = card.selectFirst("div.my-2 a");
      if (!titleLink) titleLink = card.selectFirst("a[href*='/en/']");
      if (!titleLink) continue;

      const href = titleLink.attr("href") || "";
      if (!href) continue;
      // Cards are linked through a rotating mirror prefix (/dm539/en/<code>);
      // the plain /en/<code> path is stable and prefers the same video.
      const link = (href.indexOf("http") === 0 ? href : BASE_URL + href)
        .replace(/^(https?:\/\/[^/]+)\/dm\d+\//, "$1/");
      if (seen[link]) continue;

      const img = card.selectFirst("img");
      const imageUrl = img ? (img.attr("data-src") || img.attr("src") || "") : "";
      const durationEl = card.selectFirst("span.absolute.bottom-1");
      const duration = durationEl ? durationEl.text.trim() : "";
      const name = (titleLink.text || (img ? img.attr("alt") : "") || "").trim();
      if (!name) continue;

      seen[link] = true;
      list.push({
        name: name,
        link: link,
        imageUrl: imageUrl,
        description: duration,
        badges: this._itemBadges(name, link, hints)
      });
    }

    return { list: list, hasNextPage: !!doc.selectFirst("a[rel='next']") };
  }

  async getDetail(url) {
    // Actress links open the app's people screen, which expects a profile plus
    // a filmography rather than a video detail page.
    if (this._isActressUrl(url)) return this._getActressDetail(url);
    const html = await this._get(url);
    const doc = new Document(html);
    const meta = (property) => {
      const el = doc.selectFirst("meta[property='" + property + "']");
      return el ? (el.attr("content") || "").trim() : "";
    };

    const h1 = doc.selectFirst("h1");
    const title = meta("og:title") || (h1 ? h1.text.trim() : "") || "MissAV";
    const imageUrl = meta("og:image");
    const releaseDate = meta("og:video:release_date");
    const duration = this._formatDuration(meta("og:video:duration"));

    // og:video:tag lists this video's own tags; the /genres/ anchors also
    // include the site navigation, so they are only a fallback.
    const genre = [];
    const genreSeen = {};
    const addGenre = (name) => {
      const value = (name || "").trim();
      if (!value || value.length > 40 || genreSeen[value]) return;
      genreSeen[value] = true;
      genre.push({ name: value });
    };
    for (const metaTag of doc.select("meta[property='og:video:tag']")) {
      addGenre(metaTag.attr("content"));
    }
    if (genre.length === 0) {
      // The metadata block (release date / code / genre / maker) is the only
      // place whose genre links belong to the video; the header navigation
      // also links to /genres/… so it must not leak into the tags.
      let anchors = doc.select("div.space-y-2 a[href*='/genres/']");
      if (anchors.length === 0) anchors = doc.select("a[href*='/genres/']");
      for (const a of anchors) addGenre(a.text);
    }

    const actresses = [];
    for (const a of doc.select("a[href*='/actresses/']")) {
      const href = a.attr("href") || "";
      const name = a.text.trim();
      if (!name || /\/actresses$|\/actresses\/ranking/.test(href)) continue;
      if (actresses.indexOf(name) < 0) actresses.push(name);
    }

    let maker = "";
    const makerLink = doc.selectFirst("a[href*='/makers/']");
    if (makerLink) maker = makerLink.text.trim();

    const codeEl = doc.selectFirst("meta[property='og:url']");
    const code = codeEl ? (codeEl.attr("content") || "").split("/").pop() : "";

    const lines = [];
    if (code) lines.push("Code: " + code.toUpperCase());
    if (releaseDate) lines.push("Release date: " + releaseDate);
    if (duration) lines.push("Duration: " + duration);
    if (maker) lines.push("Maker: " + maker);
    if (actresses.length) lines.push("Actress: " + actresses.join(", "));

    return {
      name: title,
      imageUrl: imageUrl,
      description: lines.join("\n"),
      author: maker || actresses.join(", "),
      genre: genre,
      episodes: [{
        name: title,
        url: url,
        duration: duration
      }]
    };
  }

  _isActressUrl(url) {
    return /\/actresses\/[^\/?#]+\/?(\?|#|$)/.test(url || "");
  }

  // Section-level metadata: the list a video comes from already says whether it
  // is an uncensored leak, an English-subtitled release or VR.
  _sectionBadges(id) {
    if (id === "uncensored") return { uncensored: true };
    if (id === "english_sub") return { subtitle: "en" };
    if (id === "vr") return { vr: true };
    return {};
  }

  // Badges are a metadata contract, not a UI concern: the app draws a flag for
  // `lang:xx`, a mark for `censored`/`uncensored` and a chip for `sub:xx`.
  _itemBadges(name, link, hints) {
    const badges = ["lang:ja"];
    const text = (name || "") + " " + (link || "");
    const options = hints || {};
    if (
      options.uncensored ||
      /uncensored|uncensor|leak|無修正|パイパン/i.test(text)
    ) {
      badges.push("uncensored");
    } else {
      badges.push("censored");
    }
    if (options.subtitle) {
      badges.push("sub:" + options.subtitle);
    } else if (/english[\s-]*sub|subtitled|字幕/i.test(text)) {
      badges.push("sub:en");
    }
    if (options.vr || /(^|[^a-z])vr([^a-z]|$)/i.test(name || "")) {
      badges.push("vr");
    }
    return badges;
  }

  // The actress index and its ranking share one markup: a card whose link
  // points at `/actresses/<name>`. The ranking page is already sorted, so its
  // position is the rank and the app's ranked section numbers it.
  _parseActresses(html, page) {
    const doc = new Document(html);
    const list = [];
    const seen = {};
    for (const anchor of doc.select("a[href*='/actresses/']")) {
      let raw = anchor.attr("href") || "";
      if (!raw) continue;
      raw = raw.split("#")[0].split("?")[0];
      if (!/\/actresses\/[^\/]+\/?$/.test(raw)) continue;
      if (/\/actresses\/(ranking|all)\/?$/.test(raw)) continue;
      const link = raw.indexOf("http") === 0 ? raw : BASE_URL + raw;
      if (seen[link]) continue;
      const img = anchor.selectFirst("img");
      const imageUrl = img
        ? (img.attr("data-src") || img.attr("src") || img.getSrc || img.attr("data-original") || "")
        : "";
      let name = (anchor.text || "").trim();
      if (!name && img) name = (img.attr("alt") || "").trim();
      name = name.replace(/\s+/g, " ").trim();
      if (!name) continue;
      seen[link] = true;
      list.push({
        name: name,
        link: link,
        imageUrl: imageUrl,
        description: "Actress",
        badges: ["lang:ja"]
      });
    }
    return { list: list, hasNextPage: !!doc.selectFirst("a[rel='next']") };
  }

  // Her page is a profile (portrait + filmography). The app already renders
  // extension people through its person screen, so the filmography is returned
  // as chapters: one chapter per video, each opening the real video.
  async _getActressDetail(url) {
    const html = await this._get(url);
    const doc = new Document(html);
    const meta = (property) => {
      const el = doc.selectFirst("meta[property='" + property + "']");
      return el ? (el.attr("content") || "").trim() : "";
    };
    const heading = doc.selectFirst("h1");
    const title = meta("og:title") || (heading ? heading.text.trim() : "") || "Actress";
    const listing = this._parseList(html, 1, {});
    const chapters = listing.list.map((item) => ({
      name: item.name,
      url: item.link,
      thumbnailUrl: item.imageUrl,
      duration: item.description || ""
    }));
    const lines = [];
    if (chapters.length) {
      lines.push(chapters.length + (chapters.length === 1 ? " video" : " videos"));
    }
    const rank = html.match(/rank(?:ing)?[^0-9]{0,40}([0-9]{1,4})/i);
    if (rank) lines.push("Rank #" + rank[1]);
    return {
      name: title,
      imageUrl: meta("og:image"),
      description: lines.join("\n"),
      author: title,
      genre: [],
      chapters: chapters
    };
  }

  // `/random` redirects to a single video. The landing page carries the
  // canonical URL in `og:url`, which is the only stable identity (the mirror
  // prefix changes on every request).
  async _randomList() {
    const html = await this._get(BASE_URL + "/" + this._lang() + "/random");
    const doc = new Document(html);
    const meta = (property) => {
      const el = doc.selectFirst("meta[property='" + property + "']");
      return el ? (el.attr("content") || "").trim() : "";
    };
    const link = meta("og:url") || meta("og:video:url");
    const name = meta("og:title");
    if (link && name) {
      return {
        list: [{
          name: name,
          link: link.replace(/^(https?:\/\/[^\/]+)\/dm\d+\//, "$1/"),
          imageUrl: meta("og:image"),
          description: this._formatDuration(meta("og:video:duration")),
          badges: this._itemBadges(name, link, {})
        }],
        hasNextPage: false
      };
    }
    // Some mirrors answer with a listing instead of a redirect: keep the first
    // video rather than showing an empty section.
    const fallback = this._parseList(html, 1, {});
    return { list: fallback.list.slice(0, 1), hasNextPage: false };
  }

  // Playback: MissAV hides the stream inside a P.A.C.K.E.R packed script
  // (`eval(function(p,a,c,k,e,d){…}('<payload>',base,count,'words'.split('|'),…))`)
  // which expands to `https://surrit.com/<uuid>/playlist.m3u8` plus its
  // variants. The previous regex only looked for a literal `.m3u8`, so it
  // always returned 0 videos. Unpack first, then fall back to the surrit UUID
  // that the page also exposes through its seek thumbnails.
  async getVideoList(url) {
    const html = await this._get(url);
    const headers = this.getHeaders(url);
    const candidates = [];

    const pushUrl = (value) => {
      let candidate = (value || "").replace(/\\\//g, "/").replace(/&amp;/g, "&").trim();
      candidate = candidate.replace(/[\\"',;]+$/, "");
      if (!/^https?:\/\//i.test(candidate)) return;
      if (candidates.indexOf(candidate) < 0) candidates.push(candidate);
    };

    // 1. Unpacked player scripts (the normal case).
    for (const decoded of this._unpackPackedScripts(html)) {
      const found = decoded.match(/https?:\/\/[^\s"'`\\<>]+/g) || [];
      for (const candidate of found) pushUrl(candidate);
    }

    // 2. Plain URLs some mirrors still write in the markup (sometimes with
    // escaped slashes, e.g. "https:\/\/…").
    const flat = html.replace(/\\\//g, "/");
    const plain = flat.match(/https?:\/\/[^\s"'`\\<>]+\.(?:m3u8|mp4)[^\s"'`\\<>]*/gi) || [];
    for (const candidate of plain) pushUrl(candidate);

    const video = (target, quality) => ({
      url: target,
      quality: quality,
      originalUrl: target,
      headers: headers
    });

    const isHls = (candidate) => /\.m3u8(\?|#|$)/i.test(candidate);
    const hls = candidates.filter(isHls);
    const masters = hls.filter((candidate) => /\/playlist\.m3u8/i.test(candidate));
    if (masters.length > 0) {
      // A single adaptive entry: the app expands the master into its real
      // renditions (lib/services/hls_variant_resolver.dart).
      return [video(masters[0], "Auto")];
    }
    if (hls.length > 0) {
      return hls.slice(0, 4).map((candidate) => {
        const match = candidate.match(/\/(\d{3,4})p\//i);
        return video(candidate, match ? match[1] + "p" : "Auto");
      });
    }

    const mp4 = candidates.filter((candidate) => /\.mp4(\?|#|$)/i.test(candidate));
    if (mp4.length > 0) {
      return mp4.slice(0, 3).map((candidate) => video(candidate, "MP4"));
    }

    // 3. UUID fallback: the page always references surrit seek thumbnails.
    const uuidMatch = html.match(/surrit\.com[\\/]+([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if (uuidMatch) {
      return [video("https://surrit.com/" + uuidMatch[1] + "/playlist.m3u8", "Auto")];
    }

    return [];
  }

  _unpackPackedScripts(html) {
    const decoded = [];
    const packer = /eval\(function\(p,a,c,k,e,d\)\{[\s\S]*?\}\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'((?:[^'\\]|\\.)*)'\s*\.split\(\s*'\|'\s*\)/g;
    let match;
    while ((match = packer.exec(html)) !== null) {
      try {
        let payload = match[1].replace(/\\(['"\\/])/g, "$1");
        const words = match[4].split("|");
        const count = parseInt(match[3], 10) || 0;
        for (let index = count - 1; index >= 0; index--) {
          const token = this._packerToken(index, parseInt(match[2], 10) || 62);
          const word = words[index] || token;
          payload = payload.replace(new RegExp("\\b" + token + "\\b", "g"), word);
        }
        decoded.push(payload.replace(/\\\//g, "/"));
      } catch (error) {
        // A malformed block must never break playback: other blocks or the
        // UUID fallback still resolve the stream.
      }
    }
    return decoded;
  }

  // P.A.C.K.E.R writes token N in base `base` (the site uses 15, 16 and 62,
  // and Number#toString only accepts radix 2-36).
  _packerToken(index, base) {
    const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const radix = base >= 2 && base <= alphabet.length ? base : 36;
    let value = index;
    let token = "";
    do {
      token = alphabet.charAt(value % radix) + token;
      value = Math.floor(value / radix);
    } while (value > 0);
    return token;
  }

  _formatDuration(seconds) {
    const total = parseInt(seconds, 10);
    if (!total || total < 0) return "";
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    const pad = (value) => (value < 10 ? "0" + value : "" + value);
    return hours > 0
      ? hours + ":" + pad(minutes) + ":" + pad(secs)
      : minutes + ":" + pad(secs);
  }

  getFilterList() { return []; }

  // Site language. `entryValues` is what the extension reads back through
  // SharedPreferences, so it stays a plain ISO code.
  getSourcePreferences() {
    return [{
      key: "language",
      listPreference: {
        title: "Langue du site",
        summary: "Langue des titres, genres et menus MissAV.",
        // Reflect the stored choice so reopening the settings shows it.
        valueIndex: Math.max(0, LANGUAGE_CODES.indexOf(this._lang())),
        entries: LANGUAGES.map((entry) => entry[0]),
        entryValues: LANGUAGE_CODES
      }
    }];
  }
}
