// ═══════════════════════════════════════════════════════════════
//  SubDL — Provider de sous-titres principal (Watchtower)
//  API : api.subdl.com (clé gratuite, ~2000 req/jour)
//
//  Recherche : TMDB ID / IMDb ID / titre (+auto-résolution film/série)
//  Couverture : films + séries + saisons/épisodes, 60+ langues (FR/EN/JA/ES/…)
//  Formats : SRT / ASS / VTT — ZIP par release, unpack côté app
//
//  Clé API : Settings → extension → "Clé API SubDL" (gratuite sur subdl.com)
//  Sans clé : l'endpoint /auto (résolution film) marche, /api/v1 exige la clé.
// ═══════════════════════════════════════════════════════════════

const watchtowerSources = [{
    "id": 7000000001,
    "name": "SubDL",
    "lang": "multi",
    "typeSource": "single",
    "isManga": false,
    "itemType": 7,
    "version": "1.0.1",
    "baseUrl": "https://subdl.com",
    "apiUrl": "https://api.subdl.com",
    "iconUrl": "https://subdl.com/favicon.ico",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": false,
    "sourceCodeUrl": "https://cdn.jsdelivr.net/gh/ferelking242/watchtower-extensions@main/src/subtitles/multi/subs.subdl.js",
    "appMinVerReq": "0.7.0",
    "isFullData": true,
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "capabilities": {
        "formats": ["srt", "ass", "vtt"],
        "hearingImpaired": true,
        "autoSync": false,
        "searchBy": ["tmdb", "imdb", "title", "filename"],
        "media": ["movie", "tv"]
    },
    "prefs": [{
        "key": "subdl_api_key",
        "title": "Clé API SubDL",
        "type": "text",
        "default": "",
        "description": "Gratuite — subdl.com/api (2000 requêtes/jour)"
    }],
    "notes": "v1.0.0 — Provider principal : recherche TMDB/IMDb/titre, films+séries+épisodes, multi-langues, ZIP individuels."
}];

// ISO 639-1 (app) → codes SubDL (majuscules)
const _SUBDL_LANG = {
    fr: "FR", en: "EN", es: "ES", de: "DE", it: "IT", pt: "PT", ja: "JA",
    ko: "KO", zh: "ZH", ru: "RU", ar: "AR", hi: "HI", tr: "TR", nl: "NL",
    pl: "PL", sv: "SV", no: "NO", da: "DA", fi: "FI", cs: "CS", el: "EL",
    he: "HE", id: "ID", ro: "RO", hu: "HU", th: "TH", vi: "VI", uk: "UK",
};

class DefaultExtension extends MProvider {

    _pref(key, fallback) {
        try {
            var v = new SharedPreferences().get(key);
            return (v !== undefined && v !== null && v !== "") ? String(v) : fallback;
        } catch (_) {}
        return fallback;
    }

    getSourcePreferences() {
        return [{
            key: "subdl_api_key",
            editTextPreference: {
                title: "Clé API SubDL",
                summary: "Clé optionnelle qui augmente les quotas et débloque les téléchargements premium sur subdl.com. Laissez vide pour l'usage gratuit de base.",
                value: "",
                dialogTitle: "Clé API SubDL",
                dialogMessage: "Collez votre clé API (subdl.com — compte gratuit)."
            }
        }];
    }

    _h() {
        return {
            "User-Agent": "Watchtower/1.0 (subtitle provider)",
            "Accept": "application/json",
        };
    }

    _langsToSubdl(langs) {
        var out = [];
        var list = Array.isArray(langs) ? langs : String(langs || "fr,en").split(",");
        for (var i = 0; i < list.length; i++) {
            var c = _SUBDL_LANG[String(list[i]).trim().toLowerCase()];
            if (c) out.push(c);
        }
        return out.length ? out.join(",") : "EN,FR";
    }

    _qs(obj) {
        var parts = [];
        for (var k in obj) {
            if (obj[k] === undefined || obj[k] === null || obj[k] === "") continue;
            parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]));
        }
        return parts.join("&");
    }

    // ── Résolution titre → film/série (endpoint /auto, sans clé) ──
    async _resolveFilm(title) {
        try {
            var res = await new Client().get(
                "https://api.subdl.com/auto?" + this._qs({ film_name: title }),
                this._h()
            );
            var j = JSON.parse(res.body);
            if (j && j.status === true && j.results && j.results.length) return j.results[0];
        } catch (_) {}
        return null;
    }

    _guessFormat(releaseName) {
        var n = String(releaseName || "").toLowerCase();
        if (n.indexOf(".ass") !== -1) return "ass";
        if (n.indexOf(".vtt") !== -1) return "vtt";
        if (n.indexOf(".ssa") !== -1) return "ass";
        return "srt";
    }

    _mapSub(s) {
        if (!s || !s.url) return null;
        return {
            id: "subdl|" + s.url,
            provider: "SubDL",
            lang: String(s.lang || s.language || "en").toLowerCase(),
            format: this._guessFormat(s.release_name || s.name),
            release: s.release_name || s.name || "",
            author: s.author || s.uploader || "",
            hi: !!s.hi,
            rating: s.rating || null,
            downloads: null,
            url: "https://dl.subdl.com" + s.url,
            pageUrl: s.subtitlePage ? ("https://subdl.com" + s.subtitlePage) : "",
            archive: true,   // ZIP → unpack côté app
        };
    }

    /**
     * Recherche de sous-titres.
     * @param {string} query  titre du film/série (ou nom de fichier)
     * @param {object} opts   { tmdbId, imdbId, season, episode, langs:["fr","en"],
     *                          year, type:"movie"|"tv", fileName }
     * @returns {Promise<Array>} liste normalisée de sous-titres
     */
    async searchSubs(query, opts) {
        opts = opts || {};
        var params = {
            api_key: this._pref("subdl_api_key", ""),
            subs_per_page: 40,
        };

        // Priorité : TMDB → IMDb → titre résolu → nom de fichier
        if (opts.tmdbId) {
            params.tmdb_id = opts.tmdbId;
            params.type = opts.type || (opts.season != null ? "tv" : "movie");
        } else if (opts.imdbId) {
            params.imdb_id = String(opts.imdbId).replace(/^tt/i, "");
            params.type = opts.type || (opts.season != null ? "tv" : "movie");
        } else if (query) {
            var film = await this._resolveFilm(query);
            if (film) {
                params.tmdb_id = film.tmdb_id;
                params.type = film.type || "movie";
            } else {
                params.film_name = query;
            }
        }
        if (opts.season != null) params.season_number = opts.season;
        if (opts.episode != null) params.episode_number = opts.episode;
        if (opts.year) params.year = opts.year;
        if (!params.languages && opts.langs) params.languages = this._langsToSubdl(opts.langs);
        else params.languages = this._langsToSubdl(opts.langs || ["fr", "en"]);
        if (opts.fileName) params.file_name = opts.fileName;

        var out = [];
        try {
            var res = await new Client().get(
                "https://api.subdl.com/api/v1/subtitles?" + this._qs(params),
                this._h()
            );
            var j = JSON.parse(res.body);
            if (j && j.subtitles && j.subtitles.length) {
                for (var i = 0; i < j.subtitles.length; i++) {
                    var m = this._mapSub(j.subtitles[i]);
                    if (m) out.push(m);
                }
            }
        } catch (_) {}
        return out;
    }

    /**
     * Lien de téléchargement direct (ZIP → unpack app).
     * @param {string} id  "subdl|<chemin>"
     * @returns {Promise<object>} { url, archive }
     */
    async downloadSub(id) {
        var path = String(id || "").replace(/^subdl\|/, "");
        if (!path) throw new Error("SubDL: id invalide");
        if (path.indexOf("http") === 0) return { url: path, archive: true };
        return { url: "https://dl.subdl.com" + path, archive: true };
    }
}
