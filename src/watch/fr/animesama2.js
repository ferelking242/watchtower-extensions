// Anime-Sama (animes-sama.fr) — extension Watchtower v1.1.4
// Catalogue paginé, recherche ?search=, saisons VF/VOSTFR, lecteurs signés.
//
// Lecture vidéo : la page saison n'expose aucune URL directe. Le flux réel est
// obtenu en 3 appels API authentifiés par le cookie de session et le CSRF :
//   1. POST /api/player/sign/<slug>/<saison>/<lang>  { ep, lecteur }  -> page lecteur signée
//   2. GET  <page lecteur>                                            -> data-resolve-token
//   3. POST /api/player/resolve                       { token }       -> play_url
// Le cookie PHPSESSID est obligatoire pour /player/media (403 sans lui).

const watchtowerSources = [{
    "name": "Anime-Sama (FR)",
    "langs": ["fr"],
    "ids": { "fr": 701938472 },
    "baseUrl": "https://animes-sama.fr",
    "apiUrl": "https://animes-sama.fr",
    "iconUrl": "https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/assets/icons/watch-1900000044.png",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.1.4",
    "forYou": true,
    "login": false,
    "pkgPath": "watch/fr/animesama2.js",
    "editableBaseUrl": true,
    "hasCloudflare": false,
    "customUserAgent": "",
    "videoQualities": ["AUTO", "VF", "VOSTFR"],
    "subCategories": ["anime"],
    "supportsForYou": true,
    "supportsComments": false,
    "requiresAccount": false,
    "hasDRM": false,
    "isAggregator": false,
    "paywall": "free",
    "notes": "Anime-Sama — animes-sama.fr — VF/VOSTFR, lecteurs signés (uqload/vidhide…)."
}];

const BASE_URL = "https://animes-sama.fr";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Lecteurs essayés dans l'ordre, plafonnés : getVideoList a un budget de 20 s.
const MAX_READERS = 4;
const MAX_SUCCESS = 2;

class DefaultExtension extends MProvider {
    constructor() { super(); }

    get baseUrl() { return new SharedPreferences().get("base_url") || BASE_URL; }

    _hdrs(ref) {
        return {
            "User-Agent": UA,
            "Referer": ref || (this.baseUrl + "/"),
            "Accept-Language": "fr-FR,fr;q=0.9"
        };
    }

    // Le harnais de test expose Client(url, body, headers) alors que l'app
    // expose Client(url, headers, body). sendMessage n'existe que dans l'app.
    _isAppRuntime() {
        return typeof sendMessage !== "undefined";
    }

    async _post(url, headers, body) {
        const client = new Client();
        return this._isAppRuntime()
            ? await client.post(url, headers, JSON.stringify(body))
            : await client.post(url, JSON.stringify(body), headers);
    }

    _header(res, name) {
        const headers = (res && res.headers) || {};
        const key = Object.keys(headers).find((k) => k.toLowerCase() === name);
        return key ? String(headers[key] || "") : "";
    }

    // Le cookie de session est émis sur la page saison. Il conditionne l'accès
    // à /player/media : on le conserve pour le réutiliser explicitement sur
    // chaque appel et dans les en-têtes média transmis au lecteur.
    _sessionCookie(res) {
        const raw = this._header(res, "set-cookie");
        const m = raw.match(/PHPSESSID=[^;,\s]+/);
        return m ? m[0] : "";
    }

    _decode(s) {
        return String(s || "")
            .replace(/&#0?39;/g, "'").replace(/&#39;/g, "'")
            .replace(/&quot;/g, '"').replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
            .replace(/&nbsp;/g, " ")
            .replace(/<[^>]+>/g, "").trim();
    }

    _abs(u) {
        if (!u) return "";
        if (u.startsWith("//")) return "https:" + u;
        if (u.startsWith("/")) return this.baseUrl + u;
        return u;
    }

    // Une carte du home embarque de gros SVG inline : on découpe une fenêtre
    // après chaque ancre au lieu d'exiger la balise </a> proche.
    _parseCards(html) {
        const items = [];
        const seen = {};
        const re = /<a[^>]+href="((?:https?:\/\/[^"]+)?\/catalogue\/[^"]+)"[^>]*>/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const url = this._abs(m[1]);
            if (seen[url]) continue;
            const block = html.slice(m.index, m.index + 6000);
            const imgM = /<img[^>]+class="card-image"[^>]*src="([^"]+)"/i.exec(block) ||
                         /<img[^>]+src="([^"]+)"[^>]*class="card-image"/i.exec(block);
            const titleM = /<[^>]*class="card-title[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i.exec(block);
            const altM = /<img[^>]+alt="([^"]+)"/i.exec(block);
            const name = this._decode(titleM ? titleM[1] : (altM ? altM[1] : ""));
            if (!name) continue;
            seen[url] = 1;
            items.push({ link: url, imageUrl: imgM ? this._abs(imgM[1]) : "", name });
        }
        return items;
    }

    // Découpe un rail du home : du conteneur demandé jusqu'au conteneur suivant.
    _rail(html, containerId) {
        const start = html.indexOf('id="' + containerId + '"');
        if (start < 0) return "";
        const rest = html.slice(start);
        const next = rest.slice(1).search(/id="container[A-Za-z]+"/);
        return next < 0 ? rest.slice(0, 30000) : rest.slice(0, next + 1);
    }

    _isSeasonUrl(url) {
        return /\/(?:saison\d+|film|oav|ova|vostfr|vf)\//i.test(url) ||
               /\/(?:saison\d+|film|oav|ova|vostfr|vf)$/i.test(url.replace(/[?#].*$/, ""));
    }

    _episodeFrom(url) {
        const m = String(url || "").match(/[?#&]ep=(\d+)/i);
        const n = m ? parseInt(m[1], 10) : 1;
        return n > 0 ? n : 1;
    }

    async _page(url) {
        return await new Client().get(url, this._hdrs(url));
    }

    async getPopular(page) {
        const p = Math.max(1, parseInt(page, 10) || 1);
        const url = `${this.baseUrl}/catalogue?page=${p}`;
        const res = await this._page(url);
        const html = res.body || "";
        const list = this._parseCards(html);
        // La pagination est réelle : page 2 ne recoupe jamais la page 1.
        const hasNextPage = new RegExp(`[?&]page=${p + 1}\\b`).test(html);
        return { list, hasNextPage };
    }

    // Miroir de l'accueil : derniers épisodes ajoutés puis derniers contenus sortis.
    async getLatestUpdates(page) {
        const p = Math.max(1, parseInt(page, 10) || 1);
        if (p > 1) return { list: [], hasNextPage: false };
        const res = await this._page(this.baseUrl + "/");
        const html = res.body || "";
        const seen = {};
        const list = [];
        for (const id of ["containerAjoutsAnimes", "containerSorties"]) {
            for (const item of this._parseCards(this._rail(html, id))) {
                if (seen[item.link]) continue;
                seen[item.link] = 1;
                list.push(item);
            }
        }
        if (list.length === 0) {
            return { list: this._parseCards(html), hasNextPage: false };
        }
        return { list, hasNextPage: false };
    }

    async getCustomList(listId, page) {
        const p = Math.max(1, parseInt(page, 10) || 1);
        if (listId === "popular") return await this.getPopular(p);
        if (listId === "latest") return await this.getLatestUpdates(p);
        const rails = {
            "derniers-ajouts": "containerAjoutsAnimes",
            "derniers-contenus": "containerSorties",
            "classiques": "containerClassiques",
            "pepites": "containerPepites"
        };
        const container = rails[listId];
        if (!container || p > 1) return { list: [], hasNextPage: false };
        const res = await this._page(this.baseUrl + "/");
        return { list: this._parseCards(this._rail(res.body || "", container)), hasNextPage: false };
    }

    async search(query, page, filterList) {
        const p = Math.max(1, parseInt(page, 10) || 1);
        const q = encodeURIComponent(String(query || "").trim());
        const url = `${this.baseUrl}/catalogue?search=${q}&page=${p}`;
        const res = await this._page(url);
        const html = res.body || "";
        const list = this._parseCards(html);
        const hasNextPage = list.length > 0 && new RegExp(`[?&]page=${p + 1}\\b`).test(html);
        return { list, hasNextPage };
    }

    async getDetail(url) {
        const res = await this._page(url);
        const html = res.body || "";
        const path = String(url).replace(/[?#].*$/, "").replace(/\/+$/, "");

        const tM = html.match(/<title>([^<]+)<\/title>/i);
        let name = tM ? this._decode(tM[1]).replace(/\s*\|.*$/, "").trim() : "";
        if (!name) {
            const ogT = html.match(/property="og:title"[^>]*content="([^"]+)"/i);
            name = ogT ? this._decode(ogT[1]) : "";
        }
        const imgM = html.match(/property="og:image"[^>]*content="([^"]+)"/i) ||
                     html.match(/content="([^"]+)"[^>]*property="og:image"/i);
        const descM = html.match(/name="description"[^>]*content="([^"]+)"/i) ||
                      html.match(/property="og:description"[^>]*content="([^"]+)"/i);

        const chapters = [];
        const seen = {};

        if (this._isSeasonUrl(path)) {
            // Page saison : un chapitre par épisode (le numéro voyage dans ?ep=).
            const numsM = html.match(/window\.__EPISODE_NUMBERS\s*=\s*(\[[^\]]*\])/);
            let numbers = [];
            if (numsM) { try { numbers = JSON.parse(numsM[1]); } catch (_) {} }
            if (numbers.length === 0) {
                for (const opt of html.matchAll(/<option[^>]*>\s*(?:[EÉ]pisode\s*)?(\d+)\s*<\/option>/gi)) {
                    numbers.push(parseInt(opt[1], 10));
                }
            }
            for (const n of numbers) {
                const ep = parseInt(n, 10);
                if (!ep || seen[ep]) continue;
                seen[ep] = 1;
                chapters.push({ name: `Épisode ${ep}`, url: `${path}?ep=${ep}`, dateUpload: "" });
            }
            if (chapters.length === 0) {
                chapters.push({ name: name || "Regarder", url: path, dateUpload: "" });
            }
        } else {
            // Page catalogue : un chapitre par saison / film / OAV.
            const re = /<a[^>]+href="([^"]*\/catalogue\/[^"]+\/(?:saison\d+|film|oav|ova)\/(?:vostfr|vf))\/?"[^>]*>/gi;
            for (const m of html.matchAll(re)) {
                const u = this._abs(m[1]);
                if (seen[u]) continue;
                seen[u] = 1;
                const tail = u.match(/\/(saison\d+|film|oav|ova)\/(vostfr|vf)\/?$/i);
                const label = tail
                    ? `${tail[1].charAt(0).toUpperCase() + tail[1].slice(1)} ${tail[2].toUpperCase()}`
                    : "Regarder";
                chapters.push({ name: label, url: u, dateUpload: "" });
            }
            if (chapters.length === 0) {
                chapters.push({ name: name || "Regarder", url: path, dateUpload: "" });
            }
        }

        return {
            name,
            imageUrl: imgM ? this._abs(imgM[1]) : "",
            description: descM ? this._decode(descM[1]) : "",
            chapters
        };
    }

    async getVideoList(url) {
        const target = String(url || "");
        const seasonPath = target.replace(/[?#].*$/, "").replace(/\/+$/, "");
        const ep = this._episodeFrom(target);

        let res = await this._page(seasonPath);
        let html = res.body || "";

        // Un lien de catalogue (pas une saison) : on bascule sur la 1re saison.
        if (!this._isSeasonUrl(seasonPath)) {
            const m = html.match(/href="([^"]*\/catalogue\/[^"]+\/(?:saison\d+|film|oav|ova)\/(?:vostfr|vf))\/?"/i);
            if (!m) return [];
            const seasonUrl = this._abs(m[1]);
            res = await this._page(seasonUrl);
            html = res.body || "";
            return await this._resolveSeason(seasonUrl.replace(/[?#].*$/, ""), ep, res);
        }

        return await this._resolveSeason(seasonPath, ep, res);
    }

    async _resolveSeason(seasonPath, ep, pageRes) {
        const html = pageRes.body || "";
        const cookie = this._sessionCookie(pageRes);
        if (cookie && typeof addCookie !== "undefined") {
            try { await addCookie(this.baseUrl, "PHPSESSID", cookie.split("=")[1]); } catch (_) {}
        }

        const csrfM = html.match(/csrf:\s*"([a-f0-9]{16,})"/i);
        const csrf = csrfM ? csrfM[1] : "";
        if (!csrf) return [];

        const slug = seasonPath.replace(/^.*\/catalogue\//, "");
        if (!slug) return [];

        // Lecteurs réellement disponibles pour cet épisode : var epsN = ["1","0",…]
        const idx = Math.max(0, ep - 1);
        const readers = [];
        for (const m of html.matchAll(/var\s+eps(\d+)\s*=\s*(\[[^\]]*\])/g)) {
            const id = parseInt(m[1], 10);
            let flags = [];
            try { flags = JSON.parse(m[2]); } catch (_) { continue; }
            if (String(flags[idx]) === "1") readers.push(id);
        }
        readers.sort((a, b) => a - b);
        if (readers.length === 0) {
            for (let i = 1; i <= MAX_READERS; i++) readers.push(i);
        }

        const apiHeaders = {
            "User-Agent": UA,
            "Accept-Language": "fr-FR,fr;q=0.9",
            "Content-Type": "application/json",
            "X-CSRF-Token": csrf,
            "X-Requested-With": "XMLHttpRequest",
            "Referer": seasonPath
        };
        if (cookie) apiHeaders["Cookie"] = cookie;

        const videos = [];
        for (const lecteur of readers.slice(0, MAX_READERS)) {
            if (videos.length >= MAX_SUCCESS) break;
            try {
                const signRes = await this._post(
                    `${this.baseUrl}/api/player/sign/${slug}`,
                    apiHeaders,
                    { ep, lecteur }
                );
                let playerPath = "";
                try { playerPath = (JSON.parse(signRes.body || "{}").url || ""); } catch (_) {}
                if (!playerPath) continue;
                const playerUrl = this._abs(playerPath);

                const ph = Object.assign({}, apiHeaders);
                delete ph["Content-Type"];
                const playerRes = await new Client().get(playerUrl, ph);
                const tokM = (playerRes.body || "").match(/data-resolve-token="([^"]+)"/);
                if (!tokM) continue;

                const resolveRes = await this._post(
                    `${this.baseUrl}/api/player/resolve`,
                    apiHeaders,
                    { token: tokM[1] }
                );
                let data = {};
                try { data = JSON.parse(resolveRes.body || "{}"); } catch (_) {}
                if (!data.success || !data.play_url) continue;

                const mediaUrl = this._abs(data.play_url);
                const provider = data.provider ? String(data.provider) : "";
                videos.push({
                    url: mediaUrl,
                    quality: provider ? `Lecteur ${lecteur} · ${provider}` : `Lecteur ${lecteur}`,
                    originalUrl: mediaUrl,
                    // /player/media renvoie 403 sans cookie de session.
                    headers: Object.assign({ "Referer": playerUrl }, cookie ? { "Cookie": cookie } : {})
                });
            } catch (_) {
                // Un lecteur cassé ne doit pas annuler les autres.
            }
        }
        return videos;
    }

    async getForYou(page) { return await this.getPopular(page); }

    async getPageList() { return []; }

    getFilterList() { return []; }

    getSourcePreferences() {
        return [
            {
                key: "base_url",
                editTextPreference: {
                    title: "URL du site",
                    summary: "Adresse du site. Changez si le domaine est migré.",
                    value: "https://animes-sama.fr",
                    dialogTitle: "URL du site",
                    dialogMessage: "URL actuelle : https://animes-sama.fr"
                }
            },
            {
                key: "default_quality",
                listPreference: {
                    title: "Qualité vidéo par défaut",
                    summary: "La qualité sélectionnée est prioritaire. Si indisponible, la plus proche est choisie automatiquement.",
                    valueIndex: 0,
                    entries: ["Auto (recommandé)", "1080p — Full HD", "720p — HD", "480p — SD", "360p — Faible"],
                    entryValues: ["AUTO", "1080", "720", "480", "360"]
                }
            },
            {
                key: "quality_fallback",
                listPreference: {
                    title: "Si la qualité n'est pas disponible",
                    summary: "Choisir la qualité la plus proche si celle demandée n'existe pas",
                    valueIndex: 1,
                    entries: ["Prendre la qualité supérieure", "Prendre la qualité inférieure (recommandé)"],
                    entryValues: ["higher", "lower"]
                }
            },
            {
                key: "sub_or_dub",
                listPreference: {
                    title: "Préférence audio",
                    summary: "Choisir entre version sous-titrée (Sub) ou doublée (Dub)",
                    valueIndex: 0,
                    entries: ["Sous-titré (Sub) — recommandé", "Doublé (Dub)", "Les deux (Sub puis Dub)"],
                    entryValues: ["sub", "dub", "both"]
                }
            }
        ];
    }
}
