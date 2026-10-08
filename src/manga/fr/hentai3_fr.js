const watchtowerSources = [{
    "name": "3Hentai (FR)",
    "langs": ["fr"],
    "baseUrl": "https://3hentai.net",
    "iconUrl": "https://3hentai.net/favicon.ico",
    "typeSource": "single",
    "itemType": 2,
    "isManga": true,
    "isNsfw": true,
    "version": "1.0.0",
    "login": false,
    "forYou": false,
    "pkgPath": "manga/fr/hentai3_fr.js",
    "editableBaseUrl": true,
    "hasCloudflare": false,
    "requiresAccount": false,
    "hasDRM": false,
    "paywall": "free",
    "notes": "Galleries hentai filtrees sur le contenu francais."
}];
const BASE_URL = "https://3hentai.net";
const LANG_PARAM = "french";
class DefaultExtension extends MProvider {
    constructor() { super(); }
    get baseUrl() { return new SharedPreferences().get("base_url") || BASE_URL; }

    getSourcePreferences() {
        return [{
            key: "base_url",
            editTextPreference: {
                title: "URL du site",
                summary: "Adresse du site. A modifier uniquement si le domaine change.",
                value: BASE_URL,
                dialogTitle: "URL du site",
                dialogMessage: "URL actuelle : " + BASE_URL
            }
        }];
    }

    _hdrs(ref) {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
            "Referer": ref || this.baseUrl + "/",
            "Accept-Language": "fr-FR,fr;q=0.9"
        };
    }

    _dec(s) {
        return String(s || "")
            .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
            .replace(/&#0?34;/g, '"').replace(/&nbsp;/g, " ")
            .replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    }

    _parse(html) {
        const list = [];
        const seen = {};
        const re = /<div class="doujin[^"]*">[\s\S]*?<a href="(https:\/\/[^"]*\/d\/\d+)"[^>]*class="cover"[^>]*>[\s\S]*?data-src="([^"]+)"[\s\S]*?<div class="title">([\s\S]*?)<\/div>/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            if (seen[m[1]]) continue;
            seen[m[1]] = 1;
            list.push({ name: this._dec(m[3]), link: m[1], imageUrl: m[2] });
        }
        return list;
    }

    _hasNext(html, page) {
        if (new RegExp('href="[^"]*[?&]page=' + (page + 1) + '\\b').test(html)) return true;
        return /rel="next"/i.test(html);
    }

    async getPopular(page) {
        const url = this.baseUrl + "/language/" + LANG_PARAM + "/" + (page > 1 ? page : "") + "?sort=popular";
        const r = await new Client().get(url, this._hdrs());
        return { list: this._parse(r.body), hasNextPage: this._hasNext(r.body, page) };
    }

    async getLatestUpdates(page) {
        const url = this.baseUrl + "/language/" + LANG_PARAM + "/" + (page > 1 ? page : "");
        const r = await new Client().get(url, this._hdrs());
        return { list: this._parse(r.body), hasNextPage: this._hasNext(r.body, page) };
    }

    async search(query, page, filters) {
        const q = "language:" + LANG_PARAM + (query ? " " + query : "");
        const url = this.baseUrl + "/search?q=" + encodeURIComponent(q) + "&page=" + page;
        const r = await new Client().get(url, this._hdrs());
        return { list: this._parse(r.body), hasNextPage: this._hasNext(r.body, page) };
    }

    async getDetail(url) {
        const r = await new Client().get(url, this._hdrs(url));
        const html = r.body;
        const title = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
        const img = /<img[^>]+(?:data-src|src)="([^"]+)"/i.exec(html);
        const tags = [];
        const tagRe = /<a[^>]+href="[^"]*\/tags\/[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
        let tm;
        while ((tm = tagRe.exec(html)) !== null) tags.push(this._dec(tm[1]));
        return {
            name: title ? this._dec(title[1]) : "",
            link: url,
            imageUrl: img ? img[1] : "",
            genre: tags,
            description: "",
            chapters: [{ name: "Galerie", url: url }]
        };
    }

    async getPageList(url) {
        const r = await new Client().get(url, this._hdrs(url));
        const html = r.body;
        const id = (String(url).match(/\/d\/(\d+)/) || [])[1];
        const dir = id ? "/d" + id + "/" : null;
        const pages = [];
        const seen = {};
        const re = /<img[^>]+data-src="(https:\/\/s\d\.3hentai\.xyz\/[^"]+\/(\d+)t\.(jpg|png|gif|webp))"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            if (dir && m[1].indexOf(dir) === -1) continue;
            const full = m[1].replace(/(\d+)t\.(jpg|png|gif|webp)$/i, "$1.$2");
            if (seen[full]) continue;
            seen[full] = 1;
            pages.push({ url: full, headers: this._hdrs(url) });
        }
        pages.sort((a, b) => {
            const na = parseInt((a.url.match(/\/(\d+)\./) || [0, 0])[1], 10);
            const nb = parseInt((b.url.match(/\/(\d+)\./) || [0, 0])[1], 10);
            return na - nb;
        });
        return pages;
    }

    getFilterList() { return []; }
    getForYou(page) { return this.getPopular(page); }
    getComments(url, page) { return Promise.resolve([]); }
}
