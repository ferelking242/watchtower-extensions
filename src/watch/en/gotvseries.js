// ─────────────────────────────────────────────────────────────────────────────
// GoTVSeries — extension Watchtower v0.1.5
//
// Source  : https://gotvseries.top
// Content : English TV series — metadata & cast directly from TMDB
//
// Methods :
//   getPopular(page)        → /tv?page=N listing (newest/trending)
//   getLatestUpdates(page)  → alias of getPopular
//   getForYou(page)         → alias of getPopular
//   search(query, page)     → /search?q=query, fallback: listing filter
//   getDetail(url)          → full detail + all seasons/episodes as chapters
//   getVideoList(url)       → vidsrc-embed streams via TMDB ID + season + ep
//
// supportsForYou    : true  — "For You" tab enabled
// supportsComments  : false — no comment support
// subCategories     : ["serie"]
// ─────────────────────────────────────────────────────────────────────────────

const watchtowerSources = [{
    "name": "GoTVSeries",
    "langs": ["en"],
    "ids": { "en": 285745821 },
    "baseUrl": "https://gotvseries.top",
    "apiUrl": "https://gotvseries.top",
    "iconUrl": "https://gotvseries.top/images/favicon.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "0.1.6",
    "pkgPath": "watch/en/gotvseries.js",
    "editableBaseUrl": true,
    "customUserAgent": "",
    "videoQualities": ["AUTO"],
    "subCategories": ["serie"],
    "supportsForYou": true,
    "supportsComments": false,
    "appMinVerReq": "0.5.0",
    "sourceCodeLanguage": 1
}];

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.id = 285745821;
        this.baseUrl = "https://gotvseries.top";
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    _hdrs(ref) {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": ref || this.baseUrl + "/"
        };
    }

    // Extract TMDB numeric ID from slug "220102-spider-noir-2026" → "220102"
    _tmdbId(slug) {
        var m = /^(\d+)/.exec(slug || "");
        return m ? m[1] : "";
    }

    // Extract slug (e.g. "220102-spider-noir-2026") from any URL variant
    _slug(url) {
        var clean = (url || "").replace(/^https?:\/\/[^\/]+/, "");
        var m = /\/tv\/(?:watch\/)?([^\/\?#]+)/.exec(clean);
        return m ? m[1] : "";
    }

    // Normalize any URL to the base series page /tv/{slug}
    _seriesUrl(url) {
        var slug = this._slug(url);
        return slug ? this.baseUrl + "/tv/" + slug : url;
    }

    // Decode HTML entities
    _decode(s) {
        return (s || "")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&#(\d+);/g, function(_, c) { return String.fromCharCode(+c); })
            .replace(/\s+/g, " ").trim();
    }

    // Parse show cards (class="poster-item") from listing/search HTML
    _parseCards(html) {
        var items = [];
        var seen = {};
        // Two regex patterns to handle both attribute orders in <a>
        var patterns = [
            /<a\s[^>]*href="(\/tv\/(\d+)-[^"\/]*)"[^>]*class="poster-item"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/gi,
            /<a\s[^>]*class="poster-item"[^>]*href="(\/tv\/(\d+)-[^"\/]*)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/gi
        ];
        for (var pi = 0; pi < patterns.length; pi++) {
            var re = patterns[pi];
            var m;
            while ((m = re.exec(html)) !== null) {
                var link = this.baseUrl + m[1];
                if (seen[link]) continue;
                seen[link] = true;
                items.push({
                    name: this._decode(m[4]) || "Unknown",
                    imageUrl: m[3],
                    link: link,
                    description: "",
                    genre: [],
                    author: "",
                    artist: "",
                    status: 0,
                    isHentai: false
                });
            }
        }
        return items;
    }

    // ── Source Detail ─────────────────────────────────────────────────────────

    async getSourceDetail() {
        return {
            iconUrl: this.baseUrl + "/images/favicon.png",
            description: "Stream English TV series from GoTVSeries. Full cast and metadata via TMDB.",
            lang: "en",
            name: "GoTVSeries",
            baseUrl: this.baseUrl
        };
    }

    // ── Listings ──────────────────────────────────────────────────────────────

    async getPopular(page) {
        var p = Math.max(1, page || 1);
        var r = await new Client().get(
            this.baseUrl + "/tv?page=" + p,
            { headers: this._hdrs() }
        );
        var items = this._parseCards(r.body || "");
        return { list: items, hasNextPage: items.length > 0 };
    }

    async getLatestUpdates(page) {
        return this.getPopular(page);
    }

    async getForYou(page) {
        return this.getPopular(page);
    }

    // ── Search ────────────────────────────────────────────────────────────────

    async search(query, page, filters) {
        // 1. Try /search?q=query
        try {
            var r = await new Client().get(
                this.baseUrl + "/search?q=" + encodeURIComponent(query || ""),
                { headers: this._hdrs(this.baseUrl + "/") }
            );
            var items = this._parseCards(r.body || "");
            if (items.length > 0) return { list: items, hasNextPage: false };
        } catch (_) {}
        // 2. Fallback: fetch TV listing and filter by title
        try {
            var r2 = await new Client().get(this.baseUrl + "/tv", { headers: this._hdrs() });
            var all = this._parseCards(r2.body || "");
            var q = (query || "").toLowerCase();
            var filtered = all.filter(function(it) {
                return it.name.toLowerCase().indexOf(q) !== -1;
            });
            return { list: filtered, hasNextPage: false };
        } catch (_) {}
        return { list: [], hasNextPage: false };
    }

    // ── Detail ────────────────────────────────────────────────────────────────

    async getDetail(url) {
        var baseSeriesUrl = this._seriesUrl(url);
        var slug = this._slug(url);

        var r = await new Client().get(baseSeriesUrl, {
            headers: this._hdrs(this.baseUrl + "/tv")
        });
        var html = r.body || "";

        // ── Title ─────────────────────────────────────────────────────────────
        var titleM = /data-title="([^"]+)"/.exec(html)
                  || /<h1[^>]*>([^<]+)<\/h1>/i.exec(html)
                  || /<title>([^<|–\-]+)/.exec(html);
        var title = titleM ? this._decode(titleM[1]) : this._decode(slug);

        // ── Poster — prefer w500, fallback w342 ───────────────────────────────
        var imgM = /src="(https:\/\/image\.tmdb\.org\/t\/p\/(?:w500|w342)\/[^"]+)"/.exec(html);
        var image = imgM ? imgM[1] : "";

        // ── Rating ────────────────────────────────────────────────────────────
        var ratingM = /([0-9]+(?:\.[0-9]+)?)\s*\/\s*10/.exec(
            (/<span[^>]*class="meta-rating"[^>]*>([\s\S]*?)<\/span>/i.exec(html) || ["",""])[1]
                .replace(/<[^>]+>/g, "")
        );
        if (!ratingM) ratingM = /([0-9]+(?:\.[0-9]+)?)\s*\/\s*10/.exec(html);
        var rating = ratingM ? ratingM[1] : "";

        // ── Genres ────────────────────────────────────────────────────────────
        var genresM = /<div class="genres">([\s\S]*?)<\/div>/i.exec(html);
        var genres = [];
        if (genresM) {
            genres = this._decode(genresM[1].replace(/<[^>]+>/g, ""))
                .split(/[•,]/)
                .map(function(g) { return g.trim(); })
                .filter(Boolean);
        }

        // ── Overview ──────────────────────────────────────────────────────────
        var overM = /<p[^>]*class="overview-text"[^>]*>([\s\S]*?)<\/p>/i.exec(html);
        var overview = overM ? this._decode(overM[1].replace(/<[^>]+>/g, "")) : "";

        // ── Status ────────────────────────────────────────────────────────────
        var status = 0;
        if (/(?:ended|finished|cancelled)/i.test(html))        status = 2;
        else if (/(?:ongoing|continuing|returning series)/i.test(html)) status = 1;

        // ── Cast (name, role, TMDB image) ─────────────────────────────────────
        var castNames  = [];
        var castImages = [];
        var castRe = /<div class="cast-card">[\s\S]*?<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[\s\S]*?<div class="cast-name">([\s\S]*?)<\/div>[\s\S]*?<div class="cast-role">([\s\S]*?)<\/div>/gi;
        var cm;
        while ((cm = castRe.exec(html)) !== null && castNames.length < 15) {
            var castImg  = cm[1];
            var castName = this._decode(cm[3].replace(/<[^>]+>/g, ""));
            var castRole = this._decode(cm[4].replace(/<[^>]+>/g, ""));
            if (!castName) continue;
            castImages.push(castImg);
            castNames.push(castName + (castRole ? " (" + castRole + ")" : ""));
        }

        // Cast photos embedded as gallery for visual display in detail tab
        var galleryStr = castImages.length > 0
            ? "\n__GALLERY__:" + castImages.join("||")
            : "";
        var fullDesc = overview + galleryStr;

        // ── Seasons + Episodes ────────────────────────────────────────────────
        // Season cards contain: season number + episode count
        // Pattern: href="/tv/{slug}/season-N" … <div class="season-eps">X Eps</div>
        var chapters = [];
        var seasonCardRe = /href="(\/tv\/[^"]+\/season-(\d+))"[\s\S]*?<div class="season-eps">(\d+)\s*Eps?<\/div>/gi;
        var sm;
        while ((sm = seasonCardRe.exec(html)) !== null) {
            var seasonNum = parseInt(sm[2], 10);
            var epCount   = parseInt(sm[3], 10);
            for (var ep = 1; ep <= epCount; ep++) {
                chapters.push({
                    name: "Season " + seasonNum + " — Ep. " + ep,
                    url:  this.baseUrl + "/tv/watch/" + slug
                          + "/season-" + seasonNum + "/episode-" + ep + "/",
                    dateUpload: "",
                    description: "S" + String(seasonNum).padStart(2, "0") + "E" + String(ep).padStart(2, "0"),
                    scanlator: "EN"
                });
            }
        }

        // Fallback A: if no season cards, scrape the season-1 page for episode links
        if (chapters.length === 0) {
            try {
                var s1R = await new Client().get(
                    baseSeriesUrl + "/season-1",
                    { headers: this._hdrs(baseSeriesUrl) }
                );
                var epRe = /href="\/tv\/watch\/[^"]+\/season-1\/episode-(\d+)\/?"/gi;
                var em;
                var maxEp = 0;
                while ((em = epRe.exec(s1R.body || "")) !== null) {
                    var n = parseInt(em[1], 10);
                    if (n > maxEp) maxEp = n;
                }
                for (var ep2 = 1; ep2 <= (maxEp || 1); ep2++) {
                    chapters.push({
                        name: "Season 1 — Ep. " + ep2,
                        url:  this.baseUrl + "/tv/watch/" + slug
                              + "/season-1/episode-" + ep2 + "/",
                        dateUpload: "",
                        description: "S01E" + String(ep2).padStart(2, "0"),
                        scanlator: "EN"
                    });
                }
            } catch (_) {}
        }

        // Fallback B: hard minimum — push episode 1 of season 1
        if (chapters.length === 0) {
            chapters.push({
                name: "Season 1 — Ep. 1",
                url:  this.baseUrl + "/tv/watch/" + slug + "/season-1/episode-1/",
                dateUpload: "",
                description: "S01E01",
                scanlator: "EN"
            });
        }

        return {
            name:        title,
            imageUrl:    image,
            description: fullDesc,
            genres:      genres,
            status:      status,
            author:      "",
            artist:      castNames.join(", "),
            rating:      rating,
            chapters:    chapters
        };
    }

    // ── Video List ────────────────────────────────────────────────────────────

    async getVideoList(url) {
        // URL: /tv/watch/{tmdbId}-{slug}/season-{s}/episode-{e}/
        var pathM = /\/tv\/watch\/([^\/]+)\/season-(\d+)\/episode-(\d+)/.exec(url);
        if (!pathM) return [];

        var slug    = pathM[1];
        var season  = pathM[2];
        var episode = pathM[3];
        var tmdbId  = this._tmdbId(slug);
        if (!tmdbId) return [];

        var videos = [];
        var pref = "auto";
        try { pref = new SharedPreferences().get("server_preference") || "auto"; } catch (_) {}

        // Sources d'embed disponibles, dans l'ordre de préférence
        var sources = [
            { id: "vidbox",    label: "VidBox",    build: function() {
                return "https://vidbox.casa/player.php?play=https://vidsrc-embed.ru/embed/tv?tmdb=" + tmdbId + "&season=" + season + "&episode=" + episode;
            }},
            { id: "vidsrc",    label: "VidSrc",    build: function() {
                return "https://vidsrc.to/embed/tv/" + tmdbId + "/" + season + "/" + episode;
            }},
            { id: "vidsrc.me", label: "VidSrc.me", build: function() {
                return "https://vidsrc.me/embed/tv?tmdb=" + tmdbId + "&season=" + season + "&episode=" + episode;
            }},
            { id: "2embed",    label: "2Embed",    build: function() {
                return "https://www.2embed.cc/embedtv/" + tmdbId + "&s=" + season + "&e=" + episode;
            }}
        ];

        // Réordonne selon la préférence utilisateur : le serveur choisi passe en premier
        if (pref !== "auto") {
            for (var si = 0; si < sources.length; si++) {
                if (sources[si].id === pref) {
                    var picked = sources.splice(si, 1)[0];
                    sources.unshift(picked);
                    break;
                }
            }
        }

        for (var sri = 0; sri < sources.length; sri++) {
            if (videos.length > 0) break;
            await this._resolveVideoUrl(sources[sri].build(), "EN", videos, sources[sri].label);
        }

        return videos;
    }

    // ── Video resolution (iframe chain → m3u8 / mp4 / embed) ─────────────────

    async _resolveVideoUrl(src, lang, videos, label, depth) {
        if (!src || (depth || 0) > 3) return;
        try {
            var r = await new Client().get(src, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
                    "Referer": this.baseUrl + "/",
                    "Accept": "text/html,application/xhtml+xml,*/*"
                }
            });
            var body = r.body || "";

            // m3u8 stream
            var m3u8 = /"(?:file|src|url|source)"\s*:\s*"(https?:\\?\/\\?\/[^"]{10,500}\.m3u8[^"]*)"/i.exec(body)
                    || /src:\s*['`"](https?:[^'`"]{10,500}\.m3u8[^'`"]*)/i.exec(body)
                    || /(https?:\/\/[^"'\s<>]{10,500}\.m3u8(?:\?[^"'\s<>]*)?)/.exec(body);
            if (m3u8) {
                videos.push({
                    quality: label, url: m3u8[1].replace(/\\\//g, "/"),
                    originalUrl: m3u8[1].replace(/\\\//g, "/"),
                    isM3U8: true, headers: { "Referer": src }
                });
                return;
            }

            // mp4 stream
            var mp4 = /"(?:file|src|url)"\s*:\s*"(https?:\\?\/\\?\/[^"]{10,500}\.mp4[^"]*)"/i.exec(body)
                   || /(https?:\/\/[^"'\s<>]{10,500}\.mp4(?:\?[^"'\s<>]*)?)/.exec(body);
            if (mp4) {
                videos.push({
                    quality: label, url: mp4[1].replace(/\\\//g, "/"),
                    originalUrl: mp4[1].replace(/\\\//g, "/"),
                    isM3U8: false, headers: { "Referer": src }
                });
                return;
            }

            // Inline JSON stream config
            var jm = /"(?:file|stream|hls)"\s*:\s*"(https?:\\?\/\\?\/[^"]{10,400})"/i.exec(body);
            if (jm) {
                var fu = jm[1].replace(/\\\//g, "/");
                videos.push({
                    quality: label, url: fu, originalUrl: fu,
                    isM3U8: fu.indexOf(".m3u8") !== -1, headers: { "Referer": src }
                });
                return;
            }

            // Nested iframe — follow one level deeper
            var ifrM = /<iframe[^>]+src="(https?:\/\/[^"]{10,400})"/i.exec(body)
                    || /src:\s*['"](\s*https?:\/\/[^'"]{10,400})['"]/i.exec(body);
            if (ifrM && ifrM[1].trim() !== src) {
                await this._resolveVideoUrl(ifrM[1].trim(), lang, videos, label, (depth || 0) + 1);
                return;
            }
        } catch (_) {}

        // Last resort: push embed URL for WebView playback
        videos.push({ quality: label, url: src, originalUrl: src, isM3U8: false });
    }

    getSourcePreferences() {
        return [
            {
                key: "server_preference",
                listPreference: {
                    title: "Serveur prioritaire",
                    summary: "Le serveur d'embed chargé en premier. Les autres sont essayés en secours si celui-ci échoue.",
                    valueIndex: 0,
                    entries: ["Auto (ordre par défaut)", "VidBox (natif du site)", "VidSrc", "VidSrc.me", "2Embed"],
                    entryValues: ["auto", "vidbox", "vidsrc", "vidsrc.me", "2embed"]
                }
            }
        ];
    }
}
