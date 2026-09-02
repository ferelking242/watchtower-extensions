const watchtowerSources = [{
    "name": "Baka-Tsuki",
    "lang": "en",
    "baseUrl": "https://www.baka-tsuki.org",
    "apiUrl": "",
    "iconUrl": "https://www.baka-tsuki.org/favicon.ico",
    "typeSource": "single",
    "itemType": 2,
    "version": "1.0.0",
    "pkgPath": "novel/src/en/baka_tsuki.js",
    "notes": "Baka-Tsuki — plus grande source TL communautaire light novel"
}];

const BASE_URL = "https://www.baka-tsuki.org";

class DefaultExtension extends MProvider {
    constructor() { super(); }

    getHeaders() {
        return { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Referer": `${BASE_URL}/` };
    }

    novelListParse(html) {
        const list = [];
        const re = /<a[^>]+href="\/project\/([^"]+)"[^>]*>[\s\S]*?<\/a>[\s\S]*?<a[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)<\/a>/g;
        let m; const seen = {};
        while ((m = re.exec(html)) !== null) {
            if (!seen[m[1]]) { seen[m[1]] = 1; list.push({ link: `/project/${m[1]}`, imageUrl: "", name: m[2].trim() }); }
        }
        if (list.length === 0) {
            const re2 = /href="\/project\/([^"]+)"[^>]*title="([^"]+)"/g;
            while ((m = re2.exec(html)) !== null) {
                if (!seen[m[1]]) { seen[m[1]] = 1; list.push({ link: `/project/${m[1]}`, imageUrl: "", name: m[2].trim() }); }
            }
        }
        return list;
    }

    async getPopular(page) {
        const res = await new Client().get(`${BASE_URL}/project?order=likes&page=${page}`, this.getHeaders());
        return { list: this.novelListParse(res.body), hasNextPage: res.body.includes('page=') };
    }

    async getLatestUpdates(page) {
        const res = await new Client().get(`${BASE_URL}/project?order=updated&page=${page}`, this.getHeaders());
        return { list: this.novelListParse(res.body), hasNextPage: res.body.includes('page=') };
    }

    async search(query, page, filters) {
        if (!query) return this.getPopular(page);
        const res = await new Client().get(`${BASE_URL}/project?filter=${encodeURIComponent(query)}`, this.getHeaders());
        return { list: this.novelListParse(res.body), hasNextPage: false };
    }

    async getDetail(url) {
        const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
        const res = await new Client().get(fullUrl, this.getHeaders());
        const html = res.body;
        const nameM = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
        const name = nameM ? nameM[1].trim() : "";
        const descM = html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/);
        const description = descM ? descM[1].replace(/<[^>]+>/g, "").trim() : "";
        const genre = [];

        const chapters = [];
        const chRe = /href="(\/project\/[^"]*volume[^"]*chapter[^"]*)"[^>]*>([^<]+)<\/a>/gi;
        let cm;
        while ((cm = chRe.exec(html)) !== null) {
            chapters.push({ name: cm[2].trim(), url: cm[1] });
        }

        return { name, description, imageUrl: "", genre, status: 0, chapters };
    }

    async getHtmlContent(name, url) {
        const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
        const res = await new Client().get(fullUrl, this.getHeaders());
        const doc = new Document(res.body);
        return doc.selectFirst("#mw-content-text, .mw-parser-output")?.outerHtml || "";
    }

    async cleanHtmlContent(html) {
        return html;
    }

    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}
