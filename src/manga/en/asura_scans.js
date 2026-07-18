const watchtowerSources = [{
    "id": 524070078,
    "name": "Asura Scans",
    "lang": "en",
    "baseUrl": "https://asurascans.com",
    "apiUrl": "",
    "iconUrl": "https://asurascans.com/images/logo.webp",
    "typeSource": "single",
    "itemType": 0,
    "version": "0.2.0",
    "dateFormat": "",
    "dateFormatLocale": "",
    "pkgPath": "manga/src/en/asurascans.js",
    "isNsfw": false,
    "hasCloudflare": false,
    "sourceCodeUrl": "",
    "isManga": true,
    "isFullData": false,
    "appMinVerReq": "0.5.0",
    "additionalParams": "",
    "sourceCodeLanguage": 1,
    "notes": "",
    "requiresAccount": false,
    "hasDRM": false,
}];

// ── NOTE v0.2.0 ──────────────────────────────────────────────────────────────
// AsuraScans migrated from asuracomic.net (Next.js) to asurascans.com (Astro).
//
// URL changes:
//   OLD baseUrl : https://asuracomic.net
//   NEW baseUrl : https://asurascans.com
//
//   OLD listing : /series?name=&status=-1&types=-1&order=rating&page=N
//   NEW listing : /browse?order=popular&page=N
//
//   OLD detail  : /series/{slug}
//   NEW detail  : /comics/{slug-with-hash-id}   ← hash suffix added
//
//   OLD chapter : /series/{slug}/{chNum}
//   NEW chapter : /comics/{slug-with-hash-id}/chapter/{n}
//
// The new site embeds page image URLs as HTML-entity-encoded JSON inside the
// page's inline script block. See getPageList() for the extraction logic.
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = "https://asurascans.com";

class DefaultExtension extends MProvider {

    getBaseUrl() {
        return new SharedPreferences().get("overrideBaseUrl1") || BASE_URL;
    }

    getHeaders() {
        return {
            "Referer": this.getBaseUrl() + "/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        };
    }

    // ── List parser ──────────────────────────────────────────────────────────
    // Parses div.series-card cards from /browse pages (both SSR noscript and
    // the interactive section share the same HTML card markup).
    mangaListFromPage(res) {
        const doc = new Document(res.body);
        const cards = doc.select("div.series-card");
        const list = [];
        const seen = {};
        for (const card of cards) {
            // Cover image
            const imgEl = card.selectFirst("a img");
            const imageUrl = imgEl ? (imgEl.getSrc || imgEl.attr("src") || "") : "";

            // Title: h3 inside the card
            const h3 = card.selectFirst("h3");
            const name = h3 ? (h3.text || "").trim() : "";

            // Link: first <a> with href=/comics/
            const aEl = card.selectFirst("a[href]");
            const href = aEl ? (aEl.getHref || aEl.attr("href") || "") : "";
            const link = href.startsWith("http") ? href : (this.getBaseUrl() + href);

            if (name && link && !seen[link]) {
                seen[link] = 1;
                list.push({ name, imageUrl, link });
            }
        }
        // Pagination: <a aria-label="Next page">
        const hasNextPage = !!doc.selectFirst("a[aria-label='Next page']");
        return { list, hasNextPage };
    }

    toStatus(status) {
        const s = (status || "").toLowerCase().trim();
        if (s === "ongoing") return 0;
        if (s === "completed") return 1;
        if (s === "hiatus") return 2;
        if (s === "dropped" || s === "cancelled" || s === "canceled") return 3;
        return 5;
    }

    async getPopular(page) {
        const baseUrl = this.getBaseUrl();
        const res = await new Client().get(
            `${baseUrl}/browse?order=popular&page=${page}`,
            this.getHeaders()
        );
        return this.mangaListFromPage(res);
    }

    async getLatestUpdates(page) {
        const baseUrl = this.getBaseUrl();
        const res = await new Client().get(
            `${baseUrl}/browse?order=update&page=${page}`,
            this.getHeaders()
        );
        return this.mangaListFromPage(res);
    }

    async search(query, page, filters) {
        const baseUrl = this.getBaseUrl();
        let url = `${baseUrl}/browse?page=${page}`;
        if (query && query.trim()) url += `&name=${encodeURIComponent(query.trim())}`;

        // Apply filters
        if (filters && filters.length > 0) {
            for (const f of filters) {
                if (!f) continue;
                if (f.type_name === "SelectFilter" && f.name === "Status") {
                    const vals = Array.from(f.values || []);
                    const v = (vals[f.state] || {}).value || "";
                    if (v) url += `&status=${v}`;
                } else if (f.type_name === "SelectFilter" && f.name === "Sort By") {
                    const vals = Array.from(f.values || []);
                    const v = (vals[f.state] || {}).value || "";
                    if (v) url += `&order=${v}`;
                } else if (f.type_name === "GroupFilter" && f.name === "Genre") {
                    const items = Array.from(f.state || []);
                    for (const item of items) {
                        if (item && item.state === true) url += `&genre=${encodeURIComponent(item.value)}`;
                    }
                }
            }
        }

        const res = await new Client().get(url, this.getHeaders());
        return this.mangaListFromPage(res);
    }

    async getDetail(url) {
        // url may be a full URL (/comics/slug-hash) or relative path
        const fullUrl = url.startsWith("http") ? url : (this.getBaseUrl() + url);
        const res = await new Client().get(fullUrl, this.getHeaders());
        const doc = new Document(res.body);

        // ── Metadata from JSON-LD (SSR, always present) ───────────────────
        let name = "", description = "", imageUrl = "", genre = [], artist = "", author = "";
        let status = 5;
        const jsonLdEls = doc.select('script[type="application/ld+json"]');
        for (const el of jsonLdEls) {
            try {
                const raw = (el.text || "")
                    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
                const data = JSON.parse(raw);
                if (data["@type"] === "ComicSeries") {
                    name        = data.name || "";
                    description = (data.description || "").replace(/<[^>]+>/g, "").trim();
                    imageUrl    = data.image || "";
                    genre       = Array.isArray(data.genre) ? data.genre : [];
                    artist      = (data.illustrator || {}).name || "";
                    author      = (data.author || {}).name || artist;
                }
            } catch (_) { /* skip non-JSON-LD blocks */ }
        }

        // ── Status from visible badge (optional, enhances JSON-LD) ────────
        const statusBadge = doc.selectFirst("span.capitalize");
        if (statusBadge) status = this.toStatus(statusBadge.text);

        // ── Chapters from SSR HTML: a[href*="/chapter/"] ──────────────────
        const chapters = [];
        const seenUrls = {};
        const chapterEls = doc.select("a[href]");
        for (const a of chapterEls) {
            const href = a.getHref || a.attr("href") || "";
            if (!href.includes("/chapter/")) continue;
            const fullChUrl = href.startsWith("http") ? href : (this.getBaseUrl() + href);
            if (seenUrls[fullChUrl]) continue;
            seenUrls[fullChUrl] = 1;

            // Extract chapter number from URL: …/chapter/177
            const numMatch = href.match(/\/chapter\/(\d+(?:\.\d+)?)$/);
            const chNum = numMatch ? numMatch[1] : "";
            const chName = chNum ? `Chapter ${chNum}` : href;

            chapters.push({ name: chName, url: fullChUrl, dateUpload: null });
        }

        // Sort descending (newest first)
        chapters.sort((a, b) => {
            const nA = parseFloat(a.name.replace("Chapter ", "")) || 0;
            const nB = parseFloat(b.name.replace("Chapter ", "")) || 0;
            return nB - nA;
        });

        return { name, imageUrl, description, genre, author, artist, status, chapters };
    }

    async getPageList(url) {
        // url is a full chapter URL: https://asurascans.com/comics/{slug}/chapter/{n}
        const fullUrl = url.startsWith("http") ? url : (this.getBaseUrl() + url);
        const res = await new Client().get(fullUrl, this.getHeaders());
        const body = res.body;

        // The Astro page embeds page data as HTML-entity-encoded JSON inside an
        // inline script. Pattern (URL-decoded form):
        //   "pages":[1,[[0,{"url":[0,"https://cdn.asurascans.com/...webp"]}], ...]]
        //
        // In raw HTML the quotes are encoded as &quot; so we match on that:
        const re = /&quot;url&quot;:\[0,&quot;(https:\/\/cdn\.asurascans\.com\/asura-images\/chapters\/[^&]+)&quot;\]/g;
        const pages = [];
        const seen = {};
        let m = re.exec(body);
        while (m !== null) {
            const imgUrl = m[1];
            if (!seen[imgUrl]) {
                seen[imgUrl] = 1;
                pages.push(imgUrl);
            }
            m = re.exec(body);
        }

        if (pages.length > 0) return pages;

        // Fallback: extract CDN URLs from the raw body directly
        const re2 = /https:\/\/cdn\.asurascans\.com\/asura-images\/chapters\/[^\s"'<>&]+\.(?:webp|jpg|jpeg|png)/g;
        let m2 = re2.exec(body);
        while (m2 !== null) {
            const imgUrl = m2[0];
            if (!seen[imgUrl]) {
                seen[imgUrl] = 1;
                pages.push(imgUrl);
            }
            m2 = re2.exec(body);
        }
        return pages;
    }

    getFilterList() {
        return [
            {
                type_name: "SelectFilter",
                name: "Sort By",
                state: 0,
                values: [
                    ["Popular",  "popular"],
                    ["Latest",   "update"],
                    ["Rating",   "rating"],
                    ["A–Z",      "title"],
                    ["New",      "new"],
                ].map((x) => ({ type_name: "SelectOption", name: x[0], value: x[1] })),
            },
            {
                type_name: "SelectFilter",
                name: "Status",
                state: 0,
                values: [
                    ["All",       ""],
                    ["Ongoing",   "ongoing"],
                    ["Completed", "completed"],
                    ["Hiatus",    "hiatus"],
                    ["Dropped",   "dropped"],
                ].map((x) => ({ type_name: "SelectOption", name: x[0], value: x[1] })),
            },
            {
                type_name: "GroupFilter",
                name: "Genre",
                state: [
                    ["Action",       "action"],
                    ["Adventure",    "adventure"],
                    ["Comedy",       "comedy"],
                    ["Drama",        "drama"],
                    ["Fantasy",      "fantasy"],
                    ["Horror",       "horror"],
                    ["Isekai",       "isekai"],
                    ["Martial Arts", "martial-arts"],
                    ["Mystery",      "mystery"],
                    ["Romance",      "romance"],
                    ["Sci-Fi",       "sci-fi"],
                    ["Seinen",       "seinen"],
                    ["Shounen",      "shounen"],
                    ["Slice of Life","slice-of-life"],
                    ["Sports",       "sports"],
                    ["Supernatural", "supernatural"],
                    ["Tragedy",      "tragedy"],
                ].map((x) => ({ type_name: "CheckBox", name: x[0], value: x[1], state: false })),
            },
        ];
    }

    getSourcePreferences() {
        return [{
            "key": "overrideBaseUrl1",
            "editTextPreference": {
                "title": "Override BaseUrl",
                "summary": BASE_URL,
                "value": BASE_URL,
                "dialogTitle": "Override BaseUrl",
                "dialogMessage": `Default: ${BASE_URL}`,
            }
        }];
    }

    async getCustomList(listId, page) {
        if (listId === "popular") return this.getPopular(page);
        return this.getLatestUpdates(page);
    }
}
