const watchtowerSources = [{
    "name": "AniDoor",
    "lang": "en",
    "baseUrl": "https://anidoor.to",
    "apiUrl": "https://anidoor.to",
    "iconUrl": "https://anidoor.to/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "0.1.0",
    "pkgPath": "anime/src/en/anidoor.js",
    "notes": "AniDoor — anime streaming sub & dub",
    "editableBaseUrl": true
}];

const BASE_URL = "https://anidoor.to";

class DefaultExtension extends MProvider {
    constructor() { super(); }
    getBaseUrl() { return new SharedPreferences().get("base_url") || BASE_URL; }
    getHeaders() {
        return { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36", "Referer": `${this.getBaseUrl()}/` };
    }
    parseAnimeList(html) {
        const list = [], seen = {};
        const re = /<a[^>]+href="(\/[^"#]+)"[^>]*>[\s\S]*?<img[^>]+(?:src|data-src)="([^"]+)"[\s\S]*?alt="([^"]+)"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            if (!seen[m[1]] && !m[1].includes("/genre")) {
                seen[m[1]] = true;
                list.push({ link: m[1], imageUrl: m[2], name: m[3].trim() });
            }
        }
        return list;
    }
    async getPopular(page) {
        const res = await new Client().get(`${this.getBaseUrl()}/popular?page=${page}`, this.getHeaders());
        return { list: this.parseAnimeList(res.body), hasNextPage: res.body.includes(`page=${page + 1}`) };
    }
    async getLatestUpdates(page) {
        const res = await new Client().get(`${this.getBaseUrl()}/recently-updated?page=${page}`, this.getHeaders());
        return { list: this.parseAnimeList(res.body), hasNextPage: res.body.includes(`page=${page + 1}`) };
    }
    async search(query, page, filters) {
        if (!query) return this.getPopular(page);
        const res = await new Client().get(`${this.getBaseUrl()}/search?keyword=${encodeURIComponent(query)}&page=${page}`, this.getHeaders());
        return { list: this.parseAnimeList(res.body), hasNextPage: res.body.includes(`page=${page + 1}`) };
    }
    async getDetail(url) {
        const fullUrl = url.startsWith("http") ? url : `${this.getBaseUrl()}${url}`;
        const res = await new Client().get(fullUrl, this.getHeaders());
        const html = res.body;
        const nameM = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || html.match(/<h2[^>]*>([^<]+)<\/h2>/i);
        const name = nameM ? nameM[1].trim() : "";
        const descM = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
        const description = descM ? descM[1].replace(/<[^>]+>/g, "").trim() : "";
        const imgM = html.match(/<img[^>]+src="([^"]+)"/i);
        const imageUrl = imgM ? imgM[1] : "";
        const episodes = [];
        const epRe = /href="(\/[^"]*ep[^"]*)"[^>]*>\s*(?:Episode\s*)?(\d+)/gi;
        let em;
        while ((em = epRe.exec(html)) !== null) { episodes.push({ name: `Episode ${em[2]}`, url: em[1], dateUpload: "" }); }
        return { name, description, imageUrl, genres: [], status: 0, chapters: episodes };
    }
    async getVideoList(url) {
        const fullUrl = url.startsWith("http") ? url : `${this.getBaseUrl()}${url}`;
        const res = await new Client().get(fullUrl, this.getHeaders());
        const html = res.body;
        const videos = [];
        const iframeRe = /<iframe[^>]+src="(https?:\/\/[^"]+)"/gi;
        let m;
        while ((m = iframeRe.exec(html)) !== null) { videos.push({ url: m[1], quality: "Auto", originalUrl: m[1] }); }
        const vidRe = /(?:file|source|src)\s*[:=]\s*["'](https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)/gi;
        while ((m = vidRe.exec(html)) !== null) { videos.push({ url: m[1], quality: "Auto", originalUrl: m[1] }); }
        return videos;
    }
    getFilterList() { return []; }
    getSourcePreferences() {
        return [{ key: "base_url", editTextPreference: { title: "Site URL", summary: "Base URL", value: BASE_URL, dialogTitle: "Base URL", dialogMessage: `Current: ${BASE_URL}` } }];
    }
}
