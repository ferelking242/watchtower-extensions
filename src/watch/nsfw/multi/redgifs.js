// RedGIFs — TikTok-style adult GIF/video feed
// Type: reel — items open in WatchReelFeedScreen (vertical PageView)
// API: api.redgifs.com v2 — public temporary token (no account required)
// v1.0.1 — fix: use /v2/niches/{id}/gifs endpoints (search without search_text returns empty)

const watchtowerSources = [{
  "name": "RedGIFs",
  "lang": "multi",
  "baseUrl": "https://www.redgifs.com",
  "apiUrl": "https://api.redgifs.com",
  "iconUrl": "https://www.redgifs.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.1",
  "pkgPath": "nsfw/multi/redgifs.js",
  "notes": "RedGIFs v1.0.1 — TikTok-style vertical reel feed (type=reel). Niche-based feeds, 12 category chips, trending/new spotlights, infinite catalogue.",
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
        this._tokenExp = now + 50 * 60 * 1000;
        return this._token;
      }
    } catch (_) {}
    return null;
  }

  async _apiGet(path) {
    const token = await this._getToken();
    const headers = { 'User-Agent': 'Watchtower/1.0 RedGIFs-Extension' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await new Client().get('https://api.redgifs.com' + path, { headers });
    if (res.statusCode === 401) {
      this._token = null;
      this._tokenExp = 0;
      return this._apiGet(path);
    }
    return JSON.parse(res.body);
  }

  // ── 12 popular niches ─────────────────────────────────────────────────────
  // NOTE: these ids are valid /v2/niches/{id}/gifs endpoints (confirmed working)
  _NICHES = [
    { id: 'just-boobs',    name: 'Just Boobs'    },
    { id: 'blowjobs',      name: 'Blowjobs'      },
    { id: 'thick-booty',   name: 'Thick Booty'   },
    { id: 'amateur-girls', name: 'Amateur Girls' },
    { id: 'real-couples',  name: 'Real Couples'  },
    { id: 'real-orgasms',  name: 'Real Orgasms'  },
    { id: 'curvy-chicks',  name: 'Curvy Chicks'  },
    { id: 'rough-sex',     name: 'Rough Sex'     },
    { id: 'legal-teens',   name: 'Legal Teens'   },
    { id: 'busty-asians',  name: 'Busty Asians'  },
    { id: 'goth-girls',    name: 'Goth Girls'    },
    { id: 'latinas',       name: 'Latinas'       },
  ];

  // ── Home layout ───────────────────────────────────────────────────────────
  getCustomLists() {
    const sections = [];
    for (const n of this._NICHES) {
      sections.push({
        id: 'niche_' + n.id,
        layout: 'category',
        name: n.name,
        color: '#1A1A2E',
      });
    }
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
    // hd = full quality mp4, sd = mobile mp4
    const hd = urls.hd || urls.sd || '';
    const sd = urls.sd || urls.hd || '';
    // thumbnail = mobile jpg (ideal for card), poster = full poster jpg
    const thumb = urls.thumbnail || urls.poster || '';
    const link = JSON.stringify({
      type: 'reel',
      listId: listId,
      gifId: gif.id || '',
      hd: hd,
      sd: sd,
      poster: thumb,
      hasAudio: gif.hasAudio || false,
      duration: gif.duration || 0,
    });
    return {
      name: gif.userName || gif.id || 'RedGIFs',
      imageUrl: thumb,
      link: link,
      description: (gif.tags || []).slice(0, 5).join(' · '),
    };
  }

  // ── Fetch items from a niche ───────────────────────────────────────────────
  // All reliable endpoints go through /v2/niches/{id}/gifs
  // The generic /v2/gifs/search without search_text returns empty arrays.
  async _nicheGifs(nicheId, order, count, page) {
    const data = await this._apiGet(
      `/v2/niches/${nicheId}/gifs?order=${order}&count=${count}&page=${page}`
    );
    return data.gifs || data.items || [];
  }

  // ── Custom list fetching ───────────────────────────────────────────────────
  async getCustomList(listId, page) {
    const count = 20;

    if (listId === 'trending') {
      // Rotate through niches round-robin so the feed stays fresh
      const nicheIdx = (page - 1) % this._NICHES.length;
      const nicheId  = this._NICHES[nicheIdx].id;
      const gifs = await this._nicheGifs(nicheId, 'trending', count, 1);
      return {
        list: gifs.map(g => this._gifToItem(g, 'trending')),
        hasNextPage: gifs.length >= count,
      };
    }

    if (listId === 'new') {
      const nicheIdx = (page - 1) % this._NICHES.length;
      const nicheId  = this._NICHES[nicheIdx].id;
      const gifs = await this._nicheGifs(nicheId, 'new', count, 1);
      return {
        list: gifs.map(g => this._gifToItem(g, 'new')),
        hasNextPage: gifs.length >= count,
      };
    }

    if (listId === 'catalogue') {
      // Each page cycles through a different niche so catalogue feels infinite
      const catalogueCount = 30;
      const nicheIdx = (page - 1) % this._NICHES.length;
      const nicheId  = this._NICHES[nicheIdx].id;
      const nichePage = Math.floor((page - 1) / this._NICHES.length) + 1;
      const gifs = await this._nicheGifs(nicheId, 'trending', catalogueCount, nichePage);
      return {
        list: gifs.map(g => this._gifToItem(g, 'catalogue')),
        hasNextPage: true, // always more niches to cycle through
      };
    }

    if (listId.startsWith('niche_')) {
      const nicheId = listId.slice(6);
      const gifs = await this._nicheGifs(nicheId, 'trending', count, page);
      return {
        list: gifs.map(g => this._gifToItem(g, listId)),
        hasNextPage: gifs.length >= count,
      };
    }

    // Fallback for seeAll targets
    const order = (listId === 'new' || listId === 'latest') ? 'new' : 'trending';
    const nicheId = this._NICHES[0].id;
    const gifs = await this._nicheGifs(nicheId, order, count, page);
    return {
      list: gifs.map(g => this._gifToItem(g, listId)),
      hasNextPage: gifs.length >= count,
    };
  }

  // ── Standard provider methods ─────────────────────────────────────────────
  get supportsLatest() { return true; }

  async getPopular(page) {
    const nicheId = this._NICHES[(page - 1) % this._NICHES.length].id;
    const gifs = await this._nicheGifs(nicheId, 'trending', 20, 1);
    return {
      list: gifs.map(g => this._gifToItem(g, 'trending')),
      hasNextPage: true,
    };
  }

  async getLatestUpdates(page) {
    const nicheId = this._NICHES[(page - 1) % this._NICHES.length].id;
    const gifs = await this._nicheGifs(nicheId, 'new', 20, 1);
    return {
      list: gifs.map(g => this._gifToItem(g, 'new')),
      hasNextPage: true,
    };
  }

  async search(query, page, filters) {
    // Search endpoint requires search_text — works correctly with a term
    const q = encodeURIComponent(query.trim());
    const data = await this._apiGet(
      `/v2/gifs/search?search_text=${q}&order=trending&count=20&page=${page}`
    );
    const gifs = data.gifs || [];
    return {
      list: gifs.map(g => this._gifToItem(g, 'search_' + q)),
      hasNextPage: gifs.length >= 20,
    };
  }

  // ── Detail (fallback for non-reel flows) ──────────────────────────────────
  async getDetail(url) {
    let gifId = url;
    try { const d = JSON.parse(url); gifId = d.gifId || url; } catch (_) {}
    const data = await this._apiGet(`/v2/gifs/${gifId}`);
    const gif  = data.gif || data;
    const urls = gif.urls || {};
    return {
      name: gif.userName || gifId,
      imageUrl: urls.thumbnail || urls.poster || '',
      description: (gif.tags || []).join(' · '),
      episodes: [{ name: '▶ Watch', url: gifId }],
    };
  }

  // ── Video list (fallback for non-reel flows) ──────────────────────────────
  async getVideoList(url) {
    let gifId = url;
    try { const d = JSON.parse(url); gifId = d.gifId || url; } catch (_) {}
    const data = await this._apiGet(`/v2/gifs/${gifId}`);
    const gif  = data.gif || data;
    const urls = gif.urls || {};
    const videos = [];
    if (urls.hd) videos.push({ url: urls.hd, quality: 'HD',  originalUrl: urls.hd });
    if (urls.sd) videos.push({ url: urls.sd, quality: 'SD',  originalUrl: urls.sd });
    if (!videos.length && urls.gif) videos.push({ url: urls.gif, quality: 'GIF', originalUrl: urls.gif });
    return videos;
  }

  async getPageList(url) { return []; }
  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
