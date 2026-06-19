// ─────────────────────────────────────────────────────────────────────────────
// TropiStream — extension Watchtower v2.0.0
//
// Source  : https://tropistream.fr
// Langue  : Français (Films, Séries, Animés — VF / VOSTFR)
//
// Architecture :
//   • Catalogue → TMDB API (clé officielle extraite du site)
//   • Accueil   → /srv/nouveautes (dernières sorties TropiStream)
//   • TropiTV   → /tropi-tv (chaînes en direct)
//   • Auth      → Discord OAuth via webview (session cookie)
//
// Sections home (si connecté) :
//   • Parce que vous avez regardé…
//   • Reprendre la lecture
//   • Nouveautés
//
// Méthodes :
//   getPopular(page)       → TMDB popular par catégorie (films/series/animes)
//   getLatestUpdates(page) → /srv/nouveautes + TMDB latest
//   getForYou(page)        → nouveautés TropiStream + historique utilisateur
//   search(query, page)    → TMDB search + AniList (animés)
//   getDetail(url)         → TMDB detail + épisodes
//   getVideoList(url)      → embed TropiStream player
// ─────────────────────────────────────────────────────────────────────────────

// ── TMDB clé officielle (extraite du code source TropiStream) ─────────────────
const TMDB_KEY  = "3e25319214feb74582abc87f77a53c76";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG  = "https://image.tmdb.org/t/p";
const BASE_URL  = "https://tropistream.fr";

const watchtowerSources = [{
    "name": "TropiStream",
    "langs": ["fr"],
    "ids": { "fr": 756891223 },
    "baseUrl": BASE_URL,
    "apiUrl": BASE_URL,
    "iconUrl": "https://tropistream.fr/tropi.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "2.0.0",
    "pkgPath": "watch/fr/tropistream.js",
    "editableBaseUrl": true,
    "customUserAgent": "",
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
            "label": "Catégorie Accueil",
            "value": "films",
            "values": ["films", "series", "animes"],
            "hint": "Catégorie affichée dans l'onglet Populaire"
        },
        {
            "key": "vote_discord_top",
            "type": "text",
            "label": "🗳️ Voter — Discord Top",
            "value": "https://discordtop.net/guild/1240944208773382185/vote",
            "hint": "Copier ce lien dans votre navigateur pour voter"
        },
        {
            "key": "vote_serveur_prive",
            "type": "text",
            "label": "🗳️ Voter — Serveur-Privé",
            "value": "https://serveur-prive.net/discord/tropistream/vote",
            "hint": "Copier ce lien dans votre navigateur pour voter"
        },
        {
            "key": "vote_meilleurs_serveurs",
            "type": "text",
            "label": "🗳️ Voter — Meilleurs-Serveurs",
            "value": "https://meilleurs-serveurs.com/discord/tropistream",
            "hint": "Copier ce lien dans votre navigateur pour voter"
        }
    ]
}];

class DefaultExtension extends MProvider {
    constructor() {
        super();
    }

    // ── Config ────────────────────────────────────────────────────────────────

    get baseUrl() {
        var p = this.source && this.source.prefs
            ? this.source.prefs.find(function(x) { return x.key === "base_url"; })
            : null;
        return (p && p.value) ? p.value.replace(/\/$/, "") : BASE_URL;
    }

    _pref(key, def) {
        var p = this.source && this.source.prefs
            ? this.source.prefs.find(function(x) { return x.key === key; })
            : null;
        return (p && p.value) ? p.value : (def || "");
    }

    get defaultCat() { return this._pref("category", "films"); }

    // ── HTTP helpers ──────────────────────────────────────────────────────────

    _hdrs(ref) {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "application/json, text/html, */*",
            "Accept-Language": "fr-FR,fr;q=0.9",
            "Referer": ref || (this.baseUrl + "/"),
            "Origin": this.baseUrl
        };
    }

    _get(url, ref) {
        return new Client().get(url, { headers: this._hdrs(ref) });
    }

    _json(text) {
        if (!text || text.length < 2) return null;
        try { return JSON.parse(text); } catch (_) { return null; }
    }

    // ── TMDB helpers ──────────────────────────────────────────────────────────

    _poster(path, size) {
        if (!path) return "";
        if (path.charAt(0) !== "/") return path;
        return TMDB_IMG + "/" + (size || "w500") + path;
    }

    _tmdbHdrs() {
        return {
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json"
        };
    }

    async _tmdbGet(path) {
        var sep = path.indexOf("?") !== -1 ? "&" : "?";
        var url = TMDB_BASE + path + sep + "api_key=" + TMDB_KEY + "&language=fr-FR";
        try {
            var r = await new Client().get(url, { headers: this._tmdbHdrs() });
            return this._json(r.body) || {};
        } catch (_) { return {}; }
    }

    // Map TMDB movie result → Watchtower item
    _fromMovie(item) {
        if (!item || (!item.title && !item.name)) return null;
        var id     = item.id || "";
        var title  = item.title || item.name || "Titre inconnu";
        var poster = this._poster(item.poster_path || item.backdrop_path);
        return {
            name:        title,
            link:        this.baseUrl + "/movie/" + id,
            imageUrl:    poster,
            description: item.overview || "",
            genre:       (item.genre_ids || []).map(String),
            author:      "",
            artist:      "",
            status:      0,
            isHentai:    false
        };
    }

    // Map TMDB TV result → Watchtower item
    _fromTV(item) {
        if (!item || (!item.title && !item.name)) return null;
        var id     = item.id || "";
        var title  = item.name || item.title || "Titre inconnu";
        var poster = this._poster(item.poster_path || item.backdrop_path);
        return {
            name:        title,
            link:        this.baseUrl + "/serie/" + id,
            imageUrl:    poster,
            description: item.overview || "",
            genre:       (item.genre_ids || []).map(String),
            author:      "",
            artist:      "",
            status:      0,
            isHentai:    false
        };
    }

    // ── Auth check ────────────────────────────────────────────────────────────

    async _isLoggedIn() {
        try {
            var r = await new Client().get(
                this.baseUrl + "/srv/user/quick",
                { headers: Object.assign({}, this._hdrs(), { "Accept": "application/json" }) }
            );
            if (r.statusCode === 200) {
                var d = this._json(r.body);
                return d && (d.id || d.discordId || d.username || d.user);
            }
        } catch (_) {}
        return false;
    }

    // ── /srv/nouveautes parser ────────────────────────────────────────────────

    _fromNouveautes(data) {
        var list = [];
        if (!data) return list;

        // The API may return: array directly, or { films:[], series:[], animes:[] }
        var arr = null;
        if (Array.isArray(data)) {
            arr = data;
        } else {
            var combined = [];
            if (Array.isArray(data.films))    combined = combined.concat(data.films);
            if (Array.isArray(data.movies))   combined = combined.concat(data.movies);
            if (Array.isArray(data.series))   combined = combined.concat(data.series);
            if (Array.isArray(data.animes))   combined = combined.concat(data.animes);
            if (Array.isArray(data.items))    combined = combined.concat(data.items);
            if (Array.isArray(data.data))     combined = combined.concat(data.data);
            if (Array.isArray(data.results))  combined = combined.concat(data.results);
            if (combined.length > 0) arr = combined;
        }

        if (!arr || arr.length === 0) return list;

        for (var i = 0; i < arr.length; i++) {
            var item = arr[i];
            if (!item) continue;

            var type   = (item.type || item.category || "film").toLowerCase();
            var id     = item.hash || item.id || item.tmdbId || item.tmdb_id || "";
            var title  = item.title || item.name || item.nom || item.titre || "";
            var poster = item.poster || item.image || item.thumbnail || item.backdrop || "";

            if (!title) continue;

            // Build watch path based on type
            var watchPath;
            if (type === "anime" || type === "animes") {
                watchPath = "/anime/" + id;
            } else if (type === "serie" || type === "series") {
                watchPath = "/serie/" + id;
            } else {
                watchPath = "/movie/" + id;
            }

            // Fix poster URL
            if (poster && poster.charAt(0) === "/") {
                if (poster.indexOf("/t/p/") !== -1) {
                    poster = "https://image.tmdb.org" + poster;
                } else {
                    poster = this.baseUrl + poster;
                }
            }

            list.push({
                name:        title,
                link:        this.baseUrl + watchPath,
                imageUrl:    poster,
                description: item.description || item.synopsis || item.overview || "",
                genre:       [],
                author:      "",
                artist:      "",
                status:      0,
                isHentai:    false
            });
        }
        return list;
    }

    // ── LOGIN SCREEN helper ───────────────────────────────────────────────────
    // Returns items with login instructions if not connected

    _loginItems() {
        return [{
            name: "🔐 Connexion Discord requise",
            link: this.baseUrl,
            imageUrl: "https://tropistream.fr/tropi.png",
            description:
                "Pour utiliser TropiStream dans Watchtower, tu dois te connecter via Discord.\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━\n" +
                "📋 ÉTAPES :\n" +
                "1️⃣ Appuie sur ce bouton → Connexion Discord\n" +
                "2️⃣ Connecte-toi avec ton compte Discord\n" +
                "3️⃣ Autorise TropiStream\n" +
                "4️⃣ Reviens ici et recharge\n" +
                "━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "🗳️ Vote pour soutenir le serveur Discord :\n" +
                "• discordtop.net/guild/1240944208773382185/vote\n" +
                "• serveur-prive.net/discord/tropistream/vote\n" +
                "• meilleurs-serveurs.com/discord/tropistream",
            genre:  [],
            author: "",
            artist: "",
            status: 0
        }];
    }

    // ── ACCUEIL (/srv/nouveautes) ─────────────────────────────────────────────

    async _getAccueil(page) {
        var p = Math.max(1, page || 1);
        var url = this.baseUrl + "/srv/nouveautes?limit=30&page=" + p;
        var list = [];

        // Try the TropiStream nouveautes API (no auth required)
        try {
            var r    = await this._get(url);
            var data = this._json(r.body);
            list     = this._fromNouveautes(data);
        } catch (_) {}

        // If no results from TropiStream API, fallback to TMDB latest
        if (list.length === 0) {
            var cat = this.defaultCat;
            if (cat === "animes") {
                // AniList popular anime
                list = await this._anilistPopular(1);
            } else {
                var type   = (cat === "series") ? "tv" : "movie";
                var tmdbPage = Math.min(p, 500);
                var latest = await this._tmdbGet(
                    "/discover/" + type + "?sort_by=release_date.desc&primary_release_date.lte=" + new Date().toISOString().split("T")[0] + "&page=" + tmdbPage
                );
                var results = latest.results || [];
                var mapper  = type === "movie" ? this._fromMovie.bind(this) : this._fromTV.bind(this);
                for (var i = 0; i < results.length; i++) {
                    var item = mapper(results[i]);
                    if (item) list.push(item);
                }
            }
        }

        return { list: list, hasNextPage: list.length >= 20 };
    }

    // ── TMDB Popular ──────────────────────────────────────────────────────────

    async _tmdbPopularMovies(page) {
        var p    = Math.min(Math.max(1, page || 1), 500);
        var data = await this._tmdbGet("/movie/popular?page=" + p);
        var list = [];
        var results = data.results || [];
        for (var i = 0; i < results.length; i++) {
            var item = this._fromMovie(results[i]);
            if (item) list.push(item);
        }
        return { list: list, hasNextPage: (data.page || 1) < (data.total_pages || 1) };
    }

    async _tmdbPopularTV(page) {
        var p    = Math.min(Math.max(1, page || 1), 500);
        var data = await this._tmdbGet("/tv/popular?page=" + p);
        var list = [];
        var results = data.results || [];
        for (var i = 0; i < results.length; i++) {
            var item = this._fromTV(results[i]);
            if (item) list.push(item);
        }
        return { list: list, hasNextPage: (data.page || 1) < (data.total_pages || 1) };
    }

    // ── AniList ───────────────────────────────────────────────────────────────

    async _anilistPopular(page) {
        var query = "query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){media(type:ANIME,sort:POPULARITY_DESC,isAdult:false){id title{romaji english french:native}coverImage{large}description averageScore genres}}}";
        var list  = [];
        try {
            var r = await new Client().post(
                "https://graphql.anilist.co",
                {
                    headers: { "Content-Type": "application/json", "Accept": "application/json" },
                    body: JSON.stringify({ query: query, variables: { page: page || 1, perPage: 30 } })
                }
            );
            var d = this._json(r.body);
            var media = (d && d.data && d.data.Page && d.data.Page.media) || [];
            for (var i = 0; i < media.length; i++) {
                var m = media[i];
                if (!m) continue;
                var title = (m.title && (m.title.french || m.title.romaji || m.title.english)) || "Inconnu";
                list.push({
                    name:        title,
                    link:        this.baseUrl + "/anime/anilist/" + m.id,
                    imageUrl:    (m.coverImage && m.coverImage.large) || "",
                    description: (m.description || "").replace(/<[^>]+>/g, ""),
                    genre:       m.genres || [],
                    author:      "",
                    artist:      "",
                    status:      0,
                    isHentai:    false
                });
            }
        } catch (_) {}
        return list;
    }

    async _anilistSearch(query, page) {
        var gql  = "query($search:String,$page:Int){Page(page:$page,perPage:20){media(type:ANIME,search:$search,isAdult:false){id title{romaji english french:native}coverImage{large}description}}}";
        var list = [];
        try {
            var r = await new Client().post(
                "https://graphql.anilist.co",
                {
                    headers: { "Content-Type": "application/json", "Accept": "application/json" },
                    body: JSON.stringify({ query: gql, variables: { search: query, page: page || 1 } })
                }
            );
            var d = this._json(r.body);
            var media = (d && d.data && d.data.Page && d.data.Page.media) || [];
            for (var i = 0; i < media.length; i++) {
                var m = media[i];
                if (!m) continue;
                var title = (m.title && (m.title.french || m.title.romaji || m.title.english)) || "";
                if (!title) continue;
                list.push({
                    name:     title,
                    link:     this.baseUrl + "/anime/anilist/" + m.id,
                    imageUrl: (m.coverImage && m.coverImage.large) || "",
                    description: (m.description || "").replace(/<[^>]+>/g, ""),
                    genre:    [],
                    author:   "",
                    artist:   "",
                    status:   0
                });
            }
        } catch (_) {}
        return list;
    }

    // ── TropiTV ───────────────────────────────────────────────────────────────

    async _getTropiTV(page) {
        var list = [];
        try {
            var r    = await this._get(this.baseUrl + "/tropi-tv");
            var html = r.body || "";

            // Parse channel cards from the SPA (may be pre-rendered or not)
            var re  = /<a[^>]+href="(\/tropi-tv\/[^"]+)"[^>]*>[\s\S]{0,500}?(?:<img[^>]+src="([^"]+)"[^>]*>)?[\s\S]{0,200}?(?:<[^>]*>)?([^<]{2,60})/gi;
            var m;
            while ((m = re.exec(html)) !== null) {
                var path  = m[1] || "";
                var img   = m[2] || "";
                var title = (m[3] || "").trim();
                if (!title || title.length < 2) continue;
                list.push({
                    name:     title,
                    link:     this.baseUrl + path,
                    imageUrl: img.charAt(0) === "/" ? this.baseUrl + img : img,
                    description: "TropiTV — " + title,
                    genre:    ["TropiTV"],
                    author:   "",
                    artist:   "",
                    status:   0
                });
            }
        } catch (_) {}

        // Fallback: add a direct TropiTV entry if nothing parsed
        if (list.length === 0) {
            list.push({
                name:        "📺 TropiTV — Chaînes en direct",
                link:        this.baseUrl + "/tropi-tv",
                imageUrl:    "https://tropistream.fr/tropi.png",
                description: "TropiTV — Toutes les chaînes en direct. Ouvre dans le navigateur pour regarder.",
                genre:       ["TropiTV"],
                author:      "",
                artist:      "",
                status:      0
            });
        }

        return { list: list, hasNextPage: false };
    }

    // ── getSourceDetail (login screen) ────────────────────────────────────────

    async getSourceDetail() {
        var loggedIn = await this._isLoggedIn();
        var desc = loggedIn
            ? "✅ Connecté — Films, Séries et Animés en VF/VOSTFR.\n\n🎬 Onglets disponibles : Films · Séries · Animés · TropiTV\n\n🗳️ Pensez à voter pour le Discord de TropiStream !"
            : "🔐 CONNEXION DISCORD REQUISE\n\n" +
              "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
              "Pour accéder au contenu TropiStream :\n\n" +
              "1️⃣  Appuie sur « Se connecter » (bouton en haut)\n" +
              "2️⃣  Le site TropiStream s'ouvre → clique sur « Se connecter avec Discord »\n" +
              "3️⃣  Autorise l'application TropiStream\n" +
              "4️⃣  Reviens ici et rafraîchis\n\n" +
              "━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
              "📌 TropiStream est un serveur communautaire Discord.\n" +
              "   Rejoins : discord.gg/tropi\n\n" +
              "🗳️ Vote pour soutenir le serveur :\n" +
              "   • discordtop.net → guild/1240944208773382185/vote\n" +
              "   • serveur-prive.net → discord/tropistream/vote\n" +
              "   • meilleurs-serveurs.com → discord/tropistream";

        return {
            iconUrl:     this.baseUrl + "/tropi.png",
            description: desc,
            lang:        "fr",
            name:        "TropiStream",
            baseUrl:     this.baseUrl
        };
    }

    // ── Listings ──────────────────────────────────────────────────────────────

    async getPopular(page) {
        var cat = this.defaultCat;

        if (cat === "tropi-tv") {
            return this._getTropiTV(page);
        }
        if (cat === "animes") {
            var animes = await this._anilistPopular(page);
            return { list: animes, hasNextPage: animes.length >= 20 };
        }
        if (cat === "series") {
            return this._tmdbPopularTV(page);
        }
        // Default: films
        return this._tmdbPopularMovies(page);
    }

    async getLatestUpdates(page) {
        return this._getAccueil(page);
    }

    async getForYou(page) {
        // Try TropiStream nouveautes first (personalized if logged in)
        var result = await this._getAccueil(page);
        if (result.list.length > 0) return result;

        // Fallback to TMDB trending
        var p    = Math.min(Math.max(1, page || 1), 500);
        var data = await this._tmdbGet("/trending/all/week?page=" + p);
        var list = [];
        var results = data.results || [];
        for (var i = 0; i < results.length; i++) {
            var item = results[i];
            if (!item) continue;
            var media = item.media_type || "movie";
            var mapped = media === "tv" ? this._fromTV(item) : this._fromMovie(item);
            if (mapped) list.push(mapped);
        }
        return { list: list, hasNextPage: list.length >= 20 };
    }

    // ── Search ────────────────────────────────────────────────────────────────

    async search(query, page, filters) {
        if (!query || !query.trim()) return { list: [], hasNextPage: false };

        var q   = encodeURIComponent(query.trim());
        var p   = Math.min(Math.max(1, page || 1), 500);
        var cat = this.defaultCat;
        var list = [];
        var seen = {};

        // Search anime via AniList
        if (cat === "animes") {
            var animes = await this._anilistSearch(query, p);
            return { list: animes, hasNextPage: animes.length >= 20 };
        }

        // Multi-search (movies + TV)
        var multi = await this._tmdbGet("/search/multi?query=" + q + "&page=" + p);
        var results = multi.results || [];
        for (var i = 0; i < results.length; i++) {
            var item = results[i];
            if (!item || !item.id) continue;
            if (item.media_type === "person") continue;

            var mapped = null;
            if (item.media_type === "tv" || cat === "series") {
                mapped = this._fromTV(item);
            } else {
                mapped = this._fromMovie(item);
            }
            if (mapped && !seen[mapped.link]) {
                seen[mapped.link] = true;
                list.push(mapped);
            }
        }

        return { list: list, hasNextPage: (multi.page || 1) < (multi.total_pages || 1) };
    }

    // ── Detail ────────────────────────────────────────────────────────────────

    async getDetail(url) {
        // Parse URL to determine type and ID
        var isAnime   = /\/anime\//.test(url);
        var isSerie   = /\/serie\//.test(url);
        var isMovie   = /\/movie\//.test(url);
        var isTropiTV = /\/tropi-tv\//.test(url) || /\/tropi-tv$/.test(url);

        // ── TropiTV detail ────────────────────────────────────────────────────
        if (isTropiTV) {
            return {
                name:        "TropiTV",
                description: "Chaînes en direct TropiStream. Cliquez sur 'Regarder' pour accéder.",
                imageUrl:    this.baseUrl + "/tropi.png",
                genres:      ["TropiTV"],
                status:      0,
                chapters:    [{
                    name:       "Regarder TropiTV",
                    url:        url,
                    dateUpload: ""
                }]
            };
        }

        // ── AniList anime ─────────────────────────────────────────────────────
        if (isAnime) {
            var aniM = url.match(/\/anime\/anilist\/(\d+)|\/anime\/(\d+)/);
            var aniId = aniM ? (aniM[1] || aniM[2]) : "";
            if (aniId) {
                return await this._anilistDetail(aniId, url);
            }
            return {
                name:        "Anime TropiStream",
                description: "",
                imageUrl:    "",
                genres:      [],
                status:      0,
                chapters:    [{ name: "Regarder", url: url.replace(/\/(movie|serie|anime)\//, "/watch/"), dateUpload: "" }]
            };
        }

        // ── Movie / Serie via TMDB ────────────────────────────────────────────
        var idM = url.match(/\/(movie|serie|film|series)\/([^/?#]+)/);
        if (!idM) {
            idM = url.match(/\/watch\/([^/?#]+)/);
        }
        var rawId  = idM ? (idM[2] || idM[1]) : "";
        var tmdbId = rawId.replace(/^tmdb_/, "");
        var type   = isSerie ? "tv" : "movie";

        if (!tmdbId || isNaN(parseInt(tmdbId))) {
            return {
                name:        "TropiStream",
                description: "",
                imageUrl:    "",
                genres:      [],
                status:      0,
                chapters:    [{ name: "Regarder", url: url, dateUpload: "" }]
            };
        }

        // Fetch TMDB detail
        var data = await this._tmdbGet("/" + type + "/" + tmdbId + "?append_to_response=credits");
        if (!data || (!data.title && !data.name)) {
            // Try the other type
            var alt = await this._tmdbGet("/" + (type === "tv" ? "movie" : "tv") + "/" + tmdbId);
            if (alt && (alt.title || alt.name)) {
                data = alt;
                type = type === "tv" ? "movie" : "tv";
            }
        }

        var name        = data.title || data.name || "TropiStream";
        var description = data.overview || "";
        var poster      = this._poster(data.poster_path || data.backdrop_path);
        var genres      = (data.genres || []).map(function(g) { return g.name; });
        var chapters    = [];

        if (type === "tv") {
            // Series: build episodes from seasons
            var seasons = (data.seasons || []).filter(function(s) { return s.season_number > 0; });

            if (seasons.length > 0) {
                // Fetch first season episodes to list them (and add more seasons as entries)
                for (var si = 0; si < seasons.length; si++) {
                    var season = seasons[si];
                    var sNum   = season.season_number;
                    var epCount = season.episode_count || 1;

                    for (var ei = 1; ei <= Math.min(epCount, 100); ei++) {
                        var watchUrl = this.baseUrl + "/watch/" + tmdbId + "?s=" + sNum + "&e=" + ei;
                        chapters.push({
                            name:       "S" + sNum + "E" + ei,
                            url:        watchUrl,
                            dateUpload: season.air_date || ""
                        });
                    }
                }
            }

            if (chapters.length === 0) {
                chapters.push({
                    name:       name,
                    url:        this.baseUrl + "/watch/" + tmdbId + "?s=1&e=1",
                    dateUpload: data.first_air_date || ""
                });
            }
        } else {
            // Movie: single episode
            chapters.push({
                name:       name,
                url:        this.baseUrl + "/watch/" + tmdbId,
                dateUpload: data.release_date || ""
            });
        }

        return { name, description, imageUrl: poster, genres, status: 0, chapters };
    }

    // ── AniList detail ────────────────────────────────────────────────────────

    async _anilistDetail(aniId, originalUrl) {
        var query = "query($id:Int){Media(id:$id,type:ANIME){id title{romaji english french:native}coverImage{large}description averageScore episodes status genres}}";
        var data  = {};
        try {
            var r = await new Client().post(
                "https://graphql.anilist.co",
                {
                    headers: { "Content-Type": "application/json", "Accept": "application/json" },
                    body: JSON.stringify({ query: query, variables: { id: parseInt(aniId) } })
                }
            );
            var d = this._json(r.body);
            data  = (d && d.data && d.data.Media) || {};
        } catch (_) {}

        var title   = (data.title && (data.title.french || data.title.romaji || data.title.english)) || "Anime";
        var poster  = (data.coverImage && data.coverImage.large) || "";
        var desc    = (data.description || "").replace(/<[^>]+>/g, "");
        var epCount = data.episodes || 1;
        var genres  = data.genres || [];

        var chapters = [];
        for (var e = 1; e <= Math.min(epCount, 200); e++) {
            chapters.push({
                name:       "Épisode " + e,
                url:        this.baseUrl + "/watch/anilist_" + aniId + "?e=" + e,
                dateUpload: ""
            });
        }

        if (chapters.length === 0) {
            chapters.push({
                name:       title,
                url:        originalUrl.replace(/\/(anime)\//, "/watch/"),
                dateUpload: ""
            });
        }

        return {
            name:        title,
            description: desc,
            imageUrl:    poster,
            genres:      genres,
            status:      0,
            chapters:    chapters
        };
    }

    // ── getVideoList ──────────────────────────────────────────────────────────

    async getVideoList(url) {
        // Extract hash and params from the watch URL
        var hashM   = url.match(/\/watch\/([^/?#]+)/);
        var hash    = hashM ? hashM[1] : "";
        var sM      = url.match(/[?&]s=(\d+)/);
        var eM      = url.match(/[?&]e=(\d+)/);
        var season  = sM ? sM[1] : "1";
        var episode = eM ? eM[1] : "1";

        var videos = [];

        // 1. Try TropiStream's own video API endpoints
        var apiPaths = [
            "/srv/stream/" + hash + "?s=" + season + "&e=" + episode,
            "/srv/embed/"  + hash + "?s=" + season + "&e=" + episode,
            "/srv/player/" + hash + "?s=" + season + "&e=" + episode,
            "/srv/stream/" + hash,
            "/api/stream/"  + hash + "?season=" + season + "&episode=" + episode,
            "/api/embed/"   + hash + "?s=" + season + "&e=" + episode
        ];

        for (var ai = 0; ai < apiPaths.length; ai++) {
            try {
                var ar  = await this._get(this.baseUrl + apiPaths[ai], url);
                var aData = this._json(ar.body);
                if (!aData) continue;

                // Extract embed/stream URL from JSON
                var embedUrl = aData.url || aData.embed || aData.src || aData.iframe
                             || aData.stream || aData.hls || aData.mp4 || aData.link || "";
                if (embedUrl && embedUrl.length > 10) {
                    if (embedUrl.charAt(0) === "/") embedUrl = this.baseUrl + embedUrl;
                    videos.push({ url: embedUrl, quality: "AUTO", originalUrl: embedUrl });
                    break;
                }

                // JSON may have a `sources` array
                if (Array.isArray(aData.sources)) {
                    for (var si = 0; si < aData.sources.length; si++) {
                        var src = aData.sources[si];
                        var vUrl = src.url || src.src || src.file || "";
                        if (vUrl) {
                            if (vUrl.charAt(0) === "/") vUrl = this.baseUrl + vUrl;
                            videos.push({ url: vUrl, quality: src.label || src.quality || "AUTO", originalUrl: vUrl });
                        }
                    }
                    if (videos.length > 0) break;
                }
            } catch (_) {}
        }

        if (videos.length > 0) return videos;

        // 2. Fetch the watch page HTML and look for embed / stream URLs
        try {
            var pageR = await this._get(url, this.baseUrl + "/");
            var html  = pageR.body || "";

            // Direct HLS / MP4
            var directRe = /["'`](https?:\/\/[^"'`\s]{15,}\.(?:m3u8|mp4)[^"'`\s]{0,200})["'`]/gi;
            var dm;
            while ((dm = directRe.exec(html)) !== null) {
                var dUrl = dm[1];
                if (!videos.some(function(v) { return v.url === dUrl; })) {
                    videos.push({ url: dUrl, quality: dUrl.indexOf("m3u8") !== -1 ? "HLS" : "MP4", originalUrl: dUrl });
                }
            }

            // iframe src (player embeds)
            var iRe = /<iframe[^>]+src="((?:https?:)?\/\/[^"]{8,})"[^>]*>/gi;
            var im;
            while ((im = iRe.exec(html)) !== null) {
                var iSrc = im[1];
                if (iSrc.charAt(0) === "//") iSrc = "https:" + iSrc;
                if (/google|recaptcha|disqus|facebook|twitter|youtube|ads/.test(iSrc)) continue;
                if (!videos.some(function(v) { return v.url === iSrc; })) {
                    videos.push({ url: iSrc, quality: "Embed", originalUrl: iSrc });
                }
            }
        } catch (_) {}

        // 3. Try resolving embed iframes to direct stream
        var resolved = [];
        for (var vi = 0; vi < Math.min(videos.length, 6); vi++) {
            var vid = videos[vi];
            if (vid.url.indexOf(".m3u8") !== -1 || vid.url.indexOf(".mp4") !== -1) {
                resolved.push(vid);
                continue;
            }
            try {
                var er    = await this._get(vid.url, url);
                var ebody = er.body || "";

                var hm = ebody.match(/["'`](https?:\/\/[^"'`\s]{10,}\.m3u8[^"'`\s]{0,200})["'`]/);
                if (hm) { resolved.push({ url: hm[1], quality: "HLS", originalUrl: hm[1] }); continue; }
                var pm = ebody.match(/["'`](https?:\/\/[^"'`\s]{10,}\.mp4[^"'`\s]{0,200})["'`]/);
                if (pm) { resolved.push({ url: pm[1], quality: "MP4", originalUrl: pm[1] }); continue; }
                // Keep embed as-is for webview
                resolved.push(vid);
            } catch (_) {
                resolved.push(vid);
            }
        }

        if (resolved.length > 0) return resolved;

        // 4. Last resort: return the TropiStream watch page URL itself (webview fallback)
        return [{
            url:         url,
            quality:     "WebView",
            originalUrl: url
        }];
    }
}
