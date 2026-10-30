const watchtowerSources = [{
  "name": "JAVBraze",
  "lang": "ja",
  "baseUrl": "https://javbraze.com",
  "apiUrl": "",
  "iconUrl": "https://javbraze.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.8",
  "login": false,
  "forYou": false,
  "pkgPath": "nsfw/watch/ja/javbraze.js",
  "notes": "JAVBraze — Japanese AV streaming",
  "isNsfw": true
}];

const BASE_URL = "https://javbraze.com";

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://javbraze.com/"
    };
  }
  async getPopular(page) {
    const url = page > 1 ? `${BASE_URL}/popular/${page}/` : `${BASE_URL}/popular/`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, BASE_URL);
  }
  get supportsLatest() { return true; }
  async getLatestUpdates(page) {
    const url = page > 1 ? `${BASE_URL}/recent/${page}/` : `${BASE_URL}/recent/`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, BASE_URL);
  }
  async search(query, page, filters) {
    // The site's /search/video/ index returns nothing server-side, so filter
    // the recent listing locally instead.
    const q = query.trim().toLowerCase();
    const url = page > 1 ? `${BASE_URL}/recent/${page}/` : `${BASE_URL}/recent/`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const parsed = this._parse(res.body, BASE_URL);
    const list = q ? parsed.list.filter((i) => (i.name || "").toLowerCase().includes(q)) : parsed.list;
    return { list, hasNextPage: parsed.hasNextPage };
  }
  _parse(html, base) {
    const doc = new Document(html);
    const items = [];
    const cards = doc.select(".well.well-sm, .well");
    for (const card of cards) {
      const a = card.selectFirst("a[href]");
      if (!a) continue;
      const href = a.attr("href") || "";
      if (!href || href.length < 4) continue;
      const img = card.selectFirst("img, video");
      const title = a.attr("title") || a.text?.trim() || "";
      const thumb = img?.attr("poster") || img?.attr("data-src") || img?.attr("src") || "";
      if (title && title.length > 2) items.push({ name: title.trim(), imageUrl: thumb, link: href.startsWith("http") ? href : base + href });
    }
    const hasNext = !!doc.selectFirst(".pagination a.prevnext, .pagination a[href$='/next/']");
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
    const m3u8Rx = /["'`](https?:\/\/[^"'`]+\.m3u8[^"'`]{0,150})["'`]/g;
    let m;
    while ((m = m3u8Rx.exec(html)) !== null) {
      if (!videos.find(v => v.url === m[1])) videos.push({ url: m[1], quality: "Auto", originalUrl: m[1], headers: this.getHeaders(url) });
    }
    if (videos.length === 0) {
      const mp4Rx = /["'`](https?:\/\/[^"'`]+\.mp4[^"'`]{0,150})["'`]/g;
      while ((m = mp4Rx.exec(html)) !== null) {
        if (!videos.find(v => v.url === m[1])) videos.push({ url: m[1], quality: "MP4", originalUrl: m[1], headers: this.getHeaders(url) });
        if (videos.length >= 3) break;
      }
    }
    if (videos.length === 0) { const f = html.match(/file\s*:\s*["']([^"']+)["']/); if (f) videos.push({ url: f[1], quality: "JWPlayer", originalUrl: f[1], headers: this.getHeaders(url) }); }
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
      if (!slug || NAV_RX.test(slug) || /^\d+$/.test(slug) || /^[a-z]$/i.test(slug) || slug.indexOf("$") >= 0) continue;
      // Person cards always carry a portrait; the A-Z directory links do not.
      if (!a.selectFirst("img")) continue;
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
      "pornstars": ["https://javbraze.com/pornstar/videos/", "^/pornstar/([^/?#]+)", {}],
      "categories": ["https://javbraze.com/categories/", "^/([a-z0-9][a-z0-9\-]*)/$",
        { skip: ["^pornstar$", "^categories$", "^recent$", "^popular$", "^upload$", "^login$", "^signup$", "^tag$", "^terms$", "^privacy$", "^static$", "^index$", "^all$"] }],
    };
    if (sections[listId]) {
      const url = sections[listId][0];
      const rx = new RegExp(sections[listId][1], "i");
      // Directory paginates as /pornstar/videos/{n}/.
      const pageUrl = p > 1 ? url.replace(/\/$/, "/" + p + "/") : url;
      const res = await new Client().get(pageUrl, this._wtHeaders(pageUrl));
      const people = this._wtDirectory(res.body, pageUrl, rx, sections[listId][2]);
      if (people.length) {
        const doc = new Document(res.body);
        const hasNext = doc.select("a.prevnext").some((a) => /next/i.test(a.text || ""));
        return { list: people, hasNextPage: hasNext };
      }
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
