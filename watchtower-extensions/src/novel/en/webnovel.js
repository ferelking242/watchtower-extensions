const watchtowerSources = [{
    "name": "Webnovel",
    "lang": "en",
    "baseUrl": "https://www.webnovel.com",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/lnreader/lnreader-plugins/plugins/v3.0.0/public/static/src/en/webnovel/icon.png",
    "typeSource": "single",
    "isManga": false,
    "itemType": 2,
    "version": "1.0.0",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "novel/src/en/webnovel.js",
    "notes": "",
    "sourceCodeLanguage": 1,
    "appMinVerReq": "0.5.0"
}];

const BASE_URL = "https://www.webnovel.com";
const API_URL  = "https://www.webnovel.com/go/pcm";

class DefaultExtension extends MProvider {
    getHeaders(url) {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": BASE_URL,
            "Accept": "application/json",
        };
    }

    async fetchJSON(url) {
        const res = await new Client().get(url, this.getHeaders(url));
        try { return JSON.parse(res.body); } catch (_) { return null; }
    }

    async getPopular(page) {
        const data = await this.fetchJSON(API_URL + "/book/category?categoryId=0&gender=2&pageIndex=" + page + "&pageSize=20&type=1");
        const items = data?.data?.bookItems || [];
        const list  = items.map(b => ({
            name: b.bookName || "",
            link: BASE_URL + "/book/" + b.bookId,
            imageUrl: b.cover || "",
        }));
        return { list, hasNextPage: items.length >= 20 };
    }

    async getLatestUpdates(page) {
        const data = await this.fetchJSON(API_URL + "/book/category?categoryId=0&gender=2&pageIndex=" + page + "&pageSize=20&type=2");
        const items = data?.data?.bookItems || [];
        const list  = items.map(b => ({
            name: b.bookName || "",
            link: BASE_URL + "/book/" + b.bookId,
            imageUrl: b.cover || "",
        }));
        return { list, hasNextPage: items.length >= 20 };
    }

    async search(query, page, filterList) {
        const data = await this.fetchJSON(API_URL + "/search/result?encryptType=1&keywords=" + encodeURIComponent(query) + "&pageIndex=" + page + "&pageSize=20&type=1");
        const items = data?.data?.bookInfo?.bookItems || [];
        const list  = items.map(b => ({
            name: b.bookName || "",
            link: BASE_URL + "/book/" + b.bookId,
            imageUrl: b.cover || "",
        }));
        return { list, hasNextPage: items.length >= 20 };
    }

    async getDetail(url) {
        const bookId = url.match(/\/book\/(\d+)/)?.[1] || "";
        if (!bookId) return { name: "", imageUrl: "", author: "", genre: [], status: 5, description: "", chapters: [] };

        const data = await this.fetchJSON(API_URL + "/book/meta?bookId=" + bookId);
        const book = data?.data?.bookInfo || {};

        const name        = book.bookName || "";
        const imageUrl    = book.cover    || "";
        const author      = book.authorName || "";
        const description = book.description || "";
        const genre       = (book.categoryName ? [book.categoryName] : []).concat(book.tags || []);
        const status      = book.isCompleted === 1 ? 1 : 0;

        const chapData = await this.fetchJSON(API_URL + "/chapter/get-chapter-list?bookId=" + bookId);
        const chapters = (chapData?.data?.volumeItems || [])
            .flatMap(v => v.chapterItems || [])
            .map(ch => ({
                name: ch.chapterName || ("Chapter " + ch.chapterIndex),
                url:  BASE_URL + "/book/" + bookId + "/" + ch.chapterId,
                dateUpload: ch.updateTime ? String(new Date(ch.updateTime * 1000).valueOf()) : "",
            }));

        return { name, imageUrl, author, genre, status, description, chapters };
    }

    async getHtmlContent(name, url) {
        const m = url.match(/\/book\/(\d+)\/(\d+)/);
        if (!m) return "";
        const [, bookId, chapterId] = m;
        const data = await this.fetchJSON(API_URL + "/chapter/getContent?bookId=" + bookId + "&chapterId=" + chapterId);
        const content = data?.data?.chapterInfo?.contents || [];
        return content.map(c => "<p>" + (c.content || "").replace(/\n/g, " ") + "</p>").join("\n");
    }

    async cleanHtmlContent(html) { return html; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}
