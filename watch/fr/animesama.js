const mangayomiSources = [{
    "name": "Anime-Sama",
    "langs": ["fr"],
    "ids": { "fr": 223948123 },
    "baseUrl": "https://anime-sama.fr",
    "apiUrl": "https://anime-sama.fr",
    "iconUrl": "https://raw.githubusercontent.com/kodjodevf/watchtower/main/extensions/watch/icon/fr.animesama.png",
    "typeSource": "single",
    "itemType": 2,
    "version": "0.1.1",
    "pkgPath": "watch/fr/animesama.js",
    "editableBaseUrl": true,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "1080p", "720p", "480p", "360p"],
    "contentSubtype": ["anime"]
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

        // Anime-Sama: catalogue cards
        // Structure: <a href="/catalogue/SLUG/"><img src="URL" alt="TITLE">
        const re = /<a[^>]+href="((?:https?:\/\/anime-sama\.fr)?\/catalogue\/[^"]+\/)"[^>]*>[\s\S]{0,400}?<img[^>]+(?:src|data-src)="([^"]+)"[^>]+alt="([^"]+)"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const url = m[1].startsWith("http") ? m[1] : `${this.baseUrl}${m[1]}`;
            if (seen.has(url)) continue;
            seen.add(url);
            const name = m[3].trim();
            if (name.length > 1) list.push({ url, imageUrl: m[2], name });
        }

        // Fallback: reverse order (img before anchor)
        if (list.length === 0) {
            const re2 = /<img[^>]+(?:src|data-src)="([^"]+)"[^>]+alt="([^"]{2,})"[^>]*>[\s\S]{0,200}?<a[^>]+href="((?:https?:\/\/anime-sama\.fr)?\/catalogue\/[^"]+\/)"/gi;
            while ((m = re2.exec(html)) !== null) {
                const url = m[3].startsWith("http") ? m[3] : `${this.baseUrl}${m[3]}`;
                if (seen.has(url)) continue;
                seen.add(url);
                list.push({ url, imageUrl: m[1], name: m[2].trim() });
            }
        }

        return list;
    }

    async getPopular(page) {
        const res = await this.client.get(`${this.baseUrl}/catalogue/`, this.getHeaders());
        const list = this._parseItems(res.body);
        return { list, hasNextPage: false };
    }

    async getLatestUpdates(page) {
        const res = await this.client.get(`${this.baseUrl}/`, this.getHeaders());
        const list = this._parseItems(res.body);
        return { list, hasNextPage: false };
    }

    async search(query, page, filterList) {
        const res = await this.client.get(
            `${this.baseUrl}/catalogue/?search=${encodeURIComponent(query)}`,
            this.getHeaders()
        );
        const list = this._parseItems(res.body);
        return { list, hasNextPage: false };
    }

    async getDetail(url) {
        const res = await this.client.get(url, this.getHeaders());
        const html = res.body;

        const nameM = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
        const name = nameM ? nameM[1].replace(/<[^>]+>/g, "").trim() : "";

        const imgM = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) ||
                     html.match(/<img[^>]+class="[^"]*(?:poster|cover|thumb)[^"]*"[^>]+src="([^"]+)"/i);
        const imageUrl = imgM ? imgM[1] : "";

        const descM = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
        const description = descM ? descM[1].trim() : "";

        const episodes = [];
        const epRe = /href="((?:https?:\/\/anime-sama\.fr)?\/catalogue\/[^"]+(?:saison|episode|ep)[^"]*)"[^>]*title="([^"]+)"/gi;
        let m;
        while ((m = epRe.exec(html)) !== null) {
            const epUrl = m[1].startsWith("http") ? m[1] : `${this.baseUrl}${m[1]}`;
            episodes.push({ name: m[2].trim(), url: epUrl, dateUpload: "" });
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
            { key: "base_url", listPreference: { title: "URL de base", summary: this.baseUrl, valueIndex: 0, entries: [this.source.baseUrl], entryValues: [this.source.baseUrl] } },
            { key: "user_agent", editTextPreference: { title: "User-Agent personnalisé", summary: "Laisser vide pour utiliser le défaut", value: "", dialogTitle: "User-Agent", dialogMessage: "Entrez un User-Agent personnalisé" } },
            { key: "preferred_quality", listPreference: { title: "Qualité vidéo préférée", summary: "AUTO", valueIndex: 0, entries: ["AUTO", "1080p", "720p", "480p", "360p"], entryValues: ["AUTO", "1080p", "720p", "480p", "360p"] } }
        ];
    }
}
