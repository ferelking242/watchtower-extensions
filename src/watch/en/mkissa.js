const watchtowerSources = [{
    "name": "MKissa",
    "lang": "en",
    "baseUrl": "https://mkissa.com",
    "apiUrl": "https://mkissa.com",
    "iconUrl": "https://mkissa.com/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "0.1.0",
    "pkgPath": "anime/src/en/mkissa.js",
    "notes": "MKissa — free anime streaming sub & dub",
    "editableBaseUrl": true
}];

const BASE_URL = "https://mkissa.com";

class DefaultExtension extends MProvider {
    constructor() { super(); }

    getBaseUrl() {
        return new SharedPreferences().get("base_url") || BASE_URL;
    }

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            "Referer": `${this.getBaseUrl()}/`,
            "Accept-Language": "en-US,en;q=0.9"
        };
    }

    parseAnimeList(html) {
        const list = [];
        const seen = {};
        const re = /<a[^>]+href="(\/[^"]*(?:anime|watch)[^"]*)"[^>]*>[\s\S]*?<img[^>]+(?:src|data-src)="([^"]+)"[\s\S]*?alt="([^"]+)"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            if (!seen[m[1]] && !m[1].includes("/genre") && !m[1].includes("/user")) {
                seen[m[1]] = true;
                list.push({ link: m[1], imageUrl: m[2], name: m[3].trim() });
            }
        }

        // Fallback
        if (list.length === 0) {
            const re2 = /href="(\/[^"]+)"[\s\S]*?<img[^>]+src="([^"]+)"[\s\S]*?title="([^"]+)"/gi;
            while ((m = re2.exec(html)) !== null) {
                if (!seen[m[1]] && (m[1].includes("anime") || m[1].includes("watch"))) {
                    seen[m[1]] = true;
                    list.push({ link: m[1], imageUrl: m[2], name: m[3].trim() });
                }
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

        const nameM = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || html.match(/<h2[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)/i);
        const name = nameM ? nameM[1].trim() : "";

        const descM = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
        const description = descM ? descM[1].replace(/<[^>]+>/g, "").trim() : "";

        const imgM = html.match(/<img[^>]+class="[^"]*(?:poster|cover|anime-img)[^"]*"[^>]+src="([^"]+)"/i);
        const imageUrl = imgM ? imgM[1] : "";

        const genres = [];
        const genreRe = /href="[^"]*\/genre\/([^"?#]+)"/gi;
        let gm;
        while ((gm = genreRe.exec(html)) !== null) {
            genres.push(decodeURIComponent(gm[1]).replace(/-/g, " "));
        }

        const episodes = [];
        const epRe = /<a[^>]+href="(\/[^"]*(?:ep|episode)[^"]*)"[^>]*>\s*([^<]*(?:Episode|Ep\.?|Eps?)\s*\d+[^<]*)<\/a>/gi;
        let em;
        while ((em = epRe.exec(html)) !== null) {
            episodes.push({ name: em[2].trim(), url: em[1], dateUpload: "" });
        }

        if (episodes.length === 0) {
            const epRe2 = /href="(\/watch\/[^"]*ep[^"]*)"[^>]*>\s*(\d+)/gi;
            while ((em = epRe2.exec(html)) !== null) {
                episodes.push({ name: `Episode ${em[2]}`, url: em[1], dateUpload: "" });
            }
        }

        return { name, description, imageUrl, genres, status: 0, chapters: episodes };
    }

    async getVideoList(url) {
        const fullUrl = url.startsWith("http") ? url : `${this.getBaseUrl()}${url}`;
        const res = await new Client().get(fullUrl, this.getHeaders());
        const html = res.body;
        const videos = [];

        const iframeRe = /<iframe[^>]+src="(https?:\/\/[^"]+)"/gi;
        let m;
        while ((m = iframeRe.exec(html)) !== null) {
            videos.push({ url: m[1], quality: "Auto", originalUrl: m[1] });
        }

        const vidRe = /(?:file|source|src)\s*[:=]\s*["'](https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)/gi;
        while ((m = vidRe.exec(html)) !== null) {
            videos.push({ url: m[1], quality: "Auto", originalUrl: m[1] });
        }

        return videos;
    }

    getFilterList() { return []; }
    getSourcePreferences() {
        return [{
            key: "base_url",
            editTextPreference: { title: "Site URL", summary: "Base URL of MKissa mirror", value: BASE_URL, dialogTitle: "Base URL", dialogMessage: `Current: ${BASE_URL}` }
        }];
    }
}
