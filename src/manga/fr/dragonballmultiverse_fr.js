const watchtowerSources = [{
    "name": "Dragon Ball Multiverse (FR)",
    "langs": ["fr"],
    "baseUrl": "https://www.dragonball-multiverse.com",
    "iconUrl": "https://www.dragonball-multiverse.com/favicon.ico",
    "typeSource": "single",
    "itemType": 2,
    "isManga": true,
    "isNsfw": false,
    "version": "1.0.0",
    "login": false,
    "forYou": false,
    "pkgPath": "manga/fr/dragonballmultiverse_fr.js",
    "editableBaseUrl": true,
    "hasCloudflare": false,
    "requiresAccount": false,
    "hasDRM": false,
    "paywall": "free",
    "notes": "Webcomic officiel DB Multiverse (version francaise)."
}, {
    "name": "Dragon Ball Multiverse Parody (FR)",
    "langs": ["fr"],
    "baseUrl": "https://www.dragonball-multiverse.com",
    "iconUrl": "https://www.dragonball-multiverse.com/favicon.ico",
    "typeSource": "single",
    "itemType": 2,
    "isManga": true,
    "isNsfw": false,
    "version": "1.0.0",
    "login": false,
    "forYou": false,
    "pkgPath": "manga/fr/dragonballmultiverse_fr.js",
    "editableBaseUrl": true,
    "hasCloudflare": false,
    "requiresAccount": false,
    "hasDRM": false,
    "paywall": "free",
    "notes": "Parodies DB Multiverse (version francaise)."
}];
const BASE_URL = "https://www.dragonball-multiverse.com";
const LANG = "fr";
class DefaultExtension extends MProvider {
    constructor() { super(); }
    get baseUrl() { return new SharedPreferences().get("base_url") || BASE_URL; }
    get isParody() { return /Parody/i.test(this.source && this.source.name ? this.source.name : ""); }

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

    _abs(url) {
        if (!url) return "";
        if (url.startsWith("http")) return url;
        if (url.startsWith("/")) return this.baseUrl + url;
        return this.baseUrl + "/" + LANG + "/" + url;
    }

    _dec(s) {
        return String(s || "")
            .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
            .replace(/&#039;/g, "'").replace(/&nbsp;/g, " ")
            .replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    }

    async getPopular(page) {
        const url = this.baseUrl + "/" + LANG + "/read.html";
        const r = await new Client().get(url, this._hdrs());
        const html = r.body;
        const list = [];
        const seen = {};
        const re = /<div class="cadrelect dbm-read">([\s\S]*?)<\/div>\s*<\/div>/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const block = m[1];
            const h3 = /<h3[^>]*>([\s\S]*?)<\/h3>/i.exec(block);
            const a = /<a[^>]+href="([^"]+)"[^>]*>/i.exec(block);
            const img = /<img[^>]+src="([^"]+)"/i.exec(block);
            if (!h3 || !a) continue;
            const link = this._abs(a[1].replace(/&amp;/g, "&"));
            if (seen[link]) continue;
            seen[link] = 1;
            list.push({
                name: this._dec(h3[1]),
                link: link,
                imageUrl: img ? this._abs(img[1]) : ""
            });
        }
        return { list: list, hasNextPage: false };
    }

    async getLatestUpdates(page) {
        return await this.getPopular(page);
    }

    async search(query, page, filters) {
        const r = await this.getPopular(page);
        const q = (query || "").toLowerCase().trim();
        const list = q ? r.list.filter((m) => m.name.toLowerCase().includes(q)) : r.list;
        return { list: list, hasNextPage: false };
    }

    async getDetail(url) {
        const r = await new Client().get(url, this._hdrs(url));
        const html = r.body;
        const chapters = [];
        const seen = {};
        const re = /<div class="[\s\S]*?cadrelect[\s\S]*?chapter[\s\S]*?">([\s\S]*?)<\/h4>/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const block = m[1];
            const a = /<a[^>]+href="([^"]+)"[^>]*>/i.exec(block);
            const h4 = /<h4[^>]*>([\s\S]*?)<\/h4>/i.exec(m[0]);
            if (!a || !h4) continue;
            const cu = this._abs(a[1].replace(/&amp;/g, "&"));
            if (seen[cu]) continue;
            seen[cu] = 1;
            chapters.push({ name: this._dec(h4[1]), url: cu });
        }
        const titleM = /<title[^>]*>([^<]*)</i.exec(html);
        return {
            name: titleM ? this._dec(titleM[1]) : "DB Multiverse",
            link: url,
            imageUrl: "",
            description: "Dragon Ball Multiverse",
            chapters: chapters.reverse()
        };
    }

    async getPageList(url) {
        const r = await new Client().get(url, this._hdrs(url));
        const html = r.body;
        const pageUrls = [];
        const seen = {};
        const re = /<div class="pageslist">([\s\S]*?)<\/div>/i.exec(html);
        const scope = re ? re[1] : html;
        const aRe = /<a[^>]+href='([^']+)'/gi;
        let m;
        while ((m = aRe.exec(scope)) !== null) {
            const u = this._abs(m[1]);
            if (seen[u]) continue;
            seen[u] = 1;
            pageUrls.push(u);
        }
        const pages = await Promise.all(pageUrls.map(async (pu) => {
            try {
                const pr = await new Client().get(pu, this._hdrs(url));
                const img = /id="balloonsimg"[\s\S]*?<img[^>]+src="([^"]+)"/i.exec(pr.body)
                    || /<img[^>]+src="([^"]*image\.php[^"]*)"/i.exec(pr.body);
                if (img) return { url: this._abs(img[1].replace(/&amp;/g, "&")), headers: this._hdrs(pu) };
            } catch (e) { }
            return null;
        }));
        return pages.filter((p) => p);
    }

    getFilterList() { return []; }
    getForYou(page) { return this.getPopular(page); }
    getComments(url, page) { return Promise.resolve([]); }
}
