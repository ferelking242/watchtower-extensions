const watchtowerSources = [{
    "name": "Lib Read",
    "lang": "en",
    "baseUrl": "https://libread.com",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/lnreader/lnreader-plugins/plugins/v3.0.0/public/static/multisrc/readnovelfull/libread/icon.png",
    "typeSource": "single",
    "isManga": false,
    "itemType": 2,
    "version": "1.0.0",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "novel/src/en/libread.js",
    "notes": "",
    "sourceCodeLanguage": 1,
    "appMinVerReq": "0.5.0"
}];

const BASE_URL = "https://libread.com";

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
        for (const row of doc.select(".archive .row, .col-content .row")) {
            const a = row.selectFirst("h3 a, .novel-title a");
            if (!a) continue;
            const name     = a.text.trim();
            const link     = a.attr("href") || a.getHref || "";
            const img      = row.selectFirst("img");
            const imageUrl = img ? (img.attr("data-src") || img.attr("src") || "") : "";
            if (name && link) list.push({ name, link, imageUrl });
        }
        const hasNextPage = !!doc.selectFirst("li.next a, .pagination .next");
        return { list, hasNextPage };
    }

    async getPopular(page) {
        const doc = await this.fetchDoc(BASE_URL + "/novel-list/most-popular-novel?page=" + page);
        return this.parseList(doc);
    }

    async getLatestUpdates(page) {
        const doc = await this.fetchDoc(BASE_URL + "/novel-list/latest-release-novel?page=" + page);
        return this.parseList(doc);
    }

    async search(query, page, filterList) {
        const doc = await this.fetchDoc(BASE_URL + "/novel-list/search?keyword=" + encodeURIComponent(query) + "&page=" + page);
        return this.parseList(doc);
    }

    toStatus(s) {
        s = (s || "").toLowerCase();
        if (s.includes("ongoing"))   return 0;
        if (s.includes("completed")) return 1;
        if (s.includes("hiatus"))    return 2;
        if (s.includes("dropped") || s.includes("cancelled")) return 3;
        return 5;
    }

    async getDetail(url) {
        const doc = await this.fetchDoc(url);

        const name = doc.selectFirst("h3.title, .books h3, h1.novel-title")?.text.trim() || "";
        const imgEl = doc.selectFirst(".books img, .m-imgtxt img");
        const imageUrl = imgEl ? (imgEl.attr("src") || imgEl.attr("data-src") || "") : "";

        let author = "", genre = [], status = 5, description = "";
        for (const li of doc.select("ul.info-meta li, .info li")) {
            const label = (li.selectFirst("h3")?.text || li.selectFirst("strong")?.text || "").toLowerCase();
            const val   = li.text.replace(li.selectFirst("h3")?.text || li.selectFirst("strong")?.text || "", "").trim();
            if (label.includes("author"))  author = val;
            if (label.includes("genre"))   genre  = val.split(",").map(s => s.trim()).filter(Boolean);
            if (label.includes("status"))  status = this.toStatus(val);
        }
        description = doc.selectFirst(".desc-text, .summary__content")?.text.trim() || "";

        // Chapters via AJAX
        const novelId = doc.selectFirst("[data-novel-id]")?.attr("data-novel-id") || "";
        let chapters = [];
        if (novelId) {
            try {
                const r = await new Client().get(
                    BASE_URL + "/ajax/chapter-archive?novelId=" + novelId,
                    this.getHeaders(url)
                );
                const cd = new Document(r.body);
                for (const a of cd.select("a[href]")) {
                    const chapName = a.text.trim();
                    const chapUrl  = a.attr("href") || a.getHref || "";
                    if (chapName && chapUrl) chapters.push({ name: chapName, url: chapUrl, dateUpload: "" });
                }
            } catch (_) {}
        }
        if (!chapters.length) {
            for (const a of doc.select(".list-chapter a, #list-chapter a")) {
                const chapName = a.text.trim();
                const chapUrl  = a.attr("href") || a.getHref || "";
                if (chapName && chapUrl) chapters.push({ name: chapName, url: chapUrl, dateUpload: "" });
            }
        }

        return { name, imageUrl, author, genre, status, description, chapters };
    }

    async getHtmlContent(name, url) {
        const doc = await this.fetchDoc(url);
        const content = doc.selectFirst("#chr-content, .chr-content, .chapter-content, #chaptercontent");
        return content ? content.outerHtml : "";
    }

    async cleanHtmlContent(html) { return html; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}
