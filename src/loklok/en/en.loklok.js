const mangayomiSources = [{
    "name": "LokLok / MovieBox",
    "lang": "en",
    "baseUrl": "https://lok-lok.cc",
    "apiUrl": "https://h5-api.aoneroom.com",
    "iconUrl": "https://h5-static.aoneroom.com/oneroomProject/icon/moviebox-official.jpg",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.0.0",
    "pkgPath": "loklok/en/en.loklok.js",
    "notes": "Free movies + TV series streaming, captions in 12 languages. Backed by aoneroom (LokLok / MovieBox / themoviebox.xyz).",
    "isNsfw": false
}];

class DefaultExtension extends MProvider {
    _pref(key, def) {
        const p = this.source && this.source.prefs && this.source.prefs.find(x => x.key === key);
        return (p && p.value !== undefined && p.value !== null && p.value !== "") ? p.value : def;
    }
    get prefQuality() { return this._pref("loklok_quality", "auto"); }
    get prefSubLang() { return this._pref("loklok_sub", "en"); }
    get hideAdult() { return this._pref("loklok_hide_adult", "false") === "true"; }

    get apiBase() { return this.source.apiUrl || "https://h5-api.aoneroom.com"; }
    get webBase() { return this.source.baseUrl || "https://moviebox.ph"; }

    apiHeaders() {
        return {
            "Accept": "application/json",
            "Origin": "https://lok-lok.cc",
            "Referer": "https://lok-lok.cc/",
            "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
            "X-Client-Info": JSON.stringify({ timezone: "UTC" })
        };
    }
    htmlHeaders() {
        return {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
        };
    }

    async _getJson(url) {
        const res = await new Client().get(url, this.apiHeaders());
        try { return JSON.parse(res.body); } catch (_) { return null; }
    }
    async _getHtml(url) {
        const res = await new Client().get(url, this.htmlHeaders());
        return res.body || "";
    }

    // ---------- helpers ----------
    _detailUrlFromSubject(subj) {
        // The watcher app uses `<webBase>/detail/<detailPath>?id=<subjectId>`.
        // moviebox.ph uses /detail; lok-lok.cc uses /spa/videoPlayPage/movies.
        const dp = subj.detailPath || subj.subjectId;
        return `${this.webBase}/detail/${dp}?id=${subj.subjectId}`;
    }
    _idFromUrl(url) {
        try {
            const u = new URL(url);
            const id = u.searchParams.get("id");
            if (id) return { subjectId: id, detailPath: u.pathname.split("/").filter(Boolean).pop() || "" };
        } catch (_) {}
        const m = url.match(/[?&]id=(\d+)/);
        return { subjectId: m ? m[1] : "", detailPath: "" };
    }
    _toMItem(s) {
        return {
            name: s.title || "Untitled",
            imageUrl: (s.cover && s.cover.url) || s.image || "",
            link: this._detailUrlFromSubject(s)
        };
    }

    // The wefeed-h5api-bff exposes content listings under /web/recommend
    // & /web/topicByGenre. We piggy-back on the public ranks/banner JSON
    // that moviebox.ph serves via /wefeed-h5api-bff/web/topic-list
    // (validated at runtime).
    async _list(path) {
        const url = `${this.apiBase}${path}`;
        const j = await this._getJson(url);
        if (!j || j.code !== 0 || !j.data) return [];
        const items = j.data.items || j.data.list || j.data.subjects || j.data.results || [];
        return items.map(it => this._toMItem(it.subject || it));
    }

    // ---------- popular / latest ----------
    async getPopular(page) {
        // Trending board (top-watched). Falls back to the home recList
        // when the trending endpoint returns nothing for the user's IP.
        let arr = await this._list(`/wefeed-h5api-bff/web/trending?page=${page || 1}&size=24`);
        if (!arr.length) arr = await this._list(`/wefeed-h5api-bff/web/recommend?page=${page || 1}&size=24`);
        if (!arr.length) arr = await this._scrapeMovieboxList(page || 1, "");
        return { list: arr, hasNextPage: arr.length >= 18 };
    }

    async getLatestUpdates(page) {
        let arr = await this._list(`/wefeed-h5api-bff/web/latest?page=${page || 1}&size=24`);
        if (!arr.length) arr = await this._scrapeMovieboxList(page || 1, "");
        return { list: arr, hasNextPage: arr.length >= 18 };
    }

    // Fallback browsing via moviebox.ph SSR pages — works even when the
    // private /web/* endpoints reject our region.
    async _scrapeMovieboxList(page, q) {
        const url = q
            ? `https://moviebox.ph/web/searchResult?keyword=${encodeURIComponent(q)}&page=${page}`
            : `https://moviebox.ph/web/film/index?page=${page}`;
        const html = await this._getHtml(url);
        const out = [];
        const re = /href="\/(detail\/[^"]+\?id=(\d+))"[^>]*>([\s\S]{0,400}?)<\/a>/g;
        let m;
        while ((m = re.exec(html)) !== null) {
            const link = `https://moviebox.ph/${m[1]}`;
            const block = m[3];
            const img = (block.match(/src="([^"]+)"/) || [, ""])[1];
            const title = (block.match(/title="([^"]+)"/) || block.match(/alt="([^"]+)"/) || [, ""])[1];
            if (title) out.push({ name: title, imageUrl: img, link });
        }
        // dedup
        const seen = new Set();
        return out.filter(x => { if (seen.has(x.link)) return false; seen.add(x.link); return true; });
    }

    // ---------- search ----------
    async search(query, page, filters) {
        let arr = await this._list(
            `/wefeed-h5api-bff/web/search?keyword=${encodeURIComponent(query)}&page=${page || 1}&size=24`
        );
        if (!arr.length) arr = await this._scrapeMovieboxList(page || 1, query);
        // Optional content-type filter ("any/movie/series").
        if (filters && filters.length) {
            const ct = filters.find(f => f && f.state !== undefined && f.values);
            // Filtering happens client-side by name keyword if needed.
        }
        return { list: arr, hasNextPage: arr.length >= 18 };
    }

    // ---------- detail ----------
    async getDetail(url) {
        const { subjectId } = this._idFromUrl(url);
        if (!subjectId) {
            return { name: "Unknown", imageUrl: "", description: "", genre: [], status: 0, episodes: [] };
        }
        const j = await this._getJson(`${this.apiBase}/wefeed-h5api-bff/detail?subjectId=${subjectId}`);
        if (!j || j.code !== 0 || !j.data || !j.data.subject) {
            return { name: "Unknown", imageUrl: "", description: "", genre: [], status: 0, episodes: [] };
        }
        const s = j.data.subject;
        const genres = (s.genre || "").split(",").map(x => x.trim()).filter(Boolean);
        if (s.countryName) genres.push(s.countryName);

        // Optional adult-content filter.
        if (this.hideAdult) {
            const lower = (s.title + " " + (s.description || "") + " " + genres.join(" ")).toLowerCase();
            const flagged = /\b(hentai|ecchi|erotic|adult|18\+|nsfw|porn|nude)\b/.test(lower);
            if (flagged) {
                return { name: "[Hidden]", imageUrl: "", description: "Hidden by your content filter setting.", genre: [], status: 1, episodes: [] };
            }
        }

        // Build episode list. subjectType: 1 = movie, 2 = series/anime.
        const episodes = [];
        if (s.subjectType === 1 || !j.data.resource || !j.data.resource.seasons || !j.data.resource.seasons.length) {
            episodes.push({
                name: s.title || "Watch",
                url: JSON.stringify({ id: subjectId, se: 0, ep: 0, dp: s.detailPath || "" })
            });
        } else {
            for (const season of j.data.resource.seasons) {
                const seNum = season.se || 1;
                const epCount = season.maxEp || 0;
                for (let ep = epCount; ep >= 1; ep--) {
                    episodes.push({
                        name: epCount > 1 ? `S${seNum} E${ep}` : (s.title || "Watch"),
                        url: JSON.stringify({ id: subjectId, se: seNum, ep, dp: s.detailPath || "" })
                    });
                }
            }
        }

        return {
            name: s.title || "Untitled",
            imageUrl: (s.cover && s.cover.url) || "",
            description: s.description || "",
            genre: genres,
            status: s.subjectType === 1 ? 1 : 0,
            episodes
        };
    }

    // ---------- video sources ----------
    async getVideoList(url) {
        let payload;
        try { payload = JSON.parse(url); } catch (_) { payload = this._idFromUrl(url); }
        const subjectId = payload.id || payload.subjectId;
        const se = payload.se || 0;
        const ep = payload.ep || 0;
        const dp = payload.dp || payload.detailPath || "";
        if (!subjectId) throw new Error("Missing subjectId");

        const playUrl = `${this.apiBase}/wefeed-h5api-bff/subject/play?subjectId=${subjectId}&se=${se}&ep=${ep}&detailPath=${encodeURIComponent(dp)}`;
        const j = await this._getJson(playUrl);
        if (!j || j.code !== 0 || !j.data) {
            throw new Error("Server refused (likely region-blocked). Try a VPN or different network.");
        }
        const data = j.data;
        const out = [];

        // Subtitles ----------------------------------------------------------
        const subtitles = [];
        try {
            const head = (data.hls && data.hls[0]) || (data.streams && data.streams[0]) || null;
            const fmt = (data.hls && data.hls.length) ? "HLS" : "MP4";
            if (head && head.id) {
                const capUrl = `${this.apiBase}/wefeed-h5api-bff/subject/caption?format=${fmt}&id=${head.id}&subjectId=${subjectId}&detailPath=${encodeURIComponent(dp)}`;
                const cj = await this._getJson(capUrl);
                if (cj && cj.code === 0 && cj.data && cj.data.captions) {
                    const want = (this.prefSubLang || "en").toLowerCase();
                    for (const c of cj.data.captions) {
                        if (!c || !c.url) continue;
                        const lan = (c.lan || c.lanName || "").toLowerCase();
                        subtitles.push({
                            file: c.url,
                            label: c.lanName || c.lan || "Sub",
                            language: c.lan || ""
                        });
                        if (lan === want) {
                            // Move preferred sub to top.
                            subtitles.unshift(subtitles.pop());
                        }
                    }
                }
            }
        } catch (_) {}

        // Streams ------------------------------------------------------------
        const pushStream = (s, label) => {
            if (!s || !s.url) return;
            out.push({
                url: s.url,
                originalUrl: s.url,
                quality: label,
                headers: { "Referer": "https://lok-lok.cc/" },
                subtitles
            });
        };

        if (data.hls && data.hls.length) {
            // HLS m3u8 ladder. Auto entry first if exists, else by resolution.
            const sorted = data.hls.slice().sort((a, b) => (+b.resolutions || 0) - (+a.resolutions || 0));
            for (const s of sorted) {
                const r = s.resolutions || 0;
                pushStream(s, r && r !== "0" ? `LokLok HLS ${r}p` : "LokLok HLS Auto");
            }
        }
        if (data.streams && data.streams.length) {
            const sorted = data.streams.slice().sort((a, b) => (+b.resolutions || 0) - (+a.resolutions || 0));
            for (const s of sorted) pushStream(s, `LokLok MP4 ${s.resolutions || ""}p`);
        }

        if (!out.length) throw new Error("No playable stream returned");

        // Re-order by user's preferred quality.
        const want = String(this.prefQuality).toLowerCase();
        if (want && want !== "auto") {
            const wantNum = parseInt(want, 10);
            out.sort((a, b) => {
                const ax = (a.quality.match(/(\d{3,4})p/) || [, "0"])[1] | 0;
                const bx = (b.quality.match(/(\d{3,4})p/) || [, "0"])[1] | 0;
                return Math.abs(ax - wantNum) - Math.abs(bx - wantNum);
            });
        }
        return out;
    }

    async getPageList(url) { return []; }

    // ---------- filters ----------
    getFilterList() {
        return [
            { type_name: "HeaderFilter", name: "Genres" },
            {
                type_name: "SelectFilter",
                name: "Type",
                state: 0,
                values: [
                    { type_name: "SelectOption", name: "Any",     value: "" },
                    { type_name: "SelectOption", name: "Movies",  value: "1" },
                    { type_name: "SelectOption", name: "Series",  value: "2" }
                ]
            }
        ];
    }

    // ---------- preferences ----------
    getSourcePreferences() {
        return [
            {
                key: "loklok_quality",
                list_preference: {
                    title: "Preferred quality",
                    summary: "Default quality picked first in the player.",
                    valueIndex: 0,
                    entries: ["Auto (HLS)", "1080p", "720p", "480p", "360p"],
                    entryValues: ["auto", "1080", "720", "480", "360"]
                }
            },
            {
                key: "loklok_sub",
                list_preference: {
                    title: "Preferred subtitle language",
                    summary: "Subtitle moved to top of the list when available.",
                    valueIndex: 0,
                    entries: [
                        "English", "Français", "Español", "Português", "Indonesian",
                        "Filipino", "Malay", "Русский", "اَلْعَرَبِيَّةُ", "中文", "বাংলা", "Off"
                    ],
                    entryValues: ["en", "fr", "es", "pt", "id", "fil", "ms", "ru", "ar", "zh", "bn", ""]
                }
            },
            {
                key: "loklok_hide_adult",
                switch_preference_compat: {
                    title: "Hide adult/mature titles",
                    summary: "Hides titles tagged hentai/ecchi/erotic/18+ from detail view.",
                    value: false
                }
            }
        ];
    }
}
