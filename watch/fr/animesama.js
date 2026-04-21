const mangayomiSources = [{
    "name": "Anime-Sama",
    "langs": ["fr"],
    "ids": { "fr": 556271809 },
    "baseUrl": "https://anime-sama.fr",
    "apiUrl": "https://anime-sama.fr",
    "iconUrl": "https://raw.githubusercontent.com/kodjodevf/watchtower/main/extensions/watch/icon/fr.animesama.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "0.1.0",
    "pkgPath": "watch/fr/animesama.js",
    "editableBaseUrl": true,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "1080p", "720p", "480p", "360p"],
    "contentSubtype": ["anime", "manga"]
}];

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
    }

    get baseUrl() {
        const pref = this.source.prefs?.find(p => p.key === "base_url");
        return (pref && pref.value) ? pref.value.replace(/\/$/, "") : this.source.baseUrl.replace(/\/$/, "");
    }

    get userAgent() {
        const pref = this.source.prefs?.find(p => p.key === "user_agent");
        return (pref && pref.value) ? pref.value : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    }

    get preferredQuality() {
        const pref = this.source.prefs?.find(p => p.key === "preferred_quality");
        return (pref && pref.value) ? pref.value : "AUTO";
    }

    getHeaders() {
        return {
            "User-Agent": this.userAgent,
            "Referer": `${this.baseUrl}/`,
            "Accept-Language": "fr-FR,fr;q=0.9"
        };
    }

    _parseAnime(html) {
        const list = [];
        const re = /<a[^>]+href="([^"]+catalogue[^"]+)"[^>]*>[\s\S]*?<img[^>]+(?:src|data-src)="([^"]+)"[^>]+alt="([^"]+)"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const url = m[1].startsWith("http") ? m[1] : `${this.baseUrl}${m[1]}`;
            list.push({ url, imageUrl: m[2], name: m[3].trim() });
        }
        if (list.length === 0) {
            const re2 = /<div[^>]*class="[^"]*cardAnime[^"]*"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?<img[^>]+(?:src|data-src)="([^"]+)"[^>]*>[\s\S]*?<h2[^>]*>([\s\S]*?)<\/h2>/gi;
            while ((m = re2.exec(html)) !== null) {
                const url = m[1].startsWith("http") ? m[1] : `${this.baseUrl}${m[1]}`;
                list.push({ url, imageUrl: m[2], name: m[3].replace(/<[^>]+>/g, "").trim() });
            }
        }
        return list;
    }

    async getPopular(page) {
        const res = await this.client.get(`${this.baseUrl}/catalogue/`, this.getHeaders());
        const list = this._parseAnime(res.body);
        return { list, hasNextPage: false };
    }

    async getLatestUpdates(page) {
        const res = await this.client.get(`${this.baseUrl}/`, this.getHeaders());
        const list = this._parseAnime(res.body);
        return { list, hasNextPage: false };
    }

    async search(query, page, filterList) {
        const res = await this.client.get(
            `${this.baseUrl}/catalogue/?search=${encodeURIComponent(query)}`,
            this.getHeaders()
        );
        const list = this._parseAnime(res.body);
        return { list, hasNextPage: false };
    }

    async getDetail(url) {
        const fullUrl = url.startsWith("http") ? url : `${this.baseUrl}${url}`;
        const res = await this.client.get(fullUrl, this.getHeaders());
        const html = res.body;

        const nameM = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
        const name = nameM ? nameM[1].replace(/<[^>]+>/g, "").trim() : "";

        const descM = html.match(/<p[^>]*class="[^"]*synopsis[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
                      html.match(/<div[^>]*id="synopsis"[^>]*>([\s\S]*?)<\/div>/i);
        const description = descM ? descM[1].replace(/<[^>]+>/g, "").trim() : "";

        const imgM = html.match(/<img[^>]+id="imgAffiche"[^>]+src="([^"]+)"/i) ||
                     html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
        const imageUrl = imgM ? imgM[1] : "";

        const episodes = [];
        const saisonRe = /<a[^>]+href="([^"]+saison\d[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
        let em;
        while ((em = saisonRe.exec(html)) !== null) {
            const epUrl = em[1].startsWith("http") ? em[1] : `${this.baseUrl}${em[1]}`;
            const epName = em[2].replace(/<[^>]+>/g, "").trim();
            if (epName) episodes.push({ name: epName, url: epUrl, dateUpload: "" });
        }

        const epRe = /<a[^>]+href="([^"]+(?:episode|ep)\d[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
        while ((em = epRe.exec(html)) !== null) {
            const epUrl = em[1].startsWith("http") ? em[1] : `${this.baseUrl}${em[1]}`;
            const epName = em[2].replace(/<[^>]+>/g, "").trim();
            if (epName && epName.match(/\d/)) episodes.push({ name: epName, url: epUrl, dateUpload: "" });
        }

        if (episodes.length === 0) {
            episodes.push({ name: "Regarder", url: fullUrl, dateUpload: "" });
        }

        return { name, description, imageUrl, genres: [], status: 0, chapters: episodes };
    }

    async getVideoList(url) {
        const fullUrl = url.startsWith("http") ? url : `${this.baseUrl}${url}`;
        const res = await this.client.get(fullUrl, this.getHeaders());
        const html = res.body;
        const videos = [];
        const q = this.preferredQuality;

        const playerRe = /eps\d*\s*=\s*\[([\s\S]*?)\]/gi;
        let pm;
        while ((pm = playerRe.exec(html)) !== null) {
            const urls = pm[1].match(/["'](https?:\/\/[^"']+)["']/g);
            if (urls) {
                urls.forEach((u, i) => {
                    const clean = u.replace(/["']/g, "");
                    videos.push({ url: clean, quality: q !== "AUTO" ? q : `Lecteur ${i + 1}`, originalUrl: clean });
                });
            }
        }

        const iframeRe = /<iframe[^>]+src="([^"]+)"/gi;
        let m;
        while ((m = iframeRe.exec(html)) !== null) {
            const src = m[1].startsWith("//") ? `https:${m[1]}` : m[1];
            if (!src.includes("pub") && !src.includes("ads")) {
                videos.push({ url: src, quality: q !== "AUTO" ? q : "Stream", originalUrl: src });
            }
        }

        return videos;
    }

    getFilterList() { return []; }

    getSourcePreferences() {
        return [
            {
                key: "base_url",
                listPreference: {
                    title: "URL de base (modifiable si le site change de domaine)",
                    summary: this.baseUrl,
                    valueIndex: 0,
                    entries: [this.source.baseUrl],
                    entryValues: [this.source.baseUrl]
                }
            },
            {
                key: "user_agent",
                editTextPreference: {
                    title: "User-Agent personnalisé",
                    summary: "Laisser vide pour utiliser le User-Agent par défaut",
                    value: "",
                    dialogTitle: "User-Agent",
                    dialogMessage: "Entrez un User-Agent personnalisé"
                }
            },
            {
                key: "preferred_quality",
                listPreference: {
                    title: "Qualité vidéo préférée",
                    summary: "AUTO",
                    valueIndex: 0,
                    entries: ["AUTO", "1080p", "720p", "480p", "360p"],
                    entryValues: ["AUTO", "1080p", "720p", "480p", "360p"]
                }
            }
        ];
    }
}
