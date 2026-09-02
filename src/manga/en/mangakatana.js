const watchtowerSources = [{
    "name": "MangaKatana",
    "lang": "en",
    "baseUrl": "https://mangakatana.com",
    "apiUrl": "",
    "iconUrl": "https://mangakatana.com/favicon.ico",
    "typeSource": "single",
    "itemType": 0,
    "version": "1.0.0",
    "pkgPath": "manga/src/en/mangakatana.js"
}];

const BASE_URL = "https://mangakatana.com";

class DefaultExtension extends MProvider {
    constructor() { super(); }

    getHeaders() {
        return { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Referer": `${BASE_URL}/` };
    }

    mangaListParse(html) {
        const list = [];
        const doc = new Document(html);
        const items = doc.select(".manga-item, .item, div[class*='manga']");
        for (const item of items) {
            const aEl = item.selectFirst("a[href]");
            const imgEl = item.selectFirst("img");
            const nameEl = item.selectFirst("h3, h4, .title, .name, a span");
            if (aEl) {
                const link = aEl.getHref || aEl.attr("href") || "";
                const imageUrl = imgEl ? (imgEl.attr("data-src") || imgEl.attr("src") || "") : "";
                const name = nameEl ? nameEl.text.trim() : "";
                if (name && link) list.push({ name, imageUrl, link });
            }
        }
        // Regex fallback
        if (list.length === 0) {
            const re = /href="([^"]+)"[\s\S]*?<img[^>]+(?:src|data-src)="([^"]+)"[\s\S]*?<[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)/g;
            let m; const seen = {};
            while ((m = re.exec(html)) !== null) {
                if (!seen[m[1]]) { seen[m[1]] = 1; list.push({ link: m[1], imageUrl: m[2], name: m[3].trim() }); }
            }
        }
        return list;
    }

    async getPopular(page) {
        const res = await new Client().get(`${BASE_URL}/manga/hot?page=${page}`, this.getHeaders());
        return { list: this.mangaListParse(res.body), hasNextPage: res.body.includes('page=') };
    }

    async getLatestUpdates(page) {
        const res = await new Client().get(`${BASE_URL}/manga/latest?page=${page}`, this.getHeaders());
        return { list: this.mangaListParse(res.body), hasNextPage: res.body.includes('page=') };
    }

    async search(query, page, filters) {
        if (!query) return this.getPopular(page);
        const res = await new Client().get(`${BASE_URL}/?q=${encodeURIComponent(query)}`, this.getHeaders());
        return { list: this.mangaListParse(res.body), hasNextPage: false };
    }

    async getDetail(url) {
        const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
        const res = await new Client().get(fullUrl, this.getHeaders());
        const html = res.body;
        const doc = new Document(html);
        const name = doc.selectFirst("h1, .story-name, .manga-name")?.text?.trim() || "";
        const description = doc.selectFirst("meta[name='description']")?.attr("content") || "";
        const imageUrl = doc.selectFirst("img.story-cover, img[class*='cover']")?.getSrc || "";
        const genre = []; doc.select(".genres a, .tag a, a[href*='genre']").forEach(a => { const g = a.text.trim(); if (g) genre.push(g); });
        const statusText = doc.selectFirst(".status, .manga-status")?.text?.trim()?.toLowerCase() || "";
        const status = statusText.includes("completed") ? 1 : statusText.includes("hiatus") ? 2 : 0;
        const chapters = [];
        doc.select("a[href*='chapter'], li a[href*='/']").forEach(a => {
            const chName = a.text.trim();
            if (chName && (chName.toLowerCase().includes("chapter") || chName.toLowerCase().includes("ch."))) {
                chapters.push({ name: chName, url: a.getHref || a.attr("href") || "" });
            }
        });
        return { name, description, imageUrl, genre, status, chapters };
    }

    async getPageList(url) {
        const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
        const res = await new Client().get(fullUrl, this.getHeaders());
        const doc = new Document(res.body);
        const pages = [];
        doc.select("img[data-src], img.chapter-img, .chapter-content img").forEach(img => {
            const src = img.attr("data-src") || img.attr("src") || "";
            if (src && !src.includes("logo") && !src.includes("icon")) pages.push(src);
        });
        return pages.map(p => ({ url: p, headers: this.getHeaders() }));
    }

    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}
