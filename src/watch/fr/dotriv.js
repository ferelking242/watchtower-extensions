const watchtowerSources = [{
    "name": "Dospiv",
    "langs": ["fr"],
    "ids": { "fr": 334859201 },
    "baseUrl": "https://dospiv.com",
    "apiUrl": "https://dospiv.com",
    "iconUrl": "https://raw.githubusercontent.com/kodjodevf/watchtower/main/extensions/watch/icon/fr.dotriv.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "0.1.8",
    "pkgPath": "watch/fr/dotriv.js",
    "editableBaseUrl": true,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "1080p", "720p", "480p", "360p"],
    "contentSubtype": ["film", "serie"]
}];

const BASE_URL = "https://dospiv.com";

class DefaultExtension extends MProvider {
    constructor() { super(); }

    get baseUrl() {
        const p = this.source.prefs?.find(x => x.key === "base_url");
        return (p && p.value) ? p.value.replace(/\/$/, "") : BASE_URL.replace(/\/$/, "");
    }

    // /fed960f is the CMS prefix for dospiv.com
    get cmsBase() { return `${this.baseUrl}/fed960f`; }

    get logEnabled() { const p = this.source.prefs?.find(x => x.key === "log_enabled"); return p && p.value === "true"; }
    get logTopic() { const p = this.source.prefs?.find(x => x.key === "log_topic"); return (p && p.value) ? p.value : "wtfr-dospiv"; }
    get pref_quality() { const p = this.source.prefs?.find(x => x.key === "preferred_quality"); return (p && p.value) ? p.value : "AUTO"; }

    _hdrs(ref) {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": ref || `${this.baseUrl}/`,
            "Accept-Language": "fr-FR,fr;q=0.9",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        };
    }

    async _log(msg) {
        if (!this.logEnabled) return;
        try { await new Client().post(`https://ntfy.sh/${this.logTopic}`, `[Dospiv] ${msg}`, { "Title": "Dospiv", "Content-Type": "text/plain" }); } catch(e) {}
    }

    // Parse trend-card items from an HTML snippet
    _parse(html) {
        const list = []; const seen = {};
        const re = /href="(\/fed960f\/b\/dospiv\/\d+)"[\s\S]{0,600}?<img[^>]*class="(?:trend|film)-card-img"[^>]*src="([^"]+)"[^>]*alt="([^"]+)"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const url = `${this.baseUrl}${m[1]}`;
            if (url in seen) continue;
            seen[url] = 1;
            list.push({ link: url, imageUrl: m[2], name: m[3].trim() });
        }
        return list;
    }

    // Extract a named section from the full home HTML
    _extractSection(homeHtml, startMarker, endMarker) {
        const start = homeHtml.indexOf(startMarker);
        if (start < 0) return "";
        const end = endMarker
            ? homeHtml.indexOf(endMarker, start + startMarker.length)
            : -1;
        return end > start
            ? homeHtml.substring(start, end)
            : homeHtml.substring(start, start + 12000);
    }

    // Fetch + cache the home page (5-min TTL)
    async _getHome() {
        const now = Date.now();
        if (this._homeCache && (now - (this._homeCacheAt || 0)) < 300000) {
            return this._homeCache;
        }
        const res = await new Client().get(`${this.cmsBase}/home/dospiv`, this._hdrs());
        this._homeCache = res.body || "";
        this._homeCacheAt = now;
        return this._homeCache;
    }

    // ── API methods ──────────────────────────────────────────────────────────

    // Popular = À l'affiche (category 29)
    async getPopular(page) {
        const res = await new Client().get(`${this.cmsBase}/c/dospiv/29/${page - 1}`, this._hdrs());
        await this._log(`popular p${page}: ${res.body.length}b`);
        const list = this._parse(res.body);
        return { list, hasNextPage: list.length >= 10 };
    }

    // Latest = Derniers ajouts (from home page, page 1 only)
    async getLatestUpdates(page) {
        if (page === 1) {
            const home = await this._getHome();
            const section = this._extractSection(home, "newfilms-header", "trend-vignette-title");
            const list = this._parse(section).slice(0, 24);
            await this._log(`latest: ${list.length} items`);
            return { list, hasNextPage: false };
        }
        // No pagination for latest on this site
        return { list: [], hasNextPage: false };
    }

    async search(query, page, filterList) {
        await this._log(`search: "${query}" p${page}`);
        const res = await new Client().get(`${this.cmsBase}/c/dospiv/29/${page - 1}`, this._hdrs());
        const list = this._parse(res.body);
        return { list, hasNextPage: list.length >= 10 };
    }

    // ── Custom home sections ─────────────────────────────────────────────────

    getCustomLists() {
        return [
            { id: "derniers-ajouts",  name: "Derniers ajouts"    },
            { id: "top15",            name: "Top 15 Tendances"   },
            { id: "animations",       name: "Animations"         },
            { id: "docs-spectacles",  name: "Docs & Spectacles"  },
        ];
    }

    async getCustomList(listId, page) {
        await this._log(`customList ${listId} p${page}`);

        if (listId === "derniers-ajouts") {
            // Derniers ajouts section on the home page (the newfilms row)
            const home = await this._getHome();
            const section = this._extractSection(home, "newfilms-header", "trend-vignette-title");
            const list = this._parse(section).slice(0, 24);
            return { list, hasNextPage: false };
        }

        if (listId === "top15") {
            // Top 15 Tendances — the ranked section on the home page
            const home = await this._getHome();
            const section = this._extractSection(home, "trend-vignette-title", "anim-section-title");
            const list = this._parse(section).slice(0, 15);
            return { list, hasNextPage: false };
        }

        if (listId === "animations") {
            // Animations category page — supports pagination
            const res = await new Client().get(`${this.cmsBase}/c/dospiv/2/${page - 1}`, this._hdrs());
            const list = this._parse(res.body);
            return { list, hasNextPage: list.length >= 10 };
        }

        if (listId === "docs-spectacles") {
            // Docs & Spectacles section on the home page
            const home = await this._getHome();
            const section = this._extractSection(home, "Docs &amp;", "film-grid");
            const list = this._parse(section).slice(0, 20);
            return { list, hasNextPage: false };
        }

        return { list: [], hasNextPage: false };
    }

    // ── Detail & video ───────────────────────────────────────────────────────

    async getDetail(url) {
        await this._log(`detail: ${url}`);
        const res = await this._safeGet(url);
        const html = res.body || "";

        const nameM = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || html.match(/<title>([^|<\-]+)/i);
        const name = nameM ? nameM[1].trim() : "";

        const imgM = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) ||
                     html.match(/<img[^>]+class="[^"]*(?:poster|cover|detail-img)[^"]*"[^>]+src="([^"]+)"/i);
        const imageUrl = imgM ? imgM[1] : "";

        const descM = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i) ||
                      html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
        const description = descM ? descM[1].replace(/&[#\w]+;/g, " ").trim()
                                  : "Détails non disponibles — site SPA, ouvrir dans le navigateur.";

        const episodes = [{ name: name || "Regarder", url, dateUpload: "" }];
        await this._log(`detail ok: "${name}"`);
        return { name, description, imageUrl, genres: [], status: 0, chapters: episodes };
    }

    async _safeGet(url) {
        const tries = [
            this._hdrs(`${this.baseUrl}/`),
            { ...this._hdrs(`${this.baseUrl}/`), "Accept": "application/json", "X-Requested-With": "XMLHttpRequest" },
            { ...this._hdrs(`${this.baseUrl}/`), "Accept": "text/html,application/xhtml+xml" }
        ];
        for (const h of tries) {
            try {
                const r = await new Client().get(url, h);
                if (r && r.body && r.body.length > 0) return r;
            } catch(e) {}
        }
        return { body: "", statusCode: 0 };
    }

    async getVideoList(url) {
        await this._log(`video: ${url}`);
        const res = await new Client().get(url, this._hdrs(url));
        const html = res.body || "";
        const videos = [];
        const q = this.pref_quality;

        const directRe = /(?:file|source|src|url)\s*[=:]\s*["']([^"']+\.(?:m3u8|mp4)[^"']{0,150})["']/gi;
        let m;
        while ((m = directRe.exec(html)) !== null) {
            const vUrl = m[1].startsWith("//") ? `https:${m[1]}` : m[1];
            if (!videos.some(v => v.url === vUrl))
                videos.push({ url: vUrl, quality: q !== "AUTO" ? q : "Direct", originalUrl: vUrl });
        }

        const iframeUrls = [];
        const iframeRe = /<iframe[^>]+src="((?:https?:)?\/\/[^"]{10,})"/gi;
        while ((m = iframeRe.exec(html)) !== null) {
            const src = m[1].startsWith("//") ? `https:${m[1]}` : m[1];
            if (!src.includes("google") && !src.includes("recaptcha") && !src.includes("facebook"))
                iframeUrls.push(src);
        }

        for (const embedUrl of iframeUrls.slice(0, 4)) {
            let resolved = false;
            try {
                const eRes = await new Client().get(embedUrl, { ...this._hdrs(url), "Referer": url });
                const ebody = eRes.body || "";
                const hlsM = ebody.match(/["'`](https?:\/\/[^"'`]+\.m3u8[^"'`]{0,150})["'`]/);
                if (hlsM) { videos.push({ url: hlsM[1], quality: q !== "AUTO" ? q : "Stream", originalUrl: hlsM[1] }); resolved = true; }
                const mp4M = ebody.match(/["'`](https?:\/\/[^"'`]+\.mp4[^"'`]{0,150})["'`]/);
                if (mp4M && !resolved) { videos.push({ url: mp4M[1], quality: q !== "AUTO" ? q : "Direct", originalUrl: mp4M[1] }); resolved = true; }
            } catch(e) {}
            if (!resolved) videos.push({ url: embedUrl, quality: q !== "AUTO" ? q : "Stream", originalUrl: embedUrl });
        }

        await this._log(`video: ${videos.length} found`);
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
                    entries: [BASE_URL],
                    entryValues: [BASE_URL]
                }
            },
            {
                key: "preferred_quality",
                listPreference: {
                    title: "Qualité préférée",
                    summary: "AUTO",
                    valueIndex: 0,
                    entries: ["AUTO", "1080p", "720p", "480p", "360p"],
                    entryValues: ["AUTO", "1080p", "720p", "480p", "360p"]
                }
            },
            {
                key: "log_enabled",
                listPreference: {
                    title: "Logs ntfy.sh",
                    summary: "Voir logs sur ntfy.sh/[topic]",
                    valueIndex: 0,
                    entries: ["Désactivé", "Activé"],
                    entryValues: ["false", "true"]
                }
            },
            {
                key: "log_topic",
                editTextPreference: {
                    title: "Topic ntfy.sh",
                    summary: "wtfr-dospiv",
                    value: "wtfr-dospiv",
                    dialogTitle: "Topic ntfy.sh",
                    dialogMessage: "Identifiant unique pour vos logs ntfy.sh"
                }
            }
        ];
    }
}
