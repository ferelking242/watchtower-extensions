const watchtowerSources = [{
    "name": "Dospiv",
    "langs": ["fr"],
    "ids": { "fr": 334859201 },
    "baseUrl": "https://dospiv.com",
    "apiUrl": "https://dospiv.com",
    "iconUrl": "https://dospiv.com/favicon.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "0.1.12",
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

    // ── Parser ─────────────────────────────────────────────────────────────
    // Requires <a class="trend-card"|"film-card"> to avoid matching nav/logo images.
    // Falls back to a looser pattern if the primary returns nothing.
    _parse(html) {
        const seen = {};
        const list = [];

        const srcName = (this.source && this.source.name) ? this.source.name.toLowerCase() : "dospiv";

        const add = (url, imgUrl, name) => {
            if (!url || !name) return;
            if (url in seen) return;
            // Skip entries whose name is the source/site name itself (logo images, etc.)
            if (name.toLowerCase() === srcName || name.toLowerCase() === "dospiv" || name.toLowerCase() === "dotriv") return;
            seen[url] = 1;
            list.push({ link: url, imageUrl: imgUrl, name });
        };

        // PRIMARY: <a class="…trend-card…|…film-card…"> contains href + img inside
        // This avoids nav links and banner images that share class names
        const cardRe = /<a[^>]*class="[^"]*(?:trend|film)-card(?!-arrow)[^"]*"[^>]*href="(\/fed960f\/b\/dospiv\/\d+)"[^>]*>[\s\S]{0,500}?<img[^>]*src="([^"]+)"[^>]*alt="([^"]+)"/gi;
        let m;
        while ((m = cardRe.exec(html)) !== null) {
            add(`${this.baseUrl}${m[1]}`, m[2], m[3].trim());
        }

        // FALLBACK: href="/fed960f/b/dospiv/ID" then img with alt within 300 chars
        // Only runs if primary got < 3 results (category pages with different structure)
        if (list.length < 3) {
            const fallRe = /href="(\/fed960f\/b\/dospiv\/\d+)"[\s\S]{0,300}?<img[^>]+src="([^"]+)"[^>]+alt="([^"]+)"/gi;
            while ((m = fallRe.exec(html)) !== null) {
                add(`${this.baseUrl}${m[1]}`, m[2], m[3].trim());
            }
        }

        return list;
    }

    // ── Home page cache (5-min TTL) ────────────────────────────────────────
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

    // Extract a slice of HTML starting at the first occurrence of textMarker
    // Uses the visible text (e.g. "Derniers ajouts") so it can't match CSS definitions
    _slice(html, textMarker, charsMax) {
        const idx = html.indexOf(textMarker);
        if (idx < 0) return "";
        return html.substring(idx, idx + (charsMax || 10000));
    }

    // ── API ────────────────────────────────────────────────────────────────

    // Popular = À l'affiche (category 29)
    async getPopular(page) {
        const res = await new Client().get(`${this.cmsBase}/c/dospiv/29/${page - 1}`, this._hdrs());
        await this._log(`popular p${page}: ${res.body.length}b`);
        const list = this._parse(res.body);
        await this._log(`popular: ${list.length} items`);
        return { list, hasNextPage: list.length >= 10 };
    }

    // Latest: Derniers ajouts from home (page 1) or category 29 fallback
    async getLatestUpdates(page) {
        if (page === 1) {
            try {
                const home = await this._getHome();
                // "Derniers ajouts" appears only inside <h2>, never in the <style> block
                const section = this._slice(home, "Derniers ajouts", 9000);
                const list = this._parse(section).slice(0, 24);
                if (list.length > 0) {
                    await this._log(`latest home: ${list.length}`);
                    return { list, hasNextPage: false };
                }
            } catch(e) {}
        }
        // Fallback: paginate category 29
        const res = await new Client().get(`${this.cmsBase}/c/dospiv/29/${page - 1}`, this._hdrs());
        const list = this._parse(res.body);
        await this._log(`latest/pop p${page}: ${list.length}`);
        return { list, hasNextPage: list.length >= 10 };
    }

    async search(query, page, filterList) {
        await this._log(`search: "${query}" p${page}`);
        const q = (query || "").trim();

        // Empty query → return popular page as-is
        if (!q) {
            const res = await new Client().get(`${this.cmsBase}/c/dospiv/29/${page - 1}`, this._hdrs());
            const list = this._parse(res.body);
            return { list, hasNextPage: list.length >= 10 };
        }

        // ── Real site search via POST /home/dospiv (searchword param) ──
        // The site returns all matching results in a single response (no pagination).
        if (page > 1) return { list: [], hasNextPage: false };

        try {
            const hdrs = Object.assign({}, this._hdrs(`${this.cmsBase}/home/dospiv`), {
                "Content-Type": "application/x-www-form-urlencoded"
            });
            const postBody = "searchword=" + encodeURIComponent(q);
            const res = await new Client().post(`${this.cmsBase}/home/dospiv`, postBody, hdrs);
            const list = this._parse(res.body);
            await this._log(`search result: ${list.length} for "${q}" via POST`);
            return { list, hasNextPage: false };
        } catch (e) {
            await this._log(`search error: ${e}`);
            return { list: [], hasNextPage: false };
        }
    }

    // ── Custom home sections ───────────────────────────────────────────────

    getCustomLists() {
        // Declarative layout contract (supported by Watchtower ≥ next):
        // layout  → "spotlight" | "ranked" | "compact" | "carousel" | "grid"
        // color   → CSS hex string (accent bar + header icon tint)
        // icon    → key from _kIconMap in watch_home_screen.dart
        // seeAll  → false | "latest" | "popular" | true (custom paginated page)
        return [
            {
                id:     "derniers-ajouts",
                name:   "Derniers ajouts",
                layout: "spotlight",
                color:  "#00BCD4",
                icon:   "fiber_new",
                seeAll: "latest",
            },
            {
                id:     "top15",
                name:   "Top 15 Tendances",
                layout: "ranked",
                color:  "#FFB300",
                icon:   "trending_up",
                seeAll: false,
            },
            {
                id:     "animations",
                name:   "Animations",
                layout: "compact",
                color:  "#9C27B0",
                icon:   "animation",
                seeAll: true,
            },
            {
                id:     "docs-spectacles",
                name:   "Docs & Spectacles",
                layout: "compact",
                color:  "#4CAF50",
                icon:   "theaters",
                seeAll: true,
            },
        ];
    }

    async getCustomList(listId, page) {
        await this._log(`customList ${listId} p${page}`);

        if (listId === "derniers-ajouts") {
            const home = await this._getHome();
            // "Derniers ajouts" is in a <h2> tag in the HTML body, not in any CSS rule
            const section = this._slice(home, "Derniers ajouts", 9000);
            const list = this._parse(section).slice(0, 24);
            await this._log(`derniers: ${list.length}`);
            return { list, hasNextPage: false };
        }

        if (listId === "top15") {
            const home = await this._getHome();
            // Look for the HTML attribute class="trend-vignette-title" (not the CSS .trend-vignette-title{})
            // Using the text content "Top 15" which only appears inside the span tag
            const idx = home.indexOf('class="trend-vignette-title"');
            if (idx >= 0) {
                const section = home.substring(idx, idx + 14000);
                const list = this._parse(section).slice(0, 15);
                await this._log(`top15 (attr): ${list.length}`);
                return { list, hasNextPage: false };
            }
            // Fallback: use the text "Top 15"
            const section = this._slice(home, "Top 15", 14000);
            const list = this._parse(section).slice(0, 15);
            await this._log(`top15 (text): ${list.length}`);
            return { list, hasNextPage: false };
        }

        if (listId === "animations") {
            // Category page, supports pagination
            const res = await new Client().get(`${this.cmsBase}/c/dospiv/2/${page - 1}`, this._hdrs());
            const list = this._parse(res.body);
            await this._log(`animations p${page}: ${list.length}`);
            return { list, hasNextPage: list.length >= 10 };
        }

        if (listId === "docs-spectacles") {
            const home = await this._getHome();
            // "Docs & Spectacles" is in a <h2> tag in the body
            // The HTML source has it as "Docs & Spectacles" (& not encoded in text nodes on this site)
            let section = this._slice(home, "Docs & Spectacles", 9000);
            // Try HTML-encoded variant too
            if (!section) section = this._slice(home, "Docs &amp; Spectacles", 9000);
            if (!section) section = this._slice(home, "Docs", 9000); // last resort
            const list = this._parse(section).slice(0, 20);
            await this._log(`docs: ${list.length}`);
            return { list, hasNextPage: false };
        }

        return { list: [], hasNextPage: false };
    }

    // ── Detail & video ─────────────────────────────────────────────────────

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
                                  : "Détails non disponibles.";

        const episodes = [{ name: name || "Regarder", url, dateUpload: "" }];
        await this._log(`detail: "${name}"`);
        return { name, description, imageUrl, genres: [], status: 0, chapters: episodes };
    }

    async _safeGet(url) {
        const tries = [
            this._hdrs(`${this.baseUrl}/`),
            { ...this._hdrs(`${this.baseUrl}/`), "Accept": "application/json", "X-Requested-With": "XMLHttpRequest" },
        ];
        for (const h of tries) {
            try {
                const r = await new Client().get(url, h);
                if (r && r.body && r.body.length > 0) return r;
            } catch(e) {}
        }
        return { body: "", statusCode: 0 };
    }

    _videoHeaders(referer) {
        // Extract scheme://host[:port] robustly from any URL
        const originM = referer.match(/^(https?:\/\/[^/?#]+)/);
        const origin = originM ? originM[1] : referer;
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": referer,
            "Origin": origin,
            "Accept-Language": "fr-FR,fr;q=0.9",
        };
    }

    async getVideoList(url) {
        await this._log(`video: ${url}`);
        const res = await new Client().get(url, this._hdrs(url));
        const html = res.body || "";
        const videos = [];
        const q = this.pref_quality;

        // Direct streams embedded in the page HTML
        const directRe = /(?:file|source|src|url)\s*[=:]\s*["']([^"']+\.(?:m3u8|mp4)[^"']{0,150})["']/gi;
        let m;
        while ((m = directRe.exec(html)) !== null) {
            const vUrl = m[1].startsWith("//") ? `https:${m[1]}` : m[1];
            if (!videos.some(v => v.url === vUrl))
                videos.push({ url: vUrl, quality: q !== "AUTO" ? q : "Direct", originalUrl: vUrl, headers: this._videoHeaders(url) });
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
                // Headers the player must send when fetching the stream and its segments
                const streamHdrs = this._videoHeaders(embedUrl);
                const hlsM = ebody.match(/["'`](https?:\/\/[^"'`]+\.m3u8[^"'`]{0,150})["'`]/);
                if (hlsM) { videos.push({ url: hlsM[1], quality: q !== "AUTO" ? q : "Stream", originalUrl: hlsM[1], headers: streamHdrs }); resolved = true; }
                const mp4M = ebody.match(/["'`](https?:\/\/[^"'`]+\.mp4[^"'`]{0,150})["'`]/);
                if (mp4M && !resolved) { videos.push({ url: mp4M[1], quality: q !== "AUTO" ? q : "Direct", originalUrl: mp4M[1], headers: streamHdrs }); resolved = true; }
            } catch(e) {}
            // Do NOT push the raw iframe URL as a fallback — it is a web page, not a playable stream
        }

        await this._log(`video: ${videos.length}`);
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
