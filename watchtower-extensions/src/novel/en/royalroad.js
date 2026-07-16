const watchtowerSources = [{
    "name": "Royal Road",
    "lang": "en",
    "baseUrl": "https://www.royalroad.com",
    "apiUrl": "",
    "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=royalroad.com",
    "typeSource": "single",
    "isManga": false,
    "itemType": 2,
    "version": "1.0.2",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "novel/src/en/royalroad.js",
    "notes": "LitRPG, Fantasy, Sci-Fi, Progression, WebFiction"
}];

// ═══════════════════════════════════════════════════════════
//  Royal Road — royalroad.com
//  The #1 platform for webfiction: LitRPG, Fantasy, Isekai,
//  Progression Fantasy, Sci-Fi, Romance, Horror, Satire.
//  All stories are FREE. Community-driven ratings.
// ═══════════════════════════════════════════════════════════

class DefaultExtension extends MProvider {
    constructor() {
        super();
    }

    get BASE() { return "https://www.royalroad.com"; }

    headers() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9"
        };
    }

    async fetch(path) {
        const url = path.startsWith("http") ? path : `${this.BASE}${path}`;
        const res = await new Client().get(url, this.headers());
        return new Document(res.body);
    }

    // ── List Parser ─────────────────────────────────────

    parseList(doc) {
        const list = [];
        const items = doc.select("div.fiction-list-item");
        for (const item of items) {
            const a = item.selectFirst("h2.fiction-title a") || item.selectFirst("a.fiction-title");
            if (!a) continue;
            const name = a.text.trim();
            const link = a.getHref || a.attr("href");
            const img = item.selectFirst("img");
            const imageUrl = img ? (img.attr("src") || img.attr("data-src") || "") : "";
            if (name && link) {
                list.push({ name, link: link.startsWith("http") ? link : `${this.BASE}${link}`, imageUrl });
            }
        }
        // Fallback for search results
        if (list.length === 0) {
            const rows = doc.select("div.row.fiction-list-item, tr.fiction-item");
            for (const row of rows) {
                const a = row.selectFirst("a[href*='/fiction/']");
                if (!a) continue;
                const name = a.text.trim();
                const link = a.getHref || a.attr("href");
                const img = row.selectFirst("img");
                const imageUrl = img ? (img.attr("src") || "") : "";
                if (name && link) list.push({ name, link: link.startsWith("http") ? link : `${this.BASE}${link}`, imageUrl });
            }
        }
        const nextBtn = doc.selectFirst("li.page-item:last-child a");
        const hasNextPage = nextBtn && !nextBtn.className.includes("disabled");
        return { list, hasNextPage: !!hasNextPage };
    }

    // ── Browse ──────────────────────────────────────────

    async getPopular(page) {
        const doc = await this.fetch(`/fictions/trending?page=${page}`);
        return this.parseList(doc);
    }

    async getLatestUpdates(page) {
        const doc = await this.fetch(`/fictions/latest-updates?page=${page}`);
        return this.parseList(doc);
    }

    async search(query, page, filterList) {
        const genres = this._getFilterValue(filterList, "Genres") || "";
        const tags = this._getFilterValue(filterList, "Tags") || "";
        const type = this._getFilterValue(filterList, "Type") || "trending";
        const status = this._getFilterValue(filterList, "Status") || "";

        let url = `/fictions/search?title=${encodeURIComponent(query)}&page=${page}`;
        if (status) url += `&status=${status}`;
        if (genres) url += `&genres=${encodeURIComponent(genres)}`;

        const doc = await this.fetch(url);
        return this.parseList(doc);
    }

    _getFilterValue(filterList, name) {
        if (!filterList || filterList.length === 0) return null;
        for (const f of filterList) {
            if (f.name === name && f.values) {
                return f.values[f.state]?.value || null;
            }
        }
        return null;
    }

    // ── Detail ──────────────────────────────────────────

    async getDetail(url) {
        const doc = await this.fetch(url);

        // Title
        const name = doc.selectFirst("h1[property='name']")?.text?.trim() ||
            doc.selectFirst("h1.font-white")?.text?.trim() || "";

        // Cover
        const img = doc.selectFirst("img.img-offset, img.thumbnail");
        const imageUrl = img ? (img.attr("src") || "") : "";

        // Description
        const descDiv = doc.selectFirst("div.description div[property='description']") ||
            doc.selectFirst("div.description");
        const description = descDiv ? descDiv.text.trim() : "";

        // Genre/tags
        const genreTags = doc.select("span.tags a, a.label[href*='tag']");
        const genre = genreTags.map(t => t.text.trim()).filter(Boolean);

        // Status
        const statusText = doc.selectFirst("span.label-success, span.label-warning, span.label-info")?.text?.toLowerCase() || "";
        let status = 0;
        if (statusText.includes("complet")) status = 1;
        else if (statusText.includes("hiatus")) status = 2;

        // Chapters — from chapter table
        const chapters = [];
        const rows = doc.select("table#chapters tbody tr");
        for (const row of rows) {
            const a = row.selectFirst("a[href*='/chapter/']");
            if (!a) continue;
            const chapName = a.text.trim();
            const chapUrl = a.getHref || a.attr("href");
            const dateEl = row.selectFirst("time");
            const dateUpload = dateEl ? new Date(dateEl.attr("datetime") || dateEl.text).valueOf().toString() : "";
            chapters.push({
                name: chapName,
                url: chapUrl.startsWith("http") ? chapUrl : `${this.BASE}${chapUrl}`,
                dateUpload
            });
        }

        return { name, imageUrl, description, genre, status, chapters };
    }

    // ── Chapter Content ──────────────────────────────────

    async getHtmlContent(name, url) {
        const doc = await this.fetch(url);
        const content = doc.selectFirst("div.chapter-content");
        return content ? content.outerHtml : "<p>Content unavailable</p>";
    }

    async cleanHtmlContent(html) {
        const doc = new Document(html);
        const content = doc.selectFirst("div.chapter-content");
        if (!content) return html;
        // Remove ads and navigation
        const ads = content.select("div.adsense-container, div.author-note, .fictioneer-chapter-actions");
        for (const ad of ads) ad.remove();
        return content.outerHtml;
    }

    // ── Filters ──────────────────────────────────────────

    getFilterList() {
        function opt(name, value) { return { type_name: "SelectOption", name, value }; }
        return [
            {
                type_name: "SelectFilter", name: "Sort By", state: 0,
                values: [
                    opt("Trending", "trending"), opt("Best Rated", "best-rated"),
                    opt("Popular This Week", "weekly-popular"), opt("Latest Updates", "latest-updates"),
                    opt("Rising Stars", "rising-stars"), opt("Complete", "complete"),
                ]
            },
            {
                type_name: "SelectFilter", name: "Status", state: 0,
                values: [
                    opt("All", ""), opt("Ongoing", "ongoing"),
                    opt("Complete", "complete"), opt("Hiatus", "hiatus"),
                    opt("Stub", "stub"),
                ]
            },
            {
                type_name: "SelectFilter", name: "Genres", state: 0,
                values: [
                    opt("All Genres", ""), opt("Action", "Action"), opt("Adventure", "Adventure"),
                    opt("Comedy", "Comedy"), opt("Drama", "Drama"), opt("Fantasy", "Fantasy"),
                    opt("Horror", "Horror"), opt("LitRPG", "LitRPG"), opt("Isekai", "Isekai"),
                    opt("Mystery", "Mystery"), opt("Psychological", "Psychological"),
                    opt("Romance", "Romance"), opt("Sci-fi", "Sci-fi"),
                    opt("Supernatural", "Supernatural"), opt("Satire", "Satire"),
                ]
            }
        ];
    }

    getSourcePreferences() { return []; }
}
