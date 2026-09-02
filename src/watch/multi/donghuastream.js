const watchtowerSources = [{
    "name": "DonghuaStream",
    "lang": "multi",
    "langs": ["en", "zh", "ar"],
    "ids": { "en": 1900000101, "zh": 1900000102, "ar": 1900000103 },
    "baseUrl": "https://donghuastream.com",
    "apiUrl": "",
    "iconUrl": "https://donghuastream.com/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.1.0",
    "pkgPath": "anime/src/multi/donghuastream.js",
    "notes": "DonghuaStream — streaming donghua (anime chinois)"
}];

const BASE_URL = "https://donghuastream.com";

class DefaultExtension extends MProvider {
    constructor() { super(); }

    getHeaders() {
        return { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Referer": `${BASE_URL}/` };
    }

    parseAnimeList(html) {
        const list = [];
        const re = /<a[^>]+href="([^"]+)"[\s\S]*?<img[^>]+(?:src|data-src)="([^"]+)"[\s\S]*?<\/a>[\s\S]*?<h2[^>]*>([^<]+)<\/h2>/g;
        let m; const seen = {};
        while ((m = re.exec(html)) !== null) {
            if (!seen[m[1]]) { seen[m[1]] = 1; list.push({ link: m[1], imageUrl: m[2], name: m[3].trim() }); }
        }
        if (list.length === 0) {
            const re2 = /href="([^"]+)"[\s\S]*?src="([^"]+)"[\s\S]*?alt="([^"]*)"/g;
            while ((m = re2.exec(html)) !== null) {
                if (!seen[m[1]] && m[3].trim() && !m[3].toLowerCase().includes("logo")) {
                    seen[m[1]] = 1; list.push({ link: m[1], imageUrl: m[2], name: m[3].trim() });
                }
            }
        }
        return list;
    }

    async getPopular(page) {
        const res = await new Client().get(`${BASE_URL}/donghua?page=${page}`, this.getHeaders());
        return { list: this.parseAnimeList(res.body), hasNextPage: res.body.includes('page=') };
    }

    async getLatestUpdates(page) {
        const res = await new Client().get(`${BASE_URL}/recently-updated?page=${page}`, this.getHeaders());
        return { list: this.parseAnimeList(res.body), hasNextPage: res.body.includes('page=') };
    }

    async search(query, page, filters) {
        if (!query) return this.getPopular(page);
        const res = await new Client().get(`${BASE_URL}/search?keyword=${encodeURIComponent(query)}&page=${page}`, this.getHeaders());
        return { list: this.parseAnimeList(res.body), hasNextPage: false };
    }

    async getDetail(url) {
        const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
        const res = await new Client().get(fullUrl, this.getHeaders());
        const html = res.body;
        const nameM = html.match(/<h1[^>]*>([^<]+)<\/h1>/) || html.match(/<h2[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/h2>/);
        const name = nameM ? nameM[1].trim() : "";
        const descM = html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/);
        const description = descM ? descM[1].replace(/<[^>]+>/g, "").trim() : "";
        const imgM = html.match(/<img[^>]+class="[^"]*poster[^"]*"[^>]+src="([^"]+)"/);
        const imageUrl = imgM ? imgM[1] : "";

        const episodes = [];
        const epRe = /href="([^"]*episode[^"]*)"[^>]*>([^<]+)<\/a>/g;
        let em;
        while ((em = epRe.exec(html)) !== null) {
            episodes.push({ name: em[2].trim(), url: em[1], dateUpload: "" });
        }

        return { name, description, imageUrl, genres: [], status: 0, chapters: episodes };
    }

    async getVideoList(url) {
        const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
        const res = await new Client().get(fullUrl, this.getHeaders());
        const html = res.body;
        const videos = [];
        const re = /(?:data-src|src)="(https?:\/\/[^"]+(?:embed|player|stream|m3u8)[^"]*)"/g;
        let m;
        while ((m = re.exec(html)) !== null) {
            videos.push({ url: m[1], quality: "Auto", originalUrl: m[1] });
        }
        return videos;
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
                key: "default_quality",
                listPreference: {
                    title: "Qualité vidéo par défaut",
                    summary: "La qualité sélectionnée est prioritaire. Si indisponible, la plus proche est choisie automatiquement.",
                    valueIndex: 0,
                    entries: ["Auto (recommandé)", "1080p — Full HD", "720p — HD", "480p — SD", "360p — Faible"],
                    entryValues: ["AUTO", "1080", "720", "480", "360"]
                }
            },
            {
                key: "quality_fallback",
                listPreference: {
                    title: "Si la qualité n'est pas disponible",
                    summary: "Choisir la qualité la plus proche si celle demandée n'existe pas",
                    valueIndex: 1,
                    entries: ["Prendre la qualité supérieure", "Prendre la qualité inférieure (recommandé)"],
                    entryValues: ["higher", "lower"]
                }
            },
            {
                key: "sub_or_dub",
                listPreference: {
                    title: "Préférence audio",
                    summary: "Choisir entre version sous-titrée (Sub) ou doublée (Dub) quand les deux sont disponibles",
                    valueIndex: 0,
                    entries: ["Sous-titré (Sub) — recommandé", "Doublé (Dub)", "Les deux (Sub puis Dub)"],
                    entryValues: ["sub", "dub", "both"]
                }
            },
            {
                key: "server_preference",
                listPreference: {
                    title: "Serveur prioritaire",
                    summary: "Le serveur choisi est chargé en premier. Les autres serveurs sont utilisés en fallback si celui-ci échoue.",
                    valueIndex: 0,
                    entries: ["Auto (tous les serveurs)", "VidStreaming", "MegaCloud", "Meownstream", "StreamTape"],
                    entryValues: ["auto", "vidstreaming", "megacloud", "meownstream", "streamtape"]
                }
            }
        ];
    }
}
