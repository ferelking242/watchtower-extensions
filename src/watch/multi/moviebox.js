const watchtowerSources = [{
    "name": "MovieBox",
    "lang": "multi",
    "baseUrl": "https://themoviebox.xyz",
    "apiUrl": "https://h5-api.aoneroom.com",
    "iconUrl": "https://h5-static.aoneroom.com/oneroomProject/icon/moviebox-official.jpg",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "3.0.0",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "watch/multi/moviebox.js",
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "hasSubtitles": true,
    "hasDub": true,
    "notes": "MovieBox — Films & Séries via API aoneroom. Sous-titres multi-langues."
}];

// ══════════════════════════════════════════════════════════════
//  MovieBox — Extension v3.0.0
//
//  API publique (sans token) :
//    GET /wefeed-h5api-bff/home            → contenu home
//    GET /wefeed-h5api-bff/detail?detailPath=X → détail
//    GET /wefeed-h5api-bff/subject/play?…  → flux vidéo
//
//  En-têtes obligatoires : Origin + Referer = lok-lok.cc
// ══════════════════════════════════════════════════════════════

class DefaultExtension extends MProvider {

    // ── Constantes ────────────────────────────────────────────

    static get API()  { return "https://h5-api.aoneroom.com"; }
    static get BASE() { return "https://lok-lok.cc"; }

    // ── En-têtes ──────────────────────────────────────────────

    _hdrs() {
        return {
            "Accept":        "application/json",
            "Origin":        DefaultExtension.BASE,
            "Referer":       DefaultExtension.BASE + "/",
            "User-Agent":    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
            "X-Client-Info": JSON.stringify({ timezone: "UTC" })
        };
    }

    // ── HTTP ──────────────────────────────────────────────────

    async _get(path) {
        const res = await new Client().get(DefaultExtension.API + path, this._hdrs());
        try { return JSON.parse(res.body); } catch (_) { return null; }
    }

    // ── Extraction des sujets depuis /home ────────────────────
    // Retourne un tableau plat de tous les sujets des sections SUBJECTS_MOVIE

    async _homeSubjects() {
        const j = await this._get("/wefeed-h5api-bff/home");
        if (!j || j.code !== 0 || !j.data) return [];
        const ops = j.data.operatingList || [];
        const all = [];
        for (const op of ops) {
            if (!op.subjects || !op.subjects.length) continue;
            for (const s of op.subjects) {
                s._sectionTitle = op.title || "";
                all.push(s);
            }
        }
        return all;
    }

    // Déduplique par subjectId
    _dedup(items) {
        const seen = new Set();
        return items.filter(s => {
            if (seen.has(s.subjectId)) return false;
            seen.add(s.subjectId);
            return true;
        });
    }

    // Convertit un sujet en item Watchtower
    _toItem(s) {
        const link = JSON.stringify({
            subjectId:   s.subjectId,
            detailPath:  s.detailPath || "",
            subjectType: s.subjectType || 1
        });
        return {
            name:        s.title || "Unknown",
            imageUrl:    (s.cover && s.cover.url) || s.horizontalCover || s.verticalCover || "",
            link,
            description: s.description || ""
        };
    }

    // Pagine un tableau côté client (30 items/page)
    _paginate(items, page) {
        const PER = 30;
        const p   = Math.max(1, page || 1);
        const slice = items.slice((p - 1) * PER, p * PER);
        return { list: slice.map(s => this._toItem(s)), hasNextPage: p * PER < items.length };
    }

    // ── Browse ────────────────────────────────────────────────

    async getPopular(page) {
        const all = this._dedup(await this._homeSubjects());
        return this._paginate(all, page);
    }

    async getLatestUpdates(page) {
        const all = this._dedup(await this._homeSubjects()).sort((a, b) => {
            const da = a.releaseDate || "";
            const db = b.releaseDate || "";
            return db.localeCompare(da);
        });
        return this._paginate(all, page);
    }

    async search(query, page) {
        if (!query || !query.trim()) return this.getPopular(page);
        const q   = query.trim().toLowerCase();
        const all = this._dedup(await this._homeSubjects()).filter(
            s => (s.title || "").toLowerCase().includes(q) ||
                 (s.description || "").toLowerCase().includes(q) ||
                 (s.genre || "").toLowerCase().includes(q)
        );
        return this._paginate(all, page);
    }

    // ── Sections home ─────────────────────────────────────────
    // IDs statiques — getCustomList filtre les sujets par type

    getCustomLists() {
        return [
            { id: "all",     name: "🏠 Tout le catalogue"    },
            { id: "movies",  name: "🎬 Films populaires"      },
            { id: "series",  name: "📺 Séries populaires"     },
            { id: "latest",  name: "🆕 Dernières sorties"     },
            { id: "anime",   name: "⛩️ Anime & Animation"    },
        ];
    }

    async getCustomList(listId, page) {
        let all = this._dedup(await this._homeSubjects());
        switch (listId) {
            case "movies":  all = all.filter(s => s.subjectType === 1); break;
            case "series":  all = all.filter(s => s.subjectType === 2); break;
            case "anime":   all = all.filter(s => s.subjectType === 4 || s.subjectType === 5); break;
            case "latest":  all = all.sort((a, b) => (b.releaseDate || "").localeCompare(a.releaseDate || "")); break;
            default:        break;  // "all" — pas de filtre
        }
        return this._paginate(all, page);
    }

    // ── Détail ────────────────────────────────────────────────

    async getDetail(url) {
        let payload;
        try { payload = JSON.parse(url); } catch (_) { payload = {}; }
        const { detailPath, subjectId } = payload;
        const subjectType = payload.subjectType || 1;

        const param = detailPath ? `detailPath=${detailPath}` : `subjectId=${subjectId}`;
        const j     = await this._get(`/wefeed-h5api-bff/detail?${param}`);

        if (!j || j.code !== 0 || !j.data || !j.data.subject) {
            return { name: "Unknown", imageUrl: "", description: "", genre: [], status: 0, chapters: [] };
        }

        const s       = j.data.subject;
        const res     = j.data.resource || {};
        const genres  = (s.genre || "").split(",").map(x => x.trim()).filter(Boolean);
        if (s.countryName) genres.push(s.countryName);

        let desc = s.description || "";
        if (s.imdbRatingValue && parseFloat(s.imdbRatingValue) > 0) desc += `\n\n⭐ IMDb ${s.imdbRatingValue}`;
        if (s.duration) desc += `  ⏱ ${s.duration}`;

        // Épisodes
        const chapters = [];
        const realType = s.subjectType || subjectType;
        const realDp   = s.detailPath  || detailPath || "";
        const realId   = s.subjectId   || subjectId;
        const isMovie  = realType === 1 || !res.seasons || !res.seasons.length;

        if (isMovie) {
            chapters.push({
                name:       "▶ Regarder",
                url:        JSON.stringify({ subjectId: realId, detailPath: realDp, se: 0, ep: 0 }),
                dateUpload: s.releaseDate || ""
            });
        } else {
            for (const season of res.seasons) {
                const seNum  = season.se || 1;
                const maxEp  = season.maxEp || 0;
                for (let ep = maxEp; ep >= 1; ep--) {
                    chapters.push({
                        name:       maxEp > 1 ? `S${seNum} E${ep}` : (s.title || "Épisode"),
                        url:        JSON.stringify({ subjectId: realId, detailPath: realDp, se: seNum, ep }),
                        dateUpload: ""
                    });
                }
            }
        }

        return {
            name:        s.title || "Unknown",
            imageUrl:    (s.cover && s.cover.url) || "",
            description: desc,
            genre:       genres,
            status:      isMovie ? 1 : 0,
            chapters
        };
    }

    // ── Vidéos ────────────────────────────────────────────────

    async getVideoList(url) {
        let payload;
        try { payload = JSON.parse(url); } catch (_) { throw new Error("URL invalide"); }
        const { subjectId, detailPath, se, ep } = payload;
        if (!subjectId) throw new Error("subjectId manquant");

        const j = await this._get(
            `/wefeed-h5api-bff/subject/play?subjectId=${subjectId}&se=${se || 0}&ep=${ep || 0}&detailPath=${encodeURIComponent(detailPath || "")}`
        );

        if (!j || j.code !== 0 || !j.data) {
            if (j && j.code === 403) throw new Error("Région bloquée — utilise un VPN.");
            throw new Error("Pas de flux disponible.");
        }

        const data      = j.data;
        const refHdrs   = { "Referer": DefaultExtension.BASE + "/" };
        const subtitles = [];

        // Sous-titres
        try {
            const streams = (data.hls && data.hls[0]) || (data.streams && data.streams[0]);
            if (streams && streams.id) {
                const fmt = data.hls ? "HLS" : "MP4";
                const cj  = await this._get(
                    `/wefeed-h5api-bff/subject/caption?format=${fmt}&id=${streams.id}&subjectId=${subjectId}&detailPath=${encodeURIComponent(detailPath || "")}`
                );
                if (cj && cj.code === 0 && cj.data && cj.data.captions) {
                    for (const c of cj.data.captions) {
                        if (c && c.url) subtitles.push({ file: c.url, label: c.lanName || c.lan || "Sub" });
                    }
                }
            }
        } catch (_) {}

        const out = [];
        const push = (s, label) => {
            if (s && s.url) out.push({ url: s.url, originalUrl: s.url, quality: label, headers: refHdrs, subtitles });
        };

        if (data.hls && data.hls.length) {
            const sorted = data.hls.slice().sort((a, b) => (+b.resolutions || 0) - (+a.resolutions || 0));
            for (const s of sorted) push(s, s.resolutions ? `HLS ${s.resolutions}p` : "HLS Auto");
        }
        if (data.streams && data.streams.length) {
            const sorted = data.streams.slice().sort((a, b) => (+b.resolutions || 0) - (+a.resolutions || 0));
            for (const s of sorted) push(s, `MP4 ${s.resolutions || ""}p`);
        }

        if (!out.length) throw new Error("Aucun flux disponible.");
        return out;
    }

    // ── Filtres ───────────────────────────────────────────────

    getFilterList() {
        const opt = (n, v) => ({ type_name: "SelectOption", name: n, value: v });
        return [{
            type_name: "SelectFilter", name: "Type", state: 0,
            values: [
                opt("🎭 Tout",          ""),
                opt("🎬 Films",         "1"),
                opt("📺 Séries",        "2"),
                opt("⛩️ Anime",         "5"),
                opt("🎨 Animation",     "4"),
            ]
        }];
    }

    // ── Préférences ───────────────────────────────────────────

    getSourcePreferences() {
        return [{
            key: "mb_sub",
            listPreference: {
                title:      "Langue des sous-titres préférée",
                summary:    "Déplacée en tête si disponible",
                valueIndex: 0,
                entries:    ["English","Français","العربية","Português","Indonesian","中文","Русский","日本語","한국어"],
                entryValues:["en","fr","ar","pt","id","zh","ru","ja","ko"]
            }
        }];
    }
}
