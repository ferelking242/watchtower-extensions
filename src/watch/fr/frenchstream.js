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
    "baseUrl": "https://french-stream.one",
    "apiUrl": "https://french-stream.one",
    "iconUrl": "https://raw.githubusercontent.com/ferelking242/Watchtower-extensions/main/extensions/watch/icon/fr.frenchstream.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "0.6.0",
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

const BASE_URL = "https://french-stream.one";

class DefaultExtension extends MProvider {
    constructor() { super(); }

    get baseUrl() {
        const p = this.source.prefs ? this.source.prefs.find(x => x.key === "base_url") : null;
        return (p && p.value) ? p.value.replace(/\/$/, "") : BASE_URL.replace(/\/$/, "");
    }

    _getPref(key) {
        const p = this.source.prefs ? this.source.prefs.find(x => x.key === key) : null;
        return (p && p.value) ? p.value : null;
    }

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
        const r   = await new Client().get(url, { headers: this._hdrs() });
        const items = this._parseItems(r.body);
        return { list: items, hasNextPage: items.length >= 10 };
    }

    // ── Latest updates (homepage paginée) ────────────────────────────────────
    async getLatestUpdates(page) {
        const url = page <= 1 ? this.baseUrl + "/" : this.baseUrl + "/page/" + page + "/";
        const r   = await new Client().get(url, { headers: this._hdrs() });
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

        const r = await new Client().get(url, { headers: this._hdrs() });
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
            const r = await new Client().get(url, { headers: this._hdrs() });
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
    getCustomLists() {
        return [
            { id: "trending",       name: "🔥 À l'affiche"           },
            { id: "films",          name: "🎬 Films"                  },
            { id: "series",         name: "📺 Séries"                 },
            { id: "films_recent",   name: "🆕 Films récents"          },
            { id: "series_recent",  name: "🆕 Séries récentes"        },
            { id: "vf",             name: "🇫🇷 Version Française"      },
            { id: "vostfr",         name: "🌐 VOSTFR"                 },
            { id: "animation",      name: "🎭 Animation"              },
            { id: "action",         name: "💥 Action"                 },
            { id: "comedie",        name: "😂 Comédie"                },
            { id: "horreur",        name: "👻 Horreur"                },
            { id: "thriller",       name: "🔪 Thriller"               },
            { id: "science_fiction",name: "🚀 Science-Fiction"        },
        ];
    }

    async getCustomList(listId, page) {
        var url;
        switch (listId) {
            case "trending":
                // Mix home + films pour la section vedette
                if (page <= 1) {
                    try {
                        const seen = {}; const list = [];
                        const homeR  = await new Client().get(this.baseUrl + "/",              { headers: this._hdrs() });
                        const filmsR = await new Client().get(this.baseUrl + "/films/page/1/", { headers: this._hdrs() });
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
            const r = await new Client().get(url, { headers: this._hdrs() });
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
                    new Client().get(this.baseUrl + "/",              { headers: this._hdrs() }),
                    new Client().get(this.baseUrl + "/films/page/1/", { headers: this._hdrs() }),
                ]);
                add(homeR.body);
                add(filmsR.body);
            } catch (_) { return this.getLatestUpdates(1); }
            try {
                const seriesR = await new Client().get(this.baseUrl + "/s-tv/page/1/", { headers: this._hdrs() });
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
                const pr = await new Client().get(url, { headers: this._hdrs() });
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
                const r = await new Client().get(this.baseUrl + endpoints[ei], { headers: this._ajaxHdrs(url) });
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
        const r    = await new Client().get(url, { headers: this._hdrs() });
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
                const apiR = await new Client().get(this.baseUrl + "/engine/ajax/film_api.php?id=" + newsId, { headers: this._ajaxHdrs(url) });
                const api = JSON.parse(apiR.body);
                tagz = (api && api.meta && api.meta.tagz) ? api.meta.tagz : "";
            } catch (_) {}
        }

        const chapters = [];

        if (tagz) {
            try {
                const seasonsR = await new Client().get(this.baseUrl + "/engine/ajax/get_seasons.php?serie_tag=" + encodeURIComponent(tagz), { headers: this._ajaxHdrs(url) });
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
                            const epR = await new Client().get(this.baseUrl + paths[pi], { headers: this._hdrs(url) });
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
                            url: url + "?s=" + season.id + "&ep=" + n,
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

    // ── Video list ───────────────────────────────────────────────────────────
    async getVideoList(url) {
        await this._ensureLogin();
        const r    = await new Client().get(url, { headers: this._hdrs(url) });
        const html = r.body;
        const videos = [];

        // Strategy 1 — Embedded player data JSON
        const playerM = /(?:var|let|const)\s+(?:playerData|videoData|streamData)\s*=\s*(\{[\s\S]*?\});/.exec(html)
                     || /data-streams="([^"]+)"/.exec(html);
        if (playerM) {
            try {
                const pd = JSON.parse(playerM[1].replace(/&quot;/g, '"'));
                if (pd.file || pd.src) videos.push({ url: pd.file || pd.src, quality: pd.label || "AUTO", headers: this._hdrs(url) });
                if (pd.sources) pd.sources.forEach(s => videos.push({ url: s.file || s.src, quality: s.label || "AUTO", headers: this._hdrs(url) }));
            } catch (_) {}
        }

        // Strategy 2 — m3u8 / mp4 direct links in source
        const hlsRe = /https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4)(?:\?[^\s"'<>]*)?/gi;
        let hm;
        while ((hm = hlsRe.exec(html)) !== null) {
            const streamUrl = hm[0].replace(/&amp;/g, "&");
            if (!videos.find(v => v.url === streamUrl)) videos.push({ url: streamUrl, quality: "AUTO", headers: this._hdrs(url) });
        }

        // Strategy 3 — iframes (external players)
        if (videos.length === 0) {
            const iRe = /<iframe[^>]+src="([^"]+)"/gi;
            let im;
            while ((im = iRe.exec(html)) !== null) {
                const src = im[1];
                if (src && !src.includes("javascript") && !src.includes("about:")) {
                    videos.push({ url: src, quality: "AUTO", headers: this._hdrs(url) });
                }
            }
        }

        // Strategy 4 — episode language variants from URL params
        const epM    = /[?&]ep=(\d+)/.exec(url);
        const sIdM   = /[?&]s=(\d+)/.exec(url);
        if (epM && sIdM && videos.length === 0) {
            const newsId = this._extractNewsId(url, html);
            if (newsId) {
                const v = Math.floor(Date.now() / 30000);
                try {
                    const epR = await new Client().get(this.baseUrl + "/static/series/" + sIdM[1] + ".js?v=" + v, { headers: this._hdrs(url) });
                    const epData = JSON.parse(epR.body);
                    const langs  = ["vf", "vostfr", "vo"];
                    for (var li = 0; li < langs.length; li++) {
                        const ld = epData[langs[li]];
                        if (ld && ld[epM[1]]) {
                            const streamUrls = Array.isArray(ld[epM[1]]) ? ld[epM[1]] : [ld[epM[1]]];
                            streamUrls.forEach(su => videos.push({ url: su, quality: langs[li].toUpperCase(), headers: this._hdrs(url) }));
                        }
                    }
                } catch (_) {}
            }
        }

        return videos.length > 0 ? videos : [{ url: url, quality: "AUTO", headers: this._hdrs(url) }];
    }
}
