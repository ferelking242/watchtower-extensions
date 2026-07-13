const watchtowerSources = [{
    "name": "LyokoPlay",
    "langs": ["fr"],
    "ids": { "fr": 1946070001 },
    "baseUrl": "https://www.lyokoplay.fr",
    "apiUrl": "https://www.lyokoplay.fr",
    "iconUrl": "https://www.lyokoplay.fr/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.0.0",
    "pkgPath": "watch/fr/lyokoplay.js",
    "editableBaseUrl": false,
    "hasCloudflare": false,
    "videoQualities": ["AUTO"],
    "subCategories": ["anime", "kids"],
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "hasSubtitles": false,
    "hasDub": false,
    "notes": "Streaming officiel et gratuit de Code Lyoko (Genèse + Saisons 1-4) et Code Lyoko Evolution, propose par le C.R.C.L."
}];

const BASE_URL = "https://www.lyokoplay.fr";

// Catalogue statique : le site n'a pas de moteur de recherche ni de pagination,
// la structure (Genese + 4 saisons Code Lyoko + 1 saison Code Lyoko Evolution) est fixe.
const SERIES = [
    {
        name: "Code Lyoko - Genèse",
        link: BASE_URL + "/code-lyoko/genese/",
        imageUrl: BASE_URL + "/images/posters/code-lyoko-genese-420x561.png"
    },
    {
        name: "Code Lyoko - Saison 1",
        link: BASE_URL + "/code-lyoko/saison-1/",
        imageUrl: BASE_URL + "/images/posters/code-lyoko-saison1-420x561.png"
    },
    {
        name: "Code Lyoko - Saison 2",
        link: BASE_URL + "/code-lyoko/saison-2/",
        imageUrl: BASE_URL + "/images/posters/code-lyoko-saison2-420x561.png"
    },
    {
        name: "Code Lyoko - Saison 3",
        link: BASE_URL + "/code-lyoko/saison-3/",
        imageUrl: BASE_URL + "/images/posters/code-lyoko-saison3-420x561.png"
    },
    {
        name: "Code Lyoko - Saison 4",
        link: BASE_URL + "/code-lyoko/saison-4/",
        imageUrl: BASE_URL + "/images/posters/code-lyoko-saison4-420x561.png"
    },
    {
        name: "Code Lyoko Evolution - Saison 1",
        link: BASE_URL + "/code-lyoko-evolution/saison-1/",
        imageUrl: BASE_URL + "/images/posters/code-lyoko-evolution-420x561.png"
    }
];

class DefaultExtension extends MProvider {
    constructor() { super(); }

    _hdrs(ref) {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": ref || BASE_URL + "/",
            "Accept-Language": "fr-FR,fr;q=0.9"
        };
    }

    _decode(s) {
        return String(s || "")
            .replace(/&amp;/g, "&")
            .replace(/&quot;/g, '"')
            .replace(/&#0?39;/g, "'")
            .replace(/&eacute;/g, "é")
            .replace(/&egrave;/g, "è")
            .trim();
    }

    _abs(url) {
        if (!url) return "";
        if (url.startsWith("http")) return url;
        return BASE_URL + (url.startsWith("/") ? url : "/" + url);
    }

    async getPopular(page) {
        if (page > 1) return { list: [], hasNextPage: false };
        return { list: SERIES, hasNextPage: false };
    }

    async getLatestUpdates(page) {
        return this.getPopular(page);
    }

    async search(query, page, filters) {
        if (page > 1) return { list: [], hasNextPage: false };
        const q = (query || "").toLowerCase().trim();
        const list = q
            ? SERIES.filter(s => s.name.toLowerCase().includes(q))
            : SERIES;
        return { list, hasNextPage: false };
    }

    // Une "chapters" list = liste d'episodes de la saison/genese demandee.
    async getDetail(url) {
        const r = await new Client().get(url, this._hdrs(url));
        const html = r.body;

        const seriesTitleM = html.match(/<h1 class="series-title">([\s\S]*?)<\/h1>/);
        const seasonTitleM = html.match(/<h2 class="season-title">([\s\S]*?)<\/h2>/);
        const seriesTitle = seriesTitleM ? this._decode(seriesTitleM[1].replace(/<[^>]+>/g, "")) : "";
        const seasonTitle = seasonTitleM ? this._decode(seasonTitleM[1].replace(/<[^>]+>/g, "")) : "";
        const name = seasonTitle ? `${seriesTitle} - ${seasonTitle}` : seriesTitle;

        const descM = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)
            || html.match(/<p class="season-synopsis">([\s\S]*?)<\/p>/);
        const description = descM ? this._decode(descM[1].replace(/<[^>]+>/g, "")) : "";

        const imgM = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
        const matched = SERIES.find(s => s.link === url);
        const imageUrl = matched ? matched.imageUrl : (imgM ? imgM[1] : "");

        const chapters = [];
        const epRe = /<li class="episode-box">\s*<a href="([^"]+)"[^>]*>[\s\S]*?<h3 class="episode-box-title">([\s\S]*?)<\/h3>/gi;
        let m;
        while ((m = epRe.exec(html)) !== null) {
            const epUrl = this._abs(m[1]);
            const title = this._decode(
                m[2].replace(/<br\s*\/?>/gi, " - ").replace(/<[^>]+>/g, "")
            );
            chapters.push({ name: title, url: epUrl });
        }

        return { name, imageUrl, description, chapters };
    }

    // Extrait la video YouTube (officielle, embed youtube-nocookie) de la page episode.
    async getVideoList(url) {
        const r = await new Client().get(url, this._hdrs(url));
        const html = r.body;
        const videos = [];

        const ifRe = /<iframe[^>]+src="([^"]+)"/gi;
        let m;
        while ((m = ifRe.exec(html)) !== null) {
            let src = m[1];
            if (src.startsWith("//")) src = "https:" + src;
            if (!src.includes("youtube")) continue;

            const idM = src.match(/embed\/([a-zA-Z0-9_-]{6,})/);
            const watchUrl = idM
                ? `https://www.youtube.com/watch?v=${idM[1]}`
                : src;

            videos.push({ url: watchUrl, quality: "AUTO", headers: this._hdrs(url) });
        }

        return videos;
    }

    getForYou(page) {
        return this.getPopular(page);
    }

    getComments(url, page) {
        return Promise.resolve([]);
    }
}
