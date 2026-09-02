const watchtowerSources = [{
    "name": "Karaoke Mugen",
    "lang": "multi",
    "langs": ["ja", "en", "fr", "es", "de", "it", "pt", "zh", "ko", "ru"],
    "ids": {
        "ja": 1000000001, "en": 1000000002, "fr": 1000000003,
        "es": 1000000004, "de": 1000000005, "it": 1000000006,
        "pt": 1000000007, "zh": 1000000008, "ko": 1000000009,
        "ru": 1000000010
    },
    "baseUrl": "https://karaokes.moe",
    "apiUrl": "https://karaokes.moe/api",
    "iconUrl": "https://karaokes.moe/favicon.ico",
    "typeSource": "single",
    "itemType": 3,
    "version": "1.1.0",
    "pkgPath": "music/src/multi/karaoke_mugen.js",
    "notes": "Karaoke Mugen — karaoke anime open/close en multi-langues"
}];

const BASE_URL = "https://karaokes.moe";
const API_URL = "https://karaokes.moe/api";

class DefaultExtension extends MProvider {
    constructor() { super(); }

    getHeaders() {
        return { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Referer": `${BASE_URL}/` };
    }

    async apiGet(path) {
        const lang = this.source.lang || "en";
        const res = await new Client().get(`${API_URL}${path}${path.includes("?") ? "&" : "?"}lang=${lang}`, this.getHeaders());
        return JSON.parse(res.body);
    }

    songFromItem(item) {
        return {
            name: item.name || item.title || "",
            imageUrl: item.songinfo?.cover || item.image || "",
            link: item.id ? String(item.id) : item.url || "",
            author: item.songinfo?.artist || item.artist || "",
            description: item.songinfo?.series || item.series || ""
        };
    }

    async getPopular(page) {
        try {
            const data = await this.apiGet(`/karas?order= popularity&page=${page - 1}&count=30`);
            const items = data?.content || data || [];
            return { list: Array.isArray(items) ? items.map(i => this.songFromItem(i)) : [], hasNextPage: items.length >= 30 };
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    async getLatestUpdates(page) {
        try {
            const data = await this.apiGet(`/karas?order=created_at&page=${page - 1}&count=30`);
            const items = data?.content || data || [];
            return { list: Array.isArray(items) ? items.map(i => this.songFromItem(i)) : [], hasNextPage: items.length >= 30 };
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    async search(query, page, filters) {
        if (!query) return this.getPopular(page);
        try {
            const data = await this.apiGet(`/karas?filter=${encodeURIComponent(query)}&page=${page - 1}&count=30`);
            const items = data?.content || data || [];
            return { list: Array.isArray(items) ? items.map(i => this.songFromItem(i)) : [], hasNextPage: items.length >= 30 };
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    async getDetail(url) {
        try {
            const data = await this.apiGet(`/karas/${url}`);
            const item = data || {};
            return {
                name: item.name || "",
                imageUrl: item.songinfo?.cover || "",
                description: item.songinfo?.series || "",
                author: item.songinfo?.artist || "",
                genre: item.tags?.map(t => t.name || t) || [],
                chapters: [{
                    name: item.name || "Play",
                    url: item.medias?.[0]?.versions?.[0]?.url || `/api/karas/${url}/download`
                }]
            };
        } catch (e) {
            return { name: "", description: "", imageUrl: "", chapters: [] };
        }
    }

    async getVideoList(url) {
        try {
            const downloadUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
            return [{ url: downloadUrl, quality: "Audio", originalUrl: downloadUrl }];
        } catch (e) {
            return [];
        }
    }

    getFilterList() { return []; }

    getSourcePreferences() {
        return [
            {
                key: "base_url",
                editTextPreference: {
                    title: "URL du site",
                    summary: "Adresse du site. Changez si le domaine est migré.",
                    value: BASE_URL,
                    dialogTitle: "URL du site",
                    dialogMessage: "URL actuelle : " + BASE_URL
                }
            },
            {
                key: "chapter_order",
                listPreference: {
                    title: "Ordre des chapitres",
                    summary: "Afficher les chapitres du plus récent au plus ancien, ou l'inverse",
                    valueIndex: 0,
                    entries: ["Plus récents d'abord (recommandé)", "Plus anciens d'abord"],
                    entryValues: ["newest", "oldest"]
                }
            },
            {
                key: "image_quality",
                listPreference: {
                    title: "Qualité des images",
                    summary: "Qualité d'affichage des pages de manga. La haute qualité consomme plus de données.",
                    valueIndex: 0,
                    entries: ["Haute qualité (recommandé)", "Qualité moyenne", "Faible qualité (économie de données)"],
                    entryValues: ["high", "medium", "low"]
                }
            }
        ];
    }
}
