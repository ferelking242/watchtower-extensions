// YassFlix — extension Watchtower v1.0.0
// Films & Séries VF — yassflix.cc

const watchtowerSources = [{
    "name": "YassFlix",
    "langs": ["fr"],
    "ids": { "fr": 722658252 },
    "baseUrl": "https://yassflix.cc",
    "apiUrl": "https://yassflix.cc",
    "iconUrl": "https://yassflix.cc/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.1.2",
    "pkgPath": "watch/fr/yassflix.js",
    "editableBaseUrl": true,
    "hasCloudflare": false,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "VF", "VOSTFR"],
    "subCategories": ["film", "serie"],
    "supportsForYou": true,
    "supportsComments": false,
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "notes": "YassFlix — domaine yassflix.cc hors ligne (blog)."
}];

const BASE_URL = "https://yassflix.cc";

class DefaultExtension extends MProvider {
    constructor() { super(); }

    get baseUrl() { return new SharedPreferences().get("base_url") || BASE_URL; }
    _hdrs(ref) {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": ref || (this.baseUrl + "/"),
            "Accept-Language": "fr-FR,fr;q=0.9"
        };
    }

    _decode(s) {
        return String(s || "").replace(/&#0?39;/g, "'").replace(/&quot;/g, '"')
            .replace(/&amp;/g, "&").replace(/<[^>]+>/g, "").trim();
    }

    _parseCards(html) {
        const items = []; const seen = {};
        // Next.js listing: <a ... href="/movie/<slug>-<id>"></a>...<img alt="Title" src="..."/>
        const re = /<a[^>]+href="([^"]*\/(?:movie|tv|watch|film|serie)\/[^"]+)"[^>]*><\/a>([\s\S]{0,1200}?)(?:<\/picture>|<\/a>|<\/div>)/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const seg = m[2];
            const imgM = /<img[^>]+src="([^"]+)"[^>]*>/.exec(seg);
            const altM = /alt="([^"]{2,120})"/.exec(seg);
            if (!imgM || !altM) continue;
            this._addCard(items, seen, m[1], imgM[1], altM[1]);
        }
        return items;
    }

    _addCard(items, seen, href, imgSrc, alt) {
        const url = href.startsWith("http") ? href : this.baseUrl + href;
        if (url in seen) return;
        if (!/\d+$/.test(url)) return;
        seen[url] = 1;
        const img = imgSrc.startsWith("//") ? "https:" + imgSrc : imgSrc.startsWith("/") ? this.baseUrl + imgSrc : imgSrc;
        items.push({ link: url, imageUrl: img, name: this._decode(alt) });
    }

    async getPopular(page) {
        const url = this.baseUrl + (page > 1 ? `/movies?page=${page}` : "/movies");
        const res = await new Client().get(url, this._hdrs());
        const items = this._parseCards(res.body);
        return { list: items, hasNextPage: items.length >= 12 };
    }

    async getLatestUpdates(page) {
        const url = this.baseUrl + (page > 1 ? `/tv-shows?page=${page}` : "/tv-shows");
        const res = await new Client().get(url, this._hdrs());
        const items = this._parseCards(res.body);
        return { list: items, hasNextPage: items.length >= 12 };
    }

    async search(query, page, filterList) {
        const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;
        const res = await new Client().get(url, this._hdrs());
        return { list: this._parseCards(res.body), hasNextPage: false };
    }

    async getDetail(url) {
        let res = await new Client().get(url, this._hdrs(url));
        let html = res.body;
        let watchUrl = url;
        // /movie/<slug>-<id> and /tv/<slug>-<id> are client-side routes that 404 when
        // fetched server-side; fall back to the SSR watch page /watch/<kind>/<id>
        if (res.statusCode >= 400 || /404: This page could not be found/.test(html)) {
            const m = url.match(/\/(movie|tv)\/(?:[^/]*-)?(\d+)(?:\/)?$/);
            if (m) {
                const alt = `https://yassflix.cc/watch/${m[1]}/${m[2]}`;
                const r2 = await new Client().get(alt, this._hdrs(alt));
                if (r2.statusCode < 400) { res = r2; html = r2.body; watchUrl = alt; }
            }
        }
        const nameM = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || html.match(/<title>([^<]*)<\/title>/);
        const name = nameM ? this._decode(nameM[1]).replace(/^Yassflix\s*-\s*Watching\s*/i, "").trim() : "";
        const ogImg = html.match(/property="og:image"[^>]*content="([^"]+)"/i) || html.match(/content="([^"]+)"[^>]*property="og:image"/i);
        const imageUrl = ogImg ? ogImg[1] : "";
        const descM = html.match(/property="og:description"[^>]*content="([^"]+)"/i) || html.match(/name="description"[^>]*content="([^"]+)"/i);
        const description = descM ? this._decode(descM[1]) : "";
        const chapters = [];
        const epRe = /<a[^>]+href="([^"]*(?:saison|episode|vf|vostfr)[^"]*)"[^>]*>([\s\S]{0,80}?)<\/a>/gi;
        let em; const eSeen = {};
        while ((em = epRe.exec(html)) !== null) {
            const epUrl = em[1].startsWith("http") ? em[1] : this.baseUrl + em[1];
            if (epUrl in eSeen) continue; eSeen[epUrl] = 1;
            const epName = this._decode(em[2]);
            if (epName.length < 2) continue;
            chapters.push({ name: epName, url: epUrl });
        }
        if (chapters.length === 0) chapters.push({ name: name || "Regarder", url: watchUrl });
        return { name, imageUrl, description, chapters };
    }

    async getVideoList(url) {
        const res = await new Client().get(url, this._hdrs(url));
        const html = res.body;
        const videos = [];
        const iframeRe = /iframe[^>]+src="(https?:\/\/[^"]{10,200})"/gi;
        let m;
        while ((m = iframeRe.exec(html)) !== null) {
            videos.push({ url: m[1], quality: "AUTO", headers: this._hdrs(url) });
        }
        return videos;
    }

    async getForYou(page) { return this.getPopular(page); }

    getSourcePreferences() {
        return [
            {
                key: "base_url",
                editTextPreference: {
                    title: "URL du site",
                    summary: "Adresse du site. Changez si le domaine est migré.",
                    value: "https://yassflix.cc",
                    dialogTitle: "URL du site",
                    dialogMessage: "URL actuelle : https://yassflix.cc"
                }
            },
            {
                key: "default_quality",
                listPreference: {
                    title: "Qualité vidéo par défaut",
                    summary: "La qualité sélectionnée est prioritaire. Si indisponible, la plus proche est choisie automatiquement.",
                    valueIndex: 0,
                    entries: ["Auto (recommandé)","1080p — Full HD","720p — HD","480p — SD","360p — Faible"],
                    entryValues: ["AUTO","1080","720","480","360"]
                }
            },
            {
                key: "quality_fallback",
                listPreference: {
                    title: "Si la qualité n'est pas disponible",
                    summary: "Choisir la qualité la plus proche si celle demandée n'existe pas",
                    valueIndex: 1,
                    entries: ["Prendre la qualité supérieure", "Prendre la qualité inférieure (recommandé)"],
                    entryValues: ["higher", "lower"]
                }
            }
        ];
    }
}
