const watchtowerSources = [{
  "name": "PornPics (FR)",
  "lang": "fr",
  "baseUrl": "https://www.pornpics.com",
  "apiUrl": "",
  "iconUrl": "https://www.pornpics.com/favicon.ico",
  "typeSource": "single",
  "itemType": 0,
  "isManga": true,
  "version": "1.0.0",
  "login": false,
  "forYou": false,
  "pkgPath": "nsfw/manga/fr/pornpics.js",
  "notes": "PornPics — galeries photo (18+), interface française. Une galerie = un chapitre, chaque image est une page.",
  "isNsfw": true
}];

const BASE = "https://www.pornpics.com";
const LANG_PREFIX = "fr";

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      "Referer": BASE + "/"
    };
  }

  _abs(u) {
    if (!u) return "";
    if (/^https?:\/\//.test(u)) return u;
    return BASE + (u.charAt(0) === "/" ? u : "/" + u);
  }

  _dec(s) {
    return String(s || "")
      .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
      .replace(/&#x27;/gi, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ").replace(/&eacute;/g, "é").replace(/&egrave;/g, "è")
      .replace(/&agrave;/g, "à").replace(/&ccedil;/g, "ç").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
      .replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  }

  _root() { return LANG_PREFIX ? `${BASE}/${LANG_PREFIX}` : BASE; }

  _parse(html) {
    const list = [], seen = {};
    const re = /<a\b[^>]*href=['"]([^'"]*\/galleries\/[^'"]+)['"][^>]*>[\s\S]{0,600}?<img\b[^>]*?(?:data-src|src)=['"]([^'"]+)['"]/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const link = this._abs(m[1]);
      if (seen[link]) continue;
      seen[link] = 1;
      const tag = m[0].slice(0, m[0].indexOf(">"));
      const tm = tag.match(/title=['"]([^'"]*)['"]/);
      let name = tm ? tm[1] : "";
      if (!name) {
        const sm = link.match(/\/galleries\/([^/]+)\//);
        name = sm ? sm[1].replace(/-/g, " ") : link;
      }
      list.push({ name: this._dec(name), imageUrl: this._abs(m[2]), link });
    }
    return list;
  }

  async _list(url) {
    const r = await new Client().get(url, this.getHeaders(url));
    // PornPics serves a single page of results and paginates client-side via JS.
    return { list: this._parse(r.body || ""), hasNextPage: false };
  }

  async getPopular(page) {
    return this._list(`${this._root()}/popular/`);
  }

  async getLatestUpdates(page) {
    return this._list(`${this._root()}/recent/`);
  }

  async search(query, page) {
    const r = await new Client().get(`${this._root()}/?q=${encodeURIComponent(query)}`, this.getHeaders());
    return { list: this._parse(r.body || ""), hasNextPage: false };
  }

  async getDetail(url) {
    const r = await new Client().get(url, this.getHeaders(url));
    const html = r.body || "";
    let name = "";
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const title = html.match(/<title>([\s\S]*?)<\/title>/i);
    if (h1) name = this._dec(h1[1]);
    else if (title) name = this._dec(title[1]).replace(/\s*-\s*PornPics\.com\s*$/i, "");
    const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    const img = og ? og[1] : (html.match(/https:\/\/cdni\.pornpics\.com\/\d+\/[^"'\s]+\.jpg/) || [""])[0];
    const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
    return {
      name,
      imageUrl: img,
      description: desc ? this._dec(desc[1]) : "",
      genre: [],
      chapters: [{ name: "Galerie", url }]
    };
  }

  async getPageList(url) {
    const r = await new Client().get(url, this.getHeaders(url));
    const html = r.body || "";
    const headers = this.getHeaders(url);
    const seen = new Set(), pages = [];
    const re = /https:\/\/cdni\.pornpics\.com\/\d+\/[^"'\s]+?\.jpg/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      if (seen.has(m[0])) continue;
      seen.add(m[0]);
      pages.push({ url: m[0], headers });
    }
    return pages;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
