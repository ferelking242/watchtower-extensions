// Gogoanime extension for Watchtower
// Migré de gogoanime3.co (mort) → gogoanime.fi (WordPress/DramaStream)
// v0.1.5 — réécriture complète pour le nouveau site
//
// Structure gogoanime.fi :
//   Browse   : /series/?order=update  (pagination /series/page/N/)
//   Popular  : /series/?order=popular
//   Search   : /?s={query}  (retourne des épisodes/posts)
//   Détail   : /series/{slug}/
//   Épisodes : /{slug}-episode-N-english-subbed/ ou -dubbed/
//   Vidéo    : <iframe src="https://www.blogger.com/video.g?token=...">

const watchtowerSources = [{
    "name": "Gogoanime",
    "id": 748290022,
    "baseUrl": "https://gogoanime.fi",
    "apiUrl": "",
    "iconUrl": "https://gogoanime.fi/wp-content/uploads/2026/04/cropped-cropped-favicon-2-32x32-1-180x180.webp",
    "lang": "en",
    "typeSource": "single",
    "itemType": 1,
    "version": "0.1.5",
    "pkgPath": "watch/en/gogoanime.js",
    "isNsfw": false,
    "hasCloudflare": false,
    "isManga": false,
    "isFullData": false,
    "appMinVerReq": "0.5.0",
    "additionalParams": "",
    "sourceCodeLanguage": 1,
    "notes": "v0.1.5 — gogoanime3.co mort → gogoanime.fi (WordPress/DramaStream, juil 2026)",
    "requiresAccount": false,
    "hasDRM": false,
    "editableBaseUrl": true,
    "paywall": "free"
}];

const BASE_URL = "https://gogoanime.fi";

class DefaultExtension extends MProvider {

    getBaseUrl() {
        return new SharedPreferences().get("gogo_base_url") || BASE_URL;
    }

    getHeaders() {
        const base = this.getBaseUrl();
        return {
            "Referer": base + "/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        };
    }

    // ── Parse a /series/ listing page ────────────────────────────────────────
    _parseSeriesList(html, page) {
        const doc    = new Document(html);
        const cards  = doc.select("article");
        const list   = [];
        const seen   = {};

        for (const card of cards) {
            // Link: first <a> with /series/ href
            const aEl = card.selectFirst("a[href*='/series/']");
            if (!aEl) continue;
            const link = aEl.getHref || aEl.attr("href") || "";
            if (!link || seen[link]) continue;
            seen[link] = 1;

            // Title: <h2 itemprop="headline"> or first h2/h3
            const h = card.selectFirst("h2") || card.selectFirst("h3");
            const name = h ? (h.text || "").trim() : "";
            if (!name) continue;

            // Cover: itemprop="image" img, or first img
            const img = card.selectFirst("img[itemprop='image']") || card.selectFirst("img");
            const raw = img ? (img.attr("src") || img.attr("data-src") || "") : "";
            // Remove WordPress thumbnail suffix (-NNNxNNN) to get full-size
            const imageUrl = raw.replace(/-\d+x\d+(\.[a-z]+)$/, "$1");

            list.push({ name, imageUrl, link });
        }

        // Pagination: look for next page link
        const nextEl = doc.selectFirst("a[href*='/series/page/']");
        const hasNextPage = !!nextEl && nextEl.attr("href").includes(`/page/${page + 1}/`);

        return { list, hasNextPage };
    }

    // ── Popular ───────────────────────────────────────────────────────────────
    async getPopular(page) {
        const base = this.getBaseUrl();
        const url  = page === 1
            ? `${base}/series/?order=update`
            : `${base}/series/page/${page}/?order=update`;
        const res = await new Client().get(url, this.getHeaders());
        return this._parseSeriesList(res.body, page);
    }

    // ── Latest updates ────────────────────────────────────────────────────────
    async getLatestUpdates(page) {
        return this.getPopular(page);
    }

    // ── Search ────────────────────────────────────────────────────────────────
    // gogoanime.fi/?s=query returns episode posts. We deduplicate by series.
    async search(query, page, filterList) {
        const base = this.getBaseUrl();
        const url  = page === 1
            ? `${base}/?s=${encodeURIComponent(query)}`
            : `${base}/page/${page}/?s=${encodeURIComponent(query)}`;
        const res = await new Client().get(url, this.getHeaders());
        const doc = new Document(res.body);

        const list  = [];
        const seen  = {};

        // Search results are individual episode posts; group by series slug
        const posts = doc.select("article");
        for (const post of posts) {
            // Try to find the series link embedded in the post
            const seriesEl = post.selectFirst("a[href*='/series/']");
            if (seriesEl) {
                const link = seriesEl.getHref || seriesEl.attr("href") || "";
                if (!link || seen[link]) continue;
                seen[link] = 1;
                const name = (seriesEl.text || "").trim() || link.split("/series/")[1]?.replace(/-/g, " ") || "";
                const img  = post.selectFirst("img");
                const raw  = img ? (img.attr("src") || "") : "";
                const imageUrl = raw.replace(/-\d+x\d+(\.[a-z]+)$/, "$1");
                list.push({ name, imageUrl, link });
                continue;
            }

            // Fallback: episode post link — convert episode URL to series URL
            const aEl = post.selectFirst("a[href]");
            if (!aEl) continue;
            const epLink = aEl.getHref || aEl.attr("href") || "";
            if (!epLink.includes("gogoanime")) continue;

            // e.g. /black-torch-episode-3-english-subbed/ → /series/black-torch/
            const m = epLink.match(/\/([a-z0-9-]+)-episode-\d/);
            if (!m) continue;
            const slug  = m[1];
            const link2 = `${base}/series/${slug}/`;
            if (seen[link2]) continue;
            seen[link2] = 1;

            const title = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
            const img2  = post.selectFirst("img");
            const raw2  = img2 ? (img2.attr("src") || "") : "";
            list.push({ name: title, imageUrl: raw2.replace(/-\d+x\d+(\.[a-z]+)$/, "$1"), link: link2 });
        }

        const hasNextPage = !!doc.selectFirst("a.next");
        return { list, hasNextPage };
    }

    // ── Detail ────────────────────────────────────────────────────────────────
    async getDetail(url) {
        const base = this.getBaseUrl();
        const fullUrl = url.startsWith("http") ? url : base + url;
        const res = await new Client().get(fullUrl, this.getHeaders());
        const doc = new Document(res.body);

        // Title
        const titleEl = doc.selectFirst("h1[itemprop='name']") || doc.selectFirst("h1");
        const name = titleEl ? (titleEl.text || "").trim() : "";

        // Cover — series detail page has full-size image
        const imgEl   = doc.selectFirst("img[itemprop='image']") || doc.selectFirst(".poster img") || doc.selectFirst("article img");
        const raw     = imgEl ? (imgEl.attr("src") || imgEl.attr("data-src") || "") : "";
        const imageUrl = raw.replace(/-\d+x\d+(\.[a-z]+)$/, "$1");

        // Description
        const descEl = doc.selectFirst("[itemprop='description']") || doc.selectFirst(".entry-content");
        const description = descEl ? (descEl.text || "").trim() : "";

        // Genre
        const genreEls = doc.select("[itemprop='genre']");
        const genre = genreEls.map(el => (el.text || "").trim()).filter(Boolean);

        // Status
        const statusEl = doc.selectFirst(".status");
        const statusStr = statusEl ? (statusEl.text || "").toLowerCase() : "";
        let status = 0;
        if (statusStr.includes("completed") || statusStr.includes("finished")) status = 1;
        else if (statusStr.includes("hiatus")) status = 2;

        // Episode list — links like /{slug}-episode-N-english-subbed/
        const epLinks = doc.select("a[href*='-episode-']");
        const epsSeen = {};
        const episodes = [];
        for (const el of epLinks) {
            const epUrl  = el.getHref || el.attr("href") || "";
            if (!epUrl || epsSeen[epUrl]) continue;
            epsSeen[epUrl] = 1;

            // Parse episode number
            const nm = epUrl.match(/-episode-(\d+(?:\.\d+)?)/);
            const num = nm ? parseFloat(nm[1]) : 0;
            const scanlator = epUrl.includes("-dubbed") ? "dub" : "sub";
            episodes.push({
                name: `Episode ${num}`,
                url:  epUrl,
                scanlator,
                dateUpload: ""
            });
        }
        // Sort ascending
        episodes.sort((a, b) => a.num - b.num);

        return { name, imageUrl, description, genre, status, episodes };
    }

    // ── Video list ────────────────────────────────────────────────────────────
    async getVideoList(url) {
        const base = this.getBaseUrl();
        const fullUrl = url.startsWith("http") ? url : base + url;
        const res = await new Client().get(fullUrl, this.getHeaders());

        // Extract Blogger embed iframe
        const bloggerM = res.body.match(/src="(https:\/\/www\.blogger\.com\/video\.g[^"]+)"/);
        if (bloggerM) {
            return [{
                url:         bloggerM[1],
                quality:     "Default (Blogger)",
                originalUrl: bloggerM[1]
            }];
        }

        // Fallback: any <iframe src>
        const doc = new Document(res.body);
        const iframes = doc.select("iframe[src]");
        const videos  = [];
        for (const f of iframes) {
            const src = f.attr("src") || "";
            if (src && !src.includes("ads") && !src.includes("google.com/maps")) {
                videos.push({ url: src, quality: "Default", originalUrl: src });
            }
        }
        return videos;
    }

    // ── Filters ───────────────────────────────────────────────────────────────
    getFilterList() { return []; }

    // ── Preferences ───────────────────────────────────────────────────────────
    getSourcePreferences() {
        return [{
            key: "gogo_base_url",
            editTextPreference: {
                title: "Override Base URL",
                summary: "Changer si le domaine change",
                value: BASE_URL,
                dialogTitle: "Override Base URL",
                dialogMessage: `Défaut: ${BASE_URL}`
            }
        }];
    }

    async getCustomList(listId, page) {
        return this.getPopular(page);
    }
}
