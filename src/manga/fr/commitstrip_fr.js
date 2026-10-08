const watchtowerSources = [{
    "name": "CommitStrip (FR)",
    "langs": ["fr"],
    "baseUrl": "https://www.commitstrip.com",
    "iconUrl": "https://i.imgur.com/I7ps9zS.jpg",
    "typeSource": "single",
    "itemType": 2,
    "isManga": true,
    "isNsfw": false,
    "version": "1.0.0",
    "login": false,
    "forYou": false,
    "pkgPath": "manga/fr/commitstrip_fr.js",
    "editableBaseUrl": true,
    "hasCloudflare": false,
    "requiresAccount": false,
    "hasDRM": false,
    "paywall": "free",
    "notes": "Le blog qui raconte la vie des codeurs. Un manga par annee."
}];
const BASE_URL = "https://www.commitstrip.com";
const LANG = "fr";
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
            .replace(/&rsquo;/g, "'").replace(/&nbsp;/g, " ").replace(/&hellip;/g, "...")
            .replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    }

    _currentYear() { return new Date().getFullYear(); }

    _createManga(year) {
        return {
            name: "CommitStrip (" + year + ")",
            link: this.baseUrl + "/" + LANG + "/" + year + "/",
            imageUrl: "https://i.imgur.com/I7ps9zS.jpg",
            author: "Thomas Gx",
            artist: "Etienne Issartial",
            status: year === this._currentYear() ? 0 : 1,
            description: "Le blog qui raconte la vie des codeurs.\n\nNote : cette entree regroupe les planches publiees en " + year + "."
        };
    }

    async getPopular(page) {
        const list = [];
        const now = this._currentYear();
        for (let y = now; y >= 2012; y--) list.push(this._createManga(y));
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

    async _yearChapters(year) {
        const chapters = [];
        const seen = {};
        for (let p = 1; p <= 20; p++) {
            const pageUrl = this.baseUrl + "/" + LANG + "/" + year + "/" + (p > 1 ? "page/" + p + "/" : "");
            let html;
            try {
                const r = await new Client().get(pageUrl, this._hdrs(pageUrl));
                html = r.body;
            } catch (e) { break; }
            const before = chapters.length;
            const re = /<div class="excerpt">[\s\S]*?<a[^>]+href="(https:\/\/www\.commitstrip\.com\/20\d\d\/\d\d\/\d\d\/[^"]+)"[\s\S]*?<strong>([\s\S]*?)<\/strong>/gi;
            let m;
            while ((m = re.exec(html)) !== null) {
                const chapterUrl = m[1];
                if (seen[chapterUrl]) continue;
                seen[chapterUrl] = 1;
                chapters.push({ name: this._dec(m[2]), url: chapterUrl });
            }
            if (chapters.length === before) break;
        }
        return chapters;
    }

    async getDetail(url) {
        const now = this._currentYear();
        let year = parseInt((String(url || "").match(/(\d{4})/) || [])[1] || now, 10);
        const manga = this._createManga(year);
        let chapters = await this._yearChapters(year);
        for (let y = now; chapters.length === 0 && y >= now - 3; y--) {
            if (y === year) continue;
            chapters = await this._yearChapters(y);
        }
        manga.chapters = chapters;
        return manga;
    }

    async getPageList(url) {
        const r = await new Client().get(url, this._hdrs(url));
        const html = r.body;
        const block = /<div class="entry-content">([\s\S]*?)<!-- \.entry-content -->/i.exec(html);
        if (!block) return [];
        const m = /<img[^>]+src="([^"]+)"/i.exec(block[1]);
        if (!m) return [];
        return [{ url: m[1], headers: this._hdrs(url) }];
    }

    getFilterList() { return []; }
    getForYou(page) { return this.getPopular(page); }
    getComments(url, page) { return Promise.resolve([]); }
}
