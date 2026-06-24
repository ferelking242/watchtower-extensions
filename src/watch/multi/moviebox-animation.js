const watchtowerSources = [{
    "name": "MovieBox \u2014 Animation",
    "lang": "multi",
    "baseUrl": "https://themoviebox.xyz",
    "apiUrl": "https://h5-api.aoneroom.com",
    "iconUrl": "https://h5-static.aoneroom.com/oneroomProject/icon/moviebox-official.jpg",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "1.0.0",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "watch/multi/moviebox-animation.js",
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "hasSubtitles": true,
    "hasDub": true,
    "notes": "Animated series from MovieBox (aoneroom.com). subjectType=4. Seasons + episodes with multi-language subtitles."
}];

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
//  MovieBox Animation \u2014 aoneroom.com API v2 + v3
//  subjectType=4 (Animated Series)
//  Season info: api6.aoneroom.com /wefeed-mobile-bff/subject-api/season-info
//  Download:    h5-api.aoneroom.com /wefeed-h5api-bff/subject/download
//  Multi-language subtitles via cacdn.hakunaymatata.com
//  Languages: en, fr, ar, pt, id, zh, ru, tl, sw, bn, ur, ja, ko
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

class DefaultExtension extends MProvider {
    constructor() {
        super();
    }

    static get API_BASE() { return "https://h5-api.aoneroom.com"; }
    static get API_V3_BASES() {
        return [
            "https://api6.aoneroom.com",
            "https://api5.aoneroom.com",
            "https://api4.aoneroom.com",
            "https://api.inmoviebox.com"
        ];
    }
    static get SUBJECT_TYPE() { return 4; }
    static get REFERER() { return "https://videodownloader.site/"; }

    getPreference(key) { return new SharedPreferences().get(key); }
    getLang() { return this.getPreference("mb_lang") || "en"; }

    getWebHeaders() {
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

    getMobileHeaders() {
        return {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "x-client-info": '{"package_name":"com.community.oneroom","version_name":"3.0.03","os":"android","region":"US","timezone":"America/New_York"}',
            "x-request-lang": this.getLang(),
            "User-Agent": "com.community.oneroom/50020044 (Linux; U; Android 13; en_US; Redmi; Build/TQ2A.230405.003; Cronet/135.0.7012.3)",
            "Referer": DefaultExtension.REFERER
        };
    }

    parseApiData(body) {
        try {
            const parsed = JSON.parse(body);
            return parsed.data !== undefined ? parsed.data : parsed;
        } catch (e) { return {}; }
    }

    subjectToItem(s) {
        return {
            name: s.title || "Unknown",
            imageUrl: s.cover?.url || "",
            link: JSON.stringify({ detailPath: s.detailPath || s.subjectId, subjectId: s.subjectId }),
            description: s.description || ""
        };
    }

    async postSearch(keyword, page, sortBy) {
        const body = { keyword: keyword || "", page, perPage: 30, subjectType: DefaultExtension.SUBJECT_TYPE };
        if (sortBy) body.sortBy = sortBy;
        const res = await new Client().post(
            `${DefaultExtension.API_BASE}/wefeed-h5api-bff/subject/search`,
            { headers: this.getWebHeaders() },
            JSON.stringify(body)
        );
        const data = this.parseApiData(res.body);
        const list = [];
        for (const group of (data.results || [])) {
            for (const s of (group.subjects || [])) list.push(this.subjectToItem(s));
        }
        return {
            list,
            hasNextPage: typeof data.pager?.hasMore === "boolean" ? data.pager.hasMore : list.length === 30
        };
    }

    async getPopular(page) { return this.postSearch("", page, "VIEWS"); }
    async getLatestUpdates(page) { return this.postSearch("", page, "NEW"); }
    async search(query, page, filterList) { return this.postSearch(query, page, null); }

    // ── Season info via v3 API ─────────────────────────────

    async getSeasonInfo(subjectId) {
        for (const base of DefaultExtension.API_V3_BASES) {
            try {
                const res = await new Client().get(
                    `${base}/wefeed-mobile-bff/subject-api/season-info?subjectId=${subjectId}`,
                    { headers: this.getMobileHeaders() }
                );
                if (res.statusCode === 200) {
                    const data = this.parseApiData(res.body);
                    if (data && (data.seasons || data.totalSeasonNum)) return data;
                }
            } catch (_) {}
        }
        return null;
    }

    // ── Build episode list ─────────────────────────────────

    buildEpisodes(subjectId, detailPath, seasonInfo) {
        const episodes = [];

        if (seasonInfo?.seasons && Array.isArray(seasonInfo.seasons)) {
            for (const season of seasonInfo.seasons) {
                const seNum = season.seasonNum || season.se || 1;
                const epList = season.episodes || season.episodeList || [];

                if (epList.length > 0) {
                    for (const ep of epList) {
                        const epNum = ep.episodeNum || ep.ep || ep.num || 1;
                        const epTitle = ep.title || ep.name || `Episode ${epNum}`;
                        episodes.push({
                            name: `S${seNum}E${String(epNum).padStart(2, "0")} \u2014 ${epTitle}`,
                            url: JSON.stringify({ subjectId, detailPath, se: seNum, ep: epNum }),
                            dateUpload: ep.releaseDate || ep.airDate || ""
                        });
                    }
                } else {
                    const epCount = season.episodeCount || season.totalEpisode || season.episodeNum || 13;
                    for (let ep = 1; ep <= epCount; ep++) {
                        episodes.push({
                            name: `Season ${seNum} Episode ${ep}`,
                            url: JSON.stringify({ subjectId, detailPath, se: seNum, ep }),
                            dateUpload: ""
                        });
                    }
                }
            }
        } else if (seasonInfo && (seasonInfo.totalSeasonNum || seasonInfo.seasonCount)) {
            const totalSeasons = seasonInfo.totalSeasonNum || seasonInfo.seasonCount || 1;
            for (let se = 1; se <= totalSeasons; se++) {
                const epCount = 13;
                for (let ep = 1; ep <= epCount; ep++) {
                    episodes.push({
                        name: `Season ${se} Episode ${ep}`,
                        url: JSON.stringify({ subjectId, detailPath, se, ep }),
                        dateUpload: ""
                    });
                }
            }
        } else {
            // Fallback: probe first season (animation typically 13 or 26 eps per season)
            for (let ep = 1; ep <= 26; ep++) {
                episodes.push({
                    name: `Episode ${ep}`,
                    url: JSON.stringify({ subjectId, detailPath, se: 1, ep }),
                    dateUpload: ""
                });
            }
        }

        return episodes;
    }

    // ── Detail ─────────────────────────────────────────────

    async getDetail(url) {
        const { detailPath, subjectId } = JSON.parse(url);

        const [s, seasonInfo] = await Promise.all([
            new Client().get(
                `${DefaultExtension.API_BASE}/wefeed-h5api-bff/detail?detailPath=${detailPath}`,
                { headers: this.getWebHeaders() }
            ).then(r => this.parseApiData(r.body)).catch(() => ({})),
            this.getSeasonInfo(subjectId).catch(() => null)
        ]);

        const genres = (s.genre || "").split(/[,\uff0c]/).map(g => g.trim()).filter(Boolean);
        const castStr = (s.staffList || []).slice(0, 8).map(st => st.name).join(", ");

        let description = s.description || "";
        const extras = [];
        if (s.imdbRatingValue && parseFloat(s.imdbRatingValue) > 0)
            extras.push(`\u2b50 IMDb ${s.imdbRatingValue}`);
        if (s.countryName) extras.push(`\ud83c\udf0d ${s.countryName}`);
        if (s.language) extras.push(`\ud83d\udde3 ${s.language}`);
        if (extras.length) description += "\n\n" + extras.join("  |  ");
        if (castStr) description += `\n\ud83d\udc65 ${castStr}`;

        const realSubjectId = s.subjectId || subjectId;
        const episodes = this.buildEpisodes(realSubjectId, detailPath, seasonInfo);

        return {
            name: s.title || "",
            description,
            imageUrl: s.cover?.url || "",
            genre: genres,
            status: 0,
            chapters: episodes
        };
    }

    // ── Video list ─────────────────────────────────────────

    async getVideoList(url) {
        const { subjectId, detailPath, se, ep } = JSON.parse(url);
        const apiUrl = `${DefaultExtension.API_BASE}/wefeed-h5api-bff/subject/download` +
            `?subjectId=${subjectId}&se=${se}&ep=${ep}&detailPath=${detailPath}`;
        const res = await new Client().get(apiUrl, { headers: this.getWebHeaders() });
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
            videos.push({
                url: item.resourceLink,
                quality: `${item.resolution || "?"}p [${codec}]`,
                originalUrl: item.resourceLink,
                headers: {
                    "Referer": DefaultExtension.REFERER,
                    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0"
                }
            });
        }

        videos.sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0));
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
                        "English", "Fran\u00e7ais", "\u0627\u0644\u0639\u0631\u0628\u064a\u0629",
                        "Portugu\u00eas", "Indonesian", "\u4e2d\u6587", "\u0420\u0443\u0441\u0441\u043a\u0438\u0439",
                        "Filipino", "\u65e5\u672c\u0301\u8a9e", "\ud55c\uad6d\uc5b4",
                        "Kiswahili", "\u09ac\u09be\u0982\u09b2\u09be", "\u0627\u064f\u0631\u062f\u064f\u0648"
                    ],
                    "entryValues": [
                        "en", "fr", "ar", "pt", "id", "zh", "ru",
                        "tl", "ja", "ko", "sw", "bn", "ur"
                    ]
                }
            }
        ];
    }
}
