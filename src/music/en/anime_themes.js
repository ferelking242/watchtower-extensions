const watchtowerSources = [{
    "name": "AnimeThemes",
    "lang": "en",
    "baseUrl": "https://animethemes.moe",
    "apiUrl": "https://animethemes.moe/api",
    "iconUrl": "https://animethemes.moe/favicon.ico",
    "typeSource": "single",
    "itemType": 3,
    "version": "1.0.0",
    "pkgPath": "music/src/en/anime_themes.js",
    "notes": "AnimeThemes — base de données OP/ED anime avec vidéos"
}];

const BASE_URL = "https://animethemes.moe";
const API_URL = "https://animethemes.moe/api";

class DefaultExtension extends MProvider {
    constructor() { super(); }

    getHeaders() {
        return { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Referer": `${BASE_URL}/` };
    }

    async apiGet(path) {
        const res = await new Client().get(`${API_URL}${path}`, this.getHeaders());
        return JSON.parse(res.body);
    }

    async getPopular(page) {
        try {
            const data = await this.apiGet(`/anime?page[size]=30&page[number]=${page}&sort=-favorites_count`);
            const anime = data?.anime || [];
            const list = [];
            for (const a of anime) {
                const themes = a.animethemes || [];
                for (const t of themes) {
                    list.push({
                        name: `${a.name} — ${t.type || "OP/ED"} ${t.sequence || ""}`.trim(),
                        imageUrl: a.images?.[0]?.link || "",
                        link: String(t.id || t.slug || ""),
                        author: a.name || "",
                        description: `${t.type || "Theme"} • ${t.group || ""}`
                    });
                }
            }
            return { list: list.slice(0, 30), hasNextPage: anime.length >= 30 };
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    async getLatestUpdates(page) {
        return this.getPopular(page);
    }

    async search(query, page, filters) {
        if (!query) return this.getPopular(page);
        try {
            const data = await this.apiGet(`/search?q=${encodeURIComponent(query)}&limit=30`);
            const results = data?.anime || data?.animetheme || [];
            const list = [];
            const items = Array.isArray(results) ? results : (results?.anime || []);
            for (const a of items) {
                list.push({
                    name: a.name || "",
                    imageUrl: a.images?.[0]?.link || "",
                    link: String(a.id || ""),
                    author: ""
                });
            }
            return { list: list.slice(0, 30), hasNextPage: false };
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    async getDetail(url) {
        try {
            const data = await this.apiGet(`/animetheme/${url}?include=anime,animethemeentries.videos`);
            const theme = data?.animetheme || {};
            const anime = theme.anime || {};
            const entries = theme.animethemeentries || [];
            const videos = [];
            for (const entry of entries) {
                for (const v of (entry.videos || [])) {
                    videos.push({
                        name: `${theme.type || "OP"} — ${v.quality || ""} ${v.nsfw ? "(NSFW)" : ""}`.trim(),
                        url: v.url || "",
                        quality: v.resolution || "1080p"
                    });
                }
            }
            return {
                name: `${anime.name || ""} — ${theme.type || ""} ${theme.sequence || ""}`.trim(),
                imageUrl: anime.images?.[0]?.link || "",
                description: anime.description || "",
                genre: ["Anime", "Music", theme.type || ""],
                chapters: videos.length > 0 ? videos : [{ name: "No video found", url: "" }]
            };
        } catch (e) {
            return { name: "", description: "", imageUrl: "", chapters: [] };
        }
    }

    async getVideoList(url) {
        try {
            const data = await this.apiGet(`/animetheme/${url}?include=animethemeentries.videos`);
            const entries = data?.animetheme?.animethemeentries || [];
            const videos = [];
            for (const entry of entries) {
                for (const v of (entry.videos || [])) {
                    if (v.url) videos.push({ url: v.url, quality: v.resolution || "Auto", originalUrl: v.url });
                }
            }
            return videos;
        } catch (e) {
            return [];
        }
    }

    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}
