const watchtowerSources = [{
  "name": "MyThav",
  "lang": "ja",
  "baseUrl": "https://mythav.com",
  "apiUrl": "",
  "iconUrl": "https://mythav.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.1.0",
  "login": false,
  "forYou": false,
  "pkgPath": "nsfw/watch/ja/mythav.js",
  "notes": "MyThav — JAV streaming portal. Direct HLS extraction (helvid CDN) + studios/actresses/tags sections.",
  "isNsfw": true
}];

const BASE_URL = "https://mythav.com";
// The catalogue is served on mythav.com, but every asset (covers, player
// iframe, media) lives on mythav.org — page requests must carry a mythav
// referer to pass the origin check.
const ORIGIN = "https://mythav.org";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

class DefaultExtension extends MProvider {
  // Headers for the mythav pages themselves (HTML + covers).
  getHeaders(url) {
    const pageUrl = /^https?:\/\//i.test(String(url || "")) ? String(url) : BASE_URL + "/";
    return {
      "User-Agent": USER_AGENT,
      "Referer": pageUrl,
      "Accept-Language": "en-US,en;q=0.9,ja;q=0.8"
    };
  }

  // Headers for the helvid.com media CDN. This is a *media* request, not a page
  // navigation: the CDN rejects `Sec-Fetch-Dest: document`, and it keys the
  // Referer to the player host upload18.org — a mythav referer is refused
  // outright. The User-Agent is mandatory too.
  _mediaHeaders() {
    return {
      "User-Agent": USER_AGENT,
      "Referer": "https://upload18.org/",
      "Origin": "https://upload18.org",
      "Accept": "*/*",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site"
    };
  }

  async getPopular(page) {
    // "Most popular" is the site's Top Rated rail; it is the only ranking that
    // paginates with /page/N/ (the home feed always serves the same 32 items
    // whatever ?page= is passed).
    const p = Number(page) > 1 ? Number(page) : 1;
    const url = `${BASE_URL}/rate/page/${p}/`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, ORIGIN);
  }

  get supportsLatest() { return true; }

  async getLatestUpdates(page) {
    const p = Number(page) > 1 ? Number(page) : 1;
    const url = `${BASE_URL}/update/page/${p}/`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, ORIGIN);
  }

  async search(query, page, filters) {
    const p = Number(page) > 1 ? Number(page) : 1;
    const q = encodeURIComponent(String(query || "").trim());
    const url = p > 1
      ? `${BASE_URL}/search/page/${p}/?s=${q}`
      : `${BASE_URL}/search/?s=${q}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, ORIGIN);
  }

  _parse(html, base) {
    const doc = new Document(html);
    const items = [];
    const seen = {};
    const cards = doc.select("article.loop-video, .videos-list article, article");
    for (const card of cards) {
      const a = card.selectFirst("a[href*='/video/'], h2 a, h3 a, a");
      if (!a) continue;
      const href = (a.attr("href") || "").trim();
      if (!href || href.length < 15) continue;
      const link = href.charAt(0) === "h" ? href : new URL(href, base).href;
      if (seen[link]) continue;
      const img = card.selectFirst("img");
      const title = (a.attr("title") || (img ? img.attr("alt") : "") || a.text || "").trim();
      if (!title || title.length < 3) continue;
      const thumb = img ? (img.attr("data-src") || img.attr("data-lazy-src") || img.attr("src") || "") : "";
      seen[link] = 1;
      items.push({
        name: title.replace(/\s+/g, " ").trim(),
        imageUrl: thumb,
        link
      });
    }
    const hasNext = !!doc.selectFirst(".pagination a[href*='/page/'], .pagination a.inactive");
    return { list: items, hasNextPage: hasNext || items.length >= 20 };
  }

  async getDetail(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const doc = new Document(res.body);
    const title = (doc.selectFirst("meta[property='og:title']")?.attr("content")
      || doc.selectFirst("h1")?.text || "Unknown").trim();
    const thumb = doc.selectFirst("meta[property='og:image']")?.attr("content") || "";

    const genre = [];
    const pushGenre = (name) => {
      const clean = String(name || "").replace(/\s+/g, " ").trim();
      if (clean && genre.indexOf(clean) < 0) genre.push(clean);
    };
    for (const el of doc.select("a[href*='/tag/']")) pushGenre(el.text);
    for (const el of doc.select("a[href*='/actress/']")) pushGenre(el.text);
    for (const el of doc.select("a[href*='/maker/']")) pushGenre(el.text);

    // The page carries its own code line ("MythAV.Org Code: atya-048") and an
    // ISO duration; both are more useful than the repeated title in the meta.
    let description = "";
    const code = res.body.match(/MythAV\.Org\s+Code\s*:\s*([A-Za-z0-9-]+)/i);
    if (code) description = "Code: " + code[1];
    const clock = this._isoDurationToClock(doc.selectFirst("meta[itemprop='duration']")?.attr("content") || "");
    if (clock) description = (description ? description + " · " : "") + "Duration: " + clock;

    return {
      name: title,
      imageUrl: thumb,
      description,
      genre,
      episodes: [{ name: title || "Watch", url }]
    };
  }

  async getVideoList(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const html = res.body;
    const videos = [];
    const seen = {};
    const push = (src, quality) => {
      if (!src) return;
      const clean = this._clean(src);
      if (!/^https?:\/\//i.test(clean) || seen[clean]) return;
      seen[clean] = 1;
      videos.push({ url: clean, quality, originalUrl: clean, headers: this._mediaHeaders() });
    };

    // 1. Some posts embed a direct m3u8/mp4 in the page itself.
    this._grabMedia(html, push);

    // 2. The player is an iframe: mythav.org/player/r.php?r=<base64 of the
    //    upload18.org/play/index/<code> page>. That page carries the signed
    //    helvid CDN URL in PLAYER_CONFIG. The URL has no literal ".m3u8" (its
    //    path is base64: /m/L3Yv...), so it must never be filtered on
    //    extension — only on the presence of a real http(s) URL.
    if (videos.length === 0) {
      const frames = [];
      const iframeRe = /<iframe[^>]+src=["']([^"']+)["']/gi;
      let m;
      while ((m = iframeRe.exec(html)) !== null) frames.push(m[1]);
      const embed = _embedUrl(html);
      if (embed) frames.push(embed);

      for (let src of frames) {
        if (!src || !/player\/r\.php|play\/index|upload18/i.test(src)) continue;
        if (src.charAt(0) !== "h") src = new URL(src, url).href;
        let target = src;
        const rp = src.match(/[?&]r=([^&]+)/);
        if (rp) {
          const decoded = this._b64decode(decodeURIComponent(rp[1]));
          if (/^https?:\/\//.test(decoded)) target = decoded;
        }
        try {
          const headers = this.getHeaders(url);
          headers.Referer = url;
          const ifr = await new Client().get(target, { headers });
          this._grabMedia(ifr.body, push);
        } catch (e) { /* try the next frame */ }
        if (videos.length > 0) break;
      }
    }

    if (videos.length === 0) {
      // Nothing extractable (a client-side player or a new gate): hand the page
      // to the in-app browser so playback is still reachable.
      videos.push({
        url,
        originalUrl: url,
        quality: "Web player",
        type: "webview",
        kind: "webview",
        headers: this.getHeaders(url)
      });
    }
    return videos;
  }

  // Collect every media URL a player page exposes. The helvid URL sits in
  // `PLAYER_CONFIG.m3u8` (JSON with escaped slashes and \u0026), so decode the
  // JSON escapes rather than matching only a literal ".m3u8".
  _grabMedia(html, push) {
    const body = String(html || "");
    const cfg = body.match(/"m3u8"\s*:\s*"([^"]+)"/);
    if (cfg) push(this._unescape(cfg[1]), "HLS");
    const alt = body.match(/"alternate\d*"\s*:\s*"([^"]+)"/);
    if (alt && alt[1]) push(this._unescape(alt[1]), "HLS alt");

    const rx = /["'`](https?:\\?\/\\?\/[^"'`\s]+\.(?:m3u8|mp4|webm|m4v)[^"'`\s]*)["'`]/gi;
    let m;
    while ((m = rx.exec(body)) !== null) {
      push(this._unescape(m[1]), /\.mp4/i.test(m[1]) ? "MP4" : "HLS");
    }

    // Helvid's own signed URL: /m/<base64> or /s/<hex>, with no extension.
    const helvid = body.match(/["'`](https?:\\?\/\\?\/[^"'`\s]*\/m\/[A-Za-z0-9_\-=%]+[^"'`\s]*)["'`]/i);
    if (helvid) push(this._unescape(helvid[1]), "HLS");
  }

  _unescape(s) {
    return String(s || "")
      .replace(/\\u0026/gi, "&")
      .replace(/\\u003d/gi, "=")
      .replace(/\\\//g, "/")
      .replace(/\\"/g, '"')
      .replace(/&amp;/g, "&")
      .trim();
  }

  _clean(s) {
    return this._unescape(s).replace(/[\\"',;]+$/, "").trim();
  }

  // The QuickJS bridge exposes neither Buffer nor atob, so decode by hand.
  _b64decode(str) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const input = String(str || "").replace(/[^A-Za-z0-9+/=]/g, "");
    let output = "";
    for (let i = 0; i < input.length; i += 4) {
      const c0 = chars.indexOf(input.charAt(i));
      const c1 = chars.indexOf(input.charAt(i + 1));
      const c2 = chars.indexOf(input.charAt(i + 2));
      const c3 = chars.indexOf(input.charAt(i + 3));
      if (c0 < 0 || c1 < 0) break;
      output += String.fromCharCode((c0 << 2) | (c1 >> 4));
      if (c2 >= 0) output += String.fromCharCode(((c1 & 15) << 4) | (c2 >> 2));
      if (c3 >= 0) output += String.fromCharCode(((c2 & 3) << 6) | c3);
    }
    return output;
  }

  _isoDurationToClock(iso) {
    const m = String(iso || "").match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!m) return "";
    const days = Number(m[1] || 0), hours = Number(m[2] || 0), mins = Number(m[3] || 0), secs = Number(m[4] || 0);
    const totalMins = days * 1440 + hours * 60 + mins;
    if (!totalMins && !secs) return "";
    const hh = Math.floor(totalMins / 60);
    const mm = String(totalMins % 60).padStart(2, "0");
    const ss = String(secs).padStart(2, "0");
    return (hh > 0 ? hh + ":" + mm : mm) + ":" + ss;
  }

  // ── Home / browse sections ────────────────────────────────────────────────
  // Layout ids are resolved here. Routes verified live:
  //   /update/page/N/  /release/page/N/  /rate/page/N/  /beingwatched/page/N/
  //   /tag/<id>/<slug>/page/N/   /site/<id>/<slug>/page/N/
  // The directory ids (actresses, makers, labels, directors, tags) return
  // entity cards; tapping one opens its listing through collectionId.
  async getCustomList(listId, page) {
    const id = String(listId || "");
    const p = Number(page) > 1 ? Number(page) : 1;

    const lists = {
      "latest": "/update/",
      "update": "/update/",
      "new": "/update/",
      "release": "/release/",
      "newreleases": "/release/",
      "rated": "/rate/",
      "toprated": "/rate/",
      "popular": "/rate/",
      "beingwatched": "/beingwatched/",
      "watching": "/beingwatched/"
    };
    if (lists[id]) {
      const url = `${BASE_URL}${lists[id]}page/${p}/`;
      const res = await new Client().get(url, { headers: this.getHeaders(url) });
      return this._parse(res.body, ORIGIN);
    }

    const directories = {
      "actresses": ["/actresses/", "/actress/"],
      "makers": ["/makers/", "/maker/"],
      "labels": ["/labels/", "/label/"],
      "directors": ["/directors/", "/director/"],
      "tags": ["/tags/", "/tag/"]
    };
    if (directories[id]) {
      const dir = directories[id];
      const url = `${BASE_URL}${dir[0]}page/${p}/`;
      const res = await new Client().get(url, { headers: this.getHeaders(url) });
      const items = this._directory(res.body, ORIGIN, dir[1]);
      return { list: items, hasNextPage: items.length >= 20 };
    }

    // Studios have no directory page: the only complete list is the site menu,
    // repeated on the home page.
    if (id === "sites" || id === "studios") {
      const url = `${BASE_URL}/`;
      const res = await new Client().get(url, { headers: this.getHeaders(url) });
      return { list: this._directory(res.body, ORIGIN, "/site/"), hasNextPage: false };
    }

    // A single tag/studio/actress listing, e.g. `tag_343_vr`,
    // `site_7_uncensored-leak`, `actress_27390_honoka-ashina`.
    const keyed = id.match(/^(tag|site|maker|label|director|actress)_(.+)$/);
    if (keyed) {
      const kind = keyed[1];
      const parts = keyed[2].split("_");
      const numericId = /^\d+$/.test(parts[0]) ? parts.shift() : null;
      const slug = parts.join("-");
      const path = numericId ? `/${kind}/${numericId}/${slug}/` : `/${kind}/`;
      const url = `${BASE_URL}${path}page/${p}/`;
      const res = await new Client().get(url, { headers: this.getHeaders(url) });
      return this._parse(res.body, ORIGIN);
    }

    // profile_<hex of the target path> — used by the person screen to page a
    // studio/actress listing. The hex is UTF-16 code units, matching the app.
    if (id.indexOf("profile_") === 0) {
      const path = this._fromHex(id.slice(8));
      if (!path) return { list: [], hasNextPage: false };
      const base = path.charAt(0) === "h" ? path : BASE_URL + path;
      const pageUrl = p > 1 ? base.replace(/\/$/, "") + `/page/${p}/` : base;
      const res = await new Client().get(pageUrl, { headers: this.getHeaders(pageUrl) });
      const own = this._parse(res.body, ORIGIN);
      if (own.list.length) return own;
      return { list: this._videos(res.body, ORIGIN), hasNextPage: false };
    }

    throw new Error("Unknown custom list: " + id);
  }

  _directory(html, base, prefix) {
    const doc = new Document(html);
    const out = [];
    const seen = {};
    const kind = prefix.replace(/\//g, "");
    for (const a of doc.select("a")) {
      const href = (a.attr("href") || "").trim();
      if (!href || href.charAt(0) === "#" || /^javascript:/i.test(href)) continue;
      let path;
      try { path = new URL(href, base).pathname; } catch (e) { continue; }
      if (path.indexOf(prefix) !== 0) continue;
      const segs = path.split("/").filter(Boolean);
      if (segs.length < 2) continue;
      const slug = segs[segs.length - 1];
      const numericId = /^\d+$/.test(segs[segs.length - 2]) ? segs[segs.length - 2] : null;
      if (!slug || /^\d+$/.test(slug)) continue;
      if (seen[path]) continue;
      seen[path] = 1;
      const img = a.selectFirst("img");
      const name = ((a.attr("title") || (img ? img.attr("alt") : "") || a.text || slug) || "")
        .replace(/\s+/g, " ").replace(/\s+\d[\d,]*$/, "").trim();
      if (!name) continue;
      const imageUrl = img ? (img.attr("data-src") || img.attr("src") || "") : "";
      // Encode the listing as a collection id so tapping the card opens it
      // instead of treating the card as a person/detail entry.
      const collectionId = kind + "_" + (numericId ? numericId + "_" : "") + slug;
      out.push({ name, imageUrl, link: new URL(path, base).href, collectionId });
      if (out.length >= 240) break;
    }
    return out;
  }

  _videos(html, base) {
    const doc = new Document(html);
    const out = [];
    const seen = {};
    for (const a of doc.select("a[href*='/video/']")) {
      const href = (a.attr("href") || "").trim();
      if (!href) continue;
      const link = href.charAt(0) === "h" ? href : new URL(href, base).href;
      if (seen[link]) continue;
      seen[link] = 1;
      const img = a.selectFirst("img");
      const name = ((a.attr("title") || (img ? img.attr("alt") : "") || a.text || "") || "").trim();
      if (!name) continue;
      const imageUrl = img ? (img.attr("data-src") || img.attr("src") || "") : "";
      out.push({ name, imageUrl, link });
    }
    return out;
  }

  _fromHex(hex) {
    const raw = String(hex || "");
    if (!raw || raw.length % 4 !== 0 || !/^[0-9a-f]+$/i.test(raw)) return "";
    let out = "";
    for (let i = 0; i < raw.length; i += 4) {
      out += String.fromCharCode(parseInt(raw.slice(i, i + 4), 16));
    }
    return out;
  }

  getFilterList() { return []; }

  getSourcePreferences() { return []; }
}

// The itemprop embedURL repeats the player iframe source and is present even
// when the iframe markup is lazy-loaded.
function _embedUrl(html) {
  const body = String(html || "");
  const m = body.match(/itemprop=["']embedURL["'][^>]*content=["']([^"']+)["']/i)
    || body.match(/content=["']([^"']*player\/r\.php[^"']*)["']/i);
  return m ? m[1] : "";
}
