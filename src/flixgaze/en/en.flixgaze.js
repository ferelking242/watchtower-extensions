
const mangayomiSources = [{
    "name": "FlixGaze",
    "lang": "en",
    "baseUrl": "https://www.flixgaze.com",
    "apiUrl": "",
    "iconUrl": "https://www.flixgaze.com/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.0.7",
    "pkgPath": "flixgaze/en/en.flixgaze.js",
    "notes": "FlixGaze.com — Free Movies & TV Series streaming via ZeusDL HLS",
    "isNsfw": false
  }];

const FLIXGAZE_NAV_SLUGS = [
    "movie", "tv-series", "foreign-movies", "marvel-cinematic-universe",
    "genre", "category", "tag", "page", "year", "search"
];

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
    }

    getHeaders(url) {
        return {
            "Referer": this.source.baseUrl + "/",
            "Origin": this.source.baseUrl,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        };
    }

    get supportsLatest() { return true; }

    _buildPageUrl(base, page) {
        const b = base.replace(/\/$/, "");
        return page <= 1 ? b + "/" : b + "/page/" + page + "/";
    }

    _isContentUrl(href) {
        if (!href || href.indexOf("flixgaze.com") < 0) return false;
        const path = href.replace(/^https?:\/\/[^/]+/, "").replace(/\/$/, "");
        const segments = path.split("/").filter(Boolean);
        if (segments.length === 0) return false;
        if (segments.length === 1 && FLIXGAZE_NAV_SLUGS.indexOf(segments[0]) >= 0) return false;
        return true;
    }

    _extractThumb(card) {
        const imgs = card.select("img");
        if (imgs && imgs.length > 0) {
            for (const img of imgs) {
                const src = img.attr("data-src") || img.attr("data-lazy-src") || img.attr("data-lazy") ||
                            img.attr("data-original") || img.attr("data-cfsrc") || img.attr("src") || "";
                if (src && src.indexOf("data:image") < 0 && src.indexOf("http") === 0) return src;
            }
        }
        const styled = card.selectFirst("[style*='background']");
        if (styled) {
            const style = styled.attr("style") || "";
            const m = style.match(/url\(['"\]?([^'"\)\s]+)['"\]?\)/);
            if (m) return m[1];
        }
        return "";
    }

    _extractName(card, anchor) {
        const titleEl = card.selectFirst(".entry-title") || card.selectFirst(".post-title") ||
                        card.selectFirst(".title") || card.selectFirst("h2") || card.selectFirst("h3");
        if (titleEl && titleEl.text && titleEl.text.trim()) return titleEl.text.trim();
        const anchorTitle = (anchor.attr("title") || anchor.attr("aria-label") || anchor.text || "").trim();
        if (anchorTitle) return anchorTitle;
        return (anchor.attr("href") || "").split("/").filter(Boolean).pop().replace(/-/g, " ").trim();
    }

    _parseList(html, page) {
        const doc = new Document(html);
        const items = [];
        const seen = [];

        const cards = doc.select("article");
        if (cards && cards.length > 0) {
            for (const card of cards) {
                const anchor = card.selectFirst("a[href]");
                if (!anchor) continue;
                const rawHref = (anchor.attr("href") || "").trim();
                const href = rawHref.indexOf("http") === 0 ? rawHref :
                             rawHref.indexOf("/") === 0 ? this.source.baseUrl + rawHref : "";
                if (!this._isContentUrl(href) || seen.indexOf(href) >= 0) continue;
                const thumb = this._extractThumb(card);
                if (!thumb) continue;
                const name = this._extractName(card, anchor);
                if (!name || name.length < 2) continue;
                seen.push(href);
                items.push({ name: name, imageUrl: thumb, link: href });
            }
        }

        if (items.length === 0) {
            const altCards = doc.select(".post-item, .item, .movie-item, .video-item, .film-item");
            if (altCards) {
                for (const card of altCards) {
                    const anchor = card.selectFirst("a[href]");
                    if (!anchor) continue;
                    const rawHref = (anchor.attr("href") || "").trim();
                    const href = rawHref.indexOf("http") === 0 ? rawHref :
                                 rawHref.indexOf("/") === 0 ? this.source.baseUrl + rawHref : "";
                    if (!this._isContentUrl(href) || seen.indexOf(href) >= 0) continue;
                    const thumb = this._extractThumb(card);
                    if (!thumb) continue;
                    const name = this._extractName(card, anchor);
                    if (!name || name.length < 2) continue;
                    seen.push(href);
                    items.push({ name: name, imageUrl: thumb, link: href });
                }
            }
        }

        const p = page || 1;
        const hasNextPage = html.indexOf("/page/" + (p + 1) + "/") >= 0 || html.indexOf('rel="next"') >= 0;
        return { list: items, hasNextPage: hasNextPage };
    }

    async _fetchPage(baseUrl, page) {
        const url = this._buildPageUrl(baseUrl, page);
        const res = await this.client.get(url, this.getHeaders(url));
        return this._parseList(res.body, page);
    }

    async getPopular(page) { return this._fetchPage(this.source.baseUrl, page); }
    async getLatestUpdates(page) { return this._fetchPage(this.source.baseUrl + "/tv-series", page); }

    async search(query, page, filters) {
        let url = "";
        if (filters && filters.length > 0) {
            const typeFilter = filters.find(function(f) { return f.name === "Type"; });
            if (typeFilter && typeFilter.state > 0) {
                const types = { 1: "movie", 2: "tv-series", 3: "foreign-movies", 4: "marvel-cinematic-universe" };
                const t = types[typeFilter.state];
                if (t) url = this._buildPageUrl(this.source.baseUrl + "/" + t, page);
            }
            if (!url) {
                const yearFilter = filters.find(function(f) { return f.name === "Year"; });
                if (yearFilter && yearFilter.state) {
                    const y = (yearFilter.state + "").trim();
                    if (y && y.length === 4) url = this._buildPageUrl(this.source.baseUrl + "/year/" + y, page);
                }
            }
        }
        if (!url) url = this._buildPageUrl(this.source.baseUrl + "/?s=" + encodeURIComponent((query || "").trim()), page);
        const res = await this.client.get(url, this.getHeaders(url));
        return this._parseList(res.body, page);
    }

    async getDetail(url) {
        const res = await this.client.get(url, this.getHeaders(url));
        const doc = new Document(res.body);
        const ogTitle = doc.selectFirst('meta[property="og:title"]');
        const h1El = doc.selectFirst("h1.entry-title") || doc.selectFirst("h1");
        const title = (ogTitle && ogTitle.attr("content")) || (h1El && h1El.text && h1El.text.trim()) ||
                      url.split("/").filter(Boolean).pop().replace(/-/g, " ");
        const ogImg = doc.selectFirst('meta[property="og:image"]');
        const thumbEl = doc.selectFirst(".post-thumbnail img") || doc.selectFirst("img.wp-post-image") ||
                        doc.selectFirst(".featured-image img") || doc.selectFirst("img[class*='poster']");
        const imageUrl = (ogImg && ogImg.attr("content")) ||
                         (thumbEl && (thumbEl.attr("data-src") || thumbEl.attr("data-lazy-src") || thumbEl.attr("src") || "")) || "";
        const ogDesc = doc.selectFirst('meta[property="og:description"]') || doc.selectFirst('meta[name="description"]');
        const descEl = doc.selectFirst(".entry-content p") || doc.selectFirst(".post-content p");
        const description = (ogDesc && ogDesc.attr("content")) || (descEl && descEl.text && descEl.text.trim()) || "";
        const tags = [];
        const genreSelectors = [".cat-links a", ".genre a", "a[href*='/genre/']"];
        for (const sel of genreSelectors) {
            const els = doc.select(sel);
            if (els && els.length > 0) {
                for (const el of els) {
                    const t = (el.text || "").trim();
                    if (t && t.length > 1 && tags.findIndex(function(x) { return x.name === t; }) < 0) {
                        tags.push({ name: t });
                    }
                }
                if (tags.length > 0) break;
            }
        }
        const episodes = [];
        const epEls = doc.select("a[href*='/episode'], a[href*='/season'], a[href*='/ep-']");
        if (epEls && epEls.length > 0) {
            const seen = [];
            for (const a of epEls) {
                const rawHref = (a.attr("href") || "").trim();
                const epUrl = rawHref.indexOf("http") === 0 ? rawHref :
                              rawHref.indexOf("/") === 0 ? this.source.baseUrl + rawHref : "";
                if (!epUrl || seen.indexOf(epUrl) >= 0) continue;
                seen.push(epUrl);
                const epName = (a.text || "").trim() || epUrl.split("/").filter(Boolean).pop().replace(/-/g, " ");
                if (epName.length > 1) episodes.push({ name: epName, url: epUrl });
            }
        }
        if (episodes.length === 0) episodes.push({ name: "Watch", url: url });
        return { name: title, imageUrl: imageUrl, description: description, genre: tags, episodes: episodes };
    }

    async getVideoList(url) {
        const res = await this.client.get(url, this.getHeaders(url));
        const html = res.body;
        const zm = html.match(/pathId\s*=\s*["']([^"']+)["'][\s\S]*?domainId\s*=\s*["']([^"']+)["'][\s\S]*?videoId\s*=\s*["']([^"']+)["']/);
        if (zm) {
            const u = zm[2] + "/" + zm[1] + "/" + zm[3] + ".m3u8";
            return [{ url: u, quality: "HLS · ZeusDL", originalUrl: u }];
        }
        const videos = [];
        const seen = [];
        const re = /["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*?)["']/g;
        let m;
        while ((m = re.exec(html)) !== null) {
            if (seen.indexOf(m[1]) < 0) {
                seen.push(m[1]);
                videos.push({ url: m[1], quality: m[1].indexOf("m3u8") >= 0 ? "HLS" : "MP4", originalUrl: m[1] });
            }
        }
        if (videos.length === 0) {
            const doc2 = new Document(html);
            const iframes = doc2.select("iframe[src], iframe[data-src]");
            if (iframes) {
                for (const f of iframes) {
                    const src = f.attr("src") || f.attr("data-src") || "";
                    if (src && seen.indexOf(src) < 0) {
                        seen.push(src);
                        videos.push({ url: src, quality: "Embed", originalUrl: src });
                    }
                }
            }
        }
        if (videos.length === 0) videos.push({ url: url, quality: "Source", originalUrl: url });
        return videos;
    }

    async getPageList(url) { return []; }

    getFilterList() {
        return [
            {
                type_name: "SelectFilter",
                name: "Type",
                state: 0,
                values: [
                    { type_name: "SelectOption", name: "All",                       value: "" },
                    { type_name: "SelectOption", name: "Movies",                    value: "movie" },
                    { type_name: "SelectOption", name: "TV Series",                 value: "tv-series" },
                    { type_name: "SelectOption", name: "Foreign Movies",            value: "foreign-movies" },
                    { type_name: "SelectOption", name: "Marvel Cinematic Universe", value: "marvel-cinematic-universe" }
                ]
            },
            { type_name: "TextFilter", name: "Year", state: "" }
        ];
    }

    getSourcePreferences() { return []; }
}
