const watchtowerSources = [{
    "name": "Web Novel Pub",
    "lang": "en",
    "baseUrl": "https://www.webnovelworld.org",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/lnreader/lnreader-plugins/plugins/v3.0.0/public/static/multisrc/lightnovelworld/webnovelworld/icon.png",
    "typeSource": "single",
    "isManga": false,
    "itemType": 2,
    "version": "1.0.0",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "novel/src/en/webnovelworld.js",
    "notes": "",
    "sourceCodeLanguage": 1,
    "appMinVerReq": "0.5.0"
}];

const BASE_URL = "https://www.webnovelworld.org";

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
        for (const item of doc.select(".novel-item, .list-novel li")) {
            const a = item.selectFirst("h4.novel-title a, .novel-title a, h3 a");
            if (!a) continue;
            const name     = a.text.trim();
            const link     = a.attr("href") || a.getHref || "";
            const img      = item.selectFirst("img");
            const imageUrl = img ? (img.attr("data-src") || img.attr("src") || "") : "";
            if (name && link) list.push({ name, link, imageUrl });
        }
        const hasNextPage = !!doc.selectFirst(".pagination .next, a[rel='next']");
        return { list, hasNextPage };
    }

    async getPopular(page) {
        const doc = await this.fetchDoc(BASE_URL + "/novel/?sort=popular&page=" + page);
        return this.parseList(doc);
    }

    async getLatestUpdates(page) {
        const doc = await this.fetchDoc(BASE_URL + "/novel/?sort=updated&page=" + page);
        return this.parseList(doc);
    }

    async search(query, page, filterList) {
        const doc = await this.fetchDoc(BASE_URL + "/search?title=" + encodeURIComponent(query) + "&page=" + page);
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

        const name = doc.selectFirst("h1.novel-title")?.text.trim() || "";
        const imgEl = doc.selectFirst(".cover img");
        const imageUrl = imgEl ? (imgEl.attr("src") || imgEl.attr("data-src") || "") : "";

        const description = doc.selectFirst(".summary p, .description p, .overview")?.text.trim() || "";
        let author = "", genre = [], status = 5;
        for (const li of doc.select(".novel-detail-item")) {
            const label = li.selectFirst(".novel-detail-header")?.text.toLowerCase() || "";
            const val   = li.selectFirst(".novel-detail-body")?.text.trim() || "";
            if (label.includes("author")) author = val;
            if (label.includes("status")) status = this.toStatus(val);
        }
        genre = doc.select(".categories a, .genre a").map(a => a.text.trim()).filter(Boolean);

        const chapters = [];
        for (const a of doc.select(".chapter-list li a, .chapters li a")) {
            const chapName = (a.selectFirst(".chapter-no, .chapter-title")?.text || a.text).trim();
            const chapUrl  = a.attr("href") || a.getHref || "";
            const dateEl   = a.selectFirst(".chapter-update, .date");
            const dateUpload = dateEl ? String(new Date(dateEl.text.trim()).valueOf()) : "";
            if (chapName && chapUrl) chapters.push({ name: chapName, url: chapUrl, dateUpload });
        }

        return { name, imageUrl, author, genre, status, description, chapters };
    }

    async getHtmlContent(name, url) {
        const doc = await this.fetchDoc(url);
        const content = doc.selectFirst(".chapter-content, #chapter-container, .reading-content");
        return content ? content.outerHtml : "";
    }

    async cleanHtmlContent(html) { return html; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}
