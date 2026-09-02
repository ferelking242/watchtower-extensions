const watchtowerSources = [{
    "name": "Anime-Sama",
    "langs": ["fr"],
    "ids": { "fr": 223948123 },
    "baseUrl": "https://anime-sama.to",
    "apiUrl": "https://anime-sama.to",
    "iconUrl": "https://anime-sama.to/favicon.ico",
    "typeSource": "single",
    "itemType": 2,
    "version": "0.1.7",
    "pkgPath": "watch/fr/animesama.js",
    "editableBaseUrl": true,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "1080p", "720p", "480p", "360p"],
    "contentSubtype": ["anime"]
}];

const BASE_URL = "https://anime-sama.to";

class DefaultExtension extends MProvider {
    constructor() { super();}

    get baseUrl() { return new SharedPreferences().get("base_url") || BASE_URL.replace(/\/$/, ""); }
    get logEnabled() { return new SharedPreferences().get("log_enabled") === "true"; }
    get logTopic() { return new SharedPreferences().get("log_topic") || "wtfr-animesama"; }
    get pref_quality() { return new SharedPreferences().get("preferred_quality") || "AUTO"; }

    _hdrs(ref) { return { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36", "Referer": ref || `${this.baseUrl}/`, "Accept-Language": "fr-FR,fr;q=0.9" }; }

    async _log(msg) {
        if (!this.logEnabled) return;
        try { await new Client().post(`https://ntfy.sh/${this.logTopic}`, `[AnimeSama] ${msg}`, { "Title": "AnimeSama", "Content-Type": "text/plain" }); } catch(e) {}
    }

    _parse(html) {
        const list = []; const seen = {};
        // Match /catalogue/... links — domain-agnostic (works with any baseUrl)
        const re = /<a[^>]+href="((?:https?:\/\/[^\/]+)?\/catalogue\/[^"]+\/)"[^>]*>[\s\S]{0,400}?<img[^>]+(?:src|data-src)="([^"]+)"[^>]+alt="([^"]{2,})"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const url = m[1].startsWith("http") ? m[1] : `${this.baseUrl}${m[1]}`;
            if ((url in seen)) continue; (seen[url] = 1);
            list.push({ link: url, imageUrl: m[2], name: m[3].trim() });
        }
        return list;
    }

    async getPopular(page) {
        const res = await new Client().get(`${this.baseUrl}/catalogue/`, this._hdrs());
        await this._log(`popular: ${res.body.length}b`);
        const list = this._parse(res.body);
        await this._log(`popular: ${list.length} items`);
        return { list, hasNextPage: false };
    }

    async getLatestUpdates(page) {
        const res = await new Client().get(`${this.baseUrl}/`, this._hdrs());
        const list = this._parse(res.body);
        return { list, hasNextPage: false };
    }

    async search(query, page, filterList) {
        await this._log(`search: "${query}"`);
        const res = await new Client().get(`${this.baseUrl}/catalogue/?search=${encodeURIComponent(query)}`, this._hdrs());
        await this._log(`search: ${res.body.length}b`);
        const list = this._parse(res.body);
        await this._log(`search: ${list.length} items`);
        return { list, hasNextPage: false };
    }

    async getDetail(url) {
        await this._log(`detail: ${url}`);
        const res = await new Client().get(url, this._hdrs());
        const html = res.body;

        const nameM = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
        const name = nameM ? nameM[1].replace(/<[^>]+>/g, "").trim() : "";

        const descM = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i) ||
                      html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
        const description = descM ? descM[1].trim() : "";

        const imgM = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
        const imageUrl = imgM ? imgM[1] : "";

        const episodes = [];
        // Domain-agnostic: match any URL containing /catalogue/ with saison/film/episode
        const epRe = /href="((?:https?:\/\/[^"]+)?\/catalogue\/[^"]+(?:saison|film|episode)[^"]*\/)"[^>]*title="([^"]+)"/gi;
        let m;
        while ((m = epRe.exec(html)) !== null) {
            const epUrl = m[1].startsWith("http") ? m[1] : `${this.baseUrl}${m[1]}`;
            episodes.push({ name: m[2].trim(), url: epUrl, dateUpload: "" });
        }
        if (episodes.length === 0) episodes.push({ name: name || "Regarder", url, dateUpload: "" });

        await this._log(`detail ok: "${name}", ${episodes.length} ep`);
        return { name, description, imageUrl, genres: [], status: 0, chapters: episodes };
    }

    async getVideoList(url) {
        await this._log(`video: ${url}`);
        const res = await new Client().get(url, this._hdrs(url));
        const html = res.body || "";
        const videos = [];
        const q = this.pref_quality;

        // Direct mp4/m3u8 in page source
        const directRe = /(?:file|source|src|url)\s*[=:]\s*["']([^"']+\.(?:m3u8|mp4)[^"']{0,150})["']/gi;
        let m;
        while ((m = directRe.exec(html)) !== null) {
            const vUrl = m[1].startsWith("//") ? `https:${m[1]}` : m[1];
            if (!videos.some(v => v.url === vUrl)) {
                videos.push({ url: vUrl, quality: q !== "AUTO" ? q : "Direct", originalUrl: vUrl });
            }
        }

        // Find iframe embed URLs
        const iframeUrls = [];
        const iframeRe = /<iframe[^>]+src="((?:https?:)?\/\/[^"]{10,})"/gi;
        while ((m = iframeRe.exec(html)) !== null) {
            const src = m[1].startsWith("//") ? `https:${m[1]}` : m[1];
            if (!src.includes("google") && !src.includes("recaptcha") && !src.includes("disqus")) {
                iframeUrls.push(src);
            }
        }

        // Try resolving each embed player to get a direct video URL
        for (const embedUrl of iframeUrls.slice(0, 4)) {
            let resolved = false;
            try {
                const embedRes = await new Client().get(embedUrl, { ...this._hdrs(url), "Referer": url });
                const ebody = embedRes.body || "";
                const hlsM = ebody.match(/["'`](https?:\/\/[^"'`]+\.m3u8[^"'`]{0,150})["'`]/);
                if (hlsM) {
                    videos.push({ url: hlsM[1], quality: q !== "AUTO" ? q : "Stream", originalUrl: hlsM[1] });
                    resolved = true;
                }
                const mp4M = ebody.match(/["'`](https?:\/\/[^"'`]+\.mp4[^"'`]{0,150})["'`]/);
                if (mp4M && !resolved) {
                    videos.push({ url: mp4M[1], quality: q !== "AUTO" ? q : "Direct", originalUrl: mp4M[1] });
                    resolved = true;
                }
            } catch (e) {}
            if (!resolved) {
                videos.push({ url: embedUrl, quality: q !== "AUTO" ? q : "Stream", originalUrl: embedUrl });
            }
        }

        await this._log(`video: ${videos.length} found`);
        return videos;
    }

    getFilterList() { return []; }

    getSourcePreferences() {
        return [
            { key: "base_url", listPreference: { title: "URL de base", summary: this.baseUrl, valueIndex: 0, entries: [BASE_URL], entryValues: [BASE_URL] } },
            { key: "preferred_quality", listPreference: { title: "Qualité préférée", summary: "AUTO", valueIndex: 0, entries: ["AUTO", "1080p", "720p", "480p", "360p"], entryValues: ["AUTO", "1080p", "720p", "480p", "360p"] } },
            { key: "log_enabled", listPreference: { title: "Logs ntfy.sh", summary: "Voir logs sur ntfy.sh/[topic]", valueIndex: 0, entries: ["Désactivé", "Activé"], entryValues: ["false", "true"] } },
            { key: "log_topic", editTextPreference: { title: "Topic ntfy.sh", summary: "wtfr-animesama", value: "wtfr-animesama", dialogTitle: "Topic ntfy.sh", dialogMessage: "Topic ntfy.sh unique pour vos logs" } }
        ];
    }
}
