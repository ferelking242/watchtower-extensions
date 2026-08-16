const watchtowerSources = [{
    "name": "MovieFR",
    "lang": "multi",
    "baseUrl": "https://jgzm.iuk9.com",
    "apiUrl": "https://jgzm.iuk9.com",
    "iconUrl": "https://jgzm.iuk9.com/favicon.ico",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "1.0.0",
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "watch/multi/moviefr.js",
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "hasSubtitles": true,
    "hasDub": true,
    "notes": "MovieFR Android API reverse-engineered from com.mfr.moviefr. Uses /api/search/result, /api/vod/info_new and /api/channel/get_list.",
    "editableBaseUrl": true
}];

var MF_DEFAULT_API = "https://jgzm.iuk9.com";
var MF_DEVICE_ID = "watchtower-moviefr";
var MF_SIGN_KEY = "47Q8tBqO4YqrMHf4";
var MF_PAGE_SIZE = 20;

function mfMd5(value) {
    function sl(n, c) { return (n << c) | (n >>> (32 - c)); }
    function add(a, b) {
        var m = (a & 0xffff) + (b & 0xffff);
        var h = (a >> 16) + (b >> 16) + (m >> 16);
        return (h << 16) | (m & 0xffff);
    }
    function cmn(q, a, b, x, s, t) { return add(sl(add(add(a, q), add(x, t)), s), b); }
    function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }

    var input = unescape(encodeURIComponent(String(value)));
    var words = [], i;
    for (i = 0; i < input.length * 8; i += 8) {
        words[i >> 5] |= (input.charCodeAt(i / 8) & 0xff) << (i % 32);
    }
    words[input.length * 8 >> 5] |= 0x80 << ((input.length * 8) % 32);
    words[(((input.length * 8 + 64) >>> 9) << 4) + 14] = input.length * 8;

    var a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    for (i = 0; i < words.length; i += 16) {
        var oa = a, ob = b, oc = c, od = d;
        a = ff(a, b, c, d, words[i], 7, -680876936);
        d = ff(d, a, b, c, words[i + 1], 12, -389564586);
        c = ff(c, d, a, b, words[i + 2], 17, 606105819);
        b = ff(b, c, d, a, words[i + 3], 22, -1044525330);
        a = ff(a, b, c, d, words[i + 4], 7, -176418897);
        d = ff(d, a, b, c, words[i + 5], 12, 1200080426);
        c = ff(c, d, a, b, words[i + 6], 17, -1473231341);
        b = ff(b, c, d, a, words[i + 7], 22, -45705983);
        a = ff(a, b, c, d, words[i + 8], 7, 1770035416);
        d = ff(d, a, b, c, words[i + 9], 12, -1958414417);
        c = ff(c, d, a, b, words[i + 10], 17, -42063);
        b = ff(b, c, d, a, words[i + 11], 22, -1990404162);
        a = ff(a, b, c, d, words[i + 12], 7, 1804603682);
        d = ff(d, a, b, c, words[i + 13], 12, -40341101);
        c = ff(c, d, a, b, words[i + 14], 17, -1502002290);
        b = ff(b, c, d, a, words[i + 15], 22, 1236535329);
        a = gg(a, b, c, d, words[i + 1], 5, -165796510);
        d = gg(d, a, b, c, words[i + 6], 9, -1069501632);
        c = gg(c, d, a, b, words[i + 11], 14, 643717713);
        b = gg(b, c, d, a, words[i], 20, -373897302);
        a = gg(a, b, c, d, words[i + 5], 5, -701558691);
        d = gg(d, a, b, c, words[i + 10], 9, 38016083);
        c = gg(c, d, a, b, words[i + 15], 14, -660478335);
        b = gg(b, c, d, a, words[i + 4], 20, -405537848);
        a = gg(a, b, c, d, words[i + 9], 5, 568446438);
        d = gg(d, a, b, c, words[i + 14], 9, -1019803690);
        c = gg(c, d, a, b, words[i + 3], 14, -187363961);
        b = gg(b, c, d, a, words[i + 8], 20, 1163531501);
        a = gg(a, b, c, d, words[i + 13], 5, -1444681467);
        d = gg(d, a, b, c, words[i + 2], 9, -51403784);
        c = gg(c, d, a, b, words[i + 7], 14, 1735328473);
        b = gg(b, c, d, a, words[i + 12], 20, -1926607734);
        a = hh(a, b, c, d, words[i + 5], 4, -378558);
        d = hh(d, a, b, c, words[i + 8], 11, -2022574463);
        c = hh(c, d, a, b, words[i + 11], 16, 1839030562);
        b = hh(b, c, d, a, words[i + 14], 23, -35309556);
        a = hh(a, b, c, d, words[i + 1], 4, -1530992060);
        d = hh(d, a, b, c, words[i + 4], 11, 1272893353);
        c = hh(c, d, a, b, words[i + 7], 16, -155497632);
        b = hh(b, c, d, a, words[i + 10], 23, -1094730640);
        a = hh(a, b, c, d, words[i + 13], 4, 681279174);
        d = hh(d, a, b, c, words[i], 11, -358537222);
        c = hh(c, d, a, b, words[i + 3], 16, -722521979);
        b = hh(b, c, d, a, words[i + 6], 23, 76029189);
        a = hh(a, b, c, d, words[i + 9], 4, -640364487);
        d = hh(d, a, b, c, words[i + 12], 11, -421815835);
        c = hh(c, d, a, b, words[i + 15], 16, 530742520);
        b = hh(b, c, d, a, words[i + 2], 23, -995338651);
        a = ii(a, b, c, d, words[i], 6, -198630844);
        d = ii(d, a, b, c, words[i + 7], 10, 1126891415);
        c = ii(c, d, a, b, words[i + 14], 15, -1416354905);
        b = ii(b, c, d, a, words[i + 5], 21, -57434055);
        a = ii(a, b, c, d, words[i + 12], 6, 1700485571);
        d = ii(d, a, b, c, words[i + 3], 10, -1894986606);
        c = ii(c, d, a, b, words[i + 10], 15, -1051523);
        b = ii(b, c, d, a, words[i + 1], 21, -2054922799);
        a = ii(a, b, c, d, words[i + 8], 6, 1873313359);
        d = ii(d, a, b, c, words[i + 15], 10, -30611744);
        c = ii(c, d, a, b, words[i + 6], 15, -1560198380);
        b = ii(b, c, d, a, words[i + 13], 21, 1309151649);
        a = ii(a, b, c, d, words[i + 4], 6, -145523070);
        d = ii(d, a, b, c, words[i + 11], 10, -1120210379);
        c = ii(c, d, a, b, words[i + 2], 15, 718787259);
        b = ii(b, c, d, a, words[i + 9], 21, -343485551);
        a = add(a, oa); b = add(b, ob); c = add(c, oc); d = add(d, od);
    }

    function hex(n) {
        var result = "", chars = "0123456789abcdef";
        for (var j = 0; j < 4; j++) {
            var v = (n >>> (j * 8)) & 0xff;
            result += chars[(v >> 4) & 0xf] + chars[v & 0xf];
        }
        return result;
    }
    return hex(a) + hex(b) + hex(c) + hex(d);
}

class DefaultExtension extends MProvider {
    constructor() { super(); }

    get baseUrl() {
        const pref = this.source && this.source.prefs && this.source.prefs.find(x => x.key === "base_url");
        return ((pref && pref.value) || MF_DEFAULT_API).replace(/\/$/, "");
    }

    _headers() {
        const now = String(Date.now());
        return {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "Watchtower/1.0 MovieFR",
            "app_id": "moviefr",
            "package_name": "com.mfr.moviefr",
            "version": "30003",
            "sys_platform": "2",
            "device_id": MF_DEVICE_ID,
            "androidid": MF_DEVICE_ID,
            "cur_time": now,
            "token": "",
            "sign": mfMd5(MF_SIGN_KEY + MF_DEVICE_ID + now),
            "is_vvv": "0",
            "is_language": "1",
            "is_display": "1",
            "app_language": "en"
        };
    }

    async _post(path, body) {
        const res = await new Client().post(this.baseUrl + path, this._headers(), body || {});
        let json;
        try { json = JSON.parse(res.body || ""); } catch (_) {
            throw new Error("MovieFR returned an invalid response.");
        }
        if (json && json.code !== undefined && json.code !== 0 && json.code !== 200) {
            throw new Error(json.msg || json.message || "MovieFR API error.");
        }
        return json && (json.result || json.data || json);
    }

    _list(value) {
        if (Array.isArray(value)) return value;
        if (!value || typeof value !== "object") return [];
        return value.list || value.vod_list || value.videos || value.rows || value.data || [];
    }

    _card(item) {
        const id = item.videoId || item.vod_id || item.id;
        const title = item.name || item.vod_name || item.title || "Unknown";
        return {
            name: title,
            link: JSON.stringify({ id: id }),
            imageUrl: item.coverUrl || item.vod_pic || item.cover || item.pic || "",
            description: item.simpleDesc || item.videoDesc || item.vod_blurb || item.remarks || "",
            author: item.vod_year || item.year || "",
            artist: item.vod_director || item.director || "",
            genre: this._genres(item)
        };
    }

    _genres(item) {
        const raw = item.tag || item.vod_tag || item.genre || item.type_name || "";
        return String(raw).split(/[,|/]/).map(x => x.trim()).filter(Boolean);
    }

    _items(payload) {
        return this._list(payload).map(x => this._card(x));
    }

    async search(query, page, filterList) {
        const q = String(query || "").trim();
        const result = await this._post("/api/search/result", {
            kw: q,
            pn: page || 1,
            page: page || 1,
            type_pid: this._filter(filterList, "type_pid"),
            limit: MF_PAGE_SIZE
        });
        const list = this._items(result);
        return { list: list, hasNextPage: list.length >= MF_PAGE_SIZE };
    }

    _filter(filterList, key) {
        if (!Array.isArray(filterList)) return "";
        for (let i = 0; i < filterList.length; i++) {
            const f = filterList[i];
            if (f && (f.key === key || f.id === key)) return f.value || f.val || "";
        }
        return "";
    }

    async getPopular(page) {
        return this._catalog(page, "popular");
    }

    async getLatestUpdates(page) {
        return this._catalog(page, "latest");
    }

    async _catalog(page, sort) {
        const result = await this._post("/api/channel/get_list", {
            pn: page || 1,
            page: page || 1,
            sort: sort,
            limit: MF_PAGE_SIZE
        });
        const list = this._items(result);
        return { list: list, hasNextPage: list.length >= MF_PAGE_SIZE };
    }

    async getSuggestions(query) {
        const result = await this._post("/api/search/suggest", { kw: String(query || "") });
        return this._items(result).slice(0, 10);
    }

    async getDetail(url) {
        let payload = {};
        try { payload = JSON.parse(url); } catch (_) { payload = { id: url }; }
        const result = await this._post("/api/vod/info_new", { vod_id: payload.id || payload.vod_id });
        const item = result && (result.vod_info || result.info || result.video || result);
        const card = this._card(item || {});
        const chapters = [];
        const videos = (item && (item.vod_collection || item.collection || item.videos)) || [];
        if (videos.length) {
            for (let i = 0; i < videos.length; i++) {
                const video = videos[i] || {};
                chapters.push({
                    name: video.title || video.name || video.episode || ("Episode " + (i + 1)),
                    url: JSON.stringify({
                        id: payload.id || payload.vod_id,
                        collection: video.id || video.vod_id || video.collection_id || 0,
                        source: video.vod_from_id || video.source_id || ""
                    })
                });
            }
        }
        if (!chapters.length) {
            chapters.push({ name: "▶ Regarder", url: JSON.stringify({ id: payload.id || payload.vod_id }) });
        }
        return {
            name: card.name,
            imageUrl: card.imageUrl,
            description: card.description,
            genre: card.genre,
            author: card.author,
            artist: card.artist,
            chapters: chapters
        };
    }

    async getVideoList(url) {
        let payload = {};
        try { payload = JSON.parse(url); } catch (_) { payload = { id: url }; }
        const result = await this._post("/api/vod/info_new", {
            vod_id: payload.id || payload.vod_id,
            vod_from_id: payload.source || ""
        });
        const item = result && (result.vod_info || result.info || result.video || result);
        const videos = (item && (item.vod_collection || item.collection || item.videos)) || [];
        const out = [];
        for (let i = 0; i < videos.length; i++) {
            const video = videos[i] || {};
            const videoUrl = video.play_url || video.vod_url || video.url || video.orginal_url || video.down_url;
            if (videoUrl) out.push({
                url: videoUrl,
                quality: video.quality || video.resolution || "AUTO",
                headers: this._headers()
            });
        }
        if (!out.length && item) {
            const videoUrl = item.play_url || item.vod_url || item.url || item.orginal_url || item.down_url;
            if (videoUrl) out.push({ url: videoUrl, quality: "AUTO", headers: this._headers() });
        }
        return out;
    }

    async getRecommendations(url) {
        let payload = {};
        try { payload = JSON.parse(url); } catch (_) { payload = { id: url }; }
        const result = await this._post("/api/vod/info_new", { vod_id: payload.id || payload.vod_id });
        const related = result && (result.recommend || result.recommend_list || result.more || result.vod_more);
        return this._items(related);
    }

    async getComments(url) {
        let payload = {};
        try { payload = JSON.parse(url); } catch (_) { payload = { id: url }; }
        const result = await this._post("/api/vod/comment/list", {
            vod_id: payload.id || payload.vod_id,
            last_discuss_id: 0
        });
        const rows = this._list(result);
        return rows.map(x => ({
            author: x.user_name || x.username || x.nick_name || "MovieFR",
            content: x.content || x.comment || "",
            date: x.create_time || x.time || ""
        }));
    }

    getFilterList() {
        return [{
            key: "type_pid",
            name: "Type",
            values: [
                { key: "", name: "All" },
                { key: "1", name: "Movies" },
                { key: "2", name: "Series" },
                { key: "3", name: "Anime" }
            ]
        }];
    }

    async getHome() {
        const result = await this._post("/api/channel/get_list", { pn: 1, page: 1, limit: MF_PAGE_SIZE });
        const items = this._items(result);
        return [{ id: "moviefr", title: "MovieFR", list: items }];
    }

    setupPreferences() {
        return [{
            key: "base_url",
            label: "MovieFR API URL",
            type: "text",
            defaultValue: MF_DEFAULT_API,
            summary: "Override the API domain if the default server changes."
        }];
    }
}

new DefaultExtension();