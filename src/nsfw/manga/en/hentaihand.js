const watchtowerSources = [{
  "name": "HentaiHand",
  "lang": "en",
  "baseUrl": "https://hentaihand.com",
  "apiUrl": "https://hentaihand.com",
  "iconUrl": "https://hentaihand.com/favicon.ico",
  "typeSource": "single",
  "itemType": 0,
  "isManga": true,
  "version": "1.0.0",
  "login": false,
  "forYou": false,
  "pkgPath": "nsfw/manga/en/hentaihand.js",
  "notes": "HentaiHand — galeries doujin (18+), toutes langues. API JSON /api/comics.",
  "isNsfw": true
}];

const BASE = "https://hentaihand.com";
const LANG_ID = 2;
const LANG_ID_ALT = 27;

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": BASE + "/"
    };
  }

  _langParam() {
    return "languages%5B-1%5D=" + LANG_ID + "&languages%5B-2%5D=" + LANG_ID_ALT;
  }

  _item(it) {
    return {
      name: (it.title || "").trim(),
      imageUrl: it.image_url || it.thumb_url || "",
      link: it.slug || it.linkcode || String(it.id)
    };
  }

  async _listing(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const data = JSON.parse(res.body);
    return {
      list: (data.data || []).map((it) => this._item(it)),
      hasNextPage: !!data.next_page_url
    };
  }

  async getPopular(page) {
    return this._listing(`${BASE}/api/comics?page=${page}&sort=popularity&order=desc&duration=all&${this._langParam()}`);
  }

  async getLatestUpdates(page) {
    return this._listing(`${BASE}/api/comics?page=${page}&sort=uploaded_at&order=desc&duration=all&${this._langParam()}`);
  }

  async search(query, page) {
    return this._listing(`${BASE}/api/comics?page=${page}&q=${encodeURIComponent(query)}&duration=all&${this._langParam()}`);
  }

  async getDetail(url) {
    const res = await new Client().get(`${BASE}/api/comics/${encodeURIComponent(url)}`, this.getHeaders(url));
    const d = JSON.parse(res.body);
    const genre = [];
    for (const t of d.tags || []) genre.push({ name: t.slug || t.name });
    for (const c of d.category ? [d.category] : []) genre.push({ name: c.slug || c.name });
    return {
      name: (d.title || "").trim(),
      imageUrl: d.image_url || d.thumb_url || "",
      description: d.description || d.alternative_title || "",
      genre,
      chapters: [{ name: "Read", url }]
    };
  }

  async getPageList(url) {
    const res = await new Client().get(`${BASE}/api/comics/${encodeURIComponent(url)}/images`, this.getHeaders(url));
    const d = JSON.parse(res.body);
    const headers = this.getHeaders(url);
    return (d.images || []).map((img) => ({ url: img.source_url, headers }));
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
