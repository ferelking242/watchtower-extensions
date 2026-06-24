const watchtowerSources = [{
    "name": "Свободный Мир Ранобэ",
    "lang": "ru",
    "baseUrl": "https://ifreedom.su",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/lnreader/lnreader-plugins/plugins/v3.0.0/public/static/multisrc/ifreedom/ifreedom/icon.png",
    "typeSource": "single",
    "isManga": false,
    "itemType": 2,
    "version": "1.0.0",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "novel/src/ru/ifreedom.js",
    "notes": "",
    "sourceCodeLanguage": 1,
    "appMinVerReq": "0.5.0"
}];

const BASE_URL = "https://ifreedom.su";

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
        for (const el of doc.select("article, .book-item, .short-story")) {
            const a = el.selectFirst("h2 a, h3 a, .title a");
            if (!a) continue;
            const name     = a.text.trim();
            const link     = a.attr("href") || a.getHref || "";
            const img      = el.selectFirst("img");
            const imageUrl = img ? (img.attr("src") || img.attr("data-src") || "") : "";
            if (name && link) list.push({ name, link, imageUrl });
        }
        const hasNextPage = !!doc.selectFirst(".next-p a, a.next, .pagination .next");
        return { list, hasNextPage };
    }

    async getPopular(page) {
        const doc = await this.fetchDoc(BASE_URL + "/?sort=popular&page=" + page);
        return this.parseList(doc);
    }

    async getLatestUpdates(page) {
        const doc = await this.fetchDoc(BASE_URL + "/?sort=date&page=" + page);
        return this.parseList(doc);
    }

    async search(query, page, filterList) {
        const doc = await this.fetchDoc(BASE_URL + "/?s=" + encodeURIComponent(query) + "&page=" + page);
        return this.parseList(doc);
    }

    toStatus(s) {
        s = (s || "").toLowerCase();
        if (s.includes("ongoing")  || s.includes("مستمرة")    || s.includes("продолжается")) return 0;
        if (s.includes("completed")|| s.includes("مكتملة")    || s.includes("завершён"))     return 1;
        if (s.includes("hiatus")   || s.includes("متوقفة"))                                   return 2;
        return 5;
    }

    async getDetail(url) {
        const doc = await this.fetchDoc(url);

        const name = doc.selectFirst("h1.title, h1.entry-title, h1")?.text.trim() || "";
        const imgEl = doc.selectFirst(".cover img, .book-cover img");
        const imageUrl = imgEl ? (imgEl.attr("src") || imgEl.attr("data-src") || "") : "";

        const description = doc.selectFirst(".description, .summary, .annotation")?.text.trim() || "";
        let author = "", genre = [], status = 5;
        for (const li of doc.select(".info li, .details li")) {
            const label = li.selectFirst("strong, b")?.text.toLowerCase() || "";
            const val   = li.text.replace(li.selectFirst("strong, b")?.text || "", "").trim();
            if (label.includes("author") || label.includes("كاتب") || label.includes("автор")) author = val;
            if (label.includes("status") || label.includes("حالة") || label.includes("статус")) status = this.toStatus(val);
        }
        genre = doc.select(".tags a, .genre a, .categories a").map(a => a.text.trim()).filter(Boolean);

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
        const content = doc.selectFirst(".text, .chapter-content, .entry-content");
        return content ? content.outerHtml : "";
    }

    async cleanHtmlContent(html) { return html; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}
