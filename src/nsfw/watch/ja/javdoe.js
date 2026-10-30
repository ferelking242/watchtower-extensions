const watchtowerSources = [{
  "name": "JAVDoe",
  "lang": "ja",
  "baseUrl": "https://javdoe.sh",
  "apiUrl": "",
  "iconUrl": "https://javdoe.sh/logo/javdoe.png",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.7",
  "login": false,
  "forYou": false,
  "pkgPath": "nsfw/watch/ja/javdoe.js",
  "notes": "JAV free streaming — Japanese porn HD",
  "isNsfw": true
}];

const BASE_URL = "https://javdoe.sh";

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://javdoe.sh/"
    };
  }

  async getPopular(page) {
    return this._browse(`${BASE_URL}/popular/`, page);
  }
  get supportsLatest() { return true; }
  async getLatestUpdates(page) {
    return this._browse(`${BASE_URL}/recent/`, page);
  }
  async search(query, page, filters) {
    const q = encodeURIComponent(query.trim());
    const url = `${BASE_URL}/search/video/?ajax=search_results&s=${q}&o=recent&t=all&d=all&c=0&page=${page}`;
    const res = await new Client().get(url, { headers: this._ajaxHeaders(url) });
    return this._parseJson(res.body, BASE_URL);
  }
  // Listing pages ship an empty skeleton and hydrate from ?ajax=browse_videos.
  async _browse(path, page) {
    // ?page=N is ignored by the backend; only the /path/N/ form advances.
    const url = page > 1 ? `${path}${page}/?ajax=browse_videos` : `${path}?ajax=browse_videos`;
    const res = await new Client().get(url, { headers: this._ajaxHeaders(url) });
    return this._parseJson(res.body, BASE_URL);
  }
  _ajaxHeaders(url) {
    const h = this.getHeaders(url);
    h["X-Requested-With"] = "XMLHttpRequest";
    return h;
  }
  _parseJson(body, base) {
    let data = {};
    try { data = JSON.parse(body); } catch (e) { return { list: [], hasNextPage: false }; }
    const doc = new Document(data.html || "");
    const items = [];
    for (const li of doc.select("li[id^='video-']")) {
      const a = li.selectFirst("a.thumbnail, a");
      if (!a) continue;
      const href = a.attr("href") || "";
      if (!href) continue;
      const img = li.selectFirst("img");
      const title = a.attr("title") || img?.attr("alt") || "";
      const thumb = img?.attr("src") || img?.attr("data-src") || "";
      if (title) items.push({ name: title.trim(), imageUrl: thumb, link: href.startsWith("http") ? href : base + href });
    }
    return { list: items, hasNextPage: !!data.next_url || items.length >= 20 };
  }
  async getDetail(url) {
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    const doc = new Document(res.body);
    const title = doc.selectFirst("meta[property='og:title']")?.attr("content")
      || doc.selectFirst("h1, h2")?.text || "Unknown";
    const thumb = doc.selectFirst("meta[property='og:image']")?.attr("content") || "";
    const tags = doc.select(".tags a, .genre a, [class*='tag'] a").map(el => ({ name: el.text.trim() }));
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
      const srcM = html.match(/<source[^>]+src=["']([^"']+)["']/);
      if (srcM) videos.push({ url: srcM[1], quality: "Source", originalUrl: srcM[1], headers: this.getHeaders(url) });
    }
    if (videos.length === 0) {
      const fileM = html.match(/file\s*:\s*["']([^"']+)["']/);
      if (fileM) videos.push({ url: fileM[1], quality: "JWPlayer", originalUrl: fileM[1], headers: this.getHeaders(url) });
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


  // Studio "channels" are search links (`/search/video/?s=<studio>`), not paths.
  _wtChannels(html, base) {
    const doc = new Document(html);
    const out = [];
    const seen = {};
    for (const card of doc.select(".video.channellist, li .channellist, .channellist")) {
      const a = card.selectFirst("a[href]");
      if (!a) continue;
      const href = (a.attr("href") || "").trim();
      if (!href) continue;
      const img = card.selectFirst("img");
      const nameEl = card.selectFirst(".namec, .name, h3, h4");
      const name = ((nameEl ? nameEl.text : "") || (img ? img.attr("alt") : "") || "").replace(/\s+/g, " ").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen[key]) continue;
      seen[key] = 1;
      const link = href.charAt(0) === "h" ? href : new URL(href, base).href;
      out.push({ name: name, imageUrl: img ? (img.attr("src") || img.attr("data-src") || "") : "", link: link });
    }
    return out;
  }

  // Category tiles: `/amateur/` + `.category-title` label.
  _wtCategories(html, base) {
    const doc = new Document(html);
    const out = [];
    const seen = {};
    for (const card of doc.select("li[id^='category-'], .category")) {
      const a = card.selectFirst("a[href]");
      if (!a) continue;
      const href = (a.attr("href") || "").trim();
      if (!href) continue;
      let path;
      try { path = new URL(href, base).pathname; } catch (e) { continue; }
      const slug = path.split("/").filter(Boolean).pop() || "";
      if (!slug || /^(categor|releaseday|recent|popular|login|page)$/i.test(slug)) continue;
      const img = card.selectFirst("img");
      const nameEl = card.selectFirst(".category-title, .name, h3");
      const name = ((nameEl ? nameEl.text : "") || (img ? img.attr("alt") : "") || slug).replace(/\s+/g, " ").trim();
      if (!name || seen[name.toLowerCase()]) continue;
      seen[name.toLowerCase()] = 1;
      const link = href.charAt(0) === "h" ? href : new URL(href, base).href;
      out.push({ name: name, imageUrl: img ? (img.attr("src") || img.attr("data-src") || "") : "", link: link });
    }
    return out;
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
      if (/help\.pornhub|\/(tags?|categor|genres?|models?|pornstars?|actress|channels?|studios?|makers?)\//i.test(path)) continue;
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
      "pornstars": ["https://javdoe.sh/pornstar/", "^/pornstar/([^/?#]+)", { skip: ["^(?:all|popular|rated|subscribed|videos|photos|pornstars|users|login|signup|new|hot|recent|latest|top|best|browse|index|[a-z])$"] }],
      "studios": ["https://javdoe.sh/channels/", null, {}],
      "categories": ["https://javdoe.sh/categories/?ajax=browse_categories", null, {}],
    };
    if (sections[listId]) {
      const url = sections[listId][0];
      const rx = new RegExp(sections[listId][1], "i");
      const pageUrl = p === 1 ? url : (url.indexOf("?") >= 0
        ? url + "page=" + p
        : url + (url.endsWith("/") ? "page/" + p + "/" : "?page=" + p));
      const res = await new Client().get(pageUrl, this._wtHeaders(pageUrl));
      if (listId === "studios") {
        const studios = this._wtChannels(res.body, pageUrl);
        if (studios.length) return { list: studios, hasNextPage: false };
      }
      if (listId === "categories") {
        const cats = this._wtCategories(res.body, pageUrl);
        if (cats.length) return { list: cats, hasNextPage: false };
      }
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
