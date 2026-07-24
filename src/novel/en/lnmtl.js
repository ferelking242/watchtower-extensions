const watchtowerSources = [{
    "name": "LnMTL",
    "lang": "en",
    "baseUrl": "https://lnmtl.com",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/lnreader/lnreader-plugins/plugins/v3.0.0/public/static/src/en/lnmtl/icon.png",
    "typeSource": "single",
    "isManga": false,
    "itemType": 2,
    "version": "1.0.0",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "novel/src/en/lnmtl.js",
    "notes": "",
    "sourceCodeLanguage": 1,
    "appMinVerReq": "0.5.0"
}];

const BASE_URL = "https://lnmtl.com";

class DefaultExtension extends MProvider {
    getHeaders(url) {
        return { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Referer": BASE_URL };
    }

    async fetchDoc(url) {
        const res = await new Client().get(url, this.getHeaders(url));
        return new Document(res.body);
    }

    async fetchJSON(url) {
        const res = await new Client().get(url, { ...this.getHeaders(url), "Accept": "application/json", "X-Requested-With": "XMLHttpRequest" });
        try { return JSON.parse(res.body); } catch (_) { return null; }
    }

    parseList(doc) {
        const list = [];
        for (const el of doc.select(".novel-item, div.novel")) {
            const a = el.selectFirst("a.novel-title, h3 a, h4 a");
            if (!a) continue;
            const name     = a.text.trim();
            const link     = a.attr("href") || a.getHref || "";
            const img      = el.selectFirst("img");
            const imageUrl = img ? (img.attr("src") || img.attr("data-src") || "") : "";
            if (name && link) list.push({ name, link, imageUrl });
        }
        const hasNextPage = !!doc.selectFirst("a.next, .pagination .next");
        return { list, hasNextPage };
    }

    async getPopular(page) {
        const doc = await this.fetchDoc(BASE_URL + "/novel?page=" + page + "&orderBy=views");
        return this.parseList(doc);
    }

    async getLatestUpdates(page) {
        const doc = await this.fetchDoc(BASE_URL + "/novel?page=" + page + "&orderBy=updated");
        return this.parseList(doc);
    }

    async search(query, page, filterList) {
        const doc = await this.fetchDoc(BASE_URL + "/novel?page=" + page + "&filter=" + encodeURIComponent(query));
        return this.parseList(doc);
    }

    async getDetail(url) {
        const doc = await this.fetchDoc(url);

        const name = doc.selectFirst("h1, .novel-title")?.text.trim() || "";
        const imgEl = doc.selectFirst(".novel-cover img, img.thumbnail");
        const imageUrl = imgEl ? (imgEl.attr("src") || imgEl.attr("data-src") || "") : "";

        const description = doc.selectFirst(".novel-synopsis p, .description p")?.text.trim() || "";
        const author  = doc.selectFirst(".novel-info a[href*=author]")?.text.trim() || "";
        const genre   = doc.select(".novel-tags a, .tags a").map(a => a.text.trim()).filter(Boolean);
        const status  = 0;

        // Chapters via API
        const novelId = url.match(/novel\/([^/]+)/)?.[1] || "";
        const chapData = await this.fetchJSON(BASE_URL + "/api/v1/chapter?novel_slug=" + novelId + "&page=1&perPage=9999");
        const chapters = (chapData?.data || []).map(ch => ({
            name: ch.title || "Chapter " + ch.number,
            url:  BASE_URL + "/chapter/" + ch.id,
            dateUpload: ch.created_at ? String(new Date(ch.created_at).valueOf()) : "",
        }));

        return { name, imageUrl, author, genre, status, description, chapters };
    }

    async getHtmlContent(name, url) {
        const chapId = url.split("/chapter/")[1];
        const data = await this.fetchJSON(BASE_URL + "/api/v1/chapter/" + chapId + "/sentences");
        if (data?.sentences) {
            return data.sentences
                .map(s => "<p>" + (s.translated_body || s.body || "") + "</p>")
                .join("\n");
        }
        const doc = await this.fetchDoc(url);
        const content = doc.selectFirst(".chapter-body, .chapter-content");
        return content ? content.outerHtml : "";
    }

    async cleanHtmlContent(html) { return html; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}
