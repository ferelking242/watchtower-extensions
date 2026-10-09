const watchtowerSources = [{
  "name": "XCOMIC",
  "lang": "all",
  "baseUrl": "https://xcomic.me",
  "apiUrl": "https://xcomic.me",
  "iconUrl": "https://xcomic.me/favicon.ico",
  "typeSource": "single",
  "itemType": 0,
  "isManga": true,
  "version": "1.0.0",
  "login": false,
  "forYou": false,
  "pkgPath": "manga/multi/xcomic.js",
  "notes": "XCOMIC — catalogue multi-langues (titre → éditions par langue). API GraphQL sur /query/. Miroirs : xcomic.me, xcomic.net, comik.to, yona.to."
}];

const BASE_URL = "https://xcomic.me";
const PAGE_SIZE = 24;
const COMIC_PROBES = 5;
const CHAPTER_PAGE_SIZE = 1000;

const TITLE_BROWSE_QUERY = `query get_title_browse($select: Title_Browse_Select) {
  get_title_browse_items(select: $select) {
    id
    data { title cover_local_url cover_url translated_languages }
  }
}`;

const TITLE_BROWSE_PAGER_QUERY = `query get_title_browse_pager($select: Title_Browse_Select) {
  get_title_browse_pager(select: $select) { next total }
}`;

const TITLE_NODE_QUERY = `query get_title_titleNode($id: ID!) {
  get_title_titleNode(id: $id) {
    id
    data {
      id
      title
      alt_titles
      authors
      artists
      description
      status
      type
      year
      cover_local_url
      cover_url
      urlPath
      comic_ids
      translated_languages
    }
  }
}`;

const COMIC_PROBE_QUERY = `query get_comicNode($id: ID!) {
  get_comicNode(id: $id) {
    id
    data {
      subName
      dbStatus
      isPublic
      translatedLanguage
      chaps_normal
      chapterNode_up_to { data { datePublic } }
    }
  }
}`;

const CHAPTER_LIST_QUERY = `query get_comic_chapterList_fullList($select: Select_Comic_ChapterList) {
  get_comic_chapterList_fullList(select: $select) {
    paging { next total }
    items { id data { id dname title urlPath chaNum volNum datePublic } }
  }
}`;

const CHAPTER_PAGES_QUERY = `query get_chapterNode($id: ID!) {
  get_chapterNode(id: $id) { id data { imageUrls } }
}`;

class DefaultExtension extends MProvider {
  getHeaders() {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Origin": BASE_URL,
      "Referer": `${BASE_URL}/`
    };
  }

  _lang() {
    const code = this.source && this.source.lang ? this.source.lang : "all";
    return { "pt-BR": "pt_br", "es-419": "es_419", "zh-Hant": "zh_hk", other: "_t" }[code] || code;
  }

  async _gql(query, variables) {
    const res = await new Client().post(`${BASE_URL}/query/`, JSON.stringify({ query, variables }), this.getHeaders());
    let json = {};
    try { json = JSON.parse(res.body || "{}"); } catch (e) { json = {}; }
    if (json.errors && json.errors.length) throw new Error(json.errors[0].message || "GraphQL error");
    return json.data || {};
  }

  _browseVars(page, word, sortby) {
    const incTLangs = this._lang() === "all" ? [] : [this._lang()];
    return {
      select: {
        page,
        size: PAGE_SIZE,
        init: (page - 1) * PAGE_SIZE,
        where: "browse",
        word: word || "",
        sortby: sortby,
        incTLangs
      }
    };
  }

  _cover(item) {
    const url = (item && (item.cover_local_url || item.cover_url)) || "";
    if (!url) return "";
    return url.startsWith("http") ? url : `${BASE_URL}${url}`;
  }

  async _browse(page, word, sortby) {
    const vars = this._browseVars(page, word, sortby);
    const items = await this._gql(TITLE_BROWSE_QUERY, vars);
    const pager = await this._gql(TITLE_BROWSE_PAGER_QUERY, vars);
    const nodes = items.get_title_browse_items || [];
    const list = nodes.map((n) => ({
      name: (n.data && n.data.title) || n.id,
      imageUrl: this._cover(n.data),
      link: n.id
    }));
    const next = pager.get_title_browse_pager && pager.get_title_browse_pager.next;
    return { list, hasNextPage: typeof next === "number" && next > page };
  }

  async getPopular(page) {
    return this._browse(page, "", "field_score");
  }

  async getLatestUpdates(page) {
    return this._browse(page, "", "field_update");
  }

  async search(query, page) {
    return this._browse(page, (query || "").trim(), "field_score");
  }

  async _titleNode(id) {
    const data = await this._gql(TITLE_NODE_QUERY, { id: String(id) });
    const node = data.get_title_titleNode;
    return node && node.data ? node.data : null;
  }

  async _resolveEditions(title) {
    const ids = (title.comic_ids || []).filter(Boolean).slice(0, COMIC_PROBES);
    if (!ids.length) return [];
    const wanted = this._lang();
    const probes = await Promise.all(ids.map(async (comicId) => {
      try {
        const d = await this._gql(COMIC_PROBE_QUERY, { id: comicId });
        const node = d.get_comicNode && d.get_comicNode.data;
        return node ? { comicId, node } : null;
      } catch (e) { return null; }
    }));
    const editions = probes
      .filter((p) => p && p.node.isPublic !== false && p.node.dbStatus === "normal")
      .filter((p) => wanted === "all" || p.node.translatedLanguage === wanted)
      .map((p) => ({
        comicId: p.comicId,
        label: (p.node.subName || "").trim() || null,
        chaps: p.node.chaps_normal || 0
      }));
    if (editions.length) return editions;
    return ids.slice(0, 1).map((comicId) => ({ comicId, label: null, chaps: 0 }));
  }

  async _chapters(editions) {
    const seen = new Set();
    const chapters = [];
    for (const edition of editions) {
      let json;
      try {
        json = await this._gql(CHAPTER_LIST_QUERY, { select: { comic_id: edition.comicId, page: 1, size: CHAPTER_PAGE_SIZE, sortby: "chapter_desc" } });
      } catch (e) { continue; }
      const block = json.get_comic_chapterList_fullList || {};
      for (const item of block.items || []) {
        const d = item.data || {};
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        let name = d.dname || d.title || "";
        if (edition.label) name = `${name} [${edition.label}]`;
        chapters.push({ name: name || "Chapitre", url: item.id, scanlator: edition.label || "", dateUpload: String(d.datePublic || "") });
      }
    }
    return chapters;
  }

  _status(value) {
    return ({ ongoing: 0, completed: 1, cancelled: 3, hiatus: 2 })[value] ?? 5;
  }

  async getDetail(url) {
    const titleId = String(url).replace(/^https?:\/\/[^/]+\//, "").replace(/^.*\/title\//, "").replace(/\/$/, "");
    const title = await this._titleNode(titleId);
    if (!title) return { name: titleId, imageUrl: "", description: "", genre: [], chapters: [] };
    const editions = await this._resolveEditions(title);
    const chapters = await this._chapters(editions);
    return {
      name: title.title || titleId,
      imageUrl: this._cover(title),
      description: title.description || "",
      author: (title.authors || []).join(", "),
      artist: (title.artists || []).join(", "),
      genre: [],
      status: this._status(title.status),
      chapters
    };
  }

  async getPageList(url) {
    const chapterId = String(url).replace(/^https?:\/\/[^/]+\//, "").replace(/\/$/, "");
    const data = await this._gql(CHAPTER_PAGES_QUERY, { id: chapterId });
    const node = data.get_chapterNode && data.get_chapterNode.data;
    const images = (node && node.imageUrls) || [];
    const headers = { Referer: `${BASE_URL}/` };
    return images.map((imageUrl) => ({
      url: imageUrl.startsWith("http") ? imageUrl : `${BASE_URL}${imageUrl}`,
      headers
    }));
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
