const watchtowerSources = [{
    "name": "Archive Of Our Own",
    "lang": "en",
    "baseUrl": "https://archiveofourown.org",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/lnreader/lnreader-plugins/plugins/v3.0.0/public/static/src/en/ao3/icon.png",
    "typeSource": "single",
    "isManga": false,
    "itemType": 2,
    "version": "1.0.0",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "novel/src/en/archiveofourown.js",
    "notes": "",
    "sourceCodeLanguage": 1,
    "appMinVerReq": "0.5.0"
}];

const BASE_URL = "https://archiveofourown.org";

class DefaultExtension extends MProvider {
    getHeaders(url) {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml",
        };
    }

    async fetchDoc(url) {
        const res = await new Client().get(url, this.getHeaders(url));
        return new Document(res.body);
    }

    parseWorkList(doc) {
        const list = [];
        for (const work of doc.select("li.work.blurb")) {
            const a = work.selectFirst("h4.heading a");
            if (!a) continue;
            const name     = a.text.trim();
            const link     = (a.attr("href") || a.getHref || "");
            const imageUrl = "";
            const fullLink = link.startsWith("http") ? link : BASE_URL + link;
            if (name && link) list.push({ name, link: fullLink, imageUrl });
        }
        const hasNextPage = !!doc.selectFirst("li.next a");
        return { list, hasNextPage };
    }

    async getPopular(page) {
        const doc = await this.fetchDoc(BASE_URL + "/works?page=" + page + "&work_search[sort_column]=kudos_count&work_search[sort_direction]=desc");
        return this.parseWorkList(doc);
    }

    async getLatestUpdates(page) {
        const doc = await this.fetchDoc(BASE_URL + "/works?page=" + page + "&work_search[sort_column]=revised_at&work_search[sort_direction]=desc");
        return this.parseWorkList(doc);
    }

    async search(query, page, filterList) {
        const doc = await this.fetchDoc(BASE_URL + "/works?page=" + page + "&work_search[query]=" + encodeURIComponent(query));
        return this.parseWorkList(doc);
    }

    async getDetail(url) {
        const doc = await this.fetchDoc(url + "?view_full_work=true");

        const name = doc.selectFirst("h2.title.heading")?.text.trim() || "";
        const imageUrl = "";
        const author = doc.select("a[rel='author']").map(a => a.text.trim()).join(", ");
        const description = doc.selectFirst("div.summary blockquote")?.text.trim() || "";
        const genre = doc.select("dd.freeform.tags a, dd.fandom.tags a").map(a => a.text.trim()).filter(Boolean);
        const statusEl = doc.selectFirst("dt.status + dd");
        const status = (statusEl?.text || "").toLowerCase().includes("completed") ? 1 : 0;

        const chapters = [];
        for (const opt of doc.select("select#selected_id option")) {
            const chapId   = opt.attr("value") || "";
            const chapName = opt.text.trim();
            const workId   = url.match(/\/works\/(\d+)/)?.[1] || "";
            if (chapId && chapName && workId) {
                chapters.push({
                    name: chapName,
                    url: BASE_URL + "/works/" + workId + "/chapters/" + chapId,
                    dateUpload: "",
                });
            }
        }
        if (!chapters.length) {
            chapters.push({ name: "Full Work", url, dateUpload: "" });
        }

        return { name, imageUrl, author, genre, status, description, chapters };
    }

    async getHtmlContent(name, url) {
        const doc = await this.fetchDoc(url);
        const parts = doc.select("div[role='article'] p, #chapters .userstuff p");
        if (parts.length) return parts.map(p => p.outerHtml).join("\n");
        const content = doc.selectFirst("div.userstuff");
        return content ? content.outerHtml : "";
    }

    async cleanHtmlContent(html) { return html; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}
