// ══════════════════════════════════════════════════════════════
//  MLP France — mlp-france.com
//  Toute la franchise My Little Pony : FiM S1–S9, Pony Life,
//  films, Equestria Girls, G5, OVA / bonus, rétro G1–G3,
//  cartoons (Star VS, Luz à Osville, Littlest Pet Shop).
//  MP4 direct (720p / 480p / 360p) · VF + VOSTFR
// ══════════════════════════════════════════════════════════════

const watchtowerSources = [{
    "name": "MLP France",
    "lang": "fr",
    "baseUrl": "https://mlp-france.com",
    "iconUrl": "https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/assets/icons/watch-841627593.png",
    "typeSource": "single",
    "isManga": false,
    "itemType": 1,
    "version": "2.0.1",
    "login": false,
    "forYou": false,
    "dateFormat": "",
    "dateFormatLocale": "",
    "isNsfw": false,
    "hasCloudflare": false,
    "pkgPath": "watch/fr/mlpfrance.js",
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "hasSubtitles": false,
    "hasDub": true,
    "notes": "My Little Pony en VF et VOSTFR — FiM S1–S9, Pony Life, films (2017, Nouvelle Génération), Equestria Girls, G5, OVA et bonus, rétro G1–G3, plus Star VS, Luz à Osville et Littlest Pet Shop. MP4 720p/480p/360p."
}];

var MLP_BASE = "https://mlp-france.com";
var MLP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var MLP_HTTP_TIMEOUT = 15;
var MLP_CACHE_TTL = 600000;
var MLP_MAX_SIBLING_LANGUAGES = 4;

var MLP_CLIENT = null;
function mlpClient() {
    if (!MLP_CLIENT) MLP_CLIENT = new Client({ timeout: MLP_HTTP_TIMEOUT, connectTimeout: 6 });
    return MLP_CLIENT;
}

var MLP_CACHE = {};
// Libellé exact affiché par le site pour chaque page de lecture (VF, VOSTFR, VO…).
var MLP_LANG_BY_URL = {};

// Le site est un archive PHP statique : chaque « série » est une page qui
// liste ses épisodes. Le catalogue est donc déclaré ici, une entrée par page,
// dans l'ordre éditorial du site.
var MLP_SHOWS = [
    // ── Films ────────────────────────────────────────────────────────────────
    { id: "mlpnewgen", group: "films", kind: "film", name: "MLP: Nouvelle Génération (2021)", path: "/mlpg5/mlpnewgen.php", image: "/source/banmlpnewgen.png", keywords: "g5 film 2021 new generation nouvelle generation" },
    { id: "mlp2017", group: "films", kind: "film", name: "MLP: Le Film (2017)", path: "/films/mlp2017.php", image: "/source/banmlp2017.png", keywords: "film 2017 movie le film" },
    { id: "eqgfilm", group: "films", kind: "film", name: "EqG — Equestria Girls (2013)", path: "/films/eqg.php", image: "/source/baneqg.png", keywords: "equestria girls film 2013" },
    { id: "rbr", group: "films", kind: "film", name: "EqG — Rainbow Rocks (2014)", path: "/films/rbr.php", image: "/source/banrbr.png", keywords: "equestria girls rainbow rocks film 2014" },
    { id: "fsg", group: "films", kind: "film", name: "EqG — Friendship Games (2015)", path: "/films/fsg.php", image: "/source/banfsg.png", keywords: "equestria girls friendship games film 2015" },
    { id: "loe", group: "films", kind: "film", name: "EqG — Legend of Everfree (2016)", path: "/films/loe.php", image: "/source/banloe.png", keywords: "equestria girls legend everfree film 2016" },

    // ── Friendship is Magic ──────────────────────────────────────────────────
    { id: "saison1", group: "fim", kind: "serie", name: "MLP FiM — Saison 1", path: "/episodes/saison1.php", image: "/source/bansaison1.png", keywords: "fim friendship is magic saison 1 s1" },
    { id: "saison2", group: "fim", kind: "serie", name: "MLP FiM — Saison 2", path: "/episodes/saison2.php", image: "/source/bansaison2.png", keywords: "fim friendship is magic saison 2 s2" },
    { id: "saison3", group: "fim", kind: "serie", name: "MLP FiM — Saison 3", path: "/episodes/saison3.php", image: "/source/bansaison3.png", keywords: "fim friendship is magic saison 3 s3" },
    { id: "saison4", group: "fim", kind: "serie", name: "MLP FiM — Saison 4", path: "/episodes/saison4.php", image: "/source/bansaison4.png", keywords: "fim friendship is magic saison 4 s4" },
    { id: "saison5", group: "fim", kind: "serie", name: "MLP FiM — Saison 5", path: "/episodes/saison5.php", image: "/source/bansaison5.png", keywords: "fim friendship is magic saison 5 s5" },
    { id: "saison6", group: "fim", kind: "serie", name: "MLP FiM — Saison 6", path: "/episodes/saison6.php", image: "/source/bansaison6.png", keywords: "fim friendship is magic saison 6 s6" },
    { id: "saison7", group: "fim", kind: "serie", name: "MLP FiM — Saison 7", path: "/episodes/saison7.php", image: "/source/bansaison7.png", keywords: "fim friendship is magic saison 7 s7" },
    { id: "saison8", group: "fim", kind: "serie", name: "MLP FiM — Saison 8", path: "/episodes/saison8.php", image: "/source/bansaison8.png", keywords: "fim friendship is magic saison 8 s8" },
    { id: "saison9", group: "fim", kind: "serie", name: "MLP FiM — Saison 9", path: "/episodes/saison9.php", image: "/source/bansaison9.png", keywords: "fim friendship is magic saison 9 s9" },
    { id: "ponylife", group: "fim", kind: "serie", name: "Pony Life — S1 + S2", path: "/episodes/ponylife.php", image: "/source/banponylife.png", keywords: "pony life saison 1 2" },

    // ── Génération 5 ─────────────────────────────────────────────────────────
    { id: "mym", group: "g5", kind: "serie", name: "G5 — Make Your Mark", path: "/mlpg5/mym.php", image: "/source/banmlpmym.png", keywords: "g5 make your mark mym" },
    { id: "tlts1", group: "g5", kind: "serie", name: "G5 — Tell Your Tale S1", path: "/mlpg5/tlts1.php", image: "/source/banmlptlt.png", keywords: "g5 tell your tale tlt saison 1" },
    { id: "tlts2", group: "g5", kind: "serie", name: "G5 — Tell Your Tale S2", path: "/mlpg5/tlts2.php", image: "/source/banmlptlt.png", keywords: "g5 tell your tale tlt saison 2" },
    { id: "tlts3", group: "g5", kind: "serie", name: "G5 — Tell Your Tale S3", path: "/mlpg5/tlts3.php", image: "/source/banmlptlt.png", keywords: "g5 tell your tale tlt saison 3" },

    // ── Equestria Girls ──────────────────────────────────────────────────────
    { id: "egs", group: "eqg", kind: "serie", name: "EqG — Spéciaux", path: "/episodes/egs.php", image: "/source/banegs.png", keywords: "equestria girls specials speciaux" },
    { id: "egms", group: "eqg", kind: "serie", name: "EqG — Mini-Séries S1", path: "/episodes/egms.php", image: "/source/banegms.png", keywords: "equestria girls mini series saison 1" },
    { id: "egms2", group: "eqg", kind: "serie", name: "EqG — Mini-Séries S2", path: "/episodes/egms2.php", image: "/source/banegms2.png", keywords: "equestria girls mini series saison 2" },

    // ── OVA, spéciaux et bonus ───────────────────────────────────────────────
    { id: "specials", group: "ova", kind: "serie", name: "FiM — Spéciaux", path: "/episodes/specials.php", image: "/source/banspecials.png", keywords: "fim specials speciaux ova best gift ever" },
    { id: "bonus", group: "ova", kind: "serie", name: "FiM — Bonus officiels", path: "/extras/bonus.php", image: "/source/banbonus.png", keywords: "fim bonus officiels ova extra" },
    { id: "mashup", group: "ova", kind: "serie", name: "FiM — Mashup Films", path: "/extras/mashup.php", image: "/source/banextra.png", keywords: "fim mashup films extra ova" },

    // ── Rétro ────────────────────────────────────────────────────────────────
    { id: "g1", group: "retro", kind: "serie", name: "Rétro — Mon Petit Poney (1983)", path: "/retro/g1.php", image: "/source/retroban.png", keywords: "retro g1 mon petit poney 1983" },
    { id: "g2", group: "retro", kind: "serie", name: "Rétro — My Little Pony Tales", path: "/retro/g2.php", image: "/source/retroban.png", keywords: "retro g2 tales" },
    { id: "g3", group: "retro", kind: "serie", name: "Rétro — My Little Pony G3", path: "/retro/g3.php", image: "/source/retroban.png", keywords: "retro g3" },

    // ── Cartoons ─────────────────────────────────────────────────────────────
    { id: "star1", group: "cartoons", kind: "serie", name: "Star VS — Saison 1", path: "/star/saison1.php", image: "/source/starban.png", keywords: "star vs forces of evil butterfly saison 1" },
    { id: "star2", group: "cartoons", kind: "serie", name: "Star VS — Saison 2", path: "/star/saison2.php", image: "/source/starban.png", keywords: "star vs forces of evil butterfly saison 2" },
    { id: "star3", group: "cartoons", kind: "serie", name: "Star VS — Saison 3", path: "/star/saison3.php", image: "/source/starban.png", keywords: "star vs forces of evil butterfly saison 3" },
    { id: "star4", group: "cartoons", kind: "serie", name: "Star VS — Saison 4", path: "/star/saison4.php", image: "/source/starban.png", keywords: "star vs forces of evil butterfly saison 4" },
    { id: "luz1", group: "cartoons", kind: "serie", name: "Luz à Osville — Saison 1", path: "/luz/saison1.php", image: "/source/luzban.png", keywords: "luz osville owl house saison 1" },
    { id: "luz2", group: "cartoons", kind: "serie", name: "Luz à Osville — Saison 2", path: "/luz/saison2.php", image: "/source/luzban.png", keywords: "luz osville owl house saison 2" },
    { id: "luz3", group: "cartoons", kind: "serie", name: "Luz à Osville — Saison 3", path: "/luz/saison3.php", image: "/source/luzban.png", keywords: "luz osville owl house saison 3" },
    { id: "luzx", group: "cartoons", kind: "serie", name: "Luz à Osville — Extras", path: "/luz/extras.php", image: "/source/luzban.png", keywords: "luz osville owl house extras" },
    { id: "lps1", group: "cartoons", kind: "serie", name: "Littlest Pet Shop — Saison 1", path: "/lps/saison1.php", image: "/source/lpsban.png", keywords: "littlest pet shop lps saison 1" },
    { id: "lps2", group: "cartoons", kind: "serie", name: "Littlest Pet Shop — Saison 2", path: "/lps/saison2.php", image: "/source/lpsban.png", keywords: "littlest pet shop lps saison 2" },
    { id: "lps3", group: "cartoons", kind: "serie", name: "Littlest Pet Shop — Saison 3", path: "/lps/saison3.php", image: "/source/lpsban.png", keywords: "littlest pet shop lps saison 3" },
    { id: "lps4", group: "cartoons", kind: "serie", name: "Littlest Pet Shop — Saison 4", path: "/lps/saison4.php", image: "/source/lpsban.png", keywords: "littlest pet shop lps saison 4" }
];

// Ordre du rail « Nouveautés » : les sorties que le site met en avant.
var MLP_NEWEST = ["mlpnewgen", "tlts3", "mym", "saison9", "specials", "loe", "luz3", "lps4", "star4", "ponylife", "tlts2", "saison8"];

var MLP_GROUPS = [
    { id: "films", title: "Films" },
    { id: "fim", title: "Friendship is Magic" },
    { id: "g5", title: "Génération 5" },
    { id: "eqg", title: "Equestria Girls" },
    { id: "ova", title: "OVA, spéciaux & bonus" },
    { id: "retro", title: "Rétro" },
    { id: "cartoons", title: "Cartoons" }
];

var MLP_LANG_CODES = {
    EN: "English", FR: "Français", QB: "Français (Québec)", ES: "Español",
    MX: "Latino", BR: "Português (BR)", PT: "Português", IT: "Italiano",
    NL: "Nederlands", DE: "Deutsch", PL: "Polski", HU: "Magyar", DK: "Dansk",
    NO: "Norsk", SE: "Svenska", FI: "Suomi", RU: "Русский", AR: "العربية",
    TR: "Türkçe", CZ: "Čeština", GR: "Ελληνικά", JP: "日本語", KR: "한국어",
    CN: "中文", IL: "עברית", ID: "Bahasa Indonesia", VN: "Tiếng Việt"
};

var MLP_SHOW_BY_PATH = {};
var MLP_SHOW_BY_ID = {};
MLP_SHOWS.forEach(function (show) {
    MLP_SHOW_BY_PATH[show.path] = show;
    MLP_SHOW_BY_ID[show.id] = show;
});

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = mlpClient();
    }

    // ── préférences ────────────────────────────────────────────
    getSourcePreferences() {
        return [{
            key: "mlp_lang",
            listPreference: {
                title: "Langue de lecture",
                summary: "Version ouverte par défaut quand un épisode existe en VF et en VOSTFR",
                valueIndex: 0,
                entries: ["VF (français)", "VOSTFR (version originale)"],
                entryValues: ["vf", "vo"]
            }
        }];
    }

    getPreferredLang() {
        var value = String(this.getPreference("mlp_lang") || "vf").toLowerCase();
        return value === "vo" ? "vo" : "vf";
    }

    // ── http ───────────────────────────────────────────────────
    getHeaders(url) {
        return {
            "User-Agent": MLP_UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.6",
            "Referer": url || (MLP_BASE + "/")
        };
    }

    async _get(url) {
        var cached = MLP_CACHE[url];
        if (cached && Date.now() - cached.t < MLP_CACHE_TTL) return cached;

        var lastError = null;
        for (var attempt = 0; attempt < 2; attempt++) {
            try {
                var res = await this.client.get(url, this.getHeaders(url));
                var status = res && res.statusCode ? Number(res.statusCode) : 0;
                var body = res && res.body ? String(res.body) : "";
                if (status >= 400 || !body) {
                    lastError = new Error("HTTP " + status);
                } else {
                    var entry = { t: Date.now(), body: body, statusCode: status };
                    MLP_CACHE[url] = entry;
                    return entry;
                }
            } catch (e) {
                lastError = e;
            }
            if (attempt === 0) await new Promise(function (resolve) { setTimeout(resolve, 250); });
        }
        if (lastError) throw lastError;
        return null;
    }

    // ── helpers ────────────────────────────────────────────────
    _abs(href, base) {
        if (!href) return "";
        var clean = String(href).replace(/&amp;/g, "&").trim();
        if (/^(https?:)?\/\//i.test(clean)) return clean.replace(/^\/\//, "https://");
        if (clean.charAt(0) === "/") return MLP_BASE + clean;
        var dir = String(base || MLP_BASE + "/").replace(/\/[^/]*$/, "");
        var parts = dir.split("/");
        clean.split("/").forEach(function (part) {
            if (part === "..") parts.pop();
            else if (part !== "." && part !== "") parts.push(part);
        });
        return parts.join("/");
    }

    _decode(html) {
        return String(html || "")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&#0?39;|&apos;/g, "'")
            .replace(/&quot;/g, "\"")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&eacute;/gi, "é").replace(/&egrave;/gi, "è").replace(/&agrave;/gi, "à")
            .replace(/&ecirc;/gi, "ê").replace(/&ccedil;/gi, "ç").replace(/&ocirc;/gi, "ô")
            .replace(/&ugrave;/gi, "ù").replace(/&rsquo;|&#8217;/g, "'");
    }

    _clean(html) {
        if (!html) return "";
        return this._decode(String(html).replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, " "))
            .replace(/\s+/g, " ")
            .trim();
    }

    _titleCase(value) {
        var text = String(value || "").replace(/[_-]+/g, " ").trim();
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    _item(show) {
        var group = "";
        for (var i = 0; i < MLP_GROUPS.length; i++) {
            if (MLP_GROUPS[i].id === show.group) group = MLP_GROUPS[i].title;
        }
        return {
            name: show.name,
            link: MLP_BASE + show.path,
            imageUrl: MLP_BASE + show.image,
            description: group + " · " + (show.kind === "film" ? "Film" : "Série") + " — VF et VOSTFR"
        };
    }

    _slice(list, page, size) {
        var p = Math.max(1, Number(page) || 1);
        var start = (p - 1) * size;
        return {
            list: list.slice(start, start + size),
            hasNextPage: list.length > start + size
        };
    }

    _showByPath(url) {
        var path = String(url || "").replace(/^https?:\/\/[^/]+/i, "").split(/[?#]/)[0];
        return MLP_SHOW_BY_PATH[path] || null;
    }

    _showsOfGroup(group) {
        return MLP_SHOWS.filter(function (show) { return show.group === group; });
    }

    // ── catalogue ──────────────────────────────────────────────
    async getPopular(page) {
        var self = this;
        return this._slice(MLP_SHOWS.map(function (show) { return self._item(show); }), page, 24);
    }

    async getLatestUpdates(page) {
        var self = this;
        var ordered = [];
        var seen = {};
        MLP_NEWEST.forEach(function (id) {
            var show = MLP_SHOW_BY_ID[id];
            if (show && !seen[id]) {
                seen[id] = true;
                ordered.push(show);
            }
        });
        MLP_SHOWS.forEach(function (show) {
            if (!seen[show.id]) {
                seen[show.id] = true;
                ordered.push(show);
            }
        });
        return this._slice(ordered.map(function (show) { return self._item(show); }), page, 24);
    }

    async getCustomList(listId, page) {
        var self = this;
        var id = String(listId || "all");
        var shows = MLP_SHOWS;

        if (id === "seasons") {
            shows = MLP_SHOWS.filter(function (show) {
                return show.group === "fim" && show.id !== "ponylife";
            });
        } else if (id === "latest") {
            return this.getLatestUpdates(page);
        } else if (this._showsOfGroup(id).length) {
            shows = this._showsOfGroup(id);
        } else if (MLP_SHOW_BY_ID[id]) {
            shows = [MLP_SHOW_BY_ID[id]];
        }
        return this._slice(shows.map(function (show) { return self._item(show); }), page, 24);
    }

    // ── recherche ──────────────────────────────────────────────
    _filterValue(filterList, name) {
        if (!filterList) return "";
        for (var i = 0; i < filterList.length; i++) {
            var filter = filterList[i];
            if (filter && filter.name === name) return String(filter.value || "");
        }
        return "";
    }

    async search(query, page, filterList) {
        var needle = String(query || "").trim().toLowerCase();
        var group = this._filterValue(filterList, "Collection");
        if (!needle) return { list: [], hasNextPage: false };

        var self = this;
        var matches = MLP_SHOWS.filter(function (show) {
            if (group && show.group !== group) return false;
            var haystack = (show.name + " " + show.keywords + " " + show.group).toLowerCase();
            return haystack.indexOf(needle) !== -1;
        });

        // Un second passage tolère les accents (« osville » → « Luz à Osville »).
        if (!matches.length) {
            var plain = needle.normalize ? needle.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : needle;
            matches = MLP_SHOWS.filter(function (show) {
                if (group && show.group !== group) return false;
                var haystack = (show.name + " " + show.keywords).toLowerCase();
                if (haystack.normalize) haystack = haystack.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                return haystack.indexOf(plain) !== -1;
            });
        }
        return this._slice(matches.map(function (show) { return self._item(show); }), page, 24);
    }

    getFilterList() {
        function option(name, value) { return { type_name: "SelectOption", name: name, value: value }; }
        return [{
            type_name: "SelectFilter",
            name: "Collection",
            state: 0,
            values: [
                option("Toute la collection", ""),
                option("Films", "films"),
                option("Séries", "fim"),
                option("Génération 5", "g5"),
                option("Equestria Girls", "eqg"),
                option("OVA", "ova"),
                option("Rétro", "retro"),
                option("Cartoons", "cartoons")
            ]
        }];
    }

    // ── fiche ──────────────────────────────────────────────────
    // Les blocs `<li class="listN">` portent l'épisode ; les liens
    // `class="link"` portent les langues (VF / VOSTFR, ou EN / FR / ES… pour
    // les films). Les liens boutique et téléchargement sont écartés.
    _playLinks(block, pageUrl) {
        var out = [];
        var seen = {};
        var re = /<a[^>]+href="([^"]+)"[^>]*class="link"[^>]*>([\s\S]{1,80}?)<\/a>/gi;
        var m;
        while ((m = re.exec(block)) !== null) {
            var href = String(m[1] || "").trim();
            var label = this._clean(m[2]);
            if (!href || /^(mailto:|javascript:|#)/i.test(href)) continue;
            if (/^https?:\/\//i.test(href)) continue;
            if (/\.(zip|rar|7z|mkv|torrent)$/i.test(href)) continue;
            if (/t[ée]l[ée]charger|download|amazon|fnac|priceminister|page de t[ée]l[ée]chargements|contact/i.test(label)) continue;
            var url = this._abs(href, pageUrl);
            if (seen[url]) continue;
            seen[url] = true;
            out.push({ url: url, label: label || "Lecture" });
        }
        return out;
    }

    _seasonMarks(html) {
        var marks = [];
        var re = /<span[^>]*class="large"[^>]*>[\s\S]{0,120}?<b>([^<]+)<\/b>/gi;
        var m;
        while ((m = re.exec(html)) !== null) {
            var label = this._clean(m[1]);
            if (!/saison|season|partie|part/i.test(label)) continue;
            marks.push({ pos: m.index, label: label.replace(/^saison\s*/i, "S").replace(/\s+/g, " ") });
        }
        return marks;
    }

    _seasonAt(marks, pos) {
        var label = "";
        for (var i = 0; i < marks.length; i++) {
            if (marks[i].pos <= pos) label = marks[i].label;
            else break;
        }
        return label;
    }

    _isLanguageLabel(text) {
        var value = String(text || "").replace(/\s+/g, " ").trim();
        if (!value) return false;
        if (/t[ée]l[ée]charger|download|page de/i.test(value)) return true;
        if (/^(VOSTFR|VOSTF|VF|VO|VQ)$/i.test(value)) return true;
        var lower = value.toLowerCase();
        if (lower.indexOf("fran") === 0 || lower === "english" || lower === "latino" || lower === "brasileiro") return true;
        var keys = Object.keys(MLP_LANG_CODES);
        for (var i = 0; i < keys.length; i++) {
            if (MLP_LANG_CODES[keys[i]].toLowerCase() === lower) return true;
        }
        return false;
    }

    // « Episode 1 / Friendship is Magic » et « Episode 01 / The Royal Wedding »
    // n'ordonnent pas leurs lignes de la même façon : on garde l'ordre du document.
    // Le titre est parfois le libellé du lien (G2), parfois une ligne à part.
    _chapterTitle(block) {
        var self = this;
        var text = String(block)
            .replace(/<img[^>]*>/gi, " ")
            .replace(/<a[^>]*class="link"[^>]*>([\s\S]*?)<\/a>/gi, function (match, inner) {
                return self._isLanguageLabel(inner) ? " " : " " + inner + " ";
            })
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<[^>]*>/g, " ");
        var lines = this._decode(text).split("\n");
        var parts = [];
        for (var i = 0; i < lines.length; i++) {
            var part = lines[i].replace(/\s+/g, " ").trim();
            if (!part) continue;
            if (/^(VOSTFR|VOSTF|VF|VO)$/i.test(part)) continue;
            if (parts.length && parts[parts.length - 1].toLowerCase() === part.toLowerCase()) continue;
            parts.push(part);
        }
        return parts.join(" — ");
    }

    _chapters(html, pageUrl) {
        var show = this._showByPath(pageUrl);
        var marks = this._seasonMarks(html);
        var chapters = [];
        var filmLinks = [];
        var seen = {};
        // Certaines pages (Tell Your Tale S3) n'émettent pas de </li> : on borne
        // chaque bloc sur le <li> suivant ou sur la fin de la liste.
        var re = /<li class="list\d+">([\s\S]{1,8000}?)(?=<li class="list\d+">|<\/ul>|$)/gi;
        var m;

        while ((m = re.exec(html)) !== null) {
            var block = m[1];
            var links = this._playLinks(block, pageUrl);
            if (!links.length) continue;

            if (show && show.kind === "film") {
                for (var i = 0; i < links.length; i++) {
                    if (seen[links[i].url]) continue;
                    seen[links[i].url] = true;
                    filmLinks.push(links[i]);
                }
                continue;
            }

            var imgM = block.match(/<img[^>]+src="([^"]+)"/i);
            var image = imgM ? this._abs(imgM[1], pageUrl) : "";
            var preferred = links[0];
            for (var j = 0; j < links.length; j++) {
                if (this.getPreferredLang() === "vf" && /vf\.php|FR\b/i.test(links[j].url)) {
                    preferred = links[j];
                    break;
                }
                if (this.getPreferredLang() === "vo" && /vo\.php|EN\b/i.test(links[j].url)) {
                    preferred = links[j];
                    break;
                }
            }
            if (seen[preferred.url]) continue;
            seen[preferred.url] = true;

            var self = this;
            links.forEach(function (link) {
                if (link.label) MLP_LANG_BY_URL[link.url] = link.label;
            });

            var title = this._chapterTitle(block);
            if (!title) title = "Épisode " + (chapters.length + 1);
            var season = marks.length > 1 ? this._seasonAt(marks, m.index) : "";
            var languages = links.map(function (link) { return link.label; }).join(" · ");

            chapters.push({
                name: season ? season + " · " + title : title,
                url: preferred.url,
                dateUpload: "",
                thumbnailUrl: image,
                description: languages
            });
        }

        if (filmLinks.length && show) {
            // Une page de film liste ses doublages, parfois aussi des courts
            // métrages (Rainbow Rocks) : on sépare les deux.
            var counts = {};
            var mainPath = "";
            var mainCount = 0;
            for (var c = 0; c < filmLinks.length; c++) {
                var path = filmLinks[c].url.split("?")[0];
                counts[path] = (counts[path] || 0) + 1;
                if (counts[path] > mainCount) {
                    mainCount = counts[path];
                    mainPath = path;
                }
            }
            function rank(link) {
                var isMain = link.url.split("?")[0] === mainPath ? 0 : 1;
                var isFrench = /fran|FR\b|QB\b/i.test(link.label) ? 0 : 1;
                return isMain * 2 + isFrench;
            }
            filmLinks.sort(function (a, b) { return rank(a) - rank(b); });
            for (var f = 0; f < filmLinks.length; f++) {
                if (filmLinks[f].label) MLP_LANG_BY_URL[filmLinks[f].url] = filmLinks[f].label;
                var isMain = filmLinks[f].url.split("?")[0] === mainPath;
                var name = show.name + " — " + filmLinks[f].label;
                var kind = "Film";
                if (!isMain) {
                    var stem = this._titleCase(filmLinks[f].url.split("?")[0].replace(/^.*\//, "").replace(/\.php$/i, ""));
                    var ep = (filmLinks[f].url.match(/[?&]ep=([A-Za-z0-9]+)/) || [])[1] || "";
                    name = show.name + " · " + stem + (ep ? " (" + ep + ")" : "") + " — " + filmLinks[f].label;
                    kind = "Bonus";
                }
                chapters.push({
                    name: name,
                    url: filmLinks[f].url,
                    dateUpload: "",
                    thumbnailUrl: MLP_BASE + show.image,
                    description: kind + " · " + filmLinks[f].label
                });
            }
        }
        return chapters;
    }

    async getDetail(url) {
        var link = String(url || "");
        var show = this._showByPath(link);
        var page = null;
        try {
            page = await this._get(link);
        } catch (e) {
            page = null;
        }
        if (!page) {
            return {
                name: show ? show.name : "MLP France",
                link: link,
                imageUrl: show ? MLP_BASE + show.image : "",
                description: "Le site MLP France n'a pas répondu. Réessaie dans un instant.",
                chapters: []
            };
        }

        var html = page.body;
        var chapters = this._chapters(html, link);
        var titleM = html.match(/<title>([^<]+)<\/title>/i);
        var siteTitle = titleM ? this._clean(titleM[1]).replace(/^MLP France\s*-\s*/i, "") : "";
        var group = "";
        if (show) {
            for (var i = 0; i < MLP_GROUPS.length; i++) {
                if (MLP_GROUPS[i].id === show.group) group = MLP_GROUPS[i].title;
            }
        }

        return {
            name: show ? show.name : (siteTitle || "MLP France"),
            link: link,
            imageUrl: show ? MLP_BASE + show.image : "",
            description: (siteTitle || "") +
                (group ? "\n" + group : "") +
                (chapters.length ? "\n" + chapters.length + " vidéo(s) — VF et VOSTFR" : "\nAucune vidéo publiée sur cette page."),
            chapters: chapters
        };
    }

    // ── lecteur ────────────────────────────────────────────────
    _languageOf(url) {
        var link = String(url || "");
        var known = MLP_LANG_BY_URL[link];
        if (known) {
            var upper = known.toUpperCase();
            if (upper === "VOSTFR" || upper === "VOSTF") return "VOSTFR";
            if (upper === "VF" || upper === "VO") return upper;
            return known;
        }
        var file = link.split("?")[0].replace(/^.*\//, "").toLowerCase();
        if (/vf\.php$/.test(file)) return "VF";
        // `vo.php` est étiqueté VOSTFR par le site ; `bfhhsvo.php` & co sont des VO.
        if (file === "vo.php") return "VOSTFR";
        if (/vo\.php$/.test(file)) return "VO";
        var code = (link.match(/[?&]ep=([A-Za-z]{2})\b/) || [])[1];
        if (code) return MLP_LANG_CODES[code.toUpperCase()] || code.toUpperCase();
        return "VO";
    }

    _mediaUrls(html, pageUrl) {
        var videos = [];
        var seen = {};
        var m;

        var mp4Re = /['"]?(\d{3,4}p)['"]?\s*:\s*['"]([^'"]+\.mp4[^'"]*)['"]/gi;
        while ((m = mp4Re.exec(html)) !== null) {
            var mp4 = m[2].replace(/^http:\/\//i, "https://");
            if (seen[mp4]) continue;
            seen[mp4] = true;
            videos.push({ url: mp4, quality: m[1], height: parseInt(m[1], 10) || 0 });
        }
        if (videos.length) return videos;

        var webmRe = /['"]?(\d{3,4}p)['"]?\s*:\s*['"]([^'"]+\.webm[^'"]*)['"]/gi;
        while ((m = webmRe.exec(html)) !== null) {
            var webm = m[2].replace(/^http:\/\//i, "https://");
            if (seen[webm]) continue;
            seen[webm] = true;
            videos.push({ url: webm, quality: m[1] + " (WebM)", height: parseInt(m[1], 10) || 0 });
        }
        if (videos.length) return videos;

        var directRe = /['"](https?:\/\/[^'"]+\.(?:mp4|m3u8)[^'"]*)['"]/gi;
        while ((m = directRe.exec(html)) !== null) {
            var direct = m[1].replace(/^http:\/\//i, "https://");
            if (seen[direct]) continue;
            seen[direct] = true;
            videos.push({ url: direct, quality: "AUTO", height: 0 });
        }
        return videos;
    }

    // La page de lecture expose « PASSER EN ANGLAIS » (série) ou les autres
    // langues du film : chaque page sœur est une piste audio distincte.
    _siblingPages(html, pageUrl) {
        var out = [];
        var seen = {};
        seen[String(pageUrl)] = true;
        var currentEp = (String(pageUrl).match(/[?&]ep=([A-Za-z0-9]+)/) || [])[1] || "";
        var re = /<a[^>]+href="([^"]+)"[^>]*class="link"[^>]*>([\s\S]{1,80}?)<\/a>/gi;
        var m;
        while ((m = re.exec(html)) !== null) {
            var href = String(m[1] || "").trim();
            var label = this._clean(m[2]);
            if (!href || /^https?:\/\//i.test(href)) continue;
            // « ÉPISODE SUIVANT » pointe sur une autre vidéo, pas sur une autre langue.
            if (/suivant|pr[ée]c[ée]dent|next|prev|retour|accueil|t[ée]l[ée]chargement|download/i.test(label)) continue;

            var ep = (href.match(/[?&]ep=([A-Za-z0-9]+)/) || [])[1] || "";
            var isLanguageLabel = /passer en|english|fran[çc]ais|espa[ñn]ol|deutsch|italiano|portugu|polski|nederlands|русск|عربي|langue/i.test(label);
            var isSeriesSibling = /(?:^|\/)(?:vf|vo)\.php/i.test(href) && ep === currentEp;
            var isFilmSibling = ep !== "" && MLP_LANG_CODES[ep.toUpperCase()] && ep.toUpperCase() !== currentEp.toUpperCase();
            if (!(isLanguageLabel || isSeriesSibling || isFilmSibling)) continue;

            var url = this._abs(href, pageUrl);
            if (seen[url]) continue;
            seen[url] = true;
            out.push(url);
            if (out.length >= MLP_MAX_SIBLING_LANGUAGES) break;
        }
        return out;
    }

    _videosForPage(html, pageUrl) {
        var language = this._languageOf(pageUrl);
        var media = this._mediaUrls(html, pageUrl);
        var headers = { "User-Agent": MLP_UA, "Referer": pageUrl };
        var videos = [];
        for (var i = 0; i < media.length; i++) {
            videos.push({
                quality: language + " · " + media[i].quality,
                url: media[i].url,
                originalUrl: media[i].url,
                headers: headers
            });
        }
        return videos;
    }

    async getVideoList(url) {
        var link = String(url || "");
        var videos = [];
        var seen = {};

        var page = null;
        try {
            page = await this._get(link);
        } catch (e) {
            page = null;
        }
        if (!page) {
            return [{ quality: "WebView", url: link, originalUrl: link }];
        }

        var primary = this._videosForPage(page.body, link);
        primary.forEach(function (video) {
            if (seen[video.url]) return;
            seen[video.url] = true;
            videos.push(video);
        });

        var siblings = this._siblingPages(page.body, link);
        for (var i = 0; i < siblings.length; i++) {
            var sibling = null;
            try {
                sibling = await this._get(siblings[i]);
            } catch (e) {
                sibling = null;
            }
            if (!sibling) continue;
            var extra = this._videosForPage(sibling.body, siblings[i]);
            for (var j = 0; j < extra.length; j++) {
                if (seen[extra[j].url]) continue;
                seen[extra[j].url] = true;
                videos.push(extra[j]);
            }
        }

        if (!videos.length) return [{ quality: "WebView", url: link, originalUrl: link }];
        return videos;
    }
}
