const watchtowerSources = [{
    "name": "Squidify",
    "lang": "multi",
    "baseUrl": "https://squidify.com",
    "apiUrl": "https://squidify.com",
    "iconUrl": "https://squidify.com/favicon.ico",
    "typeSource": "single",
    "itemType": 2,
    "version": "0.1.0",
    "pkgPath": "music/multi/squidify.js",
    "notes": "Squidify — anime music streaming",
    "editableBaseUrl": true
}];

const BASE_URL = "https://squidify.com";

class DefaultExtension extends MProvider {
    constructor() { super(); }
    getBaseUrl() { return new SharedPreferences().get("base_url") || BASE_URL; }
    getHeaders() {
        return { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36", "Referer": `${this.getBaseUrl()}/`, "Accept-Language": "en-US,en;q=0.9" };
    }
    parseSongList(html) {
        const list = [], seen = {};
        const re = /<a[^>]+href="(\/[^"#]+)"[^>]*>[\s\S]*?<img[^>]+(?:src|data-src)="([^"]+)"[\s\S]*?alt="([^"]+)"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            if (!seen[m[1]]) { seen[m[1]] = true; list.push({ link: m[1], imageUrl: m[2], name: m[3].trim() }); }
        }
        return list;
    }
    async getPopular(page) {
        const res = await new Client().get(`${this.getBaseUrl()}/popular?page=${page}`, this.getHeaders());
        return { list: this.parseSongList(res.body), hasNextPage: res.body.includes(`page=${page + 1}`) };
    }
    async getLatestUpdates(page) {
        const res = await new Client().get(`${this.getBaseUrl()}/latest?page=${page}`, this.getHeaders());
        return { list: this.parseSongList(res.body), hasNextPage: res.body.includes(`page=${page + 1}`) };
    }
    async search(query, page, filters) {
        if (!query) return this.getPopular(page);
        const res = await new Client().get(`${this.getBaseUrl()}/search?keyword=${encodeURIComponent(query)}&page=${page}`, this.getHeaders());
        return { list: this.parseSongList(res.body), hasNextPage: res.body.includes(`page=${page + 1}`) };
    }
    async getDetail(url) {
        const fullUrl = url.startsWith("http") ? url : `${this.getBaseUrl()}${url}`;
        const res = await new Client().get(fullUrl, this.getHeaders());
        const html = res.body;
        const nameM = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        const name = nameM ? nameM[1].trim() : "";
        const descM = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
        const description = descM ? descM[1].replace(/<[^>]+>/g, "").trim() : "";
        const imgM = html.match(/<img[^>]+src="([^"]+)"/i);
        const imageUrl = imgM ? imgM[1] : "";
        return { name, description, imageUrl, genres: [], status: 0, chapters: [{ name, url, dateUpload: "", description, scanlator: "" }] };
    }
    async getVideoList(url) {
        const fullUrl = url.startsWith("http") ? url : `${this.getBaseUrl()}${url}`;
        const res = await new Client().get(fullUrl, this.getHeaders());
        const html = res.body;
        const videos = [];
        const iframeRe = /<iframe[^>]+src="(https?:\/\/[^"]+)"/gi;
        let m;
        while ((m = iframeRe.exec(html)) !== null) { videos.push({ url: m[1], quality: "Auto", originalUrl: m[1] }); }
        return videos;
    }
    getFilterList() { return []; }
    getSourcePreferences() {
        return [{ key: "base_url", editTextPreference: { title: "Site URL", summary: "Base URL", value: BASE_URL, dialogTitle: "Base URL", dialogMessage: `Current: ${BASE_URL}` } }];
    }
}
