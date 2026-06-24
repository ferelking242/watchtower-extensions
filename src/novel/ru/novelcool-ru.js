const watchtowerSources = [{
    "name": "NovelCool (RU)",
    "lang": "ru",
    "baseUrl": "https://ru.novelcool.com",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/lnreader/lnreader-plugins/plugins/v3.0.0/public/static/multisrc/novelcool/novelcool/icon.png",
    "typeSource": "single",
    "isManga": false,
    "itemType": 2,
    "version": "1.0.0",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "novel/src/ru/novelcool-ru.js",
    "notes": "",
    "sourceCodeLanguage": 1,
    "appMinVerReq": "0.5.0"
}];

const BASE_URL = "https://ru.novelcool.com";

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
        for (const el of doc.select("li.book-item")) {
            const a = el.selectFirst("a");
            if (!a) continue;
            const name     = (el.selectFirst(".book-name")?.text || a.attr("title") || a.text).trim();
            const link     = a.attr("href") || a.getHref || "";
            const img      = el.selectFirst("img");
            const imageUrl = img ? (img.attr("data-src") || img.attr("src") || "") : "";
            if (name && link) list.push({ name, link: link.startsWith("http") ? link : BASE_URL + link, imageUrl });
        }
        const hasNextPage = !!doc.selectFirst("a.next_page, .pagination .next");
        return { list, hasNextPage };
    }

    async getPopular(page) {
        const doc = await this.fetchDoc(BASE_URL + "/index/new/page_" + page + "/");
        return this.parseList(doc);
    }

    async getLatestUpdates(page) {
        const doc = await this.fetchDoc(BASE_URL + "/index/hot/page_" + page + "/");
        return this.parseList(doc);
    }

    async search(query, page, filterList) {
        const doc = await this.fetchDoc(BASE_URL + "/search/full/?q=" + encodeURIComponent(query) + "&page=" + page);
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

        const name = doc.selectFirst("h1.book-name")?.text.trim() || "";
        const imgEl = doc.selectFirst(".book-img img");
        const imageUrl = imgEl ? (imgEl.attr("src") || imgEl.attr("data-src") || "") : "";

        const description = doc.selectFirst(".description, .book-desc p")?.text.trim() || "";
        let author = "", genre = [], status = 5;
        for (const li of doc.select(".book-info li")) {
            const label = (li.selectFirst("span.label")?.text || "").toLowerCase();
            const val   = li.text.replace(li.selectFirst("span.label")?.text || "", "").trim();
            if (label.includes("author"))  author = val;
            if (label.includes("status"))  status = this.toStatus(val);
        }
        genre = doc.select(".book-tag a").map(a => a.text.trim()).filter(Boolean);

        const chapters = [];
        for (const a of doc.select(".chapter-list a, li.chapter-item a")) {
            const chapName = (a.selectFirst(".chapter-name")?.text || a.text).trim();
            const chapUrl  = a.attr("href") || a.getHref || "";
            const dateEl   = a.selectFirst(".chapter-time, small");
            const dateUpload = dateEl ? String(new Date(dateEl.text.trim()).valueOf()) : "";
            if (chapName && chapUrl) chapters.push({ name: chapName, url: chapUrl.startsWith("http") ? chapUrl : BASE_URL + chapUrl, dateUpload });
        }

        return { name, imageUrl, author, genre, status, description, chapters };
    }

    async getHtmlContent(name, url) {
        const doc = await this.fetchDoc(url);
        const content = doc.selectFirst("#chapter-content, .chapter-content, .txt");
        return content ? content.outerHtml : "";
    }

    async cleanHtmlContent(html) { return html; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}
