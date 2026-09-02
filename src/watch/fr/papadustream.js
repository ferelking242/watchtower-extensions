const watchtowerSources = [{
    "name": "VF24",
    "langs": ["fr"],
    "ids": { "fr": 223948576 },
    "baseUrl": "https://vf24.fr",
    "apiUrl": "https://vf24.fr",
    "iconUrl": "https://vf24.fr/favicon.svg",
    "typeSource": "single",
    "itemType": 1,
    "version": "0.1.7",
    "pkgPath": "watch/fr/papadustream.js",
    "editableBaseUrl": true,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "1080p", "720p", "480p", "360p"],
    "contentSubtype": ["film", "serie"]
}];

const BASE_URL = "https://vf24.fr";

class DefaultExtension extends MProvider {
    constructor() { super();}

    get baseUrl() { return new SharedPreferences().get("base_url") || BASE_URL.replace(/\/$/, ""); }
    get logEnabled() { const p = new SharedPreferences().get("log_enabled"); return p && p.value === "true"; }
    get logTopic() { const p = new SharedPreferences().get("log_topic"); return (p && p.value) ? p.value : "wtfr-papadustream"; }
    get pref_quality() { const p = new SharedPreferences().get("preferred_quality"); return (p && p.value) ? p.value : "AUTO"; }

    _hdrs(ref) { return { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36", "Referer": ref || `${this.baseUrl}/`, "Accept-Language": "fr-FR,fr;q=0.9" }; }

    async _log(msg) {
        if (!this.logEnabled) return;
        try { await new Client().post(`https://ntfy.sh/${this.logTopic}`, `[PDS] ${msg}`, { "Title": "PapaDuStream", "Content-Type": "text/plain" }); } catch(e) {}
    }

    _parse(html) {
        const list = []; const seen = {};
        // papadustream.fashion card format:
        // <a href="/category-films/SLUG.html"> ... <img src="IMG" alt="TITLE"> ...
        // <a href="/category-series/SLUG.html"> ... <img src="IMG" alt="TITLE"> ...
        const re = /<a[^>]+href="((?:https?:\/\/[^\/]+)?\/category-(?:films|series)\/[^"]+\.html)"[^>]*>[\s\S]{0,400}?<img[^>]+src="([^"]+)"[^>]+alt="([^"]{2,120})"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const url = m[1].startsWith("http") ? m[1] : `${this.baseUrl}${m[1]}`;
            if ((url in seen)) continue; (seen[url] = 1);
            const name = m[3].replace(/\s*streaming\s*(?:gratuit\s*)?(?:HD|VF|VOSTFR|vf|vostfr)?\.?/gi, "").trim();
            list.push({ link: url, imageUrl: m[2], name });
        }
        return list;
    }

    async getPopular(page) {
        const res = await new Client().get(`${this.baseUrl}/cat-films/page-${page}.html`, this._hdrs());
        await this._log(`popular ${page}: ${res.body.length}b`);
        const list = this._parse(res.body);
        await this._log(`popular: ${list.length} items`);
        return { list, hasNextPage: list.length >= 10 };
    }

    async getLatestUpdates(page) {
        const res = await new Client().get(`${this.baseUrl}/cat-series/page-${page}.html`, this._hdrs());
        const list = this._parse(res.body);
        return { list, hasNextPage: list.length >= 10 };
    }

    async search(query, page, filterList) {
        await this._log(`search: "${query}" -> populaire (pas de recherche serveur)`);
        return await this.getPopular(page);
    }

    async getDetail(url) {
        await this._log(`detail: ${url}`);
        const res = await new Client().get(url, this._hdrs(url));
        const html = res.body;

        const nameM = html.match(/<h1[^>]*>([\s\S]{2,200}?)<\/h1>/i) ||
                      html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) ||
                      html.match(/<title>([^<|–-]+)/i);
        const name = nameM ? nameM[1].replace(/<[^>]+>/g, "").replace(/\s*(?:streaming|VF|VOSTFR|HD)\s*/gi, " ").trim() : "";

        const imgM = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) ||
                     html.match(/<img[^>]+class="[^"]*(?:poster|cover|thumb)[^"]*"[^>]+src="([^"]+)"/i) ||
                     html.match(/<img[^>]+src="(https?:\/\/(?:www\.)?filmoflix\.fyi[^"]+)"/i);
        const imageUrl = imgM ? imgM[1] : "";

        const descM = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i) ||
                      html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i) ||
                      html.match(/<div[^>]+class="[^"]*(?:synopsis|desc|story|plot)[^"]*"[^>]*>([\s\S]{20,2000}?)<\/div>/i);
        const description = descM ? descM[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";

        const episodes = [];
        const seen = {};

        // Look for episode links (series)
        const epRe = /href="((?:https?:\/\/papadustream\.fashion)?\/(?:episode|ep|saison)[^"]+\.(?:html|php))"[^>]*(?:title="([^"]+)"|>([^<]{1,80})<)/gi;
        let m;
        while ((m = epRe.exec(html)) !== null) {
            const epUrl = m[1].startsWith("http") ? m[1] : `${this.baseUrl}${m[1]}`;
            if ((epUrl in seen)) continue; (seen[epUrl] = 1);
            const epName = (m[2] || m[3] || "").trim();
            episodes.push({ name: epName || `Épisode`, url: epUrl, dateUpload: "" });
        }

        // For films (no sub-episodes): use the detail URL itself
        if (episodes.length === 0) {
            episodes.push({ name: name || "Regarder", url, dateUpload: "" });
        }

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
            { key: "log_topic", editTextPreference: { title: "Topic ntfy.sh", summary: "wtfr-papadustream", value: "wtfr-papadustream", dialogTitle: "Topic ntfy.sh", dialogMessage: "Identifiant unique pour vos logs ntfy.sh" } }
        ];
    }
}
