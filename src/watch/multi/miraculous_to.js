// ══════════════════════════════════════════════════════════════
//  Miraculous.TO — miraculous.to
//  Miraculous Ladybug — S1–S7 + Films spéciaux
//  HLS (10 pistes audio) · 16 sous-titres · recherche · commentaires
// ══════════════════════════════════════════════════════════════

const watchtowerSources = [{
    "name": "Miraculous.TO",
    "lang": "multi",
    "baseUrl": "https://miraculous.to",
    "iconUrl": "https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/assets/icons/watch-2000001179.png",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "1.0.0",
    "login": false,
    "forYou": false,
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "watch/multi/miraculous_to.js",
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "hasSubtitles": true,
    "hasDub": true,
    "notes": "Miraculous Ladybug — S1–S7 et films spéciaux. HLS 1080p, 10 pistes audio (VF/VO/…), 16 sous-titres, recherche et commentaires."
}];

var MT_BASE = "https://miraculous.to";
var MT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var MT_HTTP_TIMEOUT = 12;

var MT_CLIENT = null;
function mtClient() {
    if (!MT_CLIENT) MT_CLIENT = new Client({ timeout: MT_HTTP_TIMEOUT, connectTimeout: 5 });
    return MT_CLIENT;
}

// The episode index is a 250 KB page that every rail needs; one copy serves
// the home screen, the season tabs and the offline fallbacks.
var MT_CACHE = {};
var MT_CACHE_TTL = 300000;

// The origin answers 52x when it is unreachable. A probe marks it down so the
// seven queued rails fail fast instead of each burning the call budget.
var MT_DOWN_UNTIL = 0;
var MT_DOWN_WINDOW = 30000;

var MT_LANGS = [
    ["Français", "fr"], ["English", "en"], ["Español", "es"], ["Português (Brasil)", "br"],
    ["Deutsch", "de"], ["Italiano", "it"], ["Português", "pt"], ["Latino", "la"],
    ["Nederlands", "nl"], ["Polski", "pl"], ["Türkçe", "tr"], ["Русский", "ru"],
    ["Ελληνικά", "gr"], ["Čeština", "cz"], ["Română", "ro"], ["Srpski", "sr"],
    ["日本語", "jp"], ["한국어", "kr"]
];

// Names used by the master playlist; kept in sync with the site's own labels.
var MT_AUDIO_LABELS = {
    en: "English", cz: "Čeština", es: "Español", fr: "Français", gr: "Ελληνικά",
    it: "Italiano", la: "Latino", pl: "Polski", pt: "Português", ro: "Română",
    de: "Deutsch", nl: "Nederlands", ru: "Русский", tr: "Türkçe", br: "Português (BR)",
    jp: "日本語", kr: "한국어", sr: "Srpski"
};

var MT_SEASONS = [1, 2, 3, 4, 5, 6, 7];

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = mtClient();
    }

    // ── preferences ────────────────────────────────────────────
    getLang() {
        var lang = String(this.getPreference("mt_lang") || "fr").toLowerCase();
        for (var i = 0; i < MT_LANGS.length; i++) {
            if (MT_LANGS[i][1] === lang) return lang;
        }
        return "fr";
    }

    getSourcePreferences() {
        return [{
            key: "mt_lang",
            listPreference: {
                title: "Langue du site",
                summary: "Langue des pages, des titres et de la piste audio par défaut",
                valueIndex: 0,
                entries: MT_LANGS.map(function (l) { return l[0]; }),
                entryValues: MT_LANGS.map(function (l) { return l[1]; })
            }
        }];
    }

    // ── http ───────────────────────────────────────────────────
    getHeaders(url) {
        return {
            "User-Agent": MT_UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": this.getLang() + ",en;q=0.8",
            "Referer": MT_BASE + "/" + this.getLang() + "/episodes"
        };
    }

    async _get(url, opts) {
        var cached = MT_CACHE[url];
        if (cached && Date.now() - cached.t < MT_CACHE_TTL) return { body: cached.body, headers: cached.headers || {} };
        if (Date.now() < MT_DOWN_UNTIL) return null;
        var tries = opts && opts.tries ? opts.tries : 2;
        for (var i = 0; i < tries; i++) {
            try {
                var res = await this.client.get(url, this.getHeaders(url));
                var body = res && res.body ? String(res.body) : "";
                var status = res && res.statusCode ? Number(res.statusCode) : 0;
                if (status >= 500) {
                    MT_DOWN_UNTIL = Date.now() + MT_DOWN_WINDOW;
                    return null;
                }
                if (status >= 400 || !body) return null;
                if (body.length > 120) {
                    MT_CACHE[url] = { t: Date.now(), body: body, headers: res.headers || {} };
                    return res;
                }
                return res;
            } catch (e) { /* retried below */ }
            if (i + 1 < tries) await new Promise(function (r) { setTimeout(r, 300); });
        }
        return null;
    }

    _randomHex(n) {
        var out = "";
        while (out.length < n) out += Math.floor(Math.random() * 16).toString(16);
        return out.slice(0, n);
    }

    // The signed playlist only answers for a session the server knows. Forcing
    // a bogus session id makes the site hand out a fresh one, which is the only
    // way to read the value: the app's own cookie jar is not readable from JS.
    _sessionCookie(headers) {
        if (!headers) return "";
        var keys = [];
        for (var k in headers) if (Object.prototype.hasOwnProperty.call(headers, k)) keys.push(k);
        for (var i = 0; i < keys.length; i++) {
            if (keys[i].toLowerCase() !== "set-cookie") continue;
            var m = String(headers[keys[i]] || "").match(/PHPSESSID=([A-Za-z0-9]+)/);
            if (m) return "PHPSESSID=" + m[1];
        }
        return "";
    }

    async _pageWithSession(url) {
        var headers = this.getHeaders(url);
        headers["Cookie"] = "PHPSESSID=" + this._randomHex(32);
        var res = null;
        try {
            res = await this.client.get(url, headers);
        } catch (e) {
            return null;
        }
        if (!res || Number(res.statusCode) >= 400) return null;
        var body = res.body ? String(res.body) : "";
        if (!body) return null;
        MT_CACHE[url] = { t: Date.now(), body: body, headers: res.headers || {} };
        return { body: body, headers: res.headers || {}, cookie: this._sessionCookie(res.headers) };
    }

    // ── helpers ────────────────────────────────────────────────
    _abs(path) {
        if (!path) return "";
        var clean = String(path).replace(/&amp;/g, "&").trim();
        if (/^https?:\/\//i.test(clean)) return clean;
        if (clean.charAt(0) !== "/") clean = "/" + clean;
        return MT_BASE + clean;
    }

    _clean(html) {
        if (!html) return "";
        return String(html)
            .replace(/<br\s*\/?>/gi, " ")
            .replace(/<[^>]*>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&#0?39;|&apos;/g, "'")
            .replace(/&quot;/g, "\"")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&#8217;|&rsquo;/g, "'")
            .replace(/\s+/g, " ")
            .trim();
    }

    _episodesUrl() {
        return MT_BASE + "/" + this.getLang() + "/episodes";
    }

    _seasonLink(season) {
        return this._episodesUrl() + "?s=" + encodeURIComponent(season);
    }

    _episodeLabel(season, episode, title) {
        var s = String(season || ""), e = String(episode || "");
        var head = s && e ? "S" + s + " · E" + e : (s ? "Saison " + s : "");
        return head ? head + " — " + title : title;
    }

    _cards(html) {
        var out = [];
        var seen = {};
        var re = /<a ([^>]*class="mto-card-link"[^>]*)>([\s\S]*?)<\/a>/g;
        var m;
        while ((m = re.exec(html || ""))) {
            var attrs = m[1] || "";
            var inner = m[2] || "";
            var href = (attrs.match(/href="([^"]+)"/) || [])[1] || "";
            if (!href || seen[href]) continue;
            seen[href] = true;

            var code = (attrs.match(/data-epcode="(\d+)"/) || [])[1] || "";
            var seasonAttr = (attrs.match(/data-mto-season="(\d+)"/) || [])[1] || "";
            var numberAttr = (attrs.match(/data-mto-episode-number="(\d+)"/) || [])[1] || "";
            var season = seasonAttr || (code && code.length >= 3 ? String(Math.floor(Number(code) / 100)) : "");
            var episode = numberAttr || (code ? String(Number(code) % 100) : "");

            var image = (inner.match(/data-src="([^"]+)"/) || [])[1] ||
                        (inner.match(/src="(?!data:)([^"]+)"/) || [])[1] || "";
            var title = this._clean((inner.match(/mto-episode-title[^>]*>([\s\S]*?)<\/h2>/) || [])[1] || "");
            var meta = this._clean((inner.match(/mto-episode-meta[^>]*>([\s\S]*?)<\/span>/) || [])[1] || "");
            if (!title) title = meta;
            if (!title) continue;

            var isSpecial = /\/films-speciaux\//.test(href);
            out.push({
                name: isSpecial ? title : this._episodeLabel(season, episode, title),
                link: this._abs(href),
                imageUrl: this._abs(image),
                description: isSpecial ? "Film spécial" : (meta || ("Saison " + season + " · Episode " + episode)),
                code: code,
                season: isSpecial ? "specials" : season,
                episode: episode,
                isNew: /data-mto-new="1"/.test(attrs),
                hasSubs: /data-mto-cc="1"/.test(attrs)
            });
        }
        return out;
    }

    _allCards() {
        var cached = MT_CACHE[this._episodesUrl()];
        return cached ? this._cards(cached.body) : [];
    }

    _sortedCards(desc) {
        var cards = this._allCards();
        cards.sort(function (a, b) {
            var d = Number(a.code || 0) - Number(b.code || 0);
            return desc ? -d : d;
        });
        return cards;
    }

    _slice(list, page, size) {
        var p = Math.max(1, Number(page) || 1);
        var start = (p - 1) * size;
        return {
            list: list.slice(start, start + size),
            hasNextPage: list.length > start + size
        };
    }

    _seasonPoster(season) {
        var cards = this._allCards();
        for (var i = 0; i < cards.length; i++) {
            if (String(cards[i].season) === String(season) && cards[i].imageUrl) return cards[i].imageUrl;
        }
        return "";
    }

    // ── catalog ────────────────────────────────────────────────
    async getPopular(page) {
        await this._get(this._episodesUrl());
        return this._slice(this._sortedCards(true), page, 24);
    }

    async getLatestUpdates(page) {
        await this._get(this._episodesUrl());
        var fresh = this._sortedCards(true).filter(function (c) { return c.isNew; });
        var rest = this._sortedCards(true).filter(function (c) { return !c.isNew; });
        return this._slice(fresh.concat(rest), page, 24);
    }

    async getCustomList(listId, page) {
        await this._get(this._episodesUrl());
        var id = String(listId || "");
        if (id === "seasons") {
            var list = MT_SEASONS.map(function (s) {
                return {
                    name: "Saison " + s,
                    link: MT_BASE + "/" + this.getLang() + "/episodes?s=" + s,
                    imageUrl: this._seasonPoster(s),
                    description: "Miraculous Ladybug — Saison " + s
                };
            }, this);
            list.push({
                name: "Films spéciaux",
                link: this._seasonLink("specials"),
                imageUrl: this._seasonPoster("specials"),
                description: "Miraculous World et films"
            });
            return { list: list, hasNextPage: false };
        }
        if (id === "specials") {
            var specials = this._allCards().filter(function (c) { return c.season === "specials"; });
            return this._slice(specials, page, 24);
        }
        if (id === "new") {
            var news = this._sortedCards(true).filter(function (c) { return c.isNew; });
            return this._slice(news, page, 24);
        }
        if (id === "latest") {
            return this._slice(this._sortedCards(true), page, 12);
        }
        var seasonM = id.match(/^season_(\d+)$/);
        if (seasonM) {
            var season = seasonM[1];
            var eps = this._allCards().filter(function (c) { return String(c.season) === season; });
            eps.sort(function (a, b) { return Number(a.episode || 0) - Number(b.episode || 0); });
            return this._slice(eps, page, 24);
        }
        return this._slice(this._sortedCards(true), page, 24);
    }

    // ── search ─────────────────────────────────────────────────
    _filterValue(filterList, name) {
        if (!filterList) return "";
        for (var i = 0; i < filterList.length; i++) {
            var f = filterList[i];
            if (f && f.name === name) return String(f.value || "");
        }
        return "";
    }

    async _searchApi(query, page, season) {
        var lang = this.getLang();
        var sessionUrl = MT_BASE + "/search/session.php";
        var searchUrl = MT_BASE + "/search/search.php";
        var jsonHeaders = {
            "User-Agent": MT_UA,
            "Accept": "application/json",
            "Referer": this._episodesUrl(),
            "Origin": MT_BASE
        };

        var items = [];
        for (var attempt = 0; attempt < 2; attempt++) {
            try {
                await this.client.post(sessionUrl, jsonHeaders, "");
            } catch (e) { /* the search call below reports the real failure */ }
            var res = null;
            try {
                var form = "query=" + encodeURIComponent(query) +
                    "&lang=" + encodeURIComponent(lang) +
                    "&page=" + encodeURIComponent(String(page || 1));
                var postHeaders = {
                    "User-Agent": MT_UA,
                    "Accept": "application/json",
                    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
                    "Referer": this._episodesUrl(),
                    "Origin": MT_BASE
                };
                res = await this.client.post(searchUrl, postHeaders, form);
            } catch (e) {
                return null;
            }
            if (!res) return null;
            var body = res.body ? String(res.body) : "";
            var data = null;
            try { data = JSON.parse(body); } catch (e) { data = null; }
            if (data && data.items) {
                items = data.items;
                break;
            }
            // 401 search_session_required: the session cookie landed after the
            // first call; opening a new one and retrying fixes it.
            if (Number(res.statusCode) !== 401) return null;
        }
        if (!items) return null;

        var list = [];
        for (var i = 0; i < items.length; i++) {
            var it = items[i] || {};
            var url = this._abs(it.url || "");
            if (!url) continue;
            var code = String(it.epcode || "");
            var seasonOf = code && code.length >= 3 ? String(Math.floor(Number(code) / 100)) : "";
            if (season && season !== "specials" && seasonOf && seasonOf !== season) continue;
            list.push({
                name: String(it.eptitle || "").trim() || url,
                link: url,
                imageUrl: this._abs(it.epimgurl || ""),
                description: seasonOf ? ("Saison " + seasonOf + " · Episode " + String(Number(code) % 100)) : ""
            });
        }
        return list;
    }

    async search(query, page, filterList) {
        var q = String(query || "").trim();
        if (!q) return { list: [], hasNextPage: false };
        var season = this._filterValue(filterList, "Saison");

        var api = await this._searchApi(q, page, season);
        if (api && api.length) return { list: api, hasNextPage: false };

        // The index page is cached and searchable offline.
        await this._get(this._episodesUrl());
        var needle = q.toLowerCase();
        var local = this._allCards().filter(function (c) {
            if (season && season !== "specials" && String(c.season) !== season) return false;
            return String(c.name).toLowerCase().indexOf(needle) !== -1;
        });
        return this._slice(local, page, 24);
    }

    // ── detail ─────────────────────────────────────────────────
    async getDetail(url) {
        var link = String(url || "");
        var sM = link.match(/[?&]s=([^&\s]+)/);
        if (sM) {
            var target = decodeURIComponent(sM[1]);
            await this._get(this._episodesUrl());
            var cards = this._allCards().filter(function (c) { return String(c.season) === String(target); });
            cards.sort(function (a, b) { return Number(a.episode || 0) - Number(b.episode || 0); });
            var label = target === "specials" ? "Films spéciaux" : ("Saison " + target);
            return {
                name: "Miraculous — " + label,
                imageUrl: this._seasonPoster(target),
                description: "Miraculous Ladybug — " + label + "\n" + cards.length + " épisode(s)",
                chapters: cards.map(function (c) {
                    return {
                        name: c.name,
                        url: c.link,
                        dateUpload: "",
                        thumbnailUrl: c.imageUrl,
                        description: c.description
                    };
                })
            };
        }

        var page = await this._get(link);
        if (!page) return { name: "", imageUrl: "", description: "", chapters: [] };
        var html = page.body || "";
        var title = this._clean((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || "");
        var poster = (html.match(/property="og:image"\s+content="([^"]+)"/) || [])[1] ||
                     (html.match(/content="([^"]+)"\s+property="og:image"/) || [])[1] || "";
        var meta = this._clean((html.match(/id="mto-watch-episode-meta"[^>]*>([\s\S]*?)<\/span>/) || [])[1] || "");
        return {
            name: title || meta || link,
            imageUrl: this._abs(poster),
            description: meta ? ("Miraculous.TO — " + meta) : "Miraculous.TO",
            chapters: [{
                name: title || meta || "Episode",
                url: link,
                dateUpload: "",
                thumbnailUrl: this._abs(poster),
                description: meta
            }]
        };
    }

    // ── player ─────────────────────────────────────────────────
    _tracks(html) {
        var out = [];
        var re = /<track[^>]*>/g;
        var m;
        while ((m = re.exec(html || ""))) {
            var tag = m[0];
            if (!/kind="subtitles"/.test(tag)) continue;
            var src = (tag.match(/src="([^"]+)"/) || [])[1] || "";
            if (!src) continue;
            var label = this._clean((tag.match(/label="([^"]*)"/) || [])[1] || "");
            var lang = (tag.match(/srclang="([^"]*)"/) || [])[1] || "";
            out.push({ label: label || lang || "Sous-titres", file: this._abs(src), code: lang });
        }
        return out;
    }

    _master(body, masterUrl) {
        var audios = [];
        var variants = [];
        var lines = String(body || "").split(/\r?\n/);
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (line.indexOf("#EXT-X-MEDIA:") === 0 && /TYPE=AUDIO/.test(line)) {
                var name = (line.match(/NAME="([^"]*)"/) || [])[1] || "";
                var code = (line.match(/LANGUAGE="([^"]*)"/) || [])[1] || "";
                var uri = (line.match(/URI="([^"]*)"/) || [])[1] || "";
                var isDefault = /DEFAULT=YES/.test(line);
                if (!code) continue;
                audios.push({ code: code, label: name || MT_AUDIO_LABELS[code] || code, url: this._abs(uri), isDefault: isDefault });
            } else if (line.indexOf("#EXT-X-STREAM-INF:") === 0) {
                var res = (line.match(/RESOLUTION=(\d+x\d+)/) || [])[1] || "";
                var height = res ? res.split("x")[1] : "";
                var next = "";
                for (var j = i + 1; j < lines.length; j++) {
                    if (lines[j].trim() && lines[j].trim().charAt(0) !== "#") { next = lines[j].trim(); break; }
                }
                if (next) {
                    variants.push({ label: height ? height + "p" : "Auto", url: this._abs(next), height: Number(height || 0) });
                }
            }
        }
        variants.sort(function (a, b) { return b.height - a.height; });
        return { audios: audios, variants: variants, masterUrl: masterUrl };
    }

    _withLang(streamUrl, code) {
        if (/[?&]lang=/.test(streamUrl)) return streamUrl.replace(/([?&])lang=[^&]*/, "$1lang=" + encodeURIComponent(code));
        return streamUrl + (streamUrl.indexOf("?") === -1 ? "?" : "&") + "lang=" + encodeURIComponent(code);
    }

    async getVideoList(url) {
        var link = String(url || "");
        var page = await this._pageWithSession(link);
        if (!page) {
            var cachedPage = await this._get(link);
            page = cachedPage ? { body: cachedPage.body || "", headers: cachedPage.headers || {}, cookie: this._sessionCookie(cachedPage.headers) } : null;
        }
        if (!page) return [{ quality: "WebView", url: link, originalUrl: link }];

        var html = page.body;
        var sourceM = html.match(/<source[^>]+src="([^"]+)"/);
        var stream = sourceM ? this._abs(sourceM[1]) : "";
        var subtitles = this._tracks(html);
        if (!stream) {
            // Episode not published yet: let the site's own player explain it.
            return [{ quality: "WebView", url: link, originalUrl: link, subtitles: subtitles }];
        }

        var headers = {
            "User-Agent": MT_UA,
            "Referer": link,
            "Origin": MT_BASE
        };
        if (page.cookie) headers["Cookie"] = page.cookie;

        var info = { audios: [], variants: [] };
        try {
            var res = await this.client.get(stream, headers);
            if (res && Number(res.statusCode) < 400 && res.body) {
                info = this._master(res.body, stream);
            }
        } catch (e) {
            info = { audios: [], variants: [] };
        }

        var prefLang = this.getLang();
        var audios = info.audios.filter(function (a) { return a.code; });
        if (!audios.length) {
            audios = Object.keys(MT_AUDIO_LABELS).map(function (code) {
                return { code: code, label: MT_AUDIO_LABELS[code] };
            });
        }
        audios.sort(function (a, b) {
            var pa = a.code === prefLang ? 0 : 1, pb = b.code === prefLang ? 0 : 1;
            if (pa !== pb) return pa - pb;
            return a.label < b.label ? -1 : (a.label > b.label ? 1 : 0);
        });

        // The playlist lists every audio rendition but only plays the DEFAULT
        // one, so `?lang=` is the audio selector: one entry per language.
        var qualityLabel = info.variants.length ? info.variants[0].label : "Auto";
        var subs = subtitles.map(function (s) { return { label: s.label, file: s.file }; });
        var audioList = info.audios.map(function (a) { return { label: a.label, file: a.url }; });

        var videos = audios.map(function (a) {
            var streamUrl = this._withLang(stream, a.code);
            return {
                quality: qualityLabel + " · " + (a.label || a.code),
                url: streamUrl,
                originalUrl: streamUrl,
                headers: headers,
                audios: audioList,
                subtitles: subs
            };
        }, this);

        if (info.variants.length > 1) {
            videos.push({
                quality: "Auto · " + prefLang.toUpperCase(),
                url: stream,
                originalUrl: stream,
                headers: headers,
                audios: audioList,
                subtitles: subs
            });
        }
        videos.push({ quality: "WebView", url: link, originalUrl: link, subtitles: subs });
        return videos;
    }

    // ── comments / recommendations ─────────────────────────────
    async getComments(url) {
        var page = await this._get(String(url || ""));
        if (!page) return [];
        var html = page.body || "";
        var chunks = html.split('<li class="comment-item"');
        var list = [];
        for (var i = 1; i < chunks.length; i++) {
            var chunk = chunks[i].split('class="comment-actions"')[0];
            var id = (chunk.match(/data-comment-id="(\d+)"/) || [])[1] || String(i);
            var author = this._clean((chunk.match(/class="comment-author"[^>]*>([\s\S]*?)<\/h6>/) || [])[1] || "");
            var date = this._clean((chunk.match(/comment-date-[a-z]*"[^>]*>([\s\S]*?)<\/a>/) || [])[1] || "");
            var text = this._clean((chunk.match(/<p[^>]*>([\s\S]*?)<\/p>/) || [])[1] || "");
            if (!text) continue;
            list.push({
                id: id,
                author: author || "Anonyme",
                avatar: "",
                date: date,
                content: text,
                score: 0,
                replies: []
            });
        }
        return list;
    }

    async getRecommendations(url) {
        var link = String(url || "");
        var sM = link.match(/\/saison-(\d+)\//);
        var current = sM ? sM[1] : "";
        await this._get(this._episodesUrl());
        var out = [];
        var cards = this._allCards().filter(function (c) {
            return String(c.season) === current && c.link !== link;
        });
        cards.sort(function (a, b) { return Number(a.episode || 0) - Number(b.episode || 0); });
        for (var i = 0; i < cards.length; i++) out.push(cards[i]);

        for (var j = 0; j < MT_SEASONS.length; j++) {
            var s = String(MT_SEASONS[j]);
            if (s === current) continue;
            out.push({
                name: "Saison " + s,
                link: this._seasonLink(s),
                imageUrl: this._seasonPoster(s),
                description: "Miraculous Ladybug — Saison " + s
            });
        }
        out.push({
            name: "Films spéciaux",
            link: this._seasonLink("specials"),
            imageUrl: this._seasonPoster("specials"),
            description: "Miraculous World et films"
        });
        return out;
    }

    getFilterList() {
        function opt(name, value) { return { type_name: "SelectOption", name: name, value: value }; }
        var values = [opt("Toutes les saisons", "")];
        MT_SEASONS.forEach(function (s) { values.push(opt("Saison " + s, String(s))); });
        values.push(opt("Films spéciaux", "specials"));
        return [{ type_name: "SelectFilter", name: "Saison", state: 0, values: values }];
    }
}
