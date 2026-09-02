const watchtowerSources = [{
    "name": "listen.moe",
    "lang": "multi",
    "langs": ["ja", "en", "ko"],
    "ids": { "ja": 1000000101, "en": 1000000102, "ko": 1000000103 },
    "baseUrl": "https://listen.moe",
    "apiUrl": "https://listen.moe",
    "iconUrl": "https://listen.moe/favicon.ico",
    "typeSource": "single",
    "itemType": 3,
    "version": "1.0.0",
    "pkgPath": "music/src/multi/listen_moe.js",
    "notes": "listen.moe — radio anime 24/7 streaming"
}];

const BASE_URL = "https://listen.moe";

class DefaultExtension extends MProvider {
    constructor() { super(); }

    getHeaders() {
        return { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Referer": `${BASE_URL}/` };
    }

    async getPopular(page) {
        try {
            const res = await new Client().get(`${BASE_URL}/api/v2/search/songs?limit=30&sort=popularity`, this.getHeaders());
            const data = JSON.parse(res.body);
            const songs = data?.songs || [];
            return {
                list: songs.map(s => ({
                    name: s.title || "",
                    imageUrl: s.cover ? `${BASE_URL}${s.cover}` : "",
                    link: String(s.id || ""),
                    author: s.artist || "",
                    description: s.source || ""
                })),
                hasNextPage: false
            };
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    async getLatestUpdates(page) {
        try {
            const res = await new Client().get(`${BASE_URL}/api/v2/songs/recent?limit=30`, this.getHeaders());
            const data = JSON.parse(res.body);
            const songs = data?.songs || [];
            return {
                list: songs.map(s => ({
                    name: s.title || "",
                    imageUrl: s.cover ? `${BASE_URL}${s.cover}` : "",
                    link: String(s.id || ""),
                    author: s.artist || "",
                    description: s.source || ""
                })),
                hasNextPage: false
            };
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    async search(query, page, filters) {
        if (!query) return this.getPopular(page);
        try {
            const res = await new Client().get(`${BASE_URL}/api/v2/search/songs?query=${encodeURIComponent(query)}&limit=30`, this.getHeaders());
            const data = JSON.parse(res.body);
            const songs = data?.songs || [];
            return {
                list: songs.map(s => ({
                    name: s.title || "",
                    imageUrl: s.cover ? `${BASE_URL}${s.cover}` : "",
                    link: String(s.id || ""),
                    author: s.artist || ""
                })),
                hasNextPage: false
            };
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    async getDetail(url) {
        return {
            name: "listen.moe Live Stream",
            imageUrl: "https://listen.moe/favicon.ico",
            description: "Radio anime 24/7",
            genre: ["Radio", "Anime", "J-Pop"],
            chapters: [
                { name: "🇯🇵 Japanese Stream", url: "https://listen.moe/stream", quality: "192kbps" },
                { name: "🇰🇷 Korean Stream", url: "https://listen.moe/kpop/stream", quality: "192kbps" }
            ]
        };
    }

    async getVideoList(url) {
        return [{ url: url || "https://listen.moe/stream", quality: "192kbps", originalUrl: url || "https://listen.moe/stream" }];
    }

    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}
