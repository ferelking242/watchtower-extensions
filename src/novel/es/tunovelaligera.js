const watchtowerSources = [{
    "name": "TuNovelaLigera",
    "lang": "es",
    "baseUrl": "https://tunovelaligera.com",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/lnreader/lnreader-plugins/plugins/v3.0.0/public/static/src/es/tunovelaligera/icon.png",
    "typeSource": "single",
    "isManga": false,
    "itemType": 2,
    "version": "1.0.0",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "novel/src/es/tunovelaligera.js",
    "notes": "",
    "sourceCodeLanguage": 1,
    "appMinVerReq": "0.5.0"
}];

const BASE_URL = "https://tunovelaligera.com";

class DefaultExtension extends MProvider {
    getHeaders(url) {
        return { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Referer": BASE_URL };
    }

    async fetchDoc(url) {
        const res = await new Client().get(url, this.getHeaders(url));
        return new Document(res.body);
    }

    parseList(doc) {
        const list = [];
        // Try multiple common WordPress novel list selectors
        const selectors = [
            "article.post", ".novel-item", ".book-item", ".entry-item",
            ".short-story", ".item", "li.post"
        ];
        for (const sel of selectors) {
            for (const el of doc.select(sel)) {
                const a = el.selectFirst("h1 a, h2 a, h3 a, h4 a, .title a, a[rel='bookmark']");
                if (!a) continue;
                const name     = a.text.trim();
                const link     = a.attr("href") || a.getHref || "";
                const img      = el.selectFirst("img");
                const imageUrl = img ? (img.attr("data-src") || img.attr("src") || "") : "";
                if (name && link) list.push({ name, link, imageUrl });
            }
            if (list.length > 0) break;
        }
        const hasNextPage = !!doc.selectFirst("a.next, .nav-next a, a[rel='next'], .pagination .next");
        return { list, hasNextPage };
    }

    async getPopular(page) {
        const doc = await this.fetchDoc(BASE_URL + "/page/" + page + "/");
        return this.parseList(doc);
    }

    async getLatestUpdates(page) {
        const doc = await this.fetchDoc(BASE_URL + "/?orderby=date&paged=" + page);
        return this.parseList(doc);
    }

    async search(query, page, filterList) {
        const doc = await this.fetchDoc(BASE_URL + "/?s=" + encodeURIComponent(query) + "&paged=" + page);
        return this.parseList(doc);
    }

    toStatus(s) {
        s = (s || "").toLowerCase();
        if (s.includes("ongoing")   || s.includes("مستمرة") || s.includes("продолжается")) return 0;
        if (s.includes("completed") || s.includes("منتهية") || s.includes("завершён"))     return 1;
        if (s.includes("hiatus"))                                                            return 2;
        return 5;
    }

    async getDetail(url) {
        const doc = await this.fetchDoc(url);

        const name = (
            doc.selectFirst("h1.entry-title") ||
            doc.selectFirst("h1.novel-title") ||
            doc.selectFirst("article h1") ||
            doc.selectFirst("h1")
        )?.text.trim() || "";

        const imgEl = doc.selectFirst(".post-thumbnail img, .thumb img, article img");
        const imageUrl = imgEl ? (imgEl.attr("src") || imgEl.attr("data-src") || "") : "";

        const description = (
            doc.selectFirst(".entry-content p") ||
            doc.selectFirst(".description p") ||
            doc.selectFirst(".summary p")
        )?.text.trim() || "";

        const genre  = doc.select(".tags a, .genre a").map(a => a.text.trim()).filter(Boolean);
        const status = 5;
        const author = doc.selectFirst(".author a, .vcard a")?.text.trim() || "";

        const chapters = [];
        for (const a of doc.select(".chapter-list a, .chapters li a, .entry-content a")) {
            const chapName = a.text.trim();
            const chapUrl  = a.attr("href") || a.getHref || "";
            if (chapName && chapUrl && chapUrl.startsWith("http")) {
                chapters.push({ name: chapName, url: chapUrl, dateUpload: "" });
            }
        }

        return { name, imageUrl, author, genre, status, description, chapters };
    }

    async getHtmlContent(name, url) {
        const doc = await this.fetchDoc(url);
        const content = doc.selectFirst(".entry-content") || doc.selectFirst("article .content") || doc.selectFirst("main");
        return content ? content.outerHtml : "";
    }

    async cleanHtmlContent(html) { return html; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}
