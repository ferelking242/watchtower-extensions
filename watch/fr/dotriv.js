const mangayomiSources = [{
    "name": "Dotriv",
    "langs": ["fr"],
    "ids": { "fr": 334859201 },
    "baseUrl": "https://dotriv.com",
    "apiUrl": "https://dotriv.com",
    "iconUrl": "https://raw.githubusercontent.com/kodjodevf/watchtower/main/extensions/watch/icon/fr.dotriv.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "0.1.2",
    "pkgPath": "watch/fr/dotriv.js",
    "editableBaseUrl": true,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "1080p", "720p", "480p", "360p"],
    "contentSubtype": ["film", "serie"]
}];

class DefaultExtension extends MProvider {
    constructor() { super(); this.client = new Client(); }

    get baseUrl() {
        const p = this.source.prefs?.find(x => x.key === "base_url");
        return (p && p.value) ? p.value.replace(/\/$/, "") : this.source.baseUrl.replace(/\/$/, "");
    }
    get cmsBase() { return `${this.baseUrl}/a8634js`; }
    get logEnabled() { const p = this.source.prefs?.find(x => x.key === "log_enabled"); return p && p.value === "true"; }
    get logTopic() { const p = this.source.prefs?.find(x => x.key === "log_topic"); return (p && p.value) ? p.value : "wtfr-dotriv"; }
    get pref_quality() { const p = this.source.prefs?.find(x => x.key === "preferred_quality"); return (p && p.value) ? p.value : "AUTO"; }

    _hdrs(ref) { return { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Referer": ref || `${this.baseUrl}/`, "Accept-Language": "fr-FR,fr;q=0.9" }; }

    async _log(msg) {
        if (!this.logEnabled) return;
        try { await this.client.post(`https://ntfy.sh/${this.logTopic}`, `[Dotriv] ${msg}`, { "Title": "Dotriv", "Content-Type": "text/plain" }); } catch(e) {}
    }

    _parse(html) {
        const list = []; const seen = new Set();
        // trend-card structure: <a class="trend-card" href="/a8634js/b/dotriv/ID">...<img class="trend-card-img" src="IMG" alt="TITLE">
        const re = /href="(\/a8634js\/b\/dotriv\/\d+)"[\s\S]{0,400}?<img[^>]*class="(?:trend|film)-card-img"[^>]*src="([^"]+)"[^>]*alt="([^"]+)"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const url = `${this.baseUrl}${m[1]}`;
            if (seen.has(url)) continue; seen.add(url);
            list.push({ url, imageUrl: m[2], name: m[3].trim() });
        }
        return list;
    }

    async getPopular(page) {
        const res = await this.client.get(`${this.cmsBase}/c/dotriv/29/${page - 1}`, this._hdrs());
        await this._log(`popular p${page}: ${res.body.length}b`);
        const list = this._parse(res.body);
        await this._log(`popular: ${list.length} items`);
        return { list, hasNextPage: list.length >= 10 };
    }

    async getLatestUpdates(page) {
        const res = await this.client.get(`${this.cmsBase}/c/dotriv/29/${page - 1}`, this._hdrs());
        const list = this._parse(res.body);
        return { list, hasNextPage: list.length >= 10 };
    }

    async search(query, page, filterList) {
        await this._log(`search: "${query}"`);
        const body = `mod_search_searchword=${encodeURIComponent(query)}&mod_search_searchphrase=any&task=search&option=com_search&searchphrase=any&searchword=${encodeURIComponent(query)}&Submit=Search`;
        const res = await this.client.post(`${this.cmsBase}/home/dotriv`, body, { ...this._hdrs(), "Content-Type": "application/x-www-form-urlencoded" });
        await this._log(`search rsp: ${res.body.length}b`);
        const list = this._parse(res.body);
        await this._log(`search: ${list.length} items`);
        return { list, hasNextPage: false };
    }

    async getDetail(url) {
        await this._log(`detail: ${url}`);
        const res = await this.client.get(url, this._hdrs());
        const html = res.body;

        const nameM = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || html.match(/<title>([^|<\-]+)/i);
        const name = nameM ? nameM[1].trim() : "";

        const imgM = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) ||
                     html.match(/<img[^>]+class="[^"]*(?:poster|cover|detail-img)[^"]*"[^>]+src="([^"]+)"/i);
        const imageUrl = imgM ? imgM[1] : "";

        const descM = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i) ||
                      html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
        const description = descM ? descM[1].replace(/&[#\w]+;/g, " ").trim() : "";

        const episodes = [{ name: name || "Regarder", url, dateUpload: "" }];

        await this._log(`detail ok: "${name}", ${episodes.length} ep`);
        return { name, description, imageUrl, genres: [], status: 0, chapters: episodes };
    }

    async getVideoList(url) {
        await this._log(`video: ${url}`);
        const res = await this.client.get(url, this._hdrs(url));
        const html = res.body;
        const videos = [];
        const q = this.pref_quality;

        const iframeRe = /<iframe[^>]+src="([^"]{10,})"/gi;
        let m;
        while ((m = iframeRe.exec(html)) !== null) {
            const src = m[1].startsWith("//") ? `https:${m[1]}` : m[1];
            if (!src.includes("google") && !src.includes("recaptcha") && !src.includes("facebook")) {
                videos.push({ url: src, quality: q !== "AUTO" ? q : "Stream", originalUrl: src });
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
            { key: "log_topic", editTextPreference: { title: "Topic ntfy.sh", summary: "wtfr-dotriv", value: "wtfr-dotriv", dialogTitle: "Topic ntfy.sh", dialogMessage: "Identifiant unique pour vos logs ntfy.sh" } }
        ];
    }
}
