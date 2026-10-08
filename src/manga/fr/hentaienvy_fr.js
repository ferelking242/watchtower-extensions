const watchtowerSources = [{
    "name": "HentaiEnvy (FR)",
    "langs": ["fr"],
    "baseUrl": "https://hentaienvy.com",
    "iconUrl": "https://hentaienvy.com/favicon.ico",
    "typeSource": "single",
    "itemType": 2,
    "isManga": true,
    "isNsfw": true,
    "version": "1.0.0",
    "login": false,
    "forYou": false,
    "pkgPath": "manga/fr/hentaienvy_fr.js",
    "editableBaseUrl": true,
    "hasCloudflare": false,
    "requiresAccount": false,
    "hasDRM": false,
    "paywall": "free",
    "notes": "Galleries hentai filtrees sur le contenu francais."
}];
const BASE_URL = "https://hentaienvy.com";
const LANG = "french";
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

    _abs(u) {
        if (!u) return "";
        return u.startsWith("http") ? u : this.baseUrl + (u.startsWith("/") ? u : "/" + u);
    }

    _parse(html) {
        const list = [];
        const seen = {};
        const re = /<article class="hnv-gallery-card"[\s\S]*?<a class="hnv-gallery-card__cover" href="([^"]+)"[\s\S]*?<img src="([^"]+)"[\s\S]*?<h2 class="hnv-gallery-card__title"><a href="[^"]+">([\s\S]*?)<\/a>/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const link = this._abs(m[1]);
            if (seen[link]) continue;
            seen[link] = 1;
            list.push({ name: this._dec(m[3]), link: link, imageUrl: this._abs(m[2]) });
        }
        return list;
    }

    _hasNext(html, page) {
        return new RegExp('href="[^"]*[?&]page=' + (page + 1) + '\\b').test(html);
    }

    async getPopular(page) {
        const url = this.baseUrl + "/language/" + LANG + "/popular/" + (page > 1 ? "?page=" + page : "");
        const r = await new Client().get(url, this._hdrs());
        return { list: this._parse(r.body), hasNextPage: this._hasNext(r.body, page) };
    }

    async getLatestUpdates(page) {
        const url = this.baseUrl + "/language/" + LANG + "/" + (page > 1 ? "?page=" + page : "");
        const r = await new Client().get(url, this._hdrs());
        return { list: this._parse(r.body), hasNextPage: this._hasNext(r.body, page) };
    }

    async search(query, page, filters) {
        const url = this.baseUrl + "/search/?key=" + encodeURIComponent(query || "") + (page > 1 ? "&page=" + page : "");
        const r = await new Client().get(url, this._hdrs());
        return { list: this._parse(r.body), hasNextPage: this._hasNext(r.body, page) };
    }

    async getDetail(url) {
        const r = await new Client().get(url, this._hdrs(url));
        const html = r.body;
        const title = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
        const img = /<img[^>]+src="(https:\/\/m\d+\.hentaienvy\.com\/[^"]+)"/i.exec(html);
        const total = /data-total-pages="(\d+)"/i.exec(html);
        return {
            name: title ? this._dec(title[1]) : "",
            link: url,
            imageUrl: img ? img[1] : "",
            description: "",
            chapters: [{ name: "Galerie" + (total ? " (" + total[1] + " pages)" : ""), url: url }]
        };
    }

    async getPageList(url) {
        const id = (String(url).match(/\/(?:gallery|g)\/(\d+)/) || [])[1];
        if (!id) return [];
        const base = this.baseUrl + "/g/" + id + "/1/";
        const r = await new Client().get(base, this._hdrs(base));
        const html = r.body;
        const mBase = /data-reader-image-base="([^"]+)"/i.exec(html);
        const mTotal = /data-reader-total="(\d+)"/i.exec(html);
        if (!mBase) return [];
        const total = mTotal ? parseInt(mTotal[1], 10) : 0;
        const pages = [];
        for (let i = 1; i <= total; i++) {
            pages.push({ url: mBase[1] + "/" + i + ".webp", headers: this._hdrs(base) });
        }
        return pages;
    }

    getFilterList() { return []; }
    getForYou(page) { return this.getPopular(page); }
    getComments(url, page) { return Promise.resolve([]); }
}
