const watchtowerSources = [{
    "name": "MovieBox Movies",
    "lang": "all",
    "baseUrl": "https://h5-api.aoneroom.com",
    "apiUrl": "https://h5-api.aoneroom.com",
    "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=moviebox.ng",
    "typeSource": "multi",
    "isManga": false,
    "itemType": 1,
    "version": "1.0.1",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "watch/src/multi/moviebox-movies.js"
}];

// ═══════════════════════════════════════════════════════
//  MovieBox Movies — aoneroom.com API v2
//  subjectType=1 (Movies)
//  Videos: bcdn.hakunaymatata.com (H.265) / valiw.hakunaymatata.com (H.264)
//  Subtitles: cacdn.hakunaymatata.com
//  Multi-language: en, fr, ar, pt, id, zh, ru, tl, sw, bn, ur, pa, ms
// ═══════════════════════════════════════════════════════

class DefaultExtension extends MProvider {
    constructor() {
        super();
    }

    // ── Config ─────────────────────────────────────────────
    static get API_BASE() { return "https://h5-api.aoneroom.com"; }
    static get SUBJECT_TYPE() { return 1; }
    static get REFERER() { return "https://videodownloader.site/"; }

    getPreference(key) {
        return new SharedPreferences().get(key);
    }

    getLang() {
        return this.getPreference("mb_lang") || "en";
    }

    getHeaders() {
        return {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Client-Info": '{"timezone":"America/New_York"}',
            "x-request-lang": this.getLang(),
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0",
            "Referer": DefaultExtension.REFERER,
            "Origin": "https://videodownloader.site"
        };
    }

    // ── API helpers ────────────────────────────────────────

    parseApiData(body) {
        try {
            const parsed = JSON.parse(body);
            return parsed.data !== undefined ? parsed.data : parsed;
        } catch (e) {
            return {};
        }
    }

    subjectToItem(s) {
        const link = JSON.stringify({
            detailPath: s.detailPath || s.subjectId,
            subjectId: s.subjectId
        });
        return {
            name: s.title || "Unknown",
            imageUrl: s.cover?.url || "",
            link,
            description: s.description || ""
        };
    }

    async postSearch(keyword, page, subjectType, sortBy) {
        const body = { keyword: keyword || "", page, perPage: 30, subjectType };
        if (sortBy) body.sortBy = sortBy;
        const res = await new Client().post(
            `${DefaultExtension.API_BASE}/wefeed-h5api-bff/subject/search`,
            { headers: this.getHeaders() },
            JSON.stringify(body)
        );
        const data = this.parseApiData(res.body);
        const list = [];
        for (const group of (data.results || [])) {
            for (const s of (group.subjects || [])) {
                list.push(this.subjectToItem(s));
            }
        }
        const hasMore = typeof data.pager?.hasMore === "boolean"
            ? data.pager.hasMore
            : list.length === 30;
        return { list, hasNextPage: hasMore };
    }

    // ── Browse ─────────────────────────────────────────────

    async getPopular(page) {
        return this.postSearch("", page, DefaultExtension.SUBJECT_TYPE, "VIEWS");
    }

    async getLatestUpdates(page) {
        return this.postSearch("", page, DefaultExtension.SUBJECT_TYPE, "NEW");
    }

    async search(query, page, filterList) {
        return this.postSearch(query, page, DefaultExtension.SUBJECT_TYPE, null);
    }

    // ── Detail ─────────────────────────────────────────────

    async getDetail(url) {
        const info = JSON.parse(url);
        const detailPath = info.detailPath;
        const subjectId = info.subjectId;

        const res = await new Client().get(
            `${DefaultExtension.API_BASE}/wefeed-h5api-bff/detail?detailPath=${detailPath}`,
            { headers: this.getHeaders() }
        );
        const s = this.parseApiData(res.body);

        const genres = (s.genre || "").split(/[,，]/).map(g => g.trim()).filter(Boolean);
        const castStr = (s.staffList || []).slice(0, 8).map(st => st.name).join(", ");

        let description = s.description || "";
        const extras = [];
        if (s.imdbRatingValue && parseFloat(s.imdbRatingValue) > 0)
            extras.push(`⭐ IMDb ${s.imdbRatingValue}`);
        if (s.duration) extras.push(`⏱ ${s.duration}`);
        if (s.countryName) extras.push(`🌍 ${s.countryName}`);
        if (s.language) extras.push(`🗣 ${s.language}`);
        if (extras.length) description += "\n\n" + extras.join("  |  ");
        if (castStr) description += `\n👥 ${castStr}`;

        return {
            name: s.title || "",
            description,
            imageUrl: s.cover?.url || "",
            genre: genres,
            status: 1,
            chapters: [{
                name: "▶ Watch Movie",
                url: JSON.stringify({
                    subjectId: s.subjectId || subjectId,
                    detailPath,
                    se: 0,
                    ep: 0
                }),
                dateUpload: s.releaseDate || ""
            }]
        };
    }

    // ── Video list ─────────────────────────────────────────

    async getVideoList(url) {
        const { subjectId, detailPath, se, ep } = JSON.parse(url);
        const apiUrl = `${DefaultExtension.API_BASE}/wefeed-h5api-bff/subject/download` +
            `?subjectId=${subjectId}&se=${se}&ep=${ep}&detailPath=${detailPath}`;
        const res = await new Client().get(apiUrl, { headers: this.getHeaders() });
        const data = this.parseApiData(res.body);

        const subtitles = [];
        const videos = [];

        for (const item of (data.list || [])) {
            if (!item.resourceLink) continue;

            for (const cap of (item.extCaptions || [])) {
                if (cap.url && !subtitles.find(sub => sub.label === cap.lanName)) {
                    subtitles.push({ file: cap.url, label: cap.lanName || cap.lan || "Sub" });
                }
            }

            const codec = item.codecName ? item.codecName.toUpperCase() : "MP4";
            const res_label = item.resolution ? `${item.resolution}p` : "Unknown";
            videos.push({
                url: item.resourceLink,
                quality: `${res_label} [${codec}]`,
                originalUrl: item.resourceLink,
                headers: {
                    "Referer": DefaultExtension.REFERER,
                    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0"
                }
            });
        }

        // Best quality first
        videos.sort((a, b) => {
            const ra = parseInt(a.quality) || 0;
            const rb = parseInt(b.quality) || 0;
            return rb - ra;
        });

        return videos.map(v => ({ ...v, subtitles }));
    }

    // ── Filters / Prefs ────────────────────────────────────

    getFilterList() { return []; }

    getSourcePreferences() {
        return [
            {
                "key": "mb_lang",
                "listPreference": {
                    "title": "Content Language",
                    "summary": "Language for subtitles and UI",
                    "valueIndex": 0,
                    "entries": [
                        "English", "Français", "العربية", "Português",
                        "Indonesian", "中文", "Русский", "Filipino",
                        "Kiswahili", "বাংলা", "اُردُو", "ਪੰਜਾਬੀ", "Melayu"
                    ],
                    "entryValues": [
                        "en", "fr", "ar", "pt",
                        "id", "zh", "ru", "tl",
                        "sw", "bn", "ur", "pa", "ms"
                    ]
                }
            }
        ];
    }
}
