const watchtowerSources = [{
    "name": "MovieBox",
    "lang": "multi",
    "baseUrl": "https://themoviebox.xyz",
    "apiUrl": "https://h5-api.aoneroom.com",
    "iconUrl": "https://h5-static.aoneroom.com/oneroomProject/icon/moviebox-official.jpg",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "5.2.0",
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
    "notes": "MovieBox v5.0.0 — Recherche via POST /subject/search avec session Bearer token; suggestions via POST /search-suggest."
}];

// ══════════════════════════════════════════════════════════════
//  MovieBox  v5.0.0
//  Fixes v4.3.0 :
//   - _apiSearch() : GET /search remplacé par POST /subject/search
//     avec Authorization Bearer (session token extrait de x-user)
//   - getSuggestions() : GET /search remplacé par POST /search-suggest
//   - _getSessionToken() : cache TTL 25 min, récupéré via search-suggest
// ══════════════════════════════════════════════════════════════

var MB_API      = "https://h5-api.aoneroom.com";
var MB_ORIG     = "https://themoviebox.xyz";
var MB_PER      = 30;
var MB_HOME_TTL = 5 * 60 * 1000; // 5 minutes

// ── Compact MD5 (for X-Client-Token) ─────────────────────────
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
    return e + "," + mbMD5(String(e).split("").reverse().join(""));
}

function mbHeaders(lang, detailPath) {
    return {
        "Accept":         "application/json",
        "Origin":         MB_ORIG,
        "Referer":        detailPath ? (MB_ORIG + "/movies/" + detailPath) : (MB_ORIG + "/"),
        "User-Agent":     "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
        "X-Client-Info":  "{\"timezone\":\"UTC\"}",
        "X-Client-Token": mbClientToken(),
        "X-Request-Lang": lang || "fr"
    };
}

// ── Sections de l'accueil ─────────────────────────────────────
// getCustomLists() DOIT être synchrone (contrainte de la plateforme).
// Le CONTENU de chaque section est toujours récupéré en live depuis
// l'API via getCustomList("op_N") → operatingList[N] de l'API.
// Les titres correspondent aux sections actuelles du site.
var MB_HOME_SECTIONS = [
    { id: "carousel",  name: "🎬 À la une",                  layout: "banner",    color: "#1CB7FF" },
    // ── Catégories ────────────────────────────────────────────
    { id: "cat_all",       name: "All",       layout: "category", color: "#2C3E50" },
    { id: "cat_action",    name: "Action",    layout: "category", color: "#C0392B" },
    { id: "cat_comedy",    name: "Comédie",   layout: "category", color: "#D4AC0D" },
    { id: "cat_animation", name: "Animation", layout: "category", color: "#8E44AD" },
    { id: "cat_adventure", name: "Aventure",  layout: "category", color: "#1E8449" },
    { id: "cat_romance",   name: "Romance",   layout: "category", color: "#E91E63" },
    // ── Sections du site (operatingList — contenu live) ───────
    { id: "op_0",  name: "Trending🔥",                       layout: "spotlight", color: "#FF6F00" },
    { id: "op_1",  name: "New Series",                       layout: "spotlight", color: "#1CB7FF" },
    { id: "op_2",  name: "New Movies",                       layout: "spotlight", color: "#1CB7FF" },
    { id: "op_3",  name: "🔥Séries Courtes",                 layout: "spotlight", color: "#FF6F00" },
    { id: "op_4",  name: "Animes",                           layout: "spotlight", color: "#8E44AD" },
    { id: "op_5",  name: "Sci-Fi",                           layout: "spotlight", color: "#00BCD4" },
    { id: "op_6",  name: "New Anime",                        layout: "spotlight", color: "#8E44AD" },
    { id: "op_7",  name: "TV Series for you",                layout: "spotlight", color: "#1CB7FF" },
    { id: "op_8",  name: "SA Drama",                         layout: "spotlight", color: "#1CB7FF" },
    { id: "op_9",  name: "Made in China",                    layout: "spotlight", color: "#E53935" },
    { id: "op_10", name: "K-Drama",                          layout: "spotlight", color: "#00897B" },
    { id: "op_11", name: "Barbie Princess World Popular Picks", layout: "spotlight", color: "#E91E63" },
    { id: "op_12", name: "Martial Arts",                     layout: "spotlight", color: "#E53935" },
    { id: "op_13", name: "Animation",                        layout: "spotlight", color: "#8E44AD" },
    { id: "op_14", name: "Latest Nollywood Movies",          layout: "spotlight", color: "#1CB7FF" },
    { id: "op_15", name: "Myth of Love",                     layout: "spotlight", color: "#E91E63" },
    { id: "op_16", name: "Reality Show",                     layout: "spotlight", color: "#FF6F00" },
    { id: "op_17", name: "Made in Africa",                   layout: "spotlight", color: "#1CB7FF" },
    { id: "op_18", name: "Must-watch TOP100 Anime",          layout: "ranked",    color: "#8E44AD" },
    { id: "op_19", name: "Bollywood",                        layout: "spotlight", color: "#FF6F00" },
    { id: "op_20", name: "All Time Favorites",               layout: "spotlight", color: "#1CB7FF" },
    { id: "op_21", name: "Most trending",                    layout: "spotlight", color: "#FF6F00" },
    { id: "op_22", name: "Today's new updates",              layout: "spotlight", color: "#1CB7FF" },
    { id: "op_23", name: "Teach you a lesson",               layout: "spotlight", color: "#1CB7FF" },
    { id: "op_24", name: "Girl Power Wrestling",             layout: "spotlight", color: "#E91E63" },
    { id: "op_25", name: "Arabic Movie",                     layout: "spotlight", color: "#1CB7FF" },
    { id: "op_26", name: "Hollywood Movies",                 layout: "spotlight", color: "#1CB7FF" },
    { id: "op_27", name: "Must-watch Top 100",               layout: "ranked",    color: "#FF6F00" },
    { id: "op_28", name: "Fighters on Screen",               layout: "spotlight", color: "#E53935" },
    { id: "op_29", name: "C-Drama",                          layout: "spotlight", color: "#E53935" },
    { id: "op_30", name: "Thai-Drama",                       layout: "spotlight", color: "#1CB7FF" },
    { id: "op_31", name: "Anime",                            layout: "spotlight", color: "#8E44AD" },
    { id: "op_32", name: "Family Animation & Adventure",     layout: "spotlight", color: "#8E44AD" },
    { id: "op_33", name: "Movies in Minutes",                layout: "spotlight", color: "#1CB7FF" },
    { id: "op_34", name: "Viral Sports Shorts",              layout: "spotlight", color: "#FF6F00" },
    { id: "op_35", name: "Animation Elite Collection",       layout: "spotlight", color: "#8E44AD" },
    { id: "op_36", name: "Stories & Fairy Tales",            layout: "spotlight", color: "#8E44AD" },
    { id: "op_37", name: "💓Love Stories💓",                 layout: "spotlight", color: "#E91E63" },
    { id: "op_38", name: "Turkish Stars",                    layout: "spotlight", color: "#1CB7FF" },
    { id: "op_39", name: "Boys' Love🩵",                    layout: "spotlight", color: "#1CB7FF" },
    { id: "op_40", name: "Marvel Movies",                    layout: "spotlight", color: "#E53935" },
    { id: "op_41", name: "Indian Movie",                     layout: "spotlight", color: "#FF6F00" },
    // ── Catalogue infini ──────────────────────────────────────
    { id: "catalogue", name: "Catalogue",                    layout: "ranked",    color: "#7C4DFF" }
];

class DefaultExtension extends MProvider {

    // ── Cache home brut (bannerList + operatingList avec titres) ─
    // Extrait aussi le Bearer JWT depuis le header x-user de la réponse.
    async _fetchHomeRaw() {
        var now = Date.now();
        if (this._homeRawCache && (now - (this._homeRawAt || 0)) < MB_HOME_TTL) {
            return this._homeRawCache;
        }
        try {
            var res = await new Client().get(
                MB_API + "/wefeed-h5api-bff/home",
                mbHeaders(this._prefLang())
            );
            // Extraire le JWT Bearer depuis x-user (JSON: {"token":"<jwt>",...})
            try {
                var xu = res.headers && (res.headers["x-user"] || res.headers["X-User"]);
                if (xu) {
                    var xuObj = JSON.parse(xu);
                    if (xuObj && xuObj.token) {
                        this._sessionToken   = xuObj.token;
                        this._sessionTokenAt = now;
                    }
                }
            } catch (_) {}
            var j; try { j = JSON.parse(res.body); } catch (_) { return this._homeRawCache || null; }
            if (!j || j.code !== 0 || !j.data) return this._homeRawCache || null;
            this._homeRawCache = j.data;
            this._homeRawAt    = now;
            return j.data;
        } catch (_) {
            return this._homeRawCache || null;
        }
    }

    // ── Liste plate dédupliquée (fallback / recherche locale) ───
    async _fetchHome() {
        var data = await this._fetchHomeRaw();
        if (!data || !data.operatingList) return this._homeFlat || [];
        var seen = {}, all = [];
        for (var i = 0; i < data.operatingList.length; i++) {
            var subs = data.operatingList[i].subjects || [];
            for (var k = 0; k < subs.length; k++) {
                var sid = subs[k].subjectId != null ? String(subs[k].subjectId) : "";
                if (sid && !seen[sid]) { seen[sid] = 1; all.push(subs[k]); }
            }
        }
        this._homeFlat = all;
        return all;
    }

    // ── Préférences ───────────────────────────────────────────
    _pref(key, fallback) {
        try {
            if (this.source && this.source.prefs) {
                for (var i = 0; i < this.source.prefs.length; i++) {
                    if (this.source.prefs[i].key === key) {
                        var v = this.source.prefs[i].value;
                        return (v !== undefined && v !== null && v !== "") ? String(v) : fallback;
                    }
                }
            }
        } catch (_) {}
        return fallback;
    }
    _prefLang()      { return this._pref("mb_content_lang", "fr"); }
    _prefSub()       { return this._pref("mb_sub", "en"); }
    _prefDub()       { return this._pref("mb_dub", ""); }
    _prefBilingual() { return this._pref("mb_bilingual", "false") === "true"; }
    _prefBilingual2(){ return this._pref("mb_bilingual_second", "en"); }

    // ── Rendu des items ───────────────────────────────────────
    _cover(s) {
        if (s.cover && s.cover.url) return s.cover.url;
        if (s.cover && typeof s.cover === "string") return s.cover;
        if (s.coverUrl)        return s.coverUrl;
        if (s.posterUrl)       return s.posterUrl;
        if (s.poster)          return s.poster;
        if (s.verticalCover)   return s.verticalCover;
        if (s.horizontalCover) return s.horizontalCover;
        if (s.thumbnail)       return s.thumbnail;
        if (s.imageUrl)        return s.imageUrl;
        return "";
    }
    _toItem(s) {
        // subjectId peut être 0 (falsy) — ne pas utiliser || ""
        var sid = (s.subjectId !== undefined && s.subjectId !== null)
            ? String(s.subjectId)
            : (s.id !== undefined && s.id !== null ? String(s.id) : "");
        return {
            name:        s.title || s.subjectName || s.name || "Unknown",
            imageUrl:    this._cover(s),
            link:        JSON.stringify({
                subjectId:   sid,
                detailPath:  s.detailPath  || s.detail_path  || "",
                subjectType: s.subjectType || s.subject_type || 1
            }),
            description: s.description || ""
        };
    }
    _page(items, page) {
        var p = (page && page > 0) ? page : 1;
        var start = (p - 1) * MB_PER, end = p * MB_PER, slice = [];
        for (var i = start; i < end && i < items.length; i++) slice.push(this._toItem(items[i]));
        return { list: slice, hasNextPage: end < items.length };
    }

    // ── Catalogue paginé (/catalog) ───────────────────────────
    async _apiCatalog(page, typeVal, sortVal, genreVal, countryVal, lang) {
        var p = (page && page > 0) ? page : 1;
        var url = MB_API + "/wefeed-h5api-bff/catalog"
            + "?pageNum=" + p + "&pageSize=" + MB_PER;
        if (typeVal)    url += "&subjectType=" + encodeURIComponent(typeVal);
        if (sortVal)    url += "&sortType="    + encodeURIComponent(sortVal);
        if (genreVal)   url += "&genre="       + encodeURIComponent(genreVal);
        if (countryVal) url += "&country="     + encodeURIComponent(countryVal);
        try {
            var res = await new Client().get(url, mbHeaders(lang));
            var j; try { j = JSON.parse(res.body); } catch (_) { return null; }
            if (!j || j.code !== 0 || !j.data) return null;
            var d = j.data, items = d.subjects || d.list || d.data || [];
            var total = d.total || d.totalCount || 0;
            var list = [];
            for (var i = 0; i < items.length; i++) list.push(this._toItem(items[i]));
            return { list: list, hasNextPage: total > 0 ? (p * MB_PER < total) : (items.length >= MB_PER) };
        } catch (_) { return null; }
    }

    // ── Session Bearer token (extrait de x-user via GET /home) ──
    // Le GET /home retourne un header x-user JSON : {"token":"<jwt>",...}
    // _fetchHomeRaw() l'extrait à chaque appel HTTP réel (pas depuis cache).
    // On invalide toujours le cache home quand on n'a pas encore de token
    // pour forcer un vrai GET et récupérer le header x-user.
    async _getSessionToken(lang, forceRefresh) {
        var now = Date.now();
        var TTL = 25 * 60 * 1000;
        if (!forceRefresh && this._sessionToken && (now - (this._sessionTokenAt || 0)) < TTL) {
            return this._sessionToken;
        }
        // Pas de token (ou force refresh) → invalide cache home pour forcer GET /home
        this._homeRawAt = 0;
        await this._fetchHomeRaw();
        return this._sessionToken || null;
    }

    // ── Recherche réelle via POST /subject/search ─────────────
    async _apiSearch(query, page, typeVal, sortVal, genreVal, countryVal, lang) {
        var p = (page && page > 0) ? page : 1;
        var payload = { keyword: query || "", pageNum: p, pageSize: MB_PER };
        if (typeVal)    payload.subjectType = parseInt(typeVal, 10) || undefined;
        if (sortVal)    payload.sortType    = sortVal;
        if (genreVal)   payload.genre       = genreVal;
        if (countryVal) payload.country     = countryVal;

        // Attempt once, then force-refresh token on 401/403 and retry once.
        for (var attempt = 0; attempt < 2; attempt++) {
            var forceRefresh = attempt > 0;
            var token = await this._getSessionToken(lang, forceRefresh);
            if (!token && lang !== "en") token = await this._getSessionToken("en", forceRefresh);
            if (!token) return null;
            try {
                var hdrs = mbHeaders(lang);
                hdrs["content-type"]  = "application/json";
                hdrs["Authorization"] = "Bearer " + token;
                // Passer payload comme objet (pas JSON.stringify) :
                // le Dart runtime encode lui-même en JSON via json.encode().
                // JSON.stringify + json.encode = double-encodage → corps invalide.
                var res = await new Client().post(
                    MB_API + "/wefeed-h5api-bff/subject/search",
                    hdrs,
                    payload
                );
                var j; try { j = JSON.parse(res.body || ""); } catch (_) { return null; }
                // On auth failure, invalidate cache and retry
                if (j && (j.code === 401 || j.code === 403) && attempt === 0) {
                    this._sessionToken = null;
                    this._sessionTokenAt = 0;
                    continue;
                }
                if (!j || j.code !== 0 || !j.data) return null;
                var d = j.data;
                var items = d.items || d.subjects || d.subjectList || d.list || d.data || d.results || d.content || d.records || [];
                var pager = d.pager || {};
                var total = pager.totalCount || d.total || d.totalCount || d.count || 0;
                var hasMore = pager.hasMore !== undefined ? pager.hasMore : (total > 0 ? (p * MB_PER < total) : (items.length >= MB_PER));
                var list  = [];
                for (var i = 0; i < items.length; i++) list.push(this._toItem(items[i]));
                return { list: list, hasNextPage: hasMore };
            } catch (_) { return null; }
        }
        return null;
    }

    // ── Filtrage local (fallback) ─────────────────────────────
    _sortLatest(all) {
        var dated = [], undated = [];
        for (var i = 0; i < all.length; i++) {
            if (all[i].releaseDate) dated.push(all[i]); else undated.push(all[i]);
        }
        dated.sort(function(a, b) { return b.releaseDate > a.releaseDate ? 1 : b.releaseDate < a.releaseDate ? -1 : 0; });
        undated.reverse();
        return dated.concat(undated);
    }
    _sortRating(all) {
        var s = all.filter(function(x) { return x.imdbRatingValue && parseFloat(x.imdbRatingValue) > 0; });
        s.sort(function(a, b) { return parseFloat(b.imdbRatingValue) - parseFloat(a.imdbRatingValue); });
        return s;
    }
    _filterLocal(all, typeVal, genreVal, countryVal) {
        var CMAP = {
            us:["us","usa","united states","american"],kr:["korea","korean","kr"],
            jp:["japan","japanese","jp"],cn:["china","chinese","cn"],
            fr:["france","french","fr"],gb:["uk","britain","british","gb"],
            "in":["india","indian"],it:["italy","italian","it"],
            de:["germany","german","de"],es:["spain","spanish","es"],
            mx:["mexico","mexican","mx"],th:["thailand","thai","th"]
        };
        var typeNum = typeVal ? parseInt(typeVal, 10) : 0;
        var genreLc = genreVal ? genreVal.toLowerCase() : "";
        var cPats   = countryVal ? (CMAP[countryVal.toLowerCase()] || [countryVal.toLowerCase()]) : null;
        var out = [];
        for (var i = 0; i < all.length; i++) {
            var s = all[i];
            if (typeVal && s.subjectType !== typeNum) continue;
            if (genreLc && (s.genre || "").toLowerCase().indexOf(genreLc) < 0) continue;
            if (cPats) {
                var co = (s.countryName || s.country || "").toLowerCase(), ok = false;
                for (var p = 0; p < cPats.length; p++) { if (co.indexOf(cPats[p]) >= 0) { ok = true; break; } }
                if (!ok) continue;
            }
            out.push(s);
        }
        return out;
    }

    // ── Lecture des filtres (format SelectFilter de Watchtower) ──
    // Chaque filtre reçu : { type_name:"SelectFilter", name:"Type", state: idx, values:[{type_name:"SelectOption", name:"Film", value:"1"}, ...] }
    _readFilters(filterList) {
        var typeVal = "", sortVal = "", genreVal = "", countryVal = "";
        try {
            if (!filterList || !filterList.length) return { typeVal: typeVal, sortVal: sortVal, genreVal: genreVal, countryVal: countryVal };
            for (var i = 0; i < filterList.length; i++) {
                var f = filterList[i];
                if (!f || f.state === undefined || f.state === null) continue;
                var idx  = typeof f.state === "number" ? f.state : parseInt(f.state, 10);
                var vals = f.values || [];
                // Récupère la valeur de l'option sélectionnée
                var selVal = "";
                if (vals.length > idx && vals[idx]) {
                    selVal = vals[idx].value !== undefined ? String(vals[idx].value) : "";
                }
                var nm = f.name || "";
                if (nm === "Type")  typeVal    = selVal;
                else if (nm === "Genre")  genreVal   = selVal;
                else if (nm === "Pays")   countryVal = selVal;
                else if (nm === "Tri")    sortVal    = selVal;
            }
        } catch (_) {}
        return { typeVal: typeVal, sortVal: sortVal, genreVal: genreVal, countryVal: countryVal };
    }

    // ─────────────────────────────────────────────────────────
    //  ACCUEIL — SYNC (contrainte plateforme)
    //  Si le cache home est disponible → sections construites dynamiquement
    //  depuis l'API (titres + ordre exacts du site). Fallback statique sinon.
    // ─────────────────────────────────────────────────────────────────────────
    getCustomLists() {
        if (this._homeRawCache && this._homeRawCache.operatingList &&
                this._homeRawCache.operatingList.length > 0) {
            return this._buildDynamicSections(this._homeRawCache);
        }
        return MB_HOME_SECTIONS;
    }

    _buildDynamicSections(data) {
        var sections = [
            { id: "carousel",      name: "\uD83C\uDFAC \u00C0 la une", layout: "banner",   color: "#1CB7FF" },
            { id: "cat_all",       name: "All",                           layout: "category", color: "#2C3E50" },
            { id: "cat_action",    name: "Action",                        layout: "category", color: "#C0392B" },
            { id: "cat_comedy",    name: "Com\u00E9die",                  layout: "category", color: "#D4AC0D" },
            { id: "cat_animation", name: "Animation",                     layout: "category", color: "#8E44AD" },
            { id: "cat_adventure", name: "Aventure",                      layout: "category", color: "#1E8449" },
            { id: "cat_romance",   name: "Romance",                       layout: "category", color: "#E91E63" }
        ];
        var ops    = data.operatingList || [];
        var colors = ["#FF6F00","#1CB7FF","#1CB7FF","#FF6F00","#8E44AD","#00BCD4","#8E44AD",
                      "#1CB7FF","#1CB7FF","#E53935","#00897B","#E91E63","#E53935","#8E44AD",
                      "#1CB7FF","#E91E63","#FF6F00","#1CB7FF","#8E44AD","#FF6F00","#1CB7FF",
                      "#FF6F00","#1CB7FF","#1CB7FF","#E91E63","#1CB7FF","#1CB7FF","#FF6F00",
                      "#E53935","#E53935","#1CB7FF","#8E44AD","#8E44AD","#1CB7FF","#FF6F00",
                      "#8E44AD","#8E44AD","#E91E63","#1CB7FF","#1CB7FF","#E53935","#FF6F00"];
        var ranked = [18, 27];
        for (var i = 0; i < ops.length; i++) {
            var title  = ops[i].title || ops[i].name || ("Section " + i);
            var layout = (ranked.indexOf(i) >= 0) ? "ranked" : "spotlight";
            sections.push({ id: "op_" + i, name: title, layout: layout, color: colors[i % colors.length] });
        }
        sections.push({ id: "catalogue", name: "Catalogue", layout: "catalogue", color: "#7C4DFF" });
        return sections;
    }

    async getCustomList(listId, page) {
        var data = await this._fetchHomeRaw();
        var lang = this._prefLang();

        // ── Carousel : bannerList exact de l'API ─────────────
        if (listId === "carousel") {
            var banners = (data && data.bannerList) ? data.bannerList : [];
            var items   = [];
            for (var b = 0; b < banners.length; b++) {
                var bn  = banners[b];
                var sub = bn.subject || bn;
                if (Array.isArray(sub)) sub = sub[0] || bn;
                items.push(this._toItem(sub));
            }
            return { list: items, hasNextPage: false };
        }

        // ── Catégories ───────────────────────────────────────
        if (listId.indexOf("cat_") === 0) {
            var all  = await this._fetchHome();
            var catK = listId.slice(4);
            if (catK === "all") return this._page(all, page);
            var kwMap = {
                action:    ["action"],
                comedy:    ["comedy","comédie","comedie"],
                animation: ["animation","animated"],
                adventure: ["adventure","aventure"],
                romance:   ["romance","romantique"]
            };
            var kws = kwMap[catK] || [catK];
            var filtered = [];
            for (var i = 0; i < all.length; i++) {
                var g = ((all[i].genre || "") + " " + (all[i].title || "")).toLowerCase();
                for (var k = 0; k < kws.length; k++) {
                    if (g.indexOf(kws[k]) >= 0) { filtered.push(all[i]); break; }
                }
            }
            return this._page(filtered, page);
        }

        // ── Sections dynamiques : op_N → operatingList[N] ────
        // Le contenu est toujours lu en live depuis l'API.
        // Si le site change l'ordre ou ajoute des sections,
        // mettre à jour MB_HOME_SECTIONS suffit.
        if (listId.indexOf("op_") === 0) {
            var idx  = parseInt(listId.slice(3), 10);
            var ops  = (data && data.operatingList) ? data.operatingList : [];
            if (!isNaN(idx) && ops[idx]) {
                var subs = ops[idx].subjects || ops[idx].subjectList || [];
                var list = [];
                for (var j = 0; j < subs.length; j++) list.push(this._toItem(subs[j]));
                return { list: list, hasNextPage: false };
            }
            return { list: [], hasNextPage: false };
        }

        // ── Catalogue infini ──────────────────────────────────
        if (listId === "catalogue") {
            var res = await this._apiCatalog(page, "", "0", "", "", lang);
            if (res !== null) return res;
            if (lang !== "en") {
                res = await this._apiCatalog(page, "", "0", "", "", "en");
                if (res !== null) return res;
            }
            return this._page(await this._fetchHome(), page);
        }

        return { list: [], hasNextPage: false };
    }

    async getPopular(page) {
        var lang = this._prefLang();
        var res  = await this._apiCatalog(page, "", "0", "", "", lang);
        if (res !== null) return res;
        if (lang !== "en") {
            res = await this._apiCatalog(page, "", "0", "", "", "en");
            if (res !== null) return res;
        }
        return this._page(await this._fetchHome(), page);
    }

    async getLatestUpdates(page) {
        var lang = this._prefLang();
        var res  = await this._apiCatalog(page, "", "1", "", "", lang);
        if (res !== null) return res;
        if (lang !== "en") {
            res = await this._apiCatalog(page, "", "1", "", "", "en");
            if (res !== null) return res;
        }
        return this._page(this._sortLatest(await this._fetchHome()), page);
    }

    async getSuggestions(query) {
        var q = (query || "").trim();
        if (!q || q.length < 2) return [];
        try {
            var res = await this._apiSearch(q, 1, "", "", "", "", this._prefLang());
            if (!res || !res.list) return [];
            var out = [];
            for (var i = 0; i < res.list.length && i < 8; i++) {
                var nm = res.list[i].name || "";
                if (nm) out.push(nm);
            }
            return out;
        } catch (_) { return []; }
    }

    async search(query, page, filterList) {
        var lang    = this._prefLang();
        var filters = this._readFilters(filterList);
        var q       = (query || "").trim();

        if (q) {
            // ── Recherche API (toujours en premier) ──────────
            var res = await this._apiSearch(q, page, filters.typeVal, filters.sortVal, filters.genreVal, filters.countryVal, lang);
            if (res !== null) return res;
            if (lang !== "en") {
                res = await this._apiSearch(q, page, filters.typeVal, filters.sortVal, filters.genreVal, filters.countryVal, "en");
                if (res !== null) return res;
            }
            throw new Error("Recherche indisponible — impossible de joindre l'API MovieBox. Vérifiez votre connexion ou réessayez.");

        } else {
            // ── Browse sans mot-clé (catalogue filtré) ───────
            var cat = await this._apiCatalog(page, filters.typeVal, filters.sortVal, filters.genreVal, filters.countryVal, lang);
            if (cat !== null) return cat;
            if (lang !== "en") {
                cat = await this._apiCatalog(page, filters.typeVal, filters.sortVal, filters.genreVal, filters.countryVal, "en");
                if (cat !== null) return cat;
            }
            throw new Error("Catalogue indisponible — impossible de joindre l'API MovieBox. Vérifiez votre connexion ou réessayez.");
        }
    }

    // ── Détails d'un titre ────────────────────────────────────
    async getDetail(url) {
        var payload;
        try { payload = JSON.parse(url); } catch (_) { payload = {}; }
        var subjectId   = payload.subjectId   || "";
        var detailPath  = payload.detailPath  || "";
        var subjectType = payload.subjectType || 1;

        if (!subjectId && !detailPath) {
            return { name: "Unknown", imageUrl: "", description: "", genre: [], status: 0, chapters: [] };
        }

        var param = detailPath
            ? ("detailPath=" + encodeURIComponent(detailPath))
            : ("subjectId="  + encodeURIComponent(subjectId));

        var j = null;
        try {
            var res = await new Client().get(
                MB_API + "/wefeed-h5api-bff/detail?" + param,
                mbHeaders(this._prefLang(), detailPath)
            );
            try { j = JSON.parse(res.body); } catch (_) {}
        } catch (_) {}

        if (!j || j.code !== 0 || !j.data || !j.data.subject) {
            return { name: "Unknown", imageUrl: "", description: "", genre: [], status: 0, chapters: [] };
        }

        var s    = j.data.subject;
        var res2 = j.data.resource || {};
        var genres = [];
        var gparts = (s.genre || "").split(",");
        for (var i = 0; i < gparts.length; i++) { var gp = gparts[i].trim(); if (gp) genres.push(gp); }
        if (s.countryName) genres.push(s.countryName);

        var desc = s.description || "";
        if (s.imdbRatingValue && parseFloat(s.imdbRatingValue) > 0) {
            desc += "\n\n⭐ IMDb " + s.imdbRatingValue;
        }

        var realId   = s.subjectId  != null ? String(s.subjectId)  : subjectId;
        var realDp   = s.detailPath || detailPath || "";
        var realType = s.subjectType || subjectType;
        var seasons  = (res2.seasons) ? res2.seasons : [];
        var chapters = [], isMovie = (realType === 1) || !seasons.length;

        if (isMovie) {
            chapters.push({
                name:       "▶ Regarder",
                url:        JSON.stringify({ subjectId: realId, detailPath: realDp, se: 0, ep: 0 }),
                dateUpload: s.releaseDate || ""
            });
        } else {
            for (var si = 0; si < seasons.length; si++) {
                var season = seasons[si];
                var seNum  = season.se || (si + 1);
                var maxEp  = season.maxEp || 0;
                for (var ep = 1; ep <= maxEp; ep++) {
                    chapters.push({
                        name:       maxEp > 1 ? ("S" + seNum + " E" + ep) : (s.title || "Episode"),
                        url:        JSON.stringify({ subjectId: realId, detailPath: realDp, se: seNum, ep: ep }),
                        dateUpload: ""
                    });
                }
            }
        }
        return {
            name:        s.title || "Unknown",
            imageUrl:    this._cover(s),
            description: desc,
            genre:       genres,
            status:      isMovie ? 1 : 0,
            chapters:    chapters
        };
    }

    async _fetchPlay(subjectId, detailPath, se, ep, lang) {
        var url = MB_API + "/wefeed-h5api-bff/subject/play"
            + "?subjectId=" + encodeURIComponent(subjectId)
            + "&se=" + se + "&ep=" + ep
            + "&detailPath=" + encodeURIComponent(detailPath);
        try {
            var res = await new Client().get(url, mbHeaders(lang, detailPath));
            return JSON.parse(res.body);
        } catch (_) { return null; }
    }

    // ── Sous-titres bilingues ─────────────────────────────────
    _parseSubCues(text) {
        var norm = String(text || "").replace(/\r/g, ""), cues = [];
        var re = /(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})[^\n]*\n([\s\S]*?)(?=\n\s*\n|\n?\d+\s*\n\d{2}:\d{2}:\d{2}[,.]\d{3}|$)/g;
        var m;
        while ((m = re.exec(norm)) !== null) {
            var body = m[3].replace(/\n+$/, "").trim();
            if (body) cues.push({ start: m[1].replace(".", ","), end: m[2].replace(".", ","), text: body });
        }
        return cues;
    }
    _cueMs(t) {
        var p = t.split(/[:,]/);
        return (+p[0]) * 3600000 + (+p[1]) * 60000 + (+p[2]) * 1000 + (+p[3]);
    }
    _mergeBilingual(primaryText, secondaryText) {
        var a = this._parseSubCues(primaryText), b = this._parseSubCues(secondaryText);
        if (!a.length) return null;
        var out = [];
        for (var i = 0; i < a.length; i++) {
            var sm = this._cueMs(a[i].start), best = null, bd = 1500;
            for (var k = 0; k < b.length; k++) {
                var d = Math.abs(this._cueMs(b[k].start) - sm);
                if (d < bd) { bd = d; best = b[k]; }
            }
            out.push((i + 1) + "\n" + a[i].start + " --> " + a[i].end + "\n" + a[i].text + (best ? "\n" + best.text : "") + "\n");
        }
        return out.join("\n");
    }

    // ── Lecture vidéo ─────────────────────────────────────────
    async getVideoList(url) {
        var payload;
        try { payload = JSON.parse(url); } catch (_) { throw new Error("URL invalide"); }
        var subjectId  = payload.subjectId  || "";
        var detailPath = payload.detailPath || "";
        var se = (payload.se !== undefined) ? payload.se : 0;
        var ep = (payload.ep !== undefined) ? payload.ep : 0;
        if (!subjectId) throw new Error("subjectId manquant");

        var lang = this._prefLang();
        var j    = await this._fetchPlay(subjectId, detailPath, se, ep, lang);
        if ((!j || j.code !== 0 || !j.data || !j.data.hasResource) && lang !== "en") {
            var retry = await this._fetchPlay(subjectId, detailPath, se, ep, "en");
            if (retry && retry.code === 0 && retry.data && retry.data.hasResource) j = retry;
        }
        if (!j || j.code !== 0 || !j.data) {
            if (j && j.code === 403) throw new Error("Région bloquée — utilise un VPN.");
            if (j && j.code === 401) throw new Error("Connexion requise.");
            throw new Error("Pas de flux disponible. (code=" + (j ? j.code : "?") + ")");
        }
        var data = j.data;
        if (!data.hasResource) throw new Error("Épisode non disponible pour le moment.");

        var refHdrs   = { "Referer": detailPath ? (MB_ORIG + "/movies/" + detailPath) : MB_ORIG + "/" };
        var prefSub   = this._prefSub();
        var prefDub   = this._prefDub();
        var bilingual = this._prefBilingual();
        var prefSub2  = this._prefBilingual2();
        var subtitles = [];

        try {
            var stream = (data.hls && data.hls[0]) ? data.hls[0] : (data.streams && data.streams[0] ? data.streams[0] : null);
            if (stream && stream.id) {
                var fmt    = (data.hls && data.hls.length) ? "HLS" : "MP4";
                var capUrl = MB_API + "/wefeed-h5api-bff/subject/caption"
                    + "?format=" + fmt + "&id=" + stream.id
                    + "&subjectId=" + encodeURIComponent(subjectId)
                    + "&detailPath=" + encodeURIComponent(detailPath);
                var cRes = await new Client().get(capUrl, mbHeaders(lang, detailPath));
                var cj; try { cj = JSON.parse(cRes.body); } catch (_) {}
                if (cj && cj.code === 0 && cj.data && cj.data.captions) {
                    var caps = cj.data.captions;
                    for (var ci = 0; ci < caps.length; ci++) {
                        var c = caps[ci];
                        if (c && c.url) subtitles.push({ file: c.url, label: c.lanName || c.lan || "Sub", lan: (c.lan || "").toLowerCase() });
                    }
                    if (prefSub) {
                        for (var si = 0; si < subtitles.length; si++) {
                            if ((subtitles[si].lan || subtitles[si].label || "").toLowerCase().indexOf(prefSub) >= 0) {
                                subtitles.unshift(subtitles.splice(si, 1)[0]); break;
                            }
                        }
                    }
                    if (bilingual && subtitles.length >= 2) {
                        var findL = function(l) {
                            for (var x = 0; x < subtitles.length; x++) {
                                if ((subtitles[x].lan || subtitles[x].label || "").toLowerCase().indexOf(l) >= 0) return subtitles[x];
                            }
                            return null;
                        };
                        var tA = findL(prefSub) || subtitles[0];
                        var tB = findL(prefSub2) || (subtitles[1] !== tA ? subtitles[1] : null);
                        if (tA && tB && tA !== tB) {
                            try {
                                var ta = await new Client().get(tA.file, refHdrs);
                                var tb = await new Client().get(tB.file, refHdrs);
                                var mg = this._mergeBilingual(ta.body, tb.body);
                                if (mg) {
                                    var du = "data:text/plain;charset=utf-8;base64," +
                                        (typeof btoa === "function" ? btoa(unescape(encodeURIComponent(mg))) : Buffer.from(mg, "utf-8").toString("base64"));
                                    subtitles.unshift({ file: du, label: "🈴 Bilingue (" + (tA.label || "") + " + " + (tB.label || "") + ")" });
                                }
                            } catch (_) {}
                        }
                    }
                }
            }
        } catch (_) {}

        var out = [];
        var refH = refHdrs;
        var subs = subtitles;

        function reorderDub(list) {
            if (!prefDub || !list || list.length < 2) return list;
            for (var xi = 0; xi < list.length; xi++) {
                if ((list[xi].lan || list[xi].lanName || list[xi].audioLan || "").toLowerCase().indexOf(prefDub) >= 0) {
                    list.unshift(list.splice(xi, 1)[0]); break;
                }
            }
            return list;
        }

        if (data.hls && data.hls.length) {
            var hl = reorderDub(data.hls);
            for (var hi = 0; hi < hl.length; hi++) {
                var h = hl[hi];
                if (h && h.url) out.push({ url: h.url, originalUrl: h.url, quality: h.resolution || h.quality || h.lanName || ("HLS " + (hi + 1)), headers: refH, subtitles: subs });
            }
        }
        if (data.streams && data.streams.length) {
            var st = reorderDub(data.streams);
            for (var sti = 0; sti < st.length; sti++) {
                var s2 = st[sti];
                if (s2 && s2.url) out.push({ url: s2.url, originalUrl: s2.url, quality: s2.resolution || s2.quality || s2.lanName || ("MP4 " + (sti + 1)), headers: refH, subtitles: subs });
            }
        }
        if (!out.length) {
            if (data.url)    out.push({ url: data.url,    originalUrl: data.url,    quality: "Auto", headers: refH, subtitles: subs });
            if (data.m3u8Url)out.push({ url: data.m3u8Url,originalUrl: data.m3u8Url,quality: "HLS",  headers: refH, subtitles: subs });
        }
        if (!out.length) throw new Error("Aucun flux trouvé pour cet épisode.");
        return out;
    }

    // ── Filtres (SYNC — méthode correcte pour Watchtower) ────
    getFilterList() {
        return [
            {
                type_name: "SelectFilter",
                name: "Type",
                state: 0,
                values: [
                    { type_name: "SelectOption", name: "Tout",      value: "" },
                    { type_name: "SelectOption", name: "Film",      value: "1" },
                    { type_name: "SelectOption", name: "Série",     value: "2" },
                    { type_name: "SelectOption", name: "Anime",     value: "5" },
                    { type_name: "SelectOption", name: "Animation", value: "4" }
                ]
            },
            {
                type_name: "SelectFilter",
                name: "Genre",
                state: 0,
                values: [
                    { type_name: "SelectOption", name: "Tous",         value: "" },
                    { type_name: "SelectOption", name: "Action",       value: "Action" },
                    { type_name: "SelectOption", name: "Aventure",     value: "Adventure" },
                    { type_name: "SelectOption", name: "Animation",    value: "Animation" },
                    { type_name: "SelectOption", name: "Biographie",   value: "Biography" },
                    { type_name: "SelectOption", name: "Comédie",      value: "Comedy" },
                    { type_name: "SelectOption", name: "Crime",        value: "Crime" },
                    { type_name: "SelectOption", name: "Documentaire", value: "Documentary" },
                    { type_name: "SelectOption", name: "Drame",        value: "Drama" },
                    { type_name: "SelectOption", name: "Fantastique",  value: "Fantasy" },
                    { type_name: "SelectOption", name: "Histoire",     value: "History" },
                    { type_name: "SelectOption", name: "Horreur",      value: "Horror" },
                    { type_name: "SelectOption", name: "Musique",      value: "Music" },
                    { type_name: "SelectOption", name: "Mystère",      value: "Mystery" },
                    { type_name: "SelectOption", name: "Romance",      value: "Romance" },
                    { type_name: "SelectOption", name: "Sci-Fi",       value: "Sci-Fi" },
                    { type_name: "SelectOption", name: "Sport",        value: "Sport" },
                    { type_name: "SelectOption", name: "Thriller",     value: "Thriller" },
                    { type_name: "SelectOption", name: "Guerre",       value: "War" },
                    { type_name: "SelectOption", name: "Western",      value: "Western" }
                ]
            },
            {
                type_name: "SelectFilter",
                name: "Pays",
                state: 0,
                values: [
                    { type_name: "SelectOption", name: "Tous",      value: "" },
                    { type_name: "SelectOption", name: "US",        value: "US" },
                    { type_name: "SelectOption", name: "Corée",     value: "KR" },
                    { type_name: "SelectOption", name: "Japon",     value: "JP" },
                    { type_name: "SelectOption", name: "Chine",     value: "CN" },
                    { type_name: "SelectOption", name: "France",    value: "FR" },
                    { type_name: "SelectOption", name: "UK",        value: "GB" },
                    { type_name: "SelectOption", name: "Inde",      value: "IN" },
                    { type_name: "SelectOption", name: "Italie",    value: "IT" },
                    { type_name: "SelectOption", name: "Allemagne", value: "DE" },
                    { type_name: "SelectOption", name: "Espagne",   value: "ES" },
                    { type_name: "SelectOption", name: "Mexique",   value: "MX" },
                    { type_name: "SelectOption", name: "Thaïlande", value: "TH" }
                ]
            },
            {
                type_name: "SelectFilter",
                name: "Tri",
                state: 0,
                values: [
                    { type_name: "SelectOption", name: "Populaire",  value: "0" },
                    { type_name: "SelectOption", name: "Récent",     value: "1" },
                    { type_name: "SelectOption", name: "Mieux noté", value: "2" }
                ]
            }
        ];
    }

    setupPreferences() {
        return [
            {
                key: "mb_content_lang",
                listPreference: {
                    title:      "Langue de l'interface / métadonnées",
                    summary:    "Langue utilisée pour les titres, résumés et disponibilité des flux",
                    valueIndex: 1,
                    entries:    ["English", "Français", "Español", "Português", "العربية", "中文", "日本語", "한국어"],
                    entryValues:["en",      "fr",       "es",      "pt",        "ar",      "zh",   "ja",      "ko"]
                }
            },
            {
                key: "mb_sub",
                listPreference: {
                    title:      "Langue des sous-titres",
                    summary:    "Déplacée en tête de liste si disponible",
                    valueIndex: 0,
                    entries:    ["English", "Français", "العربية", "Português", "Indonesian", "中文", "Русский", "日本語", "한국어", "Español"],
                    entryValues:["en",      "fr",       "ar",      "pt",        "id",         "zh",   "ru",      "ja",      "ko",      "es"]
                }
            },
            {
                key: "mb_dub",
                listPreference: {
                    title:      "Langue du doublage (audio)",
                    summary:    "Utilisée quand plusieurs pistes audio existent",
                    valueIndex: 0,
                    entries:    ["Automatique", "English", "Français", "العربية", "Português", "中文", "日本語", "한국어", "Español"],
                    entryValues:["",            "en",      "fr",       "ar",       "pt",        "zh",   "ja",      "ko",      "es"]
                }
            },
            {
                key: "mb_bilingual",
                switchPreference: {
                    title:   "Sous-titres bilingues",
                    summary: "Affiche 2 langues de sous-titres sur une seule piste",
                    value:   false
                }
            },
            {
                key: "mb_bilingual_second",
                listPreference: {
                    title:      "Deuxième langue (mode bilingue)",
                    summary:    "Combinée avec la langue de sous-titres principale",
                    valueIndex: 0,
                    entries:    ["English", "Français", "العربية", "Português", "Indonesian", "中文", "Русский", "日本語", "한국어", "Español"],
                    entryValues:["en",      "fr",       "ar",      "pt",        "id",         "zh",   "ru",      "ja",      "ko",      "es"]
                }
            }
        ];
    }
}
