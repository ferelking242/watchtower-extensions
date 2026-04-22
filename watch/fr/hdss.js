const mangayomiSources = [{
    "name": "HDSS",
    "langs": ["fr"],
    "ids": { "fr": 889504132 },
    "baseUrl": "https://www.hdss.art",
    "apiUrl": "https://www.hdss.art",
    "iconUrl": "https://raw.githubusercontent.com/kodjodevf/watchtower/main/extensions/watch/icon/fr.hdss.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "0.1.3",
    "pkgPath": "watch/fr/hdss.js",
    "editableBaseUrl": true,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "1080p", "720p", "480p", "360p"],
    "contentSubtype": ["film", "serie"]
}];

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
    }

    get baseUrl() {
        const pref = this.source.prefs?.find(p => p.key === "base_url");
        return (pref && pref.value) ? pref.value.replace(/\/$/, "") : this.source.baseUrl.replace(/\/$/, "");
    }

    get userAgent() {
        const pref = this.source.prefs?.find(p => p.key === "user_agent");
        return (pref && pref.value) ? pref.value : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    }

    _decode(s) { return String(s||"").replace(/&#0?39;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&nbsp;/g," "); }

    get preferredQuality() {
        const pref = this.source.prefs?.find(p => p.key === "preferred_quality");
        return (pref && pref.value) ? pref.value : "AUTO";
    }

    getHeaders() {
        return {
            "User-Agent": this.userAgent,
            "Referer": `${this.baseUrl}/`,
            "Accept-Language": "fr-FR,fr;q=0.9"
        };
    }

    _parseItems(html) {
        const list = [];
        const re = /<article[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?<img[^>]+(?:src|data-src)="([^"]+)"[^>]+alt="([^"]+)"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const url = m[1].startsWith("http") ? m[1] : `${this.baseUrl}${m[1]}`;
            list.push({ link: url, imageUrl: m[2], name: m[3].trim() });
        }
        if (list.length === 0) {
            const re2 = /<div[^>]*class="[^"]*(?:TPost|movie|film)[^"]*"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>\s*<img[^>]+(?:src|data-src)="([^"]+)"[^>]+(?:alt|title)="([^"]+)"/gi;
            while ((m = re2.exec(html)) !== null) {
                const url = m[1].startsWith("http") ? m[1] : `${this.baseUrl}${m[1]}`;
                list.push({ link: url, imageUrl: m[2], name: m[3].trim() });
            }
        }
        return list;
    }

    async getPopular(page) {
        const res = await this.client.get(`${this.baseUrl}/films/page/${page}/`, this.getHeaders());
        const list = this._parseItems(res.body);
        const hasNext = res.body.includes(`/page/${page + 1}/`) || res.body.includes('class="next"');
        return { list, hasNextPage: hasNext };
    }

    async getLatestUpdates(page) {
        const res = await this.client.get(`${this.baseUrl}/page/${page}/`, this.getHeaders());
        const list = this._parseItems(res.body);
        const hasNext = res.body.includes(`/page/${page + 1}/`) || res.body.includes('class="next"');
        return { list, hasNextPage: hasNext };
    }

    async search(query, page, filterList) {
        // Honor Genre filter when query is empty: browse the genre listing
        const gf = (filterList || []).find(f => f && f.name === "Genre");
        const genrePath = (gf && gf.values && gf.state > 0) ? gf.values[gf.state].value : "";
        if (!query && genrePath) {
            const res = await this.client.get(`${this.baseUrl}${genrePath}page/${page}/`, this.getHeaders());
            const list = this._parseItems(res.body);
            const hasNext = res.body.includes(`/page/${page + 1}/`);
            return { list, hasNextPage: hasNext };
        }
        const res = await this.client.get(
            `${this.baseUrl}/?s=${encodeURIComponent(query)}&paged=${page}`,
            this.getHeaders()
        );
        const list = this._parseItems(res.body);
        const hasNext = res.body.includes(`paged=${page + 1}`) || res.body.includes('class="next"');
        return { list, hasNextPage: hasNext };
    }

    async getDetail(url) {
        const fullUrl = url.startsWith("http") ? url : `${this.baseUrl}${url}`;
        const res = await this.client.get(fullUrl, this.getHeaders());
        const html = res.body;

        // Title: prefer og:title (clean), else strip "Regarder le Film X (Year) en streaming HDSS" from h1
        const ogTitleM = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
        const h1M = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        let name = ogTitleM ? this._decode(ogTitleM[1]) : (h1M ? h1M[1].replace(/<[^>]+>/g, "").trim() : "");
        name = name.replace(/^Regarder\s+(?:le\s+Film|la\s+S[eé]rie|le\s+Drama)\s+/i, "")
                   .replace(/\s+\(\d{4}\)\s+en\s+streaming\s+HDSS.*$/i, "")
                   .trim();

        // Description: meta name=description is the real synopsis on HDSS
        const descM = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
        const description = descM ? this._decode(descM[1])
            .replace(/^Voir\s+(?:film|s[eé]rie|drama)\s+[^,]+\s+sur\s+hdss[^,]*,?\s*/i, "").trim()
            : "";

        // Poster: <a class="affiche__img ...">…<img src="/uploads/posts/covers/...jpg">
        const imgM = html.match(/class="[^"]*affiche__img[^"]*"[\s\S]{0,300}?<img[^>]+(?:data-src|src)="([^"]+)"/i) ||
                     html.match(/<img[^>]+(?:data-src|src)="([^"]*\/uploads\/posts\/covers\/[^"]+\.(?:jpg|png|webp))"/i) ||
                     html.match(/<img[^>]+(?:data-src|src)="([^"]*\/uploads\/[^"]+\.(?:jpg|png|webp))"/i) ||
                     html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
        let imageUrl = imgM ? imgM[1] : "";
        if (imageUrl && imageUrl.startsWith("/")) imageUrl = `${this.baseUrl}${imageUrl}`;

        const episodes = [];
        const epRe = /<a[^>]+href="([^"]+(?:saison|episode|ep-|serie)[^"]*)"[^>]*(?:title|aria-label)="([^"]+)"/gi;
        let em;
        while ((em = epRe.exec(html)) !== null) {
            const epUrl = em[1].startsWith("http") ? em[1] : `${this.baseUrl}${em[1]}`;
            episodes.push({ name: em[2].trim(), url: epUrl, dateUpload: "" });
        }
        if (episodes.length === 0) {
            episodes.push({ name: "Regarder", url: fullUrl, dateUpload: "" });
        }

        return { name, description, imageUrl, genres: [], status: 0, chapters: episodes };
    }

    async getVideoList(url) {
        const fullUrl = url.startsWith("http") ? url : `${this.baseUrl}${url}`;
        const res = await this.client.get(fullUrl, this.getHeaders());
        const html = res.body;
        const videos = [];
        const q = this.preferredQuality;

        const iframeRe = /<iframe[^>]+src="([^"]+)"/gi;
        let m;
        while ((m = iframeRe.exec(html)) !== null) {
            const src = m[1].startsWith("//") ? `https:${m[1]}` : m[1];
            if (!src.includes("pub") && !src.includes("ads")) {
                videos.push({ url: src, quality: q !== "AUTO" ? q : "Stream", originalUrl: src });
            }
        }

        const fileRe = /(?:file|src)\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/gi;
        while ((m = fileRe.exec(html)) !== null) {
            videos.push({ url: m[1], quality: q !== "AUTO" ? q : "Direct", originalUrl: m[1] });
        }

        return videos;
    }

    getFilterList() {
        return [
            { type: "SelectFilter", name: "Genre", state: 0, values: [
                { name: "Tous", value: "" },
                { name: "Action", value: "/genre/action/" },
                { name: "Aventure", value: "/genre/aventure/" },
                { name: "Animation", value: "/genre/animation/" },
                { name: "Comédie", value: "/genre/comedie/" },
                { name: "Crime", value: "/genre/crime/" },
                { name: "Documentaire", value: "/genre/documentaire/" },
                { name: "Drame", value: "/genre/drame/" },
                { name: "Familial", value: "/genre/familial/" },
                { name: "Fantastique", value: "/genre/fantastique/" },
                { name: "Guerre", value: "/genre/guerre/" },
                { name: "Histoire", value: "/genre/histoire/" },
                { name: "Horreur", value: "/genre/horreur/" },
                { name: "Musique", value: "/genre/musique/" },
                { name: "Mystère", value: "/genre/mystere/" },
                { name: "Romance", value: "/genre/romance/" },
                { name: "Science-Fiction", value: "/genre/science-fiction/" },
                { name: "Thriller", value: "/genre/thriller/" },
                { name: "Western", value: "/genre/western/" }
            ]}
        ];
    }

    getSourcePreferences() {
        return [
            {
                key: "base_url",
                listPreference: {
                    title: "URL de base (modifiable si le site change de domaine)",
                    summary: this.baseUrl,
                    valueIndex: 0,
                    entries: [this.source.baseUrl],
                    entryValues: [this.source.baseUrl]
                }
            },
            {
                key: "user_agent",
                editTextPreference: {
                    title: "User-Agent personnalisé",
                    summary: "Laisser vide pour utiliser le User-Agent par défaut",
                    value: "",
                    dialogTitle: "User-Agent",
                    dialogMessage: "Entrez un User-Agent personnalisé"
                }
            },
            {
                key: "preferred_quality",
                listPreference: {
                    title: "Qualité vidéo préférée",
                    summary: "AUTO",
                    valueIndex: 0,
                    entries: ["AUTO", "1080p", "720p", "480p", "360p"],
                    entryValues: ["AUTO", "1080p", "720p", "480p", "360p"]
                }
            }
        ];
    }
}
