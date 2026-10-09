const watchtowerSources = [{
  "name": "HentaiZap",
  "lang": "fr",
  "baseUrl": "https://hentaizap.com",
  "apiUrl": "https://hentaizap.com",
  "iconUrl": "https://hentaizap.com/favicon.ico",
  "typeSource": "single",
  "itemType": 0,
  "isManga": true,
  "version": "1.0.0",
  "login": false,
  "forYou": false,
  "pkgPath": "nsfw/manga/fr/hentaizap.js",
  "notes": "HentaiZap — galeries doujin (18+), section française. Pages dérivées du lecteur /g/<id>/<n>/.",
  "isNsfw": true
}];

const BASE = "https://hentaizap.com";

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
    const re = /<a class="hz-gallery-card__cover" href="(\/gallery\/(\d+)\/)"[\s\S]*?<img src="([^"]+)"[\s\S]*?<h2 class="hz-gallery-card__title"><a[^>]*>([\s\S]*?)<\/a>/gi;
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
    const cur = parseInt((url.match(/[?&]page=(\d+)/) || [null, "1"])[1]);
    const hasNext = new RegExp(`[?&]page=${cur + 1}(?:["'&]|$)`).test(html);
    return { list: this._parseList(html), hasNextPage: hasNext };
  }

  async getPopular(page) {
    return this._listing(`${BASE}/popular/?page=${page}`);
  }

  async getLatestUpdates(page) {
    return this._listing(`${BASE}/language/french/?page=${page}`);
  }

  async search(query, page) {
    return this._listing(`${BASE}/search/?key=${encodeURIComponent(query)}&filter=yes&page=${page}`);
  }

  async getDetail(url) {
    const res = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const nameM = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    const coverM = html.match(/class="hz-gallery-cover"[\s\S]*?<img[^>]+src="([^"]+)"/);
    const genre = [];
    const tagRe = /class="hz-gallery-tag"[^>]*>[\s\S]*?<span class="hz-gallery-tag__name">([^<]*)<\/span>/g;
    let t;
    while ((t = tagRe.exec(html)) !== null) genre.push({ name: t[1].trim() });
    return {
      name: nameM ? nameM[1].replace(/<[^>]*>/g, "").trim() : "",
      imageUrl: coverM ? coverM[1] : "",
      description: "",
      genre,
      chapters: [{ name: "Read", url }]
    };
  }

  async getPageList(url) {
    const id = (url.match(/\/gallery\/(\d+)/) || [null, null])[1];
    if (!id) return [];
    const res = await new Client().get(url, this.getHeaders(url));
    const html = res.body;
    const totalM = html.match(/data-total-pages="(\d+)"/);
    const coverM = html.match(/<img src="(https:\/\/[^"]+\/([a-z0-9]+)\/([a-z0-9]+)\/thumb\.[a-z]+)"/i);
    const headers = this.getHeaders(url);
    if (totalM && coverM) {
      const total = parseInt(totalM[1]);
      const dir = coverM[2];
      const gid = coverM[3];
      const host = coverM[1].replace(/^https:\/\//, "").split("/")[0];
      const pages = [];
      for (let i = 1; i <= total; i++) {
        pages.push({ url: `https://${host}/${dir}/${gid}/${i}.webp`, headers });
      }
      return pages;
    }
    const first = html.match(/<img[^>]+id="gimg"[^>]+src="(https:\/\/[^"]+)"/);
    return first ? [{ url: first[1], headers }] : [];
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
