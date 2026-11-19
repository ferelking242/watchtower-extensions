const watchtowerSources = [{
  "name": "ABJav",
  "lang": "ja",
  "baseUrl": "https://abjav.com",
  "apiUrl": "",
  "iconUrl": "https://abjav.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.1.0",
  "login": false,
  "forYou": false,
  "pkgPath": "nsfw/watch/ja/abjav.js",
  "notes": "ABJav — uncensored and censored JAV streaming",
  "isNsfw": true
}];

const BASE_URL = "https://abjav.com";

// abjav.com is a KVS tube: the HTML shell is rendered client-side, so scraping
// it yields nothing. The site's own bundle talks to `/api/json/videos2/...` for
// listings and `/api/videofile.php` for the media list, both of which answer
// plain JSON to a normal GET.
class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": BASE_URL + "/",
      "Accept": "application/json, text/plain, */*"
    };
  }

  async _json(path) {
    const res = await new Client().get(BASE_URL + path, this.getHeaders(path));
    try {
      return JSON.parse(res.body);
    } catch (e) {
      return null;
    }
  }

  // `/api/json/videos2/{lifetime}/{gender}/{sort}/{count}/{section}.{objectId}.{page}.{type}.{duration}.{date}.json`
  async _list(sort, page, query) {
    if (query != null) {
      const params = `86400/str/relevance/60/search..${page}.all...`;
      const res = await new Client().get(
        `${BASE_URL}/api/videos2.php?params=${params}&s=${encodeURIComponent(query)}`,
        this.getHeaders("/api/videos2.php")
      );
      let data = null;
      try { data = JSON.parse(res.body); } catch (e) { data = null; }
      return this._parseList(data);
    }
    const path = `/api/json/videos2/86400/str/${sort}/60/..${page}.all....json`;
    return this._parseList(await this._json(path));
  }

  _parseList(data) {
    const videos = (data && data.videos) || [];
    const items = videos.map((v) => ({
      name: v.title || v.display_name || String(v.video_id),
      imageUrl: v.scr || v.thumb || "",
      link: `${BASE_URL}/video/${v.video_id}/${v.dir}/`
    }));
    const pages = (data && data.pages) || 0;
    return { list: items, hasNextPage: items.length > 0 && (!pages || pages > 1) };
  }

  async getPopular(page) {
    return this._list("most-popular", page, null);
  }

  get supportsLatest() { return true; }

  async getLatestUpdates(page) {
    return this._list("latest-updates", page, null);
  }

  async search(query, page, filters) {
    return this._list("relevance", page, query.trim());
  }

  async getDetail(url) {
    const m = url.match(/\/video\/(\d+)\//);
    if (!m) return { name: "Unknown", imageUrl: "", description: "", genre: [], episodes: [{ name: "Watch", url }] };
    const id = m[1];
    const data = await this._json(`/api/json/video/86400/0/${Math.floor(id / 1000) * 1000}/${id}.json`);
    const v = (data && data.video) || {};
    const tags = Object.values(v.categories || {}).map((c) => ({ name: c.title }));
    if (v.models) for (const model of Object.values(v.models)) tags.push({ name: model.title || model.name });
    const name = v.title || v.title_jp || `Video ${id}`;
    return {
      name,
      imageUrl: v.thumb || "",
      description: [v.description, v.post_date, v.duration].filter(Boolean).join("\n"),
      genre: tags.filter((t) => t.name),
      episodes: [{ name, url }]
    };
  }

  // `videofile.php` returns `[{video_url: "<obfuscated>", format: "..."}]`; the
  // payload is base64 over a Cyrillic-lookalike alphabet with `.`/`,`/`~` for
  // padding. Decoding it yields a site-relative `/get_file/...` path that
  // redirects to the signed CDN URL.
  async getVideoList(url) {
    const m = url.match(/\/video\/(\d+)\//);
    if (!m) return [];
    const res = await new Client().get(
      `${BASE_URL}/api/videofile.php?video_id=${m[1]}&lifetime=864000`,
      this.getHeaders("/api/videofile.php")
    );
    let files = null;
    try { files = JSON.parse(res.body); } catch (e) { files = null; }
    if (!Array.isArray(files)) return [];

    const videos = [];
    for (const file of files) {
      const path = this._decodeFile(file.video_url);
      if (!path) continue;
      const streamUrl = path.startsWith("http") ? path : BASE_URL + path;
      videos.push({
        url: streamUrl,
        originalUrl: streamUrl,
        quality: this._qualityLabel(file),
        headers: this.getHeaders(url)
      });
    }
    return videos;
  }

  _qualityLabel(file) {
    const format = String(file.format || "");
    if (/_tr|_preview/i.test(format)) return "Preview";
    const size = format.match(/_(\d{3,4})p/);
    if (size) return size[1] + "p";
    if (/hq/i.test(format)) return "HQ";
    return "Auto";
  }

  _decodeFile(encoded) {
    const alphabet = "АВСDЕFGHIJKLМNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,~";
    if (!encoded) return "";
    const clean = String(encoded).replace(/[^АВСЕМA-Za-z0-9.,~]/g, "");
    let out = "";
    for (let i = 0; i < clean.length; i += 4) {
      const vals = [];
      for (const ch of clean.slice(i, i + 4)) vals.push(alphabet.indexOf(ch));
      while (vals.length < 4) vals.push(64);
      const [o, a, l, n] = vals;
      if (o < 0 || a < 0) continue;
      out += String.fromCharCode((o << 2) | (a >> 4));
      if (l !== 64 && l >= 0) out += String.fromCharCode(((a & 15) << 4) | (l >> 2));
      if (n !== 64 && n >= 0) out += String.fromCharCode(((l & 3) << 6) | n);
    }
    return out;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
