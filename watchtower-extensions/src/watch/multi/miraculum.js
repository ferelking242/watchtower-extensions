// ══════════════════════════════════════════════════════════════
//  Miraculum — miraculum.ml  v2.1.0
//  Miraculous Ladybug — épisodes complets, toutes saisons
//  S1–S6 · Miraculous World & Chibi (C) · Spéciaux (S)
//  Tales (T) · Secrets & Making-of (X)
//  Qualité : HD (1080p) / LQ (480p)
// ══════════════════════════════════════════════════════════════

const watchtowerSources = [{
    "name": "Miraculum",
    "lang": "multi",
    "baseUrl": "https://miraculum.ml",
    "apiUrl": "https://internal.miraculum.ml",
    "iconUrl": "https://miraculum.ml/android-chrome-192x192.png",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "2.1.0",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": true,
    "pkgPath": "watch/multi/miraculum.js",
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "hasSubtitles": true,
    "hasDub": true,
    "notes": "Miraculous Ladybug — S1–S6 + World/Chibi/Spéciaux/Tales/Secrets. Qualité HD/LQ."
}];

// ── Constants ─────────────────────────────────────────────────
var MIRK_BASE = "https://miraculum.ml";
var MIRK_INT  = "https://internal.miraculum.ml";

// All content categories on miraculum.ml
var MIRK_SEASONS = [
    { s: "1", label: "Saison 1",              cover: "/res/episodes/season_1/101.webp" },
    { s: "2", label: "Saison 2",              cover: "/res/episodes/season_2/201.webp" },
    { s: "3", label: "Saison 3",              cover: "/res/episodes/season_3/301.webp" },
    { s: "4", label: "Saison 4",              cover: "/res/episodes/season_4/401.webp" },
    { s: "5", label: "Saison 5",              cover: "/res/episodes/season_5/501.webp" },
    { s: "6", label: "Saison 6",              cover: "/res/episodes/season_6/601.webp" },
    { s: "C", label: "Miraculous World & Chibi", cover: "/res/episodes/season_6/601.webp" },
    { s: "S", label: "Spéciaux",              cover: "/res/episodes/season_6/601.webp" },
    { s: "T", label: "Tales of Miraculous",   cover: "/res/episodes/season_6/601.webp" },
    { s: "X", label: "Secrets & Making-of",   cover: "/res/episodes/season_6/601.webp" }
];

// ── Extension ─────────────────────────────────────────────────
class DefaultExtension extends MProvider {
    constructor() { super(); }

    getPreference(key) { return new SharedPreferences().get(key); }

    getLang() { return this.getPreference("mirk_lang") || "en"; }

    getHeaders(url) {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Referer": MIRK_BASE + "/",
            "Accept": "text/html,application/xhtml+xml,*/*",
            "Accept-Language": "en-US,en;q=0.9"
        };
    }

    get supportsLatest() { return true; }

    // ── getPopular: all season categories ────────────────────
    async getPopular(page) {
        if (page > 1) return { list: [], hasNextPage: false };
        var lang = this.getLang();
        var list = MIRK_SEASONS.map(function(def) {
            return {
                name: def.label,
                imageUrl: MIRK_BASE + def.cover,
                link: MIRK_BASE + "/" + lang + "/episodes?s=" + def.s
            };
        });
        return { list: list, hasNextPage: false };
    }

    // ── getLatestUpdates ──────────────────────────────────────
    async getLatestUpdates(page) { return this.getPopular(page); }

    // ── search ────────────────────────────────────────────────
    async search(query, page, filters) {
        if (page > 1) return { list: [], hasNextPage: false };
        var lang = this.getLang();
        var q = query.toLowerCase().trim();
        var miraculousTerms = ["miraculous", "ladybug", "cat noir", "marinette", "adrien", "chibi", "miraculum"];
        var isMiraculousQuery = miraculousTerms.some(function(k) {
            return q.includes(k) || k.includes(q);
        });
        var list = MIRK_SEASONS.filter(function(def) {
            return def.label.toLowerCase().includes(q) || isMiraculousQuery;
        }).map(function(def) {
            return {
                name: def.label,
                imageUrl: MIRK_BASE + def.cover,
                link: MIRK_BASE + "/" + lang + "/episodes?s=" + def.s
            };
        });
        return { list: list, hasNextPage: false };
    }

    // ── getDetail: fetch episodes live from season page ───────
    async getDetail(url) {
        var lang = this.getLang();
        var seasonM = url.match(/[?&]s=([^&\s]+)/);
        var season = seasonM ? seasonM[1] : "6";

        var def = null;
        for (var i = 0; i < MIRK_SEASONS.length; i++) {
            if (MIRK_SEASONS[i].s === season) { def = MIRK_SEASONS[i]; break; }
        }
        var label    = def ? def.label : ("Saison " + season);
        var coverUrl = def ? (MIRK_BASE + def.cover) : (MIRK_BASE + "/res/episodes/season_6/601.webp");

        var chapters = [];
        try {
            var fetchUrl = MIRK_BASE + "/" + lang + "/episodes?s=" + season;
            var res = await new Client().get(fetchUrl, this.getHeaders(fetchUrl));
            var doc = new Document(res.body);

            doc.select("a.episode_card_link").forEach(function(a) {
                var href  = a.attr("href") || "";
                var numEl = a.selectFirst("div.episode_number");
                var epNum = numEl ? numEl.text.trim() : "";
                var m = href.match(/s=([^&]+)&e=([^&\s"]+)/);
                if (!m) return;
                var s = m[1], e = m[2];
                chapters.push({
                    name: label + " — Épisode " + (epNum || e),
                    url: MIRK_BASE + "/" + lang + "/watch?s=" + s + "&e=" + e
                });
            });
        } catch (err) { /* ignore */ }

        if (chapters.length === 0) {
            chapters.push({
                name: "Voir sur miraculum.ml",
                url: MIRK_BASE + "/" + lang + "/episodes?s=" + season
            });
        }

        return {
            name: label,
            imageUrl: coverUrl,
            description: "Miraculous Ladybug — " + label + " · " + chapters.length + " épisode(s)\nmiraulum.ml",
            chapters: chapters
        };
    }

    // ── getVideoList: extract m3u8 token → HD + LQ ───────────
    // IMPORTANT: every entry MUST have both `url` and `originalUrl`
    async getVideoList(url) {
        var lang = this.getLang();
        var res;
        try {
            res = await new Client().get(url, this.getHeaders(url));
        } catch (err) {
            return [{ quality: "WebView", url: url, originalUrl: url }];
        }

        var body = res.body;

        var tokenM = body.match(/userToken\s*=\s*'([a-fA-F0-9]{60,})'/);
        var sM     = body.match(/var\s+seasonIdDownload\s*=\s*'([^']+)'/);
        var eM     = body.match(/var\s+episodeIdDownload\s*=\s*'([^']+)'/);
        var langM  = body.match(/var\s+phpLang\s*=\s*'([^']+)'/);

        if (!tokenM || !sM || !eM) {
            return [{ quality: "WebView", url: url, originalUrl: url }];
        }

        var token  = tokenM[1];
        var s      = sM[1];
        var e      = eM[1];
        var epLang = langM ? langM[1] : lang;

        var hdUrl = MIRK_INT + "/m3u8.m3u8?lang=" + epLang + "&s=" + s + "&e=" + e + "&token=" + token;
        var lqUrl = hdUrl + "&q=lq";

        return [
            { quality: "HD (1080p)", url: hdUrl, originalUrl: hdUrl },
            { quality: "LQ (480p)",  url: lqUrl, originalUrl: lqUrl }
        ];
    }

    // ── getFilterList ─────────────────────────────────────────
    getFilterList() { return []; }

    // ── getSourcePreferences ──────────────────────────────────
    getSourcePreferences() {
        return [
            {
                key: "mirk_lang",
                listPreference: {
                    title: "Langue / Doublage",
                    summary: "Langue des épisodes sur miraculum.ml",
                    valueIndex: 2,
                    entries: [
                        "العربية", "Deutsch", "English", "Español",
                        "Español (LatAm)", "Français", "Italiano",
                        "한국어", "日本語", "Polski", "Português",
                        "Português (Brasil)", "Русский", "Türkçe",
                        "普通話", "हिन्दी", "Tiếng Việt", "Bahasa Indonesia",
                        "Nederlands", "Svenska", "Čeština", "Română",
                        "Magyar", "Українська", "ภาษาไทย"
                    ],
                    entryValues: [
                        "ar", "de", "en", "es",
                        "es-419", "fr", "it",
                        "ko", "ja", "pl", "pt",
                        "pt-br", "ru", "tr",
                        "zh-cmn", "hi", "vi", "id",
                        "nl", "sv", "cs", "ro",
                        "hu", "uk", "th"
                    ]
                }
            }
        ];
    }
}
