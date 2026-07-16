const watchtowerSources = [{
      "name": "TNAFlix",
      "lang": "en",
      "baseUrl": "https://www.tnaflix.com",
      "apiUrl": "",
      "iconUrl": "https://www.tnaflix.com/favicon.ico",
      "typeSource": "single",
      "itemType": 1,
      "version": "1.0.2",
      "pkgPath": "tnaflix/en/en.tnaflix.js",
      "notes": "Adult content (18+) — ZeusDL powered streaming",
      "isNsfw": true
    }];
    class DefaultExtension extends MProvider {
      getHeaders(url) {
        return { "Referer": "https://www.tnaflix.com/", "User-Agent": "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36" };
      }
      async getPopular(page) {
        // /top-rated/ returns 404 — homepage shows most-viewed content
        const url = `https://www.tnaflix.com/${page > 1 ? "?page=" + page : ""}`;
        const res = await new Client().get(url, { headers: this.getHeaders(url) });
        return this._parse(res.body);
      }
      get supportsLatest() { return true; }
      async getLatestUpdates(page) {
        const url = `https://www.tnaflix.com/${page > 1 ? "?page=" + page : ""}`;
        const res = await new Client().get(url, { headers: this.getHeaders(url) });
        return this._parse(res.body);
      }
      async search(query, page, filters) {
        const q = encodeURIComponent(query.trim());
        const url = `https://www.tnaflix.com/search-videos/${q}/page${page}`;
        const res = await new Client().get(url, { headers: this.getHeaders(url) });
        return this._parse(res.body);
      }
      _parse(html) {
        const doc = new Document(html);
        const items = [];
        // Each video card is an <a class="thumb video-thumb ..."> element
        // Title is in the img[alt] attribute; duration/quality inside the anchor
        const cards = doc.select("a.video-thumb");
        extLog('info', `TNAFlix._parse: cards=${cards.length} html_len=${html.length}`);
        for (const card of cards) {
          const href = card.attr("href") || "";
          if (!href || !href.includes("tnaflix.com") && !href.startsWith("/")) continue;
          const img = card.selectFirst("img");
          const thumb = img ? (img.attr("src") || img.attr("data-src") || "") : "";
          const title = img ? (img.attr("alt") || "Unknown").trim() : "Unknown";
          const dur  = card.selectFirst(".video-duration") ? card.selectFirst(".video-duration").text.trim() : "";
          const qual = card.selectFirst(".max-quality") ? card.selectFirst(".max-quality").text.trim() : "";
          const desc = [dur, qual].filter(function(x){ return !!x; }).join(" \u00b7 ");
          if (!title || title === "Unknown") continue;
          items.push({
            name: title,
            imageUrl: thumb,
            link: href.startsWith("http") ? href : "https://www.tnaflix.com" + href,
            description: desc
          });
        }
        extLog('info', `TNAFlix._parse: items=${items.length}`);
        return { list: items, hasNextPage: !!doc.selectFirst(".pagination .next, a[rel='next']") };
      }
      async getDetail(url) {
        const res = await new Client().get(url, { headers: this.getHeaders(url) });
        const doc = new Document(res.body);
        const title = doc.selectFirst('meta[property="og:title"]')?.attr("content") || "Unknown";
        const thumb = doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
        const tags = doc.select(".tagsHolder a, .tags a").map(el => ({ name: el.text.trim() }));
        return { name: title, imageUrl: thumb, description: "", genre: tags, episodes: [{ name: (title && title.trim ? title.trim() : (title || "Watch")), url: url }] };
      }
      async getVideoList(url) {
        const res = await new Client().get(url, { headers: this.getHeaders(url) });
        const html = res.body;
        const videos = [];
        const hlsMatch = html.match(/(?:hls|playlist|m3u8)\s*[=:]\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i);
        if (hlsMatch) videos.push({ url: hlsMatch[1], quality: "HLS \u00b7 ZeusDL", originalUrl: hlsMatch[1], headers: this.getHeaders(url) });
        const mp4Rx = /(?:src|videoUrl|file)\s*[=:]\s*['"]([^'"]+\.mp4[^'"]*)['"]/gi;
        let m;
        while ((m = mp4Rx.exec(html)) !== null) {
          if (m[1].startsWith("http")) {
            videos.push({ url: m[1], quality: "MP4 \u00b7 ZeusDL", originalUrl: m[1], headers: this.getHeaders(url) });
            if (videos.length >= 3) break;
          }
        }
        extLog('info', `TNAFlix.getVideoList: ${videos.length} videos`);
        return videos;
      }
      async getPageList(url) { return []; }
      getFilterList() { return []; }
      getSourcePreferences() { return []; }
    }
  