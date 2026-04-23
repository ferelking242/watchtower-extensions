const mangayomiSources = [{
    "name": "Torrentio",
    "langs": ["all"],
    "ids": { "all": 902817234 },
    "baseUrl": "https://torrentio.strem.fun",
    "apiUrl": "https://torrentio.strem.fun",
    "iconUrl": "https://raw.githubusercontent.com/ferelking242/watchtower/main/extensions/anime/icon/all.torrentio.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "0.1.3",
    "pkgPath": "anime/all/torrentio.js",
    "notes": "Movies + Series + Anime via Torrentio (Stremio addon). Streams play through Watchtower's built-in torrent server. Use 'Catalog' filter to switch."
}];

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
    }

    _pref(key, def) {
        const p = this.source && this.source.prefs && this.source.prefs.find(x => x.key === key);
        return (p && p.value !== undefined && p.value !== null && p.value !== "") ? p.value : def;
    }
    get prefCatalog() { return this._pref("torrentio_catalog", "movie"); }
    get prefMinSeeders() { return parseInt(this._pref("torrentio_min_seeders", "1"), 10) || 0; }
    get prefMaxResults() { return parseInt(this._pref("torrentio_max_results", "30"), 10) || 30; }

    getHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json"
        };
    }

    // ---------- catalog selection ----------
    _catalogPath(kind, page) {
        const skip = (page - 1) * 100;
        // Cinemeta exposes movie + series; Kitsu addon exposes anime.
        switch (this.prefCatalog) {
            case "movie":
                return `https://v3-cinemeta.strem.io/catalog/movie/top/skip=${skip}.json`;
            case "series":
                return `https://v3-cinemeta.strem.io/catalog/series/top/skip=${skip}.json`;
            case "anime":
                return `https://anime-kitsu.strem.fun/catalog/anime/kitsu-anime-trending/skip=${skip}.json`;
            default:
                return `https://v3-cinemeta.strem.io/catalog/movie/top/skip=${skip}.json`;
        }
    }
    _searchPath(query) {
        const q = encodeURIComponent(query);
        switch (this.prefCatalog) {
            case "movie":
                return `https://v3-cinemeta.strem.io/catalog/movie/top/search=${q}.json`;
            case "series":
                return `https://v3-cinemeta.strem.io/catalog/series/top/search=${q}.json`;
            case "anime":
                return `https://anime-kitsu.strem.fun/catalog/anime/kitsu-anime-list/search=${q}.json`;
            default:
                return `https://v3-cinemeta.strem.io/catalog/movie/top/search=${q}.json`;
        }
    }
    _metaPath(type, id) {
        if (type === "anime" || (id || "").startsWith("kitsu:")) {
            return `https://anime-kitsu.strem.fun/meta/series/${id}.json`;
        }
        return `https://v3-cinemeta.strem.io/meta/${type}/${id}.json`;
    }

    _kindForCatalog() {
        switch (this.prefCatalog) {
            case "anime":  return "series"; // Stremio: kitsu items are typed series
            case "series": return "series";
            default:       return "movie";
        }
    }

    _toItem(m, kind) {
        return {
            name: m.name || "Untitled",
            // We embed the resolved metadata kind into the link so getDetail
            // and getVideoList can dispatch correctly without re-guessing.
            link: `meta:${kind}:${m.id}`,
            imageUrl: m.poster || m.background || ""
        };
    }

    async _list(url) {
        try {
            const res = await this.client.get(url, this.getHeaders());
            const data = JSON.parse(res.body || "{}");
            const kind = this._kindForCatalog();
            return (data.metas || []).map(m => this._toItem(m, kind));
        } catch (_) {
            return [];
        }
    }

    // ---------- popular / latest / search ----------
    async getPopular(page) {
        const list = await this._list(this._catalogPath("popular", page || 1));
        return { list, hasNextPage: list.length >= 50 };
    }
    async getLatestUpdates(page) {
        // Cinemeta only has top + last-videos for series; for movies use
        // imdbRating "year" sort as a proxy.
        const skip = ((page || 1) - 1) * 100;
        const url = this.prefCatalog === "series"
            ? `https://v3-cinemeta.strem.io/catalog/series/last-videos/skip=${skip}.json`
            : (this.prefCatalog === "anime"
                ? `https://anime-kitsu.strem.fun/catalog/anime/kitsu-anime-airing/skip=${skip}.json`
                : `https://v3-cinemeta.strem.io/catalog/movie/year/skip=${skip}.json`);
        const list = await this._list(url);
        return { list, hasNextPage: list.length >= 50 };
    }
    async search(query, page, filterList) {
        const list = await this._list(this._searchPath(query));
        return { list, hasNextPage: false };
    }

    // ---------- detail ----------
    _parseLink(url) {
        // New format: meta:<kind>:<id>. Old format from previous version was
        // /meta/<type>/<id> — we keep backwards compatibility.
        const m = url.match(/^meta:([a-z]+):(.+)$/);
        if (m) return { kind: m[1], id: m[2] };
        const parts = url.split("/").filter(Boolean);
        return { kind: parts[1] || "movie", id: parts[2] || parts[parts.length - 1] };
    }

    async getDetail(url) {
        const { kind, id } = this._parseLink(url);
        let meta = null;
        try {
            const res = await this.client.get(this._metaPath(kind, id), this.getHeaders());
            meta = JSON.parse(res.body || "{}").meta;
        } catch (_) { meta = null; }
        if (!meta) {
            return { name: "Unknown", imageUrl: "", description: "", genre: [], status: 0, episodes: [] };
        }

        // Build episode list. Movies get a single virtual episode pointing
        // at /stream/movie/<id>; series/anime expand meta.videos.
        let episodes = [];
        const isShow = (meta.type === "series" || meta.type === "show" || (meta.videos && meta.videos.length));
        if (isShow) {
            const vids = (meta.videos || []).filter(v => {
                if (!v) return false;
                const aired = v.firstAired || v.released;
                if (!aired) return true;
                return new Date(aired).valueOf() <= Date.now();
            });
            episodes = vids.map(v => {
                const se = v.season || 0;
                const ep = v.number || v.episode || 0;
                const epId = v.id || `${meta.id}:${se}:${ep}`;
                return {
                    name: `S${se}:E${ep}${v.name ? " - " + v.name : (v.title ? " - " + v.title : "")}`,
                    url: `stream:series:${epId}`,
                    dateUpload: v.released || v.firstAired || ""
                };
            });
            episodes.sort((a, b) => {
                const ax = a.name.match(/S(\d+):E(\d+)/) || [, "0", "0"];
                const bx = b.name.match(/S(\d+):E(\d+)/) || [, "0", "0"];
                return (parseInt(ax[1], 10) - parseInt(bx[1], 10))
                    || (parseInt(ax[2], 10) - parseInt(bx[2], 10));
            });
            episodes.reverse();
        } else {
            episodes = [{ name: meta.name || "Movie", url: `stream:movie:${meta.id}` }];
        }

        const genres = [];
        if (Array.isArray(meta.genres)) for (const g of meta.genres) if (g) genres.push(g);
        if (meta.year) genres.push(String(meta.year));
        if (meta.imdbRating) genres.push(`IMDb ${meta.imdbRating}`);

        return {
            name: meta.name || "Untitled",
            imageUrl: meta.poster || meta.background || "",
            description: meta.description || meta.overview || "",
            genre: genres,
            status: 0,
            episodes
        };
    }

    // ---------- streams ----------
    _animeTrackers() {
        return [
            "http://nyaa.tracker.wf:7777/announce",
            "http://anidex.moe:6969/announce",
            "http://tracker.anirena.com:80/announce",
            "udp://tracker.uw0.xyz:6969/announce",
            "http://share.camoe.cn:8080/announce",
            "http://t.nyaatracker.com:80/announce",
            "udp://exodus.desync.com:6969/announce",
            "udp://explodie.org:6969/announce",
            "udp://open.stealth.si:80/announce",
            "udp://opentracker.i2p.rocks:6969/announce",
            "udp://tracker.cyberia.is:6969/announce",
            "udp://tracker.dler.org:6969/announce",
            "udp://tracker.openbittorrent.com:6969/announce",
            "udp://tracker.opentrackr.org:1337/announce",
            "udp://tracker.tiny-vps.com:6969/announce",
            "udp://tracker.torrent.eu.org:451/announce"
        ];
    }
    _seedersOf(s) {
        // Torrentio embeds "👤 NN" in the title. Fall back to .seeders if
        // the addon ever returns it as a structured field.
        const t = (s.title || s.name || "").replace(/\s+/g, " ");
        const m = t.match(/(?:👤|Seeders?|S:)\s*(\d{1,5})/i);
        if (m) return parseInt(m[1], 10);
        if (typeof s.seeders === "number") return s.seeders;
        return 0;
    }

    async getVideoList(url) {
        const m = url.match(/^stream:([a-z]+):(.+)$/);
        const kind = m ? m[1] : "movie";
        const id = m ? m[2] : url;

        const apiUrl = `${this.source.baseUrl}/stream/${kind}/${id}.json`;
        let streams = [];
        try {
            const res = await this.client.get(apiUrl, this.getHeaders());
            const data = JSON.parse(res.body || "{}");
            streams = data.streams || [];
        } catch (e) {
            throw new Error("Torrentio fetch failed: " + (e && e.message ? e.message : e));
        }
        if (!streams.length) throw new Error("No torrent stream available for this episode.");

        const trackers = this._animeTrackers();
        const minSeed = this.prefMinSeeders;
        const out = [];
        for (const s of streams) {
            const seeders = this._seedersOf(s);
            if (seeders < minSeed) continue;
            // Build a magnet that the local torrent server will resolve.
            const fileIdx = (s.fileIdx !== undefined && s.fileIdx !== null) ? `&index=${s.fileIdx}` : "";
            const trAll = (s.sources && s.sources.length)
                // Torrentio sometimes includes a "sources" array containing both
                // tracker URLs ("tracker:...") and DHT seed hints ("dht:...").
                ? s.sources.filter(x => x && x.startsWith("tracker:")).map(x => x.slice(8))
                : trackers;
            const magnet = `magnet:?xt=urn:btih:${s.infoHash}&dn=${encodeURIComponent(s.infoHash)}&tr=${trAll.join("&tr=")}${fileIdx}`;
            const label = `[${seeders}🌱] ${(s.name || "Torrent").replace(/^Torrentio[\s\n-]+/i, "")} ${s.title || ""}`
                .replace(/\s+/g, " ").trim();
            out.push({
                url: magnet,
                originalUrl: magnet,
                quality: label,
                headers: {}
            });
        }
        if (!out.length) {
            throw new Error(`No torrents with ≥${minSeed} seeders. Lower the threshold in source preferences.`);
        }
        // Best-seeded first → fastest metadata fetch in the local BT server.
        out.sort((a, b) => {
            const ax = parseInt((a.quality.match(/\[(\d+)/) || [, "0"])[1], 10);
            const bx = parseInt((b.quality.match(/\[(\d+)/) || [, "0"])[1], 10);
            return bx - ax;
        });
        return out.slice(0, this.prefMaxResults);
    }

    getFilterList() { return []; }

    getSourcePreferences() {
        return [
            {
                key: "torrentio_catalog",
                list_preference: {
                    title: "Catalog",
                    summary: "Which catalog to browse: Movies, TV Series or Anime.",
                    valueIndex: 0,
                    entries: ["Movies", "TV Series", "Anime"],
                    entryValues: ["movie", "series", "anime"]
                }
            },
            {
                key: "torrentio_min_seeders",
                list_preference: {
                    title: "Minimum seeders",
                    summary: "Filters out torrents with fewer seeders. Higher = faster start, fewer results.",
                    valueIndex: 1,
                    entries: ["0 (any)", "1+", "5+", "10+", "20+", "50+"],
                    entryValues: ["0", "1", "5", "10", "20", "50"]
                }
            },
            {
                key: "torrentio_max_results",
                list_preference: {
                    title: "Max results per episode",
                    summary: "Cap the number of stream candidates shown.",
                    valueIndex: 2,
                    entries: ["10", "20", "30", "50", "100", "all"],
                    entryValues: ["10", "20", "30", "50", "100", "9999"]
                }
            }
        ];
    }
}
