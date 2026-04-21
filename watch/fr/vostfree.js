const mangayomiSources = [{
    "name": "Vostfree",
    "langs": ["fr"],
    "ids": { "fr": 445160798 },
    "baseUrl": "https://vostfree.ws",
    "apiUrl": "https://vostfree.ws",
    "iconUrl": "https://raw.githubusercontent.com/kodjodevf/watchtower/main/extensions/watch/icon/fr.vostfree.png",
    "typeSource": "single",
    "itemType": 2,
    "version": "0.1.1",
    "pkgPath": "watch/fr/vostfree.js",
    "editableBaseUrl": true,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "1080p", "720p", "480p", "360p"],
    "contentSubtype": ["anime", "film"]
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
            "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8"
        };
    }

    _parseItems(html) {
        const list = [];
        const seen = new Set();
        // Structure: <a href="https://vostfree.ws/123-title-vostfr-ddl-streaming.html"><img src="..." alt="Title VOSTFR">
        const re = /<a[^>]+href="(https?:\/\/vostfree[^"]+\.html)"[^>]*>[\s\S]{0,500}?<img[^>]+src="([^"]+)"[^>]+alt="([^"]+)"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const url = m[1];
            if (seen.has(url)) continue;
            seen.add(url);
            const name = m[3]
                .replace(/\s*(VOSTFR|VF|FRENCH|TrueFrench|DDL|streaming|Streaming)[^A-Z]*/gi, "")
                .trim();
            if (name.length > 1) {
                list.push({ url, imageUrl: m[2], name });
            }
        }

        // Fallback: relative URLs
        if (list.length === 0) {
            const re2 = /<a[^>]+href="(\/[0-9]+-[^"]+\.html)"[^>]*>[\s\S]{0,500}?<img[^>]+src="([^"]+)"[^>]+alt="([^"]+)"/gi;
            while ((m = re2.exec(html)) !== null) {
                const url = m[1].startsWith("http") ? m[1] : `${this.baseUrl}${m[1]}`;
                if (seen.has(url)) continue;
                seen.add(url);
                const name = m[3].replace(/\s*(VOSTFR|VF|FRENCH|DDL|streaming)[^A-Z]*/gi, "").trim();
                if (name.length > 1) list.push({ url, imageUrl: m[2], name });
            }
        }

        return list;
    }

    async getPopular(page) {
        const res = await this.client.get(`${this.baseUrl}/?page=${page}`, this.getHeaders());
        const list = this._parseItems(res.body);
        return { list, hasNextPage: list.length >= 10 };
    }

    async getLatestUpdates(page) {
        const res = await this.client.get(`${this.baseUrl}/?do=lastupdate&page=${page}`, this.getHeaders());
        const list = this._parseItems(res.body);
        return { list, hasNextPage: list.length >= 10 };
    }

    async search(query, page, filterList) {
        // Vostfree uses ?search=QUERY (confirmed working)
        const res = await this.client.get(
            `${this.baseUrl}/?search=${encodeURIComponent(query)}&page=${page}`,
            this.getHeaders()
        );
        const list = this._parseItems(res.body);
        return { list, hasNextPage: list.length >= 10 };
    }

    async getDetail(url) {
        const res = await this.client.get(url, this.getHeaders());
        const html = res.body;

        const nameM = html.match(/<h1[^>]*class="[^"]*(?:title|name)[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) ||
                      html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
        const name = nameM ? nameM[1].replace(/<[^>]+>/g, "").trim() : "";

        const imgM = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) ||
                     html.match(/<img[^>]+class="[^"]*poster[^"]*"[^>]+src="([^"]+)"/i);
        const imageUrl = imgM ? imgM[1] : "";

        const descM = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
        const description = descM ? descM[1].trim() : "";

        const episodes = [];
        const epRe = /<a[^>]+href="([^"]+episode[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let m;
        while ((m = epRe.exec(html)) !== null) {
            const epName = m[2].replace(/<[^>]+>/g, "").trim();
            if (epName) {
                episodes.push({ name: epName, url: m[1].startsWith("/") ? `${this.baseUrl}${m[1]}` : m[1], dateUpload: "" });
            }
        }
        if (episodes.length === 0) {
            episodes.push({ name: "Regarder", url, dateUpload: "" });
        }

        return { name, description, imageUrl, genres: [], status: 0, chapters: episodes };
    }

    async getVideoList(url) {
        const res = await this.client.get(url, this.getHeaders());
        const html = res.body;
        const videos = [];
        const q = this.preferredQuality;

        const iframeRe = /<iframe[^>]+src="([^"]+)"/gi;
        let m;
        while ((m = iframeRe.exec(html)) !== null) {
            const src = m[1].startsWith("//") ? `https:${m[1]}` : m[1];
            if (!src.includes("pub") && !src.includes("advert")) {
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
                    title: "URL de base",
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
                    summary: "Laisser vide pour utiliser le défaut",
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
