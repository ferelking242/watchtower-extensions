// AllManga extension for Watchtower
// Uses the same GraphQL API as AllAnime (api.allanime.day)
// Manga listing  : https://allmanga.to/manga?cty=ALL
// Chapter reader : served from the youtube-anime image CDN
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
    "version": "0.1.6",
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
const IMAGE_HEAD = "https://aln.youtube-anime.com";

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
            throw new Error("[AllManga] API returned invalid JSON");
        }
        if (Array.isArray(payload.errors) && payload.errors.length) {
            const message = payload.errors
                .map((error) => error && error.message)
                .filter(Boolean)
                .join("; ");
            throw new Error(`[AllManga] GraphQL error${message ? `: ${message}` : ""}`);
        }
        return payload.data;
    }

    // ── Image URL ────────────────────────────────────────────────────────────
    // The API returns covers and reader pages as relative CDN paths
    // (`mcovers/…`, `images133/…`), so they must be prefixed with the head.
    imageUrl(path, head) {
        const raw = String(path || "").trim();
        if (!raw) return "";
        if (raw.startsWith("//")) return `https:${raw}`;
        if (/^https?:\/\//i.test(raw)) return raw;
        const base = String(head || IMAGE_HEAD).replace(/\/$/, "");
        return `${base}/${raw.replace(/^\//, "")}`;
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
            const imageUrl = this.imageUrl(m.thumbnail);
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
            imageUrl: this.imageUrl(r.anyCard.thumbnail),
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
        const imageUrl    = this.imageUrl(manga.thumbnail);
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
        const pages = [];
        for (const edge of edges) {
            const head = edge && edge.pictureUrlHead ? edge.pictureUrlHead : IMAGE_HEAD;
            for (const picture of ((edge && edge.pictureUrls) || [])) {
                const pageUrl = this.imageUrl(picture && picture.url, head);
                if (pageUrl) pages.push(pageUrl);
            }
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

    // ── Custom lists ─────────────────────────────────────────────────────────
    async getCustomList(listId, page) {
        if (listId === "popular") return this.getPopular(page);
        return this.getLatestUpdates(page);
    }
}
