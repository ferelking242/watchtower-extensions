const watchtowerSources = [{
  "name": "JAVHDToday",
  "lang": "ja",
  "baseUrl": "https://javhd.today",
  "apiUrl": "",
  "iconUrl": "https://javhd.today/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.8",
  "login": false,
  "forYou": false,
  "pkgPath": "nsfw/watch/ja/javhdtoday.js",
  "notes": "JAVHDToday — high definition JAV streaming",
  "isNsfw": true
}];

const BASE_URL = "https://javhd.today";

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://javhd.today/"
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
    const url = `${BASE_URL}/search/video/?s=${q}&ajax=1&page=${page}`;
    const res = await new Client().get(url, { headers: this._ajaxHeaders(url) });
    const parsed = this._parseJson(res.body, BASE_URL);
    if (parsed.list.length) return parsed;
    // Short queries return nothing from the search index; filter recent locally.
    const recent = await this._browse(`${BASE_URL}/recent/`, page);
    const needle = query.trim().toLowerCase();
    return {
      list: recent.list.filter((i) => (i.name || "").toLowerCase().includes(needle)),
      hasNextPage: recent.hasNextPage,
    };
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
    // The browse endpoint switches between a JSON envelope and raw HTML.
    let data = {};
    let html = body;
    try { data = JSON.parse(body); html = data.html || ""; } catch (e) { data = {}; }
    const doc = new Document(html);
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
    return videos;
  }

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

  getFilterList() { return []; }
  getSourcePreferences() { return []; }

  _wtHeaders(url) { return this.getHeaders ? this.getHeaders(url) : {}; }
  _wtGenres(html, base) {
    const doc = new Document(html);
    const out = [];
    const seen = {};
    const NAV_RX = /^(?:all genre|categories|popular|recent|releaseday|playlists|request|photo|user|all|page)$/i;
    // The site ships two `li.dropdown-large` menus; only the Genre one lists genres.
    for (const menu of doc.select("li.dropdown-large")) {
      const toggle = menu.selectFirst("a.dropdown-toggle");
      const label = ((toggle ? toggle.text : "") || "").replace(/\s+/g, " ").trim();
      if (!/^genre/i.test(label)) continue;
      for (const a of menu.select("ul.dropdown-menu a")) {
        const href = (a.attr("href") || "").trim();
        if (!href || href.charAt(0) === "#" || /^javascript:/i.test(href)) continue;
        let path;
        try { path = new URL(href, base).pathname; } catch (e) { continue; }
        const slug = path.split("/").filter(Boolean).pop() || "";
        if (!slug || /^\d+$/.test(slug)) continue;
        const name = ((a.text || slug) || "").replace(/\s+/g, " ").trim();
        if (!name || NAV_RX.test(name)) continue;
        const key = slug.toLowerCase();
        if (seen[key]) continue;
        seen[key] = 1;
        // Some hrefs are malformed in the source markup ("hhttps://…"); rebuild from the slug.
        out.push({ name: name, imageUrl: "", link: new URL("/" + slug + "/", base).href });
      }
    }
    return out;
  }
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
      "pornstars": ["https://javhd.today/pornstar/", "^/pornstar/([^/?#]+)", { skip: ["^(?:all|popular|rated|subscribed|videos|photos|pornstars|users|login|signup|new|hot|recent|latest|top|best|browse|index|[a-z])$"] }],
      "genres": ["https://javhd.today/categories/", null, {}],
      "studios": ["https://javhd.today/channels/", null, {}],
    };
    if (sections[listId]) {
      const url = sections[listId][0];
      const rx = new RegExp(sections[listId][1], "i");
      const pageUrl = p === 1 ? url : (url.indexOf("?") >= 0
        ? url + "page=" + p
        : url + (url.endsWith("/") ? "page/" + p + "/" : "?page=" + p));
      const res = await new Client().get(pageUrl, this._wtHeaders(pageUrl));
      if (listId === "genres") {
        const genres = this._wtGenres(res.body, pageUrl);
        if (genres.length) return { list: genres, hasNextPage: false };
      }
      if (listId === "studios") {
        const studios = this._wtChannels(res.body, pageUrl);
        if (studios.length) return { list: studios, hasNextPage: false };
      }
      const people = this._wtPeople(res.body, pageUrl, rx);
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
