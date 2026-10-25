const watchtowerSources = [{
  "name": "MissAV",
  "lang": "ja",
  "baseUrl": "https://missav.ws",
  "apiUrl": "",
  "iconUrl": "https://missav.ws/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.1.1",
  "login": false,
  "forYou": false,
  "pkgPath": "nsfw/watch/ja/missav.js",
  "notes": "JAV streaming — 10 home sections, catalogue, HLS playback (surrit) and Cloudflare clearance reuse",
  "isNsfw": true
}];

const BASE_URL = "https://missav.ws";
const LANG_PREFIX = "/en";
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

  // Headers for missav.ws itself. The User-Agent is deliberately OMITTED: the
  // app fills in the UA of the WebView session that solved the Cloudflare
  // challenge, and cf_clearance is bound to that UA. Forcing a desktop Chrome
  // UA here made Cloudflare reject the clearance, so the source looped on the
  // challenge even after it was solved.
  _siteHeaders(url) {
    return {
      "Referer": BASE_URL + "/",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,ja;q=0.8"
    };
  }

  _pageUrl(path, page) {
    const base = BASE_URL + LANG_PREFIX + path;
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
    return this._parseList(await this._get(this._pageUrl(SECTIONS.popular, page)), page);
  }

  get supportsLatest() { return true; }

  async getLatestUpdates(page) {
    return this._parseList(await this._get(this._pageUrl(SECTIONS.latest, page)), page);
  }

  async getCustomList(id, page) {
    const path = SECTIONS[id];
    if (!path) throw new Error("MissAV: unknown home section \"" + id + "\"");
    return this._parseList(await this._get(this._pageUrl(path, page)), page);
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
  _parseList(html, page) {
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
        description: duration
      });
    }

    return { list: list, hasNextPage: !!doc.selectFirst("a[rel='next']") };
  }

  async getDetail(url) {
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
  getSourcePreferences() { return []; }
}
