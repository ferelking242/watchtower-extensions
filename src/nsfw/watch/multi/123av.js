const watchtowerSources = [{
    "name": "123AV",
    "lang": "all",
    "baseUrl": "https://123av.com/en",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/gato404/kegareta-sauces/main/javascript/icon/123av.png",
    "typeSource": "single",
    "itemType": 1,
    "isNsfw": true,
    "version": "0.0.1.3",
    "apiUrl": "",
    "dateFormat": "",
    "dateFormatLocale": "",
    "pkgName": "nsfw/watch/multi/123av.js"
  }];
  
  class DefaultExtension extends MProvider {
    dateStringToTimestamp(dateString) {
      var parts = dateString.split('-');
      var year = parseInt(parts[0]);
      var month = parseInt(parts[1]) - 1;
      var day = parseInt(parts[2]);
      var date = new Date(year, month, day);
      var timestamp = date.getTime();
      return timestamp;
    }
  
    async request(url) {
      const preference = new SharedPreferences();
      const configuredUrl = preference.get("url");
      const configuredLang = preference.get("lang");
      const base = configuredUrl
        ? `${String(configuredUrl).replace(/\/+$/, "")}/${configuredLang || "en"}`
        : this.source.baseUrl;
      const relativeUrl = String(url).replace(/^\/+/, "");
      const res = await new Client().get(new URL(relativeUrl, `${base.replace(/\/+$/, "")}/`).toString());
      return res.body;
    }
  
    async getItems(url) {
      const res = await this.request(url);
      const doc = new Document(res);
      const elements = doc.select(".card");
      const items = [];
      for (const element of elements) {
        const image = element.selectFirst("img");
        const info = element.selectFirst(".card__cover, a[href]");
        if (!info) continue;
        const url = info.attr("href");
        if (!url) continue;
        const cover = image?.attr("data-src") || image?.attr("src") || "";
        const title = element.selectFirst(".card__title, h2, h3")?.text || info.attr("title") || "123AV";
        items.push({
          link: new URL(url, `${this.source.baseUrl.replace(/\/+$/, "")}/`).toString(),
          imageUrl: cover,
          name: title
        });
      }
      return {
        list: items,
          hasNextPage: !!doc.selectFirst("a[rel=next], .pagination a[aria-label=Next], .pagination a.next")
      }
    }
  
    async getPopular(page) {
      return await this.getItems(`hot?page=${page}`);
    }
  
    async getLatestUpdates(page) {
      return await this.getItems(`new?page=${page}`);
    }
  
    async search(query, page, filters) {
      if (query == "") {
        var category, sort;
        for (const filter of filters) {
          if (filter["type"] == "CateFilter") {
            category = filter["values"][filter["state"]]["value"];
          } else if (filter["type"] == "SortFilter") {
            sort = filter["values"][filter["state"]]["value"];
          }
        }
        return await this.getItems(`${category}?sort=${sort}&page=${page}`);
      } else {
        return await this.getItems(`search?keyword=${encodeURIComponent(query)}&page=${page}`);
      }
    }
  
    async getEpisodes(id, time) {
      const res = await this.request(`/ajax/v/${id}/videos`);
      const datas = JSON.parse(res);
      const ep = [];
      for (const data of datas["result"]["watch"]) {
        ep.push({
          name: data["name"],
          url: data["url"],
          dateUpload: time.toString()
        });
      }
      return ep;
    }
  
    async getDetail(url) {
      const res = await this.request(url);
      const doc = new Document(res);
      const title = doc.selectFirst("h1, .watch__title")?.text || "123AV";
      const cover = doc.selectFirst('meta[property="og:image"]')?.attr("content") || "";
      const desc = doc.selectFirst(".watch__desc-text, meta[property=\"og:description\"]")?.text || "";
      const genres = doc.select(".chips a, .watch__info-row a").map(e => e.text).filter(Boolean);
      const playerData = res.match(/x-data="player\(JSON\.parse\('([^']+)'\)\)/);
      let eps = [];
      if (playerData) {
        const encoded = playerData[1]
          .replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
          .replace(/\\\//g, "/");
        try {
          eps = JSON.parse(encoded).map(ep => ({
            name: ep.name || `Episode ${ep.number || ""}`.trim(),
            url: ep.url
          })).filter(ep => ep.url);
        } catch (_) {}
      }
      if (!eps.length) eps = [{ name: title, url }];
      return {
        name: title,
        imageUrl: cover,
        genre: genres,
        description: desc,
        episodes: eps
      };
    }
  
    async getVideoList(url) {
      return [{
        url,
        originalUrl: url,
        quality: "Web player",
        type: "webview",
        kind: "webview",
        headers: { Referer: this.source.baseUrl }
      }];
    }
  
    getFilterList() {
      return [{
          "type": "CateFilter",
          "type_name": "SelectFilter",
          "name": "Category",
          "values": [{
              "value": "recommended",
              "name": "Recommended",
              "type_name": "SelectOption"
            },
            {
              "value": "censored",
              "name": "Censored",
              "type_name": "SelectOption"
            },
            {
              "value": "uncensored",
              "name": "Uncensored",
              "type_name": "SelectOption"
            },
            {
              "value": "uncensored-leaked",
              "name": "Uncensored Leaked",
              "type_name": "SelectOption"
            },
            {
              "value": "vr",
              "name": "VR",
              "type_name": "SelectOption"
            },
            {
              "value": "tags/fc2",
              "name": "FC2",
              "type_name": "SelectOption"
            },
            {
              "value": "tags/heyzo",
              "name": "HEYZO",
              "type_name": "SelectOption"
            },
            {
              "value": "tags/tokyo-hot",
              "name": "Tokyo-Hot",
              "type_name": "SelectOption"
            },
            {
              "value": "tags/1pondo",
              "name": "1pondo",
              "type_name": "SelectOption"
            },
            {
              "value": "tags/caribbeancom",
              "name": "Caribbeancom",
              "type_name": "SelectOption"
            },
            {
              "value": "tags/caribbeancompr",
              "name": "Caribbeancompr",
              "type_name": "SelectOption"
            },
            {
              "value": "tags/10musume",
              "name": "10musume",
              "type_name": "SelectOption"
            },
            {
              "value": "tags/pacopacomama",
              "name": "pacopacomama",
              "type_name": "SelectOption"
            },
            {
              "value": "tags/gachig",
              "name": "Gachinco",
              "type_name": "SelectOption"
            },
            {
              "value": "tags/xxx-av",
              "name": "XXX-AV",
              "type_name": "SelectOption"
            },
            {
              "value": "tags/c0930",
              "name": "C0930",
              "type_name": "SelectOption"
            },
            {
              "value": "tags/h4610",
              "name": "H4610",
              "type_name": "SelectOption"
            },
            {
              "value": "tags/h0930",
              "name": "H0930",
              "type_name": "SelectOption"
            },
            {
              "value": "tags/siro",
              "name": "SIRO",
              "type_name": "SelectOption"
            },
            {
              "value": "tags/259luxu",
              "name": "LUXU",
              "type_name": "SelectOption"
            },
            {
              "value": "tags/200gana",
              "name": "200GANA",
              "type_name": "SelectOption"
            },
            {
              "value": "tags/prestige-premium",
              "name": "PRESTIGE PREMIUM",
              "type_name": "SelectOption"
            },
            {
              "value": "tags/s-cute",
              "name": "S-CUTE",
              "type_name": "SelectOption"
            },
            {
              "value": "tags/261ara",
              "name": "ARA",
              "type_name": "SelectOption"
            }
          ]
        },
        {
          "type": "SortFilter",
          "type_name": "SelectFilter",
          "name": "Sort",
          "values": [{
              "value": "recent_update",
              "name": "Recent Update",
              "type_name": "SelectOption"
            },
            {
              "value": "release_date",
              "name": "Release date",
              "type_name": "SelectOption"
            },
            {
              "value": "trending",
              "name": "Trending",
              "type_name": "SelectOption"
            },
            {
              "value": "most_viewed_today",
              "name": "Most viewed today",
              "type_name": "SelectOption"
            },
            {
              "value": "most_viewed_week",
              "name": "Most viewed by week",
              "type_name": "SelectOption"
            },
            {
              "value": "most_viewed_month",
              "name": "Most viewed by month",
              "type_name": "SelectOption"
            },
            {
              "value": "most_viewed",
              "name": "Most viewed",
              "type_name": "SelectOption"
            }, {
              "value": "most_favourited",
              "name": "Most favourited",
              "type_name": "SelectOption"
            }
          ]
        }
      ];
  
    }
  
    getSourcePreferences() {
      return [{
          "key": "lang",
          "listPreference": {
            "title": "Language",
            "summary": "",
            "valueIndex": 0,
            "entries": ["English", "繁體中文", "日本語", "한국의", "Melayu", "ไทย", "Deutsch", "Français", "Tiếng Việt"],
            "entryValues": ["en", "zh", "ja", "ko", "ms", "th", "de", "fr", "vi"],
          }
        },
        {
          "key": "url",
          "listPreference": {
            "title": "Website Url",
            "summary": "",
            "valueIndex": 0,
            "entries": ["123av", "missav", "javgo", "supjav"],
            "entryValues": ["https://123av.com", "https://missav.li", "https://www.javgo.to", "https://supjav.pro"],
          }
        }
      ];
    }
  }
