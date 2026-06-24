const watchtowerSources = [{
    "name": "Chrysanthemum Garden",
    "lang": "en",
    "baseUrl": "https://chrysanthemumgarden.com",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/lnreader/lnreader-plugins/plugins/v3.0.0/public/static/src/en/chrysanthemumgarden/icon.png",
    "typeSource": "single",
    "isManga": false,
    "itemType": 2,
    "version": "1.0.0",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "novel/src/en/chrysanthemumgarden.js",
    "notes": "",
    "sourceCodeLanguage": 1,
    "appMinVerReq": "0.5.0"
}];

const BASE_URL = "https://chrysanthemumgarden.com";

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
        for (const el of doc.select("article.novel, .novel-card, article.type-novel")) {
            const a = el.selectFirst("h2 a, h3 a, .entry-title a");
            if (!a) continue;
            const name     = a.text.trim();
            const link     = a.attr("href") || a.getHref || "";
            const img      = el.selectFirst("img");
            const imageUrl = img ? (img.attr("src") || img.attr("data-src") || "") : "";
            if (name && link) list.push({ name, link, imageUrl });
        }
        const hasNextPage = !!doc.selectFirst("a.next.page-numbers, a[rel='next']");
        return { list, hasNextPage };
    }

    async getPopular(page) {
        const doc = await this.fetchDoc(BASE_URL + "/novel-list/page/" + page + "/?orderby=views");
        return this.parseList(doc);
    }

    async getLatestUpdates(page) {
        const doc = await this.fetchDoc(BASE_URL + "/novel-list/page/" + page + "/");
        return this.parseList(doc);
    }

    async search(query, page, filterList) {
        const doc = await this.fetchDoc(BASE_URL + "/?s=" + encodeURIComponent(query) + "&post_type=novel&paged=" + page);
        return this.parseList(doc);
    }

    toStatus(s) {
        s = (s || "").toLowerCase();
        if (s.includes("ongoing"))   return 0;
        if (s.includes("completed")) return 1;
        return 5;
    }

    async getDetail(url) {
        const doc = await this.fetchDoc(url);

        const name = doc.selectFirst("h1.novel-title, h1.entry-title")?.text.trim() || "";
        const imgEl = doc.selectFirst(".novel-cover img, .summary_image img");
        const imageUrl = imgEl ? (imgEl.attr("src") || imgEl.attr("data-src") || "") : "";

        const description = doc.selectFirst(".entry-content p, .summary__content")?.text.trim() || "";
        const author  = doc.selectFirst(".author a, .novel-author a")?.text.trim() || "";
        const statusEl = doc.selectFirst(".novel-status, .status");
        const status  = this.toStatus(statusEl?.text || "");
        const genre   = doc.select(".genres a, .tags a").map(a => a.text.trim()).filter(Boolean);

        const chapters = [];
        for (const a of doc.select(".chapter-list a, .chapters li a")) {
            const chapName = a.text.trim();
            const chapUrl  = a.attr("href") || a.getHref || "";
            if (chapName && chapUrl) chapters.push({ name: chapName, url: chapUrl, dateUpload: "" });
        }

        return { name, imageUrl, author, genre, status, description, chapters };
    }

    async getHtmlContent(name, url) {
        const doc = await this.fetchDoc(url);
        const content = doc.selectFirst(".entry-content, .chapter-content, #novel-content");
        return content ? content.outerHtml : "";
    }

    async cleanHtmlContent(html) { return html; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}
