const watchtowerSources = [{
      "name": "SoundCloud",
      "lang": "en",
      "baseUrl": "https://soundcloud.com",
      "apiUrl": "",
      "iconUrl": "https://soundcloud.com/favicon.ico",
      "typeSource": "single",
      "itemType": 3,
      "version": "1.0.1",
      "pkgPath": "music/en/soundcloud.js",
      "notes": "SoundCloud — Free music streaming",
      "isNsfw": false
  }];

  class DefaultExtension extends MProvider {
      constructor() { super();}

      getHeaders(url) {
          return {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Referer": "https://soundcloud.com/"
          };
      }

      get supportsLatest() { return true; }

      async getPopularList(page) {
          const url = "https://soundcloud.com/charts/top?genre=all-music&country=all-countries";
          const res = await new Client().get(url, this.getHeaders(url));
          const doc = new Document(res.body);
          const items = [];
          doc.select(".chartTrack, .sound__artwork, .trackItem, .chart-track").forEach(el => {
              const nameEl = el.selectFirst("a.trackItem__trackTitle, .sound__header a, a[itemprop='url']");
              const img = el.selectFirst("img, .image__lightOutline span[style]");
              if (!nameEl) return;
              const name = nameEl.text?.trim() || nameEl.attr("title") || "";
              const href = nameEl.attr("href") || "";
              const style = img?.attr("style") || "";
              const coverMatch = style.match(/url\("?([^")]+)"?\)/);
              const cover = img?.attr("src") || (coverMatch ? coverMatch[1] : "");
              if (name && href) items.push({ name, imageUrl: cover, link: "https://soundcloud.com" + href });
          });
          return { list: items, hasNextPage: false };
      }

      async getLatestList(page) {
          const url = "https://soundcloud.com/charts/new?genre=all-music&country=all-countries";
          const res = await new Client().get(url, this.getHeaders(url));
          const doc = new Document(res.body);
          const items = [];
          doc.select(".chartTrack, .sound__artwork").forEach(el => {
              const nameEl = el.selectFirst("a.trackItem__trackTitle, a[itemprop='url']");
              const img = el.selectFirst("img");
              if (!nameEl) return;
              const name = nameEl.text?.trim() || "";
              const href = nameEl.attr("href") || "";
              const cover = img?.attr("src") || "";
              if (name && href) items.push({ name, imageUrl: cover, link: "https://soundcloud.com" + href });
          });
          return { list: items, hasNextPage: false };
      }

      async getSearchList(query, page, filters) {
          const url = `https://soundcloud.com/search/sounds?q=${encodeURIComponent(query)}&page=${page}`;
          const res = await new Client().get(url, this.getHeaders(url));
          const doc = new Document(res.body);
          const items = [];
          doc.select(".searchList__item, .sound__header").forEach(el => {
              const nameEl = el.selectFirst("a.soundTitle__title, h2 a, .sound__header a");
              const img = el.selectFirst("img");
              if (!nameEl) return;
              const name = nameEl.text?.trim() || "";
              const href = nameEl.attr("href") || "";
              const cover = img?.attr("src") || "";
              if (name && href) items.push({ name, imageUrl: cover, link: "https://soundcloud.com" + href });
          });
          const hasNext = !!doc.selectFirst(".pagerNext, [rel='next']");
          return { list: items, hasNextPage: hasNext };
      }

      async getDetail(url) {
          const res = await new Client().get(url, this.getHeaders(url));
          const doc = new Document(res.body);
          const name = doc.selectFirst("h1.soundTitle__title, h1[itemprop='name']")?.text?.trim() || "";
          const cover = doc.selectFirst("meta[property='og:image']")?.attr("content") || "";
          const desc = doc.selectFirst("meta[property='og:description']")?.attr("content") || "";
          return {
              name, imageUrl: cover, description: desc,
              chapters: [{ name: "Play", url }]
          };
      }

      async getVideoList(url) {
          return [{ quality: "Stream", url }];
      }
  }