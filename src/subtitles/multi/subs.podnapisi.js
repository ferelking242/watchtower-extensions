// ═══════════════════════════════════════════════════════════════
//  Podnapisi — Provider sans clé API (Watchtower)
//  API AJAX : podnapisi.net/subtitles/search/ppds3 (JSON, publique)
//
//  Recherche : texte + langues + saison/épisode + année
//  Base solide pour l'européen (FR/DE/ES/IT…) et les releases TV.
//  Formats : SRT / ASS — ZIP par entrée, unpack côté app.
//  Aucune clé requise → marche out-of-the-box.
// ═══════════════════════════════════════════════════════════════

const watchtowerSources = [{
    "id": 7000000003,
    "name": "Podnapisi",
    "lang": "multi",
    "typeSource": "single",
    "isManga": false,
    "itemType": 7,
    "version": "1.0.1",
    "baseUrl": "https://podnapisi.net",
    "apiUrl": "https://podnapisi.net/subtitles/search/ppds3",
    "iconUrl": "https://podnapisi.net/static/ico/favicon.ico",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": false,
    "sourceCodeUrl": "https://cdn.jsdelivr.net/gh/ferelking242/watchtower-extensions@main/src/subtitles/multi/subs.podnapisi.js",
    "appMinVerReq": "0.7.0",
    "isFullData": true,
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "capabilities": {
        "formats": ["srt", "ass"],
        "hearingImpaired": true,
        "autoSync": false,
        "searchBy": ["title", "filename"],
        "media": ["movie", "tv"]
    },
    "notes": "v1.0.0 — Sans clé API : recherche texte multi-langues, films+séries, ZIP individuels."
}];

// ISO 639-1 → codes Podnapisi (ISO 639-3)
const _PN_LANG = {
    fr: "fra", en: "eng", es: "spa", de: "deu", it: "ita", pt: "por",
    ja: "jpn", ko: "kor", zh: "zho", ru: "rus", ar: "ara", hi: "hin",
    tr: "tur", nl: "nld", pl: "pol", sv: "swe", no: "nor", da: "dan",
    fi: "fin", cs: "ces", el: "ell", he: "heb", id: "ind", ro: "ron",
    hu: "hun", th: "tha", vi: "vie", uk: "ukr", hr: "hrv", sr: "srp",
};

class DefaultExtension extends MProvider {

    _langsToPn(langs) {
        var list = Array.isArray(langs) && langs.length ? langs : this._prefLangs();
        var out = [];
        for (var i = 0; i < list.length; i++) {
            var c = _PN_LANG[String(list[i]).trim().toLowerCase()];
            if (c && out.indexOf(c) === -1) out.push(c);
        }
        return out.length ? out : ["fra", "eng"];
    }

    _qs(obj) {
        var parts = [];
        for (var k in obj) {
            if (obj[k] === undefined || obj[k] === null || obj[k] === "") continue;
            parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]));
        }
        return parts.join("&");
    }

    _guessFormat(releaseName) {
        var n = String(releaseName || "").toLowerCase();
        if (n.indexOf(".ass") !== -1 || n.indexOf(".ssa") !== -1) return "ass";
        if (n.indexOf(".vtt") !== -1) return "vtt";
        return "srt";
    }

    _mapSub(s) {
        if (!s || !s.id) return null;
        var pagePath = s.url || ("/subtitles/" + s.id);
        var dlPath = s.subtitle
            ? (String(s.subtitle).indexOf("http") === 0 ? s.subtitle : "https://podnapisi.net" + s.subtitle)
            : ("https://podnapisi.net" + pagePath + "/download");
        return {
            id: "podnapisi|" + s.id,
            provider: "Podnapisi",
            // Podnapisi renvoie un nom de langue complet ("French") ou code 3 lettres :
            lang: String(s.language || "").toLowerCase().slice(0, 2) || "en",
            format: this._guessFormat(s.movieReleaseName),
            release: s.movieReleaseName || "",
            author: s.uploader ? s.uploader.name : "",
            hi: !!s.isHearingImpaired,
            rating: (s.ratings != null && s.ratings > 0) ? s.ratings : null,
            downloads: null,
            url: dlPath,
            pageUrl: "https://podnapisi.net" + pagePath,
            archive: true,
        };
    }

    /**
     * @param {string} query  titre ou nom de fichier
     * @param {object} opts   { langs, season, episode, year }
     */
    async searchSubs(query, opts) {
        opts = opts || {};
        if (!query) return [];

        var params = {
            keywords: query.replace(/\./g, " ").replace(/\s+/g, " ").trim(),
            language: this._langsToPn(opts.langs).join(","),
            film_type: opts.season != null ? 1 : 0,   // 1=série 0=film
        };
        if (opts.season != null) params.seasons = opts.season;
        if (opts.episode != null) params.episodes = opts.episode;
        if (opts.year) params.year = opts.year;

        var out = [];
        try {
            var res = await new Client().get(
                "https://podnapisi.net/subtitles/search/ppds3?" + this._qs(params),
                { "User-Agent": "Watchtower/1.0 (subtitle provider)", "Accept": "application/json" }
            );
            var j = JSON.parse(res.body);
            var results = j && j.results ? j.results : [];
            for (var i = 0; i < results.length; i++) {
                var m = this._mapSub(results[i]);
                if (m) out.push(m);
            }
        } catch (_) {}

        // Fallback : ancienne interface HTML→JSON si ppds3 indisponible
        if (!out.length) {
            try {
                var res2 = await new Client().get(
                    "https://podnapisi.net/subtitles/search/old?" +
                    this._qs({ keyword: query, language: this._langsToPn(opts.langs).join(",") }),
                    { "User-Agent": "Watchtower/1.0" }
                );
                var j2 = null; try { j2 = JSON.parse(res2.body); } catch (_) {}
                if (j2 && j2.results) {
                    for (var k = 0; k < j2.results.length; k++) {
                        var m2 = this._mapSub(j2.results[k]);
                        if (m2) out.push(m2);
                    }
                }
            } catch (_) {}
        }
        return out.slice(0, this._maxResults());
    }

    _prefLangs() {
        try {
            var v = new SharedPreferences().get("preferred_langs");
            if (Array.isArray(v) && v.length) return v.map(function (l) { return String(l).toLowerCase(); });
        } catch (_) {}
        return ["fr", "en"];
    }

    _maxResults() {
        try {
            var v = parseInt(new SharedPreferences().get("max_results"), 10);
            if (v && v > 0) return v;
        } catch (_) {}
        return 25;
    }

    /**
     * @param {string} id "podnapisi|<id>"
     * @returns {Promise<object>} { url, archive:true }
     */
    async downloadSub(id) {
        var pid = String(id || "").replace(/^podnapisi\|/, "");
        if (!pid) throw new Error("Podnapisi: id invalide");
        if (pid.indexOf("http") === 0) return { url: pid, archive: true };
        return { url: "https://podnapisi.net/subtitles/" + pid + "/download", archive: true };
    }

    getSourcePreferences() {
        return [
            {
                key: "preferred_langs",
                multiSelectListPreference: {
                    title: "Langues préférées",
                    summary: "Langues de sous-titres à rechercher par défaut quand l'application n'en impose aucune.",
                    entries: ["Français", "Anglais", "Espagnol", "Allemand", "Italien", "Portugais", "Russe", "Néerlandais", "Polonais", "Turc", "Japonais", "Coréen", "Chinois"],
                    entryValues: ["fr", "en", "es", "de", "it", "pt", "ru", "nl", "pl", "tr", "ja", "ko", "zh"],
                    values: ["fr", "en"]
                }
            },
            {
                key: "max_results",
                listPreference: {
                    title: "Résultats maximum",
                    summary: "Nombre maximal de sous-titres retournés par recherche",
                    valueIndex: 1,
                    entries: ["10", "25 (recommandé)", "50", "100"],
                    entryValues: ["10", "25", "50", "100"]
                }
            }
        ];
    }
}
