const watchtowerSources = [{
    "name": "XNXX",
    "lang": "en",
    "baseUrl": "https://www.xnxx.com",
    "apiUrl": "",
    "iconUrl": "https://www.xnxx.com/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.1.0",
    "pkgPath": "watch/nsfw/en/xnxx.js",
    "notes": "Adult content (18+)",
    "isNsfw": true
}];

class DefaultExtension extends MProvider {

    // ── Preferences ──────────────────────────────────────────────────────────
    _pref(key, def) {
        const p = this.source && this.source.prefs && this.source.prefs.find(x => x.key === key);
        return (p && p.value !== undefined && p.value !== null && p.value !== "") ? p.value : def;
    }
    get prefQuality() { return this._pref("preferred_quality", "auto"); }

    getHeaders(url) {
        return {
            "Referer":         "https://www.xnxx.com/",
            "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en,en-US;q=0.8"
        };
    }

    // ── Date-offset helper (popular /best/ endpoint) ──────────────────────────
    // XNXX /best/ uses month-based URLs (/best/YYYY-MM).
    // page=1 → current month, page=2 → last month, etc.
    _monthSlug(page) {
        const now       = new Date(Date.now());
        const baseYear  = now.getFullYear();
        const baseMonth = now.getMonth() + 1; // getMonth() is 0-based
        let total = (baseYear * 12 + baseMonth - 1) - (page - 1);
        const year  = Math.floor(total / 12);
        const month = (total % 12) + 1;
        return `${year}-${String(month).padStart(2, '0')}`;
    }

    // ── Filter helpers ────────────────────────────────────────────────────────
    _filterMode(filters)    { return filters && filters[0] ? (filters[0].state || 0) : 0; }
    _filterSortTop(filters) { return filters && filters[1] ? (filters[1].state || 0) === 1 : false; }

    // ── Listings ──────────────────────────────────────────────────────────────

    // Popular: mode 0 = /hits/ (all-time), mode 1 = /best/YYYY-MM (best of month)
    async getPopular(page) {
        const mode = this._filterMode(this._currentFilters || []);
        let url, res;
        if (mode === 1) {
            const slug = this._monthSlug(page);
            url  = `https://www.xnxx.com/best/${slug}`;
            extLog('info', `XNXX.getPopular[bestOf] page=${page} → ${url}`);
            res  = await new Client().get(url, this.getHeaders(url));
            return this._parseVideoList(res.body, page, "best");
        }
        url = `https://www.xnxx.com/hits/${page}`;
        extLog('info', `XNXX.getPopular[hits] page=${page} → ${url}`);
        res  = await new Client().get(url, this.getHeaders(url));
        return this._parseVideoList(res.body, page, "hits");
    }

    get supportsLatest() { return true; }

    async getLatestUpdates(page) {
        // /hits/ lists latest most-viewed; XNXX doesn't have a clean chronological feed
        const url = `https://www.xnxx.com/hits/${page}`;
        const res = await new Client().get(url, this.getHeaders(url));
        return this._parseVideoList(res.body, page, "hits");
    }

    async search(query, page, filters) {
        this._currentFilters = filters;
        const top = this._filterSortTop(filters);
        const q   = encodeURIComponent(query.trim().replace(/\s+/g, "+"));
        // top-rated: append ?top to paginated search URL
        const url = top
            ? `https://www.xnxx.com/search/${q}/${page}?top`
            : `https://www.xnxx.com/search/${q}/${page}`;
        extLog('info', `XNXX.search page=${page} top=${top} → ${url}`);
        const res = await new Client().get(url, this.getHeaders(url));
        return this._parseVideoList(res.body, page, "search");
    }

    // mode: "hits" | "best" | "search"
    _parseVideoList(html, page, mode) {
        const doc   = new Document(html);
        const items = [];
        const seen  = {};

        // Selector: .thumb-block.video (NOT .mozaique .thumb-block which selects category blocks)
        const cards = doc.select(".thumb-block.video");
        extLog('info', `XNXX._parseVideoList[${mode}]: page=${page} cards=${cards.length}`);

        for (const card of cards) {
            // Title: prefer <a title="..."> inside .thumb-under
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

            // Thumbnail: lazy-loaded
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

        // hasNextPage
        let hasNext = false;
        if (mode === "best") {
            // Date-based: up to 24 months back
            hasNext = items.length > 0 && page < 24;
        } else if (mode === "hits") {
            // /hits/N — detect explicit next-page link
            const nextStr = `/hits/${page + 1}`;
            hasNext = html.includes(nextStr);
            if (!hasNext && items.length >= 20) hasNext = true; // fallback
        } else {
            // search: /search/{q}/{page} or {page}?top
            // XNXX shows multiple page links; detect presence of next page
            const nextStr = `/${page + 1}`;
            hasNext = html.includes(nextStr) && items.length > 0;
            if (!hasNext && items.length >= 30) hasNext = true;
        }

        return { list: items, hasNextPage: hasNext };
    }

    // ── Detail page ───────────────────────────────────────────────────────────
    async getDetail(url) {
        const res  = await new Client().get(url, this.getHeaders(url));
        const doc  = new Document(res.body);
        const title = (
            doc.selectFirst("h1.page-title") ||
            doc.selectFirst("h2.page-title") ||
            doc.selectFirst("h1.content-title")
        )?.text?.trim()
            || doc.selectFirst('meta[property="og:title"]')?.attr("content")?.trim()
            || "Unknown";
        const thumb = doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
        const tagEls = doc.select(".video-tags a, .tags a");
        const tags = [];
        for (const el of tagEls) {
            const n = (el.text || "").trim();
            if (n) tags.push({ name: n });
        }
        return { name: title, imageUrl: thumb, description: "", genre: tags,
            episodes: [{ name: title, url }] };
    }

    // ── Video sources ─────────────────────────────────────────────────────────
    async getVideoList(url) {
        const res    = await new Client().get(url, this.getHeaders(url));
        const html   = res.body;
        const videos = [];
        const headers = {
            "Referer":    url,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        };

        const hlsMatch  = html.match(/html5player\.setVideoHLS\('([^']+)'\)/);
        const mp4High   = html.match(/html5player\.setVideoUrlHigh\('([^']+)'\)/);
        const mp4Low    = html.match(/html5player\.setVideoUrlLow\('([^']+)'\)/);

        if (hlsMatch) videos.push({ url: hlsMatch[1], quality: "Auto (HLS)", originalUrl: hlsMatch[1], headers });
        if (mp4High)  videos.push({ url: mp4High[1], quality: "720p",        originalUrl: mp4High[1],  headers });
        if (mp4Low)   videos.push({ url: mp4Low[1],  quality: "360p",        originalUrl: mp4Low[1],   headers });

        // Sort preferred quality first
        const want = (this.prefQuality || "auto").toLowerCase();
        videos.sort((a, b) => {
            const score = q => {
                const ql = q.toLowerCase();
                if (want === "auto" && ql.includes("auto")) return 0;
                if (want === "720p" && ql.includes("720"))  return 0;
                if (want === "360p" && ql.includes("360"))  return 0;
                return 1;
            };
            return score(a.quality) - score(b.quality);
        });
        extLog('info', `XNXX.getVideoList: ${videos.length} sources`);
        return videos;
    }

    async getPageList(url) { return []; }

    // ── Filters ───────────────────────────────────────────────────────────────
    getFilterList() {
        return [
            {
                type_name: "SelectFilter",
                name: "Popular mode",
                state: 0,
                values: [
                    { type_name: "SelectOption", name: "Most Hits (all time)", value: "hits" },
                    { type_name: "SelectOption", name: "Best of Month",        value: "best" },
                ]
            },
            {
                type_name: "SelectFilter",
                name: "Search sort",
                state: 0,
                values: [
                    { type_name: "SelectOption", name: "Most Recent", value: "recent" },
                    { type_name: "SelectOption", name: "Top Rated",   value: "top"    },
                ]
            }
        ];
    }

    // ── Preferences ───────────────────────────────────────────────────────────
    getSourcePreferences() {
        return [
            {
                key: "preferred_quality",
                list_preference: {
                    title: "Preferred quality",
                    summary: "Default video quality picked first in the player.",
                    valueIndex: 0,
                    entries:      ["Auto (HLS)", "720p", "360p"],
                    entryValues:  ["auto",       "720p", "360p"]
                }
            }
        ];
    }
}
