const watchtowerSources = [{
    "name": "Flame Comics",
    "lang": "en",
    "baseUrl": "https://flamecomics.com",
    "apiUrl": "",
    "iconUrl": "https://flamecomics.com/favicon.ico",
    "typeSource": "single",
    "itemType": 0,
    "version": "1.1.0",
    "pkgPath": "manga/src/en/flamecomics.js"
}];

const BASE_URL = "https://flamecomics.com";

class DefaultExtension extends MProvider {
    constructor() { super(); }

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": `${BASE_URL}/`
        };
    }

    mangaListParse(html) {
        const list = [];
        const re = /<a[^>]+href="(\/series\/[^"]+)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[\s\S]*?<\/a>[\s\S]*?<h3[^>]*>([^<]+)<\/h3>/g;
        let m;
        const seen = {};
        while ((m = re.exec(html)) !== null) {
            if (!seen[m[1]]) {
                seen[m[1]] = 1;
                list.push({ link: m[1], imageUrl: m[2], name: m[3].trim() });
            }
        }
        // Fallback: simpler card parsing
        if (list.length === 0) {
            const re2 = /href="(\/series\/[^"]+)"[\s\S]*?src="([^"]+)"[\s\S]*?alt="([^"]*)"/g;
            while ((m = re2.exec(html)) !== null) {
                if (!seen[m[1]]) {
                    seen[m[1]] = 1;
                    list.push({ link: m[1], imageUrl: m[2], name: m[3].trim() });
                }
            }
        }
        return list;
    }

    async getPopular(page) {
        const res = await new Client().get(`${BASE_URL}/series?order=popular&page=${page}`, this.getHeaders());
        return { list: this.mangaListParse(res.body), hasNextPage: res.body.includes('page=') };
    }

    async getLatestUpdates(page) {
        const res = await new Client().get(`${BASE_URL}/series?order=update&page=${page}`, this.getHeaders());
        return { list: this.mangaListParse(res.body), hasNextPage: res.body.includes('page=') };
    }

    async search(query, page, filters) {
        if (!query) return this.getPopular(page);
        const res = await new Client().get(`${BASE_URL}/series?q=${encodeURIComponent(query)}&page=${page}`, this.getHeaders());
        return { list: this.mangaListParse(res.body), hasNextPage: false };
    }

    async getDetail(url) {
        const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
        const res = await new Client().get(fullUrl, this.getHeaders());
        const html = res.body;

        const nameM = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
        const name = nameM ? nameM[1].trim() : "";

        const descM = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/);
        const description = descM ? descM[1].trim() : "";

        const imgM = html.match(/<img[^>]+class="[^"]*poster[^"]*"[^>]+src="([^"]+)"/);
        const imageUrl = imgM ? imgM[1] : "";

        const genre = [];
        const genreRe = /genre[^>]*>([^<]+)</gi;
        let gm;
        while ((gm = genreRe.exec(html)) !== null) {
            const g = gm[1].trim();
            if (g && g.length < 30 && !g.includes("Genre")) genre.push(g);
        }

        const statusM = html.match(/status[^>]*>([^<]+)/i);
        const statusText = statusM ? statusM[1].trim().toLowerCase() : "";
        const status = statusText.includes("completed") ? 1 : statusText.includes("hiatus") ? 2 : statusText.includes("dropped") ? 3 : 0;

        const chapters = [];
        const chRe = /href="(\/series\/[^"]*chapter-[^"]+)"[^>]*>[\s\S]*?<[^>]*>([^<]*(?:chapter|ch\.?)\s*[\d.]+[^<]*)</gi;
        let cm;
        while ((cm = chRe.exec(html)) !== null) {
            chapters.push({ name: cm[2].trim(), url: cm[1] });
        }

        // Fallback chapter parsing
        if (chapters.length === 0) {
            const chRe2 = /href="(\/series\/[^"]+)"[^>]*title="([^"]*chapter[^"]*)"/gi;
            while ((cm = chRe2.exec(html)) !== null) {
                if (cm[2].toLowerCase().includes("chapter")) {
                    chapters.push({ name: cm[2].trim(), url: cm[1] });
                }
            }
        }

        return { name, description, imageUrl, genre, status, chapters };
    }

    async getPageList(url) {
        const fullUrl = url.startsWith("http") ? url : `${BASE_URL}${url}`;
        const res = await new Client().get(fullUrl, this.getHeaders());
        const html = res.body;

        const pages = [];
        const re = /<img[^>]+src="([^"]+)"[^>]*class="[^"]*chapter-img[^"]*"/g;
        let m;
        while ((m = re.exec(html)) !== null) {
            pages.push(m[1]);
        }

        // Fallback
        if (pages.length === 0) {
            const re2 = /data-src="([^"]+)"/g;
            while ((m = re2.exec(html)) !== null) {
                if (m[1].includes("chapter") || m[1].includes("manga") || m[1].includes("img")) {
                    pages.push(m[1]);
                }
            }
        }

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
