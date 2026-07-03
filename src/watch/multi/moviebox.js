const watchtowerSources = [{
    "name": "MovieBox",
    "lang": "multi",
    "baseUrl": "https://themoviebox.xyz",
    "apiUrl": "https://h5-api.aoneroom.com",
    "iconUrl": "https://h5-static.aoneroom.com/oneroomProject/icon/moviebox-official.jpg",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "3.5.0",
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
    "notes": "MovieBox — Films, Séries, Anime & Animation. API aoneroom. Sous-titres multi-langues + doublage + mode bilingue. Recherche réelle via API (plus de 0 résultat). Filtres complets : Type, Genre, Pays, Tri."
}];

// ══════════════════════════════════════════════════════════════
//  MovieBox  v3.5.0
//  Fixes v3.5.0:
//   - SEARCH : utilise le vrai endpoint /search de l'API
//     au lieu de filtrer le cache de la home (→ plus de 0 résultats)
//   - BROWSE sans mot-clé : utilise /catalog avec pagination réelle
//   - Filtres complets : Type, Genre (18 genres), Pays, Tri
//   - Chaque filtre est correctement transmis à l'API
//   - Retry automatique si la recherche échoue avec la langue courante
//   - getPopular et getLatestUpdates utilisent aussi /catalog
//     pour avoir une vraie pagination (pas seulement les ~200 items home)
// ══════════════════════════════════════════════════════════════

var MB_API  = "https://h5-api.aoneroom.com";
var MB_ORIG = "https://themoviebox.xyz";
var MB_PER  = 30;
var MB_HOME_TTL = 5 * 60 * 1000; // 5 minutes

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

function mbHeaders(langOverride, detailPath) {
    var referer = (detailPath) ? (MB_ORIG + "/movies/" + detailPath) : (MB_ORIG + "/");
    return {
        "Accept":          "application/json",
        "Origin":          MB_ORIG,
        "Referer":         referer,
        "User-Agent":      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
        "X-Client-Info":   "{\"timezone\":\"UTC\"}",
        "X-Client-Token":  mbClientToken(),
        "X-Request-Lang":  langOverride || "fr"
    };
}

// ── Genre / catégorie helpers (basés sur des champs stables de l'API) ──
function mbGenreHas(s, keywords) {
    var g = ((s.genre || "") + " " + (s.title || "")).toLowerCase();
    for (var i = 0; i < keywords.length; i++) {
        if (g.indexOf(keywords[i]) >= 0) return true;
    }
    return false;
}
function mbIsKorean(s) {
    var c = (s.countryName || "").toLowerCase();
    return c.indexOf("cor") >= 0 || c.indexOf("korea") >= 0;
}

var MB_CATS = {
    action:  { keywords: ["action"] },
    horror:  { keywords: ["horror", "horreur", "terreur", "épouvante"] },
    comedy:  { keywords: ["comedy", "comédie", "comedie"] },
    romance: { keywords: ["romance", "romantique"] },
    drama:   { keywords: ["drama", "drame"] }
};

class DefaultExtension extends MProvider {

    // ── Accueil : cache 5 min pour éviter des résultats instables ──
    async _fetchHome() {
        var now = Date.now();
        if (this._homeCache && (now - (this._homeCacheAt || 0)) < MB_HOME_TTL) {
            return this._homeCache;
        }
        try {
            var res = await new Client().get(MB_API + "/wefeed-h5api-bff/home", mbHeaders(this._prefLang()));
            var j;
            try { j = JSON.parse(res.body); } catch (_) { return this._homeCache || []; }
            if (!j || j.code !== 0 || !j.data || !j.data.operatingList) return this._homeCache || [];
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
            this._homeCache = all;
            this._homeCacheAt = now;
            return all;
        } catch (_) {
            return this._homeCache || [];
        }
    }

    // ── Recherche réelle via l'API (remplace le filtrage du cache home) ──
    // Retourne { list, hasNextPage } directement.
    async _apiSearch(query, page, typeVal, sortVal, genreVal, countryVal, lang) {
        var p    = (page && page > 0) ? page : 1;
        var hdrs = mbHeaders(lang);
        var url  = MB_API + "/wefeed-h5api-bff/search"
            + "?keyword=" + encodeURIComponent(query || "")
            + "&pageNum=" + p
            + "&pageSize=" + MB_PER;
        if (typeVal)    url += "&subjectType=" + encodeURIComponent(typeVal);
        if (sortVal)    url += "&sortType="    + encodeURIComponent(sortVal);
        if (genreVal)   url += "&genre="       + encodeURIComponent(genreVal);
        if (countryVal) url += "&country="     + encodeURIComponent(countryVal);
        try {
            var res = await new Client().get(url, hdrs);
            var j; try { j = JSON.parse(res.body); } catch (_) { return null; }
            if (!j || j.code !== 0 || !j.data) return null;
            var d    = j.data;
            var items = d.subjects || d.list || d.data || [];
            var total = d.total || d.totalCount || 0;
            var list  = [];
            for (var i = 0; i < items.length; i++) list.push(this._toItem(items[i]));
            var hasNext = (total > 0)
                ? (p * MB_PER < total)
                : (items.length >= MB_PER);
            return { list: list, hasNextPage: hasNext };
        } catch (_) {
            return null;
        }
    }

    // ── Catalogue paginé (browse sans mot-clé) ──
    async _apiCatalog(page, typeVal, sortVal, genreVal, countryVal, lang) {
        var p    = (page && page > 0) ? page : 1;
        var hdrs = mbHeaders(lang);
        var url  = MB_API + "/wefeed-h5api-bff/catalog"
            + "?pageNum=" + p
            + "&pageSize=" + MB_PER;
        if (typeVal)    url += "&subjectType=" + encodeURIComponent(typeVal);
        if (sortVal)    url += "&sortType="    + encodeURIComponent(sortVal);
        if (genreVal)   url += "&genre="       + encodeURIComponent(genreVal);
        if (countryVal) url += "&country="     + encodeURIComponent(countryVal);
        try {
            var res = await new Client().get(url, hdrs);
            var j; try { j = JSON.parse(res.body); } catch (_) { return null; }
            if (!j || j.code !== 0 || !j.data) return null;
            var d     = j.data;
            var items = d.subjects || d.list || d.data || [];
            var total = d.total || d.totalCount || 0;
            var list  = [];
            for (var i = 0; i < items.length; i++) list.push(this._toItem(items[i]));
            var hasNext = (total > 0)
                ? (p * MB_PER < total)
                : (items.length >= MB_PER);
            return { list: list, hasNextPage: hasNext };
        } catch (_) {
            return null;
        }
    }

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
    _prefSub()        { return this._pref("mb_sub", "en"); }
    _prefDub()        { return this._pref("mb_dub", ""); }
    _prefBilingual()  { return this._pref("mb_bilingual", "false") === "true"; }
    _prefBilingual2() { return this._pref("mb_bilingual_second", "en"); }

    // ── Rendu des items ──
    _cover(s) {
        if (s.cover && s.cover.url) return s.cover.url;
        if (s.horizontalCover) return s.horizontalCover;
        if (s.verticalCover)   return s.verticalCover;
        return "";
    }
    _toItem(s) {
        return {
            name:        s.title || s.subjectName || "Unknown",
            imageUrl:    this._cover(s),
            link:        JSON.stringify({
                subjectId:   String(s.subjectId || ""),
                detailPath:  s.detailPath || "",
                subjectType: s.subjectType || 1
            }),
            description: s.description || ""
        };
    }
    _page(items, page) {
        var p     = (page && page > 0) ? page : 1;
        var start = (p - 1) * MB_PER;
        var end   = p * MB_PER;
        var slice = [];
        for (var i = start; i < end && i < items.length; i++) slice.push(this._toItem(items[i]));
        return { list: slice, hasNextPage: end < items.length };
    }
    _filterByType(all, typeStr) {
        if (!typeStr) return all;
        var t = parseInt(typeStr, 10);
        var out = [];
        for (var i = 0; i < all.length; i++) {
            if (all[i].subjectType === t) out.push(all[i]);
        }
        return out;
    }
    _sortLatest(all) {
        var dated = [];
        var undated = [];
        for (var i = 0; i < all.length; i++) {
            if (all[i].releaseDate) dated.push(all[i]); else undated.push(all[i]);
        }
        dated.sort(function(a, b) {
            return (b.releaseDate > a.releaseDate) ? 1 : (b.releaseDate < a.releaseDate ? -1 : 0);
        });
        undated.reverse();
        return dated.concat(undated);
    }
    _sortRating(all) {
        var withScore = all.filter(function(s) { return s.imdbRatingValue && parseFloat(s.imdbRatingValue) > 0; });
        withScore.sort(function(a, b) { return parseFloat(b.imdbRatingValue) - parseFloat(a.imdbRatingValue); });
        return withScore;
    }
    _byCategory(all, catKey) {
        var def = MB_CATS[catKey];
        if (!def) return [];
        var out = [];
        for (var i = 0; i < all.length; i++) {
            if (mbGenreHas(all[i], def.keywords)) out.push(all[i]);
        }
        return out;
    }

    // ── Sections déclaratives de l'accueil ──────────────────────────
    getCustomLists() {
        return [
            { id: "all",      name: "🎭 Tout",         layout: "spotlight", color: "#7C4DFF", icon: "apps",         seeAll: "popular" },
            { id: "latest",   name: "🆕 Récents",       layout: "spotlight", color: "#00BCD4", icon: "fiber_new",    seeAll: "latest" },
            { id: "topRated", name: "🏆 Mieux notés",   layout: "ranked",    color: "#FFB300", icon: "trending_up",  seeAll: false },
            { id: "movies",   name: "🎬 Films",         layout: "grid",      color: "#E53935", icon: "movie",        seeAll: true },
            { id: "series",   name: "📺 Séries",        layout: "grid",      color: "#3949AB", icon: "tv",           seeAll: true },
            { id: "anime",    name: "⛩️ Anime",         layout: "grid",      color: "#8E24AA", icon: "animation",    seeAll: true },
            { id: "animation",name: "🎨 Animation",     layout: "compact",   color: "#9C27B0", icon: "animation",    seeAll: true },
            { id: "action",   name: "💥 Action",        layout: "compact",   color: "#F4511E", icon: "local_fire_department", seeAll: false },
            { id: "horror",   name: "👻 Horreur",       layout: "compact",   color: "#455A64", icon: "dark_mode",    seeAll: false },
            { id: "comedy",   name: "😂 Comédie",       layout: "compact",   color: "#FDD835", icon: "sentiment_very_satisfied", seeAll: false },
            { id: "romance",  name: "💞 Romance",       layout: "compact",   color: "#EC407A", icon: "favorite",     seeAll: false },
            { id: "drama",    name: "🎭 Drame",         layout: "compact",   color: "#6D4C41", icon: "theaters",     seeAll: false },
            { id: "kdrama",   name: "🇰🇷 K-Drama",       layout: "compact",   color: "#00897B", icon: "language",     seeAll: false }
        ];
    }

    async getCustomList(listId, page) {
        var all = await this._fetchHome();

        if (listId === "movies")    return this._page(this._filterByType(all, "1"), page);
        if (listId === "series")    return this._page(this._filterByType(all, "2"), page);
        if (listId === "anime")     return this._page(this._filterByType(all, "5"), page);
        if (listId === "animation") return this._page(this._filterByType(all, "4"), page);
        if (listId === "latest")    return this._page(this._sortLatest(all), page);
        if (listId === "topRated")  return this._page(this._sortRating(all).slice(0, 20), 1);
        if (listId === "kdrama") {
            var kd = [];
            for (var i = 0; i < all.length; i++) {
                if (all[i].subjectType === 2 && mbIsKorean(all[i])) kd.push(all[i]);
            }
            return this._page(kd, 1);
        }
        if (MB_CATS[listId]) return this._page(this._byCategory(all, listId), 1);

        return this._page(all, page);
    }

    async getPopular(page) {
        // Utilise l'API catalog pour une vraie pagination (pas limité à la home)
        var lang = this._prefLang();
        var res  = await this._apiCatalog(page, "", "0", "", "", lang);
        if (res && res.list && res.list.length > 0) return res;
        // Fallback : home cache
        return this._page(await this._fetchHome(), page);
    }

    async getLatestUpdates(page) {
        var lang = this._prefLang();
        var res  = await this._apiCatalog(page, "", "1", "", "", lang);
        if (res && res.list && res.list.length > 0) return res;
        // Fallback : home cache trié
        var all = await this._fetchHome();
        return this._page(this._sortLatest(all), page);
    }

    // ── Lecture des filtres depuis filterList ──
    _readFilters(filterList) {
        var typeVal    = "";
        var sortVal    = "";
        var genreVal   = "";
        var countryVal = "";
        try {
            if (filterList && filterList.length) {
                for (var f = 0; f < filterList.length; f++) {
                    var flt = filterList[f];
                    if (!flt || flt.state === undefined || flt.state === null) continue;
                    var st = flt.state;
                    if (flt.name === "Type") {
                        var typeOpts = ["", "1", "2", "5", "4"];
                        typeVal = (st > 0 && st < typeOpts.length) ? typeOpts[st] : "";
                    } else if (flt.name === "Tri") {
                        var sortOpts = ["0", "1", "2"];
                        sortVal = (st >= 0 && st < sortOpts.length) ? sortOpts[st] : "0";
                    } else if (flt.name === "Genre") {
                        var genreOpts = [
                            "", "Action", "Adventure", "Animation", "Biography",
                            "Comedy", "Crime", "Documentary", "Drama", "Fantasy",
                            "History", "Horror", "Music", "Mystery", "Romance",
                            "Sci-Fi", "Sport", "Thriller", "War", "Western"
                        ];
                        genreVal = (st > 0 && st < genreOpts.length) ? genreOpts[st] : "";
                    } else if (flt.name === "Pays") {
                        var countryOpts = [
                            "", "US", "KR", "JP", "CN", "FR", "GB", "IN", "IT", "DE", "ES", "MX", "TH"
                        ];
                        countryVal = (st > 0 && st < countryOpts.length) ? countryOpts[st] : "";
                    }
                }
            }
        } catch (_) {}
        return { typeVal: typeVal, sortVal: sortVal, genreVal: genreVal, countryVal: countryVal };
    }

    async search(query, page, filterList) {
        var lang    = this._prefLang();
        var filters = this._readFilters(filterList);
        var q       = (query || "").trim();

        if (q) {
            // ── Recherche réelle via API ──
            var res = await this._apiSearch(q, page, filters.typeVal, filters.sortVal, filters.genreVal, filters.countryVal, lang);
            if (res && res.list && res.list.length > 0) return res;

            // Retry avec "en" si pas de résultat dans la langue courante
            if (lang !== "en") {
                res = await this._apiSearch(q, page, filters.typeVal, filters.sortVal, filters.genreVal, filters.countryVal, "en");
                if (res && res.list && res.list.length > 0) return res;
            }

            // Dernier recours : recherche locale dans le cache home
            var all     = await this._fetchHome();
            var typed   = this._filterByType(all, filters.typeVal);
            var ql      = q.toLowerCase();
            var matched = [];
            for (var i = 0; i < typed.length; i++) {
                var s = typed[i];
                var t = (s.title || s.subjectName || "").toLowerCase();
                var g = (s.genre || "").toLowerCase();
                if (t.indexOf(ql) >= 0 || g.indexOf(ql) >= 0) matched.push(s);
            }
            if (filters.sortVal === "1") matched = this._sortLatest(matched);
            else if (filters.sortVal === "2") matched = this._sortRating(matched);
            return this._page(matched, page);

        } else {
            // ── Browse sans mot-clé : catalogue paginé ──
            var catRes = await this._apiCatalog(page, filters.typeVal, filters.sortVal, filters.genreVal, filters.countryVal, lang);
            if (catRes && catRes.list && catRes.list.length > 0) return catRes;

            // Fallback : home cache avec filtres locaux
            var home    = await this._fetchHome();
            var filtered = this._filterByType(home, filters.typeVal);
            if (filters.sortVal === "1") filtered = this._sortLatest(filtered);
            else if (filters.sortVal === "2") filtered = this._sortRating(filtered);
            return this._page(filtered, page);
        }
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
            var res = await new Client().get(MB_API + "/wefeed-h5api-bff/detail?" + param, mbHeaders(this._prefLang(), detailPath));
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
            // ✅ Ordre croissant — S1 E1 en premier, dernier épisode à la fin
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
        var playUrl = MB_API + "/wefeed-h5api-bff/subject/play"
            + "?subjectId=" + encodeURIComponent(subjectId)
            + "&se=" + se
            + "&ep=" + ep
            + "&detailPath=" + encodeURIComponent(detailPath);
        try {
            var res = await new Client().get(playUrl, mbHeaders(lang, detailPath));
            return JSON.parse(res.body);
        } catch (_) {
            return null;
        }
    }

    // ── Sous-titres bilingues : fusion de deux pistes SRT/VTT ──
    _parseSubCues(text) {
        var norm = String(text || "").replace(/\r/g, "");
        var cues = [];
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
        var a = this._parseSubCues(primaryText);
        var b = this._parseSubCues(secondaryText);
        if (!a.length) return null;
        var out = [];
        for (var i = 0; i < a.length; i++) {
            var startMs = this._cueMs(a[i].start);
            var best = null, bestDiff = 1500;
            for (var k = 0; k < b.length; k++) {
                var diff = Math.abs(this._cueMs(b[k].start) - startMs);
                if (diff < bestDiff) { bestDiff = diff; best = b[k]; }
            }
            var text = a[i].text + (best ? ("\n" + best.text) : "");
            out.push((i + 1) + "\n" + a[i].start + " --> " + a[i].end + "\n" + text + "\n");
        }
        return out.join("\n");
    }

    async getVideoList(url) {
        var payload;
        try { payload = JSON.parse(url); } catch (_) { throw new Error("URL invalide"); }

        var subjectId  = payload.subjectId  || "";
        var detailPath = payload.detailPath || "";
        var se = (payload.se !== undefined) ? payload.se : 0;
        var ep = (payload.ep !== undefined) ? payload.ep : 0;
        if (!subjectId) throw new Error("subjectId manquant");

        var lang = this._prefLang();
        var j = await this._fetchPlay(subjectId, detailPath, se, ep, lang);

        // Retry défensif : certains titres n'ont de ressource que sous
        // un autre code langue (ex. dispo en "en" mais pas en "fr").
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
        if (!data.hasResource) {
            throw new Error("Épisode non disponible pour le moment. Réessaie plus tard.");
        }

        var refHdrs = { "Referer": detailPath ? (MB_ORIG + "/movies/" + detailPath) : (MB_ORIG + "/") };

        var prefSub  = this._prefSub();
        var prefDub  = this._prefDub();
        var bilingual = this._prefBilingual();
        var prefSub2  = this._prefBilingual2();

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
                var cRes = await new Client().get(capUrl, mbHeaders(lang, detailPath));
                var cj = null;
                try { cj = JSON.parse(cRes.body); } catch (_) {}
                if (cj && cj.code === 0 && cj.data && cj.data.captions) {
                    var caps = cj.data.captions;
                    for (var ci = 0; ci < caps.length; ci++) {
                        var c = caps[ci];
                        if (c && c.url) subtitles.push({ file: c.url, label: c.lanName || c.lan || "Sub", lan: (c.lan || "").toLowerCase() });
                    }
                    if (prefSub) {
                        for (var si2 = 0; si2 < subtitles.length; si2++) {
                            if ((subtitles[si2].lan || subtitles[si2].label || "").toLowerCase().indexOf(prefSub) >= 0) {
                                var pref = subtitles.splice(si2, 1)[0];
                                subtitles.unshift(pref);
                                break;
                            }
                        }
                    }

                    // ── Mode bilingue : fusionne 2 pistes en une seule ──
                    if (bilingual && subtitles.length >= 2) {
                        var findLan = function(lan) {
                            for (var x = 0; x < subtitles.length; x++) {
                                if ((subtitles[x].lan || subtitles[x].label || "").toLowerCase().indexOf(lan) >= 0) return subtitles[x];
                            }
                            return null;
                        };
                        var trackA = findLan(prefSub) || subtitles[0];
                        var trackB = findLan(prefSub2) || (subtitles[1] !== trackA ? subtitles[1] : null);
                        if (trackA && trackB && trackA !== trackB) {
                            try {
                                var ta = await new Client().get(trackA.file, refHdrs);
                                var tb = await new Client().get(trackB.file, refHdrs);
                                var merged = this._mergeBilingual(ta.body, tb.body);
                                if (merged) {
                                    var dataUri = "data:text/plain;charset=utf-8;base64," +
                                        (typeof btoa === "function" ? btoa(unescape(encodeURIComponent(merged))) : Buffer.from(merged, "utf-8").toString("base64"));
                                    subtitles.unshift({ file: dataUri, label: "🈴 Bilingue (" + (trackA.label || "") + " + " + (trackB.label || "") + ")" });
                                }
                            } catch (_) {}
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

        function reorderByDub(list) {
            if (!prefDub || !list || list.length < 2) return list;
            var idx = -1;
            for (var i = 0; i < list.length; i++) {
                var lanField = (list[i].lan || list[i].lanName || list[i].audioLan || "").toLowerCase();
                if (lanField && lanField.indexOf(prefDub) >= 0) { idx = i; break; }
            }
            if (idx > 0) {
                var picked = list.splice(idx, 1)[0];
                list.unshift(picked);
            }
            return list;
        }

        if (data.hls && data.hls.length) {
            var hlsList = reorderByDub(data.hls.slice()).sort(function(a, b) {
                return (+b.resolutions || 0) - (+a.resolutions || 0);
            });
            for (var hi = 0; hi < hlsList.length; hi++) {
                var h = hlsList[hi];
                pushStream(h, h.resolutions ? "HLS " + h.resolutions + "p" : "HLS Auto");
            }
        }
        if (data.streams && data.streams.length) {
            var mp4List = reorderByDub(data.streams.slice()).sort(function(a, b) {
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
        return [
            {
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
            },
            {
                type_name: "SelectFilter",
                name:      "Genre",
                state:     0,
                values: [
                    { type_name: "SelectOption", name: "Tous",          value: "" },
                    { type_name: "SelectOption", name: "Action",        value: "Action" },
                    { type_name: "SelectOption", name: "Aventure",      value: "Adventure" },
                    { type_name: "SelectOption", name: "Animation",     value: "Animation" },
                    { type_name: "SelectOption", name: "Biographie",    value: "Biography" },
                    { type_name: "SelectOption", name: "Comédie",       value: "Comedy" },
                    { type_name: "SelectOption", name: "Crime",         value: "Crime" },
                    { type_name: "SelectOption", name: "Documentaire",  value: "Documentary" },
                    { type_name: "SelectOption", name: "Drame",         value: "Drama" },
                    { type_name: "SelectOption", name: "Fantastique",   value: "Fantasy" },
                    { type_name: "SelectOption", name: "Histoire",      value: "History" },
                    { type_name: "SelectOption", name: "Horreur",       value: "Horror" },
                    { type_name: "SelectOption", name: "Musique",       value: "Music" },
                    { type_name: "SelectOption", name: "Mystère",       value: "Mystery" },
                    { type_name: "SelectOption", name: "Romance",       value: "Romance" },
                    { type_name: "SelectOption", name: "Sci-Fi",        value: "Sci-Fi" },
                    { type_name: "SelectOption", name: "Sport",         value: "Sport" },
                    { type_name: "SelectOption", name: "Thriller",      value: "Thriller" },
                    { type_name: "SelectOption", name: "Guerre",        value: "War" },
                    { type_name: "SelectOption", name: "Western",       value: "Western" }
                ]
            },
            {
                type_name: "SelectFilter",
                name:      "Pays",
                state:     0,
                values: [
                    { type_name: "SelectOption", name: "Tous",          value: "" },
                    { type_name: "SelectOption", name: "🇺🇸 USA",        value: "US" },
                    { type_name: "SelectOption", name: "🇰🇷 Corée",      value: "KR" },
                    { type_name: "SelectOption", name: "🇯🇵 Japon",      value: "JP" },
                    { type_name: "SelectOption", name: "🇨🇳 Chine",      value: "CN" },
                    { type_name: "SelectOption", name: "🇫🇷 France",     value: "FR" },
                    { type_name: "SelectOption", name: "🇬🇧 UK",         value: "GB" },
                    { type_name: "SelectOption", name: "🇮🇳 Inde",       value: "IN" },
                    { type_name: "SelectOption", name: "🇮🇹 Italie",     value: "IT" },
                    { type_name: "SelectOption", name: "🇩🇪 Allemagne",  value: "DE" },
                    { type_name: "SelectOption", name: "🇪🇸 Espagne",    value: "ES" },
                    { type_name: "SelectOption", name: "🇲🇽 Mexique",    value: "MX" },
                    { type_name: "SelectOption", name: "🇹🇭 Thaïlande",  value: "TH" }
                ]
            },
            {
                type_name: "SelectFilter",
                name:      "Tri",
                state:     0,
                values: [
                    { type_name: "SelectOption", name: "Popularité",   value: "0" },
                    { type_name: "SelectOption", name: "Nouveautés",   value: "1" },
                    { type_name: "SelectOption", name: "Mieux notés",  value: "2" }
                ]
            }
        ];
    }

    getSourcePreferences() {
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
                    summary:    "Utilisée quand plusieurs pistes audio existent pour un titre",
                    valueIndex: 0,
                    entries:    ["Automatique", "English", "Français", "العربية", "Português", "中文", "日本語", "한국어", "Español"],
                    entryValues:["",            "en",      "fr",       "ar",       "pt",        "zh",   "ja",      "ko",      "es"]
                }
            },
            {
                key: "mb_bilingual",
                switchPreference: {
                    title:   "Sous-titres bilingues",
                    summary: "Affiche 2 langues de sous-titres en même temps sur une seule piste",
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
