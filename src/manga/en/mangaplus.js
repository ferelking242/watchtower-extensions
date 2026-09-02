const watchtowerSources = [{
    "name": "MANGA Plus by SHUEISHA",
    "lang": "en",
    "baseUrl": "https://mangaplus.shueisha.co.jp",
    "apiUrl": "https://jumpg-webapi.tokyo-cdn.com",
    "iconUrl": "https://mangaplus.shueisha.co.jp/favicon.ico",
    "typeSource": "single",
    "itemType": 0,
    "version": "1.1.0",
    "pkgPath": "manga/src/en/mangaplus.js",
    "notes": "MANGA Plus — source officielle Shueisha (One Piece, JJK, MHA, Chainsaw Man...)"
}];

const BASE_URL = "https://mangaplus.shueisha.co.jp";
const API_URL = "https://jumpg-webapi.tokyo-cdn.com";

class DefaultExtension extends MProvider {
    constructor() {
        super();
    }

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": `${BASE_URL}/`,
            "Origin": BASE_URL
        };
    }

    async apiGet(path) {
        const url = `${API_URL}${path}`;
        const res = await new Client().get(url, this.getHeaders());
        return JSON.parse(res.body);
    }

    mangaFromItem(item) {
        const title = item.title || item.seriesName || "";
        const id = item.seriesId || item.titleId || "";
        let imageUrl = "";
        if (item.jumpThumbnailUrl) {
            imageUrl = item.jumpThumbnailUrl;
        } else if (item.thumbnailUrl) {
            imageUrl = item.thumbnailUrl;
        } else if (item.titleThumbnailUrl) {
            imageUrl = item.titleThumbnailUrl;
        }
        return { name: title, imageUrl, link: String(id) };
    }

    async getPopular(page) {
        const data = await this.apiGet("/web/7.0.5/title_list/all?format=json");
        const titles = data?.titleList?.all?.titleList || data?.titleList || [];
        const list = titles.slice(0 + (page - 1) * 50, page * 50).map(t => this.mangaFromItem(t));
        return { list, hasNextPage: list.length >= 50 };
    }

    async getLatestUpdates(page) {
        const data = await this.apiGet("/web/7.0.5/title_list/all?format=json");
        const titles = data?.titleList?.all?.titleList || [];
        const list = titles.slice(0 + (page - 1) * 50, page * 50).map(t => this.mangaFromItem(t));
        return { list, hasNextPage: list.length >= 50 };
    }

    async search(query, page, filters) {
        if (!query || !query.trim()) return this.getPopular(page);
        const data = await this.apiGet(`/web/7.0.5/search?keyword=${encodeURIComponent(query)}&format=json`);
        const titles = data?.titles || [];
        const list = titles.map(t => this.mangaFromItem(t));
        return { list, hasNextPage: false };
    }

    async getDetail(url) {
        const seriesId = url;
        const data = await this.apiGet(`/web/7.0.5/title_detail?titleId=${seriesId}&format=json`);
        const detail = data?.title || {};

        const name = detail.title || "";
        const description = detail.overview || "";
        const imageUrl = detail.heroThumbnailUrl || detail.thumbnailUrl || "";
        const author = detail.author || "";

        const genres = [];
        if (detail.genre) genres.push(detail.genre);
        if (detail.rating) genres.push(`Rating: ${detail.rating}`);
        if (detail.commentsCount) genres.push(`${detail.commentsCount} comments`);

        const status = detail.isSubscribed ? 0 : (detail.status === "COMPLETED" ? 1 : 0);

        const chapters = [];
        const episodeList = detail.episodeList || [];
        for (const ep of episodeList) {
            chapters.push({
                name: ep.episodeTitle || `Ch. ${ep.episodeId}`,
                url: `${seriesId}/${ep.episodeId}`,
                dateUpload: ep.startTimestamp ? String(ep.startTimestamp) : "",
                scanlator: "Official"
            });
        }

        return { name, description, imageUrl, author, genre: genres, status, chapters };
    }

    async getPageList(url) {
        const parts = url.split("/");
        const episodeId = parts[parts.length - 1];
        const data = await this.apiGet(`/web/7.0.5/episode?episodeId=${episodeId}&format=json`);
        const pages = data?.episode?.pageList || [];
        return pages.map(p => ({
            url: p.imageUrl || p.url,
            headers: this.getHeaders()
        }));
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
                key: "default_lang",
                listPreference: {
                    title: "Langue par défaut",
                    summary: "Langue d'affichage des titres et descriptions du manga",
                    valueIndex: 0,
                    entries: ["Anglais (recommandé)", "Français", "Espagnol", "Automatique"],
                    entryValues: ["en", "fr", "es", "auto"]
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
