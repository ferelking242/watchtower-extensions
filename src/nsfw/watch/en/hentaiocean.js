const watchtowerSources = [{
  "name": "Hentai Ocean",
  "lang": "en",
  "baseUrl": "https://hentaiocean.com",
  "apiUrl": "",
  "iconUrl": "https://hentaiocean.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.4",
  "login": false,
  "forYou": false,
  "pkgPath": "nsfw/watch/en/hentaiocean.js",
  "notes": "Hentai Ocean streaming (18+)",
  "isNsfw": true
}];

const BASE = "https://hentaiocean.com";

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": BASE + "/",
      "Accept-Language": "en-US,en;q=0.9"
    };
  }

  _parse(html) {
    const doc = new Document(html);
    const items = [];
    const seen = new Set();
    // Real structure (Bulma grid): <a class="cell card" href="/watch/<slug>">
    //   <div class="card-image"><div class="image cover-ratio"><img src="..." alt="TITLE"></div></div>
    //   <div class="card-content"><p class="subtitle is-6 ...">TITLE</p></div></a>
    for (const card of doc.select("a.cell.card[href*='/watch/']")) {
      const link = card.attr("href") || "";
      if (!link || link === "#") continue;
      const full = link.startsWith("http") ? link : BASE + link;
      if (seen.has(full)) continue;
      seen.add(full);
      const img = card.selectFirst("img");
      const thumb = img?.attr("data-src") || img?.attr("src") || "";
      const name = card.selectFirst(".subtitle")?.text?.trim() ||
                   img?.attr("alt") || "Hentai";
      items.push({ name, imageUrl: thumb, link: full });
    }
    return { list: items, hasNextPage: false };
  }

  async getPopular(page) {
    // No dedicated "popular" view — newly added is the fullest listing
    const res = await new Client().get(`${BASE}/view/newly-added${page > 1 ? `?page=${page}` : ""}`, this.getHeaders());
    return this._parse(res.body);
  }

  async getLatestUpdates(page) {
    const res = await new Client().get(`${BASE}/view/recent-releases${page > 1 ? `?page=${page}` : ""}`, this.getHeaders());
    return this._parse(res.body);
  }

  async search(query, page, filters) {
    const q = encodeURIComponent(query.trim());
    const res = await new Client().get(`${BASE}/search?q=${q}${page > 1 ? `&page=${page}` : ""}`, this.getHeaders());
    return this._parse(res.body);
  }

  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const doc = new Document(res.body);
    const name = doc.selectFirst("h1")?.text?.trim() || "Hentai";
    const imageUrl = doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
    const description = doc.selectFirst('meta[name="description"]')?.attr("content") ||
                        doc.selectFirst(".description,.synopsis,.summary")?.text?.trim() || "";
    const genre = doc.select("a[rel=tag],.tags a,.genres a").map(el => ({ name: el.text.trim() }));
    const episodes = [];
    for (const ep of doc.select(".episode-list a,.episodes a,a[href*=episode],a[href*=ep-]")) {
      const epLink = ep.attr("href") || "";
      if (!epLink || epLink === "#") continue;
      const epUrl = epLink.startsWith("http") ? epLink : BASE + epLink;
      episodes.push({ name: ep.text?.trim() || "Episode", url: epUrl });
    }
    if (episodes.length === 0) episodes.push({ name, url });
    return { name, imageUrl, description, genre, episodes };
  }

  async getVideoList(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const videos = [];
    // Watch pages embed: jsondata = { "info": [...], "mirrors": [{ "mirrorurl":
    // "https:\/\/w2.hentaiocean.com\/play?vid=<encoded file name>" }], "genres": [...] }
    const jm = html.match(/jsondata\s*=\s*(\{[\s\S]*?\})\s*<\/script>/);
    if (jm) {
      try {
        const data = JSON.parse(jm[1]);
        for (const m of data?.mirrors || []) {
          const mu = String(m.mirrorurl || "").replace(/\\\//g, "/");
          const vm = mu.match(/\/play\?vid=([^&]+)/);
          if (!vm) continue;
          let raw = vm[1];
          try { raw = decodeURIComponent(raw); } catch (_) {}
          const host = (mu.match(/^https?:\/\/[^/]+/) || ["https://w2.hentaiocean.com"])[0];
          const direct = host + "/video/" + encodeURIComponent(raw);
          videos.push({ url: direct, quality: "MP4", originalUrl: direct, headers: { ...this.getHeaders(url), Referer: host + "/" } });
        }
      } catch (_) {}
    }
    if (videos.length === 0) {
      const m3u8Re = /["'](https?:\/\/[^"']+\.m3u8[^"']*)['"]/gi;
      const mp4Re  = /["'](https?:\/\/[^"']+\.mp4[^"']*)['"]/gi;
      let m;
      while ((m = m3u8Re.exec(html)) !== null)
        videos.push({ url: m[1], quality: "Auto", originalUrl: m[1], headers: this.getHeaders(url) });
      while (videos.length < 3 && (m = mp4Re.exec(html)) !== null)
        videos.push({ url: m[1], quality: "MP4", originalUrl: m[1], headers: this.getHeaders(url) });
    }
    return videos;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }

  _wtHeaders(url) { return this.getHeaders ? this.getHeaders(url) : {}; }
  _wtPeople(html, base) {
    const doc = new Document(html);
    const out = [];
    const seen = {};
    for (const a of doc.select("a")) {
      const href = (a.attr("href") || "").trim();
      if (!href || href.charAt(0) === "#" || /^javascript:/i.test(href)) continue;
      let path;
      try { path = new URL(href, base).pathname; } catch (e) { continue; }
      const m = path.match(/^\/(?:[a-z]{2}\/)?(pornstars?|models?|actress(?:es)?|performers?|studios?|channels?|makers?)\/([^\/?#]+)/i);
      if (!m) continue;
      const key = m[1].toLowerCase().replace(/s$/, "") + "/" + m[2];
      if (seen[key]) continue;
      seen[key] = 1;
      const img = a.selectFirst("img");
      const name = ((a.attr("title") || (img ? img.attr("alt") : "") || a.text) || "").trim();
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
      if (/help\.pornhub|\/(tags?|categor|genres?|models?|pornstars?|actress|channels?|studios?|makers?)\//i.test(path)) continue;
      if (seen[path]) continue;
      seen[path] = 1;
      const img = a.selectFirst("img");
      const name = ((a.attr("title") || (img ? img.attr("alt") : "") || a.text) || "").trim();
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
      "genres": "https://hentaiocean.com/genre",
    };
    if (sections[listId]) {
      let pageUrl = sections[listId];
      if (p > 1) pageUrl += (pageUrl.indexOf("?") >= 0 ? "&" : "?") + "page=" + p;
      const res = await new Client().get(pageUrl, this._wtHeaders(pageUrl));
      const people = this._wtPeople(res.body, pageUrl);
      if (people.length) return { list: people, hasNextPage: people.length >= 240 };
      const own = this._parse(res.body);
      if (own && own.list && own.list.length) return own;
      return { list: [], hasNextPage: false };
    }
    if (listId && listId.indexOf("profile_") === 0) {
      const hex = listId.slice(8);
      let path = "";
      for (let i = 0; i + 4 <= hex.length; i += 4) path += String.fromCharCode(parseInt(hex.substr(i, 4), 16));
      const pageUrl = path.charAt(0) === "h" ? path : base + path;
      const res = await new Client().get(pageUrl, this._wtHeaders(pageUrl));
      const own = this._parse(res.body);
      let list = own && own.list && own.list.length ? own.list : [];
      if (!list.length) list = this._wtVideos(res.body, pageUrl);
      return { list: list, hasNextPage: false };
    }
    throw new Error("Unknown custom list: " + listId);
  }

}
