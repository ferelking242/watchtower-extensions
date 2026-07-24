const watchtowerSources = [{
    "name": "NovelLib",
    "lang": "en",
    "baseUrl": "https://novelib.com",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/lnreader/lnreader-plugins/plugins/v3.0.0/public/static/multisrc/fictioneer/novelib/icon.png",
    "typeSource": "single",
    "isManga": false,
    "itemType": 2,
    "version": "1.0.0",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "novel/src/en/novelib.js",
    "notes": "",
    "sourceCodeLanguage": 1,
    "appMinVerReq": "0.5.0"
}];

const BASE_URL = "https://novelib.com";

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
        for (const card of doc.select(".card-list article, .stories article, article.post")) {
            const a = card.selectFirst("a.card__title, h2 a, h3 a, a[rel='bookmark']");
            if (!a) continue;
            const name = a.text.trim() || card.selectFirst("h2, h3")?.text.trim() || "";
            const link = a.attr("href") || a.getHref || "";
            const img  = card.selectFirst("img");
            const imageUrl = img ? (img.attr("src") || img.attr("data-src") || "") : "";
            if (name && link) list.push({ name, link, imageUrl });
        }
        const hasNextPage = !!doc.selectFirst(".pagination .next, a.next_page, a[rel='next']");
        return { list, hasNextPage };
    }

    async getPopular(page) {
        const doc = await this.fetchDoc(BASE_URL + "/?paged=" + page + "&post_type=fcn_story&orderby=comment_count");
        return this.parseList(doc);
    }

    async getLatestUpdates(page) {
        const doc = await this.fetchDoc(BASE_URL + "/?paged=" + page + "&post_type=fcn_story&orderby=date");
        return this.parseList(doc);
    }

    async search(query, page, filterList) {
        const doc = await this.fetchDoc(BASE_URL + "/?s=" + encodeURIComponent(query) + "&post_type=fcn_story&paged=" + page);
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

        const name = doc.selectFirst("h1.story__title, h1.entry-title, article h1")?.text.trim() || "";
        const imgEl = doc.selectFirst(".story__thumbnail img, .story__cover img, .post-thumbnail img");
        const imageUrl = imgEl ? (imgEl.attr("src") || imgEl.attr("data-src") || "") : "";

        const description = doc.selectFirst(".story__summary, .story__description, .summary p")?.text.trim() || "";
        const author = doc.selectFirst(".story__author a, .author a")?.text.trim() || "";
        const statusEl = doc.selectFirst(".story__status, .status");
        const status = this.toStatus(statusEl?.text || "");
        const genre = doc.select(".story__genres a, .tags a, .genre a").map(a => a.text.trim()).filter(Boolean);

        const chapters = [];
        for (const li of doc.select("ol.chapter-list li, .chapters li, .chapter-group li")) {
            const a = li.selectFirst("a");
            if (!a) continue;
            const chapName = a.text.trim();
            const chapUrl  = a.attr("href") || a.getHref || "";
            const dateEl   = li.selectFirst("time, .chapter-date");
            const dateUpload = dateEl
                ? String(new Date(dateEl.attr("datetime") || dateEl.text.trim()).valueOf())
                : "";
            if (chapName && chapUrl) chapters.push({ name: chapName, url: chapUrl, dateUpload });
        }

        return { name, imageUrl, author, genre, status, description, chapters };
    }

    async getHtmlContent(name, url) {
        const doc = await this.fetchDoc(url);
        const content = doc.selectFirst(".chapter-content, .entry-content, .fcn-chapter-content");
        return content ? content.outerHtml : "";
    }

    async cleanHtmlContent(html) { return html; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}
