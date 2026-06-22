const watchtowerSources = [{
    "name": "WuxiaWorld",
    "lang": "en",
    "baseUrl": "https://www.wuxiaworld.site",
    "apiUrl": "",
    "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=wuxiaworld.site",
    "typeSource": "single",
    "isManga": false,
    "itemType": 2,
    "version": "1.0.2",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "novel/src/en/wuxiaworld.js",
    "notes": "Chinese Wuxia, Xianxia, Xuanhuan, Korean, Japanese light novels — free"
}];

// ═══════════════════════════════════════════════════════════
//  WuxiaWorld — wuxiaworld.site
//  Premier destination for Chinese, Korean and Japanese
//  translated novels: Wuxia, Xianxia, Xuanhuan, LitRPG.
// ═══════════════════════════════════════════════════════════

class DefaultExtension extends MProvider {
    constructor() {
        super();
    }

    get BASE() { return "https://www.wuxiaworld.site"; }

    headers() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Referer": "https://www.wuxiaworld.site/"
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
        const items = doc.select("div.page-item-detail, div.manga, div.novel-item, li.novel-item");
        for (const item of items) {
            const a = item.selectFirst("a[href*='novel'], a[href*='manga']");
            if (!a) continue;
            const href = a.getHref || a.attr("href");
            const img = item.selectFirst("img");
            const name = (img?.attr("alt") || a.attr("title") || a.text || "").trim();
            const imageUrl = img ? (img.attr("src") || img.attr("data-src") || img.attr("data-lazy-src") || "") : "";
            if (name && href) {
                list.push({
                    name,
                    link: href.startsWith("http") ? href : `${this.BASE}${href}`,
                    imageUrl: imageUrl.startsWith("http") ? imageUrl : `${this.BASE}${imageUrl}`
                });
            }
        }
        const nextEl = doc.selectFirst("a.next, a[rel='next']");
        return { list, hasNextPage: !!(nextEl) };
    }

    // ── Browse ──────────────────────────────────────────

    async getPopular(page) {
        const doc = await this.fetch(`/novel-list/?m_orderby=views&page=${page}`);
        return this.parseList(doc);
    }

    async getLatestUpdates(page) {
        const doc = await this.fetch(`/novel-list/?m_orderby=latest&page=${page}`);
        return this.parseList(doc);
    }

    async search(query, page, filterList) {
        const genre = this._filterVal(filterList, "Genre") || "";
        const status = this._filterVal(filterList, "Status") || "";
        const sort = this._filterVal(filterList, "Sort") || "views";

        let url;
        if (query.trim().length > 0) {
            url = `/?s=${encodeURIComponent(query)}&post_type=wp-manga&page=${page}`;
        } else {
            url = `/novel-list/?m_orderby=${sort}&page=${page}`;
            if (genre) url += `&genre[]=${genre}`;
            if (status) url += `&status[]=${status}`;
        }
        const doc = await this.fetch(url);
        return this.parseList(doc);
    }

    _filterVal(filterList, name) {
        if (!filterList) return null;
        for (const f of filterList) {
            if (f.name === name && f.values) return f.values[f.state]?.value;
        }
        return null;
    }

    // ── Detail ──────────────────────────────────────────

    async getDetail(url) {
        const doc = await this.fetch(url);

        const name = doc.selectFirst("div.post-title h1, h1.novel-title")?.text?.trim() || "";
        const img = doc.selectFirst("div.summary_image img, img.novel-cover");
        const imageUrl = img ? (img.attr("src") || img.attr("data-src") || img.attr("data-lazy-src") || "") : "";

        const descEl = doc.selectFirst("div.summary__content, div.description-summary");
        const description = descEl ? descEl.text.trim() : "";

        const genreEls = doc.select("div.genres-content a, div.summary-content a[href*='genre']");
        const genre = genreEls.map(a => a.text.trim()).filter(Boolean);

        const statusEl = doc.selectFirst("div.summary-content div.post-status div.summary-content");
        let status = 0;
        if (statusEl) {
            const s = statusEl.text.toLowerCase();
            if (s.includes("completed") || s.includes("end")) status = 1;
            else if (s.includes("hiatus")) status = 2;
        }

        // Chapters via AJAX
        const chapters = [];
        const mangaIdEl = doc.selectFirst("input#manga-chapters-holder, div.listing-chapters_wrap");
        let chapHtml = "";

        // Try fetching chapter list via WordPress AJAX endpoint
        const idMatch = doc.outerHtml?.match(/manga_id\s*[:=]\s*['"]?(\d+)['"]?/) || 
                        doc.html?.match(/data-id="(\d+)"/);
        
        if (idMatch) {
            try {
                const mangaId = idMatch[1];
                const chapRes = await new Client().post(
                    `${this.BASE}/wp-admin/admin-ajax.php`,
                    this.headers(),
                    `action=manga_get_chapters&manga=${mangaId}`
                );
                chapHtml = chapRes.body;
            } catch (e) { /* fallback */ }
        }

        // Fallback: parse inline chapter list
        if (!chapHtml) {
            const chapDiv = doc.selectFirst("div.listing-chapters_wrap, ul.main, div.chapter-list");
            chapHtml = chapDiv ? chapDiv.outerHtml : "";
        }

        const chapDoc = new Document(chapHtml);
        const chapEls = chapDoc.select("li a, ul li a[href*='chapter']");
        for (const a of chapEls) {
            const chapUrl = a.getHref || a.attr("href");
            const chapName = a.text.trim();
            if (chapUrl && chapName) {
                chapters.push({
                    name: chapName,
                    url: chapUrl.startsWith("http") ? chapUrl : `${this.BASE}${chapUrl}`,
                    dateUpload: ""
                });
            }
        }

        return { name, imageUrl, description, genre, status, chapters };
    }

    // ── Chapter Content ──────────────────────────────────

    async getHtmlContent(name, url) {
        const doc = await this.fetch(url);
        const content = doc.selectFirst("div.reading-content, div.chapter-content, div.entry-content");
        return content ? content.outerHtml : "<p>Content unavailable.</p>";
    }

    async cleanHtmlContent(html) {
        const doc = new Document(html);
        const content = doc.selectFirst("div.reading-content, div.chapter-content, div.entry-content");
        if (!content) return html;
        const junk = content.select("script, ins, .adsense, div[class*='ad'], #textads");
        for (const j of junk) j.remove();
        return content.outerHtml;
    }

    // ── Filters ──────────────────────────────────────────

    getFilterList() {
        function opt(n, v) { return { type_name: "SelectOption", name: n, value: v }; }
        return [
            {
                type_name: "SelectFilter", name: "Sort", state: 0,
                values: [
                    opt("Most Views", "views"), opt("Latest Update", "latest"),
                    opt("New", "new-manga"), opt("Rating", "rating"),
                    opt("Trending", "trending"),
                ]
            },
            {
                type_name: "SelectFilter", name: "Status", state: 0,
                values: [
                    opt("All", ""), opt("Ongoing", "on-going"),
                    opt("Completed", "end"), opt("Canceled", "canceled"), opt("On Hold", "on-hold"),
                ]
            },
            {
                type_name: "SelectFilter", name: "Genre", state: 0,
                values: [
                    opt("All", ""), opt("Action", "action"), opt("Adventure", "adventure"),
                    opt("Comedy", "comedy"), opt("Drama", "drama"), opt("Fantasy", "fantasy"),
                    opt("Harem", "harem"), opt("Historical", "historical"),
                    opt("Horror", "horror"), opt("Isekai", "isekai"),
                    opt("Martial Arts", "martial-arts"), opt("Mystery", "mystery"),
                    opt("Romance", "romance"), opt("School Life", "school-life"),
                    opt("Sci-fi", "sci-fi"), opt("Slice of Life", "slice-of-life"),
                    opt("Supernatural", "supernatural"), opt("Wuxia", "wuxia"),
                    opt("Xianxia", "xianxia"), opt("Xuanhuan", "xuanhuan"),
                ]
            }
        ];
    }

    getSourcePreferences() { return []; }
}
