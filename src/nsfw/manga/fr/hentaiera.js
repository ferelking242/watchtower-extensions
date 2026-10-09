const watchtowerSources = [{
  "name": "HentaiEra",
  "lang": "fr",
  "baseUrl": "https://hentaiera.com",
  "apiUrl": "https://hentaiera.com",
  "iconUrl": "https://hentaiera.com/favicon.ico",
  "typeSource": "single",
  "itemType": 0,
  "isManga": true,
  "version": "1.0.0",
  "login": false,
  "forYou": false,
  "pkgPath": "nsfw/manga/fr/hentaiera.js",
  "notes": "HentaiEra — galeries hentai (18+), section française. Lecture par page via image_dir + gallery_id.",
  "isNsfw": true
}];

const BASE = "https://hentaiera.com";

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": BASE + "/",
      "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8"
    };
  }

  _parseList(html) {
    const list = [];
    const seen = {};
    const re = /<div class="inner_thumb">[\s\S]*?<a href="(\/gallery\/(\d+)\/)"[\s\S]*?data-src="([^"]+)"[\s\S]*?<h2 class="gallery_title">[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      if (seen[m[2]]) continue;
      seen[m[2]] = true;
      list.push({
        name: m[4].replace(/<[^>]*>/g, "").trim(),
        imageUrl: m[3],
        link: BASE + m[1]
      });
    }
    return list;
  }

  async _listing(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const pageM = html.match(/class='pgi_itm page-item'[^>]*>\s*<a[^>]*>(\d+)<\/a>/g);
    let hasNext = false;
    const cur = (url.match(/[?&]page=(\d+)/) || [null, "1"])[1];
    const nextRe = new RegExp(`[?&]page=${parseInt(cur) + 1}(?=["'])`);
    hasNext = nextRe.test(html);
    return { list: this._parseList(html), hasNextPage: hasNext };
  }

  async getPopular(page) {
    return this._listing(`${BASE}/language/french/?page=${page}`);
  }

  async getLatestUpdates(page) {
    return this._listing(`${BASE}/language/french/?page=${page}`);
  }

  async search(query, page) {
    return this._listing(`${BASE}/search/?q=${encodeURIComponent(query)}&page=${page}`);
  }

  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const nameM = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    const coverM = html.match(/class="left_cover"[\s\S]*?data-src="([^"]+)"/);
    const genre = [];
    const tagRe = /<li><span class='tags_text'>([^<]*)<\/span>[\s\S]*?<\/li>/g;
    let t;
    while ((t = tagRe.exec(html)) !== null) {
      const names = [...t[0].matchAll(/class="item_name">([^<]*)</g)].map(x => ({ name: x[1].trim() }));
      genre.push(...names);
    }
    return {
      name: nameM ? nameM[1].replace(/<[^>]*>/g, "").trim() : "",
      imageUrl: coverM ? coverM[1] : "",
      description: "",
      genre,
      chapters: [{ name: "Read", url }]
    };
  }

  async getPageList(url) {
    const id = (url.match(/\/(?:gallery|view)\/(\d+)/) || [null, null])[1];
    if (!id) return [];
    const res = await new Client().get(`${BASE}/view/${id}/1/`, this.getHeaders(url));
    const html = res.body;
    const idM = html.match(/id="gallery_id"[^>]*value="([^"]+)"/);
    const dirM = html.match(/id="image_dir"[^>]*value="([^"]+)"/);
    const sM = html.match(/id="s_id"[^>]*value="([^"]+)"/);
    const pagesM = html.match(/id="pages"[^>]*value="(\d+)"/);
    if (!idM || !dirM || !sM) return [];
    const jsonM = html.match(/g_th\s*=\s*\$\.parseJSON\('([\s\S]*?)'\)/);
    const origin = BASE;
    const headers = this.getHeaders(url);
    if (jsonM) {
      let map;
      try { map = JSON.parse(jsonM[1]); } catch (_) { map = null; }
      if (map) {
        const extOf = { p: "png", b: "bmp", g: "gif", w: "webp" };
        return Object.keys(map).map(k => {
          const code = String(map[k]).split(",")[0];
          const ext = extOf[code] || "jpg";
          return { url: `https://m${sM[1]}.hentaiera.com/${dirM[1]}/${idM[1]}/${k}.${ext}`, headers };
        });
      }
    }
    const total = pagesM ? parseInt(pagesM[1]) : 0;
    const out = [];
    for (let i = 1; i <= total; i++) {
      out.push({ url: `https://m${sM[1]}.hentaiera.com/${dirM[1]}/${idM[1]}/${i}.jpg`, headers });
    }
    return out;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
