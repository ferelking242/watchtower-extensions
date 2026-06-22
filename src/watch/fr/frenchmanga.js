// ─────────────────────────────────────────────────────────────────────────────
// French-Manga (w16.french-manga.net) — extension Watchtower v1.0.0
//
// Site dédié aux animes en VF/VOSTFR — même moteur CMS qu'French-Stream.
//
// Méthodes :
//   getPopular(page)            → animes populaires
//   getLatestUpdates(page)      → dernières sorties
//   search(query, page, filters)→ recherche avec filtres
//   getDetail(url)              → fiche détail + liste des épisodes
//   getVideoList(url)           → liens vidéo d'un épisode
//   getFilterList()             → tous les filtres disponibles
//   getCustomLists()            → sections accueil
//   getCustomList(id, page)     → contenu d'une section
// ─────────────────────────────────────────────────────────────────────────────

const watchtowerSources = [{
    "name": "French-Manga",
    "langs": ["fr"],
    "ids": { "fr": 534921847 },
    "baseUrl": "https://w16.french-manga.net",
    "apiUrl": "https://w16.french-manga.net",
    "iconUrl": "https://raw.githubusercontent.com/ferelking242/Watchtower-extensions/main/extensions/watch/icon/fr.frenchmanga.png",
    "typeSource": "single",
    "itemType": 2,
    "version": "1.0.0",
    "pkgPath": "watch/fr/frenchmanga.js",
    "editableBaseUrl": true,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "VF", "VOSTFR", "VO"],
    "subCategories": ["anime"],
    "supportsForYou": true,
    "supportsComments": false,
    "hasCloudflare": false,
    "prefs": []
}];

const BASE_URL = "https://w16.french-manga.net";

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

    // ── HTML entity decoder ──────────────────────────────────────────────────
    _decode(s) {
        return String(s || "")
            .replace(/&amp;/g, "&").replace(/&quot;/g, '"')
            .replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
            .replace(/&nbsp;/g, " ");
    }

    // ── Card parser ──────────────────────────────────────────────────────────
    _parseItems(html) {
        const items = [];
        const seen  = {};

        // Strategy 1: .short-poster links (standard CMS layout)
        const blockRe = /<a[^>]+class="short-poster[^"]*"([^>]*)>([\s\S]*?)<\/a>/gi;
        let bm;
        while ((bm = blockRe.exec(html)) !== null) {
            const attrs = bm[1];
            const inner = bm[2];

            const hrefM = /href="([^"]+(?:newsid=\d+|\/\d{4,}\/)[^"]*)"/.exec(attrs)
                       || /href="([^"]+)"/.exec(attrs);
            if (!hrefM) continue;
            const href = hrefM[1].startsWith("http") ? hrefM[1] : this.baseUrl + hrefM[1];
            if (seen[href]) continue;
            seen[href] = true;

            const altM  = /alt="([^"]{2,})"/.exec(attrs) || /alt="([^"]{2,})"/.exec(inner);
            const imgM  = /<img[^>]+(?:data-src|src)="([^"]+)"/i.exec(inner);
            const title = altM ? this._decode(altM[1].trim()) : "";
            if (!title) continue;

            // Language badge
            const langM = /\b(VF|VOSTFR|VOSTA|VO|TrueFrench)\b/i.exec(inner + " " + title);
            const lang  = langM ? langM[1].toUpperCase() : "";

            // Episode count badge
            const epM = /(?:épisode|episode|ep\.?)\s*(\d+)/i.exec(inner);

            items.push({
                name: title,
                link: href,
                imageUrl: imgM ? imgM[1] : "",
                description: [lang, epM ? "Ep. " + epM[1] : ""].filter(Boolean).join(" · "),
                scanlator: lang
            });
        }

        // Strategy 2: fallback — any link containing newsid
        if (items.length === 0) {
            const re2 = /<a[^>]+href="([^"]+(?:newsid=\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
            let m2;
            while ((m2 = re2.exec(html)) !== null) {
                const href2 = m2[1].startsWith("http") ? m2[1] : this.baseUrl + m2[1];
                if (seen[href2]) continue; seen[href2] = true;
                const inner2  = m2[2];
                const titleM2 = /(?:alt|title)="([^"]{2,})"/i.exec(m2[0]);
                const imgM2   = /<img[^>]+src="([^"]+)"/i.exec(inner2);
                const t2 = titleM2 ? this._decode(titleM2[1].trim()) : "";
                if (t2) items.push({ name: t2, link: href2, imageUrl: imgM2 ? imgM2[1] : "" });
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

    // ── Popular ───────────────────────────────────────────────────────────────
    async getPopular(page) {
        const url = this.baseUrl + "/animes/page/" + page + "/";
        try {
            const r = await new Client().get(url, { headers: this._hdrs() });
            const items = this._parseItems(r.body);
            if (items.length > 0) return { list: items, hasNextPage: items.length >= 10 };
        } catch (_) {}
        // Fallback: homepage
        const r2 = await new Client().get(this.baseUrl + "/", { headers: this._hdrs() });
        const items2 = this._parseItems(r2.body);
        return { list: items2, hasNextPage: false };
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
        // Filter-only search
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
            : this.baseUrl + "/animes/page/" + page + "/";
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
                type: "select", id: "version-serie", name: "Version",
                values: [
                    { value: "all",         label: "Toutes"       },
                    { value: "VF",          label: "VF"           },
                    { value: "VOSTFR",      label: "VOSTFR"       },
                    { value: "VF%2BVOSTFR", label: "VF + VOSTFR"  },
                ]
            },
            {
                type: "select", id: "genre-1", name: "Genre",
                values: [
                    { value: "all",          label: "Tous"             },
                    { value: "action",       label: "Action"           },
                    { value: "adventure",    label: "Aventure"         },
                    { value: "comedy",       label: "Comédie"          },
                    { value: "drama",        label: "Drame"            },
                    { value: "fantasy",      label: "Fantaisie"        },
                    { value: "horror",       label: "Horreur"          },
                    { value: "romance",      label: "Romance"          },
                    { value: "school",       label: "École"            },
                    { value: "sci-fi",       label: "Science-Fiction"  },
                    { value: "seinen",       label: "Seinen"           },
                    { value: "shonen",       label: "Shōnen"           },
                    { value: "slice-of-life","label": "Slice of Life"  },
                    { value: "sports",       label: "Sport"            },
                    { value: "supernatural", label: "Surnaturel"       },
                    { value: "thriller",     label: "Thriller"         },
                    { value: "yaoi",         label: "Yaoi"             },
                    { value: "yuri",         label: "Yuri"             },
                ]
            },
            {
                type: "select", id: "date-de-sortie", name: "Année",
                values: [
                    { value: "all",  label: "Toutes" },
                    { value: "2026", label: "2026"   },
                    { value: "2025", label: "2025"   },
                    { value: "2024", label: "2024"   },
                    { value: "2023", label: "2023"   },
                    { value: "2022", label: "2022"   },
                    { value: "2021", label: "2021"   },
                    { value: "2020", label: "2020"   },
                    { value: "2019", label: "2019"   },
                    { value: "2018", label: "2018"   },
                    { value: "2015-2017", label: "2015–2017" },
                    { value: "2010-2014", label: "2010–2014" },
                ]
            },
            {
                type: "select", id: "qualit", name: "Qualité",
                values: [
                    { value: "all",  label: "Toutes" },
                    { value: "HD",   label: "HD"     },
                    { value: "CAM",  label: "CAM"    },
                ]
            },
        ];
    }

    // ── Custom lists (accueil) ───────────────────────────────────────────────
    getCustomLists() {
        return [
            { id: "trending",    name: "🔥 Tendances"          },
            { id: "vf",          name: "🇫🇷 VF"                 },
            { id: "vostfr",      name: "🌐 VOSTFR"             },
            { id: "action",      name: "💥 Action"              },
            { id: "adventure",   name: "⚔️ Aventure"            },
            { id: "shonen",      name: "👊 Shōnen"             },
            { id: "romance",     name: "💕 Romance"             },
            { id: "fantasy",     name: "🧙 Fantaisie"           },
            { id: "sci_fi",      name: "🚀 Science-Fiction"     },
            { id: "comedy",      name: "😄 Comédie"             },
            { id: "horror",      name: "👻 Horreur"             },
            { id: "season_2026", name: "📅 Saison 2026"         },
        ];
    }

    async getCustomList(listId, page) {
        var url;
        switch (listId) {
            case "trending":
                url = this.baseUrl + "/animes/page/" + page + "/";
                break;
            case "vf":
                url = this.baseUrl + "/xfsearch/version-serie/VF/page/" + page + "/";
                break;
            case "vostfr":
                url = this.baseUrl + "/xfsearch/version-serie/VOSTFR/page/" + page + "/";
                break;
            case "action":
                url = this.baseUrl + "/xfsearch/genre-1/action/page/" + page + "/";
                break;
            case "adventure":
                url = this.baseUrl + "/xfsearch/genre-1/adventure/page/" + page + "/";
                break;
            case "shonen":
                url = this.baseUrl + "/xfsearch/genre-1/shonen/page/" + page + "/";
                break;
            case "romance":
                url = this.baseUrl + "/xfsearch/genre-1/romance/page/" + page + "/";
                break;
            case "fantasy":
                url = this.baseUrl + "/xfsearch/genre-1/fantasy/page/" + page + "/";
                break;
            case "sci_fi":
                url = this.baseUrl + "/xfsearch/genre-1/sci-fi/page/" + page + "/";
                break;
            case "comedy":
                url = this.baseUrl + "/xfsearch/genre-1/comedy/page/" + page + "/";
                break;
            case "horror":
                url = this.baseUrl + "/xfsearch/genre-1/horror/page/" + page + "/";
                break;
            case "season_2026":
                url = this.baseUrl + "/xfsearch/date-de-sortie/2026/page/" + page + "/";
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
                const [homeR, vfR] = await Promise.all([
                    new Client().get(this.baseUrl + "/",                               { headers: this._hdrs() }),
                    new Client().get(this.baseUrl + "/xfsearch/version-serie/VF/",     { headers: this._hdrs() }),
                ]);
                add(homeR.body);
                add(vfR.body);
            } catch (_) { return this.getLatestUpdates(1); }
            try {
                const r2 = await new Client().get(this.baseUrl + "/xfsearch/version-serie/VOSTFR/", { headers: this._hdrs() });
                add(r2.body);
            } catch (_) {}
            return { list: list.slice(0, 40), hasNextPage: list.length >= 10 };
        }
        return this.getLatestUpdates(page - 1);
    }

    // ── Detail ───────────────────────────────────────────────────────────────
    async getDetail(url) {
        const r    = await new Client().get(url, { headers: this._hdrs() });
        const html = r.body;

        const newsId  = this._extractNewsId(url, html) || "";
        const isSerie = html.indexOf('id="serie-data"') !== -1
                     || /<div[^>]+class="[^"]*episode[^"]*"/.test(html);

        const titleM  = /data-title="([^"]+)"/.exec(html)
                     || /<h1[^>]*>([^<]{2,})<\/h1>/i.exec(html)
                     || /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i.exec(html);
        const title   = titleM ? this._decode(titleM[1].trim()) : "";

        const imgM    = /data-affiche="([^"]+)"/.exec(html)
                     || /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i.exec(html);
        const image   = imgM ? imgM[1] : "";

        const genresM = /<span class="genres">([\s\S]*?)<\/span>/i.exec(html);
        const genres  = genresM
            ? genresM[1].replace(/<[^>]+>/g, "").split(",").map(g => g.trim()).filter(Boolean)
            : [];

        const yearM   = /xfname=date-de-sortie[^>]+>(\d{4})</.exec(html);
        const year    = yearM ? yearM[1] : "";

        const descM   = /class="desc-text"[^>]*>([\s\S]*?)<\/p>/i.exec(html)
                     || /<meta[^>]+name="description"[^>]+content="([^"]+)"/i.exec(html);
        const desc    = descM ? descM[1].replace(/<[^>]+>/g, "").trim() : "";

        const ratingM = /itemprop="ratingValue"[^>]*>([0-9.,]+)</.exec(html)
                     || /data-rating="([0-9.,]+)"/.exec(html);
        const rating  = ratingM ? ratingM[1].trim() : "";

        const langM   = /xfname=version-(?:film|serie)[^>]*>([^<]{1,30})</.exec(html)
                     || /\b(VF|VOSTFR|VOSTA|VO)\b/i.exec(html);
        const lang    = langM ? langM[1].trim() : "";

        // Collect episode links
        const chapters = [];
        const epSeen   = {};

        // Structured episode list
        const tagzM = /data-tagz="([^"]+)"/.exec(html);
        const tagz  = tagzM ? tagzM[1] : "";

        if (tagz) {
            try {
                const seasonsR = await new Client().get(this.baseUrl + "/engine/ajax/get_seasons.php?serie_tag=" + encodeURIComponent(tagz), { headers: this._ajaxHdrs(url) });
                const seasons  = JSON.parse(seasonsR.body);

                for (var si = 0; si < seasons.length; si++) {
                    const season = seasons[si];
                    const v = Math.floor(Date.now() / 30000);
                    var epData = null;
                    try {
                        const epR = await new Client().get(this.baseUrl + "/static/series/" + season.id + ".js?v=" + v, { headers: this._hdrs(url) });
                        if (epR.body && epR.body.length > 5) epData = JSON.parse(epR.body);
                    } catch (_) {}
                    if (!epData) continue;

                    const numSet = {};
                    ["vf","vostfr","vo"].forEach(l => { if (epData[l]) Object.keys(epData[l]).forEach(k => { numSet[k] = true; }); });
                    const nums = Object.keys(numSet).map(k => parseInt(k,10)).filter(n => !isNaN(n)).sort((a,b) => a-b);

                    const sLabel = /\bSaison\s*\d+.*/i.exec(season.title);
                    const sName  = sLabel ? sLabel[0].trim() : (season.title || "Saison " + (si+1));

                    nums.forEach(n => {
                        const epLangs = ["vf","vostfr","vo"].filter(l => epData[l] && epData[l][String(n)]).map(l => l.toUpperCase());
                        const epKey = sName + "-" + n;
                        if (!epSeen[epKey]) {
                            epSeen[epKey] = true;
                            chapters.push({
                                name: sName + " — Épisode " + n + (epLangs.length ? " (" + epLangs.join("/") + ")" : ""),
                                url: url + "?s=" + season.id + "&ep=" + n,
                                dateUpload: "",
                                description: "Épisode " + n + " sur " + nums.length,
                                scanlator: epLangs.join(" / ") || lang
                            });
                        }
                    });
                }
            } catch (_) {}
        }

        // Fallback: scrape episode links from HTML
        if (chapters.length === 0) {
            const eRe = /href="([^"]+(?:newsid=\d+&ep=\d+|episode[^"]+))"[^>]*>\s*([^<]{1,60})/gi;
            let em;
            while ((em = eRe.exec(html)) !== null) {
                const epUrl  = em[1].startsWith("http") ? em[1] : this.baseUrl + em[1];
                const epName = em[2].replace(/<[^>]+>/g,"").trim();
                if (!epSeen[epUrl] && epName) {
                    epSeen[epUrl] = true;
                    chapters.push({ name: epName, url: epUrl, dateUpload: "", scanlator: lang });
                }
            }
        }

        if (chapters.length === 0) {
            chapters.push({ name: title || "Regarder", url: url, dateUpload: "", description: lang, scanlator: lang });
        }

        return { name: title, imageUrl: image, description: desc, genres: genres, status: isSerie ? 1 : 4, author: year, rating: rating, chapters: chapters };
    }

    // ── Video list ───────────────────────────────────────────────────────────
    async getVideoList(url) {
        const r    = await new Client().get(url, { headers: this._hdrs(url) });
        const html = r.body;
        const videos = [];

        // m3u8 / mp4 direct
        const hlsRe = /https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4)(?:\?[^\s"'<>]*)?/gi;
        let hm;
        while ((hm = hlsRe.exec(html)) !== null) {
            const su = hm[0].replace(/&amp;/g, "&");
            if (!videos.find(v => v.url === su)) videos.push({ url: su, quality: "AUTO", headers: this._hdrs(url) });
        }

        // Episode lang streams from static data
        const epM  = /[?&]ep=(\d+)/.exec(url);
        const sIdM = /[?&]s=(\d+)/.exec(url);
        if (epM && sIdM && videos.length === 0) {
            const newsId = this._extractNewsId(url, html);
            if (newsId) {
                const v = Math.floor(Date.now() / 30000);
                try {
                    const epR = await new Client().get(this.baseUrl + "/static/series/" + sIdM[1] + ".js?v=" + v, { headers: this._hdrs(url) });
                    const epData = JSON.parse(epR.body);
                    ["vf","vostfr","vo"].forEach(l => {
                        const ld = epData[l];
                        if (ld && ld[epM[1]]) {
                            const srcs = Array.isArray(ld[epM[1]]) ? ld[epM[1]] : [ld[epM[1]]];
                            srcs.forEach(su => videos.push({ url: su, quality: l.toUpperCase(), headers: this._hdrs(url) }));
                        }
                    });
                } catch (_) {}
            }
        }

        // Iframes fallback
        if (videos.length === 0) {
            const iRe = /<iframe[^>]+src="([^"]+)"/gi; let im;
            while ((im = iRe.exec(html)) !== null) {
                const src = im[1];
                if (src && !src.includes("javascript") && !src.includes("about:")) {
                    videos.push({ url: src, quality: "AUTO", headers: this._hdrs(url) });
                }
            }
        }

        return videos.length > 0 ? videos : [{ url: url, quality: "AUTO", headers: this._hdrs(url) }];
    }
}
