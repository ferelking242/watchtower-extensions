const watchtowerSources = [{
    "name": "Etude Translations",
    "lang": "en",
    "baseUrl": "https://etudetranslations.com",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/lnreader/lnreader-plugins/plugins/v3.0.0/public/static/multisrc/madara/etudetranslations/icon.png",
    "typeSource": "single",
    "isManga": false,
    "itemType": 2,
    "version": "1.0.0",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "novel/src/en/etudetranslations.js",
    "notes": "",
    "sourceCodeLanguage": 1,
    "appMinVerReq": "0.5.0"
}];

const BASE_URL = "https://etudetranslations.com";

class DefaultExtension extends MProvider {
    getHeaders(url) {
        return {
            "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36",
            "Referer": BASE_URL,
        };
    }

    async fetchDoc(url) {
        const res = await new Client().get(url, this.getHeaders(url));
        return new Document(res.body);
    }

    parseList(doc) {
        const list = [];
        for (const el of doc.select(".page-item-detail, .c-tabs-item__content")) {
            const a = el.selectFirst(".post-title a");
            if (!a) continue;
            const name = a.text.trim();
            const link = a.attr("href") || "";
            const img  = el.selectFirst("img");
            const imageUrl = img
                ? (img.attr("data-lazy-src") || img.attr("data-src") || img.attr("src") || "")
                : "";
            if (name && link) list.push({ name, link, imageUrl });
        }
        const hasNextPage = !!doc.selectFirst("a.next.page-numbers, .nav-previous a");
        return { list, hasNextPage };
    }

    async getPopular(page) {
        const doc = await this.fetchDoc(BASE_URL + "/page/" + page + "/?s&post_type=wp-manga&m_orderby=views");
        return this.parseList(doc);
    }

    async getLatestUpdates(page) {
        const doc = await this.fetchDoc(BASE_URL + "/page/" + page + "/?s&post_type=wp-manga&m_orderby=latest");
        return this.parseList(doc);
    }

    async search(query, page, filterList) {
        const doc = await this.fetchDoc(BASE_URL + "/page/" + page + "/?s=" + encodeURIComponent(query) + "&post_type=wp-manga");
        return this.parseList(doc);
    }

    toStatus(s) {
        s = (s || "").toLowerCase();
        if (s.includes("ongoing")  || s.includes("مستمرة")  || s.includes("devam")   || s.includes("en cours")  || s.includes("مستمر"))  return 0;
        if (s.includes("completed")|| s.includes("منتهية")  || s.includes("tamamla") || s.includes("complété")  || s.includes("مكتملة")) return 1;
        if (s.includes("hiatus")   || s.includes("متوقفة")  || s.includes("pause"))  return 2;
        if (s.includes("dropped")  || s.includes("cancelled"))                         return 3;
        return 5;
    }

    async getDetail(url) {
        const doc = await this.fetchDoc(url);

        const nameEl = doc.selectFirst(".post-title h1")
            || doc.selectFirst("#manga-title h1")
            || doc.selectFirst(".manga-title");
        const name = nameEl ? nameEl.text.trim() : "";

        const imgEl = doc.selectFirst(".summary_image img");
        const imageUrl = imgEl
            ? (imgEl.attr("data-lazy-src") || imgEl.attr("data-src") || imgEl.attr("src") || "")
            : "";

        let author = "", genre = [], status = 5;

        for (const item of doc.select(".post-content_item, .post-content")) {
            const label = (item.selectFirst("h5")?.text || "").trim().toLowerCase();
            const val   = item.selectFirst(".summary-content");
            if (!val) continue;
            if (label.includes("genre") || label.includes("tag") || label.includes("kategori") || label.includes("التصنيف")) {
                genre = val.select("a").map(a => a.text.trim()).filter(Boolean);
            } else if (label.includes("author") || label.includes("مؤلف") || label.includes("autor") || label.includes("yazar") || label.includes("auteur")) {
                author = val.text.trim();
            } else if (label.includes("status") || label.includes("حالة") || label.includes("estado") || label.includes("durum") || label.includes("statut")) {
                status = this.toStatus(val.text);
            }
        }

        if (!genre.length) {
            const gc = doc.selectFirst(".genres-content");
            if (gc) genre = gc.select("a").map(a => a.text.trim()).filter(Boolean);
        }
        if (!author) {
            const au = doc.selectFirst(".manga-author a") || doc.selectFirst(".artist-content a");
            if (au) author = au.text.trim();
        }

        const description = (
            doc.selectFirst("div.summary__content") ||
            doc.selectFirst("#tab-manga-about") ||
            doc.selectFirst(".manga-excerpt")
        )?.text.trim() || "";

        // Try new chapter endpoint first, fall back to admin-ajax
        let chapBody = "";
        try {
            const r = await new Client().post(url.replace(/\/$/, "") + "/ajax/chapters/", this.getHeaders(url), "");
            if (r.body && r.body !== "0" && r.body.length > 10) chapBody = r.body;
        } catch (_) {}

        if (!chapBody) {
            try {
                const mangaId = doc.selectFirst(".rating-post-id")?.attr("value")
                    || doc.selectFirst("#manga-chapters-holder")?.attr("data-id") || "";
                if (mangaId) {
                    const r = await new Client().post(
                        BASE_URL + "/wp-admin/admin-ajax.php",
                        { ...this.getHeaders(url), "Content-Type": "application/x-www-form-urlencoded" },
                        "action=manga_get_chapters&manga=" + mangaId
                    );
                    if (r.body && r.body !== "0" && r.body.length > 10) chapBody = r.body;
                }
            } catch (_) {}
        }

        const chapDoc = chapBody ? new Document(chapBody) : doc;
        const chapters = [];
        for (const ch of chapDoc.select(".wp-manga-chapter")) {
            const a = ch.selectFirst("a");
            if (!a) continue;
            const chapName = a.text.trim();
            const chapUrl  = a.attr("href") || "";
            const dateEl   = ch.selectFirst(".chapter-release-date i") || ch.selectFirst(".chapter-release-date");
            const dateUpload = dateEl ? String(new Date(dateEl.text.trim()).valueOf()) : "";
            chapters.push({ name: chapName, url: chapUrl, dateUpload });
        }

        return { name, imageUrl, author, genre, status, description, chapters: chapters.reverse() };
    }

    async getHtmlContent(name, url) {
        const doc = await this.fetchDoc(url);
        const content = doc.selectFirst(".text-left")
            || doc.selectFirst(".text-right")
            || doc.selectFirst(".entry-content")
            || doc.selectFirst(".c-blog-post > div > div:nth-child(2)");
        return content ? content.outerHtml : "";
    }

    async cleanHtmlContent(html) { return html; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}
