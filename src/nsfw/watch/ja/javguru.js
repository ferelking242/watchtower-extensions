const watchtowerSources = [{
  "name": "JAV.guru",
  "lang": "ja",
  "baseUrl": "https://jav.guru",
  "apiUrl": "",
  "iconUrl": "https://cdn.javmiku.com/wp-content/uploads/2018/12/logofinal6.png",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.9",
  "login": false,
  "forYou": false,
  "pkgPath": "nsfw/watch/ja/javguru.js",
  "notes": "JAV WordPress site — Japanese AV streaming",
  "isNsfw": true
}];

const BASE_URL = "https://jav.guru";

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://jav.guru/"
    };
  }

  // jav.guru answers 429 on roughly every other request; retry with backoff
  // so list pages 2+ are not silently parsed as empty.
  //
  // Headers go in flat: wrapping them in `{ headers: ... }` ships a bogus
  // "headers" header and drops the User-Agent/Referer entirely.
  async _get(url) {
    let res;
    for (let attempt = 0; attempt < 4; attempt++) {
      res = await new Client().get(url, this.getHeaders(url));
      if (res.statusCode !== 429 && res.statusCode !== 503) return res;
      await this._delay(1500 * (attempt + 1));
    }
    return res;
  }

  // The extension runtime ships no timer, so a missing `setTimeout` must
  // degrade to "no backoff" rather than throw on a 429.
  _delay(ms) {
    return new Promise((resolve) => {
      if (typeof setTimeout === "function") setTimeout(resolve, ms);
      else resolve();
    });
  }
  async getPopular(page) {
    const url = `${BASE_URL}/page/${page}/`;
    return this._parse((await this._get(url)).body, BASE_URL);
  }
  get supportsLatest() { return true; }
  async getLatestUpdates(page) {
    const url = page > 1 ? `${BASE_URL}/page/${page}/?orderby=date` : `${BASE_URL}/?orderby=date`;
    return this._parse((await this._get(url)).body, BASE_URL);
  }
  async search(query, page, filters) {
    const q = encodeURIComponent(query.trim());
    const url = page > 1 ? `${BASE_URL}/page/${page}/?s=${q}` : `${BASE_URL}/?s=${q}`;
    return this._parse((await this._get(url)).body, BASE_URL);
  }
  _parse(html, base) {
    const doc = new Document(html);
    const items = [];
    const cards = doc.select(".inside-article, article, .post");
    for (const card of cards) {
      const a = card.selectFirst("h2 a, h1 a, .entry-title a, a[rel='bookmark']");
      if (!a) continue;
      const href = a.attr("href") || "";
      if (!href) continue;
      const title = a.text?.trim() || a.attr("title") || "";
      const img = card.selectFirst("img.wp-post-image, .post-thumbnail img, img[class*='thumb'], img");
      const thumb = img?.attr("data-lazy-src") || img?.attr("data-src") || img?.attr("src") || "";
      items.push({ name: title, imageUrl: thumb, link: href });
    }
    const hasNext = !!doc.selectFirst("a.next.page-numbers, a[rel='next'], .nav-previous a");
    return { list: items, hasNextPage: hasNext || items.length >= 15 };
  }
  async getDetail(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const doc = new Document(res.body);
    const title = doc.selectFirst("meta[property='og:title']")?.attr("content")
      || doc.selectFirst("h1.entry-title, h1")?.text || "Unknown";
    const thumb = doc.selectFirst("meta[property='og:image']")?.attr("content")
      || doc.selectFirst("img.wp-post-image")?.attr("src") || "";
    const tags = doc.select(".tags-links a, .entry-footer a, .genre a").map(el => ({ name: el.text.trim() }));
    return {
      name: title.trim(), imageUrl: thumb, description: "",
      genre: tags, episodes: [{ name: title.trim() || "Watch", url }]
    };
  }

  // The watch page never carries a playable URL. Each of its four servers is
  // a base64 `iframe_url` pointing at a jav.guru interstitial
  // (`/searcho/?<letter>d=<hex>&bg=…`); the interstitial 302s to the real
  // embed, whose player config is hidden in a P.A.C.K.E.R `eval(function(p,a,
  // c,k,e,d)…` block that lists the signed HLS masters. Only `hls2`
  // (premilkyway) and `hls4` (javclan) are real `.m3u8`; `hls3`
  // (tradeexecution.cfd) points at a `.txt` that answers 403, so the `.m3u8`
  // filter drops it instead of shipping a dead entry. The app expands the
  // master into real renditions, so the leading entry keeps the plain "Auto"
  // label and the alternate CDN carries its host.
  async getVideoList(url) {
    const res = await this._get(url);
    const html = res.body || "";

    const masters = [];
    const pushMaster = (candidate, embedUrl) => {
      if (!candidate || !/^https?:\/\//i.test(candidate)) return;
      if (!/\.m3u8(\?|#|$)/i.test(candidate)) return;
      if (masters.some((entry) => entry.url === candidate)) return;
      masters.push({ url: candidate, embedUrl: embedUrl });
    };

    // `getVideoList` sits on the video-startup path, so stop at the first
    // server that yields a master instead of resolving all four: one gateway
    // already exposes both CDNs, and each extra server costs two round-trips
    // before the player can start.
    for (const gateway of this._interstitialUrls(html)) {
      const embed = await this._fetchEmbed(gateway, url);
      for (const master of this._extractMasters(embed.body, embed.url)) {
        pushMaster(master, embed.url);
      }
      if (masters.length) break;
    }

    // A few mirrors inline the playlist in the watch page itself.
    if (masters.length === 0) {
      for (const direct of this._plainMedia(html)) pushMaster(direct, url);
    }

    if (masters.length === 0) {
      // Player is assembled client-side and nothing could be resolved: hand the
      // page to the in-app browser rather than returning an empty list.
      return [{
        url, originalUrl: url, quality: "Web player",
        type: "webview", kind: "webview", headers: this.getHeaders(url)
      }];
    }

    // premilkyway first (the working host), then the rest in discovery order.
    masters.sort((a, b) => {
      const rank = (entry) => (/premilkyway/i.test(entry.url) ? 0 : 1);
      return rank(a) - rank(b);
    });

    return masters.map((entry, index) => {
      const host = (entry.url.match(/^https?:\/\/([^/]+)/) || [])[1] || "auto";
      return {
        url: entry.url,
        quality: index === 0 ? "Auto" : "Auto · " + host.replace(/^www\./, ""),
        originalUrl: entry.url,
        headers: this._mediaHeaders(entry.embedUrl)
      };
    });
  }

  // Media requests go to a third-party CDN, not to jav.guru, so the Referer
  // must be the embed page that served the signed URL.
  _mediaHeaders(embedUrl) {
    const headers = this.getHeaders(embedUrl);
    if (embedUrl) headers["Referer"] = embedUrl;
    return headers;
  }

  // The watch page embeds its servers as `"iframe_url":"<base64>"`. The base64
  // payload is `https://jav.guru/searcho/?<name>=<hex>&bg=…`; the interstitial
  // expects the token reversed under `<name[0]>r`.
  _interstitialUrls(html) {
    const out = [];
    const rx = /"iframe_url"\s*:\s*"([A-Za-z0-9+/=]+)"/g;
    let m;
    while ((m = rx.exec(html)) !== null) {
      let decoded = "";
      try { decoded = this._base64Decode(m[1]); } catch (error) { continue; }
      if (!decoded) continue;
      const query = decoded.split("?")[1] || "";
      const param = query.split("&")[0].split("=");
      const name = param[0] || "";
      const value = param[1] || "";
      if (!name || !value) continue;
      out.push(`${BASE_URL}/searcho/?${name.charAt(0)}r=${value.split("").reverse().join("")}`);
    }
    return out;
  }

  _base64Decode(input) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const clean = String(input).replace(/[^A-Za-z0-9+/=]/g, "");
    let bits = 0;
    let value = 0;
    let out = "";
    for (let i = 0; i < clean.length; i++) {
      const ch = clean.charAt(i);
      if (ch === "=") break;
      const index = alphabet.indexOf(ch);
      if (index < 0) continue;
      value = (value << 6) | index;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        out += String.fromCharCode((value >> bits) & 0xff);
      }
    }
    return out;
  }

  // Fetches a server's embed page through its jav.guru interstitial.
  //
  // The interstitial 302s to the real embed. The default client follows the
  // redirect and returns the embed body directly, while the Dart client with
  // `followRedirects:false` exposes the 302 and its Location header (the same
  // pattern the repo's other redirect-based extractors use) — that URL is what
  // the CDN wants as Referer, so it is preferred when available.
  async _fetchEmbed(gateway, pageUrl) {
    const headers = this.getHeaders(pageUrl);
    let res = null;
    try {
      res = await new Client({ useDartHttpClient: true, followRedirects: false }).get(gateway, headers);
    } catch (error) {
      res = null;
    }

    if (res) {
      let location = "";
      const responseHeaders = res.headers || {};
      for (const key of Object.keys(responseHeaders)) {
        if (key.toLowerCase() === "location" && responseHeaders[key]) {
          location = responseHeaders[key];
          break;
        }
      }
      if (location) {
        const embed = await this._getEmbed(location);
        return { body: embed.body, url: location };
      }
      // A followed redirect already carried the embed body in `res`.
      if (this._looksLikeEmbed(res.body)) return { body: res.body, url: res.url || gateway };
    }

    // Last resort: the default client follows the redirect itself.
    const embed = await this._getEmbed(gateway);
    return { body: embed.body, url: gateway };
  }

  async _getEmbed(embedUrl) {
    try {
      const res = await this._get(embedUrl);
      return { body: res.body || "" };
    } catch (error) {
      return { body: "" };
    }
  }

  // The interstitial is the "tap to play" shell: it carries the reversed-token
  // player script but never a playlist.
  _looksLikeEmbed(body) {
    const text = String(body || "");
    if (!text) return false;
    if (/eval\(function\(p,a,c,k,e,d\)/.test(text)) return true;
    return /["']hls\d*["']\s*:/.test(text);
  }

  // Unwraps the player config: the packed block hides `hls2`/`hls3`/`hls4` (and
  // occasionally `file`/`src`) behind `eval(function(p,a,c,k,e,d)…`, so both the
  // packed and the raw body are scanned.
  _extractMasters(body, embedUrl) {
    const out = [];
    const sources = [String(body || "")].concat(this._unpackPackedScripts(String(body || "")));
    const base = (embedUrl.match(/^https?:\/\/[^/]+/) || [""])[0];
    for (const source of sources) {
      const rx = /["'](?:hls\d*|file|src|source|master)["']\s*:\s*["']([^"']+\.m3u8[^"']*)["']/gi;
      let m;
      while ((m = rx.exec(source)) !== null) {
        const value = m[1].replace(/\\\//g, "/");
        const absolute = value.charAt(0) === "h" ? value : base + value;
        if (!out.includes(absolute)) out.push(absolute);
      }
    }
    return out;
  }

  // Direct `.m3u8` URLs some mirrors still inline in the watch page.
  _plainMedia(html) {
    const out = [];
    const rx = /["'`](https?:\/\/[^"'`\s]+\.m3u8[^"'`\s]*)["'`]/g;
    let m;
    while ((m = rx.exec(String(html || ""))) !== null) {
      if (!out.includes(m[1])) out.push(m[1]);
    }
    return out;
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
        const base = parseInt(match[2], 10) || 62;
        for (let index = count - 1; index >= 0; index--) {
          const token = this._packerToken(index, base);
          const word = words[index] || token;
          payload = payload.replace(new RegExp("\\b" + token + "\\b", "g"), word);
        }
        decoded.push(payload.replace(/\\\//g, "/"));
      } catch (error) {
        // A malformed block must never break playback: the raw body and the
        // other servers still carry the stream.
      }
    }
    return decoded;
  }

  // P.A.C.K.E.R writes token N in base `base` (sites use 15/16/62, and
  // Number#toString only accepts radix 2-36).
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


  _wtDirectory(html, base, rx, opts) {
    const o = opts || {};
    const skip = (o.skip || []).map((s) => new RegExp(s, "i"));
    const doc = new Document(html);
    const out = [];
    const seen = {};
    for (const a of doc.select("a")) {
      const href = (a.attr("href") || "").trim();
      if (!href || href.charAt(0) === "#" || /^javascript:/i.test(href)) continue;
      let path;
      try { path = new URL(href, base).pathname; } catch (e) { continue; }
      const m = path.match(rx);
      if (!m) continue;
      const slug = decodeURIComponent(m[1] || path.split("/").filter(Boolean).pop() || "");
      if (!slug || /^\d+$/.test(slug)) continue;
      if (skip.some((s) => s.test(slug))) continue;
      const key = slug.toLowerCase();
      if (seen[key]) continue;
      seen[key] = 1;
      const img = a.selectFirst("img");
      const nameEl = o.nameSel ? a.selectFirst(o.nameSel) : null;
      const name = ((nameEl ? nameEl.text : "") || a.attr("title") || (img ? img.attr("alt") : "") || a.text || slug || "")
        .replace(/\s+/g, " ").replace(/\s+\d[\d,]*$/, "").trim();
      if (!name) continue;
      const link = href.charAt(0) === "h" ? href : new URL(href, base).href;
      const imageUrl = img ? (img.attr("data-src") || img.attr("src") || "") : "";
      out.push({ name: name, imageUrl: imageUrl, link: link });
      if (out.length >= 240) break;
    }
    return out;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }

  _wtHeaders(url) { return this.getHeaders ? this.getHeaders(url) : {}; }
  _wtPeople(html, base, rx) {
    const doc = new Document(html);
    const out = [];
    const seen = {};
    for (const a of doc.select("a")) {
      const href = (a.attr("href") || "").trim();
      if (!href || href.charAt(0) === "#" || /^javascript:/i.test(href)) continue;
      let path;
      try { path = new URL(href, base).pathname; } catch (e) { continue; }
      const m = path.match(rx);
      if (!m) continue;
      const slug = decodeURIComponent(m[1] || path.split("/").filter(Boolean).pop() || "");
      const NAV_RX = /^(?:all|page|popular|rated|subscribed|videos?|photos|pornstars|users|login|signup|new|hot|recent|latest|top|best|browse|uncensored|censored|index|[a-z])$/i;
      if (!slug || NAV_RX.test(slug) || /^\d+$/.test(slug) || slug.indexOf("$") >= 0) continue;
      const key = m[1].toLowerCase().replace(/s$/, "") + "/" + m[2];
      if (seen[key]) continue;
      seen[key] = 1;
      const img = a.selectFirst("img");
      // Directory rows append a video count, e.g. "Hatano Yui (2149)".
      const name = ((a.attr("title") || (img ? img.attr("alt") : "") || a.text || slug) || "")
        .replace(/\s*\(\d+\)\s*$/, "").trim();
      if (!name) continue;
      const link = href.charAt(0) === "h" ? href : new URL(href, base).href;
      const imageUrl = img ? (img.attr("data-src") || img.attr("src") || "") : "";
      out.push({ name: name, imageUrl: imageUrl, link: link });
      if (out.length >= 240) break;
    }
    return out;
  }
  _wtVideos(html, base) {
    const doc = new Document(html);
    const out = [];
    const seen = {};
    for (const a of doc.select("a")) {
      const href = (a.attr("href") || "").trim();
      if (!href || href.charAt(0) === "#" || /^javascript:/i.test(href)) continue;
      let u;
      try { u = new URL(href, base); } catch (e) { continue; }
      const path = u.pathname;
      const slug = decodeURIComponent(path.split("/").filter(Boolean).pop() || "");
      if (!/(\/video|\/videos|\/watch|-\d{2,}\/|-\d{2,}$|\/[a-z0-9]{5,}-\d{2,}|\/\d{4,}\/|dm\d+\/|\.html$)/i.test(path)) continue;
      if (/help\.pornhub|\/(tags?|categor|genres?|models?|pornstars?|actress|channels?|studios?|makers?)\//i.test(path)) continue;
      if (seen[path]) continue;
      seen[path] = 1;
      const img = a.selectFirst("img");
      // Directory rows append a video count, e.g. "Hatano Yui (2149)".
      const name = ((a.attr("title") || (img ? img.attr("alt") : "") || a.text || slug) || "")
        .replace(/\s*\(\d+\)\s*$/, "").trim();
      if (!name) continue;
      const imageUrl = img ? (img.attr("data-src") || img.attr("src") || "") : "";
      out.push({ name: name, imageUrl: imageUrl, link: u.href });
    }
    return out;
  }
  async getCustomList(listId, page) {
    const p = Number(page) > 1 ? Number(page) : 1;
    const base = this.source && this.source.baseUrl ? this.source.baseUrl : "";
    const sections = {
      "tags": ["https://jav.guru/jav-tags-list/", "^/tag/([^/?#]+)", { nameSel: ".tagname" }],
      "actresses": ["https://jav.guru/jav-actress-list/", "^/actress/([^/?#]+)", {}],
      "studios": ["https://jav.guru/jav-studio-list/", "^/studio/([^/?#]+)", { nameSel: ".tagname" }],
    };
    if (sections[listId]) {
      const url = sections[listId][0];
      const rx = new RegExp(sections[listId][1], "i");
      const pageUrl = p === 1 ? url : (url.indexOf("?") >= 0
        ? url + "page=" + p
        : url + (url.endsWith("/") ? "page/" + p + "/" : "?page=" + p));
      const res = await new Client().get(pageUrl, this._wtHeaders(pageUrl));
      const people = this._wtDirectory(res.body, pageUrl, rx, sections[listId][2]);
      if (people.length) return { list: people, hasNextPage: people.length >= 240 };
      const own = this._parse(res.body, pageUrl);
      if (own && own.list && own.list.length) return own;
      return { list: [], hasNextPage: false };
    }
    if (listId && listId.indexOf("profile_") === 0) {
      const hex = listId.slice(8);
      let path = "";
      for (let i = 0; i + 4 <= hex.length; i += 4) path += String.fromCharCode(parseInt(hex.substr(i, 4), 16));
      const pageUrl = path.charAt(0) === "h" ? path : base + path;
      const res = await new Client().get(pageUrl, this._wtHeaders(pageUrl));
      const own = this._parse(res.body, pageUrl);
      let list = own && own.list && own.list.length ? own.list : [];
      if (!list.length) list = this._wtVideos(res.body, pageUrl);
      return { list: list, hasNextPage: false };
    }
    throw new Error("Unknown custom list: " + listId);
  }

}
