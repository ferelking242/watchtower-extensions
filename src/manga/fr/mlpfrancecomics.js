const watchtowerSources = [{
  "name": "MLP France Comics",
  "langs": ["fr", "en"],
  "ids": { "fr": 748291036, "en": 295817403 },
  "baseUrl": "https://mlp-france.com",
  "apiUrl": "https://mlp-france.com",
  "iconUrl": "https://mlp-france.com/source/lyra16.png",
  "typeSource": "single",
  "itemType": 0,
  "version": "1.0.0",
  "pkgPath": "manga/fr/mlpfrancecomics.js",
  "editableBaseUrl": false,
  "hasCloudflare": false,
  "requiresAccount": false,
  "hasDRM": false,
  "paywall": "free",
  "isManga": true,
  "notes": "Comics My Little Pony G5 en VF et VO. Lecture en ligne (PDF embarqué)."
}];

const BASE = "https://mlp-france.com";

// All known comics sources
const COMIC_SOURCES = [
  {
    n: "MLP G5 Comics (VF)",
    u: `${BASE}/mlpg5/comics.php`,
    i: `${BASE}/source/banbookg5.png`,
    d: "Comics My Little Pony G5 en Français",
    lang: "vf"
  },
  {
    n: "MLP G5 Comics (VO)",
    u: `${BASE}/mlpg5/comics.php`,
    i: `${BASE}/source/banbookg5.png`,
    d: "My Little Pony G5 Comics in English",
    lang: "vo"
  }
];

class DefaultExtension extends MProvider {
  constructor() { super(); }

  _h(ref) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": ref || `${BASE}/`,
      "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8"
    };
  }

  _dec(s) {
    return String(s || "")
      .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, " ").replace(/<[^>]+>/g, "").trim();
  }

  _abs(href, base) {
    if (!href) return "";
    if (href.startsWith("http")) return href;
    if (href.startsWith("/")) return `${BASE}${href}`;
    const dir = base.split("/").slice(0, -1).join("/");
    return `${dir}/${href}`;
  }

  async getPopular(page) {
    return {
      list: COMIC_SOURCES.map(c => ({ link: c.u + "?lang=" + c.lang, imageUrl: c.i, name: c.n })),
      hasNextPage: false
    };
  }

  async getLatestUpdates(page) { return this.getPopular(page); }

  async search(query, page, filterList) {
    const q = (query || "").toLowerCase();
    const res = COMIC_SOURCES.filter(c => c.n.toLowerCase().includes(q) || c.d.toLowerCase().includes(q));
    return { list: res.map(c => ({ link: c.u + "?lang=" + c.lang, imageUrl: c.i, name: c.n })), hasNextPage: false };
  }

  async getDetail(url) {
    // Strip artificial ?lang= param to fetch the real page
    const langM = url.match(/[?&]lang=(vf|vo)/i);
    const lang = langM ? langM[1].toLowerCase() : "vf";
    const pageUrl = url.replace(/[?&]lang=(vf|vo)/gi, "");

    const r = await new Client().get(pageUrl, this._h(pageUrl));
    const html = r.body;

    const src = COMIC_SOURCES.find(c => c.lang === lang) || COMIC_SOURCES[0];
    const name = src.n;
    const description = src.d;

    // Banner image
    const bM = html.match(/<img[^>]+src="([^"]+)"[^>]+width="960"/i);
    const imageUrl = bM ? this._abs(bM[1], pageUrl) : src.i;

    // Parse list4 items — each comic issue
    // Two blocks: FRANÇAIS (vf.php) and ANGLAIS (vo.php)
    const chapters = [];
    const seen = new Set();

    // Split HTML at the section boundary to avoid cross-contamination
    const vfSection = lang === "vf"
      ? html.split(/COMICS EN ANGLAIS/i)[0]   // take only the VF block
      : (html.split(/COMICS EN ANGLAIS/i)[1] || html);  // take only the VO block

    // <li class="list4"><img src="...G5comicXX.jpg"...>
    //   <p><b>Comic #N</b><br /><a href="comics/vf.php?ep=XX">Lire</a>
    const li4Re = /<li class="list4">([\s\S]{1,600}?)<\/li>/gi;
    let m;
    while ((m = li4Re.exec(vfSection)) !== null) {
      const item = m[1];

      // Cover image
      const imgM = item.match(/<img[^>]+src="([^"]+G5comic[^"]+)"/i);
      const cover = imgM ? this._abs(imgM[1], pageUrl) : src.i;

      // Issue number
      const numM = item.match(/<b>(Comic\s*#?\d+[^<]*)<\/b>/i);
      const issueTitle = numM ? this._dec(numM[1]) : "Comic";

      // "Lire" link (reader page)
      const readM = item.match(/href="([^"]+(?:vf|vo)\.php\?ep=\d+[^"]*)"[^>]*class="link"[^>]*>Lire<\/a>/i);
      if (readM) {
        const chUrl = this._abs(readM[1], pageUrl);
        if (!seen.has(chUrl)) {
          seen.add(chUrl);
          chapters.push({
            name: issueTitle,
            url: chUrl,
            scanlator: lang === "vf" ? "VF" : "VO",
            imageUrl: cover
          });
        }
      }
    }

    // Fallback: find any vf/vo comic links
    if (chapters.length === 0) {
      const fallRe = /href="([^"]+(?:vf|vo)\.php\?ep=(\d+)[^"]*)"/gi;
      while ((m = fallRe.exec(vfSection)) !== null) {
        const chUrl = this._abs(m[1], pageUrl);
        const ep = m[2];
        if (!seen.has(chUrl)) {
          seen.add(chUrl);
          chapters.push({ name: `Comic #${parseInt(ep, 10)}`, url: chUrl });
        }
      }
    }

    return { name, imageUrl, description, chapters };
  }

  async getPageList(url) {
    const r = await new Client().get(url, this._h(url));
    const html = r.body;

    // Comic reader embeds a PDF in an iframe
    // <iframe src="https://mlpfr.ponies.fr/spike/ACY-PDF-G5COMIC01-VF.pdf" ...></iframe>
    const ifM = html.match(/<iframe[^>]+src="([^"]+\.pdf[^"]*)"/i);
    if (ifM) return [ifM[1]];

    // PDF direct link (download)
    const dlM = html.match(/href="([^"]+\.pdf[^"]*)"[^>]*class="link"/i);
    if (dlM) return [dlM[1]];

    // Any PDF URL in the page
    const pdfM = html.match(/["'](https?:\/\/[^"']+\.pdf[^"']*)['"]/i);
    if (pdfM) return [pdfM[1]];

    return [url];
  }

  getForYou(page) { return this.getPopular(page); }
  getComments(url, page) { return Promise.resolve([]); }
}
