const watchtowerSources = [{
      "name": "Vostfree",
      "langs": ["fr"],
      "ids": { "fr": 445160798 },
      "baseUrl": "https://vostfree.ws",
      "apiUrl": "https://vostfree.ws",
      "iconUrl": "https://raw.githubusercontent.com/kodjodevf/watchtower/main/extensions/watch/icon/fr.vostfree.png",
      "typeSource": "single",
      "itemType": 1,
      "version": "0.1.7",
      "pkgPath": "watch/fr/vostfree.js",
      "editableBaseUrl": true,
      "customUserAgent": "",
      "videoQualities": ["AUTO", "1080p", "720p", "480p", "360p"],
      "contentSubtype": ["anime", "film"]
  }];

  class DefaultExtension extends MProvider {
      constructor() { super(); this.client = new Client(); }

      get baseUrl() { const p = this.source.prefs?.find(x => x.key === "base_url"); return (p && p.value) ? p.value.replace(/\/$/, "") : this.source.baseUrl.replace(/\/$/, ""); }
      get logEnabled() { const p = this.source.prefs?.find(x => x.key === "log_enabled"); return p && p.value === "true"; }
      get logTopic() { const p = this.source.prefs?.find(x => x.key === "log_topic"); return (p && p.value) ? p.value : "wtfr-vostfree"; }
      get pref_quality() { const p = this.source.prefs?.find(x => x.key === "preferred_quality"); return (p && p.value) ? p.value : "AUTO"; }

      _hdrs(ref) { return { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36", "Referer": ref || `${this.baseUrl}/`, "Accept-Language": "fr-FR,fr;q=0.9" }; }

      async _log(msg) {
          if (!this.logEnabled) return;
          try { await this.client.post(`https://ntfy.sh/${this.logTopic}`, `[Vostfree] ${msg}`, { "Title": "Vostfree", "Content-Type": "text/plain" }); } catch(e) {}
      }

      _parse(html) {
          const list = []; const seen = new Set();
          const re = /<a[^>]+href="(https?:\/\/vostfree\.[^/\s"#]+\/[0-9][^"\s#]{3,})"[^>]*>[\s\S]{0,500}<img[^>]+src="([^"]+)"[^>]+alt="([^"]{2,})"/gi;
          let m;
          while ((m = re.exec(html)) !== null) {
              if (seen.has(m[1])) continue; seen.add(m[1]);
              const name = m[3].replace(/\s*(VOSTFR|VF|FRENCH|TrueFrench|DDL|streaming)[^\w]*/gi, "").trim();
              if (name.length > 1) list.push({ link: m[1], imageUrl: m[2], name });
          }
          return list;
      }

      async getPopular(page) {
          const res = await this.client.get(`${this.baseUrl}/?page=${page}`, this._hdrs());
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
          const res = await this.client.get(`${this.baseUrl}/?search=${encodeURIComponent(query)}&page=${page}`, this._hdrs());
          await this._log(`search rsp: ${res.body.length}b`);
          const list = this._parse(res.body);
          await this._log(`search: ${list.length} items`);
          return { list, hasNextPage: list.length >= 10 };
      }

      async getDetail(url) {
          await this._log(`detail: ${url}`);
          const res = await this.client.get(url, this._hdrs());
          const html = res.body;

          const nameM = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
          const name = nameM ? nameM[1].replace(/\s*(VOSTFR|VF|FRENCH)[^\w]*/gi, "").trim() : "";

          const descM = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i) ||
                        html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
          const description = descM ? descM[1].trim() : "";

          const imgM = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) ||
                       html.match(/<img[^>]+class="[^"]*(?:slide-poster|poster|img-left)[^"]*"[^>]+(?:src|data-src)="([^"]+)"/i) ||
                       html.match(/<img[^>]+(?:src|data-src)="(\/uploads\/posts\/[^"]+\.(?:jpg|png|webp))"/i) ||
                       html.match(/<img[^>]+(?:src|data-src)="(https?:\/\/vostfree\.[^"]+\/uploads\/[^"]+\.(?:jpg|png|webp))"/i);
          let imageUrl = imgM ? imgM[1] : "";
          if (imageUrl && imageUrl.startsWith("/")) imageUrl = `${this.baseUrl}${imageUrl}`;

          const episodes = [];
          const seen = new Set([url]);

          // ── Strategy 1: match any vostfree internal link (with OR without .html) ──
          // Covers /1234-show-episode-X.html AND /show/episode/X/ AND /saison-X-episode-Y/
          const patterns = [
              // numbered slug with .html (classic vostfree format)
              /<a[^>]+href="(https?:\/\/vostfree\.[^/"#\s]+\/\d[^"#\s]{3,}\.html)"[^>]*>([\s\S]{0,400}?)<\/a>/gi,
              // numbered slug without extension
              /<a[^>]+href="(https?:\/\/vostfree\.[^/"#\s]+\/\d[^"#\s]{3,})"[^>]*>([\s\S]{0,400}?)<\/a>/gi,
              // /episode/ or /saison/ in path
              /<a[^>]+href="((?:https?:\/\/vostfree\.[^/"#\s]+)?\/[^"#\s]*(?:episode|saison|ep-)[^"#\s]*)"[^>]*>([\s\S]{0,400}?)<\/a>/gi,
          ];

          for (const re of patterns) {
              re.lastIndex = 0;
              let m;
              while ((m = re.exec(html)) !== null) {
                  let epUrl = m[1];
                  if (!epUrl.startsWith("http")) epUrl = `${this.baseUrl}${epUrl}`;
                  if (seen.has(epUrl)) continue;
                  seen.add(epUrl);
                  // strip inner HTML tags
                  const raw = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
                  if (!raw || raw.length === 0 || raw.length > 120) continue;
                  // Accept: has a digit, OR contains episode/saison keyword, OR URL has episode/saison
                  const urlHasEp = /episode|saison|ep[-_\d]/i.test(epUrl);
                  const textOk = /\d/.test(raw) || /episode|\u00e9pisode|saison|ep\b/i.test(raw);
                  if (textOk || urlHasEp) {
                      episodes.push({ name: raw, url: epUrl, dateUpload: "" });
                  }
              }
              if (episodes.length > 0) break;
          }

          // ── Strategy 2: look for episode links inside known list containers ──
          if (episodes.length === 0) {
              const containerRe = /class="[^"]*(?:episodes?|episode-list|list-eps|ep-list|newmanga)[^"]*"[^>]*>([\s\S]{0,20000}?)<\/(?:div|ul|ol|section)>/gi;
              let cm;
              while ((cm = containerRe.exec(html)) !== null) {
                  const block = cm[1];
                  const linkRe = /<a[^>]+href="([^"#]{5,})"[^>]*>([\s\S]{0,200}?)<\/a>/gi;
                  let lm;
                  while ((lm = linkRe.exec(block)) !== null) {
                      let epUrl = lm[1];
                      if (!epUrl.startsWith("http")) epUrl = `${this.baseUrl}${epUrl}`;
                      if (seen.has(epUrl)) continue;
                      seen.add(epUrl);
                      const raw = lm[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
                      if (!raw || raw.length > 120) continue;
                      episodes.push({ name: raw || `Episode`, url: epUrl, dateUpload: "" });
                  }
                  if (episodes.length > 0) break;
              }
          }

          // ── Fallback for films (single episode) ──
          if (episodes.length === 0) {
              const titleForEp = name || url.split("/").pop().replace(/-/g, " ").replace(/\.html$/, "").trim();
              episodes.push({ name: titleForEp || "Regarder", url, dateUpload: "" });
          }

          await this._log(`detail ok: "${name}", ${episodes.length} ep`);
          return { name, description, imageUrl, genres: [], status: 0, chapters: episodes };
      }

      async getVideoList(url) {
          await this._log(`video: ${url}`);
          const res = await this.client.get(url, this._hdrs(url));
          const html = res.body || "";
          const videos = [];
          const q = this.pref_quality;

          const directRe = /(?:file|source|src|url)\s*[=:]\s*["']([^"']+\.(?:m3u8|mp4)[^"']{0,150})["']/gi;
          let m;
          while ((m = directRe.exec(html)) !== null) {
              const vUrl = m[1].startsWith("//") ? `https:${m[1]}` : m[1];
              if (!videos.some(v => v.url === vUrl)) {
                  videos.push({ url: vUrl, quality: q !== "AUTO" ? q : "Direct", originalUrl: vUrl });
              }
          }

          const iframeUrls = [];
          const iframeRe = /<iframe[^>]+src="((?:https?:)?\/\/[^"]{10,})"/gi;
          while ((m = iframeRe.exec(html)) !== null) {
              const src = m[1].startsWith("//") ? `https:${m[1]}` : m[1];
              if (!src.includes("google") && !src.includes("recaptcha") && !src.includes("disqus")) {
                  iframeUrls.push(src);
              }
          }

          for (const embedUrl of iframeUrls.slice(0, 4)) {
              let resolved = false;
              try {
                  const embedRes = await this.client.get(embedUrl, { ...this._hdrs(url), "Referer": url });
                  const ebody = embedRes.body || "";
                  const hlsM = ebody.match(/["'`](https?:\/\/[^"'`]+\.m3u8[^"'`]{0,150})["'`]/);
                  if (hlsM) {
                      videos.push({ url: hlsM[1], quality: q !== "AUTO" ? q : "Stream", originalUrl: hlsM[1] });
                      resolved = true;
                  }
                  const mp4M = ebody.match(/["'`](https?:\/\/[^"'`]+\.mp4[^"'`]{0,150})["'`]/);
                  if (mp4M && !resolved) {
                      videos.push({ url: mp4M[1], quality: q !== "AUTO" ? q : "Direct", originalUrl: mp4M[1] });
                      resolved = true;
                  }
              } catch (e) {}
              if (!resolved) {
                  videos.push({ url: embedUrl, quality: q !== "AUTO" ? q : "Stream", originalUrl: embedUrl });
              }
          }

          await this._log(`video: ${videos.length} found`);
          return videos;
      }

      getFilterList() {
          return [
              { type: "SelectFilter", name: "Genre", state: 0, values: [
                  { name: "Tous", value: "" },
                  { name: "Action", value: "/genre/action/" },
                  { name: "Aventure", value: "/genre/aventure/" },
                  { name: "Com\u00e9die", value: "/genre/comedie/" },
                  { name: "Drame", value: "/genre/drame/" },
                  { name: "Fantastique", value: "/genre/fantastique/" },
                  { name: "Horreur", value: "/genre/horreur/" },
                  { name: "Myst\u00e8re", value: "/genre/mystere/" },
                  { name: "Romance", value: "/genre/romance/" },
                  { name: "Science-Fiction", value: "/genre/science-fiction/" },
                  { name: "Shonen", value: "/genre/shonen/" },
                  { name: "Tranche de vie", value: "/genre/tranche-de-vie/" }
              ]}
          ];
      }

      getSourcePreferences() {
          return [
              { key: "base_url", listPreference: { title: "URL de base", summary: this.baseUrl, valueIndex: 0, entries: [this.source.baseUrl], entryValues: [this.source.baseUrl] } },
              { key: "preferred_quality", listPreference: { title: "Qualit\u00e9 pr\u00e9f\u00e9r\u00e9e", summary: "AUTO", valueIndex: 0, entries: ["AUTO", "1080p", "720p", "480p", "360p"], entryValues: ["AUTO", "1080p", "720p", "480p", "360p"] } },
              { key: "log_enabled", listPreference: { title: "Logs ntfy.sh", summary: "Voir logs sur ntfy.sh/[topic]", valueIndex: 0, entries: ["D\u00e9sactiv\u00e9", "Activ\u00e9"], entryValues: ["false", "true"] } },
              { key: "log_topic", editTextPreference: { title: "Topic ntfy.sh", summary: "wtfr-vostfree", value: "wtfr-vostfree", dialogTitle: "Topic ntfy.sh", dialogMessage: "Identifiant unique pour vos logs ntfy.sh" } }
          ];
      }
  }
