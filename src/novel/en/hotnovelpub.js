const watchtowerSources = [{
    "name": "HotNovelPub",
    "lang": "en",
    "baseUrl": "https://hotnovelpub.com",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/lnreader/lnreader-plugins/plugins/v3.0.0/public/static/multisrc/hotnovelpub/hotnovelpub/icon.png",
    "typeSource": "single",
    "isManga": false,
    "itemType": 2,
    "version": "1.0.0",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "novel/src/en/hotnovelpub.js",
    "notes": "",
    "sourceCodeLanguage": 1,
    "appMinVerReq": "0.5.0"
}];

const BASE_URL = "https://hotnovelpub.com";

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
        for (const el of doc.select(".grid .book-item, .container .book-item, article.book-item")) {
            const a = el.selectFirst("h3 a, .title a, a");
            if (!a) continue;
            const name     = a.attr("title") || a.text.trim();
            const link     = a.attr("href") || a.getHref || "";
            const img      = el.selectFirst("img");
            const imageUrl = img ? (img.attr("data-src") || img.attr("src") || "") : "";
            if (name && link) list.push({ name, link, imageUrl });
        }
        const hasNextPage = !!doc.selectFirst("a.next-page, .pagination a[rel='next'], li.next a");
        return { list, hasNextPage };
    }

    async getPopular(page) {
        const doc = await this.fetchDoc(BASE_URL + "/?status=all&sort=ranking&page=" + page);
        return this.parseList(doc);
    }

    async getLatestUpdates(page) {
        const doc = await this.fetchDoc(BASE_URL + "/?status=all&sort=updated&page=" + page);
        return this.parseList(doc);
    }

    async search(query, page, filterList) {
        const doc = await this.fetchDoc(BASE_URL + "/?q=" + encodeURIComponent(query) + "&page=" + page);
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

        const name = doc.selectFirst("h1.novel-title, .book-name h1")?.text.trim() || "";
        const imgEl = doc.selectFirst(".book-cover img, .novel-cover img");
        const imageUrl = imgEl ? (imgEl.attr("src") || imgEl.attr("data-src") || "") : "";

        const description = doc.selectFirst(".summary, .synopsis, .novel-desc")?.text.trim() || "";
        let author = "", genre = [], status = 5;
        for (const row of doc.select(".book-info li, .info li")) {
            const label = (row.selectFirst("strong, b, label")?.text || "").toLowerCase();
            const val   = row.text.replace(row.selectFirst("strong, b, label")?.text || "", "").trim();
            if (label.includes("author")) author = val;
            if (label.includes("status")) status = this.toStatus(val);
        }
        genre = doc.select(".book-tags a, .genre a, .categories a").map(a => a.text.trim()).filter(Boolean);

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
        const content = doc.selectFirst("#chapter-content, .chapter-content, .text-chapter");
        return content ? content.outerHtml : "";
    }

    async cleanHtmlContent(html) { return html; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}
