const watchtowerSources = [{
    "name": "MovieBox Music",
    "lang": "all",
    "baseUrl": "https://h5-api.aoneroom.com",
    "apiUrl": "https://h5-api.aoneroom.com",
    "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=moviebox.ng",
    "typeSource": "multi",
    "isManga": false,
    "itemType": 1,
    "version": "1.0.0",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "watch/src/multi/moviebox-music.js"
}];

// ═══════════════════════════════════════════════════════
//  MovieBox Music — aoneroom.com API v2
//  subjectType=6 (Music Videos / MV)
//  Full music videos hosted on CDN hakunaymatata.com
//  Multi-language: search across all languages
// ═══════════════════════════════════════════════════════

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
    }

    static get API_BASE() { return "https://h5-api.aoneroom.com"; }
    static get SUBJECT_TYPE() { return 6; }
    static get REFERER() { return "https://videodownloader.site/"; }

    getPreference(key) { return new SharedPreferences().get(key); }
    getLang() { return this.getPreference("mb_lang") || "en"; }

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

    parseApiData(body) {
        try {
            const parsed = JSON.parse(body);
            return parsed.data !== undefined ? parsed.data : parsed;
        } catch (e) { return {}; }
    }

    subjectToItem(s) {
        // For music: genre often contains artist name / album
        const subtitle = s.genre ? ` — ${s.genre}` : "";
        return {
            name: (s.title || "Unknown") + subtitle,
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
            { headers: this.getHeaders() },
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

    async getDetail(url) {
        const { detailPath, subjectId } = JSON.parse(url);
        const res = await this.client.get(
            `${DefaultExtension.API_BASE}/wefeed-h5api-bff/detail?detailPath=${detailPath}`,
            { headers: this.getHeaders() }
        );
        const s = this.parseApiData(res.body);

        const genres = (s.genre || "").split(/[,，]/).map(g => g.trim()).filter(Boolean);
        let description = s.description || "";
        const extras = [];
        if (s.duration) extras.push(`⏱ ${s.duration}`);
        if (s.countryName) extras.push(`🌍 ${s.countryName}`);
        if (s.language) extras.push(`🗣 ${s.language}`);
        if (extras.length) description += "\n\n" + extras.join("  |  ");

        // Staff = artists / performers
        const artists = (s.staffList || []).map(st => st.name).join(", ");
        if (artists) description += `\n🎤 ${artists}`;

        return {
            name: s.title || "",
            description,
            imageUrl: s.cover?.url || "",
            genre: genres,
            status: 1,
            chapters: [{
                name: "▶ Play Music Video",
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

    async getVideoList(url) {
        const { subjectId, detailPath, se, ep } = JSON.parse(url);
        const apiUrl = `${DefaultExtension.API_BASE}/wefeed-h5api-bff/subject/download` +
            `?subjectId=${subjectId}&se=${se}&ep=${ep}&detailPath=${detailPath}`;
        const res = await this.client.get(apiUrl, { headers: this.getHeaders() });
        const data = this.parseApiData(res.body);

        const subtitles = [];
        const videos = [];

        for (const item of (data.list || [])) {
            if (!item.resourceLink) continue;
            for (const cap of (item.extCaptions || [])) {
                if (cap.url && !subtitles.find(s => s.label === cap.lanName)) {
                    subtitles.push({ file: cap.url, label: cap.lanName || cap.lan || "Lyrics" });
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

    getFilterList() { return []; }

    getSourcePreferences() {
        return [
            {
                "key": "mb_lang",
                "listPreference": {
                    "title": "Content Language",
                    "summary": "Language for search and subtitles",
                    "valueIndex": 0,
                    "entries": ["English", "中文", "Français", "العربية", "Português", "Indonesian", "Русский", "Filipino", "Kiswahili", "বাংলা", "اُردُو"],
                    "entryValues": ["en", "zh", "fr", "ar", "pt", "id", "ru", "tl", "sw", "bn", "ur"]
                }
            }
        ];
    }
}
