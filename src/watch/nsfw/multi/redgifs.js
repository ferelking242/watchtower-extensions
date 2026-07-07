// RedGIFs — TikTok-style adult GIF/video feed
// Type: reel — items open in WatchReelFeedScreen (vertical PageView)
// API: api.redgifs.com v2 — public temporary token (no account required)

const watchtowerSources = [{
  "name": "RedGIFs",
  "lang": "multi",
  "baseUrl": "https://www.redgifs.com",
  "apiUrl": "https://api.redgifs.com",
  "iconUrl": "https://www.redgifs.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.0",
  "pkgPath": "nsfw/multi/redgifs.js",
  "notes": "RedGIFs v1.0.0 — TikTok-style vertical reel feed (type=reel). Token auto-refresh, 12 niche chips, trending/new spotlights, infinite catalogue.",
  "isNsfw": true
}];

class DefaultExtension extends MProvider {
  // ── Auth token cache (50-min TTL) ─────────────────────────────────────────
  _token = null;
  _tokenExp = 0;

  async _getToken() {
    const now = Date.now();
    if (this._token && now < this._tokenExp) return this._token;
    try {
      const res = await new Client().get('https://api.redgifs.com/v2/auth/temporary', {
        headers: { 'User-Agent': 'Watchtower/1.0 RedGIFs-Extension' }
      });
      const json = JSON.parse(res.body);
      if (json.token) {
        this._token = json.token;
        this._tokenExp = now + 50 * 60 * 1000; // 50 min
        return this._token;
      }
    } catch (_) {}
    // Fallback: guest token from web scrape
    return null;
  }

  async _apiGet(path) {
    const token = await this._getToken();
    const headers = { 'User-Agent': 'Watchtower/1.0 RedGIFs-Extension' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await new Client().get('https://api.redgifs.com' + path, { headers });
    if (res.statusCode === 401) {
      // Force token refresh on 401
      this._token = null;
      this._tokenExp = 0;
      return this._apiGet(path);
    }
    return JSON.parse(res.body);
  }

  // ── 12 most popular niches (for category chips on home) ───────────────────
  _NICHES = [
    { id: 'just-boobs',    name: 'Just Boobs'    },
    { id: 'blowjobs',      name: 'Blowjobs'      },
    { id: 'thick-booty',   name: 'Thick Booty'   },
    { id: 'legal-teens',   name: 'Legal Teens'   },
    { id: 'amateur-girls', name: 'Amateur Girls' },
    { id: 'tik-tok',       name: 'Tik Tok'       },
    { id: 'real-couples',  name: 'Real Couples'  },
    { id: 'real-orgasms',  name: 'Real Orgasms'  },
    { id: 'curvy-chicks',  name: 'Curvy Chicks'  },
    { id: 'rough-sex',     name: 'Rough Sex'     },
    { id: 'goth-girls',    name: 'Goth Girls'    },
    { id: 'latinas',       name: 'Latinas'       },
  ];

  // ── Home layout ───────────────────────────────────────────────────────────
  // category chips → trending spotlight → new spotlight → catalogue grid
  getCustomLists() {
    const sections = [];
    // Category chips (12 popular niches)
    for (const n of this._NICHES) {
      sections.push({
        id: 'niche_' + n.id,
        layout: 'category',
        name: n.name,
        color: '#1A1A2E',
      });
    }
    // Spotlight sections — portrait 116×172 cards, same as MovieBox
    sections.push({
      id: 'trending',
      layout: 'spotlight',
      name: '🔥 Trending',
      color: '#FF3B30',
      icon: 'local_fire_department',
      seeAll: 'trending',
    });
    sections.push({
      id: 'new',
      layout: 'spotlight',
      name: '✨ New',
      color: '#34C759',
      icon: 'fiber_new',
      seeAll: 'new',
    });
    // Infinite catalogue grid
    sections.push({
      id: 'catalogue',
      layout: 'catalogue',
      name: 'Catalogue',
    });
    return sections;
  }

  // ── Convert a RedGIFs gif object → MManga with type=reel link ─────────────
  _gifToItem(gif, listId) {
    const urls = gif.urls || {};
    const hd = urls.hd || '';
    const sd = urls.sd || hd || '';
    const poster = urls.thumbnail || urls.poster || urls.vthumbnail || '';
    // Encode all playback data into the link field as JSON.
    // The Flutter app detects type='reel' and opens WatchReelFeedScreen.
    const link = JSON.stringify({
      type: 'reel',
      listId: listId,
      gifId: gif.id || '',
      hd: hd,
      sd: sd,
      poster: poster,
      hasAudio: gif.hasAudio || false,
      duration: gif.duration || 0,
    });
    return {
      name: gif.userName || gif.id || 'RedGIFs',
      imageUrl: poster || urls.gif || '',
      link: link,
      description: (gif.tags || []).slice(0, 5).join(' · '),
    };
  }

  // ── Custom list fetching ───────────────────────────────────────────────────
  async getCustomList(listId, page) {
    let data;
    const count = listId === 'catalogue' ? 30 : 20;

    if (listId === 'catalogue') {
      data = await this._apiGet(`/v2/gifs/search?order=trending&count=${count}&page=${page}`);
    } else if (listId === 'trending') {
      data = await this._apiGet(`/v2/gifs/search?order=trending&count=${count}&page=${page}`);
    } else if (listId === 'new') {
      data = await this._apiGet(`/v2/gifs/search?order=new&count=${count}&page=${page}`);
    } else if (listId.startsWith('niche_')) {
      const nicheId = listId.slice(6); // strip 'niche_' prefix
      data = await this._apiGet(`/v2/niches/${nicheId}/gifs?order=trending&count=${count}&page=${page}`);
    } else {
      // seeAll targets ('popular', 'latest', etc.)
      const order = listId === 'new' || listId === 'latest' ? 'new' : 'trending';
      data = await this._apiGet(`/v2/gifs/search?order=${order}&count=${count}&page=${page}`);
    }

    const gifs = data.gifs || data.items || [];
    return {
      list: gifs.map(g => this._gifToItem(g, listId)),
      hasNextPage: gifs.length >= count,
    };
  }

  // ── Standard provider methods ─────────────────────────────────────────────
  get supportsLatest() { return true; }

  async getPopular(page) {
    const data = await this._apiGet(`/v2/gifs/search?order=trending&count=20&page=${page}`);
    const gifs = data.gifs || data.items || [];
    return {
      list: gifs.map(g => this._gifToItem(g, 'trending')),
      hasNextPage: gifs.length >= 20,
    };
  }

  async getLatestUpdates(page) {
    const data = await this._apiGet(`/v2/gifs/search?order=new&count=20&page=${page}`);
    const gifs = data.gifs || data.items || [];
    return {
      list: gifs.map(g => this._gifToItem(g, 'new')),
      hasNextPage: gifs.length >= 20,
    };
  }

  async search(query, page, filters) {
    const q = encodeURIComponent(query.trim());
    const data = await this._apiGet(`/v2/gifs/search?search_text=${q}&count=20&page=${page}`);
    const gifs = data.gifs || data.items || [];
    return {
      list: gifs.map(g => this._gifToItem(g, 'search_' + q)),
      hasNextPage: gifs.length >= 20,
    };
  }

  // ── Detail (fallback for non-reel flows) ──────────────────────────────────
  async getDetail(url) {
    // url may be a raw gifId or a JSON link string
    let gifId = url;
    try {
      const d = JSON.parse(url);
      gifId = d.gifId || url;
    } catch (_) {}
    const data = await this._apiGet(`/v2/gifs/${gifId}`);
    const gif = data.gif || data;
    const urls = gif.urls || {};
    const poster = urls.thumbnail || urls.poster || '';
    return {
      name: gif.userName || gifId,
      imageUrl: poster,
      description: (gif.tags || []).join(' · '),
      episodes: [{ name: '▶ Watch', url: gifId }],
    };
  }

  // ── Video list (fallback for non-reel flows) ──────────────────────────────
  async getVideoList(url) {
    let gifId = url;
    try {
      const d = JSON.parse(url);
      gifId = d.gifId || url;
    } catch (_) {}
    const data = await this._apiGet(`/v2/gifs/${gifId}`);
    const gif = data.gif || data;
    const urls = gif.urls || {};
    const videos = [];
    if (urls.hd) videos.push({ url: urls.hd, quality: 'HD',  originalUrl: urls.hd });
    if (urls.sd) videos.push({ url: urls.sd, quality: 'SD',  originalUrl: urls.sd });
    if (videos.length === 0 && urls.gif) {
      videos.push({ url: urls.gif, quality: 'GIF', originalUrl: urls.gif });
    }
    return videos;
  }

  async getPageList(url) { return []; }
  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
