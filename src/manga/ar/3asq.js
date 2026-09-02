const watchtowerSources = [{
    "name": "3asq",
    "lang": "ar",
    "baseUrl": "https://3asq.org",
    "apiUrl": "",
    "iconUrl": "https://3asq.org/favicon.ico",
    "typeSource": "single",
    "itemType": 0,
    "version": "1.1.0",
    "pkgPath": "manga/src/ar/3asq.js",
    "notes": "3asq Manga — source manga arabe populaire"
}];

const BASE_URL = "https://3asq.org";

class DefaultExtension extends MProvider {
    constructor() { super(); }

    getHeaders() {
        return { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Referer": `${BASE_URL}/` };
    }

    mangaListParse(html) {
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
        const res = await new Client().get(`${BASE_URL}/?page=${page}`, this.getHeaders());
        return { list: this.mangaListParse(res.body), hasNextPage: res.body.includes('page=') };
    }

    async getLatestUpdates(page) {
        const res = await new Client().get(`${BASE_URL}/?page=${page}`, this.getHeaders());
        return { list: this.mangaListParse(res.body), hasNextPage: res.body.includes('page=') };
    }

    async search(query, page, filters) {
        if (!query) return this.getPopular(page);
        const res = await new Client().get(`${BASE_URL}/?s=${encodeURIComponent(query)}`, this.getHeaders());
        return { list: this.mangaListParse(res.body), hasNextPage: false };
    }

    async getDetail(url) {
        const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
        const res = await new Client().get(fullUrl, this.getHeaders());
        const html = res.body;
        const nameM = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
        const name = nameM ? nameM[1].trim() : "";
        const descM = html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/);
        const description = descM ? descM[1].replace(/<[^>]+>/g, "").trim() : "";
        const imgM = html.match(/<img[^>]+src="([^"]+)"[^>]*(?:cover|manga)/i);
        const imageUrl = imgM ? imgM[1] : "";
        const genre = []; const genreRe = /genre[^>]*>([^<]+)/gi; let gm;
        while ((gm = genreRe.exec(html)) !== null) { const g = gm[1].trim(); if (g && g.length < 30) genre.push(g); }
        const chapters = [];
        const chRe = /href="([^"]+)"[\s\S]*?chapter[\s\S]*?(\d+)/gi; let cm;
        while ((cm = chRe.exec(html)) !== null) { chapters.push({ name: `الفصل ${cm[2]}`, url: cm[1] }); }
        return { name, description, imageUrl, genre, status: 0, chapters };
    }

    async getPageList(url) {
        const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
        const res = await new Client().get(fullUrl, this.getHeaders());
        const pages = [];
        const re = /src="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi;
        let m; const html = res.body;
        while ((m = re.exec(html)) !== null) { if (!m[1].includes("logo") && !m[1].includes("icon")) pages.push(m[1]); }
        return pages.map(p => ({ url: p, headers: this.getHeaders() }));
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
                    entries: ["Arabe (recommandé)", "Anglais", "Français", "Automatique"],
                    entryValues: ["ar", "en", "fr", "auto"]
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
