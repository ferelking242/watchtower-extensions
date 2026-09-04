const watchtowerSources = [{
    "name": "xHamster",
    "lang": "en",
    "baseUrl": "https://xhamster.com",
    "apiUrl": "",
    "iconUrl": "https://xhamster.com/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.0.1",
    "pkgPath": "xhamster/en/en.xhamster.js",
    "notes": "Adult content (18+) — ZeusDL powered streaming",
    "isNsfw": true
  }];
  class DefaultExtension extends MProvider {
    getHeaders(url) {
      return { "Referer": "https://xhamster.com/", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36", "Accept-Language": "en-US,en;q=0.9", "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8" };
    }
    async getPopular(page) {
      const url = `https://xhamster.com/videos/best?page=${page}`;
      const res = await new Client().get(url, { headers: this.getHeaders(url) });
      return this._parse(res.body);
    }
    get supportsLatest() { return true; }
    async getLatestUpdates(page) {
      const url = `https://xhamster.com/videos/newest?page=${page}`;
      const res = await new Client().get(url, { headers: this.getHeaders(url) });
      return this._parse(res.body);
    }
    async search(query, page, filters) {
      const q = encodeURIComponent(query.trim());
      const url = `https://xhamster.com/search/${q}?page=${page}`;
      const res = await new Client().get(url, { headers: this.getHeaders(url) });
      return this._parse(res.body);
    }
    _parse(html) {
      const doc = new Document(html);
      const items = [];
      const seen = {};
      // Real markup: <a class="video-thumb__image-container" href="/videos/<slug>-xhXX" aria-label="TITLE">
      //   <img class="thumb-image-container__image" src="THUMB" alt="TITLE"/>
      //   ... <div class="thumb-image-container__duration">...</div></a>
      for (const a of doc.select("a.video-thumb__image-container[href*='/videos/']")) {
        const href = a.attr("href") || "";
        if (!href) continue;
        const link = href.startsWith("http") ? href : "https://xhamster.com" + href;
        if (seen[link]) continue;
        seen[link] = 1;
        const img = a.selectFirst("img");
        const title = (img?.attr("alt") || a.attr("aria-label") || a.attr("title") || "").trim();
        const thumb = img?.attr("data-src") || img?.attr("src") || "";
        const dur = a.selectFirst("[data-role='video-duration'], .thumb-image-container__duration")?.text?.replace(/\s+/g, " ").trim() || "";
        if (!title || !title.length) continue;
        items.push({ name: title, imageUrl: thumb, link, description: dur ? `Duration: ${dur}` : "" });
      }
      return { list: items, hasNextPage: !!doc.selectFirst("a[rel='next'], .pager-next, a[href*='page=']") };
    }
    async getDetail(url) {
      const res = await new Client().get(url, { headers: this.getHeaders(url) });
      const doc = new Document(res.body);
      const title = doc.selectFirst('meta[property="og:title"]')?.attr("content") || "Unknown";
      const thumb = doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
      const tags = doc.select(".categories a, .tags-list a").map(el => ({ name: el.text.trim() }));
      return { name: title, imageUrl: thumb, description: "", genre: tags, episodes: [{ name: (title && title.trim ? title.trim() : (title || "Watch")), url: url }] };
    }
    async getVideoList(url) {
      const res = await new Client().get(url, { headers: this.getHeaders(url) });
      const html = res.body;
      const videos = [];
      const jsonMatch = html.match(/xHamster\.initEmbedPlayer\(({.+?})\)/s) || html.match(/"sources"\s*:\s*(\[.+?\])/s);
      if (jsonMatch) {
        try {
          const sources = JSON.parse(jsonMatch[1]);
          const arr = Array.isArray(sources) ? sources : (sources.sources || []);
          for (const s of arr) {
            if (s.url) videos.push({ url: s.url, quality: (s.quality || s.name || "Auto") + " · ZeusDL", originalUrl: s.url, headers: this.getHeaders(url) });
          }
        } catch (_) {}
      }
      if (videos.length === 0) {
        const hlsMatch = html.match(/['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/);
        if (hlsMatch) videos.push({ url: hlsMatch[1], quality: "HLS · ZeusDL", originalUrl: hlsMatch[1], headers: this.getHeaders(url) });
      }
      return videos;
    }
    async getPageList(url) { return []; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
  }