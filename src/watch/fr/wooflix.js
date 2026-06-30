// Wooflix — extension Watchtower v1.0.0
// Films & Séries VF/VOSTFR — moteur custom avec ?q= pour la recherche

const watchtowerSources = [{
    "name": "Wooflix",
    "langs": ["fr"],
    "ids": { "fr": 601827001 },
    "baseUrl": "https://wooflix.io",
    "apiUrl": "https://wooflix.io",
    "iconUrl": "https://wooflix.io/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.0.1",
    "pkgPath": "watch/fr/wooflix.js",
    "editableBaseUrl": true,
    "hasCloudflare": false,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "VF", "VOSTFR"],
    "subCategories": ["film", "serie"],
    "supportsForYou": true,
    "supportsComments": false,
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "notes": "Wooflix — Films & Séries VF."
}];

const BASE_URL = "https://wooflix.io";

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
            .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
            .replace(/<[^>]+>/g, "").trim();
    }

    _parseCards(html) {
        const items = []; const seen = {};
        // Generic card pattern: link + img with alt
        const re = /<a[^>]+href="(https?:\/\/[^"]+\/(?:watch|tv|movie|film|serie)[^"]+)"[^>]*>[\s\S]{0,500}?<img[^>]+(?:src|data-src)="([^"]+)"[^>]+alt="([^"]{2,100})"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            if (m[1] in seen) continue; seen[m[1]] = 1;
            const img = m[2].startsWith("//") ? "https:" + m[2] : m[2];
            items.push({ link: m[1], imageUrl: img, name: this._decode(m[3]) });
        }
        if (items.length === 0) {
            // Fallback: any href with img+alt
            const re2 = /<a[^>]+href="([^"]{10,})"[^>]*>([\s\S]{0,300}?)<\/a>/gi;
            let m2;
            while ((m2 = re2.exec(html)) !== null) {
                const url2 = m2[1].startsWith("http") ? m2[1] : this.baseUrl + m2[1];
                if (url2 in seen || !url2.includes(this.baseUrl.replace("https://", ""))) continue;
                seen[url2] = 1;
                const imgM = /<img[^>]+(?:src|data-src)="([^"]+)"[^>]+alt="([^"]{2,})"/i.exec(m2[2]);
                if (!imgM) continue;
                const img2 = imgM[1].startsWith("//") ? "https:" + imgM[1] : imgM[1];
                items.push({ link: url2, imageUrl: img2, name: this._decode(imgM[2]) });
            }
        }
        return items;
    }

    async getPopular(page) {
        const url = page <= 1 ? this.baseUrl + "/" : `${this.baseUrl}/page/${page}/`;
        const res = await new Client().get(url, this._hdrs());
        const items = this._parseCards(res.body);
        return { list: items, hasNextPage: items.length >= 8 };
    }

    async getLatestUpdates(page) {
        const url = `${this.baseUrl}/latest/?page=${page}`;
        const res = await new Client().get(url, this._hdrs());
        const items = this._parseCards(res.body);
        return { list: items, hasNextPage: items.length >= 8 };
    }

    async search(query, page, filterList) {
        const url = `${this.baseUrl}/?q=${encodeURIComponent(query)}`;
        const res = await new Client().get(url, this._hdrs());
        const items = this._parseCards(res.body);
        return { list: items, hasNextPage: false };
    }

    async getDetail(url) {
        const res = await new Client().get(url, this._hdrs(url));
        const html = res.body;
        const nameM = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
        const name = nameM ? this._decode(nameM[1]) : "";
        const ogImg = html.match(/property="og:image"[^>]*content="([^"]+)"/i) ||
                      html.match(/content="([^"]+)"[^>]*property="og:image"/i);
        const imageUrl = ogImg ? ogImg[1] : "";
        const descM = html.match(/property="og:description"[^>]*content="([^"]+)"/i) ||
                      html.match(/name="description"[^>]*content="([^"]+)"/i);
        const description = descM ? this._decode(descM[1]) : "";
        const chapters = [];
        const epRe = /<a[^>]+href="([^"]*(?:saison|season|episode|ep|s\d+e\d+)[^"]*)"[^>]*>([\s\S]{0,80}?)<\/a>/gi;
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
        const res = await new Client().get(url, this._hdrs(url));
        const html = res.body;
        const videos = [];
        const iframeRe = /iframe[^>]+src="(https?:\/\/[^"]{10,200})"/gi;
        let m;
        while ((m = iframeRe.exec(html)) !== null) {
            videos.push({ url: m[1], quality: "AUTO", headers: this._hdrs(url) });
        }
        return videos;
    }

    async getForYou(page) { return this.getPopular(page); }
}
