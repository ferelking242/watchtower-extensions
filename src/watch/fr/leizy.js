// Leizy — extension Watchtower v1.0.0
// Anime VF/VOSTFR — leizy.fr (même moteur qu'anime-sama)

const watchtowerSources = [{
    "name": "Leizy",
    "langs": ["fr"],
    "ids": { "fr": 718294808 },
    "baseUrl": "https://leizy.fr",
    "apiUrl": "https://leizy.fr",
    "iconUrl": "https://leizy.fr/favicon.ico",
    "typeSource": "single",
    "itemType": 2,
    "version": "1.0.0",
    "pkgPath": "watch/fr/leizy.js",
    "editableBaseUrl": true,
    "hasCloudflare": false,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "VF", "VOSTFR"],
    "subCategories": ["anime"],
    "supportsForYou": true,
    "supportsComments": false,
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "notes": "Leizy — leizy.fr — Anime VF/VOSTFR. Moteur similaire à anime-sama."
}];

const BASE_URL = "https://leizy.fr";

class DefaultExtension extends MProvider {
    constructor() { super(); }

    get baseUrl() {
        const p = this.source.prefs?.find(x => x.key === "base_url");
        return (p && p.value) ? p.value.replace(/\/$/, "") : BASE_URL;
    }

    _hdrs(ref) {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": ref || (this.baseUrl + "/"),
            "Accept-Language": "fr-FR,fr;q=0.9"
        };
    }

    _decode(s) {
        return String(s || "").replace(/&#0?39;/g, "'").replace(/&quot;/g, '"')
            .replace(/&amp;/g, "&").replace(/<[^>]+>/g, "").trim();
    }

    _parseCards(html) {
        const items = []; const seen = {};
        // leizy uses same /catalogue/ path as anime-sama
        const re = /<a[^>]+href="((?:https?:\/\/[^"]+)?\/catalogue\/[^"\/]+\/)"[^>]*>[\s\S]{0,500}?<img[^>]+(?:src|data-src)="([^"]+)"[^>]+alt="([^"]{2,100})"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const url = m[1].startsWith("http") ? m[1] : this.baseUrl + m[1];
            if (url in seen) continue; seen[url] = 1;
            const img = m[2].startsWith("//") ? "https:" + m[2] : m[2].startsWith("/") ? this.baseUrl + m[2] : m[2];
            items.push({ link: url, imageUrl: img, name: this._decode(m[3]) });
        }
        if (items.length === 0) {
            // Generic fallback
            const re2 = /<a[^>]+href="([^"]*\/catalogue\/[^"]+)"[^>]*>([\s\S]{0,400}?)<\/a>/gi;
            let m2;
            while ((m2 = re2.exec(html)) !== null) {
                const url2 = m2[1].startsWith("http") ? m2[1] : this.baseUrl + m2[1];
                if (url2 in seen) continue; seen[url2] = 1;
                const imgM = /<img[^>]+(?:src|data-src)="([^"]+)"[^>]*alt="([^"]{2,})"/i.exec(m2[2]);
                if (!imgM) continue;
                const img2 = imgM[1].startsWith("//") ? "https:" + imgM[1] : imgM[1].startsWith("/") ? this.baseUrl + imgM[1] : imgM[1];
                items.push({ link: url2, imageUrl: img2, name: this._decode(imgM[2]) });
            }
        }
        return items;
    }

    async getPopular(page) {
        const url = `${this.baseUrl}/catalogue/`;
        const res = await new Client().get(url, { headers: this._hdrs() });
        return { list: this._parseCards(res.body), hasNextPage: false };
    }

    async getLatestUpdates(page) {
        const res = await new Client().get(this.baseUrl + "/", { headers: this._hdrs() });
        return { list: this._parseCards(res.body), hasNextPage: false };
    }

    async search(query, page, filterList) {
        const url = `${this.baseUrl}/catalogue/?search_text=${encodeURIComponent(query)}`;
        const res = await new Client().get(url, { headers: this._hdrs() });
        return { list: this._parseCards(res.body), hasNextPage: false };
    }

    async getDetail(url) {
        const res = await new Client().get(url, { headers: this._hdrs(url) });
        const html = res.body;
        const nameM = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
        const name = nameM ? this._decode(nameM[1]) : "";
        const ogImg = html.match(/property="og:image"[^>]*content="([^"]+)"/i) || html.match(/content="([^"]+)"[^>]*property="og:image"/i);
        const imageUrl = ogImg ? ogImg[1] : "";
        const descM = html.match(/property="og:description"[^>]*content="([^"]+)"/i) || html.match(/name="description"[^>]*content="([^"]+)"/i);
        const description = descM ? this._decode(descM[1]) : "";
        const chapters = [];
        const epRe = /<a[^>]+href="([^"]*\/catalogue\/[^"]*(?:saison|vf|vostfr)[^"]*)"[^>]*>([\s\S]{0,80}?)<\/a>/gi;
        let em; const eSeen = {};
        while ((em = epRe.exec(html)) !== null) {
            const epUrl = em[1].startsWith("http") ? em[1] : this.baseUrl + em[1];
            if (epUrl in eSeen) continue; eSeen[epUrl] = 1;
            const epName = this._decode(em[2]);
            if (epName.length < 2) continue;
            chapters.push({ name: epName, url: epUrl });
        }
        if (chapters.length === 0) chapters.push({ name: name || "Regarder", url });
        return { name, imageUrl, description, chapters };
    }

    async getVideoList(url) {
        const res = await new Client().get(url, { headers: this._hdrs(url) });
        const html = res.body;
        const videos = [];
        // anime-sama style: var eps = [...]
        const epsM = html.match(/var\s+eps\s*=\s*(\[[^\]]+\])/);
        if (epsM) {
            try {
                const eps = JSON.parse(epsM[1].replace(/'/g, '"'));
                for (const ep of eps) {
                    if (typeof ep === "string" && ep.startsWith("http")) {
                        videos.push({ url: ep, quality: "AUTO", headers: this._hdrs(url) });
                    }
                }
            } catch (_) {}
        }
        const iframeRe = /iframe[^>]+src="(https?:\/\/[^"]{10,200})"/gi;
        let m;
        while ((m = iframeRe.exec(html)) !== null) {
            videos.push({ url: m[1], quality: "AUTO", headers: this._hdrs(url) });
        }
        return videos;
    }

    async getForYou(page) { return this.getPopular(page); }
}
