// ══════════════════════════════════════════════════════════════
//  Miraculous Now — miraculous.now
//  Miraculous Ladybug — S1–S7, Spéciaux, Webisodes
//  (Une journée à Paris · Les secrets · Chibi · Autres)
//  Recherche réelle (search.php) · HLS adaptatif · 51 langues
// ══════════════════════════════════════════════════════════════

const watchtowerSources = [{
    "name": "Miraculous Now",
    "lang": "multi",
    "baseUrl": "https://miraculous.now",
    "apiUrl": "https://internal.miraculous.now",
    "iconUrl": "https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/assets/icons/watch-2000001175.png",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "1.6.2",
    "login": false,
    "forYou": false,
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "watch/multi/miraculous_now.js",
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "hasSubtitles": true,
    "hasDub": true,
    "notes": "Miraculous Ladybug — S1–S7, Spéciaux, Webisodes (Paris/Secrets/Chibi/Autres). Recherche, HLS multi-langues (20 pistes), commentaires. Une origine injoignable remonte son vrai code (HTTP 52x) au lieu d'un accueil vide."
}];

var MN_BASE = "https://miraculous.now";
var MN_INTERNAL = "https://internal.miraculous.now";
var MN_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// The origin answers HTTP 522 from time to time; a page read is retried once.
var MN_TRIES = 2;

// Retries stop once a single read has already burned this much time, and a
// successful body is reused for a few minutes: the site is slow (10 s+ per
// page) and the app serialises every call through one runtime, so a repeated
// read is what pushes `getDetail` past its 60 s budget ("0 épisode").
var MN_TRY_BUDGET = 4000;
var MN_CACHE = {};

// Cloudflare answers 52x when the origin itself is unreachable (the site is
// down, not slow). The app serialises every extension call through one runtime,
// so ten seconds of retries made the seven queued rails die at the 60 s budget
// and the source looked dead. One probe marks the origin down, and every call
// made during the window fails immediately instead of queueing behind a stall.
var MN_DOWN_UNTIL = 0;
var MN_DOWN_WINDOW = 30000;
// The breaker is also written to the store, so reopening the app during an
// outage does not pay for a new 10 s probe.
var MN_DOWN_KEY = "miraculous.downUntil";
var MN_DOWN_STATUS_KEY = "miraculous.downStatus";
var MN_DOWN_PERSIST = 90000;
// The status the origin answered with, so the error screen shows the real code
// (523 "origin unreachable", 522 "connection timed out") instead of a guess.
var MN_DOWN_STATUS = 523;

// A rail read from the local store is served for a week after the last
// successful fetch: long enough to bridge an outage, short enough that a
// changed catalogue is not shown forever.
var MN_RAIL_TTL = 7 * 24 * 3600 * 1000;

// A dead origin holds the connection ~20 s before Cloudflare answers 522. The
// app's default client waits 60 s; this one gives up after 10 s so the first
// probe of an outage costs seconds, not a minute.
var MN_HTTP_TIMEOUT = 10;
var MN_CLIENT = null;

function mnDownUntil() {
    if (MN_DOWN_UNTIL) return MN_DOWN_UNTIL;
    try {
        var prefs = new SharedPreferences();
        var v = parseInt(prefs.getString(MN_DOWN_KEY, ""), 10);
        if (!isNaN(v) && v > Date.now()) {
            MN_DOWN_UNTIL = v;
            var stored = parseInt(prefs.getString(MN_DOWN_STATUS_KEY, ""), 10);
            if (!isNaN(stored) && stored >= 500) MN_DOWN_STATUS = stored;
        }
    } catch (e) {}
    return MN_DOWN_UNTIL;
}

function mnMarkDown(status) {
    MN_DOWN_UNTIL = Date.now() + MN_DOWN_WINDOW;
    if (status >= 500) MN_DOWN_STATUS = status;
    try {
        var prefs = new SharedPreferences();
        prefs.setString(MN_DOWN_KEY, String(Date.now() + MN_DOWN_PERSIST));
        prefs.setString(MN_DOWN_STATUS_KEY, String(MN_DOWN_STATUS));
    } catch (e) {}
}

/// The origin refused the read. Carries the real status so the app can show
/// "HTTP 523" with a retry button instead of an empty, silently cached home.
function mnDownError(url, status) {
    var code = status >= 500 ? status : MN_DOWN_STATUS;
    return new Error("HTTP " + code + " " + url);
}

function mnClient() {
    if (!MN_CLIENT) MN_CLIENT = new Client({ timeout: MN_HTTP_TIMEOUT, connectTimeout: 5 });
    return MN_CLIENT;
}

// The master lists one audio rendition per language; these are the codes it
// publishes. They are the fallback when the master does not answer in time, so
// the language picker still works instead of collapsing to one opaque entry.
var MN_AUDIO_CODES = ["fr", "en", "es", "es-419", "pt", "pt-br", "de", "it",
    "nl", "pl", "cs", "da", "fi", "no", "sv", "hu", "ro", "el", "ar", "he", "fr-ad"];
var MN_AUDIO_LABELS = {
    "fr": "Français", "en": "English", "es": "Español", "es-419": "Español (LatAm)",
    "pt": "Português", "pt-br": "Português (Brasil)", "de": "Deutsch",
    "it": "Italiano", "nl": "Nederlands", "pl": "Polski", "cs": "Čeština",
    "da": "Dansk", "fi": "Suomi", "no": "Norsk", "sv": "Svenska",
    "hu": "Magyar", "ro": "Română", "el": "Ελληνικά", "ar": "العربية",
    "he": "עברית", "fr-ad": "Français (audiodescription)"
};
var MN_CACHE_TTL = 180000;

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
    constructor() { super(); }

    getPreference(key) { return new SharedPreferences().get(key); }

    getLang() { return this.getPreference("mn_lang") || "fr"; }

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
            "Referer": MN_BASE + "/"
        };
    }

    get supportsLatest() { return true; }

    // ── Transport ─────────────────────────────────────────────

    /// Bounds a request: `Client.get` has no timeout, so a stalled origin can
    /// hold a call until the app kills the whole worker. Resolves to null when
    /// [ms] elapses first, which lets each caller fall back to something usable.
    /// A rejection is passed through: an origin that answers 52x must reach the
    /// screen as an error, not as an empty rail.
    _withTimeout(promise, ms) {
        return new Promise(function (resolve, reject) {
            var settled = false;
            // The timer is left to fire: it finds `settled` set and does
            // nothing, which keeps this free of clearTimeout (not guaranteed
            // in the extension runtime).
            setTimeout(function () {
                if (settled) return;
                settled = true;
                resolve(null);
            }, ms);
            promise.then(function (value) {
                if (settled) return;
                settled = true;
                resolve(value);
            }, function (error) {
                if (settled) return;
                settled = true;
                reject(error);
            });
        });
    }

    /// True when [body] is one of Cloudflare's origin-error pages (520–527)
    /// rather than a real page: those come back as HTML with a 7 KB body, so a
    /// length check alone happily cached them as content.
    _isOriginDown(body) {
        if (!body) return false;
        var head = body.slice(0, 4000);
        return /cf-error-details|Origin is unreachable|Web server is down|Connection timed out|The origin web server/i.test(head);
    }

    /// Rails are kept in the source's own key/value store, so a down origin
    /// still shows the last catalogue instead of an empty home. Only the parsed
    /// cards are stored: a season page is ~200 KB of HTML, the cards are a few.
    _railKey(id) {
        return "miraculous.rail." + id;
    }

    _readRail(id) {
        try {
            var raw = new SharedPreferences().getString(this._railKey(id), "");
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!parsed || !parsed.list || !parsed.list.length) return null;
            if (Date.now() - (parsed.t || 0) > MN_RAIL_TTL) return null;
            return parsed.list;
        } catch (e) {
            return null;
        }
    }

    _writeRail(id, list) {
        if (!list || !list.length) return;
        try {
            new SharedPreferences().setString(
                this._railKey(id),
                JSON.stringify({ t: Date.now(), list: list })
            );
        } catch (e) {}
    }

    _chaptersKey(season) {
        return "miraculous.chapters." + season;
    }

    _cardsToChapters(cards) {
        return (cards || []).map(function (card) {
            return {
                name: card.name,
                url: card.link,
                thumbnailUrl: card.imageUrl,
                description: card.description
            };
        });
    }

    _readChapters(season) {
        try {
            var raw = new SharedPreferences().getString(this._chaptersKey(season), "");
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!parsed || !parsed.chapters || !parsed.chapters.length) return null;
            if (Date.now() - (parsed.t || 0) > MN_RAIL_TTL) return null;
            return parsed.chapters;
        } catch (e) {
            return null;
        }
    }

    _writeChapters(season, chapters) {
        if (!season || !chapters || !chapters.length) return;
        try {
            new SharedPreferences().setString(
                this._chaptersKey(season),
                JSON.stringify({ t: Date.now(), chapters: chapters })
            );
        } catch (e) {}
    }

    async _get(url, opts) {
        var cached = MN_CACHE[url];
        if (cached && Date.now() - cached.t < MN_CACHE_TTL) return { body: cached.body };
        // The origin was just probed and refused: report the real status at
        // once instead of queueing the other rails behind another stall.
        if (Date.now() < mnDownUntil()) throw mnDownError(url, 0);
        var start = Date.now();
        var tries = opts && opts.tries ? opts.tries : MN_TRIES;
        for (var i = 0; i < tries; i++) {
            try {
                var res = await mnClient().get(url, this.getHeaders(url));
                var body = res && res.body ? String(res.body) : "";
                var status = res && res.statusCode ? Number(res.statusCode) : 0;
                if (status >= 500 || this._isOriginDown(body)) {
                    mnMarkDown(status);
                    throw mnDownError(url, status);
                }
                if (status >= 400) throw mnDownError(url, status);
                if (body.length > 120) {
                    MN_CACHE[url] = { t: Date.now(), body: body };
                    return res;
                }
            } catch (e) {
                // A status the origin answered with is final; only transport
                // errors are worth another attempt.
                if (e && /^HTTP \d/.test(String(e.message || ""))) throw e;
            }
            // A stalled origin must not eat the app's whole call budget.
            if (Date.now() - start > MN_TRY_BUDGET) break;
            if (i + 1 < tries) await new Promise(function (r) { setTimeout(r, 400); });
        }
        return null;
    }

    _abs(path) {
        if (!path) return "";
        if (/^https?:\/\//i.test(path)) return path;
        var clean = String(path).replace(/&amp;/g, "&").replace(/^(\.\.?\/)+/, "/");
        if (clean.charAt(0) !== "/") clean = "/" + clean;
        return MN_BASE + clean;
    }

    _watchUrl(href, lang) {
        if (!href) return "";
        if (/^https?:\/\//i.test(href)) return href;
        var clean = href.replace(/&amp;/g, "&");
        if (clean.charAt(0) === "/") return MN_BASE + clean;
        return MN_BASE + "/" + (lang || this.getLang()) + "/" + clean;
    }

    _episodesUrl(s) {
        return MN_BASE + "/" + this.getLang() + "/episodes?s=" + encodeURIComponent(s);
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
        return MN_BASE + "/res/episodes/" + folder + "/" + code + ".webp";
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
        var list = MN_CATEGORIES.map(function (cat) {
            return {
                name: cat.label,
                link: MN_BASE + "/" + lang + "/episodes?s=" + encodeURIComponent(cat.s),
                imageUrl: MN_BASE + cat.poster,
                description: "Miraculous — " + cat.label
            };
        });
        return { list: list, hasNextPage: false };
    }

    async getLatestUpdates(page) {
        if (page > 1) return { list: [], hasNextPage: false };
        var self = this;
        // One page read is enough: a season page lists its episodes in order,
        // so the tail is the latest batch. The site's "new episodes" API takes
        // 12 s+ and the app serialises every extension call through one
        // runtime, so asking it delayed playback and timed `getDetail` out.
        var numeric = MN_CATEGORIES.filter(function (cat) { return /^\d+$/.test(String(cat.s)); });
        for (var i = 0; i < numeric.length; i++) {
            var cards = [];
            var page = await this._get(this._episodesUrl(numeric[i].s));
            // Origin unreachable: the other seasons will fail the same way.
            if (!page) break;
            cards = this._parseCards(page.body, numeric[i].s);
            if (cards.length < 3) continue;
            var list = cards.slice(-14).reverse().map(function (card) {
                return self._withSeason(card, numeric[i].s);
            });
            var out = list.slice(0, 12);
            this._writeRail("latest", out);
            return { list: out, hasNextPage: false };
        }
        return { list: this._readRail("latest") || [], hasNextPage: false };
    }

    async search(query, page, filterList) {
        if (page > 1) return { list: [], hasNextPage: false };
        var q = String(query || "").trim();
        if (!q) return await this.getPopular(1);

        var lang = this.getLang();
        var url = MN_BASE + "/includes/features/search/search.php?q=" + encodeURIComponent(q) +
                  "&lang=" + encodeURIComponent(lang);
        var res;
        try {
            res = await this._get(url);
        } catch (e) {
            // The search endpoint answers 404 for an empty result; a 5xx is the
            // origin being down and must reach the screen as an error.
            if (/^HTTP 4\d\d/.test(String((e && e.message) || ""))) {
                return { list: [], hasNextPage: false };
            }
            throw e;
        }
        if (!res) return { list: [], hasNextPage: false };
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
        var cards = res ? this._parseCards(res.body, cat.s) : [];
        if (!cards.length) return { list: this._readRail(listId) || [], hasNextPage: false };
        this._writeRail(listId, cards);
        this._writeChapters(cat.s, this._cardsToChapters(cards));
        return { list: cards, hasNextPage: false };
    }

    // ── Detail ────────────────────────────────────────────────

    async getDetail(url) {
        var lang = this.getLang();
        if (/[?&]e=/.test(url)) return await this._episodeDetail(url, lang);

        var sM = url.match(/[?&]s=([^&\s]+)/);
        var s = sM ? decodeURIComponent(sM[1]) : "7";
        var cat = this._category(s);
        var res = await this._withTimeout(this._get(this._episodesUrl(s)), 12000);
        if (!res) {
            var cached = this._readChapters(s);
            var fbLabel = cat ? cat.label : ("Saison " + s);
            return {
                name: fbLabel,
                imageUrl: cat ? MN_BASE + cat.poster : "",
                description: "Miraculous Ladybug — " + fbLabel +
                    (cached ? "\n" + cached.length + " épisode(s) · hors ligne" : ""),
                chapters: cached || []
            };
        }
        var html = res.body || "";
        var hero = this._parseHero(html);
        var cards = this._parseCards(html, s);
        var label = cat ? cat.label : (hero.name || ("Saison " + s));

        var chapters = this._cardsToChapters(cards);
        this._writeChapters(s, chapters);

        return {
            name: label,
            imageUrl: hero.poster || (cat ? MN_BASE + cat.poster : (cards[0] ? cards[0].imageUrl : "")),
            description: (hero.description || ("Miraculous Ladybug — " + label)) + "\n" + chapters.length + " épisode(s)",
            chapters: chapters
        };
    }

    async _episodeDetail(url, lang) {
        var res = null;
        try {
            res = await this._withTimeout(this._get(url), 12000);
        } catch (e) {
            // The episode the user opened is already known from the URL, so the
            // detail stays usable; the player reports the outage on the stream.
            res = null;
        }
        if (!res) {
            var fbS = String(url).match(/[?&]s=([^&\s]+)/);
            var fbE = String(url).match(/[?&]e=([^&\s]+)/);
            var fbSeason = fbS ? decodeURIComponent(fbS[1]) : "";
            var fbCode = fbE ? decodeURIComponent(fbE[1]) : "";
            return {
                name: this._episodeLabel(fbSeason, fbCode, ""),
                imageUrl: this._cover(fbSeason, fbCode),
                description: "Miraculous Ladybug",
                chapters: [{ name: this._episodeName(fbSeason, fbCode, ""), url: url, thumbnailUrl: this._cover(fbSeason, fbCode) }]
            };
        }
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

        // Siblings are a nicety, not the detail: reading the season page here
        // added a second request that could stall and time the whole call out
        // (the screen then showed "0 épisode"). Reuse it when an earlier call
        // already paid for it.
        var seasonCache = season ? MN_CACHE[this._episodesUrl(season)] : null;
        if (seasonCache) {
            try {
                var cards = this._parseCards(seasonCache.body, season);
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

    /// Splits a master playlist into what the site actually publishes: video
    /// renditions, one audio rendition per language, and subtitle renditions.
    _parseMaster(body, masterUrl) {
        var out = { variants: [], audios: [], subs: [] };
        if (!body || body.indexOf("#EXTM3U") === -1) return out;

        function attrs(line) {
            var res = {};
            var re = /([A-Z0-9-]+)=("[^"]*"|[^,]*)/g, m;
            while ((m = re.exec(line)) !== null) {
                var v = m[2] || "";
                if (v.charAt(0) === '"') v = v.slice(1, -1);
                res[m[1]] = v;
            }
            return res;
        }
        function abs(uri) {
            if (!uri) return "";
            if (/^https?:\/\//i.test(uri)) return uri;
            var origin = (masterUrl.match(/^(https?:\/\/[^\/]+)/) || [])[1] || MN_BASE;
            if (uri.charAt(0) === "/") return origin + uri;
            return masterUrl.replace(/[?#].*$/, "").replace(/\/[^\/]*$/, "/") + uri;
        }

        var lines = String(body).split(/\r?\n/);
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (line.indexOf("#EXT-X-MEDIA:") === 0) {
                var a = attrs(line);
                if (!a.URI) continue;
                var media = { label: a.NAME || a.LANGUAGE || "", code: a.LANGUAGE || "", url: abs(a.URI) };
                if (a.TYPE === "AUDIO") out.audios.push(media);
                else if (a.TYPE === "SUBTITLES") out.subs.push(media);
                continue;
            }
            if (line.indexOf("#EXT-X-STREAM-INF:") === 0) {
                var v = attrs(line);
                var resM = (v.RESOLUTION || "").match(/(\d+)x(\d+)/);
                var uri = "";
                for (var j = i + 1; j < lines.length; j++) {
                    var next = lines[j].trim();
                    if (!next) continue;
                    if (next.charAt(0) !== "#") uri = next;
                    break;
                }
                if (!uri) continue;
                var bandwidth = parseInt(v.BANDWIDTH || "0", 10);
                out.variants.push({
                    label: resM ? resM[2] + "p" : (bandwidth ? Math.round(bandwidth / 1000) + " kbps" : "Auto"),
                    bandwidth: bandwidth,
                    url: abs(uri)
                });
            }
        }
        out.variants.sort(function (a, b) { return b.bandwidth - a.bandwidth; });
        return out;
    }

    async getVideoList(url) {
        var res = await this._withTimeout(this._get(url), 10000);
        if (!res) return [{ quality: "WebView", url: url, originalUrl: url }];
        var html = res.body || "";

        var tokenM = html.match(/userToken\s*=\s*'([A-Za-z0-9]+)'/);
        var sM = html.match(/seasonIdDownload\s*=\s*'([^']+)'/);
        var eM = html.match(/episodeIdDownload\s*=\s*'([^']+)'/);
        var langM = html.match(/phpLang\s*=\s*'([^']+)'/);
        var internalM = html.match(/INTERNAL_URL\s*=\s*"([^"]+)"/);

        if (!tokenM || !sM || !eM) {
            return [{ quality: "WebView", url: url, originalUrl: url }];
        }

        // The page advertises an "internal" stream host that some devices
        // cannot resolve at all (private DNS filters, split-horizon DNS). It is
        // served by the same Cloudflare origin as the public site, so re-root
        // it on MN_BASE and keep the path/query the page gave us.
        var internal = (internalM ? internalM[1] : MN_INTERNAL)
            .replace(/^https?:\/\/[^/]+/i, MN_BASE);
        var prefLang = this.getLang();
        function streamFor(code) {
            return internal + "/m3u8.m3u8?lang=" + encodeURIComponent(code) +
                   "&s=" + encodeURIComponent(sM[1]) +
                   "&e=" + encodeURIComponent(eM[1]) +
                   "&token=" + tokenM[1];
        }

        // The master is the only playlist that names the audio renditions, so
        // reading it turns the opaque "Auto" entry into the real formats, the
        // full language list and the subtitles the site offers.
        var headers = { "Referer": MN_BASE + "/", "User-Agent": MN_UA };
        var masterUrl = streamFor(prefLang);
        var info = { variants: [], audios: [], subs: [] };
        var master = await this._withTimeout(this._get(masterUrl, { tries: 1 }), 6000);
        if (master) {
            try {
                info = this._parseMaster(master.body || "", masterUrl);
            } catch (e) {
                info = { variants: [], audios: [], subs: [] };
            }
        }

        var audios = info.audios.map(function (a) { return { label: a.label, file: a.url }; });
        var subtitles = info.subs.map(function (s) { return { label: s.label, file: s.url }; });
        var topLabel = info.variants.length ? info.variants[0].label : "Auto";

        var languages = info.audios.filter(function (a) { return a.code; });
        if (!languages.length) {
            languages = MN_AUDIO_CODES.map(function (code) {
                return { code: code, label: MN_AUDIO_LABELS[code] || code };
            });
        }
        // `?lang=` only picks which rendition is DEFAULT: the URL is the audio
        // selector, so one entry per language is what makes the choice work.
        languages.sort(function (a, b) {
            var pa = a.code === prefLang ? 0 : 1, pb = b.code === prefLang ? 0 : 1;
            if (pa !== pb) return pa - pb;
            return a.label < b.label ? -1 : (a.label > b.label ? 1 : 0);
        });

        var videos = languages.map(function (a) {
            var stream = streamFor(a.code);
            return {
                quality: topLabel + " · " + (a.label || a.code),
                url: stream,
                originalUrl: stream,
                headers: headers,
                audios: audios,
                subtitles: subtitles
            };
        });

        // The site's own player is the last resort when the HLS proxy is down.
        videos.push({ quality: "WebView", url: url, originalUrl: url });
        return videos;
    }

    /// "Pour vous": the seasons rail, enriched with the current season's
    /// episodes when that page is already cached.
    ///
    /// Deliberately network-free: the tab is built alongside the player and
    /// competes with it for the single extension runtime, and a fetch here was
    /// what timed out at 20 s and left the grid empty.
    async getRecommendations(url) {
        var lang = this.getLang();
        var sM = String(url || "").match(/[?&]s=([^&\s]+)/);
        var eM = String(url || "").match(/[?&]e=([^&\s]+)/);
        var season = sM ? decodeURIComponent(sM[1]) : "";
        var code = eM ? decodeURIComponent(eM[1]) : "";
        var out = [];

        try {
            var cards = [];
            var page = season ? MN_CACHE[this._episodesUrl(season)] : null;
            if (page) cards = this._parseCards(page.body, season);
            if (!cards.length && season) {
                // Offline: the stored episode list still fills the tab.
                var stored = this._readChapters(season);
                if (stored) {
                    cards = stored.map(function (ch) {
                        return {
                            name: ch.name,
                            link: ch.url,
                            imageUrl: ch.thumbnailUrl,
                            description: ch.description
                        };
                    });
                }
            }
            for (var i = 0; i < cards.length; i++) {
                if (code && cards[i].link.indexOf("e=" + code) !== -1) continue;
                out.push(this._withSeason(cards[i], season));
            }
        } catch (e) { /* the seasons rail below still fills the tab */ }

        for (var c = 0; c < MN_CATEGORIES.length; c++) {
            var cat = MN_CATEGORIES[c];
            if (String(cat.s) === String(season)) continue;
            out.push({
                name: cat.label,
                link: MN_BASE + "/" + lang + "/episodes?s=" + encodeURIComponent(cat.s),
                imageUrl: MN_BASE + cat.poster,
                description: "Miraculous — " + cat.label
            });
        }
        return out;
    }

    /// Comments tab: the site's `comments_api.php` is a JSON POST
    /// (`{s_e: "7:701", se: "7:701", lang, page, sortOrder}`). A GET answers
    /// "No input received", which is why the tab stayed empty.
    ///
    /// Best effort: any failure returns an empty list rather than an error
    /// that would blank the detail page.
    async getComments(url) {
        var m = String(url || "").match(/[?&]s=([^&\s]+)[^#]*[?&]e=([^&\s]+)/);
        if (!m) return [];
        var season = decodeURIComponent(m[1]);
        var episode = decodeURIComponent(m[2]);
        var se = season + ":" + episode;
        var api = MN_BASE + "/includes/features/comments/comments_api.php?action=load";
        var payload = JSON.stringify({
            requesterId: null,
            requesterPasswordHash: null,
            s_e: se,
            se: se,
            lang: this.getLang(),
            page: 1,
            sortOrder: "newest"
        });
        var data = null;
        try {
            var res = await this._withTimeout(mnClient().post(api, {
                "Content-Type": "application/json",
                "Referer": MN_BASE + "/",
                "User-Agent": MN_UA
            }, payload), 8000);
            if (!res) return this._readComments(se) || [];
            data = JSON.parse((res && res.body ? String(res.body) : "") || "{}");
        } catch (e) {
            return this._readComments(se) || [];
        }

        var items = data.comments || data.data || [];
        var byId = {};
        var roots = [];
        var list = [];
        for (var i = 0; i < items.length; i++) {
            var c = items[i] || {};
            var avatar = String(c.avatar || "");
            var item = {
                id: String(c.id || i),
                author: String(c.username || c.user || c.author || ""),
                avatar: /^https?:\/\//i.test(avatar) ? avatar : "",
                date: this._commentDate(c.created_at || c.date || 0),
                content: this._clean(c.content || c.message || c.body || ""),
                score: c.likes || c.reactions || 0,
                replies: []
            };
            byId[item.id] = item;
            list.push(item);
        }
        for (var j = 0; j < list.length; j++) {
            var parentId = items[j] ? items[j].parent_id : null;
            var parent = parentId ? byId[String(parentId)] : null;
            if (parent && parent !== list[j]) parent.replies.push(list[j]);
            else roots.push(list[j]);
        }
        this._writeComments(se, roots);
        return roots;
    }

    _commentsKey(se) {
        return "miraculous.comments." + se;
    }

    _readComments(se) {
        try {
            var raw = new SharedPreferences().getString(this._commentsKey(se), "");
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!parsed || !parsed.list || !parsed.list.length) return null;
            if (Date.now() - (parsed.t || 0) > MN_RAIL_TTL) return null;
            return parsed.list;
        } catch (e) {
            return null;
        }
    }

    _writeComments(se, list) {
        if (!se || !list || !list.length) return;
        try {
            new SharedPreferences().setString(
                this._commentsKey(se),
                JSON.stringify({ t: Date.now(), list: list })
            );
        } catch (e) {}
    }

    _commentDate(ts) {
        var seconds = parseInt(ts, 10);
        if (!seconds || seconds < 0) return "";
        var diff = Math.floor(Date.now() / 1000) - seconds;
        if (diff < 60) return "à l'instant";
        if (diff < 3600) return "il y a " + Math.floor(diff / 60) + " min";
        if (diff < 86400) return "il y a " + Math.floor(diff / 3600) + " h";
        if (diff < 2592000) return "il y a " + Math.floor(diff / 86400) + " j";
        return "il y a " + Math.floor(diff / 2592000) + " mois";
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
            key: "mn_lang",
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
