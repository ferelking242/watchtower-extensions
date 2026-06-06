// ─────────────────────────────────────────────────────────────────────────────
// French-Stream — extension Watchtower v0.4.5
//
// Ce fichier est le seul point d'entrée de l'extension.
// Il exporte `watchtowerSources` (métadonnées) et la classe `DefaultExtension`
// qui implémente l'API MProvider attendue par le moteur Watchtower.
//
// Méthodes fournies :
//   getPopular(page)         → films populaires (page browsing)
//   getLatestUpdates(page)   → dernières sorties
//   search(query, page)      → recherche textuelle
//   getDetail(url)           → fiche détail (titre, poster, épisodes…)
//   getVideoList(url)        → liste des liens vidéo pour un épisode/film
//   getForYou(page)          → contenu « Pour vous » (alias getPopular pour l'instant)
//   getComments(url, page)   → commentaires (non supporté → tableau vide)
//
// Champs `watchtowerSources` :
//   supportsForYou     → true  : l'onglet « Pour vous » est activé
//   supportsComments   → false : l'onglet « Commentaires » reste vide
//   subCategories      → sous-catégories disponibles dans cette source
//                         (remplace l'ancien champ contentSubtype)
// ─────────────────────────────────────────────────────────────────────────────

const watchtowerSources = [{
    "name": "French-Stream",
    "langs": ["fr"],
    "ids": { "fr": 112837465 },
    "baseUrl": "https://french-stream.one",
    "apiUrl": "https://french-stream.one",
    "iconUrl": "https://raw.githubusercontent.com/ferelking242/Watchtower-extensions/main/extensions/watch/icon/fr.frenchstream.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "0.4.5",
    "pkgPath": "watch/fr/frenchstream.js",
    "editableBaseUrl": true,
    "customUserAgent": "",
    // Langues/pistes audio disponibles sur French-Stream
    "videoQualities": ["AUTO", "VF", "VOSTFR", "VO", "VFQ"],
    // Sous-catégories de contenu (renommé depuis contentSubtype)
    "subCategories": ["film", "serie"],
    // Fonctionnalités optionnelles exposées par cette extension
    "supportsForYou": true,
    "supportsComments": true,
    "prefs": [
        {
            "key": "username",
            "type": "text",
            "label": "Nom d'utilisateur",
            "value": "",
            "hint": "Votre identifiant French-Stream"
        },
        {
            "key": "password",
            "type": "password",
            "label": "Mot de passe",
            "value": "",
            "hint": "Votre mot de passe French-Stream"
        }
    ]
}];

class DefaultExtension extends MProvider {
    constructor() { super(); this.client = new Client(); }

    get baseUrl() {
        const p = this.source.prefs
            ? this.source.prefs.find(function(x) { return x.key === "base_url"; })
            : null;
        return (p && p.value) ? p.value.replace(/\/$/, "") : this.source.baseUrl.replace(/\/$/, "");
    }

    _getPref(key) {
        const p = this.source.prefs
            ? this.source.prefs.find(function(x) { return x.key === key; })
            : null;
        return (p && p.value) ? p.value : null;
    }

    async _ensureLogin() {
        var username = this._getPref("username");
        var password = this._getPref("password");
        if (!username || !password) return;
        try {
            await this.client.post(
                this.baseUrl + "/index.php?do=login",
                {
                    headers: Object.assign({}, this._hdrs(), {
                        "Content-Type": "application/x-www-form-urlencoded"
                    }),
                    body: "login_name=" + encodeURIComponent(username) +
                          "&login_password=" + encodeURIComponent(password) +
                          "&login_submit=1&action=login"
                }
            );
        } catch (_) {}
    }

    _hdrs(ref) {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": ref || (this.baseUrl + "/"),
            "Accept-Language": "fr-FR,fr;q=0.9"
        };
    }

    _ajaxHdrs(ref) {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": ref || (this.baseUrl + "/"),
            "Accept-Language": "fr-FR,fr;q=0.9",
            "X-Requested-With": "XMLHttpRequest",
            "Accept": "application/json, text/javascript, */*"
        };
    }

    _getParam(url, key) {
        var re = new RegExp("[?&]" + key + "=([^&]+)");
        var m  = re.exec(url);
        return m ? decodeURIComponent(m[1]) : null;
    }

    _parseItems(html) {
        var items   = [];

        // Strategy 1: classic short-poster links (original FS layout)
        var blockRe = /<a[^>]+class="short-poster[^"]*"([^>]*)>([\s\S]*?)<\/a>/gi;
        var bm;
        while ((bm = blockRe.exec(html)) !== null) {
            var attrs = bm[1];
            var inner = bm[2];
            // Accept newsid= param OR any numeric-id segment in the href
            var hrefM = /href="([^"]+newsid=\d+[^"]*)"/.exec(attrs)
                     || /href="(https?:\/\/[^"]+\/\d{4,}[\/"][^"]*)"/.exec(attrs)
                     || /href="([^"]+\/[^"]+\?[^"]*newsid[^"]*)"/.exec(attrs);
            var altM  = /alt="([^"]*)"/.exec(attrs);
            var imgM  = /<img[^>]+src="([^"]+)"/i.exec(inner);
            if (!hrefM) continue;
            var href  = hrefM[1].charAt(0) === "/" ? this.baseUrl + hrefM[1] : hrefM[1];
            var title = altM ? altM[1].trim() : "";
            var image = imgM ? imgM[1] : "";
            if (title) items.push({ name: title, link: href, imageUrl: image });
        }

        // Strategy 2: generic card/poster links as fallback if nothing found
        if (items.length === 0) {
            var re2 = /<a[^>]+href="([^"]+newsid=\d+[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
            var m2;
            while ((m2 = re2.exec(html)) !== null) {
                var href2 = m2[1].charAt(0) === "/" ? this.baseUrl + m2[1] : m2[1];
                var inner2 = m2[2];
                var title2M = /(?:alt|title)="([^"]{2,})"/i.exec(m2[0]);
                var img2M   = /<img[^>]+src="([^"]+)"/i.exec(inner2);
                var title2  = title2M ? title2M[1].trim() : "";
                if (title2) items.push({ name: title2, link: href2, imageUrl: img2M ? img2M[1] : "" });
            }
        }

        return items;
    }

    // Extract newsId from URL params or from page HTML
    _extractNewsId(url, html) {
        var fromUrl = this._getParam(url, "newsid");
        if (fromUrl) return fromUrl;
        // Try to find newsid in the page source (embedded in JS/data attributes)
        var m = /(?:newsid|news_id)[='":\s]+(\d{3,})/i.exec(html || "");
        if (m) return m[1];
        // Try a numeric segment in the URL path (e.g. /12345/ or -12345-)
        var mPath = /[\/\-](\d{4,})[\/\-\.?]/.exec(url);
        if (mPath) return mPath[1];
        return null;
    }

    // FIX Bug 1: use /films/page/X/ instead of /films/?page=X
    // which always returned the same content on every page
    async getPopular(page) {
        var url = this.baseUrl + "/films/page/" + page + "/";
        var r   = await this.client.get(url, { headers: this._hdrs() });
        var items = this._parseItems(r.body);
        return { list: items, hasNextPage: items.length >= 10 };
    }

    // FIX Bug 2a: renamed from getLatest → getLatestUpdates
    // Engine calls getLatestUpdates(); getLatest() was never called
    async getLatestUpdates(page) {
        var url = page <= 1
            ? this.baseUrl + "/"
            : this.baseUrl + "/page/" + page + "/";
        var r     = await this.client.get(url, { headers: this._hdrs() });
        var items = this._parseItems(r.body);
        return { list: items, hasNextPage: items.length >= 10 };
    }

    // FIX Bug 2b: renamed from getSearch(query, page) → search(query, page, filters)
    // Engine calls search(); getSearch() was never called → "search not implemented" error
    async search(query, page, filters) {
        var from = (page - 1) * 20 + 1;
        var url  = this.baseUrl
            + "/?do=search&subaction=search&story="
            + encodeURIComponent(query)
            + "&search_start=" + (page - 1)
            + "&full_search=0&result_from=" + from;
        var r     = await this.client.get(url, { headers: this._hdrs() });
        var items = this._parseItems(r.body);
        return { list: items, hasNextPage: items.length >= 10 };
    }

    // ─── getForYou ───────────────────────────────────────────────────────────
    // Appelé par l'onglet « Pour vous » dans Watchtower.
    // French-Stream n'a pas de fil personnalisé côté serveur, on retourne donc
    // les films populaires comme contenu de découverte.
    // Retourne un objet MPages : { list: MManga[], hasNextPage: bool }
    async getForYou(page) {
        // Déléguer à getPopular — même endpoint, même parsing.
        // Une future version pourrait utiliser les préférences utilisateur
        // (genre, langue VF/VOSTFR) pour filtrer le résultat.
        return this.getPopular(page);
    }

    // ─── getComments ─────────────────────────────────────────────────────────
    // Appelé par l'onglet « Commentaires » dans Watchtower.
    // Tente l'endpoint AJAX EngineScript ; retourne liste vide si indisponible.
    // Retourne : { list: MComment[], hasNextPage: bool }
    async getComments(url, page) {
        var newsId = this._getParam(url, "newsid");
        if (!newsId) {
            try {
                var pr = await this.client.get(url, { headers: this._hdrs() });
                newsId = this._extractNewsId(url, pr.body);
            } catch (_) {}
        }
        if (!newsId) return { list: [], hasNextPage: false };

        var endpoints = [
            "/engine/ajax/getcomments.php?news_id=" + newsId + "&page=" + page,
            "/engine/ajax/comments.php?id=" + newsId + "&p=" + page,
            "/comments/" + newsId + "/?page=" + page
        ];
        for (var ei = 0; ei < endpoints.length; ei++) {
            try {
                var r = await this.client.get(
                    this.baseUrl + endpoints[ei],
                    { headers: this._ajaxHdrs(url) }
                );
                if (!r.body || r.body.length < 5) continue;
                var data = JSON.parse(r.body);
                var cmtList = Array.isArray(data) ? data
                    : (data.comments || data.list || data.data || []);
                if (!Array.isArray(cmtList) || cmtList.length === 0) continue;
                var items = [];
                for (var i = 0; i < cmtList.length; i++) {
                    var c = cmtList[i];
                    items.push({
                        id:        String(c.id || c.comment_id || i),
                        username:  c.name || c.author || c.user || "Anonyme",
                        avatarUrl: c.avatar || c.avatar_url || "",
                        content:   c.text || c.message || c.comment || c.body || "",
                        timestamp: c.date || c.created_at || "",
                        score:     Number(c.likes || c.score || 0)
                    });
                }
                return { list: items, hasNextPage: cmtList.length >= 20 };
            } catch (_) {}
        }
        return { list: [], hasNextPage: false };
    }

    // ─── _parseJsonOrJs ───────────────────────────────────────────────────────
    // Parse a string that may be raw JSON or a JS assignment like:
    //   var epData = {...};   or   window.x = [...];
    // Returns parsed object/array or null on failure.
    _parseJsonOrJs(str) {
        if (!str || str.length < 3) return null;
        str = str.trim();
        // Check it doesn't look like an HTML error page
        if (str.charAt(0) === '<') return null;
        // Try raw JSON first
        try { return JSON.parse(str); } catch (_) {}
        // Strip JS assignment prefix: var xxx =  /  let xxx =  /  window.xxx =
        try {
            var s = str
                .replace(/^(?:var|let|const)\s+\w+\s*=\s*/, '')
                .replace(/^window\.\w+\s*=\s*/, '')
                .replace(/;?\s*$/, '');
            return JSON.parse(s);
        } catch (_) {}
        return null;
    }

    async getDetail(url) {
        await this._ensureLogin();
        var r    = await this.client.get(url, { headers: this._hdrs() });
        var html = r.body;

        var newsId   = this._extractNewsId(url, html) || "";
        var isSerie  = html.indexOf('id="serie-data"') !== -1;

        var titleM   = /data-title="([^"]+)"/.exec(html);
        var title    = titleM ? titleM[1].trim() : "";

        var imgM     = /data-affiche="([^"]+)"/.exec(html);
        var image    = imgM ? imgM[1] : "";

        var genresM  = /<span class="genres">([\s\S]*?)<\/span>/i.exec(html);
        var genres   = genresM
            ? genresM[1].replace(/<[^>]+>/g, "").split(",").map(function(g) { return g.trim(); }).filter(Boolean)
            : [];

        var yearM    = /xfname=date-de-sortie[^>]+>(\d{4})</.exec(html);
        var year     = yearM ? yearM[1] : "";

        var rtM      = /<span class="runtime">[^\d]*(\d[^<]*)/i.exec(html);
        var runtime  = rtM ? rtM[1].trim() : "";

        var descM    = /class="desc-text"[^>]*>([\s\S]*?)<\/p>/i.exec(html)
                    || /<div[^>]+fdesc[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i.exec(html);
        var desc     = descM ? descM[1].replace(/<[^>]+>/g, "").trim() : "";

        var ratingM  = /itemprop="ratingValue"[^>]*>([0-9.,]+)</.exec(html)
                    || /<span[^>]+class="[^"]*(?:rating|note|score)[^"]*"[^>]*>\s*([0-9][0-9.,]*)\s*</.exec(html)
                    || /data-rating="([0-9.,]+)"/.exec(html);
        var rating   = ratingM ? ratingM[1].trim() : "";

        var castM    = /(?:Acteurs?|Casting|Cast)\s*:[^<]*<[^>]+>([\s\S]*?)<\/(?:p|div|span)>/i.exec(html);
        var cast     = castM ? castM[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";

        // ── Galerie d'images (aperçus / screenshots) ──────────────────────
        var galleryImgs = [];
        // Bloc gallery explicite
        var gBlockM = /<div[^>]+class="[^"]*(?:screens|screenshots|gallery|preview)[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
        if (gBlockM) {
            var gImgRe = /<img[^>]+(?:data-src|src)="([^"]+)"[^>]*/gi;
            var gim;
            while ((gim = gImgRe.exec(gBlockM[1])) !== null) {
                var gu = gim[1].trim();
                if (gu.startsWith("http") && !/pixel|1x1|transparent|blank|icon|logo/i.test(gu)) {
                    galleryImgs.push(gu);
                }
            }
        }
        // Attribut data-screenshots ou data-images
        if (galleryImgs.length === 0) {
            var dsM = /data-screenshots="([^"]+)"/.exec(html) || /data-images="([^"]+)"/.exec(html);
            if (dsM) {
                dsM[1].split(/[,|]/).forEach(function(u) {
                    var t = u.trim(); if (t.startsWith("http")) galleryImgs.push(t);
                });
            }
        }
        var fullDesc = galleryImgs.length > 0
            ? desc + "\n__GALLERY__:" + galleryImgs.slice(0, 10).join("||")
            : desc;

        var metaLine = [runtime, year].filter(Boolean).join(" — ");
        if (rating) metaLine = metaLine ? metaLine + " · ★ " + rating : "★ " + rating;

        if (!isSerie) {
            return {
                name: title,
                imageUrl: image,
                description: fullDesc,
                genres: genres,
                status: 4,
                author: year,
                artist: cast,
                rating: rating,
                chapters: [{
                    name: title || "Regarder",
                    url: url,
                    dateUpload: "",
                    description: metaLine,
                    scanlator: "VF / VOSTFR"
                }]
            };
        }

        var tagz   = "";
        var tagzM  = /data-tagz="([^"]+)"/.exec(html);
        if (tagzM) {
            tagz = tagzM[1];
        } else if (newsId) {
            try {
                var apiR = await this.client.get(
                    this.baseUrl + "/engine/ajax/film_api.php?id=" + newsId,
                    { headers: this._ajaxHdrs(url) }
                );
                var api = JSON.parse(apiR.body);
                tagz = (api && api.meta && api.meta.tagz) ? api.meta.tagz : "";
            } catch (_) {}
        }

        var chapters = [];

        if (tagz) {
            try {
                var seasonsR = await this.client.get(
                    this.baseUrl + "/engine/ajax/get_seasons.php?serie_tag=" + encodeURIComponent(tagz),
                    { headers: this._ajaxHdrs(url) }
                );
                var seasons = JSON.parse(seasonsR.body);

                for (var si = 0; si < seasons.length; si++) {
                    var season = seasons[si];
                    var v      = Math.floor(Date.now() / 30000);
                    var epData = null;

                    var paths = [
                        "/static/series/" + season.id + ".js?v=" + v,
                        "/data/eps_" + season.id + ".txt?v=" + v,
                        "/ep-data.php?id=" + season.id + "&format=js&v=" + v
                    ];
                    for (var pi = 0; pi < paths.length; pi++) {
                        try {
                            var epR = await this.client.get(
                                this.baseUrl + paths[pi],
                                { headers: this._hdrs(url) }
                            );
                            if (epR.body && epR.body.length > 5) {
                                epData = JSON.parse(epR.body);
                                break;
                            }
                        } catch (_) {}
                    }

                    if (!epData) continue;

                    var numSet = {};
                    var langs  = ["vf", "vostfr", "vo"];
                    for (var li = 0; li < langs.length; li++) {
                        var langData = epData[langs[li]];
                        if (!langData) continue;
                        var keys = Object.keys(langData);
                        for (var ki = 0; ki < keys.length; ki++) numSet[keys[ki]] = true;
                    }

                    var nums = Object.keys(numSet)
                        .map(function(k) { return parseInt(k, 10); })
                        .filter(function(n) { return !isNaN(n); })
                        .sort(function(a, b) { return a - b; });

                    var sLabel = /\bSaison\s*\d+.*/i.exec(season.title);
                    var sName  = sLabel ? sLabel[0].trim() : season.title;

                    for (var ni = 0; ni < nums.length; ni++) {
                        var n = nums[ni];
                        var epLangs = [];
                        for (var li = 0; li < langs.length; li++) {
                            var ld = epData[langs[li]];
                            if (ld && (ld[n] || ld[String(n)])) {
                                epLangs.push(langs[li].toUpperCase());
                            }
                        }
                        chapters.push({
                            name: sName + " — Ep. " + n,
                            url:  this.baseUrl + "/index.php?newsid=" + season.id + "&_fs_ep=" + n,
                            dateUpload: "",
                            description: "Épisode " + n,
                            scanlator: epLangs.join(" / ") || "VF / VOSTFR"
                        });
                    }
                }
            } catch (_) {}
        }

        if (chapters.length === 0) {
            chapters.push({ name: title || "Regarder", url: url, dateUpload: "" });
        }

        return {
            name: title,
            imageUrl: image,
            description: fullDesc,
            genres: genres,
            status: 0,
            author: year,
            artist: cast,
            rating: rating,
            chapters: chapters
        };
    }

    async getVideoList(url) {
        var epNum  = this._getParam(url, "_fs_ep");

        // Get newsId from URL param, or from page HTML if not in URL
        var newsId = this._getParam(url, "newsid");
        if (!newsId && epNum === null) {
            // Film: fetch the page to extract newsId
            try {
                var pr = await this.client.get(url, { headers: this._hdrs() });
                newsId = this._extractNewsId(url, pr.body);
            } catch (_) {}
        }

        if (!newsId) return [];

        var videos = [];

        if (epNum !== null) {
            var v     = Math.floor(Date.now() / 30000);
            var epData = null;
            var paths = [
                "/static/series/" + newsId + ".js?v=" + v,
                "/data/eps_" + newsId + ".txt?v=" + v,
                "/ep-data.php?id=" + newsId + "&format=js&v=" + v
            ];
            for (var pi = 0; pi < paths.length; pi++) {
                try {
                    var r = await this.client.get(
                        this.baseUrl + paths[pi],
                        { headers: this._hdrs(url) }
                    );
                    if (r.body && r.body.length > 5) {
                        epData = this._parseJsonOrJs(r.body);
                        if (epData) break;
                    }
                } catch (_) {}
            }
            if (epData) await this._extractEpVideos(epData, epNum, videos, url);
            // Fallback : scrape la page de l'épisode pour les iframes vidéo
            if (videos.length === 0) {
                try {
                    var pageR = await this.client.get(url, { headers: this._hdrs(url) });
                    var pageBody = pageR.body || "";
                    var iRe = /(?:data-src|src)\s*=\s*["'](https?:\/\/[^"']{10,400})["']/g;
                    var im;
                    while ((im = iRe.exec(pageBody)) !== null) {
                        var src = im[1];
                        if (/fsvid|vidzy|uqload|dood|voe\.sx|filmoon|netu|multiup|embed|player|iframe/i.test(src)) {
                            await this._resolveVideoUrl(src, "AUTO", videos, "Lecteur");
                        }
                    }
                    // Essai via film_api si aucun lecteur trouvé directement
                    if (videos.length === 0) {
                        var apiIdM = /film_api\.php\?id=(\d+)/.exec(pageBody)
                                  || /["']news_id["']\s*:\s*["']?(\d+)/.exec(pageBody);
                        if (apiIdM) {
                            try {
                                var apiR2 = await this.client.get(
                                    this.baseUrl + "/engine/ajax/film_api.php?id=" + apiIdM[1],
                                    { headers: this._ajaxHdrs(url) }
                                );
                                if (apiR2.body && apiR2.body.length > 5) {
                                    var api2 = JSON.parse(apiR2.body);
                                    if (api2 && api2.players) await this._extractFilmVideos(api2.players, videos, url);
                                }
                            } catch (_) {}
                        }
                    }
                    // Dernier recours : JSON inline dans la page
                    if (videos.length === 0) {
                        var jsonRe2 = /"(?:file|src|url)"\s*:\s*"(https?:\\?\/\\?\/[^"]{10,300})"/g;
                        var jm2;
                        while ((jm2 = jsonRe2.exec(pageBody)) !== null) {
                            var ru = jm2[1].replace(/\\\//g, "/");
                            if (/\.m3u8|\.mp4/i.test(ru)) {
                                videos.push({ quality: "AUTO", url: ru, originalUrl: ru,
                                    isM3U8: ru.indexOf(".m3u8") !== -1,
                                    headers: { "Referer": url } });
                            }
                        }
                    }
                } catch (_) {}
            }
        } else {
            // Strategy 1: JSON API
            try {
                var fr = await this.client.get(
                    this.baseUrl + "/engine/ajax/film_api.php?id=" + newsId,
                    { headers: this._ajaxHdrs(url) }
                );
                if (fr.body && fr.body.length > 5) {
                    var api = JSON.parse(fr.body);
                    if (api && api.players) await this._extractFilmVideos(api.players, videos, url);
                }
            } catch (_) {}

            // Strategy 2: scrape the film detail page directly for player iframes
            if (videos.length === 0) {
                try {
                    var pageR = await this.client.get(url, { headers: this._hdrs(url) });
                    var pageBody = pageR.body || "";
                    // Extract all iframe/source src URLs that look like video players
                    var iRe = /(?:data-src|src)\s*=\s*["'](https?:\/\/[^"']{10,400})["']/g;
                    var im;
                    while ((im = iRe.exec(pageBody)) !== null) {
                        var src = im[1];
                        if (/fsvid|vidzy|uqload|dood|voe\.sx|filmoon|netu|multiup|embed|player/i.test(src)) {
                            await this._resolveVideoUrl(src, "AUTO", videos, "Player");
                        }
                    }
                    // Also try JSON blobs embedded in the page (some sites inline player data)
                    if (videos.length === 0) {
                        var jsonRe = /"(?:file|src|url)"\s*:\s*"(https?:\\?\/\\?\/[^"]{10,300})"/g;
                        var jm;
                        while ((jm = jsonRe.exec(pageBody)) !== null) {
                            var rawUrl = jm[1].replace(/\\\//g, "/");
                            if (/\.m3u8|\.mp4/i.test(rawUrl)) {
                                videos.push({ quality: "AUTO", url: rawUrl, originalUrl: rawUrl,
                                    isM3U8: rawUrl.indexOf(".m3u8") !== -1,
                                    headers: { "Referer": url } });
                            }
                        }
                    }
                } catch (_) {}
            }
        }

        return videos;
    }

    async _resolveVideoUrl(embedUrl, quality, videos, label) {
        if (!embedUrl) return;
        var url = embedUrl;

        // Fetch the embed page
        var body = "";
        try {
            var r = await this.client.get(url, { headers: this._hdrs(url) });
            body = r.body || "";
        } catch (_) {}

        if (body) {
            // 1. Direct m3u8/mp4 in raw HTML
            var m3u8M = /["'`](https?:[^"'`\s]{10,400}\.m3u8[^"'`\s]{0,200})["'`]/.exec(body);
            if (m3u8M) {
                videos.push({ quality: label, url: m3u8M[1], originalUrl: url, isM3U8: true, headers: { "Referer": url } });
                return;
            }
            var mp4M = /["'`](https?:[^"'`\s]{10,400}\.mp4[^"'`\s]{0,200})["'`]/.exec(body);
            if (mp4M) {
                videos.push({ quality: label, url: mp4M[1], originalUrl: url, isM3U8: false, headers: { "Referer": url } });
                return;
            }

            // 2. Unpack eval(function(p,a,c,k,e,d){...}) packed JS and search inside
            try {
                var packerRe = /\(function\(p,a,c,k,e(?:,d)?\)\{[\s\S]+?\.split\('\|'\)\)\)/g;
                var pm;
                while ((pm = packerRe.exec(body)) !== null) {
                    try {
                        var decoded = eval(pm[0]);
                        if (typeof decoded === "string") {
                            var dm = /["'`](https?:[^"'`\s]{10,400}\.m3u8[^"'`\s]{0,200})["'`]/.exec(decoded);
                            if (dm) {
                                videos.push({ quality: label, url: dm[1], originalUrl: url, isM3U8: true, headers: { "Referer": url } });
                                return;
                            }
                            var dp = /["'`](https?:[^"'`\s]{10,400}\.mp4[^"'`\s]{0,200})["'`]/.exec(decoded);
                            if (dp) {
                                videos.push({ quality: label, url: dp[1], originalUrl: url, isM3U8: false, headers: { "Referer": url } });
                                return;
                            }
                        }
                    } catch (_) {}
                }
            } catch (_) {}

            // 3. jwplayer / videojs file/src key
            var srcM = /(?:"file"|"src"|'file'|'src')\s*:\s*["'`](https?:[^"'`\s]{10,300})["'`]/.exec(body);
            if (srcM) {
                var src = srcM[1];
                videos.push({ quality: label, url: src, originalUrl: url, isM3U8: src.indexOf(".m3u8") !== -1, headers: { "Referer": url } });
                return;
            }
        }

        // 4. Fallback: built-in extractors if available
        if (url.indexOf("dood") !== -1 || url.indexOf("doood") !== -1) {
            try {
                var resolved = await doodExtractor(url, quality);
                if (resolved && resolved.url) {
                    videos.push({ quality: label, url: resolved.url, originalUrl: url, isM3U8: resolved.isM3U8 || false, headers: resolved.headers || {} });
                    return;
                }
            } catch (_) {}
        }
        if (url.indexOf("voe") !== -1) {
            try {
                var resolved = await voeExtractor(url, quality);
                if (resolved && resolved.url) {
                    videos.push({ quality: label, url: resolved.url, originalUrl: url, isM3U8: true, headers: resolved.headers || {} });
                    return;
                }
            } catch (_) {}
        }

        // 5. Last resort: return embed URL for WebView
        videos.push({ quality: label, url: url, originalUrl: url, isM3U8: false });
    }

    async _extractFilmVideos(p, videos, refUrl) {
        var PROVIDERS = [
            ["vidzy",   "ViDZY"],
            ["fsvid",   "FsVid"],
            ["fsvideo", "FsVideo"],
            ["uqload",  "Uqload"],
            ["dood",    "Dood"],
            ["voe",     "Voe"],
            ["filmoon", "Filmoon"],
            ["premium", "Premium"],
            ["sibnet",  "Sibnet"],
            ["okru",    "Ok.ru"]
        ];
        var LANGS = [
            ["default", "VF"],
            ["vostfr",  "VOSTFR"],
            ["vfq",     "VFQ"],
            ["vff",     "VFF"]
        ];

        for (var i = 0; i < PROVIDERS.length; i++) {
            var key   = PROVIDERS[i][0];
            var label = PROVIDERS[i][1];
            if (!p[key]) continue;
            for (var j = 0; j < LANGS.length; j++) {
                var lk  = LANGS[j][0];
                var ll  = LANGS[j][1];
                var src = p[key][lk];
                if (src) await this._resolveVideoUrl(src, ll, videos, label + " " + ll);
            }
        }

        if (p.netu) {
            for (var j = 0; j < LANGS.length; j++) {
                var lk  = LANGS[j][0];
                var ll  = LANGS[j][1];
                var id  = p.netu[lk];
                if (id) {
                    var src = "https://1.multiup.us/player/embed_player.php?vid=" + id + "&autoplay=no";
                    await this._resolveVideoUrl(src, ll, videos, "Netu " + ll);
                }
            }
        }
    }

    async _extractEpVideos(epData, epNum, videos, refUrl) {
        var LANGS    = [["vf","VF"],["vostfr","VOSTFR"],["vo","VO"]];
        var PNAMES   = {
            premium: "Premium", vidzy: "ViDZY", uqload: "Uqload",
            netu: "Netu", voe: "Voe", dood: "Dood", filmoon: "Filmoon"
        };

        for (var li = 0; li < LANGS.length; li++) {
            var lang      = LANGS[li][0];
            var langLabel = LANGS[li][1];
            var langData  = epData[lang];
            if (!langData) continue;
            var entry = langData[epNum] || langData[String(parseInt(epNum, 10))];
            if (!entry) continue;
            var providers = Object.keys(entry);
            for (var pi = 0; pi < providers.length; pi++) {
                var provider = providers[pi];
                var val      = entry[provider];
                if (!val) continue;
                var pLabel = PNAMES[provider] || provider;
                var src    = val;
                if (provider === "netu" && val.indexOf("http") !== 0) {
                    src = "https://1.multiup.us/player/embed_player.php?vid=" + val + "&autoplay=no";
                }
                await this._resolveVideoUrl(src, langLabel, videos, pLabel + " " + langLabel);
            }
        }
    }
}
