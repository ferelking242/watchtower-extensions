
  const mangayomiSources = [{
      "name": "FlixGaze",
      "lang": "en",
      "baseUrl": "https://www.flixgaze.com",
      "apiUrl": "",
      "iconUrl": "https://www.flixgaze.com/favicon.ico",
      "typeSource": "single",
      "itemType": 1,
      "version": "1.0.3",
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
        return base + "page/" + page + "/";
      }

      // Extract thumbnail from a card element — tries multiple lazy-load patterns
      _extractThumb(card) {
        const img = card.selectFirst("img");
        if (img) {
          const src = img.attr("data-src") ||
                      img.attr("data-lazy-src") ||
                      img.attr("data-original") ||
                      img.attr("data-bg") ||
                      img.attr("data-url") ||
                      img.attr("src") || "";
          if (src && !src.includes("data:image") && src.length > 10) return src;
        }
        // Try background-image style
        const styled = card.selectFirst("[style*='background']");
        if (styled) {
          const style = styled.attr("style") || "";
          const m = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
          if (m) return m[1];
        }
        return "";
      }

      _parseList(html) {
        const doc = new Document(html);
        const items = [];
        const seen = [];

        // Strategy 1: article cards (most WordPress themes)
        const cards = doc.select("article");
        if (cards && cards.length > 0) {
          for (const card of cards) {
            const anchor = card.selectFirst("a[href]");
            if (!anchor) continue;
            const href = (anchor.attr("href") || "").trim();
            if (!href || !href.includes("flixgaze")) continue;
            if (seen.indexOf(href) >= 0) continue;
            seen.push(href);

            const thumb = this._extractThumb(card);

            const titleEl = card.selectFirst(".entry-title") ||
                            card.selectFirst(".post-title") ||
                            card.selectFirst("h2") ||
                            card.selectFirst("h3") ||
                            card.selectFirst("h1");
            const name = (titleEl && titleEl.text && titleEl.text.trim()) ||
                         (anchor.attr("title") || anchor.attr("aria-label") || "").trim() ||
                         href.split("/").filter(Boolean).pop().replace(/-/g, " ");
            if (!name) continue;

            // Extract genre/category tags from card
            const catEl = card.selectFirst(".cat-links") || card.selectFirst(".entry-cats");
            const genre = catEl ? (catEl.text || "").trim() : "";

            items.push({ name, imageUrl: thumb, link: href, description: genre });
          }
        }

        // Strategy 2: .post-item or .item cards
        if (items.length === 0) {
          const altCards = doc.select(".post-item, .item, .movie-item, .video-item, [class*='post-']");
          if (altCards) {
            for (const card of altCards) {
              const anchor = card.selectFirst("a[href]");
              if (!anchor) continue;
              const href = (anchor.attr("href") || "").trim();
              if (!href || !href.includes("flixgaze") || seen.indexOf(href) >= 0) continue;
              seen.push(href);
              const thumb = this._extractThumb(card);
              const name = (card.selectFirst("h2,h3,h4,.title") || anchor).text.trim() ||
                           href.split("/").filter(Boolean).pop().replace(/-/g, " ");
              if (name) items.push({ name, imageUrl: thumb, link: href, description: "" });
            }
          }
        }

        // Strategy 3: regex fallback
        if (items.length === 0) {
          const re = /href="(https?:\/\/(?:www\.)?flixgaze\.com\/[^"]+\/)"/g;
          let m;
          while ((m = re.exec(html)) !== null) {
            const url = m[1];
            if (seen.indexOf(url) >= 0) continue;
            if (url === this._baseUrl + "/") continue;
            seen.push(url);
            const slug = url.split("/").filter(Boolean).pop().replace(/-/g, " ");
            if (slug) items.push({ name: slug, imageUrl: "", link: url, description: "" });
          }
        }

        const hasNext = html.indexOf('rel="next"') >= 0 ||
                        html.indexOf('"next"') >= 0 ||
                        html.indexOf('class="next"') >= 0 ||
                        html.indexOf('next page') >= 0;
        return { list: items, hasNextPage: hasNext };
      }

      async _fetchPage(url) {
        const res = await new Client().get(url, { headers: this.getHeaders(url) });
        return this._parseList(res.body);
      }

      async getPopular(page) {
        return this._fetchPage(this._buildPageUrl(this._baseUrl + "/movies/", page));
      }

      async getLatestUpdates(page) {
        return this._fetchPage(this._buildPageUrl(this._baseUrl + "/tv-series/", page));
      }

      async search(query, page, filters) {
        // Apply genre/type filters
        let url = "";
        if (filters && filters.length > 0) {
          const genreFilter = filters.find(f => f.state && f.state.length > 0 && f.name === "Genre");
          if (genreFilter && genreFilter.state.length > 0) {
            const genre = genreFilter.state[0].value;
            if (genre) {
              url = this._buildPageUrl(this._baseUrl + "/genre/" + genre + "/", page);
            }
          }
          const typeFilter = filters.find(f => f.name === "Type" && f.state >= 0);
          if (!url && typeFilter && typeFilter.state > 0) {
            const types = ["", "movies", "tv-series"];
            const t = types[typeFilter.state] || "";
            if (t) url = this._buildPageUrl(this._baseUrl + "/" + t + "/", page);
          }
        }
        if (!url) {
          const q = encodeURIComponent((query || "").trim());
          url = this._buildPageUrl(this._baseUrl + "/?s=" + q, page);
        }
        return this._fetchPage(url);
      }

      async getDetail(url) {
        const res = await new Client().get(url, { headers: this.getHeaders(url) });
        const doc = new Document(res.body);

        const ogTitle = doc.selectFirst('meta[property="og:title"]');
        const h1El = doc.selectFirst("h1.entry-title") || doc.selectFirst("h1");
        const title = (ogTitle && ogTitle.attr("content")) ||
                      (h1El && h1El.text && h1El.text.trim()) ||
                      url.split("/").filter(Boolean).pop().replace(/-/g, " ");

        const ogDesc = doc.selectFirst('meta[property="og:description"]');
        const descEl = doc.selectFirst(".entry-content p") || doc.selectFirst(".post-content p");
        const description = (ogDesc && ogDesc.attr("content")) ||
                            (descEl && descEl.text && descEl.text.trim()) || "";

        const ogImg = doc.selectFirst('meta[property="og:image"]');
        const thumbEl = doc.selectFirst(".post-thumbnail img") ||
                        doc.selectFirst(".entry-thumbnail img") ||
                        doc.selectFirst("img.wp-post-image") ||
                        doc.selectFirst(".featured-image img");
        const thumb = (ogImg && ogImg.attr("content")) ||
                      (thumbEl && (thumbEl.attr("data-src") || thumbEl.attr("src") || thumbEl.attr("data-lazy-src"))) || "";

        // Episode / video links
        const episodes = [];
        const epSeen = [];
        const epAnchors = doc.select("a[href]");
        if (epAnchors) {
          for (const a of epAnchors) {
            const href = (a.attr("href") || "").trim();
            if (!href.includes("flixgaze")) continue;
            if (href === url) continue;
            if (epSeen.indexOf(href) >= 0) continue;
            const epName = (a.text && a.text.trim()) || href.split("/").filter(Boolean).pop().replace(/-/g, " ");
            if (!epName || epName.length < 2) continue;
            epSeen.push(href);
            episodes.push({ name: epName, url: href });
          }
        }
        if (episodes.length === 0) {
          episodes.push({ name: "Watch", url });
        }

        // Tags / genres
        const tags = [];
        const tagSelectors = [".cat-links a", ".entry-cats a", ".genre a", ".tags a", "[rel='tag']", ".post-tags a"];
        for (const sel of tagSelectors) {
          const tagEls = doc.select(sel);
          if (tagEls && tagEls.length > 0) {
            for (const t of tagEls) {
              const tn = t.text && t.text.trim();
              if (tn && tags.findIndex(x => x.name === tn) < 0) tags.push({ name: tn });
            }
            break;
          }
        }

        // Rating
        const ratingEl = doc.selectFirst(".rating") || doc.selectFirst("[itemprop='ratingValue']") || doc.selectFirst(".imdb-rating");
        const ratingText = ratingEl ? (ratingEl.attr("content") || ratingEl.text || "").trim() : "";

        return {
          name: title,
          imageUrl: thumb,
          description: description + (ratingText ? "\n\n⭐ " + ratingText : ""),
          genre: tags,
          episodes
        };
      }

      async getVideoList(url) {
        const res = await new Client().get(url, { headers: this.getHeaders(url) });
        const html = res.body;

        // Pattern 1: JWPlayer vars (pathId, domainId, videoId)
        const m = html.match(/const\s+pathId\s*=\s*["']([^"']+)["'][\s\S]*?domainId\s*=\s*["']([^"']+)["'][\s\S]*?videoId\s*=\s*["']([^"']+)["']/);
        if (m) {
          const [, pathId, domainId, videoId] = m;
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

        // Pattern 2: direct m3u8 links
        const m3u8Links = [];
        const re2 = /["'](https?:\/\/[^"']+\.m3u8[^"']*)/g;
        let match;
        while ((match = re2.exec(html)) !== null) {
          if (m3u8Links.indexOf(match[1]) < 0) m3u8Links.push(match[1]);
        }
        if (m3u8Links.length > 0) {
          return m3u8Links.map((u, i) => ({
            url: u,
            quality: "HLS" + (m3u8Links.length > 1 ? " #" + (i + 1) : ""),
            originalUrl: u,
            headers: this.getHeaders(url)
          }));
        }

        // Pattern 3: iframe embed src
        const doc2 = new Document(html);
        const iframe = doc2.selectFirst("iframe[src]");
        if (iframe) {
          const src = iframe.attr("src") || iframe.attr("data-src") || "";
          if (src) {
            return [{ url: src, quality: "Embed", originalUrl: src, headers: this.getHeaders(url) }];
          }
        }

        return [];
      }

      async getPageList(url) { return []; }

      getFilterList() {
        return [
          {
            type_filter: "SelectFilter",
            name: "Type",
            state: 0,
            values: [
              { name: "All", value: "" },
              { name: "Movies", value: "movies" },
              { name: "TV Series", value: "tv-series" }
            ]
          },
          {
            type_filter: "CheckBoxFilter",
            name: "Genre",
            state: [],
            values: [
              { name: "Action", value: "action" },
              { name: "Adventure", value: "adventure" },
              { name: "Animation", value: "animation" },
              { name: "Comedy", value: "comedy" },
              { name: "Crime", value: "crime" },
              { name: "Documentary", value: "documentary" },
              { name: "Drama", value: "drama" },
              { name: "Fantasy", value: "fantasy" },
              { name: "Horror", value: "horror" },
              { name: "Mystery", value: "mystery" },
              { name: "Romance", value: "romance" },
              { name: "Sci-Fi", value: "sci-fi" },
              { name: "Thriller", value: "thriller" },
              { name: "Western", value: "western" }
            ]
          }
        ];
      }

      getSourcePreferences() { return []; }
    }
