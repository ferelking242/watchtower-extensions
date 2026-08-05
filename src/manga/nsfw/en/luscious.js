const watchtowerSources = [{
  "name": "Luscious",
  "lang": "en",
  "baseUrl": "https://www.luscious.net",
  "apiUrl": "https://www.luscious.net/api/graphql",
  "iconUrl": "https://www.luscious.net/favicon.ico",
  "typeSource": "single",
  "itemType": 0,
  "isManga": true,
  "version": "1.0.0",
  "pkgPath": "manga/nsfw/en/luscious.js",
  "notes": "Luscious — hentai album reader (18+). API GraphQL.",
  "isNsfw": true
}];

const BASE     = "https://www.luscious.net";
const GRAPHQL  = "https://www.luscious.net/api/graphql";
const LIST_Q   = `query AlbumList($input: AlbumListInput!) {
  album { list(input: $input) {
    items { id title cover { url } created modified info { like_count } }
    info { total_items total_pages page }
  }}
}`;
const DETAIL_Q = `query AlbumDetail($id: ID!) {
  album { get(id: $id) {
    id title description cover { url }
    labels { id text }
    pictures { items { url_to_original url } }
  }}
}`;

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": BASE + "/",
      "Content-Type": "application/json",
      "Accept": "application/json"
    };
  }

  async _gql(query, variables) {
    const res = await new Client().post(
      GRAPHQL,
      this.getHeaders(GRAPHQL),
      JSON.stringify({ query, variables })
    );
    return JSON.parse(res.body);
  }

  _fromItem(item) {
    return {
      name: item.title || "Album",
      imageUrl: item.cover?.url || item.thumbnail_url || "",
      link: `${BASE}/albums/${item.id}/`
    };
  }

  async getPopular(page) {
    try {
      const data = await this._gql(LIST_Q, { input: { display: "best_all_time", page, items_per_page: 32 } });
      const list = (data.data?.album?.list?.items || []).map(i => this._fromItem(i));
      const info = data.data?.album?.list?.info || {};
      return { list, hasNextPage: page < (info.total_pages || 1) };
    } catch (_) { return { list: [], hasNextPage: false }; }
  }

  async getLatestUpdates(page) {
    try {
      const data = await this._gql(LIST_Q, { input: { display: "date_newest", page, items_per_page: 32 } });
      const list = (data.data?.album?.list?.items || []).map(i => this._fromItem(i));
      const info = data.data?.album?.list?.info || {};
      return { list, hasNextPage: page < (info.total_pages || 1) };
    } catch (_) { return { list: [], hasNextPage: false }; }
  }

  async search(query, page, filters) {
    try {
      const data = await this._gql(LIST_Q, { input: { display: "date_newest", filters: [{ name: "search_query", value: query }], page, items_per_page: 32 } });
      const list = (data.data?.album?.list?.items || []).map(i => this._fromItem(i));
      const info = data.data?.album?.list?.info || {};
      return { list, hasNextPage: page < (info.total_pages || 1) };
    } catch (_) { return { list: [], hasNextPage: false }; }
  }

  async getDetail(url) {
    const idM = url.match(/\/albums\/(\d+)/);
    if (!idM) return { name: "Album", imageUrl: "", description: "", chapters: [{ name: "Read", url }] };
    const id = idM[1];
    try {
      const data = await this._gql(DETAIL_Q, { id });
      const album = data.data?.album?.get || {};
      const name = album.title || "Album";
      const imageUrl = album.cover?.url || "";
      const description = album.description || "";
      const genre = (album.labels || []).map(l => ({ name: l.text }));
      return { name, imageUrl, description, genre, chapters: [{ name: "Read", url }] };
    } catch (_) {
      return { name: "Album", imageUrl: "", description: "", chapters: [{ name: "Read", url }] };
    }
  }

  async getPageList(url) {
    const idM = url.match(/\/albums\/(\d+)/);
    if (!idM) return [];
    const id = idM[1];
    const pages = [];
    try {
      // Fetch all pictures via GraphQL (paginated)
      let page = 1;
      while (page <= 10) {
        const q = `query AlbumPictures($id: ID!, $page: Int) {
          picture { list(input: { filters: [{ name: "album_id", value: $id }], page: $page, items_per_page: 50 }) {
            items { url_to_original url }
            info { total_pages }
          }}
        }`;
        const data = await this._gql(q, { id, page });
        const items = data.data?.picture?.list?.items || [];
        const totalPages = data.data?.picture?.list?.info?.total_pages || 1;
        for (const pic of items) {
          const u = pic.url_to_original || pic.url || "";
          if (u) pages.push({ url: u, headers: this.getHeaders(url) });
        }
        if (page >= totalPages) break;
        page++;
      }
    } catch (_) {}
    return pages;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
