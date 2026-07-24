const watchtowerSources = [{
    "name": "NovelsKnight",
    "lang": "en",
    "baseUrl": "https://novelsknight.punchmanga.online",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/lnreader/lnreader-plugins/plugins/v3.0.0/public/static/multisrc/lightnovelwp/novelsknight/icon.png",
    "typeSource": "single",
    "isManga": false,
    "itemType": 2,
    "version": "1.0.0",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "novel/src/en/novelsknight.js",
    "notes": "",
    "sourceCodeLanguage": 1,
    "appMinVerReq": "0.5.0"
}];

const BASE_URL = "https://novelsknight.punchmanga.online";

class DefaultExtension extends MProvider {
    getHeaders(url) {
        return { "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36", "Referer": BASE_URL };
    }

    async fetchHTML(url) {
        const res = await new Client().get(url, this.getHeaders(url));
        return res.body;
    }

    async fetchDoc(url) {
        return new Document(await this.fetchHTML(url));
    }

    parseArticleList(html) {
        const list = [];
        const doc  = new Document(html);
        for (const art of doc.select("article")) {
            const a    = art.selectFirst("a[title]") || art.selectFirst(".bsx a") || art.selectFirst("a");
            if (!a) continue;
            const name = (a.attr("title") || a.text).trim();
            const link = a.attr("href") || a.getHref || "";
            const img  = art.selectFirst("img");
            const imageUrl = img ? (img.attr("data-src") || img.attr("src") || "") : "";
            if (name && link) list.push({ name, link, imageUrl });
        }
        const nextEl = doc.selectFirst(".pagination .next, a.next_page, a:contains('Next')");
        return { list, hasNextPage: !!nextEl };
    }

    async getPopular(page) {
        return this.parseArticleList(await this.fetchHTML(BASE_URL + "/series/?page=" + page + "&order=popular"));
    }

    async getLatestUpdates(page) {
        return this.parseArticleList(await this.fetchHTML(BASE_URL + "/series/?page=" + page + "&order=update"));
    }

    async search(query, page, filterList) {
        return this.parseArticleList(await this.fetchHTML(BASE_URL + "/page/" + page + "/?s=" + encodeURIComponent(query)));
    }

    toStatus(s) {
        s = (s || "").toLowerCase();
        if (s.includes("ongoing")   || s.includes("مستمرة") || s.includes("devam")   || s.includes("en cours"))  return 0;
        if (s.includes("completed") || s.includes("منتهية") || s.includes("tamamla") || s.includes("complété"))  return 1;
        if (s.includes("hiatus"))                                                                                   return 2;
        if (s.includes("dropped")   || s.includes("cancelled"))                                                    return 3;
        return 5;
    }

    async getDetail(url) {
        const doc = await this.fetchDoc(url);

        const name = (
            doc.selectFirst(".entry-title") ||
            doc.selectFirst("h1.novel-title") ||
            doc.selectFirst("h1.series-title") ||
            doc.selectFirst(".ts-breadcrumb li:last-child")
        )?.text.trim() || "";

        const imgEl = doc.selectFirst(".ts-post-image img") || doc.selectFirst(".thumb img") || doc.selectFirst("img.lazyload");
        const imageUrl = imgEl ? (imgEl.attr("data-src") || imgEl.attr("src") || "") : "";

        const description = (
            doc.selectFirst(".entry-content.desc") ||
            doc.selectFirst(".description") ||
            doc.selectFirst("#syn-target")
        )?.text.trim() || "";

        let author = "", genre = [], status = 5;
        for (const el of doc.select(".spe span, .serl span")) {
            const label = (el.selectFirst("b, strong")?.text || "").toLowerCase();
            const val   = el.text.replace(el.selectFirst("b, strong")?.text || "", "").trim();
            if (label.includes("author") || label.includes("كاتب") || label.includes("autor") || label.includes("yazar")) author = val;
            if (label.includes("status") || label.includes("حالة") || label.includes("estado") || label.includes("durum")) status = this.toStatus(val);
        }
        genre = doc.select(".genxed a, .sertogenre a").map(a => a.text.trim()).filter(Boolean);

        const chapters = [];
        for (const li of doc.select(".eplister li")) {
            const a       = li.selectFirst("a");
            if (!a) continue;
            const chapUrl  = a.attr("href") || a.getHref || "";
            const chapName = li.selectFirst(".epl-title")?.text.trim() || a.text.trim();
            const dateText = li.selectFirst(".epl-date")?.text.trim() || "";
            const dateUpload = dateText ? String(new Date(dateText).valueOf()) : "";
            chapters.push({ name: chapName, url: chapUrl, dateUpload });
        }

        return { name, imageUrl, author, genre, status, description, chapters: chapters.reverse() };
    }

    async getHtmlContent(name, url) {
        const doc = await this.fetchDoc(url);
        const content = doc.selectFirst("div.epcontent") || doc.selectFirst(".entry-content");
        if (!content) return "";
        const paras = content.select("p").map(p => "<p>" + p.text.trim() + "</p>").filter(p => p !== "<p></p>");
        return paras.join("\n");
    }

    async cleanHtmlContent(html) { return html; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}
