const mangayomiSources = [{
    "name": "MovieBox Anime",
    "langs": ["en"],
    "ids": { "en": 881000003 },
    "baseUrl": "https://h5-api.aoneroom.com",
    "apiUrl": "https://api6.aoneroom.com",
    "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=moviebox.ng",
    "typeSource": "multi",
    "isManga": false,
    "itemType": 1,
    "version": "1.0.0",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "anime/src/en/moviebox-anime.js"
}];

// ═══════════════════════════════════════════════════════
//  MovieBox Anime / Education — aoneroom.com API v2 + v3
//  subjectType=5 (Anime & Education content)
//  Multi-language subtitles included
// ═══════════════════════════════════════════════════════

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
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
    static get SUBJECT_TYPE() { return 5; }
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
        const res = await this.client.post(
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

    async getSeasonInfo(subjectId) {
        for (const base of DefaultExtension.API_V3_BASES) {
            try {
                const res = await this.client.get(
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
                            name: `S${seNum}E${String(epNum).padStart(2, "0")} - ${epTitle}`,
                            url: JSON.stringify({ subjectId, detailPath, se: seNum, ep: epNum }),
                            dateUpload: ep.releaseDate || ""
                        });
                    }
                } else {
                    const epCount = season.episodeCount || season.totalEpisode || 12;
                    for (let ep = 1; ep <= epCount; ep++) {
                        episodes.push({
                            name: `Season ${seNum} Ep ${ep}`,
                            url: JSON.stringify({ subjectId, detailPath, se: seNum, ep }),
                            dateUpload: ""
                        });
                    }
                }
            }
        } else {
            for (let ep = 1; ep <= 24; ep++) {
                episodes.push({
                    name: `Episode ${ep}`,
                    url: JSON.stringify({ subjectId, detailPath, se: 1, ep }),
                    dateUpload: ""
                });
            }
        }
        return episodes;
    }

    async getDetail(url) {
        const { detailPath, subjectId } = JSON.parse(url);

        const [s, seasonInfo] = await Promise.all([
            this.client.get(
                `${DefaultExtension.API_BASE}/wefeed-h5api-bff/detail?detailPath=${detailPath}`,
                { headers: this.getWebHeaders() }
            ).then(r => this.parseApiData(r.body)).catch(() => ({})),
            this.getSeasonInfo(subjectId).catch(() => null)
        ]);

        const genres = (s.genre || "").split(/[,，]/).map(g => g.trim()).filter(Boolean);
        const castStr = (s.staffList || []).slice(0, 8).map(st => st.name).join(", ");
        let description = s.description || "";
        const extras = [];
        if (s.imdbRatingValue && parseFloat(s.imdbRatingValue) > 0) extras.push(`⭐ IMDb ${s.imdbRatingValue}`);
        if (s.countryName) extras.push(`🌍 ${s.countryName}`);
        if (extras.length) description += "\n\n" + extras.join("  |  ");
        if (castStr) description += `\n👥 ${castStr}`;

        const realSubjectId = s.subjectId || subjectId;
        const episodes = this.buildEpisodes(realSubjectId, detailPath, seasonInfo);

        return { name: s.title || "", description, imageUrl: s.cover?.url || "", genre: genres, status: 0, chapters: episodes };
    }

    async getVideoList(url) {
        const { subjectId, detailPath, se, ep } = JSON.parse(url);
        const apiUrl = `${DefaultExtension.API_BASE}/wefeed-h5api-bff/subject/download` +
            `?subjectId=${subjectId}&se=${se}&ep=${ep}&detailPath=${detailPath}`;
        const res = await this.client.get(apiUrl, { headers: this.getWebHeaders() });
        const data = this.parseApiData(res.body);

        const subtitles = [];
        const videos = [];

        for (const item of (data.list || [])) {
            if (!item.resourceLink) continue;
            for (const cap of (item.extCaptions || [])) {
                if (cap.url && !subtitles.find(s => s.label === cap.lanName)) {
                    subtitles.push({ file: cap.url, label: cap.lanName || cap.lan || "Sub" });
                }
            }
            const codec = item.codecName ? item.codecName.toUpperCase() : "MP4";
            videos.push({
                url: item.resourceLink,
                quality: `${item.resolution || "?"}p [${codec}]`,
                originalUrl: item.resourceLink,
                headers: { "Referer": DefaultExtension.REFERER, "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0" }
            });
        }

        videos.sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0));
        return videos.map(v => ({ ...v, subtitles }));
    }

    getFilterList() { return []; }

    getSourcePreferences() {
        return [{
            "key": "mb_lang",
            "listPreference": {
                "title": "Content Language",
                "summary": "Language for subtitles and UI",
                "valueIndex": 0,
                "entries": ["English", "中文", "Français", "العربية", "Português", "Indonesian", "Русский"],
                "entryValues": ["en", "zh", "fr", "ar", "pt", "id", "ru"]
            }
        }];
    }
}
