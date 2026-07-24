// Allostreaming — extension Watchtower v1.0.2
// Films & Séries VF — allostreaming.one (ww9.allostreaming.one obsolète)

const watchtowerSources = [{
    "name": "Allostreaming",
    "langs": ["fr"],
    "ids": { "fr": 709475839 },
    "baseUrl": "https://allostreaming.one",
    "apiUrl": "https://allostreaming.one",
    "iconUrl": "https://allostreaming.one/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.0.2",
    "pkgPath": "watch/fr/allostreaming.js",
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
    "notes": "Allostreaming — allostreaming.one"
}];

const BASE_URL = "https://allostreaming.one";

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
        return String(s || "").replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/<[^>]+>/g, "").trim();
    }
    _parseCards(html) {
        const items = []; const seen = {};
        // allostreaming.one: <a href="/film-ID.html" class="film-card"> background-image url + <h3 class="film-title">
        const re = /<a[^>]+href="(\/film-\d+\.html)"[^>]*class="film-card"[^>]*>[\s\S]{0,300}?background-image:\s*url\(['"]?(https?:\/\/[^'")\s]+)['"]?\)[\s\S]{0,200}?<h3[^>]*class="film-title"[^>]*>([^<]{2,120})<\/h3>/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const url = this.baseUrl + m[1];
            if (url in seen) continue; seen[url] = 1;
            items.push({ link: url, imageUrl: m[2], name: this._decode(m[3]) });
        }
        if (items.length === 0) {
            const re2 = /<a[^>]+href="(\/film-\d+\.html)"[^>]*>([\s\S]{0,400}?)<\/a>/gi;
            let m2;
            while ((m2 = re2.exec(html)) !== null) {
                const url = this.baseUrl + m2[1];
                if (url in seen) continue; seen[url] = 1;
                const tM = /<h3[^>]*>([^<]{2,120})<\/h3>/i.exec(m2[2]);
                const iM = /background-image:\s*url\(['"]?(https?:\/\/[^'")\s]+)/i.exec(m2[2]);
                if (!tM) continue;
                items.push({ link: url, imageUrl: iM ? iM[1] : "", name: this._decode(tM[1]) });
            }
        }
        return items;
    }
    async getPopular(page) {
        const url = page <= 1 ? this.baseUrl + "/" : `${this.baseUrl}/?page=${page}`;
        const res = await new Client().get(url, this._hdrs());
        const items = this._parseCards(res.body);
        return { list: items, hasNextPage: items.length >= 8 };
    }
    async getLatestUpdates(page) {
        const url = page <= 1 ? this.baseUrl + "/" : `${this.baseUrl}/?page=${page}`;
        const res = await new Client().get(url, this._hdrs());
        const items = this._parseCards(res.body);
        return { list: items, hasNextPage: items.length >= 8 };
    }
    async search(query, page, filterList) {
        const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}`;
        const res = await new Client().get(url, this._hdrs());
        return { list: this._parseCards(res.body), hasNextPage: false };
    }
    async getDetail(url) {
        const res = await new Client().get(url, this._hdrs(url));
        const html = res.body;
        const nameM = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
        const name = nameM ? this._decode(nameM[1]) : "";
        const ogImg = html.match(/property="og:image"[^>]*content="([^"]+)"/i) || html.match(/content="([^"]+)"[^>]*property="og:image"/i);
        const imageUrl = ogImg ? ogImg[1] : "";
        const descM = html.match(/property="og:description"[^>]*content="([^"]+)"/i) || html.match(/name="description"[^>]*content="([^"]+)"/i);
        const description = descM ? this._decode(descM[1]) : "";
        const chapters = [];
        const epRe = /<a[^>]+href="([^"]*(?:saison|episode|vf|vostfr|serie)[^"]*)"[^>]*>([\s\S]{0,80}?)<\/a>/gi;
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
        const hlsRe = /["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)/gi;
        while ((m = hlsRe.exec(html)) !== null) {
            if (!videos.find(v => v.url === m[1]))
                videos.push({ url: m[1], quality: "AUTO", headers: this._hdrs(url) });
        }
        return videos;
    }
    async getForYou(page) { return this.getPopular(page); }
}
