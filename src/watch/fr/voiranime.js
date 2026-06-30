const watchtowerSources = [{
      "name": "VoirAnime",
      "langs": ["fr"],
      "ids": { "fr": 394821053 },
      "baseUrl": "https://www.voiranime.io",
      "apiUrl": "https://www.voiranime.io",
      "iconUrl": "https://www.voiranime.io/favicon.ico",
      "typeSource": "single",
      "itemType": 2,
      "version": "0.1.2",
      "pkgPath": "watch/fr/voiranime.js",
      "editableBaseUrl": true,
      "hasCloudflare": true,
      "customUserAgent": "",
      "videoQualities": ["AUTO","VF","VOSTFR"],
      "subCategories": ["anime"],
      "requiresAccount": false,
      "hasDRM": false,
      "isAggregator": false,
      "paywall": "free",
      "notes": "Anime VF/VOSTFR — Cloudflare actif"
  }];

  const BASE_URL = "https://www.voiranime.io";

  class DefaultExtension extends MProvider {
      constructor() { super(); }

      get baseUrl() { const p = this.source.prefs?.find(x => x.key === "base_url"); return (p && p.value) ? p.value.replace(/\/$/, "") : BASE_URL.replace(/\/$/, ""); }
      get logEnabled() { const p = this.source.prefs?.find(x => x.key === "log_enabled"); return p && p.value === "true"; }

      _hdrs(ref) { return { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36", "Referer": ref || this.baseUrl + "/", "Accept-Language": "fr-FR,fr;q=0.9" }; }
      _decode(s) { return String(s||"").replace(/&#0?39;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">"); }
  
      _parse(html) {
          const list = []; const seen = {};
          const re = /<a[^>]+href="(https?:\/\/[^"]*voiranime[^"]*\/[^"]+\/)"[^>]*>[\s\S]{0,500}?<img[^>]+(?:src|data-src)="([^"]+)"[^>]+alt="([^"]{2,100})"/gi;
          let m;
          while ((m = re.exec(html)) !== null) {
              let url = m[1].startsWith("http") ? m[1] : this.baseUrl + (m[1].startsWith("/") ? "" : "/") + m[1];
              if (url in seen) continue; seen[url]=1;
              list.push({ link: url, imageUrl: m[2], name: m[3].trim() });
          }
          return list;
      }
  
      async getPopular(page) {
          const url = this.baseUrl + "/animes-vf-vostfr/";
          const res = await new Client().get(url, this._hdrs());
          return { list: this._parse(res.body), hasNextPage: false };
      }
  
      async getLatestUpdates(page) {
          const url = this.baseUrl + "/";
          const res = await new Client().get(url, this._hdrs());
          return { list: this._parse(res.body), hasNextPage: false };
      }
  
      async search(query, page, filterList) {
          const url = this.baseUrl + "/?s=" + encodeURIComponent(query);
          const res = await new Client().get(url, this._hdrs());
          return { list: this._parse(res.body), hasNextPage: false };
      }
  
      async getDetail(url) {
          const res = await new Client().get(url, this._hdrs(url));
          const html = res.body;
          const nameM = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
          const name  = nameM ? nameM[1].replace(/<[^>]+>/g,"").trim() : "";
          const imgM  = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
          const image = imgM ? imgM[1] : "";
          const descM = html.match(/<meta[^>]+(?:name="description"|property="og:description")[^>]+content="([^"]+)"/i);
          const desc  = descM ? descM[1] : "";
          
          // Collect episode/film links
          const eps = []; const eSeen = {};
          const eRe = /<a[^>]+href="(https://www\.voiranime\.io[^"]*(?:episode|ep|saison|season|film)[^"]*)"[^>]*>([\s\S]{1,60}?)<\/a>/gi;
          let em;
          while ((em = eRe.exec(html)) !== null) {
              if (em[1] in eSeen) continue; eSeen[em[1]]=1;
              eps.push({ name: em[2].replace(/<[^>]+>/g,"").trim(), url: em[1] });
          }
          if (eps.length === 0) eps.push({ name, url });
          
          return { name, imageUrl: image, description: desc,chapters: eps };
      }
  
      async getVideoList(url) {
          const res = await new Client().get(url, this._hdrs(url));
          const html = res.body;
          const videos = [];
          // Extract iframes
          const ifRe = /<iframe[^>]+src="([^"]+)"/gi;
          let m;
          while ((m = ifRe.exec(html)) !== null) {
              const src = m[1];
              if (!src.includes("javascript") && !src.includes("about:")) {
                  videos.push({ url: src, quality: "AUTO", headers: this._hdrs(url) });
              }
          }
          // Extract direct video sources
          const vRe = /(?:file|src|source)\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/gi;
          while ((m = vRe.exec(html)) !== null) {
              const src = m[1].startsWith("http") ? m[1] : this.baseUrl + m[1];
              videos.push({ url: src, quality: "AUTO", headers: this._hdrs(url) });
          }
          if (videos.length === 0) videos.push({ url, quality: "AUTO", headers: this._hdrs() });
          return videos;
      }

      getForYou(page) { return this.getPopular(page); }
      getComments(url, page) { return Promise.resolve([]); }
  }
  