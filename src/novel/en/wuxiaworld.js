const watchtowerSources = [{
    "name": "Wuxia World",
    "lang": "en",
    "baseUrl": "https://www.wuxiaworld.com",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/lnreader/lnreader-plugins/plugins/v3.0.0/public/static/src/en/wuxiaworld/icon.png",
    "typeSource": "single",
    "isManga": false,
    "itemType": 2,
    "version": "1.0.0",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "novel/src/en/wuxiaworld.js",
    "notes": "",
    "sourceCodeLanguage": 1,
    "appMinVerReq": "0.5.0"
}];

const BASE_URL = "https://www.wuxiaworld.com";

class DefaultExtension extends MProvider {
    getHeaders(url) {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": BASE_URL,
        };
    }

    async fetchDoc(url) {
        const res = await new Client().get(url, this.getHeaders(url));
        return new Document(res.body);
    }

    parseList(doc) {
        const list = [];
        for (const el of doc.select("div.novel-card, div.book-item")) {
            const a = el.selectFirst("a");
            if (!a) continue;
            const name     = (el.selectFirst(".title, h4, h3")?.text || a.text).trim();
            const link     = (a.attr("href") || a.getHref || "");
            const img      = el.selectFirst("img");
            const imageUrl = img ? (img.attr("src") || img.attr("data-src") || "") : "";
            const fullLink = link.startsWith("http") ? link : BASE_URL + link;
            if (name && link) list.push({ name, link: fullLink, imageUrl });
        }
        const hasNextPage = !!doc.selectFirst("a.next, .pagination .next");
        return { list, hasNextPage };
    }

    async getPopular(page) {
        const doc = await this.fetchDoc(BASE_URL + "/novels?page=" + page + "&orderby=rank");
        return this.parseList(doc);
    }

    async getLatestUpdates(page) {
        const doc = await this.fetchDoc(BASE_URL + "/novels?page=" + page + "&orderby=update");
        return this.parseList(doc);
    }

    async search(query, page, filterList) {
        const doc = await this.fetchDoc(BASE_URL + "/novels?page=" + page + "&q=" + encodeURIComponent(query));
        return this.parseList(doc);
    }

    toStatus(s) {
        s = (s || "").toLowerCase();
        if (s.includes("ongoing"))   return 0;
        if (s.includes("completed")) return 1;
        if (s.includes("hiatus"))    return 2;
        return 5;
    }

    async getDetail(url) {
        const doc = await this.fetchDoc(url);

        const name = doc.selectFirst("div.novel-title, h1.novel-name")?.text.trim() || "";
        const imgEl = doc.selectFirst("div.novel-cover img, img.cover-image");
        const imageUrl = imgEl ? (imgEl.attr("src") || imgEl.attr("data-src") || "") : "";

        const description = doc.selectFirst("div.synopsis, .description")?.text.trim() || "";
        const author = doc.selectFirst("a.author-name, .author a")?.text.trim() || "";
        const statusEl = doc.selectFirst(".status, .novel-status");
        const status = this.toStatus(statusEl?.text || "");
        const genre = doc.select(".genre-tags a, .tags a").map(a => a.text.trim()).filter(Boolean);

        const chapters = [];
        for (const a of doc.select("ul.chapter-list li a, .chapter-list a")) {
            const chapName = a.text.trim();
            const chapUrl  = (a.attr("href") || a.getHref || "");
            const dateEl   = a.selectFirst("time, .date");
            const dateUpload = dateEl ? String(new Date(dateEl.text.trim()).valueOf()) : "";
            const fullUrl = chapUrl.startsWith("http") ? chapUrl : BASE_URL + chapUrl;
            if (chapName && chapUrl) chapters.push({ name: chapName, url: fullUrl, dateUpload });
        }

        return { name, imageUrl, author, genre, status, description, chapters };
    }

    async getHtmlContent(name, url) {
        const doc = await this.fetchDoc(url);
        const content = doc.selectFirst("#chapter-content, .chapter-content");
        return content ? content.outerHtml : "";
    }

    async cleanHtmlContent(html) { return html; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}
