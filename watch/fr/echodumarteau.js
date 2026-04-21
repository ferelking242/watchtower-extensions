const mangayomiSources = [{
    "name": "Echo du Marteau",
    "langs": ["fr"],
    "ids": { "fr": 778594031 },
    "baseUrl": "https://echodumarteau.fr",
    "apiUrl": "https://echodumarteau.fr",
    "iconUrl": "https://raw.githubusercontent.com/kodjodevf/watchtower/main/extensions/watch/icon/fr.echodumarteau.png",
    "typeSource": "single",
    "itemType": 2,
    "version": "0.1.1",
    "pkgPath": "watch/fr/echodumarteau.js",
    "editableBaseUrl": true,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "1080p", "720p", "480p", "360p"],
    "contentSubtype": ["serie", "drama"]
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

        // Generic card structure with image + title
        const re = /<a[^>]+href="(https?:\/\/echodumarteau\.fr\/[^"]+)"[^>]*title="([^"]+)"[^>]*>[\s\S]{0,300}?<img[^>]+src="([^"]+)"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            if (seen.has(m[1]) || m[1].includes("category") || m[1].includes("tag")) continue;
            seen.add(m[1]);
            list.push({ url: m[1], imageUrl: m[3], name: m[2].trim() });
        }

        // Fallback
        if (list.length === 0) {
            const re2 = /<img[^>]+src="([^"]+)"[^>]+alt="([^"]{2,})"[^>]*>[\s\S]{0,200}?<a[^>]+href="(https?:\/\/echodumarteau\.fr\/[^"]+)"/gi;
            while ((m = re2.exec(html)) !== null) {
                if (seen.has(m[3])) continue;
                seen.add(m[3]);
                list.push({ url: m[3], imageUrl: m[1], name: m[2].trim() });
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
        const res = await this.client.get(`${this.baseUrl}/?page=${page}`, this.getHeaders());
        const list = this._parseItems(res.body);
        return { list, hasNextPage: list.length >= 10 };
    }

    async search(query, page, filterList) {
        const res = await this.client.get(
            `${this.baseUrl}/?s=${encodeURIComponent(query)}&page=${page}`,
            this.getHeaders()
        );
        const list = this._parseItems(res.body);
        return { list, hasNextPage: list.length >= 10 };
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
        const epRe = /href="(https?:\/\/echodumarteau\.fr\/[^"]+(?:episode|ep-|saison)[^"]*)"[^>]*title="([^"]+)"/gi;
        let m;
        while ((m = epRe.exec(html)) !== null) {
            episodes.push({ name: m[2].trim(), url: m[1], dateUpload: "" });
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
