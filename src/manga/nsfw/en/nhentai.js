const watchtowerSources = [{
  "name": "NHentai",
  "lang": "en",
  "baseUrl": "https://nhentai.net",
  "apiUrl": "https://nhentai.net/api",
  "iconUrl": "https://nhentai.net/favicon.ico",
  "typeSource": "single",
  "itemType": 0,
  "isManga": true,
  "version": "1.0.0",
  "pkgPath": "manga/nsfw/en/nhentai.js",
  "notes": "NHentai — premier site de lecture hentai (18+). API JSON officielle.",
  "isNsfw": true
}];

const BASE = "https://nhentai.net";
const API  = "https://nhentai.net/api";

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": BASE + "/",
      "Accept": "application/json, text/html;q=0.9,*/*;q=0.8"
    };
  }

  _mediaUrl(media_id, ext, page) {
    const extMap = { 1: "jpg", 2: "png", 3: "webp" };
    return `https://i.nhentai.net/galleries/${media_id}/${page}.${extMap[ext] || "jpg"}`;
  }

  _thumbUrl(media_id, ext) {
    const extMap = { 1: "jpg", 2: "png", 3: "webp" };
    return `https://t.nhentai.net/galleries/${media_id}/cover.${extMap[ext] || "jpg"}`;
  }

  _fromGallery(g) {
    const title = g.title?.english || g.title?.pretty || g.title?.japanese || "Hentai";
    const thumb = this._thumbUrl(g.media_id, g.images?.cover?.t || 1);
    return { name: title, imageUrl: thumb, link: `${BASE}/g/${g.id}/` };
  }

  async getPopular(page) {
    try {
      const res = await new Client().get(`${API}/galleries/all?page=${page}`, this.getHeaders());
      const data = JSON.parse(res.body);
      const list = (data.result || []).map(g => this._fromGallery(g));
      return { list, hasNextPage: page < (data.num_pages || 1) };
    } catch (_) { return { list: [], hasNextPage: false }; }
  }

  async getLatestUpdates(page) {
    return this.getPopular(page);
  }

  async search(query, page, filters) {
    try {
      const q = encodeURIComponent(query);
      const res = await new Client().get(`${API}/galleries/search?query=${q}&page=${page}`, this.getHeaders());
      const data = JSON.parse(res.body);
      const list = (data.result || []).map(g => this._fromGallery(g));
      return { list, hasNextPage: page < (data.num_pages || 1) };
    } catch (_) { return { list: [], hasNextPage: false }; }
  }

  async getDetail(url) {
    // Extract ID from URL like /g/123456/
    const idM = url.match(/\/g\/(\d+)/);
    if (!idM) return { name: "Hentai", imageUrl: "", description: "", chapters: [] };
    const id = idM[1];
    try {
      const res = await new Client().get(`${API}/gallery/${id}`, this.getHeaders());
      const g   = JSON.parse(res.body);
      const title = g.title?.english || g.title?.pretty || g.title?.japanese || "Hentai";
      const thumb = this._thumbUrl(g.media_id, g.images?.cover?.t || 1);
      const tags  = (g.tags || []).map(t => ({ name: t.name }));
      const desc  = `${g.num_pages} pages · ${new Date(g.upload_date * 1000).toLocaleDateString()}`;
      return {
        name: title,
        imageUrl: thumb,
        description: desc,
        genre: tags,
        chapters: [{ name: "Read", url, dateUpload: g.upload_date * 1000 }]
      };
    } catch (_) {
      return { name: "Hentai", imageUrl: "", description: "", chapters: [{ name: "Read", url }] };
    }
  }

  async getPageList(url) {
    const idM = url.match(/\/g\/(\d+)/);
    if (!idM) return [];
    const id = idM[1];
    try {
      const res = await new Client().get(`${API}/gallery/${id}`, this.getHeaders());
      const g   = JSON.parse(res.body);
      return (g.images?.pages || []).map((p, i) => ({
        url: this._mediaUrl(g.media_id, p.t, i + 1),
        headers: this.getHeaders(url)
      }));
    } catch (_) { return []; }
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
