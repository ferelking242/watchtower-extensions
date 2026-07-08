// RedGIFs — TikTok-style adult GIF/video feed
// Type: reel — items open in ReelScreen (TikTok-style 3-tab screen)
// API: api.redgifs.com v2 — public temporary token (no account required)
// v1.0.2 — fix: pass headers as flat object to Client().get() (not { headers:{} })

const watchtowerSources = [{
  "name": "RedGIFs",
  "lang": "multi",
  "baseUrl": "https://www.redgifs.com",
  "apiUrl": "https://api.redgifs.com",
  "iconUrl": "https://www.redgifs.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "2.0.1",
  "pkgPath": "nsfw/multi/redgifs.js",
  "notes": "RedGIFs v2.0.1 — fix null creator names; route renamed to reel",
  "isNsfw": true
}];

class DefaultExtension extends MProvider {
  _token = null;
  _tokenExp = 0;

  // Returns a temporary auth token (cached 50 min).
  // Token endpoint works without User-Agent; we keep it minimal.
  async _getToken() {
    const now = Date.now();
    if (this._token && now < this._tokenExp) return this._token;
    try {
      // Pass headers as a flat object — NOT { headers: {...} }
      const res = await new Client().get(
        'https://api.redgifs.com/v2/auth/temporary',
        { 'User-Agent': 'Watchtower/1.0' }
      );
      const json = JSON.parse(res.body);
      if (json.token) {
        this._token = json.token;
        this._tokenExp = now + 50 * 60 * 1000;
        return this._token;
      }
    } catch (_) {}
    return null;
  }

  // All API calls go through here. Returns parsed JSON or throws.
  async _apiGet(path) {
    const token = await this._getToken();
    if (!token) throw new Error('RedGIFs: could not obtain auth token');
    // Flat headers object — the correct format for Watchtower's Client().get()
    const res = await new Client().get(
      'https://api.redgifs.com' + path,
      { 'Authorization': 'Bearer ' + token, 'User-Agent': 'Watchtower/1.0' }
    );
    if (res.statusCode === 401) {
      // Token expired mid-session — refresh once and retry
      this._token = null;
      this._tokenExp = 0;
      return this._apiGet(path);
    }
    return JSON.parse(res.body);
  }

  // 12 popular niches — all confirmed working via /v2/niches/{id}/gifs
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

  getCustomLists() {
    const sections = [];
    for (const n of this._NICHES) {
      sections.push({ id: 'niche_' + n.id, layout: 'category', name: n.name, color: '#1A1A2E' });
    }
    sections.push({ id: 'trending',  layout: 'spotlight', name: '🔥 Trending', color: '#FF3B30', icon: 'local_fire_department', seeAll: 'trending' });
    sections.push({ id: 'new',       layout: 'spotlight', name: '✨ New',      color: '#34C759', icon: 'fiber_new',             seeAll: 'new'      });
    sections.push({ id: 'for_you',       layout: 'spotlight', name: '🎯 Pour toi',  color: '#FF3B5C' });
    sections.push({ id: 'creators_trending', layout: 'ranked', name: '🌟 Créateurs', color: '#5856D6' });
    sections.push({ id: 'catalogue', layout: 'catalogue', name: 'Catalogue' });
    return sections;
  }

  _gifToItem(gif, listId) {
    const urls  = gif.urls || {};
    const hd    = urls.hd || urls.sd || '';
    const sd    = urls.sd || urls.hd || '';
    const thumb = urls.thumbnail || urls.poster || '';
    const link  = JSON.stringify({
      type: 'reel', listId, gifId: gif.id || '',
      hd, sd, poster: thumb,
      hasAudio: gif.hasAudio || false,
      duration: gif.duration || 0,
      width:    gif.width    || 0,
      height:   gif.height   || 0,
      likes:    gif.likes    || 0,
      views:    gif.views    || 0,
      creator:  gif.userName || gif.id || '',
      title:    (gif.tags || []).slice(0, 3).join(' · '),
    });
    return {
      name:        gif.userName || gif.id || 'RedGIFs',
      imageUrl:    thumb,
      link:        link,
      description: (gif.tags || []).slice(0, 5).join(' · '),
    };
  }

  _creatorToItem(creator) {
    return {
      name:        creator.username || creator.name || creator.profileUrl || 'Creator',
      imageUrl:    creator.profileImageUrl || creator.poster || creator.profileUrl || '',
      link:        JSON.stringify({
        type:      'creator',
        username:  creator.username  || '',
        followers: creator.followers || 0,
        totalGifs: creator.nbGifs    || 0,
        verified:  creator.verified  || false,
      }),
      description: (creator.nbGifs || 0) + ' GIFs',
    };
  }

  async _nicheGifs(nicheId, order, count, page) {
    const data = await this._apiGet(
      `/v2/niches/${nicheId}/gifs?order=${order}&count=${count}&page=${page}`
    );
    return data.gifs || data.items || [];
  }

  async getCustomList(listId, page) {
    const count = 20;

    // ── For You feed — trending gifs ──────────────────────────────────────
    if (listId === 'for_you') {
      const data = await this._apiGet(
        '/v2/gifs/trending?count=30&page=' + page
      );
      const gifs = data.gifs || [];
      return { list: gifs.map(g => this._gifToItem(g, 'for_you')), hasNextPage: gifs.length >= 30 };
    }

    // ── Popular creators (Suivis tab) ──────────────────────────────────────
    if (listId === 'creators_trending') {
      const data = await this._apiGet(
        '/v2/creators/search?order=trending&count=20&page=' + page
      );
      const creators = data.items || data.creators || [];
      return { list: creators.map(c => this._creatorToItem(c)), hasNextPage: creators.length >= 20 };
    }

    if (listId === 'trending' || listId === 'new') {
      const order    = listId === 'new' ? 'new' : 'trending';
      const nicheIdx = (page - 1) % this._NICHES.length;
      const gifs     = await this._nicheGifs(this._NICHES[nicheIdx].id, order, count, 1);
      return { list: gifs.map(g => this._gifToItem(g, listId)), hasNextPage: gifs.length >= count };
    }

    if (listId === 'catalogue') {
      const nicheIdx  = (page - 1) % this._NICHES.length;
      const nichePage = Math.floor((page - 1) / this._NICHES.length) + 1;
      const gifs      = await this._nicheGifs(this._NICHES[nicheIdx].id, 'trending', 30, nichePage);
      return { list: gifs.map(g => this._gifToItem(g, 'catalogue')), hasNextPage: true };
    }

    if (listId.startsWith('niche_')) {
      const gifs = await this._nicheGifs(listId.slice(6), 'trending', count, page);
      return { list: gifs.map(g => this._gifToItem(g, listId)), hasNextPage: gifs.length >= count };
    }

    // seeAll fallback
    const gifs = await this._nicheGifs(this._NICHES[0].id, 'trending', count, page);
    return { list: gifs.map(g => this._gifToItem(g, listId)), hasNextPage: gifs.length >= count };
  }

  get supportsLatest() { return true; }

  async getPopular(page) {
    const gifs = await this._nicheGifs(this._NICHES[(page - 1) % this._NICHES.length].id, 'trending', 20, 1);
    return { list: gifs.map(g => this._gifToItem(g, 'trending')), hasNextPage: true };
  }

  async getLatestUpdates(page) {
    const gifs = await this._nicheGifs(this._NICHES[(page - 1) % this._NICHES.length].id, 'new', 20, 1);
    return { list: gifs.map(g => this._gifToItem(g, 'new')), hasNextPage: true };
  }

  async search(query, page, filters) {
    const q    = encodeURIComponent(query.trim());
    const data = await this._apiGet(`/v2/gifs/search?search_text=${q}&order=trending&count=20&page=${page}`);
    const gifs = data.gifs || [];
    return { list: gifs.map(g => this._gifToItem(g, 'search_' + q)), hasNextPage: gifs.length >= 20 };
  }

  async getDetail(url) {
    let gifId = url;
    try { const d = JSON.parse(url); gifId = d.gifId || url; } catch (_) {}
    const data = await this._apiGet(`/v2/gifs/${gifId}`);
    const gif  = data.gif || data;
    const urls = gif.urls || {};
    return {
      name:        gif.userName || gifId,
      imageUrl:    urls.thumbnail || urls.poster || '',
      description: (gif.tags || []).join(' · '),
      episodes:    [{ name: '▶ Watch', url: gifId }],
    };
  }

  async getVideoList(url) {
    let gifId = url;
    try { const d = JSON.parse(url); gifId = d.gifId || url; } catch (_) {}
    const data = await this._apiGet(`/v2/gifs/${gifId}`);
    const gif  = data.gif || data;
    const urls = gif.urls || {};
    const videos = [];
    if (urls.hd)  videos.push({ url: urls.hd,  quality: 'HD',  originalUrl: urls.hd  });
    if (urls.sd)  videos.push({ url: urls.sd,  quality: 'SD',  originalUrl: urls.sd  });
    if (!videos.length && urls.gif) videos.push({ url: urls.gif, quality: 'GIF', originalUrl: urls.gif });
    return videos;
  }

  async getPageList(url) { return []; }
  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
