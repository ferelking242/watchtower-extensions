const watchtowerSources = [{
      "name": "Deezer",
      "lang": "fr",
      "baseUrl": "https://www.deezer.com",
      "apiUrl": "https://api.deezer.com",
      "iconUrl": "https://www.deezer.com/favicon.ico",
      "typeSource": "single",
      "itemType": 3,
      "version": "1.0.2",
      "pkgPath": "music/fr/deezer.js",
      "notes": "Deezer — Catalogue mondial de musique (previews 30s)",
      "isNsfw": false
  }];

  class DefaultExtension extends MProvider {
      constructor() { super();}

      getHeaders(url) {
          return {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Referer": "https://www.deezer.com/"
          };
      }

      get supportsLatest() { return true; }

      async getPopularList(page) {
          const url = `https://api.deezer.com/chart/0/tracks?index=${(page-1)*50}&limit=50`;
          const res = await new Client().get(url, this.getHeaders(url));
          let data;
          try { data = JSON.parse(res.body); } catch(e) { return { list: [], hasNextPage: false }; }
          const tracks = (data.data || data.tracks?.data || []);
          const items = tracks.map(t => ({
              name: t.title + " – " + (t.artist?.name || ""),
              imageUrl: t.album?.cover_medium || t.album?.cover || "",
              link: t.link || ("https://www.deezer.com/track/" + t.id)
          }));
          return { list: items, hasNextPage: tracks.length === 50 };
      }

      async getLatestList(page) {
          const url = `https://api.deezer.com/editorial/0/releases?index=${(page-1)*50}&limit=50`;
          const res = await new Client().get(url, this.getHeaders(url));
          let data;
          try { data = JSON.parse(res.body); } catch(e) { return { list: [], hasNextPage: false }; }
          const albums = data.data || [];
          const items = albums.map(a => ({
              name: a.title + " – " + (a.artist?.name || ""),
              imageUrl: a.cover_medium || a.cover || "",
              link: a.link || ("https://www.deezer.com/album/" + a.id)
          }));
          return { list: items, hasNextPage: albums.length === 50 };
      }

      async getSearchList(query, page, filters) {
          const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&index=${(page-1)*25}&limit=25`;
          const res = await new Client().get(url, this.getHeaders(url));
          let data;
          try { data = JSON.parse(res.body); } catch(e) { return { list: [], hasNextPage: false }; }
          const tracks = data.data || [];
          const items = tracks.map(t => ({
              name: t.title + " – " + (t.artist?.name || ""),
              imageUrl: t.album?.cover_medium || "",
              link: t.link || ("https://www.deezer.com/track/" + t.id)
          }));
          return { list: items, hasNextPage: data.next != null };
      }

      async getDetail(url) {
          const id = (url.match(/\/track\/(\d+)/) || url.match(/\/album\/(\d+)/))?.[1];
          if (!id) return { name: url, imageUrl: "", description: "", chapters: [{ name: "Play", url }] };
          const isAlbum = url.includes("/album/");
          const apiUrl = isAlbum ? `https://api.deezer.com/album/${id}` : `https://api.deezer.com/track/${id}`;
          const res = await new Client().get(apiUrl, this.getHeaders(apiUrl));
          let data;
          try { data = JSON.parse(res.body); } catch(e) { data = {}; }
          const name = data.title || "";
          const cover = data.cover_medium || data.album?.cover_medium || "";
          const desc = isAlbum ? `${data.nb_tracks || 0} tracks · ${data.release_date || ""}` : `${data.artist?.name || ""} · ${Math.floor((data.duration||0)/60)}:${String((data.duration||0)%60).padStart(2,'0')}`;
          const tracks = data.tracks?.data || (data.preview ? [data] : []);
          const chapters = tracks.map(t => ({ name: t.title || "Track", url: t.link || ("https://www.deezer.com/track/" + t.id) }));
          return { name, imageUrl: cover, description: desc, chapters: chapters.length ? chapters : [{ name: "Play", url }] };
      }

      async getVideoList(url) {
          const id = url.match(/\/track\/(\d+)/)?.[1];
          if (!id) return [{ quality: "Stream", url }];
          const apiUrl = `https://api.deezer.com/track/${id}`;
          const res = await new Client().get(apiUrl, this.getHeaders(apiUrl));
          let data;
          try { data = JSON.parse(res.body); } catch(e) { data = {}; }
          const preview = data.preview;
          return preview ? [{ quality: "Preview 30s (MP3)", url: preview }] : [{ quality: "Stream", url }];
      }
  }