const watchtowerSources = [{
    "name": "Eporner",
    "lang": "en",
    "baseUrl": "https://www.eporner.com",
    "apiUrl": "",
    "iconUrl": "https://www.eporner.com/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.0.1",
    "pkgPath": "eporner/en/en.eporner.js",
    "notes": "Adult content (18+) — ZeusDL powered streaming",
    "isNsfw": true
  }];
  class DefaultExtension extends MProvider {
    getHeaders(url) {
      return { "Referer": "https://www.eporner.com/", "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36" };
    }
    async getPopular(page) {
      const url = `https://www.eporner.com/${page > 1 ? page + "/" : ""}`;
      const res = await new Client().get(url, { headers: this.getHeaders(url) });
      return this._parse(res.body);
    }
    get supportsLatest() { return true; }
    async getLatestUpdates(page) {
      const url = `https://www.eporner.com/new/${page > 1 ? page + "/" : ""}`;
      const res = await new Client().get(url, { headers: this.getHeaders(url) });
      return this._parse(res.body);
    }
    async search(query, page, filters) {
      const q = encodeURIComponent(query.trim());
      const url = `https://www.eporner.com/search/${q}/${page > 1 ? page + "/" : ""}`;
      const res = await new Client().get(url, { headers: this.getHeaders(url) });
      return this._parse(res.body);
    }
    _parse(html) {
      const doc = new Document(html);
      const items = [];
      const cards = doc.select("#categries article, .mb, .mbs");
      for (const card of cards) {
        const a = card.selectFirst("a[href*='/video']");
        if (!a) continue;
        const href = a.attr("href") || "";
        if (!href) continue;
        const title = a.attr("title") || card.selectFirst("strong")?.text || "Unknown";
        const img = card.selectFirst("img");
        const thumb = img?.attr("data-src") || img?.attr("src") || "";
        const dur = card.selectFirst(".duration, .time")?.text?.trim() || "";
        items.push({ name: title.trim(), imageUrl: thumb, link: href.startsWith("http") ? href : "https://www.eporner.com" + href, description: dur ? `Duration: ${dur}` : "" });
      }
      return { list: items, hasNextPage: !!doc.selectFirst(".next, a[rel='next']") };
    }
    async getDetail(url) {
      const res = await new Client().get(url, { headers: this.getHeaders(url) });
      const doc = new Document(res.body);
      const title = doc.selectFirst("h1")?.text || doc.selectFirst('meta[property="og:title"]')?.attr("content") || "Unknown";
      const thumb = doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
      const tags = doc.select(".vtagsc a, .tags a").map(el => ({ name: el.text.trim() }));
      return { name: title.trim(), imageUrl: thumb, description: "", genre: tags, episodes: [{ name: (title && title.trim ? title.trim() : (title || "Watch")), url: url }] };
    }
    async getVideoList(url) {
      const res = await new Client().get(url, { headers: this.getHeaders(url) });
      const html = res.body;
      const videos = [];
      // Watch pages embed: EP.video.player.vid = '<vid>'; EP.video.player.hash = '<32-hex>';
      const vidM = html.match(/EP\.video\.player\.vid\s*=\s*'([^']+)'/);
      const hashM = html.match(/EP\.video\.player\.hash\s*=\s*'([0-9a-f]{32})'/);
      if (vidM && hashM) {
        try {
          const vid = vidM[1];
          const hashed = hashM[1].match(/.{1,8}/g).map((h) => parseInt(h, 16).toString(36)).join("");
          const apiUrl = `https://www.eporner.com/xhr/video/${vid}?hash=${hashed}&domain=www.eporner.com&playerWidth=1280&playerHeight=720&fallback=0&embed=0&supportedFormats=hls,mp4&_=${Date.now()}`;
          const apiRes = await new Client().get(apiUrl, { ...this.getHeaders(url), "X-Requested-With": "XMLHttpRequest", Accept: "application/json, text/javascript, */*; q=0.01" });
          const data = JSON.parse(apiRes.body);
          const sources = data?.sources || {};
          for (const fmt of ["mp4", "hls"]) {
            const group = sources[fmt];
            if (!group) continue;
            for (const [label, entry] of Object.entries(group)) {
              const src = entry?.src || "";
              if (!src || videos.find(v => v.url === src)) continue;
              videos.push({ url: src, quality: String(label).trim() || fmt.toUpperCase(), originalUrl: src, headers: this.getHeaders(url) });
            }
          }
        } catch (_) {}
      }
      if (videos.length === 0) {
        const hlsMatch = html.match(/['"]([^'"]+\.m3u8[^'"]*)['"]/);
        if (hlsMatch) videos.push({ url: hlsMatch[1], quality: "HLS", originalUrl: hlsMatch[1], headers: this.getHeaders(url) });
        const mp4Rx = /['"](https?:[^'"]+\.mp4[^'"]*)['"]/g;
        let m;
        while ((m = mp4Rx.exec(html)) !== null) {
          if (!m[1].includes("ad") && !m[1].includes("banner") && !videos.find(v => v.url === m[1])) {
            videos.push({ url: m[1], quality: "MP4", originalUrl: m[1], headers: this.getHeaders(url) });
            if (videos.length >= 4) break;
          }
        }
      }
      return videos;
    }
    async getPageList(url) { return []; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
  }