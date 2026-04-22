const mangayomiSources = [{
    "name": "XNXX",
    "lang": "en",
    "baseUrl": "https://www.xnxx.com",
    "apiUrl": "",
    "iconUrl": "https://www.xnxx.com/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.0.5",
    "pkgPath": "xnxx/en/en.xnxx.js",
    "notes": "Adult content (18+)",
    "isNsfw": true
}];

class DefaultExtension extends MProvider {

    // ---------- preferences ----------
    _pref(key, def) {
        const p = this.source && this.source.prefs && this.source.prefs.find(x => x.key === key);
        return (p && p.value !== undefined && p.value !== null && p.value !== "") ? p.value : def;
    }
    get langCode()    { return this._pref("xnxx_lang", "en"); }
    get prefQuality() { return this._pref("preferred_quality", "auto"); }

    getHeaders(url) {
        return {
            "Referer": "https://www.xnxx.com/",
            "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
            "Accept-Language": this.langCode + ",en;q=0.8",
            "Cookie": "lang=" + this.langCode
        };
    }

    // ---------- listing ----------
    async getPopular(page) {
        const url = `https://www.xnxx.com/best/${this.langCode}/${page}`;
        const res = await new Client().get(url, this.getHeaders(url));
        return this._parseVideoList(res.body);
    }
    get supportsLatest() { return true; }
    async getLatestUpdates(page) {
        const url = `https://www.xnxx.com/new/${this.langCode}/${page}`;
        const res = await new Client().get(url, this.getHeaders(url));
        return this._parseVideoList(res.body);
    }
    async search(query, page, filters) {
        const q = encodeURIComponent(query.trim().replace(/\s+/g, "+"));
        const url = `https://www.xnxx.com/search/${this.langCode}/${q}/${page}`;
        const res = await new Client().get(url, this.getHeaders(url));
        return this._parseVideoList(res.body);
    }

    _parseVideoList(html) {
        const doc = new Document(html);
        const items = [];
        const seen = new Set();
        const cards = doc.select(".mozaique .thumb-block");
        for (const card of cards) {
            // Title is on the anchor in .thumb-under (its `title` attr or text), not on the inner thumb anchor.
            let title = "";
            const aWithTitle = card.selectFirst(".thumb-under a[title]") || card.selectFirst("a[title]");
            if (aWithTitle) title = (aWithTitle.attr("title") || aWithTitle.text || "").trim();
            if (!title) {
                const u = card.selectFirst(".thumb-under p a") || card.selectFirst(".thumb-under a");
                if (u) title = (u.text || "").trim();
            }
            const anchor = card.selectFirst("a[href*='/video-']") || card.selectFirst("a");
            if (!anchor) continue;
            const href = anchor.attr("href") || "";
            if (!href || href === "#") continue;
            const link = href.startsWith("http") ? href : `https://www.xnxx.com${href}`;
            if (seen.has(link)) continue;
            seen.add(link);

            const imgEl = card.selectFirst("img");
            const thumb = imgEl ? (imgEl.attr("data-src") || imgEl.attr("data-original") || imgEl.attr("src") || "") : "";
            const durEl = card.selectFirst(".thumb-under .metadata") || card.selectFirst(".duration");
            let duration = "";
            if (durEl) {
                const t = (durEl.text || "").replace(/\s+/g, " ").trim();
                const m = t.match(/(\d+\s*(?:min|sec|h))/i);
                if (m) duration = m[1];
            }

            items.push({
                name: title || "Untitled",
                imageUrl: thumb,
                link,
                description: duration ? `Duration: ${duration}` : ""
            });
        }
        const hasNext = !!doc.selectFirst(".pagination .next, a[rel='next'], .no-page.next-page");
        return { list: items, hasNextPage: hasNext };
    }

    // ---------- detail ----------
    async getDetail(url) {
        const res = await new Client().get(url, this.getHeaders(url));
        const doc = new Document(res.body);
        const title = (doc.selectFirst('meta[property="og:title"]')?.attr("content")
            || doc.selectFirst("h2.page-title, h1.content-title")?.text
            || "").trim();
        const description = (doc.selectFirst('meta[property="og:description"]')?.attr("content")
            || doc.selectFirst(".video-description, .metadata")?.text
            || "").trim();
        const thumb = doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
        // Tags as plain strings (not {name:...} objects).
        const tagEls = doc.select(".video-tags a, .metadata-row.tags a, a[href*='/tags/'], a[href*='/categories/']");
        const tags = [];
        const seen = new Set();
        for (const el of tagEls) {
            const t = (el.text || "").trim();
            if (t && !seen.has(t)) { seen.add(t); tags.push(t); }
        }
        return {
            name: title || "Untitled",
            imageUrl: thumb,
            description,
            genre: tags,
            status: 0,
            episodes: [{ name: (title && title.trim ? title.trim() : (title || "Watch")), url }]
        };
    }

    // ---------- video sources ----------
    async getVideoList(url) {
        const res = await new Client().get(url, this.getHeaders(url));
        const html = res.body;
        const videos = [];
        const hls  = (html.match(/html5player\.setVideoHLS\(['"]([^'"]+)['"]\)/)       || [])[1];
        const high = (html.match(/html5player\.setVideoUrlHigh\(['"]([^'"]+)['"]\)/)   || [])[1];
        const low  = (html.match(/html5player\.setVideoUrlLow\(['"]([^'"]+)['"]\)/)    || [])[1];
        const headers = this.getHeaders(url);
        if (hls)  videos.push({ url: hls,  quality: "Auto · HLS", originalUrl: hls,  headers });
        if (high) videos.push({ url: high, quality: "720p",       originalUrl: high, headers });
        if (low)  videos.push({ url: low,  quality: "360p",       originalUrl: low,  headers });
        // Sort with preferred quality first
        const want = (this.prefQuality || "auto").toLowerCase();
        const matchKey = q => {
            const ql = q.toLowerCase();
            if (want === "auto"  && ql.includes("auto")) return 0;
            if (want === "720p"  && ql.includes("720")) return 0;
            if (want === "360p"  && ql.includes("360")) return 0;
            return 1;
        };
        videos.sort((a, b) => matchKey(a.quality) - matchKey(b.quality));
        return videos;
    }
    async getPageList(url) { return []; }
    getFilterList() { return []; }

    // ---------- preferences schema (shown in app settings) ----------
    getSourcePreferences() {
        return [
            {
                key: "xnxx_lang",
                list_preference: {
                    title: "Content language",
                    summary: "Selects the XNXX language section (Popular/New/Search) — sent as `lang` cookie + Accept-Language.",
                    valueIndex: 0,
                    entries: [
                        "English", "Français", "Deutsch", "Español", "Italiano",
                        "Português", "Русский", "日本語", "中文", "한국어",
                        "Nederlands", "Polski", "Türkçe", "العربية", "हिन्दी"
                    ],
                    entryValues: [
                        "en", "fr", "de", "es", "it",
                        "pt", "ru", "jp", "cn", "kr",
                        "nl", "pl", "tr", "ar", "hi"
                    ]
                }
            },
            {
                key: "preferred_quality",
                list_preference: {
                    title: "Preferred quality",
                    summary: "Default video quality picked first in the player.",
                    valueIndex: 0,
                    entries: ["Auto (HLS)", "720p", "360p"],
                    entryValues: ["auto", "720p", "360p"]
                }
            }
        ];
    }
}
