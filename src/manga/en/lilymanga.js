const watchtowerSources = [{
    "name": "Lily Manga",
    "lang": "en",
    "baseUrl": "https://lilymanga.net",
    "iconUrl": "https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/assets/icons/manga-2000000051.png",
    "typeSource": "single",
    "itemType": 0,
    "version": "1.4.0",
    "login": false,
    "forYou": false,
    "pkgPath": "manga/src/en/lilymanga.js",
    "isNsfw": false,
    "hasCloudflare": false,
    "isManga": true,
    "appMinVerReq": "0.5.0",
    "sourceCodeLanguage": 1,
    "uiLayout": "ui-layouts/lilymanga.json",
    "uiLayoutVersion": "1.2.0"
}];

const BASE_URL = "https://lilymanga.net";
class DefaultExtension extends MProvider {
    getBaseUrl() {
        const saved = String(new SharedPreferences().get("base_url") || "").trim();
        if (!saved || /^https?:\/\/(?:www\.)?lilymanga\.com(?:\/|$)/i.test(saved)) {
            return BASE_URL;
        }
        return saved.replace(/\/+$/, "");
    }

    getHeaders(referer) {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": referer || `${this.getBaseUrl()}/`,
            "Accept-Language": "en-US,en;q=0.9"
        };
    }

    resolveUrl(value, baseUrl) {
        const url = String(value || "").trim();
        if (!url || url.startsWith("data:")) return "";
        if (/^https?:\/\//i.test(url)) return url;
        if (url.startsWith("//")) return `https:${url}`;
        if (url.startsWith("/")) return `${this.getBaseUrl()}${url}`;
        if (baseUrl) return `${baseUrl.replace(/\/+$/, "")}/${url.replace(/^\/+/, "")}`;
        return `${this.getBaseUrl()}/${url.replace(/^\/+/, "")}`;
    }

    imageUrlFromElement(img) {
        if (!img) return "";
        const srcset = (img.attr("srcset") || "")
            .split(",")
            .map((part) => part.trim().split(/\s+/))
            .sort((a, b) => {
                const widthA = parseInt((a[1] || "").replace(/[^\d]/g, ""), 10) || 0;
                const widthB = parseInt((b[1] || "").replace(/[^\d]/g, ""), 10) || 0;
                return widthB - widthA;
            })
            .map((part) => part[0])
            .filter(Boolean);
        const candidates = [
            img.attr("data-src") || "",
            img.attr("data-lazy-src") || "",
            img.attr("data-original") || "",
            img.attr("src") || "",
            ...srcset
        ];
        const selected = candidates.map((item) => item.trim()).find((item) =>
            item &&
            !item.startsWith("data:") &&
            !/(?:placeholder|transparent|spacer|pixel)\.(?:gif|png|webp)(?:[?#]|$)/i.test(item)
        );
        return this.resolveUrl(selected);
    }

    parseCard(card) {
        const titleLink = card.selectFirst(".item-summary .post-title a")
            || card.selectFirst(".slider__content .post-title a")
            || card.selectFirst("a[href*='/gl/']");
        const img = card.selectFirst("img");
        const link = titleLink
            ? this.resolveUrl(titleLink.getHref || titleLink.attr("href") || "")
            : "";
        const name = titleLink
            ? String(titleLink.text || "").trim()
            : (img ? String(img.attr("alt") || img.attr("title") || "").trim() : "");
        const imageUrl = this.imageUrlFromElement(img);
        return { name, link, imageUrl };
    }

    parseCards(body, selector) {
        const doc = new Document(body || "");
        const nodes = doc.select(selector || ".page-item-detail");
        const list = [];
        const seen = {};
        for (let i = 0; i < nodes.length; i++) {
            const item = this.parseCard(nodes[i]);
            if (item.name && item.link && !seen[item.link]) {
                seen[item.link] = true;
                list.push(item);
            }
        }
        return list;
    }

    hasNextPage(body, page) {
        const next = page + 1;
        return String(body || "").indexOf(`/page/${next}/`) !== -1
            || String(body || "").indexOf(`page=${next}`) !== -1;
    }

    pagedPath(path, page) {
        const clean = path.endsWith("/") ? path : `${path}/`;
        return page > 1 ? `${clean}page/${page}/` : clean;
    }

    async getListing(path, page, order) {
        let url = this.pagedPath(path, page);
        if (order) url += `?m_orderby=${encodeURIComponent(order)}`;
        const response = await new Client().get(url, this.getHeaders(url));
        return {
            list: this.parseCards(response.body),
            hasNextPage: this.hasNextPage(response.body, page)
        };
    }

    async getPopular(page) {
        return this.getListing(`${this.getBaseUrl()}/gl/`, page, "trending");
    }

    async getLatestUpdates(page) {
        return this.getListing(`${this.getBaseUrl()}/gl/`, page, "latest");
    }

    async getTopRated(page) {
        return this.getListing(`${this.getBaseUrl()}/gl/`, page, "rating");
    }

    selectedGenre(filters) {
        for (const filter of Array.from(filters || [])) {
            if (filter.name !== "Genre") continue;
            const selected = Array.from(filter.state || []).find((item) => item && item.state);
            if (selected && /^[a-z0-9-]+$/i.test(selected.value || "")) return selected.value;
        }
        return "";
    }

    selectedSort(filters) {
        for (const filter of Array.from(filters || [])) {
            if (filter.name !== "Sort By" || !filter.values) continue;
            const option = filter.values[filter.state];
            if (option && /^[a-z0-9-]+$/i.test(option.value || "")) return option.value;
        }
        return "trending";
    }

    async getSearchResults(term, page, genre, order) {
        const safeGenre = /^[a-z0-9-]+$/i.test(genre || "") ? genre : "";
        const path = safeGenre
            ? `${this.getBaseUrl()}/gl-genre/${safeGenre}/`
            : (term ? `${this.getBaseUrl()}/` : `${this.getBaseUrl()}/gl/`);
        let url = this.pagedPath(path, page);
        const params = [];
        if (term) {
            params.push(`s=${encodeURIComponent(term)}`);
            params.push("post_type=wp-manga");
        }
        if (order) params.push(`m_orderby=${encodeURIComponent(order)}`);
        if (params.length) url += `?${params.join("&")}`;

        const response = await new Client().get(url, this.getHeaders(url));
        return {
            list: this.parseCards(response.body),
            hasNextPage: this.hasNextPage(response.body, page)
        };
    }

    async search(query, page, filters) {
        return this.getSearchResults(
            String(query || "").trim(),
            page,
            this.selectedGenre(filters),
            this.selectedSort(filters)
        );
    }

    parseChapters(body, baseUrl) {
        const doc = new Document(body || "");
        const anchors = doc.select(".listing-chapters_wrap a[href]");
        const chapters = [];
        const seen = {};
        for (let i = 0; i < anchors.length; i++) {
            const anchor = anchors[i];
            const href = anchor.getHref || anchor.attr("href") || "";
            const path = href.split(/[?#]/, 1)[0];
            // Chapter slugs are not always bare "chapter-N"/"episode-N": many
            // series prefix them with a volume/season ("vol-02-chapter-440",
            // "season-03-episode-114"), so match a chapter/episode token
            // anywhere in the final segment instead of anchoring it at the
            // start of the segment.
            const slug = path.split("/").filter(Boolean).pop() || "";
            if (!/(?:^|[-_])(?:chapter|episode)[-_]?\d/i.test(slug)) continue;
            const anchorId = String(anchor.attr("id") || "").toLowerCase();
            const nameText = String(anchor.text || "").replace(/\s+/g, " ").trim();
            if (/btn-read-(?:first|last)/.test(anchorId) || /^(?:read first|read last)$/i.test(nameText)) continue;
            const url = this.resolveUrl(href, baseUrl);
            if (!url || seen[url]) continue;
            seen[url] = true;
            const name = nameText || `Chapter ${slug.replace(/[-_]+/g, " ")}`;
            chapters.push({ name, url });
        }
        return chapters;
    }

    async getDetail(url) {
        const detailUrl = this.resolveUrl(url);
        const response = await new Client().get(detailUrl, this.getHeaders(detailUrl));
        const body = response.body || "";
        const doc = new Document(body);
        const title = doc.selectFirst(".post-title h1") || doc.selectFirst("h1");
        const cover = doc.selectFirst(".summary_image img");
        const description = doc.selectFirst(".description-summary .summary__content")
            || doc.selectFirst(".summary__content");

        const genreNodes = doc.select(".genres-content a");
        const genres = [];
        for (let i = 0; i < genreNodes.length; i++) {
            const genre = String(genreNodes[i].text || "").trim();
            if (genre && genres.indexOf(genre) === -1) genres.push(genre);
        }

        let status = 5;
        const statusItems = doc.select(".post-status .post-content_item");
        for (let i = 0; i < statusItems.length; i++) {
            const heading = statusItems[i].selectFirst(".summary-heading h5");
            if (!heading || !/status/i.test(heading.text || "")) continue;
            const value = statusItems[i].selectFirst(".summary-content");
            const statusText = String(value ? value.text : "").toLowerCase();
            if (statusText.indexOf("ongoing") !== -1) status = 0;
            else if (statusText.indexOf("completed") !== -1 || statusText.indexOf("ended") !== -1) status = 1;
            else if (statusText.indexOf("hiatus") !== -1) status = 2;
            else if (statusText.indexOf("canceled") !== -1 || statusText.indexOf("dropped") !== -1) status = 3;
            break;
        }

        let chapters = [];
        try {
            const chapterBase = detailUrl.split(/[?#]/, 1)[0].replace(/\/+$/, "");
            const chapterUrl = `${chapterBase}/ajax/chapters/?t=1`;
            const headers = {
                ...this.getHeaders(detailUrl),
                "Accept": "*/*",
                "X-Requested-With": "XMLHttpRequest"
            };
            const ajax = await new Client().post(chapterUrl, headers, null);
            chapters = this.parseChapters(ajax.body, detailUrl);
        } catch (_) {
            // Do not turn the detail page's Read First/Read Last buttons into chapters.
        }
        if (chapters.length === 0) chapters = this.parseChapters(body, detailUrl);

        const chapterOrder = String(new SharedPreferences().get("chapter_order") || "newest");
        if (chapterOrder === "oldest") chapters.reverse();

        return {
            name: String(title ? title.text : "").trim(),
            description: String(description ? description.text : "").trim(),
            imageUrl: this.imageUrlFromElement(cover),
            genre: genres,
            status,
            chapters
        };
    }

    async getPageList(url) {
        const chapterUrl = this.resolveUrl(url);
        const response = await new Client().get(chapterUrl, this.getHeaders(chapterUrl));
        const doc = new Document(response.body || "");
        const images = doc.select(".wp-manga-chapter-img");
        const pages = [];
        const seen = {};
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const src = img.attr("data-src")
                || img.attr("data-lazy-src")
                || img.attr("src")
                || "";
            const imageUrl = this.resolveUrl(src);
            if (imageUrl && !seen[imageUrl]) {
                seen[imageUrl] = true;
                pages.push(imageUrl);
            }
        }
        return pages;
    }

    getFilterList() {
        return [
            {
                type_name: "SelectFilter",
                name: "Sort By",
                state: 0,
                values: [
                    ["Trending", "trending"],
                    ["Latest Updates", "latest"],
                    ["Top Rated", "rating"],
                    ["Recently Added", "new-manga"]
                ].map((item) => ({
                    type_name: "SelectOption",
                    name: item[0],
                    value: item[1]
                }))
            },
            {
                type_name: "GroupFilter",
                name: "Genre",
                state: [
                    ["Action", "action"], ["Adult", "adult"], ["Adventure", "adventure"],
                    ["Anime", "anime"], ["Anthology", "anthology"], ["Comedy", "comedy"],
                    ["Coming Soon GL's", "coming-soon-gls"], ["Crime", "crime"],
                    ["Doujinshi", "doujinshi"], ["Drama", "drama"], ["Ecchi", "ecchi"],
                    ["Fantasy", "fantasy"], ["Gender Bender", "gender-bender"],
                    ["Harem", "harem"], ["Hentai", "hentai"], ["Historical", "historical"],
                    ["Horror", "horror"], ["HQ", "hq"], ["Isekai", "isekai"],
                    ["Josei", "josei"], ["Lolicon", "lolicon"], ["Martial Arts", "martial-arts"],
                    ["Mature", "mature"], ["Mecha", "mecha"], ["Mystery", "mystery"],
                    ["Oneshots", "oneshots"], ["Philosophical", "philosophical"],
                    ["Psychological", "psychological"], ["Romance", "romance"],
                    ["School Life", "school-life"], ["Sci-fi", "sci-fi"], ["Seinen", "seinen"],
                    ["Shoujo", "shoujo"], ["Shoujo Ai", "shoujo-ai"], ["Shounen", "shounen"],
                    ["Slice of Life", "slice-of-life"], ["Smut", "smut"], ["Sports", "sports"],
                    ["Supernatural", "supernatural"], ["Tragedy", "tragedy"], ["Yuri", "yuri"]
                ].map((item) => ({
                    type_name: "CheckBox",
                    name: item[0],
                    value: item[1],
                    state: false
                }))
            }
        ];
    }

    async getCustomList(listId, page) {
        const searchTab = String(listId || "").match(/^search_tab:([a-z0-9-]+):(.*)$/i);
        if (searchTab) {
            let term = searchTab[2] || "";
            try {
                term = decodeURIComponent(term);
            } catch (_) {
                // Keep the original query if the caller passed malformed encoding.
            }
            return this.getSearchResults(term, page, searchTab[1], "trending");
        }
        if (String(listId || "").indexOf("search_preview:") === 0) {
            // The app's live search box queries getCustomList("search_preview:<term>").
            // Without this branch the section fell through to getPopular, so the
            // preview listed trending titles instead of matches for the term.
            let term = String(listId).slice("search_preview:".length);
            try {
                term = decodeURIComponent(term);
            } catch (_) {
                // Keep the original query if the caller passed malformed encoding.
            }
            return this.getSearchResults(term, page, "", "trending");
        }
        if (listId === "spotlight") {
            const homeUrl = `${this.getBaseUrl()}/`;
            const response = await new Client().get(homeUrl, this.getHeaders(homeUrl));
            const list = this.parseCards(response.body, ".popular-slider .slider__item");
            return { list: list.slice(0, 6), hasNextPage: false };
        }
        if (listId === "latest_updates" || listId === "latest") return this.getLatestUpdates(page);
        if (listId === "popular") return this.getPopular(page);
        if (listId === "top_rated") return this.getTopRated(page);
        if (listId === "new_manga" || listId === "new") {
            return this.getListing(`${this.getBaseUrl()}/gl/`, page, "new-manga");
        }

        const genre = String(listId || "").match(/^genre_([a-z0-9-]+)$/i);
        if (genre) {
            return this.getListing(
                `${this.getBaseUrl()}/gl-genre/${genre[1]}/`,
                page,
                "latest"
            );
        }
        return this.getPopular(page);
    }

    getSourcePreferences() {
        return [
            {
                key: "base_url",
                editTextPreference: {
                    title: "Site URL",
                    summary: "Change this if Lily Manga moves to another domain.",
                    value: BASE_URL,
                    dialogTitle: "Site URL",
                    dialogMessage: `Current URL: ${BASE_URL}`
                }
            },
            {
                key: "chapter_order",
                listPreference: {
                    title: "Chapter order",
                    summary: "Choose whether older or newer chapters appear first.",
                    valueIndex: 0,
                    entries: ["Newest first", "Oldest first"],
                    entryValues: ["newest", "oldest"]
                }
            }
        ];
    }
}
