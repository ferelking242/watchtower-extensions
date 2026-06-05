const watchtowerSources = [{
    "name": "French-Stream",
    "langs": ["fr"],
    "ids": { "fr": 112837465 },
    "baseUrl": "https://french-stream.one",
    "apiUrl": "https://french-stream.one",
    "iconUrl": "https://raw.githubusercontent.com/ferelking242/Watchtower-extensions/main/extensions/watch/icon/fr.frenchstream.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "0.3.0",
    "pkgPath": "watch/fr/frenchstream.js",
    "editableBaseUrl": true,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "VF", "VOSTFR", "VO"],
    "contentSubtype": ["film", "serie"]
}];

class DefaultExtension extends MProvider {
    constructor() { super(); this.client = new Client(); }

    get baseUrl() {
        const p = this.source.prefs?.find(x => x.key === "base_url");
        return (p && p.value) ? p.value.replace(/\/$/, "") : this.source.baseUrl.replace(/\/$/, "");
    }

    _hdrs(ref) {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": ref || (this.baseUrl + "/"),
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8"
        };
    }

    _parseItems(html) {
        const items = [];
        const blockRe = /<a[^>]+class="short-poster[^"]*"([^>]*)>([\s\S]*?)<\/a>/gi;
        let bm;
        while ((bm = blockRe.exec(html)) !== null) {
            const attrs = bm[1];
            const inner = bm[2];
            const hrefM = attrs.match(/href="([^"]+newsid=\d+[^"]*)"/);
            const altM  = attrs.match(/alt="([^"]*)"/);
            const imgM  = inner.match(/<img[^>]+src="([^"]+)"/i);
            if (!hrefM) continue;
            const href  = hrefM[1].startsWith("/") ? this.baseUrl + hrefM[1] : hrefM[1];
            const title = altM?.[1]?.trim() || "";
            const image = imgM?.[1] || "";
            if (title) items.push({ name: title, link: href, imageUrl: image });
        }
        return items;
    }

    async getPopular(page) {
        const url = `${this.baseUrl}/films/?page=${page}`;
        const r = await this.client.get(url, { headers: this._hdrs() });
        const items = this._parseItems(r.body);
        return { list: items, hasNextPage: items.length >= 10 };
    }

    async getLatest(page) {
        const url = page <= 1 ? `${this.baseUrl}/` : `${this.baseUrl}/page/${page}/`;
        const r = await this.client.get(url, { headers: this._hdrs() });
        const items = this._parseItems(r.body);
        return { list: items, hasNextPage: items.length >= 10 };
    }

    async getSearch(query, page) {
        const from = (page - 1) * 20 + 1;
        const url = `${this.baseUrl}/?do=search&subaction=search&story=${encodeURIComponent(query)}&search_start=${page - 1}&full_search=0&result_from=${from}`;
        const r = await this.client.get(url, { headers: this._hdrs() });
        const items = this._parseItems(r.body);
        return { list: items, hasNextPage: items.length >= 10 };
    }

    async getDetail(url) {
        const r = await this.client.get(url, { headers: this._hdrs() });
        const html = r.body;

        const newsIdM = url.match(/newsid=(\d+)/);
        const newsId  = newsIdM?.[1] || "";

        const isSerie = html.includes('id="serie-data"');

        const titleM = html.match(/data-title="([^"]+)"/);
        const title  = titleM?.[1]?.trim() || "";

        const imgM  = html.match(/data-affiche="([^"]+)"/);
        const image = imgM?.[1] || "";

        const genresM = html.match(/<span class="genres">([\s\S]*?)<\/span>/i);
        const genres  = genresM
            ? genresM[1].replace(/<[^>]+>/g, "").split(",").map(g => g.trim()).filter(Boolean)
            : [];

        const yearM = html.match(/xfname=date-de-sortie[^>]+>(\d{4})</);
        const year  = yearM?.[1] || "";

        const runtimeM = html.match(/<span class="runtime">[^\d]*(\d[^<]*)</i);
        const runtime   = runtimeM?.[1]?.trim() || "";

        const descM = html.match(/class="desc-text"[^>]*>([\s\S]*?)<\/p>/i)
                   || html.match(/<div[^>]+fdesc[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
        const desc  = descM?.[1]?.replace(/<[^>]+>/g, "").trim() || "";

        if (!isSerie) {
            return {
                name: title,
                imageUrl: image,
                description: desc,
                genre: genres.join(", "),
                year,
                episodes: [{
                    name: title || "Regarder",
                    url,
                    description: [runtime, year].filter(Boolean).join(" — ")
                }]
            };
        }

        let tagz = "";
        const tagzM = html.match(/data-tagz="([^"]+)"/);
        if (tagzM) {
            tagz = tagzM[1];
        } else if (newsId) {
            try {
                const apiR = await this.client.get(
                    `${this.baseUrl}/engine/ajax/film_api.php?id=${newsId}`,
                    { headers: this._hdrs(url) }
                );
                const api = JSON.parse(apiR.body);
                tagz = api?.meta?.tagz || "";
            } catch (_) {}
        }

        const episodes = [];

        if (tagz) {
            try {
                const seasonsR = await this.client.get(
                    `${this.baseUrl}/engine/ajax/get_seasons.php?serie_tag=${encodeURIComponent(tagz)}`,
                    { headers: this._hdrs(url) }
                );
                const seasons = JSON.parse(seasonsR.body);

                for (const season of seasons) {
                    const v = Math.floor(Date.now() / 30000);
                    let epData = null;

                    for (const path of [
                        `/static/series/${season.id}.js?v=${v}`,
                        `/data/eps_${season.id}.txt?v=${v}`,
                        `/ep-data.php?id=${season.id}&format=js&v=${v}`
                    ]) {
                        try {
                            const epR = await this.client.get(
                                `${this.baseUrl}${path}`,
                                { headers: this._hdrs(url) }
                            );
                            if (epR.body && epR.body.length > 5) {
                                epData = JSON.parse(epR.body);
                                break;
                            }
                        } catch (_) {}
                    }

                    if (!epData) continue;

                    const numSet = new Set([
                        ...Object.keys(epData.vf      || {}),
                        ...Object.keys(epData.vostfr  || {}),
                        ...Object.keys(epData.vo      || {})
                    ]);
                    const nums = [...numSet].map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);

                    const sLabel = season.title.replace(/.*?(\bSaison\s*\d+.*)/i, "$1").trim()
                                || season.title;

                    for (const n of nums) {
                        episodes.push({
                            name: `${sLabel} — Ep. ${n}`,
                            url:  `${this.baseUrl}/index.php?newsid=${season.id}&_fs_ep=${n}`,
                            description: `Épisode ${n}`
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
            year,
            episodes
        };
    }

    async getVideoList(url) {
        const u      = new URL(url);
        const newsId = u.searchParams.get("newsid");
        const epNum  = u.searchParams.get("_fs_ep");

        if (!newsId) return [];

        const videos = [];

        if (epNum) {
            const v = Math.floor(Date.now() / 30000);
            let epData = null;

            for (const path of [
                `/static/series/${newsId}.js?v=${v}`,
                `/data/eps_${newsId}.txt?v=${v}`,
                `/ep-data.php?id=${newsId}&format=js&v=${v}`
            ]) {
                try {
                    const r = await this.client.get(
                        `${this.baseUrl}${path}`,
                        { headers: this._hdrs(url) }
                    );
                    if (r.body && r.body.length > 5) {
                        epData = JSON.parse(r.body);
                        break;
                    }
                } catch (_) {}
            }

            if (epData) {
                this._extractEpVideos(epData, epNum, videos);
            }
        } else {
            try {
                const r = await this.client.get(
                    `${this.baseUrl}/engine/ajax/film_api.php?id=${newsId}`,
                    { headers: this._hdrs(url) }
                );
                const api = JSON.parse(r.body);
                this._extractFilmVideos(api?.players || {}, videos);
            } catch (_) {}
        }

        return videos;
    }

    _extractFilmVideos(p, videos) {
        const PROVIDERS = [
            ["vidzy",   "ViDZY"],
            ["uqload",  "Uqload"],
            ["dood",    "Dood"],
            ["voe",     "Voe"],
            ["filmoon", "Filmoon"],
            ["premium", "Premium"]
        ];
        const LANGS = {
            "default": "VF",
            "vostfr":  "VOSTFR",
            "vfq":     "VFQ",
            "vff":     "VFF"
        };

        for (const [key, label] of PROVIDERS) {
            if (!p[key]) continue;
            for (const [langKey, langLabel] of Object.entries(LANGS)) {
                const src = p[key][langKey];
                if (src) videos.push({ quality: `${label} ${langLabel}`, url: src, originalUrl: src, isM3U8: false });
            }
        }

        if (p.netu) {
            for (const [langKey, langLabel] of Object.entries(LANGS)) {
                const id = p.netu[langKey];
                if (id) {
                    const src = `https://1.multiup.us/player/embed_player.php?vid=${id}&autoplay=no`;
                    videos.push({ quality: `Netu ${langLabel}`, url: src, originalUrl: src, isM3U8: false });
                }
            }
        }
    }

    _extractEpVideos(epData, epNum, videos) {
        const LANGS = { vf: "VF", vostfr: "VOSTFR", vo: "VO" };
        const PNAMES = {
            premium: "Premium", vidzy: "ViDZY", uqload: "Uqload",
            netu: "Netu", voe: "Voe", dood: "Dood", filmoon: "Filmoon"
        };

        for (const [lang, langLabel] of Object.entries(LANGS)) {
            const entry = (epData[lang] || {})[epNum] || (epData[lang] || {})[String(epNum)];
            if (!entry) continue;
            for (const [provider, val] of Object.entries(entry)) {
                if (!val) continue;
                const pLabel = PNAMES[provider] || provider;
                let src = val;
                if (provider === "netu" && !val.startsWith("http")) {
                    src = `https://1.multiup.us/player/embed_player.php?vid=${val}&autoplay=no`;
                }
                videos.push({ quality: `${pLabel} ${langLabel}`, url: src, originalUrl: src, isM3U8: false });
            }
        }
    }

    getPreference(key) {
        return this.source.prefs?.find(x => x.key === key)?.value || "";
    }
}
