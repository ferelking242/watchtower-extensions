// ══════════════════════════════════════════════════════════════
//  Miraculum Music — miraculous.now/songs  v3.0.0
//  Miraculous Ladybug — albums, chansons & OSTs
//  Séries (S1–S7), film, jeux, intros multilingues
// ══════════════════════════════════════════════════════════════

const watchtowerSources = [{
    "name": "Miraculum Music",
    "lang": "multi",
    "baseUrl": "https://miraculous.now",
    "apiUrl": "https://AHHHHHH.b-cdn.net",
    "iconUrl": "https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/assets/icons/music-1008.png",
    "typeSource": "single",
    "itemType": 3,
    "version": "3.0.0",
    "login": false,
    "forYou": false,
    "pkgPath": "music/multi/miraculum.js",
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "isNsfw": false,
    "notes": "Miraculous Ladybug — albums OST, film, jeux, intros localisées (S1 à S7). CDN AHHHHHH."
}];

// ── Constants ─────────────────────────────────────────────────
// miraculum.ml redirige vers miraculous.now : l'ancien domaine (et son CDN
// Amexd) ne répond plus.
var MIRKM_BASE = "https://miraculous.now";
var MIRKM_CDN = "https://AHHHHHH.b-cdn.net/eps/miraculum/songs";
var MIRKM_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var MIRKM_TTL = 10 * 60 * 1000;

// La page /en/songs embarque tout le catalogue (albums + pistes) dans
// `var allSongs = {...}` : un seul chargement sert la liste, la recherche et
// les fiches.
var MIRKM_CACHE = { t: 0, albums: [] };

var MIRKM_LANG_NAMES = {
    ar: "العربية", bg: "Български", ca: "Català", cs: "Čeština", cy: "Cymraeg",
    da: "Dansk", de: "Deutsch", el: "Ελληνικά", en: "English", es: "Español",
    "es-419": "Español (LatAm)", eu: "Euskara", fi: "Suomi", fr: "Français",
    ga: "Gaeilge", he: "עברית", hi: "हिन्दी", hr: "Hrvatski", hu: "Magyar",
    it: "Italiano", ja: "日本語", ko: "한국어", nl: "Nederlands", no: "Norsk",
    pl: "Polski", pt: "Português", "pt-br": "Português (BR)", ro: "Română",
    ru: "Русский", sl: "Slovenščina", sr: "Srpski", sv: "Svenska", tr: "Türkçe",
    uk: "Українська", ur: "اردو", "zh-cmn": "普通話", "zh-tw": "國語",
    "zh-yue": "廣東話", inst: "Instrumental"
};

// ── Extension ─────────────────────────────────────────────────
class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
    }

    // Le runtime n'expose que `SharedPreferences` : `this.getPreference`
    // n'existe pas sur MProvider.
    getPreference(key) {
        var store = null;
        try {
            store = new SharedPreferences();
        } catch (e) {
            return "";
        }
        try {
            var value = store.getString(key, "");
            if (value !== null && value !== undefined) return String(value);
        } catch (e) {}
        try {
            var raw = store.get(key);
            return raw === null || raw === undefined ? "" : String(raw);
        } catch (e) {
            return "";
        }
    }

    getLang() {
        var value = String(this.getPreference("mirkm_lang") || "en").toLowerCase();
        return value ? value : "en";
    }

    getHeaders(url) {
        return {
            "User-Agent": MIRKM_UA,
            "Referer": MIRKM_BASE + "/",
            "Accept": "text/html,application/xhtml+xml,*/*"
        };
    }

    get supportsLatest() { return true; }

    // ── catalogue ─────────────────────────────────────────────
    // `var allSongs = {"<clé>": {album, author, year, languages?, songs:[…]}}`
    _extractAllSongs(html) {
        var body = String(html || "");
        var marker = body.indexOf("allSongs");
        if (marker < 0) return null;
        var start = body.indexOf("{", marker);
        if (start < 0) return null;

        var depth = 0;
        var inString = false;
        var escaped = false;
        for (var i = start; i < body.length; i++) {
            var ch = body.charAt(i);
            if (inString) {
                if (escaped) escaped = false;
                else if (ch === "\\") escaped = true;
                else if (ch === "\"") inString = false;
                continue;
            }
            if (ch === "\"") {
                inString = true;
            } else if (ch === "{") {
                depth++;
            } else if (ch === "}") {
                depth--;
                if (depth === 0) {
                    try {
                        return JSON.parse(body.substring(start, i + 1));
                    } catch (e) {
                        return null;
                    }
                }
            }
        }
        return null;
    }

    // Ordre d'affichage + jaquettes des cartes de la page /songs.
    _extractCards(html) {
        var body = String(html || "");
        var cards = [];
        var re = /<a[^>]*class="[^"]*song-item[^"]*"[\s\S]{0,1600}?<\/a>/gi;
        var m;
        while ((m = re.exec(body)) !== null) {
            var block = m[0];
            var key = (block.match(/data-album-key="([^"]+)"/) || [])[1] || "";
            if (!key) continue;
            cards.push({
                key: key,
                cover: (block.match(/<img[^>]+src="([^"]+)"/i) || [])[1] || "",
                title: this._clean((block.match(/class="album_card_title"[^>]*>([\s\S]*?)<\/div>/i) || [])[1] || ""),
                author: this._clean((block.match(/class="album_card_author"[^>]*>([\s\S]*?)<\/span>/i) || [])[1] || ""),
                year: this._clean((block.match(/class="album_card_year"[^>]*>([\s\S]*?)<\/span>/i) || [])[1] || "")
            });
        }
        return cards;
    }

    _clean(value) {
        return String(value || "")
            .replace(/<[^>]*>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&#0?39;|&apos;/g, "'")
            .replace(/&quot;/g, "\"")
            .replace(/\s+/g, " ")
            .trim();
    }

    _albumType(key) {
        var k = String(key || "");
        if (k.indexOf("series_") === 0) return "series";
        if (k.indexOf("movie") === 0) return "movies";
        if (k.indexOf("game_") === 0) return "games";
        if (k.indexOf("intro") >= 0 || k.indexOf("ladybug") === 0 || k.indexOf("christmas") === 0) return "intros";
        return "specials";
    }

    async _catalogue() {
        var now = Date.now();
        if (MIRKM_CACHE.albums.length && now - MIRKM_CACHE.t < MIRKM_TTL) return MIRKM_CACHE.albums;

        var url = MIRKM_BASE + "/en/songs";
        var body = "";
        var data = null;
        // L'origine renvoie parfois un 522 passager : trois essais suffisent.
        for (var attempt = 0; attempt < 3 && !data; attempt++) {
            var res = await this.client.get(url, this.getHeaders(url));
            body = res && res.body ? String(res.body) : "";
            data = this._extractAllSongs(body);
        }
        if (!data) {
            if (MIRKM_CACHE.albums.length) return MIRKM_CACHE.albums;
            throw new Error("catalogue indisponible sur miraculous.now");
        }

        var cards = this._extractCards(body);
        var albums = [];
        var seen = {};
        var self = this;

        function add(key, card, raw) {
            if (seen[key]) return;
            seen[key] = true;
            albums.push({
                key: key,
                title: (card && card.title) || (raw && raw.album) || key,
                author: (card && card.author) || (raw && raw.author) || "",
                year: (card && card.year) || (raw && raw.year) || "",
                cover: (card && card.cover) || (MIRKM_CDN + "/" + key + "/cover.webp"),
                type: self._albumType(key),
                languages: (raw && raw.languages) || [],
                songs: (raw && raw.songs) || []
            });
        }

        for (var i = 0; i < cards.length; i++) add(cards[i].key, cards[i], data[cards[i].key]);
        for (var key in data) add(key, null, data[key]);

        MIRKM_CACHE = { t: now, albums: albums };
        return albums;
    }

    _albumItem(album) {
        var name = album.title;
        if (album.author) name += " — " + album.author;
        if (album.year) name += " (" + album.year + ")";
        var count = album.songs.length;
        return {
            name: name,
            imageUrl: album.cover,
            link: MIRKM_BASE + "/en/songs?album=" + encodeURIComponent(album.key),
            description: count + " titre" + (count > 1 ? "s" : "") +
                (album.year ? " · " + album.year : "") +
                (album.languages.length ? " · " + album.languages.length + " langues" : "")
        };
    }

    _slice(list, page, size) {
        var p = Math.max(1, Number(page) || 1);
        var start = (p - 1) * size;
        return { list: list.slice(start, start + size), hasNextPage: list.length > start + size };
    }

    // ── listes ────────────────────────────────────────────────
    async getPopular(page) {
        var albums = await this._catalogue();
        var self = this;
        return this._slice(albums.map(function (album) { return self._albumItem(album); }), page, 24);
    }

    async getLatestUpdates(page) {
        return this.getPopular(page);
    }

    async getCustomList(listId, page) {
        var id = String(listId || "all");
        var albums = await this._catalogue();
        var self = this;
        var wanted = albums;
        if (id !== "all" && id !== "latest") {
            wanted = albums.filter(function (album) { return album.type === id; });
        }
        return this._slice(wanted.map(function (album) { return self._albumItem(album); }), page, 24);
    }

    // ── recherche ─────────────────────────────────────────────
    _normalize(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    _filterValue(filterList, name) {
        if (!filterList) return "";
        for (var i = 0; i < filterList.length; i++) {
            var filter = filterList[i];
            if (filter && filter.name === name) return String(filter.value || "");
        }
        return "";
    }

    _songTitle(name) {
        if (typeof name === "string") return name;
        if (name && typeof name === "object") {
            var lang = this.getLang();
            if (name[lang]) return String(name[lang]);
            if (name.en) return String(name.en);
            if (name.fr) return String(name.fr);
            for (var key in name) {
                if (name[key]) return String(name[key]);
            }
        }
        return "";
    }

    async search(query, page, filters) {
        var needle = this._normalize(String(query || "").trim());
        if (!needle) return { list: [], hasNextPage: false };
        var type = this._filterValue(filters, "Collection");
        var albums = await this._catalogue();
        var self = this;

        var matches = albums.filter(function (album) {
            if (type && album.type !== type) return false;
            var haystack = self._normalize(album.title + " " + album.author + " " + album.year + " " + album.key);
            if (haystack.indexOf(needle) !== -1) return true;
            for (var i = 0; i < album.songs.length; i++) {
                if (self._normalize(self._songTitle(album.songs[i].name)).indexOf(needle) !== -1) return true;
            }
            return false;
        });

        return this._slice(matches.map(function (album) { return self._albumItem(album); }), page, 24);
    }

    // ── fiche album ───────────────────────────────────────────
    _pickLang(languages) {
        var wanted = [this.getLang(), "fr", "en"];
        for (var i = 0; i < wanted.length; i++) {
            if (languages.indexOf(wanted[i]) !== -1) return wanted[i];
        }
        return languages.length ? languages[0] : "en";
    }

    // Certaines langues annoncées n'ont pas de fichier pour toutes les pistes :
    // on vérifie la langue retenue sur une piste représentative.
    async _resolveLang(album) {
        var preferred = this._pickLang(album.languages);
        var probe = "";
        for (var i = 0; i < album.songs.length; i++) {
            var src = String(album.songs[i].src || "");
            if (/\/lang\.(m4a|flac|mp3|ogg)$/i.test(src)) {
                probe = src;
                break;
            }
        }
        if (!probe) return preferred;

        var candidates = [preferred, "fr", "en", "es", "pt-br", "de", "it"];
        var tried = {};
        for (var c = 0; c < candidates.length; c++) {
            var lang = candidates[c];
            if (tried[lang]) continue;
            tried[lang] = true;
            if (album.languages.indexOf(lang) === -1) continue;
            try {
                var res = await this.client.head(this._audioUrl(album, probe, lang), this.getHeaders(MIRKM_BASE));
                if (res && Number(res.statusCode) === 200) return lang;
            } catch (e) {}
        }
        return preferred;
    }

    // Les albums multilingues stockent `…/lang.m4a` : le fichier réel porte le
    // code de la langue choisie (`…/fr.m4a`).
    _audioUrl(album, src, lang) {
        var path = String(src || "");
        if (!path) return "";
        if (album.languages.length) {
            var code = lang || this._pickLang(album.languages);
            path = path.replace(/(^|\/)lang\.(m4a|flac|mp3|ogg)$/i, "$1" + code + ".$2");
        }
        var parts = path.split("/");
        for (var i = 0; i < parts.length; i++) {
            parts[i] = encodeURIComponent(parts[i]);
        }
        return MIRKM_CDN + "/" + encodeURIComponent(album.key) + "/" + parts.join("/");
    }

    async getDetail(url) {
        var link = String(url || "");
        var keyM = link.match(/[?&]album=([^&#\s]+)/);
        var key = keyM ? decodeURIComponent(keyM[1]) : "";

        var album = null;
        try {
            var albums = await this._catalogue();
            for (var i = 0; i < albums.length; i++) {
                if (albums[i].key === key) {
                    album = albums[i];
                    break;
                }
            }
        } catch (e) {
            album = null;
        }

        if (!album) {
            return {
                name: key || "Miraculum Music",
                link: link,
                imageUrl: key ? (MIRKM_CDN + "/" + key + "/cover.webp") : "",
                description: "Album introuvable sur miraculous.now. Réessaie dans un instant.",
                chapters: []
            };
        }

        var audioLang = album.languages.length ? await this._resolveLang(album) : "";
        var chapters = [];
        for (var s = 0; s < album.songs.length; s++) {
            var song = album.songs[s] || {};
            var audio = this._audioUrl(album, song.src, audioLang);
            if (!audio) continue;
            var title = this._songTitle(song.name);
            if (!title) title = "Piste " + (chapters.length + 1);
            chapters.push({
                name: title,
                url: audio,
                dateUpload: "",
                thumbnailUrl: album.cover,
                description: song.time ? String(song.time) : album.title
            });
        }

        var meta = [];
        if (album.author) meta.push(album.author);
        if (album.year) meta.push(album.year);
        if (album.languages.length) {
            meta.push((MIRKM_LANG_NAMES[audioLang] || String(audioLang).toUpperCase()) +
                " · " + album.languages.length + " langues");
        }

        return {
            name: album.title,
            link: link,
            imageUrl: album.cover,
            description: (meta.length ? meta.join(" · ") + "\n" : "") +
                chapters.length + " titre" + (chapters.length > 1 ? "s" : "") + " — miraculous.now",
            chapters: chapters
        };
    }

    // ── lecture ───────────────────────────────────────────────
    async getVideoList(url) {
        var link = String(url || "");
        if (!link) return [];
        if (/\.(m4a|flac|mp3|ogg|opus|aac|wav)(\?|$)/i.test(link)) {
            return [{ quality: "Audio", url: link, originalUrl: link, headers: this.getHeaders(link) }];
        }
        return [{ quality: "WebView", url: link, originalUrl: link }];
    }

    // ── filtres ───────────────────────────────────────────────
    getFilterList() {
        function option(name, value) { return { type_name: "SelectOption", name: name, value: value }; }
        return [{
            type_name: "SelectFilter",
            name: "Collection",
            state: 0,
            values: [
                option("Tous les albums", ""),
                option("Séries", "series"),
                option("Films", "movies"),
                option("Jeux", "games"),
                option("Intros & thèmes", "intros"),
                option("Spéciaux", "specials")
            ]
        }];
    }

    // ── préférences ───────────────────────────────────────────
    getSourcePreferences() {
        return [
            {
                key: "mirkm_lang",
                listPreference: {
                    title: "Langue des chansons",
                    summary: "Langue choisie pour les albums multilingues (intro, film, générique)",
                    valueIndex: 2,
                    entries: [
                        "العربية", "Deutsch", "English", "Español",
                        "Español (LatAm)", "Français", "Italiano",
                        "한국어", "日本語", "Polski", "Português",
                        "Português (Brasil)", "Русский", "Türkçe",
                        "普通話", "हिन्दी", "Tiếng Việt", "Bahasa Indonesia",
                        "Nederlands", "Svenska", "Čeština", "Română",
                        "Magyar", "Українська", "Instrumental"
                    ],
                    entryValues: [
                        "ar", "de", "en", "es",
                        "es-419", "fr", "it",
                        "ko", "ja", "pl", "pt",
                        "pt-br", "ru", "tr",
                        "zh-cmn", "hi", "vi", "id",
                        "nl", "sv", "cs", "ro",
                        "hu", "uk", "inst"
                    ]
                }
            }
        ];
    }
}
