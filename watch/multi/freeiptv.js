const mangayomiSources = [{
    "name": "Free IPTV",
    "lang": "multi",
    "baseUrl": "https://iptv-org.github.io",
    "apiUrl": "https://iptv-org.github.io/api",
    "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=iptv-org.github.io",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "1.0.0",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "watch/src/multi/freeiptv.js",
    "notes": "8000+ free live TV channels worldwide. Powered by iptv-org."
}];

// ═══════════════════════════════════════════════════════════
//  Free IPTV — iptv-org.github.io
//  The world's largest open database of publicly available
//  IPTV channels. 8000+ channels from 100+ countries.
//  Categories: News, Sports, Movies, Entertainment, Kids,
//  Documentary, Music, Religious, Shopping, etc.
// ═══════════════════════════════════════════════════════════

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
    }

    // Category definitions — maps display name to iptv-org slug
    static get CATEGORIES() {
        return [
            { name: "🌍 All Channels",      slug: "index" },
            { name: "📰 News",              slug: "categories/news" },
            { name: "⚽ Sports",            slug: "categories/sports" },
            { name: "🎬 Movies",            slug: "categories/movies" },
            { name: "🎭 Entertainment",      slug: "categories/entertainment" },
            { name: "🎞️ Series",            slug: "categories/series" },
            { name: "🧒 Kids",              slug: "categories/kids" },
            { name: "🎵 Music",             slug: "categories/music" },
            { name: "📚 Documentary",        slug: "categories/documentary" },
            { name: "🏛️ General",           slug: "categories/general" },
            { name: "🌐 Business",          slug: "categories/business" },
            { name: "📡 Science/Technology", slug: "categories/science" },
            { name: "🕌 Religious",         slug: "categories/religious" },
            { name: "🛍️ Shopping",          slug: "categories/shop" },
            { name: "🎮 Gaming",            slug: "categories/games" },
            { name: "🧘 Lifestyle",         slug: "categories/lifestyle" },
            { name: "🌿 Nature",            slug: "categories/nature" },
            { name: "🏠 Travel",            slug: "categories/travel" },
            { name: "🍳 Cooking",           slug: "categories/cooking" },
            { name: "🩺 Health",            slug: "categories/health" },
        ];
    }

    static get M3U_BASE() { return "https://iptv-org.github.io/iptv"; }
    static get ITEMS_PER_PAGE() { return 50; }

    // ── M3U Parser ───────────────────────────────────────────

    parseM3U(content) {
        const channels = [];
        const lines = content.split("\n");
        let i = 0;
        while (i < lines.length) {
            const line = lines[i].trim();
            if (line.startsWith("#EXTINF")) {
                const nameMt = line.match(/,(.+)$/);
                const logoMt = line.match(/tvg-logo="([^"]+)"/);
                const countryMt = line.match(/tvg-country="([^"]+)"/);
                const langMt = line.match(/tvg-language="([^"]+)"/);
                const groupMt = line.match(/group-title="([^"]+)"/);
                const idMt = line.match(/tvg-id="([^"]+)"/);

                const name = nameMt ? nameMt[1].trim() : "Unknown Channel";
                const logo = logoMt ? logoMt[1] : "";
                const country = countryMt ? countryMt[1] : "";
                const lang = langMt ? langMt[1] : "";
                const group = groupMt ? groupMt[1] : "";

                // Move to URL line
                i++;
                while (i < lines.length && lines[i].trim().startsWith("#")) i++;
                const streamUrl = i < lines.length ? lines[i].trim() : "";

                if (streamUrl && streamUrl.startsWith("http")) {
                    channels.push({ name, logo, country, lang, group, streamUrl });
                }
            }
            i++;
        }
        return channels;
    }

    // ── Browse ───────────────────────────────────────────────

    async getPopular(page) {
        // Return category list on page 1; no next pages
        if (page > 1) return { list: [], hasNextPage: false };
        const cats = DefaultExtension.CATEGORIES;
        const list = cats.map(c => ({
            name: c.name,
            link: `${DefaultExtension.M3U_BASE}/${c.slug}.m3u`,
            imageUrl: "https://iptv-org.github.io/iptv/categories/general.m3u",
            description: "Browse live channels"
        }));
        return { list, hasNextPage: false };
    }

    async getLatestUpdates(page) {
        return this.getPopular(page);
    }

    async search(query, page, filterList) {
        const category = this._filterVal(filterList, "Category") || "index";
        const country = this._filterVal(filterList, "Country") || "";

        let m3uUrl;
        if (country) {
            m3uUrl = `https://iptv-org.github.io/iptv/countries/${country.toLowerCase()}.m3u`;
        } else {
            m3uUrl = `${DefaultExtension.M3U_BASE}/${category}.m3u`;
        }

        const res = await this.client.get(m3uUrl, {
            "User-Agent": "Mozilla/5.0 (compatible; IPTV/1.0)"
        });
        let channels = this.parseM3U(res.body || "");

        // Filter by query
        const q = query.toLowerCase().trim();
        if (q) {
            channels = channels.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.country.toLowerCase().includes(q) ||
                c.group.toLowerCase().includes(q)
            );
        }

        // Paginate
        const perPage = DefaultExtension.ITEMS_PER_PAGE;
        const start = (page - 1) * perPage;
        const paged = channels.slice(start, start + perPage);
        const hasNextPage = channels.length > start + perPage;

        const list = paged.map(c => ({
            name: `${c.country ? `[${c.country}] ` : ""}${c.name}`,
            link: c.streamUrl,
            imageUrl: c.logo || "",
            description: `${c.group || ""} | ${c.lang || ""}`
        }));

        return { list, hasNextPage };
    }

    _filterVal(filterList, name) {
        if (!filterList) return null;
        for (const f of filterList) {
            if (f.name === name && f.values) return f.values[f.state]?.value;
        }
        return null;
    }

    // ── Detail ───────────────────────────────────────────────
    // For categories: fetch M3U and list channels as episodes
    // For direct stream URLs: single episode = live feed

    async getDetail(url) {
        // If URL is an M3U category playlist
        if (url.endsWith(".m3u")) {
            const res = await this.client.get(url, {
                "User-Agent": "Mozilla/5.0 (compatible; IPTV/1.0)"
            });
            const channels = this.parseM3U(res.body || "");

            const categoryName = url.split("/").pop().replace(".m3u", "").replace(/-/g, " ");

            const chapters = channels.slice(0, 500).map((c, idx) => ({
                name: `${c.country ? `[${c.country}] ` : ""}${c.name}`,
                url: c.streamUrl,
                dateUpload: "0",
                scanlator: c.lang || ""
            }));

            return {
                name: `📡 ${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)}`,
                imageUrl: "",
                description: `${channels.length} live TV channels. Click any channel to watch.`,
                genre: ["IPTV", "Live TV"],
                status: 0,
                chapters
            };
        }

        // Direct stream URL
        const streamName = url.split("/").pop().split("?")[0];
        return {
            name: streamName || "Live Channel",
            imageUrl: "",
            description: "Live IPTV stream",
            genre: ["IPTV", "Live"],
            status: 0,
            chapters: [{
                name: "▶ Watch Live",
                url: url,
                dateUpload: "0"
            }]
        };
    }

    // ── Stream ───────────────────────────────────────────────

    async getVideoList(url) {
        return [{
            url: url,
            quality: "Live",
            originalUrl: url
        }];
    }

    // ── Filters ──────────────────────────────────────────────

    getFilterList() {
        function opt(n, v) { return { type_name: "SelectOption", name: n, value: v }; }
        return [
            {
                type_name: "SelectFilter", name: "Category", state: 0,
                values: [
                    opt("Index (All)", "index"),
                    opt("News", "categories/news"),
                    opt("Sports", "categories/sports"),
                    opt("Movies", "categories/movies"),
                    opt("Entertainment", "categories/entertainment"),
                    opt("Kids", "categories/kids"),
                    opt("Music", "categories/music"),
                    opt("Documentary", "categories/documentary"),
                    opt("General", "categories/general"),
                    opt("Business", "categories/business"),
                    opt("Religious", "categories/religious"),
                    opt("Lifestyle", "categories/lifestyle"),
                    opt("Nature", "categories/nature"),
                    opt("Travel", "categories/travel"),
                    opt("Cooking", "categories/cooking"),
                ]
            },
            {
                type_name: "SelectFilter", name: "Country", state: 0,
                values: [
                    opt("All Countries", ""),
                    opt("United States", "us"), opt("United Kingdom", "gb"),
                    opt("France", "fr"), opt("Germany", "de"),
                    opt("Spain", "es"), opt("Italy", "it"),
                    opt("Canada", "ca"), opt("Australia", "au"),
                    opt("Brazil", "br"), opt("Russia", "ru"),
                    opt("Japan", "jp"), opt("China", "cn"),
                    opt("India", "in"), opt("South Korea", "kr"),
                    opt("Mexico", "mx"), opt("Argentina", "ar"),
                    opt("Netherlands", "nl"), opt("Belgium", "be"),
                    opt("Switzerland", "ch"), opt("Portugal", "pt"),
                    opt("Poland", "pl"), opt("Turkey", "tr"),
                    opt("Saudi Arabia", "sa"), opt("UAE", "ae"),
                    opt("Egypt", "eg"), opt("Nigeria", "ng"),
                    opt("South Africa", "za"),
                ]
            }
        ];
    }

    getSourcePreferences() {
        return [{
            key: "max_channels",
            listPreference: {
                title: "Max channels per category",
                summary: "Limit channels fetched per category",
                valueIndex: 1,
                entries: ["100", "250", "500", "1000", "All"],
                entryValues: ["100", "250", "500", "1000", "0"]
            }
        }];
    }
}
