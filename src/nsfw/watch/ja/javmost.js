const watchtowerSources = [{
  "name": "JAVMost",
  "lang": "ja",
  "baseUrl": "https://www.javmost.ws",
  "apiUrl": "",
  "iconUrl": "https://www.javmost.ws/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.7",
  "login": false,
  "forYou": false,
  "pkgPath": "nsfw/watch/ja/javmost.js",
  "notes": "Watch free JAV online streaming",
  "isNsfw": true
}];

const BASE_URL = "https://www.javmost.ws";

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": "https://www.javmost.ws/"
    };
  }

  async getPopular(page) {
    const url = `${BASE_URL}/rating/all/page/${page}/`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, BASE_URL);
  }

  get supportsLatest() { return true; }

  async getLatestUpdates(page) {
    const url = page > 1 ? `${BASE_URL}/release/new/page/${page}/` : `${BASE_URL}/release/new/`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, BASE_URL);
  }

  async search(query, page, filters) {
    const q = encodeURIComponent(query.trim());
    const url = `${BASE_URL}/search/${q}/page/${page}/`;
    const res = await new Client().get(url, { headers: this.getHeaders(url) });
    return this._parse(res.body, BASE_URL);
  }

  _parse(html, base) {
    const doc = new Document(html);
    const items = [];
    // JAVMost cards: img.card-img-top[data-src], title in h1.card-title inside .card-block a
    const cards = doc.select(".card, .card-block, [class*='card']");
    for (const card of cards) {
      const titleEl = card.selectFirst("h1.card-title a, h2.card-title a, .card-title a");
      if (!titleEl) continue;
      const href = titleEl.attr("href") || "";
      if (!href) continue;
      const title = titleEl.attr("alt") || titleEl.text?.trim() || "";
      const img = card.selectFirst("img.card-img-top, img[data-src], img");
      const thumb = img?.attr("data-src") || img?.attr("src") || "";
      const link = href.startsWith("http") ? href : base + href;
      if (title) items.push({ name: title, imageUrl: thumb, link });
    }
    // fallback: direct img[data-src] + closest link
    if (items.length === 0) {
      const imgs = doc.select("img[data-src]");
      for (const img of imgs) {
        const thumb = img.attr("data-src") || "";
        const alt = img.attr("alt") || img.attr("name") || "";
        const link = base + "/" + alt + "/";
        if (alt) items.push({ name: alt, imageUrl: thumb, link });
      }
    }
    const hasNext = !!doc.selectFirst(".pagination .next, a[rel='next'], li.next a");
    return { list: items, hasNextPage: hasNext || items.length >= 12 };
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
      const fileM = html.match(/file\s*:\s*["']([^"']+)["']/);
      if (fileM) videos.push({ url: fileM[1], quality: "JWPlayer", originalUrl: fileM[1], headers: this.getHeaders(url) });
    }
    if (videos.length === 0) {
      const iframeM = html.match(/src="(https?:\/\/(?!www\.google|facebook|cdn\.javmost)[^"]{15,200})"/);
      if (iframeM) videos.push({ url: iframeM[1], quality: "Embed", originalUrl: iframeM[1], headers: this.getHeaders(url) });
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
      const NAV_RX = /^(?:all|page|popular|rated|subscribed|videos?|new|hot|recent|latest|top|best|browse|uncensored|censored|index)$/i;
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
      "pornstars": ["https://www.javmost.ws/pornstar/all/", "^/star/([^/?#]+)"],
    };
    if (sections[listId]) {
      const url = sections[listId][0];
      const rx = new RegExp(sections[listId][1], "i");
      const pageUrl = url.indexOf("?") >= 0
        ? url + "page=" + p
        : url + (url.endsWith("/") ? "page/" + p + "/" : "?page=" + p);
      const res = await new Client().get(pageUrl, this._wtHeaders(pageUrl));
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

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
