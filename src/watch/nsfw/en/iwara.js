const watchtowerSources = [{
  "name": "Iwara",
  "lang": "en",
  "baseUrl": "https://www.iwara.tv",
  "apiUrl": "https://api.iwara.tv",
  "iconUrl": "https://www.iwara.tv/favicon.ico",
  "typeSource": "single",
  "itemType": 1,
  "version": "1.0.0",
  "pkgPath": "watch/nsfw/en/iwara.js",
  "notes": "Iwara.tv — 3D/MMD hentai et ecchi (18+). API JSON officielle.",
  "isNsfw": true
}];

const BASE = "https://www.iwara.tv";
const API  = "https://api.iwara.tv";

class DefaultExtension extends MProvider {
  getHeaders(url) {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Referer": BASE + "/",
      "Accept": "application/json"
    };
  }

  _fromItem(item) {
    const thumb = item.file?.thumbnailUrl ||
      (item.thumbnail != null ? `${API}/image/thumbnail/${item.thumbnail.id}/thumbnail` : "");
    return {
      name: item.title || "Video",
      imageUrl: thumb,
      link: `${BASE}/video/${item.id}`
    };
  }

  async getPopular(page) {
    try {
      const res = await new Client().get(
        `${API}/videos?page=${page - 1}&limit=32&sort=trending&rating=all`,
        this.getHeaders()
      );
      const data = JSON.parse(res.body);
      const list = (data.results || []).map(v => this._fromItem(v));
      return { list, hasNextPage: page < Math.ceil((data.count || 0) / 32) };
    } catch (_) { return { list: [], hasNextPage: false }; }
  }

  async getLatestUpdates(page) {
    try {
      const res = await new Client().get(
        `${API}/videos?page=${page - 1}&limit=32&sort=date&rating=all`,
        this.getHeaders()
      );
      const data = JSON.parse(res.body);
      const list = (data.results || []).map(v => this._fromItem(v));
      return { list, hasNextPage: page < Math.ceil((data.count || 0) / 32) };
    } catch (_) { return { list: [], hasNextPage: false }; }
  }

  async search(query, page, filters) {
    try {
      const q = encodeURIComponent(query);
      const res = await new Client().get(
        `${API}/videos?page=${page - 1}&limit=32&query=${q}&rating=all`,
        this.getHeaders()
      );
      const data = JSON.parse(res.body);
      const list = (data.results || []).map(v => this._fromItem(v));
      return { list, hasNextPage: page < Math.ceil((data.count || 0) / 32) };
    } catch (_) { return { list: [], hasNextPage: false }; }
  }

  async getDetail(url) {
    const idM = url.match(/\/video\/([^/?#]+)/);
    if (!idM) return { name: "Video", imageUrl: "", description: "", episodes: [{ name: "Watch", url }] };
    const id = idM[1];
    try {
      const res = await new Client().get(`${API}/video/${id}`, this.getHeaders());
      const v = JSON.parse(res.body);
      const thumb = v.file?.thumbnailUrl || "";
      const tags = (v.tags || []).map(t => ({ name: t.id || t }));
      const desc = v.body || "";
      return {
        name: v.title || "Video",
        imageUrl: thumb,
        description: desc,
        genre: tags,
        episodes: [{ name: v.title || "Watch", url }]
      };
    } catch (_) {
      return { name: "Video", imageUrl: "", description: "", episodes: [{ name: "Watch", url }] };
    }
  }

  async getVideoList(url) {
    const idM = url.match(/\/video\/([^/?#]+)/);
    if (!idM) return [];
    const id = idM[1];
    const videos = [];
    try {
      const res = await new Client().get(`${API}/video/${id}`, this.getHeaders());
      const v = JSON.parse(res.body);
      // Get file info
      const fileId = v.fileUrl || v.file?.id;
      if (fileId) {
        const fRes = await new Client().get(
          `https://api.iwara.tv/file/video/${id}`,
          { ...this.getHeaders(), "X-Version": fileId }
        );
        const files = JSON.parse(fRes.body);
        for (const f of (files || [])) {
          if (f.src?.view) {
            videos.push({ url: f.src.view, quality: f.name || "Video", originalUrl: f.src.view, headers: this.getHeaders(url) });
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
      while ((m = m3u8Re.exec(html)) !== null)
        videos.push({ url: m[1], quality: "HLS", originalUrl: m[1], headers: this.getHeaders(url) });
    }
    return videos;
  }

  getFilterList() { return []; }
  getSourcePreferences() { return []; }
}
