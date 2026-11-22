// ══════════════════════════════════════════════════════════════
//  Miraculum — miraculum.ml → miraculous.now  v3.0.0
//  Miraculous Ladybug — S1–S7, Spéciaux, Webisodes
//  (Une journée à Paris · Les secrets · Chibi · Autres)
//  Recherche réelle (search.php) · HLS adaptatif · 51 langues
//  Le domaine historique miraculum.ml est conservé en repli :
//  la même base sert les deux hôtes.
// ══════════════════════════════════════════════════════════════

const watchtowerSources = [{
    "name": "Miraculum",
    "lang": "multi",
    "baseUrl": "https://miraculum.ml",
    "apiUrl": "https://internal.miraculum.ml",
    "iconUrl": "https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/assets/icons/watch-1900000130.png",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "3.0.1",
    "login": false,
    "forYou": false,
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "watch/multi/miraculum.js",
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "hasSubtitles": true,
    "hasDub": true,
    "notes": "Miraculous Ladybug — S1–S7, Spéciaux, Webisodes (Paris/Secrets/Chibi/Autres). Recherche, HLS Auto, 51 langues. Repli automatique vers miraculous.now."
}];

// miraculum.ml and miraculous.now serve the same catalogue; the historical
// domain is tried second because its origin has been returning 522.
var MIRK_HOSTS = ["https://miraculous.now", "https://miraculum.ml"];
var MIRK_INTERNAL = "https://internal.miraculum.ml";
var MN_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// Same list as the site: episodes the site itself hides (unreleased/blocked).
var MN_BLOCKED = ["707", "p101", "p102", "p103", "p104", "p105"];

// `s` values accepted by /<lang>/episodes?s=…
var MN_CATEGORIES = [
    { id: "season_7", s: "7", label: "Saison 7", poster: "/res/seasons/season_7.webp", folder: "season_7" },
    { id: "season_6", s: "6", label: "Saison 6", poster: "/res/seasons/season_6.webp", folder: "season_6" },
    { id: "season_5", s: "5", label: "Saison 5", poster: "/res/seasons/season_5.webp", folder: "season_5" },
    { id: "season_4", s: "4", label: "Saison 4", poster: "/res/seasons/season_4.webp", folder: "season_4" },
    { id: "season_3", s: "3", label: "Saison 3", poster: "/res/seasons/season_3.webp", folder: "season_3" },
    { id: "season_2", s: "2", label: "Saison 2", poster: "/res/seasons/season_2.webp", folder: "season_2" },
    { id: "season_1", s: "1", label: "Saison 1", poster: "/res/seasons/season_1.webp", folder: "season_1" },
    { id: "specials", s: "S", label: "Spéciaux", poster: "/res/seasons/specials.webp", folder: "specials" },
    { id: "webisodes_tales", s: "T", label: "Une journée à Paris", poster: "/res/seasons/webisodes_tales.webp", folder: "tales" },
    { id: "webisodes_secrets", s: "X", label: "Les secrets", poster: "/res/seasons/webisodes_secrets_1.webp", folder: "secrets" },
    { id: "webisodes_chibi", s: "C", label: "Miraculous Chibi", poster: "/res/seasons/webisodes_chibi_1.webp", folder: "chibi" },
    { id: "webisodes_other", s: "O", label: "Autres", poster: "/res/seasons/webisodes_other_1.webp", folder: "other" }
];

var MN_SEASON_LABELS = {
    "1": "Saison 1", "2": "Saison 2", "3": "Saison 3", "4": "Saison 4",
    "5": "Saison 5", "6": "Saison 6", "7": "Saison 7",
    "S": "Spéciaux", "T": "Une journée à Paris", "X": "Les secrets",
    "C": "Miraculous Chibi", "O": "Autres"
};

var MN_FOLDERS = {
    "1": "season_1", "2": "season_2", "3": "season_3", "4": "season_4",
    "5": "season_5", "6": "season_6", "7": "season_7",
    "S": "specials", "T": "tales", "X": "secrets", "C": "chibi", "O": "other"
};

class DefaultExtension extends MProvider {
    constructor() {
        super();
        var host = this.getPreference("mirk_host");
        this._host = host === "ml" ? 1 : 0;
    }

    getPreference(key) { return new SharedPreferences().get(key); }

    getLang() { return this.getPreference("mirk_lang") || "fr"; }

    _base() { return MIRK_HOSTS[this._host] || MIRK_HOSTS[0]; }

    getHeaders(url) {
        // /<lang>/episodes answers a JSON language list when the request
        // advertises application/json, so page reads must ask for HTML only.
        var json = /\/includes\/features\//.test(String(url || ""));
        return {
            "User-Agent": MN_UA,
            "Accept": json
                ? "application/json, text/plain, */*"
                : "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": this.getLang() + ",en;q=0.8",
            "Referer": this._base() + "/"
        };
    }

    get supportsLatest() { return true; }

    // ── Transport ─────────────────────────────────────────────

    async _get(url) {
        var lastError = null;
        var start = this._host;
        for (var attempt = 0; attempt < MIRK_HOSTS.length + 1; attempt++) {
            try {
                var res = await new Client().get(url, this.getHeaders(url));
                var body = res && res.body ? String(res.body) : "";
                if (body.length > 120) return res;
                lastError = new Error("empty response from " + url);
            } catch (e) {
                lastError = e;
            }
            var previous = MIRK_HOSTS[this._host];
            this._host = (this._host + 1) % MIRK_HOSTS.length;
            url = String(url).split(previous).join(MIRK_HOSTS[this._host]);
            if (attempt < MIRK_HOSTS.length) {
                await new Promise(function (r) { setTimeout(r, 400 + attempt * 400); });
            }
        }
        this._host = start;
        throw lastError || new Error("unreachable: " + url);
    }

    _abs(path) {
        if (!path) return "";
        if (/^https?:\/\//i.test(path)) return path;
        var clean = String(path).replace(/&amp;/g, "&").replace(/^(\.\.?\/)+/, "/");
        if (clean.charAt(0) !== "/") clean = "/" + clean;
        return this._base() + clean;
    }

    _watchUrl(href, lang) {
        if (!href) return "";
        if (/^https?:\/\//i.test(href)) return href;
        var clean = href.replace(/&amp;/g, "&");
        if (clean.charAt(0) === "/") return this._base() + clean;
        return this._base() + "/" + (lang || this.getLang()) + "/" + clean;
    }

    _episodesUrl(s) {
        return this._base() + "/" + this.getLang() + "/episodes?s=" + encodeURIComponent(s);
    }

    _category(id) {
        for (var i = 0; i < MN_CATEGORIES.length; i++) {
            if (MN_CATEGORIES[i].id === id || MN_CATEGORIES[i].s === id) return MN_CATEGORIES[i];
        }
        return null;
    }

    _clean(html) {
        if (!html) return "";
        var text = String(html)
            .replace(/<br\s*\/?>/gi, " ")
            .replace(/<[^>]*>/g, " ")
            .replace(/&nbsp;/gi, " ")
            .replace(/&#0?39;/g, "'")
            .replace(/&quot;/gi, "\"")
            .replace(/&amp;/gi, "&")
            .replace(/&lt;/gi, "<")
            .replace(/&gt;/gi, ">")
            .replace(/\s+/g, " ");
        return text.trim();
    }

    _episodeNumber(code) {
        var digits = String(code || "").match(/(\d+)\s*$/);
        if (!digits) return "";
        var n = parseInt(digits[1], 10);
        if (!isFinite(n)) return "";
        return String(n % 100);
    }

    // Standalone list items keep their season, chapters do not (see _episodeName).
    _withSeason(card, season) {
        var label = MN_SEASON_LABELS[season] || ("Saison " + season);
        return {
            name: label + " · " + card.name,
            link: card.link,
            imageUrl: card.imageUrl,
            description: card.description
        };
    }

    // Chapter labels stay short and start with the episode number: the app
    // reads the first number of a chapter name as its episode number, and a
    // "Saison N · ..." prefix made every chapter of a season report N.
    _episodeName(season, code, title) {
        var num = this._episodeNumber(code);
        var prefix = num ? "Ép. " + num : "Ép. " + code;
        return title ? prefix + " — " + title : prefix;
    }

    // List items (latest rail, search) stand alone, so they keep the season.
    _episodeLabel(season, code, title) {
        var label = MN_SEASON_LABELS[season] || ("Saison " + season);
        return label + " · " + this._episodeName(season, code, title);
    }

    _cover(season, code) {
        var folder = MN_FOLDERS[season];
        if (!folder || !code) return "";
        return this._base() + "/res/episodes/" + folder + "/" + code + ".webp";
    }

    // ── Parsing ───────────────────────────────────────────────

    _parseCards(html, seasonHint) {
        var out = [];
        if (!html) return out;
        var re = /<a\b[^>]*class="episode_card_link"[^>]*>([\s\S]*?)<\/a>/g;
        var m;
        while ((m = re.exec(html)) !== null) {
            var openTag = m[0].slice(0, m[0].indexOf(">") + 1);
            var hrefM = openTag.match(/href="([^"]+)"/);
            if (!hrefM) continue;
            var href = hrefM[1].replace(/&amp;/g, "&");
            var epM = href.match(/[?&]e=([^&\s]+)/);
            var sM = href.match(/[?&]s=([^&\s]+)/);
            if (!epM) continue;
            var code = decodeURIComponent(epM[1]);
            var season = sM ? decodeURIComponent(sM[1]) : (seasonHint || "");

            var body = m[1];
            var imgTag = body.match(/<img[^>]*episode_card_bg[^>]*>/i);
            var imgM = imgTag ? imgTag[0].match(/src="([^"]+)"/) : null;
            var titleM = body.match(/class="episode_title"[^>]*>([\s\S]*?)<\/div>/);
            var subM = body.match(/class="episode_subtitle"[^>]*>([\s\S]*?)<\/span>/);
            var durM = body.match(/class="episode_duration"[^>]*>([\s\S]*?)<\/span>/);
            var rateM = body.match(/class="episode_rating"[^>]*data-rating="([^"]*)"/);

            var title = this._clean(titleM ? titleM[1] : "");
            var sub = this._clean(subM ? subM[1] : "");
            var num = sub.split("/")[0].trim();
            var name = this._episodeName(season, code, title);
            if (num && title) name = "Ép. " + num + " — " + title;

            out.push({
                name: name,
                link: this._watchUrl(href),
                imageUrl: this._cover(season, code) || (imgM ? this._abs(imgM[1]) : ""),
                description: (durM ? this._clean(durM[1]) : "") + (rateM ? " · ★ " + rateM[1] : "")
            });
        }
        return out;
    }

    _parseHero(html) {
        var titleM = html.match(/class="season-hero-title"[^>]*>([\s\S]*?)<\/h1>/);
        var posterM = html.match(/<img[^>]*class="season-hero-poster[^"]*"[^>]*src="([^"]+)"/) ||
                      html.match(/class="season-hero-poster[^"]*"[^>]*src="([^"]+)"/);
        var descM = html.match(/class="season-hero-desc"[^>]*>([\s\S]*?)<\/p>/);
        return {
            name: this._clean(titleM ? titleM[1] : ""),
            poster: posterM ? this._abs(posterM[1].replace(/&amp;/g, "&")) : "",
            description: this._clean(descM ? descM[1] : "")
        };
    }

    // ── Catalogue ─────────────────────────────────────────────

    async getPopular(page) {
        if (page > 1) return { list: [], hasNextPage: false };
        var lang = this.getLang();
        var base = this._base();
        var list = MN_CATEGORIES.map(function (cat) {
            return {
                name: cat.label,
                link: base + "/" + lang + "/episodes?s=" + encodeURIComponent(cat.s),
                imageUrl: base + cat.poster,
                description: "Miraculous — " + cat.label
            };
        });
        return { list: list, hasNextPage: false };
    }

    async getLatestUpdates(page) {
        if (page > 1) return { list: [], hasNextPage: false };
        var self = this;
        var lang = this.getLang();
        var items = [];
        try {
            var res = await this._get(this._base() + "/includes/features/new_episodes/get_episodes.php?lang=" + encodeURIComponent(lang));
            var data = JSON.parse(res.body || "{}");
            items = (data.episodes || []).map(function (e) {
                var parts = String(e.s_e || "").split(":");
                return { season: parts[0] || "", code: parts[1] || "" };
            }).filter(function (e) {
                return e.season && e.code && MN_BLOCKED.indexOf(e.code) === -1;
            });
        } catch (e) { items = []; }

        var list = [];
        var cardsBySeason = {};
        if (items.length) {
            var seasons = {};
            items.forEach(function (e) { seasons[e.season] = true; });
            for (var s in seasons) {
                try {
                    var pageRes = await this._get(this._episodesUrl(s));
                    cardsBySeason[s] = this._parseCards(pageRes.body, s);
                } catch (e) { cardsBySeason[s] = []; }
            }
            var seen = {};
            items.forEach(function (e) {
                var cards = cardsBySeason[e.season] || [];
                for (var i = 0; i < cards.length; i++) {
                    var c = cards[i];
                    if (seen[c.link]) continue;
                    if (c.link.indexOf("e=" + e.code) !== -1) {
                        seen[c.link] = true;
                        list.push(self._withSeason(c, e.season));
                        break;
                    }
                }
            });
        }

        if (list.length < 12) {
            var newest = "7";
            for (var n = 7; n >= 1; n--) {
                if (cardsBySeason[String(n)] && cardsBySeason[String(n)].length) { newest = String(n); break; }
            }
            var seasonCards = cardsBySeason[newest];
            if (!seasonCards || !seasonCards.length) {
                var fallback = await this._get(this._episodesUrl(newest));
                seasonCards = this._parseCards(fallback.body, newest);
            }
            var known = {};
            list.forEach(function (item) { known[item.link] = true; });
            var tail = seasonCards.slice(-14).reverse();
            for (var j = 0; j < tail.length && list.length < 12; j++) {
                if (known[tail[j].link]) continue;
                known[tail[j].link] = true;
                list.push(self._withSeason(tail[j], newest));
            }
        }
        return { list: list, hasNextPage: false };
    }

    async search(query, page, filterList) {
        if (page > 1) return { list: [], hasNextPage: false };
        var q = String(query || "").trim();
        if (!q) return await this.getPopular(1);

        var lang = this.getLang();
        var url = this._base() + "/includes/features/search/search.php?q=" + encodeURIComponent(q) +
                  "&lang=" + encodeURIComponent(lang);
        var res = await this._get(url);
        var data = {};
        try { data = JSON.parse(res.body || "{}"); } catch (e) { data = {}; }

        var wantedSeason = this._filterValue(filterList, "Saison") || "";
        var episodes = data.episodes || [];
        var list = [];
        for (var i = 0; i < episodes.length; i++) {
            var ep = episodes[i];
            var season = String(ep.season || "");
            var code = String(ep.episode || "");
            if (!season || !code) continue;
            if (MN_BLOCKED.indexOf(code) !== -1) continue;
            if (wantedSeason && season !== wantedSeason) continue;
            var title = this._clean(ep.content || "");
            list.push({
                name: this._episodeLabel(season, code, title),
                link: this._watchUrl("watch?s=" + encodeURIComponent(season) + "&e=" + encodeURIComponent(code), lang),
                imageUrl: this._cover(season, code),
                description: (ep.blurred ? "Spoiler · " : "") + (MN_SEASON_LABELS[season] || season)
            });
        }
        return { list: list, hasNextPage: false };
    }

    async getCustomList(listId, page) {
        var p = Math.max(1, parseInt(page, 10) || 1);
        if (p > 1) return { list: [], hasNextPage: false };
        if (listId === "popular" || listId === "seasons") return await this.getPopular(p);
        if (listId === "latest") return await this.getLatestUpdates(p);

        var cat = this._category(listId);
        if (!cat) return { list: [], hasNextPage: false };
        var res = await this._get(this._episodesUrl(cat.s));
        var cards = this._parseCards(res.body, cat.s);
        return { list: cards, hasNextPage: false };
    }

    // ── Detail ────────────────────────────────────────────────

    async getDetail(url) {
        var lang = this.getLang();
        if (/[?&]e=/.test(url)) return await this._episodeDetail(url, lang);

        var sM = url.match(/[?&]s=([^&\s]+)/);
        var s = sM ? decodeURIComponent(sM[1]) : "7";
        var cat = this._category(s);
        var res = await this._get(this._episodesUrl(s));
        var html = res.body || "";
        var hero = this._parseHero(html);
        var cards = this._parseCards(html, s);
        var label = cat ? cat.label : (hero.name || ("Saison " + s));

        var chapters = cards.map(function (card, index) {
            return {
                name: card.name,
                url: card.link,
                thumbnailUrl: card.imageUrl,
                description: card.description
            };
        });

        return {
            name: label,
            imageUrl: hero.poster || (cat ? this._base() + cat.poster : (cards[0] ? cards[0].imageUrl : "")),
            description: (hero.description || ("Miraculous Ladybug — " + label)) + "\n" + chapters.length + " épisode(s)",
            chapters: chapters
        };
    }

    async _episodeDetail(url, lang) {
        var res = await this._get(url);
        var html = res.body || "";
        var titleM = html.match(/<h1[^>]*class="[^"]*"[^>]*>([\s\S]*?)<\/h1>/) || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
        var ogTitleM = html.match(/property="og:title"[^>]*content="([^"]*)"/);
        var ogImageM = html.match(/property="og:image"[^>]*content="([^"]*)"/);
        var descM = html.match(/name="description"[^>]*content="([^"]*)"/);
        var sM = html.match(/seasonIdDownload\s*=\s*'([^']+)'/);
        var eM = html.match(/episodeIdDownload\s*=\s*'([^']+)'/);
        var season = sM ? sM[1] : "";
        var code = eM ? eM[1] : "";
        var title = this._clean(titleM ? titleM[1] : "") ||
                    this._clean(ogTitleM ? ogTitleM[1] : "").split(" – ")[0];
        var image = ogImageM ? this._abs(ogImageM[1]) : this._cover(season, code);

        // The item name must identify the episode on its own: the download
        // writer derives the file name from it, so a series-level title here
        // gave every episode of the season the same name.
        var episodeLabel = this._episodeLabel(season, code, title);
        var chapters = [{ name: this._episodeName(season, code, title), url: url, thumbnailUrl: image }];

        if (season) {
            try {
                var seasonRes = await this._get(this._episodesUrl(season));
                var cards = this._parseCards(seasonRes.body, season);
                for (var i = 0; i < cards.length; i++) {
                    if (cards[i].link === url) continue;
                    chapters.push({
                        name: cards[i].name,
                        url: cards[i].link,
                        thumbnailUrl: cards[i].imageUrl,
                        description: cards[i].description
                    });
                }
            } catch (e) { /* keep the single episode */ }
        }

        return {
            name: episodeLabel,
            imageUrl: image,
            description: this._clean(descM ? descM[1] : "") || ("Miraculous Ladybug — " + (MN_SEASON_LABELS[season] || "")),
            chapters: chapters
        };
    }

    // ── Playback ──────────────────────────────────────────────

    async getVideoList(url) {
        var res = await this._get(url);
        var html = res.body || "";

        var tokenM = html.match(/userToken\s*=\s*'([A-Za-z0-9]+)'/);
        var sM = html.match(/seasonIdDownload\s*=\s*'([^']+)'/);
        var eM = html.match(/episodeIdDownload\s*=\s*'([^']+)'/);
        var langM = html.match(/phpLang\s*=\s*'([^']+)'/);
        var internalM = html.match(/INTERNAL_URL\s*=\s*"([^"]+)"/);

        if (!tokenM || !sM || !eM) {
            return [{ quality: "WebView", url: url, originalUrl: url }];
        }

        var internal = internalM ? internalM[1] : MIRK_INTERNAL;
        var lang = langM ? langM[1] : this.getLang();
        var stream = internal + "/m3u8.m3u8?lang=" + encodeURIComponent(lang) +
                     "&s=" + encodeURIComponent(sM[1]) +
                     "&e=" + encodeURIComponent(eM[1]) +
                     "&token=" + tokenM[1];

        // The internal proxy answers 522 intermittently; the site page is a
        // working fallback when the HLS master cannot be fetched.
        return [{
            quality: "Auto",
            url: stream,
            originalUrl: stream,
            headers: { "Referer": this._base() + "/", "User-Agent": MN_UA }
        }, {
            quality: "WebView",
            url: url,
            originalUrl: url
        }];
    }

    // ── Filters & preferences ─────────────────────────────────

    _filterValue(filterList, name) {
        if (!filterList || !filterList.length) return "";
        for (var i = 0; i < filterList.length; i++) {
            var f = filterList[i];
            if (f && f.name === name && f.values && f.values[f.state]) return f.values[f.state].value || "";
        }
        return "";
    }

    getFilterList() {
        function opt(name, value) { return { type_name: "SelectOption", name: name, value: value }; }
        var values = [opt("Toutes les saisons", "")];
        MN_CATEGORIES.forEach(function (cat) {
            values.push(opt(cat.label, cat.s));
        });
        return [{ type_name: "SelectFilter", name: "Saison", state: 0, values: values }];
    }

    getSourcePreferences() {
        return [{
            key: "mirk_host",
            listPreference: {
                title: "Serveur",
                summary: "miraculum.ml et miraculous.now servent le même catalogue",
                valueIndex: 0,
                entries: ["Automatique (miraculous.now)", "miraculous.now", "miraculum.ml"],
                entryValues: ["auto", "now", "ml"]
            }
        }, {
            key: "mirk_lang",
            listPreference: {
                title: "Langue / Doublage",
                summary: "Langue des pages, des titres et de la piste audio par défaut",
                valueIndex: 0,
                entries: [
                    "Français", "English", "Español", "Español (LatAm)", "Deutsch",
                    "Italiano", "Português", "Português (Brasil)", "Nederlands",
                    "Polski", "Türkçe", "Русский", "Українська", "العربية",
                    "العربية (مصر)", "עברית", "हिन्दी", "日本語", "한국어", "中文",
                    "Čeština", "Dansk", "Suomi", "Norsk", "Svenska", "Magyar",
                    "Română", "Български", "Hrvatski", "Srpski", "Slovenčina",
                    "Slovenščina", "Lietuvių", "Latviešu", "Eesti", "Ελληνικά",
                    "Azərbaycan", "Català", "Euskara", "Galego", "Cymraeg",
                    "Gaeilge", "فارسی", "Bahasa Indonesia", "Bahasa Melayu",
                    "Tiếng Việt", "ไทย", "ქართული", "Монгол", "Oʻzbekcha", "සිංහල",
                    "Shqip", "Հայերեն", "اردو"
                ],
                entryValues: [
                    "fr", "en", "es", "es-419", "de",
                    "it", "pt", "pt-br", "nl",
                    "pl", "tr", "ru", "uk", "ar",
                    "ar-eg", "he", "hi", "ja", "ko", "zh",
                    "cs", "da", "fi", "no", "sv", "hu",
                    "ro", "bg", "hr", "sr", "sk",
                    "sl", "lt", "lv", "et", "el",
                    "az", "ca", "eu", "gl", "cy",
                    "ga", "fa", "id", "ms",
                    "vi", "th", "ka", "mn", "uz", "si",
                    "sq", "hy", "ur"
                ]
            }
        }];
    }
}
