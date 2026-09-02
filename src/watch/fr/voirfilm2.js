// VoirFilm — extension Watchtower v1.0.0
// Films VF — voirfilm.cz

const watchtowerSources = [{
    "name": "VoirFilm HD",
    "langs": ["fr"],
    "ids": { "fr": 734750584 },
    "baseUrl": "https://voirfilm.cz",
    "apiUrl": "https://voirfilm.cz",
    "iconUrl": "https://voirfilm.cz/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.1.2",
    "pkgPath": "watch/fr/voirfilm2.js",
    "editableBaseUrl": true,
    "hasCloudflare": false,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "VF", "VOSTFR"],
    "subCategories": ["film"],
    "supportsForYou": true,
    "supportsComments": false,
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "notes": "VoirFilm HD — domaine voirfilm.cz hors ligne."
}];

const BASE_URL = "https://voirfilm.cz";

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
        const re = /<a[^>]+href="((?:https?:\/\/[^"]+)?\/(?:film|movie|streaming)[^"]+)"[^>]*>[\s\S]{0,500}?<img[^>]+(?:src|data-src)="([^"]+)"[^>]+alt="([^"]{2,100})"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const url = m[1].startsWith("http") ? m[1] : this.baseUrl + m[1];
            if (url in seen) continue; seen[url] = 1;
            const img = m[2].startsWith("//") ? "https:" + m[2] : m[2].startsWith("/") ? this.baseUrl + m[2] : m[2];
            items.push({ link: url, imageUrl: img, name: this._decode(m[3]) });
        }
        return items;
    }

    async getPopular(page) {
        const url = page <= 1 ? this.baseUrl + "/films/" : `${this.baseUrl}/films/page/${page}/`;
        const res = await new Client().get(url, this._hdrs());
        const items = this._parseCards(res.body);
        return { list: items, hasNextPage: items.length >= 8 };
    }

    async getLatestUpdates(page) {
        const url = page <= 1 ? this.baseUrl + "/" : `${this.baseUrl}/page/${page}/`;
        const res = await new Client().get(url, this._hdrs());
        const items = this._parseCards(res.body);
        return { list: items, hasNextPage: items.length >= 8 };
    }

    async search(query, page, filterList) {
        const url = `${this.baseUrl}/?s=${encodeURIComponent(query)}`;
        const res = await new Client().get(url, this._hdrs());
        return { list: this._parseCards(res.body), hasNextPage: false };
    }

    async getDetail(url) {
        const res = await new Client().get(url, this._hdrs(url));
        const html = res.body;
        const nameM = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
        const name = nameM ? this._decode(nameM[1]) : "";
        const ogImg = html.match(/property="og:image"[^>]*content="([^"]+)"/i) || html.match(/content="([^"]+)"[^>]*property="og:image"/i);
        const imageUrl = ogImg ? ogImg[1] : "";
        const descM = html.match(/property="og:description"[^>]*content="([^"]+)"/i) || html.match(/name="description"[^>]*content="([^"]+)"/i);
        const description = descM ? this._decode(descM[1]) : "";
        const chapters = [{ name: name || "Regarder", url }];
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
                    value: "https://voirfilm.cz",
                    dialogTitle: "URL du site",
                    dialogMessage: "URL actuelle : https://voirfilm.cz"
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
