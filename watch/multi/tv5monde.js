const watchtowerSources = [{
    "name": "TV5Monde+",
    "lang": "fr",
    "baseUrl": "https://www.tv5mondeplus.com",
    "apiUrl": "https://www.tv5mondeplus.com",
    "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=tv5mondeplus.com",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "1.0.0",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "watch/src/multi/tv5monde.js",
    "notes": "Chaîne française gratuite. Films, courts métrages, séries, documentaires, jeunesse, sport."
}];

// ═══════════════════════════════════════════════════════════
//  TV5Monde+ — tv5mondeplus.com
//  Plateforme de la francophonie. 100% gratuit.
//  Films, courts métrages (short films), séries, docs,
//  jeunesse, divertissement, sport, info.
//  Accessible depuis le monde entier.
// ═══════════════════════════════════════════════════════════

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
    }

    get BASE() { return "https://www.tv5mondeplus.com"; }

    headers() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept": "application/json, text/html, */*",
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
            "Referer": "https://www.tv5mondeplus.com/"
        };
    }

    // Category slug → label
    static get CATEGORIES() {
        return [
            { name: "🎬 Courts métrages",   path: "/en/films/court-metrage",        cat: "court-metrage" },
            { name: "🎥 Films",             path: "/en/films",                       cat: "films" },
            { name: "📺 Séries",            path: "/en/series",                      cat: "series" },
            { name: "📹 Documentaires",     path: "/en/documentaires",               cat: "documentaires" },
            { name: "🧒 Jeunesse",          path: "/en/jeunesse",                    cat: "jeunesse" },
            { name: "🎉 Divertissement",    path: "/en/divertissement",              cat: "divertissement" },
            { name: "📡 En direct",         path: "/en/direct",                      cat: "direct" },
            { name: "🌍 Info & Société",    path: "/en/info-et-societe",             cat: "info" },
            { name: "⚽ Sports",            path: "/en/sports",                      cat: "sports" },
        ];
    }

    async fetch(path) {
        const url = path.startsWith("http") ? path : `${this.BASE}${path}`;
        const res = await this.client.get(url, this.headers());
        return new Document(res.body);
    }

    // ── Parse Category Page ──────────────────────────────────

    parseVideos(doc) {
        const list = [];
        // TV5Monde uses various card selectors
        const selectors = [
            "article.video-item", "div.video-item", "div.card-item",
            "article.card", "div.program-item", "li.item", "div.vod-item",
            "article[class*='video']", "div[class*='video-card']"
        ];

        let items = [];
        for (const sel of selectors) {
            items = doc.select(sel);
            if (items.length > 0) break;
        }

        // Fallback: any link with an image and a title
        if (items.length === 0) {
            const links = doc.select("a[href*='/video/'], a[href*='/film/'], a[href*='/serie/'], a[href*='/documentaire/']");
            for (const a of links) {
                const href = a.getHref || a.attr("href");
                const img = a.selectFirst("img");
                const titleEl = a.selectFirst("h2, h3, h4, span[class*='title']");
                const name = titleEl ? titleEl.text.trim() : (img?.attr("alt") || "").trim();
                const imageUrl = img ? (img.attr("src") || img.attr("data-src") || "") : "";
                if (name && href && name.length > 2) {
                    list.push({
                        name,
                        link: href.startsWith("http") ? href : `${this.BASE}${href}`,
                        imageUrl: imageUrl.startsWith("http") ? imageUrl : imageUrl ? `${this.BASE}${imageUrl}` : ""
                    });
                }
            }
            return { list: [...new Map(list.map(i => [i.link, i])).values()], hasNextPage: false };
        }

        for (const item of items) {
            const a = item.selectFirst("a");
            if (!a) continue;
            const href = a.getHref || a.attr("href");
            const img = item.selectFirst("img");
            const titleEl = item.selectFirst("h2, h3, h4, span[class*='title'], p[class*='title']");
            const name = titleEl ? titleEl.text.trim() : (img?.attr("alt") || a.text || "").trim();
            const imageUrl = img ? (img.attr("src") || img.attr("data-src") || "") : "";
            if (name && href) {
                list.push({
                    name,
                    link: href.startsWith("http") ? href : `${this.BASE}${href}`,
                    imageUrl: imageUrl.startsWith("http") ? imageUrl : imageUrl ? `${this.BASE}${imageUrl}` : ""
                });
            }
        }

        const nextEl = doc.selectFirst("a[rel='next'], a.next, button[class*='next']");
        return {
            list: [...new Map(list.map(i => [i.link, i])).values()],
            hasNextPage: !!nextEl
        };
    }

    // ── Browse ───────────────────────────────────────────────

    async getPopular(page) {
        // Popular = courts métrages by default
        const doc = await this.fetch(`/en/films/court-metrage`);
        if (page === 1) {
            const parsed = this.parseVideos(doc);
            if (parsed.list.length > 0) return parsed;
        }
        // If no short films, return category grid
        if (page > 1) return { list: [], hasNextPage: false };
        const list = DefaultExtension.CATEGORIES.map(c => ({
            name: c.name,
            link: `${this.BASE}${c.path}`,
            imageUrl: "",
            description: "Voir toutes les vidéos"
        }));
        return { list, hasNextPage: false };
    }

    async getLatestUpdates(page) {
        if (page > 1) return { list: [], hasNextPage: false };
        // Latest = all films
        const doc = await this.fetch("/en/films");
        const parsed = this.parseVideos(doc);
        if (parsed.list.length > 0) return parsed;

        // Fallback: return categories
        return this.getPopular(page);
    }

    async search(query, page, filterList) {
        const cat = this._filterVal(filterList, "Catégorie");
        let path = cat || "/en/films/court-metrage";

        if (query.trim()) {
            // TV5Monde may have a search endpoint
            path = `/fr/recherche?q=${encodeURIComponent(query)}`;
        }

        if (page > 1) return { list: [], hasNextPage: false };
        const doc = await this.fetch(path);
        return this.parseVideos(doc);
    }

    _filterVal(filterList, name) {
        if (!filterList) return null;
        for (const f of filterList) {
            if (f.name === name && f.values) return f.values[f.state]?.value;
        }
        return null;
    }

    // ── Detail ───────────────────────────────────────────────

    async getDetail(url) {
        const doc = await this.fetch(url);

        // Title
        const titleEl = doc.selectFirst("h1[class*='title'], h1.video-title, h1");
        const name = titleEl ? titleEl.text.trim() : url.split("/").pop().replace(/-/g, " ");

        // Thumbnail
        const img = doc.selectFirst("meta[property='og:image']");
        const imageUrl = img ? img.attr("content") : "";

        // Description
        const descEl = doc.selectFirst("meta[property='og:description'], div[class*='description'], p[class*='synopsis']");
        const description = descEl ? (descEl.attr("content") || descEl.text || "").trim() : "";

        // Genre from breadcrumb or tags
        const breadcrumbs = doc.select("nav[aria-label='breadcrumb'] a, ol.breadcrumb a");
        const genre = breadcrumbs.map(a => a.text.trim()).filter(t => t && t !== "Home" && t !== "TV5Monde+");

        // Duration
        const durEl = doc.selectFirst("[class*='duration'], time[class*='duration']");
        const duration = durEl ? durEl.text.trim() : "";
        if (duration) genre.push(duration);

        // Video source — look for video tag or streaming JSON
        const videoEl = doc.selectFirst("video source, video");
        let videoSrc = videoEl ? (videoEl.attr("src") || videoEl.attr("data-src") || "") : "";

        // Look for embedded player or JSON data in page
        const html = doc.html || doc.outerHtml || "";
        const jsonMatch = html.match(/(?:videoUrl|hls_url|stream_url|src)\s*[:=]\s*"([^"]+\.m3u8[^"]*)"/i) ||
            html.match(/"url"\s*:\s*"(https?:[^"]+\.m3u8[^"]*)"/i);
        if (jsonMatch) videoSrc = jsonMatch[1];

        const chapters = [{
            name: "▶ Regarder",
            url: videoSrc || url,
            dateUpload: "0"
        }];

        return { name, imageUrl, description, genre, status: 1, chapters };
    }

    // ── Video ────────────────────────────────────────────────

    async getVideoList(url) {
        if (url.includes(".m3u8") || url.includes(".mp4")) {
            return [{ url, quality: "HD", originalUrl: url }];
        }

        // Fetch detail page to find video URL
        const doc = await this.fetch(url);
        const html = doc.html || doc.outerHtml || "";

        // Search for HLS/MP4 URLs
        const patterns = [
            /(?:hls_url|videoUrl|stream_url|src)\s*[:=]\s*["']([^"']+\.m3u8[^"']*)/i,
            /"url"\s*:\s*"(https?:[^"]+\.m3u8[^"]*)"/i,
            /source\s+src="([^"]+\.m3u8[^"]*)"/i,
            /<video[^>]+src="([^"]+)"/i,
        ];

        for (const p of patterns) {
            const m = html.match(p);
            if (m) return [{ url: m[1], quality: "HLS", originalUrl: m[1] }];
        }

        return [{ url, quality: "Web", originalUrl: url }];
    }

    // ── Filters ──────────────────────────────────────────────

    getFilterList() {
        function opt(n, v) { return { type_name: "SelectOption", name: n, value: v }; }
        return [{
            type_name: "SelectFilter", name: "Catégorie", state: 0,
            values: DefaultExtension.CATEGORIES.map(c => opt(c.name, c.path)).concat([
                opt("🔍 Tous les contenus", "/en")
            ])
        }];
    }

    getSourcePreferences() { return []; }
}
