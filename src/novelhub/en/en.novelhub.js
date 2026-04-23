const mangayomiSources = [{
    "name": "NovelHub",
    "lang": "en",
    "baseUrl": "https://novelhubapp.com",
    "apiUrl": "",
    "iconUrl": "https://novelhubapp.com/favicon.ico",
    "typeSource": "single",
    "itemType": 2,
    "version": "1.0.0",
    "pkgPath": "novelhub/en/en.novelhub.js",
    "notes": "Free web novels (Romance, Fantasy, Mystery, Sci-fi, LGBT+, Urban...). Same publisher as LokLok / MovieBox.",
    "isNsfw": false
}];

class DefaultExtension extends MProvider {
    headers() {
        return {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
            "Referer": "https://novelhubapp.com/"
        };
    }
    async _get(url) {
        const res = await new Client().get(url, this.headers());
        return res.body || "";
    }
    async _getJson(url) {
        const t = await this._get(url);
        try { return JSON.parse(t); } catch (_) { return null; }
    }

    /**
     * NovelHub is a Nuxt SSR app — chapter content + nav are static
     * JSON/TXT files on `nacdn.novelhubapp.com`. The HTML pages embed
     * a compressed `__NUXT_DATA__` array that resolves into the page's
     * Vue state. We parse it to walk references like `[8, 20, 27, ...]`.
     */
    _parseNuxtData(html) {
        const m = html.match(/__NUXT_DATA__[^>]*>([\s\S]*?)<\/script>/);
        if (!m) return null;
        try { return JSON.parse(m[1]); } catch (_) { return null; }
    }
    /**
     * Resolves a reference inside the NUXT_DATA array recursively.
     * Each element can be a primitive, an object describing keys+ref
     * indices, or an array of ref indices. Cycles are broken by `seen`.
     */
    _resolve(arr, idx, seen) {
        if (idx === undefined || idx === null) return null;
        if (typeof idx !== "number") return idx;
        if (seen.has(idx)) return null;
        seen.add(idx);
        const v = arr[idx];
        if (v === null || v === undefined) return v;
        if (typeof v !== "object") return v;
        if (Array.isArray(v)) {
            // Marker arrays like ["ShallowReactive",1] should be unwrapped.
            if (v.length === 2 && (v[0] === "ShallowReactive" || v[0] === "Reactive")) {
                return this._resolve(arr, v[1], seen);
            }
            return v.map(i => this._resolve(arr, i, new Set(seen)));
        }
        const out = {};
        for (const k of Object.keys(v)) out[k] = this._resolve(arr, v[k], new Set(seen));
        return out;
    }
    _findResData(arr) {
        // The home/detail/reader pages always store a top-level state with
        // a `$sresData` field that holds the page's content payload.
        for (let i = 0; i < arr.length; i++) {
            const v = arr[i];
            if (v && typeof v === "object" && !Array.isArray(v) && "$sresData" in v) {
                return this._resolve(arr, v.$sresData, new Set());
            }
        }
        return null;
    }

    _toItem(novel) {
        const cover = (novel && novel.cover && novel.cover.url) || novel.coverUrl || "";
        const link = novel.link
            ? `https://novelhubapp.com/novel/${novel.link.replace(/^\/+/, "")}`
            : (novel.detailUrl || "");
        return {
            name: novel.title || novel.name || "Untitled",
            imageUrl: cover,
            link
        };
    }

    _collectNovels(node, out) {
        if (!node) return;
        if (Array.isArray(node)) { for (const c of node) this._collectNovels(c, out); return; }
        if (typeof node !== "object") return;
        // Heuristic: anything with title + cover + link is treated as a novel card.
        if ((node.title || node.name) && (node.cover || node.coverUrl) && (node.link || node.detailUrl)) {
            out.push(this._toItem(node));
            return;
        }
        for (const k of Object.keys(node)) this._collectNovels(node[k], out);
    }

    async _scrapeListing(url) {
        const html = await this._get(url);
        const arr = this._parseNuxtData(html);
        if (!arr) return [];
        const data = this._findResData(arr) || this._resolve(arr, 7, new Set());
        const out = [];
        this._collectNovels(data, out);
        // Dedup by link.
        const seen = new Set();
        return out.filter(x => x.link && !seen.has(x.link) && seen.add(x.link));
    }

    // ---------- popular / latest ----------
    async getPopular(page) {
        const arr = await this._scrapeListing("https://novelhubapp.com/");
        // SSR doesn't paginate; cap at 1 page of items.
        return { list: arr, hasNextPage: false };
    }
    async getLatestUpdates(page) {
        // Reuse the "best-novels" content list as a "latest" surface.
        const arr = await this._scrapeListing("https://novelhubapp.com/content-list/best-novels-yZYDPmBIT84");
        return { list: arr, hasNextPage: false };
    }

    // ---------- search ----------
    async search(query, page, filters) {
        const arr = await this._scrapeListing(
            `https://novelhubapp.com/search?keyword=${encodeURIComponent(query)}`
        );
        if (arr.length) return { list: arr, hasNextPage: false };
        // Fallback: client-side filter of homepage list.
        const all = await this._scrapeListing("https://novelhubapp.com/");
        const q = query.toLowerCase();
        return { list: all.filter(x => x.name.toLowerCase().includes(q)), hasNextPage: false };
    }

    // ---------- detail ----------
    async getDetail(url) {
        const html = await this._get(url);
        const nuxt = this._parseNuxtData(html);
        if (!nuxt) return { name: "Unknown", imageUrl: "", description: "", genre: [], status: 0, episodes: [] };
        const data = this._findResData(nuxt) || {};
        const cover = (data.cover && data.cover.url) || "";
        const genres = [];
        if (Array.isArray(data.genres)) for (const g of data.genres) {
            if (typeof g === "string") genres.push(g); else if (g && g.name) genres.push(g.name);
        }
        if (data.language) genres.push(data.language);
        if (Array.isArray(data.tags)) for (const t of data.tags) {
            if (typeof t === "string") genres.push(t); else if (t && t.name) genres.push(t.name);
        }

        // Fetch the static chapter list.
        const episodes = [];
        if (data.navFileUrl) {
            try {
                const nav = await this._getJson(data.navFileUrl);
                if (nav && Array.isArray(nav.chapters)) {
                    // Reverse: latest → oldest is the convention.
                    const chapters = nav.chapters.slice().reverse();
                    for (const c of chapters) {
                        episodes.push({
                            name: c.chapterName || `Chapter ${c.seq}`,
                            url: c.fileUrl
                        });
                    }
                }
            } catch (_) {}
        }

        return {
            name: data.title || "Untitled",
            imageUrl: cover,
            description: data.summary || data.description || "",
            genre: genres,
            status: (data.novelStatus === 2 || data.novelStatusDesc === "Completed") ? 1 : 0,
            episodes
        };
    }

    // ---------- chapter content ----------
    async getPageList(url) {
        // Plain UTF-8 .txt file. Watchtower's novel reader expects the content
        // returned as a single page (string).
        try {
            const res = await new Client().get(url, this.headers());
            // Some Watchtower builds want an array of strings (multi-page novels).
            return [res.body || ""];
        } catch (e) {
            return [`Failed to load chapter: ${e && e.message ? e.message : "network error"}`];
        }
    }

    getFilterList() { return []; }

    getSourcePreferences() { return []; }
}
