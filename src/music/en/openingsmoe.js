const watchtowerSources = [{
    "name": "OpeningsMoe",
    "lang": "en",
    "baseUrl": "https://openings.moe",
    "apiUrl": "https://openings.moe",
    "iconUrl": "https://openings.moe/favicon.ico",
    "typeSource": "single",
    "itemType": 2,
    "version": "0.1.0",
    "pkgPath": "music/en/openingsmoe.js",
    "notes": "OpeningsMoe — anime openings & endings video database",
    "editableBaseUrl": true
}];

const BASE_URL = "https://openings.moe";

class DefaultExtension extends MProvider {
    constructor() { super(); }
    getBaseUrl() { return new SharedPreferences().get("base_url") || BASE_URL; }
    getHeaders() {
        return { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36", "Referer": `${this.getBaseUrl()}/` };
    }
    parseSongList(html) {
        const list = [], seen = {};
        const re = /<a[^>]+href="(\/[^"#]+)"[^>]*>[\s\S]*?<img[^>]+(?:src|data-src)="([^"]+)"[\s\S]*?alt="([^"]+)"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            if (!seen[m[1]]) { seen[m[1]] = true; list.push({ link: m[1], imageUrl: m[2], name: m[3].trim() }); }
        }
        if (list.length === 0) {
            const re2 = /<a[^>]+href="(\/[^"#]+)"[^>]*>([^<]+)<\/a>/gi;
            while ((m = re2.exec(html)) !== null) {
                if (!seen[m[1]] && m[2].trim().length > 2) { seen[m[1]] = true; list.push({ link: m[1], imageUrl: "", name: m[2].trim() }); }
            }
        }
        return list;
    }
    async getPopular(page) {
        const res = await new Client().get(`${this.getBaseUrl()}/api?openings=true`, this.getHeaders());
        try {
            const data = JSON.parse(res.body);
            const list = (data.videos || []).map(v => ({
                link: `/video/${v.file}`,
                imageUrl: v.thumbnail || "",
                name: `${v.title} (${v.source})`
            }));
            const perPage = 20;
            const start = (page - 1) * perPage;
            return { list: list.slice(start, start + perPage), hasNextPage: start + perPage < list.length };
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }
    async getLatestUpdates(page) {
        return this.getPopular(page);
    }
    async search(query, page, filters) {
        if (!query) return this.getPopular(page);
        const res = await new Client().get(`${this.getBaseUrl()}/api?search=${encodeURIComponent(query)}`, this.getHeaders());
        try {
            const data = JSON.parse(res.body);
            const list = (data.videos || []).map(v => ({
                link: `/video/${v.file}`,
                imageUrl: v.thumbnail || "",
                name: `${v.title} (${v.source})`
            }));
            const perPage = 20;
            const start = (page - 1) * perPage;
            return { list: list.slice(start, start + perPage), hasNextPage: start + perPage < list.length };
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }
    async getDetail(url) {
        const name = decodeURIComponent(url.split("/").pop().replace(/\.[^.]+$/, ""));
        const res = await new Client().get(`${this.getBaseUrl()}${url}`, this.getHeaders());
        return { name, description: "", imageUrl: "", genres: [], status: 0, chapters: [{ name, url, dateUpload: "" }] };
    }
    async getVideoList(url) {
        const fileName = decodeURIComponent(url.split("/").pop());
        const videoUrl = `${this.getBaseUrl()}/video/${fileName}`;
        return [{ url: videoUrl, quality: "Original", originalUrl: videoUrl }];
    }
    getFilterList() { return []; }
    getSourcePreferences() {
        return [{ key: "base_url", editTextPreference: { title: "Site URL", summary: "Base URL", value: BASE_URL, dialogTitle: "Base URL", dialogMessage: `Current: ${BASE_URL}` } }];
    }
}
