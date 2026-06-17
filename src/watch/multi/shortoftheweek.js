const watchtowerSources = [{
    "name": "Short of the Week",
    "lang": "en",
    "baseUrl": "https://www.shortoftheweek.com",
    "apiUrl": "",
    "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=shortoftheweek.com",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "1.0.1",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "watch/src/multi/shortoftheweek.js",
    "notes": "The world's best curated short films. Drama, comedy, animation, horror, sci-fi, doc."
}];

// ═══════════════════════════════════════════════════════════
//  Short of the Week — shortoftheweek.com
//  The internet's premier curated short film platform.
//  Staff-selected short films from Vimeo and YouTube.
//  Genres: Drama, Comedy, Animation, Horror, Sci-Fi,
//          Documentary, Romance, Thriller, Fantasy.
// ═══════════════════════════════════════════════════════════

class DefaultExtension extends MProvider {
    constructor() {
        super();
    }

    get BASE() { return "https://www.shortoftheweek.com"; }

    headers() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml",
            "Referer": "https://www.shortoftheweek.com/"
        };
    }

    static get CHANNELS() {
        return [
            { name: "🎬 All Shorts",    path: "/short-films/" },
            { name: "🎭 Drama",         path: "/channels/drama/" },
            { name: "😂 Comedy",        path: "/channels/comedy/" },
            { name: "🎨 Animation",     path: "/channels/animation/" },
            { name: "😱 Horror",        path: "/channels/horror/" },
            { name: "🚀 Sci-Fi",        path: "/channels/sci-fi/" },
            { name: "📚 Documentary",   path: "/channels/documentary/" },
            { name: "💘 Romance",       path: "/channels/romance/" },
            { name: "🔮 Fantasy",       path: "/channels/fantasy/" },
            { name: "🎪 Experimental",  path: "/channels/experimental/" },
            { name: "🌍 International", path: "/channels/world-cinema/" },
            { name: "🧪 Thriller",      path: "/channels/thriller/" },
            { name: "🎁 Family",        path: "/channels/family/" },
        ];
    }

    async fetch(path) {
        const url = path.startsWith("http") ? path : `${this.BASE}${path}`;
        const res = await new Client().get(url, this.headers());
        return new Document(res.body);
    }

    // ── List Parser ──────────────────────────────────────────

    parseShortList(doc) {
        const list = [];

        const articles = doc.select("article.film, article[class*='film'], div.film-item, article.post");
        for (const article of articles) {
            const a = article.selectFirst("a[href*='/short-films/'], a[href*='/channels/'], h2 a, h3 a, .film-title a");
            if (!a) continue;
            const href = a.getHref || a.attr("href");
            if (!href || href.includes("/channels/")) {
                // Skip category links unless there's content
                if (!href || href.endsWith("/channels/")) continue;
            }
            const img = article.selectFirst("img");
            const imageUrl = img ? (img.attr("src") || img.attr("data-src") || img.attr("data-lazy-src") || "") : "";
            const titleEl = article.selectFirst("h2, h3, .film-title, [class*='title']");
            const name = titleEl ? titleEl.text.trim() : (a.attr("title") || a.text || "").trim();
            const durationEl = article.selectFirst("[class*='duration'], span[class*='runtime'], .meta-duration");
            const duration = durationEl ? ` [${durationEl.text.trim()}]` : "";

            if (name && href) {
                list.push({
                    name: name + duration,
                    link: href.startsWith("http") ? href : `${this.BASE}${href}`,
                    imageUrl: imageUrl.startsWith("http") ? imageUrl : imageUrl ? `${this.BASE}${imageUrl}` : ""
                });
            }
        }

        // Fallback: any article/link with a thumbnail and title
        if (list.length === 0) {
            const links = doc.select("a[href*='/short-films/']");
            for (const a of links) {
                const href = a.getHref || a.attr("href");
                const name = (a.attr("title") || a.text || "").trim();
                const img = a.selectFirst("img");
                const imageUrl = img ? (img.attr("src") || img.attr("data-src") || "") : "";
                if (name && href && name.length > 2) {
                    list.push({
                        name,
                        link: href.startsWith("http") ? href : `${this.BASE}${href}`,
                        imageUrl: imageUrl.startsWith("http") ? imageUrl : ""
                    });
                }
            }
        }

        const nextEl = doc.selectFirst("a.next, a[rel='next'], .pagination a:last-child");
        const hasNextPage = !!(nextEl && !nextEl.className?.includes("disabled"));
        return { list: [...new Map(list.map(i => [i.link, i])).values()], hasNextPage };
    }

    // ── Browse ───────────────────────────────────────────────

    async getPopular(page) {
        const path = page === 1
            ? "/short-films/"
            : `/short-films/page/${page}/`;
        const doc = await this.fetch(path);
        const parsed = this.parseShortList(doc);

        // If page 1 returns nothing, return the channels list
        if (page === 1 && parsed.list.length === 0) {
            return {
                list: DefaultExtension.CHANNELS.map(c => ({
                    name: c.name,
                    link: `${this.BASE}${c.path}`,
                    imageUrl: ""
                })),
                hasNextPage: false
            };
        }

        return parsed;
    }

    async getLatestUpdates(page) {
        const path = page === 1
            ? "/short-films/?orderby=date"
            : `/short-films/page/${page}/?orderby=date`;
        const doc = await this.fetch(path);
        return this.parseShortList(doc);
    }

    async search(query, page, filterList) {
        const channel = this._filterVal(filterList, "Genre") || "";

        if (channel) {
            const path = page === 1
                ? `${channel}`
                : `${channel}page/${page}/`;
            const doc = await this.fetch(path);
            const parsed = this.parseShortList(doc);
            if (parsed.list.length > 0) return parsed;
        }

        // Search
        const q = encodeURIComponent(query);
        const path = `/search/${q}/page/${page}/`;
        const doc = await this.fetch(path);
        return this.parseShortList(doc);
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
        // If it's a category URL, return film list
        if (url.includes("/channels/") || url.endsWith("/short-films/")) {
            const doc = await this.fetch(url);
            const parsed = this.parseShortList(doc);
            const catName = url.split("/channels/")[1]?.replace(/\//g, "") || "Films";
            const chapters = parsed.list.map(f => ({
                name: f.name,
                url: f.link,
                dateUpload: "0"
            }));
            return {
                name: catName.charAt(0).toUpperCase() + catName.slice(1),
                imageUrl: "",
                description: `Curated short films in ${catName}. Click any film to watch.`,
                genre: ["Short Film", catName],
                status: 0,
                chapters
            };
        }

        const doc = await this.fetch(url);

        // Title
        const titleEl = doc.selectFirst("h1.film-title, h1.entry-title, h1");
        const name = titleEl ? titleEl.text.trim() : "";

        // Thumbnail / poster
        const ogImg = doc.selectFirst("meta[property='og:image']");
        const imgEl = doc.selectFirst("img.poster, img[class*='thumbnail'], img[class*='cover']");
        const imageUrl = (ogImg ? ogImg.attr("content") : "") || (imgEl ? imgEl.attr("src") : "");

        // Description
        const descEl = doc.selectFirst("div.film-synopsis, div.entry-content p, meta[name='description']");
        const description = descEl ? (descEl.attr("content") || descEl.text || "").trim() : "";

        // Genre
        const genreTags = doc.select("a[href*='/channels/'], a[rel='category tag']");
        const genre = ["Short Film", ...genreTags.map(a => a.text.trim()).filter(Boolean)];

        // Duration and year
        const durEl = doc.selectFirst("[class*='runtime'], [class*='duration'], .film-meta span");
        if (durEl) genre.push(durEl.text.trim());

        // Extract video embed URL (Vimeo or YouTube)
        const html = doc.html || doc.outerHtml || "";
        let embedUrl = "";

        // Vimeo
        const vimeoMatch = html.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
        if (vimeoMatch) {
            embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
        }

        // YouTube
        if (!embedUrl) {
            const ytMatch = html.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (ytMatch) {
                embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
            }
        }

        // iframe src fallback
        if (!embedUrl) {
            const iframeEl = doc.selectFirst("iframe[src*='player.vimeo'], iframe[src*='youtube'], iframe[src*='embed']");
            if (iframeEl) embedUrl = iframeEl.attr("src") || "";
        }

        const chapters = [{
            name: "▶ Watch Short Film",
            url: embedUrl || url,
            dateUpload: "0"
        }];

        return { name, imageUrl, description, genre, status: 1, chapters };
    }

    // ── Video ────────────────────────────────────────────────

    async getVideoList(url) {
        // For Vimeo player URLs — extract actual stream
        if (url.includes("player.vimeo.com/video/")) {
            const vimeoId = url.match(/video\/(\d+)/)?.[1];
            if (vimeoId) {
                try {
                    const apiRes = await new Client().get(
                        `https://vimeo.com/api/v2/video/${vimeoId}.json`,
                        this.headers()
                    );
                    const data = JSON.parse(apiRes.body || "[]");
                    if (data[0]) {
                        const d = data[0];
                        return [
                            d.url_1080p && { url: d.url_1080p, quality: "1080p", originalUrl: d.url_1080p },
                            d.url_720p && { url: d.url_720p, quality: "720p", originalUrl: d.url_720p },
                            d.url_480p && { url: d.url_480p, quality: "480p", originalUrl: d.url_480p },
                        ].filter(Boolean);
                    }
                } catch (e) { /* fallback */ }
                // Return Vimeo player embed URL
                return [{ url, quality: "Vimeo Embed", originalUrl: url }];
            }
        }

        // YouTube embeds
        if (url.includes("youtube.com/embed/") || url.includes("youtu.be/")) {
            return [{ url, quality: "YouTube", originalUrl: url }];
        }

        // Fallback: direct URL
        return [{ url, quality: "Web", originalUrl: url }];
    }

    // ── Filters ──────────────────────────────────────────────

    getFilterList() {
        function opt(n, v) { return { type_name: "SelectOption", name: n, value: v }; }
        return [{
            type_name: "SelectFilter", name: "Genre", state: 0,
            values: DefaultExtension.CHANNELS.map(c => opt(c.name, c.path))
        }];
    }

    getSourcePreferences() { return []; }
}
