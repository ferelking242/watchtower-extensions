const watchtowerSources = [{
    "name": "AnimeSongLyrics",
    "lang": "en",
    "baseUrl": "https://www.animesonglyrics.com",
    "apiUrl": "",
    "iconUrl": "https://www.animesonglyrics.com/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.0.0",
    "pkgPath": "music/en/anisonglyrics.js",
    "notes": "Anime song lyrics — opening, ending, and insert song lyrics",
    "editableBaseUrl": true
}];

const BASE_URL = "https://www.animesonglyrics.com";

class DefaultExtension extends MProvider {
    getHeaders() {
        return { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" };
    }

    getBaseUrl() {
        const source = this.getSource();
        return source?.baseUrl || BASE_URL;
    }

    async makeRequest(url) {
        const resp = await new Client().get(url, this.getHeaders());
        return resp.body;
    }

    async getPopular(page) {
        const url = `${this.getBaseUrl()}/popular`;
        const data = await this.makeRequest(url);
        const results = [];
        const regex = /<a[^>]*href="([^"]*)"[^>]*class="[^"]*anime[^"]*"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*>[\s\S]*?<[^>]*>([^<]*)<\/[^>]*>/gi;
        let match;
        while ((match = regex.exec(data)) !== null) {
            results.push({
                name: match[3].trim(),
                imageUrl: match[2].trim(),
                link: match[1].trim()
            });
        }
        const hasNextPage = data.includes(`page=${page + 1}`);
        return { list: results, hasNextPage };
    }

    async search(query, page = 1) {
        const url = `${this.getBaseUrl()}/search?q=${encodeURIComponent(query)}&page=${page}`;
        const data = await this.makeRequest(url);
        const results = [];
        const regex = /<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*>[\s\S]*?<[^>]*>([^<]*)<\/[^>]*>/gi;
        let match;
        while ((match = regex.exec(data)) !== null) {
            results.push({
                name: match[3].trim(),
                imageUrl: match[2].trim(),
                link: match[1].trim()
            });
        }
        const hasNextPage = data.includes(`page=${page + 1}`);
        return { list: results, hasNextPage };
    }

    async getDetail(url) {
        const data = await this.makeRequest(url);
        const titleMatch = data.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        const imageMatch = data.match(/<img[^>]*src="([^"]*)"[^>]*class="[^"]*cover/i) ||
                           data.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i);
        const lyricsMatch = data.match(/<div[^>]*class="[^"]*lyrics[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        const descMatch = data.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

        return {
            name: titleMatch ? titleMatch[1].trim() : "Unknown",
            imageUrl: imageMatch ? imageMatch[1].trim() : "",
            description: descMatch ? descMatch[1].replace(/<[^>]*>/g, "").trim() : "",
            episodes: [{
                name: "Lyrics",
                url: url,
                number: 1,
                description: lyricsMatch ? lyricsMatch[1].replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "").trim() : ""
            }]
        };
    }

    async getVideoList(url) {
        return [];
    }

    getSourcePreferences() { return []; }
}
