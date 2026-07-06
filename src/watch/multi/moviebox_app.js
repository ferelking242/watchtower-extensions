const watchtowerSources = [{
    "name": "MovieBox App",
    "lang": "multi",
    "baseUrl": "https://themoviebox.xyz",
    "apiUrl": "https://api3.aoneroom.com",
    "iconUrl": "https://h5-static.aoneroom.com/oneroomProject/icon/moviebox-official.jpg",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "2.0.0",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "watch/multi/moviebox_app.js",
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "hasSubtitles": true,
    "hasDub": true,
    "notes": "MovieBox App v2.0.0 — API native (wefeed-mobile-bff) multi-serveurs api3→api8. Family Mode (X-Family-Mode), langue (X-Language), pays/géo-bypass (Accept-Country), fuseau (Accept-Timezone), mode affichage. Sections 100% dynamiques depuis API. Streams HLS+MP4 multi-qualités, dubs, sous-titres bilingues."
}];

// ══════════════════════════════════════════════════════════════
//  MovieBox App  v2.0.0
//  Nouveautés vs v1.6.0 :
//   - Headers natifs complets : X-Language, X-Family-Mode,
//     Accept-Country (bypass géo), Accept-Timezone
//   - Préférences : Family Mode, Pays/Région, Fuseau horaire,
//     Mode d'affichage (Standard/Compact/Confort)
//   - Sections entièrement dynamiques depuis l'API (plus de
//     liste op_N hardcodée — fallback minimal : carousel +
//     catégories + catalogue uniquement)
//   - Détection automatique du layout "ranked" par titre
//     (fini les indices hardcodés [18,27])
//   - Gestion d'erreur propre et traces explicites
//   - Nombre de sections et items par page adaptatif
// ══════════════════════════════════════════════════════════════

// ── Serveurs natifs — le premier qui répond avec code=0 gagne ──
var MB_MOBILE_SERVERS = [
    "https://api3.aoneroom.com",
    "https://api4.aoneroom.com",
    "https://api5.aoneroom.com",
    "https://api6.aoneroom.com",
    "https://api7.aoneroom.com",
    "https://api8.aoneroom.com"
];
var MB_MOBILE_API = MB_MOBILE_SERVERS[0]; // mis à jour au premier serveur qui répond

// ── Tag de langue (scanlator) pour la box langue dans l'app ────
var MB_LANG_TAG = {
    fr: "French",    en: "English",   ja: "Japanese",  zh: "Chinese",
    ko: "Korean",    es: "Spanish",   pt: "Portuguese",ru: "Russian",
    ar: "Arabic",    de: "German",    it: "Italian",   pl: "Polish",
    tr: "Turkish",   vi: "Vietnamese",th: "Thai",      id: "Indonesian",
    hi: "Hindi",     nl: "Dutch",     sv: "Swedish",   fi: "Finnish",
    no: "Norwegian", da: "Danish",    cs: "Czech",     sk: "Slovak",
    ro: "Romanian",  hu: "Hungarian", bg: "Bulgarian", hr: "Croatian",
    sr: "Serbian",   uk: "Ukrainian", he: "Hebrew",    fa: "Persian",
    ur: "Urdu",      bn: "Bengali",   pa: "Punjabi",   fil: "Filipino",
    ms: "Malay",     ta: "Tamil",     te: "Telugu",    sw: "Swahili"
};
function mbLangTag(lang) {
    return MB_LANG_TAG[(lang || "").toLowerCase()] || "Multi";
}

var MB_H5_API    = "https://h5-api.aoneroom.com";
var MB_ORIG      = "https://themoviebox.xyz";
var MB_HOME_TTL  = 5 * 60 * 1000; // 5 minutes

// ── MD5 compact (X-Client-Token) ──────────────────────────────
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

// ── Constructeur de headers — inclut tous les headers natifs APK ──
// familyMode : true → X-Family-Mode: 1 (filtrage 18+ côté serveur)
// country    : code ISO 3166-1 alpha-2 (ex: "NG") → Accept-Country (bypass géo)
// timezone   : IANA tz (ex: "Africa/Lagos") → Accept-Timezone
function mbHeaders(lang, detailPath, familyMode, country, timezone) {
    var tz = timezone || "UTC";
    var h = {
        "Accept":           "application/json",
        "Origin":           MB_ORIG,
        "Referer":          detailPath ? (MB_ORIG + "/movies/" + detailPath) : (MB_ORIG + "/"),
        "User-Agent":       "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
        "X-Client-Info":    JSON.stringify({ timezone: tz }),
        "X-Client-Token":   mbClientToken(),
        // ── Headers langue ──
        "X-Language":       lang || "en",   // header natif APK
        "X-Request-Lang":   lang || "en",   // header H5 BFF
    };
    // Family Mode — filtre 18+ côté serveur
    if (familyMode) {
        h["X-Family-Mode"] = "1";
    } else {
        h["X-Family-Mode"] = "0";
    }
    // Bypass géolocalisation
    if (country) {
        h["Accept-Country"] = country.toUpperCase();
    }
    // Fuseau horaire
    if (tz && tz !== "UTC") {
        h["Accept-Timezone"] = tz;
    }
    return h;
}

// ── Fallback minimal de sections (avant que le cache API soit chaud) ──
// PAS de sections op_N hardcodées : elles sont 100% générées depuis l'API
// via _buildDynamicSections(). Seuls carousel, catégories et catalogue
// sont présents ici car ils ne dépendent pas de l'operatingList serveur.
var MB_HOME_SECTIONS = [
    { id: "carousel",      name: "\uD83C\uDFAC \u00C0 la une", layout: "banner",   color: "#1CB7FF" },
    { id: "cat_all",       name: "All",                          layout: "category", color: "#2C3E50" },
    { id: "cat_action",    name: "Action",                       layout: "category", color: "#C0392B" },
    { id: "cat_comedy",    name: "Com\u00E9die",                 layout: "category", color: "#D4AC0D" },
    { id: "cat_animation", name: "Animation",                    layout: "category", color: "#8E44AD" },
    { id: "cat_adventure", name: "Aventure",                     layout: "category", color: "#1E8449" },
    { id: "cat_romance",   name: "Romance",                      layout: "category", color: "#E91E63" },
    { id: "catalogue",     name: "Catalogue",                    layout: "catalogue",color: "#7C4DFF" }
];

// ── Couleurs cycliques pour les sections dynamiques ─────────────
var MB_SECTION_COLORS = [
    "#FF6F00","#1CB7FF","#1CB7FF","#FF6F00","#8E44AD","#00BCD4","#8E44AD",
    "#1CB7FF","#1CB7FF","#E53935","#00897B","#E91E63","#E53935","#8E44AD",
    "#1CB7FF","#E91E63","#FF6F00","#1CB7FF","#8E44AD","#FF6F00","#1CB7FF",
    "#FF6F00","#1CB7FF","#1CB7FF","#E91E63","#1CB7FF","#1CB7FF","#FF6F00",
    "#E53935","#E53935","#1CB7FF","#8E44AD","#8E44AD","#1CB7FF","#FF6F00",
    "#8E44AD","#8E44AD","#E91E63","#1CB7FF","#1CB7FF","#E53935","#FF6F00"
];

class DefaultExtension extends MProvider {

    // ── Raccourci headers avec toutes les préférences ─────────────
    // Utiliser this._h() dans tous les appels HTTP internes à la place
    // de mbHeaders() pour injecter automatiquement Family Mode / pays / tz.
    _h(lang, detailPath) {
        return mbHeaders(
            lang || this._prefLang(),
            detailPath,
            this._prefFamilyMode(),
            this._prefCountry(),
            this._prefTimezone()
        );
    }

    // ── Cache home brut (bannerList + operatingList) ──────────────
    // Extrait aussi le Bearer JWT depuis le header x-user.
    async _fetchHomeRaw() {
        var now = Date.now();
        if (this._homeRawCache && (now - (this._homeRawAt || 0)) < MB_HOME_TTL) {
            return this._homeRawCache;
        }
        try {
            var res = await new Client().get(
                MB_H5_API + "/wefeed-h5api-bff/home",
                this._h()
            );
            // Extraire le JWT Bearer depuis x-user : {"token":"<jwt>",...}
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
            var j;
            try { j = JSON.parse(res.body); } catch (_) {
                return this._homeRawCache || null;
            }
            if (!j || j.code !== 0 || !j.data) return this._homeRawCache || null;
            this._homeRawCache = j.data;
            this._homeRawAt    = now;
            return j.data;
        } catch (err) {
            // Erreur réseau → on retourne le cache expiré plutôt que rien
            return this._homeRawCache || null;
        }
    }

    // ── Liste plate dédupliquée (pour catégories / fallback local) ─
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

    // Préférences existantes
    _prefLang()       { return this._pref("mb_content_lang",     "en");    }
    _prefSub()        { return this._pref("mb_sub",              "en");    }
    _prefDub()        { return this._pref("mb_dub",              "");      }
    _prefBilingual()  { return this._pref("mb_bilingual",        "false") === "true"; }
    _prefBilingual2() { return this._pref("mb_bilingual_second", "en");    }

    // Nouvelles préférences
    /** Family Mode — filtre contenu 18+ côté serveur (X-Family-Mode: 1) */
    _prefFamilyMode() { return this._pref("mb_family_mode", "false") === "true"; }

    /** Pays/région pour bypass géo-blocage (Accept-Country header) */
    _prefCountry()    { return this._pref("mb_country",   "");   }

    /** Fuseau horaire IANA (Accept-Timezone header) */
    _prefTimezone()   { return this._pref("mb_timezone",  "");   }

    /** Mode d'affichage : "standard" | "compact" | "confort" */
    _prefDisplayMode(){ return this._pref("mb_display_mode", "standard"); }

    /**
     * Nombre max de sections dynamiques retournées dans _buildDynamicSections.
     * compact → 12 sections | standard → 25 | confort → 42 (toutes)
     */
    _prefMaxSections() {
        var m = this._prefDisplayMode();
        if (m === "compact")  return 12;
        if (m === "confort")  return 42;
        return 25; // standard
    }

    /**
     * Taille de page pour catalogue / recherche.
     * compact → 20 | standard → 30 | confort → 40
     */
    _prefPageSize() {
        var m = this._prefDisplayMode();
        if (m === "compact")  return 20;
        if (m === "confort")  return 40;
        return 30; // standard
    }

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
        // subjectId peut valoir 0 (falsy) — ne jamais utiliser || ""
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
        var per   = this._prefPageSize();
        var p     = (page && page > 0) ? page : 1;
        var start = (p - 1) * per, end = p * per, slice = [];
        for (var i = start; i < end && i < items.length; i++) slice.push(this._toItem(items[i]));
        return { list: slice, hasNextPage: end < items.length };
    }

    // ── Catalogue paginé (GET /catalog) ───────────────────────────
    async _apiCatalog(page, typeVal, sortVal, genreVal, countryVal, lang) {
        var per = this._prefPageSize();
        var p   = (page && page > 0) ? page : 1;
        var url = MB_H5_API + "/wefeed-h5api-bff/catalog"
            + "?pageNum=" + p + "&pageSize=" + per;
        if (typeVal)    url += "&subjectType=" + encodeURIComponent(typeVal);
        if (sortVal)    url += "&sortType="    + encodeURIComponent(sortVal);
        if (genreVal)   url += "&genre="       + encodeURIComponent(genreVal);
        if (countryVal) url += "&country="     + encodeURIComponent(countryVal);
        try {
            var res = await new Client().get(url, this._h(lang));
            var j;
            try { j = JSON.parse(res.body); } catch (_) { return null; }
            if (!j || j.code !== 0 || !j.data) return null;
            var d     = j.data;
            var items = d.subjects || d.list || d.data || [];
            var total = d.total || d.totalCount || 0;
            var list  = [];
            for (var i = 0; i < items.length; i++) list.push(this._toItem(items[i]));
            return {
                list:        list,
                hasNextPage: total > 0 ? (p * per < total) : (items.length >= per)
            };
        } catch (_) { return null; }
    }

    // ── Session Bearer token (depuis header x-user de GET /home) ──
    async _getSessionToken(lang, forceRefresh) {
        var now = Date.now();
        var TTL = 25 * 60 * 1000;
        if (!forceRefresh && this._sessionToken && (now - (this._sessionTokenAt || 0)) < TTL) {
            return this._sessionToken;
        }
        // Force un vrai GET /home pour récupérer le header x-user
        this._homeRawAt = 0;
        await this._fetchHomeRaw();
        return this._sessionToken || null;
    }

    // ── Recherche via POST /subject/search ────────────────────────
    async _apiSearch(query, page, typeVal, sortVal, genreVal, countryVal, lang) {
        var per     = this._prefPageSize();
        var p       = (page && page > 0) ? page : 1;
        var payload = { keyword: query || "", pageNum: p, pageSize: per };
        if (typeVal)    payload.subjectType = parseInt(typeVal, 10) || undefined;
        if (sortVal)    payload.sortType    = sortVal;
        if (genreVal)   payload.genre       = genreVal;
        if (countryVal) payload.country     = countryVal;
        // Filtre API par langue
        if (lang && lang !== "en") payload.lan = lang;

        // Deux tentatives : la 2ème force un refresh de token sur 401/403
        for (var attempt = 0; attempt < 2; attempt++) {
            var token = await this._getSessionToken(lang, attempt > 0);
            if (!token && lang !== "en") token = await this._getSessionToken("en", attempt > 0);
            if (!token) return null;
            try {
                var hdrs = this._h(lang);
                hdrs["content-type"]  = "application/json";
                hdrs["Authorization"] = "Bearer " + token;
                // Passer payload comme objet : le runtime Dart encode en JSON.
                // JSON.stringify + json.encode = double-encodage → corps invalide.
                var res = await new Client().post(
                    MB_H5_API + "/wefeed-h5api-bff/subject/search",
                    hdrs,
                    payload
                );
                var j;
                try { j = JSON.parse(res.body || ""); } catch (_) { return null; }
                if (j && (j.code === 401 || j.code === 403) && attempt === 0) {
                    this._sessionToken   = null;
                    this._sessionTokenAt = 0;
                    continue;
                }
                if (!j || j.code !== 0 || !j.data) return null;
                var d     = j.data;
                var items = d.items || d.subjects || d.subjectList || d.list || d.data || d.results || d.content || d.records || [];
                var pager = d.pager || {};
                var total = pager.totalCount || d.total || d.totalCount || d.count || 0;
                var apiHasMore = pager.hasMore !== undefined
                    ? pager.hasMore
                    : (total > 0 ? (p * per < total) : true);
                var hasMore = (items.length >= per) && apiHasMore;
                var list = [];
                for (var i = 0; i < items.length; i++) list.push(this._toItem(items[i]));
                return { list: list, hasNextPage: hasMore };
            } catch (_) { return null; }
        }
        return null;
    }

    // ── Filtrage local (fallback sans réseau) ─────────────────────
    _sortLatest(all) {
        var dated = [], undated = [];
        for (var i = 0; i < all.length; i++) {
            if (all[i].releaseDate) dated.push(all[i]); else undated.push(all[i]);
        }
        dated.sort(function(a, b) {
            return b.releaseDate > a.releaseDate ? 1 : b.releaseDate < a.releaseDate ? -1 : 0;
        });
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
            mx:["mexico","mexican","mx"],th:["thailand","thai","th"],
            ng:["nigeria","nigerian","nollywood"],za:["south africa","south african"]
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

    // ── Lecture des filtres (format SelectFilter Watchtower) ───────
    _readFilters(filterList) {
        var typeVal = "", sortVal = "", genreVal = "", countryVal = "";
        try {
            if (!filterList || !filterList.length) return { typeVal: typeVal, sortVal: sortVal, genreVal: genreVal, countryVal: countryVal };
            for (var i = 0; i < filterList.length; i++) {
                var f = filterList[i];
                if (!f || f.state === undefined || f.state === null) continue;
                var idx  = typeof f.state === "number" ? f.state : parseInt(f.state, 10);
                var vals = f.values || [];
                var selVal = "";
                if (vals.length > idx && vals[idx]) {
                    selVal = vals[idx].value !== undefined ? String(vals[idx].value) : "";
                }
                var nm = f.name || "";
                if      (nm === "Type")  typeVal    = selVal;
                else if (nm === "Genre") genreVal   = selVal;
                else if (nm === "Pays")  countryVal = selVal;
                else if (nm === "Tri")   sortVal    = selVal;
            }
        } catch (_) {}
        return { typeVal: typeVal, sortVal: sortVal, genreVal: genreVal, countryVal: countryVal };
    }

    // ─────────────────────────────────────────────────────────────
    //  ACCUEIL — SYNC (contrainte plateforme)
    //  • Si le cache API est chaud → sections 100% dynamiques
    //    (titres et ordre exacts de l'API, jamais hardcodés)
    //  • Sinon → fallback minimal : carousel + catégories + catalogue
    // ─────────────────────────────────────────────────────────────
    getCustomLists() {
        if (this._homeRawCache && this._homeRawCache.operatingList &&
                this._homeRawCache.operatingList.length > 0) {
            return this._buildDynamicSections(this._homeRawCache);
        }
        return MB_HOME_SECTIONS;
    }

    // ── Construction dynamique des sections depuis l'API ──────────
    // Les noms de sections viennent entièrement du serveur.
    // Le layout "ranked" est auto-détecté sur le titre (pas d'indices hardcodés).
    _buildDynamicSections(data) {
        var sections = [
            { id: "carousel",      name: "\uD83C\uDFAC \u00C0 la une", layout: "banner",   color: "#1CB7FF" },
            { id: "cat_all",       name: "All",                          layout: "category", color: "#2C3E50" },
            { id: "cat_action",    name: "Action",                       layout: "category", color: "#C0392B" },
            { id: "cat_comedy",    name: "Com\u00E9die",                 layout: "category", color: "#D4AC0D" },
            { id: "cat_animation", name: "Animation",                    layout: "category", color: "#8E44AD" },
            { id: "cat_adventure", name: "Aventure",                     layout: "category", color: "#1E8449" },
            { id: "cat_romance",   name: "Romance",                      layout: "category", color: "#E91E63" }
        ];
        var ops        = data.operatingList || [];
        var maxSections = this._prefMaxSections ? this._prefMaxSections() : 25;

        for (var i = 0; i < ops.length && i < maxSections; i++) {
            if (!ops[i] || typeof ops[i] !== "object") continue;
            var title  = String(ops[i].title || ops[i].name || ("Section " + i));
            var titleL = title.toLowerCase();
            // Détection automatique du layout "ranked" (classements numérotés)
            var isRanked = (
                titleL.indexOf("top 100") >= 0 ||
                titleL.indexOf("must-watch") >= 0 ||
                titleL.indexOf("rank") >= 0 ||
                titleL.indexOf("classement") >= 0
            );
            sections.push({
                id:     "op_" + i,
                name:   title,
                layout: isRanked ? "ranked" : "spotlight",
                color:  MB_SECTION_COLORS[i % MB_SECTION_COLORS.length]
            });
        }
        sections.push({ id: "catalogue", name: "Catalogue", layout: "catalogue", color: "#7C4DFF" });
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
                var sub = bn.subject || bn;
                if (Array.isArray(sub)) sub = sub[0] || bn;
                items.push(this._toItem(sub));
            }
            return { list: items, hasNextPage: false };
        }

        // ── Catégories (filtrage local depuis le cache home) ───────
        if (listId.indexOf("cat_") === 0) {
            var all  = await this._fetchHome();
            var catK = listId.slice(4);
            if (catK === "all") return this._page(all, page);
            var kwMap = {
                action:    ["action"],
                comedy:    ["comedy","com\u00E9die","comedie"],
                animation: ["animation","animated"],
                adventure: ["adventure","aventure"],
                romance:   ["romance","romantique"]
            };
            var kws      = kwMap[catK] || [catK];
            var filtered = [];
            for (var i = 0; i < all.length; i++) {
                var g = ((all[i].genre || "") + " " + (all[i].title || "")).toLowerCase();
                for (var k = 0; k < kws.length; k++) {
                    if (g.indexOf(kws[k]) >= 0) { filtered.push(all[i]); break; }
                }
            }
            return this._page(filtered, page);
        }

        // ── Sections dynamiques : op_N → operatingList[N] de l'API ─
        // Contenu toujours lu depuis le cache fraîchement rempli par
        // _fetchHomeRaw(). Aucun nom ni ordre n'est hardcodé ici.
        if (listId.indexOf("op_") === 0) {
            var idx = parseInt(listId.slice(3), 10);
            var ops = (data && data.operatingList) ? data.operatingList : [];
            if (!isNaN(idx) && ops[idx]) {
                var subs = ops[idx].subjects || ops[idx].subjectList || [];
                var list = [];
                for (var j = 0; j < subs.length; j++) list.push(this._toItem(subs[j]));
                return { list: list, hasNextPage: false };
            }
            return { list: [], hasNextPage: false };
        }

        // ── Catalogue infini (paginé via /catalog) ─────────────────
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

    // ── Filtre les résultats avec tags de langue étrangère ──────────
    _filterLangResults(list, lang) {
        var LANG_TAGS = {
            "hi": ["hindi"],
            "ar": ["arabic", "arab"],
            "tl": ["tagalog", "filipino"],
            "tr": ["turkish", "turc"],
            "ta": ["tamil"],
            "te": ["telugu"],
            "ms": ["malay"],
            "id": ["indonesian"],
            "zh": ["chinese", "mandarin", "cantonese"],
            "ko": ["korean"],
            "ja": ["japanese"],
            "pt": ["portuguese", "portugues", "ptbr"],
            "es": ["spanish", "espa\u00F1ol", "espanol", "esla"],
            "fr": ["french", "fran\u00E7ais", "francais", "version fran"],
            "de": ["german", "deutsch"],
            "it": ["italian", "italiano"],
            "ru": ["russian"]
        };
        var foreignTags = [];
        for (var code in LANG_TAGS) {
            if (code !== lang) {
                foreignTags = foreignTags.concat(LANG_TAGS[code]);
            }
        }
        var filtered = [];
        for (var i = 0; i < list.length; i++) {
            var name      = (list[i].name || "").toLowerCase();
            var bracketRe = /\[([^\]]+)\]/g, m, hasForeign = false;
            while ((m = bracketRe.exec(name)) !== null) {
                var tag = m[1].trim();
                for (var t = 0; t < foreignTags.length; t++) {
                    if (tag.indexOf(foreignTags[t]) >= 0) { hasForeign = true; break; }
                }
                if (hasForeign) break;
            }
            if (!hasForeign) filtered.push(list[i]);
        }
        return filtered.length > 0 ? filtered : list;
    }

    async search(query, page, filterList) {
        var lang    = this._prefLang();
        var filters = this._readFilters(filterList);
        var q       = (query || "").trim();

        if (q) {
            var res = await this._apiSearch(q, page, filters.typeVal, filters.sortVal, filters.genreVal, filters.countryVal, lang);
            if (res !== null) {
                if (res.list && res.list.length && lang !== "en") {
                    res.list = this._filterLangResults(res.list, lang);
                }
                return res;
            }
            // Fallback anglais uniquement sur erreur réseau (res === null)
            if (lang !== "en") {
                res = await this._apiSearch(q, page, filters.typeVal, filters.sortVal, filters.genreVal, filters.countryVal, "en");
                if (res !== null) {
                    if (res.list && res.list.length) res.list = this._filterLangResults(res.list, lang);
                    return res;
                }
            }
            throw new Error("Recherche indisponible — v\u00E9riez votre connexion ou r\u00E9essayez.");

        } else {
            var cat = await this._apiCatalog(page, filters.typeVal, filters.sortVal, filters.genreVal, filters.countryVal, lang);
            if (cat !== null) return cat;
            if (lang !== "en") {
                cat = await this._apiCatalog(page, filters.typeVal, filters.sortVal, filters.genreVal, filters.countryVal, "en");
                if (cat !== null) return cat;
            }
            throw new Error("Catalogue indisponible — v\u00E9rifiez votre connexion ou r\u00E9essayez.");
        }
    }

    // ── Détails d'un titre ─────────────────────────────────────────
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
                MB_H5_API + "/wefeed-h5api-bff/detail?" + param,
                this._h(this._prefLang(), detailPath)
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
            desc += "\n\n\u2B50 IMDb " + s.imdbRatingValue;
        }

        var realId   = s.subjectId  != null ? String(s.subjectId)  : subjectId;
        var realDp   = s.detailPath || detailPath || "";
        var realType = s.subjectType || subjectType;
        var seasons  = (res2.seasons) ? res2.seasons : [];
        var chapters = [], isMovie = (realType === 1) || !seasons.length;

        // ── Langues disponibles pour ce titre (via probe play-info) ──
        // On sonde UNE fois le premier épisode pour récupérer dubsList réel,
        // puis on duplique les chapitres par langue disponible.
        var prefLangCode = this._prefLang();
        var langs = [];
        try {
            var probeSe = isMovie ? 0 : (seasons[0] ? (seasons[0].se || 1) : 1);
            var probeEp = isMovie ? 0 : 1;
            var probeJ  = await this._fetchPlay(realId, realDp, probeSe, probeEp, "en");
            var probeDubs = (probeJ && probeJ.data && probeJ.data.dubsList) ? probeJ.data.dubsList : [];
            var seenLang = {};
            for (var pd = 0; pd < probeDubs.length; pd++) {
                var pdub  = probeDubs[pd];
                var pcode = (pdub.lan || "").toLowerCase();
                if (!pcode || seenLang[pcode]) continue;
                seenLang[pcode] = 1;
                langs.push({ code: pcode, label: pdub.lanName || mbLangTag(pcode) });
            }
        } catch (_) {}
        if (!langs.length) langs.push({ code: prefLangCode, label: mbLangTag(prefLangCode) });
        // Langue préférée en premier
        for (var lo = 1; lo < langs.length; lo++) {
            if (langs[lo].code === prefLangCode) { langs.unshift(langs.splice(lo, 1)[0]); break; }
        }

        for (var li = 0; li < langs.length; li++) {
            var lg = langs[li];
            if (isMovie) {
                chapters.push({
                    name:       "\u25B6 Regarder",
                    url:        JSON.stringify({ subjectId: realId, detailPath: realDp, se: 0, ep: 0, dub: lg.code }),
                    dateUpload: s.releaseDate || "",
                    scanlator:  lg.code + "|" + lg.label
                });
            } else {
                for (var si = 0; si < seasons.length; si++) {
                    var season = seasons[si];
                    var seNum  = season.se || (si + 1);
                    var maxEp  = season.maxEp || 0;
                    for (var ep = 1; ep <= maxEp; ep++) {
                        chapters.push({
                            name:       maxEp > 1 ? ("S" + seNum + " E" + ep) : (s.title || "Episode"),
                            url:        JSON.stringify({ subjectId: realId, detailPath: realDp, se: seNum, ep: ep, dub: lg.code }),
                            dateUpload: "",
                            scanlator:  lg.code + "|" + lg.label
                        });
                    }
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

    // ── Lecture : API native app (api3→api8), fallback H5 ─────────
    // Chaque serveur native est identique — le premier qui retourne
    // code=0 + hasResource=true est sélectionné. Les erreurs réseau
    // ou réponses invalides sont silencieuses (on essaie le suivant).
    async _fetchPlay(subjectId, detailPath, se, ep, lang) {
        var playPath = "/wefeed-mobile-bff/subject-api/play-info"
            + "?subjectId=" + encodeURIComponent(subjectId)
            + "&se=" + se + "&ep=" + ep
            + (detailPath ? "&detailPath=" + encodeURIComponent(detailPath) : "");

        // Tentative sur chaque serveur natif
        for (var si = 0; si < MB_MOBILE_SERVERS.length; si++) {
            var mJ = null;
            try {
                var mUrl = MB_MOBILE_SERVERS[si] + playPath;
                var mRes = await new Client().get(mUrl, this._h(lang, detailPath));
                try { mJ = JSON.parse(mRes.body); } catch (_) {}
            } catch (_) {
                continue; // Ce serveur est unreachable — serveur suivant
            }
            if (mJ && mJ.code === 0 && mJ.data && mJ.data.hasResource) {
                MB_MOBILE_API = MB_MOBILE_SERVERS[si]; // mémorise le serveur actif
                return mJ;
            }
        }

        // Fallback H5 API (moins de qualités, pas de dubsList)
        var h5Url = MB_H5_API + "/wefeed-h5api-bff/subject/play"
            + "?subjectId=" + encodeURIComponent(subjectId)
            + "&se=" + se + "&ep=" + ep
            + "&detailPath=" + encodeURIComponent(detailPath || "");
        try {
            var fRes = await new Client().get(h5Url, this._h(lang, detailPath));
            return JSON.parse(fRes.body);
        } catch (_) { return null; }
    }

    // ── Sous-titres bilingues ─────────────────────────────────────
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
            out.push((i + 1) + "\n" + a[i].start + " --> " + a[i].end + "\n" +
                a[i].text + (best ? "\n" + best.text : "") + "\n");
        }
        return out.join("\n");
    }

    // ── Lecture vidéo ─────────────────────────────────────────────
    async getVideoList(url) {
        var payload;
        try { payload = JSON.parse(url); } catch (_) { throw new Error("URL de chapitre invalide"); }
        var subjectId  = payload.subjectId  || "";
        var detailPath = payload.detailPath || "";
        var se  = (payload.se  !== undefined) ? payload.se  : 0;
        var ep  = (payload.ep  !== undefined) ? payload.ep  : 0;
        // Langue du doublage choisie via la box langue (scanlator) — prioritaire
        var chapterDub = (payload.dub || "").toLowerCase();
        if (!subjectId) throw new Error("subjectId manquant dans l'URL de chapitre");

        var lang = chapterDub || this._prefLang();
        var j    = await this._fetchPlay(subjectId, detailPath, se, ep, lang);

        // Retry en anglais si la lang demandée n'a pas de ressource
        if ((!j || j.code !== 0 || !j.data || !j.data.hasResource) && lang !== "en") {
            var retry = await this._fetchPlay(subjectId, detailPath, se, ep, "en");
            if (retry && retry.code === 0 && retry.data && retry.data.hasResource) j = retry;
        }

        if (!j || j.code !== 0 || !j.data) {
            if (j && j.code === 403) throw new Error("Contenu g\u00E9o-bloqu\u00E9 — activez le bypass r\u00E9gion dans les param\u00E8tres de la source.");
            if (j && j.code === 401) throw new Error("Authentification requise.");
            throw new Error("Aucun flux disponible. (code=" + (j ? j.code : "err") + ")");
        }
        var data = j.data;
        if (!data.hasResource) throw new Error("\u00C9pisode non disponible pour le moment.");

        var refHdrs   = { "Referer": detailPath ? (MB_ORIG + "/movies/" + detailPath) : MB_ORIG + "/" };
        var prefSub   = this._prefSub();
        var prefDub   = chapterDub || this._prefDub();
        var bilingual = this._prefBilingual();
        var prefSub2  = this._prefBilingual2();
        var subtitles = [];

        // ── Sous-titres ─────────────────────────────────────────────
        try {
            var stream = (data.hls && data.hls[0]) ? data.hls[0]
                       : (data.streams && data.streams[0] ? data.streams[0] : null);
            if (stream && stream.id) {
                var fmt = (data.hls && data.hls.length) ? "HLS" : "MP4";

                // Captions : API native d'abord, fallback H5
                var cRes = null;
                try {
                    var capMUrl = MB_MOBILE_API + "/wefeed-mobile-bff/subject-api/get-stream-captions"
                        + "?streamId=" + stream.id
                        + "&subjectId=" + encodeURIComponent(subjectId)
                        + "&detailPath=" + encodeURIComponent(detailPath || "");
                    var cMRes = await new Client().get(capMUrl, this._h(lang, detailPath));
                    var cMJ; try { cMJ = JSON.parse(cMRes.body); } catch (_) {}
                    if (cMJ && cMJ.code === 0) cRes = cMRes;
                } catch (_) {}
                if (!cRes) {
                    var capUrl = MB_H5_API + "/wefeed-h5api-bff/subject/caption"
                        + "?format=" + fmt + "&id=" + stream.id
                        + "&subjectId=" + encodeURIComponent(subjectId)
                        + "&detailPath=" + encodeURIComponent(detailPath || "");
                    try { cRes = await new Client().get(capUrl, this._h(lang, detailPath)); } catch (_) {}
                }

                if (cRes) {
                    var cj; try { cj = JSON.parse(cRes.body); } catch (_) {}
                    if (cj && cj.code === 0 && cj.data && cj.data.captions) {
                        var caps = cj.data.captions;
                        for (var ci = 0; ci < caps.length; ci++) {
                            var c = caps[ci];
                            if (c && c.url) subtitles.push({
                                file:  c.url,
                                label: c.lanName || c.lan || "Sub",
                                lan:   (c.lan || "").toLowerCase()
                            });
                        }
                        // Langue préférée en tête
                        if (prefSub) {
                            for (var ssi = 0; ssi < subtitles.length; ssi++) {
                                if ((subtitles[ssi].lan || subtitles[ssi].label || "").toLowerCase().indexOf(prefSub) >= 0) {
                                    subtitles.unshift(subtitles.splice(ssi, 1)[0]); break;
                                }
                            }
                        }
                        // Mode bilingue (merge SRT)
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
                                            (typeof btoa === "function"
                                                ? btoa(unescape(encodeURIComponent(mg)))
                                                : Buffer.from(mg, "utf-8").toString("base64"));
                                        subtitles.unshift({
                                            file:  du,
                                            label: "\uD83C\uDE34 Bilingue (" + (tA.label || "") + " + " + (tB.label || "") + ")"
                                        });
                                    }
                                } catch (_) {}
                            }
                        }
                    }
                }
            }
        } catch (_) {}

        // ── Étiquette qualité/langue ───────────────────────────────
        function _buildVideoLabel(item, fmt, idx) {
            var LANG = {
                "en":"🇺🇸 English","english":"🇺🇸 English","eng":"🇺🇸 English",
                "fr":"🇫🇷 Français","french":"🇫🇷 Français","fra":"🇫🇷 Français",
                "es":"🇪🇸 Español","spanish":"🇪🇸 Español","spa":"🇪🇸 Español","esl":"🇪🇸 Español",
                "pt":"🇧🇷 Português","ptbr":"🇧🇷 Português","portuguese":"🇧🇷 Português","por":"🇧🇷 Português",
                "de":"🇩🇪 Deutsch","german":"🇩🇪 Deutsch","deu":"🇩🇪 Deutsch","ger":"🇩🇪 Deutsch",
                "it":"🇮🇹 Italiano","italian":"🇮🇹 Italiano","ita":"🇮🇹 Italiano",
                "ja":"🇯🇵 日本語","japanese":"🇯🇵 日本語","jpn":"🇯🇵 日本語",
                "ko":"🇰🇷 한국어","korean":"🇰🇷 한국어","kor":"🇰🇷 한국어",
                "zh":"🇨🇳 中文","chinese":"🇨🇳 中文","zho":"🇨🇳 中文","chi":"🇨🇳 中文",
                "ar":"🇸🇦 عربي","arabic":"🇸🇦 عربي","ara":"🇸🇦 عربي",
                "tr":"🇹🇷 Türkçe","turkish":"🇹🇷 Türkçe","tur":"🇹🇷 Türkçe",
                "ru":"🇷🇺 Русский","russian":"🇷🇺 Русский","rus":"🇷🇺 Русский",
                "hi":"🇮🇳 हिंदी","hindi":"🇮🇳 हिंदी","hin":"🇮🇳 हिंदी",
                "th":"🇹🇭 ไทย","thai":"🇹🇭 ไทย","tha":"🇹🇭 ไทย",
                "vi":"🇻🇳 Tiếng Việt","vietnamese":"🇻🇳 Tiếng Việt","vie":"🇻🇳 Tiếng Việt",
                "id":"🇮🇩 Indonesia","indonesian":"🇮🇩 Indonesia","ind":"🇮🇩 Indonesia",
                "ur":"🇵🇰 اردو","urdu":"🇵🇰 اردو",
                "bn":"🇧🇩 বাংলা","bengali":"🇧🇩 বাংলা",
                "fa":"🇮🇷 فارسی","persian":"🇮🇷 فارسی",
                "sw":"🌍 Kiswahili","swahili":"🌍 Kiswahili",
                "multi":"🌐 MULTI","original":"🇺🇸 English (VO)"
            };
            var raw = String(item.lan || item.lanCode || item.audioLan || item.lanName || item.language || "")
                .toLowerCase().replace(/[\s\-_]/g, "");
            if (/^pt.{0,2}br$/.test(raw)) raw = "ptbr";
            var langLabel = LANG[raw] || (item.lanName ? String(item.lanName).trim() : "");

            var DEF = {
                "4k":"4K","uhd":"4K","2k":"2160p",
                "fhd":"1080p","hq":"1080p","od":"1080p","fullhd":"1080p",
                "hd":"720p","sd":"480p","ld":"360p","sq":"360p","fd":"360p","auto":""
            };
            var resRaw = String(item.resolutions || item.resolution || item.definition || item.clarity || item.quality || "")
                .toLowerCase().replace(/p$/, "").replace(/[^0-9a-z]/g, "");
            var RES = {
                "2160":"4K","4k":"4K","uhd":"4K",
                "1080":"1080p","fullhd":"1080p","fhd":"1080p",
                "720":"720p","hd":"720p",
                "480":"480p","sd":"480p",
                "360":"360p","240":"240p","ld":"360p"
            };
            var resLabel = RES[resRaw] || DEF[resRaw] || (/^\d{3,4}$/.test(resRaw) ? resRaw + "p" : "");

            var parts = [];
            if (langLabel) parts.push(langLabel);
            if (resLabel)  parts.push(resLabel);
            if (!parts.length) parts.push(fmt + " " + (idx + 1));
            return parts.join(" \u00B7 ");
        }

        var out  = [];
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

        // ── dubsList : API native (doublages avec leurs propres streams) ──
        if (data.dubsList && data.dubsList.length) {
            var dubs = data.dubsList;
            if (prefDub) {
                for (var di = 0; di < dubs.length; di++) {
                    if ((dubs[di].lan || dubs[di].lanName || "").toLowerCase().indexOf(prefDub) >= 0) {
                        dubs.unshift(dubs.splice(di, 1)[0]); break;
                    }
                }
            }
            for (var dubi = 0; dubi < dubs.length; dubi++) {
                var dub        = dubs[dubi];
                var dubLan     = dub.lan     || "";
                var dubLanName = dub.lanName || dub.lan || "";
                var dubHls     = dub.hls || dub.dubs || [];
                for (var dhi = 0; dhi < dubHls.length; dhi++) {
                    var dh = Object.assign({}, dubHls[dhi]);
                    if (!dh.lan)     dh.lan     = dubLan;
                    if (!dh.lanName) dh.lanName = dubLanName;
                    if (dh && dh.url) out.push({
                        url: dh.url, originalUrl: dh.url,
                        quality: _buildVideoLabel(dh, "HLS", dhi),
                        headers: refH, subtitles: subs
                    });
                }
                var dubStreams = dub.streams || [];
                for (var dsi = 0; dsi < dubStreams.length; dsi++) {
                    var ds = Object.assign({}, dubStreams[dsi]);
                    if (!ds.lan)     ds.lan     = dubLan;
                    if (!ds.lanName) ds.lanName = dubLanName;
                    if (ds && ds.url) out.push({
                        url: ds.url, originalUrl: ds.url,
                        quality: _buildVideoLabel(ds, "MP4", dsi),
                        headers: refH, subtitles: subs
                    });
                }
            }
        }

        // ── Flux plats (H5 fallback ou native sans dubsList) ──────────
        if (data.hls && data.hls.length) {
            var hl = reorderDub(data.hls);
            for (var hi = 0; hi < hl.length; hi++) {
                var h2 = hl[hi];
                if (h2 && h2.url) out.push({
                    url: h2.url, originalUrl: h2.url,
                    quality: _buildVideoLabel(h2, "HLS", hi),
                    headers: refH, subtitles: subs
                });
            }
        }
        if (data.streams && data.streams.length) {
            var st = reorderDub(data.streams);
            for (var sti = 0; sti < st.length; sti++) {
                var s2 = st[sti];
                if (s2 && s2.url) out.push({
                    url: s2.url, originalUrl: s2.url,
                    quality: _buildVideoLabel(s2, "MP4", sti),
                    headers: refH, subtitles: subs
                });
            }
        }
        // Fallback minimal
        if (!out.length) {
            if (data.url)     out.push({ url: data.url,     originalUrl: data.url,     quality: "Auto", headers: refH, subtitles: subs });
            if (data.m3u8Url) out.push({ url: data.m3u8Url, originalUrl: data.m3u8Url, quality: "HLS",  headers: refH, subtitles: subs });
        }
        if (!out.length) throw new Error("Aucun flux trouv\u00E9 pour cet \u00E9pisode.");
        return out;
    }

    // ── Filtres de parcours ────────────────────────────────────────
    getFilterList() {
        return [
            {
                type_name: "SelectFilter",
                name: "Type",
                state: 0,
                values: [
                    { type_name: "SelectOption", name: "Tout",       value: "" },
                    { type_name: "SelectOption", name: "Film",       value: "1" },
                    { type_name: "SelectOption", name: "S\u00E9rie", value: "2" },
                    { type_name: "SelectOption", name: "Anime",      value: "5" },
                    { type_name: "SelectOption", name: "Animation",  value: "4" }
                ]
            },
            {
                type_name: "SelectFilter",
                name: "Genre",
                state: 0,
                values: [
                    { type_name: "SelectOption", name: "Tous",          value: "" },
                    { type_name: "SelectOption", name: "Action",        value: "Action" },
                    { type_name: "SelectOption", name: "Aventure",      value: "Adventure" },
                    { type_name: "SelectOption", name: "Animation",     value: "Animation" },
                    { type_name: "SelectOption", name: "Biographie",    value: "Biography" },
                    { type_name: "SelectOption", name: "Com\u00E9die",  value: "Comedy" },
                    { type_name: "SelectOption", name: "Crime",         value: "Crime" },
                    { type_name: "SelectOption", name: "Documentaire",  value: "Documentary" },
                    { type_name: "SelectOption", name: "Drame",         value: "Drama" },
                    { type_name: "SelectOption", name: "Fantastique",   value: "Fantasy" },
                    { type_name: "SelectOption", name: "Histoire",      value: "History" },
                    { type_name: "SelectOption", name: "Horreur",       value: "Horror" },
                    { type_name: "SelectOption", name: "Musique",       value: "Music" },
                    { type_name: "SelectOption", name: "Myst\u00E8re", value: "Mystery" },
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
                name: "Pays",
                state: 0,
                values: [
                    { type_name: "SelectOption", name: "Tous",       value: "" },
                    { type_name: "SelectOption", name: "US",         value: "US" },
                    { type_name: "SelectOption", name: "Cor\u00E9e", value: "KR" },
                    { type_name: "SelectOption", name: "Japon",      value: "JP" },
                    { type_name: "SelectOption", name: "Chine",      value: "CN" },
                    { type_name: "SelectOption", name: "France",     value: "FR" },
                    { type_name: "SelectOption", name: "UK",         value: "GB" },
                    { type_name: "SelectOption", name: "Inde",       value: "IN" },
                    { type_name: "SelectOption", name: "Nigeria",    value: "NG" },
                    { type_name: "SelectOption", name: "Italie",     value: "IT" },
                    { type_name: "SelectOption", name: "Allemagne",  value: "DE" },
                    { type_name: "SelectOption", name: "Espagne",    value: "ES" },
                    { type_name: "SelectOption", name: "Mexique",    value: "MX" },
                    { type_name: "SelectOption", name: "Tha\u00EFlande", value: "TH" }
                ]
            },
            {
                type_name: "SelectFilter",
                name: "Tri",
                state: 0,
                values: [
                    { type_name: "SelectOption", name: "Populaire",   value: "0" },
                    { type_name: "SelectOption", name: "R\u00E9cent", value: "1" },
                    { type_name: "SelectOption", name: "Mieux not\u00E9", value: "2" }
                ]
            }
        ];
    }

    // ── Paramètres utilisateur ─────────────────────────────────────
    setupPreferences() {
        return [
            // ── LANGUE ─────────────────────────────────────────────────
            {
                key: "mb_content_lang",
                listPreference: {
                    title:      "Langue — m\u00E9tadonn\u00E9es & titres",
                    summary:    "Envoie X-Language et X-Request-Lang \u00E0 l'API. Influe sur titres, descriptions et recommandations.",
                    valueIndex: 0,
                    entries:    [
                        "English",    "Fran\u00E7ais","Espa\u00F1ol","Portugu\u00EAs",
                        "\u0627\u0644\u0639\u0631\u0628\u064A\u0629",
                        "\u4E2D\u6587", "\u65E5\u672C\u8A9E",
                        "\uD55C\uAD6D\uC5B4",
                        "Hindi", "Indonesian", "Русский",
                        "T\u00FCrk\u00E7e","Portugu\u00EAs (BR)","Swahili"
                    ],
                    entryValues:[
                        "en", "fr",   "es",  "pt",
                        "ar",
                        "zh",  "ja",
                        "ko",
                        "hi",  "id",   "ru",
                        "tr",  "ptbr","sw"
                    ]
                }
            },
            // ── FAMILY MODE ────────────────────────────────────────────
            {
                key: "mb_family_mode",
                switchPreference: {
                    title:   "Family Mode (contr\u00F4le parental)",
                    summary: "Envoie X-Family-Mode: 1 — le serveur filtre le contenu 18+ et adulte.",
                    value:   false
                }
            },
            // ── BYPASS GÉO ─────────────────────────────────────────────
            {
                key: "mb_country",
                listPreference: {
                    title:      "Pays / R\u00E9gion (bypass g\u00E9o-blocage)",
                    summary:    "Envoie Accept-Country. Choisir un pays avec plus de contenu disponible si le v\u00F4tre est bloqu\u00E9.",
                    valueIndex: 0,
                    entries:    [
                        "Auto (d\u00E9tection serveur)",
                        "\uD83C\uDDFA\uD83C\uDDF8 United States",
                        "\uD83C\uDDEC\uD83C\uDDE7 United Kingdom",
                        "\uD83C\uDDF3\uD83C\uDDEC Nigeria",
                        "\uD83C\uDDF8\uD83C\uDDE6 South Africa",
                        "\uD83C\uDDF0\uD83C\uDDEA Kenya",
                        "\uD83C\uDDEC\uD83C\uDDED Ghana",
                        "\uD83C\uDDE8\uD83C\uDDE6 Canada",
                        "\uD83C\uDDE6\uD83C\uDDFA Australia",
                        "\uD83C\uDDEE\uD83C\uDDF3 India",
                        "\uD83C\uDDEB\uD83C\uDDF7 France",
                        "\uD83C\uDDE9\uD83C\uDDEA Germany",
                        "\uD83C\uDDE7\uD83C\uDDF7 Brazil",
                        "\uD83C\uDDEF\uD83C\uDDF5 Japan",
                        "\uD83C\uDDF0\uD83C\uDDF7 Korea"
                    ],
                    entryValues:["","US","GB","NG","ZA","KE","GH","CA","AU","IN","FR","DE","BR","JP","KR"]
                }
            },
            // ── FUSEAU HORAIRE ─────────────────────────────────────────
            {
                key: "mb_timezone",
                listPreference: {
                    title:      "Fuseau horaire (Accept-Timezone)",
                    summary:    "Influe sur les recommandations \u00E9ditoriales localis\u00E9es.",
                    valueIndex: 0,
                    entries:    [
                        "UTC (d\u00E9faut)",
                        "Africa/Lagos (WAT +1)",
                        "Africa/Nairobi (EAT +3)",
                        "Africa/Johannesburg (SAST +2)",
                        "America/New_York (ET)",
                        "America/Los_Angeles (PT)",
                        "America/Sao_Paulo (BRT)",
                        "Europe/Paris (CET)",
                        "Europe/London (GMT)",
                        "Asia/Tokyo (JST)",
                        "Asia/Seoul (KST)",
                        "Asia/Kolkata (IST)",
                        "Asia/Jakarta (WIB)"
                    ],
                    entryValues:[
                        "","Africa/Lagos","Africa/Nairobi","Africa/Johannesburg",
                        "America/New_York","America/Los_Angeles","America/Sao_Paulo",
                        "Europe/Paris","Europe/London",
                        "Asia/Tokyo","Asia/Seoul","Asia/Kolkata","Asia/Jakarta"
                    ]
                }
            },
            // ── MODE D'AFFICHAGE ───────────────────────────────────────
            {
                key: "mb_display_mode",
                listPreference: {
                    title:      "Mode d'affichage",
                    summary:    "Compact : 12 sections, 20 items/page. Standard : 25 sections, 30 items. Confort : toutes les sections, 40 items.",
                    valueIndex: 1,
                    entries:    ["Compact (rapide)", "Standard", "Confort (complet)"],
                    entryValues:["compact",           "standard", "confort"]
                }
            },
            // ── SOUS-TITRES ────────────────────────────────────────────
            {
                key: "mb_sub",
                listPreference: {
                    title:      "Langue des sous-titres",
                    summary:    "D\u00E9plac\u00E9e en t\u00EAte de liste si disponible",
                    valueIndex: 0,
                    entries:    ["English","Fran\u00E7ais","\u0627\u0644\u0639\u0631\u0628\u064A\u0629","Portugu\u00EAs","Indonesian","\u4E2D\u6587","\u0420\u0443\u0441\u0441\u043A\u0438\u0439","\u65E5\u672C\u8A9E","\uD55C\uAD6D\uC5B4","Espa\u00F1ol","Hindi"],
                    entryValues:["en","fr","ar","pt","id","zh","ru","ja","ko","es","hi"]
                }
            },
            // ── DOUBLAGE ───────────────────────────────────────────────
            {
                key: "mb_dub",
                listPreference: {
                    title:      "Langue du doublage (audio)",
                    summary:    "Utilis\u00E9e quand plusieurs pistes audio sont disponibles",
                    valueIndex: 0,
                    entries:    ["Automatique","English","Fran\u00E7ais","\u0627\u0644\u0639\u0631\u0628\u064A\u0629","Portugu\u00EAs","\u4E2D\u6587","\u65E5\u672C\u8A9E","\uD55C\uAD6D\uC5B4","Espa\u00F1ol","Hindi"],
                    entryValues:["","en","fr","ar","pt","zh","ja","ko","es","hi"]
                }
            },
            // ── SOUS-TITRES BILINGUES ──────────────────────────────────
            {
                key: "mb_bilingual",
                switchPreference: {
                    title:   "Sous-titres bilingues",
                    summary: "Affiche 2 langues de sous-titres superpos\u00E9es sur une seule piste",
                    value:   false
                }
            },
            {
                key: "mb_bilingual_second",
                listPreference: {
                    title:      "2\u00E8me langue (mode bilingue)",
                    summary:    "Combin\u00E9e avec la langue principale",
                    valueIndex: 0,
                    entries:    ["English","Fran\u00E7ais","\u0627\u0644\u0639\u0631\u0628\u064A\u0629","Portugu\u00EAs","Indonesian","\u4E2D\u6587","\u0420\u0443\u0441\u0441\u043A\u0438\u0439","\u65E5\u672C\u8A9E","\uD55C\uAD6D\uC5B4","Espa\u00F1ol"],
                    entryValues:["en","fr","ar","pt","id","zh","ru","ja","ko","es"]
                }
            }
        ];
    }
}
