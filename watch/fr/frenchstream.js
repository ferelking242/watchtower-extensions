const watchtowerSources = [{
    "name": "French-Stream",
    "langs": ["fr"],
    "ids": { "fr": 112837465 },
    "baseUrl": "https://french-stream.one",
    "apiUrl": "https://french-stream.one",
    "iconUrl": "https://raw.githubusercontent.com/ferelking242/Watchtower-extensions/main/extensions/watch/icon/fr.frenchstream.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "0.3.1",
    "pkgPath": "watch/fr/frenchstream.js",
    "editableBaseUrl": true,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "VF", "VOSTFR", "VO"],
    "contentSubtype": ["film", "serie"]
}];

class DefaultExtension extends MProvider {
    constructor() { super(); this.client = new Client(); }

    get baseUrl() {
        const p = this.source.prefs
            ? this.source.prefs.find(function(x) { return x.key === "base_url"; })
            : null;
        return (p && p.value) ? p.value.replace(/\/$/, "") : this.source.baseUrl.replace(/\/$/, "");
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
        var blockRe = /<a[^>]+class="short-poster[^"]*"([^>]*)>([\s\S]*?)<\/a>/gi;
        var bm;
        while ((bm = blockRe.exec(html)) !== null) {
            var attrs = bm[1];
            var inner = bm[2];
            var hrefM = /href="([^"]+newsid=\d+[^"]*)"/.exec(attrs);
            var altM  = /alt="([^"]*)"/.exec(attrs);
            var imgM  = /<img[^>]+src="([^"]+)"/i.exec(inner);
            if (!hrefM) continue;
            var href  = hrefM[1].charAt(0) === "/" ? this.baseUrl + hrefM[1] : hrefM[1];
            var title = altM ? altM[1].trim() : "";
            var image = imgM ? imgM[1] : "";
            if (title) items.push({ name: title, link: href, imageUrl: image });
        }
        return items;
    }

    async getPopular(page) {
        var url = this.baseUrl + "/films/?page=" + page;
        var r   = await this.client.get(url, { headers: this._hdrs() });
        var items = this._parseItems(r.body);
        return { list: items, hasNextPage: items.length >= 10 };
    }

    async getLatest(page) {
        var url = page <= 1
            ? this.baseUrl + "/"
            : this.baseUrl + "/page/" + page + "/";
        var r     = await this.client.get(url, { headers: this._hdrs() });
        var items = this._parseItems(r.body);
        return { list: items, hasNextPage: items.length >= 10 };
    }

    async getSearch(query, page) {
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

    async getDetail(url) {
        var r    = await this.client.get(url, { headers: this._hdrs() });
        var html = r.body;

        var newsId   = this._getParam(url, "newsid") || "";
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

        if (!isSerie) {
            return {
                name: title,
                imageUrl: image,
                description: desc,
                genre: genres.join(", "),
                year: year,
                episodes: [{
                    name: title || "Regarder",
                    url: url,
                    description: [runtime, year].filter(Boolean).join(" — ")
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

        var episodes = [];

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
                        episodes.push({
                            name: sName + " — Ep. " + n,
                            url:  this.baseUrl + "/index.php?newsid=" + season.id + "&_fs_ep=" + n,
                            description: "Épisode " + n
                        });
                    }
                }
            } catch (_) {}
        }

        return {
            name: title,
            imageUrl: image,
            description: desc,
            genre: genres.join(", "),
            year: year,
            episodes: episodes
        };
    }

    async getVideoList(url) {
        var newsId = this._getParam(url, "newsid");
        var epNum  = this._getParam(url, "_fs_ep");

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
                        epData = JSON.parse(r.body);
                        break;
                    }
                } catch (_) {}
            }
            if (epData) this._extractEpVideos(epData, epNum, videos);
        } else {
            try {
                var fr = await this.client.get(
                    this.baseUrl + "/engine/ajax/film_api.php?id=" + newsId,
                    { headers: this._ajaxHdrs(url) }
                );
                var api = JSON.parse(fr.body);
                if (api && api.players) this._extractFilmVideos(api.players, videos);
            } catch (_) {}
        }

        return videos;
    }

    _extractFilmVideos(p, videos) {
        var PROVIDERS = [
            ["vidzy",   "ViDZY"],
            ["uqload",  "Uqload"],
            ["dood",    "Dood"],
            ["voe",     "Voe"],
            ["filmoon", "Filmoon"],
            ["premium", "Premium"]
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
                var lk = LANGS[j][0];
                var ll = LANGS[j][1];
                var src = p[key][lk];
                if (src) videos.push({ quality: label + " " + ll, url: src, originalUrl: src, isM3U8: false });
            }
        }

        if (p.netu) {
            for (var j = 0; j < LANGS.length; j++) {
                var lk  = LANGS[j][0];
                var ll  = LANGS[j][1];
                var id  = p.netu[lk];
                if (id) {
                    var src = "https://1.multiup.us/player/embed_player.php?vid=" + id + "&autoplay=no";
                    videos.push({ quality: "Netu " + ll, url: src, originalUrl: src, isM3U8: false });
                }
            }
        }
    }

    _extractEpVideos(epData, epNum, videos) {
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
                videos.push({ quality: pLabel + " " + langLabel, url: src, originalUrl: src, isM3U8: false });
            }
        }
    }
}
