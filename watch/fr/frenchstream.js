const mangayomiSources = [{
    "name": "French-Stream",
    "langs": ["fr"],
    "ids": { "fr": 112837465 },
    "baseUrl": "https://french-stream.one",
    "apiUrl": "https://french-stream.one",
    "iconUrl": "https://raw.githubusercontent.com/kodjodevf/watchtower/main/extensions/watch/icon/fr.frenchstream.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "0.1.2",
    "pkgPath": "watch/fr/frenchstream.js",
    "editableBaseUrl": true,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "1080p", "720p", "480p", "360p"],
    "contentSubtype": ["film", "serie"]
}];

class DefaultExtension extends MProvider {
    constructor() { super(); this.client = new Client(); }

    get baseUrl() { const p = this.source.prefs?.find(x => x.key === "base_url"); return (p && p.value) ? p.value.replace(/\/$/, "") : this.source.baseUrl.replace(/\/$/, ""); }
    get logEnabled() { const p = this.source.prefs?.find(x => x.key === "log_enabled"); return p && p.value === "true"; }
    get logTopic() { const p = this.source.prefs?.find(x => x.key === "log_topic"); return (p && p.value) ? p.value : "wtfr-frenchstream"; }
    get pref_quality() { const p = this.source.prefs?.find(x => x.key === "preferred_quality"); return (p && p.value) ? p.value : "AUTO"; }

    _hdrs(ref) { return { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", "Referer": ref || `${this.baseUrl}/`, "Accept-Language": "fr-FR,fr;q=0.9" }; }

    async _log(msg) {
        if (!this.logEnabled) return;
        try { await this.client.post(`https://ntfy.sh/${this.logTopic}`, `[FS] ${msg}`, { "Title": "FrenchStream", "Content-Type": "text/plain" }); } catch(e) {}
    }

    _parse(html) {
        const list = []; const seen = new Set();
        // DLE CMS: <a class="short-poster img-box with-mask" href="/ID-slug.html" alt="TITLE"><img src="URL">
        const re = /class="short-poster[^"]*"\s+href="(\/[0-9][^"]+\.html)"\s+alt="([^"]+)"[\s\S]{0,400}?<img[^>]+src="([^"]+)"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const url = `${this.baseUrl}${m[1]}`;
            if (seen.has(url)) continue; seen.add(url);
            list.push({ url, imageUrl: m[3], name: m[2].trim() });
        }
        return list;
    }

    async getPopular(page) {
        const res = await this.client.get(`${this.baseUrl}/films/page/${page}/`, this._hdrs());
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
        const from = (page - 1) * 10;
        const res = await this.client.get(`${this.baseUrl}/?do=search&subaction=search&story=${encodeURIComponent(query)}&from_page=${from}&full_search=0`, this._hdrs());
        await this._log(`search rsp: ${res.body.length}b`);
        const list = this._parse(res.body);
        await this._log(`search: ${list.length} items`);
        return { list, hasNextPage: list.length >= 10 };
    }

    async getDetail(url) {
        await this._log(`detail: ${url}`);
        const res = await this.client.get(url, this._hdrs());
        const html = res.body;

        // Title from og:title or h1
        const nameM = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) ||
                      html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
        const name = nameM ? nameM[1].replace(/<[^>]+>/g, "").replace(/\s+en streaming.*/i, "").trim() : "";

        // Synopsis: DLE CMS uses <p class="desc-text">
        const descM = html.match(/<p[^>]*class="[^"]*desc-text[^"]*"[^>]*>([^<]+)<\/p>/i) ||
                      html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i) ||
                      html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
        const description = descM ? descM[1].trim() : "";

        // Poster
        const imgM = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
        const imageUrl = imgM ? imgM[1] : "";

        // Episodes: look for tabs or server links on DLE CMS
        const episodes = [];
        // For series: look for episode links
        const serieRe = /<a[^>]+href="(https?:\/\/french-stream[^"]+\.html)"[^>]*>([\s\S]*?)<\/a>/gi;
        let m;
        const seen = new Set();
        while ((m = serieRe.exec(html)) !== null) {
            if (m[1] === url || seen.has(m[1])) continue;
            seen.add(m[1]);
            const epName = m[2].replace(/<[^>]+>/g, "").trim();
            if (epName && epName.length > 1 && epName.length < 100) {
                episodes.push({ name: epName, url: m[1], dateUpload: "" });
            }
        }

        // For movies (no sub-episodes): use the film URL itself
        if (episodes.length === 0) {
            episodes.push({ name: name || "Regarder le film", url, dateUpload: "" });
        }

        await this._log(`detail ok: "${name}", desc: ${description.length}ch, ${episodes.length} ep`);
        return { name, description, imageUrl, genres: [], status: 0, chapters: episodes };
    }

    async getVideoList(url) {
        await this._log(`video: ${url}`);
        const res = await this.client.get(url, this._hdrs(url));
        const html = res.body;
        const videos = [];
        const q = this.pref_quality;

        // French-Stream uses JavaScript-loaded iframes; try to find any embed URL in page scripts
        const patterns = [
            /(?:src|url|file|source)\s*[=:]\s*["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/gi,
            /<iframe[^>]+src="(https?:\/\/[^"]{10,})"/gi,
            /(?:embed|player|stream)\s*[=:]\s*["'](https?:\/\/[^"']{10,})["']/gi
        ];

        for (const re of patterns) {
            let m;
            while ((m = re.exec(html)) !== null) {
                const src = m[1];
                if (!src.includes("google") && !src.includes("recaptcha") && !src.includes("facebook") && !src.includes("jquery")) {
                    videos.push({ url: src, quality: q !== "AUTO" ? q : "Stream", originalUrl: src });
                }
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
            { key: "log_topic", editTextPreference: { title: "Topic ntfy.sh", summary: "wtfr-frenchstream", value: "wtfr-frenchstream", dialogTitle: "Topic ntfy.sh", dialogMessage: "Identifiant unique pour vos logs ntfy.sh" } }
        ];
    }
}
