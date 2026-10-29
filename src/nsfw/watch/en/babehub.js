const watchtowerSources = [{
  "name": "babehub",
  "lang": "en",
  "baseUrl": "https://www.babehub.com",
  "apiUrl": "",
  "iconUrl": "https://www.babehub.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.1",
  "pkgPath": "nsfw/watch/en/babehub.js",
  "notes": "Adult content (18+) — BabeHub free HD porn pics",
  "isNsfw": true
}];

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return { "Referer": "https://www.babehub.com/", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36", "Accept-Language": "en-US,en;q=0.9" };
  }
  async getPopular(page) {
    const res = await new Client().get("https://www.babehub.com/popular?page=" + page, this.getHeaders());
    return this._parse(res.body, page);
  }
  get supportsLatest() { return true; }
  async getLatestUpdates(page) {
    const res = await new Client().get("https://www.babehub.com/latest?page=" + page, this.getHeaders());
    return this._parse(res.body, page);
  }
  async search(query, page, filters) {
    const q = encodeURIComponent(query.trim());
    const res = await new Client().get("https://www.babehub.com/search/" + q + "?page=" + page, this.getHeaders());
    return this._parse(res.body, page);
  }
  _parse(html, page) {
    const doc = new Document(html);
    const items = [];
    const cards = doc.select(".gallery-item, .pic-item, .thumb, .item, .gallery, .photo, .image-item");
    for (const card of cards) {
      const a = card.selectFirst("a[href*='/gallery'], a[href*='/pic'], a[href*='/photo']");
      if (!a) continue;
      const href = a.attr("href") || "";
      const title = a.attr("title") || card.selectFirst(".title, .caption")?.text || "Gallery";
      const img = card.selectFirst("img");
      const thumb = img?.attr("data-src") || img?.attr("src") || "";
      const link = href.startsWith("http") ? href : "https://www.babehub.com" + href;
      items.push({ name: title.trim(), imageUrl: thumb, link });
    }
    if (items.length === 0) {
      const links = doc.select("a[href*='/gallery'], a[href*='/pic']");
      for (const a of links) {
        const href = a.attr("href") || "";
        const title = a.attr("title") || a.text?.trim() || "Gallery";
        const img = a.selectFirst("img");
        const thumb = img?.attr("data-src") || img?.attr("src") || "";
        const link = href.startsWith("http") ? href : "https://www.babehub.com" + href;
        if (link && !items.some(i => i.link === link)) items.push({ name: title, imageUrl: thumb, link });
      }
    }
    return { list: items, hasNextPage: items.length >= 15 };
  }
  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders());
    const doc = new Document(res.body);
    const title = doc.selectFirst('meta[property="og:title"]')?.attr("content") || "Gallery";
    const thumb = doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
    return { name: title, imageUrl: thumb, description: "", genre: [], episodes: [{ name: title, url }] };
  }
  async getVideoList(url) {
    const res = await new Client().get(url, this.getHeaders());
    const html = res.body;
    const videos = [];
    const imgRe = /(?:src|data-src|data-original)\s*=\s*["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)/gi;
    let m;
    while ((m = imgRe.exec(html)) !== null) {
      const imgUrl = m[1];
      if (imgUrl && !imgUrl.includes("thumbnail") && !imgUrl.includes("thumb") && !imgUrl.includes("logo") && !imgUrl.includes("icon") && imgUrl.length > 30) {
        videos.push({ url: imgUrl, quality: "HD", originalUrl: imgUrl });
      }
      if (videos.length >= 50) break;
    }
    return videos;
  }
  async getPageList(url) { return []; }
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
      "pornstars": "https://www.babehub.com/tag/pornstar/",
      "channels": "https://www.babehub.com/channels/",
    };
    if (sections[listId]) {
      let pageUrl = sections[listId];
      if (p > 1) pageUrl += (pageUrl.indexOf("?") >= 0 ? "&" : "?") + "page=" + p;
      const res = await new Client().get(pageUrl, this._wtHeaders(pageUrl));
      const people = this._wtPeople(res.body, pageUrl);
      if (people.length) return { list: people, hasNextPage: people.length >= 240 };
      const own = this._parse(res.body, p);
      if (own && own.list && own.list.length) return own;
      return { list: [], hasNextPage: false };
    }
    if (listId && listId.indexOf("profile_") === 0) {
      const hex = listId.slice(8);
      let path = "";
      for (let i = 0; i + 4 <= hex.length; i += 4) path += String.fromCharCode(parseInt(hex.substr(i, 4), 16));
      const pageUrl = path.charAt(0) === "h" ? path : base + path;
      const res = await new Client().get(pageUrl, this._wtHeaders(pageUrl));
      const own = this._parse(res.body, p);
      let list = own && own.list && own.list.length ? own.list : [];
      if (!list.length) list = this._wtVideos(res.body, pageUrl);
      return { list: list, hasNextPage: false };
    }
    throw new Error("Unknown custom list: " + listId);
  }

}
