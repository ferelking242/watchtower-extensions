const watchtowerSources = [{
  "name": "Hanime.tv",
  "lang": "en",
  "baseUrl": "https://hanime.tv",
  "apiUrl": "https://api.hanime.tv",
  "iconUrl": "https://hanime.tv/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.0",
  "pkgPath": "watch/nsfw/en/hanimedottv.js",
  "notes": "Hanime.tv — premier hentai streaming (18+). API JSON officielle.",
  "isNsfw": true
}];

const BASE    = "https://hanime.tv";
const API     = "https://api.hanime.tv";

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": BASE + "/",
      "Origin": BASE
    };
  }

  _fromItem(item) {
    return {
      name: item.name || item.title || "Hentai",
      imageUrl: item.poster_url || item.cover_url || item.image || "",
      link: `${BASE}/videos/hentai/${item.slug || item.id}`
    };
  }

  async getPopular(page) {
    try {
      const res = await new Client().get(
        `${API}/api/v8/hentai-videos?order_by=hits&page=${page - 1}&limit=36&tags_excluded=`,
        this.getHeaders()
      );
      const data = JSON.parse(res.body);
      const list = (data.hentai_videos || data.data || []).map(i => this._fromItem(i));
      return { list, hasNextPage: list.length >= 36 };
    } catch (_) {
      return { list: [], hasNextPage: false };
    }
  }

  async getLatestUpdates(page) {
    try {
      const res = await new Client().get(
        `${API}/api/v8/hentai-videos?order_by=created_at_unix&page=${page - 1}&limit=36`,
        this.getHeaders()
      );
      const data = JSON.parse(res.body);
      const list = (data.hentai_videos || data.data || []).map(i => this._fromItem(i));
      return { list, hasNextPage: list.length >= 36 };
    } catch (_) {
      return { list: [], hasNextPage: false };
    }
  }

  async search(query, page, filters) {
    try {
      const res = await new Client().get(
        `${API}/api/v8/search/hentai?search_text=${encodeURIComponent(query)}&page=${page - 1}&limit=36`,
        this.getHeaders()
      );
      const data = JSON.parse(res.body);
      const list = (data.hentai_videos || data.hits || data.data || []).map(i => this._fromItem(i));
      return { list, hasNextPage: list.length >= 36 };
    } catch (_) {
      return { list: [], hasNextPage: false };
    }
  }

  async getDetail(url) {
    // Extract slug from URL
    const slug = url.replace(/.*\/videos\/hentai\//, "").replace(/\/+$/, "");
    let title = slug.replace(/-/g, " ");
    let thumb = "";
    let desc  = "";
    let tags  = [];
    let streams = [];
    try {
      const res = await new Client().get(
        `${API}/api/v8/video?id=${slug}`,
        this.getHeaders()
      );
      const data = JSON.parse(res.body);
      const hv   = data.hentai_video || data;
      title      = hv.name || hv.title || title;
      thumb      = hv.poster_url || hv.cover_url || "";
      desc       = hv.description || hv.summary || "";
      tags       = (hv.hentai_tags || hv.tags || []).map(t => ({ name: t.text || t.name || t }));
      streams    = hv.videos_manifest?.servers || [];
    } catch (_) {}
    return {
      name: title,
      imageUrl: thumb,
      description: desc,
      genre: tags,
      episodes: [{ name: title, url }]
    };
  }

  async getVideoList(url) {
    const slug = url.replace(/.*\/videos\/hentai\//, "").replace(/\/+$/, "");
    const videos = [];
    try {
      const res = await new Client().get(`${API}/api/v8/video?id=${slug}`, this.getHeaders());
      const data = JSON.parse(res.body);
      const manifest = data.videos_manifest || data.hentai_video?.videos_manifest;
      if (manifest && manifest.servers) {
        for (const server of manifest.servers) {
          for (const stream of server.streams || []) {
            const q = stream.height ? `${stream.height}p` : (stream.url?.includes("m3u8") ? "HLS" : "MP4");
            videos.push({ url: stream.url, quality: q, originalUrl: stream.url, headers: this.getHeaders(url) });
          }
        }
      }
    } catch (_) {}
    // Fallback: parse HTML
    if (videos.length === 0) {
      const res = await new Client().get(url, this.getHeaders(url));
      const html = res.body;
      const m3u8Re = /["'](https?:\/\/[^"']+\.m3u8[^"']*)['"]/gi;
      let m;
      while ((m = m3u8Re.exec(html)) !== null) {
        videos.push({ url: m[1], quality: "HLS", originalUrl: m[1], headers: this.getHeaders(url) });
      }
    }
    return videos;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
