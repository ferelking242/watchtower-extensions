const watchtowerSources = [{
      "name": "YouTube Music",
      "lang": "all",
      "baseUrl": "https://music.youtube.com",
      "apiUrl": "",
      "iconUrl": "https://music.youtube.com/img/favicon_144.png",
      "typeSource": "single",
      "itemType": 3,
      "version": "1.0.1",
      "pkgPath": "music/multi/youtube-music.js",
      "notes": "YouTube Music — Stream music via YouTube",
      "isNsfw": false
  }];

  class DefaultExtension extends MProvider {
      constructor() { super();}

      getHeaders(url) {
          return {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Referer": "https://music.youtube.com/"
          };
      }

      get supportsLatest() { return true; }

      _ytThumb(vid) { return `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`; }

      _parseVideos(html) {
          const items = [];
          const rx = /"videoId":"([a-zA-Z0-9_-]{11})","thumbnail":.*?"runs":\[\{"text":"([^"]+)"/g;
          let m;
          const seen = {};
          while ((m = rx.exec(html)) !== null) {
              const vid = m[1], title = m[2];
              if (!(vid in seen)) {
                  (seen[vid] = 1);
                  items.push({ name: title, imageUrl: this._ytThumb(vid), link: "https://www.youtube.com/watch?v=" + vid });
              }
              if (items.length >= 30) break;
          }
          return items;
      }

      async getPopularList(page) {
          const url = "https://music.youtube.com/";
          const res = await new Client().get(url, this.getHeaders(url));
          return { list: this._parseVideos(res.body), hasNextPage: false };
      }

      async getLatestList(page) { return this.getPopularList(page); }

      async getSearchList(query, page, filters) {
          const url = `https://music.youtube.com/search?q=${encodeURIComponent(query)}`;
          const res = await new Client().get(url, this.getHeaders(url));
          return { list: this._parseVideos(res.body), hasNextPage: false };
      }

      async getDetail(url) {
          const vid = (url.match(/[?&]v=([a-zA-Z0-9_-]{11})/) || [])[1] || "";
          const res = await new Client().get(url, this.getHeaders(url));
          const titleM = res.body.match(/"title":"([^"]+)"/);
          const thumbM = res.body.match(/"thumbnails":\[\{"url":"([^"]+)"/);
          const descM = res.body.match(/"shortDescription":"([^"]{0,300})/);
          return {
              name: titleM ? titleM[1] : "Track",
              imageUrl: vid ? this._ytThumb(vid) : (thumbM ? thumbM[1] : ""),
              description: descM ? descM[1].replace(/\\n/g, '\n') : "",
              chapters: [{ name: "Play", url }]
          };
      }

      async getVideoList(url) {
          return [{ quality: "YouTube", url }];
      }
  }