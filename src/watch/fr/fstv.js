// ─────────────────────────────────────────────────────────────────────────────
// FStream TV (fstv.rest) — extension Watchtower v1.0.0
//
// Chaînes de télévision en direct — même moteur CMS qu'French-Stream.
// Sports, Info, Divertissement, Documentaires, Jeunesse, Musique et plus.
//
// Méthodes :
//   getPopular(page)            → toutes les chaînes
//   getLatestUpdates(page)      → chaînes récemment mises à jour
//   search(query, page, filters)→ recherche de chaîne
//   getDetail(url)              → fiche chaîne + accès direct
//   getVideoList(url)           → flux live de la chaîne
//   getFilterList()             → filtres par catégorie / pays / qualité
//   getCustomLists()            → sections accueil par catégorie
//   getCustomList(id, page)     → chaînes d'une catégorie
// ─────────────────────────────────────────────────────────────────────────────

const watchtowerSources = [{
    "name": "FStream TV",
    "langs": ["fr"],
    "ids": { "fr": 789345612 },
    "baseUrl": "https://fstv.rest",
    "apiUrl": "https://fstv.rest",
    "iconUrl": "https://fstv.rest/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.0.0",
    "pkgPath": "watch/fr/fstv.js",
    "editableBaseUrl": true,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "HD", "SD"],
    "subCategories": ["live", "tv"],
    "supportsForYou": true,
    "supportsComments": false,
    "hasCloudflare": false,
    "prefs": []
}];

const BASE_URL = "https://fstv.rest";

class DefaultExtension extends MProvider {
    constructor() { super(); }

    get baseUrl() {
        const p = this.source.prefs ? this.source.prefs.find(x => x.key === "base_url") : null;
        return (p && p.value) ? p.value.replace(/\/$/, "") : BASE_URL.replace(/\/$/, "");
    }

    _hdrs(ref) {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": ref || (this.baseUrl + "/"),
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8"
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
        const re = new RegExp("[?&]" + key + "=([^&]+)");
        const m  = re.exec(url);
        return m ? decodeURIComponent(m[1]) : null;
    }

    _decode(s) {
        return String(s || "")
            .replace(/&amp;/g, "&").replace(/&quot;/g, '"')
            .replace(/&#0?39;/g, "'").replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
    }

    // ── Card parser — channel cards ──────────────────────────────────────────
    _parseItems(html) {
        const items = [];
        const seen  = {};

        // Strategy 1: .short-poster links
        const blockRe = /<a[^>]+class="short-poster[^"]*"([^>]*)>([\s\S]*?)<\/a>/gi;
        let bm;
        while ((bm = blockRe.exec(html)) !== null) {
            const attrs = bm[1];
            const inner = bm[2];

            const hrefM = /href="([^"]+newsid=\d+[^"]*)"/.exec(attrs)
                       || /href="([^"]+)"/.exec(attrs);
            if (!hrefM) continue;
            const href = hrefM[1].startsWith("http") ? hrefM[1] : this.baseUrl + hrefM[1];
            if (seen[href]) continue;
            seen[href] = true;

            const altM = /alt="([^"]{2,})"/.exec(attrs) || /alt="([^"]{2,})"/.exec(inner);
            const imgM = /<img[^>]+(?:data-src|src)="([^"]+)"/i.exec(inner);
            const title = altM ? this._decode(altM[1].trim()) : "";
            if (!title) continue;

            // Channel quality / type badge
            const qualM = /\b(HD|4K|SD|FHD)\b/i.exec(inner + title);
            const qual  = qualM ? qualM[1].toUpperCase() : "";

            // Live indicator
            const isLive = /\b(live|direct|en direct)\b/i.test(inner + title);

            items.push({
                name: title,
                link: href,
                imageUrl: imgM ? imgM[1] : "",
                description: [qual, isLive ? "🔴 Direct" : ""].filter(Boolean).join(" · "),
                scanlator: qual || "HD"
            });
        }

        // Strategy 2: fallback newsid links
        if (items.length === 0) {
            const re2 = /<a[^>]+href="([^"]+newsid=\d+[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
            let m2;
            while ((m2 = re2.exec(html)) !== null) {
                const href2 = m2[1].startsWith("http") ? m2[1] : this.baseUrl + m2[1];
                if (seen[href2]) continue; seen[href2] = true;
                const inner2  = m2[2];
                const titleM2 = /(?:alt|title)="([^"]{2,})"/i.exec(m2[0]);
                const imgM2   = /<img[^>]+src="([^"]+)"/i.exec(inner2);
                const t2 = titleM2 ? this._decode(titleM2[1].trim()) : "";
                if (t2) items.push({ name: t2, link: href2, imageUrl: imgM2 ? imgM2[1] : "", description: "🔴 Direct", scanlator: "HD" });
            }
        }

        return items;
    }

    _extractNewsId(url, html) {
        const fromUrl = this._getParam(url, "newsid");
        if (fromUrl) return fromUrl;
        const m = /(?:newsid|news_id)[='":\s]+(\d{3,})/i.exec(html || "");
        if (m) return m[1];
        return null;
    }

    // ── Popular (toutes les chaînes) ─────────────────────────────────────────
    async getPopular(page) {
        const urls = [
            this.baseUrl + "/chaines/page/" + page + "/",
            this.baseUrl + "/page/" + page + "/",
            this.baseUrl + "/"
        ];
        for (var i = 0; i < urls.length; i++) {
            try {
                const r = await new Client().get(urls[i], { headers: this._hdrs() });
                const items = this._parseItems(r.body);
                if (items.length > 0) return { list: items, hasNextPage: items.length >= 10 };
            } catch (_) {}
        }
        return { list: [], hasNextPage: false };
    }

    // ── Latest updates ───────────────────────────────────────────────────────
    async getLatestUpdates(page) {
        const url = page <= 1 ? this.baseUrl + "/" : this.baseUrl + "/page/" + page + "/";
        const r   = await new Client().get(url, { headers: this._hdrs() });
        const items = this._parseItems(r.body);
        return { list: items, hasNextPage: items.length >= 10 };
    }

    // ── Search ───────────────────────────────────────────────────────────────
    async search(query, page, filters) {
        if ((!query || query.trim() === "") && filters && filters.length > 0) {
            return this._filterSearch(page, filters);
        }
        const url = this.baseUrl + "/?do=search&subaction=search&story=" + encodeURIComponent(query || "")
            + "&search_start=" + (page - 1) + "&result_from=" + ((page - 1) * 20 + 1);
        try {
            const r = await new Client().get(url, { headers: this._hdrs() });
            const items = this._parseItems(r.body);
            return { list: items, hasNextPage: items.length >= 10 };
        } catch (_) {
            return { list: [], hasNextPage: false };
        }
    }

    async _filterSearch(page, filters) {
        var xfname = "", xf = "";
        for (var i = 0; i < filters.length; i++) {
            const f = filters[i];
            if (!f || !f.value || f.value === "all" || f.value === "") continue;
            if (!xfname) { xfname = f.id || f.name || ""; xf = f.value; }
        }
        const url = xfname && xf
            ? this.baseUrl + "/xfsearch/" + xfname + "/" + encodeURIComponent(xf) + "/page/" + page + "/"
            : this.baseUrl + "/page/" + page + "/";
        try {
            const r = await new Client().get(url, { headers: this._hdrs() });
            const items = this._parseItems(r.body);
            return { list: items, hasNextPage: items.length >= 10 };
        } catch (_) {
            return this.getPopular(page);
        }
    }

    // ── Filters ──────────────────────────────────────────────────────────────
    getFilterList() {
        return [
            {
                type: "select", id: "genre-1", name: "Catégorie",
                values: [
                    { value: "all",            label: "Toutes"             },
                    { value: "sport",          label: "⚽ Sport"            },
                    { value: "info",           label: "📰 Info / Actualités" },
                    { value: "divertissement", label: "🎬 Divertissement"   },
                    { value: "documentaire",   label: "🎥 Documentaire"     },
                    { value: "jeunesse",       label: "🧒 Jeunesse"         },
                    { value: "musique",        label: "🎵 Musique"          },
                    { value: "cinema",         label: "🎞️ Cinéma"           },
                    { value: "series",         label: "📺 Séries"           },
                    { value: "voyage",         label: "✈️ Voyage"            },
                    { value: "nature",         label: "🌿 Nature"           },
                    { value: "sante",          label: "🏥 Santé"            },
                    { value: "religion",       label: "✝️ Religion"          },
                    { value: "adulte",         label: "🔞 Adulte"           },
                ]
            },
            {
                type: "select", id: "lang", name: "Pays / Langue",
                values: [
                    { value: "all",        label: "Tous"        },
                    { value: "france",     label: "🇫🇷 France"   },
                    { value: "belgique",   label: "🇧🇪 Belgique"  },
                    { value: "suisse",     label: "🇨🇭 Suisse"    },
                    { value: "canada",     label: "🇨🇦 Canada"    },
                    { value: "maroc",      label: "🇲🇦 Maroc"     },
                    { value: "algerie",    label: "🇩🇿 Algérie"   },
                    { value: "tunisie",    label: "🇹🇳 Tunisie"   },
                    { value: "angleterre", label: "🇬🇧 Angleterre" },
                    { value: "espagne",    label: "🇪🇸 Espagne"   },
                    { value: "allemagne",  label: "🇩🇪 Allemagne" },
                    { value: "usa",        label: "🇺🇸 USA"       },
                    { value: "turquie",    label: "🇹🇷 Turquie"   },
                    { value: "arabie",     label: "🇸🇦 Arabie"    },
                ]
            },
            {
                type: "select", id: "qualit", name: "Qualité",
                values: [
                    { value: "all", label: "Toutes" },
                    { value: "HD",  label: "HD"     },
                    { value: "SD",  label: "SD"     },
                    { value: "4K",  label: "4K"     },
                ]
            },
        ];
    }

    // ── Custom lists (sections accueil) ──────────────────────────────────────
    getCustomLists() {
        return [
            { id: "all",            name: "📺 Toutes les chaînes"      },
            { id: "sport",          name: "⚽ Sport"                    },
            { id: "info",           name: "📰 Info & Actualités"        },
            { id: "divertissement", name: "🎬 Divertissement"           },
            { id: "cinema",         name: "🎞️ Cinéma"                   },
            { id: "series",         name: "🎭 Séries"                   },
            { id: "documentaire",   name: "🎥 Documentaires"            },
            { id: "jeunesse",       name: "🧒 Jeunesse"                 },
            { id: "musique",        name: "🎵 Musique"                  },
            { id: "france",         name: "🇫🇷 Chaînes françaises"       },
            { id: "international",  name: "🌍 International"            },
            { id: "sport_foot",     name: "🏆 Football"                 },
        ];
    }

    async getCustomList(listId, page) {
        var url;
        switch (listId) {
            case "all":
                return this.getPopular(page);
            case "sport":
                url = this.baseUrl + "/xfsearch/genre-1/sport/page/" + page + "/";
                break;
            case "info":
                url = this.baseUrl + "/xfsearch/genre-1/info/page/" + page + "/";
                break;
            case "divertissement":
                url = this.baseUrl + "/xfsearch/genre-1/divertissement/page/" + page + "/";
                break;
            case "cinema":
                url = this.baseUrl + "/xfsearch/genre-1/cinema/page/" + page + "/";
                break;
            case "series":
                url = this.baseUrl + "/xfsearch/genre-1/series/page/" + page + "/";
                break;
            case "documentaire":
                url = this.baseUrl + "/xfsearch/genre-1/documentaire/page/" + page + "/";
                break;
            case "jeunesse":
                url = this.baseUrl + "/xfsearch/genre-1/jeunesse/page/" + page + "/";
                break;
            case "musique":
                url = this.baseUrl + "/xfsearch/genre-1/musique/page/" + page + "/";
                break;
            case "france":
                url = this.baseUrl + "/xfsearch/lang/france/page/" + page + "/";
                break;
            case "international":
                url = this.baseUrl + "/xfsearch/lang/international/page/" + page + "/";
                break;
            case "sport_foot":
                url = this.baseUrl + "/xfsearch/ftagz/football/page/" + page + "/";
                break;
            default:
                return this.getPopular(page);
        }
        try {
            const r = await new Client().get(url, { headers: this._hdrs() });
            const items = this._parseItems(r.body);
            if (items.length === 0) return this.getPopular(page);
            return { list: items, hasNextPage: items.length >= 10 };
        } catch (_) {
            return this.getPopular(page);
        }
    }

    // ── Pour vous ────────────────────────────────────────────────────────────
    async getForYou(page) {
        if (page <= 1) {
            const seen = {}; const list = [];
            const add = (html) => this._parseItems(html).forEach(i => { if (!seen[i.link]) { seen[i.link]=true; list.push(i); } });
            try {
                const [homeR, sportR] = await Promise.all([
                    new Client().get(this.baseUrl + "/",                                { headers: this._hdrs() }),
                    new Client().get(this.baseUrl + "/xfsearch/genre-1/sport/",         { headers: this._hdrs() }),
                ]);
                add(homeR.body);
                add(sportR.body);
            } catch (_) { return this.getPopular(1); }
            try {
                const infoR = await new Client().get(this.baseUrl + "/xfsearch/genre-1/info/", { headers: this._hdrs() });
                add(infoR.body);
            } catch (_) {}
            return { list: list.slice(0, 40), hasNextPage: list.length >= 10 };
        }
        return this.getPopular(page);
    }

    // ── Detail (fiche chaîne) ────────────────────────────────────────────────
    async getDetail(url) {
        const r    = await new Client().get(url, { headers: this._hdrs() });
        const html = r.body;

        const titleM = /data-title="([^"]+)"/.exec(html)
                    || /<h1[^>]*>([^<]{2,})<\/h1>/i.exec(html)
                    || /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i.exec(html);
        const title  = titleM ? this._decode(titleM[1].trim()) : "";

        const imgM   = /data-affiche="([^"]+)"/.exec(html)
                    || /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i.exec(html);
        const image  = imgM ? imgM[1] : "";

        const descM  = /class="desc-text"[^>]*>([\s\S]*?)<\/p>/i.exec(html)
                    || /<meta[^>]+name="description"[^>]+content="([^"]+)"/i.exec(html);
        const desc   = descM ? descM[1].replace(/<[^>]+>/g, "").trim() : "Chaîne TV en direct";

        const genresM = /<span class="genres">([\s\S]*?)<\/span>/i.exec(html);
        const genres  = genresM
            ? genresM[1].replace(/<[^>]+>/g, "").split(",").map(g => g.trim()).filter(Boolean)
            : [];

        // Quality badge
        const qualM = /\b(HD|4K|SD|FHD)\b/i.exec(html);
        const qual  = qualM ? qualM[1].toUpperCase() : "HD";

        // Country / language
        const langM = /xfname=lang[^>]*>([^<]{2,20})</.exec(html);
        const lang  = langM ? langM[1].trim() : "";

        return {
            name: title,
            imageUrl: image,
            description: desc,
            genres: genres,
            status: 4,
            author: lang,
            artist: qual,
            rating: "",
            chapters: [{
                name: "▶ Regarder en direct",
                url: url,
                dateUpload: "",
                description: [qual, lang].filter(Boolean).join(" · "),
                scanlator: qual
            }]
        };
    }

    // ── Video list (flux live) ───────────────────────────────────────────────
    async getVideoList(url) {
        const r    = await new Client().get(url, { headers: this._hdrs(url) });
        const html = r.body;
        const videos = [];

        // Strategy 1 — m3u8 / m3u direct live streams
        const hlsRe = /https?:\/\/[^\s"'<>]+\.(?:m3u8?|ts)(?:\?[^\s"'<>]*)?/gi;
        let hm;
        while ((hm = hlsRe.exec(html)) !== null) {
            const su = hm[0].replace(/&amp;/g, "&");
            if (!videos.find(v => v.url === su)) videos.push({ url: su, quality: su.includes("hd") ? "HD" : "AUTO", headers: this._hdrs(url) });
        }

        // Strategy 2 — player data JSON
        const playerRe = /(?:file|src|stream)["']?\s*:\s*["']([^"']+\.(?:m3u8?|mp4)[^"']*)/gi;
        let pm;
        while ((pm = playerRe.exec(html)) !== null) {
            const su = pm[1].replace(/&amp;/g, "&");
            if (!videos.find(v => v.url === su)) videos.push({ url: su, quality: "AUTO", headers: this._hdrs(url) });
        }

        // Strategy 3 — jwplayer / videojs setup calls
        const jwRe = /jwplayer\([^)]*\)\.setup\(\s*\{([\s\S]*?)\}\s*\)/gi;
        let jwm;
        while ((jwm = jwRe.exec(html)) !== null) {
            const block = jwm[1];
            const fileM = /["']file["']\s*:\s*["']([^"']+)["']/.exec(block);
            if (fileM) {
                const su = fileM[1].replace(/&amp;/g, "&");
                if (!videos.find(v => v.url === su)) videos.push({ url: su, quality: "AUTO", headers: this._hdrs(url) });
            }
        }

        // Strategy 4 — iframes (external players: Dailymotion, Twitch, YouTube live, etc.)
        if (videos.length === 0) {
            const iRe = /<iframe[^>]+src="([^"]+)"/gi; let im;
            while ((im = iRe.exec(html)) !== null) {
                const src = im[1].replace(/&amp;/g, "&");
                if (src && !src.includes("javascript") && !src.includes("about:")) {
                    const qual = src.includes("youtube") ? "YouTube" : src.includes("twitch") ? "Twitch" : src.includes("dailymotion") ? "Dailymotion" : "AUTO";
                    videos.push({ url: src, quality: qual, headers: this._hdrs(url) });
                }
            }
        }

        // Strategy 5 — look for IPTV-style data attributes
        const iptvRe = /data-(?:stream|src|url)="([^"]+\.m3u8[^"]*)"/gi; let ipm;
        while ((ipm = iptvRe.exec(html)) !== null) {
            const su = ipm[1].replace(/&amp;/g, "&");
            if (!videos.find(v => v.url === su)) videos.push({ url: su, quality: "HD", headers: this._hdrs(url) });
        }

        return videos.length > 0 ? videos : [{ url: url, quality: "AUTO", headers: this._hdrs(url) }];
    }
}
