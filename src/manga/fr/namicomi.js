const watchtowerSources = [{
  "name": "NamiComi (FR)",
  "lang": "fr",
  "baseUrl": "https://namicomi.com",
  "apiUrl": "https://api.namicomi.com",
  "iconUrl": "https://namicomi.com/favicon.ico",
  "typeSource": "single",
  "itemType": 0,
  "isManga": true,
  "version": "1.0.0",
  "login": false,
  "forYou": false,
  "pkgPath": "manga/fr/namicomi.js",
  "notes": "NamiComi — webtoons et mangas traduits en français (API publique api.namicomi.com)."
}];

const API = "https://api.namicomi.com";
const CDN = "https://uploads.namicomi.com";
const LANG = "fr";
const LIMIT = 20;

class DefaultExtension extends MProvider {
  getHeaders() {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "application/json",
      "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      "Origin": "https://namicomi.com",
      "Referer": "https://namicomi.com/"
    };
  }

  async _get(url) {
    const r = await new Client().get(url, this.getHeaders());
    try { return JSON.parse(r.body || "{}"); } catch (e) { return {}; }
  }

  _common(url) {
    return url
      + "&includes[]=cover_art&includes[]=organization&includes[]=tag"
      + "&types[]=manga&types[]=manhua&types[]=manwha&types[]=comic"
      + `&availableTranslatedLanguages[]=${LANG}`;
  }

  _cover(node) {
    const rel = (node.relationships || []).find((r) => r.type === "cover_art");
    const fn = rel && rel.attributes && rel.attributes.fileName;
    return fn ? `${CDN}/covers/${node.id}/${fn}` : "";
  }

  _title(attr) {
    const t = attr.title || {};
    return t[LANG] || t.en || Object.values(t)[0] || "";
  }

  _desc(attr) {
    const d = attr.description || {};
    return d[LANG] || d.en || "";
  }

  _parse(json) {
    const data = json.data || [];
    const list = data.map((n) => ({
      name: this._title(n.attributes || {}),
      imageUrl: this._cover(n),
      link: n.id
    }));
    const meta = json.meta || {};
    const total = meta.total || 0;
    const offset = meta.offset || 0;
    const limit = meta.limit || LIMIT;
    return { list, hasNextPage: offset + limit < total };
  }

  async getPopular(page) {
    const offset = LIMIT * (page - 1);
    const url = this._common(`${API}/title/search?limit=${LIMIT}&offset=${offset}&order[views]=desc`);
    return this._parse(await this._get(url));
  }

  async getLatestUpdates(page) {
    const offset = LIMIT * (page - 1);
    const url = this._common(`${API}/title/search?limit=${LIMIT}&offset=${offset}&order[publishedAt]=desc`);
    return this._parse(await this._get(url));
  }

  async search(query, page) {
    const offset = LIMIT * (page - 1);
    let url = this._common(`${API}/title/search?limit=${LIMIT}&offset=${offset}`);
    if (query && query.trim()) url += `&title=${encodeURIComponent(query.trim())}`;
    return this._parse(await this._get(url));
  }

  async getDetail(url) {
    const slug = String(url).replace(/^https?:\/\/[^/]+\//, "").replace(/^.*\/title\//, "").replace(/\/$/, "");
    const json = await this._get(`${API}/title/${encodeURIComponent(slug)}?includes[]=cover_art&includes[]=tag&includes[]=organization`);
    const node = json.data;
    if (!node) return { name: slug, imageUrl: "", description: "", genre: [], chapters: [] };
    const attr = node.attributes || {};
    const chapters = await this._chapters(node.id);
    return {
      name: this._title(attr),
      imageUrl: this._cover(node),
      description: this._desc(attr),
      author: (node.relationships || []).filter((r) => r.type === "organization")
        .map((r) => r.attributes && r.attributes.name).filter(Boolean).join(", "),
      genre: (node.relationships || []).filter((r) => r.type === "tag")
        .map((r) => r.attributes && r.attributes.name && (r.attributes.name[LANG] || r.attributes.name.en))
        .filter(Boolean),
      status: ({ ongoing: 0, completed: 1, cancelled: 3, hiatus: 2 })[attr.publicationStatus] ?? 5,
      chapters: chapters.length > 0 ? chapters : [{ name: "Lire", url: node.id }]
    };
  }

  async _chapters(titleId) {
    const json = await this._get(`${API}/chapter?titleId=${titleId}&limit=200&offset=0&order[chapter]=desc&order[volume]=desc&translatedLanguages[]=${LANG}&includes[]=organization`);
    return (json.data || []).map((c) => {
      const a = c.attributes || {};
      let name = "";
      if (a.volume) name += `Vol.${a.volume} `;
      if (a.chapter) name += `Ch.${a.chapter}`;
      if (a.name) name += (name ? " - " : "") + a.name;
      return { name: name || "Chapitre", url: c.id };
    });
  }

  async getPageList(url) {
    const chapterId = String(url).replace(/^https?:\/\/[^/]+\//, "").replace(/^.*\/chapter\//, "").replace(/\/$/, "");
    const json = await this._get(`${API}/images/chapter/${encodeURIComponent(chapterId)}?newQualities=true`);
    const data = json.data;
    if (!data) return [];
    const headers = this.getHeaders();
    const files = (data.source && data.source.length ? data.source : data.low) || [];
    const prefix = `${data.baseUrl}/chapter/${chapterId}/${data.hash}`;
    const quality = data.source && data.source.length ? "source" : "low";
    return files.map((f) => ({ url: `${prefix}/${quality}/${f.filename}`, headers }));
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
