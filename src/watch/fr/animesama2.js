// Anime-Sama (animes-sama.fr) — extension Watchtower v1.0.0
// Site custom avec catalogue paginé, recherche par ?search=, player JS

const watchtowerSources = [{
    "name": "Anime-Sama (FR)",
    "langs": ["fr"],
    "ids": { "fr": 701938472 },
    "baseUrl": "https://animes-sama.fr",
    "apiUrl": "https://animes-sama.fr",
    "iconUrl": "https://animes-sama.fr/img/autres/logo_icon.png",
    "typeSource": "single",
    "itemType": 2,
    "version": "1.0.1",
    "pkgPath": "watch/fr/animesama2.js",
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
    "notes": "Anime-Sama — animes-sama.fr — VF/VOSTFR."
}];

const BASE_URL = "https://animes-sama.fr";

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
        // anime-sama: /catalogue/SLUG/ links with img
        const re = /<a[^>]+href="((?:https?:\/\/[^"]+)?\/catalogue\/[^"\/]+\/)"[^>]*>[\s\S]{0,500}?<img[^>]+(?:src|data-src)="([^"]+)"[^>]+alt="([^"]{2,100})"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const url = m[1].startsWith("http") ? m[1] : this.baseUrl + m[1];
            if (url in seen) continue; seen[url] = 1;
            const img = m[2].startsWith("//") ? "https:" + m[2] : m[2].startsWith("/") ? this.baseUrl + m[2] : m[2];
            items.push({ link: url, imageUrl: img, name: this._decode(m[3]) });
        }
        if (items.length === 0) {
            // Fallback: title + img from card blocks
            const re2 = /<a[^>]+href="([^"]*\/catalogue\/[^"]+)"[^>]*>([\s\S]{0,400}?)<\/a>/gi;
            let m2;
            while ((m2 = re2.exec(html)) !== null) {
                const url2 = m2[1].startsWith("http") ? m2[1] : this.baseUrl + m2[1];
                if (url2 in seen) continue; seen[url2] = 1;
                const imgM = /<img[^>]+(?:src|data-src)="([^"]+)"[^>]*alt="([^"]{2,})"/i.exec(m2[2]) ||
                             /<img[^>]+alt="([^"]{2,})"[^>]*(?:src|data-src)="([^"]+)"/i.exec(m2[2]);
                if (!imgM) continue;
                const imgUrl = (imgM[1] || imgM[2]);
                const imgTitle = (imgM[2] || imgM[1]);
                const img2 = imgUrl.startsWith("//") ? "https:" + imgUrl : imgUrl.startsWith("/") ? this.baseUrl + imgUrl : imgUrl;
                items.push({ link: url2, imageUrl: img2, name: this._decode(imgTitle) });
            }
        }
        return items;
    }

    async getPopular(page) {
        const url = `${this.baseUrl}/catalogue/`;
        const res = await new Client().get(url, this._hdrs());
        return { list: this._parseCards(res.body), hasNextPage: false };
    }

    async getLatestUpdates(page) {
        const res = await new Client().get(this.baseUrl + "/", this._hdrs());
        return { list: this._parseCards(res.body), hasNextPage: false };
    }

    async search(query, page, filterList) {
        const url = `${this.baseUrl}/catalogue/?search=${encodeURIComponent(query)}`;
        const res = await new Client().get(url, this._hdrs());
        return { list: this._parseCards(res.body), hasNextPage: false };
    }

    async getDetail(url) {
        const res = await new Client().get(url, this._hdrs(url));
        const html = res.body;
        const nameM = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
        const name = nameM ? this._decode(nameM[1]) : "";
        const ogImg = html.match(/property="og:image"[^>]*content="([^"]+)"/i) ||
                      html.match(/content="([^"]+)"[^>]*property="og:image"/i);
        const imageUrl = ogImg ? ogImg[1] : (html.match(/\/img\/[^"']{5,80}(?:poster|cover|affiche)[^"']{0,40}/i)?.[0] || "");
        const descM = html.match(/property="og:description"[^>]*content="([^"]+)"/i) ||
                      html.match(/name="description"[^>]*content="([^"]+)"/i);
        const description = descM ? this._decode(descM[1]) : "";
        // Seasons VF/VOSTFR links
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
        const res = await new Client().get(url, this._hdrs(url));
        const html = res.body;
        const videos = [];
        // anime-sama uses JS variable: var eps = [...] with player URLs
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
        // iframe fallback
        const iframeRe = /iframe[^>]+src="(https?:\/\/[^"]{10,200})"/gi;
        let m;
        while ((m = iframeRe.exec(html)) !== null) {
            videos.push({ url: m[1], quality: "AUTO", headers: this._hdrs(url) });
        }
        return videos;
    }

    async getForYou(page) { return this.getPopular(page); }
}
