const mangayomiSources = [{
    "name": "Echo du Marteau",
    "langs": ["fr"],
    "ids": { "fr": 778594031 },
    "baseUrl": "https://echodumarteau.fr",
    "apiUrl": "https://echodumarteau.fr",
    "iconUrl": "https://raw.githubusercontent.com/kodjodevf/watchtower/main/extensions/watch/icon/fr.echodumarteau.png",
    "typeSource": "single",
    "itemType": 2,
    "version": "0.1.2",
    "pkgPath": "watch/fr/echodumarteau.js",
    "editableBaseUrl": true,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "1080p", "720p", "480p", "360p"],
    "contentSubtype": ["serie", "drama"]
}];

class DefaultExtension extends MProvider {
    constructor() { super(); this.client = new Client(); }

    get baseUrl() { const p = this.source.prefs?.find(x => x.key === "base_url"); return (p && p.value) ? p.value.replace(/\/$/, "") : this.source.baseUrl.replace(/\/$/, ""); }
    get logEnabled() { const p = this.source.prefs?.find(x => x.key === "log_enabled"); return p && p.value === "true"; }
    get logTopic() { const p = this.source.prefs?.find(x => x.key === "log_topic"); return (p && p.value) ? p.value : "wtfr-echodumarteau"; }
    get pref_quality() { const p = this.source.prefs?.find(x => x.key === "preferred_quality"); return (p && p.value) ? p.value : "AUTO"; }

    _hdrs(ref) { return { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Referer": ref || `${this.baseUrl}/`, "Accept-Language": "fr-FR,fr;q=0.9" }; }

    async _log(msg) {
        if (!this.logEnabled) return;
        try { await this.client.post(`https://ntfy.sh/${this.logTopic}`, `[EdM] ${msg}`, { "Title": "EchoDuMarteau", "Content-Type": "text/plain" }); } catch(e) {}
    }

    _parse(html) {
        const list = []; const seen = new Set();
        const re = /<a[^>]+href="(https?:\/\/echodumarteau\.fr\/[^"]+)"[^>]*title="([^"]+)"[\s\S]{0,300}<img[^>]+src="([^"]+)"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            if (seen.has(m[1]) || m[1].includes("category") || m[1].includes("tag")) continue;
            seen.add(m[1]);
            list.push({ link: m[1], imageUrl: m[3], name: m[2].trim() });
        }
        return list;
    }

    async getPopular(page) {
        const res = await this.client.get(`${this.baseUrl}/?page=${page}`, this._hdrs());
        await this._log(`popular: ${res.body.length}b`);
        const list = this._parse(res.body);
        return { list, hasNextPage: list.length >= 10 };
    }

    async getLatestUpdates(page) {
        const res = await this.client.get(`${this.baseUrl}/?page=${page}`, this._hdrs());
        const list = this._parse(res.body);
        return { list, hasNextPage: list.length >= 10 };
    }

    async search(query, page, filterList) {
        await this._log(`search: "${query}"`);
        const res = await this.client.get(`${this.baseUrl}/?s=${encodeURIComponent(query)}&page=${page}`, this._hdrs());
        const list = this._parse(res.body);
        await this._log(`search: ${list.length} items`);
        return { list, hasNextPage: list.length >= 10 };
    }

    async getDetail(url) {
        await this._log(`detail: ${url}`);
        const res = await this.client.get(url, this._hdrs());
        const html = res.body;

        const nameM = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
        const name = nameM ? nameM[1].replace(/<[^>]+>/g, "").trim() : "";

        const descM = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i) ||
                      html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
        const description = descM ? descM[1].trim() : "";

        const imgM = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
        const imageUrl = imgM ? imgM[1] : "";

        const episodes = [];
        const epRe = /href="(https?:\/\/echodumarteau\.fr\/[^"]+(?:episode|ep-|saison)[^"]*)"[^>]*title="([^"]+)"/gi;
        let m;
        while ((m = epRe.exec(html)) !== null) {
            episodes.push({ name: m[2].trim(), url: m[1], dateUpload: "" });
        }
        if (episodes.length === 0) episodes.push({ name: name || "Regarder", url, dateUpload: "" });

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
        await this._log(`video: ${videos.length} found`);
        return videos;
    }

    getFilterList() { return []; }

    getSourcePreferences() {
        return [
            { key: "base_url", listPreference: { title: "URL de base", summary: this.baseUrl, valueIndex: 0, entries: [this.source.baseUrl], entryValues: [this.source.baseUrl] } },
            { key: "preferred_quality", listPreference: { title: "Qualité préférée", summary: "AUTO", valueIndex: 0, entries: ["AUTO", "1080p", "720p", "480p", "360p"], entryValues: ["AUTO", "1080p", "720p", "480p", "360p"] } },
            { key: "log_enabled", listPreference: { title: "Logs ntfy.sh", summary: "Voir logs sur ntfy.sh/[topic]", valueIndex: 0, entries: ["Désactivé", "Activé"], entryValues: ["false", "true"] } },
            { key: "log_topic", editTextPreference: { title: "Topic ntfy.sh", summary: "wtfr-echodumarteau", value: "wtfr-echodumarteau", dialogTitle: "Topic ntfy.sh", dialogMessage: "Topic ntfy.sh unique pour vos logs" } }
        ];
    }
}
