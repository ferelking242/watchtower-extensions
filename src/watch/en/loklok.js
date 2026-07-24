// ⚠️ DÉPRÉCIÉ — retiré de index/watch.json (v3.4.0, 2026-07-03).
// Ce fichier tapait la même API aoneroom que src/watch/multi/moviebox.js,
// en version anglais-only et sans les fonctionnalités récentes (doublage,
// sous-titres bilingues, catégories d'accueil). C'était la cause des
// "2 extensions MovieBox" dans le marketplace. Conservé ici pour
// référence uniquement — n'ajoutez pas ceci dans un index actif.
const watchtowerSources = [{
    "name": "LokLok / MovieBox",
    "lang": "en",
    "baseUrl": "https://lok-lok.cc",
    "apiUrl": "https://h5-api.aoneroom.com",
    "iconUrl": "https://h5-static.aoneroom.com/oneroomProject/icon/moviebox-official.jpg",
    "typeSource": "single",
    "itemType": 1,
    "version": "2.0.0",
    "pkgPath": "watch/en/loklok.js",
    "notes": "DÉPRÉCIÉ — utilisez MovieBox (multi) à la place. Free movies + TV series streaming, captions in 12 languages. Backed by aoneroom (LokLok / MovieBox / themoviebox.xyz).",
    "isNsfw": false,
    "hasSubtitles": true,
    "hasDub": true
}];

class DefaultExtension extends MProvider {

    _pref(key, def) {
        const p = this.source && this.source.prefs && this.source.prefs.find(x => x.key === key);
        return (p && p.value !== undefined && p.value !== null && p.value !== "") ? p.value : def;
    }
    get prefQuality() { return this._pref("loklok_quality", "auto"); }
    get prefSubLang() { return this._pref("loklok_sub", "en"); }
    get hideAdult()   { return this._pref("loklok_hide_adult", "false") === "true"; }

    get apiBase() { return this.source.apiUrl || "https://h5-api.aoneroom.com"; }

    _hdrs() {
        return {
            "Accept":        "application/json",
            "Origin":        "https://lok-lok.cc",
            "Referer":       "https://lok-lok.cc/",
            "User-Agent":    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
            "X-Client-Info": JSON.stringify({ timezone: "UTC" })
        };
    }

    async _getJson(path) {
        const res = await new Client().get(this.apiBase + path, this._hdrs());
        try { return JSON.parse(res.body); } catch (_) { return null; }
    }

    // ── Sujets depuis /home (seul endpoint public sans token) ────

    async _homeSubjects() {
        const j = await this._getJson("/wefeed-h5api-bff/home");
        if (!j || j.code !== 0 || !j.data) return [];
        const all = [];
        const seen = new Set();
        for (const op of (j.data.operatingList || [])) {
            for (const s of (op.subjects || [])) {
                if (!seen.has(s.subjectId)) {
                    seen.add(s.subjectId);
                    all.push(s);
                }
            }
        }
        return all;
    }

    _toMItem(s) {
        return {
            name:     s.title || "Untitled",
            imageUrl: (s.cover && s.cover.url) || "",
            link:     JSON.stringify({ id: s.subjectId, dp: s.detailPath || "" })
        };
    }

    // ── Popular / Latest ─────────────────────────────────────────

    async getPopular(page) {
        const PER = 24;
        const p   = Math.max(1, page || 1);
        const all = await this._homeSubjects();
        const slice = all.slice((p - 1) * PER, p * PER);
        return { list: slice.map(s => this._toMItem(s)), hasNextPage: p * PER < all.length };
    }

    async getLatestUpdates(page) {
        const PER = 24;
        const p   = Math.max(1, page || 1);
        const all = (await this._homeSubjects()).sort((a, b) =>
            (b.releaseDate || "").localeCompare(a.releaseDate || ""));
        const slice = all.slice((p - 1) * PER, p * PER);
        return { list: slice.map(s => this._toMItem(s)), hasNextPage: p * PER < all.length };
    }

    // ── Search ───────────────────────────────────────────────────

    async search(query, page) {
        if (!query || !query.trim()) return this.getPopular(page);
        const q   = query.trim().toLowerCase();
        const PER = 24;
        const p   = Math.max(1, page || 1);
        const all = (await this._homeSubjects()).filter(
            s => (s.title || "").toLowerCase().includes(q) ||
                 (s.genre || "").toLowerCase().includes(q)
        );
        const slice = all.slice((p - 1) * PER, p * PER);
        return { list: slice.map(s => this._toMItem(s)), hasNextPage: p * PER < all.length };
    }

    // ── Detail ───────────────────────────────────────────────────

    async getDetail(url) {
        let payload;
        try { payload = JSON.parse(url); } catch (_) { payload = {}; }
        const { id: subjectId, dp: detailPath } = payload;

        if (!subjectId && !detailPath) {
            return { name: "Unknown", imageUrl: "", description: "", genre: [], status: 0, chapters: [] };
        }

        const param = detailPath ? `detailPath=${detailPath}` : `subjectId=${subjectId}`;
        const j     = await this._getJson(`/wefeed-h5api-bff/detail?${param}`);

        if (!j || j.code !== 0 || !j.data || !j.data.subject) {
            return { name: "Unknown", imageUrl: "", description: "", genre: [], status: 0, chapters: [] };
        }

        const s      = j.data.subject;
        const res    = j.data.resource || {};
        const genres = (s.genre || "").split(",").map(x => x.trim()).filter(Boolean);
        if (s.countryName) genres.push(s.countryName);

        if (this.hideAdult) {
            const lower = (s.title + " " + (s.description || "") + " " + genres.join(" ")).toLowerCase();
            if (/\b(hentai|ecchi|erotic|adult|18\+|nsfw|porn|nude)\b/.test(lower)) {
                return { name: "[Hidden]", imageUrl: "", description: "Hidden by content filter.", genre: [], status: 1, chapters: [] };
            }
        }

        const realId = s.subjectId || subjectId;
        const realDp = s.detailPath || detailPath || "";
        const chapters = [];

        const isMovie = s.subjectType === 1 || !res.seasons || !res.seasons.length;
        if (isMovie) {
            chapters.push({
                name:       s.title || "Watch",
                url:        JSON.stringify({ id: realId, se: 0, ep: 0, dp: realDp }),
                dateUpload: s.releaseDate || ""
            });
        } else {
            for (const season of res.seasons) {
                const seNum  = season.se || 1;
                const maxEp  = season.maxEp || 0;
                for (let ep = maxEp; ep >= 1; ep--) {
                    chapters.push({
                        name:       maxEp > 1 ? `S${seNum} E${ep}` : (s.title || "Watch"),
                        url:        JSON.stringify({ id: realId, se: seNum, ep, dp: realDp }),
                        dateUpload: ""
                    });
                }
            }
        }

        return {
            name:        s.title || "Untitled",
            imageUrl:    (s.cover && s.cover.url) || "",
            description: s.description || "",
            genre:       genres,
            status:      isMovie ? 1 : 0,
            chapters
        };
    }

    // ── Video ────────────────────────────────────────────────────

    async getVideoList(url) {
        let payload;
        try { payload = JSON.parse(url); } catch (_) { payload = {}; }
        const subjectId = payload.id || payload.subjectId;
        const se = payload.se || 0;
        const ep = payload.ep || 0;
        const dp = payload.dp || payload.detailPath || "";
        if (!subjectId) throw new Error("Missing subjectId");

        const j = await this._getJson(
            `/wefeed-h5api-bff/subject/play?subjectId=${subjectId}&se=${se}&ep=${ep}&detailPath=${encodeURIComponent(dp)}`
        );

        if (!j || j.code !== 0 || !j.data) {
            if (j && j.code === 403) throw new Error("Region blocked — try a VPN.");
            throw new Error("No stream available.");
        }

        const data      = j.data;
        const refHdrs   = { "Referer": "https://lok-lok.cc/" };
        const subtitles = [];

        try {
            const stream = (data.hls && data.hls[0]) || (data.streams && data.streams[0]);
            if (stream && stream.id) {
                const fmt = data.hls ? "HLS" : "MP4";
                const cj  = await this._getJson(
                    `/wefeed-h5api-bff/subject/caption?format=${fmt}&id=${stream.id}&subjectId=${subjectId}&detailPath=${encodeURIComponent(dp)}`
                );
                if (cj && cj.code === 0 && cj.data && cj.data.captions) {
                    const want = (this.prefSubLang || "en").toLowerCase();
                    for (const c of cj.data.captions) {
                        if (!c || !c.url) continue;
                        subtitles.push({ file: c.url, label: c.lanName || c.lan || "Sub", language: c.lan || "" });
                        if ((c.lan || "").toLowerCase() === want) subtitles.unshift(subtitles.pop());
                    }
                }
            }
        } catch (_) {}

        const out  = [];
        const push = (s, label) => {
            if (s && s.url) out.push({ url: s.url, originalUrl: s.url, quality: label, headers: refHdrs, subtitles });
        };

        if (data.hls && data.hls.length) {
            const sorted = data.hls.slice().sort((a, b) => (+b.resolutions || 0) - (+a.resolutions || 0));
            for (const s of sorted) push(s, s.resolutions ? `LokLok HLS ${s.resolutions}p` : "LokLok HLS Auto");
        }
        if (data.streams && data.streams.length) {
            const sorted = data.streams.slice().sort((a, b) => (+b.resolutions || 0) - (+a.resolutions || 0));
            for (const s of sorted) push(s, `LokLok MP4 ${s.resolutions || ""}p`);
        }

        if (!out.length) throw new Error("No playable stream returned.");

        const want = String(this.prefQuality).toLowerCase();
        if (want && want !== "auto") {
            const wn = parseInt(want, 10);
            out.sort((a, b) => {
                const ax = (a.quality.match(/(\d{3,4})p/) || [, "0"])[1] | 0;
                const bx = (b.quality.match(/(\d{3,4})p/) || [, "0"])[1] | 0;
                return Math.abs(ax - wn) - Math.abs(bx - wn);
            });
        }
        return out;
    }

    // ── Filters ──────────────────────────────────────────────────

    getFilterList() {
        return [
            {
                type_name: "SelectFilter", name: "Type", state: 0,
                values: [
                    { type_name: "SelectOption", name: "Any",    value: "" },
                    { type_name: "SelectOption", name: "Movies", value: "1" },
                    { type_name: "SelectOption", name: "Series", value: "2" }
                ]
            }
        ];
    }

    // ── Preferences ──────────────────────────────────────────────

    getSourcePreferences() {
        return [
            {
                key: "loklok_quality",
                list_preference: {
                    title: "Preferred quality", summary: "Default quality picked first.",
                    valueIndex: 0,
                    entries:    ["Auto (HLS)", "1080p", "720p", "480p", "360p"],
                    entryValues:["auto", "1080", "720", "480", "360"]
                }
            },
            {
                key: "loklok_sub",
                list_preference: {
                    title: "Preferred subtitle language", summary: "Moved to top when available.",
                    valueIndex: 0,
                    entries:    ["English","Français","Español","Português","Indonesian","Filipino","Malay","Русский","اَلْعَرَبِيَّةُ","中文","বাংলা","Off"],
                    entryValues:["en","fr","es","pt","id","fil","ms","ru","ar","zh","bn",""]
                }
            },
            {
                key: "loklok_hide_adult",
                switch_preference_compat: {
                    title: "Hide adult/mature titles",
                    summary: "Hides titles tagged hentai/ecchi/18+ from detail view.",
                    value: false
                }
            }
        ];
    }
}
