const watchtowerSources = [{
    "name": "Rulate (API)",
    "lang": "ru",
    "baseUrl": "https://tl.rulate.ru",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/lnreader/lnreader-plugins/plugins/v3.0.0/public/static/multisrc/rulate/rulate-api/icon.png",
    "typeSource": "single",
    "isManga": false,
    "itemType": 2,
    "version": "1.0.0",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "novel/src/ru/rulate-api.js",
    "notes": "",
    "sourceCodeLanguage": 1,
    "appMinVerReq": "0.5.0"
}];

const BASE_URL = "https://tl.rulate.ru";

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
        for (const el of doc.select(".shorts .block, .novels .short, .short-story")) {
            const a = el.selectFirst("a.title, h2 a, h3 a");
            if (!a) continue;
            const name     = a.text.trim();
            const link     = a.attr("href") || a.getHref || "";
            const img      = el.selectFirst("img");
            const imageUrl = img ? (img.attr("src") || img.attr("data-src") || "") : "";
            if (name && link) list.push({ name, link: link.startsWith("http") ? link : BASE_URL + link, imageUrl });
        }
        const hasNextPage = !!doc.selectFirst("a.next, .pagination li.next a");
        return { list, hasNextPage };
    }

    async getPopular(page) {
        const doc = await this.fetchDoc(BASE_URL + "/ru/novels/?sort=rating&page=" + page);
        return this.parseList(doc);
    }

    async getLatestUpdates(page) {
        const doc = await this.fetchDoc(BASE_URL + "/ru/novels/?sort=date&page=" + page);
        return this.parseList(doc);
    }

    async search(query, page, filterList) {
        const doc = await this.fetchDoc(BASE_URL + "/search?q=" + encodeURIComponent(query) + "&page=" + page);
        return this.parseList(doc);
    }

    toStatus(s) {
        s = (s || "").toLowerCase();
        if (s.includes("продолжается") || s.includes("ongoing"))   return 0;
        if (s.includes("завершён")     || s.includes("completed")) return 1;
        if (s.includes("заморожен")    || s.includes("hiatus"))    return 2;
        return 5;
    }

    async getDetail(url) {
        const doc = await this.fetchDoc(url);

        const name = doc.selectFirst("h1.title, h1.entry-title")?.text.trim() || "";
        const imgEl = doc.selectFirst(".cover img, .book-cover img");
        const imageUrl = imgEl ? (imgEl.attr("src") || imgEl.attr("data-src") || "") : "";

        const description = doc.selectFirst(".description, .annotation")?.text.trim() || "";
        let author = "", genre = [], status = 5;
        for (const li of doc.select(".details li, .info li")) {
            const label = (li.selectFirst("span:first-child")?.text || "").toLowerCase();
            const val   = li.text.replace(li.selectFirst("span:first-child")?.text || "", "").trim();
            if (label.includes("автор") || label.includes("author")) author = val;
            if (label.includes("статус") || label.includes("status")) status = this.toStatus(val);
        }
        genre = doc.select(".tags a, .genre a").map(a => a.text.trim()).filter(Boolean);

        const chapters = [];
        for (const a of doc.select(".chapter-list a, .chapters li a")) {
            const chapName = a.text.trim();
            const chapUrl  = a.attr("href") || a.getHref || "";
            if (chapName && chapUrl) chapters.push({ name: chapName, url: chapUrl.startsWith("http") ? chapUrl : BASE_URL + chapUrl, dateUpload: "" });
        }

        return { name, imageUrl, author, genre, status, description, chapters };
    }

    async getHtmlContent(name, url) {
        const doc = await this.fetchDoc(url);
        const content = doc.selectFirst(".chapter-text, .entry-content, .text");
        return content ? content.outerHtml : "";
    }

    async cleanHtmlContent(html) { return html; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}
