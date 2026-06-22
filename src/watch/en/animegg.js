const watchtowerSources = [
    {
      "name": "AnimeGG",
      "lang": "en",
      "id": 209614032,
      "baseUrl": "https://www.animegg.org",
      "apiUrl": "",
      "iconUrl":
        "https://www.google.com/s2/favicons?sz=256&domain=https://www.animegg.org/",
      "typeSource": "single",
      "itemType": 1,
      "version": "1.0.9",
      "pkgPath": "anime/src/en/animegg.js"
    }
  ];

  // Authors: - Swakshan (updated episode detection)

  const BASE_URL = "https://www.animegg.org";

  class DefaultExtension extends MProvider {
    constructor() {
      super();
    }

    getHeaders(url) {
      return {
        Referer: BASE_URL,
        Origin: BASE_URL,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      };
    }

    getPreference(key) {
      return parseInt(new SharedPreferences().get(key));
    }

    async requestText(slug) {
      const url = slug.startsWith("http") ? slug : `${BASE_URL}${slug}`;
      var res = await new Client().get(url, this.getHeaders());
      return res.body;
    }
    async request(slug) {
      return new Document(await this.requestText(slug));
    }

    async fetchPopularnLatest(slug) {
      var body = await this.request(slug);
      var items = body.select("li.fea");
      var list = [];
      var hasNextPage = true;
      if (items.length > 0) {
        for (var item of items) {
          var imageUrl = item.selectFirst("img").getSrc;
          var linkSection = item.selectFirst(".rightpop").selectFirst("a");
          var link = linkSection.getHref;
          var name = linkSection.text;
          list.push({ name, imageUrl, link });
        }
      } else {
        hasNextPage = false;
      }
      return { list, hasNextPage };
    }

    async getPopular(page) {
      var start = (page - 1) * 25;
      var limit = start + 25;
      var category = "";
      var pop = this.getPreference("animegg_popular_category");
      switch (pop) {
        case 1: category = "sortBy=createdAt&sortDirection=DESC&"; break;
        case 2: category = "ongoing=true&"; break;
        case 3: category = "ongoing=false&"; break;
        case 4: category = "sortBy=sortLetter&sortDirection=ASC&"; break;
      }
      var slug = `/popular-series?${category}start=${start}&limit=${limit}`;
      return await this.fetchPopularnLatest(slug);
    }

    get supportsLatest() { return true; }

    async getLatestUpdates(page) {
      var start = (page - 1) * 25;
      var limit = start + 25;
      var slug = `/releases?start=${start}&limit=${limit}`;
      return await this.fetchPopularnLatest(slug);
    }

    async search(query, page, filters) {
      var slug = `/search?q=${encodeURIComponent(query)}`;
      var body = await this.request(slug);
      var items = body.select(".moose.page > a");
      if (!items || items.length === 0) items = body.select(".anime-list a");
      if (!items || items.length === 0) items = body.select(".search-result a");
      var list = [];
      for (var item of items) {
        try {
          var imageUrl = item.selectFirst("img") ? item.selectFirst("img").getSrc : "";
          var link = item.getHref;
          var nameEl = item.selectFirst("h2") || item.selectFirst(".title") || item.selectFirst("span");
          var name = nameEl ? nameEl.text : item.text;
          if (name && name.trim()) list.push({ name: name.trim(), imageUrl, link });
        } catch(e) {}
      }
      return { list, hasNextPage: false };
    }

    statusCode(status) {
      return ({ Ongoing: 0, Completed: 1 }[status] ?? 5);
    }

    async getDetail(url) {
      var baseUrl = BASE_URL;
      var slug = url.replace(baseUrl, "");
      var link = baseUrl + slug;
      var body = await this.request(slug);
      var html = await this.requestText(slug);

      var media = body.selectFirst(".media");
      var title = media ? media.selectFirst("h1").text : (body.selectFirst("h1") ? body.selectFirst("h1").text : "");
      var statusText = "";
      try {
        var spans = media ? media.selectFirst("p.infoami").select("span") : [];
        if (spans && spans.length) statusText = spans[spans.length - 1].text.replace("Status: ", "");
      } catch(e) {}
      var status = this.statusCode(statusText);

      var tagscat = body.select(".tagscat > li");
      var genre = [];
      if (tagscat) tagscat.forEach((tag) => genre.push(tag.text));

      var description = "";
      try {
        description = body.selectFirst("p.ptext") ? body.selectFirst("p.ptext").text : "";
      } catch(e) {}

      var chapters = [];

      // ââ Strategy 1: Try all known selector patterns ââ
      const selectors = [
        ".newmanga > li",
        ".ep-list > li",
        ".episodes-list > li",
        "ul.episodes > li",
        ".episode-list > li",
        ".eps-list > li",
        ".episode_list li",
        ".episodes li",
        ".ep_list li",
        "ul.episode-list li",
        "#episode-list li",
        ".ep-box li",
        ".animegg-episodes li",
        ".ep-container li",
        "li.ep-item",
        "li.episode",
        ".anime-episodes li",
      ];

      var episodesList = null;
      for (const sel of selectors) {
        try {
          const found = body.select(sel);
          if (found && found.length > 0) {
            episodesList = found;
            break;
          }
        } catch(e) {}
      }

      if (episodesList && episodesList.length > 0) {
        episodesList.forEach((ep) => {
          try {
            var epTitleEl = ep.selectFirst("i.anititle") || ep.selectFirst(".ep-title") || ep.selectFirst("span.title");
            var epTitle = epTitleEl ? epTitleEl.text.trim() : "";
            var strongEl = ep.selectFirst("strong") || ep.selectFirst(".ep-num");
            var epNumber = strongEl ? strongEl.text.replace(title, "Episode").trim() : "";
            var epName = (epNumber && epTitle && epNumber !== epTitle)
              ? `${epNumber} - ${epTitle}`
              : (epNumber || epTitle || "");
            var aEl = ep.selectFirst("a");
            if (!aEl) return;
            var epUrl = aEl.getHref;
            if (!epUrl) return;
            if (!epUrl.startsWith("http")) epUrl = baseUrl + epUrl;
            if (!epName) epName = aEl.text.trim() || `Episode`;

            var scanlator = "";
            var type = ep.select("span.btn-xs");
            if (type && type.length) type.forEach((t) => { scanlator += t.text + ", "; });
            scanlator = scanlator.slice(0, -2);

            chapters.push({ name: epName, url: epUrl, scanlator });
          } catch (e) {}
        });
      }

      // ââ Strategy 2: regex fallback on raw HTML ââ
      if (chapters.length === 0) {
        const seen = {}; seen[link] = 1; seen[url] = 1;
        // Match any internal animegg.org link that looks like an episode page
        const epPatterns = [
          // /series-name/episode-X or /watch/X
          /<a[^>]+href="(https?:\/\/[^/]*animegg\.org\/[^"#\s]{5,})"[^>]*>([\s\S]{0,300}?)<\/a>/gi,
          // relative links
          /<a[^>]+href="(\/[^"#\s]{5,})"[^>]*>([\s\S]{0,300}?)<\/a>/gi,
        ];
        for (const re of epPatterns) {
          re.lastIndex = 0;
          let m;
          while ((m = re.exec(html)) !== null) {
            let epUrl = m[1];
            if (!epUrl.startsWith("http")) epUrl = baseUrl + epUrl;
            if ((epUrl in seen)) continue;
            // Only accept URLs that look like episode pages (contain /episode, /ep-, /watch, numbers)
            if (!/\/(episode|ep[-_\d]|watch\/?\d)/i.test(epUrl) && !/\/\d+[/-]/.test(epUrl)) continue;
            (seen[epUrl] = 1);
            const raw = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
            const epName = raw || `Episode`;
            chapters.push({ name: epName, url: epUrl, scanlator: "" });
          }
          if (chapters.length > 0) break;
        }
      }

      // ââ Strategy 3: look for episode select/option elements ââ
      if (chapters.length === 0) {
        const optRe = /<option[^>]+value="([^"#\s]{5,})"[^>]*>([\s\S]{0,100}?)<\/option>/gi;
        let m;
        while ((m = optRe.exec(html)) !== null) {
          let epUrl = m[1];
          if (!epUrl.startsWith("http") && epUrl.startsWith("/")) epUrl = baseUrl + epUrl;
          if (!epUrl.startsWith("http")) continue;
          const raw = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          if (/episode|ep\s*\d|\d/i.test(raw)) {
            chapters.push({ name: raw, url: epUrl, scanlator: "" });
          }
        }
      }

      return { description, status, genre, chapters, link };
    }

    async exxtractStreams(div, audio) {
      if (!div) return [];
      try {
        var slug = div.selectFirst("iframe").getSrc;
        var streams = [];
        if (!slug || slug.length < 1) return streams;
        if (!slug.startsWith("http")) slug = BASE_URL + slug;
        var body = await this.requestText(slug);
        var sKey = "var videoSources = ";
        var eKey = "var httpProtocol";
        var start = body.indexOf(sKey) + sKey.length;
        var end = body.indexOf(eKey) - 8;
        if (start < sKey.length || end < 0) return streams;
        var videoSourcesStr = body.substring(start, end);
        let videoSources = eval("(" + videoSourcesStr + ")");
        var headers = this.getHeaders();
        videoSources.forEach((videoSource) => {
          var url = BASE_URL + videoSource.file;
          var quality = `${videoSource.label} - ${audio}`;
          streams.push({ url, originalUrl: url, quality, headers });
        });
        return streams.reverse();
      } catch(e) { return []; }
    }

    async getVideoList(url) {
      var body = await this.request(url);
      var sub = body.selectFirst("#subbed-Animegg");
      var subStreams = await this.exxtractStreams(sub, "Sub");
      var dub = body.selectFirst("#dubbed-Animegg");
      var dubStreams = await this.exxtractStreams(dub, "Dub");
      var raw = body.selectFirst("#raw-Animegg");
      var rawStreams = await this.exxtractStreams(raw, "Raw");

      var pref = this.getPreference("animegg_stream_type_1");
      var streams = [];
      if (pref == 0) streams = [...subStreams, ...dubStreams, ...rawStreams];
      else if (pref == 1) streams = [...dubStreams, ...subStreams, ...rawStreams];
      else streams = [...rawStreams, ...subStreams, ...dubStreams];
      return streams;
    }

    getSourcePreferences() {
      return [
        {
          key: "animegg_popular_category",
          listPreference: {
            title: "Preferred popular category",
            summary: "",
            valueIndex: 0,
            entries: ["Popular", "Newest", "Ongoing", "Completed", "Alphabetical"],
            entryValues: ["0", "1", "2", "3", "4"],
          },
        },
        {
          key: "animegg_stream_type_1",
          listPreference: {
            title: "Preferred stream type",
            summary: "",
            valueIndex: 0,
            entries: ["Sub", "Dub", "Raw"],
            entryValues: ["0", "1", "2"],
          },
        },
      ];
    }
  }
