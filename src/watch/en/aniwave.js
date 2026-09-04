const watchtowerSources = [{
    "name": "AniWave",
    "lang": "en",
    "baseUrl": "https://aniwave.to",
    "apiUrl": "https://aniwave.to",
    "iconUrl": "https://aniwave.to/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "0.1.0",
    "pkgPath": "anime/src/en/aniwave.js",
    "notes": "AniWave — anime streaming with sub & dub",
    "editableBaseUrl": true
}];

const BASE_URL = "https://aniwave.to";

class DefaultExtension extends MProvider {
    constructor() { super(); }

    getBaseUrl() {
        return new SharedPreferences().get("base_url") || BASE_URL;
    }

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            "Referer": `${this.getBaseUrl()}/`,
            "X-Requested-With": "XMLHttpRequest"
        };
    }

    parseAnimeList(html) {
        const list = [];
        const seen = {};

        // Pattern: film-poster container
        const re = /<a[^>]+href="(\/watch\/[^"?#]+)"[^>]*>[\s\S]*?<img[^>]+(?:src|data-src|data-lazy-src)="([^"]+)"[\s\S]*?<\/a>[\s\S]*?<(?:h3|div)[^>]*class="[^"]*(?:film-name|anime-name)[^"]*"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            if (!seen[m[1]]) {
                seen[m[1]] = true;
                list.push({ link: m[1], imageUrl: m[2], name: m[3].trim() });
            }
        }

        if (list.length === 0) {
            const re2 = /href="(\/watch\/[^"?#]+)"[\s\S]*?<img[^>]+src="([^"]+)"[\s\S]*?<[^>]*>([^<]{3,})<\/(?:a|span|div)>/gi;
            while ((m = re2.exec(html)) !== null) {
                if (!seen[m[1]]) {
                    seen[m[1]] = true;
                    list.push({ link: m[1], imageUrl: m[2], name: m[3].trim() });
                }
            }
        }
        return list;
    }

    async getPopular(page) {
        const res = await new Client().get(`${this.getBaseUrl()}/most-popular?page=${page}`, this.getHeaders());
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

        const nameM = html.match(/<h2[^>]*class="[^"]*film-name[^"]*"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/i);
        const name = nameM ? nameM[1].trim() : "";
        const descM = html.match(/<div[^>]*class="[^"]*film-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        const description = descM ? descM[1].replace(/<[^>]+>/g, "").trim() : "";
        const imgM = html.match(/<img[^>]+class="[^"]*film-poster-img[^"]*"[^>]+src="([^"]+)"/i);
        const imageUrl = imgM ? imgM[1] : "";

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
                    episodes.push({ name: em[2].trim(), url: `/watch/${animeId}?ep=${em[1]}`, dateUpload: "" });
                }
            } catch (e) {}
        }

        return { name, description, imageUrl, genres: [], status: 0, chapters: episodes };
    }

    async getVideoList(url) {
        const epIdM = url.match(/ep=(\d+)/);
        if (!epIdM) return [];
        const epId = epIdM[1];
        const videos = [];

        try {
            const serverRes = await new Client().get(`${this.getBaseUrl()}/ajax/v2/episode/servers?episodeId=${epId}`, this.getHeaders());
            const serverData = JSON.parse(serverRes.body);
            const serverHtml = serverData.html || "";

            const servers = [];
            const sRe = /data-id="(\d+)"[\s\S]*?>([^<]+)<\/li>/gi;
            let sm;
            while ((sm = sRe.exec(serverHtml)) !== null) {
                servers.push({ id: sm[1], name: sm[2].trim() });
            }

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

        return videos;
    }

    getFilterList() { return []; }
    getSourcePreferences() {
        return [{
            key: "base_url",
            editTextPreference: { title: "Site URL", summary: "Base URL of AniWave mirror", value: BASE_URL, dialogTitle: "Base URL", dialogMessage: `Current: ${BASE_URL}` }
        }];
    }
}
