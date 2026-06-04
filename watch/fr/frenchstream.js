const watchtowerSources = [{
      "name": "French-Stream",
      "langs": ["fr"],
      "ids": { "fr": 112837465 },
      "baseUrl": "https://french-stream.one",
      "apiUrl": "https://french-stream.one",
      "iconUrl": "https://raw.githubusercontent.com/kodjodevf/watchtower/main/extensions/watch/icon/fr.frenchstream.png",
      "typeSource": "single",
      "itemType": 1,
      "version": "0.1.7",
      "pkgPath": "watch/fr/frenchstream.js",
      "editableBaseUrl": true,
      "customUserAgent": "",
      "videoQualities": ["AUTO", "1080p", "720p", "480p", "360p"],
      "contentSubtype": ["film", "serie"]
  }];

  class DefaultExtension extends MProvider {
      constructor() { super(); this.client = new Client(); }

      get baseUrl() { const p = this.source.prefs?.find(x => x.key === "base_url"); return (p && p.value) ? p.value.replace(/\/$/, "") : this.source.baseUrl.replace(/\/$/, ""); }
      get logEnabled() { const p = this.source.prefs?.find(x => x.key === "log_enabled"); return p && p.value === "true"; }
      get logTopic() { const p = this.source.prefs?.find(x => x.key === "log_topic"); return (p && p.value) ? p.value : "wtfr-frenchstream"; }
      get pref_quality() { const p = this.source.prefs?.find(x => x.key === "preferred_quality"); return (p && p.value) ? p.value : "AUTO"; }

      _hdrs(ref) { return { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", "Referer": ref || `${this.baseUrl}/`, "Accept-Language": "fr-FR,fr;q=0.9" }; }

      async _log(msg) {
          if (!this.logEnabled) return;
          try { await this.client.post(`https://ntfy.sh/${this.logTopic}`, `[FS] ${msg}`, { "Title": "FrenchStream", "Content-Type": "text/plain" }); } catch(e) {}
      }

      _parse(html) {
          const list = []; const seen = new Set();
          const re = /class="short-poster[^"]*"\s+href="([^"]+)"\s+alt="([^"]+)"[\s\S]{0,600}?<img[^>]+(?:data-src|src)="([^"]+)"/gi;
          let m;
          while ((m = re.exec(html)) !== null) {
              const href = m[1];
              const url = href.startsWith("http") ? href : `${this.baseUrl}${href}`;
              if (seen.has(url)) continue; seen.add(url);
              list.push({ link: url, imageUrl: m[3], name: m[2].trim() });
          }
          return list;
      }

      async getPopular(page) {
          const res = await this.client.get(`${this.baseUrl}/films/page/${page}/`, this._hdrs());
          await this._log(`popular ${page}: ${res.body.length}b`);
          const list = this._parse(res.body);
          await this._log(`popular: ${list.length} items`);
          return { list, hasNextPage: list.length >= 10 };
      }

      async getLatestUpdates(page) {
          const res = await this.client.get(`${this.baseUrl}/?do=lastupdate&page=${page}`, this._hdrs());
          const list = this._parse(res.body);
          return { list, hasNextPage: list.length >= 10 };
      }

      async search(query, page, filterList) {
          await this._log(`search: "${query}"`);
          const gf = (filterList || []).find(f => f && f.name === "Genre");
          const genrePath = (gf && gf.values && gf.state > 0) ? gf.values[gf.state].value : "";
          if (!query && genrePath) {
              const res = await this.client.get(`${this.baseUrl}${genrePath}page/${page}/`, this._hdrs());
              const list = this._parse(res.body);
              await this._log(`search(genre): ${list.length} items`);
              return { list, hasNextPage: list.length >= 10 };
          }
          const from = (page - 1) * 10;
          const res = await this.client.get(`${this.baseUrl}/?do=search&subaction=search&story=${encodeURIComponent(query)}&from_page=${from}&full_search=0`, this._hdrs());
          await this._log(`search rsp: ${res.body.length}b`);
          const list = this._parse(res.body);
          await this._log(`search: ${list.length} items`);
          return { list, hasNextPage: list.length >= 10 };
      }

      async getDetail(url) {
          await this._log(`detail: ${url}`);
          const res = await this.client.get(url, this._hdrs());
          const html = res.body;

          // Title
          const nameM = html.match(/<h1[^>]*id="s-title"[^>]*>([\s\S]*?)<\/h1>/i) ||
                        html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) ||
                        html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
          const name = nameM ? nameM[1].replace(/<[^>]+>/g, "").replace(/\s+-\s+\d{4}.*$/s, "").trim() : "";

          // Description
          const descM = html.match(/<p[^>]*class="[^"]*desc-text[^"]*"[^>]*>([^<]+)<\/p>/i) ||
                        html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i) ||
                        html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
          const description = descM ? descM[1].trim() : "";

          // Poster
          const imgM = html.match(/url\((https?:\/\/image\.tmdb\.org\/[^)]+)\)/i) ||
                       html.match(/<img[^>]+(?:data-src|src)="(https?:\/\/image\.tmdb\.org\/[^"]+)"/i) ||
                       html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) ||
                       html.match(/<div[^>]+class="[^"]*(?:fposter|dvd-poster)[^"]*"[\s\S]{0,400}?<img[^>]+(?:data-src|src)="([^"]+)"/i);
          const imageUrl = imgM ? imgM[1] : "";

          const episodes = [];
          let m;

          // Strategy 1: buttons_N dropdown selector — shared French CMS pattern (VosFree/vostfree).
          // <select class="new_player_selector">
          //   <option value="buttons_1">Épisode 01</option>
          // Episode URLs use #buttons_N so getVideoList scopes to the right player div.
          const optRe = /<option\s+value="(buttons_\d+)"[^>]*>([^<]+)<\/option>/g;
          while ((m = optRe.exec(html)) !== null) {
              const btnId  = m[1];         // "buttons_1"
              const epName = m[2].trim();  // "Épisode 01"
              episodes.push({ name: epName, url: `${url}#${btnId}`, dateUpload: "" });
          }

          // Strategy 2: DLE newsid / same-domain episode links.
          if (episodes.length === 0) {
              const seen = new Set([url]);
              const epRe = /<a[^>]+href="((?:https?:\/\/[^"]*french-stream[^"]*|\/index\.php\?newsid=\d+[^"]*)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
              while ((m = epRe.exec(html)) !== null) {
                  const epHref = m[1];
                  const epUrl  = epHref.startsWith("http") ? epHref : `${this.baseUrl}${epHref}`;
                  if (seen.has(epUrl)) continue; seen.add(epUrl);
                  const epName = m[2].replace(/<[^>]+>/g, "").trim();
                  if (epName && epName.length > 1 && epName.length < 100) {
                      episodes.push({ name: epName, url: epUrl, dateUpload: "" });
                  }
              }
          }

          // Fallback: single movie / no episode list detected
          if (episodes.length === 0) {
              episodes.push({ name: name || "Regarder", url, dateUpload: "" });
          }

          await this._log(`detail ok: "${name}", desc: ${description.length}ch, ${episodes.length} ep`);
          return { name, description, imageUrl, genres: [], status: 0, chapters: episodes };
      }

      async getVideoList(url) {
          await this._log(`video: ${url}`);

          // Handle #buttons_N episode hash (strategy 1 episode URLs from getDetail).
          // The HTTP request uses the bare page URL; the hash scopes video extraction
          // to the specific episode's player div — prevents mixing up episode sources.
          const hashM   = url.match(/#(buttons_\d+)$/);
          const epId    = hashM ? hashM[1] : null;   // e.g. "buttons_1"
          const pageUrl = hashM ? url.replace(/#.*$/, "") : url;

          const res  = await this.client.get(pageUrl, this._hdrs(pageUrl));
          const html = res.body || "";
          const videos = [];
          const q = this.pref_quality;
          let m;

          if (epId) {
              // 1. VosFree-style: id="buttons_N" → id="player_X" → id="content_player_X"
              const epNum  = epId.replace("buttons_", "");
              const btnRe  = new RegExp(`id="${epId}"[^>]*>[\\s\\S]{0,300}?<div[^>]+id="([^"]+)"[^>]+class="([^"]+)"`, "i");
              const bm     = html.match(btnRe);
              if (bm) {
                  const playerId  = bm[1];
                  const contentRe = new RegExp(`id="content_${playerId}"[^>]*>([^<]{4,})<`, "i");
                  const cm = html.match(contentRe);
                  if (cm) {
                      const content = cm[1].trim();
                      if (content.startsWith("http")) {
                          videos.push({ url: content, quality: q !== "AUTO" ? q : "Stream", originalUrl: content });
                          await this._log(`video (buttons_content): 1 found`);
                          return videos;
                      }
                  }
              }

              // 2. Scope data-url / iframe search to this episode's HTML section.
              const scopeRe  = new RegExp(`id="${epId}"([\\s\\S]{0,5000}?)(?=<div[^>]+id="buttons_(?!${epNum}[^\\d])[^>]*>|$)`, "i");
              const scopeM   = html.match(scopeRe);
              const scopedHtml = scopeM ? scopeM[1] : "";

              if (scopedHtml) {
                  const dataUrlRe = /data-url="(https?:\/\/[^"]{10,})"/gi;
                  while ((m = dataUrlRe.exec(scopedHtml)) !== null) {
                      if (!videos.some(v => v.originalUrl === m[1]))
                          videos.push({ url: m[1], quality: q !== "AUTO" ? q : "Stream", originalUrl: m[1] });
                  }
                  if (videos.length > 0) { await this._log(`video (buttons_data-url): ${videos.length}`); return videos; }

                  const embedUrls = [];
                  const ifrRe = /<iframe[^>]+src="((?:https?:)?\/\/[^"]{10,})"/gi;
                  while ((m = ifrRe.exec(scopedHtml)) !== null) {
                      const src = m[1].startsWith("//") ? `https:${m[1]}` : m[1];
                      if (!src.includes("google") && !src.includes("recaptcha") && !src.includes("facebook") && !src.includes("disqus"))
                          if (!embedUrls.includes(src)) embedUrls.push(src);
                  }
                  for (const eu of embedUrls.slice(0, 4)) {
                      let resolved = false;
                      try {
                          const er = await this.client.get(eu, { ...this._hdrs(pageUrl), "Referer": pageUrl });
                          const eb = er.body || "";
                          const hls = eb.match(/["'`](https?:\/\/[^"'`]+\.m3u8[^"'`]{0,150})["'`]/);
                          if (hls) { videos.push({ url: hls[1], quality: q !== "AUTO" ? q : "Stream", originalUrl: hls[1] }); resolved = true; }
                          const mp4 = eb.match(/["'`](https?:\/\/[^"'`]+\.mp4[^"'`]{0,150})["'`]/);
                          if (mp4 && !resolved) { videos.push({ url: mp4[1], quality: q !== "AUTO" ? q : "Direct", originalUrl: mp4[1] }); resolved = true; }
                      } catch(e) {}
                      if (!resolved) videos.push({ url: eu, quality: q !== "AUTO" ? q : "Stream", originalUrl: eu });
                  }
                  if (videos.length > 0) { await this._log(`video (buttons_iframe): ${videos.length}`); return videos; }
              }
          }

          // Broad extraction — movies or #buttons fallback
          const directRe = /(?:file|source|src|url)\s*[=:]\s*["']([^"']+\.(?:m3u8|mp4)[^"']{0,150})["']/gi;
          while ((m = directRe.exec(html)) !== null) {
              const vUrl = m[1].startsWith("//") ? `https:${m[1]}` : m[1];
              if (!videos.some(v => v.url === vUrl))
                  videos.push({ url: vUrl, quality: q !== "AUTO" ? q : "Direct", originalUrl: vUrl });
          }

          const dataUrlRe = /data-url="(https?:\/\/[^"]{10,})"/gi;
          const embedUrls = [];
          while ((m = dataUrlRe.exec(html)) !== null) {
              if (!embedUrls.includes(m[1])) embedUrls.push(m[1]);
          }
          const iframeRe = /<iframe[^>]+src="((?:https?:)?\/\/[^"]{10,})"/gi;
          while ((m = iframeRe.exec(html)) !== null) {
              const src = m[1].startsWith("//") ? `https:${m[1]}` : m[1];
              if (!src.includes("google") && !src.includes("recaptcha") && !src.includes("facebook") && !src.includes("jquery") && !src.includes("disqus"))
                  if (!embedUrls.includes(src)) embedUrls.push(src);
          }
          for (const embedUrl of embedUrls.slice(0, 6)) {
              let resolved = false;
              try {
                  const embedRes = await this.client.get(embedUrl, { ...this._hdrs(url), "Referer": url });
                  const ebody = embedRes.body || "";
                  const hlsM = ebody.match(/["'`](https?:\/\/[^"'`]+\.m3u8[^"'`]{0,150})["'`]/);
                  if (hlsM) { videos.push({ url: hlsM[1], quality: q !== "AUTO" ? q : "Stream", originalUrl: hlsM[1] }); resolved = true; }
                  const mp4M = ebody.match(/["'`](https?:\/\/[^"'`]+\.mp4[^"'`]{0,150})["'`]/);
                  if (mp4M && !resolved) { videos.push({ url: mp4M[1], quality: q !== "AUTO" ? q : "Direct", originalUrl: mp4M[1] }); resolved = true; }
              } catch(e) {}
              if (!resolved) videos.push({ url: embedUrl, quality: q !== "AUTO" ? q : "Stream", originalUrl: embedUrl });
          }

          await this._log(`video: ${videos.length} found`);
          return videos;
      }

      getFilterList() {
          return [
              { type: "SelectFilter", name: "Genre", state: 0, values: [
                  { name: "Tous", value: "" },
                  { name: "Action", value: "/film/action/" },
                  { name: "Aventure", value: "/film/aventure/" },
                  { name: "Animation", value: "/film/animation/" },
                  { name: "Comédie", value: "/film/comedie/" },
                  { name: "Crime", value: "/film/crime/" },
                  { name: "Documentaire", value: "/film/documentaire/" },
                  { name: "Drame", value: "/film/drame/" },
                  { name: "Familial", value: "/film/familial/" },
                  { name: "Fantastique", value: "/film/fantastique/" },
                  { name: "Guerre", value: "/film/guerre/" },
                  { name: "Histoire", value: "/film/histoire/" },
                  { name: "Horreur", value: "/film/horreur/" },
                  { name: "Mystère", value: "/film/mystere/" },
                  { name: "Romance", value: "/film/romance/" },
                  { name: "Science-Fiction", value: "/film/science-fiction/" },
                  { name: "Thriller", value: "/film/thriller/" },
                  { name: "Western", value: "/film/western/" }
              ]}
          ];
      }

      getSourcePreferences() {
          return [
              { key: "base_url", listPreference: { title: "URL de base", summary: this.baseUrl, valueIndex: 0, entries: [this.source.baseUrl], entryValues: [this.source.baseUrl] } },
              { key: "preferred_quality", listPreference: { title: "Qualité préférée", summary: "AUTO", valueIndex: 0, entries: ["AUTO", "1080p", "720p", "480p", "360p"], entryValues: ["AUTO", "1080p", "720p", "480p", "360p"] } },
              { key: "log_enabled", listPreference: { title: "Logs ntfy.sh", summary: "Voir logs sur ntfy.sh/[topic]", valueIndex: 0, entries: ["Désactivé", "Activé"], entryValues: ["false", "true"] } },
              { key: "log_topic", editTextPreference: { title: "Topic ntfy.sh", summary: "wtfr-frenchstream", value: "wtfr-frenchstream", dialogTitle: "Topic ntfy.sh", dialogMessage: "Identifiant unique pour vos logs ntfy.sh" } }
          ];
      }
  }
  