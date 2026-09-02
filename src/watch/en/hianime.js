const watchtowerSources = [{
    "name": "HiAnime",
    "lang": "en",
    "baseUrl": "https://hianime.to",
    "apiUrl": "",
    "iconUrl": "https://hianime.to/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.1.0",
    "pkgPath": "anime/src/en/hianime.js",
    "notes": "HiAnime — successeur d'AniWave, grand catalogue anime",
    "editableBaseUrl": true,
    "videoQualities": ["AUTO", "1080p", "720p", "480p", "360p"],
    "subCategories": ["sub", "dub"]
}];

const BASE_URL = "https://hianime.to";

class DefaultExtension extends MProvider {
    constructor() { super(); }

    get _pref() {
        return {
            baseUrl:    new SharedPreferences().get("base_url") || BASE_URL,
            quality:    new SharedPreferences().get("default_quality") || "AUTO",
            subOrDub:   new SharedPreferences().get("sub_or_dub") || "sub",
            server:     new SharedPreferences().get("server_preference") || "vidstreaming",
            fallback:   new SharedPreferences().get("quality_fallback") || "lower",
        };
    }

    getBaseUrl() {
        return this._pref.baseUrl;
    }

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            "Referer": `${this.getBaseUrl()}/`,
            "X-Requested-With": "XMLHttpRequest"
        };
    }

    _pickQuality(videos) {
        const pref = this._pref.quality;
        const fb   = this._pref.fallback;
        if (pref === "AUTO" || videos.length === 0) return videos;
        const idx = videos.findIndex(v => (v.quality || "").includes(pref));
        if (idx >= 0) { const [match] = videos.splice(idx, 1); return [match, ...videos]; }
        const nums = videos.map(v => parseInt((v.quality || "0")) || 0);
        const prefNum = parseInt(pref) || 0;
        if (fb === "higher") {
            const hi = nums.findIndex(n => n >= prefNum);
            if (hi >= 0) { const [m] = videos.splice(hi, 1); return [m, ...videos]; }
        } else {
            for (let i = nums.length - 1; i >= 0; i--) {
                if (nums[i] <= prefNum && nums[i] > 0) { const [m] = videos.splice(i, 1); return [m, ...videos]; }
            }
        }
        return videos;
    }

    _sortServers(servers) {
        const pref = this._pref.server;
        const idx = servers.findIndex(s => (s.name || "").toLowerCase().includes(pref));
        if (idx > 0) { const [m] = servers.splice(idx, 1); servers.unshift(m); }
        return servers;
    }

    parseAnimeList(html) {
        const list = [];
        const re = /<a[^>]+href="\/([^"?]+)"[^>]*>[\s\S]*?<img[^>]+(?:src|data-src|data-lazy-src)="([^"]+)"[\s\S]*?<\/a>[\s\S]*?<(?:h3|div)[^>]*class="[^"]*(?:film-name|anime-name)[^"]*"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/g;
        let m; const seen = {};
        while ((m = re.exec(html)) !== null) {
            if (!seen[m[1]]) { seen[m[1]] = 1; list.push({ link: `/${m[1]}`, imageUrl: m[2], name: m[3].trim() }); }
        }
        // Fallback
        if (list.length === 0) {
            const re2 = /href="\/([^"]+)"[\s\S]*?<img[^>]+src="([^"]+)"[\s\S]*?title="([^"]+)"/g;
            while ((m = re2.exec(html)) !== null) {
                if (!seen[m[1]] && !m[1].includes("genre") && !m[1].includes("user")) {
                    seen[m[1]] = 1; list.push({ link: `/${m[1]}`, imageUrl: m[2], name: m[3].trim() });
                }
            }
        }
        return list;
    }

    async getPopular(page) {
        const res = await new Client().get(`${this.getBaseUrl()}/most-popular?page=${page}`, this.getHeaders());
        return { list: this.parseAnimeList(res.body), hasNextPage: res.body.includes('page=') };
    }

    async getLatestUpdates(page) {
        const res = await new Client().get(`${this.getBaseUrl()}/recently-updated?page=${page}`, this.getHeaders());
        return { list: this.parseAnimeList(res.body), hasNextPage: res.body.includes('page=') };
    }

    async search(query, page, filters) {
        if (!query) return this.getPopular(page);
        const res = await new Client().get(`${this.getBaseUrl()}/search?keyword=${encodeURIComponent(query)}&page=${page}`, this.getHeaders());
        return { list: this.parseAnimeList(res.body), hasNextPage: res.body.includes('page=') };
    }

    async getDetail(url) {
        const fullUrl = url.startsWith("http") ? url : `${this.getBaseUrl()}${url}`;
        const res = await new Client().get(fullUrl, this.getHeaders());
        const html = res.body;

        const nameM = html.match(/<h2[^>]*class="[^"]*film-name[^"]*"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/);
        const name = nameM ? nameM[1].trim() : "";
        const descM = html.match(/<div[^>]*class="[^"]*film-description[^"]*"[^>]*>([\s\S]*?)<\/div>/);
        const description = descM ? descM[1].replace(/<[^>]+>/g, "").trim() : "";
        const imgM = html.match(/<img[^>]+class="[^"]*film-poster-img[^"]*"[^>]+src="([^"]+)"/);
        const imageUrl = imgM ? imgM[1] : "";

        // Get anime ID for episodes
        const idM = html.match(/data-id="(\d+)"/);
        const animeId = idM ? idM[1] : "";

        const episodes = [];
        if (animeId) {
            try {
                const epRes = await new Client().get(`${this.getBaseUrl()}/ajax/v2/episode/list/${animeId}`, this.getHeaders());
                const epData = JSON.parse(epRes.body);
                const epHtml = epData.html || "";
                const epRe = /data-id="(\d+)"[\s\S]*?title="([^"]+)"/g;
                let em;
                while ((em = epRe.exec(epHtml)) !== null) {
                    episodes.push({
                        name: em[2].trim(),
                        url: `/watch/${animeId}?ep=${em[1]}`,
                        dateUpload: ""
                    });
                }
            } catch (e) {}
        }

        return { name, description, imageUrl, genres: [], status: 0, chapters: episodes };
    }

    async getVideoList(url) {
        const epIdM = url.match(/ep=(\d+)/);
        if (!epIdM) return [];
        const epId = epIdM[1];
        const pref = this._pref;
        const videos = [];
        try {
            const serverRes = await new Client().get(`${this.getBaseUrl()}/ajax/v2/episode/servers?episodeId=${epId}`, this.getHeaders());
            const serverData = JSON.parse(serverRes.body);
            const serverHtml = serverData.html || "";

            let servers = [];
            const sRe = /data-id="(\d+)"[\s\S]*?>([^<]+)<\/li>/g;
            let sm;
            while ((sm = sRe.exec(serverHtml)) !== null) {
                servers.push({ id: sm[1], name: sm[2].trim() });
            }
            servers = this._sortServers(servers);

            for (const server of servers.slice(0, 5)) {
                try {
                    const srcRes = await new Client().get(`${this.getBaseUrl()}/ajax/v2/episode/sources?id=${server.id}`, this.getHeaders());
                    const srcData = JSON.parse(srcRes.body);
                    if (srcData.link) {
                        videos.push({ url: srcData.link, quality: server.name || "Auto", originalUrl: srcData.link });
                    }
                } catch (e) {}
            }
        } catch (e) {}

        return this._pickQuality(videos);
    }

    getFilterList() { return []; }

    getSourcePreferences() {
        return [
            {
                key: "base_url",
                editTextPreference: {
                    title: "URL du site",
                    summary: "Adresse du site HiAnime. Change automatiquement si le domaine est migré.",
                    value: BASE_URL,
                    dialogTitle: "URL du site",
                    dialogMessage: `URL actuelle : ${BASE_URL}`
                }
            },
            {
                key: "default_quality",
                listPreference: {
                    title: "Qualité vidéo par défaut",
                    summary: "La qualité sélectionnée est prioritaire. Si elle n'est pas disponible, la qualité la plus proche est choisie automatiquement.",
                    valueIndex: 0,
                    entries: ["Auto (recommandé)", "1080p — Full HD", "720p — HD", "480p — SD", "360p — Faible"],
                    entryValues: ["AUTO", "1080", "720", "480", "360"]
                }
            },
            {
                key: "quality_fallback",
                listPreference: {
                    title: "Si la qualité n'est pas disponible",
                    summary: "Choisir la qualité la plus proche si la qualité demandée n'existe pas",
                    valueIndex: 1,
                    entries: ["Prendre la qualité supérieure", "Prendre la qualité inférieure (recommandé)"],
                    entryValues: ["higher", "lower"]
                }
            },
            {
                key: "sub_or_dub",
                listPreference: {
                    title: "Préférence audio",
                    summary: "Choisir entre version sous-titrée (sub) ou doublée (dub) quand les deux sont disponibles",
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
                    entries: ["VidStreaming (recommandé)", "MegaCloud", "Meownstream", "StreamTape", "Auto (tous les serveurs)"],
                    entryValues: ["vidstreaming", "megacloud", "meownstream", "streamtape", "auto"]
                }
            }
        ];
    }
}
