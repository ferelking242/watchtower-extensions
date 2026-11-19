const watchtowerSources = [{
  "name": "NJAV",
  "lang": "ja",
  "baseUrl": "https://123av.com",
  "apiUrl": "",
  "iconUrl": "https://123av.com/assets/123av/favicon.png",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.1.0",
  "login": false,
  "forYou": false,
  "pkgPath": "nsfw/watch/ja/njav.js",
  "notes": "NJAV (123AV) — HD JAV streaming, multi-language (en/ja/zh)",
  "isNsfw": true
}];

const BASE_URL = "https://123av.com";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": url || BASE_URL + "/"
    };
  }

  _clean(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  _abs(href) {
    if (!href) return "";
    return href.charAt(0) === "h" ? href : BASE_URL + href;
  }

  // Cards carry the poster as `data-preview="…/preview/<xx>/<code>/preview.png"`;
  // `<xx>` is a hash bucket only the site knows, so it must be read, not built.
  _cardImage(card) {
    const holder = card.selectFirst("[data-preview]");
    const raw = holder ? holder.attr("data-preview") : "";
    return raw ? raw.split("?")[0] : "";
  }

  _parse(html) {
    const doc = new Document(html);
    const items = [];
    const seen = {};
    for (const card of doc.select("div.card")) {
      const a = card.selectFirst("a.card__cover[href*='/v/'], a.card__link[href*='/v/'], h3.card__title a");
      if (!a) continue;
      const href = a.attr("href") || "";
      const m = href.match(/\/v\/([^\/?#]+)/);
      if (!m) continue;
      const code = decodeURIComponent(m[1]);
      if (seen[code]) continue;
      seen[code] = 1;
      const title = this._clean(card.selectFirst("h3.card__title a")?.text || a.attr("title") || code);
      items.push({
        name: title || code.toUpperCase(),
        imageUrl: this._cardImage(card),
        link: this._abs(href)
      });
    }
    if (!items.length) {
      for (const a of doc.select("a.card__cover[href*='/v/'], a.card__link[href*='/v/']")) {
        const href = a.attr("href") || "";
        const m = href.match(/\/v\/([^\/?#]+)/);
        if (!m || seen[m[1]]) continue;
        seen[m[1]] = 1;
        const card = a.parent;
        const preview = card ? card.selectFirst("[data-preview]") : null;
        const raw = preview ? preview.attr("data-preview") : "";
        items.push({
          name: this._clean(a.attr("title") || a.text) || decodeURIComponent(m[1]),
          imageUrl: raw ? raw.split("?")[0] : "",
          link: this._abs(href)
        });
      }
    }
    const hasNext = !!doc.selectFirst("a[rel='next'], .pagination a.next, .pager__next");
    return { list: items, hasNextPage: hasNext || items.length >= 20 };
  }

  async getPopular(page) {
    const url = `${BASE_URL}/en/all?sort=month&page=${page}`;
    const res = await new Client().get(url, this.getHeaders(url));
    return this._parse(res.body);
  }

  get supportsLatest() { return true; }

  async getLatestUpdates(page) {
    const url = `${BASE_URL}/en/new?page=${page}`;
    const res = await new Client().get(url, this.getHeaders(url));
    return this._parse(res.body);
  }

  async search(query, page, filters) {
    const url = `${BASE_URL}/en/search?keyword=${encodeURIComponent(query.trim())}&page=${page}`;
    const res = await new Client().get(url, this.getHeaders(url));
    return this._parse(res.body);
  }

  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const doc = new Document(res.body);
    const rawTitle = doc.selectFirst("h1")?.text || doc.selectFirst("meta[property='og:title']")?.attr("content") || "";
    const title = this._clean(rawTitle).replace(/\s*[—|-]\s*123AV\s*$/i, "");
    const poster = (res.body.match(/background-image:\s*url\(['"]?(https:\/\/icdn[^'")\s]+)/) || [])[1]
      || (res.body.match(/data-preview="(https:\/\/icdn[^"]+)/) || [])[1]
      || "";
    const genre = doc.select(".watch__info-row")
      .filter((row) => /Genres/i.test(row.selectFirst("dt")?.text || ""))
      .flatMap((row) => row.select("a.chip").map((el) => ({ name: this._clean(el.text) })))
      .filter((g) => g.name);
    return {
      name: title || "Untitled",
      imageUrl: poster ? poster.split("?")[0] : "",
      description: this._clean(doc.selectFirst("meta[name='description']")?.attr("content") || ""),
      genre: genre,
      episodes: [{ name: title || "Watch", url: url }]
    };
  }

  // The watch page embeds its sources as a twice-escaped JSON string
  // (`JSON.parse('[{\u0022url\u0022:\u0022https:\\/\\/<host>\\/e\\/<hash>…\u0022}]')`).
  // Each entry is a hash page whose own `/stream?id=<hash>` returns the HLS URL.
  _episodes(html) {
    const unescaped = html.replace(/\\u0022/gi, '"').replace(/\\{1,3}\//g, "/");
    const out = [];
    const rx = /https?:\/\/[^\s"'<>\\]+\/e\/[A-Za-z0-9_]+[^\s"'<>\\]*/g;
    let m;
    while ((m = rx.exec(unescaped)) !== null) {
      const url = m[0];
      if (!out.find((e) => e.url === url)) out.push({ url: url, name: "Episode " + (out.length + 1) });
    }
    return out;
  }

  async _resolveStream(embedUrl, referer) {
    const u = new URL(embedUrl);
    const hash = (u.pathname.match(/\/e\/([A-Za-z0-9_]+)/) || [])[1];
    if (!hash) return "";
    const params = new URLSearchParams(u.search);
    params.set("id", hash);
    const streamUrl = `${u.origin}/stream?${params.toString()}`;
    const res = await new Client().get(streamUrl, {
      "User-Agent": UA,
      "Accept": "application/json",
      "Referer": referer || embedUrl
    });
    try {
      const data = JSON.parse(res.body);
      return (data && data.media && data.media.stream) || "";
    } catch (e) {
      return "";
    }
  }

  async getVideoList(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const videos = [];
    for (const ep of this._episodes(html)) {
      let stream = "";
      try {
        stream = await this._resolveStream(ep.url, url);
      } catch (e) {
        stream = "";
      }
      const playUrl = stream || ep.url;
      videos.push({
        url: playUrl,
        quality: stream ? "Auto" : ep.name,
        originalUrl: playUrl,
        headers: {
          "User-Agent": UA,
          "Referer": stream ? ep.url : url
        }
      });
    }
    if (!videos.length) {
      const rx = /["'`](https?:\/\/[^"'`\\]+\.m3u8[^"'`\\]*)["'`]/g;
      let m;
      while ((m = rx.exec(html)) !== null) {
        if (!videos.find((v) => v.url === m[1])) {
          videos.push({ url: m[1], quality: "Auto", originalUrl: m[1], headers: this.getHeaders(url) });
        }
      }
    }
    return videos;
  }

  async getCustomList(listId, page) {
    const p = Number(page) > 1 ? Number(page) : 1;
    if (listId === "actresses") {
      const url = `${BASE_URL}/en/actresses${p > 1 ? "?page=" + p : ""}`;
      const res = await new Client().get(url, this.getHeaders(url));
      const doc = new Document(res.body);
      const out = [];
      const seen = {};
      for (const a of doc.select("a.actress__avatar[href*='/en/actresses/'], a.actress__name[href*='/en/actresses/']")) {
        const href = a.attr("href") || "";
        if (seen[href]) continue;
        seen[href] = 1;
        const avatar = doc.selectFirst(`a.actress__avatar[href='${href}']`);
        const style = avatar ? avatar.attr("style") || "" : "";
        const bg = (style.match(/url\(['"]?([^'")]+)['"]?\)/) || [])[1] || "";
        const name = this._clean(a.text) || decodeURIComponent(href.split("/").filter(Boolean).pop() || "");
        out.push({ name: name, imageUrl: bg, link: this._abs(href) });
      }
      return { list: out, hasNextPage: out.length >= 20 };
    }
    if (listId === "makers") {
      const url = `${BASE_URL}/en/makers${p > 1 ? "?page=" + p : ""}`;
      const res = await new Client().get(url, this.getHeaders(url));
      const doc = new Document(res.body);
      const out = [];
      const seen = {};
      for (const a of doc.select("a.mcard[href*='/en/makers/']")) {
        const href = a.attr("href") || "";
        if (seen[href]) continue;
        seen[href] = 1;
        const name = this._clean(a.selectFirst(".mcard__name")?.text || a.text);
        if (name) out.push({ name: name, imageUrl: "", link: this._abs(href) });
      }
      return { list: out, hasNextPage: out.length >= 20 };
    }
    if (listId && listId.indexOf("profile_") === 0) {
      const hex = listId.slice(8);
      let path = "";
      for (let i = 0; i + 4 <= hex.length; i += 4) path += String.fromCharCode(parseInt(hex.substr(i, 4), 16));
      const pageUrl = path.charAt(0) === "h" ? path : BASE_URL + path;
      const res = await new Client().get(pageUrl, this.getHeaders(pageUrl));
      return this._parse(res.body);
    }
    throw new Error("Unknown custom list: " + listId);
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
