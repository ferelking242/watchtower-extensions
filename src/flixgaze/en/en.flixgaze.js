
const mangayomiSources = [{
    "name": "FlixGaze",
    "lang": "en",
    "baseUrl": "https://www.flixgaze.com",
    "apiUrl": "",
    "iconUrl": "https://thumbnails-cloudflare.flixgaze.com/2026/01/flixgaze-logo-2026.svg",
    "typeSource": "single",
    "itemType": 1,
    "version": "1.0.0",
    "pkgPath": "flixgaze/en/en.flixgaze.js",
    "notes": "Movies & TV series (non-adult) — ZeusDL HLS streaming",
    "isNsfw": false
  }];

  class DefaultExtension extends MProvider {
    _baseUrl = "https://www.flixgaze.com";
    _ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    getHeaders(url) {
      return {
        "Referer": this._baseUrl + "/",
        "Origin": this._baseUrl,
        "User-Agent": this._ua
      };
    }

    // ─── Listing helpers ─────────────────────────────────────────────────────

    async _fetchListPage(url) {
      const res = await new Client().get(url, { headers: this.getHeaders(url) });
      return this._parseList(res.body, url);
    }

    _parseList(html, pageUrl) {
      const doc = new Document(html);
      const items = [];
      const seen = new Set();

      // Cards are inside article elements or anchor tags with .html suffix
      const anchors = doc.select("article a[href], .post-thumbnail a[href], h2.entry-title a[href], .entry-title a[href]");
      for (const a of anchors) {
        const href = a.attr("href") || "";
        if (!href.includes("flixgaze.com") || !href.endsWith(".html")) continue;
        if (seen.has(href)) continue;
        seen.add(href);

        // Find associated article for image and title
        const articleEl = a.closest("article") || a.closest(".post");
        let thumb = "";
        let name = a.attr("title") || a.text.trim() || "";

        if (articleEl) {
          const imgEl = articleEl.selectFirst("img");
          thumb = (imgEl && (imgEl.attr("src") || imgEl.attr("data-src") || imgEl.attr("data-lazy-src"))) || "";
          if (!name) {
            const titleEl = articleEl.selectFirst(".entry-title, h2, h3");
            name = titleEl ? titleEl.text.trim() : "";
          }
        }

        if (!name) name = href.split("/").pop().replace(".html", "").replace(/-/g, " ");
        if (!name) continue;

        items.push({
          name,
          imageUrl: thumb,
          link: href,
          description: ""
        });
      }

      // Fallback: scrape all .html links from body text
      if (items.length === 0) {
        const allLinks = [...html.matchAll(/href="(https:\/\/www\.flixgaze\.com\/[^"]+\.html)"/g)];
        const fallbackSeen = new Set();
        for (const [, url] of allLinks) {
          if (fallbackSeen.has(url)) continue;
          fallbackSeen.add(url);
          const slug = url.split("/").slice(-2).join("/").replace(".html", "");
          items.push({ name: slug.replace(/-/g, " "), imageUrl: "", link: url, description: "" });
        }
      }

      const hasNext = !!doc.selectFirst('a[rel="next"], .nav-previous a, .pagination .next');
      return { list: items, hasNextPage: hasNext };
    }

    _buildPageUrl(base, page) {
      if (page <= 1) return base;
      return `${base}/page/${page}`;
    }

    // ─── Provider interface ──────────────────────────────────────────────────

    get supportsLatest() { return true; }

    async getPopular(page) {
      const url = this._buildPageUrl(`${this._baseUrl}/movie`, page);
      return this._fetchListPage(url);
    }

    async getLatestUpdates(page) {
      const url = this._buildPageUrl(`${this._baseUrl}/tv-series`, page);
      return this._fetchListPage(url);
    }

    async search(query, page, filters) {
      const q = encodeURIComponent(query.trim());
      const url = this._buildPageUrl(`${this._baseUrl}/?s=${q}`, page);
      return this._fetchListPage(url);
    }

    // ─── Detail page ─────────────────────────────────────────────────────────

    async getDetail(url) {
      const res = await new Client().get(url, { headers: this.getHeaders(url) });
      const doc = new Document(res.body);
      const html = res.body;

      const title =
        doc.selectFirst('meta[property="og:title"]')?.attr("content") ||
        doc.selectFirst("h1.entry-title, h1")?.text?.trim() ||
        url.split("/").pop().replace(".html", "").replace(/-/g, " ");

      const description =
        doc.selectFirst('meta[property="og:description"]')?.attr("content") ||
        doc.selectFirst(".entry-content p, .synopsis p")?.text?.trim() ||
        "";

      const thumb =
        doc.selectFirst('meta[property="og:image"]')?.attr("content") ||
        doc.selectFirst(".post-thumbnail img, .entry-thumbnail img")?.attr("src") ||
        "";

      // Detect episodes for TV series (multiple episode links on series page)
      const episodeLinks = [];
      const epAnchors = doc.select("a[href]");
      for (const a of epAnchors) {
        const href = a.attr("href") || "";
        if (href.includes("season-") && href.includes("episode-") && href.endsWith(".html")) {
          const epName = a.text.trim() || a.attr("title") || href.split("/").pop().replace(".html", "").replace(/-/g, " ");
          if (epName && !episodeLinks.find(e => e.url === href)) {
            episodeLinks.push({ name: epName, url: href });
          }
        }
      }

      // If this IS an episode page itself or a movie page (no sub-episodes found), treat as single video
      const isEpisodePage = url.includes("season-") && url.includes("episode-");
      const isMoviePage = url.includes("/movie/");

      let episodes;
      if ((isEpisodePage || isMoviePage) || episodeLinks.length === 0) {
        episodes = [{ name: "▶ Watch", url }];
      } else {
        episodes = episodeLinks;
      }

      // Extract genre/tags
      const tags = [];
      for (const el of doc.select(".cat-links a, .tags-links a, .genre a, .wp-tag-cloud a")) {
        const t = el.text.trim();
        if (t) tags.push({ name: t });
      }

      return {
        name: title,
        imageUrl: thumb,
        description,
        genre: tags,
        episodes
      };
    }

    // ─── Video extraction ────────────────────────────────────────────────────

    async getVideoList(url) {
      const res = await new Client().get(url, { headers: this.getHeaders(url) });
      const html = res.body;

      // Extract JWPlayer inline variables
      // const pathId="theboys5/episode1", domainId="https://...", videoId="abc123", posterId="...";
      const match = html.match(/const\s+pathId\s*=\s*["']([\s\S]*?)["'][\s,]*domainId\s*=\s*["']([\s\S]*?)["'][\s,]*videoId\s*=\s*["']([\s\S]*?)["']/);
      if (!match) {
        return [];
      }

      const pathId = match[1].replace(/\\\//g, "/");
      const domainId = match[2].replace(/\\\//g, "/");
      const videoId = match[3].replace(/\\\//g, "/");

      const m3u8Url = `${domainId}/${pathId}/${videoId}.m3u8`;
      const vttUrl = `${domainId}/${pathId}/${videoId}.vtt`;

      return [
        {
          url: m3u8Url,
          quality: "HLS · ZeusDL",
          originalUrl: m3u8Url,
          headers: {
            ...this.getHeaders(url),
            "Origin": "https://www.flixgaze.com"
          },
          subtitles: [{ url: vttUrl, label: "English" }]
        }
      ];
    }

    async getPageList(url) { return []; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
  }
