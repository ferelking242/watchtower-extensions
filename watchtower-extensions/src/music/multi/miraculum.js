// ══════════════════════════════════════════════════════════════
//  Miraculum Music — miraculum.ml/songs  v2.1.0
//  Miraculous Ladybug — tous les albums, chansons & OSTs
//  Série S1–S6 · Film · Jeux · Intros · Chansons localisées
// ══════════════════════════════════════════════════════════════

const watchtowerSources = [{
    "name": "Miraculum Music",
    "lang": "multi",
    "baseUrl": "https://miraculum.ml",
    "apiUrl": "https://Amexd.b-cdn.net",
    "iconUrl": "https://miraculum.ml/android-chrome-192x192.png",
    "typeSource": "single",
    "itemType": 3,
    "version": "2.1.0",
    "pkgPath": "music/multi/miraculum.js",
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "isNsfw": false,
    "notes": "Miraculous Ladybug — albums OST, film, jeux, intros localisées. CDN Amexd."
}];

// ── Constants ─────────────────────────────────────────────────
var MIRKM_BASE = "https://miraculum.ml";
var MIRKM_CDN  = "https://Amexd.b-cdn.net/eps/miraculum/songs";

// ── Extension ─────────────────────────────────────────────────
class DefaultExtension extends MProvider {
    constructor() { super(); }

    getPreference(key) { return new SharedPreferences().get(key); }

    getLang() { return this.getPreference("mirkm_lang") || "en"; }

    getHeaders(url) {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": MIRKM_BASE + "/",
            "Accept": "text/html,application/xhtml+xml,*/*"
        };
    }

    get supportsLatest() { return true; }

    // ── Fetch album list from songs page ──────────────────────
    async _fetchAlbums(lang) {
        var url = MIRKM_BASE + "/" + lang + "/songs";
        var res = await new Client().get(url, this.getHeaders(url));
        var doc = new Document(res.body);
        var items = [];

        doc.select("a.song-item").forEach(function(a) {
            var key = a.attr("data-album-key") || "";
            if (!key) return;
            var titleEl  = a.selectFirst("div.title");
            var authorEl = a.selectFirst("div.author");
            var yearEl   = a.selectFirst("div.year");
            var imgEl    = a.selectFirst("img.album-art");

            var title  = titleEl  ? titleEl.text.trim()  : key;
            var author = authorEl ? authorEl.text.trim() : "";
            var year   = yearEl   ? yearEl.text.trim()   : "";
            var cover  = imgEl
                ? (imgEl.attr("src") || imgEl.attr("data-src") || "")
                : "";
            if (!cover) cover = MIRKM_CDN + "/" + key + "/cover.webp";

            var displayName = title;
            if (author) displayName += " — " + author;
            if (year)   displayName += " (" + year + ")";

            items.push({
                name: displayName,
                imageUrl: cover,
                link: MIRKM_BASE + "/" + lang + "/songs?album=" + key
            });
        });

        return items;
    }

    // ── getPopular ────────────────────────────────────────────
    async getPopular(page) {
        if (page > 1) return { list: [], hasNextPage: false };
        var lang = this.getLang();
        try {
            var items = await this._fetchAlbums(lang);
            return { list: items, hasNextPage: false };
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    // ── getLatestUpdates ──────────────────────────────────────
    async getLatestUpdates(page) { return this.getPopular(page); }

    // ── search ────────────────────────────────────────────────
    async search(query, page, filters) {
        if (page > 1) return { list: [], hasNextPage: false };
        var lang = this.getLang();
        try {
            var all = await this._fetchAlbums(lang);
            var q = query.toLowerCase();
            var filtered = all.filter(function(item) {
                return item.name.toLowerCase().includes(q);
            });
            return { list: filtered, hasNextPage: false };
        } catch (e) {
            return { list: [], hasNextPage: false };
        }
    }

    // ── getDetail: parse track list from listen page ──────────
    async getDetail(url) {
        var lang = this.getLang();
        var keyM = url.match(/album=([^&\s]+)/);
        var albumKey = keyM ? keyM[1] : "";

        var listenUrl = url.replace("/songs?", "/listen?");
        var coverUrl  = albumKey ? (MIRKM_CDN + "/" + albumKey + "/cover.webp") : "";
        var albumTitle = albumKey || "Album";
        var chapters  = [];

        try {
            var res  = await new Client().get(listenUrl, this.getHeaders(listenUrl));
            var body = res.body;
            var doc  = new Document(body);

            // Album title from page heading
            var h1 = doc.selectFirst("h1.album-title, .album-name, h1");
            if (h1 && h1.text.trim()) albumTitle = h1.text.trim();

            // Strategy 1: track elements with data attributes
            doc.select(
                ".track-item, .track_item, li.track, div.track, " +
                ".audio-item, .playlist-item, [data-audio-src], [data-track]"
            ).forEach(function(el) {
                var tUrl  = el.attr("data-audio-src") || el.attr("data-url") ||
                            el.attr("data-src") || el.attr("data-track-url") || "";
                var tName = "";
                var nameEl = el.selectFirst(".track-title, .title, .name, span");
                if (nameEl) tName = nameEl.text.trim();
                if (!tName) tName = el.attr("data-title") || el.attr("title") || "";
                if (!tUrl && albumKey) {
                    var fname = el.attr("data-filename") || el.attr("data-file") || "";
                    if (fname) tUrl = MIRKM_CDN + "/" + albumKey + "/" + fname;
                }
                if (tUrl) {
                    chapters.push({
                        name: tName || tUrl.split("/").pop().replace(/\.(mp3|m4a|ogg)$/, ""),
                        url: tUrl
                    });
                }
            });

            // Strategy 2: direct audio links
            if (chapters.length === 0) {
                doc.select("a[href*='.mp3'], a[href*='.m4a'], a[href*='.ogg']").forEach(function(a) {
                    var href = a.attr("href") || "";
                    if (!href.startsWith("http") && albumKey) {
                        href = MIRKM_CDN + "/" + albumKey + "/" + href.replace(/^\//, "");
                    }
                    var lbl = a.text.trim() || href.split("/").pop();
                    if (href) chapters.push({ name: lbl, url: href });
                });
            }

            // Strategy 3: inline JS array
            if (chapters.length === 0) {
                var jsonM = body.match(
                    /(?:tracks|songs|playlist|trackList)\s*=\s*(\[\s*\{[^;]{10,}\}\s*\])/
                );
                if (jsonM) {
                    try {
                        var arr = JSON.parse(jsonM[1]);
                        arr.forEach(function(t) {
                            var turl  = t.src || t.file || t.url || t.filename || t.audio || "";
                            var tname = t.title || t.name || t.track || "";
                            if (turl && !turl.startsWith("http") && albumKey) {
                                turl = MIRKM_CDN + "/" + albumKey + "/" + turl;
                            }
                            if (turl) chapters.push({ name: tname || turl.split("/").pop(), url: turl });
                        });
                    } catch (e) { /* ignore */ }
                }
            }

            // Strategy 4: CDN URLs in script tags
            if (chapters.length === 0) {
                var cdnRe = /"(https:\/\/Amexd\.b-cdn\.net\/eps\/miraculum\/songs\/[^"]+\.(mp3|m4a|ogg))"/gi;
                var m;
                var seen = {};
                while ((m = cdnRe.exec(body)) !== null) {
                    var aUrl = m[1];
                    if (!seen[aUrl]) {
                        seen[aUrl] = true;
                        chapters.push({
                            name: aUrl.split("/").pop().replace(/\.(mp3|m4a|ogg)$/, ""),
                            url: aUrl
                        });
                    }
                }
            }
        } catch (err) { /* ignore fetch error */ }

        if (chapters.length === 0) {
            chapters.push({ name: "Écouter — " + albumTitle, url: listenUrl });
        }

        return {
            name: albumTitle,
            imageUrl: coverUrl,
            description: "Miraculous Ladybug — " + albumTitle + "\nmiraulum.ml",
            chapters: chapters
        };
    }

    // ── getVideoList: audio stream URL ────────────────────────
    // IMPORTANT: every entry MUST have both `url` and `originalUrl`
    async getVideoList(url) {
        var lang = this.getLang();

        // Direct CDN audio file
        if (/\.(mp3|m4a|ogg|opus)(\?|$)/i.test(url) || url.includes("b-cdn.net")) {
            // Replace /lang.m4a placeholder with selected language
            var finalUrl = url.replace(/\/lang\.(mp3|m4a|ogg|opus)/i, "/" + lang + ".$1");
            return [{ quality: "Audio", url: finalUrl, originalUrl: finalUrl }];
        }

        // Listen page: try to extract first audio source
        try {
            var res  = await new Client().get(url, this.getHeaders(url));
            var body = res.body;

            // <source src="...">
            var srcM = body.match(/<source[^>]+src="([^"]+\.(mp3|m4a|ogg|opus)[^"]*)"/i);
            if (srcM) return [{ quality: "Audio", url: srcM[1], originalUrl: srcM[1] }];

            // CDN URL in scripts
            var cdnM = body.match(/"(https:\/\/Amexd\.b-cdn\.net\/[^"]+\.(mp3|m4a|ogg|opus))"/i);
            if (cdnM) return [{ quality: "Audio", url: cdnM[1], originalUrl: cdnM[1] }];
        } catch (e) { /* ignore */ }

        return [{ quality: "WebView", url: url, originalUrl: url }];
    }

    // ── getFilterList ─────────────────────────────────────────
    getFilterList() { return []; }

    // ── getSourcePreferences ──────────────────────────────────
    getSourcePreferences() {
        return [
            {
                key: "mirkm_lang",
                listPreference: {
                    title: "Langue des chansons",
                    summary: "Langue pour les pistes localisées (ex: Intro)",
                    valueIndex: 2,
                    entries: [
                        "العربية", "Deutsch", "English", "Español",
                        "Español (LatAm)", "Français", "Italiano",
                        "한국어", "日本語", "Polski", "Português",
                        "Português (Brasil)", "Русский", "Türkçe",
                        "普通話", "हिन्दी", "Tiếng Việt", "Bahasa Indonesia",
                        "Nederlands", "Svenska", "Čeština", "Română",
                        "Magyar", "Українська", "Instrumental"
                    ],
                    entryValues: [
                        "ar", "de", "en", "es",
                        "es-419", "fr", "it",
                        "ko", "ja", "pl", "pt",
                        "pt-br", "ru", "tr",
                        "zh-cmn", "hi", "vi", "id",
                        "nl", "sv", "cs", "ro",
                        "hu", "uk", "inst"
                    ]
                }
            }
        ];
    }
}
