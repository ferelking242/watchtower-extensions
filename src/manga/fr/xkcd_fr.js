const watchtowerSources = [{
    "name": "xkcd (FR)",
    "langs": ["fr"],
    "baseUrl": "https://xkcd.lapin.org",
    "iconUrl": "https://xkcd.lapin.org/favicon.ico",
    "typeSource": "single",
    "itemType": 2,
    "isManga": true,
    "isNsfw": false,
    "version": "1.0.0",
    "login": false,
    "forYou": false,
    "pkgPath": "manga/fr/xkcd_fr.js",
    "editableBaseUrl": true,
    "hasCloudflare": false,
    "requiresAccount": false,
    "hasDRM": false,
    "paywall": "free",
    "notes": "xkcd traduit en francais (lapin.org). Un seul manga, tous les strips en chapitres."
}];
const BASE_URL = "https://xkcd.lapin.org";
class DefaultExtension extends MProvider {
    constructor() { super(); }
    get baseUrl() { return new SharedPreferences().get("base_url") || BASE_URL; }

    getSourcePreferences() {
        return [{
            key: "base_url",
            editTextPreference: {
                title: "URL du site",
                summary: "Adresse du miroir francais. A modifier uniquement si le domaine change.",
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

    _abs(url) {
        if (!url) return "";
        if (url.startsWith("http")) return url;
        return this.baseUrl + (url.startsWith("/") ? url : "/" + url);
    }

    _dec(s) {
        return String(s || "")
            .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
            .replace(/&nbsp;/g, " ").replace(/&eacute;/g, "e").replace(/&egrave;/g, "e")
            .replace(/&agrave;/g, "a").replace(/&ccedil;/g, "c").replace(/&ecirc;/g, "e")
            .replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    }

    _numberFromUrl(url) {
        const m = String(url || "").match(/number=(\d+)/);
        return m ? parseInt(m[1], 10) : null;
    }

    _parseArchive(html) {
        const list = [];
        const re = /<a[^>]+href=['"]index\.php\?number=(\d+)['"][^>]*>([\s\S]*?)<\/a>/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const number = parseInt(m[1], 10);
            const title = this._dec(m[2]);
            list.push({
                name: number + ": " + title,
                link: this.baseUrl + "/index.php?number=" + number,
                imageUrl: ""
            });
        }
        return list;
    }

    async getPopular(page) {
        const r = await new Client().get(this.baseUrl + "/tous-episodes.php", this._hdrs());
        return {
            list: [{
                name: "xkcd",
                link: this.baseUrl + "/tous-episodes.php",
                imageUrl: this.baseUrl + "/favicon.ico",
                description: "Un webcomic sarcastique qui parle de romance, de maths et de langage.",
                author: "Randall Munroe",
                artist: "Randall Munroe",
                genre: ["Comedy", "Webcomic"]
            }],
            hasNextPage: false
        };
    }

    async getLatestUpdates(page) {
        return await this.getPopular(page);
    }

    async search(query, page, filters) {
        const r = await new Client().get(this.baseUrl + "/tous-episodes.php", this._hdrs());
        const all = this._parseArchive(r.body);
        const q = (query || "").toLowerCase().trim();
        const list = q ? all.filter((c) => c.name.toLowerCase().includes(q)) : all;
        return { list: list.slice(0, 100), hasNextPage: false };
    }

    async getDetail(url) {
        const target = (url && url.includes("tous-episodes")) ? url : this.baseUrl + "/tous-episodes.php";
        const r = await new Client().get(target, this._hdrs());
        const chapters = this._parseArchive(r.body).reverse().map((c) => ({ name: c.name, url: c.link }));
        return {
            name: "xkcd",
            link: this.baseUrl + "/tous-episodes.php",
            imageUrl: this.baseUrl + "/favicon.ico",
            description: "Un webcomic sarcastique qui parle de romance, de maths et de langage.",
            author: "Randall Munroe",
            artist: "Randall Munroe",
            genre: ["Comedy", "Webcomic"],
            chapters: chapters
        };
    }

    async getPageList(url) {
        const r = await new Client().get(url, this._hdrs(url));
        const html = r.body;
        const pages = [];
        const seen = {};
        const re = /<img[^>]+src=['"]([^'"]*strips\/[^'"]+)['"][^>]*>/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const u = this._abs(m[1]);
            if (!seen[u]) { seen[u] = 1; pages.push({ url: u, headers: this._hdrs(url) }); }
        }
        if (pages.length === 0) {
            const anyImg = /<img[^>]+src=['"]([^'"]*strips[^'"]*)['"]/i.exec(html);
            if (anyImg) pages.push({ url: this._abs(anyImg[1]), headers: this._hdrs(url) });
        }
        return pages;
    }

    getFilterList() { return []; }
    getForYou(page) { return this.getPopular(page); }
    getComments(url, page) { return Promise.resolve([]); }
}
