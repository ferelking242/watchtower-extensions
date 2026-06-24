const watchtowerSources = [{
    "name": "MovieBox",
    "lang": "multi",
    "baseUrl": "https://themoviebox.xyz",
    "apiUrl": "https://h5-api.aoneroom.com",
    "iconUrl": "https://h5-static.aoneroom.com/oneroomProject/icon/moviebox-official.jpg",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "3.2.0",
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
    "notes": "MovieBox — Films & Séries. API aoneroom (h5-api). Sous-titres multi-langues."
}];

// ══════════════════════════════════════════════════════════════
//  MovieBox  v3.2.0
//  Endpoint: GET /wefeed-h5api-bff/home  (public, no token)
//  Detail:   GET /wefeed-h5api-bff/detail?subjectId=X
//  Play:     GET /wefeed-h5api-bff/subject/play?subjectId=X&se=X&ep=X
// ══════════════════════════════════════════════════════════════

var MB_API  = "https://h5-api.aoneroom.com";
var MB_ORIG = "https://lok-lok.cc";
var MB_PER  = 30;

function mbHeaders() {
    return {
        "Accept":        "application/json",
        "Origin":        MB_ORIG,
        "Referer":       MB_ORIG + "/",
        "User-Agent":    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
        "X-Client-Info": "{\"timezone\":\"UTC\"}"
    };
}

async function mbFetchHome() {
    try {
        var res = await new Client().get(MB_API + "/wefeed-h5api-bff/home", mbHeaders());
        var j;
        try { j = JSON.parse(res.body); } catch (_) { return []; }
        if (!j || j.code !== 0 || !j.data || !j.data.operatingList) return [];
        var ops = j.data.operatingList;
        var all = [];
        var seen = {};
        for (var i = 0; i < ops.length; i++) {
            var subs = ops[i].subjects;
            if (!subs || !subs.length) continue;
            for (var k = 0; k < subs.length; k++) {
                var s = subs[k];
                var sid = s.subjectId ? String(s.subjectId) : "";
                if (sid && !seen[sid]) {
                    seen[sid] = 1;
                    all.push(s);
                }
            }
        }
        return all;
    } catch (_) {
        return [];
    }
}

function mbCover(s) {
    if (s.cover && s.cover.url) return s.cover.url;
    if (s.horizontalCover) return s.horizontalCover;
    if (s.verticalCover) return s.verticalCover;
    return "";
}

function mbToItem(s) {
    return {
        name:        s.title || s.subjectName || "Unknown",
        imageUrl:    mbCover(s),
        link:        JSON.stringify({
            subjectId:   String(s.subjectId || ""),
            detailPath:  s.detailPath || "",
            subjectType: s.subjectType || 1
        }),
        description: s.description || ""
    };
}

function mbPage(items, page) {
    var p     = (page && page > 0) ? page : 1;
    var start = (p - 1) * MB_PER;
    var end   = p * MB_PER;
    var slice = [];
    for (var i = start; i < end && i < items.length; i++) slice.push(mbToItem(items[i]));
    return { list: slice, hasNextPage: end < items.length };
}

function mbFilter(all, typeStr) {
    if (!typeStr) return all;
    var t = parseInt(typeStr, 10);
    var out = [];
    for (var i = 0; i < all.length; i++) {
        if (all[i].subjectType === t) out.push(all[i]);
    }
    return out;
}

class DefaultExtension extends MProvider {

    // ── Home sections ─────────────────────────────────────────

    getCustomLists() {
        return [
            { id: "all",       name: "🎭 Tout"       },
            { id: "movies",    name: "🎬 Films"       },
            { id: "series",    name: "📺 Séries"      },
            { id: "anime",     name: "⛩️ Anime"       },
            { id: "latest",    name: "🆕 Récents"     }
        ];
    }

    async getCustomList(listId, page) {
        var all = await mbFetchHome();
        if (listId === "movies")    return mbPage(mbFilter(all, "1"), page);
        if (listId === "series")    return mbPage(mbFilter(all, "2"), page);
        if (listId === "anime")     return mbPage(mbFilter(all, "5"), page);
        if (listId === "animation") return mbPage(mbFilter(all, "4"), page);
        if (listId === "latest") {
            var sorted = all.slice().sort(function(a, b) {
                var da = a.releaseDate || "";
                var db = b.releaseDate || "";
                return db > da ? 1 : db < da ? -1 : 0;
            });
            return mbPage(sorted, page);
        }
        return mbPage(all, page);
    }

    // ── Browse ────────────────────────────────────────────────

    async getPopular(page) {
        var all = await mbFetchHome();
        return mbPage(all, page);
    }

    async getLatestUpdates(page) {
        var all = await mbFetchHome();
        var sorted = all.slice().sort(function(a, b) {
            var da = a.releaseDate || "";
            var db = b.releaseDate || "";
            return db > da ? 1 : db < da ? -1 : 0;
        });
        return mbPage(sorted, page);
    }

    async search(query, page, filterList) {
        var all = await mbFetchHome();
        var typeVal = "";
        try {
            if (filterList && filterList[0] && filterList[0].state !== undefined) {
                var opts = [{ value: "" }, { value: "1" }, { value: "2" }, { value: "5" }, { value: "4" }];
                var idx = filterList[0].state;
                if (idx > 0 && idx < opts.length) typeVal = opts[idx].value;
            }
        } catch (_) {}

        var filtered = mbFilter(all, typeVal);

        if (query && query.trim()) {
            var q = query.trim().toLowerCase();
            var result = [];
            for (var i = 0; i < filtered.length; i++) {
                var s = filtered[i];
                var t = (s.title || s.subjectName || "").toLowerCase();
                var g = (s.genre || "").toLowerCase();
                if (t.indexOf(q) >= 0 || g.indexOf(q) >= 0) result.push(s);
            }
            filtered = result;
        }

        return mbPage(filtered, page);
    }

    // ── Detail ────────────────────────────────────────────────

    async getDetail(url) {
        var payload;
        try { payload = JSON.parse(url); } catch (_) { payload = {}; }
        var subjectId   = payload.subjectId   || "";
        var detailPath  = payload.detailPath  || "";
        var subjectType = payload.subjectType || 1;

        var param = detailPath
            ? ("detailPath=" + encodeURIComponent(detailPath))
            : ("subjectId=" + encodeURIComponent(subjectId));

        var j = null;
        try {
            var res = await new Client().get(MB_API + "/wefeed-h5api-bff/detail?" + param, mbHeaders());
            try { j = JSON.parse(res.body); } catch (_) {}
        } catch (_) {}

        if (!j || j.code !== 0 || !j.data || !j.data.subject) {
            return { name: "Unknown", imageUrl: "", description: "", genre: [], status: 0, chapters: [] };
        }

        var s      = j.data.subject;
        var res2   = j.data.resource || {};
        var genres = [];
        var gparts = (s.genre || "").split(",");
        for (var i = 0; i < gparts.length; i++) {
            var g = gparts[i].trim();
            if (g) genres.push(g);
        }
        if (s.countryName) genres.push(s.countryName);

        var desc = s.description || "";
        if (s.imdbRatingValue && parseFloat(s.imdbRatingValue) > 0) {
            desc += "\n\n⭐ IMDb " + s.imdbRatingValue;
        }

        var realId   = s.subjectId   || subjectId;
        var realDp   = s.detailPath  || detailPath || "";
        var realType = s.subjectType || subjectType;
        var seasons  = (res2 && res2.seasons) ? res2.seasons : [];
        var chapters = [];
        var isMovie  = (realType === 1) || (seasons.length === 0);

        if (isMovie) {
            chapters.push({
                name:       "▶ Regarder",
                url:        JSON.stringify({ subjectId: String(realId), detailPath: realDp, se: 0, ep: 0 }),
                dateUpload: s.releaseDate || ""
            });
        } else {
            for (var si = 0; si < seasons.length; si++) {
                var season = seasons[si];
                var seNum  = season.se   || 1;
                var maxEp  = season.maxEp || 0;
                for (var ep = maxEp; ep >= 1; ep--) {
                    chapters.push({
                        name:       (maxEp > 1) ? ("S" + seNum + " E" + ep) : (s.title || "Episode"),
                        url:        JSON.stringify({ subjectId: String(realId), detailPath: realDp, se: seNum, ep: ep }),
                        dateUpload: ""
                    });
                }
            }
        }

        return {
            name:        s.title || "Unknown",
            imageUrl:    mbCover(s),
            description: desc,
            genre:       genres,
            status:      isMovie ? 1 : 0,
            chapters:    chapters
        };
    }

    // ── Video ─────────────────────────────────────────────────

    async getVideoList(url) {
        var payload;
        try { payload = JSON.parse(url); } catch (_) { throw new Error("URL invalide"); }

        var subjectId  = payload.subjectId  || "";
        var detailPath = payload.detailPath || "";
        var se = (payload.se !== undefined) ? payload.se : 0;
        var ep = (payload.ep !== undefined) ? payload.ep : 0;
        if (!subjectId) throw new Error("subjectId manquant");

        var playUrl = MB_API + "/wefeed-h5api-bff/subject/play"
            + "?subjectId=" + encodeURIComponent(subjectId)
            + "&se=" + se
            + "&ep=" + ep
            + "&detailPath=" + encodeURIComponent(detailPath);

        var j = null;
        try {
            var res = await new Client().get(playUrl, mbHeaders());
            try { j = JSON.parse(res.body); } catch (_) {}
        } catch (_) {}

        if (!j || j.code !== 0 || !j.data) {
            if (j && j.code === 403) throw new Error("Région bloquée — utilise un VPN.");
            throw new Error("Pas de flux disponible.");
        }

        var data    = j.data;
        var refHdrs = { "Referer": MB_ORIG + "/" };

        // Préférence sous-titres
        var prefSub = "";
        try {
            if (this.source && this.source.prefs) {
                for (var pi = 0; pi < this.source.prefs.length; pi++) {
                    if (this.source.prefs[pi].key === "mb_sub") {
                        prefSub = this.source.prefs[pi].value || "";
                        break;
                    }
                }
            }
        } catch (_) {}

        var subtitles = [];
        try {
            var stream = null;
            if (data.hls && data.hls[0]) stream = data.hls[0];
            else if (data.streams && data.streams[0]) stream = data.streams[0];
            if (stream && stream.id) {
                var fmt = data.hls ? "HLS" : "MP4";
                var capUrl = MB_API + "/wefeed-h5api-bff/subject/caption"
                    + "?format=" + fmt
                    + "&id=" + stream.id
                    + "&subjectId=" + encodeURIComponent(subjectId)
                    + "&detailPath=" + encodeURIComponent(detailPath);
                var cRes = await new Client().get(capUrl, mbHeaders());
                var cj = null;
                try { cj = JSON.parse(cRes.body); } catch (_) {}
                if (cj && cj.code === 0 && cj.data && cj.data.captions) {
                    var caps = cj.data.captions;
                    for (var ci = 0; ci < caps.length; ci++) {
                        var c = caps[ci];
                        if (c && c.url) {
                            subtitles.push({ file: c.url, label: c.lanName || c.lan || "Sub" });
                        }
                    }
                    // Mettre la langue préférée en premier
                    if (prefSub) {
                        for (var si2 = 0; si2 < subtitles.length; si2++) {
                            if ((subtitles[si2].label || "").toLowerCase().indexOf(prefSub) >= 0) {
                                var preferred = subtitles.splice(si2, 1)[0];
                                subtitles.unshift(preferred);
                                break;
                            }
                        }
                    }
                }
            }
        } catch (_) {}

        var out = [];
        function pushStream(s, label) {
            if (s && s.url) {
                out.push({ url: s.url, originalUrl: s.url, quality: label, headers: refHdrs, subtitles: subtitles });
            }
        }

        if (data.hls && data.hls.length) {
            var hlsList = data.hls.slice().sort(function(a, b) {
                return (+b.resolutions || 0) - (+a.resolutions || 0);
            });
            for (var hi = 0; hi < hlsList.length; hi++) {
                var h = hlsList[hi];
                pushStream(h, h.resolutions ? "HLS " + h.resolutions + "p" : "HLS Auto");
            }
        }
        if (data.streams && data.streams.length) {
            var mp4List = data.streams.slice().sort(function(a, b) {
                return (+b.resolutions || 0) - (+a.resolutions || 0);
            });
            for (var mi = 0; mi < mp4List.length; mi++) {
                var m = mp4List[mi];
                pushStream(m, "MP4 " + (m.resolutions || "") + "p");
            }
        }

        if (!out.length) throw new Error("Aucun flux disponible.");
        return out;
    }

    // ── Filters & Preferences ─────────────────────────────────

    getFilterList() {
        return [{
            type_name: "SelectFilter",
            name:      "Type",
            state:     0,
            values: [
                { type_name: "SelectOption", name: "🎭 Tout",       value: "" },
                { type_name: "SelectOption", name: "🎬 Films",      value: "1" },
                { type_name: "SelectOption", name: "📺 Séries",     value: "2" },
                { type_name: "SelectOption", name: "⛩️ Anime",      value: "5" },
                { type_name: "SelectOption", name: "🎨 Animation",  value: "4" }
            ]
        }];
    }

    getSourcePreferences() {
        return [{
            key: "mb_sub",
            listPreference: {
                title:      "Langue des sous-titres",
                summary:    "Déplacée en tête de liste si disponible",
                valueIndex: 0,
                entries:    ["English", "Français", "العربية", "Português", "Indonesian", "中文", "Русский", "日本語", "한국어", "Español"],
                entryValues:["en",      "fr",       "ar",      "pt",        "id",         "zh",   "ru",      "ja",      "ko",      "es"]
            }
        }];
    }
}
