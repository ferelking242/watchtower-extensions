const mangayomiSources = [{
    "name": "XNXX",
    "lang": "en",
    "baseUrl": "https://www.xnxx.com",
    "apiUrl": "",
    "iconUrl": "https://www.xnxx.com/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.0.9",
    "pkgPath": "xnxx/en/en.xnxx.js",
    "notes": "Adult content (18+)",
    "isNsfw": true
}];

class DefaultExtension extends MProvider {

    // ---------- preferences ----------
    _pref(key, def) {
        const p = this.source && this.source.prefs && this.source.prefs.find(x => x.key === key);
        return (p && p.value !== undefined && p.value !== null && p.value !== "") ? p.value : def;
    }
    get langCode()    { return this._pref("xnxx_lang", "en"); }
    get prefQuality() { return this._pref("preferred_quality", "auto"); }

    getHeaders(url) {
        // Full browser-like header set. xnxx servers drop bare requests
        // ("Connection closed before full header was received") when the
        // request looks too thin (no Accept, no Sec-Fetch, etc.).
        return {
            "Referer": "https://www.xnxx.com/",
            "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": this.langCode + ",en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-User": "?1",
            "Cookie": "lang=" + this.langCode
        };
    }

    // GET with up to 3 retries on transient connection failures
    // ("Connection closed before full header was received", reset, etc.).
    async _safeGet(url) {
        let lastErr = null;
        for (let i = 0; i < 3; i++) {
            try {
                const res = await new Client().get(url, this.getHeaders(url));
                if (res && res.body && res.body.length > 0) return res;
                lastErr = new Error("Empty body");
            } catch (e) {
                lastErr = e;
            }
            // small backoff between retries
            await new Promise(r => setTimeout(r, 350 + i * 400));
        }
        throw lastErr || new Error("Request failed: " + url);
    }

    // ---------- listing ----------
    // Popular = global "hits" list (the most-watched videos site-wide)
    // — `https://www.xnxx.com/hits` → page 1, `/hits/<n>` → page n.
    async getPopular(page) {
        const url = page <= 1
            ? `https://www.xnxx.com/hits`
            : `https://www.xnxx.com/hits/${page}`;
        const res = await this._safeGet(url);
        return this._parseVideoList(res.body);
    }
    get supportsLatest() { return true; }
    // Latest = freshly added videos in the user's language section
    // (`/new/<lang>/<page>` is xnxx's official "latest uploads" feed).
    async getLatestUpdates(page) {
        const url = `https://www.xnxx.com/new/${this.langCode}/${page}`;
        const res = await this._safeGet(url);
        return this._parseVideoList(res.body);
    }

    _filterValue(filters, name, fallback) {
        if (!Array.isArray(filters)) return fallback;
        for (const f of filters) {
            if (!f || f.name !== name) continue;
            if (f.type_name === "SelectFilter" && Array.isArray(f.values)) {
                const idx = typeof f.state === "number" ? f.state : 0;
                const v = f.values[idx];
                return v && typeof v.value === "string" ? v.value : fallback;
            }
            if (f.type_name === "TextFilter") {
                return typeof f.state === "string" ? f.state : fallback;
            }
        }
        return fallback;
    }

    async search(query, page, filters) {
        const q = (query || "").trim();
        const sort = this._filterValue(filters, "Sort by", "");
        const category = this._filterValue(filters, "Category", "");
        const duration = this._filterValue(filters, "Duration", "");
        const quality = this._filterValue(filters, "Video quality", "");
        const tag = (this._filterValue(filters, "Tag (slug)", "") || "").trim();

        // No query, no filters → fall back to "best" listing for the language.
        const noQuery = !q;
        const noFilters = !sort && !category && !duration && !quality && !tag;
        if (noQuery && noFilters) {
            return this.getPopular(page);
        }

        // /tags/<slug> when a tag slug is given (overrides everything else).
        if (noQuery && tag) {
            const slug = encodeURIComponent(tag.replace(/^\/+|\/+$/g, ""));
            const url = `https://www.xnxx.com/tags/${slug}/${page}`;
            const res = await this._safeGet(url);
            return this._parseVideoList(res.body);
        }

        // /c/<lang>/<category>/<page> when a category is selected and there is no free-text query.
        if (noQuery && category) {
            const url = `https://www.xnxx.com/c/${this.langCode}/${encodeURIComponent(category)}/${page}`;
            const res = await this._safeGet(url);
            return this._parseVideoList(res.body);
        }

        // Otherwise → /search/<lang>/<query>/<filter-segments>/<page>
        const queryPart = q
            ? encodeURIComponent(q.replace(/\s+/g, "+"))
            : "-"; // xnxx accepts an empty placeholder for filter-only browsing.
        const segments = [];
        if (category) segments.push(category);                 // e.g. "milf"
        if (duration) segments.push(`duration-${duration}`);   // 0_5, 5_10, 10_20, 20_more
        if (quality)  segments.push(`hd-${quality}`);          // 720, 1080
        if (sort)     segments.push(sort);                     // top-rated, newest, longest...
        const filterPath = segments.length ? `/${segments.join("/")}` : "";
        const url = `https://www.xnxx.com/search/${this.langCode}/${queryPart}${filterPath}/${page}`;
        const res = await this._safeGet(url);
        return this._parseVideoList(res.body);
    }

    _parseVideoList(html) {
        const doc = new Document(html);
        const items = [];
        const seen = new Set();
        const cards = doc.select(".mozaique .thumb-block");
        for (const card of cards) {
            // Title is on the anchor in .thumb-under (its `title` attr or text), not on the inner thumb anchor.
            let title = "";
            const aWithTitle = card.selectFirst(".thumb-under a[title]") || card.selectFirst("a[title]");
            if (aWithTitle) title = (aWithTitle.attr("title") || aWithTitle.text || "").trim();
            if (!title) {
                const u = card.selectFirst(".thumb-under p a") || card.selectFirst(".thumb-under a");
                if (u) title = (u.text || "").trim();
            }
            const anchor = card.selectFirst("a[href*='/video-']") || card.selectFirst("a");
            if (!anchor) continue;
            const href = anchor.attr("href") || "";
            if (!href || href === "#") continue;
            const link = href.startsWith("http") ? href : `https://www.xnxx.com${href}`;
            if (seen.has(link)) continue;
            seen.add(link);

            const imgEl = card.selectFirst("img");
            const thumb = imgEl ? (imgEl.attr("data-src") || imgEl.attr("data-original") || imgEl.attr("src") || "") : "";
            const durEl = card.selectFirst(".thumb-under .metadata") || card.selectFirst(".duration");
            let duration = "";
            if (durEl) {
                const t = (durEl.text || "").replace(/\s+/g, " ").trim();
                const m = t.match(/(\d+\s*(?:min|sec|h))/i);
                if (m) duration = m[1];
            }

            items.push({
                name: title || "Untitled",
                imageUrl: thumb,
                link,
                description: duration ? `Duration: ${duration}` : ""
            });
        }
        const hasNext = !!doc.selectFirst(".pagination .next, a[rel='next'], .no-page.next-page");
        return { list: items, hasNextPage: hasNext };
    }

    // ---------- detail ----------
    async getDetail(url) {
        const res = await this._safeGet(url);
        const doc = new Document(res.body);
        const title = (doc.selectFirst('meta[property="og:title"]')?.attr("content")
            || doc.selectFirst("h2.page-title, h1.content-title")?.text
            || "").trim();
        const description = (doc.selectFirst('meta[property="og:description"]')?.attr("content")
            || doc.selectFirst(".video-description, .metadata")?.text
            || "").trim();
        const thumb = doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
        // Tags as plain strings (not {name:...} objects).
        const tagEls = doc.select(".video-tags a, .metadata-row.tags a, a[href*='/tags/'], a[href*='/categories/']");
        const tags = [];
        const seen = new Set();
        for (const el of tagEls) {
            const t = (el.text || "").trim();
            if (t && !seen.has(t)) { seen.add(t); tags.push(t); }
        }
        return {
            name: title || "Untitled",
            imageUrl: thumb,
            description,
            genre: tags,
            status: 0,
            episodes: [{ name: (title && title.trim ? title.trim() : (title || "Watch")), url }]
        };
    }

    // ---------- video sources ----------
    async getVideoList(url) {
        let html = "";
        try {
            const res = await this._safeGet(url);
            html = res.body || "";
        } catch (e) {
            // Last-ditch fallback to mobile site (m.xnxx.com), which is far
            // more permissive and rarely closes the connection.
            const mUrl = url.replace("://www.xnxx.com", "://m.xnxx.com");
            try {
                const res2 = await this._safeGet(mUrl);
                html = res2.body || "";
            } catch (_) {
                throw e;
            }
        }
        const videos = [];
        const headers = this.getHeaders(url);
        const seenUrls = new Set();
        const pushVid = (u, q) => {
            if (!u || seenUrls.has(u)) return;
            seenUrls.add(u);
            videos.push({ url: u, quality: q, originalUrl: u, headers });
        };

        const hls  = (html.match(/html5player\.setVideoHLS\(['"]([^'"]+)['"]\)/)       || [])[1];
        const high = (html.match(/html5player\.setVideoUrlHigh\(['"]([^'"]+)['"]\)/)   || [])[1];
        const low  = (html.match(/html5player\.setVideoUrlLow\(['"]([^'"]+)['"]\)/)    || [])[1];

        // 1) Fetch the HLS master playlist and expose every variant
        // (1080p / 720p / 480p / 360p / 240p depending on the video) as
        // its own quality entry. Many xnxx videos only ship 360p and 720p
        // here, but for the ones that have 480p/1080p the user gets them.
        if (hls) {
            pushVid(hls, "Auto · HLS");
            try {
                const m = await this._safeGet(hls);
                const body = m.body || "";
                if (body.includes("#EXT-X-STREAM-INF")) {
                    const baseIdx = hls.lastIndexOf("/");
                    const baseUrl = baseIdx > 0 ? hls.substring(0, baseIdx) : hls;
                    const lines = body.split("\n");
                    const variants = [];
                    for (let i = 0; i < lines.length; i++) {
                        const ln = lines[i].trim();
                        if (!ln.startsWith("#EXT-X-STREAM-INF")) continue;
                        const resM = ln.match(/RESOLUTION=\d+x(\d+)/i);
                        const nameM = ln.match(/NAME="?([^",]+)"?/i);
                        const bwM = ln.match(/BANDWIDTH=(\d+)/i);
                        let label = nameM ? nameM[1] : (resM ? resM[1] + "p" : (bwM ? Math.round(parseInt(bwM[1])/1000) + "kbps" : "variant"));
                        let next = "";
                        for (let j = i + 1; j < lines.length; j++) {
                            const c = lines[j].trim();
                            if (!c || c.startsWith("#")) continue;
                            next = c; break;
                        }
                        if (!next) continue;
                        const abs = next.startsWith("http") ? next : (baseUrl + "/" + next.replace(/^\//, ""));
                        const height = resM ? parseInt(resM[1]) : 0;
                        variants.push({ url: abs, label, height });
                    }
                    // Sort variants high → low so dropdowns make sense
                    variants.sort((a, b) => b.height - a.height);
                    for (const v of variants) pushVid(v.url, v.label + " · HLS");
                }
            } catch (_) {
                // Master fetch failed → keep just "Auto · HLS"
            }
        }

        // 2) Direct MP4 URLs (Low/High often point to the SAME mp4_sd.mp4
        // on xnxx — dedupe by URL so we don't show "720p" and "360p" both
        // pointing to the same SD file).
        if (high) pushVid(high, "High · MP4 direct");
        if (low && low !== high) pushVid(low, "Low · MP4 direct");

        // Sort with preferred quality first
        const want = (this.prefQuality || "auto").toLowerCase();
        const matchKey = q => {
            const ql = q.toLowerCase();
            if (want === "auto"   && ql.includes("auto"))   return 0;
            if (want === "1080p"  && ql.includes("1080"))   return 0;
            if (want === "720p"   && ql.includes("720"))    return 0;
            if (want === "480p"   && ql.includes("480"))    return 0;
            if (want === "360p"   && ql.includes("360"))    return 0;
            return 1;
        };
        videos.sort((a, b) => matchKey(a.quality) - matchKey(b.quality));
        return videos;
    }
    async getPageList(url) { return []; }

    getFilterList() {
        const sel = (name, values, state = 0) => ({
            type_name: "SelectFilter",
            name,
            state,
            values: values.map(v => ({
                type_name: "SelectOption",
                name: v[0],
                value: v[1],
            })),
        });
        return [
            sel("Sort by", [
                ["Relevance",  ""],
                ["Newest",     "newest"],
                ["Top rated",  "top-rated"],
                ["Longest",    "longest"],
                ["Most viewed", "most-viewed"],
            ]),
            // Big curated category list (≈170 of the most popular xnxx
            // category slugs) — the host's /tags page lists ~2000 tags so
            // this is still a curated subset, but it covers everything
            // the average user actually browses for. Items are sorted
            // alphabetically; the "Tag (slug)" filter at the bottom lets
            // power users target any other tag directly.
            sel("Category", [
                ["All",                       ""],
                ["18 Year Old",               "18-year-old"],
                ["19 Year Old",               "19-year-old"],
                ["3D",                        "3d"],
                ["3some",                     "3some"],
                ["4some",                     "4some"],
                ["African",                   "african"],
                ["Amateur",                   "amateur"],
                ["American",                  "american"],
                ["Anal",                      "anal"],
                ["Anime",                     "anime"],
                ["Arab",                      "arab"],
                ["Argentinian",               "argentinian"],
                ["Asian",                     "asian"],
                ["Ass",                       "ass"],
                ["Ass Licking",               "ass-licking"],
                ["Ass to Mouth",              "ass-to-mouth"],
                ["Aunt",                      "aunt"],
                ["Babe",                      "babe"],
                ["Babysitter",                "babysitter"],
                ["Backroom",                  "backroom"],
                ["Ballerina",                 "ballerina"],
                ["Banana",                    "banana"],
                ["Bareback",                  "bareback"],
                ["Bath",                      "bath"],
                ["BBC",                       "bbc"],
                ["BBW",                       "bbw"],
                ["BDSM",                      "bdsm"],
                ["Beach",                     "beach"],
                ["Beautiful",                 "beautiful"],
                ["Bed",                       "bed"],
                ["Behind the Scenes",         "behind-the-scenes"],
                ["Big Ass",                   "big-ass"],
                ["Big Black Cock",            "big-black-cock"],
                ["Big Clit",                  "big-clit"],
                ["Big Cock",                  "big-cock"],
                ["Big Dick",                  "big-dick"],
                ["Big Natural Tits",          "big-natural-tits"],
                ["Big Tits",                  "big-tits"],
                ["Bikini",                    "bikini"],
                ["Bisexual",                  "bisexual"],
                ["Black",                     "black"],
                ["Black Cock",                "black-cock"],
                ["Blindfolded",               "blindfolded"],
                ["Blonde",                    "blonde"],
                ["Blowbang",                  "blowbang"],
                ["Blowjob",                   "blowjob"],
                ["Bondage",                   "bondage"],
                ["Boobs",                     "boobs"],
                ["Boots",                     "boots"],
                ["Boss",                      "boss"],
                ["Boyfriend",                 "boyfriend"],
                ["Brazilian",                 "brazilian"],
                ["Bride",                     "bride"],
                ["British",                   "british"],
                ["Brunette",                  "brunette"],
                ["Bukkake",                   "bukkake"],
                ["Bus",                       "bus"],
                ["Busty",                     "busty"],
                ["Car",                       "car"],
                ["Cartoon",                   "cartoon"],
                ["Casting",                   "casting"],
                ["Caught",                    "caught"],
                ["Celebrity",                 "celebrity"],
                ["Cheating",                  "cheating"],
                ["Cheerleader",               "cheerleader"],
                ["Chinese",                   "chinese"],
                ["Chubby",                    "chubby"],
                ["Classic",                   "classic"],
                ["Close Up",                  "close-up"],
                ["Clothed",                   "clothed"],
                ["Club",                      "club"],
                ["College",                   "college"],
                ["Compilation",               "compilation"],
                ["Cosplay",                   "cosplay"],
                ["Cougar",                    "cougar"],
                ["Couple",                    "couple"],
                ["Creampie",                  "creampie"],
                ["Crossdresser",              "crossdresser"],
                ["Cuckold",                   "cuckold"],
                ["Cumshot",                   "cumshot"],
                ["Curvy",                     "curvy"],
                ["Cute",                      "cute"],
                ["Czech",                     "czech"],
                ["Dad",                       "dad"],
                ["Dance",                     "dance"],
                ["Daughter",                  "daughter"],
                ["Deepthroat",                "deepthroat"],
                ["Desk",                      "desk"],
                ["Doctor",                    "doctor"],
                ["Doggy Style",               "doggy-style"],
                ["Double Penetration",        "double-penetration"],
                ["Dress",                     "dress"],
                ["Drunk",                     "drunk"],
                ["Ebony",                     "ebony"],
                ["European",                  "european"],
                ["Exhibitionist",             "exhibitionist"],
                ["Extreme",                   "extreme"],
                ["Face Sitting",              "face-sitting"],
                ["Facial",                    "facial"],
                ["Family",                    "family"],
                ["Fantasy",                   "fantasy"],
                ["Fat",                       "fat"],
                ["Femdom",                    "femdom"],
                ["Fetish",                    "fetish"],
                ["Filipina",                  "filipina"],
                ["Fingering",                 "fingering"],
                ["First Time",                "first-time"],
                ["Fishnet",                   "fishnet"],
                ["Fisting",                   "fisting"],
                ["Fitness",                   "fitness"],
                ["Flexible",                  "flexible"],
                ["Footjob",                   "footjob"],
                ["French",                    "french"],
                ["Funny",                     "funny"],
                ["Gangbang",                  "gangbang"],
                ["Gay",                       "gay"],
                ["German",                    "german"],
                ["Gilf",                      "gilf"],
                ["Girlfriend",                "girlfriend"],
                ["Glamour",                   "glamour"],
                ["Glasses",                   "glasses"],
                ["Goth",                      "goth"],
                ["Granny",                    "granny"],
                ["Group",                     "group"],
                ["Gym",                       "gym"],
                ["Hairy",                     "hairy"],
                ["Handjob",                   "handjob"],
                ["Hardcore",                  "hardcore"],
                ["Hd",                        "hd"],
                ["Hentai",                    "hentai"],
                ["Hidden Cam",                "hidden-cam"],
                ["High Heels",                "high-heels"],
                ["Homemade",                  "homemade"],
                ["Hot",                       "hot"],
                ["Hotel",                     "hotel"],
                ["Housewife",                 "housewife"],
                ["Huge Cock",                 "huge-cock"],
                ["Husband",                   "husband"],
                ["Indian",                    "indian"],
                ["Indonesian",                "indonesian"],
                ["Innocent",                  "innocent"],
                ["Interracial",               "interracial"],
                ["Italian",                   "italian"],
                ["JAV",                       "jav"],
                ["Japanese",                  "japanese"],
                ["Jeans",                     "jeans"],
                ["Joi",                       "joi"],
                ["Kissing",                   "kissing"],
                ["Kitchen",                   "kitchen"],
                ["Korean",                    "korean"],
                ["Latex",                     "latex"],
                ["Latina",                    "latina"],
                ["Leather",                   "leather"],
                ["Lesbian",                   "lesbian"],
                ["Lingerie",                  "lingerie"],
                ["Long Hair",                 "long-hair"],
                ["Maid",                      "maid"],
                ["Massage",                   "massage"],
                ["Masturbation",              "masturbation"],
                ["Mature",                    "mature"],
                ["Mexican",                   "mexican"],
                ["MILF",                      "milf"],
                ["Mistress",                  "mistress"],
                ["Mom",                       "mom"],
                ["Money",                     "money"],
                ["Muscular",                  "muscular"],
                ["Natural Tits",              "natural-tits"],
                ["Neighbour",                 "neighbour"],
                ["Nerd",                      "nerd"],
                ["Nipples",                   "nipples"],
                ["Nun",                       "nun"],
                ["Nurse",                     "nurse"],
                ["Office",                    "office"],
                ["Oil",                       "oil"],
                ["Old & Young",               "old-and-young"],
                ["Old Man",                   "old-man"],
                ["Orgasm",                    "orgasm"],
                ["Orgy",                      "orgy"],
                ["Outdoor",                   "outdoor"],
                ["Panties",                   "panties"],
                ["Pantyhose",                 "pantyhose"],
                ["Park",                      "park"],
                ["Party",                     "party"],
                ["Pawg",                      "pawg"],
                ["Petite",                    "petite"],
                ["Piercing",                  "piercing"],
                ["Pissing",                   "pissing"],
                ["Police",                    "police"],
                ["Pool",                      "pool"],
                ["Pornstar",                  "pornstar"],
                ["POV",                       "pov"],
                ["Pregnant",                  "pregnant"],
                ["Public",                    "public"],
                ["Punishment",                "punishment"],
                ["Pussy",                     "pussy"],
                ["Pussy Licking",             "pussy-licking"],
                ["Reality",                   "reality"],
                ["Redhead",                   "redhead"],
                ["Riding",                    "riding"],
                ["Rough",                     "rough"],
                ["Russian",                   "russian"],
                ["School",                    "school"],
                ["Secretary",                 "secretary"],
                ["Shaved",                    "shaved"],
                ["Shemale",                   "shemale"],
                ["Shower",                    "shower"],
                ["Sister",                    "sister"],
                ["Skinny",                    "skinny"],
                ["Slave",                     "slave"],
                ["Sleeping",                  "sleeping"],
                ["Slim",                      "slim"],
                ["Small Tits",                "small-tits"],
                ["Smoking",                   "smoking"],
                ["Solo",                      "solo"],
                ["Spandex",                   "spandex"],
                ["Spanish",                   "spanish"],
                ["Spanking",                  "spanking"],
                ["Sport",                     "sport"],
                ["Squirt",                    "squirt"],
                ["Stepdaughter",              "stepdaughter"],
                ["Stepmom",                   "stepmom"],
                ["Stepsister",                "stepsister"],
                ["Stockings",                 "stockings"],
                ["Strapon",                   "strapon"],
                ["Striptease",                "striptease"],
                ["Student",                   "student"],
                ["Submissive",                "submissive"],
                ["Swallow",                   "swallow"],
                ["Swimsuit",                  "swimsuit"],
                ["Swinger",                   "swinger"],
                ["Tall",                      "tall"],
                ["Tattoo",                    "tattoo"],
                ["Teacher",                   "teacher"],
                ["Teen (18+)",                "teen"],
                ["Thai",                      "thai"],
                ["Threesome",                 "threesome"],
                ["Tied",                      "tied"],
                ["Tiny",                      "tiny"],
                ["Tits",                      "tits"],
                ["Toilet",                    "toilet"],
                ["Toy",                       "toy"],
                ["Train",                     "train"],
                ["Turkish",                   "turkish"],
                ["Uniform",                   "uniform"],
                ["Upskirt",                   "upskirt"],
                ["Vaginal",                   "vaginal"],
                ["Vibrator",                  "vibrator"],
                ["Vintage",                   "vintage"],
                ["Virgin",                    "virgin"],
                ["Voyeur",                    "voyeur"],
                ["Webcam",                    "webcam"],
                ["Wedding",                   "wedding"],
                ["Wet",                       "wet"],
                ["Wife",                      "wife"],
                ["Workout",                   "workout"],
                ["Yoga",                      "yoga"],
                ["Young",                     "young"],
            ]),
            sel("Duration", [
                ["Any",            ""],
                ["0–5 min",        "0_5"],
                ["5–10 min",       "5_10"],
                ["10–20 min",      "10_20"],
                ["20+ min",        "20_more"],
            ]),
            sel("Video quality", [
                ["Any",   ""],
                ["720p+", "720"],
                ["1080p", "1080"],
            ]),
            { type_name: "HeaderFilter", name: "Browse by tag (overrides category)" },
            { type_name: "TextFilter", name: "Tag (slug)", state: "" },
        ];
    }

    // ---------- preferences schema (shown in app settings) ----------
    getSourcePreferences() {
        return [
            {
                key: "xnxx_lang",
                list_preference: {
                    title: "Content language",
                    summary: "Selects the XNXX language section (Popular/New/Search) — sent as `lang` cookie + Accept-Language.",
                    valueIndex: 0,
                    entries: [
                        "English", "Français", "Deutsch", "Español", "Italiano",
                        "Português", "Русский", "日本語", "中文", "한국어",
                        "Nederlands", "Polski", "Türkçe", "العربية", "हिन्दी"
                    ],
                    entryValues: [
                        "en", "fr", "de", "es", "it",
                        "pt", "ru", "jp", "cn", "kr",
                        "nl", "pl", "tr", "ar", "hi"
                    ]
                }
            },
            {
                key: "preferred_quality",
                list_preference: {
                    title: "Preferred quality",
                    summary: "Default video quality picked first in the player.",
                    valueIndex: 0,
                    entries: ["Auto (HLS)", "1080p", "720p", "480p", "360p"],
                    entryValues: ["auto", "1080p", "720p", "480p", "360p"]
                }
            }
        ];
    }
}
