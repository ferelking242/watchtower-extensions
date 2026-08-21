// ═══════════════════════════════════════════════════════════════
//  Kitsunekko — Provider sous-titres ANIME (Watchtower)
//  Source : kitsunekko.net — archives de sous-titres d'anime
//
//  Spécialisé anime : sous-titres JP (officiels/fansubs) + EN,
//  organisés par titre d'anime. Scraping léger du listing HTML.
//  Formats : ASS (majoritaire), SRT. Aucune clé requise.
//
//  Note : idéal pour les sources anime FR/EN de Watchtower
//  (recherche par titre romaji/anglais).
// ═══════════════════════════════════════════════════════════════

const watchtowerSources = [{
    "id": 7000000005,
    "name": "Kitsunekko",
    "lang": "multi",
    "typeSource": "single",
    "isManga": false,
    "itemType": 7,
    "version": "1.0.0",
    "baseUrl": "https://kitsunekko.net",
    "apiUrl": "",
    "iconUrl": "https://kitsunekko.net/favicon.ico",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": false,
    "sourceCodeUrl": "https://cdn.jsdelivr.net/gh/ferelking242/watchtower-extensions@main/src/subtitles/multi/subs.kitsunekko.js",
    "appMinVerReq": "0.7.0",
    "isFullData": true,
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "capabilities": {
        "formats": ["ass", "srt"],
        "hearingImpaired": false,
        "autoSync": false,
        "searchBy": ["title"],
        "media": ["anime"]
    },
    "notes": "v1.0.0 — Sous-titres anime (JP/EN) : listing par titre, fichiers ASS/SRT."
}];

class DefaultExtension extends MProvider {

    _h() {
        return { "User-Agent": "Watchtower/1.0 (subtitle provider)" };
    }

    _guessFormat(name) {
        var n = String(name || "").toLowerCase();
        if (n.indexOf(".ass") !== -1 || n.indexOf(".ssa") !== -1) return "ass";
        if (n.indexOf(".vtt") !== -1) return "vtt";
        if (n.indexOf(".srt") !== -1) return "srt";
        return "";
    }

    // ── Extraction des liens du listing HTML ────────────────────
    // Le listing est une <table> de <a href="...">Nom</a>.
    _extractLinks(html, baseUrl) {
        var out = [];
        var re = /<a\s+[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
        var m;
        while ((m = re.exec(html)) !== null) {
            var href = m[1];
            var name = m[2].replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'")
                           .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
            if (!name || name === ".." || name === "[..]" || name === "Parent Directory") continue;
            if (/dirlist\.php|\/$/.test(href) || href.charAt(0) === "?") continue;
            var abs = href;
            if (href.indexOf("http") !== 0) {
                abs = baseUrl + (href.charAt(0) === "/" ? "" : "/") + href;
            }
            out.push({ name: name, url: abs });
        }
        return out;
    }

    /**
     * Recherche le dossier d'un anime puis liste ses fichiers de subs.
     * @param {string} query  titre de l'anime (romaji ou anglais)
     * @param {object} opts   { langs:["ja","en"], episode }
     */
    async searchSubs(query, opts) {
        opts = opts || {};
        if (!query) return [];
        var q = query.toLowerCase().replace(/\s+/g, " ").trim();

        // 1. Lister le répertoire racine (japonais = référence, english si dispo)
        var roots = [
            { dir: "subtitles%2Fjapanese%2F", lang: "ja" },
            { dir: "subtitles%2Fenglish%2F",  lang: "en" },
        ];
        var wantedLangs = Array.isArray(opts.langs) && opts.langs.length
            ? opts.langs.map(function (l) { return String(l).toLowerCase(); })
            : ["ja", "en"];

        var out = [];
        for (var r = 0; r < roots.length; r++) {
            if (wantedLangs.indexOf(roots[r].lang) === -1) continue;
            try {
                var res = await new Client().get(
                    "https://kitsunekko.net/dirlist.php?dir=" + roots[r].dir,
                    this._h()
                );
                var entries = this._extractLinks(res.body, "https://kitsunekko.net/");
                for (var i = 0; i < entries.length; i++) {
                    var eName = entries[i].name.toLowerCase();
                    if (eName.indexOf(q) === -1 && q.indexOf(eName) === -1) continue;

                    // 2. Lister les fichiers du dossier de l'anime
                    try {
                        var res2 = await new Client().get(entries[i].url, this._h());
                        var files = this._extractLinks(res2.body, entries[i].url);
                        for (var f = 0; f < files.length; f++) {
                            var fmt = this._guessFormat(files[f].name);
                            if (!fmt) continue;                       // ignore les sous-dossiers
                            if (opts.episode != null &&
                                files[f].name.indexOf(String(opts.episode).padStart(2, "0")) === -1) continue;
                            out.push({
                                id: "kitsunekko|" + encodeURIComponent(files[f].url),
                                provider: "Kitsunekko",
                                lang: roots[r].lang,
                                format: fmt,
                                release: files[f].name.replace(/\.(ass|srt|ssa|vtt)$/i, ""),
                                author: "",
                                hi: false,
                                rating: null,
                                downloads: null,
                                url: files[f].url,
                                pageUrl: entries[i].url,
                            });
                        }
                    } catch (_) {}
                    if (out.length >= 40) break;
                }
            } catch (_) {}
        }
        return out;
    }

    /**
     * @param {string} id "kitsunekko|<url encodée>"
     * @returns {Promise<object>} { url } — fichier individuel
     */
    async downloadSub(id) {
        var url = decodeURIComponent(String(id || "").replace(/^kitsunekko\|/, ""));
        if (!url || url.indexOf("http") !== 0) throw new Error("Kitsunekko: id invalide");
        return { url: url };
    }
}
