var watchtowerSources = [{
  "name": "Movix",
  "id": 4096048200,
  "baseUrl": "https://movix.chat",
  "lang": "fr",
  "typeSource": "single",
  "iconUrl": "https://movix.chat/movix.png",
  "dateFormat": "",
  "dateFormatLocale": "",
  "isNsfw": false,
  "hasCloudflare": false,
  "sourceCodeUrl": "https://raw.githubusercontent.com/ferelking242/watchtower-extensions/main/src/watch/fr/movix.js",
  "apiUrl": "https://api.themoviedb.org/3",
  "version": "1.0.0",
  "isManga": false,
  "itemType": 1,
  "isFullData": false,
  "appMinVerReq": "0.5.0",
  "additionalParams": "",
  "sourceCodeLanguage": 1,
  "notes": "Movix.chat — Films, séries, anime, TV en direct et collections. Catalogue TMDB complet en VF/VOSTFR. Gratuit, open-source.",
  "requiresAccount": false,
  "hasDRM": false,
  "isAggregator": false,
  "paywall": "free",
  "hasSubtitles": true,
  "hasDub": true,
  "videoQualities": ["AUTO", "VF", "VOSTFR", "VO"],
  "subCategories": ["films", "series", "anime", "live-tv", "collections"]
}];

const BASE_URL    = "https://movix.chat";
const TMDB_BASE   = "https://api.themoviedb.org/3";
const TMDB_IMG    = "https://image.tmdb.org/t/p/w500";
const TMDB_BACK   = "https://image.tmdb.org/t/p/w1280";
const TMDB_KEY    = "f3d757824f08ea2cff45eb8f47ca3a1e";
const LANG_FR     = "fr-FR";

// ── TMDB genre map (FR) ────────────────────────────────────────────────────
const GENRES = {
  28:    "Action",
  12:    "Aventure",
  16:    "Animation",
  35:    "Comédie",
  80:    "Crime",
  99:    "Documentaire",
  18:    "Drame",
  10751: "Familial",
  14:    "Fantastique",
  36:    "Histoire",
  27:    "Horreur",
  10402: "Musique",
  9648:  "Mystère",
  10749: "Romance",
  878:   "Science-Fiction",
  10770: "Téléfilm",
  53:    "Thriller",
  10752: "Guerre",
  37:    "Western",
  // TV genres
  10759: "Action & Aventure",
  10762: "Enfants",
  10763: "Actualités",
  10764: "Réalité",
  10765: "SF & Fantastique",
  10766: "Soap",
  10767: "Talk-Show",
  10768: "Guerre & Politique"
};

class DefaultExtension extends MProvider {
  constructor() {
    super();
  }

  // ── Prefs helpers ──────────────────────────────────────────────────────

  _pref(key, fallback) {
    const p = this.source && this.source.prefs
      ? this.source.prefs.find(function(x) { return x.key === key; })
      : null;
    return (p && p.value !== undefined && p.value !== "") ? p.value : fallback;
  }

  _lang() { return this._pref("lang", LANG_FR); }
  _type() { return this._pref("content_type", "all"); }

  // ── TMDB fetch ─────────────────────────────────────────────────────────

  async _tmdb(path, params) {
    const qs = Object.assign({ api_key: TMDB_KEY, language: this._lang() }, params || {});
    const query = Object.keys(qs).map(function(k) {
      return encodeURIComponent(k) + "=" + encodeURIComponent(qs[k]);
    }).join("&");
    const url = TMDB_BASE + path + "?" + query;
    const res = await new Client().get(url, { "Accept": "application/json" });
    try { return JSON.parse(res.body); } catch(e) { return {}; }
  }

  // ── Item mapping ───────────────────────────────────────────────────────

  _mapItem(r) {
    if (!r) return null;
    const isMovie   = r.media_type === "movie" || r.title !== undefined;
    const tmdbType  = isMovie ? "movie" : "tv";
    const title     = r.title || r.name || "";
    const poster    = r.poster_path ? TMDB_IMG + r.poster_path : "";
    const link      = BASE_URL + "/" + tmdbType + "/" + r.id;
    const year      = (r.release_date || r.first_air_date || "").substring(0, 4);
    const rating    = r.vote_average ? Math.round(r.vote_average * 10) / 10 : 0;
    return { name: title, imageUrl: poster, link: link, year: year, rating: rating, tmdbType: tmdbType, tmdbId: r.id };
  }

  _mapList(results, mediaType) {
    const self = this;
    return (results || []).map(function(r) {
      if (mediaType) r.media_type = mediaType;
      return self._mapItem(r);
    }).filter(Boolean);
  }

  // ── Core listing ───────────────────────────────────────────────────────

  async getPopular(page) {
    const type = this._type();
    let results = [], hasNext = false;
    if (type === "movie") {
      const d = await this._tmdb("/movie/popular", { page: page });
      results = this._mapList(d.results, "movie");
      hasNext = page < Math.min(d.total_pages || 1, 500);
    } else if (type === "tv") {
      const d = await this._tmdb("/tv/popular", { page: page });
      results = this._mapList(d.results, "tv");
      hasNext = page < Math.min(d.total_pages || 1, 500);
    } else {
      const d = await this._tmdb("/trending/all/week", { page: page });
      results = this._mapList(d.results);
      hasNext = page < Math.min(d.total_pages || 1, 500);
    }
    return { list: results, hasNextPage: hasNext };
  }

  async getLatestUpdates(page) {
    const type = this._type();
    let results = [], hasNext = false;
    if (type === "tv") {
      const d = await this._tmdb("/tv/on_the_air", { page: page });
      results = this._mapList(d.results, "tv");
      hasNext = page < Math.min(d.total_pages || 1, 10);
    } else {
      const d = await this._tmdb("/movie/now_playing", { page: page });
      results = this._mapList(d.results, "movie");
      hasNext = page < Math.min(d.total_pages || 1, 10);
    }
    return { list: results, hasNextPage: hasNext };
  }

  async search(query, page, filters) {
    let genreId = "", year = "", sort = "popularity.desc", contentType = this._type();

    if (filters && filters.length > 0) {
      for (const f of filters) {
        if (f.name === "Genre" && f.state) genreId = f.state;
        if (f.name === "Année" && f.state) year = f.state;
        if (f.name === "Tri" && f.state) sort = f.state;
        if (f.name === "Type" && f.state) contentType = f.state;
      }
    }

    // If there's a query, use search
    if (query && query.trim().length > 0) {
      const endpoint = contentType === "movie" ? "/search/movie"
                     : contentType === "tv"    ? "/search/tv"
                     : "/search/multi";
      const params = { query: query.trim(), page: page };
      if (year) params.year = year;
      const d = await this._tmdb(endpoint, params);
      const results = this._mapList(d.results, contentType !== "all" ? contentType : undefined);
      return { list: results, hasNextPage: page < Math.min(d.total_pages || 1, 500) };
    }

    // Browse by genre/sort using discover
    const endpoint = contentType === "tv" ? "/discover/tv" : "/discover/movie";
    const params = {
      page: page,
      sort_by: sort,
      "vote_count.gte": 20
    };
    if (genreId) params.with_genres = genreId;
    if (year && contentType !== "tv") params.primary_release_year = year;
    if (year && contentType === "tv")  params.first_air_date_year = year;

    const d = await this._tmdb(endpoint, params);
    const mediaType = contentType === "all" ? "movie" : contentType;
    const results = this._mapList(d.results, mediaType);
    return { list: results, hasNextPage: page < Math.min(d.total_pages || 1, 500) };
  }

  // ── Detail ─────────────────────────────────────────────────────────────

  async getDetail(url) {
    // Extract tmdb type and id from URL: movix.chat/movie/123 or movix.chat/tv/123
    const m = url.match(/movix\.chat\/(movie|tv)\/(\d+)/);
    if (!m) return { name: "", imageUrl: "", description: "", episodes: [{ name: "Regarder", url: url }] };

    const tmdbType = m[1];
    const tmdbId   = m[2];

    const d = await this._tmdb("/" + tmdbType + "/" + tmdbId, {
      append_to_response: tmdbType === "tv" ? "seasons,credits,videos,images" : "credits,videos,images,release_dates"
    });

    const title    = d.title || d.name || "";
    const poster   = d.poster_path   ? TMDB_IMG  + d.poster_path   : "";
    const backdrop = d.backdrop_path ? TMDB_BACK + d.backdrop_path : "";
    const imageUrl = poster || backdrop;
    const description = d.overview || "";

    // Tags from genres
    const genre = (d.genres || []).map(function(g) { return { name: g.name }; });

    // Episodes
    const episodes = [];

    if (tmdbType === "movie") {
      episodes.push({ name: "Regarder · " + title, url: url });
    } else {
      // TV — list seasons
      const seasons = (d.seasons || []).filter(function(s) { return s.season_number > 0; });
      for (const season of seasons) {
        const seasonUrl = url + "?season=" + season.season_number;
        const episodeCount = season.episode_count ? " · " + season.episode_count + " épisodes" : "";
        episodes.push({
          name: (season.name || ("Saison " + season.season_number)) + episodeCount,
          url: seasonUrl
        });
      }
      if (episodes.length === 0) {
        episodes.push({ name: "Regarder · " + title, url: url });
      }
    }

    // Build metadata string
    const year    = (d.release_date || d.first_air_date || "").substring(0, 4);
    const rating  = d.vote_average ? "★ " + Math.round(d.vote_average * 10) / 10 : "";
    const runtime = d.runtime ? d.runtime + " min" : (d.episode_run_time && d.episode_run_time[0] ? d.episode_run_time[0] + " min/ép" : "");
    const status  = d.status || "";

    return {
      name:        title,
      imageUrl:    imageUrl,
      description: [year, rating, runtime, status].filter(Boolean).join(" · ") + (description ? "\n\n" + description : ""),
      genre:       genre,
      episodes:    episodes
    };
  }

  // ── Video list ─────────────────────────────────────────────────────────

  async getVideoList(url) {
    // url is a Movix page — we return it as an embed
    // Strip ?season= param for the main watch URL
    const cleanUrl = url.replace(/\?season=\d+/, "");
    return [
      { url: cleanUrl, quality: "Movix · AUTO",    originalUrl: cleanUrl },
    ];
  }

  // ── Custom lists (home sections) ───────────────────────────────────────

  getCustomLists() {
    return [
      {
        id:     "accueil",
        name:   "Accueil",
        layout: "carousel",
        color:  "#7C3AED",
        icon:   "movie",
        seeAll: "popular"
      },
      {
        id:     "popular",
        name:   "Populaires",
        layout: "spotlight",
        color:  "#EF4444",
        icon:   "trending_up",
        seeAll: "popular"
      },
      {
        id:     "latest",
        name:   "Derniers ajouts",
        layout: "carousel",
        color:  "#06B6D4",
        icon:   "fiber_new",
        seeAll: "latest"
      },
      {
        id:     "top_rated",
        name:   "Les mieux notés",
        layout: "ranked",
        color:  "#F59E0B",
        icon:   "star",
        seeAll: true
      },
      {
        id:     "upcoming",
        name:   "Prochainement",
        layout: "carousel",
        color:  "#10B981",
        icon:   "new_releases",
        seeAll: true
      },
      {
        id:     "trending_tv",
        name:   "Séries tendance",
        layout: "spotlight",
        color:  "#8B5CF6",
        icon:   "tv",
        seeAll: true
      },
      {
        id:     "collections",
        name:   "Collections",
        layout: "compact",
        color:  "#F97316",
        icon:   "category",
        seeAll: true
      },
      {
        id:     "action",
        name:   "Action",
        layout: "compact",
        color:  "#DC2626",
        icon:   "bolt",
        seeAll: true
      },
      {
        id:     "animation",
        name:   "Animation",
        layout: "spotlight",
        color:  "#EC4899",
        icon:   "animation",
        seeAll: true
      },
      {
        id:     "comedie",
        name:   "Comédie",
        layout: "compact",
        color:  "#84CC16",
        icon:   "theaters",
        seeAll: true
      },
      {
        id:     "sf",
        name:   "Science-Fiction",
        layout: "carousel",
        color:  "#3B82F6",
        icon:   "star",
        seeAll: true
      },
      {
        id:     "horreur",
        name:   "Horreur",
        layout: "compact",
        color:  "#1F2937",
        icon:   "local_movies",
        seeAll: true
      },
      {
        id:     "documentaire",
        name:   "Documentaires",
        layout: "compact",
        color:  "#0891B2",
        icon:   "history",
        seeAll: true
      },
      {
        id:     "suggestion",
        name:   "Suggestions",
        layout: "spotlight",
        color:  "#7C3AED",
        icon:   "star",
        seeAll: true
      },
      {
        id:     "cinegraph",
        name:   "Cinégraph",
        layout: "ranked",
        color:  "#D97706",
        icon:   "theaters",
        seeAll: true
      }
    ];
  }

  async getCustomList(listId, page) {
    const p = page || 1;

    if (listId === "accueil" || listId === "popular") {
      const type = this._type();
      if (type === "tv") {
        const d = await this._tmdb("/tv/popular", { page: p });
        return { list: this._mapList(d.results, "tv"), hasNextPage: p < Math.min(d.total_pages || 1, 500) };
      }
      const d = await this._tmdb("/trending/all/week", { page: p });
      return { list: this._mapList(d.results), hasNextPage: p < Math.min(d.total_pages || 1, 500) };
    }

    if (listId === "latest") {
      const type = this._type();
      if (type === "tv") {
        const d = await this._tmdb("/tv/on_the_air", { page: p });
        return { list: this._mapList(d.results, "tv"), hasNextPage: p < Math.min(d.total_pages || 1, 10) };
      }
      const d = await this._tmdb("/movie/now_playing", { page: p });
      return { list: this._mapList(d.results, "movie"), hasNextPage: p < Math.min(d.total_pages || 1, 10) };
    }

    if (listId === "top_rated") {
      const type = this._type();
      if (type === "tv") {
        const d = await this._tmdb("/tv/top_rated", { page: p });
        return { list: this._mapList(d.results, "tv"), hasNextPage: p < Math.min(d.total_pages || 1, 500) };
      }
      const d = await this._tmdb("/movie/top_rated", { page: p });
      return { list: this._mapList(d.results, "movie"), hasNextPage: p < Math.min(d.total_pages || 1, 500) };
    }

    if (listId === "upcoming") {
      const d = await this._tmdb("/movie/upcoming", { page: p });
      return { list: this._mapList(d.results, "movie"), hasNextPage: p < Math.min(d.total_pages || 1, 35) };
    }

    if (listId === "trending_tv") {
      const d = await this._tmdb("/trending/tv/week", { page: p });
      return { list: this._mapList(d.results, "tv"), hasNextPage: p < Math.min(d.total_pages || 1, 500) };
    }

    if (listId === "collections") {
      // Collections: top-rated movies curated selection
      const d = await this._tmdb("/discover/movie", { page: p, sort_by: "popularity.desc", "vote_count.gte": 500, "vote_average.gte": 7 });
      return { list: this._mapList(d.results, "movie"), hasNextPage: p < Math.min(d.total_pages || 1, 50) };
    }

    if (listId === "suggestion") {
      // Suggestions: hidden gems (good rating, less popular)
      const d = await this._tmdb("/discover/movie", { page: p, sort_by: "vote_average.desc", "vote_count.gte": 100, "vote_average.gte": 7.5 });
      return { list: this._mapList(d.results, "movie"), hasNextPage: p < Math.min(d.total_pages || 1, 50) };
    }

    if (listId === "cinegraph") {
      // Cinegraph: all-time classics by vote count (most voted = cultural consensus)
      const d = await this._tmdb("/discover/movie", { page: p, sort_by: "vote_count.desc", "vote_count.gte": 5000 });
      return { list: this._mapList(d.results, "movie"), hasNextPage: p < Math.min(d.total_pages || 1, 50) };
    }

    // Genre-based sections
    const GENRE_MAP = {
      "action":       28,
      "animation":    16,
      "comedie":      35,
      "sf":           878,
      "horreur":      27,
      "documentaire": 99,
      "thriller":     53,
      "romance":      10749,
      "aventure":     12,
      "crime":        80
    };

    const genreId = GENRE_MAP[listId];
    if (genreId) {
      const type = this._type();
      const endpoint = type === "tv" ? "/discover/tv" : "/discover/movie";
      const mediaType = type === "all" ? "movie" : type;
      const d = await this._tmdb(endpoint, { page: p, sort_by: "popularity.desc", with_genres: genreId, "vote_count.gte": 20 });
      return { list: this._mapList(d.results, mediaType), hasNextPage: p < Math.min(d.total_pages || 1, 500) };
    }

    // Fallback
    const d = await this._tmdb("/trending/all/week", { page: p });
    return { list: this._mapList(d.results), hasNextPage: false };
  }

  // ── Filters ────────────────────────────────────────────────────────────

  getFilterList() {
    return [
      {
        type_name: "SelectFilter",
        name: "Type",
        state: 0,
        values: [
          { type_name: "SelectOption", name: "Tout",   value: "all"   },
          { type_name: "SelectOption", name: "Films",  value: "movie" },
          { type_name: "SelectOption", name: "Séries", value: "tv"    }
        ]
      },
      {
        type_name: "SelectFilter",
        name: "Genre",
        state: 0,
        values: [
          { type_name: "SelectOption", name: "Tous",               value: ""      },
          { type_name: "SelectOption", name: "Action",             value: "28"    },
          { type_name: "SelectOption", name: "Aventure",           value: "12"    },
          { type_name: "SelectOption", name: "Animation",          value: "16"    },
          { type_name: "SelectOption", name: "Comédie",            value: "35"    },
          { type_name: "SelectOption", name: "Crime",              value: "80"    },
          { type_name: "SelectOption", name: "Documentaire",       value: "99"    },
          { type_name: "SelectOption", name: "Drame",              value: "18"    },
          { type_name: "SelectOption", name: "Familial",           value: "10751" },
          { type_name: "SelectOption", name: "Fantastique",        value: "14"    },
          { type_name: "SelectOption", name: "Histoire",           value: "36"    },
          { type_name: "SelectOption", name: "Horreur",            value: "27"    },
          { type_name: "SelectOption", name: "Mystère",            value: "9648"  },
          { type_name: "SelectOption", name: "Romance",            value: "10749" },
          { type_name: "SelectOption", name: "Science-Fiction",    value: "878"   },
          { type_name: "SelectOption", name: "Thriller",           value: "53"    },
          { type_name: "SelectOption", name: "Guerre",             value: "10752" },
          { type_name: "SelectOption", name: "Western",            value: "37"    }
        ]
      },
      {
        type_name: "SelectFilter",
        name: "Tri",
        state: 0,
        values: [
          { type_name: "SelectOption", name: "Popularité",        value: "popularity.desc"    },
          { type_name: "SelectOption", name: "Les mieux notés",   value: "vote_average.desc"  },
          { type_name: "SelectOption", name: "Plus récents",      value: "primary_release_date.desc" },
          { type_name: "SelectOption", name: "Plus anciens",      value: "primary_release_date.asc"  },
          { type_name: "SelectOption", name: "Revenu",            value: "revenue.desc"       }
        ]
      },
      {
        type_name: "TextFilter",
        name: "Année",
        state: ""
      }
    ];
  }

  // ── Source preferences ─────────────────────────────────────────────────

  getSourcePreferences() {
    return [
      {
        key: "content_type",
        listPreference: {
          title:       "Type de contenu par défaut",
          summary:     "Filtre l'accueil et les listes",
          valueIndex:  0,
          entries:     ["Tout (films + séries)", "Films uniquement", "Séries uniquement"],
          entryValues: ["all", "movie", "tv"]
        }
      },
      {
        key: "lang",
        listPreference: {
          title:       "Langue des métadonnées",
          summary:     "Langue utilisée pour les titres et descriptions",
          valueIndex:  0,
          entries:     ["Français", "English", "Español", "Deutsch", "Italiano", "日本語"],
          entryValues: ["fr-FR", "en-US", "es-ES", "de-DE", "it-IT", "ja-JP"]
        }
      }
    ];
  }
}
