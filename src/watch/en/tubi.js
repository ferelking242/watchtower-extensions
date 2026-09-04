const watchtowerSources = [{
    "name": "Tubi",
    "lang": "en",
    "baseUrl": "https://tubitv.com",
    "apiUrl": "https://tubitv.com",
    "iconUrl": "https://tubitv.com/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "0.1.0",
    "pkgPath": "watch/en/tubi.js",
    "notes": "Tubi — free movies & TV with ads",
    "editableBaseUrl": true
}];

const BASE_URL = "https://tubitv.com";

class DefaultExtension extends MProvider {
    constructor() { super(); }
    getBaseUrl() { return new SharedPreferences().get("base_url") || BASE_URL; }
    getHeaders() {
        return { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36", "Referer": `${this.getBaseUrl()}/`, "Accept-Language": "en-US,en;q=0.9" };
    }
    parseList(html) {
        const list = [], seen = {};
        const re = /<a[^>]+href="(\/[^"#]+)"[^>]*>[\s\S]*?<img[^>]+(?:src|data-src)="([^"]+)"[\s\S]*?alt="([^"]+)"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            if (!seen[m[1]]) { seen[m[1]] = true; list.push({ link: m[1], imageUrl: m[2], name: m[3].trim() }); }
        }
        return list;
    }
    async getPopular(page) {
        const res = await new Client().get(`${this.getBaseUrl()}/home/popular`, this.getHeaders());
        return { list: this.parseList(res.body), hasNextPage: false };
    }
    async getLatestUpdates(page) {
        const res = await new Client().get(`${this.getBaseUrl()}/home/new`, this.getHeaders());
        return { list: this.parseList(res.body), hasNextPage: false };
    }
    async search(query, page, filters) {
        if (!query) return this.getPopular(page);
        const res = await new Client().get(`${this.getBaseUrl()}/search/${encodeURIComponent(query)}`, this.getHeaders());
        return { list: this.parseList(res.body), hasNextPage: false };
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
        return { name, description, imageUrl, genres: [], status: 0, chapters: [{ name, url, dateUpload: "" }] };
    }
    async getVideoList(url) {
        const fullUrl = url.startsWith("http") ? url : `${this.getBaseUrl()}${url}`;
        return [{ url: fullUrl, quality: "Tubi", originalUrl: fullUrl }];
    }
    getFilterList() { return []; }
    getSourcePreferences() {
        return [{ key: "base_url", editTextPreference: { title: "Site URL", summary: "Base URL", value: BASE_URL, dialogTitle: "Base URL", dialogMessage: `Current: ${BASE_URL}` } }];
    }
}
