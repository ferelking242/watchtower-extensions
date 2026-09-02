const watchtowerSources = [{
    "name": "Scribble Hub",
    "lang": "en",
    "baseUrl": "https://www.scribblehub.com",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/lnreader/lnreader-plugins/plugins/v3.0.0/public/static/src/en/scribblehub/icon.png",
    "typeSource": "single",
    "isManga": false,
    "itemType": 2,
    "version": "1.0.1",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "novel/src/en/scribblehub.js",
    "notes": "",
    "sourceCodeLanguage": 1,
    "appMinVerReq": "0.5.0"
}];

const BASE_URL = "https://www.scribblehub.com";

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
        for (const el of doc.select("div.search_main_box, div.novel_item, li.novel_li")) {
            const a = el.selectFirst("div.search_title a, .fic_title a, h2 a");
            if (!a) continue;
            const name     = a.text.trim();
            const link     = a.attr("href") || a.getHref || "";
            const img      = el.selectFirst("img");
            const imageUrl = img ? (img.attr("src") || img.attr("data-src") || "") : "";
            if (name && link) list.push({ name, link, imageUrl });
        }
        const hasNextPage = !!doc.selectFirst("a.next.page-numbers, li.next a");
        return { list, hasNextPage };
    }

    async getPopular(page) {
        const doc = await this.fetchDoc(BASE_URL + "/series-ranking/?order=weekly&pg=" + page);
        return this.parseList(doc);
    }

    async getLatestUpdates(page) {
        const doc = await this.fetchDoc(BASE_URL + "/latest-series/?pg=" + page);
        return this.parseList(doc);
    }

    async search(query, page, filterList) {
        const doc = await this.fetchDoc(BASE_URL + "/?s=" + encodeURIComponent(query) + "&post_type=fictionposts&pg=" + page);
        return this.parseList(doc);
    }

    toStatus(s) {
        s = (s || "").toLowerCase();
        if (s.includes("ongoing"))   return 0;
        if (s.includes("completed")) return 1;
        if (s.includes("hiatus"))    return 2;
        if (s.includes("dropped"))   return 3;
        return 5;
    }

    async getDetail(url) {
        const doc = await this.fetchDoc(url);

        const name = doc.selectFirst("div.fic_title, h1.novel-title")?.text.trim() || "";
        const imgEl = doc.selectFirst("div.novel-cover img, .fic_image img");
        const imageUrl = imgEl ? (imgEl.attr("src") || imgEl.attr("data-src") || "") : "";

        const description = doc.selectFirst("div.wi_fic_desc, .summary p")?.text.trim() || "";
        const author = doc.selectFirst("a.auth_name_fic")?.text.trim() || "";
        const statusEl = doc.selectFirst("span.cnt_stat, .fic_stat");
        const status = this.toStatus(statusEl?.text || "");
        const genre = doc.select("a.fic_genre, .fic_genre_h a").map(a => a.text.trim()).filter(Boolean);

        // Chapters via TOC endpoint
        const ficId = url.match(/\/series\/(\d+)\//)?.[1] || "";
        const chapters = [];
        if (ficId) {
            try {
                const r = await new Client().post(
                    BASE_URL + "/wp-admin/admin-ajax.php",
                    { ...this.getHeaders(url), "Content-Type": "application/x-www-form-urlencoded" },
                    "action=wi_getreleases_pagination&pagenum=-1&mypostid=" + ficId
                );
                const cd = new Document(r.body);
                for (const a of cd.select("li a")) {
                    const chapName = a.text.trim();
                    const chapUrl  = a.attr("href") || a.getHref || "";
                    if (chapName && chapUrl) chapters.unshift({ name: chapName, url: chapUrl, dateUpload: "" });
                }
            } catch (_) {}
        }

        return { name, imageUrl, author, genre, status, description, chapters };
    }

    async getHtmlContent(name, url) {
        const doc = await this.fetchDoc(url);
        const content = doc.selectFirst("div.chp_raw, .chapter-content");
        return content ? content.outerHtml : "";
    }

    async cleanHtmlContent(html) { return html; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}
