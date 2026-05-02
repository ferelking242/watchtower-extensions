const mangayomiSources = [{
    "name": "MovieBox Live",
    "lang": "all",
    "baseUrl": "https://themoviebox.xyz",
    "apiUrl": "https://h5-api.aoneroom.com",
    "iconUrl": "https://www.google.com/s2/favicons?sz=256&domain=moviebox.ng",
    "typeSource": "multi",
    "isManga": false,
    "itemType": 1,
    "version": "1.0.0",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "watch/src/multi/moviebox-live.js"
}];

// ═══════════════════════════════════════════════════════
//  MovieBox Live — aoneroom.com Live API
//  Sports live streams + highlights
//  CDN: lacdn.aoneroom.com (CloudFront signed MP4)
//  Also parses sportslivetoday.com embeds for match news
//  Channels API: h5-api.aoneroom.com live endpoints
// ═══════════════════════════════════════════════════════

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
    }

    static get API_BASE() { return "https://h5-api.aoneroom.com"; }
    static get WEB_BASE() { return "https://themoviebox.xyz"; }
    static get V1_BASE() { return "https://h5.aoneroom.com"; }
    static get REFERER() { return "https://videodownloader.site/"; }

    getPreference(key) { return new SharedPreferences().get(key); }
    getLang() { return this.getPreference("mb_lang") || "en"; }

    getHeaders() {
        return {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Client-Info": '{"timezone":"America/New_York"}',
            "x-request-lang": this.getLang(),
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0",
            "Referer": DefaultExtension.REFERER,
            "Origin": "https://videodownloader.site"
        };
    }

    getWebHeaders() {
        return {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0",
            "Referer": DefaultExtension.WEB_BASE
        };
    }

    parseApiData(body) {
        try {
            const parsed = JSON.parse(body);
            return parsed.data !== undefined ? parsed.data : parsed;
        } catch (e) { return {}; }
    }

    // ── Extract live streams from live page ────────────────

    parseLivePage(html) {
        const items = [];
        // Match MP4 highlight clips from lacdn.aoneroom.com
        const mp4Pattern = /https:\/\/lacdn\.aoneroom\.com\/highlight\/[^"'\s]+\.mp4[^"'\s]*/g;
        const mp4Matches = [...new Set(html.match(mp4Pattern) || [])];

        // Match image covers from pbcdn
        const imgPattern = /https:\/\/pbcdn\.aoneroom\.com\/image\/[^"'\s?]+\.(?:jpg|png|webp)[^"'\s]*/g;
        const imgMatches = [...new Set(html.match(imgPattern) || [])];

        // Match titles from h2/h3 or sport names
        const titlePattern = /(?:Champions League|Premier League|La Liga|Serie A|Bundesliga|UEFA|NBA|NFL|MLB|NHL|MLS|FIFA|Tennis|Cricket|Rugby|F1|Boxing|MMA|Olympics|World Cup|Europa League)[^<"']*/gi;
        const titleMatches = [...new Set(html.match(titlePattern) || [])];

        // Build items from found highlights
        for (let i = 0; i < mp4Matches.length; i++) {
            const mp4 = mp4Matches[i];
            const img = imgMatches[i] || imgMatches[0] || "";
            const title = titleMatches[i] || `Live Stream ${i + 1}`;
            items.push({
                name: title.trim(),
                imageUrl: img,
                link: JSON.stringify({ type: "highlight", url: mp4 }),
                description: "🔴 Live Sports Stream"
            });
        }

        return items;
    }

    // ── Fetch live channels via API ────────────────────────

    async fetchLiveChannels(page) {
        const items = [];

        // Try API live list
        const endpoints = [
            `${DefaultExtension.API_BASE}/wefeed-h5api-bff/live/list?page=${page}&perPage=20`,
            `${DefaultExtension.API_BASE}/wefeed-h5api-bff/live?page=${page}&perPage=20`,
            `${DefaultExtension.V1_BASE}/wefeed-h5-bff/web/live?page=${page}`,
            `${DefaultExtension.V1_BASE}/wefeed-h5-bff/web/live/list?page=${page}`,
        ];

        for (const ep of endpoints) {
            try {
                const res = await this.client.get(ep, { headers: this.getHeaders() });
                if (res.statusCode === 200) {
                    const data = this.parseApiData(res.body);
                    const list = data.list || data.liveList || data.channels || data.items || [];
                    for (const ch of list) {
                        const url = ch.streamUrl || ch.playUrl || ch.m3u8Url || ch.url || ch.liveUrl || "";
                        if (!url) continue;
                        items.push({
                            name: ch.title || ch.name || ch.channelName || "Live Channel",
                            imageUrl: ch.cover?.url || ch.coverUrl || ch.icon || "",
                            link: JSON.stringify({ type: "live", url }),
                            description: ch.description || ch.category || "🔴 Live"
                        });
                    }
                    if (items.length > 0) return { list: items, hasNextPage: data.pager?.hasMore || false };
                }
            } catch (_) {}
        }

        return { list: items, hasNextPage: false };
    }

    // ── Browse ─────────────────────────────────────────────

    async getPopular(page) {
        // First try API channels, fallback to parsing live page
        const fromApi = await this.fetchLiveChannels(page);
        if (fromApi.list.length > 0) return fromApi;

        // Fallback: parse the live web page
        try {
            const res = await this.client.get(
                `${DefaultExtension.WEB_BASE}/live`,
                { headers: this.getWebHeaders() }
            );
            const items = this.parseLivePage(res.body || "");
            return { list: items, hasNextPage: false };
        } catch (_) {
            return { list: [], hasNextPage: false };
        }
    }

    async getLatestUpdates(page) {
        return this.getPopular(page);
    }

    async search(query, page, filterList) {
        // Search within the live channels via API
        const allResult = await this.getPopular(1);
        const q = query.toLowerCase();
        const filtered = allResult.list.filter(item =>
            item.name.toLowerCase().includes(q) || (item.description || "").toLowerCase().includes(q)
        );
        return { list: filtered, hasNextPage: false };
    }

    // ── Detail ─────────────────────────────────────────────

    async getDetail(url) {
        const info = JSON.parse(url);
        const streamUrl = info.url || "";
        const isLive = info.type === "live";

        return {
            name: "Watch Live",
            description: isLive
                ? "🔴 Live stream from MovieBox\nStream may require active broadcast."
                : "🏆 Sports highlight clip from MovieBox",
            imageUrl: "",
            genre: ["Sports", "Live"],
            status: 0,
            chapters: [{
                name: isLive ? "▶ Watch Live" : "▶ Watch Highlight",
                url: JSON.stringify(info),
                dateUpload: ""
            }]
        };
    }

    // ── Video list ─────────────────────────────────────────

    async getVideoList(url) {
        const info = JSON.parse(url);
        const streamUrl = info.url || "";

        if (!streamUrl) return [];

        const headers = {
            "Referer": DefaultExtension.WEB_BASE + "/",
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0",
            "Origin": DefaultExtension.WEB_BASE
        };

        // Detect stream type
        if (streamUrl.includes(".m3u8")) {
            return [{
                url: streamUrl,
                quality: "HLS Live",
                originalUrl: streamUrl,
                headers
            }];
        } else if (streamUrl.includes(".mpd")) {
            return [{
                url: streamUrl,
                quality: "DASH Live",
                originalUrl: streamUrl,
                headers
            }];
        } else if (streamUrl.includes(".mp4")) {
            return [{
                url: streamUrl,
                quality: "MP4 Highlight",
                originalUrl: streamUrl,
                headers: {
                    "Referer": DefaultExtension.WEB_BASE + "/",
                    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64; rv:137.0) Gecko/20100101 Firefox/137.0"
                }
            }];
        }

        // Generic fallback
        return [{
            url: streamUrl,
            quality: "Auto",
            originalUrl: streamUrl,
            headers
        }];
    }

    getFilterList() { return []; }

    getSourcePreferences() {
        return [
            {
                "key": "mb_lang",
                "listPreference": {
                    "title": "Content Language",
                    "summary": "Language for live content metadata",
                    "valueIndex": 0,
                    "entries": ["English", "Français", "العربية", "Português", "Indonesian", "中文"],
                    "entryValues": ["en", "fr", "ar", "pt", "id", "zh"]
                }
            },
            {
                "key": "mb_live_sport",
                "listPreference": {
                    "title": "Preferred Sport",
                    "summary": "Filter live channels by sport type",
                    "valueIndex": 0,
                    "entries": ["All Sports", "Football/Soccer", "Basketball", "Tennis", "Cricket", "F1", "Boxing/MMA"],
                    "entryValues": ["all", "football", "basketball", "tennis", "cricket", "f1", "boxing"]
                }
            }
        ];
    }
}
