const watchtowerSources = [{
    "name": "MovieBox",
    "lang": "multi",
    "baseUrl": "https://themoviebox.xyz",
    "apiUrl": "https://h5-api.aoneroom.com",
    "iconUrl": "https://h5-static.aoneroom.com/oneroomProject/icon/moviebox-official.jpg",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "2.0.0",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "watch/multi/moviebox.js",
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "hasSubtitles": true,
    "hasDub": true,
    "notes": "MovieBox unified — Films, Séries, Anime, Animation, Courts-métrages, Clips musicaux, Live. API aoneroom.com. Sous-titres multi-langues."
}];

// ═══════════════════════════════════════════════════════════════
//  MovieBox — Extension unifiée v2.0.0
//  Source : themoviebox.xyz / aoneroom.com
//
//  Types de contenu (subjectType) :
//    1 = Films          2 = Séries TV
//    3 = Courts-métrages 4 = Séries animées
//    5 = Anime           6 = Clips musicaux
//    Live = flux en direct
//
//  APIs :
//    h5-api.aoneroom.com  — recherche, détail, téléchargement
//    api6.aoneroom.com    — infos saisons (mobile BFF)
//    api5/4/api.inmoviebox.com — fallbacks saisons
//
//  CDNs :
//    valiw.hakunaymatata.com  — vidéo H.264
//    bcdn.hakunaymatata.com   — vidéo H.265
//    cacdn.hakunaymatata.com  — sous-titres
//    lacdn.aoneroom.com       — clips Live/highlights
// ═══════════════════════════════════════════════════════════════

class DefaultExtension extends MProvider {
    constructor() { super(); }

    // ── Constantes ────────────────────────────────────────────

    static get API()     { return "https://h5-api.aoneroom.com"; }
    static get REFERER() { return "https://videodownloader.site/"; }
    static get V3()      {
        return [
            "https://api6.aoneroom.com",
            "https://api5.aoneroom.com",
            "https://api4.aoneroom.com",
            "https://api.inmoviebox.com"
        ];
    }

    // Types de contenu
    static get TYPES() {
        return { MOVIE: 1, SERIES: 2, SHORT: 3, ANIMATION: 4, ANIME: 5, MUSIC: 6 };
    }

    // Types qui ont des épisodes (series-like)
    static get SERIES_TYPES() { return new Set([2, 4, 5]); }

    // ── Préférences ───────────────────────────────────────────

    pref(key)    { return new SharedPreferences().get(key); }
    getLang()    { return this.pref("mb_lang")    || "en"; }
    getType()    { return this.pref("mb_type")    || "0"; }
    getSort()    { return this.pref("mb_sort")    || "VIEWS"; }

    // ── En-têtes ──────────────────────────────────────────────

    webHeaders() {
        return {
            "Accept":          "application/json",
            "Content-Type":    "application/json",
            "X-Client-Info":   '{"timezone":"America/New_York"}',
            "x-request-lang":  this.getLang(),
            "User-Agent":      "Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0",
            "Referer":         DefaultExtension.REFERER,
            "Origin":          "https://videodownloader.site"
        };
    }

    mobileHeaders() {
        return {
            "Accept":          "application/json",
            "Content-Type":    "application/json",
            "x-client-info":   '{"package_name":"com.community.oneroom","version_name":"3.0.03","os":"android","region":"US","timezone":"America/New_York"}',
            "x-request-lang":  this.getLang(),
            "User-Agent":      "com.community.oneroom/50020044 (Linux; U; Android 13; en_US; Redmi; Build/TQ2A.230405.003; Cronet/135.0.7012.3)",
            "Referer":         DefaultExtension.REFERER
        };
    }

    // ── Helpers ───────────────────────────────────────────────

    parseData(body) {
        try {
            const p = JSON.parse(body);
            return p.data !== undefined ? p.data : p;
        } catch (_) { return {}; }
    }

    toItem(s, overrideType) {
        const type = overrideType || s.subjectType || 1;
        return {
            name:        s.title || "Unknown",
            imageUrl:    s.cover?.url || "",
            link:        JSON.stringify({ detailPath: s.detailPath || String(s.subjectId), subjectId: s.subjectId, subjectType: type }),
            description: s.description || ""
        };
    }

    // ── Recherche / Browse ────────────────────────────────────

    async _search(keyword, page, subjectType, sortBy) {
        const body = { keyword: keyword || "", page, perPage: 30, subjectType: parseInt(subjectType) || 0 };
        if (sortBy && sortBy !== "0") body.sortBy = sortBy;
        const res = await new Client().post(
            `${DefaultExtension.API}/wefeed-h5api-bff/subject/search`,
            { headers: this.webHeaders() },
            JSON.stringify(body)
        );
        const data = this.parseData(res.body);
        const list = [];
        for (const group of (data.results || [])) {
            for (const s of (group.subjects || [])) list.push(this.toItem(s));
        }
        return {
            list,
            hasNextPage: typeof data.pager?.hasMore === "boolean" ? data.pager.hasMore : list.length === 30
        };
    }

    async getPopular(page) {
        const type = this.getType();
        const sort = this.getSort();
        if (type === "0") {
            // All types: mix movies + series
            const [mov, ser] = await Promise.all([
                this._search("", page, 1, sort),
                this._search("", page, 2, sort)
            ]);
            const list = [...mov.list, ...ser.list]
                .sort(() => Math.random() - 0.5)
                .slice(0, 30);
            return { list, hasNextPage: mov.hasNextPage || ser.hasNextPage };
        }
        return this._search("", page, type, sort);
    }

    async getLatestUpdates(page) {
        const type = this.getType();
        if (type === "0") {
            const [mov, ser] = await Promise.all([
                this._search("", page, 1, "NEW"),
                this._search("", page, 2, "NEW")
            ]);
            const list = [...mov.list, ...ser.list].slice(0, 30);
            return { list, hasNextPage: mov.hasNextPage || ser.hasNextPage };
        }
        return this._search("", page, type, "NEW");
    }

    async search(query, page, filterList) {
        const typeVal = this._filterVal(filterList, "Type") || this.getType() || "0";
        const sortVal = this._filterVal(filterList, "Tri")  || this.getSort() || "VIEWS";
        if (typeVal === "0") {
            const res = await new Client().post(
                `${DefaultExtension.API}/wefeed-h5api-bff/subject/search`,
                { headers: this.webHeaders() },
                JSON.stringify({ keyword: query, page, perPage: 30 })
            );
            const data = this.parseData(res.body);
            const list = [];
            for (const group of (data.results || [])) {
                for (const s of (group.subjects || [])) list.push(this.toItem(s));
            }
            return { list, hasNextPage: typeof data.pager?.hasMore === "boolean" ? data.pager.hasMore : list.length === 30 };
        }
        return this._search(query, page, typeVal, sortVal);
    }

    _filterVal(filterList, name) {
        if (!filterList) return null;
        for (const f of filterList) {
            if (f.name === name && f.values) return f.values[f.state]?.value;
        }
        return null;
    }

    // ── Sections home (getCustomLists) ────────────────────────

    getCustomLists() {
        return [
            { id: "trending-movies",   name: "🔥 Films tendance"        },
            { id: "trending-series",   name: "📺 Séries tendance"        },
            { id: "trending-anime",    name: "⛩️ Anime tendance"         },
            { id: "trending-anim",     name: "🎨 Animation tendance"     },
            { id: "latest-movies",     name: "🆕 Films récents"          },
            { id: "latest-series",     name: "🆕 Séries récentes"        },
            { id: "latest-anime",      name: "🆕 Anime récent"           },
            { id: "music",             name: "🎵 Clips musicaux"         },
            { id: "shorts",            name: "🎞️ Courts-métrages"        },
            { id: "live",              name: "🔴 Live"                   },
        ];
    }

    async getCustomList(listId, page) {
        const typeMap = {
            "trending-movies": { type: 1, sort: "VIEWS" },
            "trending-series": { type: 2, sort: "VIEWS" },
            "trending-anime":  { type: 5, sort: "VIEWS" },
            "trending-anim":   { type: 4, sort: "VIEWS" },
            "latest-movies":   { type: 1, sort: "NEW"   },
            "latest-series":   { type: 2, sort: "NEW"   },
            "latest-anime":    { type: 5, sort: "NEW"   },
            "music":           { type: 6, sort: "VIEWS" },
            "shorts":          { type: 3, sort: "VIEWS" },
        };

        if (listId === "live") return this._getLive(page);

        const cfg = typeMap[listId];
        if (!cfg) return { list: [], hasNextPage: false };
        return this._search("", page, cfg.type, cfg.sort);
    }

    // ── Live ──────────────────────────────────────────────────

    async _getLive(page) {
        const endpoints = [
            `${DefaultExtension.API}/wefeed-h5api-bff/live/list?page=${page}&perPage=20`,
            `${DefaultExtension.API}/wefeed-h5api-bff/live?page=${page}&perPage=20`,
        ];
        for (const ep of endpoints) {
            try {
                const res = await new Client().get(ep, { headers: this.webHeaders() });
                if (res.statusCode === 200) {
                    const data = this.parseData(res.body);
                    const channels = data.list || data.liveList || data.channels || [];
                    if (channels.length > 0) {
                        const list = channels.map(ch => ({
                            name:        ch.title || ch.name || ch.channelName || "Live",
                            imageUrl:    ch.cover?.url || ch.coverUrl || ch.icon || "",
                            link:        JSON.stringify({ isLive: true, url: ch.streamUrl || ch.playUrl || ch.m3u8Url || "" }),
                            description: ch.description || ch.category || "🔴 Live"
                        })).filter(i => JSON.parse(i.link).url);
                        return { list, hasNextPage: data.pager?.hasMore || false };
                    }
                }
            } catch (_) {}
        }
        return { list: [], hasNextPage: false };
    }

    // ── Infos saisons (API mobile) ────────────────────────────

    async _getSeasonInfo(subjectId) {
        for (const base of DefaultExtension.V3) {
            try {
                const res = await new Client().get(
                    `${base}/wefeed-mobile-bff/subject-api/season-info?subjectId=${subjectId}`,
                    { headers: this.mobileHeaders() }
                );
                if (res.statusCode === 200) {
                    const data = this.parseData(res.body);
                    if (data && (data.seasons || data.totalSeasonNum)) return data;
                }
            } catch (_) {}
        }
        return null;
    }

    // ── Construction de la liste d'épisodes ───────────────────

    _buildEpisodes(subjectId, detailPath, subjectType, seasonInfo) {
        const episodes = [];
        const defaultEpCount = subjectType === 5 ? 24 : 13; // Anime = 24, Animation/Series = 13

        if (seasonInfo?.seasons && Array.isArray(seasonInfo.seasons) && seasonInfo.seasons.length > 0) {
            for (const season of seasonInfo.seasons) {
                const seNum = season.seasonNum || season.se || 1;
                const epList = season.episodes || season.episodeList || [];

                if (epList.length > 0) {
                    for (const ep of epList) {
                        const epNum  = ep.episodeNum || ep.ep || ep.num || 1;
                        const epTitle = ep.title || ep.name || `Épisode ${epNum}`;
                        episodes.push({
                            name:        `S${seNum}E${String(epNum).padStart(2, "0")} — ${epTitle}`,
                            url:         JSON.stringify({ subjectId, detailPath, se: seNum, ep: epNum }),
                            dateUpload:  ep.releaseDate || ep.airDate || ""
                        });
                    }
                } else {
                    const epCount = season.episodeCount || season.totalEpisode || season.episodeNum || defaultEpCount;
                    for (let ep = 1; ep <= epCount; ep++) {
                        episodes.push({
                            name:       `Saison ${seNum} Épisode ${ep}`,
                            url:        JSON.stringify({ subjectId, detailPath, se: seNum, ep }),
                            dateUpload: ""
                        });
                    }
                }
            }
        } else if (seasonInfo && (seasonInfo.totalSeasonNum || seasonInfo.seasonCount)) {
            const total = seasonInfo.totalSeasonNum || seasonInfo.seasonCount || 1;
            for (let se = 1; se <= total; se++) {
                for (let ep = 1; ep <= defaultEpCount; ep++) {
                    episodes.push({
                        name:       `Saison ${se} Épisode ${ep}`,
                        url:        JSON.stringify({ subjectId, detailPath, se, ep }),
                        dateUpload: ""
                    });
                }
            }
        } else {
            // Fallback
            for (let ep = 1; ep <= defaultEpCount; ep++) {
                episodes.push({
                    name:       `Épisode ${ep}`,
                    url:        JSON.stringify({ subjectId, detailPath, se: 1, ep }),
                    dateUpload: ""
                });
            }
        }
        return episodes;
    }

    // ── Détail ────────────────────────────────────────────────

    async getDetail(url) {
        const info = JSON.parse(url);

        // Live : pas besoin d'appel API
        if (info.isLive) {
            return {
                name:        "Live",
                description: "🔴 Flux en direct depuis MovieBox.",
                imageUrl:    "",
                genre:       ["Live"],
                status:      0,
                chapters:    [{ name: "▶ Regarder en direct", url, dateUpload: "" }]
            };
        }

        const { detailPath, subjectId, subjectType } = info;

        // Requête de détail + infos saison en parallèle si contenu sérialisé
        const isSeriesLike = DefaultExtension.SERIES_TYPES.has(parseInt(subjectType));
        const [s, seasonInfo] = await Promise.all([
            new Client().get(
                `${DefaultExtension.API}/wefeed-h5api-bff/detail?detailPath=${detailPath}`,
                { headers: this.webHeaders() }
            ).then(r => this.parseData(r.body)).catch(() => ({})),
            isSeriesLike ? this._getSeasonInfo(subjectId).catch(() => null) : Promise.resolve(null)
        ]);

        // Déterminer le vrai type depuis la réponse API (plus fiable)
        const realType = s.subjectType || parseInt(subjectType) || 1;
        const realId   = s.subjectId   || subjectId;

        // Métadonnées
        const genres  = (s.genre || "").split(/[,，]/).map(g => g.trim()).filter(Boolean);
        const cast    = (s.staffList || []).slice(0, 8).map(st => st.name).join(", ");
        let desc      = s.description || "";
        const extras  = [];
        if (s.imdbRatingValue && parseFloat(s.imdbRatingValue) > 0) extras.push(`⭐ IMDb ${s.imdbRatingValue}`);
        if (s.duration)    extras.push(`⏱ ${s.duration}`);
        if (s.countryName) extras.push(`🌍 ${s.countryName}`);
        if (s.language)    extras.push(`🗣 ${s.language}`);
        if (extras.length) desc += "\n\n" + extras.join("  |  ");
        if (cast)          desc += `\n👥 ${cast}`;

        // Chapitres : film/music/court = 1 chapitre ; série/anime/animation = épisodes
        let chapters;
        if (DefaultExtension.SERIES_TYPES.has(realType)) {
            chapters = this._buildEpisodes(realId, detailPath, realType, seasonInfo);
        } else {
            const chapterName = realType === 6 ? "▶ Regarder le clip" :
                                realType === 3 ? "▶ Regarder le court-métrage" :
                                                "▶ Regarder le film";
            chapters = [{
                name:        chapterName,
                url:         JSON.stringify({ subjectId: realId, detailPath, se: 0, ep: 0 }),
                dateUpload:  s.releaseDate || ""
            }];
        }

        return {
            name:     s.title || "",
            description: desc,
            imageUrl: s.cover?.url || "",
            genre:    genres,
            status:   DefaultExtension.SERIES_TYPES.has(realType) ? 0 : 1,
            chapters
        };
    }

    // ── Vidéos ────────────────────────────────────────────────

    async getVideoList(url) {
        const info = JSON.parse(url);

        // Live direct
        if (info.isLive) {
            if (!info.url) return [];
            const streamUrl = info.url;
            const headers   = { "Referer": "https://themoviebox.xyz/", "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0" };
            const quality   = streamUrl.includes(".m3u8") ? "HLS Live" : streamUrl.includes(".mpd") ? "DASH Live" : "Live";
            return [{ url: streamUrl, quality, originalUrl: streamUrl, headers }];
        }

        const { subjectId, detailPath, se, ep } = info;
        const apiUrl = `${DefaultExtension.API}/wefeed-h5api-bff/subject/download` +
                       `?subjectId=${subjectId}&se=${se}&ep=${ep}&detailPath=${detailPath}`;
        const res  = await new Client().get(apiUrl, { headers: this.webHeaders() });
        const data = this.parseData(res.body);

        const subtitles = [];
        const videos    = [];
        const dlHdrs    = {
            "Referer":    DefaultExtension.REFERER,
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0"
        };

        for (const item of (data.list || [])) {
            if (!item.resourceLink) continue;

            // Sous-titres
            for (const cap of (item.extCaptions || [])) {
                if (cap.url && !subtitles.find(s => s.label === cap.lanName)) {
                    subtitles.push({ file: cap.url, label: cap.lanName || cap.lan || "Sub" });
                }
            }

            const codec   = item.codecName ? item.codecName.toUpperCase() : "MP4";
            const res_lbl = item.resolution ? `${item.resolution}p` : "?p";
            videos.push({
                url:         item.resourceLink,
                quality:     `${res_lbl} [${codec}]`,
                originalUrl: item.resourceLink,
                headers:     dlHdrs
            });
        }

        // Meilleure qualité en premier
        videos.sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0));
        return videos.map(v => ({ ...v, subtitles }));
    }

    // ── Filtres ───────────────────────────────────────────────

    getFilterList() {
        const opt = (n, v) => ({ type_name: "SelectOption", name: n, value: v });
        return [
            {
                type_name: "SelectFilter", name: "Type", state: 0,
                values: [
                    opt("🎭 Tout",              "0"),
                    opt("🎬 Films",             "1"),
                    opt("📺 Séries TV",         "2"),
                    opt("🎞️ Courts-métrages",   "3"),
                    opt("🎨 Séries animées",    "4"),
                    opt("⛩️ Anime",             "5"),
                    opt("🎵 Clips musicaux",    "6"),
                ]
            },
            {
                type_name: "SelectFilter", name: "Tri", state: 0,
                values: [
                    opt("🔥 Populaire",   "VIEWS"),
                    opt("🆕 Récent",      "NEW"),
                    opt("⭐ Note IMDb",   "IMDB"),
                ]
            }
        ];
    }

    // ── Préférences source ────────────────────────────────────

    getSourcePreferences() {
        return [
            {
                key: "mb_lang",
                listPreference: {
                    title:      "Langue du contenu",
                    summary:    "Langue pour les sous-titres et l'interface",
                    valueIndex: 0,
                    entries: [
                        "English", "Français", "العربية", "Português",
                        "Indonesian", "中文", "Русский", "Filipino",
                        "日本語", "한국어", "Kiswahili", "বাংলা", "اُردُو"
                    ],
                    entryValues: [
                        "en", "fr", "ar", "pt",
                        "id", "zh", "ru", "tl",
                        "ja", "ko", "sw", "bn", "ur"
                    ]
                }
            },
            {
                key: "mb_type",
                listPreference: {
                    title:      "Type par défaut",
                    summary:    "Type de contenu affiché par défaut",
                    valueIndex: 0,
                    entries: [
                        "Tout", "Films", "Séries TV", "Courts-métrages",
                        "Séries animées", "Anime", "Clips musicaux"
                    ],
                    entryValues: ["0", "1", "2", "3", "4", "5", "6"]
                }
            },
            {
                key: "mb_sort",
                listPreference: {
                    title:      "Tri par défaut",
                    summary:    "Tri utilisé lors de la navigation",
                    valueIndex: 0,
                    entries:      ["Populaire", "Récent", "Note IMDb"],
                    entryValues:  ["VIEWS", "NEW", "IMDB"]
                }
            }
        ];
    }
}
