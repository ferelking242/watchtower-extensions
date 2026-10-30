const watchtowerSources = [{
  "name": "JAV.guru",
  "lang": "ja",
  "baseUrl": "https://jav.guru",
  "apiUrl": "",
  "iconUrl": "https://cdn.javmiku.com/wp-content/uploads/2018/12/logofinal6.png",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.8",
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
  async _get(url) {
    let res;
    for (let attempt = 0; attempt < 4; attempt++) {
      res = await new Client().get(url, { headers: this.getHeaders(url) });
      if (res.statusCode !== 429 && res.statusCode !== 503) return res;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
    return res;
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

  async getVideoList(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const html = res.body;
    const videos = [];
    const m3u8Rx = /["'`](https?:\/\/[^"'`]+\.m3u8[^"'`]{0,150})["'`]/g;
    let m;
    while ((m = m3u8Rx.exec(html)) !== null) {
      if (!videos.find(v => v.url === m[1]))
        videos.push({ url: m[1], quality: "Auto", originalUrl: m[1], headers: this.getHeaders(url) });
    }
    if (videos.length === 0) {
      const mp4Rx = /["'`](https?:\/\/[^"'`]+\.mp4[^"'`]{0,150})["'`]/g;
      while ((m = mp4Rx.exec(html)) !== null) {
        if (!videos.find(v => v.url === m[1]))
          videos.push({ url: m[1], quality: "MP4", originalUrl: m[1], headers: this.getHeaders(url) });
        if (videos.length >= 3) break;
      }
    }
    if (videos.length === 0) {
      const iframeM = html.match(/src="(https?:\/\/(?!www\.google|facebook)[^"]{15,200})"/);
      if (iframeM) videos.push({ url: iframeM[1], quality: "Iframe", originalUrl: iframeM[1], headers: this.getHeaders(url) });
    }
        // Drop non-media candidates (script/style/icon matches) before falling back.
    const direct = videos.filter((v) => /\.(?:m3u8|mp4|webm|m4v)(?:[?#]|$)/i.test(v.url));
    videos.length = 0;
    videos.push(...direct);
    if (videos.length === 0) {
      // Player is assembled client-side, so hand the page to the in-app browser.
      videos.push({ url, originalUrl: url, quality: "Web player", type: "webview", kind: "webview", headers: this.getHeaders(url) });
    }
    return videos;
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
