const watchtowerSources = [{
    "name": "Vostfree",
    "langs": ["fr"],
    "ids": { "fr": 445160798 },
    "baseUrl": "https://vostfree.ws",
    "apiUrl": "https://vostfree.ws",
    "iconUrl": "https://raw.githubusercontent.com/kodjodevf/watchtower/main/extensions/watch/icon/fr.vostfree.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "0.1.8",
    "pkgPath": "watch/fr/vostfree.js",
    "editableBaseUrl": true,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "1080p", "720p", "480p", "360p"],
    "contentSubtype": ["anime", "film"]
}];

class DefaultExtension extends MProvider {
    constructor() { super(); this.client = new Client(); }

    get baseUrl() {
        const p = this.source.prefs?.find(x => x.key === "base_url");
        return (p && p.value) ? p.value.replace(/\/$/, "") : this.source.baseUrl.replace(/\/$/, "");
    }

    _hdrs(ref) {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": ref || `${this.baseUrl}/`,
            "Accept-Language": "fr-FR,fr;q=0.9"
        };
    }

    // Parse listing pages — cards use .slider-poster with <a title="Name" href="URL"><img src>
    _parseList(html) {
        const list = [];
        const seen = new Set();
        const re = /<a\s+href="(https?:\/\/vostfree\.[^"]+\.html)"\s+title="([^"]{2,})"[^>]*>\s*<img[^>]+src="([^"]+)"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            if (seen.has(m[1])) continue;
            seen.add(m[1]);
            let imageUrl = m[3];
            if (imageUrl.startsWith("/")) imageUrl = `${this.baseUrl}${imageUrl}`;
            list.push({ link: m[1], imageUrl, name: m[2].trim() });
        }
        return list;
    }

    async getPopular(page) {
        const res = await this.client.get(`${this.baseUrl}/animes-vostfr/?page=${page}`, this._hdrs());
        const list = this._parseList(res.body);
        return { list, hasNextPage: list.length >= 10 };
    }

    async getLatestUpdates(page) {
        const res = await this.client.get(`${this.baseUrl}/?page=${page}`, this._hdrs());
        const list = this._parseList(res.body);
        return { list, hasNextPage: list.length >= 10 };
    }

    async search(query, page, filterList) {
        const gf = (filterList || []).find(f => f && f.name === "Genre");
        const genrePath = (gf && gf.values && gf.state > 0) ? gf.values[gf.state].value : "";
        if (!query && genrePath) {
            const res = await this.client.get(`${this.baseUrl}${genrePath}page/${page}/`, this._hdrs());
            return { list: this._parseList(res.body), hasNextPage: true };
        }
        const res = await this.client.get(`${this.baseUrl}/?search=${encodeURIComponent(query)}&page=${page}`, this._hdrs());
        const list = this._parseList(res.body);
        return { list, hasNextPage: list.length >= 10 };
    }

    async getDetail(url) {
        const res = await this.client.get(url, this._hdrs());
        const html = res.body;

        // Title
        const nameM = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        const name = nameM ? nameM[1].trim() : "";

        // Description
        const descM = html.match(/<div[^>]*class="slide-desc"[^>]*>([\s\S]{0,3000}?)<\/div>/i);
        const description = descM ? descM[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";

        // Image
        const imgM = html.match(/<div[^>]*class="slide-poster"[^>]*>[\s\S]{0,100}?<img[^>]+src="([^"]+)"/i)
                  || html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
        let imageUrl = imgM ? imgM[1] : "";
        if (imageUrl && imageUrl.startsWith("/")) imageUrl = `${this.baseUrl}${imageUrl}`;

        // Episodes: parse <select class="new_player_selector"> options
        // Each option: <option value="buttons_N">Episode N</option>
        const episodes = [];
        const optRe = /<option\s+value="(buttons_\d+)"[^>]*>([^<]+)<\/option>/g;
        let m;
        while ((m = optRe.exec(html)) !== null) {
            const btnId = m[1];        // "buttons_1"
            const epName = m[2].trim(); // "Episode 01"
            episodes.push({
                name: epName,
                url: `${url}#${btnId}`,
                dateUpload: ""
            });
        }

        // Fallback for films with no selector (single video)
        if (episodes.length === 0) {
            episodes.push({ name: name || "Regarder", url, dateUpload: "" });
        }

        return { name, description, imageUrl, genres: [], status: 0, chapters: episodes };
    }

    async getVideoList(url) {
        // Extract episode index from URL hash, e.g. "...#buttons_5" → 5
        const hashM = url.match(/#buttons_(\d+)$/);
        const epNum = hashM ? hashM[1] : "1";
        const pageUrl = url.replace(/#.*$/, "");

        const res = await this.client.get(pageUrl, this._hdrs(pageUrl));
        const html = res.body;

        // Find: <div id="buttons_N" class="button_box"><div id="player_X" class="new_player_TYPE">...</div></div>
        const btnRe = new RegExp(
            `id="buttons_${epNum}"[^>]*>[\\s\\S]{0,50}?<div[^>]+id="([^"]+)"[^>]+class="([^"]+)"`,
            "i"
        );
        const bm = html.match(btnRe);
        if (!bm) return [];

        const playerId = bm[1];    // e.g. "player_6"
        const playerClass = bm[2]; // e.g. "new_player_sibnet"

        // Get content: <div id="content_player_X" class="player_box">CONTENT</div>
        const contentRe = new RegExp(`id="content_${playerId}"[^>]*>([^<]+)<`, "i");
        const cm = html.match(contentRe);
        if (!cm) return [];
        const content = cm[1].trim();

        // Build video URL based on player type
        let videoUrl = "";
        if (playerClass.includes("new_player_sibnet")) {
            videoUrl = `https://video.sibnet.ru/shell.php?videoid=${content}`;
        } else if (playerClass.includes("new_player_uqload")) {
            videoUrl = `https://uqload.io/embed-${content}.html`;
        } else if (playerClass.includes("new_player_mp4")) {
            videoUrl = `https://www.mp4upload.com/embed-${content}.html`;
        } else if (playerClass.includes("new_player_myvi")) {
            videoUrl = `https://myvi.ru/player/embed/html/${content}`;
        } else if (playerClass.includes("new_player_gtv")) {
            videoUrl = `https://iframedream.com/embed/${content}.html`;
        } else if (playerClass.includes("new_player_vip") || playerClass.includes("new_player_vidfast")) {
            videoUrl = content.startsWith("http") ? content : `https:${content}`;
        } else {
            videoUrl = content.startsWith("http") ? content : `https:${content}`;
        }

        if (!videoUrl) return [];
        return [{ url: videoUrl, quality: "VOSTFR", originalUrl: videoUrl }];
    }

    getFilterList() {
        return [
            {
                type: "SelectFilter",
                name: "Genre",
                state: 0,
                values: [
                    { name: "Tous", value: "" },
                    { name: "Action", value: "/genre/Action/" },
                    { name: "Aventure", value: "/genre/Aventure/" },
                    { name: "Com\u00e9die", value: "/genre/Com%C3%A9die/" },
                    { name: "Drama", value: "/genre/Drama/" },
                    { name: "Fantasy", value: "/genre/Fantasy/" },
                    { name: "Horreur", value: "/genre/Horreur/" },
                    { name: "Myst\u00e8re", value: "/genre/Myst%C3%A8re/" },
                    { name: "Romance", value: "/genre/Romance/" },
                    { name: "Shonen", value: "/genre/Shonen/" },
                    { name: "Sci-Fi", value: "/genre/Sci-Fi/" }
                ]
            }
        ];
    }

    getSourcePreferences() {
        return [
            {
                key: "base_url",
                listPreference: {
                    title: "URL de base",
                    summary: this.baseUrl,
                    valueIndex: 0,
                    entries: [this.source.baseUrl],
                    entryValues: [this.source.baseUrl]
                }
            }
        ];
    }
}
