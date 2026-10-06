// AllManga extension for Watchtower
// Uses the same GraphQL API as AllAnime (api.allanime.day)
// Manga listing  : https://allmanga.to/manga?cty=ALL
// Chapter reader : https://mkissa.to  (redirect from AllManga)
// v0.1.2 — report blocked/malformed API responses instead of hiding them

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
    "version": "0.1.2",
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
    "notes": "Uses AllAnime GraphQL API. Chapter images served via api.allanime.day.",
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": true,
    "paywall": "free",
    "subCategories": ["Multi-lang"],
    "supportsComments": false,
    "sourceCodeUrl": "https://cdn.jsdelivr.net/gh/ferelking242/watchtower-extensions@main/src/manga/en/allmanga.js"
}];

const BASE_URL  = "https://allmanga.to";
const API_URL   = "https://api.allanime.day/api";

class DefaultExtension extends MProvider {

    // ── HTTP helper ──────────────────────────────────────────────────────────
    async request(queryString) {
        const res = await new Client().get(
            API_URL + queryString,
            {
                "Accept": "application/json, text/plain, */*",
                "Origin": BASE_URL,
                "Referer": BASE_URL + "/"
            }
        );
        const status = Number(res.statusCode ?? 200);
        const body = String(res.body || "");
        const isCloudflare = /cloudflare|cf-chl|just a moment/i.test(body);

        if (isCloudflare) {
            throw new Error("[AllManga] Cloudflare challenge blocked the API request");
        }
        if (status < 200 || status >= 300) {
            throw new Error(`[AllManga] API returned HTTP ${status}`);
        }

        let payload;
        try {
            payload = JSON.parse(body);
        } catch (_) {
            throw new Error("[AllManga] API returned invalid JSON");
        }
        if (Array.isArray(payload.errors) && payload.errors.length) {
            const message = payload.errors
                .map(error => error?.message)
                .filter(Boolean)
                .join("; ");
            throw new Error(`[AllManga] GraphQL error${message ? `: ${message}` : ""}`);
        }
        return payload;
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
            const imageUrl = m.thumbnail || "";
            const link     = `/manga/${m._id}/${this.slugify(m.name)}`;
            list.push({ name, imageUrl, link });
        }
        return { list, hasNextPage };
    }

    // ── Popular ──────────────────────────────────────────────────────────────
    async getPopular(page) {
        const vars = encodeURIComponent(JSON.stringify({
            type: "manga",
            size: 26,
            dateRange: 1,
            page
        }));
        const gql = encodeURIComponent(
            `query($type:VaildPopularTypeEnumType!,$size:Int!,$dateRange:Int,$page:Int){` +
            `queryPopular(type:$type,size:$size,dateRange:$dateRange,page:$page){` +
            `recommendations{anyCard{_id name englishName nativeName thumbnail slugTime}}` +
            `}}`
        );
        const raw = await this.request(`?variables=${vars}&query=${gql}`);
        const recommendations = raw?.data?.queryPopular?.recommendations;
        if (!Array.isArray(recommendations)) {
            throw new Error("[AllManga] Popular response did not contain recommendations");
        }
        const recs = recommendations.filter(r => r?.anyCard);

        const pref = new SharedPreferences().get("preferred_title_style") || "eng";
        const list = recs.map(r => ({
            name:     this.pickTitle(r.anyCard, pref),
            imageUrl: r.anyCard.thumbnail || "",
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
        // Collect filter values
        let countryOrigin = "ALL";
        let allowAdult    = false;
        for (const f of (filters || [])) {
            if (f.type === "SelectFilter" && f.name === "Country") {
                const opts = ["ALL","JP","KR","CN","TW","HK","US"];
                countryOrigin = opts[f.state] || "ALL";
            }
            if (f.type === "SelectFilter" && f.name === "Adult") {
                allowAdult = f.state === 1;
            }
        }

        const vars = encodeURIComponent(JSON.stringify({
            search: { query: query || "", allowAdult, allowUnknown: false },
            countryOrigin,
            limit: 26,
            page
        }));
        const gql = encodeURIComponent(
            `query($search:SearchInput,$limit:Int,$countryOrigin:VaildCountryOriginEnumType,$page:Int){` +
            `mangas(search:$search,limit:$limit,countryOrigin:$countryOrigin,page:$page){` +
            `edges{_id name englishName nativeName thumbnail slugTime}` +
            `}}`
        );
        const raw = await this.request(`?variables=${vars}&query=${gql}`);
        const edges = raw?.data?.mangas?.edges;
        if (!Array.isArray(edges)) {
            throw new Error("[AllManga] Search response did not contain manga results");
        }

        const pref = new SharedPreferences().get("preferred_title_style") || "eng";
        return this.parseMangaList(edges, pref, edges.length === 26);
    }

    // ── Detail (manga info + chapter list) ───────────────────────────────────
    async getDetail(url) {
        // URL format: /manga/{id}/{slug}  or full https://allmanga.to/manga/{id}/{slug}
        const id = url.includes("allmanga.to")
            ? url.split("/manga/")[1].split("/")[0]
            : url.replace(/^\/manga\//, "").split("/")[0];

        const vars = encodeURIComponent(JSON.stringify({ id }));
        const gql  = encodeURIComponent(
            `query($id:String!){` +
            `manga(_id:$id){` +
            `name englishName nativeName thumbnail description genres status score` +
            `availableChaptersDetail{sub raw}` +
            `}}`
        );
        const raw = await this.request(`?variables=${vars}&query=${gql}`);
        const manga = raw?.data?.manga;
        if (!manga) {
            throw new Error(`[AllManga] Manga not found for id ${id}`);
        }

        const genre       = manga.genres || [];
        const status      = this.parseStatus(manga.status);
        const pref        = new SharedPreferences().get("preferred_title_style") || "eng";
        const name        = this.pickTitle(manga, pref);
        const imageUrl    = manga.thumbnail || "";
        const description = [
            manga.description || "",
            manga.score ? `\nScore: ${manga.score}★` : ""
        ].join("").trim();

        // Chapter list — prefer "sub" (scanlation) over "raw"
        const chapNums = manga.availableChaptersDetail?.sub?.length > 0
            ? manga.availableChaptersDetail.sub
            : (manga.availableChaptersDetail?.raw || []);
        const chapType = manga.availableChaptersDetail?.sub?.length > 0 ? "sub" : "raw";

        // Sort ascending (lowest chapter first)
        const sorted = [...chapNums].sort((a, b) => parseFloat(a) - parseFloat(b));

        const chapters = sorted.map(chapNum => ({
            name: `Chapter ${chapNum}`,
            url:  JSON.stringify({ mangaId: id, chapNum: String(chapNum), chapType }),
            dateUpload: ""
        }));

        return { name, imageUrl, description, author: "", status, genre, chapters };
    }

    // ── Page list (images for one chapter) ───────────────────────────────────
    async getPageList(url) {
        let mangaId, chapNum, chapType;
        try {
            const obj = JSON.parse(url);
            mangaId  = obj.mangaId;
            chapNum  = String(obj.chapNum);
            chapType = obj.chapType || "sub";
        } catch (_) { return []; }

        const vars = encodeURIComponent(JSON.stringify({ mangaId, chapNum, chapType }));
        const gql  = encodeURIComponent(
            `query($mangaId:String!,$chapNum:String!,$chapType:VaildTranslationTypeEnumType!){` +
            `chapterPages(mangaId:$mangaId,chapNum:$chapNum,translationType:$chapType){` +
            `pictureUrls{url}` +
            `}}`
        );
        const raw = await this.request(`?variables=${vars}&query=${gql}`);
        const pages = raw?.data?.chapterPages?.pictureUrls;
        if (!Array.isArray(pages)) {
            throw new Error("[AllManga] Chapter response did not contain page images");
        }
        return pages.map(p => p?.url).filter(Boolean);
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
                ].map(x => ({ type_name: "SelectOption", name: x[0], value: x[1] }))
            },
            {
                type_name: "SelectFilter",
                name: "Adult",
                state: 0,
                values: [
                    ["No adult content", "false"],
                    ["Include adult",    "true"],
                ].map(x => ({ type_name: "SelectOption", name: x[0], value: x[1] }))
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
        if (listId === "popular")  return this.getPopular(page);
        return this.getLatestUpdates(page);
    }
}
