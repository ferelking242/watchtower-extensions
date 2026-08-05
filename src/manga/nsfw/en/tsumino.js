const watchtowerSources = [{
  "name": "Tsumino",
  "lang": "en",
  "baseUrl": "https://www.tsumino.com",
  "apiUrl": "https://www.tsumino.com/api",
  "iconUrl": "https://www.tsumino.com/favicon.ico",
  "typeSource": "single",
  "itemType": 0,
  "isManga": true,
  "version": "1.0.0",
  "pkgPath": "manga/nsfw/en/tsumino.js",
  "notes": "Tsumino — hentai manga/doujin reader (18+). API JSON.",
  "isNsfw": true
}];

const BASE = "https://www.tsumino.com";
const API  = "https://www.tsumino.com/api";

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": BASE + "/",
      "Accept": "application/json, text/html;q=0.9",
      "Accept-Language": "en-US,en;q=0.9"
    };
  }

  _apiHeaders(ref) {
    return {
      ...this.getHeaders(ref),
      "X-Requested-With": "XMLHttpRequest",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
    };
  }

  _fromEntry(e) {
    return {
      name: e.Title || e.title || "Doujin",
      imageUrl: e.Thumbnail || e.thumbnail || (e.Id ? `${BASE}/image/cover/${e.Id}/1` : ""),
      link: `${BASE}/entry/${e.Id || e.id}`
    };
  }

  async getPopular(page) {
    try {
      const res = await new Client().post(
        `${API}/parse/advance`,
        this._apiHeaders(BASE),
        `Text=&List=1&Sort=5&Duration=&Tags[]=&TagsExclude[]=&Category=1&Uploader=&From=&To=&MinimumStars=0&CompletelyTagged=0&Collection=0&Page=${page}`
      );
      const data = JSON.parse(res.body);
      const list = (data.Data || []).map(e => this._fromEntry(e));
      return { list, hasNextPage: page < (data.PageCount || 1) };
    } catch (_) { return { list: [], hasNextPage: false }; }
  }

  async getLatestUpdates(page) {
    try {
      const res = await new Client().post(
        `${API}/parse/advance`,
        this._apiHeaders(BASE),
        `Text=&List=1&Sort=1&Duration=&Tags[]=&TagsExclude[]=&Category=1&Uploader=&From=&To=&MinimumStars=0&CompletelyTagged=0&Collection=0&Page=${page}`
      );
      const data = JSON.parse(res.body);
      const list = (data.Data || []).map(e => this._fromEntry(e));
      return { list, hasNextPage: page < (data.PageCount || 1) };
    } catch (_) { return { list: [], hasNextPage: false }; }
  }

  async search(query, page, filters) {
    try {
      const res = await new Client().post(
        `${API}/parse/advance`,
        this._apiHeaders(BASE),
        `Text=${encodeURIComponent(query)}&List=1&Sort=1&Duration=&Tags[]=&TagsExclude[]=&Category=1&Uploader=&From=&To=&MinimumStars=0&CompletelyTagged=0&Collection=0&Page=${page}`
      );
      const data = JSON.parse(res.body);
      const list = (data.Data || []).map(e => this._fromEntry(e));
      return { list, hasNextPage: page < (data.PageCount || 1) };
    } catch (_) { return { list: [], hasNextPage: false }; }
  }

  async getDetail(url) {
    const idM = url.match(/\/entry\/(\d+)/);
    const id = idM ? idM[1] : null;
    if (!id) return { name: "Doujin", imageUrl: "", description: "", chapters: [{ name: "Read", url }] };
    try {
      const res = await new Client().get(`${BASE}/entry/${id}`, this.getHeaders(url));
      const doc = new Document(res.body);
      const name = doc.selectFirst("h1, .entry-title, .book-title")?.text?.trim() || "Doujin";
      const imageUrl = `${BASE}/image/cover/${id}/1`;
      const tags  = doc.select(".tags a, a[href*=Tag]").map(el => ({ name: el.text.trim() }));
      const pages = doc.selectFirst(".pages, [class*=page-count]")?.text?.trim() || "?";
      return {
        name,
        imageUrl,
        description: `Pages: ${pages}`,
        genre: tags,
        chapters: [{ name: "Read", url: `${BASE}/read/${id}` }]
      };
    } catch (_) {
      return { name: "Doujin", imageUrl: "", description: "", chapters: [{ name: "Read", url }] };
    }
  }

  async getPageList(url) {
    const idM = url.match(/\/(?:read|entry)\/(\d+)/);
    const id = idM ? idM[1] : null;
    if (!id) return [];
    const pages = [];
    try {
      const res = await new Client().get(`${API}/read/book/session?q=${id}`, this.getHeaders(url));
      const session = JSON.parse(res.body);
      const token = session.Hash || session.Token || "";
      const total = session.PageCount || 0;
      if (token && total > 0) {
        for (let i = 1; i <= total; i++) {
          pages.push({ url: `${BASE}/image/view/${id}/${i}/${token}`, headers: this.getHeaders(url) });
        }
      }
    } catch (_) {}
    // Fallback: sequential CDN pattern
    if (pages.length === 0) {
      try {
        const res = await new Client().get(`${BASE}/read/${id}`, this.getHeaders(url));
        const html = res.body;
        const pageCountM = html.match(/PageCount['"]\s*:\s*(\d+)/i) || html.match(/total_pages\s*=\s*(\d+)/i);
        const total = pageCountM ? parseInt(pageCountM[1]) : 0;
        for (let i = 1; i <= total; i++) {
          pages.push({ url: `${BASE}/image/view/${id}/${i}`, headers: this.getHeaders(url) });
        }
      } catch (_) {}
    }
    return pages;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
