const watchtowerSources = [{
    "name": "AnimeZone",
    "langs": ["fr"],
    "ids": { "fr": 742916341 },
    "baseUrl": "https://www.animezone.fr",
    "apiUrl": "https://www.animezone.fr",
    "iconUrl": "https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/watch/fr/icons/animezone.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "0.1.4",
    "pkgPath": "watch/fr/animezone.js",
    "editableBaseUrl": true,
    "customUserAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "videoQualities": ["AUTO", "1080p", "720p", "480p", "360p"],
    "contentSubtype": ["anime"]
}];

const BASE_URL = "https://www.animezone.fr";

class DefaultExtension extends MProvider {
    constructor() {
        super();
    }

    get baseUrl() {
        const p = this.source.prefs?.find(x => x.key === "base_url");
        return (p && p.value) ? p.value.replace(/\/$/, "") : BASE_URL.replace(/\/$/, "");
    }

    _hdrs(ref) {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": ref || `${this.baseUrl}/`,
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8"
        };
    }

    _parseList(html) {
        const list = [];
        const seen = {};
        // animezone.fr uses data attributes on favourite buttons inside each card.
        // Extract all three attributes in order — they always appear in the same sequence
        // on the same element so positional matching is reliable.
        const slugs  = [...html.matchAll(/data-anime-slug="([^"]+)"/gi)].map(m => m[1]);
        const titles = [...html.matchAll(/data-anime-title="([^"]+)"/gi)].map(m => m[1]);
        const images = [...html.matchAll(/data-anime-image="([^"]+)"/gi)].map(m => m[1]);
        for (let i = 0; i < slugs.length; i++) {
            const url = `${this.baseUrl}/anime/${slugs[i]}/`;
            if ((url in seen)) continue;
            (seen[url] = 1);
            if (titles[i] && images[i]) {
                list.push({ link: url, imageUrl: images[i], name: titles[i].trim() });
            }
        }
        return list;
    }

    async getPopular(page) {
        const res = await new Client().get(
            `${this.baseUrl}/animes/?page=${page}&order=popular`,
            this._hdrs()
        );
        if (res.statusCode !== 200) throw new Error(`HTTP ${res.statusCode}`);
        const list = this._parseList(res.body);
        const hasNext = /<a[^>]+(?:next|suivant|page-\d+)[^>]*>/i.test(res.body);
        return { list, hasNextPage: hasNext };
    }

    async getLatestUpdates(page) {
        const res = await new Client().get(
            `${this.baseUrl}/animes/?page=${page}&order=latest`,
            this._hdrs()
        );
        if (res.statusCode !== 200) throw new Error(`HTTP ${res.statusCode}`);
        const list = this._parseList(res.body);
        const hasNext = /<a[^>]+(?:next|suivant|page-\d+)[^>]*>/i.test(res.body);
        return { list, hasNextPage: hasNext };
    }

    async search(query, page, filterList) {
        const res = await new Client().get(
            `${this.baseUrl}/animes/?s=${encodeURIComponent(query)}&page=${page}`,
            this._hdrs()
        );
        if (res.statusCode !== 200) throw new Error(`HTTP ${res.statusCode}`);
        const list = this._parseList(res.body);
        return { list, hasNextPage: false };
    }

    async getDetail(url) {
        const res = await new Client().get(url, this._hdrs(url));
        if (res.statusCode !== 200) throw new Error(`HTTP ${res.statusCode}`);
        const html = res.body;

        // Name
        const nameM = html.match(/<h1[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)
            || html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)
            || html.match(/<title>([^<]+)/i);
        const name = nameM ? nameM[1].replace(/<[^>]+>/g, '').trim() : '';

        // Image
        const imgM = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)
            || html.match(/<img[^>]+class="[^"]*(?:cover|poster|thumbnail)[^"]*"[^>]+(?:src|data-src)="([^"]+)"/i);
        const imageUrl = imgM ? imgM[1] : '';

        // Description
        const descM = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)
            || html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)
            || html.match(/<div[^>]+class="[^"]*(?:desc|synopsis|summary)[^"]*"[^>]*>([\s\S]{0,1000}?)<\/div>/i);
        const description = descM ? descM[1].replace(/<[^>]+>/g, '').trim() : '';

        // Episodes
        const episodes = [];
        // Pattern 1: explicit episode links
        const epRe = /<a[^>]+href="((?:https?:\/\/[^"]*)?\/episode[^"]+|(?:https?:\/\/[^"]*)?\/ep-\d+[^"]*)"[^>]*>([^<]{1,80})<\/a>/gi;
        let m;
        while ((m = epRe.exec(html)) !== null) {
            const epUrl = m[1].startsWith('http') ? m[1] : `${this.baseUrl}${m[1]}`;
            const epName = m[2].trim();
            episodes.push({ name: epName || `Episode`, url: epUrl, dateUpload: '' });
        }
        // Pattern 2: numbered episode list items
        if (episodes.length === 0) {
            const epRe2 = /<li[^>]*>\s*<a[^>]+href="([^"]+\/\d+\/?)"[^>]*>(.*?)<\/a>/gi;
            while ((m = epRe2.exec(html)) !== null) {
                const epUrl = m[1].startsWith('http') ? m[1] : `${this.baseUrl}${m[1]}`;
                const epName = m[2].replace(/<[^>]+>/g, '').trim();
                if (epName.length > 0) {
                    episodes.push({ name: epName, url: epUrl, dateUpload: '' });
                }
            }
        }
        if (episodes.length === 0) {
            episodes.push({ name: 'Regarder', url, dateUpload: '' });
        }

        return { name, description, imageUrl, genres: [], status: 0, chapters: episodes };
    }

    async getVideoList(url) {
        const res = await new Client().get(url, this._hdrs(url));
        if (res.statusCode !== 200) throw new Error(`HTTP ${res.statusCode}`);
        const html = res.body;
        const videos = [];

        // Extract iframes / embed URLs
        const iframeRe = /<iframe[^>]+src="([^"]+)"/gi;
        const embedUrls = [];
        let m;
        while ((m = iframeRe.exec(html)) !== null) {
            const src = m[1];
            if (src && !src.includes('ads') && !src.includes('google')) {
                embedUrls.push(src.startsWith('//') ? 'https:' + src : src);
            }
        }

        // Extract direct .m3u8 links
        const hlsRe = /["'](https?:\/\/[^"']+\.m3u8[^"']*)/g;
        while ((m = hlsRe.exec(html)) !== null) {
            videos.push({ url: m[1], quality: 'AUTO', originalUrl: m[1], headers: this._hdrs(url) });
        }

        // Try to get m3u8 from each iframe
        for (const embedUrl of embedUrls.slice(0, 3)) {
            try {
                const embedRes = await new Client().get(embedUrl, this._hdrs(url));
                const ebody = embedRes.body;
                const hm = ebody.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)/);
                if (hm) {
                    videos.push({ url: hm[1], quality: 'AUTO', originalUrl: hm[1], headers: this._hdrs(embedUrl) });
                }
                // mp4 fallback
                const mp4m = ebody.match(/["'](https?:\/\/[^"']+\.mp4[^"']*)/);
                if (mp4m) {
                    videos.push({ url: mp4m[1], quality: 'AUTO', originalUrl: mp4m[1], headers: this._hdrs(embedUrl) });
                }
            } catch (e) {}
        }

        if (videos.length === 0) {
            // Last resort: return the iframe URL as a direct video
            for (const embedUrl of embedUrls.slice(0, 1)) {
                videos.push({ url: embedUrl, quality: 'AUTO', originalUrl: embedUrl, headers: this._hdrs(url) });
            }
        }
        if (videos.length === 0) {
            videos.push({ url, quality: 'Page', originalUrl: url, headers: this._hdrs(url) });
        }
        return videos;
    }
}
