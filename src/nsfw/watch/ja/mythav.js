const watchtowerSources = [{
  "name": "MyThav",
  "lang": "ja",
  "baseUrl": "https://mythav.com",
  "apiUrl": "",
  "iconUrl": "https://mythav.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.5",
  "login": false,
  "forYou": false,
  "pkgPath": "nsfw/watch/ja/mythav.js",
  "notes": "MyThav — JAV streaming portal",
  "isNsfw": true
}];

const BASE_URL = "https://mythav.com";

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://mythav.com/"
    };
  }
  async getPopular(page) {
    const url = page > 1 ? `${BASE_URL}/page/${page}/` : `${BASE_URL}/`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, BASE_URL);
  }
  get supportsLatest() { return true; }
  async getLatestUpdates(page) {
    const url = `${BASE_URL}/update/page/${page}/`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, BASE_URL);
  }
  async search(query, page, filters) {
    const q = encodeURIComponent(query.trim());
    const url = page > 1 ? `${BASE_URL}/page/${page}/?s=${q}` : `${BASE_URL}/?s=${q}`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, BASE_URL);
  }
  _parse(html, base) {
    const doc = new Document(html);
    const items = [];
    const cards = doc.select("article.loop-video, article, .videos-list article");
    for (const card of cards) {
      const a = card.selectFirst("a[href*='/video/'], h2 a, h3 a, a");
      if (!a) continue;
      const href = a.attr("href") || "";
      if (!href || href.length < 15) continue;
      const img = card.selectFirst("img");
      const title = a.attr("title") || img?.attr("alt") || a.text?.trim() || "";
      const thumb = img?.attr("data-src") || img?.attr("data-lazy-src") || img?.attr("src") || "";
      if (title && title.length > 2) items.push({ name: title.trim(), imageUrl: thumb, link: href.startsWith("http") ? href : base + href });
    }
    const hasNext = !!doc.selectFirst(".pagination a.inactive, .pagination a[href*='/page/']");
    return { list: items, hasNextPage: hasNext || items.length >= 15 };
  }
  async getDetail(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const doc = new Document(res.body);
    const title = doc.selectFirst("meta[property='og:title']")?.attr("content") || doc.selectFirst("h1")?.text || "Unknown";
    const thumb = doc.selectFirst("meta[property='og:image']")?.attr("content") || "";
    const tags = doc.select(".tags a, [class*='tag'] a").map(el => ({ name: el.text.trim() }));
    return { name: title.trim(), imageUrl: thumb, description: "", genre: tags, episodes: [{ name: title.trim() || "Watch", url }] };
  }
  async getVideoList(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const html = res.body;
    const videos = [];
    const seen = new Set();
    const push = (src, quality) => {
      if (!src || seen.has(src)) return;
      seen.add(src);
      videos.push({ url: src, quality, originalUrl: src, headers: this.getHeaders(url) });
    };
    // Player is an iframe -> mythav.org/player/r.php?r=<b64 of upload18.org/play/index/<code>>
    const clean = (s) => (s || "").replace(/\\u0026/g, "&").replace(/\\\//g, "/");
    const grabM3u8 = (h) => {
      const src1 = (h.match(/"m3u8"\s*:\s*"([^"]+)"/) || [])[1];
      if (src1) push(clean(src1), "HLS");
      const m3u8Rx = /["'`](https?:\\?\/\\?\/[^"'`]+\.[^"'`]*m3u8[^"'`]*)["'`]/g;
      let m;
      while ((m = m3u8Rx.exec(h)) !== null) push(clean(m[1]), "HLS");
      if (videos.length === 0) {
        const mp4Rx = /["'`](https?:\\?\/\\?\/[^"'`]+\.mp4[^"'`]{0,150})["'`]/g;
        while ((m = mp4Rx.exec(h)) !== null) { push(clean(m[1]), "MP4"); }
      }
    };
    const iframeRe = /<iframe[^>]+src="([^"]+)"/gi;
    let m;
    const frames = [];
    while ((m = iframeRe.exec(html)) !== null) frames.push(m[1]);
    for (let src of frames) {
      if (!src || !/player\/r\.php|play\/index|upload/i.test(src)) continue;
      if (!src.startsWith("http")) src = new URL(src, url).href;
      try {
        // r.php carries a base64 target URL; resolve it directly
        const rp = src.match(/[?&]r=([^&]+)/);
        let target = src;
        if (rp) {
          try {
            const dec = Buffer.from(decodeURIComponent(rp[1]), "base64").toString("utf8");
            if (/^https?:\/\//.test(dec)) target = dec;
          } catch (_) {}
        }
        const ifr = await new Client().get(target, { ...this.getHeaders(url), Referer: url });
        grabM3u8(ifr.body);
      } catch (_) {}
      if (videos.length > 0) break;
    }
    if (videos.length === 0) grabM3u8(html);
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
      const key = slug.toLowerCase();
      if (seen[key]) continue;
      seen[key] = 1;
      const img = a.selectFirst("img");
      const name = ((a.attr("title") || (img ? img.attr("alt") : "") || a.text || slug) || "").trim();
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
      if (/\/(tags?|categor|genres?|models?|pornstars?|actress|performers?|idols?|channels?|studios?|makers?|labels?|series)\//i.test(path)) continue;
      if (seen[path]) continue;
      seen[path] = 1;
      const img = a.selectFirst("img");
      const name = ((a.attr("title") || (img ? img.attr("alt") : "") || a.text || slug) || "").trim();
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
      "actresses": ["https://mythav.com/actresses/", "^/actress/(?:\\d+/)?([^/?#]+)", {}],
      "makers": ["https://mythav.com/makers/", "^/maker/(?:\\d+/)?([^/?#]+)", {}],
      "labels": ["https://mythav.com/labels/", "^/label/(?:\\d+/)?([^/?#]+)", {}],
      "directors": ["https://mythav.com/directors/", "^/director/(?:\\d+/)?([^/?#]+)", {}],
      "tags": ["https://mythav.com/tags/", "^/tag/(?:\\d+/)?([^/?#]+)", {}],
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
}
