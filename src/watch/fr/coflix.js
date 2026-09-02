// Coflix — extension Watchtower v1.0.2
// Site WordPress (thème imovie) — Films & Séries VF/VOSTFR
// Base: coflix.band → coflix.trade (2026-06)

const watchtowerSources = [{
    "name": "Coflix",
    "langs": ["fr"],
    "ids": { "fr": 501827364 },
    "baseUrl": "https://coflix.re",
    "apiUrl": "https://coflix.re",
    "iconUrl": "https://coflix.re/wp-content/uploads/2022/10/cropped-coflix-180x180-1-150x150.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.1.2",
    "pkgPath": "watch/fr/coflix.js",
    "editableBaseUrl": true,
    "hasCloudflare": false,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "VF", "VOSTFR", "VO"],
    "subCategories": ["film", "serie"],
    "supportsForYou": true,
    "supportsComments": false,
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "notes": "Coflix — Films & Séries VF. Domaine actuel: coflix.re (juil 2026)"
}];

const BASE_URL = "https://coflix.re";

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
            .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
            .replace(/<[^>]+>/g, "").trim();
    }

    _parseCards(html) {
        const items = []; const seen = {};
        // coflix.trade: <a aria-label="TITLE" href="URL">...<img src="IMG">
        const re = /<a[^>]+aria-label="([^"]{2,120})"[^>]+href="(https?:\/\/[^"]*\/(?:film|serie|drames|animes)\/[^"]+\/)"[^>]*>[\s\S]{0,400}?<img[^>]+src="([^"]+)"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const url = m[2]; if (url in seen) continue; seen[url] = 1;
            const img = m[3].startsWith("//") ? "https:" + m[3] : m[3];
            items.push({ link: url, imageUrl: img, name: this._decode(m[1]) });
        }
        // Fallback: any film/serie link with img
        if (items.length === 0) {
            const re2 = /<a[^>]+href="(https?:\/\/[^"]*\/(?:film|serie)\/[^"]+\/)"[^>]*>([\s\S]{0,400}?)<\/a>/gi;
            let m2;
            while ((m2 = re2.exec(html)) !== null) {
                const url = m2[1]; if (url in seen) continue; seen[url] = 1;
                const lblM = /aria-label="([^"]{2,120})"/.exec(m2[0]);
                const imgM = /<img[^>]+src="([^"]+)"/i.exec(m2[2]);
                if (!lblM && !imgM) continue;
                const name = lblM ? this._decode(lblM[1]) : "";
                const img = imgM ? (imgM[1].startsWith("//") ? "https:" + imgM[1] : imgM[1]) : "";
                if (name || img) items.push({ link: url, imageUrl: img, name });
            }
        }
        return items;
    }

    async getPopular(page) {
        const url = `${this.baseUrl}/film/page/${page}/`;
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
        const url = `${this.baseUrl}/?s=${encodeURIComponent(query)}&paged=${page}`;
        const res = await new Client().get(url, this._hdrs());
        const items = this._parseCards(res.body);
        return { list: items, hasNextPage: items.length >= 10 };
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
                      html.match(/content="([^"]+)"[^>]*(?:og:description|name="description")/i);
        const description = descM ? this._decode(descM[1]) : "";

        const chapters = [];
        const epRe = /<a[^>]+href="([^"]*(?:saison|season|episode|ep)[^"]*)"[^>]*>([\s\S]{0,80}?)<\/a>/gi;
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

        const iframeRe = /iframe[^>]+src="(https?:\/\/[^"]*(?:lecteur|embed|player|dood|streamtape|sibnet|uqload|vudeo|voe)[^"]{0,200})"/gi;
        let im;
        while ((im = iframeRe.exec(html)) !== null) {
            videos.push({ url: im[1], quality: "AUTO", headers: this._hdrs(url) });
        }

        const dataPRe = /data-player="(https?:\/\/[^"]+)"/gi;
        let dm;
        while ((dm = dataPRe.exec(html)) !== null) {
            videos.push({ url: dm[1], quality: "AUTO", headers: this._hdrs(url) });
        }

        const hlsRe = /["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)/gi;
        let hm;
        while ((hm = hlsRe.exec(html)) !== null) {
            if (!videos.find(v => v.url === hm[1]))
                videos.push({ url: hm[1], quality: "AUTO", headers: this._hdrs(url) });
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
                    value: "https://coflix.re",
                    dialogTitle: "URL du site",
                    dialogMessage: "URL actuelle : https://coflix.re"
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
