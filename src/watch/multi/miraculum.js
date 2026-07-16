// ══════════════════════════════════════════════════════════════
//  Miraculum — miraculum.ml
//  v2.1.0 — Miraculous Ladybug full episodes in 40+ languages
//  Seasons 1–6 + Miraculous World specials
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
    "pkgPath": "watch/multi/miraculum.js",
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "hasSubtitles": true,
    "hasDub": true,
    "isNsfw": false,
    "hasCloudflare": true,
    "notes": "v2.1.0 — fix: méthodes renommées (getPopular/getLatestUpdates/search/getSourcePreferences), originalUrl, getFilterList"
}];

// ── Constants ─────────────────────────────────────────────────
var MIRK_BASE   = "https://miraculum.ml";
var MIRK_INT    = "https://internal.miraculum.ml";
var MIRK_CDN    = "https://Amexd.b-cdn.net/eps/miraculum";
var MIRK_COVER  = "https://miraculum.ml/res/thumbs/s6/601.webp";
var MIRK_POSTER = "https://miraculum.ml/android-chrome-192x192.png";

// Known season definitions: [season_id, episode_count, label]
var MIRK_SEASONS = [
    { s: "6", count: 26, label: "Saison 6" },
    { s: "5", count: 27, label: "Saison 5" },
    { s: "4", count: 27, label: "Saison 4" },
    { s: "3", count: 26, label: "Saison 3" },
    { s: "2", count: 26, label: "Saison 2" },
    { s: "1", count: 26, label: "Saison 1" },
    { s: "C", count: 25, label: "Miraculous World & Specials" },
    { s: "X", count: 10, label: "Extras" }
];

// ── Extension class ───────────────────────────────────────────
class DefaultExtension extends MProvider {
    constructor() { super(); }

    getPreference(key) { return new SharedPreferences().get(key); }

    getLang() { return this.getPreference("mirk_lang") || "en"; }

    getSeasonPref() { return this.getPreference("mirk_season") || "6"; }

    getHeaders(url) {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Referer": MIRK_BASE + "/",
            "Accept": "text/html,application/xhtml+xml,*/*",
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8"
        };
    }

    get supportsLatest() { return true; }

    // ── Popular / Latest ─────────────────────────────────────
    async getPopular(page) {
        if (page > 1) return { list: [], hasNextPage: false };
        var lang = this.getLang();
        return {
            list: [{
                name: "Miraculous: Tales of Ladybug & Cat Noir",
                imageUrl: MIRK_COVER,
                link: MIRK_BASE + "/" + lang + "/episodes"
            }],
            hasNextPage: false
        };
    }

    async getLatestUpdates(page) { return this.getPopular(page); }

    async search(query, page, filters) {
        if (page > 1) return { list: [], hasNextPage: false };
        var q = query.toLowerCase();
        var keywords = ["miraculous","ladybug","cat noir","marinette","adrien","miraculum"];
        var match = keywords.some(function(k) { return k.includes(q) || q.includes(k); });
        if (!match) return { list: [], hasNextPage: false };
        return this.getPopular(1);
    }

    // ── Detail: episodes for selected season ─────────────────
    async getDetail(url) {
        var lang = this.getLang();
        var seasonPref = this.getSeasonPref();
        var chapters = [];
        var seasonDef = null;

        for (var i = 0; i < MIRK_SEASONS.length; i++) {
            if (MIRK_SEASONS[i].s === seasonPref) { seasonDef = MIRK_SEASONS[i]; break; }
        }

        if (seasonDef) {
            try {
                var epUrl = MIRK_BASE + "/" + lang + "/episodes";
                var res = await new Client().get(epUrl, this.getHeaders(epUrl));
                var doc = new Document(res.body);
                var allLinks = doc.select("a.episode_card_link");

                if (allLinks.length > 0) {
                    allLinks.forEach(function(a) {
                        var href = a.attr("href") || "";
                        var epDiv = a.selectFirst("div.episode_number");
                        var epNum = epDiv ? epDiv.text.trim() : "";
                        var m = href.match(/s=([^&]+)&e=([^&\s]+)/);
                        if (!m) return;
                        var s = m[1], e = m[2];
                        if (s !== seasonPref) return;
                        chapters.push({
                            name: "S" + s + " — Épisode " + (epNum || e),
                            url: MIRK_BASE + "/" + lang + "/watch?s=" + s + "&e=" + e
                        });
                    });
                }
            } catch(err) { /* fallback below */ }

            if (chapters.length === 0) {
                var s = seasonDef.s;
                var count = seasonDef.count;
                for (var ep = 1; ep <= count; ep++) {
                    var epId, epNum;
                    if (s === "C") {
                        epNum = ep < 10 ? "0" + ep : "" + ep;
                        epId = "c" + epNum;
                    } else if (s === "X") {
                        epNum = ep < 10 ? "0" + ep : "" + ep;
                        epId = "x" + epNum;
                    } else {
                        epNum = ep < 10 ? "0" + ep : "" + ep;
                        epId = s + epNum;
                    }
                    chapters.push({
                        name: seasonDef.label + " — Épisode " + ep,
                        url: MIRK_BASE + "/" + lang + "/watch?s=" + s + "&e=" + epId
                    });
                }
            }
        }

        if (chapters.length === 0) {
            try {
                var epUrl2 = MIRK_BASE + "/" + lang + "/episodes";
                var res2 = await new Client().get(epUrl2, this.getHeaders(epUrl2));
                var doc2 = new Document(res2.body);
                doc2.select("a.episode_card_link").forEach(function(a) {
                    var href = a.attr("href") || "";
                    var epDiv = a.selectFirst("div.episode_number");
                    var epNum = epDiv ? epDiv.text.trim() : "";
                    var m = href.match(/s=([^&]+)&e=([^&\s]+)/);
                    if (!m) return;
                    var s = m[1], e = m[2];
                    chapters.push({
                        name: "S" + s + " — Épisode " + (epNum || e),
                        url: MIRK_BASE + "/" + lang + "/watch?s=" + s + "&e=" + e
                    });
                });
            } catch(err) { /* silently fail */ }
        }

        return {
            name: "Miraculous: Tales of Ladybug & Cat Noir",
            imageUrl: MIRK_COVER,
            description: "Regardez Miraculous Ladybug en " + lang.toUpperCase() + " sur miraculum.ml.\nSaisons 1–6 + Miraculous World en 40+ langues.",
            chapters: chapters
        };
    }

    // ── Video list ────────────────────────────────────────────
    async getVideoList(url) {
        var res;
        try {
            res = await new Client().get(url, this.getHeaders(url));
        } catch(err) {
            return [{ quality: "WebView", url: url, originalUrl: url }];
        }

        var body = res.body;
        var tokenM = body.match(/userToken\s*=\s*'([a-fA-F0-9]{64})'/);
        var sM     = body.match(/seasonIdDownload\s*=\s*'([^']+)'/);
        var eM     = body.match(/episodeIdDownload\s*=\s*'([^']+)'/);
        var langM  = body.match(/phpLang\s*=\s*'([^']+)'/);

        if (!tokenM || !sM || !eM) {
            return [{ quality: "WebView", url: url, originalUrl: url }];
        }

        var token = tokenM[1];
        var s     = sM[1];
        var e     = eM[1];
        var lang  = langM ? langM[1] : this.getLang();
        var base  = MIRK_INT + "/m3u8.m3u8?lang=" + lang + "&s=" + s + "&e=" + e + "&token=" + token;
        var hdUrl = base;
        var lqUrl = base + "&q=lq";

        return [
            { quality: "HD",       url: hdUrl, originalUrl: hdUrl },
            { quality: "SD (LQ)",  url: lqUrl, originalUrl: lqUrl }
        ];
    }

    // ── Filters & Preferences ─────────────────────────────────
    getFilterList() { return []; }

    getSourcePreferences() {
        return [
            {
                key: "mirk_lang",
                listPreference: {
                    title: "Langue des épisodes",
                    summary: "Sélectionnez la langue de doublage",
                    valueIndex: 12,
                    entries: [
                        "العربية (Fusha)", "العربية (Masriyya)", "Amharic", "Bengali",
                        "Български", "Català", "Cymraeg", "Čeština",
                        "Dansk", "Deutsch", "Eesti", "Ελληνικά",
                        "English", "Español", "Español (Latinoamérica)", "Euskara",
                        "Farsi", "Filipino", "Français", "Gaeilge",
                        "Galego", "한국어", "Հայերեն", "हिन्दी",
                        "Hrvatski", "Bahasa Indonesia", "Italiano", "עברית",
                        "ქართული", "Қазақша", "Latviešu", "Lietuvių",
                        "Magyar", "Melayu", "Монгол", "Nederlands",
                        "日本語", "Norsk", "O'zbekcha", "Polski",
                        "Português", "Português (Brasil)", "Română", "Русский",
                        "Shqip", "Slovenčina", "Slovenščina", "Srpski",
                        "Suomi", "Svenska", "தமிழ்", "Telugu",
                        "ภาษาไทย", "Türkçe", "Українська", "اردو",
                        "Uyghur", "Tiếng Việt", "普通話 (Mandarin)", "粵語 (Cantonese)",
                        "台灣話 (Taiwanese)", "Sinhala", "Galego"
                    ],
                    entryValues: [
                        "ar", "ar-eg", "am", "bn",
                        "bg", "ca", "cy", "cs",
                        "da", "de", "et", "el",
                        "en", "es", "es-419", "eu",
                        "fa", "fil", "fr", "ga",
                        "gl", "ko", "hy", "hi",
                        "hr", "id", "it", "he",
                        "ka", "kk", "lv", "lt",
                        "hu", "ms", "mn", "nl",
                        "ja", "no", "uz", "pl",
                        "pt", "pt-br", "ro", "ru",
                        "sq", "sk", "sl", "sr",
                        "fi", "sv", "ta", "te",
                        "th", "tr", "uk", "ur",
                        "ug", "vi", "zh-cmn", "zh-yue",
                        "zh-tw", "si", "gl"
                    ]
                }
            },
            {
                key: "mirk_season",
                listPreference: {
                    title: "Saison à afficher",
                    summary: "Sélectionnez la saison dans getDetail",
                    valueIndex: 0,
                    entries: [
                        "Saison 6 (2024)", "Saison 5", "Saison 4",
                        "Saison 3", "Saison 2", "Saison 1",
                        "Miraculous World & Specials", "Extras"
                    ],
                    entryValues: ["6", "5", "4", "3", "2", "1", "C", "X"]
                }
            }
        ];
    }
}
