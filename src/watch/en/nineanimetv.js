const watchtowerSources = [{
      "name": "9AnimeTv",
      "lang": "en",
      "baseUrl": "https://9animetv.to",
      "apiUrl": "",
      "iconUrl": "https://9animetv.to/favicon.ico",
      "typeSource": "single",
      "itemType": 1,
      "version": "0.1.4",
      "pkgPath": "watch/en/nineanimetv.js",
      "notes": "9AnimeTv — Anime streaming (restored)",
      "isNsfw": false
  }];

  class DefaultExtension extends MProvider {
      constructor() { super();}

      getHeaders(url) {
          return {
              "Referer": "https://9animetv.to/",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          };
      }

      get supportsLatest() { return true; }

      async getPopularList(page) {
          const url = "https://9animetv.to/home";
          const res = await new Client().get(url, this.getHeaders(url));
          const doc = new Document(res.body);
          const items = [];
          doc.select(".flw-item").forEach(el => {
              const nameEl = el.selectFirst(".film-name a, h3.film-name a");
              const img = el.selectFirst("img.film-poster-img, img");
              if (!nameEl) return;
              const name = nameEl.text?.trim() || "";
              const href = nameEl.attr("href") || "";
              const cover = img ? (img.attr("data-src") || img.attr("src") || "") : "";
              if (name && href) items.push({ name, imageUrl: cover, link: "https://9animetv.to" + href });
          });
          return { list: items, hasNextPage: false };
      }

      async getLatestList(page) {
          const url = `https://9animetv.to/recently-updated?page=${page}`;
          const res = await new Client().get(url, this.getHeaders(url));
          const doc = new Document(res.body);
          const items = [];
          doc.select(".flw-item").forEach(el => {
              const nameEl = el.selectFirst(".film-name a");
              const img = el.selectFirst("img");
              if (!nameEl) return;
              const name = nameEl.text?.trim() || "";
              const href = nameEl.attr("href") || "";
              const cover = img ? (img.attr("data-src") || img.attr("src") || "") : "";
              if (name && href) items.push({ name, imageUrl: cover, link: "https://9animetv.to" + href });
          });
          const hasNext = !!doc.selectFirst(".pagination .next");
          return { list: items, hasNextPage: hasNext };
      }

      async getSearchList(query, page, filters) {
          const url = `https://9animetv.to/search?keyword=${encodeURIComponent(query)}&page=${page}`;
          const res = await new Client().get(url, this.getHeaders(url));
          const doc = new Document(res.body);
          const items = [];
          doc.select(".flw-item").forEach(el => {
              const nameEl = el.selectFirst(".film-name a");
              const img = el.selectFirst("img");
              if (!nameEl) return;
              const name = nameEl.text?.trim() || "";
              const href = nameEl.attr("href") || "";
              const cover = img ? (img.attr("data-src") || img.attr("src") || "") : "";
              if (name && href) items.push({ name, imageUrl: cover, link: "https://9animetv.to" + href });
          });
          const hasNext = !!doc.selectFirst(".pagination .next");
          return { list: items, hasNextPage: hasNext };
      }

      async getDetail(url) {
          const res = await new Client().get(url, this.getHeaders(url));
          const doc = new Document(res.body);
          const name = doc.selectFirst("h2.film-name, .anisc-detail h2")?.text?.trim() || "";
          const cover = doc.selectFirst("img.film-poster-img")?.attr("src") || "";
          const desc = doc.selectFirst(".film-description .text")?.text?.trim() || "";
          const episodes = [];
          doc.select(".ss-list a.ssl-item.ep-item").forEach(ep => {
              const num = ep.attr("data-number") || ep.text?.trim() || "";
              const href = ep.attr("href") || "";
              if (href) episodes.push({ name: "Episode " + num, url: "https://9animetv.to" + href });
          });
          return { name, imageUrl: cover, description: desc, chapters: episodes };
      }

      async getVideoList(url) {
          const res = await new Client().get(url, this.getHeaders(url));
          const doc = new Document(res.body);
          const servers = [];
          doc.select(".server-item, .ps__-list li").forEach(item => {
              const name = item.text?.trim() || "Server";
              const eid = item.attr("data-id") || "";
              if (eid) servers.push({ quality: name, url: `https://9animetv.to/ajax/episode/servers?episodeId=${eid}` });
          });
          return servers.length > 0 ? servers : [{ quality: "Default", url }];
      }
  }