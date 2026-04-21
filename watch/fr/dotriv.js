const mangayomiSources = [{
    "name": "Dotriv",
    "langs": ["fr"],
    "ids": { "fr": 334859201 },
    "baseUrl": "https://dotriv.com",
    "apiUrl": "https://dotriv.com",
    "iconUrl": "https://raw.githubusercontent.com/kodjodevf/watchtower/main/extensions/watch/icon/fr.dotriv.png",
    "typeSource": "single",
    "itemType": 2,
    "version": "0.1.1",
    "pkgPath": "watch/fr/dotriv.js",
    "editableBaseUrl": true,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "1080p", "720p", "480p", "360p"],
    "contentSubtype": ["drama", "anime", "serie"]
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

    get realHomePath() {
        return `${this.baseUrl}/a8634js/home/dotriv`;
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

        // Dotriv CMS: look for drama/film links with thumbnail images
        // Structure varies but usually: <a href="/drama/SLUG"><img src="URL" title="TITLE">
        const re = /<a[^>]+href="((?:https?:\/\/dotriv\.com)?\/[^"]+(?:drama|film|serie|anime)[^"]*)"[^>]*>[\s\S]{0,400}?<img[^>]+(?:src|data-src)="([^"]+)"[^>]+(?:alt|title)="([^"]+)"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const url = m[1].startsWith("http") ? m[1] : `${this.baseUrl}${m[1]}`;
            if (seen.has(url) || m[1].includes("javascript") || m[1].includes(".png") || m[1].includes(".ico")) continue;
            seen.add(url);
            const name = m[3].trim();
            if (name.length > 1) list.push({ url, imageUrl: m[2], name });
        }

        // Fallback: look for any article/card with title + image
        if (list.length === 0) {
            const re2 = /<img[^>]+(?:src|data-src)="([^"]+)"[^>]+(?:alt|title)="([^"]{2,})"[^>]*>[\s\S]{0,200}?<a[^>]+href="((?:https?:\/\/dotriv\.com)?\/[a-z0-9][^"]+)"/gi;
            while ((m = re2.exec(html)) !== null) {
                const url = m[3].startsWith("http") ? m[3] : `${this.baseUrl}${m[3]}`;
                if (seen.has(url) || m[3].includes("javascript") || m[3].length < 5) continue;
                seen.add(url);
                list.push({ url, imageUrl: m[1], name: m[2].trim() });
            }
        }

        return list;
    }

    async getPopular(page) {
        const res = await this.client.get(`${this.realHomePath}`, this.getHeaders());
        const list = this._parseItems(res.body);
        return { list, hasNextPage: false };
    }

    async getLatestUpdates(page) {
        const res = await this.client.get(`${this.realHomePath}`, this.getHeaders());
        const list = this._parseItems(res.body);
        return { list, hasNextPage: false };
    }

    async search(query, page, filterList) {
        const searchUrl = `${this.realHomePath}?searchword=${encodeURIComponent(query)}&searchphrase=all&task=search&option=com_search`;
        const res = await this.client.get(searchUrl, this.getHeaders());
        const list = this._parseItems(res.body);
        return { list, hasNextPage: false };
    }

    async getDetail(url) {
        const res = await this.client.get(url, this.getHeaders());
        const html = res.body;

        const nameM = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) ||
                      html.match(/<title>([^<]+)<\/title>/);
        const name = nameM ? nameM[1].replace(/<[^>]+>/g, "").trim() : "";

        const imgM = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) ||
                     html.match(/<img[^>]+class="[^"]*(?:poster|cover|thumb)[^"]*"[^>]+src="([^"]+)"/i);
        const imageUrl = imgM ? imgM[1] : "";

        const descM = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
        const description = descM ? descM[1].trim() : "";

        const episodes = [];
        const epRe = /<a[^>]+href="([^"]+(?:episode|ep-|saison|streaming)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
        let m;
        while ((m = epRe.exec(html)) !== null) {
            const epName = m[2].replace(/<[^>]+>/g, "").trim();
            if (epName.length > 1) {
                const epUrl = m[1].startsWith("http") ? m[1] : `${this.baseUrl}${m[1]}`;
                episodes.push({ name: epName, url: epUrl, dateUpload: "" });
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
            { key: "base_url", listPreference: { title: "URL de base", summary: this.baseUrl, valueIndex: 0, entries: [this.source.baseUrl], entryValues: [this.source.baseUrl] } },
            { key: "user_agent", editTextPreference: { title: "User-Agent personnalisé", summary: "Laisser vide pour utiliser le défaut", value: "", dialogTitle: "User-Agent", dialogMessage: "Entrez un User-Agent personnalisé" } },
            { key: "preferred_quality", listPreference: { title: "Qualité vidéo préférée", summary: "AUTO", valueIndex: 0, entries: ["AUTO", "1080p", "720p", "480p", "360p"], entryValues: ["AUTO", "1080p", "720p", "480p", "360p"] } }
        ];
    }
}
