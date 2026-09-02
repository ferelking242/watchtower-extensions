const watchtowerSources = [{
    "name": "Dynasty Scans",
    "lang": "en",
    "baseUrl": "https://dynasty-scans.com",
    "apiUrl": "https://dynasty-scans.com",
    "iconUrl": "https://dynasty-scans.com/favicon.ico",
    "typeSource": "single",
    "itemType": 0,
    "version": "1.0.0",
    "pkgPath": "manga/src/en/dynasty.js"
}];

const BASE_URL = "https://dynasty-scans.com";

class DefaultExtension extends MProvider {
    constructor() { super(); }

    getHeaders() {
        return { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Referer": `${BASE_URL}/` };
    }

    async apiGet(path) {
        const res = await new Client().get(`${BASE_URL}${path}`, this.getHeaders());
        return JSON.parse(res.body);
    }

    mangaFromItem(item) {
        const name = item.name || item.tag?.name || "";
        const imageUrl = item.image || (item.tag ? `${BASE_URL}/images/covers/${item.tag?.slug}.jpg` : "");
        const link = item.url || (item.tag ? `/tags/${item.tag?.slug}` : "");
        return { name, imageUrl, link };
    }

    async getPopular(page) {
        const data = await this.apiGet(`/api/releases?page=${page}&sort=-likes_count`);
        const items = data?.releases || [];
        return { list: items.map(i => this.mangaFromItem(i)), hasNextPage: items.length >= 30 };
    }

    async getLatestUpdates(page) {
        const data = await this.apiGet(`/api/releases?page=${page}&sort=-created_at`);
        const items = data?.releases || [];
        return { list: items.map(i => this.mangaFromItem(i)), hasNextPage: items.length >= 30 };
    }

    async search(query, page, filters) {
        if (!query) return this.getPopular(page);
        const data = await this.apiGet(`/api/releases?search=${encodeURIComponent(query)}&page=${page}`);
        const items = data?.releases || [];
        return { list: items.map(i => this.mangaFromItem(i)), hasNextPage: items.length >= 30 };
    }

    async getDetail(url) {
        const apiUrl = url.startsWith("/api") ? url : `/api${url}`;
        const data = await this.apiGet(apiUrl);
        const manga = data?.release || data;
        const name = manga.name || "";
        const description = manga.description || "";
        const imageUrl = manga.image ? `${BASE_URL}${manga.image}` : "";
        const genre = (manga.tags || []).map(t => t.name);
        const author = (manga.authors || []).map(a => a.name).join(", ");
        const artist = (manga.artists || []).map(a => a.name).join(", ");
        const status = manga.status === "Ongoing" ? 0 : manga.status === "Completed" ? 1 : 5;

        const chapters = [];
        const eps = manga.chapters || manga.groups || [];
        for (const ep of eps) {
            chapters.push({
                name: ep.name || `Ch. ${ep.id}`,
                url: ep.url || `/releases/${ep.id}`,
                dateUpload: ep.created_at || ""
            });
        }

        return { name, description, imageUrl, genre, author, artist, status, chapters };
    }

    async getPageList(url) {
        const apiUrl = url.startsWith("/api") ? url : `/api${url}`;
        const data = await this.apiGet(apiUrl);
        const pages = data?.pages || [];
        return pages.map(p => ({
            url: p.url ? `${BASE_URL}${p.url}` : p,
            headers: this.getHeaders()
        }));
    }

    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}
