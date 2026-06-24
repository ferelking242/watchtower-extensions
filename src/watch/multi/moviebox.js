const watchtowerSources = [{
    "name": "MovieBox",
    "lang": "multi",
    "baseUrl": "https://themoviebox.xyz",
    "apiUrl": "https://h5-api.aoneroom.com",
    "iconUrl": "https://h5-static.aoneroom.com/oneroomProject/icon/moviebox-official.jpg",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "2.0.1",
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
    "notes": "MovieBox unifié v2 — Films, Séries, Anime, Animation, Courts-métrages, Clips musicaux, Live. API aoneroom.com. Sous-titres multi-langues."
}];

// ═══════════════════════════════════════════════════════════════
//  MovieBox — Extension unifiée v2.0.1
//  Source : themoviebox.xyz / aoneroom.com
//
//  Types (subjectType) :
//    1=Films  2=Séries TV  3=Courts-métrages
//    4=Séries animées  5=Anime  6=Clips musicaux
//
//  APIs :
//    h5-api.aoneroom.com  — recherche, détail, download
//    api6/5/4.aoneroom.com + api.inmoviebox.com — saisons (mobile)
//
//  CDN vidéo  : valiw / bcdn .hakunaymatata.com
//  CDN subs   : cacdn.hakunaymatata.com
//  CDN live   : lacdn.aoneroom.com
// ═══════════════════════════════════════════════════════════════

class DefaultExtension extends MProvider {
    constructor() { super(); }

    // ── Constantes ────────────────────────────────────────────

    static get API()     { return "https://h5-api.aoneroom.com"; }
    static get REFERER() { return "https://videodownloader.site/"; }
    static get V3() {
        return [
            "https://api6.aoneroom.com",
            "https://api5.aoneroom.com",
            "https://api4.aoneroom.com",
            "https://api.inmoviebox.com"
        ];
    }
    // Types sérialisés (ont des saisons/épisodes)
    static get SERIES_TYPES() { return new Set([2, 4, 5]); }

    // ── Préférences ───────────────────────────────────────────

    pref(key)  { return new SharedPreferences().get(key); }
    getLang()  { return this.pref("mb_lang") || "en"; }
    getType()  { return this.pref("mb_type") || "0"; }
    getSort()  { return this.pref("mb_sort") || "VIEWS"; }

    // ── En-têtes ──────────────────────────────────────────────

    apiHeaders() {
        return {
            "Content-Type":  "application/json",
            "Accept":        "application/json, text/plain, */*",
            "X-Client-Info": JSON.stringify({ timezone: "America/New_York" }),
            "x-request-lang": this.getLang(),
            "Referer":       DefaultExtension.REFERER,
            "User-Agent":    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        };
    }

    mobileHeaders() {
        return {
            "Accept":        "application/json",
            "Content-Type":  "application/json",
            "x-client-info": '{"package_name":"com.community.oneroom","version_name":"3.0.03","os":"android","region":"US","timezone":"America/New_York"}',
            "x-request-lang": this.getLang(),
            "User-Agent":    "com.community.oneroom/50020044 (Linux; U; Android 13; en_US; Redmi; Build/TQ2A.230405.003; Cronet/135.0.7012.3)",
            "Referer":       DefaultExtension.REFERER
        };
    }

    // ── Parser réponse API ────────────────────────────────────
    // L'API peut retourner les items dans plusieurs chemins selon l'endpoint.
    // Priorité : data.data > data.list > data.results[].subjects[]

    parseItems(body) {
        let json;
        try { json = JSON.parse(body || "{}"); } catch (_) { return []; }

        const root = json.data !== undefined ? json.data : json;

        // Chemin 1 : liste plate dans root.data ou root.list
        const flat = root.data || root.list || [];
        if (Array.isArray(flat) && flat.length > 0) return flat;

        // Chemin 2 : groups root.results[].subjects[]
        const groups = root.results || [];
        const items = [];
        for (const g of groups) {
            for (const s of (g.subjects || [])) items.push(s);
        }
        return items;
    }

    parsePager(body) {
        try {
            const json  = JSON.parse(body || "{}");
            const root  = json.data !== undefined ? json.data : json;
            const pager = root.pager || {};
            if (typeof pager.hasMore === "boolean") return pager.hasMore;
            const total = root.total || root.totalCount || 0;
            if (total) return false; // pas de pagination fiable
        } catch (_) {}
        return false;
    }

    // Normalise un objet item renvoyé par l'API
    // (l'API peut utiliser des noms de champs différents selon l'endpoint)
    toItem(s, subjectType) {
        const name     = s.subjectName || s.title || s.name || "Unknown";
        const imageUrl = s.horizontalCover || s.verticalCover
                      || s.poster || s.coverImage || s.cover?.url || "";
        const link     = JSON.stringify({
            detailPath:  s.detailPath  || String(s.subjectId || ""),
            subjectId:   s.subjectId,
            subjectType: s.subjectType || subjectType || 1
        });
        return { name, imageUrl, link, description: s.desc || s.description || "" };
    }

    // ── Recherche principale ───────────────────────────────────

    async _search(keyword, page, subjectType, sortBy) {
        const body = { keyword: keyword || "", page, perPage: 30 };
        if (subjectType && subjectType !== "0" && subjectType !== 0) {
            body.subjectType = parseInt(subjectType);
        }
        if (sortBy && sortBy !== "0") body.sortBy = sortBy;

        const res = await new Client().post(
            `${DefaultExtension.API}/wefeed-h5api-bff/subject/search`,
            this.apiHeaders(),
            JSON.stringify(body)
        );

        const items = this.parseItems(res.body);
        const list  = items.map(s => this.toItem(s, subjectType)).filter(i => i.link !== '{"detailPath":"","subjectId":undefined,"subjectType":1}');
        return { list, hasNextPage: list.length >= 28 };
    }

    // ── Browse ────────────────────────────────────────────────

    async getPopular(page) {
        const type = this.getType();
        const sort = this.getSort();
        return this._search("", page, type === "0" ? null : type, sort);
    }

    async getLatestUpdates(page) {
        const type = this.getType();
        return this._search("", page, type === "0" ? null : type, "NEW");
    }

    async search(query, page, filterList) {
        const typeVal = this._filterVal(filterList, "Type") || this.getType() || null;
        const sortVal = this._filterVal(filterList, "Tri")  || this.getSort() || "VIEWS";
        return this._search(query, page, typeVal === "0" ? null : typeVal, sortVal);
    }

    _filterVal(filterList, name) {
        if (!filterList) return null;
        for (const f of filterList) {
            if (f.name === name && f.values) return f.values[f.state]?.value;
        }
        return null;
    }

    // ── Sections home ─────────────────────────────────────────

    getCustomLists() {
        return [
            { id: "trending-movies",  name: "🔥 Films tendance"     },
            { id: "trending-series",  name: "📺 Séries tendance"     },
            { id: "trending-anime",   name: "⛩️ Anime tendance"      },
            { id: "trending-anim",    name: "🎨 Animation tendance"  },
            { id: "latest-movies",    name: "🆕 Films récents"       },
            { id: "latest-series",    name: "🆕 Séries récentes"     },
            { id: "latest-anime",     name: "🆕 Anime récent"        },
            { id: "music",            name: "🎵 Clips musicaux"      },
            { id: "shorts",           name: "🎞️ Courts-métrages"     },
            { id: "live",             name: "🔴 Live"                },
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
                const res = await new Client().get(ep, this.apiHeaders());
                if (res.statusCode === 200) {
                    let json;
                    try { json = JSON.parse(res.body); } catch (_) { continue; }
                    const root     = json.data !== undefined ? json.data : json;
                    const channels = root.list || root.liveList || root.channels || [];
                    if (channels.length > 0) {
                        const list = channels.map(ch => {
                            const url = ch.streamUrl || ch.playUrl || ch.m3u8Url || ch.liveUrl || "";
                            return {
                                name:        ch.title || ch.name || ch.channelName || "Live",
                                imageUrl:    ch.cover?.url || ch.coverUrl || ch.icon || "",
                                link:        JSON.stringify({ isLive: true, url }),
                                description: ch.description || ch.category || "🔴 Live"
                            };
                        }).filter(i => JSON.parse(i.link).url);
                        return { list, hasNextPage: root.pager?.hasMore || false };
                    }
                }
            } catch (_) {}
        }
        return { list: [], hasNextPage: false };
    }

    // ── Infos saisons ─────────────────────────────────────────

    async _getSeasonInfo(subjectId) {
        for (const base of DefaultExtension.V3) {
            try {
                const res = await new Client().get(
                    `${base}/wefeed-mobile-bff/subject-api/season-info?subjectId=${subjectId}`,
                    this.mobileHeaders()
                );
                if (res.statusCode === 200) {
                    let json;
                    try { json = JSON.parse(res.body); } catch (_) { continue; }
                    const data = json.data !== undefined ? json.data : json;
                    if (data && (data.seasons || data.totalSeasonNum)) return data;
                }
            } catch (_) {}
        }
        return null;
    }

    // ── Construction épisodes ─────────────────────────────────

    _buildEpisodes(subjectId, detailPath, subjectType, seasonInfo) {
        const episodes = [];
        const defaultEps = subjectType === 5 ? 24 : 13;

        if (seasonInfo?.seasons?.length > 0) {
            for (const season of seasonInfo.seasons) {
                const seNum  = season.seasonNum || season.se || 1;
                const epList = season.episodes || season.episodeList || [];

                if (epList.length > 0) {
                    for (const ep of epList) {
                        const epNum   = ep.episodeNum || ep.ep || ep.num || 1;
                        const epTitle = ep.title || ep.name || `Épisode ${epNum}`;
                        episodes.push({
                            name:       `S${seNum}E${String(epNum).padStart(2,"0")} — ${epTitle}`,
                            url:        JSON.stringify({ subjectId, detailPath, se: seNum, ep: epNum }),
                            dateUpload: ep.releaseDate || ep.airDate || ""
                        });
                    }
                } else {
                    const epCount = season.episodeCount || season.totalEpisode || defaultEps;
                    for (let ep = 1; ep <= epCount; ep++) {
                        episodes.push({
                            name:       `Saison ${seNum} Épisode ${ep}`,
                            url:        JSON.stringify({ subjectId, detailPath, se: seNum, ep }),
                            dateUpload: ""
                        });
                    }
                }
            }
        } else if (seasonInfo?.totalSeasonNum || seasonInfo?.seasonCount) {
            const total = seasonInfo.totalSeasonNum || seasonInfo.seasonCount || 1;
            for (let se = 1; se <= total; se++) {
                for (let ep = 1; ep <= defaultEps; ep++) {
                    episodes.push({
                        name:       `Saison ${se} Épisode ${ep}`,
                        url:        JSON.stringify({ subjectId, detailPath, se, ep }),
                        dateUpload: ""
                    });
                }
            }
        } else {
            for (let ep = 1; ep <= defaultEps; ep++) {
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

        if (info.isLive) {
            return {
                name: "Live", description: "🔴 Flux en direct — MovieBox.",
                imageUrl: "", genre: ["Live"], status: 0,
                chapters: [{ name: "▶ Regarder en direct", url, dateUpload: "" }]
            };
        }

        const { detailPath, subjectId, subjectType } = info;
        const isSeriesLike = DefaultExtension.SERIES_TYPES.has(parseInt(subjectType));

        const [detailRes, seasonInfo] = await Promise.all([
            new Client().get(
                `${DefaultExtension.API}/wefeed-h5api-bff/detail?detailPath=${detailPath}`,
                this.apiHeaders()
            ).then(r => {
                try { const j = JSON.parse(r.body); return j.data !== undefined ? j.data : j; }
                catch (_) { return {}; }
            }).catch(() => ({})),
            isSeriesLike ? this._getSeasonInfo(subjectId).catch(() => null) : Promise.resolve(null)
        ]);

        const s       = detailRes;
        const realType = s.subjectType || parseInt(subjectType) || 1;
        const realId   = s.subjectId   || subjectId;

        const genres = (s.genre || "").split(/[,，]/).map(g => g.trim()).filter(Boolean);
        const cast   = (s.staffList || []).slice(0, 8).map(st => st.name).join(", ");
        let desc     = s.description || s.desc || "";

        const extras = [];
        if (s.imdbRatingValue && parseFloat(s.imdbRatingValue) > 0) extras.push(`⭐ IMDb ${s.imdbRatingValue}`);
        if (s.duration)    extras.push(`⏱ ${s.duration}`);
        if (s.countryName) extras.push(`🌍 ${s.countryName}`);
        if (s.language)    extras.push(`🗣 ${s.language}`);
        if (extras.length) desc += "\n\n" + extras.join("  |  ");
        if (cast)          desc += `\n👥 ${cast}`;

        let chapters;
        if (DefaultExtension.SERIES_TYPES.has(realType)) {
            chapters = this._buildEpisodes(realId, detailPath, realType, seasonInfo);
        } else {
            const label = realType === 6 ? "▶ Regarder le clip"
                        : realType === 3 ? "▶ Regarder le court-métrage"
                        :                  "▶ Regarder le film";
            chapters = [{
                name:       label,
                url:        JSON.stringify({ subjectId: realId, detailPath, se: 0, ep: 0 }),
                dateUpload: s.releaseDate || ""
            }];
        }

        return {
            name:        s.title || s.subjectName || "",
            description: desc,
            imageUrl:    s.cover?.url || s.horizontalCover || s.verticalCover || "",
            genre:       genres,
            status:      DefaultExtension.SERIES_TYPES.has(realType) ? 0 : 1,
            chapters
        };
    }

    // ── Vidéos ────────────────────────────────────────────────

    async getVideoList(url) {
        const info = JSON.parse(url);

        if (info.isLive) {
            if (!info.url) return [];
            const hd = { "Referer": "https://themoviebox.xyz/", "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0" };
            const q  = info.url.includes(".m3u8") ? "HLS Live" : info.url.includes(".mpd") ? "DASH Live" : "Live";
            return [{ url: info.url, quality: q, originalUrl: info.url, headers: hd }];
        }

        const { subjectId, detailPath, se, ep } = info;
        const apiUrl = `${DefaultExtension.API}/wefeed-h5api-bff/subject/download`
                     + `?subjectId=${subjectId}&se=${se}&ep=${ep}&detailPath=${detailPath}`;

        const res  = await new Client().get(apiUrl, this.apiHeaders());
        let json;
        try { json = JSON.parse(res.body || "{}"); } catch (_) { return []; }
        const data = json.data !== undefined ? json.data : json;

        const dlHdrs    = { "Referer": DefaultExtension.REFERER, "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0" };
        const subtitles = [];
        const videos    = [];

        for (const item of (data.list || [])) {
            if (!item.resourceLink) continue;
            for (const cap of (item.extCaptions || [])) {
                if (cap.url && !subtitles.find(s => s.label === cap.lanName)) {
                    subtitles.push({ file: cap.url, label: cap.lanName || cap.lan || "Sub" });
                }
            }
            const codec = item.codecName ? item.codecName.toUpperCase() : "MP4";
            videos.push({
                url:         item.resourceLink,
                quality:     `${item.resolution || "?"}p [${codec}]`,
                originalUrl: item.resourceLink,
                headers:     dlHdrs
            });
        }

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
                    opt("🎭 Tout",            "0"),
                    opt("🎬 Films",           "1"),
                    opt("📺 Séries TV",       "2"),
                    opt("🎞️ Courts-métrages", "3"),
                    opt("🎨 Séries animées",  "4"),
                    opt("⛩️ Anime",           "5"),
                    opt("🎵 Clips musicaux",  "6"),
                ]
            },
            {
                type_name: "SelectFilter", name: "Tri", state: 0,
                values: [
                    opt("🔥 Populaire", "VIEWS"),
                    opt("🆕 Récent",    "NEW"),
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
                    entries:    ["English","Français","العربية","Português","Indonesian","中文","Русский","Filipino","日本語","한국어","Kiswahili","বাংলা","اُردُو"],
                    entryValues:["en","fr","ar","pt","id","zh","ru","tl","ja","ko","sw","bn","ur"]
                }
            },
            {
                key: "mb_type",
                listPreference: {
                    title:      "Type par défaut",
                    summary:    "Type de contenu affiché par défaut",
                    valueIndex: 0,
                    entries:    ["Tout","Films","Séries TV","Courts-métrages","Séries animées","Anime","Clips musicaux"],
                    entryValues:["0","1","2","3","4","5","6"]
                }
            },
            {
                key: "mb_sort",
                listPreference: {
                    title:      "Tri par défaut",
                    summary:    "Tri utilisé lors de la navigation",
                    valueIndex: 0,
                    entries:    ["Populaire","Récent"],
                    entryValues:["VIEWS","NEW"]
                }
            }
        ];
    }
}
