// PapaduStream — extension Watchtower v1.0.0
// Films & Séries VF — site custom (peut retourner 403 selon IP)

const watchtowerSources = [{
    "name": "PapaduStream",
    "langs": ["fr"],
    "ids": { "fr": 704928183 },
    "baseUrl": "https://papadustream.college",
    "apiUrl": "https://papadustream.college",
    "iconUrl": "https://papadustream.college/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.1.2",
    "pkgPath": "watch/fr/papadustream2.js",
    "editableBaseUrl": true,
    "hasCloudflare": true,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "VF", "VOSTFR"],
    "subCategories": ["film", "serie"],
    "supportsForYou": true,
    "supportsComments": false,
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "notes": "PapaduStream — domaine papadustream.college hors ligne."
}];

const BASE_URL = "https://papadustream.college";

class DefaultExtension extends MProvider {
    constructor() { super(); }

    get baseUrl() { return new SharedPreferences().get("base_url") || BASE_URL; }
    _hdrs(ref) {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": ref || (this.baseUrl + "/"),
            "Accept-Language": "fr-FR,fr;q=0.9",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        };
    }

    _decode(s) {
        return String(s || "").replace(/&#0?39;/g, "'").replace(/&quot;/g, '"')
            .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
            .replace(/<[^>]+>/g, "").trim();
    }

    _parseCards(html) {
        const items = []; const seen = {};
        const re = /<a[^>]+href="((?:https?:\/\/[^"]+)?\/(?:film|serie|movie)[^"\/]+[^"]*\/)"[^>]*>[\s\S]{0,500}?<img[^>]+(?:src|data-src)="([^"]+)"[^>]+alt="([^"]{2,100})"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const url = m[1].startsWith("http") ? m[1] : this.baseUrl + m[1];
            if (url in seen) continue; seen[url] = 1;
            const img = m[2].startsWith("//") ? "https:" + m[2] : m[2].startsWith("/") ? this.baseUrl + m[2] : m[2];
            items.push({ link: url, imageUrl: img, name: this._decode(m[3]) });
        }
        if (items.length === 0) {
            const re2 = /<a[^>]+href="([^"]{15,})"[^>]*>([\s\S]{0,300}?)<\/a>/gi;
            let m2;
            while ((m2 = re2.exec(html)) !== null) {
                const u = m2[1].startsWith("http") ? m2[1] : this.baseUrl + m2[1];
                if (u in seen) continue; seen[u] = 1;
                const imgM = /<img[^>]+(?:src|data-src)="([^"]+)"[^>]*alt="([^"]{2,})"/i.exec(m2[2]);
                if (!imgM) continue;
                const img2 = imgM[1].startsWith("//") ? "https:" + imgM[1] : imgM[1];
                items.push({ link: u, imageUrl: img2, name: this._decode(imgM[2]) });
            }
        }
        return items;
    }

    async getPopular(page) {
        const url = page <= 1 ? this.baseUrl + "/films-en-streaming/" : `${this.baseUrl}/films-en-streaming/page/${page}/`;
        const res = await new Client().get(url, this._hdrs());
        const items = this._parseCards(res.body);
        return { list: items, hasNextPage: items.length >= 10 };
    }

    async getLatestUpdates(page) {
        const url = page <= 1 ? this.baseUrl + "/" : `${this.baseUrl}/page/${page}/`;
        const res = await new Client().get(url, this._hdrs());
        const items = this._parseCards(res.body);
        return { list: items, hasNextPage: items.length >= 10 };
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
        const ogImg = html.match(/property="og:image"[^>]*content="([^"]+)"/i) ||
                      html.match(/content="([^"]+)"[^>]*property="og:image"/i);
        const imageUrl = ogImg ? ogImg[1] : "";
        const descM = html.match(/property="og:description"[^>]*content="([^"]+)"/i) ||
                      html.match(/name="description"[^>]*content="([^"]+)"/i);
        const description = descM ? this._decode(descM[1]) : "";
        const chapters = [];
        const epRe = /<a[^>]+href="([^"]*(?:saison|episode|ep|vf|vostfr|streaming)[^"]*)"[^>]*>([\s\S]{0,80}?)<\/a>/gi;
        let em; const eSeen = {};
        while ((em = epRe.exec(html)) !== null) {
            const epUrl = em[1].startsWith("http") ? em[1] : this.baseUrl + em[1];
            if (epUrl in eSeen) continue; eSeen[epUrl] = 1;
            const epName = this._decode(em[2]);
            if (epName.length < 2) continue;
            chapters.push({ name: epName, url: epUrl });
        }
        if (chapters.length === 0) chapters.push({ name: name || "Regarder", url });
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
        const dataPRe = /data-(?:src|url|player)="(https?:\/\/[^"]{10,200})"/gi;
        let dm;
        while ((dm = dataPRe.exec(html)) !== null) {
            videos.push({ url: dm[1], quality: "AUTO", headers: this._hdrs(url) });
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
                    value: "https://papadustream.college",
                    dialogTitle: "URL du site",
                    dialogMessage: "URL actuelle : https://papadustream.college"
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
