const watchtowerSources = [{
    "name": "XNXX",
    "lang": "en",
    "baseUrl": "https://www.xnxx.com",
    "apiUrl": "",
    "iconUrl": "https://www.xnxx.com/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.0.8",
    "pkgPath": "watch/nsfw/en/xnxx.js",
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
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": this.langCode + ",en;q=0.8",
            "Cookie": "lang=" + this.langCode
        };
    }

    // ── Date-offset helper ────────────────────────────────────────────────────
    // XNXX /best/ uses month-based URLs (/best/YYYY-MM).
    // page=1 → current month, page=2 → last month, etc.
    _monthSlug(page) {
        // Use Date.now() so this stays correct across months without hardcoding.
        const now        = new Date(Date.now());
        const baseYear   = now.getFullYear();
        const baseMonth  = now.getMonth() + 1; // getMonth() is 0-based
        let totalMonths  = (baseYear * 12 + baseMonth - 1) - (page - 1);
        const year  = Math.floor(totalMonths / 12);
        const month = (totalMonths % 12) + 1;
        return `${year}-${String(month).padStart(2, '0')}`;
    }

    // ---------- listing ----------
    async getPopular(page) {
        // /best/YYYY-MM — monthly "best of" archive
        const slug = this._monthSlug(page);
        const url  = `https://www.xnxx.com/best/${slug}`;
        extLog('info', `XNXX.getPopular page=${page} → ${url}`);
        const res  = await new Client().get(url, this.getHeaders(url));
        return this._parseVideoList(res.body, page, 24);
    }

    get supportsLatest() { return true; }

    async getLatestUpdates(page) {
        const url = `https://www.xnxx.com/new/${this.langCode}/${page}`;
        const res = await new Client().get(url, this.getHeaders(url));
        return this._parseVideoList(res.body, page, 0);
    }

    async search(query, page, filters) {
        const q   = encodeURIComponent(query.trim().replace(/\s+/g, "+"));
        const url = `https://www.xnxx.com/search/${this.langCode}/${q}/${page}`;
        const res = await new Client().get(url, this.getHeaders(url));
        return this._parseVideoList(res.body, page, 0);
    }

    // minItems: if >= minItems were found we assume there's another page
    _parseVideoList(html, page, minItems) {
        const doc   = new Document(html);
        const items = [];
        const seen  = {};

        // XNXX uses .mozaique > .thumb-block; try broad fallback if mozaique not present
        let cards = doc.select(".mozaique .thumb-block");
        if (!cards || cards.length === 0) {
            cards = doc.select(".thumb-block");
        }
        extLog('info', `XNXX._parseVideoList: cards=${cards.length}`);

        for (const card of cards) {
            // Title: prefer the <a title="…"> inside .thumb-under
            let title = "";
            const aTitle = card.selectFirst(".thumb-under a[title]") || card.selectFirst("a[title]");
            if (aTitle) title = (aTitle.attr("title") || aTitle.text || "").trim();
            if (!title) {
                const u = card.selectFirst(".thumb-under p a") || card.selectFirst(".thumb-under a");
                if (u) title = (u.text || "").trim();
            }

            // Link: must contain /video-
            const anchor = card.selectFirst("a[href*='/video-']") || card.selectFirst("a");
            if (!anchor) continue;
            const href = anchor.attr("href") || "";
            if (!href || href === "#") continue;
            const link = href.startsWith("http") ? href : `https://www.xnxx.com${href}`;
            if (seen[link]) continue;
            seen[link] = 1;

            // Thumbnail
            const imgEl = card.selectFirst("img");
            const thumb = imgEl
                ? (imgEl.attr("data-src") || imgEl.attr("data-original") || imgEl.attr("src") || "")
                : "";

            // Duration
            const durEl = card.selectFirst(".thumb-under .metadata") || card.selectFirst(".duration");
            let duration = "";
            if (durEl) {
                const t = (durEl.text || "").replace(/\s+/g, " ").trim();
                const m = t.match(/(\d+\s*(?:min|sec|h))/i);
                if (m) duration = m[1];
            }

            items.push({
                name:        title || "Untitled",
                imageUrl:    thumb,
                link,
                description: duration ? `Duration: ${duration}` : ""
            });
        }

        extLog('info', `XNXX._parseVideoList: items=${items.length}`);

        // hasNextPage:
        // • For /best/ (date-based): true while items found AND page < 24 (2 years of archives)
        // • For /new/ and search: use pagination link detection
        let hasNext = false;
        if (minItems > 0) {
            // Date-based popular: more months available
            hasNext = items.length > 0 && page < 24;
        } else {
            // Page-based (new/search): check for next-page link
            const nextSel = doc.selectFirst(".pagination .next, a[rel='next'], .no-page.next-page");
            hasNext = !!nextSel;
            // Fallback: if we got items and haven't tried many pages yet
            if (!hasNext && items.length >= 30 && page < 10) hasNext = true;
        }

        return { list: items, hasNextPage: hasNext };
    }

    // ---------- detail page ----------
    async getDetail(url) {
        const res = await new Client().get(url, this.getHeaders(url));
        const doc = new Document(res.body);
        const title = (doc.selectFirst("h1.page-title") || doc.selectFirst("h2.page-title") ||
                       doc.selectFirst("h1.content-title"))?.text?.trim()
            || doc.selectFirst('meta[property="og:title"]')?.attr("content")?.trim()
            || "Unknown";
        const thumb = doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
        const tagEls = doc.select(".video-tags a, .tags a");
        const tags = [];
        for (const el of tagEls) {
            const n = (el.text || "").trim();
            if (n) tags.push({ name: n });
        }
        return {
            name: title, imageUrl: thumb, description: "",
            genre: tags,
            episodes: [{ name: title, url }]
        };
    }

    // ---------- video sources ----------
    async getVideoList(url) {
        const res  = await new Client().get(url, this.getHeaders(url));
        const html = res.body;
        const videos = [];
        const headers = {
            "Referer":    url,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        };

        // HLS (auto)
        const hlsMatch = html.match(/html5player\.setVideoHLS\('([^']+)'\)/);
        if (hlsMatch) {
            videos.push({ url: hlsMatch[1], quality: "Auto (HLS)", originalUrl: hlsMatch[1], headers });
        }

        // MP4 sources
        const mp4High = html.match(/html5player\.setVideoUrlHigh\('([^']+)'\)/);
        const mp4Low  = html.match(/html5player\.setVideoUrlLow\('([^']+)'\)/);
        if (mp4High) {
            const high = mp4High[1];
            videos.push({ url: high, quality: "720p", originalUrl: high, headers });
        }
        if (mp4Low) {
            const low = mp4Low[1];
            videos.push({ url: low, quality: "360p", originalUrl: low, headers });
        }

        // Sort with preferred quality first
        const want = (this.prefQuality || "auto").toLowerCase();
        const matchKey = q => {
            const ql = q.toLowerCase();
            if (want === "auto"  && ql.includes("auto")) return 0;
            if (want === "720p"  && ql.includes("720"))  return 0;
            if (want === "360p"  && ql.includes("360"))  return 0;
            return 1;
        };
        videos.sort((a, b) => matchKey(a.quality) - matchKey(b.quality));
        extLog('info', `XNXX.getVideoList: ${videos.length} sources found`);
        return videos;
    }

    async getPageList(url) { return []; }
    getFilterList() { return []; }

    // ---------- preferences schema ----------
    getSourcePreferences() {
        return [
            {
                key: "xnxx_lang",
                list_preference: {
                    title: "Content language",
                    summary: "Selects the XNXX language section (New/Search) — sent as `lang` cookie + Accept-Language.",
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
