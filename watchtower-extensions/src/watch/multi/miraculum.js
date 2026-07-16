// ══════════════════════════════════════════════════════════════
//  Miraculum — miraculum.ml  v2.0.0
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
    "version": "2.0.0",
    "pkgPath": "watch/multi/miraculum.js",
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "hasSubtitles": true,
    "hasDub": true,
    "isNsfw": false,
    "hasCloudflare": true,
    "notes": "Miraculous Ladybug — S1–S6 + World/Chibi/Spéciaux/Tales/Secrets. Qualité HD/LQ. 40+ langues."
}];

// ── Constants ─────────────────────────────────────────────────
var MIRK_BASE = "https://miraculum.ml";
var MIRK_INT  = "https://internal.miraculum.ml";

// All content categories on miraculum.ml
// cover: first episode thumbnail path (relative to MIRK_BASE)
var MIRK_SEASONS = [
    {
        s: "1", label: "Saison 1",
        desc: "Saison 1 — 26 épisodes. Stormy Weather, Bubbler, Lady Wifi…",
        cover: "/res/episodes/season_1/101.webp"
    },
    {
        s: "2", label: "Saison 2",
        desc: "Saison 2 — 26 épisodes. The Collector, Riposte, Syren…",
        cover: "/res/episodes/season_2/201.webp"
    },
    {
        s: "3", label: "Saison 3",
        desc: "Saison 3 — 26 épisodes. Chameleon, Animaestro, Bakerix…",
        cover: "/res/episodes/season_3/301.webp"
    },
    {
        s: "4", label: "Saison 4",
        desc: "Saison 4 — 26 épisodes. Truth, Lies, Gang of Secrets…",
        cover: "/res/episodes/season_4/401.webp"
    },
    {
        s: "5", label: "Saison 5",
        desc: "Saison 5 — 27 épisodes. Evolution, Multiplication, Jubilation…",
        cover: "/res/episodes/season_5/501.webp"
    },
    {
        s: "6", label: "Saison 6",
        desc: "Saison 6 — épisodes en cours. Climatiqueen…",
        cover: "/res/episodes/season_6/601.webp"
    },
    {
        s: "C", label: "Miraculous World & Chibi",
        desc: "51 épisodes — films Miraculous World, épisodes Chibi et specials animés.",
        cover: "/res/episodes/season_6/601.webp"
    },
    {
        s: "S", label: "Spéciaux",
        desc: "7 épisodes spéciaux — New York, Shanghaï et autres.",
        cover: "/res/episodes/season_6/601.webp"
    },
    {
        s: "T", label: "Tales of Miraculous",
        desc: "5 épisodes — Tales of Miraculous.",
        cover: "/res/episodes/season_6/601.webp"
    },
    {
        s: "X", label: "Secrets & Making-of",
        desc: "39 contenus exclusifs — making-of, secrets, bonus.",
        cover: "/res/episodes/season_6/601.webp"
    }
];

// ── Extension ─────────────────────────────────────────────────
class DefaultExtension extends MProvider {
    constructor() { super(); }

    getPreference(key) { return new SharedPreferences().get(key); }

    // Language of the miraculum.ml pages (affects dubbing)
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

    // ── Build popular list: all season/content categories ────
    async getPopularList(page) {
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

    async getLatestList(page) { return this.getPopularList(page); }

    async getSearchList(query, page, filters) {
        if (page > 1) return { list: [], hasNextPage: false };
        var lang = this.getLang();
        var q = query.toLowerCase().trim();
        var list = MIRK_SEASONS.filter(function(def) {
            return def.label.toLowerCase().includes(q) ||
                   def.desc.toLowerCase().includes(q) ||
                   ["miraculous","ladybug","cat noir","marinette","adrien","chibi","miraculum"]
                       .some(function(k){ return q.includes(k) || k.includes(q); });
        }).map(function(def) {
            return {
                name: def.label,
                imageUrl: MIRK_BASE + def.cover,
                link: MIRK_BASE + "/" + lang + "/episodes?s=" + def.s
            };
        });
        return { list: list, hasNextPage: false };
    }

    // ── Detail: fetch episodes live from episodes page ────────
    async getDetail(url) {
        var lang = this.getLang();

        // Extract season from URL (?s=X)
        var seasonM = url.match(/[?&]s=([^&\s]+)/);
        var season = seasonM ? seasonM[1] : "6";

        // Find season definition
        var def = null;
        for (var i = 0; i < MIRK_SEASONS.length; i++) {
            if (MIRK_SEASONS[i].s === season) { def = MIRK_SEASONS[i]; break; }
        }
        var label    = def ? def.label    : ("Saison " + season);
        var desc     = def ? def.desc     : "Miraculous Ladybug";
        var coverUrl = def ? (MIRK_BASE + def.cover) : (MIRK_BASE + "/res/episodes/season_6/601.webp");

        // Fetch the season's episode list
        var chapters = [];
        try {
            var fetchUrl = MIRK_BASE + "/" + lang + "/episodes?s=" + season;
            var res = await new Client().get(fetchUrl, this.getHeaders(fetchUrl));
            var doc = new Document(res.body);

            doc.select("a.episode_card_link").forEach(function(a) {
                var href   = a.attr("href") || "";
                var numEl  = a.selectFirst("div.episode_number");
                var epNum  = numEl ? numEl.text.trim() : "";
                var m = href.match(/s=([^&]+)&e=([^&\s"]+)/);
                if (!m) return;
                var s = m[1], e = m[2];
                var epLabel = epNum ? ("Épisode " + epNum) : e;
                chapters.push({
                    name: epLabel,
                    url: MIRK_BASE + "/" + lang + "/watch?s=" + s + "&e=" + e
                });
            });
        } catch (err) { /* ignore fetch error */ }

        if (chapters.length === 0) {
            chapters.push({
                name: "Ouvrir sur miraculum.ml",
                url: MIRK_BASE + "/" + lang + "/episodes?s=" + season
            });
        }

        return {
            name: label,
            imageUrl: coverUrl,
            description: desc + "\n\nmiraulum.ml — " + chapters.length + " épisode(s) disponible(s)",
            chapters: chapters
        };
    }

    // ── Video: extract m3u8 token and return HD + LQ ─────────
    async getVideoList(url) {
        var lang = this.getLang();

        var res;
        try {
            res = await new Client().get(url, this.getHeaders(url));
        } catch (err) {
            return [{ quality: "WebView", url: url }];
        }

        var body = res.body;

        // Extract fields from inline JS
        var tokenM = body.match(/userToken\s*=\s*'([a-fA-F0-9]{60,})'/);
        var sM     = body.match(/var\s+seasonIdDownload\s*=\s*'([^']+)'/);
        var eM     = body.match(/var\s+episodeIdDownload\s*=\s*'([^']+)'/);
        var langM  = body.match(/var\s+phpLang\s*=\s*'([^']+)'/);

        if (!tokenM || !sM || !eM) {
            // Fallback: open in WebView so player.js can load the video itself
            return [{ quality: "WebView", url: url }];
        }

        var token   = tokenM[1];
        var s       = sM[1];
        var e       = eM[1];
        var epLang  = langM ? langM[1] : lang;

        // Build HLS URLs (HD default, LQ via &q=lq)
        var base = MIRK_INT + "/m3u8.m3u8?lang=" + epLang
                             + "&s=" + s
                             + "&e=" + e
                             + "&token=" + token;

        return [
            { quality: "HD (1080p)", url: base },
            { quality: "LQ (480p)",  url: base + "&q=lq" }
        ];
    }

    // ── Preferences ──────────────────────────────────────────
    getPreferenceList() {
        return [
            {
                key: "mirk_lang",
                listPreference: {
                    title: "Langue / Doublage",
                    summary: "Langue des épisodes sur miraculum.ml",
                    valueIndex: 2,  // English default
                    entries: [
                        "العربية", "Deutsch", "English", "Español",
                        "Español (LatAm)", "Français", "Italiano",
                        "한국어", "日本語", "Polski", "Português",
                        "Português (Brasil)", "Русский", "Türkçe",
                        "普通話", "हिन्दी", "اردو", "Tiếng Việt",
                        "ภาษาไทย", "Bahasa Indonesia", "Nederlands",
                        "Svenska", "Norsk", "Suomi", "Dansk",
                        "Čeština", "Română", "Magyar", "Hrvatski",
                        "Slovenčina", "Slovenščina", "Srpski",
                        "Български", "Ελληνικά", "Українська",
                        "עברית", "فارسی", "台灣話", "粵語"
                    ],
                    entryValues: [
                        "ar", "de", "en", "es",
                        "es-419", "fr", "it",
                        "ko", "ja", "pl", "pt",
                        "pt-br", "ru", "tr",
                        "zh-cmn", "hi", "ur", "vi",
                        "th", "id", "nl",
                        "sv", "no", "fi", "da",
                        "cs", "ro", "hu", "hr",
                        "sk", "sl", "sr",
                        "bg", "el", "uk",
                        "he", "fa", "zh-tw", "zh-yue"
                    ]
                }
            }
        ];
    }
}
