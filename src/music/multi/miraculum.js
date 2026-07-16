// ══════════════════════════════════════════════════════════════
//  Miraculum Music — miraculum.ml/songs
//  v2.1.0 — Miraculous Ladybug music & albums in 40+ languages
//  Soundtracks, intros, game OSTs, movie songs
// ══════════════════════════════════════════════════════════════

const watchtowerSources = [{
    "name": "Miraculum Music",
    "lang": "multi",
    "baseUrl": "https://miraculum.ml",
    "apiUrl": "https://Amexd.b-cdn.net",
    "iconUrl": "https://miraculum.ml/android-chrome-192x192.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "2.1.0",
    "pkgPath": "watch/multi/miraculum_music.js",
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "isNsfw": false,
    "notes": "v2.1.0 — fix: méthodes renommées, originalUrl, getFilterList, itemType 1 (JS runtime)"
}];

// ── Constants ─────────────────────────────────────────────────
var MIRKM_BASE = "https://miraculum.ml";
var MIRKM_CDN  = "https://Amexd.b-cdn.net/eps/miraculum/songs";

// ── Extension class ───────────────────────────────────────────
class DefaultExtension extends MProvider {
    constructor() { super(); }

    getPreference(key) { return new SharedPreferences().get(key); }

    getLang() { return this.getPreference("mirkm_lang") || "en"; }

    getHeaders(url) {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Referer": MIRKM_BASE + "/",
            "Accept": "text/html,application/xhtml+xml,*/*",
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8"
        };
    }

    get supportsLatest() { return true; }

    // ── Parse albums from the songs page ─────────────────────
    async _fetchAlbums(lang) {
        var url = MIRKM_BASE + "/" + lang + "/songs";
        var res = await new Client().get(url, this.getHeaders(url));
        var doc = new Document(res.body);
        var items = [];

        doc.select("a.song-item").forEach(function(a) {
            var albumKey = a.attr("data-album-key") || "";
            if (!albumKey) return;
            var titleEl  = a.selectFirst("div.title");
            var authorEl = a.selectFirst("div.author");
            var yearEl   = a.selectFirst("div.year");
            var imgEl    = a.selectFirst("img.album-art");

            var title  = titleEl  ? titleEl.text.trim()  : albumKey;
            var author = authorEl ? authorEl.text.trim() : "";
            var year   = yearEl   ? yearEl.text.trim()   : "";
            var cover  = imgEl    ? (imgEl.attr("src") || imgEl.attr("data-src") || "") : "";
            if (!cover) cover = MIRKM_CDN + "/" + albumKey + "/cover.webp";

            items.push({
                name: title + (author ? " — " + author : "") + (year ? " (" + year + ")" : ""),
                imageUrl: cover,
                link: MIRKM_BASE + "/" + lang + "/songs?album=" + albumKey
            });
        });

        return items;
    }

    async getPopular(page) {
        if (page > 1) return { list: [], hasNextPage: false };
        var lang = this.getLang();
        var items = [];
        try { items = await this._fetchAlbums(lang); } catch(e) { /* ignore */ }
        return { list: items, hasNextPage: false };
    }

    async getLatestUpdates(page) { return this.getPopular(page); }

    async search(query, page, filters) {
        if (page > 1) return { list: [], hasNextPage: false };
        var lang = this.getLang();
        var all = [];
        try { all = await this._fetchAlbums(lang); } catch(e) { /* ignore */ }
        var q = query.toLowerCase();
        var filtered = all.filter(function(item) {
            return item.name.toLowerCase().includes(q);
        });
        return { list: filtered, hasNextPage: false };
    }

    // ── Detail: tracks from listen page ──────────────────────
    async getDetail(url) {
        var lang = this.getLang();
        var albumKey = "";
        var m = url.match(/album=([^&\s]+)/);
        if (m) albumKey = m[1];

        var listenUrl = url.replace("/songs?", "/listen?");
        var coverUrl = albumKey ? MIRKM_CDN + "/" + albumKey + "/cover.webp" : "";
        var albumTitle = albumKey || "Album";
        var chapters = [];

        try {
            var res = await new Client().get(listenUrl, this.getHeaders(listenUrl));
            var doc = new Document(res.body);

            var h1 = doc.selectFirst("h1.album-title, h1, .album-name");
            if (h1) albumTitle = h1.text.trim();

            var trackEls = doc.select(
                ".track-item, .track_item, li.track, div.track, " +
                ".song-track, .audio-item, .playlist-item, " +
                "[data-track], [data-audio-src]"
            );

            trackEls.forEach(function(el) {
                var trackUrl = el.attr("data-audio-src") || el.attr("data-url") ||
                               el.attr("data-src") || el.attr("data-track-url") || "";
                var trackName = "";
                var nameEl = el.selectFirst(".track-title, .title, .name, span");
                if (nameEl) trackName = nameEl.text.trim();
                if (!trackName) trackName = el.attr("data-title") || el.attr("title") || "";

                if (!trackUrl && albumKey) {
                    var fname = el.attr("data-filename") || el.attr("data-file") || "";
                    if (fname) trackUrl = MIRKM_CDN + "/" + albumKey + "/" + fname;
                }

                if (trackUrl && trackName) {
                    chapters.push({ name: trackName, url: trackUrl });
                } else if (trackUrl) {
                    var parts = trackUrl.split("/");
                    chapters.push({
                        name: parts[parts.length - 1].replace(/\.(mp3|m4a|ogg|opus)$/, ""),
                        url: trackUrl
                    });
                }
            });

            if (chapters.length === 0) {
                doc.select("a[href*='.mp3'], a[href*='.m4a'], a[href*='.ogg']").forEach(function(a) {
                    var href = a.attr("href") || "";
                    if (!href.startsWith("http")) {
                        href = href.startsWith("/") ? MIRKM_CDN + href : MIRKM_CDN + "/" + albumKey + "/" + href;
                    }
                    var lbl = a.text.trim() || href.split("/").pop();
                    chapters.push({ name: lbl, url: href });
                });
            }

            if (chapters.length === 0) {
                var body = res.body;
                var jsonM = body.match(/(?:tracks|songs|playlist|trackList)\s*=\s*(\[[^\]]{20,}\])/);
                if (jsonM) {
                    try {
                        var arr = JSON.parse(jsonM[1]);
                        arr.forEach(function(t) {
                            var turl = t.src || t.file || t.url || t.filename || "";
                            var tname = t.title || t.name || t.track || "";
                            if (!turl.startsWith("http") && albumKey) {
                                turl = MIRKM_CDN + "/" + albumKey + "/" + turl;
                            }
                            if (turl && tname) chapters.push({ name: tname, url: turl });
                        });
                    } catch(e) { /* ignore */ }
                }
            }
        } catch(err) { /* ignore */ }

        if (chapters.length === 0) {
            chapters.push({ name: "▶ Écouter l'album", url: listenUrl });
        }

        return {
            name: albumTitle,
            imageUrl: coverUrl,
            description: "Miraculous Ladybug — " + albumTitle + "\nÉcoutez sur miraculum.ml",
            chapters: chapters
        };
    }

    // ── Audio/Video list ──────────────────────────────────────
    async getVideoList(url) {
        var isCdn = url.includes("b-cdn.net") || url.match(/\.(mp3|m4a|ogg|opus)$/);

        if (isCdn) {
            var lang = this.getLang();
            var finalUrl = url.replace(/\/lang\.(m4a|mp3|ogg|opus)$/, "/" + lang + ".$1");
            return [{ quality: "Audio", url: finalUrl, originalUrl: finalUrl }];
        }

        try {
            var res = await new Client().get(url, this.getHeaders(url));
            var body = res.body;

            var audioM = body.match(/<source[^>]+src="([^"]+\.(mp3|m4a|ogg|opus)[^"]*)"/i);
            if (audioM) return [{ quality: "Audio", url: audioM[1], originalUrl: audioM[1] }];

            var cdnM = body.match(/["'](https:\/\/Amexd\.b-cdn\.net\/[^"']+\.(mp3|m4a|ogg|opus))["']/i);
            if (cdnM) return [{ quality: "Audio", url: cdnM[1], originalUrl: cdnM[1] }];
        } catch(e) { /* ignore */ }

        return [{ quality: "WebView", url: url, originalUrl: url }];
    }

    // ── Filters & Preferences ─────────────────────────────────
    getFilterList() { return []; }

    getSourcePreferences() {
        return [
            {
                key: "mirkm_lang",
                listPreference: {
                    title: "Langue des albums",
                    summary: "Sélectionnez la langue de la musique",
                    valueIndex: 12,
                    entries: [
                        "العربية (Fusha)", "العربية (Masriyya)", "Amharic", "Bengali",
                        "Български", "Català", "Cymraeg", "Čeština",
                        "Dansk", "Deutsch", "Eesti", "Ελληνικά",
                        "English", "Español", "Español (Latinoamérica)", "Euskara",
                        "Farsi", "Filipino", "Français", "Gaeilge",
                        "한국어", "Հայերեն", "हिन्दी", "Hrvatski",
                        "Bahasa Indonesia", "Italiano", "עברית", "ქართული",
                        "Magyar", "Melayu", "Nederlands", "日本語",
                        "Norsk", "Polski", "Português", "Português (Brasil)",
                        "Română", "Русский", "Shqip", "Slovenčina",
                        "Slovenščina", "Srpski", "Suomi", "Svenska",
                        "தமிழ்", "Telugu", "ภาษาไทย", "Türkçe",
                        "Українська", "Tiếng Việt", "普通話 (Mandarin)", "台灣話",
                        "Sinhala", "O'zbekcha", "Instrumental"
                    ],
                    entryValues: [
                        "ar", "ar-eg", "am", "bn",
                        "bg", "ca", "cy", "cs",
                        "da", "de", "et", "el",
                        "en", "es", "es-419", "eu",
                        "fa", "fil", "fr", "ga",
                        "ko", "hy", "hi", "hr",
                        "id", "it", "he", "ka",
                        "hu", "ms", "nl", "ja",
                        "no", "pl", "pt", "pt-br",
                        "ro", "ru", "sq", "sk",
                        "sl", "sr", "fi", "sv",
                        "ta", "te", "th", "tr",
                        "uk", "vi", "zh-cmn", "zh-tw",
                        "si", "uz", "inst"
                    ]
                }
            }
        ];
    }
}
