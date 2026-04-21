const mangayomiSources = [{
    "name": "Dotriv",
    "langs": ["fr"],
    "ids": { "fr": 334059687 },
    "baseUrl": "https://dotriv.com",
    "apiUrl": "https://dotriv.com",
    "iconUrl": "https://raw.githubusercontent.com/kodjodevf/watchtower/main/extensions/watch/icon/fr.dotriv.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "0.1.0",
    "pkgPath": "watch/fr/dotriv.js",
    "editableBaseUrl": true,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "1080p", "720p", "480p", "360p"],
    "contentSubtype": ["film", "serie", "anime"],
    "realHomePath": "/a8634js/home/dotriv"
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

    get realHome() {
        return `${this.baseUrl}/a8634js/home/dotriv`;
    }

    getHeaders() {
        return {
            "User-Agent": this.userAgent,
            "Referer": `${this.baseUrl}/`,
            "Accept-Language": "fr-FR,fr;q=0.9"
        };
    }

    _parseItems(html) {
        const list = [];
        const re = /<a[^>]+href="([^"]+)"[^>]*>\s*<img[^>]+(?:src|data-src)="([^"]+)"[^>]+(?:alt|title)="([^"]+)"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const href = m[1];
            if (href.includes("/film") || href.includes("/serie") || href.includes("/anime") || href.includes("/watch") || href.includes("/streaming")) {
                const url = href.startsWith("http") ? href : `${this.baseUrl}${href}`;
                list.push({ url, imageUrl: m[2], name: m[3].trim() });
            }
        }
        return list;
    }

    async _getPage(path, page) {
        const url = page > 1 ? `${this.baseUrl}${path}?page=${page}` : `${this.baseUrl}${path}`;
        const res = await this.client.get(url, this.getHeaders());
        const list = this._parseItems(res.body);
        const hasNext = res.body.includes(`page=${page + 1}`) || res.body.includes('class="next"');
        return { list, hasNextPage: hasNext };
    }

    async getPopular(page) {
        return this._getPage("/a8634js/home/dotriv", page);
    }

    async getLatestUpdates(page) {
        return this._getPage("/a8634js/home/dotriv", page);
    }

    async search(query, page, filterList) {
        const res = await this.client.get(
            `${this.baseUrl}/a8634js/home/dotriv?s=${encodeURIComponent(query)}`,
            this.getHeaders()
        );
        const list = this._parseItems(res.body);
        return { list, hasNextPage: false };
    }

    async getDetail(url) {
        const fullUrl = url.startsWith("http") ? url : `${this.baseUrl}${url}`;
        const res = await this.client.get(fullUrl, this.getHeaders());
        const html = res.body;

        const nameM = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
        const name = nameM ? nameM[1].replace(/<[^>]+>/g, "").trim() : "";

        const descM = html.match(/<div[^>]*class="[^"]*(?:synopsis|description|resume)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        const description = descM ? descM[1].replace(/<[^>]+>/g, "").trim() : "";

        const imgM = html.match(/<img[^>]+(?:src|data-src)="([^"]+)"[^>]+(?:alt|title)="[^"]*poster[^"]*"/i) ||
                     html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
        const imageUrl = imgM ? imgM[1] : "";

        const episodes = [];
        const epRe = /<a[^>]+href="([^"]+(?:episode|saison|ep)[^"]*)"[^>]*title="([^"]+)"/gi;
        let em;
        while ((em = epRe.exec(html)) !== null) {
            const epUrl = em[1].startsWith("http") ? em[1] : `${this.baseUrl}${em[1]}`;
            episodes.push({ name: em[2].trim(), url: epUrl, dateUpload: "" });
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

        const iframeRe = /<iframe[^>]+src="([^"]+)"/gi;
        let m;
        while ((m = iframeRe.exec(html)) !== null) {
            const src = m[1].startsWith("//") ? `https:${m[1]}` : m[1];
            if (!src.includes("pub") && !src.includes("ads")) {
                videos.push({ url: src, quality: q !== "AUTO" ? q : "Stream", originalUrl: src });
            }
        }

        const fileRe = /(?:file|src)\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/gi;
        while ((m = fileRe.exec(html)) !== null) {
            videos.push({ url: m[1], quality: q !== "AUTO" ? q : "Direct", originalUrl: m[1] });
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
