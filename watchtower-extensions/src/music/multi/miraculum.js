// ══════════════════════════════════════════════════════════════
//  Miraculum Music — miraculum.ml/songs
//  v1.0.0 — Miraculous Ladybug music & albums in 40+ languages
//  Soundtracks, intros, game OSTs, movie songs
// ══════════════════════════════════════════════════════════════

const watchtowerSources = [{
    "name": "Miraculum Music",
    "lang": "multi",
    "baseUrl": "https://miraculum.ml",
    "apiUrl": "https://Amexd.b-cdn.net",
    "iconUrl": "https://miraculum.ml/android-chrome-192x192.png",
    "typeSource": "single",
    "itemType": 3,
    "version": "1.0.0",
    "pkgPath": "music/multi/miraculum.js",
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "isNsfw": false,
    "notes": "Miraculous Ladybug — albums & chansons de la série, du film et des jeux sur miraculum.ml"
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

    // ── Parse albums from the songs page HTML ─────────────────
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

    async getPopularList(page) {
        if (page > 1) return { list: [], hasNextPage: false };
        var lang = this.getLang();
        var items = [];
        try { items = await this._fetchAlbums(lang); } catch(e) { /* ignore */ }
        return { list: items, hasNextPage: false };
    }

    async getLatestList(page) { return this.getPopularList(page); }

    async getSearchList(query, page, filters) {
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

    // ── Detail: parse tracks from listen page ─────────────────
    async getDetail(url) {
        // url = https://miraculum.ml/{lang}/songs?album={key}
        var lang = this.getLang();
        var albumKey = "";
        var m = url.match(/album=([^&\s]+)/);
        if (m) albumKey = m[1];

        // Convert songs URL to listen URL
        var listenUrl = url.replace("/songs?", "/listen?");

        var coverUrl = albumKey
            ? MIRKM_CDN + "/" + albumKey + "/cover.webp"
            : "";
        var albumTitle = albumKey || "Album";

        var chapters = [];

        try {
            var res = await new Client().get(listenUrl, this.getHeaders(listenUrl));
            var doc = new Document(res.body);

            // Try to extract title from page
            var h1 = doc.selectFirst("h1.album-title, h1, .album-name");
            if (h1) albumTitle = h1.text.trim();

            // Extract track elements — various selectors the listen page may use
            var trackEls = doc.select(
                ".track-item, .track_item, li.track, div.track, " +
                ".song-track, .audio-item, .playlist-item, " +
                "[data-track], [data-audio-src]"
            );

            trackEls.forEach(function(el) {
                // Try different attribute/child combinations
                var trackUrl = el.attr("data-audio-src") || el.attr("data-url") ||
                               el.attr("data-src") || el.attr("data-track-url") || "";
                var trackName = "";
                var nameEl = el.selectFirst(".track-title, .title, .name, span");
                if (nameEl) trackName = nameEl.text.trim();
                if (!trackName) trackName = el.attr("data-title") || el.attr("title") || "";

                if (!trackUrl && albumKey) {
                    // Try to build CDN URL from filename attribute
                    var fname = el.attr("data-filename") || el.attr("data-file") || "";
                    if (fname) trackUrl = MIRKM_CDN + "/" + albumKey + "/" + fname;
                }

                if (trackUrl && trackName) {
                    chapters.push({ name: trackName, url: trackUrl });
                } else if (trackUrl) {
                    // Derive name from URL filename
                    var parts = trackUrl.split("/");
                    chapters.push({
                        name: parts[parts.length - 1].replace(/\.(mp3|m4a|ogg|opus)$/, ""),
                        url: trackUrl
                    });
                }
            });

            // Fallback: look for direct audio links
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

            // Fallback: look for inline JSON array with track data
            if (chapters.length === 0) {
                var body = res.body;
                // Match a JS array like: [{title:"...",file:"...",src:"..."}]
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
                    } catch(e) { /* ignore parse error */ }
                }
            }
        } catch(err) { /* ignore fetch error */ }

        // Last resort: return the listen page as a single chapter (webview playback)
        if (chapters.length === 0) {
            chapters.push({
                name: "▶ Écouter l'album",
                url: listenUrl
            });
        }

        return {
            name: albumTitle,
            imageUrl: coverUrl,
            description: "Miraculous Ladybug — " + albumTitle + "\nÉcoutez sur miraculum.ml",
            chapters: chapters
        };
    }

    // ── Video/Audio list: return the audio stream URL ─────────
    async getVideoList(url) {
        // url may be a direct CDN audio URL or a listen page URL
        var isCdn = url.includes("b-cdn.net") || url.match(/\.(mp3|m4a|ogg|opus)$/);

        if (isCdn) {
            // Direct audio file — return as-is
            var lang = this.getLang();
            var finalUrl = url.replace(/\/lang\.(m4a|mp3|ogg|opus)$/, "/" + lang + ".$1");
            return [{ quality: "Audio", url: finalUrl }];
        }

        // Listen page — try to extract audio source from page
        try {
            var res = await new Client().get(url, this.getHeaders(url));
            var body = res.body;

            // Look for audio element source
            var audioM = body.match(/<source[^>]+src="([^"]+\.(mp3|m4a|ogg|opus)[^"]*)"/i);
            if (audioM) return [{ quality: "Audio", url: audioM[1] }];

            // Look for CDN audio URLs in scripts
            var cdnM = body.match(/["'](https:\/\/Amexd\.b-cdn\.net\/[^"']+\.(mp3|m4a|ogg|opus))["']/i);
            if (cdnM) return [{ quality: "Audio", url: cdnM[1] }];
        } catch(e) { /* ignore */ }

        // Fallback: webview
        return [{ quality: "WebView", url: url }];
    }

    // ── Preferences ──────────────────────────────────────────
    getPreferenceList() {
        return [
            {
                key: "mirkm_lang",
                listPreference: {
                    title: "Langue des albums",
                    summary: "Sélectionnez la langue de la musique",
                    valueIndex: 6,
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
