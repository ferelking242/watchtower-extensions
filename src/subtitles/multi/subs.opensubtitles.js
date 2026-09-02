// ═══════════════════════════════════════════════════════════════
//  OpenSubtitles — Provider secondaire (Watchtower)
//  API : api.opensubtitles.com/api/v1 (clé gratuite requise)
//
//  Recherche : hash de fichier / TMDB / IMDb / titre
//  La plus grosse base au monde — fallback idéal si SubDL échoue.
//  Formats : SRT / ASS / VTT (sub+idx signalé) — lien direct via /download
//
//  Clé API : Settings → extension → "Clé API OpenSubtitles"
//  (gratuite sur opensubtitles.com — 5 dl/jour, 1000 recherches/jour)
// ═══════════════════════════════════════════════════════════════

const watchtowerSources = [{
    "id": 7000000002,
    "name": "OpenSubtitles",
    "lang": "multi",
    "typeSource": "single",
    "isManga": false,
    "itemType": 7,
    "version": "1.0.1",
    "baseUrl": "https://opensubtitles.com",
    "apiUrl": "https://api.opensubtitles.com/api/v1",
    "iconUrl": "https://www.opensubtitles.com/favicon.ico",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": false,
    "sourceCodeUrl": "https://cdn.jsdelivr.net/gh/ferelking242/watchtower-extensions@main/src/subtitles/multi/subs.opensubtitles.js",
    "appMinVerReq": "0.7.0",
    "isFullData": true,
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "freemium",
    "capabilities": {
        "formats": ["srt", "ass", "vtt", "sub"],
        "hearingImpaired": true,
        "autoSync": true,          // machine-translation dispo côté OS
        "searchBy": ["hash", "tmdb", "imdb", "title"],
        "media": ["movie", "tv"]
    },
    "prefs": [{
        "key": "os_api_key",
        "title": "Clé API OpenSubtitles",
        "type": "text",
        "default": "",
        "description": "Gratuite — opensubtitles.com/dev (recommandée en 2e source)"
    }],
    "notes": "v1.0.0 — Fallback massif : recherche par hash/TMDB/IMDb/titre, quota download 5/jour en gratuit."
}];

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
            key: "os_api_key",
            editTextPreference: {
                title: "Clé API OpenSubtitles",
                summary: "Clé gratuite à créer sur opensubtitles.com (section dev). Requise pour la recherche et le téléchargement des sous-titres (5 téléchargements/jour en gratuit).",
                value: "",
                dialogTitle: "Clé API OpenSubtitles",
                dialogMessage: "Collez votre clé API (api.opensubtitles.com — compte gratuit requis)."
            }
        }];
    }

    _h(extra) {
        var h = {
            "Api-Key": this._pref("os_api_key", ""),
            "User-Agent": "Watchtower v1.0 (subtitle provider)",
            "Accept": "application/json",
        };
        if (extra) for (var k in extra) h[k] = extra[k];
        return h;
    }

    _qs(obj) {
        var parts = [];
        for (var k in obj) {
            if (obj[k] === undefined || obj[k] === null || obj[k] === "") continue;
            parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(obj[k])));
        }
        return parts.join("&");
    }

    // OpenSubtitles accepte directement les codes ISO 639-1 minuscules.
    _langs(langs) {
        var list = Array.isArray(langs) ? langs : String(langs || "fr,en").split(",");
        var out = [];
        for (var i = 0; i < list.length; i++) {
            var c = String(list[i]).trim().toLowerCase();
            if (c.length === 2 || c.length === 3) out.push(c);
        }
        return out.length ? out.join(",") : "fr,en";
    }

    _guessFormat(f) {
        var n = String((f && f.file_name) || "").toLowerCase();
        if (n.indexOf(".ass") !== -1 || n.indexOf(".ssa") !== -1) return "ass";
        if (n.indexOf(".vtt") !== -1) return "vtt";
        if (n.indexOf(".sub") !== -1 || n.indexOf(".idx") !== -1) return "sub";
        return "srt";
    }

    /**
     * @param {string} query  titre si pas d'ID/hash
     * @param {object} opts   { tmdbId, imdbId, season, episode, langs, fileHash, fileName }
     */
    async searchSubs(query, opts) {
        opts = opts || {};
        if (!this._pref("os_api_key", "")) return [];   // sans clé → provider silencieux

        var params = {
            languages: this._langs(opts.langs),
            order_by: "-ratings,-download_count",
            page: 1,
        };
        if (opts.fileHash) params.file_hash = opts.fileHash;
        if (opts.tmdbId) params.tmdb_id = opts.tmdbId;
        if (opts.imdbId) params.imdb_id = String(opts.imdbId).replace(/^tt/i, "");
        if (opts.season != null) params.season_number = opts.season;
        if (opts.episode != null) params.episode_number = opts.episode;
        if (!opts.fileHash && !opts.tmdbId && !opts.imdbId && query) params.query = query;

        var out = [];
        for (var attempt = 0; attempt < 2 && !out.length; attempt++) {
            try {
                var res = await new Client().get(
                    "https://api.opensubtitles.com/api/v1/subtitles/search?" + this._qs(params),
                    this._h()
                );
                var j = JSON.parse(res.body);
                if (j && j.data && j.data.length) {
                    for (var i = 0; i < j.data.length; i++) {
                        var item = j.data[i];
                        var a = item.attributes || {};
                        var files = a.files || [];
                        for (var f = 0; f < files.length; f++) {
                            out.push({
                                id: "opensub|" + files[f].file_id,
                                provider: "OpenSubtitles",
                                lang: String(a.language || "en").toLowerCase(),
                                format: this._guessFormat(files[f]),
                                release: a.release || (a.feature_details && a.feature_details.release) || a.title || "",
                                author: a.uploader ? a.uploader.name : "",
                                hi: !!a.hi,
                                rating: a.ratings || null,
                                downloads: a.download_count || null,
                                url: "",                       // rempli à l'appel download
                                pageUrl: a.url || "",
                                fileId: files[f].file_id,
                            });
                            break;                             // 1 fichier principal par entrée
                        }
                    }
                }
            } catch (_) {
                // backoff léger avant retry (rate-limit 2 req/s côté OS)
                await new Promise(function (r) { setTimeout(r, 600); });
            }
            if (attempt === 0 && !out.length && params.query) {
                delete params.query;                           // 2e passe : élargir
                params.languages = this._langs(["en"]);
            }
        }
        return out;
    }

    /**
     * Réserve le téléchargement et renvoie un lien direct valable ~24h.
     * @param {string} id "opensub|<file_id>"
     * @returns {Promise<object>} { url } — fichier individuel, pas de ZIP
     */
    async downloadSub(id) {
        var fileId = String(id || "").replace(/^opensub\|/, "");
        if (!fileId) throw new Error("OpenSubtitles: id invalide");
        var res = await new Client().post(
            "https://api.opensubtitles.com/api/v1/download",
            JSON.stringify({ file_id: fileId }),
            this._h({ "Content-Type": "application/json" })
        );
        var j = JSON.parse(res.body);
        if (!j || !j.link) throw new Error("OpenSubtitles: pas de lien (quota épuisé ?)");
        return { url: j.link, remaining: j.remaining || null };
    }
}
