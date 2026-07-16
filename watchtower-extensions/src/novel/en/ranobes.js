const watchtowerSources = [{
    "name": "Ranobes",
    "lang": "en",
    "baseUrl": "https://ranobes.top",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/lnreader/lnreader-plugins/plugins/v3.0.0/public/static/multisrc/ranobes/ranobes/icon.png",
    "typeSource": "single",
    "isManga": false,
    "itemType": 2,
    "version": "1.0.0",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "novel/src/en/ranobes.js",
    "notes": "",
    "sourceCodeLanguage": 1,
    "appMinVerReq": "0.5.0"
}];

const BASE_URL = "https://ranobes.top";

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
        for (const el of doc.select(".short-story, .novels-list .item")) {
            const a = el.selectFirst("h3 a, h2 a, .title a");
            if (!a) continue;
            const name     = a.text.trim();
            const link     = a.attr("href") || a.getHref || "";
            const img      = el.selectFirst("img");
            const imageUrl = img ? (img.attr("src") || img.attr("data-src") || "") : "";
            if (name && link) list.push({ name, link: link.startsWith("http") ? link : BASE_URL + link, imageUrl });
        }
        const hasNextPage = !!doc.selectFirst(".next-p a, .pagination .next");
        return { list, hasNextPage };
    }

    async getPopular(page) {
        const doc = await this.fetchDoc(BASE_URL + "/novels/sort/popular/page/" + page + "/");
        return this.parseList(doc);
    }

    async getLatestUpdates(page) {
        const doc = await this.fetchDoc(BASE_URL + "/latest/page-" + page + "/");
        return this.parseList(doc);
    }

    async search(query, page, filterList) {
        const doc = await this.fetchDoc(BASE_URL + "/?s=" + encodeURIComponent(query) + "&page=" + page);
        return this.parseList(doc);
    }

    toStatus(s) {
        s = (s || "").toLowerCase();
        if (s.includes("ongoing")  || s.includes("продолжается")) return 0;
        if (s.includes("completed")|| s.includes("завершён"))     return 1;
        if (s.includes("hiatus"))                                  return 2;
        return 5;
    }

    async getDetail(url) {
        const doc = await this.fetchDoc(url);

        const name = doc.selectFirst("h1.novel-title, h1.entry-title")?.text.trim() || "";
        const imgEl = doc.selectFirst(".book-img img, .cover img");
        const imageUrl = imgEl ? (imgEl.attr("src") || imgEl.attr("data-src") || "") : "";

        const description = doc.selectFirst(".description, .book-text p")?.text.trim() || "";
        let author = "", genre = [], status = 5;
        for (const li of doc.select("ul.details li")) {
            const label = li.selectFirst("span:first-child")?.text.toLowerCase() || "";
            const val   = li.text.replace(li.selectFirst("span:first-child")?.text || "", "").trim();
            if (label.includes("author") || label.includes("автор")) author = val;
            if (label.includes("status") || label.includes("статус")) status = this.toStatus(val);
        }
        genre = doc.select(".tags a, .genres a").map(a => a.text.trim()).filter(Boolean);

        const chapters = [];
        for (const a of doc.select(".chapters-list a, ol.chapters a")) {
            const chapName = a.text.trim();
            const chapUrl  = a.attr("href") || a.getHref || "";
            if (chapName && chapUrl) chapters.push({ name: chapName, url: chapUrl.startsWith("http") ? chapUrl : BASE_URL + chapUrl, dateUpload: "" });
        }

        return { name, imageUrl, author, genre, status, description, chapters };
    }

    async getHtmlContent(name, url) {
        const doc = await this.fetchDoc(url);
        const content = doc.selectFirst(".chapter-body, .reading-text, .entry-content");
        return content ? content.outerHtml : "";
    }

    async cleanHtmlContent(html) { return html; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}
