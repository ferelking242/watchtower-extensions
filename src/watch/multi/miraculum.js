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
    "version": "3.3.0",
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

// Successful reads are reused for a few minutes and retries stop once a read
// has burned this much time: the origin is slow (10 s+ per page) and the app
// serialises every call, so a repeated read is what times `getDetail` out
// ("0 épisode").
var MIRK_TRY_BUDGET = 8000;
var MIRK_CACHE = {};

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
var MIRK_CACHE_TTL = 180000;
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

    /// Bounds a request: `Client.get` has no timeout, so a stalled origin can
    /// hold a call until the app kills the whole worker. Resolves to null when
    /// [ms] elapses first, which lets each caller fall back to something usable.
    _withTimeout(promise, ms) {
        return new Promise(function (resolve) {
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
            }, function () {
                if (settled) return;
                settled = true;
                resolve(null);
            });
        });
    }

    async _get(url, opts) {
        var cached = MIRK_CACHE[url];
        if (cached && Date.now() - cached.t < MIRK_CACHE_TTL) return { body: cached.body };
        var started = Date.now();
        var lastError = null;
        var tries = opts && opts.tries ? opts.tries : MIRK_HOSTS.length + 1;
        var start = this._host;
        for (var attempt = 0; attempt < tries; attempt++) {
            try {
                var res = await new Client().get(url, this.getHeaders(url));
                var body = res && res.body ? String(res.body) : "";
                if (body.length > 120) {
                    MIRK_CACHE[url] = { t: Date.now(), body: body };
                    return res;
                }
                lastError = new Error("empty response from " + url);
            } catch (e) {
                lastError = e;
            }
            // A stalled origin must not eat the app's whole call budget.
            if (Date.now() - started > MIRK_TRY_BUDGET) break;
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
        // One page read is enough: a season page lists its episodes in order,
        // so the tail is the latest batch. The site's "new episodes" API takes
        // 12 s+ and the app serialises every extension call through one
        // runtime, so asking it delayed playback and timed `getDetail` out.
        var numeric = MN_CATEGORIES.filter(function (cat) { return /^\d+$/.test(String(cat.s)); });
        for (var i = 0; i < numeric.length; i++) {
            var cards = [];
            try {
                cards = this._parseCards((await this._get(this._episodesUrl(numeric[i].s))).body, numeric[i].s);
            } catch (e) {
                cards = [];
            }
            if (cards.length < 3) continue;
            var list = cards.slice(-14).reverse().map(function (card) {
                return self._withSeason(card, numeric[i].s);
            });
            return { list: list.slice(0, 12), hasNextPage: false };
        }
        return { list: [], hasNextPage: false };
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
        var res = await this._withTimeout(this._get(this._episodesUrl(s)), 20000);
        if (!res) {
            var fbLabel = cat ? cat.label : ("Saison " + s);
            return {
                name: fbLabel,
                imageUrl: cat ? this._base() + cat.poster : "",
                description: "Miraculous Ladybug — " + fbLabel,
                chapters: []
            };
        }
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
        var res = await this._withTimeout(this._get(url), 20000);
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
        var seasonCache = season ? MIRK_CACHE[this._episodesUrl(season)] : null;
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
        var self = this;
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
            var origin = (masterUrl.match(/^(https?:\/\/[^\/]+)/) || [])[1] || self._base();
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

        var internal = internalM ? internalM[1] : MIRK_INTERNAL;
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
        var headers = { "Referer": this._base() + "/", "User-Agent": MN_UA };
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
    /// episodes when that page is already cached. Network-free on purpose: it
    /// shares the single extension runtime with the player.
    async getRecommendations(url) {
        var lang = this.getLang();
        var sM = String(url || "").match(/[?&]s=([^&\s]+)/);
        var eM = String(url || "").match(/[?&]e=([^&\s]+)/);
        var season = sM ? decodeURIComponent(sM[1]) : "";
        var code = eM ? decodeURIComponent(eM[1]) : "";
        var out = [];
        try {
            var cached = season ? MIRK_CACHE[this._episodesUrl(season)] : null;
            if (cached) {
                var cards = this._parseCards(cached.body, season);
                for (var i = 0; i < cards.length; i++) {
                    if (code && cards[i].link.indexOf("e=" + code) !== -1) continue;
                    out.push(this._withSeason(cards[i], season));
                }
            }
        } catch (e) { /* the seasons rail below still fills the tab */ }
        for (var c = 0; c < MN_CATEGORIES.length; c++) {
            var cat = MN_CATEGORIES[c];
            if (String(cat.s) === String(season)) continue;
            out.push({
                name: cat.label,
                link: this._base() + "/" + lang + "/episodes?s=" + encodeURIComponent(cat.s),
                imageUrl: this._base() + cat.poster,
                description: "Miraculous — " + cat.label
            });
        }
        return out;
    }

    /// Comments tab: the site's `comments_api.php` is a JSON POST
    /// (`{s_e: "7:701", se: "7:701", lang, page, sortOrder}`). A GET answers
    /// "No input received", which is why the tab stayed empty.
    async getComments(url) {
        var m = String(url || "").match(/[?&]s=([^&\s]+)[^#]*[?&]e=([^&\s]+)/);
        if (!m) return [];
        var season = decodeURIComponent(m[1]);
        var episode = decodeURIComponent(m[2]);
        var se = season + ":" + episode;
        var api = this._base() + "/includes/features/comments/comments_api.php?action=load";
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
            var res = await new Client().post(api, {
                "Content-Type": "application/json",
                "Referer": this._base() + "/",
                "User-Agent": MN_UA
            }, payload);
            data = JSON.parse((res && res.body ? String(res.body) : "") || "{}");
        } catch (e) {
            return [];
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
        return roots;
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
