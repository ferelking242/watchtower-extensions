const mangayomiSources = [{
    "name": "PapaDuStream",
    "langs": ["fr"],
    "ids": { "fr": 223948576 },
    "baseUrl": "https://papadustream-fr.watch",
    "apiUrl": "https://papadustream-fr.watch",
    "iconUrl": "https://raw.githubusercontent.com/kodjodevf/watchtower/main/extensions/watch/icon/fr.papadustream.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "0.1.3",
    "pkgPath": "watch/fr/papadustream.js",
    "editableBaseUrl": true,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "1080p", "720p", "480p", "360p"],
    "contentSubtype": ["film", "serie"]
}];

class DefaultExtension extends MProvider {
    constructor() { super(); this.client = new Client(); }

    get baseUrl() { const p = this.source.prefs?.find(x => x.key === "base_url"); return (p && p.value) ? p.value.replace(/\/$/, "") : this.source.baseUrl.replace(/\/$/, ""); }
    get logEnabled() { const p = this.source.prefs?.find(x => x.key === "log_enabled"); return p && p.value === "true"; }
    get logTopic() { const p = this.source.prefs?.find(x => x.key === "log_topic"); return (p && p.value) ? p.value : "wtfr-papadustream"; }
    get pref_quality() { const p = this.source.prefs?.find(x => x.key === "preferred_quality"); return (p && p.value) ? p.value : "AUTO"; }

    _hdrs(ref) { return { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", "Referer": ref || `${this.baseUrl}/`, "Accept-Language": "fr-FR,fr;q=0.9" }; }

    async _log(msg) {
        if (!this.logEnabled) return;
        try { await this.client.post(`https://ntfy.sh/${this.logTopic}`, `[PDS] ${msg}`, { "Title": "PapaDuStream", "Content-Type": "text/plain" }); } catch(e) {}
    }

    _parse(html) {
        const list = []; const seen = new Set();
        // papadustream-fr.watch: <a class="ani poster" href="/film/SLUG/ep-ID"><img src="POSTER" alt="TITLE">
        // The "list" page detail link is /film/SLUG (without /ep-ID); we use that.
        const re = /<a\s+class="ani\s+poster"\s+href="(https?:\/\/[^"]*?\/film\/[^"\/]+)(?:\/ep-\d+)?"[^>]*>\s*<img[^>]+src="([^"]+)"[^>]+alt="([^"]+)"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const url = m[1];
            if (seen.has(url)) continue; seen.add(url);
            list.push({ link: url, imageUrl: m[2], name: m[3].trim() });
        }
        return list;
    }

    async getPopular(page) {
        const res = await this.client.get(`${this.baseUrl}/movies/?page=${page}`, this._hdrs());
        await this._log(`popular ${page}: ${res.body.length}b`);
        const list = this._parse(res.body);
        await this._log(`popular: ${list.length} items`);
        return { list, hasNextPage: list.length >= 10 };
    }

    async getLatestUpdates(page) {
        const res = await this.client.get(`${this.baseUrl}/?page=${page}`, this._hdrs());
        const list = this._parse(res.body);
        return { list, hasNextPage: list.length >= 10 };
    }

    async search(query, page, filterList) {
        await this._log(`search: "${query}"`);
        const gf = (filterList || []).find(f => f && f.name === "Genre");
        const genrePath = (gf && gf.values && gf.state > 0) ? gf.values[gf.state].value : "";
        if (!query && genrePath) {
            const res = await this.client.get(`${this.baseUrl}${genrePath}page/${page}/`, this._hdrs());
            const list = this._parse(res.body);
            await this._log(`search(genre): ${list.length} items`);
            return { list, hasNextPage: list.length >= 10 };
        }
        const res = await this.client.get(`${this.baseUrl}/?s=${encodeURIComponent(query)}&page=${page}`, this._hdrs());
        await this._log(`search rsp: ${res.body.length}b`);
        const list = this._parse(res.body);
        await this._log(`search: ${list.length} items`);
        return { list, hasNextPage: list.length >= 10 };
    }

    async getDetail(url) {
        await this._log(`detail: ${url}`);
        const res = await this.client.get(url, this._hdrs());
        const html = res.body;

        // Title: prefer the page <h1> (page-specific), then a.name d-title, then data-jp
        const nameM = html.match(/<h1[^>]*>([\s\S]{2,200}?)<\/h1>/i) ||
                      html.match(/<a[^>]+class="[^"]*name\s+d-title[^"]*"[^>]*data-jp="([^"]+)"/i) ||
                      html.match(/data-jp="([^"]+)"/i);
        const name = nameM ? nameM[1].replace(/<[^>]+>/g, "").trim() : "";

        // Poster: PapaDuStream uses TMDB images; pick the first non-icon img
        const imgM = html.match(/<img[^>]+class="[^"]*(?:poster|cover|ani\s+poster)[^"]*"[^>]+src="([^"]+)"/i) ||
                     html.match(/<img[^>]+src="(https?:\/\/image\.tmdb\.org\/[^"]+)"/i) ||
                     html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
        const imageUrl = imgM ? imgM[1] : "";

        // Synopsis: page-specific synopsis div (not the site-wide og:description)
        const descM = html.match(/<div[^>]+class="[^"]*(?:synopsis|sinopsis|desc|description|sbox)[^"]*"[^>]*>([\s\S]{30,2000}?)<\/div>/i) ||
                      html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
        const description = descM ? descM[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";

        // Episodes: look for /film/SLUG/ep-XXX links anywhere on the page (works for series & VF/VOSTFR variants)
        const episodes = [];
        const seen = new Set();
        const epRe = /href="(https?:\/\/[^"]*?\/film\/[^"]+\/ep-\d+)"[^>]*(?:[^<]{0,50}(?:title|data-tip)="([^"]*)"|)/gi;
        let m, idx = 0;
        while ((m = epRe.exec(html)) !== null) {
            if (seen.has(m[1])) continue; seen.add(m[1]);
            idx++;
            const slugVariant = (m[1].match(/\/film\/([^\/]+)/) || [, ""])[1];
            const epName = (m[2] && m[2].length < 80 ? m[2] : `Épisode ${idx}${slugVariant.match(/-vf$/i) ? " (VF)" : slugVariant.match(/-vostfr$/i) ? " (VOSTFR)" : ""}`);
            episodes.push({ name: epName, url: m[1], dateUpload: "" });
        }
        if (episodes.length === 0) {
            episodes.push({ name: name || "Regarder", url, dateUpload: "" });
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

    getFilterList() {
        return [
            { type: "SelectFilter", name: "Genre", state: 0, values: [
                { name: "Tous", value: "" },
                { name: "Action", value: "/genre/action/" },
                { name: "Aventure", value: "/genre/aventure/" },
                { name: "Animation", value: "/genre/animation/" },
                { name: "Comédie", value: "/genre/comedie/" },
                { name: "Crime", value: "/genre/crime/" },
                { name: "Drame", value: "/genre/drame/" },
                { name: "Familial", value: "/genre/familial/" },
                { name: "Fantastique", value: "/genre/fantastique/" },
                { name: "Guerre", value: "/genre/guerre/" },
                { name: "Horreur", value: "/genre/horreur/" },
                { name: "Mystère", value: "/genre/mystere/" },
                { name: "Romance", value: "/genre/romance/" },
                { name: "Science-Fiction", value: "/genre/science-fiction/" },
                { name: "Thriller", value: "/genre/thriller/" }
            ]}
        ];
    }

    getSourcePreferences() {
        return [
            { key: "base_url", listPreference: { title: "URL de base", summary: this.baseUrl, valueIndex: 0, entries: [this.source.baseUrl], entryValues: [this.source.baseUrl] } },
            { key: "preferred_quality", listPreference: { title: "Qualité préférée", summary: "AUTO", valueIndex: 0, entries: ["AUTO", "1080p", "720p", "480p", "360p"], entryValues: ["AUTO", "1080p", "720p", "480p", "360p"] } },
            { key: "log_enabled", listPreference: { title: "Logs ntfy.sh", summary: "Voir logs sur ntfy.sh/[topic]", valueIndex: 0, entries: ["Désactivé", "Activé"], entryValues: ["false", "true"] } },
            { key: "log_topic", editTextPreference: { title: "Topic ntfy.sh", summary: "wtfr-papadustream", value: "wtfr-papadustream", dialogTitle: "Topic ntfy.sh", dialogMessage: "Identifiant unique pour vos logs ntfy.sh" } }
        ];
    }
}
