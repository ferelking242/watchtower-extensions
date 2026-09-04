const watchtowerSources = [{
    "name": "RedTube",
    "lang": "en",
    "baseUrl": "https://www.redtube.com",
    "apiUrl": "",
    "iconUrl": "https://www.redtube.com/favicon.ico",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.0.1",
    "pkgPath": "redtube/en/en.redtube.js",
    "notes": "Adult content (18+) — ZeusDL powered streaming",
    "isNsfw": true
  }];
  class DefaultExtension extends MProvider {
    getHeaders(url) {
      return { "Referer": "https://www.redtube.com/", "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36", "Cookie": "age_verified=1" };
    }
    async getPopular(page) {
      const url = `https://www.redtube.com/?order=mostviewed&page=${page}`;
      const res = await new Client().get(url, { headers: this.getHeaders(url) });
      return this._parse(res.body);
    }
    get supportsLatest() { return true; }
    async getLatestUpdates(page) {
      const url = `https://www.redtube.com/?order=newest&page=${page}`;
      const res = await new Client().get(url, { headers: this.getHeaders(url) });
      return this._parse(res.body);
    }
    async search(query, page, filters) {
      const q = encodeURIComponent(query.trim());
      const url = `https://www.redtube.com/?search=${q}&page=${page}`;
      const res = await new Client().get(url, { headers: this.getHeaders(url) });
      return this._parse(res.body);
    }
    _parse(html) {
      const doc = new Document(html);
      const items = [];
      const seen = {};
      // Real markup: <div class="js-pop thumbnail-card videoblock_list" data-video-id="...">
      //   <span class="video_thumb_wrap"><a class="video_link" href="/<id>">
      //     <picture>...<img class="lazy" alt="TITLE" data-src="THUMB"></picture>
      //     <div class="duration">...</div></a></span>
      for (const a of doc.select("span.video_thumb_wrap a.video_link[href]")) {
        const href = a.attr("href") || "";
        if (!href || !/^\/\d+/.test(href)) continue;
        const link = href.startsWith("http") ? href : "https://www.redtube.com" + href;
        if (seen[link]) continue;
        seen[link] = 1;
        const img = a.selectFirst("img");
        const title = (img?.attr("alt") || a.attr("title") || "").trim();
        const thumb = img?.attr("data-src") || img?.attr("data-o_thumb") || img?.attr("src") || "";
        const dur = a.selectFirst(".duration")?.text?.trim() || "";
        if (!title || !title.length) continue;
        items.push({ name: title, imageUrl: thumb, link, description: dur ? `Duration: ${dur}` : "" });
      }
      return { list: items, hasNextPage: !!doc.selectFirst(".next, a[rel='next'], a[href*='page=']") };
    }
    async getDetail(url) {
      const res = await new Client().get(url, { headers: this.getHeaders(url) });
      const doc = new Document(res.body);
      const title = doc.selectFirst('meta[property="og:title"]')?.attr("content") || "Unknown";
      const thumb = doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
      const tags = doc.select(".video_tags a, .tag a").map(el => ({ name: el.text.trim() }));
      return { name: title, imageUrl: thumb, description: "", genre: tags, episodes: [{ name: (title && title.trim ? title.trim() : (title || "Watch")), url: url }] };
    }
    async getVideoList(url) {
      const res = await new Client().get(url, { headers: this.getHeaders(url) });
      const html = res.body;
      const videos = [];
      const seen = {};
      // Watch pages embed: mediaDefinition: [{format:"hls",videoUrl:"\/media\/hls?s=<token>"},
      //                                      {format:"mp4",videoUrl:"\/media\/mp4?s=<token>"}]
      const md = html.match(/mediaDefinition:\s*(\[[\s\S]*?\])\s*,?\s*[}\]"\n]/);
      if (md) {
        try {
          const arr = JSON.parse(md[1].replace(/\\n/g, ""));
          for (const def of arr) {
            const vu = (def.videoUrl || "").replace(/\\\//g, "/");
            if (!vu || seen[vu]) continue;
            seen[vu] = 1;
            const abs = vu.startsWith("http") ? vu : "https://www.redtube.com" + vu;
            const qual = String(def.format || "Auto").toUpperCase();
            videos.push({ url: abs, quality: qual, originalUrl: abs, headers: this.getHeaders(url) });
          }
        } catch (_) {}
      }
      if (videos.length === 0) {
        const qualityRx = /"quality"\s*:\s*"(\d+)"[^}]+"videoUrl"\s*:\s*"([^"]+)"/g;
        let m;
        while ((m = qualityRx.exec(html)) !== null) {
          videos.push({ url: m[2].replace(/\\/g, ""), quality: `${m[1]}p`, originalUrl: m[2].replace(/\\/g, ""), headers: this.getHeaders(url) });
        }
      }
      if (videos.length === 0) {
        const hlsMatch = html.match(/['"](https?:\/\/[^'"]+\.m3u8[^'"]*)['"]/);
        if (hlsMatch) videos.push({ url: hlsMatch[1], quality: "HLS", originalUrl: hlsMatch[1], headers: this.getHeaders(url) });
      }
      return videos;
    }
    async getPageList(url) { return []; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
  }