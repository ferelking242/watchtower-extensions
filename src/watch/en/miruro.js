const watchtowerSources = [{
    "name": "Miruro",
    "lang": "en",
    "baseUrl": "https://miruro.tv",
    "apiUrl": "https://miruro.tv",
    "iconUrl": "https://miruro.tv/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "0.1.0",
    "pkgPath": "anime/src/en/miruro.js",
    "notes": "Miruro — anime streaming with subs, dubs, and auto-next",
    "editableBaseUrl": true
}];

const BASE_URL = "https://miruro.tv";

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

        // Pattern 1: poster links with img + title
        const re1 = /<a[^>]+href="(\/watch\/[^"?#]+)"[^>]*>[\s\S]*?<img[^>]+(?:src|data-src|data-lazy-src)="([^"]+)"[\s\S]*?<\/a>[\s\S]*?(?:<h3|class="[^"]*title[^"]*")[^>]*>\s*(?:<a[^>]*>)?([^<]+)/gi;
        let m;
        while ((m = re1.exec(html)) !== null) {
            if (!seen[m[1]]) {
                seen[m[1]] = true;
                list.push({ link: m[1], imageUrl: m[2], name: m[3].trim() });
            }
        }

        // Pattern 2: generic card links
        if (list.length === 0) {
            const re2 = /href="(\/watch\/([^"?#]+))"[^>]*>[\s\S]*?<img[^>]+(?:src|data-src)="([^"]+)"[\s\S]*?alt="([^"]+)"/gi;
            while ((m = re2.exec(html)) !== null) {
                if (!seen[m[1]]) {
                    seen[m[1]] = true;
                    list.push({ link: m[1], imageUrl: m[3], name: m[4].trim() });
                }
            }
        }

        // Pattern 3: any /watch/ link with image
        if (list.length === 0) {
            const re3 = /<div[^>]*class="[^"]*(?:card|item|poster)[^"]*"[^>]*>[\s\S]*?href="(\/watch\/[^"]+)"[\s\S]*?<img[^>]+src="([^"]+)"[\s\S]*?title="([^"]+)"/gi;
            while ((m = re3.exec(html)) !== null) {
                if (!seen[m[1]]) {
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

        const descM = html.match(/<p[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
                       html.match(/<div[^>]*class="[^"]*synopsis[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        const description = descM ? descM[1].replace(/<[^>]+>/g, "").trim() : "";

        const imgM = html.match(/<img[^>]+class="[^"]*poster[^"]*"[^>]+src="([^"]+)"/i) ||
                     html.match(/<img[^>]+class="[^"]*cover[^"]*"[^>]+src="([^"]+)"/i);
        const imageUrl = imgM ? imgM[1] : "";

        const genresM = html.match(/class="[^"]*genres[^"]*"[^>]*>([\s\S]*?)<\/(?:div|ul)>/i);
        const genres = genresM ? genresM[1].replace(/<[^>]+>/g, "").split(",").map(g => g.trim()).filter(Boolean) : [];

        const episodes = [];
        const epSectionM = html.match(/class="[^"]*episode[^"]*list[^"]*"[^>]*>([\s\S]*?)(?:<\/div>\s*<\/div>|class="[^"]*(?:footer|detail)[^"]*")/i);
        if (epSectionM) {
            const epRe = /<a[^>]+href="([^"]+)"[^>]*>\s*([^<]*(?:Episode|Ep\.?|Eps?)[^<]*)<\/a>/gi;
            let em;
            while ((em = epRe.exec(epSectionM[1])) !== null) {
                episodes.push({
                    name: em[2].trim(),
                    url: em[1].startsWith("http") ? new URL(em[1]).pathname : em[1],
                    dateUpload: ""
                });
            }
        }

        // Fallback: any /watch/ links with episode info
        if (episodes.length === 0) {
            const epRe2 = /href="(\/watch\/[^"]*ep[^"]*)"[^>]*>\s*(?:<[^>]+>)*\s*(?:Episode\s*)?(\d+(?:\.\d+)?)/gi;
            let em2;
            while ((em2 = epRe2.exec(html)) !== null) {
                episodes.push({
                    name: `Episode ${em2[2]}`,
                    url: em2[1],
                    dateUpload: ""
                });
            }
        }

        return { name, description, imageUrl, genres, status: 0, chapters: episodes };
    }

    async getVideoList(url) {
        const fullUrl = url.startsWith("http") ? url : `${this.getBaseUrl()}${url}`;
        const res = await new Client().get(fullUrl, this.getHeaders());
        const html = res.body;
        const videos = [];

        // Extract embedded video sources
        const iframeRe = /<iframe[^>]+src="(https?:\/\/[^"]+)"/gi;
        let m;
        while ((m = iframeRe.exec(html)) !== null) {
            videos.push({ url: m[1], quality: "Auto", originalUrl: m[1] });
        }

        // Extract direct video sources
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
            editTextPreference: {
                title: "Site URL",
                summary: "Base URL of Miruro mirror",
                value: BASE_URL,
                dialogTitle: "Base URL",
                dialogMessage: `Current: ${BASE_URL}`
            }
        }];
    }
}
