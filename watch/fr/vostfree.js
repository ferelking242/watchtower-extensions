const mangayomiSources = [{
    "name": "Vostfree",
    "langs": ["fr"],
    "ids": { "fr": 445160798 },
    "baseUrl": "https://vostfree.ws",
    "apiUrl": "https://vostfree.ws",
    "iconUrl": "https://raw.githubusercontent.com/kodjodevf/watchtower/main/extensions/watch/icon/fr.vostfree.png",
    "typeSource": "single",
    "itemType": 2,
    "version": "0.1.2",
    "pkgPath": "watch/fr/vostfree.js",
    "editableBaseUrl": true,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "1080p", "720p", "480p", "360p"],
    "contentSubtype": ["anime", "film"]
}];

class DefaultExtension extends MProvider {
    constructor() { super(); this.client = new Client(); }

    get baseUrl() { const p = this.source.prefs?.find(x => x.key === "base_url"); return (p && p.value) ? p.value.replace(/\/$/, "") : this.source.baseUrl.replace(/\/$/, ""); }
    get logEnabled() { const p = this.source.prefs?.find(x => x.key === "log_enabled"); return p && p.value === "true"; }
    get logTopic() { const p = this.source.prefs?.find(x => x.key === "log_topic"); return (p && p.value) ? p.value : "wtfr-vostfree"; }
    get pref_quality() { const p = this.source.prefs?.find(x => x.key === "preferred_quality"); return (p && p.value) ? p.value : "AUTO"; }

    _hdrs(ref) { return { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", "Referer": ref || `${this.baseUrl}/`, "Accept-Language": "fr-FR,fr;q=0.9" }; }

    async _log(msg) {
        if (!this.logEnabled) return;
        try { await this.client.post(`https://ntfy.sh/${this.logTopic}`, `[Vostfree] ${msg}`, { "Title": "Vostfree", "Content-Type": "text/plain" }); } catch(e) {}
    }

    _parse(html) {
        const list = []; const seen = new Set();
        // Structure: <a href="https://vostfree.ws/123-title-vostfr-ddl.html"><img src="URL" alt="TITLE">
        const re = /<a[^>]+href="(https?:\/\/vostfree\.[^/]+\/[0-9]+-[^"]+\.html)"[^>]*>[\s\S]{0,500}<img[^>]+src="([^"]+)"[^>]+alt="([^"]{2,})"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            if (seen.has(m[1])) continue; seen.add(m[1]);
            const name = m[3].replace(/\s*(VOSTFR|VF|FRENCH|TrueFrench|DDL|streaming)[^\w]*/gi, "").trim();
            if (name.length > 1) list.push({ url: m[1], imageUrl: m[2], name });
        }
        return list;
    }

    async getPopular(page) {
        const res = await this.client.get(`${this.baseUrl}/?page=${page}`, this._hdrs());
        await this._log(`popular ${page}: ${res.body.length}b`);
        const list = this._parse(res.body);
        await this._log(`popular: ${list.length} items`);
        return { list, hasNextPage: list.length >= 10 };
    }

    async getLatestUpdates(page) {
        const res = await this.client.get(`${this.baseUrl}/?do=lastupdate&page=${page}`, this._hdrs());
        const list = this._parse(res.body);
        return { list, hasNextPage: list.length >= 10 };
    }

    async search(query, page, filterList) {
        await this._log(`search: "${query}"`);
        // Vostfree search: /?search=QUERY&page=N
        const res = await this.client.get(`${this.baseUrl}/?search=${encodeURIComponent(query)}&page=${page}`, this._hdrs());
        await this._log(`search rsp: ${res.body.length}b`);
        const list = this._parse(res.body);
        await this._log(`search: ${list.length} items`);
        return { list, hasNextPage: list.length >= 10 };
    }

    async getDetail(url) {
        await this._log(`detail: ${url}`);
        const res = await this.client.get(url, this._hdrs());
        const html = res.body;

        const nameM = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        const name = nameM ? nameM[1].replace(/\s*(VOSTFR|VF|FRENCH)[^\w]*/gi, "").trim() : "";

        const descM = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i) ||
                      html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
        const description = descM ? descM[1].trim() : "";

        const imgM = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) ||
                     html.match(/<img[^>]+class="[^"]*(?:poster|img-left)[^"]*"[^>]+src="([^"]+)"/i);
        const imageUrl = imgM ? imgM[1] : "";

        // Episodes: Vostfree is mostly single-file anime/films
        // For multi-episode series, look for episode links
        const episodes = [];
        const epRe = /<a[^>]+href="(https?:\/\/vostfree\.[^/]+\/[0-9]+-[^"]+\.html)"[^>]*>([^<]{3,})<\/a>/gi;
        const seen = new Set([url]);
        let m;
        while ((m = epRe.exec(html)) !== null) {
            if (seen.has(m[1])) continue; seen.add(m[1]);
            const epName = m[2].trim();
            if (epName && epName.length < 100 && !epName.includes("<")) {
                episodes.push({ name: epName, url: m[1], dateUpload: "" });
            }
        }

        // Default: the film/anime URL itself is the single episode
        if (episodes.length === 0) {
            const titleForEp = name || url.split("/").pop().replace(/-/g, " ").replace(/\.html$/, "").trim();
            episodes.push({ name: titleForEp || "Regarder", url, dateUpload: "" });
        }

        await this._log(`detail ok: "${name}", ${episodes.length} ep`);
        return { name, description, imageUrl, genres: [], status: 0, chapters: episodes };
    }

    async getVideoList(url) {
        await this._log(`video: ${url}`);
        const res = await this.client.get(url, this._hdrs(url));
        const html = res.body;
        const videos = [];
        const q = this.pref_quality;

        const iframeRe = /<iframe[^>]+src="(https?:\/\/[^"]{10,})"/gi;
        let m;
        while ((m = iframeRe.exec(html)) !== null) {
            if (!m[1].includes("google") && !m[1].includes("recaptcha")) {
                videos.push({ url: m[1], quality: q !== "AUTO" ? q : "Stream", originalUrl: m[1] });
            }
        }

        const fileRe = /(?:file|source|src)\s*[=:]\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/gi;
        while ((m = fileRe.exec(html)) !== null) {
            videos.push({ url: m[1], quality: q !== "AUTO" ? q : "Direct", originalUrl: m[1] });
        }

        await this._log(`video: ${videos.length} found`);
        return videos;
    }

    getFilterList() { return []; }

    getSourcePreferences() {
        return [
            { key: "base_url", listPreference: { title: "URL de base", summary: this.baseUrl, valueIndex: 0, entries: [this.source.baseUrl], entryValues: [this.source.baseUrl] } },
            { key: "preferred_quality", listPreference: { title: "Qualité préférée", summary: "AUTO", valueIndex: 0, entries: ["AUTO", "1080p", "720p", "480p", "360p"], entryValues: ["AUTO", "1080p", "720p", "480p", "360p"] } },
            { key: "log_enabled", listPreference: { title: "Logs ntfy.sh", summary: "Voir logs sur ntfy.sh/[topic]", valueIndex: 0, entries: ["Désactivé", "Activé"], entryValues: ["false", "true"] } },
            { key: "log_topic", editTextPreference: { title: "Topic ntfy.sh", summary: "wtfr-vostfree", value: "wtfr-vostfree", dialogTitle: "Topic ntfy.sh", dialogMessage: "Identifiant unique pour vos logs ntfy.sh" } }
        ];
    }
}
