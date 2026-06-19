// ─────────────────────────────────────────────────────────────────────────────
// TropiStream — extension Watchtower v1.0.0
//
// Source  : https://tropistream.fr
// Langue  : Français (Films, Séries, Animés — VF / VOSTFR)
//
// Auth    : Discord OAuth (webview) — connexion requise pour le contenu
//
// Méthodes :
//   getPopular(page)        → /srv/list/film  (films populaires)
//   getLatestUpdates(page)  → /srv/nouveautes (dernières sorties)
//   getForYou(page)         → /srv/nouveautes (tout type)
//   search(query, page)     → recherche multi-type (film/serie/anime)
//   getDetail(url)          → fiche complète + épisodes
//   getVideoList(url)       → extraction iframe embed
//
// Notes :
//   • Connexion Discord requise (bouton Connexion → webview Discord OAuth)
//   • Vote Discord optionnel dans les préférences (3 sites)
//   • subCategories : film, serie, anime
// ─────────────────────────────────────────────────────────────────────────────

const watchtowerSources = [{
    "name": "TropiStream",
    "langs": ["fr"],
    "ids": { "fr": 756891223 },
    "baseUrl": "https://tropistream.fr",
    "apiUrl": "https://tropistream.fr",
    "iconUrl": "https://tropistream.fr/tropi.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.0.0",
    "pkgPath": "watch/fr/tropistream.js",
    "editableBaseUrl": true,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "VF", "VOSTFR", "VO"],
    "subCategories": ["film", "serie", "anime"],
    "supportsForYou": true,
    "supportsComments": false,
    "requiresAccount": true,
    "loginUrl": "https://tropistream.fr",
    "appMinVerReq": "0.5.0",
    "sourceCodeLanguage": 1,
    "prefs": [
        {
            "key": "category",
            "type": "select",
            "label": "Catégorie par défaut",
            "value": "film",
            "values": ["film", "serie", "anime"],
            "hint": "Catégorie affichée dans l'onglet Populaire"
        },
        {
            "key": "vote_discord",
            "type": "text",
            "label": "Voter sur Discord Top",
            "value": "https://discordtop.net/guild/1240944208773382185/vote",
            "hint": "Lien de vote Discord Top (ouvrir dans le navigateur)"
        },
        {
            "key": "vote_serveur_prive",
            "type": "text",
            "label": "Voter sur Serveur-Privé",
            "value": "https://serveur-prive.net/discord/tropistream/vote",
            "hint": "Lien de vote Serveur-Privé (ouvrir dans le navigateur)"
        },
        {
            "key": "vote_meilleurs_serveurs",
            "type": "text",
            "label": "Voter sur Meilleurs-Serveurs",
            "value": "https://meilleurs-serveurs.com/discord/tropistream",
            "hint": "Lien de vote Meilleurs-Serveurs (ouvrir dans le navigateur)"
        }
    ]
}];

const BASE_URL = "https://tropistream.fr";

class DefaultExtension extends MProvider {
    constructor() {
        super();
    }

    // ── Config ────────────────────────────────────────────────────────────────

    get baseUrl() {
        const p = this.source.prefs
            ? this.source.prefs.find(function(x) { return x.key === "base_url"; })
            : null;
        return (p && p.value) ? p.value.replace(/\/$/, "") : BASE_URL;
    }

    _getPref(key) {
        const p = this.source.prefs
            ? this.source.prefs.find(function(x) { return x.key === key; })
            : null;
        return (p && p.value) ? p.value : null;
    }

    get defaultCategory() {
        return this._getPref("category") || "film";
    }

    // ── HTTP helpers ──────────────────────────────────────────────────────────

    _hdrs(ref) {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "application/json, text/html, */*",
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
            "Referer": ref || (this.baseUrl + "/"),
            "Origin": this.baseUrl
        };
    }

    _jsonHdrs(ref) {
        return Object.assign({}, this._hdrs(ref), {
            "Accept": "application/json",
            "Content-Type": "application/json"
        });
    }

    // ── JSON parse helper ─────────────────────────────────────────────────────

    _parseJson(text) {
        if (!text || text.length < 2) return null;
        try { return JSON.parse(text); } catch (_) { return null; }
    }

    // ── Content item normalizer ───────────────────────────────────────────────
    // TropiStream API response fields (best-effort, may vary):
    //   hash, title, name, poster, image, thumbnail, type, year, genre
    //   tmdb_id, description, synopsis, score

    _normalize(item) {
        if (!item) return null;
        var hash   = item.hash || item.id || item.tmdb_id || "";
        var title  = item.title || item.name || item.originalTitle || "Titre inconnu";
        var type   = item.type || item.category || "film";
        var poster = item.poster || item.image || item.thumbnail || item.backdrop || "";

        // Build the watch URL from the hash and type
        var watchPath;
        if (type === "anime" || type === "animes") {
            watchPath = "/anime/" + hash;
        } else if (type === "serie" || type === "series") {
            watchPath = "/serie/" + hash;
        } else {
            watchPath = "/movie/" + hash;
        }

        // Poster URL: if relative, prepend TMDB CDN or baseUrl
        if (poster && poster.charAt(0) === "/") {
            if (poster.indexOf("/t/p/") !== -1) {
                poster = "https://image.tmdb.org" + poster;
            } else {
                poster = this.baseUrl + poster;
            }
        }

        return {
            name:        title,
            link:        this.baseUrl + watchPath,
            imageUrl:    poster,
            description: item.description || item.synopsis || item.overview || "",
            genre:       item.genre ? [item.genre] : (item.genres || []),
            author:      "",
            artist:      "",
            status:      0,
            isHentai:    false
        };
    }

    // ── _listContent ─────────────────────────────────────────────────────────
    // GET /srv/list/{type}?page=N&limit=30
    // Returns { list, hasNextPage }

    async _listContent(type, page) {
        var limit = 30;
        var p     = Math.max(1, page || 1);
        var url   = this.baseUrl + "/srv/list/" + type + "?page=" + p + "&limit=" + limit;

        try {
            var r    = await new Client().get(url, { headers: this._jsonHdrs() });
            var data = this._parseJson(r.body);

            // The API may return: array directly, or { items, data, list, results }
            var arr = null;
            if (Array.isArray(data)) {
                arr = data;
            } else if (data && Array.isArray(data.items)) {
                arr = data.items;
            } else if (data && Array.isArray(data.data)) {
                arr = data.data;
            } else if (data && Array.isArray(data.list)) {
                arr = data.list;
            } else if (data && Array.isArray(data.results)) {
                arr = data.results;
            }

            if (!arr || arr.length === 0) return { list: [], hasNextPage: false };

            var list = [];
            for (var i = 0; i < arr.length; i++) {
                var item = this._normalize(arr[i]);
                if (item) list.push(item);
            }
            return { list: list, hasNextPage: list.length >= limit };
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    // ── _getNewContent ────────────────────────────────────────────────────────
    // GET /srv/nouveautes?limit=30&page=N
    // Returns mixed types (films, séries, animés)

    async _getNewContent(page) {
        var limit = 30;
        var p     = Math.max(1, page || 1);
        var url   = this.baseUrl + "/srv/nouveautes?limit=" + limit + "&page=" + p;

        try {
            var r    = await new Client().get(url, { headers: this._jsonHdrs() });
            var data = this._parseJson(r.body);

            var arr = null;
            if (Array.isArray(data)) {
                arr = data;
            } else if (data) {
                // May return { films: [], series: [], animes: [] }
                var combined = [];
                if (Array.isArray(data.films))  combined = combined.concat(data.films);
                if (Array.isArray(data.series)) combined = combined.concat(data.series);
                if (Array.isArray(data.animes)) combined = combined.concat(data.animes);
                if (Array.isArray(data.items))  combined = combined.concat(data.items);
                if (Array.isArray(data.data))   combined = combined.concat(data.data);
                if (combined.length > 0) arr = combined;
            }

            if (!arr || arr.length === 0) return { list: [], hasNextPage: false };

            var list = [];
            for (var i = 0; i < arr.length; i++) {
                var item = this._normalize(arr[i]);
                if (item) list.push(item);
            }
            return { list: list, hasNextPage: list.length >= limit };
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    // ── Listings ──────────────────────────────────────────────────────────────

    async getPopular(page) {
        // Use the default category from user preferences
        var cat = this.defaultCategory;
        var result = await this._listContent(cat, page);

        // If the typed endpoint returns nothing, try all=true variant
        if (result.list.length === 0) {
            try {
                var url = this.baseUrl + "/srv/list/" + cat + "?all=true&page=" + Math.max(1, page);
                var r   = await new Client().get(url, { headers: this._jsonHdrs() });
                var data = this._parseJson(r.body);
                var arr = Array.isArray(data) ? data
                    : (data && (data.items || data.data || data.list || data.results) || []);
                var list = [];
                for (var i = 0; i < arr.length; i++) {
                    var item = this._normalize(arr[i]);
                    if (item) list.push(item);
                }
                if (list.length > 0) return { list: list, hasNextPage: list.length >= 30 };
            } catch (_) {}
        }

        return result;
    }

    async getLatestUpdates(page) {
        return this._getNewContent(page);
    }

    async getForYou(page) {
        // Show recent across all categories
        var result = await this._getNewContent(page);
        if (result.list.length > 0) return result;
        return this.getPopular(page);
    }

    // ── Search ────────────────────────────────────────────────────────────────
    // POST or GET /srv/search?q=query or /api/search?q=query

    async search(query, page, filters) {
        var q = encodeURIComponent(query || "");
        var p = Math.max(1, page || 1);

        // Try multiple known search endpoints
        var endpoints = [
            "/srv/search?q=" + q + "&page=" + p,
            "/api/search?q=" + q + "&page=" + p,
            "/srv/list/film?q=" + q + "&page=" + p,
            "/srv/list/serie?q=" + q + "&page=" + p,
            "/srv/list/anime?q=" + q + "&page=" + p
        ];

        var allItems = [];
        var seen = {};

        for (var ei = 0; ei < endpoints.length; ei++) {
            try {
                var r    = await new Client().get(this.baseUrl + endpoints[ei], { headers: this._jsonHdrs() });
                var data = this._parseJson(r.body);
                if (!data) continue;

                var arr = Array.isArray(data) ? data
                    : (Array.isArray(data.items) ? data.items
                    : (Array.isArray(data.data) ? data.data
                    : (Array.isArray(data.results) ? data.results
                    : (Array.isArray(data.list) ? data.list : []))));

                // Merge films/series/animes keys
                if (!Array.isArray(data) && !arr.length) {
                    var merged = [];
                    if (Array.isArray(data.films))  merged = merged.concat(data.films);
                    if (Array.isArray(data.series)) merged = merged.concat(data.series);
                    if (Array.isArray(data.animes)) merged = merged.concat(data.animes);
                    arr = merged;
                }

                for (var i = 0; i < arr.length; i++) {
                    var item = this._normalize(arr[i]);
                    if (item && !seen[item.link]) {
                        seen[item.link] = true;
                        allItems.push(item);
                    }
                }

                if (allItems.length > 0) break; // Got results
            } catch (_) {}
        }

        return { list: allItems, hasNextPage: false };
    }

    // ── Detail ────────────────────────────────────────────────────────────────
    // /movie/:hash  →  film detail
    // /serie/:hash  →  series detail + episodes
    // /anime/:hash  →  anime detail + episodes

    async getDetail(url) {
        // Determine type and hash from URL
        var type  = "film";
        var hashM = null;

        if (/\/anime\//.test(url)) {
            type  = "anime";
            hashM = url.match(/\/anime\/([^/?#]+)/);
        } else if (/\/serie\//.test(url)) {
            type  = "serie";
            hashM = url.match(/\/serie\/([^/?#]+)/);
        } else if (/\/movie\//.test(url)) {
            type  = "film";
            hashM = url.match(/\/movie\/([^/?#]+)/);
        } else if (/\/watch\//.test(url)) {
            hashM = url.match(/\/watch\/([^/?#]+)/);
        }

        var hash = hashM ? hashM[1] : "";

        // Try to fetch detail JSON from API
        var apiDetail = null;
        var detailEndpoints = [
            "/srv/" + type + "/" + hash,
            "/srv/film/" + hash,
            "/srv/detail/" + hash,
            "/api/" + type + "/" + hash,
            "/api/detail/" + hash
        ];

        for (var ei = 0; ei < detailEndpoints.length; ei++) {
            try {
                var r    = await new Client().get(this.baseUrl + detailEndpoints[ei], { headers: this._jsonHdrs() });
                var data = this._parseJson(r.body);
                if (data && (data.title || data.name)) {
                    apiDetail = data;
                    break;
                }
            } catch (_) {}
        }

        // Build result from API data or fallback to normalized URL info
        var name        = "TropiStream";
        var description = "";
        var imageUrl    = "";
        var genres      = [];
        var chapters    = [];

        if (apiDetail) {
            name        = apiDetail.title || apiDetail.name || apiDetail.originalTitle || name;
            description = apiDetail.description || apiDetail.synopsis || apiDetail.overview || "";
            genres      = apiDetail.genres || (apiDetail.genre ? [apiDetail.genre] : []);

            var poster  = apiDetail.poster || apiDetail.image || apiDetail.thumbnail || "";
            if (poster && poster.charAt(0) === "/") {
                poster = poster.indexOf("/t/p/") !== -1
                    ? "https://image.tmdb.org" + poster
                    : this.baseUrl + poster;
            }
            imageUrl = poster;

            // Episodes for series/anime
            if (type === "serie" || type === "anime") {
                var seasons = apiDetail.seasons || apiDetail.saisons || [];

                if (Array.isArray(seasons) && seasons.length > 0) {
                    for (var si = 0; si < seasons.length; si++) {
                        var season = seasons[si];
                        var eps    = season.episodes || season.ep || [];
                        var sNum   = season.number || season.num || (si + 1);

                        for (var ei2 = 0; ei2 < eps.length; ei2++) {
                            var ep    = eps[ei2];
                            var eNum  = ep.number || ep.num || (ei2 + 1);
                            var eHash = ep.hash || ep.id || hash;
                            var eUrl  = this.baseUrl + "/watch/" + eHash
                                + "?saison=" + sNum + "&episode=" + eNum;

                            chapters.push({
                                name:       "S" + sNum + "E" + eNum
                                          + (ep.title ? " — " + ep.title : ""),
                                url:        eUrl,
                                dateUpload: ep.date || ep.createdAt || ""
                            });
                        }
                    }
                } else if (Array.isArray(apiDetail.episodes)) {
                    var allEps = apiDetail.episodes;
                    for (var ei3 = 0; ei3 < allEps.length; ei3++) {
                        var ep2   = allEps[ei3];
                        var eH    = ep2.hash || ep2.id || hash;
                        var eUrl2 = this.baseUrl + "/watch/" + eH;
                        chapters.push({
                            name:       "Épisode " + (ep2.number || ep2.num || (ei3 + 1))
                                      + (ep2.title ? " — " + ep2.title : ""),
                            url:        eUrl2,
                            dateUpload: ep2.date || ""
                        });
                    }
                }
            }
        }

        // Fallback: always add a direct watch link
        var watchUrl = url.replace(/\/(movie|serie|anime)\//, "/watch/");
        if (chapters.length === 0) {
            chapters.push({
                name:       name || "Regarder",
                url:        watchUrl,
                dateUpload: ""
            });
        }

        // For films, single episode = the watch link
        if (type === "film" && chapters.length === 0) {
            chapters.push({
                name:       name,
                url:        watchUrl,
                dateUpload: ""
            });
        }

        return {
            name:        name,
            description: description,
            imageUrl:    imageUrl,
            genres:      genres,
            status:      0,
            chapters:    chapters
        };
    }

    // ── getVideoList ──────────────────────────────────────────────────────────
    // /watch/:hash  → page HTML with an <iframe src="..."> for the player

    async getVideoList(url) {
        var videos = [];

        // 1. Try to get embed URL from the SPA's API
        var hashM = url.match(/\/watch\/([^/?#]+)/);
        var hash  = hashM ? hashM[1] : "";

        // Extract optional season/episode params
        var saisonM  = url.match(/[?&]saison=(\d+)/);
        var episodeM = url.match(/[?&]episode=(\d+)/);
        var saison   = saisonM  ? saisonM[1]  : "";
        var episode  = episodeM ? episodeM[1] : "";

        // Try API endpoints for embed URL
        var embedApiEndpoints = [
            "/srv/embed/" + hash + (saison ? "?saison=" + saison + "&episode=" + episode : ""),
            "/srv/stream/" + hash + (saison ? "?saison=" + saison + "&episode=" + episode : ""),
            "/api/embed/" + hash,
            "/api/stream/" + hash,
            "/srv/player/" + hash
        ];

        for (var ei = 0; ei < embedApiEndpoints.length; ei++) {
            try {
                var r    = await new Client().get(
                    this.baseUrl + embedApiEndpoints[ei],
                    { headers: this._jsonHdrs(url) }
                );
                var data = this._parseJson(r.body);
                if (!data) continue;

                // Look for embed URLs in the API response
                var embedUrl = data.url || data.embed || data.src || data.iframe || data.link || "";
                if (embedUrl && embedUrl.length > 10) {
                    if (embedUrl.charAt(0) === "/") embedUrl = this.baseUrl + embedUrl;
                    videos.push({ url: embedUrl, quality: "AUTO", originalUrl: embedUrl });
                    break;
                }

                // Look for direct m3u8/mp4
                var direct = data.stream || data.hls || data.mp4 || data.video || "";
                if (direct) {
                    videos.push({ url: direct, quality: "AUTO", originalUrl: direct });
                    break;
                }
            } catch (_) {}
        }

        if (videos.length > 0) return videos;

        // 2. Fall back to fetching the SPA page and looking for known embed patterns
        //    TropiStream uses an <iframe src="..."> inside the React player
        try {
            var pageRes = await new Client().get(url, { headers: this._hdrs() });
            var html    = pageRes.body || "";

            // Look for direct m3u8 / mp4
            var directRe = /["'`](https?:\/\/[^"'`\s]+\.(?:m3u8|mp4)[^"'`\s]{0,200})["'`]/gi;
            var dm;
            while ((dm = directRe.exec(html)) !== null) {
                var dUrl = dm[1];
                if (!videos.some(function(v) { return v.url === dUrl; })) {
                    videos.push({ url: dUrl, quality: "Stream", originalUrl: dUrl });
                }
            }

            // Look for iframe src with known embed providers
            var iframeRe = /<iframe[^>]+src="((?:https?:)?\/\/[^"]{8,})"[^>]*>/gi;
            var im;
            while ((im = iframeRe.exec(html)) !== null) {
                var iSrc = im[1];
                if (iSrc.charAt(0) === "//") iSrc = "https:" + iSrc;
                if (/google|recaptcha|disqus|facebook|twitter/.test(iSrc)) continue;
                if (!videos.some(function(v) { return v.url === iSrc; })) {
                    videos.push({ url: iSrc, quality: "Embed", originalUrl: iSrc });
                }
            }
        } catch (_) {}

        // 3. Try resolving each embed URL to get direct stream
        var resolved = [];
        for (var vi = 0; vi < Math.min(videos.length, 5); vi++) {
            var vid = videos[vi];
            if (vid.url.indexOf(".m3u8") !== -1 || vid.url.indexOf(".mp4") !== -1) {
                resolved.push(vid);
                continue;
            }
            try {
                var embedRes = await new Client().get(vid.url, { headers: this._hdrs(url) });
                var ebody    = embedRes.body || "";

                var hlsM = ebody.match(/["'`](https?:\/\/[^"'`]+\.m3u8[^"'`]{0,200})["'`]/);
                if (hlsM) {
                    resolved.push({ url: hlsM[1], quality: vid.quality || "Stream", originalUrl: hlsM[1] });
                    continue;
                }
                var mp4M = ebody.match(/["'`](https?:\/\/[^"'`]+\.mp4[^"'`]{0,200})["'`]/);
                if (mp4M) {
                    resolved.push({ url: mp4M[1], quality: vid.quality || "Direct", originalUrl: mp4M[1] });
                    continue;
                }
                // Keep the embed as-is
                resolved.push(vid);
            } catch (_) {
                resolved.push(vid);
            }
        }

        return resolved.length > 0 ? resolved : videos;
    }

    // ── Source detail ─────────────────────────────────────────────────────────

    async getSourceDetail() {
        return {
            iconUrl:     this.baseUrl + "/tropi.png",
            description: "TropiStream — Plateforme française de streaming (Films, Séries, Animés). Connexion Discord requise.",
            lang:        "fr",
            name:        "TropiStream",
            baseUrl:     this.baseUrl
        };
    }
}
