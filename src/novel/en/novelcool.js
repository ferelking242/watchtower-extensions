const watchtowerSources = [{
    "name": "NovelCool",
    "lang": "en",
    "baseUrl": "https://novelcool.com",
    "apiUrl": "",
    "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=novelcool.com",
    "typeSource": "single",
    "isManga": false,
    "itemType": 2,
    "version": "1.0.2",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "novel/src/en/novelcool.js",
    "notes": "Light novels, Chinese novels, Korean novels, Japanese novels — free online reader"
}];

// ═══════════════════════════════════════════════════════════
//  NovelCool — novelcool.com
//  Large multi-origin light novel reader. EN, ZH, KO, JP.
//  Covers: Xianxia, Xuanhuan, Wuxia, Isekai, Romance, etc.
// ═══════════════════════════════════════════════════════════

class DefaultExtension extends MProvider {
    constructor() {
        super();
    }

    get BASE() { return "https://novelcool.com"; }

    headers() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Referer": "https://novelcool.com/"
        };
    }

    async fetch(path) {
        const url = path.startsWith("http") ? path : `${this.BASE}${path}`;
        const res = await new Client().get(url, this.headers());
        return new Document(res.body);
    }

    // ── List Parser ─────────────────────────────────────

    parseBookList(doc) {
        const list = [];
        const items = doc.select("div.book-item, li.book-item");
        for (const item of items) {
            const a = item.selectFirst("a");
            if (!a) continue;
            const href = a.getHref || a.attr("href");
            const img = item.selectFirst("img");
            const name = img ? (img.attr("alt") || "").trim() : (a.attr("title") || a.text).trim();
            const imageUrl = img ? (img.attr("src") || img.attr("data-src") || "") : "";
            if (name && href) {
                list.push({
                    name,
                    link: href.startsWith("http") ? href : `${this.BASE}${href}`,
                    imageUrl: imageUrl.startsWith("http") ? imageUrl : `${this.BASE}${imageUrl}`
                });
            }
        }
        // Check for next page
        const nextEl = doc.selectFirst("a.next, a[rel='next'], li.next a");
        const hasNextPage = !!(nextEl && nextEl.getHref);
        return { list, hasNextPage };
    }

    // ── Browse ──────────────────────────────────────────

    async getPopular(page) {
        const doc = await this.fetch(`/category/popular.html?page=${page}`);
        return this.parseBookList(doc);
    }

    async getLatestUpdates(page) {
        const doc = await this.fetch(`/category/latest.html?page=${page}`);
        return this.parseBookList(doc);
    }

    async search(query, page, filterList) {
        const genre = this._filterVal(filterList, "Genre") || "";
        let url = `/search.html?name=${encodeURIComponent(query)}&page=${page}`;
        if (genre) url = `/genre/${genre}.html?page=${page}&name=${encodeURIComponent(query)}`;
        const doc = await this.fetch(url);
        return this.parseBookList(doc);
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

        const name = doc.selectFirst("h1.book-title, h1")?.text?.trim() || "";
        const img = doc.selectFirst("div.book-img img, img.book-cover");
        const imageUrl = img ? (img.attr("src") || img.attr("data-src") || "") : "";

        const descEl = doc.selectFirst("div.book-desc-content, div.description");
        const description = descEl ? descEl.text.trim() : "";

        const genreTags = doc.select("a.book-category, a[href*='genre']");
        const genre = genreTags.map(a => a.text.trim()).filter(Boolean);

        const statusEl = doc.selectFirst("span.book-status, div.book-status");
        let status = 0;
        if (statusEl) {
            const s = statusEl.text.toLowerCase();
            if (s.includes("completed") || s.includes("end")) status = 1;
            else if (s.includes("hiatus") || s.includes("drop")) status = 2;
        }

        // Chapters
        const chapters = [];
        const chapItems = doc.select("li.chapter-item a, ul.chapter-list li a");
        for (const a of chapItems) {
            const chapUrl = a.getHref || a.attr("href");
            const chapName = a.text.trim() || a.attr("title") || "";
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
        const content = doc.selectFirst("div#chapter-content, div.chapter-content, div.content-body");
        return content ? content.outerHtml : "<p>Content unavailable.</p>";
    }

    async cleanHtmlContent(html) {
        const doc = new Document(html);
        const content = doc.selectFirst("div#chapter-content, div.chapter-content, div.content-body");
        if (!content) return html;
        const ads = content.select("ins, script, div.ad, .adsense");
        for (const ad of ads) ad.remove();
        return content.outerHtml;
    }

    // ── Filters ──────────────────────────────────────────

    getFilterList() {
        function opt(n, v) { return { type_name: "SelectOption", name: n, value: v }; }
        return [{
            type_name: "SelectFilter", name: "Genre", state: 0,
            values: [
                opt("All", ""), opt("Action", "action"), opt("Adventure", "adventure"),
                opt("Comedy", "comedy"), opt("Drama", "drama"), opt("Fantasy", "fantasy"),
                opt("Historical", "historical"), opt("Horror", "horror"),
                opt("Isekai", "isekai"), opt("Martial Arts", "martial-arts"),
                opt("Mystery", "mystery"), opt("Psychological", "psychological"),
                opt("Romance", "romance"), opt("Sci-fi", "sci-fi"),
                opt("Slice of Life", "slice-of-life"), opt("Supernatural", "supernatural"),
                opt("Wuxia", "wuxia"), opt("Xianxia", "xianxia"),
                opt("Xuanhuan", "xuanhuan"), opt("Yaoi", "yaoi"), opt("Yuri", "yuri"),
            ]
        }];
    }

    getSourcePreferences() { return []; }
}
