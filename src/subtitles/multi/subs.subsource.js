// ═══════════════════════════════════════════════════════════════
//  SubSource — Provider sans clé API (Watchtower)
//  API publique : api.subsource.net (JSON, POST)
//
//  Recherche : texte → film/série → sous-titres par langue
//  Bonne couverture FR/EN + langues rares, communauté active.
//  Formats : SRT / ASS — fichiers individuels ou ZIP selon l'entrée.
//  Aucune clé requise.
// ═══════════════════════════════════════════════════════════════

const watchtowerSources = [{
    "id": 7000000004,
    "name": "SubSource",
    "lang": "multi",
    "typeSource": "single",
    "isManga": false,
    "itemType": 7,
    "version": "1.0.0",
    "baseUrl": "https://subsource.net",
    "apiUrl": "https://api.subsource.net/api",
    "iconUrl": "https://subsource.net/favicon.ico",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": false,
    "sourceCodeUrl": "https://cdn.jsdelivr.net/gh/ferelking242/watchtower-extensions@main/src/subtitles/multi/subs.subsource.js",
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
        "searchBy": ["title"],
        "media": ["movie", "tv"]
    },
    "notes": "v1.0.0 — Sans clé API : recherche titre, films+séries, FR/EN + langues rares."
}];

class DefaultExtension extends MProvider {

    _h() {
        return {
            "User-Agent": "Watchtower/1.0 (subtitle provider)",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Origin": "https://subsource.net",
            "Referer": "https://subsource.net/",
        };
    }

    _post(endpoint, body) {
        return new Client().post(
            "https://api.subsource.net/api/" + endpoint,
            JSON.stringify(body),
            this._h()
        );
    }

    _guessFormat(name) {
        var n = String(name || "").toLowerCase();
        if (n.indexOf(".ass") !== -1 || n.indexOf(".ssa") !== -1) return "ass";
        if (n.indexOf(".vtt") !== -1) return "vtt";
        return "srt";
    }

    // ── Étape 1 : titre → entrées film/série ─────────────────────
    async _searchMovie(query) {
        try {
            var res = await this._post("searchMovie", { query: query });
            var j = JSON.parse(res.body);
            if (j && j.success && j.found && j.found.length) {
                // priorité aux films, puis séries
                var movies = [], series = [];
                for (var i = 0; i < j.found.length; i++) {
                    var e = j.found[i];
                    if (e.kind === "series" || e.type === "series") series.push(e);
                    else movies.push(e);
                }
                return movies.length ? movies : series;
            }
        } catch (_) {}
        return [];
    }

    /**
     * @param {string} query  titre du film/série
     * @param {object} opts   { langs:["fr","en"], season, episode }
     */
    async searchSubs(query, opts) {
        opts = opts || {};
        if (!query) return [];

        var wantLangs = Array.isArray(opts.langs) ? opts.langs : String(opts.langs || "fr,en").split(",");
        for (var w = 0; w < wantLangs.length; w++) wantLangs[w] = String(wantLangs[w]).trim().toLowerCase();

        var entries = await this._searchMovie(query);
        var out = [];

        for (var e = 0; e < entries.length && out.length < 60; e++) {
            try {
                var res = await this._post("getMovie", { movieName: entries[e].linkName });
                var j = JSON.parse(res.body);
                if (!j || !j.success || !j.subs) continue;

                var subsByFile = {};
                var subs = j.subs;
                for (var i = 0; i < subs.length; i++) {
                    var s = subs[i];
                    var sLang = String(s.lang || "").toLowerCase();
                    if (wantLangs.indexOf(sLang) === -1) continue;
                    // regroupe les releases par fileName (1 fichier = N releases)
                    var key = s.fileName || s.release || i;
                    if (subsByFile[key]) { subsByFile[key].releases++; continue; }
                    subsByFile[key] = {
                        id: "subsource|" + (j.movieName || entries[e].linkName) + "|" + s.fileName + "|" + sLang,
                        provider: "SubSource",
                        lang: sLang,
                        format: this._guessFormat(s.release),
                        release: s.release || s.fileName || "",
                        author: "",
                        hi: !!s.hi,
                        rating: null,
                        downloads: null,
                        url: "",                            // construit dans downloadSub
                        pageUrl: "https://subsource.net/subtitle/" + s.fileName,
                        _movie: j.movieName || entries[e].linkName,
                        _fileName: s.fileName,
                        _lang: sLang,
                        releases: 1,
                    };
                }
                for (var k in subsByFile) {
                    var m = subsByFile[k];
                    delete m._movie; delete m._fileName; delete m._lang;
                    // infos nécessaires au download conservées via id
                    out.push(m);
                }
            } catch (_) {}
        }
        return out;
    }

    /**
     * @param {string} id "subsource|<movieName>|<fileName>|<lang>"
     * @returns {Promise<object>} { url } — fichier individuel
     */
    async downloadSub(id) {
        var parts = String(id || "").replace(/^subsource\|/, "").split("|");
        if (parts.length < 3) throw new Error("SubSource: id invalide");
        var body = {
            movieName: parts[0],
            fileName: parts[1],
            lang: parts[2],
        };
        var res = await this._post("downloadSub", body);
        var j = JSON.parse(res.body);
        if (!j || !j.success || !j.url) throw new Error("SubSource: téléchargement indisponible");
        return { url: j.url };
    }
}
