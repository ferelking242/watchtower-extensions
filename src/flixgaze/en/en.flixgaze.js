
  const mangayomiSources = [{
      "name": "FlixGaze",
      "lang": "en",
      "baseUrl": "https://www.flixgaze.com",
      "apiUrl": "",
      "iconUrl": "https://www.flixgaze.com/favicon.ico",
      "typeSource": "single",
      "itemType": 1,
      "version": "1.0.1",
      "pkgPath": "flixgaze/en/en.flixgaze.js",
      "notes": "Movies & TV series — ZeusDL HLS streaming",
      "isNsfw": false
    }];

    class DefaultExtension extends MProvider {
      _baseUrl = "https://www.flixgaze.com";
      _ua = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

      getHeaders(url) {
        return {
          "Referer": this._baseUrl + "/",
          "Origin": this._baseUrl,
          "User-Agent": this._ua
        };
      }

      get supportsLatest() { return true; }

      _buildPageUrl(base, page) {
        if (page <= 1) return base;
        return base + "/page/" + page;
      }

      _parseList(html) {
        const doc = new Document(html);
        const items = [];
        const seen = [];

        // Try standard WordPress card selectors
        const cards = doc.select("article");
        if (cards && cards.length > 0) {
          for (const card of cards) {
            const anchor = card.selectFirst("a[href]");
            if (!anchor) continue;
            const href = anchor.attr("href") || "";
            if (!href || !href.includes("flixgaze.com") || !href.endsWith(".html")) continue;
            if (seen.indexOf(href) >= 0) continue;
            seen.push(href);

            const imgEl = card.selectFirst("img");
            const thumb = (imgEl && (imgEl.attr("data-src") || imgEl.attr("src") || imgEl.attr("data-lazy-src"))) || "";

            const titleEl = card.selectFirst(".entry-title") || card.selectFirst("h2") || card.selectFirst("h3");
            const name = (titleEl && titleEl.text && titleEl.text.trim()) ||
                         (anchor.attr("title") || "").trim() ||
                         href.split("/").pop().replace(".html", "").replace(/-/g, " ");
            if (!name) continue;

            items.push({ name: name, imageUrl: thumb, link: href, description: "" });
          }
        }

        // Fallback: regex on all .html links
        if (items.length === 0) {
          const re = /href="(https:\/\/(?:www\.)?flixgaze\.com\/[^"]+\.html)"/g;
          let m;
          while ((m = re.exec(html)) !== null) {
            const url = m[1];
            if (seen.indexOf(url) >= 0) continue;
            seen.push(url);
            const slug = url.split("/").pop().replace(".html", "").replace(/-/g, " ");
            items.push({ name: slug, imageUrl: "", link: url, description: "" });
          }
        }

        const hasNext = html.indexOf('rel="next"') >= 0 || html.indexOf('class="next"') >= 0;
        return { list: items, hasNextPage: hasNext };
      }

      async _fetchPage(url) {
        const res = await new Client().get(url, { headers: this.getHeaders(url) });
        return this._parseList(res.body);
      }

      async getPopular(page) {
        return this._fetchPage(this._buildPageUrl(this._baseUrl + "/movie", page));
      }

      async getLatestUpdates(page) {
        return this._fetchPage(this._buildPageUrl(this._baseUrl + "/tv-series", page));
      }

      async search(query, page, filters) {
        const q = encodeURIComponent(query.trim());
        return this._fetchPage(this._buildPageUrl(this._baseUrl + "/?s=" + q, page));
      }

      async getDetail(url) {
        const res = await new Client().get(url, { headers: this.getHeaders(url) });
        const doc = new Document(res.body);
        const html = res.body;

        const ogTitle = doc.selectFirst('meta[property="og:title"]');
        const h1El = doc.selectFirst("h1");
        const title = (ogTitle && ogTitle.attr("content")) ||
                      (h1El && h1El.text && h1El.text.trim()) ||
                      url.split("/").pop().replace(".html", "").replace(/-/g, " ");

        const ogDesc = doc.selectFirst('meta[property="og:description"]');
        const descEl = doc.selectFirst(".entry-content p");
        const description = (ogDesc && ogDesc.attr("content")) ||
                            (descEl && descEl.text && descEl.text.trim()) || "";

        const ogImg = doc.selectFirst('meta[property="og:image"]');
        const thumbEl = doc.selectFirst(".post-thumbnail img");
        const thumb = (ogImg && ogImg.attr("content")) ||
                      (thumbEl && (thumbEl.attr("src") || thumbEl.attr("data-src"))) || "";

        // Look for episode links in the page
        const episodes = [];
        const epSeen = [];
        const epAnchors = doc.select("a[href]");
        if (epAnchors) {
          for (const a of epAnchors) {
            const href = a.attr("href") || "";
            if (!href.includes("season-") || !href.includes("episode-") || !href.endsWith(".html")) continue;
            if (epSeen.indexOf(href) >= 0) continue;
            epSeen.push(href);
            const epName = (a.text && a.text.trim()) || href.split("/").pop().replace(".html", "").replace(/-/g, " ");
            episodes.push({ name: epName, url: href });
          }
        }

        if (episodes.length === 0) {
          episodes.push({ name: "Regarder", url: url });
        }

        const tags = [];
        const tagEls = doc.select(".cat-links a");
        if (tagEls) {
          for (const t of tagEls) {
            const tn = t.text && t.text.trim();
            if (tn) tags.push({ name: tn });
          }
        }

        return { name: title, imageUrl: thumb, description: description, genre: tags, episodes: episodes };
      }

      async getVideoList(url) {
        const res = await new Client().get(url, { headers: this.getHeaders(url) });
        const html = res.body;

        // Extract JWPlayer vars: const pathId="...", domainId="...", videoId="..."
        const m = html.match(/const\s+pathId\s*=\s*["']([^"']+)["'][^]*?domainId\s*=\s*["']([^"']+)["'][^]*?videoId\s*=\s*["']([^"']+)["']/);
        if (!m) return [];

        const pathId = m[1];
        const domainId = m[2];
        const videoId = m[3];
        const m3u8 = domainId + "/" + pathId + "/" + videoId + ".m3u8";
        const vtt = domainId + "/" + pathId + "/" + videoId + ".vtt";

        return [{
          url: m3u8,
          quality: "HLS · ZeusDL",
          originalUrl: m3u8,
          headers: this.getHeaders(url),
          subtitles: [{ url: vtt, label: "English" }]
        }];
      }

      async getPageList(url) { return []; }
      getFilterList() { return []; }
      getSourcePreferences() { return []; }
    }
  