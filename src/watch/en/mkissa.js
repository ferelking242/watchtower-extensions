const watchtowerSources = [{
    "name": "MKissa",
    "lang": "en",
    "baseUrl": "https://mkissa.to",
    "apiUrl": "https://api.mkissa.net/api",
    "iconUrl": "https://mkissa.to/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "isNsfw": false,
    "hasCloudflare": true,
    "version": "0.3.0",
    "login": false,
    "forYou": false,
    "dateFormat": "",
    "dateFormatLocale": "",
    "pkgPath": "anime/src/en/mkissa.js",
    "notes": "MKissa — free anime streaming sub & dub",
    "editableBaseUrl": true
}];

const BASE_URL = "https://mkissa.to";
const API_URL = "https://api.mkissa.net/api";
const GQL_MIN_INTERVAL_MS = 700;

class DefaultExtension extends MProvider {
    getBaseUrl() {
        return new SharedPreferences().get("base_url") || BASE_URL;
    }

    // MKissa serves the same AllAnime GraphQL schema from `api.mkissa.net`.
    // That endpoint is behind Cloudflare: a GET with the query in the URL is
    // answered `403 cf-mitigated: challenge`, while the same payload as a JSON
    // POST returns `200`. The extension must therefore POST the body.
    //
    // The API throttles bursts ("Too many requests, please try again in N
    // seconds"), so calls are serialised behind a minimum interval and retried
    // once after the advertised delay. A home fires one call per section, and
    // without the gate the later rails all came back empty.
    async gql(query, variables) {
        const previous = DefaultExtension._chain || Promise.resolve();
        let release;
        DefaultExtension._chain = new Promise((resolve) => (release = resolve));
        await previous;
        try {
            const wait = DefaultExtension._nextAt - Date.now();
            if (wait > 0) await new Promise((r) => setTimeout(r, wait));
            const result = await this.gqlOnce(query, variables);
            return result;
        } finally {
            DefaultExtension._nextAt = Date.now() + GQL_MIN_INTERVAL_MS;
            release();
        }
    }

    async gqlOnce(query, variables) {
        const base = this.getBaseUrl();
        const send = async () => {
            const res = await new Client().post(
                API_URL,
                {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Origin": base,
                    "Referer": base + "/",
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
            return payload;
        };

        let payload = await send();
        const messages = (payload.errors || []).map((e) => e && e.message).filter(Boolean);
        const throttled = messages.find((m) => /too many requests/i.test(m));
        if (throttled) {
            const seconds = parseFloat((throttled.match(/(\d+(?:\.\d+)?)/) || [])[1] || "2");
            await new Promise((r) => setTimeout(r, Math.min(seconds, 10) * 1000 + 250));
            payload = await send();
        }
        if (Array.isArray(payload.errors) && payload.errors.length) {
            throw new Error(
                "[MKissa] GraphQL error: " +
                payload.errors.map((e) => e && e.message).filter(Boolean).join("; ")
            );
        }
        return payload.data;
    }

    pickTitle(item, titleStyle) {
        if (titleStyle === "romaji") return item.name;
        if (titleStyle === "eng") return item.englishName || item.name;
        return item.nativeName || item.name;
    }

    slug(name) {
        return String(name || "")
            .replace(/[^a-zA-Z0-9]/g, "-")
            .replace(/-{2,}/g, "-")
            .toLowerCase();
    }

    async getPopular(page) {
        return this.popularWindow(1, page);
    }

    async getLatestUpdates(page) {
        return await this.search("", page, []);
    }

    /// Feeds backing the declarative home. Each layout section id gets its own
    /// query so the rails never repeat the same shows, and every
    /// `category_<genre>` id maps to a real genre filter of the same API.
    async getCustomList(listId, page) {
        const id = String(listId || "").trim();
        if (!id) return this.getPopular(page);

        if (id.startsWith("category_")) {
            return this.searchByGenre(this.genreFromListId(id), page);
        }

        switch (id) {
            case "popular":
            case "spotlight":
            case "top_rated":
                return this.getPopular(page);
            case "latest":
            case "new":
                return this.search("", page, []);
            case "trending":
                return this.popularWindow(7, page);
            case "top_week":
                return this.popularWindow(30, page);
            default:
                // Unknown ids fall back to popular rather than throwing, so a
                // layout can add a section before the feed exists.
                return this.getPopular(page);
        }
    }

    async popularWindow(dateRange, page) {
        const data = await this.gql(
            "query($type:VaildPopularTypeEnumType!,$size:Int!,$dateRange:Int,$page:Int){" +
            "queryPopular(type:$type,size:$size,dateRange:$dateRange,page:$page){" +
            "recommendations{anyCard{_id name englishName nativeName thumbnail}}}}",
            { type: "anime", size: 26, dateRange, page }
        );
        return this.toList(
            ((data && data.queryPopular && data.queryPopular.recommendations) || [])
                .filter((e) => e && e.anyCard)
                .map((e) => e.anyCard)
        );
    }

    /// Section ids are lowercase and hyphenated (`category_slice-of-life`), so
    /// both sides are reduced to their alphanumeric characters before
    /// comparing: the API spells the genre `Sci-Fi` while the id is `sci-fi`.
    /// An unknown genre returns "" and the rail is skipped instead of asking
    /// the API for a genre it does not know.
    genreFromListId(listId) {
        const key = (value) =>
            String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const value = key(String(listId || "").replace(/^category_/, ""));
        if (!value) return "";
        const known = [
            "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror",
            "Mystery", "Romance", "Sci-Fi", "Slice of Life", "Sports",
            "Supernatural", "Thriller", "Music", "Mecha", "Psychological"
        ];
        return known.find((g) => key(g) === value) || "";
    }

    async searchByGenre(genre, page) {
        if (!genre) return { list: [], hasNextPage: false };
        const data = await this.gql(
            "query($search:SearchInput,$limit:Int,$countryOrigin:VaildCountryOriginEnumType,$page:Int){" +
            "shows(search:$search,limit:$limit,countryOrigin:$countryOrigin,page:$page){" +
            "edges{_id name nativeName englishName thumbnail}}}",
            {
                search: {
                    query: "",
                    allowAdult: false,
                    allowUnknown: false,
                    genres: [genre]
                },
                countryOrigin: "ALL",
                limit: 26,
                page
            }
        );
        const edges = (data && data.shows && data.shows.edges) || [];
        return this.toList(edges);
    }

    toList(cards) {
        const titleStyle = new SharedPreferences().get("preferred_title_style");
        const list = (cards || []).map((a) => ({
            name: this.pickTitle(a, titleStyle),
            imageUrl: a.thumbnail,
            link: `/bangumi/${a._id}/${this.slug(a.name)}`
        }));
        return { list, hasNextPage: list.length === 26 };
    }

    async search(query, page, filters) {
        const data = await this.gql(
            "query($search:SearchInput,$limit:Int,$countryOrigin:VaildCountryOriginEnumType,$page:Int){" +
            "shows(search:$search,limit:$limit,countryOrigin:$countryOrigin,page:$page){" +
            "edges{_id name nativeName englishName thumbnail}}}",
            {
                search: { query: query || "", allowAdult: false, allowUnknown: false },
                countryOrigin: "ALL",
                limit: 26,
                page
            }
        );
        const edges = (data && data.shows && data.shows.edges) || [];
        return this.toList(edges);
    }

    async getDetail(url) {
        const marker = "bangumi/";
        const start = url.indexOf(marker);
        const rest = start === -1 ? url.replace(/^\//, "") : url.substring(start + marker.length);
        const id = rest.split("/")[0];
        const data = await this.gql(
            "query($id:String!){show(_id:$id){name thumbnail description type season score genres status studios availableEpisodesDetail}}",
            { id }
        );
        const show = data && data.show;
        if (!show) {
            return { name: "", imageUrl: "", description: "", author: "", status: 5, genre: [], episodes: [] };
        }
        const author = show.studios && show.studios.length > 0 ? show.studios[0] : "";
        let description = String(show.description || "");
        description = description.concat(
            "\n\n",
            `Type: ${show.type || "Unknown"}`,
            `\nAired: ${(show.season && show.season.quarter) || "-"} ${(show.season && show.season.year) || "-"}`,
            `\nScore: ${show.score || "-"}★`
        );

        const build = (list, type) => (list || []).map((episode) => ({
            num: parseInt(episode) || 1,
            name: `Episode ${parseInt(episode) || 1}`,
            url: JSON.stringify({ showId: id, translationType: [type], episodeString: episode }),
            scanlator: type
        }));
        const episodesSub = build(show.availableEpisodesDetail && show.availableEpisodesDetail.sub, "sub");
        const episodesDub = build(show.availableEpisodesDetail && show.availableEpisodesDetail.dub, "dub");

        let episodes;
        if (episodesSub.length > 0) {
            episodes = episodesSub.map((ep) => {
                const match = episodesDub.find((e) => e.num === ep.num);
                if (!match) return ep;
                const parsed = JSON.parse(ep.url);
                return {
                    name: ep.name,
                    url: JSON.stringify({
                        showId: parsed.showId,
                        translationType: ["sub", "dub"],
                        episodeString: parsed.episodeString
                    }),
                    scanlator: "sub, dub"
                };
            });
        } else {
            episodes = episodesDub;
        }
        return {
            name: this.pickTitle(show, new SharedPreferences().get("preferred_title_style")),
            imageUrl: show.thumbnail || "",
            description,
            author,
            status: this.parseStatus(show.status),
            genre: show.genres || [],
            episodes
        };
    }

    parseStatus(string) {
        switch (string) {
            case "Releasing": return 0;
            case "Finished": return 1;
            case "Not Yet Released": return 0;
            default: return 5;
        }
    }

    isValidUrl(url) {
        return /^(https?:\/\/)[^\s]+$/.test(url);
    }

    async getVideoList(url) {
        const preferences = new SharedPreferences();
        const subPref = preferences.get("preferred_sub") || "sub";
        const ep = JSON.parse(url);
        const translationType = ep.translationType.filter((t) => t === subPref);
        if (translationType.length === 0) return [];

        // `show{countryOfOrigin}` is mandatory: without it the resolver throws
        // `Cannot set properties of undefined (setting 'countryOfOrigin')` and
        // returns no source at all.
        const data = await this.gql(
            "query($showId:String!,$translationType:VaildTranslationTypeEnumType!,$episodeString:String!){" +
            "episode(showId:$showId,translationType:$translationType,episodeString:$episodeString){" +
            "sourceUrls show{countryOfOrigin}}}",
            {
                showId: ep.showId,
                translationType: translationType[0],
                episodeString: ep.episodeString
            }
        );
        const episode = data && data.episode;
        if (!episode) return [];

        // The signed `player` URL always points at the 1080p rendition and
        // carries no resolution marker, so the real resolution is read from
        // `episodeInfos` for the episode the user opened.
        const episodeNum = parseFloat(ep.episodeString);
        let resolution = "";
        if (Number.isFinite(episodeNum)) {
            try {
                const infoData = await this.gql(
                    "query($showId:String!,$episodeNumStart:Float!,$episodeNumEnd:Float!){" +
                    "episodeInfos(showId:$showId,episodeNumStart:$episodeNumStart,episodeNumEnd:$episodeNumEnd){" +
                    "episodeIdNum vidInforssub vidInforsdub vidInforsraw}}",
                    {
                        showId: ep.showId,
                        episodeNumStart: episodeNum,
                        episodeNumEnd: episodeNum
                    }
                );
                const entry = (infoData && infoData.episodeInfos && infoData.episodeInfos[0]) || null;
                if (entry) {
                    const source = translationType[0] === "dub"
                        ? (entry.vidInforsdub || entry.vidInforssub || entry.vidInforsraw)
                        : (entry.vidInforssub || entry.vidInforsdub || entry.vidInforsraw);
                    if (source && source.vidResolution) resolution = `${source.vidResolution}p`;
                }
            } catch (_) {
                // Resolution is cosmetic: a failure must not hide the stream.
            }
        }

        const videos = [];
        for (const source of (episode.sourceUrls || [])) {
            if (!source || source.type !== "player") continue;
            const videoUrl = this.decryptSource(String(source.sourceUrl || "")).trim();
            if (!this.isValidUrl(videoUrl)) continue;
            const quality = resolution || String(source.sourceName || "Auto");
            videos.push({
                url: videoUrl,
                quality,
                originalUrl: videoUrl,
                headers: { "Referer": this.getBaseUrl() + "/" }
            });
        }
        return this.sortVideos(videos);
    }

    sortVideos(videos) {
        const preferences = new SharedPreferences();
        const hoster = preferences.get("preferred_hoster1");
        const quality = preferences.get("preferred_quality");
        videos.sort((a, b) => {
            const matchA = a.quality.includes(hoster) && a.quality.includes(quality) ? 1 : 0;
            const matchB = b.quality.includes(hoster) && b.quality.includes(quality) ? 1 : 0;
            return matchB - matchA;
        });
        return videos;
    }

    decryptSource(str) {
        if (str.startsWith("-")) {
            return str.substring(str.lastIndexOf("-") + 1)
                .match(/.{1,2}/g)
                .map((hex) => parseInt(hex, 16))
                .map((byte) => String.fromCharCode(byte ^ 56))
                .join("");
        }
        return str;
    }

    getFilterList() {
        return [];
    }

    getSourcePreferences() {
        return [
            {
                key: "base_url",
                editTextPreference: {
                    title: "Site URL",
                    summary: "Base URL of the MKissa mirror",
                    value: BASE_URL,
                    dialogTitle: "Base URL",
                    dialogMessage: "e.g. https://mkissa.to"
                }
            },
            {
                key: "preferred_title_style",
                listPreference: {
                    title: "Preferred Title Style",
                    summary: "",
                    valueIndex: 0,
                    entries: ["Romaji", "English", "Native"],
                    entryValues: ["romaji", "eng", "native"]
                }
            },
            {
                key: "preferred_quality",
                listPreference: {
                    title: "Preferred quality",
                    summary: "",
                    valueIndex: 2,
                    entries: ["2160p", "1440p", "1080p", "720p", "480p", "360p", "240p", "80p"],
                    entryValues: ["2160", "1440", "1080", "720", "480", "360", "240", "80"]
                }
            },
            {
                key: "preferred_sub",
                listPreference: {
                    title: "Prefer subs or dubs?",
                    summary: "",
                    valueIndex: 0,
                    entries: ["Subs", "Dubs"],
                    entryValues: ["sub", "dub"]
                }
            },
            {
                key: "preferred_hoster1",
                editTextPreference: {
                    title: "Preferred Video Server",
                    summary: "",
                    value: "Yt-mp4",
                    dialogTitle: "Preferred Video Server",
                    dialogMessage: "e.g. Yt-mp4"
                }
            }
        ];
    }
}
