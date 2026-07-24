const watchtowerSources = [{
    "name": "dilar tube",
    "lang": "ar",
    "baseUrl": "https://golden.rest",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/lnreader/lnreader-plugins/plugins/v3.0.0/public/static/src/ar/dilartube/icon.png",
    "typeSource": "single",
    "isManga": false,
    "itemType": 2,
    "version": "1.0.0",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "novel/src/ar/dilartube.js",
    "notes": "",
    "sourceCodeLanguage": 1,
    "appMinVerReq": "0.5.0"
}];

const BASE_URL = "https://golden.rest";

class DefaultExtension extends MProvider {
    getHeaders(url) {
        return { "User-Agent": "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36", "Accept": "application/json" };
    }

    async fetchJSON(url) {
        const res = await new Client().get(url, this.getHeaders(url));
        try { return JSON.parse(res.body); } catch (_) { return null; }
    }

    async getPopular(page) {
        const data = await this.fetchJSON(BASE_URL + "/api/releases?page=" + page);
        const seen = new Set(), list = [];
        for (const rel of (data?.releases || [])) {
            const m = rel.manga;
            if (!m || !m.is_novel || seen.has(m.title)) continue;
            seen.add(m.title);
            list.push({
                name: m.title || "",
                link: "mangas/" + m.id,
                imageUrl: m.cover ? BASE_URL + "/uploads/manga/cover/" + m.id + "/" + m.cover : "",
            });
        }
        return { list, hasNextPage: list.length >= 10 };
    }

    async getLatestUpdates(page) { return this.getPopular(page); }

    async search(query, page, filterList) {
        const fd = new FormData();
        fd.append("query", query);
        fd.append("includes", '["Manga","Team","Member"]');
        const res  = await new Client().post("https://dilar.tube/api/quick_search", this.getHeaders(""), fd);
        const data = JSON.parse(res.body || "[[]]");
        const list = (data?.[0] || [])
            .filter(r => r.is_novel)
            .map(r => ({
                name: r.title || "",
                link: "mangas/" + r.id,
                imageUrl: r.cover ? BASE_URL + "/uploads/manga/cover/" + r.id + "/" + r.cover : "",
            }));
        return { list, hasNextPage: false };
    }

    async getDetail(url) {
        const data = await this.fetchJSON(BASE_URL + "/api/" + url);
        const rels = await this.fetchJSON(BASE_URL + "/api/" + url + "/releases");
        const s = data?.mangaData || {};

        const name        = s.arabic_title || s.title || "";
        const imageUrl    = s.cover ? BASE_URL + "/uploads/manga/cover/" + s.id + "/" + s.cover : "";
        const author      = (s.authors || [])[0]?.name || "";
        const description = s.summary || "";
        const genre       = Array.from(new Set((s.categories || []).map(c => c.name)));
        const status      = s.story_status === 3 ? 1 : 0;

        const chapters = (rels?.releases || []).map(r => ({
            name: r.title || "Chapter " + r.chapter,
            url:  url + "/" + (s.title || "").replace(/ /g, "-") + "/" + r.chapter,
            dateUpload: r.created_at ? String(new Date(r.created_at).valueOf()) : "",
        })).reverse();

        return { name, imageUrl, author, genre, status, description, chapters };
    }

    async getHtmlContent(name, url) {
        const res = await new Client().get(BASE_URL + "/" + url, this.getHeaders(url));
        const doc = new Document(res.body);
        const raw = doc.selectFirst("script.js-react-on-rails-component")?.text || "{}";
        try {
            const json = JSON.parse(raw);
            const content = json?.readerDataAction?.readerData?.release?.content || "";
            return content.split(/\r?\n/).filter(Boolean).map(l => "<p>" + l.trim() + "</p>").join("\n");
        } catch (_) { return ""; }
    }

    async cleanHtmlContent(html) { return html; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}
