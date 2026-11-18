// AllManga extension for Watchtower
// Uses the same GraphQL API as AllAnime (api.allanime.day)
// Manga listing  : https://allmanga.to/manga?cty=ALL
// Chapter reader : served from the youtube-anime image CDN
// v0.2.0 — getCustomList answers each home section id with its own feed
// (spotlight / popular / top_rated / trending / latest / new) and one rail per
// genre (`category_<genre>`), served by `mangas(search:{genres,sortBy})`. The
// API throttles a burst, so a throttled call is retried after the advertised
// delay and every rail is memoised for a few minutes.
// v0.1.6 — POST the GraphQL body (a GET is answered 403 cf-mitigated:
// challenge); read availableChaptersDetail as an untyped Object; fetch
// chapter pages through chaptersForRead and prefix the relative image paths
// with the youtube-anime CDN head.
// v0.1.5 — fix the detail query field separator

const watchtowerSources = [{
    "name": "AllManga",
    "lang": "en",
    "id": 1800005070,
    "baseUrl": "https://allmanga.to",
    "apiUrl": "https://api.allanime.day/api",
    "iconUrl": "https://allmanga.to/pics/avatar.png",
    "typeSource": "single",
    "itemType": 0,
    "isNsfw": false,
    "hasCloudflare": true,
    "version": "0.2.0",
    "login": false,
    "forYou": false,
    "dateFormat": "",
    "dateFormatLocale": "",
    "pkgPath": "manga/src/en/allmanga.js",
    "isManga": true,
    "isFullData": false,
    "appMinVerReq": "0.5.0",
    "additionalParams": "",
    "sourceCodeLanguage": 1,
    "notes": "Uses AllAnime GraphQL API. Chapter images served via the youtube-anime CDN.",
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": true,
    "paywall": "free",
    "subCategories": ["Multi-lang"],
    "supportsComments": false
}];

const BASE_URL  = "https://allmanga.to";
const API_URL   = "https://api.allanime.day/api";
// Relative reader paths (`images133/<id>/<chap>/<type>/<n>.jpg`) are served by
// the youtube-anime image CDN. `pictureUrlHead` is null on every source seen so
// far, so this constant is the default head.
//
// The CDN splits the two families across hosts: `aln` serves *covers* directly
// (200) but answers every *reader page* with a 301 to `ytimgf`, which serves the
// page. That redirect is fatal in the app's Rust HTTP client: reqwest rewrites
// `Referer` to the redirecting URL on a 301, and `ytimgf` answers `403` to any
// `aln` Referer (measured 2026-11-17: `Referer: https://allmanga.to/` → 200,
// `Referer: https://aln.youtube-anime.com/…` → 403, no Referer → 403). The
// reader survives only because it retries over the plain Dart client, which
// does not rewrite the Referer; the download worker uses the Rust client alone
// and dies on the 403. Asking `ytimgf` for the page directly skips the 301, so
// the extension's `Referer` reaches the CDN intact.
const IMAGE_HEAD = "https://aln.youtube-anime.com";
const READER_HEAD = "https://ytimgf.youtube-anime.com";

// The home layout asks one request per section. [memo] keeps every rail for a
// few minutes so re-opening the home does not re-fire the whole set. The API
// also throttles a burst (measured 2026-11-17: 3 of 13 concurrent calls answered
// "Too many requests, please try again in N seconds", while the same calls
// spaced ~1 s apart all succeed), so [gql] paces requests with
// [MIN_REQUEST_INTERVAL_MS] and retries a throttled response after the delay it
// advertises instead of failing the rail.
const RAIL_CACHE_TTL_MS = 5 * 60 * 1000;
const RAIL_CACHE_LIMIT = 64;
const RATE_LIMIT_PATTERN = /too many requests|rate.?limit/i;
const MAX_THROTTLE_RETRIES = 3;
const MIN_REQUEST_INTERVAL_MS = 700;

class DefaultExtension extends MProvider {

    constructor() {
        super();
        this._railCache = new Map();
        this._requestChain = Promise.resolve();
        this._lastRequestAt = 0;
    }

    // ── Rail memoisation ─────────────────────────────────────────────────────
    // The home asks one request per section; a short TTL keeps the home instant
    // on re-entry without serving stale rankings for long.
    async memo(key, ttlMs, loader) {
        const now = Date.now();
        const hit = this._railCache.get(key);
        if (hit && now - hit.at < (ttlMs || RAIL_CACHE_TTL_MS)) return hit.value;
        const value = await loader();
        if (this._railCache.size >= RAIL_CACHE_LIMIT) {
            this._railCache.delete(this._railCache.keys().next().value);
        }
        this._railCache.set(key, { at: now, value });
        return value;
    }

    // Requests run one at a time and never closer than [MIN_REQUEST_INTERVAL_MS]:
    // the app fires every home shelf at once and the API throttles a burst.
    _serialize(task) {
        const run = this._requestChain.then(task, task);
        this._requestChain = run.then(() => undefined, () => undefined);
        return run;
    }

    async _pace() {
        const elapsed = Date.now() - this._lastRequestAt;
        const wait = MIN_REQUEST_INTERVAL_MS - elapsed;
        if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
        this._lastRequestAt = Date.now();
    }

    // ── HTTP helper ──────────────────────────────────────────────────────────
    // The API is behind Cloudflare: a GET with the query in the URL is answered
    // `403 cf-mitigated: challenge`, while the same payload as a JSON POST
    // returns `200`. The extension must therefore POST the body.
    async gql(query, variables) {
        return this._serialize(async () => {
            let attempt = 0;
            for (;;) {
                await this._pace();
                const res = await new Client().post(
                    API_URL,
                    {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "Origin": BASE_URL,
                        "Referer": BASE_URL + "/",
                        "from-app": "true"
                    },
                    { query, variables }
                );
                let payload;
                try {
                    payload = JSON.parse(res.body || "{}");
                } catch (_) {
                    throw new Error("[AllManga] API returned invalid JSON");
                }
                if (Array.isArray(payload.errors) && payload.errors.length) {
                    const message = payload.errors
                        .map((error) => error && error.message)
                        .filter(Boolean)
                        .join("; ");
                    // A throttled call is retried after the delay the API
                    // advertises ("… please try again in 10 seconds"), otherwise
                    // every rail that loses the race renders an error card.
                    const waitMs = this._throttleDelay(payload.errors[0] && payload.errors[0].message);
                    if (waitMs !== null && attempt < MAX_THROTTLE_RETRIES) {
                        attempt += 1;
                        await new Promise((resolve) => setTimeout(resolve, waitMs));
                        continue;
                    }
                    throw new Error(`[AllManga] GraphQL error${message ? `: ${message}` : ""}`);
                }
                return payload.data;
            }
        });
    }

    // Delay (ms) advertised by a throttle error, or null when the error is not
    // a throttle. The API phrases it as "Too many requests, please try again in
    // N seconds."; a small floor keeps a same-second retry from re-tripping it.
    _throttleDelay(message) {
        const text = String(message || "");
        if (!RATE_LIMIT_PATTERN.test(text)) return null;
        const match = /in (\d+(?:\.\d+)?) seconds?/i.exec(text);
        const seconds = match ? parseFloat(match[1]) : 2;
        return Math.max(seconds, 1) * 1000 + 250;
    }

    // ── Image URL ────────────────────────────────────────────────────────────
    // The API returns covers and reader pages as relative CDN paths
    // (`mcovers/…`, `images133/…`), so they must be prefixed with the head.
    //
    // `coverOnly` must stay on for covers and off for reader pages: the CDN
    // stores *covers* as WebP even when the API still reports a legacy
    // `.jpg`/`.jpeg`/`.png` suffix (those 404), but it serves *reader pages* in
    // exactly the extension the API reports — a chapter is `.png`, another is
    // `.webp`, another is `.jpg`. Rewriting a reader page to `.webp` therefore
    // 404s every chapter that is not stored as WebP.
    imageUrl(path, head, coverOnly) {
        const raw = String(path || "").trim();
        if (!raw) return "";
        if (raw.startsWith("//")) return `https:${raw}`;
        if (/^https?:\/\//i.test(raw)) return raw;
        const base = String(head || IMAGE_HEAD).replace(/\/$/, "");
        let rel = raw.replace(/^\//, "");
        if (coverOnly && /youtube-anime\.com$/i.test(base)) {
            rel = rel.replace(/\.(jpe?g|png|gif|bmp|avif)$/i, ".webp");
        }
        return `${base}/${rel}`;
    }

    // Cover variant of [imageUrl]: applies the legacy-suffix → WebP rewrite.
    coverUrl(path) {
        return this.imageUrl(path, null, true);
    }

    // Reader-page head. `aln` only 301s reader pages to `ytimgf`, and the app's
    // Rust client turns that 301 into a `Referer: aln…` request that the CDN
    // answers with 403, so the page is requested from `ytimgf` directly. A real
    // (non-null) `pictureUrlHead` is respected unless it is the `aln` head.
    readerHead(head) {
        const base = String(head || IMAGE_HEAD).replace(/\/$/, "");
        if (/^https?:\/\/aln\.youtube-anime\.com$/i.test(base)) return READER_HEAD;
        return base;
    }

    // ── Request headers for the image CDN ────────────────────────────────────
    // The youtube-anime CDN is hotlink-protected: it answers `403` to any request
    // that arrives without the reader site's `Referer`. The reader renders covers
    // and page images with these headers, so the Referer must be declared here.
    // The User-Agent is deliberately omitted: the app injects the browser UA of
    // the Cloudflare-cleared session (the `cf_clearance` cookie is bound to it),
    // and a hard-coded UA here would replace it and break that binding.
    getHeaders() {
        return { "Referer": BASE_URL + "/" };
    }

    // ── Title preference ─────────────────────────────────────────────────────
    pickTitle(item, pref) {
        if (pref === "romaji") return item.name || item.englishName || "";
        if (pref === "eng")    return item.englishName || item.name || "";
        return item.nativeName || item.name || "";
    }

    // ── Slug helper ──────────────────────────────────────────────────────────
    slugify(s) {
        return (s || "")
            .replace(/[^a-zA-Z0-9]/g, "-")
            .replace(/-{2,}/g, "-")
            .toLowerCase();
    }

    // ── Parse manga list from API edges ─────────────────────────────────────
    parseMangaList(edges, pref, hasNextPage) {
        const list = [];
        for (const m of edges) {
            const name     = this.pickTitle(m, pref);
            const imageUrl = this.coverUrl(m.thumbnail);
            const link     = `/manga/${m._id}/${this.slugify(m.name)}`;
            list.push({ name, imageUrl, link });
        }
        return { list, hasNextPage };
    }

    // ── Popular ──────────────────────────────────────────────────────────────
    async getPopular(page) {
        const data = await this.gql(
            "query($type:VaildPopularTypeEnumType!,$size:Int!,$dateRange:Int,$page:Int){" +
            "queryPopular(type:$type,size:$size,dateRange:$dateRange,page:$page){" +
            "recommendations{anyCard{_id name englishName nativeName thumbnail}}}}",
            { type: "manga", size: 26, dateRange: 1, page }
        );
        const recommendations = data && data.queryPopular && data.queryPopular.recommendations;
        if (!Array.isArray(recommendations)) {
            throw new Error("[AllManga] Popular response did not contain recommendations");
        }
        const recs = recommendations.filter((r) => r && r.anyCard);
        const pref = new SharedPreferences().get("preferred_title_style") || "eng";
        const list = recs.map((r) => ({
            name:     this.pickTitle(r.anyCard, pref),
            imageUrl: this.coverUrl(r.anyCard.thumbnail),
            link:     `/manga/${r.anyCard._id}/${this.slugify(r.anyCard.name)}`
        }));
        return { list, hasNextPage: list.length === 26 };
    }

    // ── Latest updates ───────────────────────────────────────────────────────
    async getLatestUpdates(page) {
        return this.search("", page, []);
    }

    // ── Search ───────────────────────────────────────────────────────────────
    async search(query, page, filters) {
        let countryOrigin = "ALL";
        let allowAdult    = false;
        for (const f of (filters || [])) {
            if (!f) continue;
            // The app models a SelectFilter with `type_name`; accept `type` too
            // so the extension keeps working if the runtime ever sends it.
            const kind = f.type_name || f.type;
            if (kind !== "SelectFilter") continue;
            if (f.name === "Country") {
                const options = Array.from(f.values || []);
                const picked = options[f.state];
                countryOrigin = (picked && picked.value) || "ALL";
            } else if (f.name === "Adult") {
                const options = Array.from(f.values || []);
                const picked = options[f.state];
                allowAdult = picked && picked.value === "true";
            }
        }

        const data = await this.gql(
            "query($search:SearchInput,$limit:Int,$countryOrigin:VaildCountryOriginEnumType,$page:Int){" +
            "mangas(search:$search,limit:$limit,countryOrigin:$countryOrigin,page:$page){" +
            "edges{_id name englishName nativeName thumbnail}}}",
            {
                search: { query: query || "", allowAdult, allowUnknown: false },
                countryOrigin,
                limit: 26,
                page
            }
        );
        const edges = data && data.mangas && data.mangas.edges;
        if (!Array.isArray(edges)) {
            throw new Error("[AllManga] Search response did not contain manga results");
        }
        const pref = new SharedPreferences().get("preferred_title_style") || "eng";
        return this.parseMangaList(edges, pref, edges.length === 26);
    }

    // ── Detail (manga info + chapter list) ───────────────────────────────────
    async getDetail(url) {
        const id = url.includes("allmanga.to")
            ? url.split("/manga/")[1].split("/")[0]
            : url.replace(/^\/manga\//, "").split("/")[0];

        // `availableChaptersDetail` is an untyped Object: selecting subfields
        // (`{sub raw}`) is a GraphQL validation error. Reading it whole returns
        // `{sub:[…], raw:[…]}`.
        const data = await this.gql(
            "query($id:String!){manga(_id:$id){name englishName nativeName thumbnail description genres status score availableChaptersDetail}}",
            { id }
        );
        const manga = data && data.manga;
        if (!manga) {
            throw new Error(`[AllManga] Manga not found for id ${id}`);
        }

        const genre       = manga.genres || [];
        const status      = this.parseStatus(manga.status);
        const pref        = new SharedPreferences().get("preferred_title_style") || "eng";
        const name        = this.pickTitle(manga, pref);
        const imageUrl    = this.coverUrl(manga.thumbnail);
        const description = [
            manga.description || "",
            manga.score ? `\nScore: ${manga.score}★` : ""
        ].join("").trim();

        const detail = manga.availableChaptersDetail || {};
        const subList = Array.isArray(detail.sub) ? detail.sub : [];
        const rawList = Array.isArray(detail.raw) ? detail.raw : [];
        const chapNums = subList.length > 0 ? subList : rawList;
        const chapType = subList.length > 0 ? "sub" : "raw";

        const sorted = [...chapNums].sort((a, b) => parseFloat(a) - parseFloat(b));
        const chapters = sorted.map((chapNum) => ({
            name: `Chapter ${chapNum}`,
            url:  JSON.stringify({ mangaId: id, chapterString: String(chapNum), chapType }),
            dateUpload: ""
        }));

        return { name, imageUrl, description, author: "", status, genre, chapters };
    }

    // ── Page list (images for one chapter) ───────────────────────────────────
    async getPageList(url) {
        let mangaId, chapterString, chapType;
        try {
            const obj = JSON.parse(url);
            mangaId        = obj.mangaId;
            chapterString  = String(obj.chapterString ?? obj.chapNum);
            chapType       = obj.chapType || "sub";
        } catch (_) { return []; }

        // `chaptersForRead` returns the reader pages of one chapter. Its
        // `pictureUrls[].url` values are relative to the image CDN head.
        const data = await this.gql(
            "query($mangaId:String!,$chapterString:String!,$translationType:VaildTranslationTypeMangaEnumType!){" +
            "chaptersForRead(mangaId:$mangaId,chapterString:$chapterString,translationType:$translationType){" +
            "edges{pictureUrls pictureUrlHead}}}",
            { mangaId, chapterString, translationType: chapType }
        );
        const edges = data && data.chaptersForRead && data.chaptersForRead.edges;
        if (!Array.isArray(edges) || edges.length === 0) {
            throw new Error("[AllManga] Chapter response did not contain page images");
        }
        // `chaptersForRead` answers with several mirrors of the SAME chapter (an
        // `images133/…` edge plus a `file/imghub/…` one). Concatenating them
        // doubles the page count and appends a dead mirror; keep the first edge
        // that actually yields pages. `pictureUrlHead` is null on every source
        // seen so far, so IMAGE_HEAD is the default head. Reader pages are
        // requested from the `ytimgf` head (see [readerHead]) and each page
        // carries the CDN Referer so the request is not answered with 403.
        const headers = this.getHeaders();
        const pages = [];
        for (const edge of edges) {
            const head = this.readerHead(edge && edge.pictureUrlHead);
            for (const picture of ((edge && edge.pictureUrls) || [])) {
                const url = this.imageUrl(picture && picture.url, head);
                if (url) pages.push({ url, headers });
            }
            if (pages.length > 0) break;
        }
        if (pages.length === 0) {
            throw new Error("[AllManga] Chapter response did not contain page images");
        }
        return pages;
    }

    // ── Status parser ────────────────────────────────────────────────────────
    parseStatus(s) {
        switch ((s || "").toLowerCase()) {
            case "releasing":        return 0;
            case "finished":         return 1;
            case "not yet released": return 0;
            case "hiatus":           return 2;
            case "discontinued":     return 3;
            default:                 return 5;
        }
    }

    // ── Filters ──────────────────────────────────────────────────────────────
    getFilterList() {
        return [
            {
                type_name: "SelectFilter",
                name: "Country",
                state: 0,
                values: [
                    ["All Countries", "ALL"],
                    ["Japan (Manga)",     "JP"],
                    ["South Korea (Manhwa)", "KR"],
                    ["China (Manhua)",    "CN"],
                    ["Taiwan",            "TW"],
                    ["Hong Kong",         "HK"],
                    ["USA",               "US"],
                ].map((x) => ({ type_name: "SelectOption", name: x[0], value: x[1] }))
            },
            {
                type_name: "SelectFilter",
                name: "Adult",
                state: 0,
                values: [
                    ["No adult content", "false"],
                    ["Include adult",    "true"],
                ].map((x) => ({ type_name: "SelectOption", name: x[0], value: x[1] }))
            }
        ];
    }

    // ── Preferences ──────────────────────────────────────────────────────────
    getSourcePreferences() {
        return [
            {
                key: "preferred_title_style",
                listPreference: {
                    title: "Preferred title language",
                    summary: "",
                    valueIndex: 1,
                    entries: ["Romaji", "English", "Native"],
                    entryValues: ["romaji", "eng", "native"]
                }
            }
        ];
    }

    // ── New series ───────────────────────────────────────────────────────────
    // `formatHome` returns the site's "new series" rail. `previewLimit` sizes
    // it; there is no paging on this rail, so `hasNextPage` is always false.
    async getNewSeries() {
        const data = await this.gql(
            "query($format:String!,$size:Int!){formatHome(format:$format," +
            "sections:[newSeries],previewLimit:$size){newSeries{" +
            "_id name englishName nativeName thumbnail}}}",
            { format: "manga", size: 24 }
        );
        const items = data && data.formatHome && data.formatHome.newSeries;
        if (!Array.isArray(items)) {
            throw new Error("[AllManga] New series response did not contain items");
        }
        const pref = new SharedPreferences().get("preferred_title_style") || "eng";
        const list = items.map((m) => ({
            name:     this.pickTitle(m, pref),
            imageUrl: this.coverUrl(m.thumbnail),
            link:     `/manga/${m._id}/${this.slugify(m.name)}`
        }));
        return { list, hasNextPage: false };
    }

    // ── Custom lists ─────────────────────────────────────────────────────────
    // The home layout asks for one rail per section id, and every id must
    // resolve to its OWN feed or the home shows the same list several times:
    //   spotlight        → the hero slice of the weekly ranking
    //   popular          → the weekly ranking (`queryPopular`)
    //   top_rated        → the all-time ranking (`sortBy: Top`)
    //   trending         → the site's trending ranking
    //   latest           → the latest chapter updates
    //   new              → the new-series rail (`formatHome.newSeries`)
    //   category_<genre> → the most popular titles of one genre
    // Every rail is memoised for a few minutes: the home fires one request per
    // section and the cache keeps a revisit from re-requesting the whole set.
    async getCustomList(listId, page) {
        const id = String(listId || "");
        return this.memo(`list:${id}:${page}`, RAIL_CACHE_TTL_MS, async () => {
            if (id === "spotlight") {
                const popular = await this.getPopular(1);
                return { list: popular.list.slice(0, 8), hasNextPage: false };
            }
            if (id === "popular") return this.getPopular(page);
            if (id === "new") return this.getNewSeries();
            const genre = this.genreFromListId(id);
            if (genre) {
                return this.getRanked(
                    { genres: [genre], sortBy: "Popular", sortDirection: "DSC" },
                    page
                );
            }
            const sort = this.sortFromListId(id);
            if (sort) {
                return this.getRanked(
                    { sortBy: sort[0], sortDirection: sort[1] },
                    page
                );
            }
            return this.getLatestUpdates(page);
        });
    }

    // `category_<genre>` (the layout convention) or the bare genre name. Section
    // ids are lowercase and hyphenated (`category_slice-of-life`), so both sides
    // are normalised to lowercase words and the API's canonical spelling wins.
    genreFromListId(listId) {
        const id = String(listId || "");
        const value = this._genreKey(
            id.startsWith("category_") ? id.slice("category_".length) : id
        );
        if (!value) return "";
        return this.knownGenres().find((g) => this._genreKey(g) === value) || "";
    }

    _genreKey(value) {
        return String(value || "").toLowerCase().replace(/[-_]+/g, " ").trim();
    }

    sortFromListId(listId) {
        const map = {
            top_rated: ["Top", "DSC"],
            trending: ["Trending", "DSC"],
            popular_weekly: ["Popular", "DSC"]
        };
        return map[String(listId || "")] || null;
    }

    // Genres the API's `genres:[…]` filter actually answers with results. The
    // vocabulary is measured from the popular set, not invented: a name the API
    // does not know returns an empty list rather than an error, so an unknown
    // genre would silently render an empty rail.
    knownGenres() {
        return [
            "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror",
            "Mystery", "Romance", "Sci-Fi", "Slice of Life", "Supernatural",
            "Thriller", "Isekai", "Shounen", "Seinen", "Shoujo", "Josei",
            "Harem", "Ecchi", "Historical", "Mecha", "Music", "Psychological",
            "School", "Sports", "Tragedy", "Vampire", "Demons", "Magic",
            "Martial Arts", "Military", "Reincarnation", "Super Power",
            "Time Travel", "Webtoons", "Manhwa"
        ];
    }

    // Ranking query: `mangas(search:{…,sortBy,sortDirection})` is the only
    // surface that sorts and filters at once, and it is what powers the genre
    // rails (`genres:[…]`) and the top/trending rails (`sortBy`).
    async getRanked(search, page) {
        const data = await this.gql(
            "query($search:SearchInput,$limit:Int,$page:Int){" +
            "mangas(search:$search,limit:$limit,page:$page){" +
            "edges{_id name englishName nativeName thumbnail}}}",
            {
                search: Object.assign(
                    { query: "", allowAdult: false, allowUnknown: false },
                    search
                ),
                limit: 26,
                page
            }
        );
        const edges = data && data.mangas && data.mangas.edges;
        if (!Array.isArray(edges)) {
            throw new Error("[AllManga] Ranking response did not contain manga results");
        }
        const pref = new SharedPreferences().get("preferred_title_style") || "eng";
        return this.parseMangaList(edges, pref, edges.length === 26);
    }
}
