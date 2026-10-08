const watchtowerSources = [{
    "name": "Comic Fury (FR)",
    "langs": ["fr"],
    "baseUrl": "https://comicfury.com",
    "iconUrl": "https://comicfury.com/images/favicon.png",
    "typeSource": "single",
    "itemType": 2,
    "isManga": true,
    "isNsfw": false,
    "version": "1.0.1",
    "login": false,
    "forYou": false,
    "pkgPath": "manga/fr/comicfury_fr.js",
    "editableBaseUrl": true,
    "hasCloudflare": false,
    "requiresAccount": false,
    "hasDRM": false,
    "paywall": "free",
    "notes": "Webcomics heberges sur Comic Fury, filtres sur la langue francaise."
}];
const BASE_URL = "https://comicfury.com";
const LANGUAGE = "fr";
class DefaultExtension extends MProvider {
    constructor() { super(); }
    get baseUrl() { return new SharedPreferences().get("base_url") || BASE_URL; }

    getSourcePreferences() {
        return [{
            key: "base_url",
            editTextPreference: {
                title: "URL du site",
                summary: "Adresse du site. A modifier uniquement si le domaine change.",
                value: BASE_URL,
                dialogTitle: "URL du site",
                dialogMessage: "URL actuelle : " + BASE_URL
            }
        }];
    }

    _hdrs(ref, form) {
        const h = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
            "Referer": ref || this.baseUrl + "/",
            "Accept-Language": "fr-FR,fr;q=0.9"
        };
        if (form) h["Content-Type"] = "application/x-www-form-urlencoded";
        return h;
    }

    _abs(u) {
        if (!u) return "";
        return u.startsWith("http") ? u : this.baseUrl + (u.startsWith("/") ? u : "/" + u);
    }

    _dec(s) {
        return String(s || "")
            .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
            .replace(/&#8211;/g, "-").replace(/&#8217;/g, "'").replace(/&nbsp;/g, " ")
            .replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    }

    // Comic Fury hides flagged webcomics behind an interstitial that posts back
    // to the same URL. Re-submitting the token once unlocks the real page.
    async _get(url) {
        const r = await new Client().get(url, this._hdrs(url));
        const body = r.body || "";
        if (/Content Warning/.test(body) && /name="proceed"[^>]*value="View Webcomic"/i.test(body)) {
            const token = (body.match(/name="token"\s+value="([^"]+)"/) || [])[1];
            if (token) {
                const r2 = await new Client().post(
                    url,
                    this._hdrs(url, true),
                    "token=" + encodeURIComponent(token) + "&proceed=" + encodeURIComponent("View Webcomic")
                );
                return r2.body || "";
            }
        }
        return body;
    }

    _parseSearch(html) {
        const list = [];
        const seen = {};
        const re = /<div class="webcomic-result">[\s\S]*?<a href="(\/comicprofile\.php\?url=[^"]+)"[\s\S]*?<img src="([^"]+)"[\s\S]*?class="webcomic-result-title"[^>]*title="([^"]*)"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const link = this._abs(m[1]);
            if (seen[link]) continue;
            seen[link] = 1;
            list.push({ name: this._dec(m[3]), link: link, imageUrl: this._abs(m[2]) });
        }
        return list;
    }

    async _search(page, sort, query) {
        const url = this.baseUrl + "/search.php?query=" + encodeURIComponent(query || "") +
            "&page=" + page + "&sort=" + sort + "&language=" + (query ? "All" : LANGUAGE);
        const html = await this._get(url);
        return { list: this._parseSearch(html), hasNextPage: /search-next-page/.test(html) };
    }

    async getPopular(page) { return await this._search(page, 1, ""); }
    async getLatestUpdates(page) { return await this._search(page, 2, ""); }
    async search(query, page, filters) { return await this._search(page, 0, query); }

    async getDetail(url) {
        const slug = (String(url).match(/[?&]url=([^&]+)/) || [])[1] || "";
        const profile = await this._get(url);

        const nameM = /<div class="authorname">([\s\S]*?)<\/div>/i.exec(profile);
        const descM = /<div class="username-and-title">[\s\S]*?<em>([\s\S]*?)<\/em>/i.exec(profile);
        const coverM = /<img src="(\/comicavatars\/[^"]+)"/i.exec(profile);
        const authorM = /<a class="authorname"[^>]*>([\s\S]*?)<\/a>/i.exec(profile);

        const chapters = [];
        const seen = {};
        const archiveBase = this.baseUrl + "/read/" + slug + "/archive";

        let page = 1;
        while (page <= 80) {
            const archiveUrl = page === 1 ? archiveBase : archiveBase + "/chapter/0/page/" + page;
            const html = await this._get(archiveUrl);

            const chapterLinks = [];
            const cre = /<a href="(\/read\/[^"]+\/archive\/chapter\/[^"]+)"><div class="archive-chapter">([\s\S]*?)<\/div><\/a>/gi;
            let cm;
            while ((cm = cre.exec(html)) !== null) {
                chapterLinks.push({ url: this._abs(cm[1]), title: this._dec(cm[2]) });
            }

            if (chapterLinks.length > 0) {
                for (const ch of chapterLinks) {
                    const chHtml = await this._get(ch.url);
                    this._collectComics(chHtml, ch.title, chapters, seen);
                }
            } else {
                this._collectComics(html, "", chapters, seen);
            }

            const hasNext = new RegExp('/archive/chapter/0/page/' + (page + 1) + '\\b').test(html);
            if (!hasNext) break;
            page++;
        }

        chapters.reverse();
        return {
            name: nameM ? this._dec(nameM[1]) : (slug || "Comic Fury"),
            link: url,
            imageUrl: coverM ? this._abs(coverM[1]) : "",
            author: authorM ? this._dec(authorM[1]) : "",
            description: descM ? this._dec(descM[1]) : "",
            chapters: chapters
        };
    }

    _collectComics(html, chapterHeader, out, seen) {
        const re = /<a href="(\/read\/[^"]+)"><div class="archive-comic">[\s\S]*?class="archive-comic-title">([\s\S]*?)<\/span>[\s\S]*?class="archive-comic-date">([\s\S]*?)<\/span>/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const cu = this._abs(m[1]);
            if (seen[cu]) continue;
            seen[cu] = 1;
            const title = this._dec(m[2]);
            out.push({
                name: chapterHeader ? chapterHeader + " - " + title : title,
                url: cu,
                dateUpload: this._dec(m[3])
            });
        }
    }

    async getPageList(url) {
        const html = await this._get(url);
        const pages = [];
        const seen = {};
        let m;
        const re = /<div class="is--image-segment"[^>]*>[\s\S]*?<img src="([^"]+)"/gi;
        while ((m = re.exec(html)) !== null) {
            const u = this._abs(m[1]);
            if (seen[u]) continue;
            seen[u] = 1;
            pages.push({ url: u, headers: this._hdrs(url) });
        }
        if (pages.length === 0) {
            const re2 = /id="comicimage"[^>]*src="([^"]+)"/gi;
            while ((m = re2.exec(html)) !== null) {
                const u = this._abs(m[1]);
                if (seen[u]) continue;
                seen[u] = 1;
                pages.push({ url: u, headers: this._hdrs(url) });
            }
        }
        return pages;
    }

    getFilterList() { return []; }
    getForYou(page) { return this.getPopular(page); }
    getComments(url, page) { return Promise.resolve([]); }
}
