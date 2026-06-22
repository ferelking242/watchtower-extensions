// ─────────────────────────────────────────────────────────────────────────────
// TropiStream — extension Watchtower v3.0.0
//
// Source : https://tropistream.fr
// Langue : Français (Films, Séries, Animés — VF / VOSTFR)
//
// Architecture (extraite du code source React/Vite du site) :
//   • /srv/list/{type}?all=true&sort=newest [credentials] → liste réelle + hashes
//   • /available-titles → { titles: { tmdbId: hash }, fallbacks } → filtre dispo
//   • /films/{hash}, /series/{hash} → info TMDB ID par hash
//   • /télécharger/{hash} → liens de téléchargement directs (CDN)
//   • Watch URL : /watch/{hash}?s=N&e=N  ou  /movie/{hash}  /serie/{hash}
//   • API TMDB (clé officielle TropiStream) → métadonnées, recherche
//   • AniList GraphQL → animés
//   • Auth : Discord OAuth via webview → session cookie
// ─────────────────────────────────────────────────────────────────────────────

const TMDB_KEY  = "3e25319214feb74582abc87f77a53c76";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG  = "https://image.tmdb.org/t/p";
const BASE_URL  = "https://tropistream.fr";

// Cache module-level (re-set each run, not persisted)
var _availCache    = null;   // { tmdbId(string) → hash(string) }
var _fallbackCache = null;
var _userCache     = null;   // user profile
var _lastUserFetch = 0;

const watchtowerSources = [{
    "name": "TropiStream",
    "langs": ["fr"],
    "ids": { "fr": 756891223 },
    "baseUrl": BASE_URL,
    "apiUrl": BASE_URL,
    "iconUrl": "https://tropistream.fr/tropi.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "3.0.1",
    "pkgPath": "watch/fr/tropistream.js",
    "editableBaseUrl": true,
    "videoQualities": ["AUTO", "VF", "VOSTFR", "VO"],
    "subCategories": ["films", "series", "animes", "tropi-tv"],
    "supportsForYou": true,
    "supportsComments": false,
    "requiresAccount": true,
    "loginUrl": BASE_URL,
    "appMinVerReq": "0.5.0",
    "sourceCodeLanguage": 1,
    "prefs": [
        {
            "key": "category",
            "type": "select",
            "label": "Catégorie par défaut",
            "value": "films",
            "values": ["films", "series", "animes", "tropi-tv"],
            "hint": "Catégorie affichée dans l'onglet Populaire"
        },
        {
            "key": "vote_1",
            "type": "text",
            "label": "🗳️ Voter — Discord Top (copier l'URL)",
            "value": "https://discordtop.net/guild/1240944208773382185/vote"
        },
        {
            "key": "vote_2",
            "type": "text",
            "label": "🗳️ Voter — Serveur-Privé",
            "value": "https://serveur-prive.net/discord/tropistream/vote"
        },
        {
            "key": "vote_3",
            "type": "text",
            "label": "🗳️ Voter — Meilleurs-Serveurs",
            "value": "https://meilleurs-serveurs.com/discord/tropistream"
        }
    ]
}];

class DefaultExtension extends MProvider {
    constructor() { super(); }

    // ── Helpers de base ───────────────────────────────────────────────────────

    get bUrl() { return BASE_URL; }

    _hdrs(ref) {
        return {
            "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
            "Accept":          "application/json, text/html, */*",
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
            "Referer":         ref || (this.bUrl + "/"),
            "Origin":          this.bUrl
        };
    }

    async _get(url, ref) {
        return new Client().get(url, { headers: this._hdrs(ref) });
    }

    _json(t) {
        if (!t || t.length < 2) return null;
        try { return JSON.parse(t); } catch (_) { return null; }
    }

    _pref(k, d) {
        var p = this.source && this.source.prefs ? this.source.prefs.find(function(x) { return x.key === k; }) : null;
        return (p && p.value) ? p.value : (d || "");
    }

    get cat() { return this._pref("category", "films"); }

    // ── TMDB ──────────────────────────────────────────────────────────────────

    _poster(path, sz) {
        if (!path) return "";
        if (path.indexOf("http") === 0) return path;
        if (path.charAt(0) !== "/") return path;
        return TMDB_IMG + "/" + (sz || "w500") + path;
    }

    async _tmdb(path) {
        var sep = path.indexOf("?") !== -1 ? "&" : "?";
        var url = TMDB_BASE + path + sep + "api_key=" + TMDB_KEY + "&language=fr-FR";
        try {
            var r = await new Client().get(url, { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } });
            return this._json(r.body) || {};
        } catch (_) { return {}; }
    }

    _mapMovie(item) {
        if (!item || (!item.title && !item.name)) return null;
        var id    = String(item.id || "");
        var title = item.title || item.name || "";
        return {
            name:        title,
            link:        this.bUrl + "/movie/" + id,
            imageUrl:    this._poster(item.poster_path || item.backdrop_path),
            description: item.overview || "",
            genre:       (item.genre_ids || []).map(String),
            author: "", artist: "", status: 0, isHentai: false
        };
    }

    _mapTV(item) {
        if (!item || (!item.title && !item.name)) return null;
        var id    = String(item.id || "");
        var title = item.name || item.title || "";
        return {
            name:        title,
            link:        this.bUrl + "/serie/" + id,
            imageUrl:    this._poster(item.poster_path || item.backdrop_path),
            description: item.overview || "",
            genre:       (item.genre_ids || []).map(String),
            author: "", artist: "", status: 0, isHentai: false
        };
    }

    // ── /available-titles → filtre contenu réel TropiStream ──────────────────
    // Retourne { tmdbId → tropiHash }

    async _availMap() {
        if (_availCache) return _availCache;
        try {
            var r = await this._get(this.bUrl + "/available-titles");
            var d = this._json(r.body);
            if (d && d.titles) {
                _availCache    = d.titles;
                _fallbackCache = d.fallbacks || {};
                return _availCache;
            }
        } catch (_) {}
        _availCache = {};
        return _availCache;
    }

    // Filtre un tableau TMDB (items avec .id) selon /available-titles
    // Enrichit chaque item avec son hash TropiStream et construit le bon lien
    _filterByAvail(items, type, avail) {
        var list = [];
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (!item || !item.id) continue;
            var sid  = String(item.id);
            var hash = avail[sid] || (_fallbackCache && _fallbackCache[sid]) || null;
            if (!hash && Object.keys(avail).length > 0) continue; // filtrer strictement si la map est chargée

            var mapped;
            if (type === "tv") {
                mapped = this._mapTV(item);
                if (mapped && hash) mapped.link = this.bUrl + "/serie/" + hash;
            } else {
                mapped = this._mapMovie(item);
                if (mapped && hash) mapped.link = this.bUrl + "/movie/" + hash;
            }
            if (mapped) list.push(mapped);
        }
        return list;
    }

    // ── /srv/list → contenu réel (authentifié) ────────────────────────────────

    async _srvList(type, page, allMode) {
        // type: "films", "series", "animes"
        var url;
        if (allMode) {
            url = this.bUrl + "/srv/list/" + type + "?all=true&sort=newest";
        } else {
            var p = Math.max(1, page || 1);
            url   = this.bUrl + "/srv/list/" + type + "?page=" + p + "&limit=30&sort=newest&all=false";
        }

        try {
            var r = await new Client().get(url, { headers: this._hdrs(this.bUrl + "/") });
            if (r.statusCode === 401 || r.statusCode === 403) return null; // not logged in
            var d = this._json(r.body);
            if (!d) return null;
            // Format: { results: [...], pagination: {...} } or just array
            var results = d.results || (Array.isArray(d) ? d : null);
            return results ? { results: results, pagination: d.pagination || null } : null;
        } catch (_) { return null; }
    }

    // Map un item de /srv/list → Watchtower item
    _mapSrvItem(item) {
        if (!item) return null;

        var hash  = item.hash || item.id || item._id || "";
        var type  = (item.type || item.category || item.mediaType || "film").toString().toLowerCase();
        var title = item.title || item.nom || item.name || item.titre || "";
        var poster = item.poster || item.image || item.thumbnail || item.cover
                  || (item.tmdb && item.tmdb.poster) || "";

        if (!title || !hash) return null;

        // Fix relative poster URLs
        if (poster && poster.charAt(0) === "/" && poster.indexOf("http") !== 0) {
            if (poster.indexOf("/t/p/") !== -1) {
                poster = "https://image.tmdb.org" + poster;
            } else {
                poster = this.bUrl + poster;
            }
        }

        // Build watch link based on type
        var watchType;
        if (type === "anime" || type === "animes") {
            watchType = "anime";
        } else if (type === "serie" || type === "series" || type === "tv") {
            watchType = "serie";
        } else {
            watchType = "movie";
        }

        var premium = item.premium || item.isPremium || item.isExclusive || false;

        return {
            name:        title + (premium ? " [PREMIUM]" : ""),
            link:        this.bUrl + "/" + watchType + "/" + hash,
            imageUrl:    poster,
            description: item.description || item.synopsis || item.overview || item.resume || "",
            genre:       (item.genres || item.genre || []).map(function(g) {
                             return typeof g === "string" ? g : (g.name || "");
                         }),
            author: "", artist: "", status: 0, isHentai: false
        };
    }

    // ── Auth / user ───────────────────────────────────────────────────────────

    async _getUser() {
        var now = Date.now();
        if (_userCache && (now - _lastUserFetch) < 120000) return _userCache;
        try {
            var r = await new Client().get(
                this.bUrl + "/srv/user/quick",
                { headers: this._hdrs() }
            );
            if (r.statusCode === 200) {
                var d = this._json(r.body);
                if (d && (d.id || d.discordId || d.username)) {
                    _userCache    = d;
                    _lastUserFetch = now;
                    return d;
                }
            }
        } catch (_) {}
        _userCache = null;
        return null;
    }

    async _isPremium() {
        var u = await this._getUser();
        if (!u) return false;
        return u.isPremium || u.isAdmin
            || (u.rolePermissions && (
                u.rolePermissions.includes("premium") ||
                u.rolePermissions.includes("admin") ||
                u.rolePermissions.includes("staff")
            ));
    }

    // ── Login screen ──────────────────────────────────────────────────────────

    _loginItems() {
        return [{
            name:        "🔐 Connexion Discord requise pour accéder au contenu",
            link:        this.bUrl,
            imageUrl:    "https://tropistream.fr/tropi.png",
            description:
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
                "COMMENT SE CONNECTER :\n\n" +
                "1️⃣  Appuie sur « Se connecter » en haut de la page\n" +
                "2️⃣  Le site TropiStream s'ouvre dans un navigateur intégré\n" +
                "3️⃣  Clique sur le bouton « Se connecter avec Discord » (en bleu)\n" +
                "4️⃣  Connecte-toi avec ton compte Discord et autorise TropiStream\n" +
                "5️⃣  Tu reviens automatiquement ici — rafraîchis la page\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "🗳️ Pense à voter pour soutenir le serveur TropiStream Discord !\n" +
                "   Liens de vote dans Préférences → Extension",
            genre: [], author: "", artist: "", status: 0
        }];
    }

    // ── AniList ───────────────────────────────────────────────────────────────

    async _aniPost(query, variables) {
        try {
            var r = await new Client().post(
                "https://graphql.anilist.co",
                {
                    headers: { "Content-Type": "application/json", "Accept": "application/json" },
                    body: JSON.stringify({ query: query, variables: variables })
                }
            );
            var d = this._json(r.body);
            return (d && d.data) ? d.data : null;
        } catch (_) { return null; }
    }

    _mapAnime(m) {
        if (!m) return null;
        var title = (m.title && (m.title.french || m.title.romaji || m.title.english)) || "";
        if (!title) return null;
        return {
            name:        title,
            link:        this.bUrl + "/anime/anilist/" + m.id,
            imageUrl:    (m.coverImage && m.coverImage.large) || "",
            description: (m.description || "").replace(/<[^>]+>/g, ""),
            genre:       m.genres || [],
            author: "", artist: "", status: 0, isHentai: false
        };
    }

    async _aniPopular(page) {
        var q   = "query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){media(type:ANIME,sort:POPULARITY_DESC,isAdult:false){id title{romaji english french:native}coverImage{large}description genres}}}";
        var d   = await this._aniPost(q, { page: page || 1, perPage: 30 });
        var arr = (d && d.Page && d.Page.media) || [];
        return arr.map(this._mapAnime.bind(this)).filter(Boolean);
    }

    async _aniSearch(q, page) {
        var gql = "query($search:String,$page:Int){Page(page:$page,perPage:20){media(type:ANIME,search:$search,isAdult:false){id title{romaji english french:native}coverImage{large}description}}}";
        var d   = await this._aniPost(gql, { search: q, page: page || 1 });
        var arr = (d && d.Page && d.Page.media) || [];
        return arr.map(this._mapAnime.bind(this)).filter(Boolean);
    }

    async _aniDetail(aniId) {
        var q = "query($id:Int){Media(id:$id,type:ANIME){id title{romaji english french:native}coverImage{large}description averageScore episodes status genres}}";
        var d = await this._aniPost(q, { id: parseInt(aniId) });
        return (d && d.Media) ? d.Media : null;
    }

    // ── TropiTV ───────────────────────────────────────────────────────────────

    async _tropiTV(page) {
        if (page > 1) return { list: [], hasNextPage: false };
        var list = [];
        try {
            var r    = await this._get(this.bUrl + "/tropi-tv");
            var html = r.body || "";
            var re   = /href="(\/tropi-tv\/[^"]+)"[^>]*>(?:[^<]*<[^>]+>)*([^<]{2,60})/gi;
            var m;
            while ((m = re.exec(html)) !== null) {
                var title = m[2].trim();
                if (!title || title.length < 2) continue;
                list.push({
                    name:        "📺 " + title,
                    link:        this.bUrl + m[1],
                    imageUrl:    this.bUrl + "/tropi.png",
                    description: "TropiTV — " + title + " — Chaîne en direct",
                    genre:       ["TropiTV"], author: "", artist: "", status: 0
                });
            }
        } catch (_) {}

        if (list.length === 0) {
            list.push({
                name:        "📺 TropiTV — Toutes les chaînes",
                link:        this.bUrl + "/tropi-tv",
                imageUrl:    this.bUrl + "/tropi.png",
                description: "Chaînes TV françaises en direct sur TropiStream.\nOuvrez dans le navigateur pour regarder.",
                genre:       ["TropiTV"], author: "", artist: "", status: 0
            });
        }
        return { list: list, hasNextPage: false };
    }

    // ── getSourceDetail ───────────────────────────────────────────────────────

    async getSourceDetail() {
        var user     = await this._getUser();
        var premium  = user ? await this._isPremium() : false;
        var desc;

        if (user) {
            var username = user.username || user.discordUsername || user.name || "Utilisateur";
            desc = (premium ? "👑 Premium · " : "✅ ") + "Connecté en tant que " + username + "\n\n"
                 + "🎬 Films, Séries, Animés — VF / VOSTFR\n"
                 + "📺 TropiTV — Chaînes en direct\n\n"
                 + (premium
                     ? "⭐ Accès Premium actif — contenu exclusif débloqué"
                     : "💎 Accès Premium disponible sur la boutique TropiStream");
        } else {
            desc = "🔐 CONNEXION DISCORD REQUISE\n\n"
                 + "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                 + "1️⃣  Appuie sur « Se connecter » (bouton en haut)\n"
                 + "2️⃣  Connecte-toi avec ton compte Discord\n"
                 + "3️⃣  Autorise TropiStream\n"
                 + "4️⃣  Reviens ici et rafraîchis\n"
                 + "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                 + "📌 TropiStream est une communauté Discord.\n"
                 + "   Rejoins : discord.gg/tropi";
        }

        return {
            iconUrl:     this.bUrl + "/tropi.png",
            description: desc,
            lang:        "fr",
            name:        "TropiStream",
            baseUrl:     this.bUrl
        };
    }

    // ── getPopular ────────────────────────────────────────────────────────────

    async getPopular(page) {
        var cat = this.cat;
        if (cat === "tropi-tv") return this._tropiTV(page);

        // 1. Essai /srv/list avec auth (contenu réel TropiStream)
        var srvData = await this._srvList(cat, page, false);
        if (srvData && srvData.results && srvData.results.length > 0) {
            var list = srvData.results.map(this._mapSrvItem.bind(this)).filter(Boolean);
            if (list.length > 0) {
                var pag = srvData.pagination;
                return {
                    list:        list,
                    hasNextPage: pag ? (pag.page || page) < (pag.totalPages || 1) : list.length >= 20
                };
            }
        }

        // 2. Fallback: TMDB filtré par /available-titles
        if (cat === "animes") {
            var animes = await this._aniPopular(page);
            return { list: animes, hasNextPage: animes.length >= 20 };
        }

        var avail   = await this._availMap();
        var tmdbType = cat === "series" ? "tv" : "movie";
        var p        = Math.min(Math.max(1, page || 1), 500);
        var tmdbData = await this._tmdb("/discover/" + tmdbType + "?sort_by=popularity.desc&page=" + p);
        var results  = tmdbData.results || [];
        var mapper   = tmdbType === "tv" ? this._mapTV.bind(this) : this._mapMovie.bind(this);

        // Si available-titles a du contenu, filtrer ; sinon montrer tout
        var list;
        if (Object.keys(avail).length > 0) {
            list = this._filterByAvail(results, tmdbType, avail);
        } else {
            list = results.map(mapper).filter(Boolean);
        }

        return {
            list:        list,
            hasNextPage: (tmdbData.page || 1) < (tmdbData.total_pages || 1) && list.length > 0
        };
    }

    // ── getLatestUpdates (Accueil — Nouveautés) ───────────────────────────────

    async getLatestUpdates(page) {
        var p    = Math.max(1, page || 1);
        var list = [];

        // 1. /srv/list toutes catégories (les plus récentes)
        var cats  = ["films", "series", "animes"];
        var avail = await this._availMap();

        for (var ci = 0; ci < cats.length; ci++) {
            var srvData = await this._srvList(cats[ci], p, p === 1);
            if (srvData && srvData.results && srvData.results.length > 0) {
                var items = srvData.results.slice(0, 10).map(this._mapSrvItem.bind(this)).filter(Boolean);
                list = list.concat(items);
            }
        }

        // 2. Essai /srv/nouveautes si rien trouvé
        if (list.length === 0) {
            try {
                var r    = await this._get(this.bUrl + "/srv/nouveautes?limit=30&page=" + p);
                var data = this._json(r.body);
                list     = this._fromNouveautes(data, avail);
            } catch (_) {}
        }

        // 3. Fallback TMDB trending
        if (list.length === 0) {
            var tmdbP   = Math.min(p, 500);
            var tData   = await this._tmdb("/trending/all/week?page=" + tmdbP);
            var results = tData.results || [];
            for (var ri = 0; ri < results.length; ri++) {
                var item   = results[ri];
                var sid    = String(item.id || "");
                var hash   = avail[sid] || null;
                var mapped = item.media_type === "tv" ? this._mapTV(item) : this._mapMovie(item);
                if (mapped && hash) {
                    mapped.link = this.bUrl + (item.media_type === "tv" ? "/serie/" : "/movie/") + hash;
                }
                if (mapped && (Object.keys(avail).length === 0 || hash)) list.push(mapped);
            }
        }

        return { list: list, hasNextPage: list.length >= 15 };
    }

    // ── getForYou (Accueil complet : nouveautés + sections) ──────────────────

    async getForYou(page) {
        return this.getLatestUpdates(page);
    }

    // ── Parseur /srv/nouveautes ───────────────────────────────────────────────

    _fromNouveautes(data, avail) {
        var list = [];
        if (!data) return list;

        var arr = null;
        if (Array.isArray(data)) {
            arr = data;
        } else {
            var combined = [];
            ["films", "movies", "series", "animes", "items", "data", "results"].forEach(function(k) {
                if (Array.isArray(data[k])) combined = combined.concat(data[k]);
            });
            if (combined.length > 0) arr = combined;
        }
        if (!arr || arr.length === 0) return list;

        for (var i = 0; i < arr.length; i++) {
            var item = arr[i];
            if (!item) continue;
            var mapped = this._mapSrvItem(item);
            if (!mapped) continue;

            // Enrichir le lien avec le hash /available-titles si dispo
            if (avail && item.tmdbId) {
                var h = avail[String(item.tmdbId)] || avail[String(item.tmdb && item.tmdb.id)];
                if (h) {
                    var tp = (item.type || "film").toLowerCase();
                    var typeSlug = tp === "anime" ? "anime" : tp === "serie" ? "serie" : "movie";
                    mapped.link = this.bUrl + "/" + typeSlug + "/" + h;
                }
            }
            list.push(mapped);
        }
        return list;
    }

    // ── search ────────────────────────────────────────────────────────────────

    async search(query, page, filters) {
        if (!query || !query.trim()) return { list: [], hasNextPage: false };

        var q   = query.trim();
        var p   = Math.min(Math.max(1, page || 1), 500);
        var cat = this.cat;

        // Animés via AniList
        if (cat === "animes") {
            var animes = await this._aniSearch(q, p);
            return { list: animes, hasNextPage: animes.length >= 20 };
        }

        var avail = await this._availMap();
        var enc   = encodeURIComponent(q);
        var multi = await this._tmdb("/search/multi?query=" + enc + "&page=" + p);
        var results = multi.results || [];
        var list  = [];
        var seen  = {};

        for (var i = 0; i < results.length; i++) {
            var item = results[i];
            if (!item || !item.id || item.media_type === "person") continue;

            var sid  = String(item.id);
            var hash = avail[sid] || (_fallbackCache && _fallbackCache[sid]) || null;

            // Si la map est chargée → filtrer ; sinon montrer tout
            if (Object.keys(avail).length > 0 && !hash) continue;

            var mapped = item.media_type === "tv" ? this._mapTV(item) : this._mapMovie(item);
            if (!mapped || seen[mapped.link]) continue;

            // Remplacer le lien TMDB par le lien hash TropiStream si disponible
            if (hash) {
                var typeSlug = item.media_type === "tv" ? "serie" : "movie";
                mapped.link  = this.bUrl + "/" + typeSlug + "/" + hash;
            }

            seen[mapped.link] = true;
            list.push(mapped);
        }

        // Si aucun résultat filtré mais la recherche a des résultats → montrer tout (available-titles pas chargé ou vide)
        if (list.length === 0 && results.length > 0 && Object.keys(avail).length === 0) {
            for (var j = 0; j < results.length; j++) {
                var r = results[j];
                if (!r || !r.id || r.media_type === "person") continue;
                var m = r.media_type === "tv" ? this._mapTV(r) : this._mapMovie(r);
                if (m) list.push(m);
            }
        }

        return { list: list, hasNextPage: (multi.page || 1) < (multi.total_pages || 1) };
    }

    // ── getDetail ─────────────────────────────────────────────────────────────

    async getDetail(url) {
        // Déterminer type et identifiant depuis l'URL
        var isAnime   = /\/anime\//.test(url);
        var isSerie   = /\/serie\//.test(url);
        var isTropiTV = /\/tropi-tv/.test(url);

        // ── TropiTV ───────────────────────────────────────────────────────────
        if (isTropiTV) {
            var slug = (url.match(/\/tropi-tv\/([^/?#]+)/) || [])[1] || "";
            return {
                name:        slug ? "TropiTV — " + slug : "TropiTV",
                description: "Chaîne en direct TropiStream. Appuie sur Regarder pour lancer.",
                imageUrl:    this.bUrl + "/tropi.png",
                genres:      ["TropiTV", "Direct"],
                status:      0,
                chapters:    [{ name: "Regarder en direct", url: url, dateUpload: "" }]
            };
        }

        // ── Animé ─────────────────────────────────────────────────────────────
        if (isAnime) {
            var aniM = url.match(/\/anime\/(?:anilist\/)?(\d+)/);
            if (aniM) return await this._aniDetailFull(aniM[1], url);
        }

        // Extraire le hash/id de l'URL : /movie/hash, /serie/hash, /watch/hash
        var rawId = "";
        var typeGuess = "movie";
        var m = url.match(/\/(movie|serie|film|series|watch)\/([^/?#]+)/);
        if (m) {
            rawId     = m[2];
            typeGuess = (m[1] === "serie" || m[1] === "series") ? "tv" : "movie";
            if (isSerie) typeGuess = "tv";
        }

        if (!rawId) {
            return { name: "TropiStream", description: "", imageUrl: "", genres: [], status: 0, chapters: [] };
        }

        // Déterminer si rawId est un hash TropiStream ou un TMDB ID
        var isTmdbId = /^\d+$/.test(rawId);
        var tmdbId   = null;
        var trHash   = null;

        if (isTmdbId) {
            tmdbId = rawId;
            // Chercher le hash TropiStream depuis /available-titles
            var avail = await this._availMap();
            trHash    = avail[rawId] || (_fallbackCache && _fallbackCache[rawId]) || rawId;
        } else {
            // rawId est un hash TropiStream → récupérer le TMDB ID
            trHash = rawId;
            tmdbId = await this._hashToTmdbId(rawId, typeGuess === "tv" ? "series" : "films");
        }

        if (!tmdbId) {
            // Rien trouvé → retourner un chapter direct
            return {
                name: "TropiStream", description: "", imageUrl: "",
                genres: [], status: 0,
                chapters: [{
                    name: "Regarder",
                    url:  this.bUrl + "/watch/" + trHash,
                    dateUpload: ""
                }]
            };
        }

        // Fetch TMDB detail
        var tmdbType = typeGuess;
        var detail   = await this._tmdb("/" + tmdbType + "/" + tmdbId + "?append_to_response=credits");
        if (!detail || (!detail.title && !detail.name)) {
            // Try other type
            var alt = tmdbType === "tv" ? "movie" : "tv";
            var d2  = await this._tmdb("/" + alt + "/" + tmdbId);
            if (d2 && (d2.title || d2.name)) { detail = d2; tmdbType = alt; }
        }

        if (!detail || (!detail.title && !detail.name)) {
            return {
                name: rawId, description: "", imageUrl: "",
                genres: [], status: 0,
                chapters: [{
                    name: "Regarder",
                    url:  this.bUrl + "/watch/" + trHash,
                    dateUpload: ""
                }]
            };
        }

        var name     = detail.title || detail.name || "TropiStream";
        var desc     = detail.overview || "";
        var poster   = this._poster(detail.poster_path || detail.backdrop_path);
        var genres   = (detail.genres || []).map(function(g) { return g.name; });
        var chapters = [];

        var premium  = await this._isPremium();
        var watchBase = this.bUrl + "/watch/" + trHash;

        if (tmdbType === "tv") {
            // Séries : saisons + épisodes
            var seasons = (detail.seasons || []).filter(function(s) { return s.season_number > 0; });

            if (seasons.length > 0) {
                for (var si = 0; si < seasons.length; si++) {
                    var season   = seasons[si];
                    var sNum     = season.season_number;
                    var epCount  = season.episode_count || 1;

                    for (var ei = 1; ei <= Math.min(epCount, 200); ei++) {
                        var watchUrl = watchBase + "?s=" + sNum + "&e=" + ei + (premium ? "&pref=premium" : "");
                        chapters.push({
                            name:       "S" + sNum + "E" + String(ei).padStart(2, "0"),
                            url:        watchUrl,
                            dateUpload: season.air_date || ""
                        });
                    }
                }
            }

            if (chapters.length === 0) {
                chapters.push({
                    name:       "S1E01",
                    url:        watchBase + "?s=1&e=1" + (premium ? "&pref=premium" : ""),
                    dateUpload: detail.first_air_date || ""
                });
            }
        } else {
            // Film
            var movieUrl = watchBase + (premium ? "?pref=premium" : "");
            chapters.push({
                name:       name,
                url:        movieUrl,
                dateUpload: detail.release_date || ""
            });
        }

        return { name: name, description: desc, imageUrl: poster, genres: genres, status: 0, chapters: chapters };
    }

    // Résoudre hash TropiStream → TMDB ID via /films/{hash} ou /series/{hash}
    async _hashToTmdbId(hash, apiType) {
        var types = apiType === "series" ? ["series", "films"] : ["films", "series"];
        for (var i = 0; i < types.length; i++) {
            try {
                var r = await this._get(this.bUrl + "/" + types[i] + "/" + hash);
                if (r.statusCode === 200) {
                    var d = this._json(r.body);
                    if (d) {
                        var tid = (d.tmdb && d.tmdb.id) || d.tmdbId || d.tmdb_id || null;
                        if (tid) return String(tid);
                    }
                }
            } catch (_) {}
        }
        return null;
    }

    // Détail animé complet via AniList
    async _aniDetailFull(aniId, originalUrl) {
        var data     = await this._aniDetail(aniId);
        var title    = data ? ((data.title && (data.title.french || data.title.romaji || data.title.english)) || "Anime") : "Anime";
        var poster   = data ? ((data.coverImage && data.coverImage.large) || "") : "";
        var desc     = data ? ((data.description || "").replace(/<[^>]+>/g, "")) : "";
        var epCount  = data ? (data.episodes || 1) : 1;
        var genres   = data ? (data.genres || []) : [];
        var chapters = [];

        for (var e = 1; e <= Math.min(epCount, 500); e++) {
            chapters.push({
                name:       "Épisode " + e,
                url:        this.bUrl + "/watch/anilist_" + aniId + "?e=" + e,
                dateUpload: ""
            });
        }

        if (chapters.length === 0) {
            chapters.push({ name: title, url: this.bUrl + "/anime/anilist/" + aniId, dateUpload: "" });
        }

        return { name: title, description: desc, imageUrl: poster, genres: genres, status: 0, chapters: chapters };
    }

    // ── getVideoList ──────────────────────────────────────────────────────────
    // Extrait les URLs de streaming depuis la page de téléchargement et le watch

    async getVideoList(url) {
        // Parser l'URL
        var hashM   = url.match(/\/watch\/([^/?#]+)/);
        var hash    = hashM ? hashM[1] : "";
        var sM      = url.match(/[?&]s=(\d+)/);
        var eM      = url.match(/[?&]e=(\d+)/);
        var season  = sM ? sM[1] : "1";
        var episode = eM ? eM[1] : "1";
        var prem    = /pref=premium/.test(url);

        // Si hash non trouvé, essayer d'extraire depuis /movie/ ou /serie/
        if (!hash) {
            var m2 = url.match(/\/(movie|serie|film|anime)\/([^/?#]+)/);
            if (m2) hash = m2[2];
        }

        var videos = [];

        // ── 1. Page téléchargement /télécharger/{hash} → liens directs CDN ──
        if (hash) {
            try {
                var dlUrl = this.bUrl + "/télécharger/" + hash
                          + (season !== "1" || episode !== "1" ? "?s=" + season + "&e=" + episode : "");
                var dlR   = await this._get(dlUrl, url);
                if (dlR.statusCode === 200) {
                    var dlHtml = dlR.body || "";
                    // Chercher des liens directs (.mp4, .mkv, .m3u8, cdn.*)
                    var dlRe   = /href="(https?:\/\/[^"]{10,}\.(?:mp4|mkv|m3u8|ts)[^"]{0,200})"/gi;
                    var dm;
                    while ((dm = dlRe.exec(dlHtml)) !== null) {
                        var vUrl = dm[1];
                        if (!videos.some(function(v) { return v.url === vUrl; })) {
                            videos.push({ url: vUrl, quality: vUrl.indexOf("m3u8") !== -1 ? "HLS" : "MP4", originalUrl: vUrl });
                        }
                    }
                    // JSON dans le HTML (data-sources ou __DATA__)
                    var jsonRe = /\[\s*\{[^<]{20,5000}"url"\s*:\s*"(https?:\/\/[^"]{10,})"/gi;
                    var jm;
                    while ((jm = jsonRe.exec(dlHtml)) !== null) {
                        var ju = jm[1];
                        if (!videos.some(function(v) { return v.url === ju; })) {
                            videos.push({ url: ju, quality: "AUTO", originalUrl: ju });
                        }
                    }
                }
            } catch (_) {}
        }

        if (videos.length > 0) return videos;

        // ── 2. Watch page HTML (SPA → peut avoir des balises JSON inline) ────
        try {
            var watchUrl = hash ? (this.bUrl + "/watch/" + hash + "?s=" + season + "&e=" + episode + (prem ? "&pref=premium" : "")) : url;
            var wr       = await this._get(watchUrl, this.bUrl + "/");
            var wHtml    = wr.body || "";

            // HLS / MP4 directs dans le HTML
            var directRe = /["'](https?:\/\/[^"']{10,}\.(m3u8|mp4)[^"']{0,300})["']/gi;
            var dm2;
            while ((dm2 = directRe.exec(wHtml)) !== null) {
                var du = dm2[1];
                if (/google|recaptcha|facebook|static/.test(du)) continue;
                if (!videos.some(function(v) { return v.url === du; })) {
                    videos.push({ url: du, quality: du.indexOf("m3u8") !== -1 ? "HLS" : "MP4", originalUrl: du });
                }
            }

            // iframes embed
            var iRe = /<iframe[^>]+src="((?:https?:)?\/\/[^"]{8,})"[^>]*>/gi;
            var im;
            while ((im = iRe.exec(wHtml)) !== null) {
                var iSrc = im[1];
                if (iSrc.charAt(0) === "//") iSrc = "https:" + iSrc;
                if (/google|recaptcha|disqus|facebook|twitter|ads|analytics/.test(iSrc)) continue;
                if (!videos.some(function(v) { return v.url === iSrc; })) {
                    videos.push({ url: iSrc, quality: "Embed", originalUrl: iSrc });
                }
            }
        } catch (_) {}

        // ── 3. Résoudre les embeds → HLS/MP4 ─────────────────────────────────
        if (videos.length > 0) {
            var resolved = [];
            for (var vi = 0; vi < Math.min(videos.length, 5); vi++) {
                var vid = videos[vi];
                if (vid.url.indexOf(".m3u8") !== -1 || vid.url.indexOf(".mp4") !== -1) {
                    resolved.push(vid);
                    continue;
                }
                try {
                    var er    = await this._get(vid.url, url);
                    var ebody = er.body || "";

                    var hm = ebody.match(/["'`](https?:\/\/[^"'`\s]{10,}\.m3u8[^"'`\s]{0,300})["'`]/);
                    if (hm) { resolved.push({ url: hm[1], quality: "HLS", originalUrl: hm[1] }); continue; }
                    var pm = ebody.match(/["'`](https?:\/\/[^"'`\s]{10,}\.mp4[^"'`\s]{0,300})["'`]/);
                    if (pm) { resolved.push({ url: pm[1], quality: "MP4", originalUrl: pm[1] }); continue; }
                    resolved.push(vid);
                } catch (_) { resolved.push(vid); }
            }
            if (resolved.length > 0) return resolved;
        }

        // ── 4. Fallback : retourner la watch URL pour WebView ─────────────────
        var finalUrl = hash
            ? (this.bUrl + "/watch/" + hash + "?s=" + season + "&e=" + episode + (prem ? "&pref=premium" : ""))
            : url;

        return [{
            url:         finalUrl,
            quality:     "WebView",
            originalUrl: finalUrl
        }];
    }
}
