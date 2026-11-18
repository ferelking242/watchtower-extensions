// MKissa manga extension for Watchtower
// MKissa (https://mkissa.to/manga) serves the same AllAnime GraphQL schema as
// AllManga, from https://api.mkissa.net/api. Chapters and page images are the
// same youtube-anime CDN as AllManga.
// v0.1.0 — initial release. POST the GraphQL body (a GET is answered 403
// cf-mitigated: challenge); read availableChaptersDetail as an untyped Object;
// fetch chapter pages through chaptersForRead and prefix the relative image
// paths with the youtube-anime CDN head.
// v0.2.3 — request reader pages from `ytimgf.youtube-anime.com` directly: `aln`
// only 301s them to `ytimgf`, and the app's Rust client rewrites `Referer` to
// the `aln` URL on that 301, which the CDN answers with 403. The reader retried
// over the Dart client and survived; the download worker (Rust client only) died
// on every page. Same fix applied to AllManga.
// v0.2.4 — getCustomList answers each home section id with its own feed
// (spotlight / popular / latest / new) instead of one list for every rail.

const watchtowerSources = [{
    "name": "MKissa",
    "lang": "en",
    "id": 2000001178,
    "baseUrl": "https://mkissa.to",
    "apiUrl": "https://api.mkissa.net/api",
    "iconUrl": "https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/assets/icons/manga-2000001178.png",
    "typeSource": "single",
    "itemType": 0,
    "isNsfw": false,
    "hasCloudflare": true,
    "version": "0.2.4",
    "login": false,
    "forYou": false,
    "dateFormat": "",
    "dateFormatLocale": "",
    "pkgPath": "manga/src/en/mkissa.js",
    "isManga": true,
    "isFullData": false,
    "appMinVerReq": "0.5.0",
    "additionalParams": "",
    "sourceCodeLanguage": 1,
    "notes": "MKissa manga — AllAnime GraphQL schema via api.mkissa.net. Chapter images served via the youtube-anime CDN.",
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": true,
    "paywall": "free",
    "subCategories": ["Multi-lang"],
    "supportsComments": false
}];

const BASE_URL   = "https://mkissa.to";
const API_URL    = "https://api.mkissa.net/api";
// Relative image paths (`mcovers/…`, `images133/<id>/<chap>/<type>/<n>.jpg`)
// are served by the youtube-anime image CDN. `pictureUrlHead` is null on every
// source seen so far, so this constant is the default head.
//
// The CDN splits the two families across hosts: `aln` serves *covers* directly
// (200) but answers every *reader page* with a 301 to `ytimgf`, which serves the
// page. That redirect is fatal in the app's Rust HTTP client: reqwest rewrites
// `Referer` to the redirecting URL on a 301, and `ytimgf` answers `403` to any
// `aln` Referer (measured 2026-11-17: `Referer: https://mkissa.to/` → 200,
// `Referer: https://aln.youtube-anime.com/…` → 403, no Referer → 403). The
// reader survives only because it retries over the plain Dart client, which
// does not rewrite the Referer; the download worker uses the Rust client alone
// and dies on the 403. Asking `ytimgf` for the page directly skips the 301, so
// the extension's `Referer` reaches the CDN intact.
const IMAGE_HEAD = "https://aln.youtube-anime.com";
const READER_HEAD = "https://ytimgf.youtube-anime.com";

class DefaultExtension extends MProvider {

    // ── HTTP helper ──────────────────────────────────────────────────────────
    // The API is behind Cloudflare: a GET with the query in the URL is answered
    // `403 cf-mitigated: challenge`, while the same payload as a JSON POST
    // returns `200`. The extension must therefore POST the body.
    async gql(query, variables) {
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
            throw new Error("[MKissa] API returned invalid JSON");
        }
        if (Array.isArray(payload.errors) && payload.errors.length) {
            const message = payload.errors
                .map((error) => error && error.message)
                .filter(Boolean)
                .join("; ");
            throw new Error(`[MKissa] GraphQL error${message ? `: ${message}` : ""}`);
        }
        return payload.data;
    }

    // ── Image URL ────────────────────────────────────────────────────────────
    // The API returns covers and reader pages as relative CDN paths.
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
            throw new Error("[MKissa] Popular response did not contain recommendations");
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
            throw new Error("[MKissa] Search response did not contain manga results");
        }
        const pref = new SharedPreferences().get("preferred_title_style") || "eng";
        return this.parseMangaList(edges, pref, edges.length === 26);
    }

    // ── Detail (manga info + chapter list) ───────────────────────────────────
    async getDetail(url) {
        const id = url.includes("mkissa.to")
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
            throw new Error(`[MKissa] Manga not found for id ${id}`);
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

        const detail   = manga.availableChaptersDetail || {};
        const subList  = Array.isArray(detail.sub) ? detail.sub : [];
        const rawList  = Array.isArray(detail.raw) ? detail.raw : [];
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
            mangaId       = obj.mangaId;
            chapterString = String(obj.chapterString ?? obj.chapNum);
            chapType      = obj.chapType || "sub";
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
            throw new Error("[MKissa] Chapter response did not contain page images");
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
            throw new Error("[MKissa] Chapter response did not contain page images");
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
            throw new Error("[MKissa] New series response did not contain items");
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
    // The home layout asks for one rail per section id. Every id must resolve
    // to its OWN feed, otherwise the home shows the same list three times:
    //   spotlight → the hero slice of the weekly ranking
    //   popular   → the full weekly ranking
    //   latest    → the latest chapter updates
    //   new       → the new-series rail
    // An unknown id falls back to the latest updates so a rail is never empty.
    async getCustomList(listId, page) {
        if (listId === "spotlight") {
            const popular = await this.getPopular(1);
            return { list: popular.list.slice(0, 8), hasNextPage: false };
        }
        if (listId === "popular") return this.getPopular(page);
        if (listId === "new") return this.getNewSeries();
        return this.getLatestUpdates(page);
    }
}
