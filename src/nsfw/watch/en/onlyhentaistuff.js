const watchtowerSources = [{
  "name": "OnlyHentaiStuff",
  "lang": "en",
  "baseUrl": "https://onlyhentaistuff.com",
  "apiUrl": "",
  "iconUrl": "https://onlyhentaistuff.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.4",
  "login": false,
  "forYou": false,
  "pkgPath": "nsfw/watch/en/onlyhentaistuff.js",
  "notes": "OnlyHentaiStuff streaming (18+)",
  "isNsfw": true
}];

const BASE = "https://onlyhentaistuff.com";

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
    for (const card of doc.select("article,.video-item,.item,.post,.entry")) {
      const a = card.selectFirst("a[href]");
      if (!a) continue;
      let link = a.attr("href") || "";
      if (!link || link === "#") continue;
      if (!link.startsWith("http")) link = BASE + link;
      if (seen.has(link)) continue;
      seen.add(link);
      const img = card.selectFirst("img");
      const thumb = img?.attr("data-src") || img?.attr("src") || "";
      const name = card.selectFirst("h2,h3,.title,.entry-title")?.text?.trim() || a.attr("title") || "Hentai";
      items.push({ name, imageUrl: thumb, link });
    }
    return { list: items, hasNextPage: !!doc.selectFirst("a.next,[rel=next],.nav-next") };
  }

  async getPopular(page) {
    const res = await new Client().get(`${BASE}/page/${page}/?orderby=views`, this.getHeaders());
    return this._parse(res.body);
  }

  async getLatestUpdates(page) {
    const res = await new Client().get(`${BASE}/page/${page}/`, this.getHeaders());
    return this._parse(res.body);
  }

  async search(query, page, filters) {
    const res = await new Client().get(`${BASE}/?s=${encodeURIComponent(query)}&paged=${page}`, this.getHeaders());
    return this._parse(res.body);
  }

  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const doc = new Document(res.body);
    const name = doc.selectFirst("h1,.entry-title")?.text?.trim() || "Hentai";
    const imageUrl = doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
    const description = doc.selectFirst(".entry-content p,.description")?.text?.trim() || "";
    const genre = doc.select("a[rel=tag],.tags a").map(el => ({ name: el.text.trim() }));
    const episodes = [];
    for (const ep of doc.select(".episode-list a,.ep-item a,a[href*=episode]")) {
      const href = ep.attr("href") || "";
      if (!href || href === "#") continue;
      episodes.push({ name: ep.text?.trim() || "Episode", url: href.startsWith("http") ? href : BASE + href });
    }
    if (episodes.length === 0) episodes.push({ name, url });
    return { name, imageUrl, description, genre, episodes };
  }

  async getVideoList(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const videos = [];
    const m3u8Re = /["'](https?:\/\/[^"']+\.m3u8[^"']*)['"]/gi;
    const mp4Re  = /["'](https?:\/\/[^"']+\.mp4[^"']*)['"]/gi;
    let m;
    while ((m = m3u8Re.exec(html)) !== null)
      videos.push({ url: m[1], quality: "Auto", originalUrl: m[1], headers: this.getHeaders(url) });
    while (videos.length < 3 && (m = mp4Re.exec(html)) !== null)
      videos.push({ url: m[1], quality: "MP4", originalUrl: m[1], headers: this.getHeaders(url) });
    if (videos.length === 0) {
      const iM = html.match(/<iframe[^>]+src="([^"]+)"/i);
      if (iM) {
        const src = iM[1].startsWith("http") ? iM[1] : BASE + iM[1];
        try {
          const iRes = await new Client().get(src, { ...this.getHeaders(url), Referer: url });
          const im = iRes.body.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)['"]/);
          if (im) videos.push({ url: im[1], quality: "Auto", originalUrl: im[1], headers: this.getHeaders(url) });
        } catch (_) {}
      }
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
      "tags": "https://www.onlyhentaistuff.com/tags/",
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
