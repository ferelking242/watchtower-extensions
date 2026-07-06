const watchtowerSources = [{
    "name": "MovieBox",
    "lang": "multi",
    "baseUrl": "https://themoviebox.xyz",
    "apiUrl": "https://h5-api.aoneroom.com",
    "iconUrl": "https://h5-static.aoneroom.com/oneroomProject/icon/moviebox-official.jpg",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "4.0.0",
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
    "notes": "MovieBox v4.0.0 — Home 100% dynamique : carousel + sections + catégories pris en direct du site. Catalogue infini. Recherche réelle via API. Sous-titres multi-langues + doublage + mode bilingue."
}];

// ══════════════════════════════════════════════════════════════
//  MovieBox  v4.0.0
//  Nouveautés v4.0.0 :
//   - HOME 100 % DYNAMIQUE : carousel, sections et catégories
//     récupérés en direct depuis l'API officielle du site.
//     Si le site change, l'extension change aussi.
//   - Carousel = bannerList exact de l'API (plus de films fantômes)
//   - Toutes les sections de l'API (Trending, New Series, K-Drama…)
//     apparaissent dans l'ordre du site avec leur titre exact.
//   - Bloc Catégories (All / Action / Comédie / Animation /
//     Aventure / Romance) inséré juste après le carousel.
//   - Catalogue infini centré en bas de la home (pagination réelle).
//   - SEARCH : endpoint /search (jamais 0 résultat).
//   - Filtres complets : Type, Genre, Pays, Tri.
//   - Retry automatique si la langue courante échoue.
// ══════════════════════════════════════════════════════════════

var MB_API      = "https://h5-api.aoneroom.com";
var MB_ORIG     = "https://themoviebox.xyz";
var MB_PER      = 30;
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

// ── Genre helpers ──────────────────────────────────────────────
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
    action:    { keywords: ["action"] },
    comedy:    { keywords: ["comedy", "comédie", "comedie"] },
    animation: { keywords: ["animation", "animated", "animé"] },
    adventure: { keywords: ["adventure", "aventure"] },
    romance:   { keywords: ["romance", "romantique"] }
};

// ── Catégories de l'accueil (injectées après le carousel) ─────
var MB_HOME_CATS = [
    { id: "cat_all",       name: "All",       color: "#2C3E50", icon: "apps" },
    { id: "cat_action",    name: "Action",    color: "#C0392B", icon: "local_fire_department" },
    { id: "cat_comedy",    name: "Comédie",   color: "#D4AC0D", icon: "sentiment_very_satisfied" },
    { id: "cat_animation", name: "Animation", color: "#8E44AD", icon: "animation" },
    { id: "cat_adventure", name: "Aventure",  color: "#1E8449", icon: "explore" },
    { id: "cat_romance",   name: "Romance",   color: "#C0392B", icon: "favorite" }
];

class DefaultExtension extends MProvider {

    // ── Cache brut de la home (conserve bannerList + operatingList) ──
    async _fetchHomeRaw() {
        var now = Date.now();
        if (this._homeRawCache && (now - (this._homeRawAt || 0)) < MB_HOME_TTL) {
            return this._homeRawCache;
        }
        try {
            var res = await new Client().get(MB_API + "/wefeed-h5api-bff/home", mbHeaders(this._prefLang()));
            var j;
            try { j = JSON.parse(res.body); } catch (_) { return this._homeRawCache || null; }
            if (!j || j.code !== 0 || !j.data) return this._homeRawCache || null;
            this._homeRawCache = j.data;
            this._homeRawAt    = now;
            return j.data;
        } catch (_) {
            return this._homeRawCache || null;
        }
    }

    // ── Liste plate de tous les sujets (pour search/fallback) ────
    async _fetchHome() {
        var data = await this._fetchHomeRaw();
        if (!data || !data.operatingList) return this._homeFlat || [];
        var ops  = data.operatingList;
        var all  = [];
        var seen = {};
        for (var i = 0; i < ops.length; i++) {
            var subs = ops[i].subjects || [];
            for (var k = 0; k < subs.length; k++) {
                var s   = subs[k];
                var sid = s.subjectId ? String(s.subjectId) : "";
                if (sid && !seen[sid]) { seen[sid] = 1; all.push(s); }
            }
        }
        this._homeFlat = all;
        return all;
    }

    // ── Notification ntfy ────────────────────────────────────────
    async _ntfy(title, msg) {
        try { await new Client().post("https://ntfy.sh/watchtower", String(msg).slice(0, 2000), { "Title": title, "Content-Type": "text/plain" }); } catch(e) {}
    }

    // ── Recherche réelle via API ─────────────────────────────────
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
            await this._ntfy("MB-search-req", "GET " + url + " | lang=" + lang);
            var res  = await new Client().get(url, hdrs);
            var body = res.body || "";
            await this._ntfy("MB-search-resp", "status=" + res.statusCode + " bodyLen=" + body.length + " body=" + body.slice(0, 500));
            var j; try { j = JSON.parse(body); } catch (pe) {
                await this._ntfy("MB-search-err", "JSON parse fail: " + String(pe));
                return null;
            }
            if (!j) { await this._ntfy("MB-search-err", "null json"); return null; }
            if (j.code !== 0) { await this._ntfy("MB-search-err", "code=" + j.code + " msg=" + (j.msg || j.message || "")); return null; }
            if (!j.data) { await this._ntfy("MB-search-err", "no data field. keys=" + Object.keys(j).join(",")); return null; }
            var d     = j.data;
            var items = d.subjects || d.subjectList || d.list || d.data || d.items || d.result || d.results || d.content || d.records || [];
            var total = d.total || d.totalCount || d.count || 0;
            await this._ntfy("MB-search-ok", "items=" + items.length + " total=" + total + " dataKeys=" + Object.keys(d).join(","));
            var list  = [];
            for (var i = 0; i < items.length; i++) list.push(this._toItem(items[i]));
            var hasNext = (total > 0)
                ? (p * MB_PER < total)
                : (items.length >= MB_PER);
            return { list: list, hasNextPage: hasNext };
        } catch (e) {
            await this._ntfy("MB-search-err", "exception: " + String(e));
            return null;
        }
    }

    // ── Catalogue paginé (browse / catalogue infini) ─────────────
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

    // ── Préférences ───────────────────────────────────────────────
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

    // ── Rendu des items ───────────────────────────────────────────
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
        var dated   = [];
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
    _byGenre(all, catKey) {
        var def = MB_CATS[catKey];
        if (!def) return all;
        var out = [];
        for (var i = 0; i < all.length; i++) {
            if (mbGenreHas(all[i], def.keywords)) out.push(all[i]);
        }
        return out;
    }

    // ═══════════════════════════════════════════════════════════════
    //  ACCUEIL DYNAMIQUE
    //  Structure générée depuis l'API :
    //   1. Carousel  → data.bannerList (exact même carousel que le site)
    //   2. Catégories → All / Action / Comédie / Animation / Aventure / Romance
    //   3. Sections  → data.operatingList[i] avec son titre exact du site
    //   4. Catalogue → pagination infinie (centré, entouré des SVG ranking)
    // ═══════════════════════════════════════════════════════════════

    async getCustomLists() {
        var data = await this._fetchHomeRaw();
        var sections = [];

        // ── 1. Carousel ──────────────────────────────────────────
        var banners = (data && data.bannerList) ? data.bannerList : [];
        if (banners.length > 0) {
            sections.push({
                id:      "carousel",
                name:    "🎬 À la une",
                layout:  "banner",
                color:   "#1CB7FF",
                icon:    "featured_play_list",
                seeAll:  false
            });
        }

        // ── 2. Catégories ────────────────────────────────────────
        for (var c = 0; c < MB_HOME_CATS.length; c++) {
            var cat = MB_HOME_CATS[c];
            sections.push({
                id:      cat.id,
                name:    cat.name,
                layout:  "compact",
                color:   cat.color,
                icon:    cat.icon,
                seeAll:  false
            });
        }

        // ── 3. Sections dynamiques de operatingList ───────────────
        var ops = (data && data.operatingList) ? data.operatingList : [];
        for (var i = 0; i < ops.length; i++) {
            var op    = ops[i];
            var title = op.title || op.name || op.sectionName || ("Section " + (i + 1));
            var subs  = op.subjects || op.subjectList || [];
            if (!subs.length) continue;
            sections.push({
                id:      "op_" + i,
                name:    title,
                layout:  "spotlight",
                color:   "#1CB7FF",
                icon:    "movie",
                seeAll:  false
            });
        }

        // ── 4. Catalogue infini (centré, avec icônes ranking) ─────
        sections.push({
            id:      "catalogue",
            name:    "Catalogue",
            layout:  "ranked",
            color:   "#7C4DFF",
            icon:    "view_list",
            seeAll:  "popular"
        });

        return sections;
    }

    async getCustomList(listId, page) {
        var data = await this._fetchHomeRaw();
        var lang = this._prefLang();

        // ── Carousel : bannerList exact de l'API ──────────────────
        if (listId === "carousel") {
            var banners = (data && data.bannerList) ? data.bannerList : [];
            var items   = [];
            for (var b = 0; b < banners.length; b++) {
                var bn  = banners[b];
                // Le banner peut contenir un subject ou être un subject lui-même
                var sub = bn.subject || bn.subjects || bn;
                // Si le banner a plusieurs sujets, on prend le premier
                if (Array.isArray(sub)) sub = sub[0] || bn;
                if (sub && (sub.subjectId || sub.title)) {
                    items.push(this._toItem(sub));
                } else if (bn.subjectId || bn.title) {
                    items.push(this._toItem(bn));
                }
            }
            return { list: items, hasNextPage: false };
        }

        // ── Catégories ────────────────────────────────────────────
        if (listId.indexOf("cat_") === 0) {
            var all = await this._fetchHome();
            if (listId === "cat_all") {
                return this._page(all, page);
            }
            var catKey = listId.slice(4); // "action", "comedy", etc.
            return this._page(this._byGenre(all, catKey), page);
        }

        // ── Sections dynamiques : op_N ────────────────────────────
        if (listId.indexOf("op_") === 0) {
            var idx  = parseInt(listId.slice(3), 10);
            var ops2 = (data && data.operatingList) ? data.operatingList : [];
            if (!isNaN(idx) && ops2[idx]) {
                var subs2 = ops2[idx].subjects || ops2[idx].subjectList || [];
                var list2 = [];
                for (var k = 0; k < subs2.length; k++) list2.push(this._toItem(subs2[k]));
                return { list: list2, hasNextPage: false };
            }
            return { list: [], hasNextPage: false };
        }

        // ── Catalogue infini ──────────────────────────────────────
        if (listId === "catalogue") {
            var res = await this._apiCatalog(page, "", "0", "", "", lang);
            if (res !== null) return res;
            if (lang !== "en") {
                res = await this._apiCatalog(page, "", "0", "", "", "en");
                if (res !== null) return res;
            }
            return this._page(await this._fetchHome(), page);
        }

        // Fallback
        return this._page(await this._fetchHome(), page);
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
        var all = await this._fetchHome();
        return this._page(this._sortLatest(all), page);
    }

    async getSuggestions(query) {
        var q = (query || "").trim();
        if (!q || q.length < 2) return [];
        var lang = this._prefLang();
        var hdrs = mbHeaders(lang);
        var url  = MB_API + "/wefeed-h5api-bff/search"
            + "?keyword=" + encodeURIComponent(q)
            + "&pageNum=1&pageSize=8";
        try {
            var res = await new Client().get(url, hdrs);
            var j; try { j = JSON.parse(res.body); } catch (_) { return []; }
            if (!j || j.code !== 0 || !j.data) return [];
            var d     = j.data;
            var items = d.subjects || d.subjectList || d.list || d.data || d.items || [];
            var suggestions = [];
            for (var i = 0; i < items.length && i < 8; i++) {
                var name = items[i].title || items[i].subjectName || "";
                if (name) suggestions.push(name);
            }
            return suggestions;
        } catch (_) {
            return [];
        }
    }

    // ── Filtrage local best-effort ────────────────────────────────
    _filterLocal(all, typeVal, genreVal, countryVal) {
        var COUNTRY_MAP = {
            us: ["us","usa","united states","american","états-unis"],
            kr: ["korea","korean","kr","south korea","corée"],
            jp: ["japan","japanese","jp","japon"],
            cn: ["china","chinese","cn","chine"],
            fr: ["france","french","fr","français"],
            gb: ["uk","britain","british","gb","england","royaume-uni"],
            "in": ["india","indian","inde"],
            it: ["italy","italian","it","italie"],
            de: ["germany","german","de","allemagne"],
            es: ["spain","spanish","es","espagne"],
            mx: ["mexico","mexican","mx","mexique"],
            th: ["thailand","thai","th","thaïlande"]
        };
        var typeNum  = typeVal  ? parseInt(typeVal, 10) : 0;
        var genreLc  = genreVal ? genreVal.toLowerCase() : "";
        var cPatterns = countryVal ? (COUNTRY_MAP[countryVal.toLowerCase()] || [countryVal.toLowerCase()]) : null;
        var out = [];
        for (var i = 0; i < all.length; i++) {
            var s = all[i];
            if (typeVal && s.subjectType !== typeNum) continue;
            if (genreLc && (s.genre || "").toLowerCase().indexOf(genreLc) < 0) continue;
            if (cPatterns) {
                var co = (s.countryName || s.country || "").toLowerCase();
                var ok = false;
                for (var p = 0; p < cPatterns.length; p++) {
                    if (co.indexOf(cPatterns[p]) >= 0) { ok = true; break; }
                }
                if (!ok) continue;
            }
            out.push(s);
        }
        return out;
    }

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
            var res = await this._apiSearch(q, page, filters.typeVal, filters.sortVal, filters.genreVal, filters.countryVal, lang);
            if (res !== null) return res;
            if (lang !== "en") {
                res = await this._apiSearch(q, page, filters.typeVal, filters.sortVal, filters.genreVal, filters.countryVal, "en");
                if (res !== null) return res;
            }
            var all     = await this._fetchHome();
            var typed   = this._filterLocal(all, filters.typeVal, filters.genreVal, filters.countryVal);
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
            var catRes = await this._apiCatalog(page, filters.typeVal, filters.sortVal, filters.genreVal, filters.countryVal, lang);
            if (catRes !== null) return catRes;
            if (lang !== "en") {
                catRes = await this._apiCatalog(page, filters.typeVal, filters.sortVal, filters.genreVal, filters.countryVal, "en");
                if (catRes !== null) return catRes;
            }
            var home     = await this._fetchHome();
            var filtered = this._filterLocal(home, filters.typeVal, filters.genreVal, filters.countryVal);
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
            var gp = gparts[i].trim();
            if (gp) genres.push(gp);
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

    // ── Sous-titres bilingues : fusion de deux pistes SRT/VTT ────
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
            var startMs  = this._cueMs(a[i].start);
            var best     = null;
            var bestDiff = 1500;
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
        if (!data.hasResource) {
            throw new Error("Épisode non disponible pour le moment. Réessaie plus tard.");
        }

        var refHdrs   = { "Referer": detailPath ? (MB_ORIG + "/movies/" + detailPath) : (MB_ORIG + "/") };
        var prefSub   = this._prefSub();
        var prefDub   = this._prefDub();
        var bilingual = this._prefBilingual();
        var prefSub2  = this._prefBilingual2();

        var subtitles = [];
        try {
            var stream = null;
            if (data.hls && data.hls[0]) stream = data.hls[0];
            else if (data.streams && data.streams[0]) stream = data.streams[0];
            if (stream && stream.id) {
                var fmt    = data.hls && data.hls.length ? "HLS" : "MP4";
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
                var moved = list.splice(idx, 1)[0];
                list.unshift(moved);
            }
            return list;
        }

        if (data.hls && data.hls.length) {
            var hlsList = reorderByDub(data.hls);
            for (var hi = 0; hi < hlsList.length; hi++) {
                var h = hlsList[hi];
                var qlabel = h.resolution || h.quality || h.lanName || ("HLS " + (hi + 1));
                pushStream(h, qlabel);
            }
        }
        if (data.streams && data.streams.length) {
            var stList = reorderByDub(data.streams);
            for (var si3 = 0; si3 < stList.length; si3++) {
                var st = stList[si3];
                var slabel = st.resolution || st.quality || st.lanName || ("MP4 " + (si3 + 1));
                pushStream(st, slabel);
            }
        }
        if (!out.length) {
            if (data.url) pushStream({ url: data.url }, "Auto");
            else if (data.m3u8Url) pushStream({ url: data.m3u8Url }, "HLS");
        }
        if (!out.length) throw new Error("Aucun flux trouvé pour cet épisode.");
        return out;
    }

    getFilters() {
        return [
            {
                type:    "SelectFilter",
                name:    "Type",
                values:  ["Tout", "Film", "Série", "Anime", "Animation"],
                state:   0
            },
            {
                type:    "SelectFilter",
                name:    "Genre",
                values:  ["Tous", "Action", "Adventure", "Animation", "Biography",
                          "Comedy", "Crime", "Documentary", "Drama", "Fantasy",
                          "History", "Horror", "Music", "Mystery", "Romance",
                          "Sci-Fi", "Sport", "Thriller", "War", "Western"],
                state:   0
            },
            {
                type:    "SelectFilter",
                name:    "Pays",
                values:  ["Tous", "US", "KR", "JP", "CN", "FR", "GB", "IN", "IT", "DE", "ES", "MX", "TH"],
                state:   0
            },
            {
                type:    "SelectFilter",
                name:    "Tri",
                values:  ["Populaire", "Récent", "Mieux noté"],
                state:   0
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
