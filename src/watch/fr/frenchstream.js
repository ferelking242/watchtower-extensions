// ─────────────────────────────────────────────────────────────────────────────
// French-Stream — extension Watchtower v0.6.0
//
// Méthodes :
//   getPopular(page)            → films populaires
//   getLatestUpdates(page)      → dernières sorties
//   search(query, page, filters)→ recherche avec filtres
//   getDetail(url)              → fiche détail
//   getVideoList(url)           → liens vidéo
//   getForYou(page)             → « Pour vous »
//   getComments(url, page)      → commentaires
//   getFilterList()             → tous les filtres disponibles
//   getCustomLists()            → sections accueil
//   getCustomList(id, page)     → contenu d'une section
// ─────────────────────────────────────────────────────────────────────────────

const watchtowerSources = [{
    "name": "French-Stream",
    "langs": ["fr"],
    "ids": { "fr": 112837465 },
    "baseUrl": "https://french-stream.net",
    "apiUrl": "https://french-stream.net",
    "iconUrl": "https://french-stream.net/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.0.1",
    "login": false,
    "forYou": true,
    "pkgPath": "watch/fr/frenchstream.js",
    "editableBaseUrl": true,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "VF", "VOSTFR", "VO", "VFQ", "TrueFrench"],
    "subCategories": ["film", "serie"],
    "supportsForYou": true,
    "supportsComments": true,
    "prefs": [
        { "key": "username", "type": "text",     "label": "Nom d'utilisateur", "value": "", "hint": "Votre identifiant French-Stream" },
        { "key": "password", "type": "password", "label": "Mot de passe",       "value": "", "hint": "Votre mot de passe French-Stream" }
    ]
}];

const BASE_URL = "https://french-stream.net";

class DefaultExtension extends MProvider {
    constructor() { super(); }

    get baseUrl() {
        return new SharedPreferences().get("base_url") || BASE_URL.replace(/\/$/, "");
    }

    _getPref(key) { return new SharedPreferences().get(key) || null; }

    async _ensureLogin() {
        const username = this._getPref("username");
        const password = this._getPref("password");
        if (!username || !password) return;
        try {
            await new Client().post(this.baseUrl + "/index.php?do=login", {
                headers: Object.assign({}, this._hdrs(), { "Content-Type": "application/x-www-form-urlencoded" }),
                body: "login_name=" + encodeURIComponent(username) + "&login_password=" + encodeURIComponent(password) + "&login_submit=1&action=login"
            });
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
        const re = new RegExp("[?&]" + key + "=([^&]+)");
        const m  = re.exec(url);
        return m ? decodeURIComponent(m[1]) : null;
    }

    // ── Card parser — extracts title, url, image, language badge, rating, episode info ──
    _parseItems(html) {
        const items = [];
        const seen  = {};

        // Each .short block
        const blockRe = /<div[^>]+class="[^"]*\bshort\b[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;
        let bm;
        while ((bm = blockRe.exec(html)) !== null) {
            const block = bm[0];

            // URL from short-poster link
            const hrefM = /href="([^"]+(?:newsid=\d+|\/\d{4,}\/)[^"]*)"/i.exec(block);
            if (!hrefM) continue;
            const href = hrefM[1].startsWith("http") ? hrefM[1] : this.baseUrl + hrefM[1];
            if (seen[href]) continue;
            seen[href] = true;

            // Title
            const altM   = /alt="([^"]{2,})"/.exec(block);
            const titleM = /class="[^"]*short-title[^"]*"[^>]*>\s*<a[^>]*>([^<]{2,})<\/a>/i.exec(block);
            const title  = (altM && altM[1].trim()) || (titleM && titleM[1].trim()) || "";
            if (!title) continue;

            // Image
            const imgM = /<img[^>]+(?:data-src|src)="([^"]+)"/i.exec(block);
            const image = imgM ? imgM[1] : "";

            // Language badge: VF / VOSTFR / TrueFrench / VO
            let lang = "";
            const langM = /class="[^"]*(?:badge|label|flag|version)[^"]*"[^>]*>\s*([^<]{1,20})\s*</i.exec(block)
                       || /xfname=version-(?:film|serie)[^>]*xf=([^&"]+)/i.exec(block);
            if (langM) lang = decodeURIComponent(langM[1]).trim().toUpperCase();
            // Also try to parse from title suffix
            if (!lang) {
                const suffixM = /\b(VF|VOSTFR|VOSTA|VO|TrueFrench)\b/i.exec(title);
                if (suffixM) lang = suffixM[1].toUpperCase();
            }

            // Rating
            let rating = "";
            const ratingM = /(?:data-rating|rating-value|itemprop="ratingValue")[^>]*>([0-9.,]+)</i.exec(block)
                         || /<span[^>]+class="[^"]*(?:rating|note|score)[^"]*"[^>]*>([0-9][0-9.,]*)</.exec(block);
            if (ratingM) rating = ratingM[1].trim();

            // Episode count (for series cards)
            let epInfo = "";
            const epM = /(?:épisode|episode|ep\.?)\s*(\d+\s*(?:sur|\/|of)\s*\d+|\d+)/i.exec(block);
            if (epM) epInfo = epM[0].trim();

            // Quality badge
            let quality = "";
            const qualM = /\b(HD|4K|HDSCR|CAM|BDRIP|WEB-DL)\b/i.exec(block);
            if (qualM) quality = qualM[1].toUpperCase();

            items.push({
                name: title,
                link: href,
                imageUrl: image,
                // Extended metadata (flat fields supported by the engine)
                description: [lang, quality, epInfo].filter(Boolean).join(" · "),
                scanlator: lang || "",
                author: quality,
            });
        }

        // Fallback: classic short-poster links
        if (items.length === 0) {
            const re = /<a[^>]+class="short-poster[^"]*"([^>]*)>([\s\S]*?)<\/a>/gi;
            let m;
            while ((m = re.exec(html)) !== null) {
                const attrs = m[1];
                const inner = m[2];
                const hrefM = /href="([^"]+newsid=\d+[^"]*)"/.exec(attrs)
                           || /href="(https?:\/\/[^"]+\/\d{4,}[\/"][^"]*)"/.exec(attrs);
                const altM  = /alt="([^"]*)"/.exec(attrs);
                const imgM  = /<img[^>]+src="([^"]+)"/i.exec(inner);
                if (!hrefM) continue;
                const href2 = hrefM[1].charAt(0) === "/" ? this.baseUrl + hrefM[1] : hrefM[1];
                const title2 = altM ? altM[1].trim() : "";
                if (title2 && !seen[href2]) {
                    seen[href2] = true;
                    items.push({ name: title2, link: href2, imageUrl: imgM ? imgM[1] : "" });
                }
            }
        }

        return items;
    }

    _extractNewsId(url, html) {
        const fromUrl = this._getParam(url, "newsid");
        if (fromUrl) return fromUrl;
        const m = /(?:newsid|news_id)[='":\s]+(\d{3,})/i.exec(html || "");
        if (m) return m[1];
        const mPath = /[\/\-](\d{4,})[\/\-\.?]/.exec(url);
        if (mPath) return mPath[1];
        return null;
    }

    // ── Popular (films catalogue paginé) ─────────────────────────────────────
    async getPopular(page) {
        const url = this.baseUrl + "/films/page/" + page + "/";
        const r   = await new Client().get(url, this._hdrs());
        const items = this._parseItems(r.body);
        return { list: items, hasNextPage: items.length >= 10 };
    }

    // ── Latest updates (homepage paginée) ────────────────────────────────────
    async getLatestUpdates(page) {
        const url = page <= 1 ? this.baseUrl + "/" : this.baseUrl + "/page/" + page + "/";
        const r   = await new Client().get(url, this._hdrs());
        const items = this._parseItems(r.body);
        return { list: items, hasNextPage: items.length >= 10 };
    }

    // ── Search avec filtres ───────────────────────────────────────────────────
    async search(query, page, filters) {
        var url;

        // Build filter URL if no text query and filters are set
        if ((!query || query.trim() === "") && filters && filters.length > 0) {
            return this._searchByFilters(page, filters);
        }

        const from = (page - 1) * 20 + 1;
        url = this.baseUrl
            + "/?do=search&subaction=search&story=" + encodeURIComponent(query || "")
            + "&search_start=" + (page - 1)
            + "&full_search=0&result_from=" + from;

        // Append filter params to search
        if (filters && filters.length > 0) {
            for (var i = 0; i < filters.length; i++) {
                var f = filters[i];
                if (f && f.value && f.value !== "" && f.value !== "all") {
                    url += "&" + encodeURIComponent(f.name || f.id || "") + "=" + encodeURIComponent(f.value);
                }
            }
        }

        const r = await new Client().get(url, this._hdrs());
        const items = this._parseItems(r.body);
        return { list: items, hasNextPage: items.length >= 10 };
    }

    async _searchByFilters(page, filters) {
        // Build xfsearch URL from first active filter
        var xfname = "", xf = "", contentType = "";
        for (var i = 0; i < filters.length; i++) {
            var f = filters[i];
            if (!f || !f.value || f.value === "all" || f.value === "") continue;
            if (f.id === "type" || f.name === "type") {
                contentType = f.value;
            } else if (!xfname) {
                xfname = f.id || f.name || "";
                xf     = f.value;
            }
        }

        var baseSection = contentType === "serie" ? "/s-tv" : "/films";
        var url;
        if (xfname && xf) {
            url = this.baseUrl + "/xfsearch/" + xfname + "/" + encodeURIComponent(xf) + "/page/" + page + "/";
        } else {
            url = this.baseUrl + baseSection + "/page/" + page + "/";
        }

        try {
            const r = await new Client().get(url, this._hdrs());
            const items = this._parseItems(r.body);
            return { list: items, hasNextPage: items.length >= 10 };
        } catch (_) {
            return this.getPopular(page);
        }
    }

    // ── Filter list — tous les filtres du site ────────────────────────────────
    getFilterList() {
        return [
            {
                type: "select",
                id: "type",
                name: "Type de contenu",
                values: [
                    { value: "all",   label: "Tout"    },
                    { value: "film",  label: "Films"   },
                    { value: "serie", label: "Séries"  },
                ]
            },
            {
                type: "select",
                id: "version-film",
                name: "Version (Films)",
                values: [
                    { value: "all",           label: "Toutes"         },
                    { value: "VF",            label: "VF"             },
                    { value: "VOSTFR",        label: "VOSTFR"         },
                    { value: "VF%2BVOSTFR",   label: "VF + VOSTFR"   },
                    { value: "TrueFrench",    label: "True French"    },
                    { value: "French",        label: "French"         },
                    { value: "VO",            label: "VO"             },
                ]
            },
            {
                type: "select",
                id: "version-serie",
                name: "Version (Séries)",
                values: [
                    { value: "all",           label: "Toutes"         },
                    { value: "VF",            label: "VF"             },
                    { value: "VOSTFR",        label: "VOSTFR"         },
                    { value: "VF%2BVOSTFR",   label: "VF + VOSTFR"   },
                ]
            },
            {
                type: "select",
                id: "qualit",
                name: "Qualité",
                values: [
                    { value: "all",   label: "Toutes" },
                    { value: "HD",    label: "HD"     },
                    { value: "HDSCR", label: "HDSCR"  },
                    { value: "CAM",   label: "CAM"    },
                ]
            },
            {
                type: "select",
                id: "genre-1",
                name: "Genre",
                values: [
                    { value: "all",            label: "Tous"               },
                    { value: "action",         label: "Action"             },
                    { value: "animation",      label: "Animation"          },
                    { value: "aventure",       label: "Aventure"           },
                    { value: "biopic",         label: "Biopic"             },
                    { value: "comedie",        label: "Comédie"            },
                    { value: "comedie-romantique", label: "Comédie romantique" },
                    { value: "crime",          label: "Crime"              },
                    { value: "documentaire",   label: "Documentaire"       },
                    { value: "drame",          label: "Drame"              },
                    { value: "epouvante-horreur", label: "Horreur"        },
                    { value: "famille",        label: "Famille"            },
                    { value: "fantastique",    label: "Fantastique"        },
                    { value: "guerre",         label: "Guerre"             },
                    { value: "historique",     label: "Historique"         },
                    { value: "jeunesse",       label: "Jeunesse"           },
                    { value: "musical",        label: "Musical"            },
                    { value: "policier",       label: "Policier"           },
                    { value: "romantique",     label: "Romantique"         },
                    { value: "science-fiction","label": "Science-Fiction"  },
                    { value: "sport",          label: "Sport"              },
                    { value: "thriller",       label: "Thriller"           },
                    { value: "western",        label: "Western"            },
                ]
            },
            {
                type: "select",
                id: "lang",
                name: "Pays / Langue",
                values: [
                    { value: "all",         label: "Tous"          },
                    { value: "francais",    label: "Français"      },
                    { value: "americain",   label: "Américain"     },
                    { value: "anglais",     label: "Anglais"       },
                    { value: "allemand",    label: "Allemand"      },
                    { value: "espagnol",    label: "Espagnol"      },
                    { value: "coreen",      label: "Coréen"        },
                    { value: "japonais",    label: "Japonais"      },
                    { value: "turc",        label: "Turc"          },
                    { value: "chinois",     label: "Chinois"       },
                    { value: "indien",      label: "Indien"        },
                    { value: "italien",     label: "Italien"       },
                    { value: "arabe",       label: "Arabe"         },
                ]
            },
            {
                type: "select",
                id: "date-de-sortie",
                name: "Année de sortie",
                values: [
                    { value: "all",  label: "Toutes"  },
                    { value: "2026", label: "2026"    },
                    { value: "2025", label: "2025"    },
                    { value: "2024", label: "2024"    },
                    { value: "2023", label: "2023"    },
                    { value: "2022", label: "2022"    },
                    { value: "2021", label: "2021"    },
                    { value: "2020", label: "2020"    },
                    { value: "2019", label: "2019"    },
                    { value: "2018", label: "2018"    },
                    { value: "2015-2017", label: "2015–2017" },
                    { value: "2010-2014", label: "2010–2014" },
                    { value: "2000-2009", label: "2000–2009" },
                    { value: "1990-1999", label: "Années 90" },
                    { value: "1980-1989", label: "Années 80" },
                ]
            },
            {
                type: "select",
                id: "ftagz",
                name: "Thème / Tag",
                values: [
                    { value: "all",            label: "Tous"              },
                    { value: "super-heros",    label: "Super-héros"       },
                    { value: "zombie",         label: "Zombie"            },
                    { value: "espionnage",     label: "Espionnage"        },
                    { value: "serial-killer",  label: "Serial Killer"     },
                    { value: "vampire",        label: "Vampire"           },
                    { value: "voyage-temps",   label: "Voyage dans le temps" },
                    { value: "post-apocalyptique", label: "Post-Apocalyptique" },
                    { value: "survie",         label: "Survie"            },
                ]
            },
        ];
    }

    // ── Sections accueil ─────────────────────────────────────────────────────
async getCustomList(listId, page) {
        var url;
        switch (listId) {
            case "trending":
                // Mix home + films pour la section vedette
                if (page <= 1) {
                    try {
                        const seen = {}; const list = [];
                        const homeR  = await new Client().get(this.baseUrl + "/", this._hdrs());
                        const filmsR = await new Client().get(this.baseUrl + "/films/page/1/", this._hdrs());
                        this._parseItems(homeR.body).forEach(i  => { if (!seen[i.link]) { seen[i.link]=true; list.push(i); } });
                        this._parseItems(filmsR.body).forEach(i => { if (!seen[i.link]) { seen[i.link]=true; list.push(i); } });
                        return { list: list.slice(0, 30), hasNextPage: false };
                    } catch (_) { return this.getLatestUpdates(1); }
                }
                url = this.baseUrl + "/page/" + page + "/";
                break;
            case "films":
                url = this.baseUrl + "/films/page/" + page + "/";
                break;
            case "series":
                // Correct URL: /s-tv/ (fourni par l'utilisateur)
                url = this.baseUrl + "/s-tv/page/" + page + "/";
                break;
            case "films_recent":
                url = this.baseUrl + "/films/page/" + page + "/?orderby=date";
                break;
            case "series_recent":
                url = this.baseUrl + "/s-tv/page/" + page + "/?orderby=date";
                break;
            case "vf":
                url = this.baseUrl + "/xfsearch/version-film/VF/page/" + page + "/";
                break;
            case "vostfr":
                url = this.baseUrl + "/xfsearch/version-film/VOSTFR/page/" + page + "/";
                break;
            case "animation":
                url = this.baseUrl + "/xfsearch/genre-1/animation/page/" + page + "/";
                break;
            case "action":
                url = this.baseUrl + "/xfsearch/genre-1/action/page/" + page + "/";
                break;
            case "comedie":
                url = this.baseUrl + "/xfsearch/genre-1/comedie/page/" + page + "/";
                break;
            case "horreur":
                url = this.baseUrl + "/xfsearch/genre-1/epouvante-horreur/page/" + page + "/";
                break;
            case "thriller":
                url = this.baseUrl + "/xfsearch/genre-1/thriller/page/" + page + "/";
                break;
            case "science_fiction":
                url = this.baseUrl + "/xfsearch/genre-1/science-fiction/page/" + page + "/";
                break;
            default:
                return this.getPopular(page);
        }
        try {
            const r = await new Client().get(url, this._hdrs());
            const items = this._parseItems(r.body);
            return { list: items, hasNextPage: items.length >= 10 };
        } catch (_) {
            return this.getPopular(page);
        }
    }

    // ── Pour vous ────────────────────────────────────────────────────────────
    async getForYou(page) {
        if (page <= 1) {
            const seen = {}; const list = [];
            const add = (html) => {
                this._parseItems(html).forEach(i => { if (!seen[i.link]) { seen[i.link]=true; list.push(i); } });
            };
            try {
                const [homeR, filmsR] = await Promise.all([
                    new Client().get(this.baseUrl + "/", this._hdrs()),
                    new Client().get(this.baseUrl + "/films/page/1/", this._hdrs()),
                ]);
                add(homeR.body);
                add(filmsR.body);
            } catch (_) { return this.getLatestUpdates(1); }
            try {
                const seriesR = await new Client().get(this.baseUrl + "/s-tv/page/1/", this._hdrs());
                add(seriesR.body);
            } catch (_) {}
            return { list: list.slice(0, 40), hasNextPage: list.length >= 10 };
        }
        return this.getLatestUpdates(page - 1);
    }

    // ── Comments ─────────────────────────────────────────────────────────────
    async getComments(url, page) {
        var newsId = this._getParam(url, "newsid");
        if (!newsId) {
            try {
                const pr = await new Client().get(url, this._hdrs());
                newsId = this._extractNewsId(url, pr.body);
            } catch (_) {}
        }
        if (!newsId) return { list: [], hasNextPage: false };

        const endpoints = [
            "/engine/ajax/getcomments.php?news_id=" + newsId + "&page=" + page,
            "/engine/ajax/comments.php?id=" + newsId + "&p=" + page,
        ];
        for (var ei = 0; ei < endpoints.length; ei++) {
            try {
                const r = await new Client().get(this.baseUrl + endpoints[ei], this._ajaxHdrs(url));
                if (!r.body || r.body.length < 5) continue;
                const data = JSON.parse(r.body);
                const cmtList = Array.isArray(data) ? data : (data.comments || data.list || data.data || []);
                if (!Array.isArray(cmtList) || cmtList.length === 0) continue;
                return {
                    list: cmtList.map((c, idx) => ({
                        id: String(c.id || c.comment_id || idx),
                        username: c.name || c.author || c.user || "Anonyme",
                        avatarUrl: c.avatar || "",
                        content: c.text || c.message || c.comment || c.body || "",
                        timestamp: c.date || c.created_at || "",
                        score: Number(c.likes || c.score || 0)
                    })),
                    hasNextPage: cmtList.length >= 20
                };
            } catch (_) {}
        }
        return { list: [], hasNextPage: false };
    }

    _parseJsonOrJs(str) {
        if (!str || str.length < 3) return null;
        str = str.trim();
        if (str.charAt(0) === '<') return null;
        try { return JSON.parse(str); } catch (_) {}
        try {
            const s = str.replace(/^(?:var|let|const)\s+\w+\s*=\s*/, '').replace(/^window\.\w+\s*=\s*/, '').replace(/;?\s*$/, '');
            return JSON.parse(s);
        } catch (_) {}
        return null;
    }

    // ── Detail ───────────────────────────────────────────────────────────────
    async getDetail(url) {
        await this._ensureLogin();
        const r    = await new Client().get(url, this._hdrs());
        const html = r.body;

        const newsId  = this._extractNewsId(url, html) || "";
        const isSerie = html.indexOf('id="serie-data"') !== -1;

        const titleM  = /data-title="([^"]+)"/.exec(html);
        const title   = titleM ? titleM[1].trim() : "";

        const imgM    = /data-affiche="([^"]+)"/.exec(html);
        const image   = imgM ? imgM[1] : "";

        const genresM = /<span class="genres">([\s\S]*?)<\/span>/i.exec(html);
        const genres  = genresM
            ? genresM[1].replace(/<[^>]+>/g, "").split(",").map(g => g.trim()).filter(Boolean)
            : [];

        const yearM   = /xfname=date-de-sortie[^>]+>(\d{4})</.exec(html);
        const year    = yearM ? yearM[1] : "";

        const rtM     = /<span class="runtime">[^\d]*(\d[^<]*)/i.exec(html);
        const runtime = rtM ? rtM[1].trim() : "";

        const descM   = /class="desc-text"[^>]*>([\s\S]*?)<\/p>/i.exec(html)
                     || /<div[^>]+fdesc[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i.exec(html);
        const desc    = descM ? descM[1].replace(/<[^>]+>/g, "").trim() : "";

        const ratingM = /itemprop="ratingValue"[^>]*>([0-9.,]+)</.exec(html)
                     || /<span[^>]+class="[^"]*(?:rating|note|score)[^"]*"[^>]*>\s*([0-9][0-9.,]*)\s*</.exec(html)
                     || /data-rating="([0-9.,]+)"/.exec(html);
        const rating  = ratingM ? ratingM[1].trim() : "";

        const castM   = /(?:Acteurs?|Casting|Cast)\s*:[^<]*<[^>]+>([\s\S]*?)<\/(?:p|div|span)>/i.exec(html);
        const cast    = castM ? castM[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";

        // Language from page
        const langM   = /xfname=version-(?:film|serie)[^>]*>([^<]{1,30})</.exec(html);
        const lang    = langM ? langM[1].trim() : "";

        const gallery = [];
        const gBlockM = /<div[^>]+class="[^"]*(?:screens|screenshots|gallery|preview)[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(html);
        if (gBlockM) {
            const gre = /<img[^>]+(?:data-src|src)="([^"]+)"/gi; let gm;
            while ((gm = gre.exec(gBlockM[1])) !== null) {
                if (gm[1].startsWith("http") && !/pixel|1x1|transparent|blank|icon|logo/i.test(gm[1])) gallery.push(gm[1]);
            }
        }
        const fullDesc = gallery.length > 0 ? desc + "\n__GALLERY__:" + gallery.slice(0,10).join("||") : desc;
        const metaLine = [runtime, year, lang ? "★ " + rating + " · " + lang : rating ? "★ " + rating : ""].filter(Boolean).join(" — ");

        if (!isSerie) {
            return {
                name: title, imageUrl: image, description: fullDesc,
                genres: genres, status: 4, author: year, artist: cast, rating: rating,
                chapters: [{ name: title || "Regarder", url: url, dateUpload: "", description: metaLine, scanlator: lang || "VF / VOSTFR" }]
            };
        }

        // ── Série : récupération des saisons/épisodes ──────────────────────
        var tagz = "";
        const tagzM = /data-tagz="([^"]+)"/.exec(html);
        if (tagzM) {
            tagz = tagzM[1];
        } else if (newsId) {
            try {
                const apiR = await new Client().get(this.baseUrl + "/engine/ajax/film_api.php?id=" + newsId, this._ajaxHdrs(url));
                const api = JSON.parse(apiR.body);
                tagz = (api && api.meta && api.meta.tagz) ? api.meta.tagz : "";
            } catch (_) {}
        }

        const chapters = [];

        if (tagz) {
            try {
                const seasonsR = await new Client().get(this.baseUrl + "/engine/ajax/get_seasons.php?serie_tag=" + encodeURIComponent(tagz), this._ajaxHdrs(url));
                const seasons  = JSON.parse(seasonsR.body);

                for (var si = 0; si < seasons.length; si++) {
                    const season = seasons[si];
                    const v = Math.floor(Date.now() / 30000);
                    var epData = null;

                    const paths = [
                        "/static/series/" + season.id + ".js?v=" + v,
                        "/data/eps_" + season.id + ".txt?v=" + v,
                        "/ep-data.php?id=" + season.id + "&format=js&v=" + v
                    ];
                    for (var pi = 0; pi < paths.length; pi++) {
                        try {
                            const epR = await new Client().get(this.baseUrl + paths[pi], this._hdrs(url));
                            if (epR.body && epR.body.length > 5) { epData = JSON.parse(epR.body); break; }
                        } catch (_) {}
                    }
                    if (!epData) continue;

                    const numSet = {};
                    const langs  = ["vf", "vostfr", "vo"];
                    for (var li = 0; li < langs.length; li++) {
                        const langData = epData[langs[li]];
                        if (!langData) continue;
                        Object.keys(langData).forEach(k => { numSet[k] = true; });
                    }

                    const nums = Object.keys(numSet).map(k => parseInt(k,10)).filter(n => !isNaN(n)).sort((a,b) => a-b);
                    const sLabel = /\bSaison\s*\d+.*/i.exec(season.title);
                    const sName  = sLabel ? sLabel[0].trim() : season.title;

                    for (var ni = 0; ni < nums.length; ni++) {
                        const n = nums[ni];
                        const epLangs = [];
                        for (var li2 = 0; li2 < langs.length; li2++) {
                            const ld = epData[langs[li2]];
                            if (ld && ld[String(n)]) epLangs.push(langs[li2].toUpperCase());
                        }
                        chapters.push({
                            name: sName + " — Épisode " + n + (epLangs.length ? " (" + epLangs.join("/") + ")" : ""),
                            url: url + (url.indexOf("?") >= 0 ? "&" : "?") + "s=" + season.id + "&ep=" + n,
                            dateUpload: "",
                            description: "Épisode " + n + " sur " + nums.length,
                            scanlator: epLangs.join(" / ") || ""
                        });
                    }
                }
            } catch (_) {}
        }

        if (chapters.length === 0) {
            chapters.push({ name: "Regarder", url: url, dateUpload: "", description: metaLine, scanlator: lang || "" });
        }

        return { name: title, imageUrl: image, description: fullDesc, genres: genres, status: 1, author: year, artist: cast, rating: rating, chapters: chapters };
    }

    _resolveUrl(value, base) {
        if (typeof value !== "string") return "";
        const candidate = value.trim().replace(/\\\//g, "/").replace(/&amp;/g, "&");
        if (!candidate || /^(?:javascript|data|blob):/i.test(candidate)) return "";
        if (candidate.charAt(0) === "/" && candidate.charAt(1) === "/") return "https:" + candidate;
        if (/^https?:\/\//i.test(candidate)) return candidate;

        const reference = base || this.baseUrl + "/";
        const originM = /^([a-z][a-z0-9+.-]*:\/\/[^/]+)/i.exec(reference);
        const origin = originM ? originM[1] : this.baseUrl;
        if (candidate.charAt(0) === "/") return origin + candidate;
        const path = reference.split(/[?#]/)[0];
        const directory = path.substring(0, path.lastIndexOf("/") + 1);
        return directory + candidate.replace(/^\.?\//, "");
    }

    _addVideo(videos, rawUrl, quality, referer) {
        const videoUrl = this._resolveUrl(rawUrl, referer);
        if (!videoUrl || !/\.(?:m3u8|mp4|m4v)(?:$|[?#])/i.test(videoUrl)) return false;
        if (videos.some(video => video.url === videoUrl)) return false;
        videos.push({
            url: videoUrl,
            originalUrl: videoUrl,
            quality: String(quality || "AUTO").trim(),
            headers: this._hdrs(referer || videoUrl)
        });
        return true;
    }

    _collectPlayableVideos(html, referer, quality) {
        const videos = [];
        const add = (value, label) => this._addVideo(videos, value, label || quality, referer);
        const body = String(html || "")
            .replace(/\\\//g, "/")
            .replace(/&amp;/g, "&");
        const markup = body.replace(/&quot;/g, '"');

        const playerM = /(?:var|let|const)\s+(?:playerData|videoData|streamData)\s*=\s*(\{[\s\S]*?\});/.exec(body)
                     || /data-streams="([^"]+)"/.exec(body);
        if (playerM) {
            try {
                const data = JSON.parse(playerM[1].replace(/&quot;/g, '"'));
                if (data.file || data.src) add(data.file || data.src, data.label || data.quality);
                if (Array.isArray(data.sources)) {
                    data.sources.forEach(source => {
                        if (source && typeof source === "object") {
                            add(source.file || source.src || source.url, source.label || source.quality);
                        }
                    });
                }
            } catch (_) {}
        }

        const mediaTagRe = /<(?:video|source)\b[^>]*\b(?:src|data-src)\s*=\s*(["'])(.*?)\1/gi;
        let tagM;
        while ((tagM = mediaTagRe.exec(markup)) !== null) add(tagM[2]);

        const directRe = /(?:https?:)?\/\/[^\s"'<>]+\.(?:m3u8|mp4|m4v)(?:\?[^\s"'<>]*)?/gi;
        let directM;
        while ((directM = directRe.exec(body)) !== null) add(directM[0]);

        videos.sort((a, b) => {
            const aHls = /\.m3u8(?:$|[?#])/i.test(a.url) ? 0 : 1;
            const bHls = /\.m3u8(?:$|[?#])/i.test(b.url) ? 0 : 1;
            return aHls - bHls;
        });
        return videos;
    }

    _collectPlayerEmbeds(html, base) {
        const embeds = [];
        const iframeRe = /<iframe\b[^>]*\b(?:src|data-src)\s*=\s*(["'])(.*?)\1/gi;
        let match;
        while ((match = iframeRe.exec(String(html || ""))) !== null) {
            const raw = match[2].trim();
            if (!raw) continue;
            const resolved = this._resolveUrl(raw, base);
            if (resolved && resolved !== base && !embeds.includes(resolved)) embeds.push(resolved);
        }
        return embeds;
    }

    async _resolvePlayerUrl(rawUrl, referer, quality) {
        const playerUrl = this._resolveUrl(rawUrl, referer);
        if (!playerUrl) return [];

        const direct = [];
        if (this._addVideo(direct, playerUrl, quality, referer)) return direct;

        try {
            const response = await new Client().get(playerUrl, this._hdrs(referer || playerUrl));
            return this._collectPlayableVideos(response.body, response.url || playerUrl, quality);
        } catch (_) {
            return [];
        }
    }

    _preferredVideoLanguages() {
        const preferred = (this._getPref("preferred_lang") || "AUTO").trim().toUpperCase();
        const orders = {
            "VF": ["vff", "vf", "default"],
            "VOSTFR": ["vostfr", "default", "vff", "vf"],
            "VO": ["vo", "default", "vff", "vf"],
            "VFQ": ["vfq", "vff", "vf", "default"],
            "TRUEFRENCH": ["truefrench", "vff", "default", "vf"],
            "AUTO": ["default", "vff", "vf", "vostfr", "vo", "vfq"]
        };
        return orders[preferred] || orders.AUTO;
    }

    async _getVideosFromFilmApi(newsId, episodeUrl) {
        if (!newsId) return [];
        try {
            const response = await new Client().get(
                this.baseUrl + "/engine/ajax/film_api.php?id=" + encodeURIComponent(newsId),
                this._ajaxHdrs(episodeUrl)
            );
            const data = this._parseJsonOrJs(response.body);
            const players = data && data.players;
            if (!players || typeof players !== "object") return [];

            const providers = ["vidzy", "premium", "uqload", "dood", "voe", "filmoon"];
            const qualityByLanguage = {
                "default": "AUTO",
                "vff": "VF",
                "vf": "VF",
                "vostfr": "VOSTFR",
                "vo": "VO",
                "vfq": "VFQ",
                "truefrench": "TrueFrench"
            };
            const languages = this._preferredVideoLanguages();
            for (let li = 0; li < languages.length; li++) {
                const language = languages[li];
                for (let pi = 0; pi < providers.length; pi++) {
                    const provider = players[providers[pi]];
                    if (!provider || typeof provider !== "object") continue;
                    let value = provider[language];
                    if (!value) continue;
                    if (typeof value === "object" && !Array.isArray(value)) {
                        value = value.file || value.src || value.url;
                    }
                    const links = Array.isArray(value) ? value : [value];
                    for (let vi = 0; vi < links.length; vi++) {
                        const resolved = await this._resolvePlayerUrl(
                            links[vi],
                            episodeUrl,
                            qualityByLanguage[language] || "AUTO"
                        );
                        if (resolved.length > 0) return resolved.slice(0, 1);
                    }
                }
            }
        } catch (_) {}
        return [];
    }

    async _getVideosFromSeriesEpisode(url, seasonId, episodeNumber, pageUrl) {
        const cacheVersion = Math.floor(Date.now() / 30000);
        try {
            const response = await new Client().get(
                this.baseUrl + "/static/series/" + seasonId + ".js?v=" + cacheVersion,
                this._hdrs(pageUrl)
            );
            const data = this._parseJsonOrJs(response.body);
            if (!data || typeof data !== "object") return [];

            const qualityByLanguage = {
                "vf": "VF",
                "vostfr": "VOSTFR",
                "vo": "VO"
            };
            const preferred = (this._getPref("preferred_lang") || "AUTO").trim().toLowerCase();
            const languages = preferred === "vostfr" ? ["vostfr", "vf", "vo"]
                : preferred === "vo" ? ["vo", "vf", "vostfr"]
                : ["vf", "vostfr", "vo"];
            for (let li = 0; li < languages.length; li++) {
                const language = languages[li];
                const entries = data[language];
                const raw = entries && (entries[String(episodeNumber)] || entries[episodeNumber]);
                if (!raw) continue;
                const links = Array.isArray(raw) ? raw : [raw];
                for (let vi = 0; vi < links.length; vi++) {
                    const entry = links[vi];
                    const link = entry && typeof entry === "object"
                        ? (entry.file || entry.src || entry.url)
                        : entry;
                    const resolved = await this._resolvePlayerUrl(
                        link,
                        pageUrl || url,
                        qualityByLanguage[language] || "AUTO"
                    );
                    if (resolved.length > 0) return resolved.slice(0, 1);
                }
            }
        } catch (_) {}
        return [];
    }

    // ── Video list ───────────────────────────────────────────────────────────
    async getVideoList(url) {
        await this._ensureLogin();
        const response = await new Client().get(url, this._hdrs(url));
        const html = response.body || "";
        const pageUrl = response.url || url;

        const directVideos = this._collectPlayableVideos(html, pageUrl, "AUTO");
        if (directVideos.length > 0) return directVideos;

        const embeds = this._collectPlayerEmbeds(html, pageUrl);
        for (let i = 0; i < embeds.length; i++) {
            const resolved = await this._resolvePlayerUrl(embeds[i], pageUrl, "AUTO");
            if (resolved.length > 0) return resolved.slice(0, 1);
        }

        const episodeMatch = /[?&]ep=(\d+)/.exec(url);
        const seasonMatch = /[?&]s=(\d+)/.exec(url);
        if (episodeMatch && seasonMatch) {
            const episodeVideos = await this._getVideosFromSeriesEpisode(
                url,
                seasonMatch[1],
                episodeMatch[1],
                pageUrl
            );
            if (episodeVideos.length > 0) return episodeVideos;
        }

        const newsId = this._extractNewsId(url, html);
        return this._getVideosFromFilmApi(newsId, pageUrl);
    }

    getSourcePreferences() {
        return [
            {
                key: "base_url",
                editTextPreference: {
                    title: "URL du site",
                    summary: "Adresse du site French-Stream. Changez si le domaine est migré.",
                    value: BASE_URL,
                    dialogTitle: "URL du site",
                    dialogMessage: `URL actuelle : ${BASE_URL}`
                }
            },
            {
                key: "preferred_lang",
                listPreference: {
                    title: "Langue préférée",
                    summary: "Langue prioritaire quand plusieurs versions sont disponibles (VF, VOSTFR, VO). La langue choisie est affichée en premier.",
                    valueIndex: 0,
                    entries: ["VF — Français (recommandé)", "VOSTFR — VOST en Français", "VO — Version Originale", "VFQ — Français de qualité", "TrueFrench — Doublage français officiel", "Auto (toutes les langues)"],
                    entryValues: ["VF", "VOSTFR", "VO", "VFQ", "TrueFrench", "AUTO"]
                }
            },
            {
                key: "default_quality",
                listPreference: {
                    title: "Qualité vidéo par défaut",
                    summary: "La qualité sélectionnée est prioritaire. Si elle n'est pas disponible, la qualité la plus proche est choisie automatiquement.",
                    valueIndex: 0,
                    entries: ["Auto (recommandé)", "1080p — Full HD", "720p — HD", "480p — SD", "360p — Faible"],
                    entryValues: ["AUTO", "1080", "720", "480", "360"]
                }
            },
            {
                key: "content_filter",
                listPreference: {
                    title: "Type de contenu",
                    summary: "Filtrer l'accueil et les listes par type de contenu",
                    valueIndex: 0,
                    entries: ["Tout (films + séries)", "Films uniquement", "Séries uniquement", "Animes uniquement"],
                    entryValues: ["all", "film", "serie", "anime"]
                }
            },
            {
                key: "username",
                editTextPreference: {
                    title: "Nom d'utilisateur",
                    summary: "Identifiant de votre compte French-Stream. Laisser vide si pas de compte.",
                    value: "",
                    dialogTitle: "Identifiant French-Stream",
                    dialogMessage: "Saisissez votre nom d'utilisateur"
                }
            },
            {
                key: "password",
                editTextPreference: {
                    title: "Mot de passe",
                    summary: "Mot de passe de votre compte French-Stream. Laisser vide si pas de compte.",
                    value: "",
                    dialogTitle: "Mot de passe French-Stream",
                    dialogMessage: "Saisissez votre mot de passe"
                }
            },
            {
                key: "auto_login",
                listPreference: {
                    title: "Connexion automatique",
                    summary: "Se connecter automatiquement au démarrage si vos identifiants sont renseignés",
                    valueIndex: 0,
                    entries: ["Activé (recommandé)", "Désactivé"],
                    entryValues: ["true", "false"]
                }
            }
        ];
    }
}
