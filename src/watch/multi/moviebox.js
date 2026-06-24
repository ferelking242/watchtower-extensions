const watchtowerSources = [{
    "name": "MovieBox",
    "lang": "multi",
    "baseUrl": "https://themoviebox.xyz",
    "apiUrl": "https://h5-api.aoneroom.com",
    "iconUrl": "https://h5-static.aoneroom.com/oneroomProject/icon/moviebox-official.jpg",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "3.1.0",
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
    "notes": "MovieBox — Films & Séries via API aoneroom (h5-api). Sous-titres multi-langues."
}];

// ══════════════════════════════════════════════════════════════
//  MovieBox  v3.1.0
//  API GET  /wefeed-h5api-bff/home  (public, sans token)
//  Detail   /wefeed-h5api-bff/detail?detailPath=X
//  Play     /wefeed-h5api-bff/subject/play?subjectId=X&se=X&ep=X
// ══════════════════════════════════════════════════════════════

var MB_API  = "https://h5-api.aoneroom.com";
var MB_ORIG = "https://lok-lok.cc";

function mbHeaders() {
    return {
        "Accept":        "application/json",
        "Origin":        MB_ORIG,
        "Referer":       MB_ORIG + "/",
        "User-Agent":    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
        "X-Client-Info": "{\"timezone\":\"UTC\"}"
    };
}

async function mbGetHome() {
    try {
        var res = await new Client().get(MB_API + "/wefeed-h5api-bff/home", mbHeaders());
        var j;
        try { j = JSON.parse(res.body); } catch (_) { return []; }
        if (!j || j.code !== 0 || !j.data) return [];
        var ops = j.data.operatingList || [];
        var all = [];
        var seen = {};
        for (var i = 0; i < ops.length; i++) {
            var op = ops[i];
            var subs = op.subjects || [];
            for (var k = 0; k < subs.length; k++) {
                var s = subs[k];
                var sid = String(s.subjectId || "");
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

function mbToItem(s) {
    var coverUrl = "";
    if (s.cover && s.cover.url) coverUrl = s.cover.url;
    var link = JSON.stringify({
        subjectId:   s.subjectId || "",
        detailPath:  s.detailPath || "",
        subjectType: s.subjectType || 1
    });
    return {
        name:        s.title || "Unknown",
        imageUrl:    coverUrl,
        link:        link,
        description: s.description || ""
    };
}

function mbPaginate(items, page) {
    var PER = 30;
    var p   = (page && page > 0) ? page : 1;
    var start = (p - 1) * PER;
    var end   = p * PER;
    var slice = items.slice(start, end);
    var list  = [];
    for (var i = 0; i < slice.length; i++) list.push(mbToItem(slice[i]));
    return { list: list, hasNextPage: end < items.length };
}

class DefaultExtension extends MProvider {

    async getPopular(page) {
        var all = await mbGetHome();
        return mbPaginate(all, page);
    }

    async getLatestUpdates(page) {
        var all = await mbGetHome();
        all.sort(function(a, b) {
            var da = a.releaseDate || "";
            var db = b.releaseDate || "";
            if (db > da) return 1;
            if (db < da) return -1;
            return 0;
        });
        return mbPaginate(all, page);
    }

    async search(query, page, filterList) {
        if (!query || !query.trim()) return this.getPopular(page);
        var q   = query.trim().toLowerCase();
        var all = await mbGetHome();
        var filtered = [];
        for (var i = 0; i < all.length; i++) {
            var s = all[i];
            var t = (s.title || "").toLowerCase();
            var g = (s.genre || "").toLowerCase();
            if (t.indexOf(q) >= 0 || g.indexOf(q) >= 0) filtered.push(s);
        }
        return mbPaginate(filtered, page);
    }

    async getDetail(url) {
        var payload;
        try { payload = JSON.parse(url); } catch (_) { payload = {}; }
        var detailPath  = payload.detailPath  || "";
        var subjectId   = payload.subjectId   || "";
        var subjectType = payload.subjectType || 1;

        var param = detailPath ? ("detailPath=" + detailPath) : ("subjectId=" + subjectId);
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
        var genreStr = s.genre || "";
        var genreParts = genreStr.split(",");
        for (var i = 0; i < genreParts.length; i++) {
            var g = genreParts[i].trim();
            if (g) genres.push(g);
        }
        if (s.countryName) genres.push(s.countryName);

        var desc = s.description || "";
        if (s.imdbRatingValue && parseFloat(s.imdbRatingValue) > 0) desc += "\n\n⭐ IMDb " + s.imdbRatingValue;
        if (s.duration) desc += "  ⏱ " + s.duration;

        var realId = s.subjectId || subjectId;
        var realDp = s.detailPath || detailPath || "";
        var realType = s.subjectType || subjectType;
        var seasons = res2.seasons || [];
        var chapters = [];
        var isMovie  = (realType === 1) || (seasons.length === 0);

        if (isMovie) {
            chapters.push({
                name:       "▶ Regarder",
                url:        JSON.stringify({ subjectId: realId, detailPath: realDp, se: 0, ep: 0 }),
                dateUpload: s.releaseDate || ""
            });
        } else {
            for (var si = 0; si < seasons.length; si++) {
                var season = seasons[si];
                var seNum  = season.se   || 1;
                var maxEp  = season.maxEp || 0;
                for (var ep = maxEp; ep >= 1; ep--) {
                    chapters.push({
                        name:       (maxEp > 1) ? ("S" + seNum + " E" + ep) : (s.title || "Épisode"),
                        url:        JSON.stringify({ subjectId: realId, detailPath: realDp, se: seNum, ep: ep }),
                        dateUpload: ""
                    });
                }
            }
        }

        var imgUrl = "";
        if (s.cover && s.cover.url) imgUrl = s.cover.url;

        return {
            name:        s.title || "Unknown",
            imageUrl:    imgUrl,
            description: desc,
            genre:       genres,
            status:      isMovie ? 1 : 0,
            chapters:    chapters
        };
    }

    async getVideoList(url) {
        var payload;
        try { payload = JSON.parse(url); } catch (_) { throw new Error("URL invalide"); }
        var subjectId  = payload.subjectId  || "";
        var detailPath = payload.detailPath || "";
        var se = (payload.se !== undefined) ? payload.se : 0;
        var ep = (payload.ep !== undefined) ? payload.ep : 0;
        if (!subjectId) throw new Error("subjectId manquant");

        var playUrl = MB_API + "/wefeed-h5api-bff/subject/play"
            + "?subjectId=" + subjectId
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

        var data      = j.data;
        var refHdrs   = { "Referer": MB_ORIG + "/" };
        var subtitles = [];

        // Sous-titres
        try {
            var streams  = (data.hls && data.hls[0]) || (data.streams && data.streams[0]) || null;
            if (streams && streams.id) {
                var fmt  = data.hls ? "HLS" : "MP4";
                var capUrl = MB_API + "/wefeed-h5api-bff/subject/caption"
                    + "?format=" + fmt
                    + "&id=" + streams.id
                    + "&subjectId=" + subjectId
                    + "&detailPath=" + encodeURIComponent(detailPath);
                var cRes = await new Client().get(capUrl, mbHeaders());
                var cj   = null;
                try { cj = JSON.parse(cRes.body); } catch (_) {}
                if (cj && cj.code === 0 && cj.data && cj.data.captions) {
                    var caps = cj.data.captions;
                    for (var ci = 0; ci < caps.length; ci++) {
                        var c = caps[ci];
                        if (c && c.url) subtitles.push({ file: c.url, label: c.lanName || c.lan || "Sub" });
                    }
                }
            }
        } catch (_) {}

        var out = [];
        function pushStream(s, label) {
            if (s && s.url) out.push({ url: s.url, originalUrl: s.url, quality: label, headers: refHdrs, subtitles: subtitles });
        }

        if (data.hls && data.hls.length) {
            var hlsSorted = data.hls.slice().sort(function(a,b) { return (+b.resolutions||0) - (+a.resolutions||0); });
            for (var hi = 0; hi < hlsSorted.length; hi++) {
                var h = hlsSorted[hi];
                pushStream(h, h.resolutions ? "HLS " + h.resolutions + "p" : "HLS Auto");
            }
        }
        if (data.streams && data.streams.length) {
            var mpSorted = data.streams.slice().sort(function(a,b) { return (+b.resolutions||0) - (+a.resolutions||0); });
            for (var mi = 0; mi < mpSorted.length; mi++) {
                var m = mpSorted[mi];
                pushStream(m, "MP4 " + (m.resolutions || "") + "p");
            }
        }

        if (!out.length) throw new Error("Aucun flux disponible.");
        return out;
    }

    getFilterList() {
        return [{
            type_name: "SelectFilter", name: "Type", state: 0,
            values: [
                { type_name: "SelectOption", name: "🎭 Tout",          value: "" },
                { type_name: "SelectOption", name: "🎬 Films",         value: "1" },
                { type_name: "SelectOption", name: "📺 Séries",        value: "2" },
                { type_name: "SelectOption", name: "⛩️ Anime",         value: "5" },
                { type_name: "SelectOption", name: "🎨 Animation",     value: "4" }
            ]
        }];
    }

    getSourcePreferences() {
        return [{
            key: "mb_sub",
            listPreference: {
                title:      "Langue des sous-titres",
                summary:    "Déplacée en tête si disponible",
                valueIndex: 0,
                entries:    ["English","Français","العربية","Português","Indonesian","中文","Русский","日本語","한국어"],
                entryValues:["en","fr","ar","pt","id","zh","ru","ja","ko"]
            }
        }];
    }
}
