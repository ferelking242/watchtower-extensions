// RedGIFs — TikTok-style adult GIF/video feed
// Type: reel — items open in ReelScreen (TikTok-style 3-tab screen)
// API: api.redgifs.com v2 — public temporary token (no account required)
// v2.2.0 — tags, creatorAvatar, verified, creator feed, profil créateur

const watchtowerSources = [{
  "name": "RedGIFs",
  "lang": "multi",
  "baseUrl": "https://www.redgifs.com",
  "apiUrl": "https://api.redgifs.com",
  "iconUrl": "https://www.redgifs.com/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "2.2.0",
  "pkgPath": "nsfw/multi/redgifs.js",
  "notes": "RedGIFs v2.2.0 — tags, creatorAvatar, verified, creator feed, profil créateur",
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
  _gifToItem(gif, listId) {
    const urls          = gif.urls || {};
    const hd            = urls.hd || urls.sd || '';
    const sd            = urls.sd || urls.hd || '';
    const thumb         = urls.thumbnail || urls.poster || '';
    const creatorAvatar = gif.userProfileImageUrl || gif.profileImageUrl || '';
    const tags          = (gif.tags || []).slice(0, 8);
    const link  = JSON.stringify({
      type: 'reel', listId, gifId: gif.id || '',
      hd, sd, poster: thumb,
      hasAudio:      gif.hasAudio  || false,
      duration:      gif.duration  || 0,
      width:         gif.width     || 0,
      height:        gif.height    || 0,
      likes:         gif.likes     || 0,
      views:         gif.views     || 0,
      creator:       gif.userName  || gif.id || '',
      creatorAvatar: creatorAvatar,
      verified:      gif.verified  || false,
      tags:          tags,
      title:         tags.slice(0, 3).join(' · '),
    });
    return {
      name:        gif.userName || gif.id || 'RedGIFs',
      imageUrl:    thumb,
      link:        link,
      description: tags.slice(0, 5).join(' · '),
    };
  }

  // The creator-search endpoint has no dedicated banner field — we reuse the
  // profile picture (cropped) as a banner background so cards never look empty.
  _creatorToItem(creator) {
    const avatar = creator.profileImageUrl || creator.poster || '';
    return {
      name:        creator.username || creator.name || creator.profileUrl || 'Creator',
      imageUrl:    avatar,
      link:        JSON.stringify({
        type:       'creator',
        username:   creator.username    || creator.name || '',
        followers:  creator.followers   || 0,
        following:  creator.following   || 0,
        totalGifs:  creator.gifs        || creator.nbGifs || 0,
        verified:   creator.verified    || false,
        description: creator.description || '',
        bannerUrl:  avatar,
        profileUrl: creator.profileUrl  || '',
      }),
      description: (creator.gifs || creator.nbGifs || 0) + ' GIFs',
    };
  }

  _nicheToItem(n) {
    return {
      name:        n.name || n.id,
      imageUrl:    n.thumbnail || '',
      link:        JSON.stringify({
        type:        'niche',
        nicheId:     n.id,
        subscribers: n.subscribers || 0,
        gifs:        n.gifs        || 0,
        tags:        (n.tags || []).slice(0, 4),
      }),
      description: (n.tags || []).slice(0, 3).join(' · '),
    };
  }

  async _nicheGifs(nicheId, order, count, page, type) {
    const t = type ? `&type=${type}` : '';
    const data = await this._apiGet(
      `/v2/niches/${nicheId}/gifs?order=${order}&count=${count}&page=${page}${t}`
    );
    return data.gifs || data.items || [];
  }

  // ── Preference helpers ───────────────────────────────────────────────────
  // `preference` is a global bridged object — preference.get(key) reads the
  // value the user picked in Extensions → RedGIFs → Préférences.
  _pref(key, fallback) {
    try {
      const v = preference.get(key);
      return v === null || v === undefined || v === '' ? fallback : v;
    } catch (_) { return fallback; }
  }

  get _prefSort()  { return this._pref('default_sort', 'trending'); }
  get _prefCount() { return parseInt(this._pref('results_per_page', '20'), 10) || 20; }

  getSourcePreferences() {
    return [
      {
        key: 'default_sort',
        listPreference: {
          title: 'Tri par défaut',
          summary: "Ordre utilisé pour Explorer, Pour toi et les niches",
          valueIndex: 0,
          entries: ['Tendances', 'Nouveau'],
          entryValues: ['trending', 'new'],
        },
      },
      {
        key: 'content_quality',
        listPreference: {
          title: 'Qualité vidéo',
          summary: 'Résolution utilisée en priorité pour la lecture',
          valueIndex: 0,
          entries: ['HD', 'SD (économise de la donnée)'],
          entryValues: ['hd', 'sd'],
        },
      },
      {
        key: 'results_per_page',
        listPreference: {
          title: 'Résultats par page',
          summary: "Nombre d'éléments chargés à chaque défilement",
          valueIndex: 1,
          entries: ['15', '20', '30'],
          entryValues: ['15', '20', '30'],
        },
      },
    ];
  }

  async getCustomList(listId, page) {
    const count = this._prefCount;

    // ── For You feed — mix trending gifs from 3 niches per page ─────────────
    // /v2/gifs/trending no longer exists (405). We rotate across niches instead
    // to give a varied "for you" feel without requiring a working global endpoint.
    if (listId === 'for_you') {
      const perNiche  = 10;
      const base      = ((page - 1) * 3) % this._NICHES.length;
      const picks     = [base, (base + 1) % this._NICHES.length, (base + 2) % this._NICHES.length];
      const nicheGifs = await Promise.all(
        picks.map(i => this._nicheGifs(this._NICHES[i].id, 'trending', perNiche, 1))
      );
      // interleave: 1 from each niche in turn
      const merged = [];
      const maxLen  = Math.max(...nicheGifs.map(a => a.length));
      for (let i = 0; i < maxLen; i++) {
        for (const arr of nicheGifs) { if (i < arr.length) merged.push(arr[i]); }
      }
      return { list: merged.map(g => this._gifToItem(g, 'for_you')), hasNextPage: true };
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

    // ── Explorer tab — GIF-only / Image-only feeds, mixed across niches ─────
    if (listId === 'explorer_gif' || listId === 'explorer_image') {
      const mediaType = listId === 'explorer_image' ? 'i' : 'g';
      const base   = ((page - 1) * 2) % this._NICHES.length;
      const picks  = [base, (base + 1) % this._NICHES.length];
      const groups = await Promise.all(
        picks.map(i => this._nicheGifs(this._NICHES[i].id, this._prefSort, Math.ceil(count / 2), 1, mediaType))
      );
      const merged  = [];
      const maxLen  = Math.max(...groups.map(a => a.length), 0);
      for (let i = 0; i < maxLen; i++) {
        for (const arr of groups) { if (i < arr.length) merged.push(arr[i]); }
      }
      return { list: merged.map(g => this._gifToItem(g, listId)), hasNextPage: true };
    }

    // ── Niches directory (flame icon screen) ─────────────────────────────────
    if (listId === 'niches_list') {
      const data   = await this._apiGet(`/v2/niches?count=30&page=${page}`);
      const niches = data.niches || [];
      return { list: niches.map(n => this._nicheToItem(n)), hasNextPage: (data.page || page) < (data.pages || 1) };
    }

    // ── Creator feed for CreatorProfileScreen ────────────────────────────────
    if (listId.startsWith('creator_')) {
      const username = listId.slice(8);
      try {
        const data = await this._apiGet(
          '/v2/users/' + encodeURIComponent(username) + '/search?order=trending&count=20&page=' + page
        );
        const gifs = data.gifs || [];
        if (gifs.length > 0) {
          return { list: gifs.map(g => this._gifToItem(g, listId)), hasNextPage: gifs.length >= 20 };
        }
      } catch (_) {}
      // Fallback: tag search by username
      const fallback = await this._apiGet(
        '/v2/gifs/search?search_text=' + encodeURIComponent(username) + '&order=trending&count=20&page=' + page
      );
      const fb = fallback.gifs || [];
      return { list: fb.map(g => this._gifToItem(g, listId)), hasNextPage: fb.length >= 20 };
    }

    if (listId.startsWith('niche_')) {
      const gifs = await this._nicheGifs(listId.slice(6), this._prefSort, count, page);
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
}
