const mangayomiSources = [{
    "name": "Internet Archive Films",
    "lang": "multi",
    "baseUrl": "https://archive.org",
    "apiUrl": "https://archive.org/advancedsearch.php",
    "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=archive.org",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "1.0.0",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "watch/src/multi/internetarchive.js",
    "notes": "Free public domain films, short films, classics, documentaries. No account needed."
}];

// ═══════════════════════════════════════════════════════════
//  Internet Archive — archive.org
//  The world's largest free digital library.
//  Movies: classic films, short films, documentaries,
//  newsreels, silent films, sci-fi, horror, animation.
//  All content is PUBLIC DOMAIN or Creative Commons.
// ═══════════════════════════════════════════════════════════

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
    }

    get BASE() { return "https://archive.org"; }
    get API() { return "https://archive.org/advancedsearch.php"; }
    get META_API() { return "https://archive.org/metadata"; }

    headers() {
        return {
            "User-Agent": "Mozilla/5.0 (compatible; Watchtower/1.0)",
            "Accept": "application/json"
        };
    }

    // ── Search Helper ────────────────────────────────────────

    async searchArchive({ query = "", subject = "", mediatype = "movies", rows = 20, page = 1, sort = "week desc" }) {
        let q = `mediatype:${mediatype}`;
        if (subject) q += ` AND subject:"${subject}"`;
        if (query) q += ` AND (title:"${query}" OR description:"${query}" OR subject:"${query}")`;

        const params = new URLSearchParams({
            q,
            fl: "identifier,title,description,creator,subject,year,mediatype,avg_rating,thumb",
            output: "json",
            rows: String(rows),
            page: String(page),
            "sort[]": sort
        });

        const url = `${this.API}?${params.toString()}`;
        const res = await this.client.get(url, this.headers());
        const json = JSON.parse(res.body || "{}");
        const docs = json?.response?.docs || [];
        const total = json?.response?.numFound || 0;

        const list = docs.map(d => {
            const identifier = d.identifier || "";
            const name = (Array.isArray(d.title) ? d.title[0] : d.title) || identifier;
            const year = d.year ? ` (${d.year})` : "";
            const imageUrl = identifier ?
                `https://archive.org/services/img/${identifier}` : "";
            const description = Array.isArray(d.description) ? d.description[0] : (d.description || "");
            return {
                name: name + year,
                link: `${this.BASE}/details/${identifier}`,
                imageUrl,
                description: description.slice(0, 300)
            };
        }).filter(i => i.link.includes("/details/"));

        return { list, hasNextPage: (page * rows) < total };
    }

    // ── Browse ───────────────────────────────────────────────

    async getPopular(page) {
        const subject = this._currentSubject() || "short film";
        return this.searchArchive({ subject, rows: 24, page, sort: "week desc" });
    }

    async getLatestUpdates(page) {
        const subject = this._currentSubject() || "";
        return this.searchArchive({ subject, rows: 24, page, sort: "publicdate desc" });
    }

    async search(query, page, filterList) {
        const subject = this._filterVal(filterList, "Category") || "";
        const sort = this._filterVal(filterList, "Sort") || "week desc";
        return this.searchArchive({ query, subject, rows: 24, page, sort });
    }

    _currentSubject() { return ""; }

    _filterVal(filterList, name) {
        if (!filterList) return null;
        for (const f of filterList) {
            if (f.name === name && f.values) return f.values[f.state]?.value;
        }
        return null;
    }

    // ── Detail ───────────────────────────────────────────────

    async getDetail(url) {
        const identifier = url.split("/details/")[1]?.split("/")[0]?.split("?")[0];
        if (!identifier) return { name: "Unknown", chapters: [] };

        const metaRes = await this.client.get(`${this.META_API}/${identifier}`, this.headers());
        const meta = JSON.parse(metaRes.body || "{}");

        const m = meta?.metadata || {};
        const name = (Array.isArray(m.title) ? m.title[0] : m.title) || identifier;
        const description = (Array.isArray(m.description) ? m.description[0] : (m.description || "")).slice(0, 1000);
        const year = Array.isArray(m.year) ? m.year[0] : (m.year || "");
        const creator = Array.isArray(m.creator) ? m.creator.join(", ") : (m.creator || "");
        const subjects = Array.isArray(m.subject) ? m.subject : (m.subject ? [m.subject] : []);
        const genre = [...subjects].slice(0, 10);
        if (year) genre.unshift(year);
        if (creator) genre.unshift(creator);

        const imageUrl = `https://archive.org/services/img/${identifier}`;

        // Find video files
        const files = meta?.files || [];
        const videoFiles = files.filter(f => {
            const n = (f.name || "").toLowerCase();
            return n.endsWith(".mp4") || n.endsWith(".ogv") || n.endsWith(".webm") || n.endsWith(".avi") || n.endsWith(".mov");
        });

        // Sort by format quality: mp4 > webm > ogv > others
        videoFiles.sort((a, b) => {
            const score = n => n.endsWith(".mp4") ? 3 : n.endsWith(".webm") ? 2 : n.endsWith(".ogv") ? 1 : 0;
            return score(b.name) - score(a.name);
        });

        // Create one "episode" per video file found
        const chapters = videoFiles.length > 0 ? videoFiles.map(f => ({
            name: f.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ") || "Watch",
            url: `https://archive.org/download/${identifier}/${encodeURIComponent(f.name)}`,
            dateUpload: "0",
            scanlator: f.format || ""
        })) : [{
            name: "Watch",
            url: `${this.BASE}/details/${identifier}`,
            dateUpload: "0"
        }];

        return {
            name,
            imageUrl,
            description: `${description}\n\nCreator: ${creator}\nYear: ${year}`,
            genre,
            status: 1,
            chapters
        };
    }

    // ── Video ────────────────────────────────────────────────

    async getVideoList(url) {
        if (url.includes("/download/")) {
            return [{ url, quality: "HD", originalUrl: url }];
        }

        // Extract identifier and find best video
        const identifier = url.split("/details/")[1]?.split("/")[0];
        if (!identifier) return [];

        const metaRes = await this.client.get(`${this.META_API}/${identifier}`, this.headers());
        const meta = JSON.parse(metaRes.body || "{}");
        const files = meta?.files || [];

        const videos = files.filter(f => {
            const n = (f.name || "").toLowerCase();
            return n.endsWith(".mp4") || n.endsWith(".webm") || n.endsWith(".ogv");
        }).map(f => ({
            url: `https://archive.org/download/${identifier}/${encodeURIComponent(f.name)}`,
            quality: f.format || f.name.split(".").pop().toUpperCase(),
            originalUrl: `https://archive.org/download/${identifier}/${encodeURIComponent(f.name)}`
        }));

        return videos.length > 0 ? videos : [{ url, quality: "Default", originalUrl: url }];
    }

    // ── Filters ──────────────────────────────────────────────

    getFilterList() {
        function opt(n, v) { return { type_name: "SelectOption", name: n, value: v }; }
        return [
            {
                type_name: "SelectFilter", name: "Category", state: 0,
                values: [
                    opt("All Films", ""),
                    opt("🎬 Short Films", "short film"),
                    opt("🎞️ Feature Films", "feature film"),
                    opt("📹 Silent Films", "silent film"),
                    opt("📚 Documentary", "documentary"),
                    opt("😱 Horror", "horror"),
                    opt("🚀 Sci-Fi", "science fiction"),
                    opt("😂 Comedy", "comedy"),
                    opt("🤠 Western", "western"),
                    opt("🎭 Drama", "drama"),
                    opt("🎨 Animation", "animation"),
                    opt("📰 Newsreel", "newsreel"),
                    opt("🎵 Musical", "musical"),
                    opt("🦸 Action", "action"),
                    opt("👻 Classic Horror", "classic horror"),
                    opt("🎪 Short Comedy", "comedy short"),
                    opt("📺 TV Shows", "television"),
                    opt("🌍 Foreign Films", "foreign film"),
                ]
            },
            {
                type_name: "SelectFilter", name: "Sort", state: 0,
                values: [
                    opt("Trending (This Week)", "week desc"),
                    opt("Most Downloaded", "downloads desc"),
                    opt("Recently Added", "publicdate desc"),
                    opt("Title A–Z", "title asc"),
                    opt("Top Rated", "avg_rating desc"),
                    opt("Year (Newest)", "year desc"),
                    opt("Year (Oldest)", "year asc"),
                ]
            }
        ];
    }

    getSourcePreferences() { return []; }
}
