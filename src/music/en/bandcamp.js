const watchtowerSources = [{
      "name": "Bandcamp",
      "lang": "en",
      "baseUrl": "https://bandcamp.com",
      "apiUrl": "",
      "iconUrl": "https://s4.bcbits.com/img/favicon/favicon-32x32.png",
      "typeSource": "single",
      "itemType": 3,
      "version": "1.0.3",
      "pkgPath": "music/en/bandcamp.js",
      "notes": "Bandcamp — Independent artists & albums",
      "isNsfw": false
  }];

  class DefaultExtension extends MProvider {
      constructor() { super();}
      getHeaders(url) { return { "User-Agent": "Mozilla/5.0", "Referer": "https://bandcamp.com/" }; }
      get supportsLatest() { return true; }

      async getPopularList(page) {
          const url = "https://bandcamp.com/discover";
          const res = await new Client().get(url, this.getHeaders(url));
          const doc = new Document(res.body);
          const items = [];
          doc.select(".discover-item, .col.col-3-12").forEach(el => {
              const nameEl = el.selectFirst("p.title, .itemTitle");
              const img = el.selectFirst("img");
              const link = el.selectFirst("a");
              if (!nameEl || !link) return;
              items.push({ name: nameEl.text?.trim() || "", imageUrl: img?.attr("data-src") || img?.attr("src") || "", link: link.attr("href") || "" });
          });
          return { list: items.slice(0, this._limit()), hasNextPage: false };
      }

      async getLatestList(page) { return this.getPopularList(page); }

      async getSearchList(query, page, filters) {
          const url = `https://bandcamp.com/search?q=${encodeURIComponent(query)}&page=${page}&item_type=t`;
          const res = await new Client().get(url, this.getHeaders(url));
          const doc = new Document(res.body);
          const items = [];
          doc.select(".result-info, li.searchresult").forEach(el => {
              const nameEl = el.selectFirst(".heading a, .itemTitle a");
              const img = el.selectFirst("img");
              if (!nameEl) return;
              items.push({ name: nameEl.text?.trim() || "", imageUrl: img?.attr("src") || "", link: nameEl.attr("href") || "" });
          });
          const hasNext = !!doc.selectFirst(".next");
          return { list: items.slice(0, this._limit()), hasNextPage: hasNext };
      }

      async getDetail(url) {
          const res = await new Client().get(url, this.getHeaders(url));
          const doc = new Document(res.body);
          const name = doc.selectFirst("h2.trackTitle, h2#name-section")?.text?.trim() || "";
          const cover = doc.selectFirst("div#tralbumArt img")?.attr("src") || "";
          const desc = doc.selectFirst("meta[name='description']")?.attr("content") || "";
          const tracks = [];
          doc.select("table.track_list tr.track_row_view").forEach(tr => {
              const titleEl = tr.selectFirst(".title-col .track-title, .title");
              if (!titleEl) return;
              const href = tr.selectFirst("a")?.attr("href") || "";
              tracks.push({ name: titleEl.text?.trim() || "", url: href || url });
          });
          return { name, imageUrl: cover, description: desc, chapters: tracks.length ? tracks : [{ name: "Play", url }] };
      }

      _limit() {
          try {
              const v = parseInt(new SharedPreferences().get("page_size"), 10);
              if (v && v > 0) return v;
          } catch (_) {}
          return 20;
      }

      async getVideoList(url) { return [{ quality: "Stream", url }]; }

      getSourcePreferences() {
          return [
              {
                  key: "page_size",
                  listPreference: {
                      title: "Résultats par page",
                      summary: "Nombre de titres affichés par liste (découvertes, recherche)",
                      valueIndex: 1,
                      entries: ["10", "20 (recommandé)", "30", "50"],
                      entryValues: ["10", "20", "30", "50"]
                  }
              }
          ];
      }
  }