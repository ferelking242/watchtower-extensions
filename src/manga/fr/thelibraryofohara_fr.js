const watchtowerSources = [{
    "name": "The Library of Ohara (FR)",
    "langs": ["fr"],
    "baseUrl": "https://thelibraryofohara.com",
    "iconUrl": "https://thelibraryofohara.com/wp-content/uploads/2017/09/cropped-the-library-of-ohara-21.png",
    "typeSource": "single",
    "itemType": 2,
    "isManga": true,
    "isNsfw": false,
    "version": "1.0.0",
    "login": false,
    "forYou": false,
    "pkgPath": "manga/fr/thelibraryofohara_fr.js",
    "editableBaseUrl": true,
    "hasCloudflare": false,
    "requiresAccount": false,
    "hasDRM": false,
    "paywall": "free",
    "notes": "Analyses One Piece et webcomic Return to the Reverie (contenu francais)."
}];
const BASE_URL = "https://thelibraryofohara.com";
const REVERIE_CATEGORY = "699200615";
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

    _abs(u) {
        if (!u) return "";
        return u.startsWith("http") ? u : this.baseUrl + (u.startsWith("/") ? u : "/" + u);
    }

    _dec(s) {
        return String(s || "")
            .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
            .replace(/&#8211;/g, "-").replace(/&#8217;/g, "'").replace(/&nbsp;/g, " ")
            .replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    }

    async getPopular(page) {
        const r = await new Client().get(this.baseUrl + "/", this._hdrs());
        const html = r.body;
        const list = [];
        const seen = {};
        const re = new RegExp('<li class="cat-item cat-item-' + REVERIE_CATEGORY + '"><a href="([^"]+)">([\\s\\S]*?)<\\/a>', "gi");
        let m;
        while ((m = re.exec(html)) !== null) {
            const link = this._abs(m[1]);
            if (seen[link]) continue;
            seen[link] = 1;
            list.push({ name: this._dec(m[2]).replace(/\s*\(\d+\)$/, ""), link: link, imageUrl: "" });
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
        const chapters = [];
        const seen = {};
        let title = "Return to the Reverie";
        let cover = "";
        let next = url;
        let guard = 0;
        while (next && guard < 10) {
            guard++;
            const r = await new Client().get(next, this._hdrs(next));
            const html = r.body;
            if (guard === 1) {
                const t = /<h1 class="page-title">([\s\S]*?)<\/h1>/i.exec(html);
                if (t) title = this._dec(t[1]).replace(/^Category:\s*/i, "");
            }
            const re = /<article[\s\S]*?<a class="entry-thumbnail[^"]*" href="([^"]+)"[\s\S]*?<img[^>]+src="([^"]+)"[\s\S]*?<h2 class="entry-title"><a[^>]*>([\s\S]*?)<\/a>/gi;
            let m;
            while ((m = re.exec(html)) !== null) {
                const cu = m[1];
                if (seen[cu]) continue;
                seen[cu] = 1;
                const name = this._dec(m[3]);
                if (name.toLowerCase().indexOf("french") === -1) continue;
                if (!cover) cover = m[2];
                chapters.push({ name: name, url: cu });
            }
            const nx = /<div class="nav-previous"><a href="([^"]+)"/i.exec(html);
            next = nx ? this._abs(nx[1]) : null;
        }
        return {
            name: title,
            link: url,
            imageUrl: cover,
            author: "Artur - The Library of Ohara",
            description: "Webcomic et analyses One Piece. Contenu francais uniquement.",
            chapters: chapters
        };
    }

    async getPageList(url) {
        const r = await new Client().get(url, this._hdrs(url));
        const html = r.body;
        const block = /<div class="entry-content">([\s\S]*?)<footer/i.exec(html);
        const scope = block ? block[1] : html;
        const pages = [];
        const seen = {};
        const re = /<img[^>]+data-orig-file="([^"]+)"[^>]*>/gi;
        let m;
        while ((m = re.exec(scope)) !== null) {
            const u = m[1].replace(/&#0?38;/g, "&").replace(/&amp;/g, "&");
            if (seen[u]) continue;
            seen[u] = 1;
            pages.push({ url: u, headers: this._hdrs(url) });
        }
        return pages;
    }

    getFilterList() { return []; }
    getForYou(page) { return this.getPopular(page); }
    getComments(url, page) { return Promise.resolve([]); }
}
