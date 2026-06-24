const watchtowerSources = [{
    "name": "MovieBox",
    "lang": "multi",
    "baseUrl": "https://themoviebox.xyz",
    "apiUrl": "https://h5-api.aoneroom.com",
    "iconUrl": "https://h5-static.aoneroom.com/oneroomProject/icon/moviebox-official.jpg",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "3.3.0",
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
    "notes": "MovieBox — Films & Séries. API aoneroom. Sous-titres multi-langues."
}];

// ══════════════════════════════════════════════════════════════
//  MovieBox  v3.3.0
//  Fixes: X-Client-Token auth header, episodes ascending order
// ══════════════════════════════════════════════════════════════

var MB_API  = "https://h5-api.aoneroom.com";
var MB_ORIG = "https://themoviebox.xyz";
var MB_PER  = 30;

// ── Compact MD5 (for X-Client-Token generation) ───────────────
function mbMD5(str) {
    function sl(n,c){return(n<<c)|(n>>>(32-c));}
    function add(a,b){var m=(a&0xffff)+(b&0xffff),h=(a>>16)+(b>>16)+(m>>16);return(h<<16)|(m&0xffff);}
    function cmn(q,a,b,x,s,t){return add(sl(add(add(a,q),add(x,t)),s),b);}
    function ff(a,b,c,d,x,s,t){return cmn((b&c)|((~b)&d),a,b,x,s,t);}
    function gg(a,b,c,d,x,s,t){return cmn((b&d)|(c&(~d)),a,b,x,s,t);}
    function hh(a,b,c,d,x,s,t){return cmn(b^c^d,a,b,x,s,t);}
    function ii(a,b,c,d,x,s,t){return cmn(c^(b|(~d)),a,b,x,s,t);}
    var m=[], i, s=str;
    for(i=0;i<s.length*8;i+=8)m[i>>5]|=(s.charCodeAt(i/8)&0xff)<<(i%32);
    m[s.length*8>>5]|=0x80<<((s.length*8)%32);
    m[(((s.length*8+64)>>>9)<<4)+14]=s.length*8;
    var a=1732584193,b=-271733879,c=-1732584194,d=271733878;
    for(i=0;i<m.length;i+=16){
        var oa=a,ob=b,oc=c,od=d;
        a=ff(a,b,c,d,m[i],7,-680876936);d=ff(d,a,b,c,m[i+1],12,-389564586);c=ff(c,d,a,b,m[i+2],17,606105819);b=ff(b,c,d,a,m[i+3],22,-1044525330);
        a=ff(a,b,c,d,m[i+4],7,-176418897);d=ff(d,a,b,c,m[i+5],12,1200080426);c=ff(c,d,a,b,m[i+6],17,-1473231341);b=ff(b,c,d,a,m[i+7],22,-45705983);
        a=ff(a,b,c,d,m[i+8],7,1770035416);d=ff(d,a,b,c,m[i+9],12,-1958414417);c=ff(c,d,a,b,m[i+10],17,-42063);b=ff(b,c,d,a,m[i+11],22,-1990404162);
        a=ff(a,b,c,d,m[i+12],7,1804603682);d=ff(d,a,b,c,m[i+13],12,-40341101);c=ff(c,d,a,b,m[i+14],17,-1502002290);b=ff(b,c,d,a,m[i+15],22,1236535329);
        a=gg(a,b,c,d,m[i+1],5,-165796510);d=gg(d,a,b,c,m[i+6],9,-1069501632);c=gg(c,d,a,b,m[i+11],14,643717713);b=gg(b,c,d,a,m[i],20,-373897302);
        a=gg(a,b,c,d,m[i+5],5,-701558691);d=gg(d,a,b,c,m[i+10],9,38016083);c=gg(c,d,a,b,m[i+15],14,-660478335);b=gg(b,c,d,a,m[i+4],20,-405537848);
        a=gg(a,b,c,d,m[i+9],5,568446438);d=gg(d,a,b,c,m[i+14],9,-1019803690);c=gg(c,d,a,b,m[i+3],14,-187363961);b=gg(b,c,d,a,m[i+8],20,1163531501);
        a=gg(a,b,c,d,m[i+13],5,-1444681467);d=gg(d,a,b,c,m[i+2],9,-51403784);c=gg(c,d,a,b,m[i+7],14,1735328473);b=gg(b,c,d,a,m[i+12],20,-1926607734);
        a=hh(a,b,c,d,m[i+5],4,-378558);d=hh(d,a,b,c,m[i+8],11,-2022574463);c=hh(c,d,a,b,m[i+11],16,1839030562);b=hh(b,c,d,a,m[i+14],23,-35309556);
        a=hh(a,b,c,d,m[i+1],4,-1530992060);d=hh(d,a,b,c,m[i+4],11,1272893353);c=hh(c,d,a,b,m[i+7],16,-155497632);b=hh(b,c,d,a,m[i+10],23,-1094730640);
        a=hh(a,b,c,d,m[i+13],4,681279174);d=hh(d,a,b,c,m[i],11,-358537222);c=hh(c,d,a,b,m[i+3],16,-722521979);b=hh(b,c,d,a,m[i+6],23,76029189);
        a=hh(a,b,c,d,m[i+9],4,-640364487);d=hh(d,a,b,c,m[i+12],11,-421815835);c=hh(c,d,a,b,m[i+15],16,530742520);b=hh(b,c,d,a,m[i+2],23,-995338651);
        a=ii(a,b,c,d,m[i],6,-198630844);d=ii(d,a,b,c,m[i+7],10,1126891415);c=ii(c,d,a,b,m[i+14],15,-1416354905);b=ii(b,c,d,a,m[i+5],21,-57434055);
        a=ii(a,b,c,d,m[i+12],6,1700485571);d=ii(d,a,b,c,m[i+3],10,-1894986606);c=ii(c,d,a,b,m[i+10],15,-1051523);b=ii(b,c,d,a,m[i+1],21,-2054922799);
        a=ii(a,b,c,d,m[i+8],6,1873313359);d=ii(d,a,b,c,m[i+15],10,-30611744);c=ii(c,d,a,b,m[i+6],15,-1560198380);b=ii(b,c,d,a,m[i+13],21,1309151649);
        a=ii(a,b,c,d,m[i+4],6,-145523070);d=ii(d,a,b,c,m[i+11],10,-1120210379);c=ii(c,d,a,b,m[i+2],15,718787259);b=ii(b,c,d,a,m[i+9],21,-343485551);
        a=add(a,oa);b=add(b,ob);c=add(c,oc);d=add(d,od);
    }
    function hex(n){var r="",H="0123456789abcdef",j;for(j=0;j<4;j++){var v=(n>>>(j*8))&0xff;r+=H[(v>>4)&0xf]+H[v&0xf];}return r;}
    return hex(a)+hex(b)+hex(c)+hex(d);
}

function mbClientToken() {
    var e = Math.floor(Date.now() / 1000);
    var rev = String(e).split("").reverse().join("");
    return e + "," + mbMD5(rev);
}

function mbHeaders() {
    return {
        "Accept":          "application/json",
        "Origin":          MB_ORIG,
        "Referer":         MB_ORIG + "/",
        "User-Agent":      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
        "X-Client-Info":   "{\"timezone\":\"UTC\"}",
        "X-Client-Token":  mbClientToken(),
        "X-Request-Lang":  "fr"
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
    if (s.verticalCover)   return s.verticalCover;
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

    getCustomLists() {
        return [
            { id: "all",       name: "🎭 Tout"    },
            { id: "movies",    name: "🎬 Films"    },
            { id: "series",    name: "📺 Séries"   },
            { id: "anime",     name: "⛩️ Anime"    },
            { id: "latest",    name: "🆕 Récents"  }
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

    async getPopular(page) {
        return mbPage(await mbFetchHome(), page);
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
                var opts = [{ v: "" }, { v: "1" }, { v: "2" }, { v: "5" }, { v: "4" }];
                var idx = filterList[0].state;
                if (idx > 0 && idx < opts.length) typeVal = opts[idx].v;
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
            // ✅ Ascending order — S1 E1 first, last episode at the end
            for (var si = 0; si < seasons.length; si++) {
                var season = seasons[si];
                var seNum  = season.se   || (si + 1);
                var maxEp  = season.maxEp || 0;
                for (var ep = 1; ep <= maxEp; ep++) {
                    chapters.push({
                        name:       (maxEp > 1) ? ("S" + seNum + " E" + ep) : (s.title || "Episode"),
                        url:        JSON.stringify({ subjectId: String(realId), detailPath: realDp, se: seNum, ep: ep }),
                        dateUpload: ""
                    });
                }
            }
            // Ascending order: E1 first → player starts at E1, list reads naturally
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
            if (j && j.code === 401) throw new Error("Connexion requise.");
            throw new Error("Pas de flux disponible. (code=" + (j ? j.code : "?") + ")");
        }

        var data    = j.data;

        if (!data.hasResource) {
            throw new Error("Épisode non disponible pour le moment. Réessaie plus tard.");
        }

        var refHdrs = { "Referer": MB_ORIG + "/" };

        // Préférence sous-titres
        var prefSub = "";
        try {
            if (this.source && this.source.prefs) {
                for (var pi = 0; pi < this.source.prefs.length; pi++) {
                    if (this.source.prefs[pi].key === "mb_sub") {
                        prefSub = String(this.source.prefs[pi].value || "");
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
                var fmt = data.hls && data.hls.length ? "HLS" : "MP4";
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
                        if (c && c.url) subtitles.push({ file: c.url, label: c.lanName || c.lan || "Sub" });
                    }
                    if (prefSub) {
                        for (var si2 = 0; si2 < subtitles.length; si2++) {
                            if ((subtitles[si2].label || "").toLowerCase().indexOf(prefSub) >= 0) {
                                var pref = subtitles.splice(si2, 1)[0];
                                subtitles.unshift(pref);
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
        if (data.dash && data.dash.length) {
            for (var di = 0; di < data.dash.length; di++) {
                pushStream(data.dash[di], "DASH " + (data.dash[di].resolutions || "") + "p");
            }
        }

        if (!out.length) throw new Error("Aucun flux disponible pour cet épisode.");
        return out;
    }

    getFilterList() {
        return [{
            type_name: "SelectFilter",
            name:      "Type",
            state:     0,
            values: [
                { type_name: "SelectOption", name: "🎭 Tout",      value: "" },
                { type_name: "SelectOption", name: "🎬 Films",     value: "1" },
                { type_name: "SelectOption", name: "📺 Séries",    value: "2" },
                { type_name: "SelectOption", name: "⛩️ Anime",     value: "5" },
                { type_name: "SelectOption", name: "🎨 Animation", value: "4" }
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
