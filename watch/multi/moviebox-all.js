const watchtowerSources = [{
    "name": "MovieBox All",
    "lang": "multi",
    "baseUrl": "https://h5.aoneroom.com",
    "apiUrl": "https://h5-api.aoneroom.com",
    "iconUrl": "https://h5.aoneroom.com/favicon.ico",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "1.0.0",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "watch/src/multi/moviebox-all.js",
    "notes": "MovieBox unified browser: Movies + Series + Anime + Music + Short Films + Animation. All types in one."
}];

// ═══════════════════════════════════════════════════════════
//  MovieBox All — aoneroom.com
//  Unified browser for ALL content types on the MovieBox
//  platform. Uses the h5-api.aoneroom.com BFF API.
//  Types: 1=Movies 2=TV Series 5=Anime 6=Music 3=Short 4=Animated Series
//  Videos served from hakunaymatata.com CloudFront CDN.
// ═══════════════════════════════════════════════════════════

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
    }

    get API()      { return "https://h5-api.aoneroom.com"; }
    get API6()     { return "https://api6.aoneroom.com"; }
    get BASE()     { return "https://h5.aoneroom.com"; }
    get CDN_VID()  { return "https://valiw.hakunaymatata.com"; }
    get CDN_VID2() { return "https://bcdn.hakunaymatata.com"; }
    get CDN_SUB()  { return "https://cacdn.hakunaymatata.com"; }

    // Subject types
    static get TYPES() {
        return {
            "1": "Movies",
            "2": "TV Series",
            "3": "Short Films",
            "4": "Animated Series",
            "5": "Anime",
            "6": "Music Videos",
        };
    }

    apiHeaders() {
        return {
            "Content-Type": "application/json",
            "X-Client-Info": JSON.stringify({ timezone: "America/New_York" }),
            "x-request-lang": "en",
            "Referer": "https://videodownloader.site/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*"
        };
    }

    _filterVal(filterList, name) {
        if (!filterList) return null;
        for (const f of filterList) {
            if (f.name === name && f.values) return f.values[f.state]?.value;
        }
        return null;
    }

    // ── Content Fetcher ──────────────────────────────────────

    async fetchContent(page, subjectType, keyword = "") {
        const body = JSON.stringify({
            keyword,
            page,
            perPage: 30,
            subjectType: parseInt(subjectType)
        });
        const res = await this.client.post(
            `${this.API}/wefeed-h5api-bff/subject/search`,
            this.apiHeaders(),
            body
        );
        const json = JSON.parse(res.body || "{}");
        const items = json?.data?.data || json?.data?.list || [];
        const total = json?.data?.total || 0;

        const list = items.map(item => ({
            name: item.subjectName || item.name || "Unknown",
            link: item.detailPath || item.playPath || "",
            imageUrl: item.horizontalCover || item.verticalCover || item.poster || item.coverImage || "",
            description: item.desc || item.description || ""
        })).filter(i => i.link);

        return { list, hasNextPage: (page * 30) < total };
    }

    // ── Browse ───────────────────────────────────────────────

    async getPopular(page) {
        const subjectType = "1"; // Movies by default for popular
        return this.fetchContent(page, subjectType);
    }

    async getLatestUpdates(page) {
        // Mixed content: TV series latest
        return this.fetchContent(page, "2");
    }

    async search(query, page, filterList) {
        const typeVal = this._filterVal(filterList, "Content Type") || "1";
        return this.fetchContent(page, typeVal, query);
    }

    // ── Detail ───────────────────────────────────────────────

    async getDetail(url) {
        const endpoint = url.startsWith("http")
            ? url
            : `${this.API}/wefeed-h5api-bff/detail?detailPath=${encodeURIComponent(url)}`;

        const res = await this.client.get(endpoint, this.apiHeaders());
        const json = JSON.parse(res.body || "{}");
        const data = json?.data || json?.result || json;

        const name = data.subjectName || data.name || data.title || "Unknown";
        const imageUrl = data.horizontalCover || data.verticalCover || data.coverImage || "";
        const description = data.desc || data.description || data.intro || "";

        const genreArr = data.genres || data.tags || data.categoryList || [];
        const genre = Array.isArray(genreArr)
            ? genreArr.map(g => g.name || g.categoryName || g).filter(Boolean)
            : [];

        const status = (data.episodeStatus === 2 || data.status === "completed") ? 1 : 0;

        // Build episodes
        const chapters = [];
        const episodes = data.episodeList || data.episodes || data.videoList || [];

        if (episodes.length > 0) {
            for (const ep of episodes) {
                const epName = ep.episodeName || ep.name || `Episode ${ep.episodeNum || ep.index || 1}`;
                const epPath = ep.playPath || ep.path || ep.url || "";
                const epNum = ep.episodeNum || ep.index || 1;
                const se = ep.seasonNum || 1;
                if (epPath) {
                    chapters.push({
                        name: epName,
                        url: `${this.API}/wefeed-h5api-bff/subject/download?subjectId=${data.subjectId || data.id}&se=${se}&ep=${epNum}&detailPath=${encodeURIComponent(url)}`,
                        dateUpload: ep.updateTime ? String(new Date(ep.updateTime).valueOf()) : "0",
                        scanlator: ep.qualityLabel || ""
                    });
                }
            }
        } else {
            // Single content (movie or music)
            chapters.push({
                name: "▶ Watch",
                url: `${this.API}/wefeed-h5api-bff/subject/download?subjectId=${data.subjectId || data.id}&se=1&ep=1&detailPath=${encodeURIComponent(url)}`,
                dateUpload: "0"
            });
        }

        return { name, imageUrl, description, genre, status, chapters };
    }

    // ── Video ────────────────────────────────────────────────

    async getVideoList(url) {
        const res = await this.client.get(url, this.apiHeaders());
        const json = JSON.parse(res.body || "{}");
        const data = json?.data || json?.result || json;

        const videos = [];

        // Multi-quality streams
        const definitions = data.definitionList || data.videoList || data.qualities || [];
        for (const def of definitions) {
            const streamUrl = def.url || def.playUrl || def.videoUrl || def.hlsUrl || "";
            const quality = def.definitionCode || def.quality || def.label || "Default";
            if (streamUrl) videos.push({ url: streamUrl, quality, originalUrl: streamUrl });
        }

        // Single URL fallback
        if (videos.length === 0) {
            const singleUrl = data.url || data.playUrl || data.videoUrl || data.hlsUrl || "";
            if (singleUrl) videos.push({ url: singleUrl, quality: "HD", originalUrl: singleUrl });
        }

        // Subtitles
        const subs = data.subtitleList || data.subtitles || [];
        for (const sub of subs) {
            const subUrl = sub.url || sub.srtUrl || "";
            const lang = sub.languageCode || sub.lang || "en";
            if (subUrl && videos.length > 0) {
                videos[0].subtitles = videos[0].subtitles || [];
                videos[0].subtitles.push({ url: subUrl, label: lang });
            }
        }

        return videos;
    }

    // ── Filters ──────────────────────────────────────────────

    getFilterList() {
        function opt(n, v) { return { type_name: "SelectOption", name: n, value: v }; }
        return [
            {
                type_name: "SelectFilter", name: "Content Type", state: 0,
                values: [
                    opt("🎬 Movies",            "1"),
                    opt("📺 TV Series",         "2"),
                    opt("🎞️ Short Films",        "3"),
                    opt("🎨 Animated Series",    "4"),
                    opt("⛩️ Anime",              "5"),
                    opt("🎵 Music Videos",       "6"),
                ]
            }
        ];
    }

    getSourcePreferences() { return []; }
}
