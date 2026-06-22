const watchtowerSources = [{
      "name": "Neko-Sama",
      "langs": ["fr"],
      "ids": { "fr": 487291034 },
      "baseUrl": "https://www.neko-sama.fr",
      "apiUrl": "https://www.neko-sama.fr",
      "iconUrl": "https://www.neko-sama.fr/favicon.ico",
      "typeSource": "single",
      "itemType": 2,
      "version": "0.1.1",
      "pkgPath": "watch/fr/nekosama.js",
      "editableBaseUrl": true,
      "hasCloudflare": false,
      "videoQualities": ["AUTO", "VF", "VOSTFR"],
      "subCategories": ["anime"],
      "requiresAccount": false,
      "hasDRM": false,
      "isAggregator": false,
      "paywall": "free",
      "notes": "Anime VF/VOSTFR — catalogue JSON disponible"
  }];

  const BASE_URL = "https://www.neko-sama.fr";

  class DefaultExtension extends MProvider {
      constructor() { super(); }

      get baseUrl() { const p = this.source.prefs?.find(x => x.key === "base_url"); return (p && p.value) ? p.value.replace(/\/$/, "") : BASE_URL; }
      _hdrs(ref) { return { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36", "Referer": ref || this.baseUrl + "/", "Accept-Language": "fr-FR,fr;q=0.9" }; }
      _decode(s) { return String(s||"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#039;/g,"'"); }

      _parseJson(data) {
          return data.filter(a => a).map(a => ({
              link: this.baseUrl + (a.url || ""),
              imageUrl: a.image_url || a.url_image || "",
              name: this._decode(a.title || a.title_romanji || "")
          })).filter(a => a.name && a.link !== this.baseUrl);
      }

      async getPopular(page) {
          try {
              const res = await new Client().get(`${this.baseUrl}/api/catalogue/?order=popular&page=${page}`, this._hdrs());
              const json = JSON.parse(res.body);
              return { list: this._parseJson(Array.isArray(json) ? json : (json.data || json.animes || [])), hasNextPage: true };
          } catch(e) {
              const res = await new Client().get(this.baseUrl + "/", this._hdrs());
              return { list: this._parseHtml(res.body), hasNextPage: false };
          }
      }

      async getLatestUpdates(page) {
          try {
              const res = await new Client().get(`${this.baseUrl}/api/catalogue/?order=latest&page=${page}`, this._hdrs());
              const json = JSON.parse(res.body);
              return { list: this._parseJson(Array.isArray(json) ? json : (json.data || json.animes || [])), hasNextPage: true };
          } catch(e) {
              return this.getPopular(page);
          }
      }

      _parseHtml(html) {
          const list = []; const seen = {};
          const re = /<a[^>]+href="(https?://[^"]*neko-sama[^"]*/anime/[^"]+)"[^>]*>[sS]{0,500}?<img[^>]+(?:src|data-src)="([^"]+)"[^>]+alt="([^"]{2,100})"/gi;
          let m;
          while ((m = re.exec(html)) !== null) {
              if (m[1] in seen) continue; seen[m[1]]=1;
              list.push({ link: m[1], imageUrl: m[2], name: m[3].trim() });
          }
          return list;
      }

      async search(query, page, filterList) {
          try {
              const res = await new Client().get(`${this.baseUrl}/api/catalogue/?q=${encodeURIComponent(query)}`, this._hdrs());
              const json = JSON.parse(res.body);
              return { list: this._parseJson(Array.isArray(json) ? json : (json.data || [])), hasNextPage: false };
          } catch(e) {
              const res = await new Client().get(`${this.baseUrl}/?s=${encodeURIComponent(query)}`, this._hdrs());
              return { list: this._parseHtml(res.body), hasNextPage: false };
          }
      }

      async getDetail(url) {
          const res = await new Client().get(url, this._hdrs(url));
          const html = res.body;
          const nameM = html.match(/<h1[^>]*>([sS]*?)</h1>/);
          const name  = nameM ? nameM[1].replace(/<[^>]+>/g,"").trim() : "";
          const imgM  = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
          const descM = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
          const eps = []; const eSeen = {};
          const eRe = /<a[^>]+href="([^"]+/episode/[^"]+)"[^>]*>([sS]{1,80}?)</a>/gi;
          let em;
          while ((em = eRe.exec(html)) !== null) {
              const epUrl = em[1].startsWith("http") ? em[1] : this.baseUrl + em[1];
              if (epUrl in eSeen) continue; eSeen[epUrl]=1;
              eps.push({ name: em[2].replace(/<[^>]+>/g,"").trim(), url: epUrl });
          }
          if (eps.length === 0) eps.push({ name, url });
          return { name, imageUrl: imgM ? imgM[1] : "", description: descM ? descM[1] : "", episodes: eps };
      }

      async getVideoList(url) {
          const res = await new Client().get(url, this._hdrs(url));
          const html = res.body;
          const videos = [];
          // neko-sama uses video.js or jwplayer with a sources array
          const srcRe = /["']file["']\s*:\s*["']([^"']+\.m3u8[^"']*)["']/gi;
          let m;
          while ((m = srcRe.exec(html)) !== null) videos.push({ url: m[1], quality: "AUTO", headers: this._hdrs(url) });
          // iframes
          const ifRe = /<iframe[^>]+src="([^"]+)"/gi;
          while ((m = ifRe.exec(html)) !== null) {
              if (!m[1].includes("javascript")) videos.push({ url: m[1], quality: "AUTO", headers: this._hdrs(url) });
          }
          if (videos.length === 0) videos.push({ url, quality: "AUTO", headers: this._hdrs() });
          return videos;
      }

      getForYou(page) { return this.getPopular(page); }
      getComments(url, page) { return Promise.resolve([]); }
  }
  